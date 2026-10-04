-- Conserva coleta quando a conversa passa ao humano por qualquer porta existente.
create or replace function public.fn_script_on_human_control() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if (new.bot_silenced_until='infinity'::timestamptz and old.bot_silenced_until is distinct from new.bot_silenced_until)
 or (new.status='closed' and old.status is distinct from new.status) then
  with changed as (
   update public.crm_script_sessions set status='interrupted',interruption_reason='Atendimento assumido por humano ou encerrado',revision=revision+1,updated_at=now()
   where organization_id=new.organization_id and conversation_id=new.id and status='running' returning id
  ) insert into public.api_audit_log(organization_id,action,resource_type,resource_id,metadata)
  select new.organization_id,'short_script.human_control','short_script',id,'{}' from changed;
 end if;
 return new;
end $$;
revoke all on function public.fn_script_on_human_control() from public,anon,authenticated,service_role;
drop trigger if exists script_on_human_control on public.conversations;
create trigger script_on_human_control after update of bot_silenced_until,status on public.conversations for each row execute function public.fn_script_on_human_control();

-- Referência UUID em JSON também deve pertencer à organização; alias textual fica.
create or replace function public.fn_automation_rule_tag_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare action jsonb; tag text;
begin
 if auth.uid() is not null and (not public.fn_role_at_least(new.organization_id,'manager') or not public.fn_support_write_allowed(new.organization_id) or not public.fn_session_mfa_proven()) then raise exception 'automation_management_forbidden' using errcode='42501'; end if;
 for action in select value from jsonb_array_elements(new.actions) loop
  if action->>'type'='add_tag' and action->'config' ? 'tag_ids' then
   if jsonb_typeof(action->'config'->'tag_ids') is distinct from 'array' or jsonb_array_length(action->'config'->'tag_ids') not between 1 and 10 then raise exception 'automation_tags_invalid' using errcode='22023'; end if;
   for tag in select value from jsonb_array_elements_text(action->'config'->'tag_ids') loop
    if not exists(select 1 from public.crm_tags where id=tag::uuid and organization_id=new.organization_id and (not is_archived or merged_into is not null)) then raise exception 'automation_tag_cross_org' using errcode='23503'; end if;
   end loop;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.fn_automation_rule_tag_guard() from public,anon,authenticated,service_role;
drop trigger if exists automation_rule_tag_guard on public.automation_rules;
create trigger automation_rule_tag_guard before insert or update on public.automation_rules for each row execute function public.fn_automation_rule_tag_guard();

-- TTL não pode apagar a identidade de um efeito ainda referenciado pelo evento.
update public.idempotency_keys set expires_at='infinity' where endpoint='automation-tag';
