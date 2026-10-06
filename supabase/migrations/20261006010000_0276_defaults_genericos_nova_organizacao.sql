-- 0276 — novas organizações começam com um funil comercial genérico.
-- Não renomeia nem modifica pipelines/stages já existentes.

alter table public.crm_pipelines
  alter column vocabulary set default jsonb_build_object(
    'lead', 'Lead',
    'lead_plural', 'Leads',
    'deal', 'Oportunidade',
    'deal_plural', 'Oportunidades',
    'won', 'Ganho',
    'lost', 'Perdido',
    'stage', 'Etapa',
    'stage_plural', 'Etapas'
  );

create or replace function public.fn_seed_default_pipeline_for_org()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
  v_pipeline_id uuid;
  v_position numeric := 1000;
  r record;
begin
  insert into public.crm_pipelines (
    organization_id, name, slug, is_default, position, vocabulary
  )
  values (
    new.id,
    'Comercial',
    'comercial',
    true,
    1000,
    jsonb_build_object(
      'lead', 'Lead',
      'lead_plural', 'Leads',
      'deal', 'Oportunidade',
      'deal_plural', 'Oportunidades',
      'won', 'Ganho',
      'lost', 'Perdido',
      'stage', 'Etapa',
      'stage_plural', 'Etapas'
    )
  )
  returning id into v_pipeline_id;

  for r in
    select * from (values
      ('Novo',           'novo',           false, false, 'new'),
      ('Em contato',     'em_contato',     false, false, 'contacted'),
      ('Em negociação',  'em_negociacao',  false, false, 'negotiating'),
      ('Ganho',          'ganho',          true,  false, 'won'),
      ('Perdido',        'perdido',        false, true,  'lost')
    ) as t(stage_name, stage_slug, won, lost, stage_hint)
  loop
    insert into public.crm_stages (
      organization_id, pipeline_id, name, slug, position,
      is_won, is_lost, agent_stage_hint
    )
    values (
      new.id, v_pipeline_id, r.stage_name, r.stage_slug, v_position,
      r.won, r.lost, r.stage_hint
    );
    v_position := v_position + 1000;
  end loop;

  return new;
end;
$$;

alter function public.fn_seed_default_pipeline_for_org() owner to postgres;

comment on function public.fn_seed_default_pipeline_for_org() is
  'Cria funil comercial genérico apenas ao inserir organização; não altera tenants existentes. Probabilidades permanecem neutras/não configuradas.';
