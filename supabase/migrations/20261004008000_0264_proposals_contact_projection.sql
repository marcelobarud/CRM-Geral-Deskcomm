-- 0264: liga ações à timeline canônica com motivo e autoria legíveis.
create or replace function public.fn_proposal_command(p_org uuid,p_action text,p_proposal uuid default null,p_data jsonb default '{}'::jsonb,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p public.crm_proposals; v public.crm_proposal_versions; receipt public.idempotency_keys;
 r jsonb; item jsonb; items jsonb; ctx jsonb; fingerprint bytea; k text; t bigint; next_id uuid; version_id uuid;
 template public.crm_proposal_templates; l public.crm_leads; linked_contact uuid; n integer:=0;
begin
 if auth.uid() is null or not public.fn_role_at_least(p_org,'agent') or not public.fn_support_write_allowed(p_org) or not public.fn_session_mfa_proven() then raise exception 'proposal_forbidden' using errcode='42501'; end if;
 perform 1 from public.organizations where id=p_org for update;
 if not public.fn_capability_enabled(p_org,'proposals') then raise exception 'proposal_disabled' using errcode='42501'; end if;
 if p_action not in ('create','update','template_create','template_update','prepare','record_pdf','finalize','archive') or p_request is null then raise exception 'proposal_command_invalid' using errcode='22023'; end if;
 fingerprint:=extensions.digest(jsonb_build_object('proposal',p_proposal,'data',case when p_action='prepare' then p_data-'brand' else p_data end)::text,'sha256');
 k:=auth.uid()::text||':'||p_request::text;
 select * into receipt from public.idempotency_keys where organization_id=p_org and key=k and endpoint='proposal:'||p_action for update;
 if found and receipt.expires_at>now() then
 if receipt.request_hash is distinct from fingerprint then raise exception 'proposal_request_conflict' using errcode='23505'; end if;
 return receipt.response_body;
 end if;
 if p_action in ('template_create','template_update') then
 if not public.fn_role_at_least(p_org,'manager') then raise exception 'proposal_template_manager' using errcode='42501'; end if;
 if jsonb_typeof(p_data->'content'->'items') is distinct from 'array' or jsonb_array_length(p_data->'content'->'items') not between 1 and 100 then raise exception 'proposal_template_items_invalid' using errcode='22023'; end if;
 if p_action='template_create' then
 insert into public.crm_proposal_templates(organization_id,name,currency,content,created_by) values(p_org,p_data->>'name',p_data->>'currency',p_data->'content',auth.uid()) returning to_jsonb(crm_proposal_templates.*) into r;
 else
 update public.crm_proposal_templates set name=p_data->>'name',currency=p_data->>'currency',content=p_data->'content' where organization_id=p_org and id=p_proposal returning to_jsonb(crm_proposal_templates.*) into r;
 if r is null then raise exception 'proposal_template_not_found' using errcode='P0002'; end if;
 end if;
 else
 if p_action<>'create' then
 select * into p from public.crm_proposals where organization_id=p_org and id=p_proposal for update;
 if not found or not public.fn_proposal_access(p_org,p_proposal) then raise exception 'proposal_not_found' using errcode='P0002'; end if;
 if p.status='archived' then raise exception 'proposal_archived' using errcode='23514'; end if;
 end if;
 if p_action in ('create','update') then
 if p_action='update' and (p_data->>'expected_revision')::integer is distinct from p.draft_revision then raise exception 'proposal_revision_conflict' using errcode='23505'; end if;
 if p_action='create' then
 if nullif(p_data->>'lead_id','') is not null then
 select * into l from public.crm_leads where id=(p_data->>'lead_id')::uuid and organization_id=p_org;
 if not found or (not public.fn_role_at_least(p_org,'manager') and l.owner_user_id is distinct from auth.uid()) then raise exception 'proposal_lead_forbidden' using errcode='42501'; end if;
 end if;
 insert into public.crm_proposals(organization_id,lead_id,contact_id,title,currency,notes,created_by)
 values(p_org,nullif(p_data->>'lead_id','')::uuid,nullif(p_data->>'contact_id','')::uuid,p_data->>'title',p_data->>'currency',coalesce(p_data->>'notes',''),auth.uid()) returning * into p;
 else
 update public.crm_proposals set title=p_data->>'title',currency=p_data->>'currency',notes=coalesce(p_data->>'notes',''),draft_revision=draft_revision+1,status='draft',updated_at=now() where id=p.id and organization_id=p_org returning * into p;
 end if;
 items:=p_data->'items';
 if nullif(p_data->>'template_id','') is not null then
 select * into template from public.crm_proposal_templates where id=(p_data->>'template_id')::uuid and organization_id=p_org;
 if not found or template.currency<>p.currency then raise exception 'proposal_template_invalid' using errcode='23503'; end if;
 items:=template.content->'items';
 update public.crm_proposals set notes=coalesce(template.content->>'notes','') where id=p.id and organization_id=p_org returning * into p;
 end if;
 if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) not between 1 and 100 then raise exception 'proposal_items_invalid' using errcode='22023'; end if;
 delete from public.crm_proposal_items where proposal_id=p.id and organization_id=p_org;
 for item in select value from jsonb_array_elements(items) loop
 if coalesce(item->>'quantity','') !~ '^[0-9]{1,9}(\.[0-9]{1,3})?$' or coalesce(item->>'unit_price_cents','') !~ '^[0-9]{1,16}$' then raise exception 'proposal_money_invalid' using errcode='22023'; end if;
 insert into public.crm_proposal_items(organization_id,proposal_id,product_id,description,quantity,unit_price_cents,position)
 values(p_org,p.id,nullif(item->>'product_id','')::uuid,item->>'description',(item->>'quantity')::numeric,(item->>'unit_price_cents')::bigint,n); n:=n+1;
 end loop;
 select sum(round(quantity*unit_price_cents))::bigint into t from public.crm_proposal_items where organization_id=p_org and proposal_id=p.id;
 if t>9007199254740991 then raise exception 'proposal_total_overflow' using errcode='22003'; end if;
 r:=to_jsonb(p)||jsonb_build_object('total_cents',t::text);
 elsif p_action='prepare' then
 if length(coalesce(p_data->>'recipient','')) not between 1 and 300 or p_data->>'channel' not in ('email','whatsapp','other') then raise exception 'proposal_recipient_invalid' using errcode='22023'; end if;
 linked_contact:=p.contact_id;
 if p.lead_id is not null then select contact_id into linked_contact from public.crm_leads where organization_id=p_org and id=p.lead_id; end if;
 select jsonb_build_object('contact',jsonb_build_object('name',c.name,'email',c.email,'phone',c.phone_number),'company',case when co.id is null then null else jsonb_build_object('name',co.name,'legal_name',co.legal_name,'document',co.document) end) into ctx
 from public.contacts c left join public.crm_companies co on co.id=c.company_id and co.organization_id=p_org where c.id=linked_contact and c.organization_id=p_org;
 select jsonb_agg(jsonb_build_object('description',description,'quantity',quantity::text,'unit_price_cents',unit_price_cents::text,'total_cents',round(quantity*unit_price_cents)::text) order by position),sum(round(quantity*unit_price_cents))::bigint into items,t
 from public.crm_proposal_items where organization_id=p_org and proposal_id=p.id;
 if items is null then raise exception 'proposal_items_missing' using errcode='23514'; end if;
 version_id:=gen_random_uuid();
 insert into public.crm_proposal_versions(id,organization_id,proposal_id,version_number,draft_revision,request_id,snapshot,total_cents,currency,pdf_path,recipient,channel,created_by)
 values(version_id,p_org,p.id,(select coalesce(max(version_number),0)+1 from public.crm_proposal_versions where organization_id=p_org and proposal_id=p.id),p.draft_revision,p_request,
 jsonb_build_object('title',p.title,'notes',p.notes,'currency',p.currency,'items',items,'total_cents',t::text,'context',ctx,'brand',p_data->'brand','author_id',auth.uid(),'author_name',(select coalesce(nullif(raw_user_meta_data->>'full_name',''),'Usuário da equipe') from auth.users where id=auth.uid()),'created_at',now()),t,p.currency,p_org::text||'/'||p.id::text||'/'||version_id::text||'.pdf',p_data->>'recipient',p_data->>'channel',auth.uid()) returning * into v;
 r:=to_jsonb(v);
 elsif p_action in ('record_pdf','finalize') then
 select * into v from public.crm_proposal_versions where id=(p_data->>'version_id')::uuid and organization_id=p_org and proposal_id=p.id for update;
 if not found then raise exception 'proposal_version_not_found' using errcode='P0002'; end if;
 if v.state='sent' then r:=to_jsonb(v);
 else
 if coalesce(p_data->>'pdf_sha256','') !~ '^[a-f0-9]{64}$' or not exists(select 1 from storage.objects where bucket_id='proposal-documents' and name=v.pdf_path) then raise exception 'proposal_pdf_missing' using errcode='23514'; end if;
 update public.crm_proposal_versions set state=case when p_action='finalize' then 'sent' else 'prepared' end,pdf_sha256=p_data->>'pdf_sha256',sent_at=case when p_action='finalize' then now() else null end where id=v.id and organization_id=p_org returning * into v;
 if p_action='finalize' then
 update public.crm_proposals set status=case when draft_revision=v.draft_revision then 'sent' else 'draft' end,updated_at=now() where id=p.id and organization_id=p_org;
 end if;
 r:=to_jsonb(v);
 end if;
 elsif p_action='archive' then
 update public.crm_proposals set status='archived',updated_at=now() where id=p.id and organization_id=p_org returning to_jsonb(crm_proposals.*) into r;
 end if;
 end if;
 if p_action in ('create','finalize','archive') and p.contact_id is not null then
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata) values(p_org,auth.uid(),'contact.proposal_changed','contact',p.contact_id,jsonb_build_object('proposal_id',p.id,'reason',case p_action when 'create' then 'Proposta criada' when 'finalize' then 'Versão da proposta registrada como enviada' else 'Proposta arquivada' end));
 end if;
 -- Histórico reutiliza a timeline, sem evento sem consumidor ou conteúdo pessoal no log.
 if p_action in ('create','finalize','archive') and p.lead_id is not null then
 insert into public.crm_lead_activities(organization_id,lead_id,contact_id,source_module,source_id,type,payload,performed_by_user_id,actor_kind,reason)
 values(p_org,p.lead_id,coalesce(p.contact_id,(select contact_id from public.crm_leads where organization_id=p_org and id=p.lead_id)),'proposals',p.id,'note',jsonb_build_object('body',case p_action when 'create' then 'Proposta criada' when 'finalize' then 'Versão da proposta registrada como enviada' else 'Proposta arquivada' end,'proposal_id',p.id),auth.uid(),'user',case p_action when 'create' then 'Proposta criada' when 'finalize' then 'Versão da proposta registrada como enviada' else 'Proposta arquivada' end);
 end if;
 begin
 insert into public.api_audit_log(organization_id,actor_user_id,action,resource_type,resource_id,metadata)
 values(p_org,auth.uid(),'proposal.'||p_action,'proposal',coalesce(p.id, nullif(r->>'id','')::uuid),jsonb_build_object('request_id',p_request));
 exception when others then raise warning 'proposal_audit_failed'; end;
 insert into public.idempotency_keys(organization_id,key,endpoint,request_hash,status_code,response_body,expires_at)
 values(p_org,k,'proposal:'||p_action,fingerprint,200,r,now()+interval '24 hours')
 on conflict(organization_id,key,endpoint) do update set request_hash=excluded.request_hash,response_body=excluded.response_body,expires_at=excluded.expires_at;
 return r;
