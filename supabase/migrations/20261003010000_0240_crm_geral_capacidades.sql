-- 0240 — flags organizacionais, escrita atômica e cerca de respostas rápidas.
create or replace function public.fn_capability_enabled(p_org uuid, p_capability text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare c jsonb; v jsonb;
begin
  if p_capability <> 'message_templates' or p_capability is null then return false; end if;
  if auth.uid() is not null and not public.fn_role_at_least(p_org,'viewer') then return false; end if;
  select settings->'capabilities' into c from public.organizations where id=p_org;
  if not found then return false; end if;
  if c is null or c='null'::jsonb then return true; end if;
  if jsonb_typeof(c) is distinct from 'object' or c->'version' is distinct from '1'::jsonb
    or jsonb_typeof(c->'revision') is distinct from 'number'
    or coalesce(c->>'revision','') !~ '^[0-9]{1,16}$'
    or jsonb_typeof(c->'overrides') is distinct from 'object' then return false; end if;
  if (c->>'revision')::numeric > 9007199254740991 then return false; end if;
  v:=c->'overrides'->p_capability;
  if v is null then return true; end if;
  return v='true'::jsonb;
end; $$;
revoke all on function public.fn_capability_enabled(uuid,text) from public,anon,authenticated;
grant execute on function public.fn_capability_enabled(uuid,text) to authenticated,service_role;

create or replace function public.fn_set_capability(p_org uuid,p_capability text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; overrides jsonb; revision bigint; previous boolean;
begin
  if auth.uid() is null or not public.fn_role_at_least(p_org,'admin') or not public.fn_support_write_allowed(p_org)
    or not public.fn_session_mfa_proven() then raise exception 'capability_forbidden' using errcode='42501'; end if;
  if p_capability is distinct from 'message_templates' or p_enabled is null then raise exception 'capability_invalid' using errcode='22023'; end if;
  select settings->'capabilities' into c from public.organizations where id=p_org for update;
  if not found then raise exception 'organization_not_found' using errcode='P0002'; end if;
  previous:=public.fn_capability_enabled(p_org,p_capability);
  revision:=0;
  if jsonb_typeof(c)='object' and c->'version'='1'::jsonb and jsonb_typeof(c->'revision')='number'
    and coalesce(c->>'revision','') ~ '^[0-9]{1,16}$' then
    if (c->>'revision')::numeric < 9007199254740991 then revision:=(c->>'revision')::bigint; end if;
  end if;
  overrides:=case when c->'version'='1'::jsonb and jsonb_typeof(c->'overrides')='object' then c->'overrides' else '{}'::jsonb end;
  update public.organizations set settings=jsonb_set(coalesce(settings,'{}'::jsonb),'{capabilities}',
    jsonb_build_object('version',1,'revision',revision+1,'overrides',overrides||jsonb_build_object(p_capability,p_enabled)),true)
    where id=p_org;
  return jsonb_build_object('previous_enabled',previous,'enabled',p_enabled,'revision',revision+1);
end; $$;
revoke all on function public.fn_set_capability(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.fn_set_capability(uuid,text,boolean) to authenticated;

-- Policies restritivas complementam, sem substituir, identidade/autoria das atuais.
-- SELECT continua sujeito às policies originais e preserva leitura de histórico.
drop policy if exists message_templates_capability_insert on public.message_templates;
create policy message_templates_capability_insert on public.message_templates as restrictive for insert to authenticated
  with check (public.fn_capability_enabled(organization_id,'message_templates'));
drop policy if exists message_templates_capability_update on public.message_templates;
create policy message_templates_capability_update on public.message_templates as restrictive for update to authenticated
  using (public.fn_capability_enabled(organization_id,'message_templates'))
  with check (public.fn_capability_enabled(organization_id,'message_templates'));
drop policy if exists message_templates_capability_delete on public.message_templates;
create policy message_templates_capability_delete on public.message_templates as restrictive for delete to authenticated
  using (public.fn_capability_enabled(organization_id,'message_templates'));
