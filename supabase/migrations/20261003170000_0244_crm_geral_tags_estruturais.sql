-- Catálogo e atribuições são canônicos; text[] é projeção de compatibilidade.
-- Nenhuma lista ou log anterior é removido. Operações serializadas por org.
create or replace function public.fn_normalize_crm_tag(p_name text)
returns text language sql immutable strict set search_path=public as $$
 select lower(btrim(regexp_replace(normalize(p_name,NFC),'[[:space:]]+',' ','g')))
$$;

create table if not exists public.crm_tags (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null check(public.fn_normalize_crm_tag(name)<>''),
 normalized_name text generated always as(public.fn_normalize_crm_tag(name)) stored,
 color text check(color is null or color ~ '^#[0-9a-fA-F]{6}$'),
 is_archived boolean not null default false,
 merged_into uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,normalized_name), unique(id,organization_id),
 foreign key(merged_into,organization_id) references public.crm_tags(id,organization_id)
);
create table if not exists public.crm_tag_aliases (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 tag_id uuid not null,
 alias_name text not null check(public.fn_normalize_crm_tag(alias_name)<>''),
 normalized_name text generated always as(public.fn_normalize_crm_tag(alias_name)) stored,
 primary key(organization_id,alias_name),
 foreign key(tag_id,organization_id) references public.crm_tags(id,organization_id) on delete cascade
);
create index if not exists idx_crm_tag_aliases_normalized on public.crm_tag_aliases(organization_id,normalized_name);
create index if not exists idx_crm_tag_aliases_tag on public.crm_tag_aliases(tag_id,organization_id);
create table if not exists public.crm_tag_assignments (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 tag_id uuid not null,
 entity_kind text not null check(entity_kind in('contact','lead','conversation')),
 entity_id uuid not null,
 created_at timestamptz not null default now(),
 assigned_by uuid references auth.users(id) on delete set null,
 primary key(organization_id,entity_kind,entity_id,tag_id),
 foreign key(tag_id,organization_id) references public.crm_tags(id,organization_id) on delete cascade
);
create index if not exists idx_crm_tag_assignments_tag on public.crm_tag_assignments(organization_id,tag_id);

-- Invoker: respeita também as policies de visibilidade das três entidades.
create or replace function public.fn_crm_tag_target_visible(p_org uuid,p_kind text,p_record uuid)
returns boolean language sql stable set search_path=public as $$
 select case p_kind
 when 'contact' then exists(select 1 from public.contacts where id=p_record and organization_id=p_org)
 when 'lead' then exists(select 1 from public.crm_leads where id=p_record and organization_id=p_org)
 when 'conversation' then exists(select 1 from public.conversations where id=p_record and organization_id=p_org)
 else false end
$$;

alter table public.crm_tags enable row level security;
alter table public.crm_tag_aliases enable row level security;
alter table public.crm_tag_assignments enable row level security;
drop policy if exists tenant_isolation_crm_tags_read on public.crm_tags;
create policy tenant_isolation_crm_tags_read on public.crm_tags for select to authenticated
 using(organization_id in(select public.fn_user_org_ids()));
drop policy if exists tenant_isolation_crm_tag_aliases_read on public.crm_tag_aliases;
create policy tenant_isolation_crm_tag_aliases_read on public.crm_tag_aliases for select to authenticated
 using(organization_id in(select public.fn_user_org_ids()));
drop policy if exists tenant_isolation_crm_tag_assignments_read on public.crm_tag_assignments;
create policy tenant_isolation_crm_tag_assignments_read on public.crm_tag_assignments for select to authenticated
 using(organization_id in(select public.fn_user_org_ids()) and public.fn_crm_tag_target_visible(organization_id,entity_kind,entity_id));
drop policy if exists tenant_isolation_crm_tag_assignments_insert on public.crm_tag_assignments;
create policy tenant_isolation_crm_tag_assignments_insert on public.crm_tag_assignments for insert to authenticated
 with check(public.fn_user_role_in_org(organization_id) in('agent','manager','admin') and public.fn_crm_tag_target_visible(organization_id,entity_kind,entity_id));
drop policy if exists tenant_isolation_crm_tag_assignments_delete on public.crm_tag_assignments;
create policy tenant_isolation_crm_tag_assignments_delete on public.crm_tag_assignments for delete to authenticated
 using(public.fn_user_role_in_org(organization_id) in('agent','manager','admin') and public.fn_crm_tag_target_visible(organization_id,entity_kind,entity_id));