end $$;
revoke all on function public.fn_proposal_command(uuid,text,uuid,jsonb,uuid) from public,anon,service_role;
grant execute on function public.fn_proposal_command(uuid,text,uuid,jsonb,uuid) to authenticated;
create or replace function public.fn_validate_activity_lead_org() returns trigger language plpgsql set search_path=public,pg_temp as $$ declare v_org uuid; begin select organization_id into v_org from public.crm_leads where id=new.lead_id; if v_org is null then raise exception 'lead_not_found' using errcode='23503'; end if; if v_org<>new.organization_id then raise exception 'lead_org_mismatch' using errcode='23514'; end if; return new; end $$;
revoke execute on function public.fn_validate_activity_lead_org() from public,anon,authenticated;
create or replace function public.fn_crm_company_contact_history(p_org uuid,p_contact uuid,p_limit int default 50,p_before timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or p_org not in(select public.fn_user_org_ids()) or not public.fn_crm_tag_target_visible(p_org,'contact',p_contact) then raise exception 'contact_unavailable' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(h)),'[]'::jsonb) into result from (
 select id,organization_id,actor_user_id,created_at,metadata
 from public.api_audit_log where organization_id=p_org and resource_type='contact' and resource_id=p_contact and (action='contact.company_changed' or (action='contact.proposal_changed' and public.fn_proposal_access(p_org,(metadata->>'proposal_id')::uuid)))
 and (p_before is null or (created_at,id)<(p_before,p_before_id))
 order by created_at desc,id desc limit least(greatest(p_limit,1),101)) h;
 return result;
end $$;
revoke execute on function public.fn_crm_company_contact_history(uuid,uuid,int,timestamptz,uuid) from public,anon,service_role;
grant execute on function public.fn_crm_company_contact_history(uuid,uuid,int,timestamptz,uuid) to authenticated;

