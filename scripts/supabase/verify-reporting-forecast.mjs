import { expect } from "@playwright/test";
export async function verifyReportingForecast({admin,a,b,viewer,agent,anon,orgA,orgB,desktop,mobile,app,dir,requireResult:take,insist,done}) {
 const {page,context}=desktop;
 const read=async(person,org=orgA,extra={})=>take(await person.client.rpc("fn_crm_commercial_report",{p_org:org,p_from:"2026-01-01",p_to:"2026-02-01",p_pipeline:pipe,...extra}),"E read model JWT");
 const group=(r,c)=>r.currencies.find(v=>v.currency===c);
 const shot=async(name)=>{insist(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"E sem overflow "+name);await page.screenshot({path:dir+"/forecast-"+name+".png",fullPage:true});};
 let pipe;
 try {
  insist(true,"E fixtures comerciais");
  pipe=take(await a.client.from("crm_pipelines").insert({organization_id:orgA,name:"Forecast fictício E",slug:"forecast-e",position:100,settings:{lost_reasons:["price"]}}).select("id").single(),"E pipeline").id;
  const stages=take(await a.client.from("crm_stages").insert([
   {name:"Etapa E A",slug:"forecast-a",position:1},{name:"Etapa E B",slug:"forecast-b",position:2},{name:"Etapa E C",slug:"forecast-c",position:3},
   {name:"Sem configuração E",slug:"forecast-x",position:4},{name:"Zero E",slug:"forecast-zero",position:5,probability_percent:0},{name:"Cem E",slug:"forecast-cem",position:6,probability_percent:100},
   {name:"Ganho E",slug:"forecast-won",position:7,is_won:true},{name:"Perda E",slug:"forecast-lost",position:8,is_lost:true},
  ].map(s=>({is_won:false,is_lost:false,probability_percent:null,...s,organization_id:orgA,pipeline_id:pipe}))).select("id,name,probability_percent"),"E etapas");
  const sid=(name)=>stages.find(s=>s.name===name).id;
  insist(stages.filter(s=>["Etapa E A","Etapa E B","Etapa E C","Sem configuração E"].includes(s.name)).every(s=>s.probability_percent===null),"E etapas nascem sem probabilidade");
  await page.setViewportSize({width:1440,height:900});
  await page.goto(app+"/app/settings/tenant/pipelines",{timeout:120000});
  for(const [name,percent] of [["Etapa E A",20],["Etapa E B",50],["Etapa E C",80]]) {
   insist(true,"E UI configura "+name);
   const row=page.getByTestId("etapa-"+sid(name));
   await row.getByLabel("Probabilidade (%) · "+name,{exact:true}).fill(String(percent));
   await row.getByRole("button",{name:"Salvar probabilidade",exact:true}).focus();
   const [r]=await Promise.all([page.waitForResponse(r=>r.url().includes("/stages/"+sid(name))&&r.request().method()==="PATCH"),page.keyboard.press("Enter")]);
   insist(r.ok(),"E probabilidade salva "+name);
   await expect.poll(async()=>take(await a.client.from("crm_stages").select("probability_percent").eq("organization_id",orgA).eq("id",sid(name)).single(),"E probabilidade persistida").probability_percent).toBe(percent);
  }
  await shot("settings-1440");await page.setViewportSize({width:390,height:844});await shot("settings-390");
  const specs=[
   ["E vinte","Etapa E A",100000,"BRL","2026-01-15"],["E cinquenta","Etapa E B",200000,"BRL","2026-01-15"],["E oitenta","Etapa E C",300000,"BRL","2026-01-15"],
   ["E meio centavo","Etapa E B",1,"BRL","2026-01-15"],["E moeda USD","Etapa E B",10000,"USD","2026-01-15"],
   ["E sem probabilidade","Sem configuração E",400000,"BRL","2026-01-15"],["E sem valor","Etapa E A",null,"BRL","2026-01-15"],
   ["E valor zero","Zero E",0,"BRL","2026-01-15"],["E cem","Cem E",123,"BRL","2026-01-15"],
   ["E fora horizonte","Etapa E A",100,"BRL","2026-02-01"],["E sem data","Cem E",10,"BRL",null],
   ["E sem moeda","Cem E",100,null,"2026-01-15"],["E bigint","Etapa E B","9007199254740993","EUR","2026-01-15"],
  ];
  const leads=take(await a.client.from("crm_leads").insert(specs.map(([title,stage,value,currency,date])=>({organization_id:orgA,pipeline_id:pipe,stage_id:sid(stage),title,value_cents:value,currency,expected_close_date:date,created_at:"2026-01-05T00:00:00Z",owner_user_id:a.id}))).select("id,title,stage_id"),"E abertos");
  take(await a.client.from("crm_leads").insert([
   {stage_id:sid("Ganho E"),title:"E ganho anterior",value_cents:500000,closed_at:"2026-01-05T00:00:00Z"},
   {stage_id:sid("Ganho E"),title:"E ganho fora período",value_cents:900000,closed_at:"2026-02-01T00:00:00Z"},
   {stage_id:sid("Perda E"),title:"E perda anterior",value_cents:400000,closed_at:"2026-01-05T00:00:00Z",lost_reason:"price"},
   {stage_id:sid("Etapa E B"),title:"E dono agente",value_cents:200,owner_user_id:agent.id,expected_close_date:"2026-01-15"},
  ].map(v=>({organization_id:orgA,pipeline_id:pipe,currency:v.title==="E dono agente"?"USD":"BRL",owner_user_id:a.id,created_at:"2025-12-05T00:00:00Z",...v}))),"E resultados e responsável");
  let report=await read(a),brl=group(report,"BRL");
  insist(brl.weighted_current_cents==="360154"&&brl.weighted_period_cents==="360124","E matemática BRL manual");
  insist(group(report,"USD").weighted_current_cents==="5100"&&group(report,"EUR").weighted_current_cents==="4503599627370497","E moedas e bigint separados");
  insist(brl.won_value_cents==="500000"&&brl.lost_value_cents==="400000"&&brl.conversion_percent===50,"E closed_at e conversão encerrados");
  insist(brl.missing_probability===1&&brl.missing_value===1&&brl.missing_date===1,"E incompletude explícita");
  for(const person of[b,viewer])insist((await person.client.rpc("fn_crm_commercial_report",{p_org:orgA,p_from:"2026-01-01",p_to:"2026-02-01"})).error?.code==="42501","E acesso agregado negado");
  insist((await anon.rpc("fn_crm_commercial_report",{p_org:orgA,p_from:"2026-01-01",p_to:"2026-02-01"})).error?.code==="42501","E anon negado");
  insist((await admin.rpc("fn_crm_commercial_report",{p_org:orgA,p_from:"2026-01-01",p_to:"2026-02-01"})).error?.code==="42501","E service sem atalho");
  const agentReport=await read(agent);insist(agentReport.currencies.length===1&&group(agentReport,"USD").weighted_current_cents==="100","E own scope agregado");
  insist((await read(a,orgA,{p_owner:agent.id})).currencies.length===1,"E filtro responsável");
  const bPipe=take(await b.client.from("crm_pipelines").insert({organization_id:orgB,name:"Forecast B",slug:"forecast-b",position:100}).select("id").single(),"E B pipeline").id;
  const bStage=take(await b.client.from("crm_stages").insert({organization_id:orgB,pipeline_id:bPipe,name:"Etapa B",slug:"etapa-b",position:1,probability_percent:100}).select("id").single(),"E B etapa").id;
  take(await b.client.from("crm_leads").insert({organization_id:orgB,pipeline_id:bPipe,stage_id:bStage,title:"E valor B",value_cents:999999999,currency:"BRL",owner_user_id:b.id}),"E B lead");
  insist(group(await read(a),"BRL").weighted_current_cents===brl.weighted_current_cents,"E B não influencia A");
  insist((await read(a,orgA,{p_pipeline:bPipe})).currencies.length===0,"E filtro pipeline alheio vazio");
  done("Bloco E: JWT A/B, viewer/agent/admin/anon/service; cents exatos, null/zero, moedas, período, conversão e own-scope");
  const panel=page.getByRole("region",{name:"Relatório comercial",exact:true});
  const openReport=async()=>{
   await page.goto(app+"/app/metrics",{timeout:120000});
   await panel.getByLabel("De (UTC)",{exact:true}).fill("2026-01-01");await panel.getByLabel("Até (UTC, exclusivo)",{exact:true}).fill("2026-02-01");
   await panel.getByRole("combobox",{name:/^Funil/}).selectOption(pipe);
   const [r]=await Promise.all([page.waitForResponse(r=>r.url().includes("/reports/commercial?")&&r.url().includes("pipeline_id="+pipe)&&r.url().includes("from=2026-01-01")),panel.getByRole("button",{name:"Aplicar filtros",exact:true}).click()]);insist(r.ok(),"E relatório UI");
  };
  await page.setViewportSize({width:1440,height:900});await openReport();await panel.getByText("BRL 3.601,54",{exact:true}).waitFor();await panel.getByText(/Forecast incompleto:/).first().waitFor();await shot("report-1440");
  await page.setViewportSize({width:390,height:844});await shot("report-390");
  insist(true,"E UI mover e ganhar oportunidade");
  const lead=leads.find(l=>l.title==="E vinte");
  const version=take(await a.client.from("crm_leads").select("updated_at").eq("organization_id",orgA).eq("id",lead.id).single(),"E versão").updated_at;
  const moved=await context.request.post(app+"/api/v1/leads/"+lead.id+"/move",{data:{stage_id:sid("Etapa E B"),position_in_stage:0,expected_updated_at:version}});insist(moved.ok(),"E movimento preservado");
  insist(group(await read(a),"BRL").weighted_current_cents==="390154","E troca de etapa recalcula forecast");
  await page.setViewportSize({width:1440,height:900});await page.goto(app+"/app/pipelines/"+pipe,{timeout:120000});
  const card=page.getByRole("group",{name:"Lead: E vinte",exact:true});await card.getByRole("button",{name:"Ações do lead",exact:true}).click();
  await page.getByRole("menuitem",{name:"Marcar como ganho",exact:true}).click();
  await expect.poll(async()=>take(await a.client.from("crm_leads").select("status").eq("organization_id",orgA).eq("id",lead.id).single(),"E ganho real").status,{timeout:30000}).toBe("won");
  // Fixa a data da fixture depois da ação real, para provar janela sem relógio variável.
  take(await a.client.from("crm_leads").update({closed_at:"2026-01-20T00:00:00Z"}).eq("organization_id",orgA).eq("id",lead.id),"E data controlada");
  brl=group(await read(a),"BRL");insist(brl.weighted_current_cents==="340154"&&brl.won_value_cents==="600000"&&brl.won_count===2,"E won sai de forecast e entra em resultado");
  await openReport();await panel.getByText("BRL 3.401,54",{exact:true}).waitFor();await shot("won-1440");
  await page.setViewportSize({width:390,height:844});await shot("won-390");
  await mobile.page.goto(app+"/app/metrics",{timeout:120000});await mobile.page.getByText("Sem permissão para relatórios comerciais.",{exact:true}).waitFor();
  insist((await mobile.context.request.get(app+"/api/v1/reports/commercial?from=2026-01-01&to=2026-02-01")).status()===403,"E viewer API");
  await mobile.page.screenshot({path:dir+"/forecast-viewer-390.png",fullPage:true});
  done("Bloco E: admin configura probabilidade → relatório desktop/mobile → movimento → ganho → forecast/resultado atualizados; teclado e incompletude");
 } catch(error) {await page.screenshot({path:dir+"/forecast-failure.png",fullPage:true}).catch(()=>{});throw error;}
}
