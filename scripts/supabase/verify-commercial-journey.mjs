import { expect } from "@playwright/test";
/** Recebe somente fixtures da execução D2. Não persiste sessões ou credenciais. */
export async function verifyCommercialJourney({
  admin,
  a,
  b,
  viewer,
  agent,
  anon,
  orgA,
  orgB,
  contact,
  desktop,
  mobile,
  app,
  dir,
  requireResult: take,
  insist,
  done,
}) {
  const { page, context } = desktop;
  const get = async (path) => {
    const response = await context.request.get(app + path);
    insist(response.ok(), `B GET ${path.split("?")[0]}`);
    return (await response.json()).data;
  };
  const screenshot = async (name) => {
    insist(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `B overflow ${name}`,
    );
    await page.screenshot({ path: `${dir}/commercial-${name}.png`, fullPage: true });
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${app}/app/contacts`, { timeout: 120000 });
  await page.getByRole("button", { name: "Novo contato", exact: true }).click();
  let contactDialog = page.getByRole("dialog");
  await contactDialog.getByLabel("Nome", { exact: true }).fill("Relacionamento fictício Bloco B");
  await contactDialog.getByLabel("Email", { exact: true }).fill("cliente-ficticio@example.test");
  await contactDialog.getByLabel("Telefone (E.164)", { exact: true }).fill("invalid");
  await contactDialog.getByRole("button", { name: "Criar contato", exact: true }).click();
  await contactDialog.getByText(/Telefone deve estar/).waitFor();
  await screenshot("contact-validation-1440");
  await contactDialog.getByLabel("Telefone (E.164)", { exact: true }).fill("+12025550123");
  await contactDialog.getByRole("button", { name: "Criar contato", exact: true }).click();
  await contactDialog.waitFor({ state: "hidden" });
  const created = await get("/api/v1/contacts?search=Relacionamento%20fictício%20Bloco%20B");
  insist(Array.isArray(created) && created.length === 1, "B contato criado e pesquisável");
  contact = created[0].id;
  await page
    .getByPlaceholder("Buscar por nome, email ou telefone…")
    .fill("Relacionamento fictício Bloco B");
  await page.getByRole("link", { name: "Relacionamento fictício Bloco B", exact: true }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  contactDialog = page.getByRole("dialog");
  await contactDialog
    .getByLabel("Nome", { exact: true })
    .fill("Relacionamento fictício atualizado");
  await screenshot("contact-edit-1440");
  await contactDialog.getByRole("button", { name: /Salvar/, exact: true }).click();
  await contactDialog.waitFor({ state: "hidden" });
  const updatedContact = take(
    await a.client
      .from("contacts")
      .select("id,name,email,phone_number,source")
      .eq("organization_id", orgA)
      .eq("id", contact)
      .single(),
    "B identidade atualizada",
  );
  insist(
    updatedContact.name === "Relacionamento fictício atualizado" &&
      updatedContact.email === "cliente-ficticio@example.test" &&
      updatedContact.phone_number === "+12025550123" &&
      updatedContact.source === "manual",
    "B identidade e origem preservadas",
  );
  const contactB = take(
    await b.client
      .from("contacts")
      .insert({ organization_id: orgB, display_name: "Contato fictício B", source: "manual" })
      .select("id")
      .single(),
    "B contato B",
  ).id;
  const pipelineA = take(
    await a.client
      .from("crm_pipelines")
      .select("id")
      .eq("organization_id", orgA)
      .eq("is_default", true)
      .single(),
    "B funil padrão",
  ).id;
  const stages = take(
    await a.client
      .from("crm_stages")
      .select("id,is_won,is_lost,position")
      .eq("organization_id", orgA)
      .eq("pipeline_id", pipelineA)
      .order("position"),
    "B etapas",
  );
  const openStage = stages.find((s) => !s.is_won && !s.is_lost);
  insist(
    openStage && stages.some((s) => s.is_won) && stages.some((s) => s.is_lost),
    "B etapas de resultado",
  );
  const baseLead = {
    organization_id: orgA,
    pipeline_id: pipelineA,
    stage_id: openStage.id,
    title: "Referência fictícia",
    contact_id: contact,
    owner_user_id: a.id,
  };
  for (const [client, patch] of [
    [a.client, { contact_id: contactB }],
    [admin, { contact_id: contactB }],
    [a.client, { owner_user_id: b.id }],
  ]) {
    insist(
      (await client.from("crm_leads").insert({ ...baseLead, ...patch })).error?.code === "23503",
      "B FK cross-tenant recusada",
    );
  }
  const foreignLead = take(
    await b.client
      .from("crm_pipelines")
      .select("id")
      .eq("organization_id", orgB)
      .eq("is_default", true)
      .single(),
    "B funil B",
  ).id;
  const foreignStage = take(
    await b.client
      .from("crm_stages")
      .select("id")
      .eq("pipeline_id", foreignLead)
      .eq("is_won", false)
      .eq("is_lost", false)
      .order("position")
      .limit(1)
      .single(),
    "B etapa B",
  ).id;
  const leadB = take(
    await b.client
      .from("crm_leads")
      .insert({
        organization_id: orgB,
        pipeline_id: foreignLead,
        stage_id: foreignStage,
        title: "Oportunidade fictícia B",
        contact_id: contactB,
      })
      .select("id")
      .single(),
    "B oportunidade B",
  ).id;
  for (const client of [a.client, admin])
    insist(
      (
        await client
          .from("crm_tasks")
          .insert({ organization_id: orgA, lead_id: leadB, title: "Referência proibida" })
      ).error?.code === "23503",
      "B tarefa FK cross-tenant recusada",
    );
  insist(
    (
      await viewer.client
        .from("crm_tasks")
        .insert({ organization_id: orgA, title: "Viewer proibido" })
    ).error !== null,
    "B viewer escrita negada",
  );
  insist(
    (await anon.from("crm_tasks").select("id").eq("organization_id", orgA)).error !== null,
    "B anon negado",
  );
  for (const person of [a, b, viewer, agent]) {
    const other = person === b ? orgA : orgB;
    for (const table of ["contacts", "crm_leads", "crm_tasks", "calendar_appointments"])
      insist(
        take(
          await person.client.from(table).select("id").eq("organization_id", other),
          "B isolamento JWT",
        ).length === 0,
        "B tenant invisível",
      );
  }
  done("Bloco B: JWT A/B, viewer, agent, anon e service role; referências cross-tenant negadas");

  // Agenda interna fictícia: configuração pertence apenas à organização descartável.
  take(
    await admin.from("attendant_availability").upsert(
      {
        organization_id: orgA,
        user_id: a.id,
        schedule: {
          timezone: "America/Sao_Paulo",
          windows: Array.from({ length: 7 }, (_, dow) => ({ dow, start: "08:00", end: "18:00" })),
        },
      },
      { onConflict: "organization_id,user_id" },
    ),
    "B disponibilidade fictícia",
  );
  const eventType = take(
    await admin
      .from("calendar_event_types")
      .insert({
        organization_id: orgA,
        name: "Reunião comercial fictícia",
        slug: "bloco-b-fixture",
        default_owner_user_id: a.id,
        duration_minutes: 30,
        minimum_notice_minutes: 0,
        booking_window_days: 30,
        location_kind: "phone",
        requires_confirmation: false,
        reminder_enabled: false,
      })
      .select("id")
      .single(),
    "B tipo fictício",
  ).id;
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${app}/app/contacts/${contact}`, { timeout: 120000 });
  const panel = page.getByRole("region", { name: "Contexto comercial" });
  await panel.getByRole("button", { name: "Criar oportunidade" }).waitFor();
  await screenshot("contact-1440");
  await panel.getByRole("button", { name: "Nova tarefa", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("O que precisa ser feito").fill("Qualificar relacionamento fictício");
  await dialog.getByLabel("Responsável", { exact: true }).selectOption(a.id);
  await page.keyboard.press("Tab");
  insist(await dialog.evaluate((el) => el.contains(document.activeElement)), "B foco na tarefa");
  await screenshot("prospect-task-1440");
  await dialog
    .getByRole("button", { name: /Criar tarefa|Salvar tarefa|Salvar/, exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await panel.getByText("Qualificar relacionamento fictício", { exact: false }).waitFor();
  let projection = await get(`/api/v1/contacts/${contact}/commercial-context`);
  insist(
    projection.tasks.some(
      (task) =>
        task.title === "Qualificar relacionamento fictício" &&
        task.contact_id === contact &&
        task.lead_id === null &&
        task.assigned_to === a.id,
    ),
    "B prospect preserva contato sem lead artificial",
  );
  await panel.getByRole("button", { name: "Criar oportunidade" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Título", { exact: true }).fill("Venda fictícia Bloco B");
  await dialog.getByLabel("Origem", { exact: true }).fill("manual_homologacao");
  await dialog.getByLabel("Moeda", { exact: true }).selectOption("BRL");
  await dialog.getByLabel("Valor", { exact: true }).fill("1234,56");
  await dialog.getByLabel("Responsável", { exact: true }).selectOption(a.id);
  await screenshot("opportunity-form-1440");
  await dialog.getByRole("button", { name: "Criar lead", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await panel.getByRole("link", { name: "Venda fictícia Bloco B", exact: true }).waitFor();
  projection = await get(`/api/v1/contacts/${contact}/commercial-context`);
  const lead = projection.leads.find((row) => row.title === "Venda fictícia Bloco B");
  insist(
    lead?.contact_id === contact &&
      lead.value_cents === 123456 &&
      lead.currency === "BRL" &&
      lead.source === "manual_homologacao" &&
      lead.owner_user_id === a.id,
    "B oportunidade conserva identidade, centavos, origem e responsável",
  );
  await panel.getByLabel("Vincular tarefa à oportunidade").selectOption(lead.id);
  await panel.getByRole("button", { name: "Nova tarefa", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("O que precisa ser feito").fill("Retornar negociação fictícia");
  await dialog.getByLabel("Responsável", { exact: true }).selectOption(agent.id);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await dialog.getByLabel("Prazo", { exact: true }).fill(tomorrow);
  await dialog.getByLabel("Horário", { exact: true }).fill("10:00");
  await dialog
    .getByRole("button", { name: /Criar tarefa|Salvar tarefa|Salvar/, exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await panel.getByText("Retornar negociação fictícia", { exact: false }).waitFor();
  projection = await get(`/api/v1/contacts/${contact}/commercial-context`);
  const task = projection.tasks.find((row) => row.title === "Retornar negociação fictícia");
  insist(
    task?.lead_id === lead.id &&
      task.contact_id === contact &&
      task.assigned_to === agent.id &&
      task.due_date,
    "B próximo passo vinculado com prazo e responsável",
  );
  await panel
    .getByText("Retornar negociação fictícia", { exact: false })
    .locator("..")
    .getByRole("button", { name: "Concluir tarefa" })
    .click();
  await panel.getByText(/Retornar negociação fictícia.*Concluída/).waitFor();
  await screenshot("journey-1440");
  await page.setViewportSize({ width: 390, height: 844 });
  await screenshot("journey-390");
  await panel.getByRole("button", { name: "Criar oportunidade" }).click();
  await screenshot("opportunity-form-390");
  await page.keyboard.press("Escape");
  await panel.getByRole("button", { name: "Nova tarefa", exact: true }).click();
  await screenshot("task-form-390");
  await page.keyboard.press("Escape");

  await panel.getByRole("link", { name: "Agendar compromisso" }).click();
  await page.getByRole("heading", { name: "Novo agendamento", exact: true }).waitFor();
  const typeOption = page.getByTestId(`tipo-${eventType}`);
  if (await typeOption.count()) await typeOption.click();
  const day = page.locator('[data-testid^="dia-"][data-disponivel="true"]').first();
  await day.waitFor();
  await day.click();
  await page.locator('[data-testid^="horario-"]:not([disabled])').first().click();
  await screenshot("agenda-form-390");
  await page.setViewportSize({ width: 1440, height: 900 });
  await screenshot("agenda-form-1440");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId("confirmar-marcacao").click();
  await page.getByText("Marcar outro", { exact: true }).waitFor();
  await screenshot("agenda-result-390");
  projection = await get(`/api/v1/contacts/${contact}/commercial-context`);
  insist(
    projection.appointments.some(
      (row) => row.contact_id === contact && row.time_zone === "America/Sao_Paulo",
    ),
    "B compromisso preserva vínculo e fuso",
  );

  await page.goto(`${app}/app/pipelines/${lead.pipeline_id}?lead=${lead.id}`, { timeout: 120000 });
  await page.getByRole("dialog").getByText("Contexto comercial", { exact: true }).waitFor();
  await page
    .getByText("Carregando a linha do tempo…", { exact: true })
    .waitFor({ state: "hidden" });
  const historyBeforeClose = take(
    await a.client
      .from("crm_lead_activities")
      .select("type")
      .eq("organization_id", orgA)
      .eq("lead_id", lead.id),
    "B histórico antes do resultado",
  );
  insist(
    historyBeforeClose.some((row) => row.type === "task_created") &&
      historyBeforeClose.some((row) => row.type === "task_completed"),
    "B criação e conclusão registradas",
  );
  const timelineResponse = await context.request.get(`${app}/api/v1/leads/${lead.id}/timeline`);
  insist(timelineResponse.ok(), `B timeline API ${timelineResponse.status()}`);
  // A timeline agrupa ações próximas. Abrir a porta existente é parte da jornada.
  const groups = await page
    .getByRole("dialog")
    .locator('button[aria-expanded="false"]')
    .filter({ hasText: /ações/ })
    .all();
  for (const group of groups) await group.click();
  await page.getByText("Tarefa concluída", { exact: false }).waitFor();
  await screenshot("dossier-390");
  await page.setViewportSize({ width: 1440, height: 900 });
  await screenshot("dossier-1440");
  const target = stages.find((s) => s.is_won);
  const intermediate = stages.find((s) => !s.is_won && !s.is_lost && s.id !== lead.stage_id);
  if (intermediate) {
    const version = take(
      await a.client
        .from("crm_leads")
        .select("updated_at")
        .eq("organization_id", orgA)
        .eq("id", lead.id)
        .single(),
      "B versão para movimento",
    ).updated_at;
    const moved = await context.request.post(app + "/api/v1/leads/" + lead.id + "/move", {
      data: { stage_id: intermediate.id, position_in_stage: 0, expected_updated_at: version },
    });
    insist(moved.ok(), `B movimento intermediário API ${moved.status()}`);
  }
  await page.keyboard.press("Escape");
  const wonCard = page.getByRole("group", { name: "Lead: Venda fictícia Bloco B", exact: true });
  await wonCard.getByRole("button", { name: "Ações do lead", exact: true }).click();
  await page.getByRole("menuitem", { name: "Marcar como ganho", exact: true }).click();
  await expect
    .poll(
      async () =>
        take(
          await a.client
            .from("crm_leads")
            .select("status")
            .eq("organization_id", orgA)
            .eq("id", lead.id)
            .single(),
          "B resultado ganho",
        ).status,
      { timeout: 30000 },
    )
    .toBe("won");
  const won = take(
    await a.client
      .from("crm_leads")
      .select("status,closed_at,stage_id")
      .eq("organization_id", orgA)
      .eq("id", lead.id)
      .single(),
    "B ganho",
  );
  insist(won.closed_at && won.stage_id === target.id, "B ganho derivado da etapa");
  await page.goto(app + "/app/pipelines/" + lead.pipeline_id + "?lead=" + lead.id, {
    timeout: 120000,
  });
  await page.getByRole("dialog").getByText("Contexto comercial", { exact: true }).waitFor();
  await page.getByRole("region", { name: "Contexto comercial" }).getByText(/Ganho/).waitFor();
  await screenshot("won-1440");
  // Remove também ?lead=: Realtime pode reabrir o dossiê selecionado pela URL.
  await page.goto(app + "/app/pipelines/" + lead.pipeline_id, { timeout: 120000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const card = page.getByRole("group", { name: "Lead: Venda fictícia Bloco B", exact: true });
  await card.getByRole("button", { name: "Ações do lead", exact: true }).click();
  await page.getByRole("menuitem", { name: "Marcar como perdido", exact: true }).click();
  const lossDialog = page.getByRole("dialog", { name: "Marcar como perdido", exact: true });
  await expect(page.getByRole("dialog")).toHaveCount(1);
  insist(
    await lossDialog.getByRole("button", { name: "Confirmar", exact: true }).isDisabled(),
    "B perda exige motivo",
  );
  await lossDialog.getByLabel("Preço", { exact: true }).check();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(lossDialog.getByRole("button", { name: "Confirmar", exact: true })).toBeEnabled();
  await screenshot("loss-reason-1440");
  insist(true, "B envio da confirmação de perda pela tela");
  // Promise.all trata imediatamente ambas as rejeições; o finally externo
  // precisa sempre revogar sessões, limpar fixtures e gravar o relatório.
  const [lossResponse] = await Promise.all([
    page.waitForResponse((response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/v1/leads/" + lead.id + "/lose")),
    lossDialog.getByRole("button", { name: "Confirmar", exact: true }).click(),
  ]);
  insist(lossResponse.status() === 200, "B confirmação da perda API");
  await lossDialog.waitFor({ state: "hidden" });
  const lost = take(
    await a.client
      .from("crm_leads")
      .select("status,closed_at,lost_reason")
      .eq("organization_id", orgA)
      .eq("id", lead.id)
      .single(),
    "B resultado perda",
  );
  insist(
    lost.status === "lost" && lost.closed_at && lost.lost_reason === "price",
    "B perda com motivo preservado",
  );
  await page.goto(`${app}/app/contacts/${contact}`, { timeout: 120000 });
  await page
    .getByRole("region", { name: "Contexto comercial" })
    .getByText(/Perdido/)
    .waitFor();
  await screenshot("lost-1440");
  const activities = take(
    await a.client
      .from("crm_lead_activities")
      .select("type")
      .eq("organization_id", orgA)
      .eq("lead_id", lead.id),
    "B histórico",
  );
  insist(activities.length >= 3, "B histórico da oportunidade e tarefas");
  await mobile.page.goto(`${app}/app/contacts/${contact}`, { timeout: 120000 });
  const viewerPanel = mobile.page.getByRole("region", { name: "Contexto comercial" });
  await viewerPanel.getByText("Venda fictícia Bloco B", { exact: false }).waitFor();
  insist(
    (await viewerPanel.getByRole("button", { name: "Nova tarefa", exact: true }).count()) === 0,
    "B viewer UI leitura",
  );
  insist(
    (
      await mobile.context.request.post(`${app}/api/v1/tasks`, {
        data: { title: "Proibida", contact_id: contact },
      })
    ).status() === 403,
    "B viewer API escrita negada",
  );
  await mobile.page.screenshot({ path: `${dir}/commercial-viewer-390.png`, fullPage: true });
  done(
    "Bloco B: jornada real contato → tarefa humana → oportunidade → próximo passo → agenda → ganho/perda; UI desktop/mobile e histórico",
  );
}
