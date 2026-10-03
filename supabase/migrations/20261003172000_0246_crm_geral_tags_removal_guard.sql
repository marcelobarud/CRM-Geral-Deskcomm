-- Forward-fix: remover a última tag também exige sessão válida na ponte.
create or replace function public.fn_crm_tags_legacy_bridge()
returns trigger language plpgsql security definer set search_path=public as $$
declare kind text; allow_create boolean;
begin
 kind:=case tg_table_name when 'contacts' then 'contact' when 'crm_leads' then 'lead' when 'conversations' then 'conversation' end;
 if tg_op='DELETE' then
  delete from public.crm_tag_assignments where organization_id=old.organization_id and entity_kind=kind and entity_id=old.id;
  return old;
 end if;
 if auth.uid() is not null and coalesce(auth.jwt()->>'role','')<>'service_role' and (cardinality(new.tags)>0 or exists(select 1 from public.crm_tag_assignments where organization_id=new.organization_id and entity_kind=kind and entity_id=new.id)) and (not coalesce(public.fn_support_write_allowed(new.organization_id),false) or not coalesce(public.fn_session_mfa_proven(),false)) then raise exception 'tag_session_required' using errcode='42501'; end if;
 allow_create:=auth.uid() is null or public.fn_user_role_in_org(new.organization_id)='admin' or auth.jwt()->>'role'='service_role';
 perform public.fn_crm_tags_write_legacy(new.organization_id,kind,new.id,new.tags,coalesce(allow_create,false));
 return new;
end $$;


revoke execute on function public.fn_crm_tags_legacy_bridge() from public,anon,authenticated,service_role;
