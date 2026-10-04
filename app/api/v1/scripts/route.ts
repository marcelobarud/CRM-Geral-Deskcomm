import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { ApiErrorCodes } from "@/lib/api/errors";
import { ok, fail } from "@/lib/api/wrappers";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { scriptCommandSchema } from "@/lib/scripts/contracts";
import type { Json } from "@/lib/database.types";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const auth = await requireCapability("short_scripts", "agent", "history");
  if (!auth.ok) return auth.response;
  const query = z
    .strictObject({ conversation_id: z.uuid().optional() })
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!query.success)
    return fail(ApiErrorCodes.invalid_request, "Confira o atendimento selecionado.", 422);
  const db = await createClient(),
    org = auth.org.orgId;
  const definitions = await db
    .from("crm_short_scripts")
    .select("*")
    .eq("organization_id", org)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (definitions.error)
    return fail(ApiErrorCodes.internal_error, "Não foi possível ler os roteiros.", 503);
  const sessions = query.data.conversation_id
    ? await db
        .from("crm_script_sessions")
        .select("*")
        .eq("organization_id", org)
        .eq("conversation_id", query.data.conversation_id)
        .order("created_at", { ascending: false })
        .limit(30)
    : { data: [], error: null };
  if (sessions.error)
    return fail(ApiErrorCodes.internal_error, "Não foi possível ler o contexto do roteiro.", 503);
  return ok({
    definitions: definitions.data,
    sessions: sessions.data,
    can_manage: auth.org.role === "manager" || auth.org.role === "admin",
  });
}
export async function POST(req: NextRequest) {
  const support = await requireSupportWrite();
  if (support) return support;
  const parsed = scriptCommandSchema.safeParse(await req.json().catch(() => null));
  const key = z.uuid().safeParse(req.headers.get("Idempotency-Key"));
  if (!parsed.success || !key.success)
    return fail(ApiErrorCodes.invalid_request, "Confira os dados e a chave da operação.", 422);
  const auth = await requireCapability(
    "short_scripts",
    ["create", "update"].includes(parsed.data.action) ? "manager" : "agent",
  );
  if (!auth.ok) return auth.response;
  const r = await (
    await createClient()
  ).rpc("fn_script_command", {
    p_org: auth.org.orgId,
    p_command: parsed.data as Json,
    p_request: key.data,
  });
  if (r.error)
    return fail(
      r.error.code === "42501"
        ? ApiErrorCodes.forbidden
        : r.error.code === "23505"
          ? ApiErrorCodes.state_conflict
          : ApiErrorCodes.validation_failed,
      r.error.code === "23505"
        ? "O roteiro mudou. Recarregue antes de continuar."
        : "Não foi possível concluir. O contexto foi preservado; confira os dados e tente novamente.",
      r.error.code === "42501" ? 403 : r.error.code === "23505" ? 409 : 422,
      { requestId: randomUUID() },
    );
  return ok(r.data);
}
