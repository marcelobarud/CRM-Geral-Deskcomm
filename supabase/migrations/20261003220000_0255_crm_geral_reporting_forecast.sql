-- Bloco E: probabilidade da etapa, null explícito e read model sob RLS.
alter table public.crm_stages add column if not exists probability_percent smallint;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.crm_stages'::regclass and conname='crm_stages_probability_percent_check') then
  alter table public.crm_stages add constraint crm_stages_probability_percent_check check(probability_percent between 0 and 100);
 end if;
end $$;
comment on column public.crm_stages.probability_percent is 'Estimativa comercial inteira 0..100; null = não configurada, nunca score de IA.';

create or replace function public.fn_crm_commercial_report(p_org uuid,p_from timestamptz,p_to timestamptz,p_pipeline uuid default null,p_owner uuid default null,p_source text default null)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not (p_org in (select public.fn_user_org_ids())) or not public.fn_role_at_least(p_org,'agent') then
  raise exception 'commercial_report_denied' using errcode='42501';
 end if;
 if p_from is null or p_to is null or p_from>=p_to or p_to-p_from>interval '366 days' or (p_source is not null and length(p_source)>100) then
  raise exception 'commercial_report_invalid_window' using errcode='22023';
 end if;
 with rows as materialized (
  select l.*,s.name stage_name,s.probability_percent,
   case when l.status='open' and l.value_cents is not null and nullif(btrim(l.currency),'') is not null and s.probability_percent is not null
    then round(l.value_cents::numeric*s.probability_percent/100) end weighted,
   l.expected_close_date >= (p_from at time zone 'UTC')::date and l.expected_close_date < (p_to at time zone 'UTC')::date horizon,
   l.closed_at >= p_from and l.closed_at < p_to closed_window,
   nullif(btrim(l.currency),'') money_currency
  from public.crm_leads l left join public.crm_stages s on s.id=l.stage_id and s.organization_id=p_org
  where l.organization_id=p_org and (p_pipeline is null or l.pipeline_id=p_pipeline)
   and (p_owner is null or l.owner_user_id=p_owner) and (p_source is null or l.source=p_source)
 ), agg as (
  select money_currency currency,stage_id,stage_name,probability_percent,source,
   grouping(stage_id) gs,grouping(source) go,
   count(*) filter(where status='open') open_count,
   sum(value_cents::numeric) filter(where status='open' and money_currency is not null) open_value,
   sum(weighted) weighted_current,
   sum(weighted) filter(where horizon) weighted_period,
   count(*) filter(where status='open' and horizon) horizon_count,
   count(*) filter(where status='open' and value_cents is null) missing_value,
   count(*) filter(where status='open' and probability_percent is null) missing_probability,
   count(*) filter(where status='open' and expected_close_date is null) missing_date,
   count(*) filter(where created_at>=p_from and created_at<p_to) created_count,
   count(*) filter(where status='won' and closed_window) won_count,
   count(*) filter(where status='lost' and closed_window) lost_count,
   count(*) filter(where status in ('won','lost') and closed_at is null) missing_closed_date,
   count(*) filter(where status='won' and closed_window and value_cents is null) won_missing_value,
   count(*) filter(where status='lost' and closed_window and value_cents is null) lost_missing_value,
   sum(value_cents::numeric) filter(where status='won' and closed_window and money_currency is not null) won_value,
   sum(value_cents::numeric) filter(where status='lost' and closed_window and money_currency is not null) lost_value
  from rows group by grouping sets ((money_currency),(money_currency,stage_id,stage_name,probability_percent),(money_currency,source))
 ), payload as (
  select gs,go,jsonb_build_object('currency',currency,'stage_id',stage_id,'stage_name',stage_name,'probability_percent',probability_percent,'source',source,
   'open_count',open_count,'open_value_cents',open_value::text,'weighted_current_cents',weighted_current::text,'weighted_period_cents',weighted_period::text,
   'horizon_count',horizon_count,'missing_value',missing_value,'missing_probability',missing_probability,'missing_date',missing_date,
   'created_count',created_count,'won_count',won_count,'lost_count',lost_count,'missing_closed_date',missing_closed_date,
   'won_missing_value',won_missing_value,'lost_missing_value',lost_missing_value,
   'won_value_cents',won_value::text,'lost_value_cents',lost_value::text,
   'conversion_percent',case when won_count+lost_count>0 then round(100::numeric*won_count/(won_count+lost_count),2) else null end) item
  from agg order by currency nulls last,stage_name nulls last,source nulls last
 ) select jsonb_build_object(
  'currencies',coalesce(jsonb_agg(item) filter(where gs=1 and go=1),'[]'::jsonb),
  'stages',coalesce(jsonb_agg(item) filter(where gs=0),'[]'::jsonb),
  'sources',coalesce(jsonb_agg(item) filter(where go=0),'[]'::jsonb)) into result from payload;
 return result;
end $$;
revoke all on function public.fn_crm_commercial_report(uuid,timestamptz,timestamptz,uuid,uuid,text) from public,anon,service_role;
grant execute on function public.fn_crm_commercial_report(uuid,timestamptz,timestamptz,uuid,uuid,text) to authenticated;
