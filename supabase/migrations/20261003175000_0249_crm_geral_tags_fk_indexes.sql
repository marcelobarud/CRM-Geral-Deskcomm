-- Índices novos apenas para as FKs introduzidas pelo Bloco C.
create index if not exists idx_crm_tag_assignments_tag_fk on public.crm_tag_assignments(tag_id,organization_id);
create index if not exists idx_crm_tag_assignments_actor_fk on public.crm_tag_assignments(assigned_by);
create index if not exists idx_crm_tags_merge_fk on public.crm_tags(merged_into,organization_id);
