-- Ação relacional atômica no motor existente; não é scheduler/engine novo.
create or replace function public.fn_automation_add_tag(p_org uuid,p_rule uuid,p_event uuid,p_index integer,p_origin jsonb default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare r public.automation_rules; e public.event_log; a jsonb; cfg jsonb; chosen uuid; raw text;
 target uuid; kind text; before_tags text[]; after_tags text[]; tag_ids uuid[]:='{}';
 receipt public.idempotency_keys; fingerprint bytea; result jsonb; k text;
begin
 select * into r from public.automation_rules where id=p_rule and organization_id=p_org;
 select * into e from public.event_log where id=p_event and organization_id=p_org;
 if r.id is null or e.id is null or not r.is_active or r.trigger_event<>e.event_type or p_index<0 then raise exception 'automation_context_invalid' using errcode='23503'; end if;
 a:=r.actions->p_index; cfg:=a->'config';
 if a->>'type' is distinct from 'add_tag' then raise exception 'automation_action_invalid' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('crm-tags:'||p_org::text,0));
 k:=p_event::text||':'||p_rule::text||':'||p_index::text; fingerprint:=extensions.digest(a::text,'sha256');
 select * into receipt from public.idempotency_keys where organization_id=p_org and endpoint='automation-tag' and key=k;
 if found then
  if receipt.request_hash is distinct from fingerprint then raise exception 'automation_action_changed' using errcode='23505'; end if;
  return receipt.response_body||jsonb_build_object('replayed',true);
 end if;
 if e.entity_kind='crm_lead' then
  select id,tags into target,before_tags from public.crm_leads where id=e.entity_id and organization_id=p_org for update; kind:='lead';
 elsif e.entity_kind='contact' then
  select id,tags into target,before_tags from public.contacts where id=e.entity_id and organization_id=p_org for update; kind:='contact';
 elsif e.entity_kind='message' then
  select c.id,c.tags into target,before_tags from public.messages m join public.conversations v on v.id=m.conversation_id and v.organization_id=m.organization_id join public.contacts c on c.id=v.contact_id and c.organization_id=v.organization_id where m.id=e.entity_id and m.organization_id=p_org for update of c; kind:='contact';
 end if;
 if target is null then return jsonb_build_object('added','[]'::jsonb,'skipped',true); end if;
 if cfg ? 'tag_ids' then
  if jsonb_typeof(cfg->'tag_ids') is distinct from 'array' or jsonb_array_length(cfg->'tag_ids') not between 1 and 10 then raise exception 'automation_tags_invalid' using errcode='22023'; end if;
  for raw in select value from jsonb_array_elements_text(cfg->'tag_ids') loop
   select coalesce(merged_into,id) into chosen from public.crm_tags where organization_id=p_org and id=raw::uuid;
   if chosen is null or not exists(select 1 from public.crm_tags where id=chosen and organization_id=p_org and not is_archived and merged_into is null) then raise exception 'automation_tag_unavailable' using errcode='23503'; end if;
   tag_ids:=array_append(tag_ids,chosen);
  end loop;
 else
  if jsonb_typeof(cfg->'tags') is distinct from 'array' or jsonb_array_length(cfg->'tags') not between 1 and 10 then raise exception 'automation_tags_invalid' using errcode='22023'; end if;
  for raw in select value from jsonb_array_elements_text(cfg->'tags') loop
   chosen:=public.fn_crm_tag_ensure_legacy(p_org,raw,true); tag_ids:=array_append(tag_ids,chosen);
  end loop;
 end if;
 insert into public.crm_tag_assignments(organization_id,tag_id,entity_kind,entity_id)
 select p_org,tag,kind,target from(select distinct unnest(tag_ids) tag) t on conflict do nothing;
 if kind='lead' then select tags into after_tags from public.crm_leads where id=target and organization_id=p_org;
 else select tags into after_tags from public.contacts where id=target and organization_id=p_org; end if;
 result:=jsonb_build_object('added',coalesce((select jsonb_agg(t) from unnest(after_tags) t where not t=any(coalesce(before_tags,'{}'))),'[]'::jsonb));
 if result->'added'<>'[]'::jsonb then
  perform public.emit_event(case when kind='lead' then 'lead.tag_added' else 'contact.tag_added' end,case when kind='lead' then 'crm_lead' else 'contact' end,target,
   jsonb_build_object('added_tags',result->'added','tags',after_tags,'tag_ids',tag_ids,'service_origin',p_origin),jsonb_build_object('caused_by_rule',p_rule),p_org);
 end if;
 insert into public.idempotency_keys(organization_id,key,endpoint,request_hash,status_code,response_body,expires_at)
 values(p_org,k,'automation-tag',fingerprint,200,result,'infinity'::timestamptz);
 return result;
end $$;
revoke all on function public.fn_automation_add_tag(uuid,uuid,uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.fn_automation_add_tag(uuid,uuid,uuid,integer,jsonb) to service_role;


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
  and (position(to_jsonb(a.alias_name)::text in c.config::text)>0 or position(to_jsonb(a.normalized_name)::text in c.config::text)>0))
 or exists(select 1 from public.crm_tags t where t.organization_id=p_org and (t.id=p_tag or t.merged_into=p_tag) and position(to_jsonb(t.id::text)::text in c.config::text)>0);
 return jsonb_build_object('assignments',uses,'configuration_references',configs);
end $$;
revoke all on function public.fn_crm_tag_impact(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.fn_crm_tag_impact(uuid,uuid) to authenticated,service_role;
