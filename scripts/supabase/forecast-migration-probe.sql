begin;
-- __FORECAST_MIGRATION__
do $probe$ declare a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); actor uuid:=gen_random_uuid(); pipe uuid:=gen_random_uuid(); other_pipe uuid:=gen_random_uuid(); s20 uuid:=gen_random_uuid(); s50 uuid:=gen_random_uuid(); s80 uuid:=gen_random_uuid(); sx uuid:=gen_random_uuid(); s0 uuid:=gen_random_uuid(); s100 uuid:=gen_random_uuid(); sw uuid:=gen_random_uuid(); sl uuid:=gen_random_uuid(); r jsonb; brl jsonb; usd jsonb; begin
 insert into public.organizations(id,slug,legal_name,display_name) values(a,'forecast-probe-'||a,'Fictícia forecast A','Fictícia forecast A'),(b,'forecast-probe-'||b,'Fictícia forecast B','Fictícia forecast B');
 insert into auth.users(id,email,raw_user_meta_data) values(actor,'forecast-probe-'||actor||'@example.invalid','{}');
 insert into public.user_organizations(user_id,organization_id,role,accepted_at) values(actor,a,'admin',now());
 insert into public.crm_pipelines(id,organization_id,name,slug,position) values(pipe,a,'Forecast fictício','forecast-probe',100),(other_pipe,b,'Forecast B','forecast-probe',100);
 insert into public.crm_stages(id,organization_id,pipeline_id,name,slug,position,probability_percent,is_won,is_lost) values
 (s20,a,pipe,'A','s20',1,20,false,false),(s50,a,pipe,'B','s50',2,50,false,false),(s80,a,pipe,'C','s80',3,80,false,false),(sx,a,pipe,'Não configurada','sx',4,null,false,false),(s0,a,pipe,'Zero','s0',5,0,false,false),(s100,a,pipe,'Cem','s100',6,100,false,false),(sw,a,pipe,'Ganho','sw',7,null,true,false),(sl,a,pipe,'Perda','sl',8,null,false,true);
 insert into public.crm_leads(organization_id,pipeline_id,stage_id,title,value_cents,currency,owner_user_id,expected_close_date,created_at,closed_at) values
 (a,pipe,s20,'Fictício 20',100000,'BRL',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,s50,'Fictício 50',200000,'BRL',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,s80,'Fictício 80',300000,'BRL',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,s50,'Meio centavo',1,'BRL',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,s50,'USD isolado',123,'USD',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,sx,'Sem probabilidade',200,'BRL',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,s20,'Sem valor',null,'BRL',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,s0,'Zero informado',0,'BRL',actor,'2026-01-15','2026-01-05',null),
 (a,pipe,s20,'Fora horizonte',100000,'BRL',actor,'2026-02-01','2026-01-05',null),
 (a,pipe,s100,'Sem data',10,'BRL',actor,null,'2026-01-05',null),
 (a,pipe,s100,'Sem moeda',100,null,actor,'2026-01-15','2026-01-05',null),
 (a,pipe,sw,'Ganho atual',500000,'BRL',actor,null,'2025-12-05','2026-01-05'),
 (a,pipe,sw,'Ganho fora',999999,'BRL',actor,null,'2025-12-05','2026-02-01');
 insert into public.crm_leads(organization_id,pipeline_id,stage_id,title,value_cents,currency,owner_user_id,created_at,closed_at,lost_reason) values(a,pipe,sl,'Perda atual',400000,'BRL',actor,'2025-12-05','2026-01-05','price');
 begin update public.crm_stages set probability_percent=101 where id=s20;raise exception 'forecast_invalid_probability_allowed';exception when check_violation then null;end;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated','aal','aal1')::text,true);
 execute 'set local role authenticated';
 r:=public.fn_crm_commercial_report(a,'2026-01-01','2026-02-01',pipe);
 select v into brl from jsonb_array_elements(r->'currencies') v where v->>'currency'='BRL';
 select v into usd from jsonb_array_elements(r->'currencies') v where v->>'currency'='USD';
 if brl->>'weighted_current_cents'<>'380011' or brl->>'weighted_period_cents'<>'360001' or usd->>'weighted_current_cents'<>'62' then raise exception 'forecast_math_failed %',r;end if;
 if brl->>'won_value_cents'<>'500000' or brl->>'lost_value_cents'<>'400000' or (brl->>'conversion_percent')::numeric<>50 then raise exception 'forecast_status_window_failed';end if;
 if brl->>'missing_probability'<>'1' or brl->>'missing_value'<>'1' or brl->>'missing_date'<>'1' then raise exception 'forecast_missing_failed';end if;
 begin perform public.fn_crm_commercial_report(b,'2026-01-01','2026-02-01');raise exception 'forecast_cross_org_allowed';exception when insufficient_privilege then null;end;
 if public.fn_crm_commercial_report(a,'2026-01-01','2026-02-01',other_pipe)->'currencies'<>'[]'::jsonb then raise exception 'forecast_foreign_filter_leak';end if;
 execute 'reset role';
 update public.user_organizations set role='viewer' where user_id=actor and organization_id=a;
 execute 'set local role authenticated';
 begin perform public.fn_crm_commercial_report(a,'2026-01-01','2026-02-01');raise exception 'forecast_viewer_allowed';exception when insufficient_privilege then null;end;
 execute 'reset role';
end $probe$;
rollback;
select jsonb_build_object('reapplication_twice',true,'math',true,'currencies',true,'status_window',true,'null_zero',true,'cross_tenant',true,'viewer_denied',true,'rolled_back',true) forecast_probe;
