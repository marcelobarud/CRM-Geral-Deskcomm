import { randomUUID } from "node:crypto";

const campaignData = (name, tagId) => ({
  name,
  tag_id: tagId,
  content: "Conteúdo fictício do harness; não enviar.",
  channel: "whatsapp",
});

function wallClockAfter(timezone, minutes) {
  const target = new Date(Date.now() + minutes * 60_000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(target);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

async function setSessionCookie(context, session, app) {
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
  await context.clearCookies();
  const encoded = encodeURIComponent(value);
  const chunkSize = 3180;
  const chunks = [];
  for (let offset = 0; offset < encoded.length; offset += chunkSize) {
    chunks.push(encoded.slice(offset, offset + chunkSize));
  }
  const cookies = chunks.length === 1
    ? [{ name: "sb-deskcomm-auth", value: decodeURIComponent(chunks[0]) }]
    : chunks.map((chunk, index) => ({ name: `sb-deskcomm-auth.${index}`, value: decodeURIComponent(chunk) }));
  await context.addCookies(cookies.map((cookie) => ({
    ...cookie,
    url: app,
    httpOnly: true,
    secure: false,
    sameSite: "Strict",
  })));
}

export async function verifyScheduledCampaigns({
  admin, a, b, viewer, agent, anon, orgA, orgB, desktop, mobile,
  app, dir, run, password, mfaSecret, totp, requireResult: take, insist, done, reportDiagnostic,
}) {
  const { page, context } = desktop;
  const proof = { campaigns: [], recipients: 0 };
  const name = `Campanha fictícia H ${run.slice(0, 8)}`;
  const phoneSeed = BigInt(`0x${run.replaceAll("-", "").slice(0, 12)}`).toString().padStart(5, "0").slice(-5);
  const request = () => randomUUID();
  const createTag = async (person, org, label) => {
    const result = take(await person.client.rpc("fn_crm_tag_manage", {
      p_org: org,
      p_action: "create",
      p_name: label,
    }), `H tag ${label}`);
    return result.tag_id;
  };
  const campaignCommand = (person, org, action, data) => person.client.rpc("fn_campaign_command", {
    p_org: org,
    p_action: action,
    p_data: data,
    p_request: request(),
  });

  insist(take(await a.client.rpc("fn_capability_enabled", {
    p_org: orgA,
    p_capability: "scheduled_campaigns",
  }), "H capability ativa") === true, "H capability AAL2 habilitada");

  const tagA = await createTag(a, orgA, `Tag de campanha A ${run.slice(0, 8)}`);
  const ownTags = take(await a.client.from("crm_tags").select("id")
    .eq("organization_id", orgA).eq("is_archived", false).is("merged_into", null), "H catálogo A");
  insist(ownTags.some((tag) => tag.id === tagA), "H tag A visível ao tenant");
  const factorB = take(await b.client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `campaign-${run.slice(0, 8)}`,
  }), "H MFA B enroll");
  take(await b.client.auth.mfa.challengeAndVerify({
    factorId: factorB.id,
    code: totp(factorB.totp.secret),
  }), "H MFA B AAL2");
  take(await b.client.rpc("fn_set_capability", {
    p_org: orgB,
    p_capability: "scheduled_campaigns",
    p_enabled: true,
  }), "H capability B");
  const tagB = await createTag(b, orgB, `Tag de campanha B ${run.slice(0, 8)}`);

  const campaignAContacts = Array.from({ length: 26 }, (_, index) => {
    const serial = String(index + 1).padStart(2, "0");
    const contact = {
      organization_id: orgA,
      name: `Contato fictício campanha H ${serial}`,
      display_name: `Contato fictício campanha H ${serial}`,
      phone_number: `+1555000${phoneSeed}${serial}`,
      consent: { marketing: { granted_at: new Date().toISOString(), source: "campaign-test", version: run } },
      is_blocked: index === 2,
    };
    if (index === 1) contact.consent = { marketing: { granted_at: null, declined_at: new Date().toISOString(), source: "campaign-test", version: run } };
    if (index === 3) contact.consent = {};
    return contact;
  });
  const contactsA = take(await a.client.from("contacts").insert(campaignAContacts).select("id,name"), "H contatos A");
  insist(contactsA.length === 26, "H lote fictício A criado");
  const assignments = await Promise.all(contactsA.map((contact) => a.client.rpc("fn_crm_tag_assign", {
    p_org: orgA,
    p_kind: "contact",
    p_record: contact.id,
    p_tag: tagA,
    p_assign: true,
  })));
  assignments.forEach((result, index) => take(result, `H vínculo A ${index + 1}`));

  const contactB = take(await b.client.from("contacts").insert({
    organization_id: orgB,
    name: `Contato fictício campanha B ${run.slice(0, 8)}`,
    display_name: `Contato fictício campanha B ${run.slice(0, 8)}`,
    phone_number: `+1555999${phoneSeed}99`,
    consent: { marketing: { granted_at: new Date().toISOString(), source: "campaign-test", version: run } },
  }).select("id").single(), "H contato B").id;
  take(await b.client.rpc("fn_crm_tag_assign", {
    p_org: orgB,
    p_kind: "contact",
    p_record: contactB,
    p_tag: tagB,
    p_assign: true,
  }), "H vínculo B");

  const draftB = take(await campaignCommand(b, orgB, "create", campaignData(`Campanha fictícia B ${run.slice(0, 8)}`, tagB)), "H campanha B");
  proof.campaigns.push(draftB.id);
  const ownB = take(await b.client.from("crm_scheduled_campaigns").select("id")
    .eq("organization_id", orgB).eq("id", draftB.id), "H leitura B");
  insist(ownB.length === 1, "H B lê campanha própria");
  const crossA = take(await a.client.from("crm_scheduled_campaigns").select("id")
    .eq("organization_id", orgB).eq("id", draftB.id), "H consulta cruzada A/B");
  insist(crossA.length === 0, "H A não lê campanha B");
  for (const [person, organization, label] of [
    [viewer, orgA, "viewer"],
    [agent, orgA, "agent"],
  ]) {
    const rows = take(await person.client.from("crm_scheduled_campaigns").select("id")
      .eq("organization_id", organization), `H leitura ${label}`);
    insist(rows.length === 0, `H ${label} sem leitura operacional`);
  }
  const anonymous = await anon.from("crm_scheduled_campaigns").select("id").eq("organization_id", orgA);
  insist(anonymous.error?.code === "42501" || (Array.isArray(anonymous.data) && anonymous.data.length === 0), "H anon negado");
  insist((await a.client.from("crm_scheduled_campaigns").insert({
    organization_id: orgA,
    tag_id: tagA,
    name: "Escrita direta negada",
    content: "Fictício",
    timezone: "UTC",
  })).error, "H sem insert direto");
  insist((await admin.from("crm_scheduled_campaigns").select("id").eq("id", draftB.id)).error, "H service role sem leitura direta");
  insist((await campaignCommand(a, orgA, "create", campaignData("Tag estrangeira negada", tagB))).error?.code === "23503", "H referência de tag cross-tenant negada");

  const viewerApi = await mobile.context.request.get(`${app}/api/v1/campaigns`);
  insist(viewerApi.status() === 403, "H API viewer negada");
  await mobile.page.screenshot({ path: `${dir}/campaigns-viewer-390.png`, fullPage: true });
  await page.context().clearCookies();
  const optionsResponses = [];
  page.on("response", (response) => {
    try {
      const url = new URL(response.url());
      if (url.pathname.replace(/\/$/, "") === "/api/v1/campaigns/options") {
        optionsResponses.push({ status: response.status(), ok: response.ok() });
      }
    } catch {
      // Ignore malformed URLs; no request or response content is retained.
    }
  });
  const optionsResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.replace(/\/$/, "") === "/api/v1/campaigns/options";
  }, { timeout: 120000 });
  await page.goto(`${app}/login?next=${encodeURIComponent("/app/campaigns")}`, { timeout: 120000 });
  await page.getByLabel("Email", { exact: true }).fill(a.email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL("**/login/mfa**", { timeout: 120000 });
  const digits = page.locator('input[aria-label^="Dígito "]');
  await digits.first().waitFor();
  await new Promise((resolve) => setTimeout(resolve, 31_000 - (Date.now() % 30_000)));
  for (const digit of totp(mfaSecret)) {
    const position = (await digits.evaluateAll((items) => items.findIndex((item) => item === document.activeElement)));
    const index = position < 0 ? 0 : position;
    await digits.nth(index).fill(digit);
  }
  await page.waitForURL("**/app/campaigns", { timeout: 120000 });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("heading", { name: "Campanhas agendadas", exact: true }).waitFor();
  await page.getByRole("button", { name: "Nova campanha", exact: true }).waitFor();
  await page.screenshot({ path: `${dir}/campaigns-ready-1440.png`, fullPage: true });

  const optionsResponse = await optionsResponsePromise;
  insist(optionsResponse.ok(), "H API opções");
  const options = (await optionsResponse.json()).data;
  insist(Array.isArray(options.tags) && options.tags.some((tag) => tag.id === tagA), "H API inclui tag A");
  const apiTagCount = options.tags.length;
  const expectedTag = options.tags.find((tag) => tag.id === tagA);
  const { timezone } = options;

  await page.getByRole("button", { name: "Nova campanha", exact: true }).click();
  const createForm = page.locator('form[aria-label="Criar campanha"]');
  insist(await createForm.isVisible(), "H formulário de criação visível");
  await page.screenshot({ path: `${dir}/campaigns-create-1440.png`, fullPage: true });
  await createForm.getByLabel("Nome da campanha", { exact: true }).fill(name);
  const tagSelect = createForm.locator("select");
  insist((await tagSelect.count()) === 1 && await tagSelect.isVisible(), "H seletor de público visível");
  const selectorState = await tagSelect.evaluate((select, tagId) => ({
    option_count: select.options.length,
    contains_expected_option: Array.from(select.options).some((option) => option.value === tagId),
  }), tagA);
  reportDiagnostic("campaign_options_ui", {
    api_status: optionsResponse.status(),
    api_tag_count: apiTagCount,
    api_contains_expected_tag: true,
    browser_options_responses: optionsResponses,
    selector_option_count: selectorState.option_count,
    selector_contains_expected_tag: selectorState.contains_expected_option,
  });
  insist(selectorState.contains_expected_option, "H tag A renderizada no seletor");
  await tagSelect.selectOption({ label: expectedTag.name });
  const selectedTag = await tagSelect.inputValue();
  reportDiagnostic("campaign_form_selection", {
    selected_value_present: selectedTag.length > 0,
    selected_expected_tag: selectedTag === tagA,
  });
  insist(selectedTag === tagA, "H tag A selecionada pela interface");
  const messageField = createForm.locator("textarea[required]");
  insist((await messageField.count()) === 1 && await messageField.isVisible(), "H campo de mensagem visível");
  await messageField.fill("Conteúdo fictício H: revisão humana; não enviar.");
  insist(true, "H campo de mensagem preenchido");
  const createResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.replace(/\/$/, "") === "/api/v1/campaigns" && response.request().method() === "POST";
  }, { timeout: 30000 });
  insist(true, "H criação do rascunho enviada");
  await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
  const createResponse = await createResponsePromise;
  reportDiagnostic("campaign_create_api", { status: createResponse.status(), ok: createResponse.ok() });
  insist(createResponse.ok(), "H API cria rascunho");
  await page.screenshot({ path: `${dir}/campaigns-created-1440.png`, fullPage: true });
  insist(true, "H aguardando detalhe do rascunho");
  await page.getByRole("heading", { name, exact: true, level: 3 }).waitFor({ timeout: 15000 });
  insist(true, "H detalhe do rascunho visível");
  const draftUiState = await page.evaluate((campaignName) => {
    const bodyText = document.body.innerText;
    return {
      contains_campaign_name: bodyText.includes(campaignName),
      contains_draft_label: Array.from(document.querySelectorAll("body *")).some((element) =>
        element.childElementCount === 0 && element.textContent?.trim() === "Rascunho",
      ),
      detail_loading: bodyText.includes("Carregando detalhes"),
      detail_error: bodyText.includes("Não foi possível carregar os detalhes"),
    };
  }, name);
  reportDiagnostic("campaign_draft_ui", draftUiState);
  await page.screenshot({ path: `${dir}/campaigns-draft-1440.png`, fullPage: true });
  insist(draftUiState.contains_draft_label, "H estado do rascunho visível");
  const draftRow = take(await a.client.from("crm_scheduled_campaigns").select("id")
    .eq("organization_id", orgA).eq("name", name).single(), "H draft id");
  proof.campaigns.push(draftRow.id);
  const ownCampaign = take(await a.client.from("crm_scheduled_campaigns").select("id")
    .eq("organization_id", orgA).eq("id", draftRow.id), "H A lê própria");
  insist(ownCampaign.length === 1, "H manager lê campanha própria");
  for (const person of [viewer, agent]) {
    const rows = take(await person.client.from("crm_scheduled_campaigns").select("id")
      .eq("organization_id", orgA).eq("id", draftRow.id), "H RLS role");
    insist(rows.length === 0, "H RLS impede leitura operacional de papel inferior");
  }

  await page.screenshot({ path: `${dir}/campaigns-draft-1440.png`, fullPage: true });
  await page.getByRole("button", { name: "Editar rascunho", exact: true }).click();
  const editedName = `${name} editada`;
  const editForm = page.locator('form[aria-label="Editar rascunho"]');
  insist(await editForm.isVisible(), "H formulário de edição visível");
  await editForm.getByLabel("Nome da campanha", { exact: true }).fill(editedName);
  const editMessage = editForm.locator("textarea[required]");
  insist((await editMessage.count()) === 1 && await editMessage.isVisible(), "H mensagem da edição visível");
  await editMessage.fill("Conteúdo editado fictício H; não enviar.");
  insist(true, "H formulário de edição preenchido");
  const editResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === `/api/v1/campaigns/${draftRow.id}` && response.request().method() === "PATCH";
  }, { timeout: 30000 });
  await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
  const editResponse = await editResponsePromise;
  reportDiagnostic("campaign_edit_api", { status: editResponse.status(), ok: editResponse.ok() });
  insist(editResponse.ok(), "H API edita rascunho");
  await page.getByRole("heading", { name: editedName, exact: true, level: 3 }).waitFor();
  const editedRow = take(await a.client.from("crm_scheduled_campaigns").select("id,name,content")
    .eq("organization_id", orgA).eq("id", draftRow.id).single(), "H edição");
  insist(editedRow.name === editedName && editedRow.content === "Conteúdo editado fictício H; não enviar.", "H edição de rascunho aplicada");
  await page.getByRole("button", { name: "Agendar rascunho", exact: true }).click();
  await page.getByLabel(/Data e hora no fuso/).fill(wallClockAfter(timezone, 20));
  await page.getByRole("button", { name: "Revisar campanha", exact: true }).click();
  await page.getByRole("heading", { name: "Revisão antes do agendamento", exact: true }).waitFor();
  await page.screenshot({ path: `${dir}/campaigns-review-1440.png`, fullPage: true });
  insist((await page.getByText("26 contatos estimados", { exact: false }).count()) > 0, "H audiência estimada");
  const confirm = page.getByRole("button", { name: "Confirmar e agendar", exact: true });
  await confirm.focus();
  insist(await confirm.evaluate((element) => document.activeElement === element), "H foco teclado revisão");
  await confirm.press("Enter");
  await page.getByRole("heading", { name: editedName, exact: true, level: 3 }).waitFor();
  await page.getByText("Agendada", { exact: true }).waitFor();
  await page.screenshot({ path: `${dir}/campaigns-scheduled-1440.png`, fullPage: true });

  const mainCampaign = take(await a.client.from("crm_scheduled_campaigns").select("id,scheduled_at,timezone")
    .eq("organization_id", orgA).eq("id", draftRow.id).single(), "H campanha agendada");
  insist(new Date(mainCampaign.scheduled_at).getTime() > Date.now(), "H horário UTC futuro");
  const frozen = take(await a.client.from("crm_scheduled_campaign_recipients").select("id,contact_id,status")
    .eq("organization_id", orgA).eq("campaign_id", draftRow.id), "H snapshot A");
  proof.recipients = frozen.length;
  insist(frozen.length === 26 && frozen.every((recipient) => recipient.status === "pending"), "H snapshot de 26 congelado");
  const directBRecipients = take(await a.client.from("crm_scheduled_campaign_recipients").select("id")
    .eq("organization_id", orgB), "H recipients cross-tenant");
  insist(directBRecipients.length === 0, "H recipients B invisíveis a A");
  const detailFirst = await context.request.get(`${app}/api/v1/campaigns/${draftRow.id}?page=0`);
  insist(detailFirst.ok(), "H detalhe API A");
  const pageOne = (await detailFirst.json()).data;
  insist(pageOne.recipients.length === 25 && pageOne.recipients_meta.has_more, "H recipients paginados");
  const recipientNext = page.getByRole("button", { name: "Próxima", exact: true }).last();
  await recipientNext.focus();
  await recipientNext.press("Enter");
  insist(await page.getByRole("list", { name: "Destinatários paginados" }).getByRole("listitem").count() === 1, "H página final de recipients");

  const session = take(await a.client.auth.getSession(), "H sessão AAL2").session;
  await setSessionCookie(mobile.context, session, app);
  await setSessionCookie(mobile.context, session, app);
  await mobile.page.goto(`${app}/app/campaigns`, { timeout: 120000 });
  await mobile.page.getByRole("heading", { name: "Campanhas agendadas", exact: true }).waitFor();
  await mobile.page.getByRole("button", { name: new RegExp(editedName) }).click();
  await mobile.page.getByRole("heading", { name: editedName, exact: true, level: 3 }).waitFor();
  insist(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "H sem overflow mobile");
  await mobile.page.screenshot({ path: `${dir}/campaigns-detail-390.png`, fullPage: true });

  async function takeLease(campaignId, batch) {
    const queued = take(await admin.from("job_queue").select("id,payload,attempts,max_attempts")
      .eq("organization_id", orgA).eq("kind", "campaign_prepare")
      .filter("payload->>campaign_id", "eq", campaignId)
      .filter("payload->>batch", "eq", String(batch)).single(), `H job batch ${batch}`);
    insist(!JSON.stringify(queued.payload).includes("Conteúdo"), "H payload contém somente IDs");
    const worker = `campaign-harness-${run.slice(0, 8)}`;
    const lockedAt = new Date().toISOString();
    const lease = take(await admin.from("job_queue").update({
      status: "running",
      locked_by: worker,
      locked_at: lockedAt,
      attempts: 1,
      run_after: new Date(Date.now() - 1000).toISOString(),
    }).eq("organization_id", orgA).eq("id", queued.id)
      .select("id,payload,locked_at,locked_by,attempts").single(), `H lease batch ${batch}`);
    const { data, error } = await admin.rpc("fn_campaign_prepare_batch", {
      p_org: orgA,
      p_campaign: campaignId,
      p_batch: batch,
      p_job: lease.id,
      p_worker: worker,
      p_claim: lease.locked_at,
    });
    take({ data, error }, `H prepare batch ${batch}`);
    return { queued: lease, result: data, worker };
  }

  const prepared = await takeLease(draftRow.id, 1);
  insist(prepared.result.status === "prepared" && prepared.result.processed === 26 && prepared.result.provider_status === "unavailable", "H preparação sem provider");
  const replay = await admin.rpc("fn_campaign_prepare_batch", {
    p_org: orgA,
    p_campaign: draftRow.id,
    p_batch: 1,
    p_job: prepared.queued.id,
    p_worker: prepared.worker,
    p_claim: prepared.queued.locked_at,
  });
  const replayData = take(replay, "H replay worker");
  insist(replayData.status === "prepared" && replayData.processed === 0 && replayData.stale_batch === true, "H replay não duplica preparo");
  const results = take(await a.client.from("crm_scheduled_campaign_recipients")
    .select("contact_id,status,reason_code").eq("organization_id", orgA).eq("campaign_id", draftRow.id), "H resultado destinatários");
  insist(results.filter((item) => item.status === "ready").length === 23, "H consentimento provado vira ready");
  insist(results.find((item) => item.contact_id === contactsA[1].id)?.reason_code === "opted_out", "H opt-out revalidado");
  insist(results.find((item) => item.contact_id === contactsA[2].id)?.reason_code === "contact_blocked", "H bloqueio revalidado");
  insist(results.find((item) => item.contact_id === contactsA[3].id)?.reason_code === "marketing_consent_required", "H base legal ausente bloqueada");
  const preparedCampaign = take(await a.client.from("crm_scheduled_campaigns").select("status,error_code")
    .eq("organization_id", orgA).eq("id", draftRow.id).single(), "H estado preparado");
  insist(preparedCampaign.status === "prepared" && preparedCampaign.error_code === "provider_unavailable", "H estado não representa envio");
  insist(!results.some((recipient) => ["sent", "delivered", "read"].includes(recipient.status)), "H sem status de envio");

  await page.goto(`${app}/app/campaigns`, { timeout: 120000 });
  await page.getByRole("button", { name: new RegExp(editedName) }).click();
  await page.getByText("Provider de campanhas indisponível nesta release. Nenhum envio externo foi feito.", { exact: true }).waitFor();
  await page.screenshot({ path: `${dir}/campaigns-prepared-1440.png`, fullPage: true });
  await page.getByRole("button", { name: "Cancelar campanha", exact: true }).click();
  await page.getByRole("button", { name: "Sim, cancelar campanha", exact: true }).click();
  await page.getByText("Cancelada", { exact: true }).waitFor();
  const cancelledRecipients = take(await a.client.from("crm_scheduled_campaign_recipients").select("status")
    .eq("organization_id", orgA).eq("campaign_id", draftRow.id).eq("status", "cancelled"), "H cancelamento recipients");
  insist(cancelledRecipients.length === 23, "H cancelamento conserva skips e cancela elegíveis");

  const disabledDraft = take(await campaignCommand(a, orgA, "create", campaignData(`Campanha desativação ${run.slice(0, 8)}`, tagA)), "H draft capability");
  proof.campaigns.push(disabledDraft.id);
  take(await campaignCommand(a, orgA, "schedule", { id: disabledDraft.id, scheduled_at: new Date(Date.now() + 3_600_000).toISOString() }), "H schedule capability");
  take(await a.client.rpc("fn_set_capability", { p_org: orgA, p_capability: "scheduled_campaigns", p_enabled: false }), "H desativação capability");
  const blockedPost = await context.request.post(`${app}/api/v1/campaigns`, {
    data: campaignData("Campanha bloqueada por capability", tagA),
  });
  insist(blockedPost.status() === 403, "H API bloqueia capability desativada");
  const disabledLease = await takeLease(disabledDraft.id, 1);
  insist(disabledLease.result.status === "cancelled" && disabledLease.result.reason === "capability_disabled", "H worker bloqueia após capability off");
  const disabledCounts = take(await a.client.from("crm_scheduled_campaign_recipients").select("status")
    .eq("organization_id", orgA).eq("campaign_id", disabledDraft.id), "H snapshot capability");
  insist(disabledCounts.length === 26 && disabledCounts.every((item) => item.status === "cancelled"), "H pendentes cancelados sem efeito");
  take(await a.client.rpc("fn_set_capability", { p_org: orgA, p_capability: "scheduled_campaigns", p_enabled: true }), "H reativação capability");
  await page.goto(`${app}/app/campaigns`, { timeout: 120000 });
  await page.getByText("Campanha desativação", { exact: false }).waitFor();
  await page.screenshot({ path: `${dir}/campaigns-disabled-history-1440.png`, fullPage: true });

  done("Bloco H: RLS A/B, manager/viewer/agent/anon/service-role, referência estrutural e MFA AAL1/AAL2");
  done("Bloco H: rascunho → edição → revisão por teclado → snapshot de 26 → lote limitado → status/opt-out e ausência de envio");
  done("Bloco H: paginação desktop/mobile, cancelamento e capability desativada durante agendamento");
  return proof;
}
