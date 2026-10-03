-- 0253: criação idempotente por ator/tenant, usando ledger existente.
create or replace function public.fn_crm_company_command(p_org uuid,p_action text,p_company uuid default null,p_data jsonb default '{}'::jsonb,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare receipt public.idempotency_keys; result jsonb; fingerprint bytea; request_key text;
begin
 if coalesce(public.fn_user_role_in_org(p_org),'')<>'admin' or not coalesce(public.fn_support_write_allowed(p_org),false) or not coalesce(public.fn_session_mfa_proven(),false) then raise exception 'company_admin_required' using errcode='42501'; end if;
 if p_action<>'create' or p_request is null then return public.fn_crm_company_manage(p_org,p_action,p_company,p_data); end if;
 perform pg_advisory_xact_lock(hashtextextended('crm-companies:'||p_org::text,0));
 request_key:=auth.uid()::text||':'||p_request::text;
 fingerprint:=extensions.digest(p_data::text,'sha256');
 select * into receipt from public.idempotency_keys where organization_id=p_org and key=request_key and endpoint='crm-company:create' for update;
 if found and receipt.expires_at>now() then
  if receipt.request_hash is distinct from fingerprint then raise exception 'company_request_conflict' using errcode='23505'; end if;
  return receipt.response_body;
 end if;
 result:=public.fn_crm_company_manage(p_org,p_action,p_company,p_data);
 insert into public.idempotency_keys(organization_id,key,endpoint,request_hash,status_code,response_body,expires_at)
 values(p_org,request_key,'crm-company:create',fingerprint,200,result,now()+interval '24 hours')
 on conflict(organization_id,key,endpoint) do update set request_hash=excluded.request_hash,status_code=excluded.status_code,response_body=excluded.response_body,created_at=now(),expires_at=excluded.expires_at;
 return result;
end $$;
revoke execute on function public.fn_crm_company_command(uuid,text,uuid,jsonb,uuid) from public,anon,service_role;
grant execute on function public.fn_crm_company_command(uuid,text,uuid,jsonb,uuid) to authenticated;
-- Auditoria segue o contrato de não bloquear a mutação por indisponibilidade do log.
create or replace function public.fn_crm_contact_company_history() returns trigger language plpgsql security definer set search_path=public as $$
declare previous uuid;
begin
 if TG_OP='UPDATE' then previous:=old.company_id; end if;
 if new.company_id is not distinct from previous then return new; end if;
 begin
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
 values(new.organization_id,auth.uid(),'contact.company_changed','contact',new.id,jsonb_build_object('previous_company_id',previous,'company_id',new.company_id));
 exception when others then raise warning 'crm_company_history_write_failed'; end;
 return new;
end $$;
revoke execute on function public.fn_crm_contact_company_history() from public,anon,authenticated,service_role;

