import { verifyAutomationScripts } from "./verify-automation-scripts.mjs";
import { verifyProposals } from "./verify-proposals.mjs";
import { verifyReportingForecast } from "./verify-reporting-forecast.mjs";
import { verifyB2BSimple } from "./verify-b2b-simple.mjs";
import { verifyTagsFoundation } from "./verify-tags-foundation.mjs";
import { verifyScheduledCampaigns } from "./verify-scheduled-campaigns.mjs";
/** Homologação destrutiva SOMENTE de fixtures desta execução no staging fixo.
 * Não grava senha, token, key, sessão do navegador ou payload de rede. */
import { verifyCommercialJourney } from "./verify-commercial-journey.mjs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import { randomUUID, randomBytes, createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const project = "https://zwjrhqqwizjpzmeayrju.supabase.co",
  app = "http://localhost:3002";
if (
  process.env.D2_SUPABASE_STAGING_ACK !== "Geral 1" ||
  process.env.NEXT_PUBLIC_SUPABASE_URL !== project ||
  process.env.LOCAL_DEV_AUTH !== "false"
)
  throw new Error("Destino/modo de staging não confirmado.");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key || !secret) throw new Error("Chaves obrigatórias ausentes.");
const opts = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(project, secret, opts),
  anon = createClient(project, key, opts);
const run = randomUUID(),
  orgA = randomUUID(),
  orgB = randomUUID(),
  users = [],
  clients = [],
  checks = [];
const password = randomBytes(30).toString("base64url");
let lastCheck = "preflight";
let failureCode = null;
let failureReason = null;
let organizationsCreated = false;
let phase = "preflight",
  server,
  browser,
  storagePath,
  storageOwner,
  passed = false;
