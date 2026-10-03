-- 0259: índices de FKs e desvinculação de ator excluído, sem alterar snapshot.
create index if not exists crm_proposal_items_product_fk on public.crm_proposal_items(product_id);
create index if not exists crm_proposal_templates_actor_fk on public.crm_proposal_templates(created_by);
create index if not exists crm_proposal_versions_actor_fk on public.crm_proposal_versions(created_by);
create index if not exists crm_proposals_actor_fk on public.crm_proposals(created_by);
create index if not exists crm_proposals_contact_fk on public.crm_proposals(contact_id);
create index if not exists crm_proposals_lead_fk on public.crm_proposals(lead_id);
create or replace function public.fn_proposal_version_immutable() returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='DELETE' then
 if exists(select 1 from public.organizations where id=old.organization_id) then raise exception 'proposal_version_immutable' using errcode='42501'; end if;
 return old;
 end if;
 if old.created_by is not null and new.created_by is null and (to_jsonb(new)-'created_by')=(to_jsonb(old)-'created_by') then return new; end if;
 if old.state='sent' or (to_jsonb(new)-array['state','sent_at','pdf_sha256']) is distinct from (to_jsonb(old)-array['state','sent_at','pdf_sha256']) then raise exception 'proposal_version_immutable' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function public.fn_proposal_version_immutable() from public,anon,authenticated,service_role;