-- Dados mínimos e idempotentes para abrir a aplicação local.
-- As variáveis são fornecidas pelo script de setup; nenhum segredo fica neste arquivo.
select set_config('app.local_auth_email', :'local_auth_email', false);
select set_config('app.local_auth_password', :'local_auth_password', false);
do $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(current_setting('app.local_auth_email')) limit 1;
  if v_user_id is null then
    v_user_id := extensions.gen_random_uuid();
    insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
    values (v_user_id, lower(current_setting('app.local_auth_email')), extensions.crypt(current_setting('app.local_auth_password'), extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"display_name":"Administrador local"}'::jsonb);
  else
    update auth.users
       set encrypted_password = extensions.crypt(current_setting('app.local_auth_password'), extensions.gen_salt('bf')),
           email_confirmed_at = coalesce(email_confirmed_at, now()),
           deleted_at = null,
           updated_at = now()
     where id = v_user_id;
  end if;

  insert into public.organizations (slug, legal_name, display_name, status, timezone, locale, onboarded_at, created_by)
  values ('crm-geral-teste', 'CRM Geral Teste', 'CRM Geral Teste', 'active', 'America/Sao_Paulo', 'pt-BR', now(), v_user_id)
  on conflict (slug) do update set display_name = excluded.display_name, status = 'active', onboarded_at = coalesce(public.organizations.onboarded_at, now())
  returning id into v_org_id;

  insert into public.user_organizations (user_id, organization_id, role, accepted_at)
  values (v_user_id, v_org_id, 'admin', now())
  on conflict (user_id, organization_id) do update set role = 'admin', revoked_at = null, accepted_at = coalesce(public.user_organizations.accepted_at, now());

  insert into public.platform_admins (user_id, granted_by, scope, mfa_required, reason)
  values (v_user_id, v_user_id, 'full', false, 'Administrador local de desenvolvimento')
  on conflict (user_id) do update set revoked_at = null, mfa_required = false;

  select id into v_pipeline_id from public.crm_pipelines where organization_id = v_org_id and is_default = true limit 1;
  if v_pipeline_id is null then
    insert into public.crm_pipelines (organization_id, name, slug, is_default, position)
    values (v_org_id, 'Funil padrão', 'default', true, 1)
    returning id into v_pipeline_id;
  else
    update public.crm_pipelines set name = 'Funil padrão', is_default = true, is_archived = false where id = v_pipeline_id;
  end if;

  if not exists (select 1 from public.crm_stages where pipeline_id = v_pipeline_id and slug = 'novo') then
    insert into public.crm_stages (organization_id, pipeline_id, name, slug, position, color)
    values (v_org_id, v_pipeline_id, 'Novo', 'novo', 1, '#64748B') returning id into v_stage_id;
  end if;
  if not exists (select 1 from public.crm_stages where pipeline_id = v_pipeline_id and slug = 'em-atendimento') then
    insert into public.crm_stages (organization_id, pipeline_id, name, slug, position, color)
    values (v_org_id, v_pipeline_id, 'Em atendimento', 'em-atendimento', 2, '#2563EB');
  end if;
  if not exists (select 1 from public.crm_stages where pipeline_id = v_pipeline_id and (slug = 'ganho' or is_won = true)) then
    insert into public.crm_stages (organization_id, pipeline_id, name, slug, position, color, is_won)
    values (v_org_id, v_pipeline_id, 'Ganho', 'ganho', 3, '#16A34A', true);
  end if;

  if not exists (select 1 from public.contacts where organization_id = v_org_id and email_normalized = 'cliente.teste@crmgeral.local') then
    insert into public.contacts (organization_id, name, display_name, email, phone_number, source, created_by_user_id)
    values (v_org_id, 'Cliente de teste', 'Cliente de teste', 'cliente.teste@crmgeral.local', '+5511999990000', 'manual', v_user_id);
  end if;
end $$;
