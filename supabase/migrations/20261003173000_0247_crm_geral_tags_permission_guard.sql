-- Guard estreito: expõe somente permissão do próprio ator, não helpers privados.
create or replace function public.fn_crm_tags_write_allowed(p_org uuid) returns boolean language sql stable security definer set search_path=public as $$
 select coalesce(auth.jwt()->>'role','')='service_role' or (auth.uid() is not null and coalesce(public.fn_user_role_in_org(p_org),'') in('agent','manager','admin') and coalesce(public.fn_support_write_allowed(p_org),false) and coalesce(public.fn_session_mfa_proven(),false))
$$;
revoke execute on function public.fn_crm_tags_write_allowed(uuid) from public,anon;
grant execute on function public.fn_crm_tags_write_allowed(uuid) to authenticated,service_role;
create or replace function public.fn_crm_tag_assign(p_org uuid,p_kind text,p_record uuid,p_tag uuid,p_assign boolean)
returns jsonb language plpgsql set search_path=public as $$
declare chosen uuid;
begin
 if not public.fn_crm_tags_write_allowed(p_org) then raise exception 'tag_session_required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('crm-tags:'||p_org::text,0));
 if not public.fn_crm_tag_target_visible(p_org,p_kind,p_record) then raise exception 'tag_target_invalid' using errcode='23503'; end if;
 select coalesce(merged_into,id) into chosen from public.crm_tags where id=p_tag and organization_id=p_org;
 if chosen is null or not exists(select 1 from public.crm_tags where id=chosen and organization_id=p_org and not is_archived and merged_into is null) then raise exception 'tag_reference_invalid' using errcode='23503'; end if;
 if p_assign then
  insert into public.crm_tag_assignments(organization_id,tag_id,entity_kind,entity_id,assigned_by)
   values(p_org,chosen,p_kind,p_record,auth.uid()) on conflict do nothing;
 else delete from public.crm_tag_assignments where organization_id=p_org and tag_id=chosen and entity_kind=p_kind and entity_id=p_record;
 end if;
 return jsonb_build_object('tag_id',chosen,'assigned',p_assign);
end $$;


drop policy if exists tenant_isolation_crm_tag_assignments_insert on public.crm_tag_assignments;
create policy tenant_isolation_crm_tag_assignments_insert on public.crm_tag_assignments for insert to authenticated with check(public.fn_crm_tags_write_allowed(organization_id) and public.fn_crm_tag_target_visible(organization_id,entity_kind,entity_id));
drop policy if exists tenant_isolation_crm_tag_assignments_delete on public.crm_tag_assignments;
create policy tenant_isolation_crm_tag_assignments_delete on public.crm_tag_assignments for delete to authenticated using(public.fn_crm_tags_write_allowed(organization_id) and public.fn_crm_tag_target_visible(organization_id,entity_kind,entity_id));
revoke execute on function public.fn_crm_tag_assign(uuid,text,uuid,uuid,boolean) from public,anon;
