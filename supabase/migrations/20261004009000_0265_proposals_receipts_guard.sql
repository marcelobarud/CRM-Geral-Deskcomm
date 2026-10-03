-- 0265: protege receipts de propostas contra escrita direta; command SECURITY DEFINER é o único escritor.
create or replace function public.fn_proposal_receipt_guard() returns trigger language plpgsql set search_path=public as $$
declare scoped boolean;
begin
 scoped:=case when TG_OP='DELETE' then old.endpointlike 'proposal:%' when TG_OP='INSERT' then new.endpointlike 'proposal:%' else old.endpointlike 'proposal:%' or new.endpointlike 'proposal:%' end;
 if scoped and current_user not in ('postgres','supabase_admin') then
  if TG_OP='DELETE' and not exists(select 1 from public.organizations where id=old.organization_id) then return old; end if;
  raise exception 'proposal_receipt_private' using errcode='42501';
 end if;
 if TG_OP='DELETE' then return old; end if;
 return new;
end $$;
revoke execute on function public.fn_proposal_receipt_guard() from public,anon,authenticated,service_role;
drop trigger if exists proposal_receipt_guard on public.idempotency_keys;
create trigger proposal_receipt_guard before insert or update or delete on public.idempotency_keys for each row execute function public.fn_proposal_receipt_guard();