revoke all on public.crm_tags,public.crm_tag_aliases,public.crm_tag_assignments from anon,authenticated,service_role;
grant select on public.crm_tags,public.crm_tag_aliases,public.crm_tag_assignments to authenticated,service_role;
grant insert,delete on public.crm_tag_assignments to authenticated;
grant insert,update,delete on public.crm_tag_assignments to service_role;

create or replace function public.fn_crm_tag_assert_target(p_org uuid,p_kind text,p_record uuid)
returns void language plpgsql security definer set search_path=public as $$
declare valid boolean;
begin
 case p_kind
 when 'contact' then select exists(select 1 from public.contacts where id=p_record and organization_id=p_org and not is_anonymized) into valid;
 when 'lead' then select exists(select 1 from public.crm_leads where id=p_record and organization_id=p_org) into valid;
 when 'conversation' then select exists(select 1 from public.conversations where id=p_record and organization_id=p_org) into valid;
 else valid:=false;
 end case;
 if not valid then raise exception 'tag_target_invalid' using errcode='23503'; end if;
end $$;

create or replace function public.fn_crm_tag_validate_assignment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.fn_crm_tag_assert_target(new.organization_id,new.entity_kind,new.entity_id);
 if not exists(select 1 from public.crm_tags where id=new.tag_id and organization_id=new.organization_id and not is_archived and merged_into is null) then
  raise exception 'tag_reference_invalid' using errcode='23503';
 end if;
 return new;
end $$;
create or replace trigger trg_crm_tag_assignment_validate before insert or update
on public.crm_tag_assignments for each row execute function public.fn_crm_tag_validate_assignment();

create or replace function public.fn_crm_tag_ensure_legacy(p_org uuid,p_raw text,p_allow_create boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare norm text; found_id uuid; display_name text;
begin
 norm:=public.fn_normalize_crm_tag(p_raw);
 if norm is null or norm='' then raise exception 'tag_legacy_invalid_requires_review' using errcode='22023'; end if;
 select a.tag_id into found_id from public.crm_tag_aliases a
  where a.organization_id=p_org and a.normalized_name=norm limit 1;
 if found_id is null then
  select id into found_id from public.crm_tags where organization_id=p_org and normalized_name=norm;
 end if;
 if found_id is not null and not exists(select 1 from public.crm_tags where id=found_id and organization_id=p_org and not is_archived and merged_into is null) then
  raise exception 'tag_archived' using errcode='22023';
 end if;
 if found_id is null then
  if not p_allow_create then raise exception 'tag_catalog_required' using errcode='42501'; end if;
  display_name:=btrim(regexp_replace(normalize(p_raw,NFC),'[[:space:]]+',' ','g'));
  insert into public.crm_tags(organization_id,name) values(p_org,display_name) returning id into found_id;
 end if;
 insert into public.crm_tag_aliases(organization_id,tag_id,alias_name) values(p_org,found_id,p_raw) on conflict do nothing;
 return found_id;
end $$;

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
 ) labels;
 execute format('update public.%I set tags=$1 where id=$2 and organization_id=$3 and tags is distinct from $1',target_table)
 using projected,p_record,p_org;
end $$;

create or replace function public.fn_crm_tag_refresh_assignment()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op in('UPDATE','DELETE') then perform public.fn_crm_tag_refresh_record(old.organization_id,old.entity_kind,old.entity_id); end if;
 if tg_op in('INSERT','UPDATE') then perform public.fn_crm_tag_refresh_record(new.organization_id,new.entity_kind,new.entity_id); end if;
 return null;
end $$;
create or replace trigger trg_crm_tag_assignment_projection after insert or update or delete
on public.crm_tag_assignments for each row execute function public.fn_crm_tag_refresh_assignment();

create or replace function public.fn_crm_tags_write_legacy(p_org uuid,p_kind text,p_record uuid,p_values text[],p_allow_create boolean)
returns void language plpgsql security definer set search_path=public as $$
declare raw text; ids uuid[]:='{}'; tag uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('crm-tags:'||p_org::text,0));
 foreach raw in array coalesce(p_values,'{}'::text[]) loop
  tag:=public.fn_crm_tag_ensure_legacy(p_org,raw,p_allow_create);
  if not(tag=any(ids)) then ids:=array_append(ids,tag); end if;
 end loop;
 -- Projeção com mesmos IDs não regrava vínculos, evitando recursão e ruído.
 if (select coalesce(array_agg(tag_id order by tag_id),'{}'::uuid[]) from public.crm_tag_assignments
   where organization_id=p_org and entity_kind=p_kind and entity_id=p_record)
   = (select coalesce(array_agg(i order by i),'{}'::uuid[]) from unnest(ids) i) then return; end if;
 delete from public.crm_tag_assignments where organization_id=p_org and entity_kind=p_kind and entity_id=p_record and not(tag_id=any(ids));
 insert into public.crm_tag_assignments(organization_id,entity_kind,entity_id,tag_id,assigned_by)
 select p_org,p_kind,p_record,i,auth.uid() from unnest(ids) i on conflict do nothing;
 perform public.fn_crm_tag_refresh_record(p_org,p_kind,p_record);
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
 allow_create:=auth.uid() is null or public.fn_user_role_in_org(new.organization_id)='admin' or auth.jwt()->>'role'='service_role';
 perform public.fn_crm_tags_write_legacy(new.organization_id,kind,new.id,new.tags,coalesce(allow_create,false));
 return new;
