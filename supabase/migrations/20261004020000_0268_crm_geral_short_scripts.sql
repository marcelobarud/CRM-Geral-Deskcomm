-- Coleta no atendimento, sem scheduler, envio ou promoção automática de dados.
create table if not exists public.crm_short_scripts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 definition jsonb not null, revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,id)
);
create unique index if not exists conversations_id_org_scripts on public.conversations(id,organization_id);
create table if not exists public.crm_script_sessions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 script_id uuid not null, conversation_id uuid not null,
 snapshot jsonb not null, status text not null default 'running' check(status in('running','interrupted','completed')),
 current_step integer not null default 0 check(current_step>=0), answers jsonb not null default '{}',
 interruption_reason text, revision integer not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(organization_id,script_id) references public.crm_short_scripts(organization_id,id) on delete cascade,
 foreign key(conversation_id,organization_id) references public.conversations(id,organization_id) on delete cascade,
 unique(organization_id,id)
);
create unique index if not exists crm_script_one_live_session on public.crm_script_sessions(organization_id,conversation_id) where status in('running','interrupted');
create index if not exists crm_script_sessions_script on public.crm_script_sessions(organization_id,script_id);
create index if not exists crm_script_sessions_conversation on public.crm_script_sessions(conversation_id,organization_id,created_at desc);
alter table public.crm_short_scripts enable row level security;
alter table public.crm_script_sessions enable row level security;
revoke all on public.crm_short_scripts,public.crm_script_sessions from public,anon,authenticated,service_role;
grant select on public.crm_short_scripts,public.crm_script_sessions to authenticated,service_role;
drop policy if exists scripts_select on public.crm_short_scripts;
create policy scripts_select on public.crm_short_scripts for select to authenticated using(public.fn_role_at_least(organization_id,'agent'));
drop policy if exists script_sessions_select on public.crm_script_sessions;
create policy script_sessions_select on public.crm_script_sessions for select to authenticated using(exists(select 1 from public.conversations c where c.id=conversation_id and c.organization_id=crm_script_sessions.organization_id));

