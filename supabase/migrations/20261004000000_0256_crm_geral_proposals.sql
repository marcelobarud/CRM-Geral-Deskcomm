create or replace function public.fn_capability_enabled(p_org uuid, p_capability text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare c jsonb; v jsonb;
begin
  if p_capability not in ('message_templates','proposals') or p_capability is null then return false; end if;
  if auth.uid() is not null and not public.fn_role_at_least(p_org,'viewer') then return false; end if;
  select settings->'capabilities' into c from public.organizations where id=p_org;
  if not found then return false; end if;
  if c is null or c='null'::jsonb then return p_capability='message_templates'; end if;
  if jsonb_typeof(c) is distinct from 'object' or c->'version' is distinct from '1'::jsonb
    or jsonb_typeof(c->'revision') is distinct from 'number'
    or coalesce(c->>'revision','') !~ '^[0-9]{1,16}$'
    or jsonb_typeof(c->'overrides') is distinct from 'object' then return false; end if;
  if (c->>'revision')::numeric > 9007199254740991 then return false; end if;
  v:=c->'overrides'->p_capability;
  if v is null then return p_capability='message_templates'; end if;
  return v='true'::jsonb;
end; $$;
revoke all on function public.fn_capability_enabled(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_capability_enabled(uuid,text) to authenticated,service_role;


create or replace function public.fn_set_capability(p_org uuid,p_capability text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; overrides jsonb; revision bigint; previous boolean; previous_context text;
begin
  if auth.uid() is null or not public.fn_role_at_least(p_org,'admin') or not public.fn_support_write_allowed(p_org)
    or not public.fn_session_mfa_proven() then raise exception 'capability_forbidden' using errcode='42501'; end if;
  if (p_capability is null or p_capability not in ('message_templates','proposals')) or p_enabled is null then raise exception 'capability_invalid' using errcode='22023'; end if;
  select settings->'capabilities' into c from public.organizations where id=p_org for update;
  if not found then raise exception 'organization_not_found' using errcode='P0002'; end if;
  previous:=public.fn_capability_enabled(p_org,p_capability);
  revision:=0;
  if jsonb_typeof(c)='object' and c->'version'='1'::jsonb and jsonb_typeof(c->'revision')='number'
    and coalesce(c->>'revision','') ~ '^[0-9]{1,16}$' then
    if (c->>'revision')::numeric < 9007199254740991 then revision:=(c->>'revision')::bigint; end if;
  end if;
  overrides:=case when c->'version'='1'::jsonb and jsonb_typeof(c->'overrides')='object' then c->'overrides' else '{}'::jsonb end;
  previous_context:=current_setting('crm.capabilities_write',true);
  perform set_config('crm.capabilities_write','1',true);
  update public.organizations set settings=jsonb_set(coalesce(settings,'{}'::jsonb),'{capabilities}',
    jsonb_build_object('version',1,'revision',revision+1,'overrides',overrides||jsonb_build_object(p_capability,p_enabled)),true)
    where id=p_org;
  perform set_config('crm.capabilities_write',coalesce(previous_context,''),true);
  return jsonb_build_object('previous_enabled',previous,'enabled',p_enabled,'revision',revision+1);
end; $$;
revoke all on function public.fn_set_capability(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.fn_set_capability(uuid,text,boolean) to authenticated;


revoke execute on function public.fn_set_capability(uuid,text,boolean) from service_role;


-- 0256: Propostas opcionais; documentos históricos por versão, sem transporte.
create table if not exists public.crm_proposal_templates (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(length(name) between 1 and 160), currency text not null check(currency ~ '^[A-Z]{3}$'),
 content jsonb not null, created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 unique(organization_id,id)
);
create table if not exists public.crm_proposals (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 lead_id uuid references public.crm_leads(id) on delete set null, contact_id uuid references public.contacts(id) on delete set null,
 title text not null check(length(title) between 1 and 160), currency text not null check(currency ~ '^[A-Z]{3}$'),
 notes text not null default '', status text not null default 'draft' check(status in ('draft','sent','archived')),
 draft_revision integer not null default 1, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id),
 check(lead_id is null or contact_id is null)
);
create table if not exists public.crm_proposal_items (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 proposal_id uuid not null, product_id uuid references public.catalog_products(id) on delete set null,
 description text not null check(length(description) between 1 and 1000), quantity numeric(12,3) not null check(quantity>0),
 unit_price_cents bigint not null check(unit_price_cents>=0 and unit_price_cents<=9007199254740991),
 position integer not null check(position>=0), foreign key(organization_id,proposal_id) references public.crm_proposals(organization_id,id) on delete cascade,
 unique(proposal_id,position)
);
create table if not exists public.crm_proposal_versions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 proposal_id uuid not null, version_number integer not null, draft_revision integer not null,
 request_id uuid not null, snapshot jsonb not null, total_cents bigint not null check(total_cents>=0), currency text not null,
 state text not null default 'prepared' check(state in ('prepared','sent')), pdf_path text not null unique,
 pdf_sha256 text, recipient text not null, channel text not null check(channel in ('email','whatsapp','other')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), sent_at timestamptz,
 foreign key(organization_id,proposal_id) references public.crm_proposals(organization_id,id) on delete cascade,
 unique(proposal_id,version_number), unique(organization_id,created_by,request_id),
 check((state='prepared' and sent_at is null) or (state='sent' and sent_at is not null and pdf_sha256 ~ '^[a-f0-9]{64}$'))
);
create index if not exists crm_proposals_org_updated on public.crm_proposals(organization_id,updated_at desc,id);
create index if not exists crm_proposals_lead on public.crm_proposals(organization_id,lead_id);
create index if not exists crm_proposals_contact on public.crm_proposals(organization_id,contact_id);
create index if not exists crm_proposal_items_org_proposal on public.crm_proposal_items(organization_id,proposal_id);
create index if not exists crm_proposal_versions_org_proposal on public.crm_proposal_versions(organization_id,proposal_id,version_number);
create or replace function public.fn_proposal_access(p_org uuid,p_proposal uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and public.fn_role_at_least(p_org,'agent') and exists(
 select 1 from public.crm_proposals p where p.organization_id=p_org and p.id=p_proposal
 and (public.fn_role_at_least(p_org,'manager') or p.created_by=auth.uid()))
$$;
revoke all on function public.fn_proposal_access(uuid,uuid) from public,anon,service_role;
grant execute on function public.fn_proposal_access(uuid,uuid) to authenticated;
do $$ declare tab text; begin
 foreach tab in array array['crm_proposals','crm_proposal_items','crm_proposal_versions','crm_proposal_templates'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('revoke all on public.%I from anon,authenticated',tab);
 execute format('grant select on public.%I to authenticated',tab);
 execute format('grant all on public.%I to service_role',tab);
 execute format('drop policy if exists proposal_read on public.%I',tab);
 if tab='crm_proposals' then
 execute format('create policy proposal_read on public.%I for select to authenticated using (public.fn_proposal_access(organization_id,id))',tab);
 elsif tab='crm_proposal_templates' then
 execute format('create policy proposal_read on public.%I for select to authenticated using (public.fn_role_at_least(organization_id,''agent''))',tab);
 else
 execute format('create policy proposal_read on public.%I for select to authenticated using (public.fn_proposal_access(organization_id,proposal_id))',tab);
 end if;
 end loop;
end $$;
create or replace function public.fn_proposal_integrity() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_TABLE_NAME='crm_proposals' then
 if new.lead_id is not null and not exists(select 1 from public.crm_leads where id=new.lead_id and organization_id=new.organization_id) then raise exception 'proposal_lead_tenant' using errcode='23503'; end if;
 if new.contact_id is not null and not exists(select 1 from public.contacts where id=new.contact_id and organization_id=new.organization_id) then raise exception 'proposal_contact_tenant' using errcode='23503'; end if;
 elsif new.product_id is not null and not exists(select 1 from public.catalog_products where id=new.product_id and organization_id=new.organization_id) then raise exception 'proposal_product_tenant' using errcode='23503'; end if;
 return new;
end $$;
revoke all on function public.fn_proposal_integrity() from public,anon,authenticated,service_role;
drop trigger if exists proposal_integrity on public.crm_proposals;
create trigger proposal_integrity before insert or update on public.crm_proposals for each row execute function public.fn_proposal_integrity();
drop trigger if exists proposal_item_integrity on public.crm_proposal_items;
create trigger proposal_item_integrity before insert or update on public.crm_proposal_items for each row execute function public.fn_proposal_integrity();
create or replace function public.fn_proposal_version_immutable() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='DELETE' then
 -- Exclusão controlada da organização é necessária para descarte/fixtures.
 if exists(select 1 from public.organizations where id=old.organization_id) then raise exception 'proposal_version_immutable' using errcode='42501'; end if;
 return old;
 end if;
 if old.state='sent' or (to_jsonb(new)-array['state','sent_at','pdf_sha256']) is distinct from (to_jsonb(old)-array['state','sent_at','pdf_sha256']) then raise exception 'proposal_version_immutable' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function public.fn_proposal_version_immutable() from public,anon,authenticated,service_role;
drop trigger if exists proposal_version_immutable on public.crm_proposal_versions;
create trigger proposal_version_immutable before update or delete on public.crm_proposal_versions for each row execute function public.fn_proposal_version_immutable();
-- Storage privado: somente servidor autorizado cria bytes; JWTs só leem seu contexto.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('proposal-documents','proposal-documents',false,10485760,array['application/pdf'])
 on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists proposal_documents_read on storage.objects;
create policy proposal_documents_read on storage.objects for select to authenticated using(
 bucket_id='proposal-documents' and exists(select 1 from public.crm_proposal_versions v where v.pdf_path=name and public.fn_proposal_access(v.organization_id,v.proposal_id)));
drop policy if exists proposal_documents_write_fence on storage.objects;
create policy proposal_documents_write_fence on storage.objects as restrictive for all to authenticated using(
 bucket_id<>'proposal-documents' or exists(select 1 from public.crm_proposal_versions v where v.pdf_path=name and public.fn_proposal_access(v.organization_id,v.proposal_id)))
 with check(bucket_id<>'proposal-documents');
notify pgrst,'reload schema';
-- Cerca de exclusão: permissões históricas de outros buckets não autorizam este.
drop policy if exists proposal_documents_delete_fence on storage.objects;
create policy proposal_documents_delete_fence on storage.objects as restrictive for delete to authenticated using(bucket_id<>'proposal-documents');
create or replace function public.fn_proposal_command(p_org uuid,p_action text,p_proposal uuid default null,p_data jsonb default '{}'::jsonb,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.crm_proposals; v public.crm_proposal_versions; receipt public.idempotency_keys;
 r jsonb; item jsonb; items jsonb; ctx jsonb; fingerprint bytea; k text; t bigint; next_id uuid; version_id uuid;
 template public.crm_proposal_templates; l public.crm_leads; linked_contact uuid; n integer:=0;
begin
 if auth.uid() is null or not public.fn_role_at_least(p_org,'agent') or not public.fn_support_write_allowed(p_org) or not public.fn_session_mfa_proven() then raise exception 'proposal_forbidden' using errcode='42501'; end if;
 perform 1 from public.organizations where id=p_org for update;
 if not public.fn_capability_enabled(p_org,'proposals') then raise exception 'proposal_disabled' using errcode='42501'; end if;
 if p_action not in ('create','update','template_create','prepare','finalize','archive') or p_request is null then raise exception 'proposal_command_invalid' using errcode='22023'; end if;
 fingerprint:=extensions.digest(jsonb_build_object('proposal',p_proposal,'data',p_data)::text,'sha256');
 k:=auth.uid()::text||':'||p_request::text;
 select * into receipt from public.idempotency_keys where organization_id=p_org and key=k and endpoint='proposal:'||p_action for update;
 if found and receipt.expires_at>now() then
 if receipt.request_hash is distinct from fingerprint then raise exception 'proposal_request_conflict' using errcode='23505'; end if;
 return receipt.response_body;
 end if;
 if p_action='template_create' then
 if not public.fn_role_at_least(p_org,'manager') then raise exception 'proposal_template_manager' using errcode='42501'; end if;
 insert into public.crm_proposal_templates(organization_id,name,currency,content,created_by) values(p_org,p_data->>'name',p_data->>'currency',p_data->'content',auth.uid()) returning to_jsonb(crm_proposal_templates.*) into r;
 else
 if p_action<>'create' then
 select * into p from public.crm_proposals where organization_id=p_org and id=p_proposal for update;
 if not found or not public.fn_proposal_access(p_org,p_proposal) then raise exception 'proposal_not_found' using errcode='P0002'; end if;
 if p.status='archived' then raise exception 'proposal_archived' using errcode='23514'; end if;
 end if;
 if p_action in ('create','update') then
 if p_action='update' and (p_data->>'expected_revision')::integer is distinct from p.draft_revision then raise exception 'proposal_revision_conflict' using errcode='23505'; end if;
 if p_action='create' then
 if nullif(p_data->>'lead_id','') is not null then
 select * into l from public.crm_leads where id=(p_data->>'lead_id')::uuid and organization_id=p_org;
 if not found or (not public.fn_role_at_least(p_org,'manager') and l.owner_user_id is distinct from auth.uid()) then raise exception 'proposal_lead_forbidden' using errcode='42501'; end if;
 end if;
 insert into public.crm_proposals(organization_id,lead_id,contact_id,title,currency,notes,created_by)
 values(p_org,nullif(p_data->>'lead_id','')::uuid,nullif(p_data->>'contact_id','')::uuid,p_data->>'title',p_data->>'currency',coalesce(p_data->>'notes',''),auth.uid()) returning * into p;
 else
 update public.crm_proposals set title=p_data->>'title',currency=p_data->>'currency',notes=coalesce(p_data->>'notes',''),draft_revision=draft_revision+1,status='draft',updated_at=now() where id=p.id and organization_id=p_org returning * into p;
 end if;
 items:=p_data->'items';
 if nullif(p_data->>'template_id','') is not null then
 select * into template from public.crm_proposal_templates where id=(p_data->>'template_id')::uuid and organization_id=p_org;
 if not found or template.currency<>p.currency then raise exception 'proposal_template_invalid' using errcode='23503'; end if;
 items:=template.content->'items';
 update public.crm_proposals set notes=coalesce(template.content->>'notes','') where id=p.id and organization_id=p_org returning * into p;
 end if;
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 100 then raise exception 'proposal_items_invalid' using errcode='22023'; end if;
 delete from public.crm_proposal_items where proposal_id=p.id and organization_id=p_org;
 for item in select value from jsonb_array_elements(items) loop
 if coalesce(item->>'quantity','') !~ '^[0-9]{1,9}(\.[0-9]{1,3})?$' or coalesce(item->>'unit_price_cents','') !~ '^[0-9]{1,16}$' then raise exception 'proposal_money_invalid' using errcode='22023'; end if;
 insert into public.crm_proposal_items(organization_id,proposal_id,product_id,description,quantity,unit_price_cents,position)
 values(p_org,p.id,nullif(item->>'product_id','')::uuid,item->>'description',(item->>'quantity')::numeric,(item->>'unit_price_cents')::bigint,n); n:=n+1;
 end loop;
 select sum(round(quantity*unit_price_cents))::bigint into t from public.crm_proposal_items where organization_id=p_org and proposal_id=p.id;
 if t>9007199254740991 then raise exception 'proposal_total_overflow' using errcode='22003'; end if;
 r:=to_jsonb(p)||jsonb_build_object('total_cents',t::text);
 elsif p_action='prepare' then
 if length(coalesce(p_data->>'recipient','')) not between 1 and 300 or p_data->>'channel' not in ('email','whatsapp','other') then raise exception 'proposal_recipient_invalid' using errcode='22023'; end if;
 linked_contact:=p.contact_id;
 if p.lead_id is not null then select contact_id into linked_contact from public.crm_leads where organization_id=p_org and id=p.lead_id; end if;
 select jsonb_build_object('contact',jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone_number),'company',to_jsonb(co)-array['organization_id','created_at','updated_at']) into ctx
 from public.contacts c left join public.crm_companies co on co.id=c.company_id and co.organization_id=p_org where c.id=linked_contact and c.organization_id=p_org;
 select jsonb_agg(jsonb_build_object('description',description,'quantity',quantity::text,'unit_price_cents',unit_price_cents::text,'total_cents',round(quantity*unit_price_cents)::text) order by position),sum(round(quantity*unit_price_cents))::bigint into items,t
 from public.crm_proposal_items where organization_id=p_org and proposal_id=p.id;
 if items is null then raise exception 'proposal_items_missing' using errcode='23514'; end if;
 version_id:=gen_random_uuid();
 insert into public.crm_proposal_versions(id,organization_id,proposal_id,version_number,draft_revision,request_id,snapshot,total_cents,currency,pdf_path,recipient,channel,created_by)
 values(version_id,p_org,p.id,(select coalesce(max(version_number),0)+1 from public.crm_proposal_versions where organization_id=p_org and proposal_id=p.id),p.draft_revision,p_request,
 jsonb_build_object('title',p.title,'notes',p.notes,'currency',p.currency,'items',items,'total_cents',t::text,'context',ctx,'brand',p_data->'brand','author_id',auth.uid(),'created_at',now()),t,p.currency,p_org::text||'/'||p.id::text||'/'||version_id::text||'.pdf',p_data->>'recipient',p_data->>'channel',auth.uid()) returning * into v;
 r:=to_jsonb(v);
 elsif p_action='finalize' then
 select * into v from public.crm_proposal_versions where id=(p_data->>'version_id')::uuid and organization_id=p_org and proposal_id=p.id for update;
 if not found then raise exception 'proposal_version_not_found' using errcode='P0002'; end if;
 if v.state='sent' then r:=to_jsonb(v);
 else
 if coalesce(p_data->>'pdf_sha256','') !~ '^[a-f0-9]{64}$' or not exists(select 1 from storage.objects where bucket_id='proposal-documents' and name=v.pdf_path) then raise exception 'proposal_pdf_missing' using errcode='23514'; end if;
 update public.crm_proposal_versions set state='sent',pdf_sha256=p_data->>'pdf_sha256',sent_at=now() where id=v.id and organization_id=p_org returning * into v;
 update public.crm_proposals set status=case when draft_revision=v.draft_revision then 'sent' else 'draft' end,updated_at=now() where id=p.id and organization_id=p_org;
 r:=to_jsonb(v);
 end if;
 elsif p_action='archive' then
 update public.crm_proposals set status='archived',updated_at=now() where id=p.id and organization_id=p_org returning to_jsonb(crm_proposals.*) into r;
 end if;
 end if;
 -- Histórico reutiliza a timeline, sem evento sem consumidor ou conteúdo pessoal no log.
 if p_action in ('create','finalize','archive') and p.lead_id is not null then
 insert into public.crm_lead_activities(organization_id,lead_id,source_module,source_id,type,payload,performed_by_user_id)
 values(p_org,p.lead_id,'proposals',p.id,'note',jsonb_build_object('body',case p_action when 'create' then 'Proposta criada' when 'finalize' then 'Versão da proposta registrada como enviada' else 'Proposta arquivada' end,'proposal_id',p.id),auth.uid());
 end if;
 begin
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
 values(p_org,auth.uid(),'proposal.'||p_action,'proposal',coalesce(p.id, nullif(r->>'id','')::uuid),jsonb_build_object('request_id',p_request));
 exception when others then raise warning 'proposal_audit_failed'; end;
 insert into public.idempotency_keys(organization_id,key,endpoint,request_hash,status_code,response_body,expires_at)
 values(p_org,k,'proposal:'||p_action,fingerprint,200,r,now()+interval '24 hours')
 on conflict(organization_id,key,endpoint) do update set request_hash=excluded.request_hash,response_body=excluded.response_body,expires_at=excluded.expires_at;
 return r;
end $$;
revoke all on function public.fn_proposal_command(uuid,text,uuid,jsonb,uuid) from public,anon,service_role;
grant execute on function public.fn_proposal_command(uuid,text,uuid,jsonb,uuid) to authenticated;