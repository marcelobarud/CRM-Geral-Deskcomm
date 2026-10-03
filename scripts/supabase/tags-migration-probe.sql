begin;
drop trigger if exists trg_contacts_tags_bridge on public.contacts;
drop trigger if exists trg_leads_tags_bridge on public.crm_leads;
drop trigger if exists trg_conversations_tags_bridge on public.conversations;
do $probe$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); ca uuid:=gen_random_uuid(); cb uuid:=gen_random_uuid(); session_id uuid:=gen_random_uuid(); begin
 insert into public.organizations(id,slug,legal_name,display_name,settings) values
 (a,'tags-probe-'||a,'Fictícia migration A','Fictícia migration A','{"tags_migration_probe":true}'),
 (b,'tags-probe-'||b,'Fictícia migration B','Fictícia migration B','{"tags_migration_probe":true}');
 insert into public.contacts(id,organization_id,name,tags) values(ca,a,'Contato fictício migration A',array['VIP','vip',' Vip ']),(cb,b,'Contato fictício migration B',array['VIP']);
 insert into public.contacts(organization_id,name,tags) values(a,'Contato fictício sem tags','{}');
 insert into public.crm_leads(organization_id,pipeline_id,stage_id,contact_id,title,tags)
 select a,p.id,s.id,ca,'Oportunidade fictícia migration',array['Cliente VIP','VIP'] from public.crm_pipelines p join public.crm_stages s on s.pipeline_id=p.id and s.organization_id=a where p.organization_id=a and not s.is_won and not s.is_lost limit 1;
 insert into public.channel_sessions(id,organization_id,waha_session_name,webhook_secret_encrypted) values(session_id,a,'tags-probe-'||a,'\x00'::bytea);
 insert into public.conversations(organization_id,contact_id,channel_session_id,status,tags) values(a,ca,session_id,'open',array['vip','Retorno']);
end $probe$;

-- __TAGS_MIGRATION__

do $assert$ declare a uuid; b uuid; begin
 select id into a from public.organizations where settings->>'tags_migration_probe'='true' and display_name='Fictícia migration A';
 select id into b from public.organizations where settings->>'tags_migration_probe'='true' and display_name='Fictícia migration B';
 if (select count(*) from public.crm_tags where organization_id=a and normalized_name='vip')<>1 then raise exception 'probe_dedup_failed'; end if;
 if (select count(*) from public.crm_tags where organization_id=b and normalized_name='vip')<>1 then raise exception 'probe_tenant_failed'; end if;
 if (select count(*) from public.crm_tag_assignments where organization_id=a)<>5 then raise exception 'probe_assignments_failed'; end if;
 if not exists(select 1 from public.contacts where organization_id=a and tags @> array['VIP','vip',' Vip ']) then raise exception 'probe_original_spellings_lost'; end if;
 if (select count(*) from public.crm_tag_assignments where organization_id=b)<>1 then raise exception 'probe_tenant_assignment_failed'; end if;
 if not exists(select 1 from public.contacts where organization_id=a and name='Contato fictício sem tags' and cardinality(tags)=0) then raise exception 'probe_empty_lost'; end if;
end $assert$;
select jsonb_build_object('dedup',true,'tenant_isolation',true,'three_scopes',true,'original_spellings_preserved',true,'empty_preserved',true,'rollback',true) as migration_probe;