create or replace function public.fn_script_definition_valid(p_data jsonb) returns boolean
language plpgsql immutable set search_path=public as $$
declare s jsonb; n integer; ids text[]:='{}';
begin
 if jsonb_typeof(p_data) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_data) k where k not in('name','description','is_active','steps'))
 or jsonb_typeof(p_data->'name') is distinct from 'string' or length(btrim(p_data->>'name')) not between 1 and 160
 or jsonb_typeof(p_data->'description') is distinct from 'string' or length(p_data->>'description')>1000
 or jsonb_typeof(p_data->'is_active') is distinct from 'boolean' or jsonb_typeof(p_data->'steps') is distinct from 'array' then return false; end if;
 n:=jsonb_array_length(p_data->'steps'); if n not between 1 and 12 then return false; end if;
 for s in select value from jsonb_array_elements(p_data->'steps') loop
  if jsonb_typeof(s) is distinct from 'object' or jsonb_typeof(s->'prompt') is distinct from 'string'
  or length(btrim(s->>'prompt')) not between 1 and 500 or coalesce(s->>'type','') not in('text','choice','confirmation')
  or coalesce(s->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  or (s->>'id')=any(ids) or exists(select 1 from jsonb_object_keys(s) k where k not in('id','type','prompt','options')) then return false; end if;
  ids:=array_append(ids,s->>'id');
  if s->>'type'='choice' then
   if jsonb_typeof(s->'options') is distinct from 'array' then return false; end if;
   if jsonb_array_length(s->'options') not between 2 and 6 or exists(select 1 from jsonb_array_elements(s->'options') o where jsonb_typeof(o) is distinct from 'string' or length(btrim(o#>>'{}')) not between 1 and 100)
   or (select count(distinct value) from jsonb_array_elements(s->'options'))<>jsonb_array_length(s->'options') then return false; end if;
  elsif s ? 'options' then return false; end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function public.fn_script_definition_valid(jsonb) from public,anon,authenticated,service_role;

-- Mantém fonte canônica da configuração, defaults e contrato do Bloco A/F.
create or replace function public.fn_capability_enabled(p_org uuid,p_capability text) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare c jsonb; v jsonb;
begin
 if p_capability is null or p_capability not in('message_templates','proposals','short_scripts') then return false; end if;
 if auth.uid() is not null and not public.fn_role_at_least(p_org,'viewer') then return false; end if;
 select settings->'capabilities' into c from public.organizations where id=p_org;
 if not found then return false; end if;
 if c is null or c='null'::jsonb then return p_capability='message_templates'; end if;
 if jsonb_typeof(c) is distinct from 'object' or c->'version' is distinct from '1'::jsonb or jsonb_typeof(c->'revision') is distinct from 'number'
 or coalesce(c->>'revision','') !~ '^[0-9]{1,16}$' or jsonb_typeof(c->'overrides') is distinct from 'object' then return false; end if;
 if (c->>'revision')::numeric>9007199254740991 then return false; end if;
 v:=c->'overrides'->p_capability;
 if v is null then return p_capability='message_templates'; end if;
 return v='true'::jsonb;
end $$;
revoke all on function public.fn_capability_enabled(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.fn_capability_enabled(uuid,text) to authenticated,service_role;

create or replace function public.fn_set_capability(p_org uuid,p_capability text,p_enabled boolean) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c jsonb; overrides jsonb; revision bigint; previous boolean; previous_context text;
begin
 if auth.uid() is null or not public.fn_role_at_least(p_org,'admin') or not public.fn_support_write_allowed(p_org) or not public.fn_session_mfa_proven() then raise exception 'capability_forbidden' using errcode='42501'; end if;
 if p_capability is null or p_capability not in('message_templates','proposals','short_scripts') or p_enabled is null then raise exception 'capability_invalid' using errcode='22023'; end if;
 select settings->'capabilities' into c from public.organizations where id=p_org for update;
 if not found then raise exception 'organization_not_found' using errcode='P0002'; end if;
 previous:=public.fn_capability_enabled(p_org,p_capability); revision:=0;
 if jsonb_typeof(c)='object' and c->'version'='1'::jsonb and jsonb_typeof(c->'revision')='number' and coalesce(c->>'revision','') ~ '^[0-9]{1,16}$' then
  if (c->>'revision')::numeric<9007199254740991 then revision:=(c->>'revision')::bigint; end if;
 end if;
 overrides:=case when c->'version'='1'::jsonb and jsonb_typeof(c->'overrides')='object' then c->'overrides' else '{}'::jsonb end;
 previous_context:=current_setting('crm.capabilities_write',true); perform set_config('crm.capabilities_write','1',true);
 update public.organizations set settings=jsonb_set(coalesce(settings,'{}'),'{capabilities}',jsonb_build_object('version',1,'revision',revision+1,'overrides',overrides||jsonb_build_object(p_capability,p_enabled)),true) where id=p_org;
 perform set_config('crm.capabilities_write',coalesce(previous_context,''),true);
 return jsonb_build_object('previous_enabled',previous,'enabled',p_enabled,'revision',revision+1);
end $$;
revoke all on function public.fn_set_capability(uuid,text,boolean) from public,anon,authenticated,service_role;
grant execute on function public.fn_set_capability(uuid,text,boolean) to authenticated;

create or replace function public.fn_script_command(p_org uuid,p_command jsonb,p_request uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare a text:=p_command->>'action'; d jsonb:=p_command->'definition'; chosen uuid;
 s public.crm_short_scripts; v public.crm_script_sessions; c public.conversations;
 step jsonb; answer jsonb; result jsonb; receipt public.idempotency_keys; fingerprint bytea;
begin
 if auth.uid() is null or not public.fn_role_at_least(p_org,'agent') or not public.fn_support_write_allowed(p_org)
 or not public.fn_session_mfa_proven() or not public.fn_capability_enabled(p_org,'short_scripts') then raise exception 'script_forbidden' using errcode='42501'; end if;
 if p_request is null or a is null or a not in('create','update','start','answer','interrupt','resume') then raise exception 'script_invalid' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('short-scripts:'||p_org::text,0));
 fingerprint:=extensions.digest(p_command::text,'sha256');
 select * into receipt from public.idempotency_keys where organization_id=p_org and key=p_request::text and endpoint='short-script:'||auth.uid()::text;
 if found then
  if receipt.request_hash is distinct from fingerprint then raise exception 'script_request_conflict' using errcode='23505'; end if;
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

create or replace function public.fn_script_receipt_guard() returns trigger language plpgsql set search_path=public as $$
declare scoped boolean;
begin
 scoped:=case when TG_OP='DELETE' then old.endpoint like 'short-script:%' when TG_OP='INSERT' then new.endpoint like 'short-script:%' else old.endpoint like 'short-script:%' or new.endpoint like 'short-script:%' end;
 if scoped and current_user not in('postgres','supabase_admin') then
  if TG_OP='DELETE' and not exists(select 1 from public.organizations where id=old.organization_id) then return old; end if;
  raise exception 'script_receipt_private' using errcode='42501';
 end if;
 if TG_OP='DELETE' then return old; end if; return new;
end $$;
revoke all on function public.fn_script_receipt_guard() from public,anon,authenticated,service_role;
drop trigger if exists script_receipt_guard on public.idempotency_keys;
create trigger script_receipt_guard before insert or update or delete on public.idempotency_keys for each row execute function public.fn_script_receipt_guard();
