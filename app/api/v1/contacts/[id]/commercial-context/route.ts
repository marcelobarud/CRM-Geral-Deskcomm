import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";

export const dynamic = "force-dynamic";

/** Projeção dos registros existentes; não cria timeline ou entidade comercial. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const parsed = z
    .string()
    .uuid()
    .safeParse((await context.params).id);
  if (!parsed.success) return fail("validation_failed", "Contato inválido.", 422, { requestId });
  const id = parsed.data;
  const org = authz.org.orgId;
  const db = await createClient();
  const contact = await db
    .from("contacts")
    .select("id")
    .eq("organization_id", org)
    .eq("id", id)
    .maybeSingle();
  if (contact.error)
    return fail("internal_error", "Não foi possível carregar o contexto comercial.", 503, {
      requestId,
    });
  if (!contact.data) return fail("not_found", "Contato não encontrado.", 404, { requestId });
  const leads = await db
    .from("crm_leads")
    .select(
      "id,title,status,pipeline_id,stage_id,contact_id,owner_user_id,value_cents,currency,source,lost_reason,closed_at",
    )
    .eq("organization_id", org)
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (leads.error)
    return fail("internal_error", "Não foi possível carregar o contexto comercial.", 503, {
      requestId,
    });
  const ids = (leads.data ?? []).map((lead) => lead.id);
  // Consultas separadas usam operadores suportados também pelo adapter local.
  const taskQuery = () =>
    db
      .from("crm_tasks")
      .select(
        "id,organization_id,title,description,due_date,priority,status,lead_id,contact_id,assigned_to,created_by,created_at,updated_at",
      )
      .eq("organization_id", org);
  const [contactTasks, leadTasks, appointments] = await Promise.all([
    taskQuery()
      .eq("contact_id", id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(100),
    ids.length
      ? taskQuery()
          .in("lead_id", ids)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    db
      .from("calendar_appointments")
      .select("id,title,starts_at,ends_at,time_zone,status,owner_user_id,contact_id")
      .eq("organization_id", org)
      .eq("contact_id", id)
      .order("starts_at", { ascending: false })
      .limit(100),
  ]);
  if (contactTasks.error || leadTasks.error || appointments.error)
    return fail("internal_error", "Não foi possível carregar o contexto comercial.", 503, {
      requestId,
    });
  const tasks = [
    ...new Map(
      [...(contactTasks.data ?? []), ...(leadTasks.data ?? [])].map((task) => [task.id, task]),
    ).values(),
  ]
    .sort(
      (a, b) =>
        (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
        a.created_at.localeCompare(b.created_at),
    )
    .slice(0, 100);
  return ok(
    { leads: leads.data ?? [], tasks, appointments: appointments.data ?? [] },
    { requestId, headers: { "Cache-Control": "private, no-store" } },
  );
}
