import {expect} from '@playwright/test';
import {randomUUID,createHash} from 'node:crypto';
export async function verifyProposals({admin,a,b,viewer,agent,anon,orgA,orgB,desktop,mobile,app,dir,requireResult:take,insist,done,getDiagnostic}){
 let page=desktop.page;const {context}=desktop;const paths=[];let proposal;
 const draft={title:'Proposta fictícia F',currency:'BRL',notes:'Texto fictício original',items:[{description:'Serviço fictício',quantity:'2',unit_price_cents:'10000'}]};
 const shot=async name=>{insist(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'F sem overflow '+name);await page.screenshot({path:dir+'/proposals-'+name+'.png',fullPage:true});};
 const rpc=async(person,org,action,p,data,key=randomUUID())=>person.client.rpc('fn_proposal_command',{p_org:org,p_action:action,p_proposal:p,p_data:data,p_request:key});
 const send=async()=>{await page.getByRole('button',{name:'Registrar versão como enviada',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Registrar envio da versão',exact:true});await dialog.getByLabel('Destinatário informado',{exact:true}).fill('Destinatário fictício');const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/send')&&r.request().method()==='POST',{timeout:120000}),dialog.getByRole('button',{name:'Confirmar registro',exact:true}).click()]);insist(response.ok(),'F registro envio API HTTP '+response.status());const result=(await response.json()).data;paths.push(result.pdf_path);await expect(dialog).toHaveCount(0);result.retry_key=response.request().headers()["idempotency-key"];return result;};
 try{
 insist(!(take(await a.client.rpc('fn_capability_enabled',{p_org:orgA,p_capability:'proposals'}),'F flag default')),'F default desligado');
 insist((await rpc(a,orgA,'create',null,draft)).error?.code==='42501','F criação desligada');
 const foreign=take(await b.client.from('crm_proposal_templates').select('id').eq('organization_id',orgB),'F catálogo B');insist(foreign.length===0,'F B sem catálogo');
 await page.setViewportSize({width:1440,height:900});await page.goto(app+'/app/settings/capabilities',{timeout:120000});
 let toggle=page.getByRole('switch',{name:'Propostas',exact:true});await toggle.focus();await Promise.all([page.waitForResponse(r=>r.url().endsWith('/settings/capabilities')&&r.request().method()==='PATCH',{timeout:120000}),toggle.press('Space')]);
 await expect(toggle).toBeChecked();
 // Aquece endpoints dev e comprova que o app atende com sessão real antes da tela.
 for(const route of ['/api/v1/proposals','/api/v1/proposal-templates','/api/v1/proposals/options'])insist((await context.request.get(app+route,{timeout:120000})).ok(),'F leitura app '+route);
 const company=take(await a.client.rpc('fn_crm_company_manage',{p_org:orgA,p_action:'create',p_data:{name:'Empresa fictícia F'}}),'F empresa');
 const contact=take(await a.client.from('contacts').insert({organization_id:orgA,name:'Contato fictício F',email:'ficticio@example.invalid',phone_number:'+5511999990000',company_id:company.company_id}).select('id').single(),'F contato');
 const pipe=take(await a.client.from('crm_pipelines').select('id').eq('organization_id',orgA).limit(1).single(),'F contexto funil');
 const stage=take(await a.client.from('crm_stages').select('id').eq('organization_id',orgA).eq('pipeline_id',pipe.id).eq('is_won',false).eq('is_lost',false).limit(1).single(),'F contexto etapa');
 const lead=take(await a.client.from('crm_leads').insert({organization_id:orgA,pipeline_id:pipe.id,stage_id:stage.id,title:'Oportunidade fictícia F',contact_id:contact.id,owner_user_id:a.id}).select('id').single(),'F oportunidade');
 const product=take(await admin.from('catalog_products').insert({organization_id:orgA,codigo:'F-PROBE',nome:'Serviço fictício',preco_cents:10000,moeda:'BRL'}).select('id').single(),'F catálogo');
 await page.goto(app+'/app/proposals',{timeout:120000});await page.getByText('Nenhuma proposta encontrada.',{exact:true}).waitFor();await shot('list-empty-1440');
 await page.getByRole('button',{name:'Nova proposta',exact:true}).click();
 const form=page.getByRole('form',{name:'Rascunho da proposta',exact:true});
 await form.getByLabel('Título da proposta',{exact:true}).fill(draft.title);
 await form.getByRole('combobox',{name:/^Oportunidade vinculada/}).selectOption(lead.id);await form.getByRole('combobox',{name:/^Adicionar do catálogo/}).selectOption(product.id);
 await form.getByLabel(/^Descrição/).fill('Serviço fictício');await form.getByLabel(/^Quantidade/).fill('2');await form.getByLabel(/^Valor unitário em centavos/).fill('10000');await form.getByLabel('Textos e observações',{exact:true}).fill(draft.notes);
 const [templateResponse]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/proposal-templates')&&r.request().method()==='POST',{timeout:120000}),form.getByRole('button',{name:'Salvar como modelo simples',exact:true}).click()]);insist(templateResponse.ok(),'F modelo simples');const template=(await templateResponse.json()).data;
 await form.getByRole('combobox',{name:/^Aplicar modelo/}).selectOption(template.id);await shot('draft-1440');await page.setViewportSize({width:390,height:844});await shot('draft-390');
 const [created]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/proposals')&&r.request().method()==='POST',{timeout:120000}),form.getByRole('button',{name:'Salvar rascunho',exact:true}).click()]);insist(created.ok(),'F criação UI');proposal=(await created.json()).data.id;
 const activity=take(await a.client.from('crm_lead_activities').select('actor_kind,reason,contact_id').eq('organization_id',orgA).eq('source_id',proposal),'F timeline');insist(activity.some(x=>x.actor_kind==='user'&&x.reason==='Proposta criada'&&x.contact_id===contact.id),'F timeline canônica');
 const foreignProduct=take(await admin.from('catalog_products').insert({organization_id:orgB,codigo:'F-FOREIGN',nome:'Produto B',preco_cents:1,moeda:'BRL'}).select('id').single(),'F produto B');
 insist((await admin.from('crm_proposal_items').insert({organization_id:orgA,proposal_id:proposal,product_id:foreignProduct.id,description:'Bloqueado',quantity:1,unit_price_cents:1,position:99})).error?.code==='23503','F referência produto B negada mesmo service');
 const foreignTemplate=take(await admin.from('crm_proposal_templates').insert({organization_id:orgB,name:'Modelo B',currency:'BRL',content:{items:draft.items}}).select('id').single(),'F modelo B');
 insist((await rpc(a,orgA,'create',null,{...draft,template_id:foreignTemplate.id})).error?.code==='23503','F modelo B negado');
 await page.setViewportSize({width:1440,height:900});await page.getByRole('region',{name:'Ficha da proposta',exact:true}).waitFor();
 await page.getByRole('button',{name:'Preparar PDF da versão',exact:true}).click();
 const preparing=page.getByRole('dialog',{name:'Registrar envio da versão',exact:true});await preparing.getByLabel('Destinatário informado',{exact:true}).fill('Destinatário fictício');
 const [generated]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/generate')&&r.request().method()==='POST',{timeout:120000}),preparing.getByRole('button',{name:'Gerar PDF',exact:true}).click()]);
 const generatedBody=await generated.json().catch(()=>null);if(!generated.ok()){const rawCode=String(generatedBody?.error?.code??'http_'+generated.status());const safeCode=/^[a-zA-Z0-9_]+$/.test(rawCode)?rawCode:'unknown';throw Object.assign(new Error('F PDF preparado HTTP '+generated.status()),{verificationFailure:{check:'F PDF preparado HTTP '+generated.status(),code:safeCode,reason:'api_rejected'}});}const prepared=generatedBody.data;paths.push(prepared.pdf_path);insist(prepared.state==='prepared'&&!!prepared.pdf_sha256,'F PDF preparado não marca envio');await expect(preparing).toHaveCount(0);await shot('prepared-pdf-1440');
 const v1=await send();insist(v1.id===prepared.id,'F mesma versão preparada registrada');insist(v1.total_cents===20000&&v1.state==='sent','F v1 total e envio');
 const snapshot=JSON.stringify(v1.snapshot);const bytes1=take(await a.client.storage.from('proposal-documents').download(v1.pdf_path),'F PDF A real');const hash1=createHash('sha256').update(Buffer.from(await bytes1.arrayBuffer())).digest('hex');insist(hash1===v1.pdf_sha256,'F hash PDF corresponde');
 insist((await b.client.storage.from('proposal-documents').download(v1.pdf_path)).error,'F PDF B negado');insist((await anon.storage.from('proposal-documents').download(v1.pdf_path)).error,'F PDF anon negado');
 const signed=take(await a.client.storage.from('proposal-documents').createSignedUrl(v1.pdf_path,60),'F signed URL A');insist((await fetch(signed.signedUrl)).ok,'F signed URL real');
 const other=take(await b.client.from('crm_proposals').select('id').eq('organization_id',orgA),'F B consulta A');insist(other.length===0,'F RLS A/B');
 insist((await rpc(viewer,orgA,'create',null,draft)).error?.code==='42501','F viewer negado');insist((await rpc(agent,orgA,'update',proposal,{...draft,expected_revision:1})).error,'F agent não altera proposta alheia');
 insist((await anon.rpc('fn_proposal_command',{p_org:orgA,p_action:'create',p_data:draft,p_request:randomUUID()})).error?.code==='42501','F anon RPC');
 insist((await admin.from('crm_proposal_versions').update({snapshot:{title:'Alterado'}}).eq('organization_id',orgA).eq('id',v1.id)).error?.code==='42501','F versão enviada imutável');
 const retry=await context.request.post(app+'/api/v1/proposals/'+proposal+'/send',{data:{recipient:'Destinatário fictício',channel:'other'},headers:{'Idempotency-Key':v1.retry_key},timeout:120000});insist(retry.ok()&&(await retry.json()).data.id===v1.id,'F retry mesmo envio sem duplicar');
 insist((await a.client.storage.from('proposal-documents').upload(v1.pdf_path,Buffer.from('alteração'),{upsert:true,contentType:'application/pdf'})).error,'F sobrescrita PDF negada');
 insist((await b.client.storage.from('proposal-documents').createSignedUrl(v1.pdf_path,60)).error,'F signed URL B negada');
 insist((await admin.rpc('fn_proposal_command',{p_org:orgA,p_action:'create',p_data:draft,p_request:randomUUID()})).error?.code==='42501','F service sem atalho');
 insist((await a.client.from('idempotency_keys').update({response_body:{forged:true}}).eq('organization_id',orgA).eq('endpoint','proposal:create')).error?.code==='42501','F receipt não pode ser falsificado');
 const own=take(await rpc(agent,orgA,'create',null,draft),'F agent cria próprio');insist(take(await agent.client.from('crm_proposals').select('id').eq('organization_id',orgA),'F agent lê próprio').every(x=>x.id===own.id),'F own scope');
 take(await a.client.rpc('fn_crm_company_manage',{p_org:orgA,p_action:'edit',p_company:company.company_id,p_data:{name:'Empresa fictícia alterada'}}),'F contexto empresa alterado');
 take(await admin.from('contacts').update({name:'Contato alterado',email:'alterado@example.invalid'}).eq('organization_id',orgA).eq('id',contact.id),'F contato alterado');
 take(await admin.from('catalog_products').update({preco_cents:90000}).eq('organization_id',orgA).eq('id',product.id),'F preço catálogo alterado');
 take(await admin.from('crm_proposal_templates').update({content:{notes:'Novo modelo',items:[{description:'Alterado',quantity:'1',unit_price_cents:'99999'}]}}).eq('organization_id',orgA).eq('id',template.id),'F modelo alterado');
 await shot('sent-v1-1440');await page.setViewportSize({width:390,height:844});await shot('sent-v1-390');
 await page.getByRole('button',{name:'Editar rascunho',exact:true}).click();await form.getByLabel('Título da proposta',{exact:true}).fill('Proposta fictícia F v2');await form.getByLabel(/^Valor unitário em centavos/).fill('11111');
 await Promise.all([page.waitForResponse(r=>r.url().endsWith('/proposals/'+proposal)&&r.request().method()==='PATCH',{timeout:120000}),form.getByRole('button',{name:'Salvar rascunho',exact:true}).click()]);await expect(form).toHaveCount(0);
 const v2=await send();insist(v2.version_number===2&&v2.total_cents===22222,'F versão dois');
 const old=take(await a.client.from('crm_proposal_versions').select('snapshot,pdf_path').eq('organization_id',orgA).eq('id',v1.id).single(),'F v1 preservada');insist(JSON.stringify(old.snapshot)===snapshot,'F snapshot v1 intacto');const oldBytes=take(await a.client.storage.from('proposal-documents').download(v1.pdf_path),'F bytes históricos');insist(createHash('sha256').update(Buffer.from(await oldBytes.arrayBuffer())).digest('hex')===hash1,'F PDF v1 intacto');
 await page.getByRole('button',{name:'Abrir PDF · v2',exact:true}).waitFor();
 const [openedPdf]=await Promise.all([page.waitForResponse(r=>r.url().includes('/storage/v1/object/sign/proposal-documents/')&&(r.status()<300||r.status()>=400),{timeout:120000}),page.getByRole('button',{name:'Abrir PDF · v2',exact:true}).click()]);insist(openedPdf.ok(),'F botão PDF documento HTTP '+openedPdf.status());
 const fetchedPdf=await context.request.get(openedPdf.url());insist(fetchedPdf.ok()&&createHash('sha256').update(await fetchedPdf.body()).digest('hex')===v2.pdf_sha256,'F bytes do PDF aberto correspondem à versão dois');
 // O visualizador nativo não emite download e pode manter a navegação pendente.
 // Uma nova página usa a mesma sessão real sem disputar a navegação do PDF.
 const pdfPage=page;page=await context.newPage();desktop.page=page;await page.setViewportSize({width:390,height:844});toggle=page.getByRole('switch',{name:'Propostas',exact:true});await pdfPage.close();
 insist(true,'F retorno app após PDF');
 await page.goto(app+'/app/proposals',{timeout:120000});await page.getByRole('button',{name:'Proposta fictícia F v2',exact:true}).click();await page.getByRole('button',{name:'Abrir PDF · v2',exact:true}).waitFor();
 await shot('history-390');await page.setViewportSize({width:1440,height:900});await shot('history-1440');
 await page.goto(app+'/app/settings/capabilities',{timeout:120000});await toggle.click();await expect(toggle).not.toBeChecked();
 insist((await context.request.post(app+'/api/v1/proposals/'+proposal+'/send',{data:{recipient:'Bloqueado',channel:'other'},headers:{'Idempotency-Key':randomUUID()}})).status()===403,'F geração desligada');
 insist((await context.request.get(app+'/api/v1/proposals/'+proposal)).ok(),'F histórico após desligar');insist((await context.request.get(app+'/api/v1/proposals/'+proposal+'/versions/'+v1.id+'/pdf')).ok(),'F PDF histórico autorizado');
 await page.goto(app+'/app/proposals',{timeout:120000});await page.getByText('Histórico preservado. Novas ações estão bloqueadas.',{exact:true}).waitFor();insist(await page.getByRole('button',{name:'Nova proposta',exact:true}).count()===0,'F criação ausente');await shot('disabled-1440');await page.setViewportSize({width:390,height:844});await shot('disabled-390');
 await mobile.page.goto(app+'/app/proposals',{timeout:120000});await mobile.page.getByText('Sem permissão para propostas.',{exact:true}).waitFor();insist((await mobile.context.request.get(app+'/api/v1/proposals')).status()===403,'F viewer API');
 done('Bloco F: capability default/desligamento, templates/itens, UI desktop/mobile/teclado, versões v1/v2 e PDF privado imutável, JWT/RLS A/B/viewer/agent/anon, histórico preservado');
 }catch(error){error.verificationFailure??=getDiagnostic();await page.screenshot({path:dir+'/proposals-failure.png',fullPage:true}).catch(()=>{});throw error;}
 finally{
 // Somente caminhos desta execução; nenhum segredo ou URL signed é persistido.
 const listed=take(await admin.from('crm_proposal_versions').select('pdf_path').eq('organization_id',orgA),'F inventário cleanup PDF');
 const own=[...new Set([...paths,...listed.map(x=>x.pdf_path)])];
 if(own.length)take(await admin.storage.from('proposal-documents').remove(own),'F limpeza PDF');
 }
}
