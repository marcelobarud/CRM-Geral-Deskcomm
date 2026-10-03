-- CRM Geral 0238: append-only e autorização vigente nas rotas de follow-up.
-- Dono/DBA e fn_expurgar_auditoria_vencida mantêm a retenção legal explícita.
revoke update, delete, truncate on public.api_audit_log from public, anon, authenticated, service_role;
do $local$
begin
 if exists(select 1 from pg_roles where rolname='crm_geral_app') then
  revoke update, delete, truncate on public.api_audit_log from crm_geral_app;
 end if;
end $local$;
drop policy if exists tenant_isolation_followup_enrollments_all on public.followup_enrollments;

drop policy if exists followup_enrollments_select on public.followup_enrollments;
create policy followup_enrollments_select on public.followup_enrollments
  for select using (organization_id in (select public.fn_user_org_ids()));

drop policy if exists followup_enrollments_insert on public.followup_enrollments;
create policy followup_enrollments_insert on public.followup_enrollments
  for insert
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists followup_enrollments_update on public.followup_enrollments;
create policy followup_enrollments_update on public.followup_enrollments
  for update
  using (organization_id in (select public.fn_user_org_ids())
         and public.fn_role_at_least(organization_id, 'manager'))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists followup_enrollments_delete on public.followup_enrollments;
create policy followup_enrollments_delete on public.followup_enrollments
  for delete
  using (organization_id in (select public.fn_user_org_ids())
         and public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists tenant_isolation_followup_flow_pointers_all on public.followup_flow_pointers;

drop policy if exists followup_flow_pointers_select on public.followup_flow_pointers;
create policy followup_flow_pointers_select on public.followup_flow_pointers
  for select using (organization_id in (select public.fn_user_org_ids()));

drop policy if exists followup_flow_pointers_insert on public.followup_flow_pointers;
create policy followup_flow_pointers_insert on public.followup_flow_pointers
  for insert
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists followup_flow_pointers_update on public.followup_flow_pointers;
create policy followup_flow_pointers_update on public.followup_flow_pointers
  for update
  using (organization_id in (select public.fn_user_org_ids())
         and public.fn_role_at_least(organization_id, 'manager'))
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists followup_flow_pointers_delete on public.followup_flow_pointers;
create policy followup_flow_pointers_delete on public.followup_flow_pointers
  for delete
  using (organization_id in (select public.fn_user_org_ids())
         and public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists tenant_isolation_followup_enrollment_events_all on public.followup_enrollment_events;

drop policy if exists followup_enrollment_events_select on public.followup_enrollment_events;
create policy followup_enrollment_events_select on public.followup_enrollment_events
  for select using (organization_id in (select public.fn_user_org_ids()));

drop policy if exists followup_enrollment_events_insert on public.followup_enrollment_events;
create policy followup_enrollment_events_insert on public.followup_enrollment_events
  for insert
  with check (organization_id in (select public.fn_user_org_ids())
              and public.fn_role_at_least(organization_id, 'manager'));

drop policy if exists tenant_isolation_followup_flow_versions_all on public.followup_flow_versions;

drop policy if exists followup_flow_versions_select on public.followup_flow_versions;
create policy followup_flow_versions_select on public.followup_flow_versions
  for select using (organization_id in (select public.fn_user_org_ids()));

drop policy if exists followup_flow_versions_delete on public.followup_flow_versions;
create policy followup_flow_versions_delete on public.followup_flow_versions
  for delete
  using (organization_id in (select public.fn_user_org_ids())
         and public.fn_role_at_least(organization_id, 'manager'));

