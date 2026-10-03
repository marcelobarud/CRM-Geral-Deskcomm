-- Audita alterações reais de vínculo; replay idempotente não produz audit novo.
create or replace function public.fn_crm_tag_audit_assignment() returns trigger language plpgsql security definer set search_path=public as $$
declare binding public.crm_tag_assignments;
begin
 if tg_op='DELETE' then binding:=old; else binding:=new; end if;
 -- Cascata ao remover uma organização não deve recriar referência ao tenant.
 if exists(select 1 from public.organizations where id=binding.organization_id) then
  insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
   values(binding.organization_id,auth.uid(),binding.entity_kind||'.tags_changed',binding.entity_kind,binding.entity_id,jsonb_build_object('tag_id',binding.tag_id,'assigned',tg_op<>'DELETE'));
 end if;
 return null;
end $$;
revoke execute on function public.fn_crm_tag_audit_assignment() from public,anon,authenticated,service_role;
drop trigger if exists crm_tag_assignments_audit on public.crm_tag_assignments;
create trigger crm_tag_assignments_audit after insert or delete on public.crm_tag_assignments for each row execute function public.fn_crm_tag_audit_assignment();
create or replace function public.fn_crm_tag_assign(p_org uuid,p_kind text,p_record uuid,p_tag uuid,p_assign boolean)
returns jsonb language plpgsql set search_path=public as $$
declare chosen uuid; affected integer;
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
 get diagnostics affected = row_count;
 return jsonb_build_object('tag_id',chosen,'assigned',p_assign,'changed',affected>0);
end $$;
revoke execute on function public.fn_crm_tag_assign(uuid,text,uuid,uuid,boolean) from public,anon;
