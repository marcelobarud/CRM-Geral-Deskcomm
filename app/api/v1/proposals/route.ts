import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
import { proposalCommand } from "@/lib/proposals/api";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  return proposalCommand(req);
}
export async function GET(req: NextRequest) {
  const auth = await requireCapability("proposals", "agent", "history");
  if (!auth.ok) return auth.response;
  const parsed = z
    .object({
      search: z.string().max(100).optional(),
      page: z.coerce.number().int().min(0).max(100000).default(0),
      lead_id: z.uuid().optional(),
      contact_id: z.uuid().optional(),
    })
    .strict()
    .safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return fail("validation_failed", "Filtros inválidos.", 422);
  const db = await createClient(),
    q = parsed.data;
  let query = db
    .from("crm_proposals")
    .select(
      "*,crm_proposal_items(description,unit_price_cents,quantity),crm_proposal_versions(version_number,state),crm_leads(title,contacts(name,company_id,crm_companies(name))),contacts(name,company_id,crm_companies(name))",
    )
    .eq("organization_id", auth.org.orgId)
    .order("updated_at", { ascending: false })
    .order("id")
    .range(q.page * 20, q.page * 20 + 20);
  if (q.search) query = query.ilike("title", "%" + q.search.replace(/[%_]/g, "") + "%");
  if (q.lead_id) query = query.eq("lead_id", q.lead_id);
  if (q.contact_id) {
    const related = await db
      .from("crm_leads")
      .select("id")
      .eq("organization_id", auth.org.orgId)
      .eq("contact_id", q.contact_id);
    if (related.error)
      return fail("internal_error", "Não foi possível consultar vínculos comerciais.", 503);
    const ids = related.data.map((l) => l.id);
    query = ids.length
      ? query.or("contact_id.eq." + q.contact_id + ",lead_id.in.(" + ids.join(",") + ")")
      : query.eq("contact_id", q.contact_id);
  }
  const r = await query;
  if (r.error) return fail("internal_error", "Não foi possível carregar propostas.", 503);
  return ok(r.data.slice(0, 20), {
    meta: { has_more: r.data.length > 20, page: q.page },
    headers: { "Cache-Control": "private, no-store" },
  });
}
