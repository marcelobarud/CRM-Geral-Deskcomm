-- Bloco H: campanhas opcionais com preparação agendada, sem envio externo.
-- A fila existente funciona como relógio durável; o worker só classifica IDs.

create or replace function public.fn_capability_enabled(p_org uuid,p_capability text) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare c jsonb; v jsonb;
begin
 if p_capability is null or p_capability not in('message_templates','proposals','short_scripts','scheduled_campaigns') then return false; end if;
 if auth.uid() is not null and not public.fn_role_at_least(p_org,'viewer') then return false; end if;
 select settings->'capabilities' into c from public.organizations where id=p_org;
 if not found then return false; end if;
 if c is null or c='null'::jsonb then return p_capability='message_templates'; end if;
 if jsonb_typeof(c) is distinct from 'object' or c->'version' is distinct from '1'::jsonb or jsonb_typeof(c->'revision') is distinct from 'number'
 or coalesce(c->>'revision','') !~ '^[0-9]{1,16}$' or jsonb_typeof(c->'overrides') is distinct from 'object' then return false; end if;
 if (c->>'revision')::numeric>9007199254740991 then return false; end if;
 v:=c->'overrides'->p_capability;
 if v is null then return p_capability='message_templates'; end if;
 return v='true'::jsonb;
end $$;
revoke all on function public.fn_capability_enabled(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.fn_capability_enabled(uuid,text) to authenticated,service_role;

create or replace function public.fn_set_capability(p_org uuid,p_capability text,p_enabled boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c jsonb; overrides jsonb; revision bigint; previous boolean; previous_context text;
begin
 if auth.uid() is null or not public.fn_role_at_least(p_org,'admin') or not public.fn_support_write_allowed(p_org) or not public.fn_session_mfa_proven() then raise exception 'capability_forbidden' using errcode='42501'; end if;
 if p_capability is null or p_capability not in('message_templates','proposals','short_scripts','scheduled_campaigns') or p_enabled is null then raise exception 'capability_invalid' using errcode='22023'; end if;
 select settings->'capabilities' into c from public.organizations where id=p_org for update;
 if not found then raise exception 'organization_not_found' using errcode='P0002'; end if;
 previous:=public.fn_capability_enabled(p_org,p_capability); revision:=0;
 if jsonb_typeof(c)='object' and c->'version'='1'::jsonb and jsonb_typeof(c->'revision')='number' and coalesce(c->>'revision','') ~ '^[0-9]{1,16}$' then
  if (c->>'revision')::numeric<9007199254740991 then revision:=(c->>'revision')::bigint; end if;
 end if;
 overrides:=case when c->'version'='1'::jsonb and jsonb_typeof(c->'overrides')='object' then c->'overrides' else '{}'::jsonb end;
 previous_context:=current_setting('crm.capabilities_write',true); perform set_config('crm.capabilities_write','1',true);
 update public.organizations set settings=jsonb_set(coalesce(settings,'{}'),'{capabilities}',jsonb_build_object('version',1,'revision',revision+1,'overrides',overrides||jsonb_build_object(p_capability,p_enabled)),true) where id=p_org;
 perform set_config('crm.capabilities_write',coalesce(previous_context,''),true);
 return jsonb_build_object('previous_enabled',previous,'enabled',p_enabled,'revision',revision+1);
end $$;
revoke all on function public.fn_set_capability(uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.fn_set_capability(uuid,text,boolean) to authenticated;

create table if not exists public.crm_scheduled_campaigns (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 created_by uuid references auth.users(id) on delete set null,
 name text not null check(length(btrim(name)) between 1 and 120),
 channel text not null default 'whatsapp' check(channel='whatsapp'),
 status text not null default 'draft' check(status in('draft','scheduled','preparing','prepared','cancelled','failed')),
 tag_id uuid not null,
 content text not null check(length(btrim(content)) between 1 and 2000),
 timezone text not null,
 scheduled_at timestamptz,
 preparation_batch integer not null default 0 check(preparation_batch>=0),
 prepared_at timestamptz,
 cancelled_at timestamptz,
 cancelled_by uuid references auth.users(id) on delete set null,
 error_code text check(error_code is null or error_code in('provider_unavailable','capability_disabled','preparation_failed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
 foreign key(tag_id,organization_id) references public.crm_tags(id,organization_id) on delete restrict,
 check((status in('scheduled','preparing','prepared','cancelled','failed')) = (scheduled_at is not null))
);
create index if not exists crm_scheduled_campaigns_org_recent on public.crm_scheduled_campaigns(organization_id,created_at desc,id desc);
create index if not exists crm_scheduled_campaigns_due on public.crm_scheduled_campaigns(scheduled_at,id) where status in('scheduled','preparing');

create table if not exists public.crm_scheduled_campaign_recipients (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 campaign_id uuid not null,
 contact_id uuid,
 status text not null default 'pending' check(status in('pending','ready','skipped','cancelled')),
 reason_code text check(reason_code is null or reason_code in('opted_out','contact_blocked','requires_human','contact_anonymized','contact_merged','contact_removed','invalid_recipient','marketing_consent_required','capability_disabled','preparation_failed','cancelled')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,id),
 unique(campaign_id,contact_id),
 foreign key(organization_id,campaign_id) references public.crm_scheduled_campaigns(organization_id,id) on delete cascade,
 foreign key(contact_id) references public.contacts(id) on delete set null
);
create index if not exists crm_scheduled_campaign_recipients_page on public.crm_scheduled_campaign_recipients(organization_id,campaign_id,status,created_at,id);
create index if not exists crm_tag_assignments_campaign_snapshot on public.crm_tag_assignments(organization_id,tag_id,entity_kind,entity_id);

create or replace function public.fn_campaign_recipient_contact_guard() returns trigger
language plpgsql set search_path=public as $$
declare contact_org uuid;
begin
 if new.contact_id is null then return new; end if;
 select organization_id into contact_org from public.contacts where id=new.contact_id;
 if contact_org is distinct from new.organization_id then raise exception 'campaign_contact_tenant_mismatch' using errcode='23503'; end if;
 return new;
end $$;
revoke all on function public.fn_campaign_recipient_contact_guard() from public,anon,authenticated,service_role;
drop trigger if exists campaign_recipient_contact_guard on public.crm_scheduled_campaign_recipients;
create trigger campaign_recipient_contact_guard before insert or update of organization_id,contact_id
 on public.crm_scheduled_campaign_recipients for each row execute function public.fn_campaign_recipient_contact_guard();

create or replace function public.fn_campaign_contact_org_guard() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.organization_id is distinct from old.organization_id and exists(
  select 1 from public.crm_scheduled_campaign_recipients r where r.contact_id=old.id and r.organization_id<>new.organization_id
 ) then raise exception 'campaign_contact_tenant_mismatch' using errcode='23503'; end if;
 return new;
end $$;
revoke all on function public.fn_campaign_contact_org_guard() from public,anon,authenticated,service_role;
drop trigger if exists campaign_contact_org_guard on public.contacts;
create trigger campaign_contact_org_guard before update of organization_id on public.contacts
 for each row execute function public.fn_campaign_contact_org_guard();

alter table public.crm_scheduled_campaigns enable row level security;
alter table public.crm_scheduled_campaign_recipients enable row level security;
revoke all on public.crm_scheduled_campaigns,public.crm_scheduled_campaign_recipients from public,anon,authenticated,service_role;
grant select on public.crm_scheduled_campaigns,public.crm_scheduled_campaign_recipients to authenticated;
drop policy if exists campaigns_select_manager on public.crm_scheduled_campaigns;
create policy campaigns_select_manager on public.crm_scheduled_campaigns for select to authenticated
 using(public.fn_role_at_least(organization_id,'manager'));
drop policy if exists campaign_recipients_select_manager on public.crm_scheduled_campaign_recipients;
create policy campaign_recipients_select_manager on public.crm_scheduled_campaign_recipients for select to authenticated
 using(public.fn_role_at_least(organization_id,'manager'));

alter table public.job_queue drop constraint if exists job_queue_kind_check;
alter table public.job_queue add constraint job_queue_kind_check
 check(kind in('inbound_turn','followup_turn','watchdog','flywheel','case_reply_turn','operator_turn','transactional_delivery','approved_reply','campaign_prepare'));

create or replace function public.fn_campaign_command(p_org uuid,p_action text,p_data jsonb,p_request uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
 c public.crm_scheduled_campaigns; v_name text; v_tag uuid; v_content text; v_at timestamptz;
 v_timezone text; v_count bigint; v_actor uuid:=auth.uid(); v_result jsonb;
 receipt public.idempotency_keys; fingerprint bytea; idem_key text;
begin
 if v_actor is null or not public.fn_role_at_least(p_org,'manager') or not public.fn_support_write_allowed(p_org) or not public.fn_session_mfa_proven() then
  raise exception 'campaign_forbidden' using errcode='42501';
 end if;
 if p_action not in('create','update','schedule','cancel') or p_request is null or jsonb_typeof(coalesce(p_data,'{}'::jsonb)) is distinct from 'object' then
  raise exception 'campaign_invalid' using errcode='22023';
 end if;
 perform 1 from public.organizations where id=p_org for update;
 if not found then raise exception 'organization_not_found' using errcode='P0002'; end if;
 if p_action<>'cancel' and not public.fn_capability_enabled(p_org,'scheduled_campaigns') then
  raise exception 'campaign_disabled' using errcode='42501';
 end if;
 fingerprint:=extensions.digest(jsonb_build_object('action',p_action,'data',p_data)::text,'sha256');
 idem_key:=v_actor::text||':'||p_request::text;
 select * into receipt from public.idempotency_keys where organization_id=p_org and key=idem_key and endpoint='campaign:'||p_action for update;
 if found and receipt.expires_at>now() then
  if receipt.request_hash is distinct from fingerprint then raise exception 'campaign_request_conflict' using errcode='23505'; end if;
  return receipt.response_body;
 end if;

 if p_action in('create','update') then
  if exists(select 1 from jsonb_object_keys(coalesce(p_data,'{}'::jsonb)) k where k not in('name','tag_id','content','channel'))
   or jsonb_typeof(p_data->'name') is distinct from 'string' or length(btrim(p_data->>'name')) not between 1 and 120
   or jsonb_typeof(p_data->'content') is distinct from 'string' or length(btrim(p_data->>'content')) not between 1 and 2000
   or coalesce(p_data->>'channel','whatsapp')<>'whatsapp' or coalesce(p_data->>'tag_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   raise exception 'campaign_invalid' using errcode='22023';
  end if;
  v_name:=btrim(p_data->>'name'); v_tag:=(p_data->>'tag_id')::uuid; v_content:=btrim(p_data->>'content');
  if not exists(select 1 from public.crm_tags t where t.organization_id=p_org and t.id=v_tag and not t.is_archived and t.merged_into is null) then
   raise exception 'campaign_tag_invalid' using errcode='23503';
  end if;
  select o.timezone into v_timezone from public.organizations o where o.id=p_org;
  if v_timezone is null then raise exception 'organization_not_found' using errcode='P0002'; end if;
  if p_action='create' then
   insert into public.crm_scheduled_campaigns(organization_id,created_by,name,channel,tag_id,content,timezone)
    values(p_org,v_actor,v_name,'whatsapp',v_tag,v_content,v_timezone) returning * into c;
   begin
    insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
     values(p_org,v_actor,'campaign.created','scheduled_campaign',c.id,jsonb_build_object('channel',c.channel,'tag_id',v_tag));
   exception when others then raise warning 'campaign_audit_failed'; end;
  else
   if coalesce(p_data->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'campaign_invalid' using errcode='22023'; end if;
   select * into c from public.crm_scheduled_campaigns where organization_id=p_org and id=(p_data->>'id')::uuid for update;
   if not found or c.status<>'draft' then raise exception 'campaign_not_editable' using errcode='55000'; end if;
   update public.crm_scheduled_campaigns set name=v_name,tag_id=v_tag,content=v_content,channel='whatsapp',timezone=v_timezone,updated_at=now()
    where organization_id=p_org and id=c.id returning * into c;
   begin
    insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
     values(p_org,v_actor,'campaign.updated','scheduled_campaign',c.id,jsonb_build_object('channel',c.channel,'tag_id',v_tag));
   exception when others then raise warning 'campaign_audit_failed'; end;
  end if;
  v_result:=to_jsonb(c);
 elsif p_action='schedule' then
  if exists(select 1 from jsonb_object_keys(coalesce(p_data,'{}'::jsonb)) k where k not in('id','scheduled_at'))
   or coalesce(p_data->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'campaign_invalid' using errcode='22023'; end if;
  begin v_at:=(p_data->>'scheduled_at')::timestamptz; exception when others then raise exception 'campaign_invalid' using errcode='22023'; end;
  if v_at is null or v_at<=now() then raise exception 'campaign_time_invalid' using errcode='22023'; end if;
  select * into c from public.crm_scheduled_campaigns where organization_id=p_org and id=(p_data->>'id')::uuid for update;
  if not found or c.status<>'draft' then raise exception 'campaign_not_schedulable' using errcode='55000'; end if;
  if not exists(select 1 from public.crm_tags t where t.organization_id=p_org and t.id=c.tag_id and not t.is_archived and t.merged_into is null) then raise exception 'campaign_tag_invalid' using errcode='23503'; end if;
  insert into public.crm_scheduled_campaign_recipients(organization_id,campaign_id,contact_id)
   select p_org,c.id,ta.entity_id from public.crm_tag_assignments ta
   join public.contacts ct on ct.organization_id=ta.organization_id and ct.id=ta.entity_id
   where ta.organization_id=p_org and ta.tag_id=c.tag_id and ta.entity_kind='contact'
   on conflict(campaign_id,contact_id) do nothing;
  get diagnostics v_count=row_count;
  if v_count=0 then raise exception 'campaign_audience_empty' using errcode='22023'; end if;
  update public.crm_scheduled_campaigns set status='scheduled',scheduled_at=v_at,preparation_batch=1,updated_at=now()
   where organization_id=p_org and id=c.id returning * into c;
  insert into public.job_queue(organization_id,contact_id,kind,source_event_id,payload,priority,run_after,max_attempts)
   values(p_org,null,'campaign_prepare',md5(c.id::text||':campaign-prepare:1')::uuid,jsonb_build_object('campaign_id',c.id,'batch',1),40,v_at,5)
   on conflict do nothing;
  begin
   insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
    values(p_org,v_actor,'campaign.scheduled','scheduled_campaign',c.id,jsonb_build_object('tag_id',c.tag_id,'recipient_count',v_count,'timezone',c.timezone,'scheduled_at',v_at));
  exception when others then raise warning 'campaign_audit_failed'; end;
  v_result:=jsonb_build_object('id',c.id,'status',c.status,'scheduled_at',c.scheduled_at,'timezone',c.timezone,'recipient_count',v_count);
 else
  if exists(select 1 from jsonb_object_keys(coalesce(p_data,'{}'::jsonb)) k where k not in('id'))
   or coalesce(p_data->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'campaign_invalid' using errcode='22023'; end if;
  select * into c from public.crm_scheduled_campaigns where organization_id=p_org and id=(p_data->>'id')::uuid for update;
  if not found or c.status not in('scheduled','preparing','prepared') then raise exception 'campaign_not_cancellable' using errcode='55000'; end if;
  update public.crm_scheduled_campaign_recipients set status='cancelled',reason_code='cancelled',updated_at=now()
   where organization_id=p_org and campaign_id=c.id and status in('pending','ready');
  update public.crm_scheduled_campaigns set status='cancelled',cancelled_at=now(),cancelled_by=v_actor,updated_at=now()
   where organization_id=p_org and id=c.id returning * into c;
  begin
   insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
    values(p_org,v_actor,'campaign.cancelled','scheduled_campaign',c.id,jsonb_build_object('reason','manager_cancelled'));
  exception when others then raise warning 'campaign_audit_failed'; end;
  v_result:=to_jsonb(c);
 end if;
 insert into public.idempotency_keys(organization_id,key,endpoint,request_hash,status_code,response_body,expires_at)
  values(p_org,idem_key,'campaign:'||p_action,fingerprint,200,v_result,now()+interval '24 hours')
  on conflict(organization_id,key,endpoint) do update set request_hash=excluded.request_hash,response_body=excluded.response_body,expires_at=excluded.expires_at;
 return v_result;
end $$;
revoke all on function public.fn_campaign_command(uuid,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.fn_campaign_command(uuid,text,jsonb,uuid) to authenticated;

create or replace function public.fn_campaign_prepare_batch(
 p_org uuid,p_campaign uuid,p_batch integer,p_job uuid,p_worker text,p_claim timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.crm_scheduled_campaigns; q public.job_queue; r record; v_reason text; v_count integer:=0; v_pending bigint; v_next integer;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'campaign_worker_forbidden' using errcode='42501'; end if;
 perform 1 from public.organizations where id=p_org for update;
 if not found then raise exception 'organization_not_found' using errcode='P0002'; end if;
 select * into q from public.job_queue where id=p_job and organization_id=p_org and kind='campaign_prepare'
  and status='running' and locked_by=p_worker and locked_at=p_claim for update;
 if not found or q.payload->>'campaign_id' is distinct from p_campaign::text or (q.payload->>'batch')::integer is distinct from p_batch then
  raise exception 'campaign_claim_stale' using errcode='42501';
 end if;
 select * into c from public.crm_scheduled_campaigns where organization_id=p_org and id=p_campaign for update;
 if not found then raise exception 'campaign_not_found' using errcode='P0002'; end if;
 if c.status not in('scheduled','preparing') or c.preparation_batch<>p_batch then
  return jsonb_build_object('status',c.status,'stale_batch',true,'processed',0);
 end if;
 if not public.fn_capability_enabled(p_org,'scheduled_campaigns') then
  update public.crm_scheduled_campaign_recipients set status='cancelled',reason_code='capability_disabled',updated_at=now()
   where organization_id=p_org and campaign_id=p_campaign and status='pending';
  update public.crm_scheduled_campaigns set status='cancelled',cancelled_at=now(),error_code='capability_disabled',updated_at=now()
   where organization_id=p_org and id=p_campaign;
  begin
   insert into public.api_audit_log(organization_id,action,resource_type,resource_id,metadata)
    values(p_org,'campaign.cancelled','scheduled_campaign',p_campaign,jsonb_build_object('reason','capability_disabled'));
  exception when others then raise warning 'campaign_audit_failed'; end;
  return jsonb_build_object('status','cancelled','reason','capability_disabled','processed',0);
 end if;
 update public.crm_scheduled_campaigns set status='preparing',updated_at=now() where organization_id=p_org and id=p_campaign;
 for r in
  select cr.id recipient_id,cr.contact_id,ct.id found_contact,ct.is_blocked,ct.force_human,ct.is_anonymized,ct.is_merged_into,
   ct.phone_number,ct.consent,ct.source
  from public.crm_scheduled_campaign_recipients cr
  left join public.contacts ct on ct.id=cr.contact_id and ct.organization_id=cr.organization_id
  where cr.organization_id=p_org and cr.campaign_id=p_campaign and cr.status='pending'
  order by cr.id limit 50 for update of cr skip locked
 loop
  v_reason:=case
   when r.contact_id is null or r.found_contact is null then 'contact_removed'
   when r.is_anonymized then 'contact_anonymized'
   when r.is_merged_into is not null then 'contact_merged'
   when r.is_blocked then 'contact_blocked'
   when r.force_human then 'requires_human'
   when coalesce(r.consent->'marketing'->>'declined_at','')<>'' then 'opted_out'
   when coalesce(r.phone_number,'') !~ '^[+][1-9][0-9]{1,14}$' then 'invalid_recipient'
   when coalesce(r.consent->'marketing'->>'granted_at','')='' and coalesce(r.consent->'legitimate_interest'->>'ref','')='' then 'marketing_consent_required'
   else null end;
  update public.crm_scheduled_campaign_recipients set status=case when v_reason is null then 'ready' else 'skipped' end,
   reason_code=v_reason,updated_at=now() where organization_id=p_org and id=r.recipient_id and campaign_id=p_campaign;
  v_count:=v_count+1;
 end loop;
 select count(*) into v_pending from public.crm_scheduled_campaign_recipients
  where organization_id=p_org and campaign_id=p_campaign and status='pending';
 if v_pending>0 then
  v_next:=p_batch+1;
  update public.crm_scheduled_campaigns set preparation_batch=v_next,updated_at=now() where organization_id=p_org and id=p_campaign;
  insert into public.job_queue(organization_id,contact_id,kind,source_event_id,payload,priority,run_after,max_attempts)
   values(p_org,null,'campaign_prepare',md5(p_campaign::text||':campaign-prepare:'||v_next::text)::uuid,
    jsonb_build_object('campaign_id',p_campaign,'batch',v_next),40,now(),5) on conflict do nothing;
  return jsonb_build_object('status','preparing','processed',v_count,'pending',v_pending,'batch',v_next);
 end if;
 update public.crm_scheduled_campaigns set status='prepared',prepared_at=now(),error_code='provider_unavailable',updated_at=now()
  where organization_id=p_org and id=p_campaign;
 begin
  insert into public.api_audit_log(organization_id,action,resource_type,resource_id,metadata)
   values(p_org,'campaign.prepared','scheduled_campaign',p_campaign,jsonb_build_object('batch',p_batch,'processed',v_count,'provider_status','unavailable'));
 exception when others then raise warning 'campaign_audit_failed'; end;
 return jsonb_build_object('status','prepared','processed',v_count,'pending',0,'provider_status','unavailable');
end $$;
revoke all on function public.fn_campaign_prepare_batch(uuid,uuid,integer,uuid,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.fn_campaign_prepare_batch(uuid,uuid,integer,uuid,text,timestamptz) to service_role;

create or replace function public.fn_campaign_fail_batch(
 p_org uuid,p_campaign uuid,p_job uuid,p_worker text,p_claim timestamptz
) returns jsonb language plpgsql security definer set search_path=public as $$
declare q public.job_queue; c public.crm_scheduled_campaigns;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'campaign_worker_forbidden' using errcode='42501'; end if;
 perform 1 from public.organizations where id=p_org for update;
 if not found then raise exception 'organization_not_found' using errcode='P0002'; end if;
 select * into q from public.job_queue where id=p_job and organization_id=p_org and kind='campaign_prepare'
  and status='running' and locked_by=p_worker and locked_at=p_claim and attempts>=max_attempts for update;
 if not found or q.payload->>'campaign_id' is distinct from p_campaign::text then raise exception 'campaign_claim_stale' using errcode='42501'; end if;
 select * into c from public.crm_scheduled_campaigns where organization_id=p_org and id=p_campaign for update;
 if not found or c.status not in('scheduled','preparing') then return jsonb_build_object('status',coalesce(c.status,'missing')); end if;
 update public.crm_scheduled_campaign_recipients set status='skipped',reason_code='preparation_failed',updated_at=now()
  where organization_id=p_org and campaign_id=p_campaign and status='pending';
 update public.crm_scheduled_campaigns set status='failed',error_code='preparation_failed',updated_at=now()
  where organization_id=p_org and id=p_campaign;
 begin
  insert into public.api_audit_log(organization_id,action,resource_type,resource_id,metadata)
   values(p_org,'campaign.preparation_failed','scheduled_campaign',p_campaign,jsonb_build_object('error_code','preparation_failed'));
 exception when others then raise warning 'campaign_audit_failed'; end;
 return jsonb_build_object('status','failed','error_code','preparation_failed');
end $$;
revoke all on function public.fn_campaign_fail_batch(uuid,uuid,uuid,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.fn_campaign_fail_batch(uuid,uuid,uuid,text,timestamptz) to service_role;

create or replace function public.fn_campaign_counts(p_org uuid,p_campaigns uuid[])
returns table(campaign_id uuid,total_count bigint,pending_count bigint,ready_count bigint,skipped_count bigint,cancelled_count bigint)
language sql stable security invoker set search_path=public as $$
 select r.campaign_id,count(*)::bigint,
  count(*) filter(where r.status='pending')::bigint,
  count(*) filter(where r.status='ready')::bigint,
  count(*) filter(where r.status='skipped')::bigint,
  count(*) filter(where r.status='cancelled')::bigint
 from public.crm_scheduled_campaign_recipients r
 where r.organization_id=p_org and r.campaign_id=any(coalesce(p_campaigns,'{}'::uuid[]))
 group by r.campaign_id
$$;
revoke all on function public.fn_campaign_counts(uuid,uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.fn_campaign_counts(uuid,uuid[]) to authenticated;

comment on table public.crm_scheduled_campaigns is 'Optional campaigns. `prepared` means audience classified; no provider send is implemented or implied.';
comment on table public.crm_scheduled_campaign_recipients is 'Per-contact frozen audience and preparation result. `ready` never means sent or delivered.';

notify pgrst,'reload schema';
