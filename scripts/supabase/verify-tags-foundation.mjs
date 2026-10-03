import { expect } from "@playwright/test";

/** Fixtures pertencem às organizações descartáveis D2; nenhuma chave/sessão é gravada. */
export async function verifyTagsFoundation({ admin, a, b, viewer, agent, anon, orgA, orgB, contact, desktop, mobile, app, dir, requireResult: take, insist, done }) {
  const { page, context } = desktop;
  const sourceName = "Cliente VIP fictício";
  const renamed = "Relacionamento VIP fictício";
  const destinationName = "VIP consolidado fictício";
  const get = async path => {
    const response = await context.request.get(app + path);
    insist(response.ok(), `C GET ${path.split("?")[0]}`);
    return (await response.json()).data;
  };
  const shot = async name => {
    insist(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `C overflow ${name}`);
    await page.screenshot({ path: `${dir}/tags-${name}.png`, fullPage: true });
  };
  const catalog = () => get("/api/v1/tags");
  const manage = async (person, org, action, args = {}) => take(await person.client.rpc("fn_crm_tag_manage", { p_org: org, p_action: action, ...args }), `C RPC ${action}`);
  const assign = async (person, org, kind, record, tag, assigned = true) => take(await person.client.rpc("fn_crm_tag_assign", { p_org: org, p_kind: kind, p_record: record, p_tag: tag, p_assign: assigned }), `C vínculo ${kind}`);
  const readBindings = () => takeAsync(a.client.from("crm_tag_assignments").select("tag_id,entity_kind,entity_id").eq("organization_id", orgA));
  async function takeAsync(query) { return take(await query, "C leitura de vínculos"); }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${app}/app/settings/tenant/tags`, { timeout: 120000 });
  await page.getByRole("heading", { name: "Catálogo de tags", exact: true }).waitFor();
  await page.getByText("O catálogo ainda não tem tags.", { exact: true }).waitFor();
  await shot("catalog-empty-1440");
  async function createInUI(name) {
    insist(true, "C UI criar tag");
    await page.getByLabel("Nome da tag", { exact: true }).fill(name);
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith("/api/v1/tags") && r.request().method() === "POST"),
      page.getByRole("button", { name: "Criar tag", exact: true }).click(),
    ]);
    insist(response.ok(), "C criação pela tela");
    await page.getByRole("listitem").filter({ hasText: name }).waitFor();
  }
  await createInUI(sourceName);
  await createInUI(destinationName);
  let all = await catalog();
  const source = all.tags.find(v => v.name === sourceName).id;
  const destination = all.tags.find(v => v.name === destinationName).id;
  const duplicate = await a.client.rpc("fn_crm_tag_manage", { p_org: orgA, p_action: "create", p_name: "  CLIENTE   VIP FICTÍCIO " });
  insist(duplicate.error?.code === "23505", "C duplicidade trivial rejeitada");
  const sameB = await manage(b, orgB, "create", { p_name: sourceName });
  insist(sameB.tag_id !== source, "C mesma grafia possui identidade diferente em B");
  for (const person of [a, b, viewer, agent]) {
    const other = person === b ? orgA : orgB;
    for (const table of ["crm_tags", "crm_tag_aliases", "crm_tag_assignments"]) {
      insist(take(await person.client.from(table).select("organization_id").eq("organization_id", other), "C RLS JWT").length === 0, "C tenant invisível");
    }
  }
  for (const table of ["crm_tags", "crm_tag_aliases", "crm_tag_assignments"]) {
    const result = await anon.from(table).select("organization_id").eq("organization_id", orgA);
    insist(result.error?.code === "42501" || (Array.isArray(result.data) && result.data.length === 0), "C anon negado");
  }
  for (const person of [viewer, agent]) {
    insist((await person.client.rpc("fn_crm_tag_manage", { p_org: orgA, p_action: "rename", p_tag: source, p_name: "Não permitido" })).error?.code === "42501", "C catálogo admin apenas");
  }
  insist((await admin.rpc("fn_crm_tag_manage", { p_org: orgA, p_action: "create", p_name: "Não permitido" })).error?.code === "42501", "C service role sem gestão administrativa");
  insist((await a.client.from("crm_tags").insert({ organization_id: orgA, name: "Bypass negado" })).error?.code === "42501", "C sem escrita direta no catálogo");

  const pipeline = take(await a.client.from("crm_pipelines").select("id").eq("organization_id", orgA).eq("is_default", true).single(), "C funil").id;
  const stages = take(await a.client.from("crm_stages").select("id,is_won,is_lost").eq("organization_id", orgA).eq("pipeline_id", pipeline), "C etapas");
  const stage = stages.find(v => !v.is_won && !v.is_lost).id;
  const lead = take(await a.client.from("crm_leads").insert({ organization_id: orgA, pipeline_id: pipeline, stage_id: stage, title: "Oportunidade fictícia Tags C", contact_id: contact, status: "open" }).select("id").single(), "C oportunidade").id;
  const channel = take(await admin.from("channel_sessions").insert({ organization_id: orgA, waha_session_name: `tags-${orgA}`, webhook_secret_encrypted: "\\x00", display_name: "Canal fictício Tags C" }).select("id").single(), "C canal fictício").id;
  const conversation = take(await a.client.from("conversations").insert({ organization_id: orgA, contact_id: contact, channel_session_id: channel, status: "open", assigned_to_user_id: a.id }).select("id").single(), "C conversa").id;
  const contactB = take(await b.client.from("contacts").insert({ organization_id: orgB, name: "Contato fictício Tags B" }).select("id").single(), "C contato B").id;
  insist((await b.client.rpc("fn_crm_tag_assign", { p_org: orgB, p_kind: "contact", p_record: contactB, p_tag: source, p_assign: true })).error?.code === "23503", "C B não usa tag A");
  insist((await admin.from("crm_tag_assignments").insert({ organization_id: orgA, tag_id: source, entity_kind: "contact", entity_id: contactB })).error?.code === "23503", "C cross-tenant estrutural service role");
  insist((await viewer.client.rpc("fn_crm_tag_assign", { p_org: orgA, p_kind: "contact", p_record: contact, p_tag: source, p_assign: true })).error?.code === "42501", "C viewer sem atribuição");
  await assign(agent, orgA, "contact", contact, source);
  await assign(agent, orgA, "contact", contact, source, false);
  insist((await readBindings()).length === 0, "C agent remove só vínculo");
  done("Bloco C: JWT reais A/B, viewer/agent/admin/anon; catálogo isolado e cross-tenant estrutural negado");

  async function bindInUI(kind, url) {
    insist(true, "C UI atribuir "+kind);
    await page.goto(app + url, { timeout: 120000 });
    const picker = page.getByTestId(`tags-${kind}`).filter({ visible: true });
    await picker.getByLabel("Selecionar tag", { exact: true }).selectOption(source);
    await picker.getByRole("button", { name: "Adicionar tag", exact: true }).focus();
    insist(await picker.getByRole("button", { name: "Adicionar tag", exact: true }).evaluate(el => document.activeElement === el), "C foco da atribuição");
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().endsWith("/api/v1/tags") && r.request().method() === "POST"),
      picker.getByRole("button", { name: "Adicionar tag", exact: true }).press("Enter"),
    ]);
    insist(response.ok(), "C atribuição pela tela");
    await picker.getByRole("button", { name: `Remover tag ${sourceName}`, exact: true }).waitFor();
    await shot(`${kind}-assigned-1440`);
  }
  await bindInUI("contact", `/app/contacts/${contact}`);
  await bindInUI("lead", `/app/pipelines/${pipeline}?lead=${lead}`);
  await bindInUI("conversation", `/app/inbox?id=${conversation}&filter=all`);
  insist((await readBindings()).filter(v => v.tag_id === source).length === 3, "C três contextos vinculados");
  const replay = await assign(a, orgA, "contact", contact, source);
  insist(replay.changed === false, "C replay idempotente");
  const sourceDelete = await a.client.rpc("fn_crm_tag_manage", { p_org: orgA, p_action: "delete", p_tag: source });
  insist(sourceDelete.error?.code === "23503", "C delete usado negado");

  insist(true, "C UI filtros");
  // Filtros pela tela e recorte no contrato canônico, sem mecanismo novo de busca.
  await page.goto(`${app}/app/contacts`, { timeout: 120000 });
  await page.getByRole("button", { name: "Tag: todas", exact: true }).click();
  await page.getByRole("menuitem", { name: sourceName, exact: true }).click();
  await page.getByRole("link", { name: "Contato fictício D2", exact: true }).waitFor();
  insist((await get(`/api/v1/contacts?tag=${encodeURIComponent(sourceName)}`)).some(v => v.id === contact), "C filtro contato");
  await shot("contact-filter-1440");
  await page.goto(`${app}/app/pipelines/${pipeline}`, { timeout: 120000 });
  await page.getByRole("button", { name: "Tag: todas", exact: true }).click();
  await page.getByRole("menuitem", { name: sourceName, exact: true }).click();
  await page.getByText("Oportunidade fictícia Tags C", { exact: true }).waitFor();
  await shot("lead-filter-1440");
  await page.goto(`${app}/app/inbox?filter=all`, { timeout: 120000 });
  await page.getByRole("combobox", { name: "Filtrar por tag", exact: true }).click();
  await page.getByRole("option", { name: sourceName, exact: true }).click();
  await page.getByText("Contato fictício D2", { exact: true }).first().waitFor();
  insist((await get(`/api/v1/conversations?tag=${encodeURIComponent(sourceName)}`)).some(v => v.id === conversation), "C filtro conversa");
  await shot("conversation-filter-1440");

  await page.goto(`${app}/app/settings/tenant/tags`, { timeout: 120000 });
  insist(true, "C UI rename");
  let row = page.getByRole("listitem").filter({ has: page.getByText(sourceName, { exact: true }) });
  await row.getByRole("button", { name: "Renomear", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da tag", { exact: true }).fill(renamed);
  await expect(dialog.getByRole("button", { name: "Confirmar", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  all = await catalog();
  insist(all.tags.find(v => v.name === renamed).id === source, "C rename identidade estável");
  insist((await readBindings()).filter(v => v.tag_id === source).length === 3, "C rename preserva vínculos");
  const legacy = take(await a.client.from("contacts").select("tags").eq("organization_id", orgA).eq("id", contact).single(), "C projeção legada");
  insist(legacy.tags.includes(sourceName) && legacy.tags.includes(renamed), "C consumidor textual preservado");
  await assign(a, orgA, "contact", contact, destination);
  await assign(a, orgA, "lead", lead, destination);
  row = page.getByRole("listitem").filter({ has: page.getByText(renamed, { exact: true }) });
  await row.getByRole("button", { name: "Cor", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cor opcional", { exact: true }).fill("#ffcc00");
  await expect(dialog.getByRole("button", { name: "Confirmar", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  insist(true, "C UI merge");
  await row.getByRole("button", { name: "Mesclar", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Tag de destino", { exact: true }).selectOption(destination);
  await expect(dialog.getByRole("button", { name: "Confirmar", exact: true })).toBeEnabled();
  await shot("merge-confirmation-1440");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("merge-confirmation-390");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const merged = await readBindings();
  insist(merged.length === 3 && merged.every(v => v.tag_id === destination), "C merge deduplicado nos três contextos");
  insist(!(await catalog()).tags.some(v => v.id === source), "C origem desativada");
  await shot("catalog-merged-390");
  await page.goto(`${app}/app/contacts/${contact}`, { timeout: 120000 });
  insist(true, "C UI remoção contextual");
  const picker = page.getByTestId("tags-contact");
  const remove = picker.getByRole("button", { name: `Remover tag ${destinationName}`, exact: true });
  await remove.focus();
  await remove.press("Enter");
  await expect(remove).toHaveCount(0);
  const remaining = await readBindings();
  insist(remaining.length === 2 && remaining.every(v => v.entity_kind !== "contact"), "C remoção contextual preserva outros vínculos");
  insist((await catalog()).tags.some(v => v.id === destination), "C catálogo preservado");
  await shot("contact-removal-390");

  // Muitos chips e nome máximo, com texto independente da cor.
  for (let i = 0; i < 6; i++) {
    const tag = await manage(a, orgA, "create", { p_name: `Segmento fictício com nome longo ${i}` });
    await assign(a, orgA, "contact", contact, tag.tag_id);
  }
  await page.reload();
  await picker.getByText("Segmento fictício com nome longo 5", { exact: true }).waitFor();
  await shot("contact-many-chips-390");
  await page.setViewportSize({ width: 1440, height: 900 });
  await shot("contact-many-chips-1440");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${app}/app/pipelines/${pipeline}?lead=${lead}`, { timeout: 120000 });
  await page.getByTestId("tags-lead").getByText(destinationName, { exact: true }).waitFor();
  await shot("lead-merged-390");
  await page.goto(`${app}/app/inbox?id=${conversation}&filter=all`, { timeout: 120000 });
  await page.getByRole("button", { name: "Ficha", exact: true }).click();
  await page.getByTestId("tags-conversation").filter({ visible: true }).getByText(destinationName, { exact: true }).waitFor();
  await shot("conversation-merged-390");
  await mobile.page.goto(`${app}/app/contacts/${contact}`, { timeout: 120000 });
  await mobile.page.getByTestId("tags-contact").getByText("Segmento fictício com nome longo 5", { exact: true }).waitFor();
  insist(await mobile.page.getByTestId("tags-contact").getByRole("button", { name: /Remover tag/ }).count() === 0, "C viewer chips somente leitura");
  insist((await mobile.context.request.post(`${app}/api/v1/tags`, { data: { action: "assign", tag_id: destination, entity_kind: "contact", entity_id: contact, assigned: true } })).status() === 403, "C API viewer negada");
  await mobile.page.screenshot({ path: `${dir}/tags-viewer-390.png`, fullPage: true });

  const unused = await manage(a, orgA, "create", { p_name: "Referência fictícia C" });
  const originalSettings = take(await a.client.from("organizations").select("settings").eq("id", orgA).single(), "C configuração própria").settings;
  take(await admin.from("organizations").update({ settings: { ...originalSettings, tags_test_reference: "referência fictícia c" } }).eq("id", orgA).select("id").single(), "C referência fictícia");
  insist((await a.client.rpc("fn_crm_tag_manage", { p_org: orgA, p_action: "delete", p_tag: unused.tag_id })).error?.code === "23503", "C delete com referência negado");
  take(await admin.from("organizations").update({ settings: originalSettings }).eq("id", orgA).select("id").single(), "C retirar referência própria");
  await page.goto(`${app}/app/settings/tenant/tags`, { timeout: 120000 });
  row = page.getByRole("listitem").filter({ has: page.getByText("Referência fictícia C", { exact: true }) });
  await row.getByRole("button", { name: "Excluir", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Confirmar", exact: true })).toBeEnabled();
  await shot("safe-delete-confirmation-390");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  insist(!(await catalog()).tags.some(v => v.id === unused.tag_id), "C delete seguro pela tela");
  const audit = take(await a.client.from("api_audit_log").select("action").eq("organization_id", orgA).in("action", ["tag.create", "tag.rename", "tag.color", "tag.merge", "tag.delete"]), "C audit administrativo");
  insist(["tag.create", "tag.rename", "tag.color", "tag.merge", "tag.delete"].every(action => audit.some(v => v.action === action)), "C auditoria completa");
  done("Bloco C: catálogo → contato/oportunidade/conversa → filtros → rename → merge → remoção contextual; desktop/mobile, teclado, cores, delete seguro e histórico");
  return { tag_id: destination, contact_id: contact };
}
