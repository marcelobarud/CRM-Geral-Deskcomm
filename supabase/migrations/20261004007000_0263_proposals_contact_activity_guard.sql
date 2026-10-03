-- 0263: valida contexto de atividade por oportunidade ou contato, com tenant explícito.
create or replace function public.fn_validate_activity_lead_org()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_org uuid;
begin
 if new.lead_id is null then
  select organization_id into v_org from public.contacts where id=new.contact_id;
  if v_org is null then raise exception 'activity_contact_not_found' using errcode='23503'; end if;
 else
  select organization_id into v_org from public.crm_leads where id=new.lead_id;
  if v_org is null then raise exception 'lead_not_found' using errcode='23503'; end if;
 end if;
 if v_org<>new.organization_id then raise exception 'activity_org_mismatch' using errcode='23514'; end if;
 return new;
end $$;
revoke execute on function public.fn_validate_activity_lead_org() from public,anon,authenticated;
