-- Configuração pública do staging Geral 1; não é migration de schema.
-- Aplicar somente ao projeto zwjrhqqwizjpzmeayrju, por conexão administrativa.
-- Preserva marca explícita já escolhida para outra instalação.
insert into public.platform_branding (id, app_name, show_powered_by, seeded_from_env)
values (1, 'CRM Geral', false, false)
on conflict (id) do update
set app_name = excluded.app_name, show_powered_by = excluded.show_powered_by,
    seeded_from_env = false, updated_at = now()
where platform_branding.app_name is null
   or platform_branding.app_name in ('Deskcomm', 'DeskcommCRM');
