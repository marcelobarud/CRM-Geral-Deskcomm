-- Bloco H 0275: cobertura dos FKs de campanha identificados pelo advisor.
create index if not exists crm_scheduled_campaign_recipients_contact_idx
 on public.crm_scheduled_campaign_recipients(contact_id);
create index if not exists crm_scheduled_campaigns_created_by_idx
 on public.crm_scheduled_campaigns(created_by);
create index if not exists crm_scheduled_campaigns_cancelled_by_idx
 on public.crm_scheduled_campaigns(cancelled_by);
create index if not exists crm_scheduled_campaigns_tag_org_idx
 on public.crm_scheduled_campaigns(tag_id,organization_id);
