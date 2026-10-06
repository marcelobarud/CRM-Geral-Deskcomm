-- 0277 — a função é chamada pelo trigger de criação, não via RPC do cliente.
-- Fecha a execução direta herdada de PUBLIC/anon e remove grants diretos
-- residuais de roles de sessão/serviço, sem alterar o disparo do trigger.
revoke all on function public.fn_seed_default_pipeline_for_org()
  from public, anon, authenticated, service_role;