end $$;
create or replace trigger trg_contacts_tags_bridge after insert or update of tags or delete on public.contacts for each row execute function public.fn_crm_tags_legacy_bridge();
create or replace trigger trg_leads_tags_bridge after insert or update of tags or delete on public.crm_leads for each row execute function public.fn_crm_tags_legacy_bridge();
create or replace trigger trg_conversations_tags_bridge after insert or update of tags or delete on public.conversations for each row execute function public.fn_crm_tags_legacy_bridge();

-- Backfill antes de mudar leitores. Identidades, grafias e configurações antigas
-- continuam preservadas; inválidos interrompem a transação em vez de sumir.
do $$ declare r record; ignored uuid; begin
 for r in
  select organization_id,'contact'::text kind,id,tags from public.contacts where cardinality(tags)>0
  union all select organization_id,'lead',id,tags from public.crm_leads where cardinality(tags)>0
  union all select organization_id,'conversation',id,tags from public.conversations where cardinality(tags)>0
 loop perform public.fn_crm_tags_write_legacy(r.organization_id,r.kind,r.id,r.tags,true); end loop;
 for r in
  select o.id organization_id,v.value raw from public.organizations o
   cross join lateral jsonb_array_elements_text(case when jsonb_typeof(o.settings->'canonical_conversation_tags')='array' then o.settings->'canonical_conversation_tags' else '[]'::jsonb end) v
  union all
  select p.organization_id,v.value from public.crm_pipelines p
   cross join lateral jsonb_array_elements_text(case when jsonb_typeof(p.settings->'canonical_tags')='array' then p.settings->'canonical_tags' else '[]'::jsonb end) v
 loop ignored:=public.fn_crm_tag_ensure_legacy(r.organization_id,r.raw,true); end loop;
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
  and position(to_jsonb(a.alias_name)::text in c.config::text)>0);
 return jsonb_build_object('assignments',uses,'configuration_references',configs);
end $$;

create or replace function public.fn_crm_tag_manage(p_org uuid,p_action text,p_tag uuid default null,p_name text default null,p_color text default null,p_destination uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare chosen uuid; norm text; row_tag public.crm_tags; impact jsonb; binding record; audit_ok boolean:=true;
begin
 if coalesce(public.fn_user_role_in_org(p_org),'')<>'admin' then raise exception 'tag_admin_required' using errcode='42501'; end if;
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

-- Helpers privados: nem JWT nem service role podem chamar backfill/ponte.
revoke execute on function public.fn_normalize_crm_tag(text),public.fn_crm_tag_assert_target(uuid,text,uuid),public.fn_crm_tag_validate_assignment(),public.fn_crm_tag_ensure_legacy(uuid,text,boolean),public.fn_crm_tag_refresh_record(uuid,text,uuid),public.fn_crm_tag_refresh_assignment(),public.fn_crm_tags_write_legacy(uuid,text,uuid,text[],boolean),public.fn_crm_tags_legacy_bridge(),public.fn_crm_tag_impact(uuid,uuid),public.fn_crm_tag_manage(uuid,text,uuid,text,text,uuid),public.fn_crm_tag_assign(uuid,text,uuid,uuid,boolean) from public,anon,authenticated,service_role;
grant execute on function public.fn_crm_tag_impact(uuid,uuid),public.fn_crm_tag_manage(uuid,text,uuid,text,text,uuid),public.fn_crm_tag_assign(uuid,text,uuid,uuid,boolean) to authenticated;
grant execute on function public.fn_crm_tag_impact(uuid,uuid),public.fn_crm_tag_assign(uuid,text,uuid,uuid,boolean) to service_role;
revoke execute on function public.fn_crm_tag_target_visible(uuid,text,uuid) from public,anon;
grant execute on function public.fn_crm_tag_target_visible(uuid,text,uuid) to authenticated,service_role;
