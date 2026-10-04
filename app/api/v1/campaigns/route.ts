import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { ok, fail } from "@/lib/api/wrappers";

export const dynamic = "force-dynamic";
const noCache = { "Cache-Control": "private, no-store" };
const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  tag_id: z.uuid(),
  content: z.string().trim().min(1).max(2000),
  channel: z.literal("whatsapp").default("whatsapp"),
}).strict();

function commandClient(db: Awaited<ReturnType<typeof createClient>>) {
  return db as unknown as {
    rpc(name: "fn_campaign_command", args: { p_org: string; p_action: string; p_data: Record<string, unknown>; p_request: string }): Promise<{
      data: Record<string, unknown> | null;
      error: { code?: string } | null;
    }>;
  };
}

function commandFailure(code: string | undefined, requestId: string) {
  const status = code === "42501" ? 403 : code === "55000" || code === "23505" ? 409 : code === "P0002" ? 404 : code === "22023" ? 422 : code === "23503" ? 422 : 503;
  const message = status === 403 ? "A sessão ou a capacidade não permite esta ação."
    : status === 409 ? "A campanha mudou de estado. Atualize a tela e tente novamente."
    : status === 404 ? "Campanha ou organização não encontrada."
    : status === 422 ? "Confira os dados, a tag e o horário da campanha."
    : "Não foi possível salvar a campanha agora.";
  return fail(status === 403 ? "forbidden" : status === 409 ? "state_conflict" : status === 404 ? "not_found" : status === 422 ? "validation_failed" : "internal_error", message, status, { requestId, headers: noCache });
}

export async function GET(req: NextRequest) {
  const auth = await requireCapability("scheduled_campaigns", "manager", "history");
  if (!auth.ok) return auth.response;
  const query = z.object({ page: z.coerce.number().int().min(0).max(100000).default(0) }).strict()
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success) return fail("validation_failed", "Página inválida.", 422, { headers: noCache });
  const db = await createClient();
  const { data, error } = await db.from("crm_scheduled_campaigns")
    .select("id,name,channel,status,tag_id,timezone,scheduled_at,prepared_at,cancelled_at,error_code,created_at,crm_tags(name)")
    .eq("organization_id", auth.org.orgId).order("created_at", { ascending: false }).order("id")
    .range(query.data.page * 20, query.data.page * 20 + 20);
  if (error) return fail("internal_error", "Não foi possível carregar as campanhas.", 503, { headers: noCache });
  const rows = data.slice(0, 20);
  const counts = rows.length ? await db.rpc("fn_campaign_counts", {
    p_org: auth.org.orgId,
    p_campaigns: rows.map((campaign) => campaign.id),
  }) : { data: [], error: null };
  if (counts.error) return fail("internal_error", "Não foi possível carregar os totais das campanhas.", 503, { headers: noCache });
  const countRows = (counts.data ?? []) as Array<{
    campaign_id: string;
    total_count: number;
    pending_count: number;
    ready_count: number;
    skipped_count: number;
    cancelled_count: number;
  }>;
  const byId = new Map(countRows.map((entry) => [entry.campaign_id, entry]));
  return ok(rows.map((campaign) => ({
    ...campaign,
    counts: byId.get(campaign.id) ?? { total_count: 0, pending_count: 0, ready_count: 0, skipped_count: 0, cancelled_count: 0 },
  })), { meta: { has_more: data.length > 20, page: query.data.page }, headers: noCache });
}

export async function POST(req: NextRequest) {
  const auth = await requireCapability("scheduled_campaigns", "manager");
  if (!auth.ok) return auth.response;
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = z.uuid().safeParse(req.headers.get("Idempotency-Key")).success
    ? req.headers.get("Idempotency-Key")!
    : randomUUID();
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", "Confira o nome, o público e o conteúdo.", 422, { requestId, headers: noCache });
  const db = await createClient();
  const { data, error } = await commandClient(db).rpc("fn_campaign_command", {
    p_org: auth.org.orgId,
    p_action: "create",
    p_data: parsed.data,
    p_request: requestId,
  });
  if (error || !data) return commandFailure(error?.code, requestId);
  return ok(data, { status: 201, requestId, headers: noCache });
}
