-- Bloco H 0274: permite o id obrigatório em update e o rejeita em create.
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
  if exists(select 1 from jsonb_object_keys(coalesce(p_data,'{}'::jsonb)) k where k not in('name','tag_id','content','channel','id'))
   or (p_action='create' and p_data ? 'id')
   or (p_action='update' and not (p_data ? 'id'))
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

notify pgrst,'reload schema';
