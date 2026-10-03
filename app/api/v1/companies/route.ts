import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
import { ApiErrorCodes } from "@/lib/api/errors";
import { logger } from "@/lib/logger";
import { companyCommandSchema, companyReadSchema } from "@/lib/companies/schemas";
export const dynamic = "force-dynamic";
function failure(code: string | undefined, id: string) {
  const status =
    code === "42501"
      ? 403
      : code === "23503" || code === "23505"
        ? 409
        : code === "22023" || code === "23514" || code === "23502"
          ? 422
          : 500;
  logger.warn("companies.operation_failed", { request_id: id, code: code ?? "unknown" });
  return fail(
    status === 403
      ? ApiErrorCodes.forbidden
      : status === 409
        ? ApiErrorCodes.state_conflict
        : status === 422
          ? ApiErrorCodes.validation_failed
          : ApiErrorCodes.internal_error,
    status === 409
      ? "Empresa em uso, documento duplicado ou vínculo indisponível."
      : status === 403
        ? "Esta sessão não pode alterar empresas."
        : "Não foi possível concluir. Confira os dados e tente novamente.",
    status,
    { requestId: id },
  );
}
export async function GET(req: NextRequest) {
  const requestId = randomUUID(),
    parsed = companyReadSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success)
    return fail(ApiErrorCodes.invalid_request, "Filtro de empresas inválido.", 400, { requestId });
  const auth = await requireRole("viewer", { requestId, resource: "companies" });
  if (!auth.ok) return auth.response;
  const db = await createClient(),
    org = auth.org.orgId,
    q = parsed.data;
  let contact_company_id: string | null | undefined;
  if (q.contact_id) {
    const contact = await db
      .from("contacts")
      .select("company_id")
      .eq("organization_id", org)
      .eq("id", q.contact_id)
      .single();
    if (contact.error)
      return fail(ApiErrorCodes.not_found, "Contato indisponível.", 404, { requestId });
    contact_company_id = contact.data.company_id;
  }
  let query = db.from("crm_companies").select("*", { count: "exact" }).eq("organization_id", org);
  if (q.company_id) query = query.eq("id", q.company_id);
  else query = query.eq("is_archived", false);
  if (q.search) query = query.ilike("name", "%" + q.search.replace(/[%_\\]/g, "\\$&") + "%");
  const companies = await query
    .order("name")
    .order("id")
    .range((q.page - 1) * q.limit, q.page * q.limit - 1);
  if (companies.error) return failure(companies.error.code, requestId);
  if (q.company_id && !companies.data.length)
    return fail(ApiErrorCodes.not_found, "Empresa indisponível.", 404, { requestId });
  const ids = companies.data.map((c) => c.id);
  // Pagina todos os contatos visíveis; não confunde limite REST com quantidade total.
  const contacts: {
    id: string;
    name: string | null;
    display_name: string | null;
    company_id: string | null;
  }[] = [];
  if (ids.length)
    for (let offset = 0; ; offset += 500) {
      const batch = await db
        .from("contacts")
        .select("id,name,display_name,company_id")
        .eq("organization_id", org)
        .in("company_id", ids)
        .is("is_merged_into", null)
        .order("id")
        .range(offset, offset + 499);
      if (batch.error) return failure(batch.error.code, requestId);
      contacts.push(...batch.data);
      if (batch.data.length < 500) break;
    }
  const contact_counts: Record<string, number> = {};
  for (const c of contacts)
    if (c.company_id) contact_counts[c.company_id] = (contact_counts[c.company_id] ?? 0) + 1;
  const leads: { id: string; title: string; pipeline_id: string; contact_id: string | null }[] = [];
  if (q.company_id && contacts.length)
    for (let group = 0; group < contacts.length; group += 100)
      for (let offset = 0; ; offset += 500) {
        const batch = await db
          .from("crm_leads")
          .select("id,title,pipeline_id,contact_id")
          .eq("organization_id", org)
          .in(
            "contact_id",
            contacts.slice(group, group + 100).map((c) => c.id),
          )
          .order("id")
          .range(offset, offset + 499);
        if (batch.error) return failure(batch.error.code, requestId);
        leads.push(...batch.data);
        if (batch.data.length < 500) break;
      }
  return ok(
    {
      companies: companies.data,
      total: companies.count ?? 0,
      page: q.page,
      has_more: q.page * q.limit < (companies.count ?? 0),
      contact_company_id,
      contact_counts,
      contacts: q.company_id ? contacts : [],
      leads,
    },
    { requestId },
  );
}
export async function POST(req: NextRequest) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const requestId = randomUUID(),
    parsed = companyCommandSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return fail(ApiErrorCodes.validation_failed, "Dados empresariais inválidos.", 422, {
      requestId,
    });
  const c = parsed.data,
    auth = await requireRole(c.action === "link" ? "agent" : "admin", {
      requestId,
      resource: "companies",
    });
  if (!auth.ok) return auth.response;
  const db = await createClient(),
    org = auth.org.orgId;
  if (c.action === "link") {
    const result = await db
      .from("contacts")
      .update({ company_id: c.company_id })
      .eq("organization_id", org)
      .eq("id", c.contact_id)
      .eq("is_anonymized", false)
      .is("is_merged_into", null)
      .select("id,company_id")
      .single();
    if (result.error) return failure(result.error.code, requestId);
    return ok(result.data, { requestId });
  }
  const requestKey = req.headers.get("Idempotency-Key");
  if (
    requestKey &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestKey)
  )
    return fail(ApiErrorCodes.validation_failed, "Chave de repetição inválida.", 422, {
      requestId,
    });
  const result = await db.rpc("fn_crm_company_command", {
    p_request: requestKey ?? requestId,
    p_org: org,
    p_action: c.action,
    ...("company_id" in c ? { p_company: c.company_id } : {}),
    ...("data" in c ? { p_data: c.data } : {}),
  });
  if (result.error) return failure(result.error.code, requestId);
  if (
    result.data &&
    typeof result.data === "object" &&
    !Array.isArray(result.data) &&
    result.data.audit_recorded === false
  )
    logger.warn("companies.audit_failed", { request_id: requestId, organization_id: org });
  return ok(result.data, { requestId });
}
