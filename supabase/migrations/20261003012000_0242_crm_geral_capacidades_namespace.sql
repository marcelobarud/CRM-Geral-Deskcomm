-- 0242 — só o setter canônico altera o namespace; outros donos de settings
-- preservam a configuração atual mesmo se enviarem um snapshot antigo.
create or replace function public.fn_preserve_org_capabilities()
returns trigger language plpgsql set search_path=public as $$
begin
  if coalesce(current_setting('crm.capabilities_write',true),'') <> '1' then
    if coalesce(old.settings,'{}'::jsonb) ? 'capabilities' then
      new.settings:=jsonb_set(coalesce(new.settings,'{}'::jsonb),'{capabilities}',old.settings->'capabilities',true);
    else
      new.settings:=coalesce(new.settings,'{}'::jsonb)-'capabilities';
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.fn_preserve_org_capabilities() from public,anon,authenticated,service_role;
drop trigger if exists trg_preserve_org_capabilities on public.organizations;
create trigger trg_preserve_org_capabilities before update of settings on public.organizations
  for each row execute function public.fn_preserve_org_capabilities();

create or replace function public.fn_set_capability(p_org uuid,p_capability text,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c jsonb; overrides jsonb; revision bigint; previous boolean; previous_context text;
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
  previous_context:=current_setting('crm.capabilities_write',true);
  perform set_config('crm.capabilities_write','1',true);
  update public.organizations set settings=jsonb_set(coalesce(settings,'{}'::jsonb),'{capabilities}',
    jsonb_build_object('version',1,'revision',revision+1,'overrides',overrides||jsonb_build_object(p_capability,p_enabled)),true)
    where id=p_org;
  perform set_config('crm.capabilities_write',coalesce(previous_context,''),true);
  return jsonb_build_object('previous_enabled',previous,'enabled',p_enabled,'revision',revision+1);
end; $$;
revoke all on function public.fn_set_capability(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.fn_set_capability(uuid,text,boolean) to authenticated;


revoke execute on function public.fn_set_capability(uuid,text,boolean) from service_role;
