import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { register } from "tsx/esm/api";
import { register as registerCjs } from "tsx/cjs/api";

/** Executa o motor versionado sobre evento próprio; não drena dados de terceiros. */
export async function verifyAutomationScripts({
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
  getDiagnostic,
}) {
  let page = desktop.page;
  const { context } = desktop;
  const rpc = async (person, org, command, key = randomUUID()) =>
    person.client.rpc("fn_script_command", { p_org: org, p_command: command, p_request: key });
  const post = async (path, data) => {
    const r = await context.request.post(app + path, {
      data,
      headers: { "Idempotency-Key": randomUUID() },
      timeout: 120000,
    });
    insist(r.ok(), "G API " + path + " HTTP " + r.status());
    return (await r.json()).data;
  };
  const shot = async (name) => {
    insist(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      "G overflow " + name,
    );
    await page.screenshot({ path: dir + "/scripts-" + name + ".png", fullPage: true });
  };
  const clickCommand = async (label) => {
    const [r] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith("/api/v1/scripts") && r.request().method() === "POST",
        { timeout: 120000 },
      ),
      page.getByRole("button", { name: label, exact: true }).click(),
    ]);
    insist(r.ok(), "G UI " + label + " HTTP " + r.status());
    return (await r.json()).data;
  };
  try {
    insist(
      !take(
        await a.client.rpc("fn_capability_enabled", { p_org: orgA, p_capability: "short_scripts" }),
        "G default",
      ),
      "G roteiro default desligado",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app + "/app/settings/capabilities", { timeout: 120000 });
    const toggle = page.getByRole("switch", { name: "Roteiros curtos", exact: true });
    await toggle.focus();
    await toggle.press("Space");
    await page
      .getByRole("status")
      .filter({ hasText: "Habilitação atualizada" })
      .waitFor({ timeout: 120000 });
    await expect(toggle).toBeChecked({ timeout: 30000 });
    const channel = take(
      await admin
        .from("channel_sessions")
        .insert({
          organization_id: orgA,
          waha_session_name: "g-ficticio-" + randomUUID(),
          webhook_secret_encrypted: "\\x00",
          status: "STOPPED",
        })
        .select("id")
        .single(),
      "G canal fictício",
    );
    const conversation = take(
      await admin
        .from("conversations")
        .insert({
          organization_id: orgA,
          contact_id: contact,
          channel_session_id: channel.id,
          status: "pending",
          last_message_preview: "Atendimento fictício G",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single(),
      "G conversa",
    );
    const source = (await post("/api/v1/tags", { action: "create", name: "Origem fictícia G" }))
      .tag_id;
    const destination = (
      await post("/api/v1/tags", { action: "create", name: "Resultado fictício G" })
    ).tag_id;
    const foreign = take(
      await b.client.rpc("fn_crm_tag_manage", {
        p_org: orgB,
        p_action: "create",
        p_name: "Tag fictícia B G",
      }),
      "G catálogo B",
    ).tag_id;
    await page.goto(app + "/app/webhooks", { timeout: 120000 });
    await page.getByRole("tab", { name: "Automações", exact: true }).click();
    await page.getByRole("button", { name: "Nova automação", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Nova automação", exact: true });
    await dialog.getByLabel("Nome da automação", { exact: true }).fill("Regra fictícia G");
    await dialog.getByRole("combobox").filter({ hasText: "Escolha o gatilho" }).click();
    await page
      .getByRole("option", { name: "Quando um contato ganhar uma tag", exact: true })
      .click();
    await dialog.getByRole("button", { name: "Adicionar condição", exact: true }).click();
    await dialog.getByRole("combobox").filter({ hasText: "Campo" }).click();
    await page.getByRole("option", { name: "Tag adicionada", exact: true }).click();
    await dialog.getByPlaceholder("Valor", { exact: true }).fill("Origem fictícia G");
    await dialog.getByRole("combobox").filter({ hasText: "Adicionar ação" }).click();
    await page.getByRole("option", { name: "Adicionar tag", exact: true }).click();
    await dialog.getByLabel("Resultado fictício G", { exact: true }).check();
    await shot("automation-editor-1440");
    const [createdRule] = await Promise.all([
      page.waitForResponse(
        (r) => r.url().endsWith("/automation-rules") && r.request().method() === "POST",
        { timeout: 120000 },
      ),
      dialog.getByRole("button", { name: "Criar automação", exact: true }).click(),
    ]);
    insist(createdRule.ok(), "G regra criada UI");
    const rule = (await createdRule.json()).data;
    await expect(dialog).toHaveCount(0);
    await page.getByRole("switch", { name: "Ligar Regra fictícia G", exact: true }).click();
    await expect(
      page.getByRole("switch", { name: "Pausar Regra fictícia G", exact: true }),
    ).toBeChecked();
    insist(
      (
        await admin
          .from("automation_rules")
          .update({ actions: [{ type: "add_tag", config: { tag_ids: [foreign] } }] })
          .eq("organization_id", orgA)
          .eq("id", rule.id)
      ).error?.code === "23503",
      "G cross-tenant regra negado service",
    );
    await post("/api/v1/tags", {
      action: "assign",
      tag_id: source,
      entity_kind: "contact",
      entity_id: contact,
      assigned: true,
    });
    const event = take(
      await admin
        .from("event_log")
        .select("*")
        .eq("organization_id", orgA)
        .eq("entity_id", contact)
        .eq("event_type", "contact.tag_added")
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      "G evento produtor real",
    );
    register({ tsconfig: "./tsconfig.json" });
    registerCjs({ tsconfig: "./tsconfig.json" });
    const { runAutomationForEvent } = await import("../../lib/automation/engine.ts");
    await import("../../lib/automation/actions/add-tag.ts");
    let failedOnce = false;
    const fault = new Proxy(admin, {
      get(target, key) {
        if (key === "rpc")
          return async (name, args) => {
            if (name === "fn_automation_add_tag" && !failedOnce) {
              failedOnce = true;
              return { data: null, error: { code: "08006" } };
            }
            return target.rpc(name, args);
          };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    insist(
      (await runAutomationForEvent(fault, event)).status === "error",
      "G falha segura observável",
    );
    const failed = take(
      await admin
        .from("automation_rule_runs")
        .select("status")
        .eq("organization_id", orgA)
        .eq("event_id", event.id)
        .eq("rule_id", rule.id),
      "G run falho",
    );
    insist(
      failed.some((r) => r.status === "failed"),
      "G estado failed registrado",
    );
    await page.getByRole("tab", { name: "Atividade", exact: true }).click();
    await page.getByText("Regra fictícia G", { exact: true }).first().waitFor();
    await shot("automation-failed-1440");
    insist((await runAutomationForEvent(admin, event)).status === "ok", "G retry seguro");
    insist((await runAutomationForEvent(admin, event)).status === "ok", "G replay seguro");
    const assignment = take(
      await a.client
        .from("crm_tag_assignments")
        .select("tag_id")
        .eq("organization_id", orgA)
        .eq("entity_id", contact)
        .eq("tag_id", destination),
      "G efeito canônico",
    );
    insist(assignment.length === 1, "G uma atribuição após replay");
    const receipts = take(
      await admin
        .from("idempotency_keys")
        .select("id")
        .eq("organization_id", orgA)
        .eq("endpoint", "automation-tag"),
      "G recibo",
    );
    insist(receipts.length === 1, "G recibo único");
    const alias = take(
      await a.client
        .from("contacts")
        .select("tags")
        .eq("organization_id", orgA)
        .eq("id", contact)
        .single(),
      "G projeção textual",
    );
    insist(alias.tags.includes("Resultado fictício G"), "G alias compatível");
    for (const person of [viewer, agent]) {
      const denied = await person.client
        .from("automation_rules")
        .insert({
          organization_id: orgA,
          name: "Negada",
          trigger_event: "contact.tag_added",
          conditions: [],
          actions: [{ type: "add_tag", config: { tag_ids: [destination] } }],
        })
        .select("id");
      insist(denied.error?.code === "42501" || denied.data?.length === 0, "G RBAC regra");
    }
    await post("/api/v1/tags", {
      action: "rename",
      tag_id: destination,
      name: "Resultado renomeado G",
    });
    const mergedDestination = (
      await post("/api/v1/tags", { action: "create", name: "Resultado consolidado G" })
    ).tag_id;
    await post("/api/v1/tags", {
      action: "merge",
      tag_id: destination,
      destination_id: mergedDestination,
    });
    take(
      await a.client
        .from("automation_rules")
        .update({ conditions: [{ field: "contact.tag_ids", op: "contains", value: destination }] })
        .eq("organization_id", orgA)
        .eq("id", rule.id),
      "G condição identidade mesclada",
    );
    await post("/api/v1/tags", {
      action: "assign",
      tag_id: source,
      entity_kind: "contact",
      entity_id: contact,
      assigned: false,
    });
    await post("/api/v1/tags", {
      action: "assign",
      tag_id: source,
      entity_kind: "contact",
      entity_id: contact,
      assigned: true,
    });
    const mergedEvent = take(
      await admin
        .from("event_log")
        .select("*")
        .eq("organization_id", orgA)
        .eq("entity_id", contact)
        .eq("event_type", "contact.tag_added")
        .neq("id", event.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single(),
      "G evento após merge",
    );
    insist(
      (await runAutomationForEvent(admin, mergedEvent)).status === "ok",
      "G regra após rename/merge",
    );
    const mergedRuns = take(
      await admin
        .from("automation_rule_runs")
        .select("status")
        .eq("organization_id", orgA)
        .eq("event_id", mergedEvent.id)
        .eq("rule_id", rule.id),
      "G execução condição UUID mesclada",
    );
    insist(
      mergedRuns.length > 0 && mergedRuns.every((r) => r.status === "success"),
      "G identidade preservada em condição e ação",
    );
    const impactG = take(
      await a.client.rpc("fn_crm_tag_impact", { p_org: orgA, p_tag: mergedDestination }),
      "G impacto UUID mesclado",
    );
    insist(impactG.configuration_references > 0, "G impacto conserva referências UUID após merge");
    insist(
      (
        await a.client.rpc("fn_crm_tag_manage", {
          p_org: orgA,
          p_action: "delete",
          p_tag: mergedDestination,
        })
      ).error?.code === "23503",
      "G referência UUID impede apagar identidade",
    );
    done(
      "Bloco G: evento real → condição → add_tag existente; falha, retry e replay com uma atribuição/recibo; aliases e referência A/B",
    );
    await page.goto(app + "/app/scripts?conversation_id=" + conversation.id, { timeout: 120000 });
    await page
      .getByText("Nenhum roteiro cadastrado. Um gerente pode configurar a primeira coleta.", {
        exact: true,
      })
      .waitFor();
    await shot("empty-1440");
    await page.getByRole("button", { name: "Novo roteiro", exact: true }).click();
    const form = page.getByRole("form", { name: "Editar roteiro curto", exact: true });
    await form.getByLabel("Nome do roteiro", { exact: true }).fill("Coleta fictícia G");
    await form.getByLabel("Descrição do roteiro", { exact: true }).fill("Coleta genérica fictícia");
    await form.getByLabel("Ativar roteiro", { exact: true }).check();
    await form.getByLabel("Pergunta", { exact: true }).fill("Qual sua necessidade?");
    await form.getByRole("button", { name: "Adicionar passo", exact: true }).click();
    await form.getByLabel("Pergunta", { exact: true }).nth(1).fill("Qual período prefere?");
    await form.getByLabel("Tipo de pergunta", { exact: true }).nth(1).selectOption("choice");
    await form.getByLabel("Opções, uma por linha", { exact: true }).fill("Manhã\nTarde");
    await form.getByRole("button", { name: "Adicionar passo", exact: true }).click();
    await form
      .getByLabel("Pergunta", { exact: true })
      .nth(2)
      .fill("Podemos continuar com o humano?");
    await form.getByLabel("Tipo de pergunta", { exact: true }).nth(2).selectOption("confirmation");
    const up = form.getByRole("button", { name: "Mover passo para cima 3", exact: true });
    await up.focus();
    insist(await up.evaluate((el) => el === document.activeElement), "G foco reorder");
    await up.press("Enter");
    await form
      .getByRole("button", { name: "Mover passo para baixo 2", exact: true })
      .press("Enter");
    await shot("editor-1440");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("editor-390");
    await page.setViewportSize({ width: 1440, height: 900 });
    const script = await clickCommand("Salvar roteiro");
    await expect(form).toHaveCount(0);
    await page.getByLabel("Roteiro para iniciar", { exact: true }).selectOption(script.id);
    let session = await clickCommand("Iniciar roteiro");
    await page.getByText("Em andamento", { exact: false }).first().waitFor();
    await shot("running-1440");
    const originalStep = session.snapshot.steps[0].id;
    // Falha HTTP simulada antes da mutação: UI preserva resposta e oferece retry.
    await page.route("**/api/v1/scripts", (route) =>
      route.request().method() === "POST"
        ? route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({ error: { code: "internal_error", message: "Falha fictícia" } }),
          })
        : route.continue(),
    );
    await page
      .getByLabel("Qual sua necessidade?", { exact: true })
      .fill("Necessidade fictícia preservada");
    await page.getByRole("button", { name: "Responder e avançar", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "As respostas foram preservadas" }).waitFor();
    await shot("error-1440");
    await page.unroute("**/api/v1/scripts");
    session = await clickCommand("Responder e avançar");
    await page
      .getByLabel("Motivo para continuar com humano", { exact: true })
      .fill("Revisão humana fictícia");
    session = await clickCommand("Interromper e entregar ao humano");
    await page.getByText("Interrompido — continuidade humana", { exact: false }).first().waitFor();
    await shot("handoff-1440");
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("handoff-390");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(app + "/app/inbox?id=" + conversation.id, { timeout: 120000 });
    await page.getByText("Roteiro do atendimento", { exact: true }).waitFor({ timeout: 120000 });
    await page.getByText("Revisão humana fictícia", { exact: false }).first().waitFor();
    const resume = page.getByRole("button", {
      name: "Retomar com as respostas preservadas",
      exact: true,
    });
    insist(
      await resume.evaluate((el) => el.scrollWidth <= el.clientWidth),
      "G botão cabe no painel do Inbox",
    );
    await shot("handoff-inbox-1440");
    await page.goto(app + "/app/scripts?conversation_id=" + conversation.id, { timeout: 120000 });
    await page.getByRole("button", { name: "Editar roteiro", exact: true }).click();
    await form
      .getByLabel("Pergunta", { exact: true })
      .first()
      .fill("Pergunta editada para novas sessões?");
    await clickCommand("Salvar roteiro");
    const preserved = take(
      await a.client
        .from("crm_script_sessions")
        .select("snapshot,answers,revision")
        .eq("organization_id", orgA)
        .eq("id", session.id)
        .single(),
      "G snapshot",
    );
    insist(
      preserved.snapshot.steps[0].prompt === "Qual sua necessidade?" &&
        preserved.answers[originalStep] === "Necessidade fictícia preservada",
      "G edição não muda sessão",
    );
    session = await clickCommand("Retomar com as respostas preservadas");
    await expect(page.getByLabel("Qual período prefere?", { exact: true })).toBeFocused({
      timeout: 30000,
    });
    await page.getByLabel("Qual período prefere?", { exact: true }).selectOption("Tarde");
    session = await clickCommand("Responder e avançar");
    await page.getByLabel("Podemos continuar com o humano?", { exact: true }).selectOption("true");
    session = await clickCommand("Responder e concluir");
    await page.getByText("Coleta fictícia G — Concluído", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await shot("completed-390");
    await page.setViewportSize({ width: 1440, height: 900 });
    await shot("completed-1440");
    insist(
      session.status === "completed" && Object.keys(session.answers).length === 3,
      "G conclusão explícita",
    );
    const replayKey = randomUUID(),
      restart = { action: "start", script_id: script.id, conversation_id: conversation.id };
    const started = take(await rpc(a, orgA, restart, replayKey), "G reinício");
    insist(
      take(await rpc(a, orgA, restart, replayKey), "G replay início").id === started.id,
      "G replay uma sessão",
    );
    insist((await rpc(a, orgB, restart)).error?.code === "42501", "G JWT A/B comando");
    insist(
      take(
        await b.client.from("crm_script_sessions").select("id").eq("organization_id", orgA),
        "G leitura cruzada",
      ).length === 0,
      "G JWT B não lê sessão A",
    );
    const agentKey = randomUUID();
    const agentAnswer = take(
      await rpc(
        agent,
        orgA,
        {
          action: "answer",
          id: started.id,
          expected_revision: started.revision,
          step_id: started.snapshot.steps[0].id,
          answer: "Resposta humana agent fictícia",
        },
        agentKey,
      ),
      "G agent coleta permitida",
    );
    take(
      await admin
        .from("conversations")
        .update({ assigned_to_user_id: a.id })
        .eq("organization_id", orgA)
        .eq("id", conversation.id),
      "G atribuição de escopo",
    );
    const settings = take(
      await admin.from("organizations").select("settings").eq("id", orgA).single(),
      "G configuração escopo",
    );
    take(
      await admin
        .from("organizations")
        .update({ settings: { ...settings.settings, visibility_mode: "own" } })
        .eq("id", orgA),
      "G escopo próprio",
    );
    insist(
      (
        await rpc(agent, orgA, {
          action: "interrupt",
          id: started.id,
          expected_revision: agentAnswer.revision,
          reason: "Negada por escopo",
        })
      ).error?.code === "42501",
      "G agent não atua fora do escopo",
    );
    insist(
      take(
        await agent.client
          .from("crm_script_sessions")
          .select("id")
          .eq("organization_id", orgA)
          .eq("id", started.id),
        "G histórico próprio",
      ).length === 0,
      "G agent não lê fora do escopo",
    );
    insist(
      (
        await rpc(
          agent,
          orgA,
          {
            action: "answer",
            id: started.id,
            expected_revision: started.revision,
            step_id: started.snapshot.steps[0].id,
            answer: "Resposta humana agent fictícia",
          },
          agentKey,
        )
      ).error?.code === "42501",
      "G replay não ignora escopo atual",
    );
    for (const person of [viewer, agent])
      insist(
        (await rpc(person, orgA, { action: "create", definition: script.definition })).error
          ?.code === "42501",
        "G gestão manager+",
      );
    insist(
      (await rpc({ client: anon }, orgA, restart)).error?.code === "42501",
      "G anon comando negado",
    );
    insist(
      (await rpc({ client: admin }, orgA, restart)).error?.code === "42501",
      "G service comando negado",
    );
    insist(
      (
        await a.client
          .from("crm_script_sessions")
          .update({ answers: { forged: "x" } })
          .eq("organization_id", orgA)
          .eq("id", started.id)
      ).error?.code === "42501",
      "G sem escrita direta",
    );
    await mobile.page.goto(app + "/app/scripts", { timeout: 120000 });
    insist(
      !(await mobile.page.getByRole("button", { name: "Novo roteiro", exact: true }).count()),
      "G viewer sem gestão",
    );
    await page.goto(app + "/app/settings/capabilities", { timeout: 120000 });
    await page.getByRole("switch", { name: "Roteiros curtos", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Habilitação atualizada" })
      .waitFor({ timeout: 120000 });
    insist(
      (
        await rpc(a, orgA, {
          action: "resume",
          id: started.id,
          expected_revision: started.revision,
        })
      ).error?.code === "42501",
      "G capability corta mutação",
    );
    await page.goto(app + "/app/scripts?conversation_id=" + conversation.id, { timeout: 120000 });
    await page
      .getByText("Roteiros desativados. O contexto anterior continua disponível.", { exact: true })
      .waitFor();
    await shot("disabled-history-1440");
    await page.goto(app + "/app/settings/capabilities", { timeout: 120000 });
    await page.getByRole("switch", { name: "Roteiros curtos", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Habilitação atualizada" })
      .waitFor({ timeout: 120000 });
    done(
      "Bloco G: roteiro de três passos pela tela, erro/retry, edição com snapshot, interrupção/retomada/conclusão, desktop/mobile/teclado e histórico desligado; JWT A/B/RBAC",
    );
    return { definition: script.definition, rule_id: rule.id };
  } catch (error) {
    await page.screenshot({ path: dir + "/scripts-failure.png", fullPage: true }).catch(() => {});
    if (!error.verificationFailure)
      error.verificationFailure = {
        ...getDiagnostic(),
        reason: error.name === "TimeoutError" ? "ui_timeout" : "ui_assertion",
      };
    throw error;
  }
}
