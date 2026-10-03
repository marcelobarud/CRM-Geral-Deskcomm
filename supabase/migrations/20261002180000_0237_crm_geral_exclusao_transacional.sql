-- CRM Geral 0237: adaptação de 0488, referência congelada bb20342d6.
create or replace function public.fn_followup_generation_write()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 -- #1862 — DELETE que chega em CASCATA não é escrita de follow-up. Este gatilho
 -- é BEFORE ROW: o DELETE vindo de `on delete cascade` roda sob o gatilho da
 -- chave estrangeira, com `pg_trigger_depth() > 1`. Passa QUALQUER cascata, não
 -- só a da ficha: apagar o contato, a inscrição (followup_enrollments), o fluxo
 -- (followup_flow_pointers) ou a organização leva junto os registros internos.
 -- O turno que sobra sem inscrição/evento falha fechado em
 -- fn_followup_job_current. A profundidade não distingue cascata de DELETE
 -- feito por outro gatilho: hoje nenhum gatilho apaga nestas duas tabelas, e
 -- quem criar um herda esta passagem. O DELETE DIRETO (profundidade 1, com
 -- `auth.uid()`) continua caindo na recusa abaixo — a 42501 não afrouxa.
 if tg_op='DELETE' and pg_trigger_depth()>1 then return old; end if;
 if tg_table_name='job_queue' then
  if auth.uid() is not null and ((tg_op<>'DELETE' and new.kind='followup_turn') or (tg_op<>'INSERT' and old.kind='followup_turn')) then
   raise exception 'followup_job_internal' using errcode='42501';
  end if;
  if tg_op='UPDATE' and old.kind='followup_turn' then
   if new.organization_id<>old.organization_id or new.contact_id is distinct from old.contact_id or new.kind<>old.kind
    or new.payload->'followup_enrollment_id' is distinct from old.payload->'followup_enrollment_id'
    or new.payload->'node_id' is distinct from old.payload->'node_id'
    or new.payload->'source_step_key' is distinct from old.payload->'source_step_key'
   then raise exception 'followup_job_origin_immutable' using errcode='42501'; end if;
  end if;
 elsif auth.uid() is not null and ((tg_op<>'DELETE' and new.idempotency_key ~ ':[0-9]+$') or (tg_op<>'INSERT' and old.idempotency_key ~ ':[0-9]+$')) then
  raise exception 'followup_step_internal' using errcode='42501';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end; $$;

-- A ficha e o histórico numa transação só: ou sai tudo, ou não sai nada.
-- SECURITY INVOKER de propósito — a RLS de quem chama continua valendo (a mesma
-- que os três DELETE separados da rota respeitavam), e `p_organization_id` fecha
-- a linha por dentro. Nada de service role aqui: quem chama é a sessão do usuário.
create or replace function public.fn_apagar_contato_com_historico(
  p_contact_id uuid,
  p_organization_id uuid
)
returns boolean
language plpgsql
volatile
security invoker
set search_path to 'public', 'pg_temp'
as $$
begin
  perform 1 from public.contacts
   where id=p_contact_id and organization_id=p_organization_id for update;
  if not found then return false; end if;
  -- RESTRICT da #752: o histórico sai antes da ficha, na mesma transação.
  delete from public.messages
   where contact_id = p_contact_id
     and organization_id = p_organization_id;

  delete from public.conversations
   where contact_id = p_contact_id
     and organization_id = p_organization_id;

  delete from public.contacts
   where id = p_contact_id
     and organization_id = p_organization_id;

  -- Uma policy que permite ler mas recusa apagar deve reverter o histórico.
  if not found then raise exception 'contact_delete_denied' using errcode='42501'; end if;
  return true;
end;
$$;

-- Função nova em `public` nasce exposta (ALTER DEFAULT PRIVILEGES do dump):
-- o revoke tira anon e o grant deixa só quem a rota usa.
revoke execute on function public.fn_apagar_contato_com_historico(uuid, uuid) from public, anon;
grant  execute on function public.fn_apagar_contato_com_historico(uuid, uuid) to authenticated, service_role;

notify pgrst, 'reload schema';

revoke execute on function public.fn_followup_generation_write() from public, anon, authenticated;
