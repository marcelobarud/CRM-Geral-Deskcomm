import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
import { commercialQuerySchema } from "@/lib/reports/commercial";
import { logger } from "@/lib/logger";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const requestId = randomUUID(),
    auth = await requireRole("agent", { requestId, resource: "reports" });
  if (!auth.ok) return auth.response;
  const parsed = commercialQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return fail("validation_failed", "Período ou filtros inválidos.", 422, { requestId });
  const q = parsed.data,
    db = await createClient();
  const { data, error } = await db.rpc("fn_crm_commercial_report", {
    p_org: auth.org.orgId,
    p_from: q.from + "T00:00:00Z",
    p_to: q.to + "T00:00:00Z",
    p_pipeline: q.pipeline_id,
    p_owner: q.owner_user_id,
    p_source: q.source,
  });
  if (error) {
    logger.warn("commercial_report_failed", {
      requestId,
      organizationId: auth.org.orgId,
      code: error.code,
    });
    return fail(
      error.code === "42501" ? "forbidden" : "internal_error",
      "Não foi possível carregar o relatório comercial.",
      error.code === "42501" ? 403 : 500,
      { requestId },
    );
  }
  if (!data)
    return fail("internal_error", "Não foi possível carregar o relatório comercial.", 500, {
      requestId,
    });
  return ok({ ...(data as object), window: { from: q.from, to: q.to } }, { requestId });
}
