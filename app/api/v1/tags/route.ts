import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
import { ApiErrorCodes } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { tagCommandSchema, tagReadSchema } from "@/lib/tags/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { observeServiceOrigin } from "@/lib/atendimento/origem";
import { requireSupportWrite } from "@/lib/impersonate/support";
export const dynamic = "force-dynamic";

function dbFailure(code: string | undefined, requestId: string) {
  const status =
    code === "42501"
      ? 403
      : code === "23505" || code === "23503"
        ? 409
        : code === "22023" || code === "23514"
          ? 422
          : 500;
  const error =
    status === 403
      ? ApiErrorCodes.forbidden
      : status === 409
        ? ApiErrorCodes.state_conflict
        : status === 422
          ? ApiErrorCodes.validation_failed
          : ApiErrorCodes.internal_error;
  const message =
    status === 409
      ? "Tag em uso, duplicada ou referência indisponível. Atualize o catálogo e confira os vínculos."
      : status === 403
        ? "Esta sessão não pode alterar tags."
        : status === 422
          ? "Confira o nome e a cor da tag."
          : "Não foi possível concluir. Tente novamente.";
  logger.warn("tags.operation_failed", { request_id: requestId, code: code ?? "unknown" });
  return fail(error, message, status, { requestId });
}
export async function GET(req: NextRequest) {
  const requestId = randomUUID();
  const parsed = tagReadSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return fail(ApiErrorCodes.invalid_request, "Filtro de tags inválido.", 400, { requestId });
  const auth = await requireRole(parsed.data.impact_tag_id ? "admin" : "viewer", {
    requestId,
    resource: "tags",
  });
  if (!auth.ok) return auth.response;
  const db = await createClient();
  const org = auth.org.orgId;
  const q = parsed.data;
  if (q.entity_id && q.entity_kind) {
    const visible = await db.rpc("fn_crm_tag_target_visible", {
      p_org: org,
      p_kind: q.entity_kind,
      p_record: q.entity_id,
    });
    if (visible.error) return dbFailure(visible.error.code, requestId);
    if (!visible.data)
      return fail(ApiErrorCodes.not_found, "Registro indisponível.", 404, { requestId });
  }
  const [catalog, aliases, assignments] = await Promise.all([
    db
      .from("crm_tags")
      .select("id,name,normalized_name,color,created_at,updated_at")
      .eq("organization_id", org)
      .eq("is_archived", false)
      .is("merged_into", null)
      .order("name"),
    db.from("crm_tag_aliases").select("tag_id,normalized_name").eq("organization_id", org),
    q.entity_id && q.entity_kind
      ? db
          .from("crm_tag_assignments")
          .select("tag_id")
          .eq("organization_id", org)
          .eq("entity_kind", q.entity_kind)
          .eq("entity_id", q.entity_id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const error = catalog.error ?? aliases.error ?? assignments.error;
  if (error) return dbFailure(error.code, requestId);
  let impact;
  if (q.impact_tag_id) {
    const result = await db.rpc("fn_crm_tag_impact", { p_org: org, p_tag: q.impact_tag_id });
    if (result.error) return dbFailure(result.error.code, requestId);
    impact = result.data;
  }
  return ok(
    {
      tags: catalog.data ?? [],
      aliases: aliases.data ?? [],
      assigned_ids: (assignments.data ?? []).map((v) => v.tag_id),
      ...(impact ? { impact } : {}),
    },
    { requestId },
  );
}
export async function POST(req: NextRequest) {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const parsed = tagCommandSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return fail(ApiErrorCodes.validation_failed, "Dados de tag inválidos.", 422, { requestId });
  const command = parsed.data;
  const auth = await requireRole(command.action === "assign" ? "agent" : "admin", {
    requestId,
    resource: "tags",
  });
  if (!auth.ok) return auth.response;
  const db = await createClient();
  const org = auth.org.orgId;
  const result =
    command.action === "assign"
      ? await db.rpc("fn_crm_tag_assign", {
          p_org: org,
          p_kind: command.entity_kind,
          p_record: command.entity_id,
          p_tag: command.tag_id,
          p_assign: command.assigned,
        })
      : await db.rpc("fn_crm_tag_manage", {
          p_org: org,
          p_action: command.action,
          ...("tag_id" in command ? { p_tag: command.tag_id } : {}),
          ...("name" in command ? { p_name: command.name } : {}),
          ...("color" in command && command.color != null ? { p_color: command.color } : {}),
          ...("destination_id" in command ? { p_destination: command.destination_id } : {}),
        });
  if (result.error) return dbFailure(result.error.code, requestId);
  if (
    command.action === "assign" &&
    command.assigned &&
    command.entity_kind !== "conversation" &&
    result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data) &&
    result.data.changed === true
  ) {
    const record =
      command.entity_kind === "contact"
        ? await db
            .from("contacts")
            .select("tags")
            .eq("organization_id", org)
            .eq("id", command.entity_id)
            .single()
        : await db
            .from("crm_leads")
            .select("tags,contact_id")
            .eq("organization_id", org)
            .eq("id", command.entity_id)
            .single();
    const tag = await db
      .from("crm_tags")
      .select("name")
      .eq("organization_id", org)
      .eq("id", command.tag_id)
      .single();
    if (record.error || tag.error)
      logger.warn("tags.event_context_failed", { request_id: requestId });
    else {
      const privileged = createAdminClient();
      const contactId =
        command.entity_kind === "contact"
          ? command.entity_id
          : "contact_id" in record.data
            ? (record.data.contact_id as string | null)
            : null;
      const origin = await observeServiceOrigin(privileged, org, contactId);
      const emitted = await privileged.rpc("emit_event", {
        p_organization_id: org,
        p_event_type: command.entity_kind === "contact" ? "contact.tag_added" : "lead.tag_added",
        p_entity_kind: command.entity_kind === "contact" ? "contact" : "crm_lead",
        p_entity_id: command.entity_id,
        p_payload: { added_tags: [tag.data.name], tags: record.data.tags, service_origin: origin },
        p_metadata: { request_id: requestId, actor_user_id: auth.user.id },
      });
      if (emitted.error)
        logger.warn("tags.event_failed", { request_id: requestId, code: emitted.error.code });
    }
  }
  if (
    result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data) &&
    result.data.audit_recorded === false
  )
    logger.warn("tags.audit_failed", { request_id: requestId, organization_id: org });
  return ok(result.data, { requestId });
}
