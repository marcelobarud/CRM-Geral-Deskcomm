-- Revalida escopo/role no replay e protege remoção direta de regras com MFA.
create or replace function public.fn_script_command(p_org uuid,p_command jsonb,p_request uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a text:=p_command->>'action'; d jsonb:=p_command->'definition'; chosen uuid;
 s public.crm_short_scripts; v public.crm_script_sessions; c public.conversations;
 step jsonb; answer jsonb; result jsonb; receipt public.idempotency_keys; fingerprint bytea;
begin
 if auth.uid() is null or not public.fn_role_at_least(p_org,'agent') or not public.fn_support_write_allowed(p_org)
 or not public.fn_session_mfa_proven() or not public.fn_capability_enabled(p_org,'short_scripts') then raise exception 'script_forbidden' using errcode='42501'; end if;
 if p_request is null or a is null or a not in('create','update','start','answer','interrupt','resume') then raise exception 'script_invalid' using errcode='22023'; end if;
 if a in('create','update') and not public.fn_role_at_least(p_org,'manager') then raise exception 'script_manager_required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('short-scripts:'||p_org::text,0));
 fingerprint:=extensions.digest(p_command::text,'sha256');
 select * into receipt from public.idempotency_keys where organization_id=p_org and key=p_request::text and endpoint='short-script:'||auth.uid()::text;
 if found then
  if receipt.request_hash is distinct from fingerprint then raise exception 'script_request_conflict' using errcode='23505'; end if;
  if a not in('create','update') then
   select * into c from public.conversations where id=(receipt.response_body->>'conversation_id')::uuid and organization_id=p_org;
   if c.id is null or not public.fn_can_view_conversation(p_org,c.assigned_to_user_id) then raise exception 'script_replay_scope_forbidden' using errcode='42501'; end if;
  end if;
  return receipt.response_body;
 end if;
 if a in('create','update') then
  if not public.fn_role_at_least(p_org,'manager') then raise exception 'script_manager_required' using errcode='42501'; end if;
  if not public.fn_script_definition_valid(d) then raise exception 'script_definition_invalid' using errcode='22023'; end if;
  if a='create' then
   insert into public.crm_short_scripts(organization_id,definition) values(p_org,d) returning * into s;
  else
   select * into s from public.crm_short_scripts where id=(p_command->>'id')::uuid and organization_id=p_org for update;
   if not found then raise exception 'script_unavailable' using errcode='23503'; end if;
   if s.revision is distinct from (p_command->>'expected_revision')::integer then raise exception 'script_version_conflict' using errcode='23505'; end if;
   update public.crm_short_scripts set definition=d,revision=revision+1,updated_at=now() where id=s.id and organization_id=p_org returning * into s;
  end if;
  result:=to_jsonb(s); chosen:=s.id;
 else
  if a='start' then
   select * into s from public.crm_short_scripts where id=(p_command->>'script_id')::uuid and organization_id=p_org;
   if not found or s.definition->'is_active' is distinct from 'true'::jsonb then raise exception 'script_disabled' using errcode='23503'; end if;
   select * into c from public.conversations where id=(p_command->>'conversation_id')::uuid and organization_id=p_org;
  else
   select * into v from public.crm_script_sessions where id=(p_command->>'id')::uuid and organization_id=p_org for update;
   if not found then raise exception 'script_session_unavailable' using errcode='23503'; end if;
   select * into c from public.conversations where id=v.conversation_id and organization_id=p_org;
   if v.revision is distinct from (p_command->>'expected_revision')::integer then raise exception 'script_version_conflict' using errcode='23505'; end if;
  end if;
  if c.id is null or not public.fn_can_view_conversation(p_org,c.assigned_to_user_id) then raise exception 'script_conversation_forbidden' using errcode='42501'; end if;
  if a='start' then
   insert into public.crm_script_sessions(organization_id,script_id,conversation_id,snapshot) values(p_org,s.id,c.id,s.definition) returning * into v;
  elsif a='answer' then
   if v.status<>'running' then raise exception 'script_not_running' using errcode='23505'; end if;
   step:=v.snapshot->'steps'->v.current_step; answer:=p_command->'answer';
   if step->>'id' is distinct from p_command->>'step_id' then raise exception 'script_step_conflict' using errcode='23505'; end if;
   if step->>'type'='confirmation' then
    if jsonb_typeof(answer) is distinct from 'boolean' then raise exception 'script_answer_invalid' using errcode='22023'; end if;
   else
    if jsonb_typeof(answer) is distinct from 'string' or length(btrim(answer#>>'{}')) not between 1 and 2000 then raise exception 'script_answer_invalid' using errcode='22023'; end if;
    if step->>'type'='choice' and not (step->'options' @> jsonb_build_array(answer)) then raise exception 'script_choice_invalid' using errcode='22023'; end if;
   end if;
   update public.crm_script_sessions set answers=answers||jsonb_build_object(step->>'id',answer),current_step=current_step+1,
    status=case when current_step+1=jsonb_array_length(snapshot->'steps') then 'completed' else 'running' end,
    revision=revision+1,updated_at=now() where id=v.id and organization_id=p_org returning * into v;
  elsif a='interrupt' then
   if v.status<>'running' or length(btrim(coalesce(p_command->>'reason',''))) not between 1 and 300 then raise exception 'script_interrupt_invalid' using errcode='22023'; end if;
   update public.crm_script_sessions set status='interrupted',interruption_reason=p_command->>'reason',revision=revision+1,updated_at=now() where id=v.id and organization_id=p_org returning * into v;
   -- Coleta interrompida entrega contexto pela mesma conversa; não reativa IA.
   update public.conversations set status=case when status='ai_handling' then 'pending' else status end,bot_silenced_until='infinity',last_handoff_at=now(),last_handoff_reason='Roteiro interrompido: contexto disponível no atendimento' where id=c.id and organization_id=p_org;
  elsif a='resume' then
   if v.status<>'interrupted' then raise exception 'script_resume_invalid' using errcode='23505'; end if;
   update public.crm_script_sessions set status='running',revision=revision+1,updated_at=now() where id=v.id and organization_id=p_org returning * into v;
  end if;
  result:=to_jsonb(v); chosen:=v.id;
 end if;
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
 values(p_org,auth.uid(),'short_script.'||a,'short_script',chosen,jsonb_build_object('status',result->>'status'));
 insert into public.idempotency_keys(organization_id,key,endpoint,request_hash,status_code,response_body,expires_at)
 values(p_org,p_request::text,'short-script:'||auth.uid()::text,fingerprint,200,result,now()+interval '24 hours');
 return result;
end $$;
revoke all on function public.fn_script_command(uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.fn_script_command(uuid,jsonb,uuid) to authenticated;


create or replace function public.fn_automation_rule_delete_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is not null and (not public.fn_role_at_least(old.organization_id,'manager') or not public.fn_support_write_allowed(old.organization_id) or not public.fn_session_mfa_proven()) then raise exception 'automation_delete_forbidden' using errcode='42501'; end if;
 return old;
end $$;
revoke all on function public.fn_automation_rule_delete_guard() from public,anon,authenticated,service_role;
drop trigger if exists automation_rule_delete_guard on public.automation_rules;
create trigger automation_rule_delete_guard before delete on public.automation_rules for each row execute function public.fn_automation_rule_delete_guard();
