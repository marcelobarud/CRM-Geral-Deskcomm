-- 0251: Empresa comercial não é organization (tenant).
create table if not exists public.crm_companies (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 200),
 legal_name text, document text, document_type text, email text, phone text,
 website text, address text, city text, state text, country text, notes text,
 is_archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,organization_id),
 constraint crm_companies_document_pair check ((nullif(btrim(document),'') is null) = (nullif(btrim(document_type),'') is null))
);
create unique index if not exists crm_companies_document_unique on public.crm_companies(organization_id,lower(btrim(document_type)),lower(btrim(document))) where document is not null;
create index if not exists crm_companies_org_name on public.crm_companies(organization_id,name);
alter table public.crm_companies enable row level security;
revoke all on public.crm_companies from public,anon,authenticated,service_role;
grant select on public.crm_companies to authenticated,service_role;
drop policy if exists tenant_isolation_crm_companies_select on public.crm_companies;
create policy tenant_isolation_crm_companies_select on public.crm_companies for select to authenticated using (organization_id in(select public.fn_user_org_ids()));
alter table public.contacts add column if not exists company_id uuid;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.contacts'::regclass and conname='contacts_company_same_org') then
 alter table public.contacts add constraint contacts_company_same_org foreign key(company_id,organization_id) references public.crm_companies(id,organization_id) on delete restrict;
 end if;
end $$;
create index if not exists contacts_company_org on public.contacts(company_id,organization_id) where company_id is not null;

create or replace function public.fn_crm_company_manage(p_org uuid,p_action text,p_company uuid default null,p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare chosen uuid; current_row public.crm_companies; audit_ok boolean:=true;
begin
 if coalesce(public.fn_user_role_in_org(p_org),'')<>'admin' or not coalesce(public.fn_support_write_allowed(p_org),false) or not coalesce(public.fn_session_mfa_proven(),false) then raise exception 'company_admin_required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('crm-companies:'||p_org::text,0));
 if p_action not in ('create','edit','archive') or jsonb_typeof(p_data)<>'object' or exists(select 1 from jsonb_object_keys(p_data) k where k not in ('name','legal_name','document','document_type','email','phone','website','address','city','state','country','notes')) then raise exception 'company_input_invalid' using errcode='22023'; end if;
 if p_action='create' then
  insert into public.crm_companies(organization_id,name) values(p_org,btrim(regexp_replace(p_data->>'name','[[:space:]]+',' ','g'))) returning id into chosen;
 else
  select * into current_row from public.crm_companies where id=p_company and organization_id=p_org and not is_archived for update;
  if not found then raise exception 'company_unavailable' using errcode='23503'; end if;
  chosen:=p_company;
 end if;
 if p_action='archive' then
  if exists(select 1 from public.contacts where organization_id=p_org and company_id=chosen) then raise exception 'company_in_use' using errcode='23503'; end if;
  update public.crm_companies set is_archived=true,updated_at=now() where id=chosen and organization_id=p_org;
 else
  update public.crm_companies set
   name=case when p_data ? 'name' then btrim(regexp_replace(p_data->>'name','[[:space:]]+',' ','g')) else name end,
   legal_name=case when p_data ? 'legal_name' then nullif(btrim(p_data->>'legal_name'),'') else legal_name end,
   document=case when p_data ? 'document' then nullif(btrim(p_data->>'document'),'') else document end,
   document_type=case when p_data ? 'document_type' then nullif(btrim(p_data->>'document_type'),'') else document_type end,
   email=case when p_data ? 'email' then nullif(btrim(p_data->>'email'),'') else email end,
   phone=case when p_data ? 'phone' then nullif(btrim(p_data->>'phone'),'') else phone end,
   website=case when p_data ? 'website' then nullif(btrim(p_data->>'website'),'') else website end,
   address=case when p_data ? 'address' then nullif(btrim(p_data->>'address'),'') else address end,
   city=case when p_data ? 'city' then nullif(btrim(p_data->>'city'),'') else city end,
   state=case when p_data ? 'state' then nullif(btrim(p_data->>'state'),'') else state end,
   country=case when p_data ? 'country' then nullif(btrim(p_data->>'country'),'') else country end,
   notes=case when p_data ? 'notes' then nullif(btrim(p_data->>'notes'),'') else notes end,
   updated_at=now() where id=chosen and organization_id=p_org;
 end if;
 begin
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
  values(p_org,auth.uid(),'company.'||p_action,'crm_company',chosen,'{}');
 exception when others then audit_ok:=false; end;
 return jsonb_build_object('company_id',chosen,'audit_recorded',audit_ok);
end $$;
revoke execute on function public.fn_crm_company_manage(uuid,text,uuid,jsonb) from public,anon,service_role;
grant execute on function public.fn_crm_company_manage(uuid,text,uuid,jsonb) to authenticated;

create or replace function public.fn_crm_contact_company_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare previous uuid;
begin
 if TG_OP='UPDATE' then previous:=old.company_id; end if;
 if TG_OP='UPDATE' and new.is_anonymized and not old.is_anonymized then new.company_id:=null; end if;
 if new.company_id is not distinct from previous and (TG_OP='INSERT' or new.organization_id=old.organization_id) then return new; end if;
 if new.company_id is not null and (new.is_anonymized or new.is_merged_into is not null) then raise exception 'contact_unavailable' using errcode='23503'; end if;
 if not public.fn_crm_tags_write_allowed(new.organization_id) then raise exception 'company_link_forbidden' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('crm-companies:'||new.organization_id::text,0));
 if new.company_id is not null and not exists(select 1 from public.crm_companies where id=new.company_id and organization_id=new.organization_id and not is_archived) then raise exception 'company_reference_invalid' using errcode='23503'; end if;
 return new;
end $$;
revoke execute on function public.fn_crm_contact_company_guard() from public,anon,authenticated,service_role;
drop trigger if exists crm_contact_company_guard on public.contacts;
create trigger crm_contact_company_guard before insert or update on public.contacts for each row execute function public.fn_crm_contact_company_guard();

create or replace function public.fn_crm_contact_company_history() returns trigger language plpgsql security definer set search_path=public as $$
declare previous uuid; description text;
begin
 if TG_OP='UPDATE' then previous:=old.company_id; end if;
 if new.company_id is not distinct from previous then return new; end if;
 description:=case when new.company_id is null then 'Vínculo com empresa removido.' when previous is null then 'Empresa vinculada ao contato.' else 'Empresa vinculada ao contato alterada.' end;
 insert into public.crm_lead_activities(organization_id,contact_id,source_module,source_id,type,payload,performed_by_user_id,actor_kind,reason)
 values(new.organization_id,new.id,'crm',new.id,'note',jsonb_build_object('previous_company_id',previous,'company_id',new.company_id),auth.uid(),case when auth.uid() is null then 'system' else 'human' end,description);
 begin
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
 values(new.organization_id,auth.uid(),'contact.company_changed','contact',new.id,jsonb_build_object('previous_company_id',previous,'company_id',new.company_id));
 exception when others then null; end;
 return new;
end $$;
revoke execute on function public.fn_crm_contact_company_history() from public,anon,authenticated,service_role;
drop trigger if exists crm_contact_company_history on public.contacts;
create trigger crm_contact_company_history after insert or update on public.contacts for each row execute function public.fn_crm_contact_company_history();
