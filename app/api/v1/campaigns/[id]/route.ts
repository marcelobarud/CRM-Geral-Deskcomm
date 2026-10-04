import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { ok, fail } from "@/lib/api/wrappers";
import { campaignScheduleInstant, CampaignLocalTimeError } from "@/lib/campaigns/time";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const noCache = { "Cache-Control": "private, no-store" };
const idSchema = z.uuid();
const mutationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update"), name: z.string().trim().min(1).max(120), tag_id: z.uuid(), content: z.string().trim().min(1).max(2000), channel: z.literal("whatsapp").default("whatsapp") }).strict(),
  z.object({ action: z.literal("schedule"), scheduled_local: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/) }).strict(),
  z.object({ action: z.literal("cancel") }).strict(),
]);

function rpcClient(db: Awaited<ReturnType<typeof createClient>>) {
  return db as unknown as {
    rpc(name: "fn_campaign_command", args: { p_org: string; p_action: string; p_data: Record<string, unknown>; p_request: string }): Promise<{
      data: Record<string, unknown> | null;
      error: { code?: string } | null;
    }>;
  };
}

function failure(code: string | undefined, requestId: string) {
  const status = code === "42501" ? 403 : code === "55000" || code === "23505" ? 409 : code === "P0002" ? 404 : code === "22023" ? 422 : code === "23503" ? 422 : 503;
  return fail(status === 403 ? "forbidden" : status === 409 ? "state_conflict" : status === 404 ? "not_found" : status === 422 ? "validation_failed" : "internal_error",
    status === 403 ? "A sessão ou a capacidade não permite esta ação." : status === 409 ? "A campanha mudou de estado. Atualize a tela e tente novamente." : status === 404 ? "Campanha não encontrada." : status === 422 ? "Confira a tag e o horário da campanha." : "Não foi possível concluir a ação agora.",
    status, { requestId, headers: noCache });
}

export async function GET(req: NextRequest, ctx: Context) {
  const auth = await requireCapability("scheduled_campaigns", "manager", "history");
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return fail("not_found", "Campanha não encontrada.", 404, { headers: noCache });
  const parsed = z.object({ page: z.coerce.number().int().min(0).max(100000).default(0), status: z.enum(["pending","ready","skipped","cancelled"]).optional() }).strict()
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return fail("validation_failed", "Filtro inválido.", 422, { headers: noCache });
  const db = await createClient();
  const campaign = await db.from("crm_scheduled_campaigns")
    .select("*,crm_tags(name)").eq("organization_id", auth.org.orgId).eq("id", id).maybeSingle();
  if (campaign.error) return fail("internal_error", "Não foi possível carregar a campanha.", 503, { headers: noCache });
  if (!campaign.data) return fail("not_found", "Campanha não encontrada.", 404, { headers: noCache });
  const [counts, page] = await Promise.all([
    db.rpc("fn_campaign_counts", { p_org: auth.org.orgId, p_campaigns: [id] }),
    (() => {
      let query = db.from("crm_scheduled_campaign_recipients")
        .select("id,contact_id,status,reason_code,updated_at,contacts(name)", { count: "exact" })
        .eq("organization_id", auth.org.orgId).eq("campaign_id", id).order("created_at").order("id")
        .range(parsed.data.page * 25, parsed.data.page * 25 + 24);
      if (parsed.data.status) query = query.eq("status", parsed.data.status);
      return query;
    })(),
  ]);
  if (counts.error || page.error) return fail("internal_error", "Não foi possível carregar os destinatários.", 503, { headers: noCache });
  return ok({
    campaign: campaign.data,
    counts: counts.data?.[0] ?? { total_count: 0, pending_count: 0, ready_count: 0, skipped_count: 0, cancelled_count: 0 },
    recipients: page.data ?? [],
    recipients_meta: { page: parsed.data.page, has_more: (page.data?.length ?? 0) === 25 && (page.count ?? 0) > (parsed.data.page + 1) * 25, total: page.count ?? 0 },
  }, { headers: noCache });
}

export async function PATCH(req: NextRequest, ctx: Context) {
  const requestId = z.uuid().safeParse(req.headers.get("Idempotency-Key")).success ? req.headers.get("Idempotency-Key")! : randomUUID();
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return fail("not_found", "Campanha não encontrada.", 404, { requestId, headers: noCache });
  const parsed = mutationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", "Confira os dados da campanha.", 422, { requestId, headers: noCache });
  const auth = await requireCapability("scheduled_campaigns", "manager", parsed.data.action === "cancel" ? "history" : "execute");
  if (!auth.ok) return auth.response;
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const db = await createClient();
  let data: Record<string, unknown>;
  if (parsed.data.action === "schedule") {
    const organization = await db.from("organizations").select("timezone").eq("id", auth.org.orgId).maybeSingle();
    if (organization.error || !organization.data) return fail("internal_error", "Não foi possível consultar o fuso da organização.", 503, { requestId, headers: noCache });
    let instant: Date;
    try {
      instant = campaignScheduleInstant(parsed.data.scheduled_local, organization.data.timezone);
    } catch (error) {
      const code = error instanceof CampaignLocalTimeError ? error.code : "invalid";
      return fail("validation_failed", code === "nonexistent" ? "Esse horário não existe no fuso da organização. Escolha outro." : code === "timezone" ? "O fuso da organização está inválido; revise as configurações." : "Informe uma data e hora válidas.", 422, { requestId, headers: noCache });
    }
    data = { id, scheduled_at: instant.toISOString() };
  } else if (parsed.data.action === "update") {
    data = { id, name: parsed.data.name, tag_id: parsed.data.tag_id, content: parsed.data.content, channel: parsed.data.channel };
  } else {
    data = { id };
  }
  const { data: result, error } = await rpcClient(db).rpc("fn_campaign_command", {
    p_org: auth.org.orgId,
    p_action: parsed.data.action,
    p_data: data,
    p_request: requestId,
  });
  if (error || !result) return failure(error?.code, requestId);
  return ok(result, { requestId, headers: noCache });
}
