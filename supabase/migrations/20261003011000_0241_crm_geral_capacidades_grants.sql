-- O baseline possui default privileges para service_role em funções novas.
-- Administração desta configuração exige sessão humana, não execução de worker.
revoke execute on function public.fn_set_capability(uuid,text,boolean) from service_role;
