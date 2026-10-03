-- Relações comerciais existentes: RLS da linha não valida o tenant da FK.
-- O trigger não concede acesso: só recusa referências incompatíveis, inclusive
-- em writes service_role. SECURITY DEFINER permite conferir membership/alvos
-- sem expor linhas protegidas; nenhum papel recebe execução direta da função.
create or replace function public.fn_validate_commercial_links()
returns trigger language plpgsql security definer set search_path = public as $$
declare linked_contact uuid;
begin
  if tg_table_name = 'crm_leads' then
    if not exists(select 1 from public.crm_pipelines p where p.id=new.pipeline_id and p.organization_id=new.organization_id)
      or not exists(select 1 from public.crm_stages s where s.id=new.stage_id and s.pipeline_id=new.pipeline_id and s.organization_id=new.organization_id)
      or (new.contact_id is not null and not exists(select 1 from public.contacts c where c.id=new.contact_id and c.organization_id=new.organization_id))
      or (new.owner_user_id is not null and not exists(select 1 from public.user_organizations m where m.user_id=new.owner_user_id and m.organization_id=new.organization_id))
      or (new.owner_agent_id is not null and not exists(select 1 from public.ai_agents a where a.id=new.owner_agent_id and a.organization_id=new.organization_id)) then
      raise exception 'commercial_reference_invalid' using errcode='23503';
    end if;
  elsif tg_table_name = 'crm_tasks' then
    if new.lead_id is not null then
      select l.contact_id into linked_contact from public.crm_leads l where l.id=new.lead_id and l.organization_id=new.organization_id;
      if not found then raise exception 'commercial_reference_invalid' using errcode='23503'; end if;
      if new.contact_id is not null and new.contact_id is distinct from linked_contact then
        raise exception 'commercial_contact_mismatch' using errcode='23503';
      end if;
    end if;
    if (new.contact_id is not null and not exists(select 1 from public.contacts c where c.id=new.contact_id and c.organization_id=new.organization_id))
      or (new.assigned_to is not null and not exists(select 1 from public.user_organizations m where m.user_id=new.assigned_to and m.organization_id=new.organization_id)) then
      raise exception 'commercial_reference_invalid' using errcode='23503';
    end if;
  end if;
  return new;
end $$;

revoke execute on function public.fn_validate_commercial_links() from public, anon, authenticated, service_role;

create or replace trigger trg_validate_commercial_lead_links
before insert or update of organization_id,pipeline_id,stage_id,contact_id,owner_user_id,owner_agent_id
on public.crm_leads for each row execute function public.fn_validate_commercial_links();

create or replace trigger trg_validate_commercial_task_links
before insert or update of organization_id,lead_id,contact_id,assigned_to
on public.crm_tasks for each row execute function public.fn_validate_commercial_links();
