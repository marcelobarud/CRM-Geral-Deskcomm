-- 0252: vínculos de contato sem negócio usam auditoria existente, projetada na timeline.
create or replace function public.fn_crm_contact_company_history() returns trigger language plpgsql security definer set search_path=public as $$
declare previous uuid;
begin
 if TG_OP='UPDATE' then previous:=old.company_id; end if;
 if new.company_id is not distinct from previous then return new; end if;
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
 values(new.organization_id,auth.uid(),'contact.company_changed','contact',new.id,jsonb_build_object('previous_company_id',previous,'company_id',new.company_id));
 return new;
end $$;
revoke execute on function public.fn_crm_contact_company_history() from public,anon,authenticated,service_role;
create or replace function public.fn_crm_company_contact_history(p_org uuid,p_contact uuid,p_limit int default 50,p_before timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or p_org not in(select public.fn_user_org_ids()) or not public.fn_crm_tag_target_visible(p_org,'contact',p_contact) then raise exception 'contact_unavailable' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(h)),'[]'::jsonb) into result from (
 select id,organization_id,actor_user_id,created_at,metadata
 from public.api_audit_log where organization_id=p_org and resource_type='contact' and resource_id=p_contact and action='contact.company_changed'
 and (p_before is null or (created_at,id)<(p_before,p_before_id))
 order by created_at desc,id desc limit least(greatest(p_limit,1),101)) h;
 return result;
end $$;
revoke execute on function public.fn_crm_company_contact_history(uuid,uuid,int,timestamptz,uuid) from public,anon,service_role;
grant execute on function public.fn_crm_company_contact_history(uuid,uuid,int,timestamptz,uuid) to authenticated;

