-- Conserva também a grafia normalizada usada pelos consumidores legados.
create or replace function public.fn_crm_tag_refresh_record(p_org uuid,p_kind text,p_record uuid)
returns void language plpgsql security definer set search_path=public as $$
declare projected text[]; target_table text;
begin
 target_table:=case p_kind when 'contact' then 'contacts' when 'lead' then 'crm_leads' when 'conversation' then 'conversations' end;
 if target_table is null then raise exception 'tag_target_invalid' using errcode='22023'; end if;
 select coalesce(array_agg(label order by label),'{}'::text[]) into projected from (
  select t.name as label from public.crm_tag_assignments a join public.crm_tags t on t.id=a.tag_id and t.organization_id=a.organization_id
   where a.organization_id=p_org and a.entity_kind=p_kind and a.entity_id=p_record
  union
  select x.alias_name from public.crm_tag_assignments a join public.crm_tag_aliases x on x.tag_id=a.tag_id and x.organization_id=a.organization_id
   where a.organization_id=p_org and a.entity_kind=p_kind and a.entity_id=p_record
  union
  select x.normalized_name from public.crm_tag_assignments a join public.crm_tag_aliases x on x.tag_id=a.tag_id and x.organization_id=a.organization_id
   where a.organization_id=p_org and a.entity_kind=p_kind and a.entity_id=p_record
 ) labels;
 execute format('update public.%I set tags=$1 where id=$2 and organization_id=$3 and tags is distinct from $1',target_table)
 using projected,p_record,p_org;
end $$;
create or replace function public.fn_crm_tag_impact(p_org uuid,p_tag uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uses bigint; configs bigint;
begin
 if not(p_org in(select public.fn_user_org_ids())) and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'tag_forbidden' using errcode='42501'; end if;
 if not exists(select 1 from public.crm_tags where id=p_tag and organization_id=p_org) then raise exception 'tag_not_found' using errcode='22023'; end if;
 select count(*) into uses from public.crm_tag_assignments where organization_id=p_org and tag_id=p_tag;
 select count(*) into configs from (
  select settings config from public.organizations where id=p_org
  union all select settings from public.crm_pipelines where organization_id=p_org
  union all select conditions||actions from public.automation_rules where organization_id=p_org
  union all select coalesce(draft_graph,'{}'::jsonb)||coalesce(trigger_config,'{}'::jsonb) from public.followup_flow_pointers where organization_id=p_org
  union all select graph from public.followup_flow_versions where organization_id=p_org
 ) c where exists(select 1 from public.crm_tag_aliases a where a.organization_id=p_org and a.tag_id=p_tag
  and (position(to_jsonb(a.alias_name)::text in c.config::text)>0 or position(to_jsonb(a.normalized_name)::text in c.config::text)>0));
 return jsonb_build_object('assignments',uses,'configuration_references',configs);
end $$;
revoke execute on function public.fn_crm_tag_refresh_record(uuid,text,uuid) from public,anon,authenticated,service_role;
revoke execute on function public.fn_crm_tag_impact(uuid,uuid) from public,anon;
do $$ declare binding record; begin
 for binding in select distinct organization_id,entity_kind,entity_id from public.crm_tag_assignments
 loop perform public.fn_crm_tag_refresh_record(binding.organization_id,binding.entity_kind,binding.entity_id); end loop;
end $$;