do $ops$ declare a uuid; b uuid; actor uuid:=gen_random_uuid(); tag_a uuid; tag_b uuid; dst uuid; unused uuid; c uuid; result jsonb; begin
 select id into a from public.organizations where settings->>'tags_migration_probe'='true' and display_name='Fictícia migration A';
 select id into b from public.organizations where settings->>'tags_migration_probe'='true' and display_name='Fictícia migration B';
 select id into tag_a from public.crm_tags where organization_id=a and normalized_name='vip';
 select id into tag_b from public.crm_tags where organization_id=b and normalized_name='vip';
 select id into c from public.contacts where organization_id=a and name='Contato fictício migration A';
 insert into auth.users(id,email,raw_user_meta_data) values(actor,'tag-probe-'||actor||'@example.invalid','{"full_name":"Pessoa fictícia migration"}');
 insert into public.user_organizations(user_id,organization_id,role,accepted_at) values(actor,a,'admin',now());
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 execute 'set local role authenticated';
 if (select count(*) from public.crm_tags where organization_id=b)<>0 then raise exception 'probe_rls_leaked'; end if;
 perform public.fn_crm_tag_manage(a,'rename',tag_a,'Cliente premium');
 if not exists(select 1 from public.crm_tags where id=tag_a and name='Cliente premium') then raise exception 'probe_rename_identity_failed'; end if;
 begin perform public.fn_crm_tag_assign(a,'contact',c,tag_b,true); raise exception 'probe_cross_tenant_allowed'; exception when foreign_key_violation then null; end;
 result:=public.fn_crm_tag_manage(a,'create',null,'Destino fictício');
 dst:=(result->>'tag_id')::uuid;
 perform public.fn_crm_tag_assign(a,'contact',c,dst,true);
 perform public.fn_crm_tag_manage(a,'merge',tag_a,null,null,dst);
 if exists(select 1 from public.crm_tag_assignments where organization_id=a and tag_id=tag_a) then raise exception 'probe_merge_source_remains'; end if;
 if (select count(*) from public.crm_tag_assignments where organization_id=a)<>5 then raise exception 'probe_merge_lost_or_duplicated'; end if;
 if (select count(*) from public.crm_tag_assignments where organization_id=a and tag_id=dst)<>3 then raise exception 'probe_merge_scopes_lost'; end if;
 begin perform public.fn_crm_tag_manage(a,'delete',dst); raise exception 'probe_delete_used_allowed'; exception when foreign_key_violation then null; end;
 perform public.fn_crm_tag_assign(a,'contact',c,dst,false);
 if not exists(select 1 from public.crm_tags where id=dst and not is_archived) or (select count(*) from public.crm_tag_assignments where organization_id=a and tag_id=dst)<>2 then raise exception 'probe_contextual_removal_failed'; end if;
 result:=public.fn_crm_tag_manage(a,'create',null,'Livre fictícia');
 unused:=(result->>'tag_id')::uuid;
 perform public.fn_crm_tag_manage(a,'delete',unused);
 if not exists(select 1 from public.crm_tags where id=unused and is_archived) then raise exception 'probe_safe_delete_failed'; end if;
 if (select count(*) from public.api_audit_log where organization_id=a and action like 'tag.%')<5 then raise exception 'probe_audit_missing'; end if;
end $ops$;
do $compat$ declare org uuid; tag uuid; result jsonb; begin
 select id into org from public.organizations where settings->>'tags_migration_probe'='true' and display_name='Fictícia migration A';
 result:=public.fn_crm_tag_manage(org,'create',null,'CONFIGURADO'); tag:=(result->>'tag_id')::uuid;
 execute 'set local role postgres';
 update public.organizations set settings=settings||jsonb_build_object('probe_normalized_ref','configurado') where id=org;
 execute 'set local role authenticated';
 if (public.fn_crm_tag_impact(org,tag)->>'configuration_references')::int<1 then raise exception 'probe_normalized_reference_missing'; end if;
 begin perform public.fn_crm_tag_manage(org,'delete',tag); raise exception 'probe_normalized_delete_allowed'; exception when foreign_key_violation then null; end;
 execute 'set local role postgres';
 update public.organizations set settings=settings-'probe_normalized_ref' where id=org;
 execute 'set local role authenticated';
 perform public.fn_crm_tag_manage(org,'delete',tag);
end $compat$;
select jsonb_build_object('rename_identity',true,'merge_three_scopes',true,'dedup',true,'contextual_removal',true,'delete_guard',true,'safe_delete',true,'rls',true,'audit',true,'rollback',true,'normalized_reference_guard',true) as operations_probe;
rollback;