const automationsSuite = process.env.CRM_GERAL_VERIFY_SUITE === "Automations";
const commercialSuite = process.env.CRM_GERAL_VERIFY_SUITE === "Commercial";
const proposalsSuite = process.env.CRM_GERAL_VERIFY_SUITE === "Proposals";
const forecastSuite = process.env.CRM_GERAL_VERIFY_SUITE === "Forecast";
const b2bSuite = process.env.CRM_GERAL_VERIFY_SUITE === "B2B";
const tagsSuite = process.env.CRM_GERAL_VERIFY_SUITE === "Tags";
const campaignsSuite = process.env.CRM_GERAL_VERIFY_SUITE === "Campaigns";
const dir = campaignsSuite ? ".local-dev/bloco-h" : automationsSuite ? ".local-dev/bloco-g" : proposalsSuite ? ".local-dev/bloco-f" : forecastSuite ? ".local-dev/bloco-e" : b2bSuite ? ".local-dev/bloco-d" : tagsSuite ? ".local-dev/bloco-c" : commercialSuite ? ".local-dev/bloco-b" : ".local-dev/d2";
function requireResult(result, label) {
  lastCheck = label;
  if (result.error) {
    const code = String(result.error.code ?? result.error.status ?? "unknown");
    failureCode = /^[a-zA-Z0-9_]+$/.test(code) ? code : "unknown";
    // Apenas categorias conhecidas; nunca persistir mensagem bruta do SDK.
    const message = String(result.error.message ?? "").toLowerCase();
    failureReason = message.includes("invalid api key")
      ? "invalid_api_key"
      : message.includes("invalid jwt")
        ? "invalid_jwt"
        : message.includes("not allowed") || message.includes("not authorized")
          ? "not_authorized"
          : "unclassified";
    throw Object.assign(new Error(label), { verificationFailure: { check: lastCheck, code: failureCode, reason: failureReason } });
  }
  return result.data;
}
function insist(value, label) {
  lastCheck = label;
  if (!value) throw Object.assign(new Error(label), { verificationFailure: { check: label, code: null, reason: null } });
}
function done(label) {
  checks.push(label);
  process.stdout.write(`D2: ${label}\n`);
}
async function session(role, org) {
  const email = `d2-${run}-${role}-${org === orgA ? "a" : "b"}@example.com`;
  const created = requireResult(
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Pessoa fictícia D2" },
    }),
    "bootstrap Auth",
  );
  users.push(created.user.id);
  requireResult(
    await admin.from("user_organizations").insert({
      user_id: created.user.id,
      organization_id: org,
      role,
      accepted_at: new Date().toISOString(),
    }),
    "membership",
  );
  const client = createClient(project, key, opts);
  clients.push(client);
  requireResult(await client.auth.signInWithPassword({ email, password }), "login real");
  insist(
    requireResult(await client.auth.getUser(), "getUser").user.id === created.user.id,
    "identidade real",
  );
  return { client, id: created.user.id, email };
}
function totp(base32) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of base32.replace(/=+$/, ""))
    bits += alphabet.indexOf(ch.toUpperCase()).toString(2).padStart(5, "0");
  const bytes = Buffer.from(bits.match(/.{8}/g).map((x) => parseInt(x, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", bytes).update(counter).digest(),
    offset = digest.at(-1) & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, "0");
}
await mkdir(dir, { recursive: true });
// O resultado anterior não deve parecer pertencer à execução em andamento.
await writeFile(`${dir}/result.json`, JSON.stringify({
  project: "Geral 1", run, passed: false, phase: "preflight", in_progress: true,
  fixtures_cleaned: false, fixtures_created: false,
}, null, 2));
try {
  try {
    await fetch(app, { signal: AbortSignal.timeout(1000) });
    throw new Error("Porta ocupada");
  } catch (e) {
    if (e.message === "Porta ocupada") throw e;
  }
  requireResult(
    await admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    "chave de servidor/projeto",
  );
  phase = "fixtures";
  requireResult(
    await admin.from("organizations").insert([
      {
        id: orgA,
        slug: `d2-a-${run}`,
        legal_name: "Organização fictícia A",
        display_name: "Organização A — D2",
        onboarded_at: new Date().toISOString(),
        settings: { branding: { app_name: "CRM Geral" }, d2_fixture: run },
      },
      {
        id: orgB,
        slug: `d2-b-${run}`,
        legal_name: "Organização fictícia B",
        display_name: "Organização B — D2",
        onboarded_at: new Date().toISOString(),
        settings: { branding: { app_name: "CRM Geral" }, d2_fixture: run },
      },
    ]),
    "organizações fictícias",
  );
  organizationsCreated = true;
  const a = await session("admin", orgA),
    b = await session("admin", orgB),
    viewer = await session("viewer", orgA),
    agent = await session("agent", orgA);
  // Somente IDs de fixtures próprias, para recuperação após interrupção externa.
  await writeFile(`${dir}/fixture-journal.json`, JSON.stringify({
    project: "Geral 1", run, fixture_organizations: [orgA, orgB],
    fixture_users: users, fixtures_cleaned: false,
  }, null, 2));
  requireResult(await a.client.auth.refreshSession(), "refresh");
  done("Auth real: bootstrap, login, getUser e refresh");
  phase = "rls-rest";
  for (const [client, own, other] of [
    [a.client, orgA, orgB],
    [b.client, orgB, orgA],
  ]) {
    insist(
      requireResult(
        await client.from("organizations").select("id").eq("id", own),
        "leitura própria",
      ).length === 1,
      "tenant próprio",
    );
    insist(
      requireResult(
        await client.from("organizations").select("id").eq("id", other),
        "leitura cruzada",
      ).length === 0,
      "isolamento A/B",
    );
  }
  const anonymousRead = await anon.from("organizations").select("id").in("id", [orgA, orgB]);
  // Helpers das policies não são executáveis por anon. A negação 42501
  // também comprova ausência de acesso; outros erros continuam reprovando.
  insist(
    anonymousRead.error
      ? anonymousRead.error.code === "42501" && anonymousRead.data === null
      : Array.isArray(anonymousRead.data) && anonymousRead.data.length === 0,
    "anon isolado",
  );
  done("REST: leitura própria, isolamento A/B e acesso anônimo negado");
  const template = requireResult(
    await a.client
      .from("message_templates")
      .insert({
        organization_id: orgA,
        title: "Histórico fictício D2",
        body: "Texto fictício preservado",
      })
      .select("id")
      .single(),
    "returning",
  ).id;
  requireResult(
    await b.client
      .from("message_templates")
      .insert({ organization_id: orgB, title: "Resposta fictícia B", body: "Texto B" }),
    "template B",
  );
  requireResult(
    await a.client.rpc("fn_set_capability", {
      p_org: orgA,
      p_capability: "message_templates",
      p_enabled: false,
    }),
    "desativação RPC",
  );
  insist(
    requireResult(
      await a.client.rpc("fn_capability_enabled", { p_org: orgA, p_capability: "unknown" }),
      "desconhecida",
    ) === false,
    "desconhecida fechada",
  );
  insist(
    requireResult(
      await b.client.rpc("fn_capability_enabled", {
        p_org: orgB,
        p_capability: "message_templates",
      }),
      "B habilitada",
    ) === true,
    "A não influencia B",
  );
  insist(
    requireResult(
      await a.client.from("message_templates").select("id").eq("id", template),
      "histórico",
    ).length === 1,
    "histórico preservado",
  );
  insist(
    (
      await a.client
        .from("message_templates")
        .insert({ organization_id: orgA, title: "Bloqueado", body: "Bloqueado" })
    ).error,
    "RLS insert bloqueado",
  );
  insist(
    (
      await viewer.client.rpc("fn_set_capability", {
        p_org: orgA,
        p_capability: "message_templates",
        p_enabled: true,
      })
    ).error,
    "viewer não administra",
  );
  insist(
    (
      await agent.client.rpc("fn_set_capability", {
        p_org: orgA,
        p_capability: "message_templates",
        p_enabled: true,
      })
    ).error,
    "agent não administra",
  );
  insist(
    (
      await a.client.rpc("fn_set_capability", {
        p_org: orgB,
        p_capability: "message_templates",
        p_enabled: false,
      })
    ).error,
    "RPC cross-tenant negada",
  );
  insist(
    (
      await admin.rpc("fn_set_capability", {
        p_org: orgA,
        p_capability: "message_templates",
        p_enabled: true,
      })
    ).error,
    "service role não administra RPC",
  );
  insist(
    (
      await anon.rpc("fn_set_capability", {
        p_org: orgA,
        p_capability: "message_templates",
        p_enabled: true,
      })
    ).error,
    "anon sem EXECUTE",
  );
  requireResult(
    await a.client.rpc("fn_set_capability", {
      p_org: orgA,
      p_capability: "message_templates",
      p_enabled: true,
    }),
    "reativação",
  );
  done("RLS/REST/RPC: A/B, anon, viewer, agent, service role, flags e histórico");
  phase = "storage";
  storagePath = `${orgA}/d2-${run}.txt`;
  storageOwner = a.client;
  requireResult(
    await a.client.storage
      .from("ai-policy")
      .upload(storagePath, Buffer.from("Arquivo fictício D2"), { contentType: "text/plain" }),
    "upload",
  );
  requireResult(
    await a.client.storage.from("ai-policy").download(storagePath),
    "download autorizado",
  );
  insist(
    (await b.client.storage.from("ai-policy").download(storagePath)).error,
    "Storage cross-tenant",
  );
  const signed = requireResult(
    await a.client.storage.from("ai-policy").createSignedUrl(storagePath, 60),
    "signed URL",
  );
  insist((await fetch(signed.signedUrl)).ok, "signed URL real");
  requireResult(await a.client.storage.from("ai-policy").remove([storagePath]), "remoção Storage");
  storagePath = null;
  done("Storage real: upload, leitura, signed URL, cross-tenant e remoção");
  phase = "realtime";
  const contact = requireResult(
    await a.client
      .from("contacts")
      .insert({
        organization_id: orgA,
        name: "Contato fictício D2",
        display_name: "Contato fictício D2",
      })
      .select("id")
      .single(),
    "contato",
  ).id;
  const pipeline = requireResult(
    await admin
      .from("crm_pipelines")
      .insert({
        organization_id: orgA,
        name: "Funil fictício D2",
        slug: `d2-${run}`,
        // A organização já recebe um funil padrão pelo trigger canônico.
        // Esta fixture não deve competir com a unicidade desse padrão.
        is_default: false,
      })
      .select("id")
      .single(),
    "funil",
  ).id;
  const stage = requireResult(
    await admin
      .from("crm_stages")
      .insert({
        organization_id: orgA,
        pipeline_id: pipeline,
        name: "Etapa fictícia",
        slug: "ficticia",
        position: 1,
      })
      .select("id")
      .single(),
    "etapa",
  ).id;
  const lead = requireResult(
    await a.client
      .from("crm_leads")
      .insert({
        organization_id: orgA,
        pipeline_id: pipeline,
        stage_id: stage,
        contact_id: contact,
        title: "Oportunidade fictícia D2",
        owner_user_id: a.id,
        owner_kind: "user",
      })
      .select("id")
      .single(),
    "oportunidade",
  ).id;
  let seenA = 0,
    seenB = 0;
  async function subscribe(client, name, filter, receive) {
    lastCheck = "subscription Realtime";
    // O primeiro join precisa aguardar o JWT, como no bootstrap canônico
    // de lib/supabase/browser.ts; SUBSCRIBED sozinho não comprova identidade.
    const refreshed = requireResult(await client.auth.refreshSession(), "JWT Realtime");
    insist(refreshed.session?.access_token, "sessão Realtime ausente");
    await client.realtime.setAuth(refreshed.session.access_token);
    const channel = client
      .channel(name)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "crm_leads", filter },
        receive,
      );
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("subscription timeout")), 20000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        } else if (status === "CHANNEL_ERROR") {
          clearTimeout(timer);
          reject(new Error("subscription error"));
        }
      });
    });
    return channel;
  }
  const ca = await subscribe(a.client, `d2-a-${run}`, `organization_id=eq.${orgA}`, () => {
    seenA++;
  });
  const cb = await subscribe(b.client, `d2-b-${run}`, `organization_id=eq.${orgA}`, () => {
    seenB++;
  });
  requireResult(
    await a.client
      .from("crm_leads")
      .update({ title: "Oportunidade fictícia D2 atualizada" })
      .eq("organization_id", orgA)
      .eq("id", lead)
      .select("id")
      .single(),
    "atualização Realtime",
  );
  // Join aceito não garante que a réplica já publicou o primeiro evento.
  // Reenvios limitados continuam exigindo UPDATE real e negação de B.
  for (let i = 0; i < 120 && !seenA; i++) {
    if (i === 40 || i === 80) {
      requireResult(await a.client.from("crm_leads").update({ title: `Oportunidade fictícia D2 atualizada ${i}` }).eq("organization_id", orgA).eq("id", lead).select("id").single(), "reenvio Realtime");
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  await new Promise((r) => setTimeout(r, 1500));
  insist(seenA > 0, "Realtime evento autorizado A");
  insist(seenB === 0, "Realtime isolamento B");
  await a.client.removeChannel(ca);
  await b.client.removeChannel(cb);
  done("Realtime real: evento crm_leads e negação cross-tenant");
  phase = "app-visual";
  const env = {
    ...process.env,
    NODE_ENV: "development",
    LOCAL_DEV_AUTH: "false",
    SUPABASE_DB_URL: "",
    AI_GATEWAY_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    OPENAI_API_KEY: "",
    OPENROUTER_API_KEY: "",
    WAHA_API_BASE_URL: "",
    WAHA_API_KEY: "",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    NEXT_PUBLIC_APP_URL: app,
  };
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", "3002"], {
    env,
    windowsHide: true,
    // Não persistir saída bruta do servidor que recebe credenciais.
    stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try {
      ready = (await fetch(`${app}/login`)).ok;
      if (ready) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  insist(ready, "app não iniciou");
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  async function login(person, viewport) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`${app}/login?next=/app/settings/capabilities`, { timeout: 120000 });
    await page.screenshot({ path: `${dir}/login-${viewport.width}.png`, fullPage: true });
    await page.getByLabel("Email", { exact: true }).fill(person.email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/app/settings/capabilities", { timeout: 120000 });
    await page.getByRole("switch", { name: "Respostas rápidas", exact: true }).waitFor();
    return { page, context };
  }
  const desktop = await login(a, { width: 1440, height: 900 });
  await desktop.page.screenshot({ path: `${dir}/capabilities-ready-1440.png`, fullPage: true });
  for (const route of [
    "/app/contacts",
    "/app/kanban",
    "/app/inbox",
    "/app/agenda",
    "/app/settings",
  ]) {
    const response = await desktop.page.goto(app + route, { timeout: 120000 });
    insist(response?.ok() && new URL(desktop.page.url()).pathname === route, `jornada ${route}`);
    insist(
      !(await desktop.page
        .getByText("Application error: a server-side exception has occurred")
        .count()),
      "erro na jornada",
    );
    await desktop.page.screenshot({
      path: `${dir}/journey-${route.split("/").at(-1)}.png`,
      fullPage: true,
    });
  }
  await desktop.page.goto(`${app}/app/settings/capabilities`);
  const toggle = desktop.page.getByRole("switch", { name: "Respostas rápidas", exact: true });
  await toggle.waitFor();
  await toggle.focus();
  insist(await toggle.evaluate((el) => document.activeElement === el), "foco");
  await toggle.press("Space");
  await desktop.page.getByRole("status").filter({ hasText: "Habilitação atualizada" }).waitFor();
  insist(
    (
      await desktop.context.request.post(`${app}/api/v1/message-templates`, {
        data: { title: "Bloqueado", body: "Bloqueado" },
      })
    ).status() === 403,
    "API disabled",
  );
  insist(
    (await desktop.context.request.get(`${app}/api/v1/message-templates?history=1`)).status() ===
      200,
    "API histórica",
  );
  await desktop.page.screenshot({ path: `${dir}/capabilities-disabled-1440.png`, fullPage: true });
  await desktop.page.setViewportSize({ width: 390, height: 844 });
  insist(
    await desktop.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    "overflow",
  );
  await desktop.page.screenshot({ path: `${dir}/capabilities-disabled-390.png`, fullPage: true });
  await toggle.click();
  await desktop.page.getByRole("status").filter({ hasText: "Habilitação atualizada" }).waitFor();
  insist(
    (
      await desktop.context.request.post(`${app}/api/v1/message-templates`, {
        data: { title: "Permitido", body: "Fictício" },
      })
    ).status() === 201,
    "API enabled",
  );
  const mobile = await login(viewer, { width: 390, height: 844 });
  insist(await mobile.page.getByRole("switch", { name: "Respostas rápidas", exact: true }).isDisabled(), "controle viewer");
  insist(
    (
      await mobile.context.request.patch(`${app}/api/v1/settings/capabilities`, {
        data: { capability: "message_templates", enabled: false },
      })
    ).status() === 403,
    "API viewer",
  );
  await mobile.page.screenshot({ path: `${dir}/capabilities-viewer-390.png`, fullPage: true });
  insist(
    (
      await desktop.context.request.post(`${app}/auth/v1/token?grant_type=password`, {
        data: { email: a.email, password },
      })
    ).status() === 404,
    "adapter Auth local ativo",
  );
  done("App contra Geral 1: jornada, API, teclado/foco, 1440x900 e 390x844, viewer");
  if (commercialSuite) {
    phase = "commercial-journey";
    await verifyCommercialJourney({
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
      requireResult,
      insist,
      done,
    });
  }
  let scriptsProof;
  if (automationsSuite) {
    phase = "automations-scripts-journey";
    scriptsProof = await verifyAutomationScripts({admin,a,b,viewer,agent,anon,orgA,orgB,contact,desktop,mobile,app,dir,requireResult,insist,done,getDiagnostic:()=>({check:lastCheck,code:failureCode,reason:failureReason})});
  }
  let tagsProof;
  if (tagsSuite) {
    phase = "tags-journey";
    tagsProof = await verifyTagsFoundation({ admin, a, b, viewer, agent, anon, orgA, orgB, contact, desktop, mobile, app, dir, requireResult, insist, done });
  }
  let b2bProof;
  if (b2bSuite) {
    phase = "b2b-journey";
    b2bProof = await verifyB2BSimple({ admin, a, b, viewer, agent, anon, orgA, orgB, contact, desktop, mobile, app, dir, requireResult, insist, done });
  }
  if (proposalsSuite) {
    phase = "proposals-journey";
    await verifyProposals({admin,a,b,viewer,agent,anon,orgA,orgB,desktop,mobile,app,dir,requireResult,insist,done,getDiagnostic:()=>({check:lastCheck,code:failureCode,reason:failureReason})});
  }
  if (forecastSuite) {
    phase = "forecast-journey";
    await verifyReportingForecast({ admin, a, b, viewer, agent, anon, orgA, orgB, desktop, mobile, app, dir, requireResult, insist, done });
  }
  phase = "mfa";
  const factor = requireResult(
    await a.client.auth.mfa.enroll({ factorType: "totp", friendlyName: `d2-${run}` }),
    "enroll MFA",
  );
  requireResult(
    await a.client.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: totp(factor.totp.secret),
    }),
    "MFA AAL2",
  );
  if (campaignsSuite) {
    requireResult(await a.client.rpc("fn_set_capability", { p_org: orgA, p_capability: "scheduled_campaigns", p_enabled: true }), "H capability AAL2");
  }
  requireResult(await a.client.auth.signOut(), "logout");
  requireResult(
    await a.client.auth.signInWithPassword({ email: a.email, password }),
    "novo login AAL1",
  );
  insist(
    (
      await a.client.rpc("fn_set_capability", {
        p_org: orgA,
        p_capability: "message_templates",
        p_enabled: false,
      })
    ).error,
    "MFA não comprovada bloqueada",
  );
  if (campaignsSuite) {
    const blockedCampaign = await a.client.rpc("fn_campaign_command", {
      p_org: orgA,
      p_action: "create",
      p_data: { name: "Campanha AAL1 fictícia", tag_id: randomUUID(), content: "Não enviar", channel: "whatsapp" },
      p_request: randomUUID(),
    });
    insist(blockedCampaign.error?.code === "42501", "H MFA AAL1 bloqueia campanha");
  }
  if (tagsSuite) {
    insist((await a.client.rpc("fn_crm_tag_manage", { p_org: orgA, p_action: "create", p_name: "Sessão AAL1 bloqueada" })).error?.code === "42501", "C MFA AAL1 catálogo bloqueado");
    insist((await a.client.rpc("fn_crm_tag_assign", { p_org: orgA, p_kind: "contact", p_record: tagsProof.contact_id, p_tag: tagsProof.tag_id, p_assign: true })).error?.code === "42501", "C MFA AAL1 vínculo bloqueado");
  }
  if (b2bSuite) {
    insist((await a.client.rpc("fn_crm_company_manage",{p_org:orgA,p_action:"create",p_data:{name:"AAL1 bloqueada"}})).error?.code==="42501","D MFA AAL1 catálogo bloqueado");
    insist((await a.client.from("contacts").update({company_id:b2bProof.company_id}).eq("organization_id",orgA).eq("id",b2bProof.contact_id)).error?.code==="42501","D MFA AAL1 vínculo bloqueado");
  }
  if (automationsSuite) {
    insist((await a.client.rpc('fn_script_command',{p_org:orgA,p_command:{action:'create',definition:scriptsProof.definition},p_request:randomUUID()})).error?.code==='42501','G MFA AAL1 roteiro bloqueado');
    insist((await a.client.from('automation_rules').update({name:'Regra fictícia AAL1'}).eq('organization_id',orgA).eq('id',scriptsProof.rule_id)).error?.code==='42501','G MFA AAL1 regra bloqueada');
  }
  if (proposalsSuite) insist((await a.client.rpc('fn_proposal_command',{p_org:orgA,p_action:'create',p_data:{title:'MFA fictícia F',currency:'BRL',items:[{description:'Fictício',quantity:'1',unit_price_cents:'1'}]},p_request:randomUUID()})).error?.code==='42501','F MFA AAL1 mutação bloqueada');
  if (proposalsSuite) insist((await a.client.rpc("fn_set_capability",{p_org:orgA,p_capability:"proposals",p_enabled:true})).error?.code==="42501","F MFA AAL1 capability bloqueada");
  // Uma nova janela de TOTP evita rejeição de reuso do código anterior.
  await new Promise((r) => setTimeout(r, 31000 - (Date.now() % 30000)));
  requireResult(
    await a.client.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code: totp(factor.totp.secret),
    }),
    "challenge MFA",
  );
  requireResult(
    await a.client.rpc("fn_set_capability", {
      p_org: orgA,
      p_capability: "message_templates",
      p_enabled: true,
    }),
    "RPC AAL2",
  );
  if (tagsSuite) {
    requireResult(await a.client.rpc("fn_crm_tag_manage", { p_org: orgA, p_action: "create", p_name: "Sessão AAL2 fictícia" }), "C MFA AAL2 catálogo permitido");
    requireResult(await a.client.rpc("fn_crm_tag_assign", { p_org: orgA, p_kind: "contact", p_record: tagsProof.contact_id, p_tag: tagsProof.tag_id, p_assign: true }), "C MFA AAL2 vínculo permitido");
    done("Bloco C: MFA real AAL1 bloqueia catálogo/vínculo e AAL2 permite ambos");
  }
  if (b2bSuite) {
    requireResult(await a.client.rpc("fn_crm_company_manage",{p_org:orgA,p_action:"create",p_data:{name:"Empresa fictícia AAL2"}}),"D MFA AAL2 catálogo");
    requireResult(await a.client.from("contacts").update({company_id:b2bProof.company_id}).eq("organization_id",orgA).eq("id",b2bProof.contact_id).select("id").single(),"D MFA AAL2 vínculo");
    done("Bloco D: MFA real AAL1 bloqueia catálogo/vínculo e AAL2 permite ambos");
  }
  if (proposalsSuite) {
    requireResult(await a.client.rpc("fn_set_capability",{p_org:orgA,p_capability:"proposals",p_enabled:true}),"F MFA AAL2 capability permitida");
    requireResult(await a.client.rpc('fn_proposal_command',{p_org:orgA,p_action:'create',p_data:{title:'MFA fictícia F',currency:'BRL',items:[{description:'Fictício',quantity:'1',unit_price_cents:'1'}]},p_request:randomUUID()}),'F MFA AAL2 mutação permitida');
    done("Bloco F: MFA real AAL1 bloqueia capability/mutação e AAL2 permite ambos");
  }
  if (automationsSuite) {
    requireResult(await a.client.rpc('fn_script_command',{p_org:orgA,p_command:{action:'create',definition:scriptsProof.definition},p_request:randomUUID()}),'G MFA AAL2 roteiro permitido');
    requireResult(await a.client.from('automation_rules').update({name:'Regra fictícia AAL2'}).eq('organization_id',orgA).eq('id',scriptsProof.rule_id).select('id').single(),'G MFA AAL2 regra permitida');
    done('Bloco G: MFA real AAL1 bloqueia roteiro/regra e AAL2 permite ambos');
  }
  if (campaignsSuite) {
    phase = "campaigns-journey";
    await verifyScheduledCampaigns({ admin, a, b, viewer, agent, anon, orgA, orgB, desktop, mobile, app, dir, run, password, mfaSecret: factor.totp.secret, totp, requireResult, insist, done });
  }
  done("MFA real: AAL1 bloqueada e AAL2 permite RPC; logout e novo login");
  passed = true;
} catch (error) {
  if (error?.verificationFailure) {
    lastCheck = error.verificationFailure.check;
    failureCode = error.verificationFailure.code;
    failureReason = error.verificationFailure.reason;
  }
  if (!failureReason && error?.name === "TimeoutError") failureReason = "browser_timeout";
  process.stderr.write(`D2 interrompida na etapa: ${phase}. Nenhuma credencial foi registrada.\n`);
  process.exitCode = 1;
} finally {
  const failedCheck = passed ? null : lastCheck;
  const failedCode = failureCode;
  const failedReason = failureReason;
  await browser?.close();
  if (server)
    await new Promise((r) =>
      spawn("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
        windowsHide: true,
        stdio: "ignore",
      }).on("close", r),
    );
  let cleaned = true;
  try {
    if (storagePath)
      requireResult(
        await storageOwner.storage.from("ai-policy").remove([storagePath]),
        "limpeza Storage",
      );
    for (const client of clients) {
      await client.removeAllChannels();
      requireResult(await client.auth.signOut(), "revogar sessões");
    }
    if (organizationsCreated)
      requireResult(
        await admin.from("organizations").delete().in("id", [orgA, orgB]),
        "limpeza organizações próprias",
      );
    if (organizationsCreated) {
      const remainingOrganizations = requireResult(
        await admin.from("organizations").select("id").in("id", [orgA, orgB]),
        "confirmação independente de organizações",
      );
      insist(remainingOrganizations.length === 0, "organizações fictícias ausentes após limpeza");
    }
    for (const id of users)
      requireResult(await admin.auth.admin.deleteUser(id), "limpeza Auth próprio");
    if (users.length > 0) {
      const remainingUsers = requireResult(await admin.auth.admin.listUsers({ page: 1, perPage: 1000 }), "confirmação independente de usuários");
      insist(!remainingUsers.users.some((user) => users.includes(user.id)), "usuários fictícios ausentes após limpeza");
    }
  } catch {
    cleaned = false;
    process.exitCode = 1;
  }
  await writeFile(
    `${dir}/result.json`,
    JSON.stringify(
      {
        project: "Geral 1",
        run,
        finished_at: new Date().toISOString(),
        passed: passed && cleaned,
        phase,
        last_check: failedCheck ?? lastCheck,
        failure_code: failedCode ?? failureCode,
        failure_reason: failedReason ?? failureReason,
        checks,
        fixtures_cleaned: cleaned,
        fixtures_created: organizationsCreated || users.length > 0,
        ...(!cleaned ? { fixture_organizations: [orgA, orgB], fixture_users: users } : {}),
      },
      null,
      2,
    ),
  );
  await writeFile(`${dir}/fixture-journal.json`, JSON.stringify({
    project: "Geral 1", run, fixture_organizations: [orgA, orgB],
    fixture_users: users, fixtures_cleaned: cleaned,
  }, null, 2));
  process.stdout.write(`Relatório sanitizado: ${dir}/result.json\n`);
}
