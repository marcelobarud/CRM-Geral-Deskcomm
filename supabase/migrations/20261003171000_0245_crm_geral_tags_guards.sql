-- Forward-fix: preserva MFA e suporte também nos caminhos RPC/REST diretos.
create or replace function public.fn_crm_tag_manage(p_org uuid,p_action text,p_tag uuid default null,p_name text default null,p_color text default null,p_destination uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare chosen uuid; norm text; row_tag public.crm_tags; impact jsonb; binding record; audit_ok boolean:=true;
begin
 if coalesce(public.fn_user_role_in_org(p_org),'')<>'admin' or not coalesce(public.fn_support_write_allowed(p_org),false) or not coalesce(public.fn_session_mfa_proven(),false) then raise exception 'tag_admin_required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('crm-tags:'||p_org::text,0));
 if p_action in('create','rename') then
  norm:=public.fn_normalize_crm_tag(p_name);
  if norm is null or norm='' or char_length(p_name)>40 then raise exception 'tag_name_invalid' using errcode='22023'; end if;
  if exists(select 1 from public.crm_tag_aliases where organization_id=p_org and normalized_name=norm and tag_id is distinct from p_tag) then raise exception 'tag_name_conflict' using errcode='23505'; end if;
 end if;
 if p_action='create' then
  chosen:=public.fn_crm_tag_ensure_legacy(p_org,p_name,true);
  update public.crm_tags set color=p_color,updated_at=now() where id=chosen and organization_id=p_org;
 else
  select * into row_tag from public.crm_tags where id=p_tag and organization_id=p_org and not is_archived and merged_into is null for update;
  if not found then raise exception 'tag_not_found' using errcode='22023'; end if;
  chosen:=p_tag;
  if p_action='rename' then
   update public.crm_tags set name=btrim(regexp_replace(normalize(p_name,NFC),'[[:space:]]+',' ','g')),updated_at=now() where id=p_tag and organization_id=p_org;
   insert into public.crm_tag_aliases(organization_id,tag_id,alias_name) values(p_org,p_tag,p_name) on conflict do nothing;
  elsif p_action='color' then
   update public.crm_tags set color=p_color,updated_at=now() where id=p_tag and organization_id=p_org;
  elsif p_action='merge' then
   if p_destination=p_tag or p_destination is null or not exists(select 1 from public.crm_tags where id=p_destination and organization_id=p_org and not is_archived and merged_into is null) then raise exception 'tag_destination_invalid' using errcode='23503'; end if;
   insert into public.crm_tag_assignments(organization_id,entity_kind,entity_id,tag_id,assigned_by)
    select organization_id,entity_kind,entity_id,p_destination,assigned_by from public.crm_tag_assignments where organization_id=p_org and tag_id=p_tag on conflict do nothing;
   update public.crm_tag_aliases set tag_id=p_destination where organization_id=p_org and tag_id=p_tag;
   delete from public.crm_tag_assignments where organization_id=p_org and tag_id=p_tag;
   update public.crm_tags set is_archived=true,merged_into=p_destination,updated_at=now() where organization_id=p_org and (id=p_tag or merged_into=p_tag);
   chosen:=p_destination;
  elsif p_action='delete' then
   impact:=public.fn_crm_tag_impact(p_org,p_tag);
   if (impact->>'assignments')::bigint>0 or (impact->>'configuration_references')::bigint>0 then raise exception 'tag_in_use' using errcode='23503'; end if;
   update public.crm_tags set is_archived=true,updated_at=now() where id=p_tag and organization_id=p_org;
  else raise exception 'tag_action_invalid' using errcode='22023'; end if;
 end if;
 for binding in select distinct entity_kind,entity_id from public.crm_tag_assignments where organization_id=p_org and tag_id=chosen
 loop perform public.fn_crm_tag_refresh_record(p_org,binding.entity_kind,binding.entity_id); end loop;
 begin
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
   values(p_org,auth.uid(),'tag.'||p_action,'crm_tag',chosen,jsonb_build_object('source_id',p_tag,'destination_id',p_destination));
 exception when others then audit_ok:=false; end;
 return jsonb_build_object('tag_id',chosen,'action',p_action,'audit_recorded',audit_ok);
end $$;

create or replace function public.fn_crm_tag_assign(p_org uuid,p_kind text,p_record uuid,p_tag uuid,p_assign boolean)
returns jsonb language plpgsql set search_path=public as $$
declare chosen uuid;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' and (not coalesce(public.fn_support_write_allowed(p_org),false) or not coalesce(public.fn_session_mfa_proven(),false)) then raise exception 'tag_session_required' using errcode='42501'; end if;
 if coalesce(public.fn_user_role_in_org(p_org),'') not in('agent','manager','admin') and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'tag_agent_required' using errcode='42501'; end if;
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

create or replace function public.fn_crm_tags_legacy_bridge()
returns trigger language plpgsql security definer set search_path=public as $$
declare kind text; allow_create boolean;
begin
 kind:=case tg_table_name when 'contacts' then 'contact' when 'crm_leads' then 'lead' when 'conversations' then 'conversation' end;
 if tg_op='DELETE' then
  delete from public.crm_tag_assignments where organization_id=old.organization_id and entity_kind=kind and entity_id=old.id;
  return old;
 end if;
 if auth.uid() is not null and coalesce(auth.jwt()->>'role','')<>'service_role' and cardinality(new.tags)>0 and (not coalesce(public.fn_support_write_allowed(new.organization_id),false) or not coalesce(public.fn_session_mfa_proven(),false)) then raise exception 'tag_session_required' using errcode='42501'; end if;
 allow_create:=auth.uid() is null or public.fn_user_role_in_org(new.organization_id)='admin' or auth.jwt()->>'role'='service_role';
 perform public.fn_crm_tags_write_legacy(new.organization_id,kind,new.id,new.tags,coalesce(allow_create,false));
 return new;
end $$;

drop policy if exists tenant_isolation_crm_tag_assignments_insert on public.crm_tag_assignments;
create policy tenant_isolation_crm_tag_assignments_insert on public.crm_tag_assignments for insert to authenticated with check(public.fn_user_role_in_org(organization_id) in ('agent','manager','admin') and public.fn_crm_tag_target_visible(organization_id,entity_kind,entity_id) and public.fn_support_write_allowed(organization_id) and public.fn_session_mfa_proven());
drop policy if exists tenant_isolation_crm_tag_assignments_delete on public.crm_tag_assignments;
create policy tenant_isolation_crm_tag_assignments_delete on public.crm_tag_assignments for delete to authenticated using(public.fn_user_role_in_org(organization_id) in ('agent','manager','admin') and public.fn_crm_tag_target_visible(organization_id,entity_kind,entity_id) and public.fn_support_write_allowed(organization_id) and public.fn_session_mfa_proven());
revoke execute on function public.fn_crm_tag_manage(uuid,text,uuid,text,text,uuid),public.fn_crm_tag_assign(uuid,text,uuid,uuid,boolean),public.fn_crm_tags_legacy_bridge() from public,anon;
