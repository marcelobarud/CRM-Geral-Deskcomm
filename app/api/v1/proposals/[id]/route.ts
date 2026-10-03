import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
import { proposalCommand } from "@/lib/proposals/api";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(req: NextRequest, ctx: Context) {
  return proposalCommand(req, (await ctx.params).id, "update");
}
export async function GET(_req: NextRequest, ctx: Context) {
  const auth = await requireCapability("proposals", "agent", "history");
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success)
    return fail("validation_failed", "Identificador inválido.", 422);
  const db = await createClient();
  const r = await db
    .from("crm_proposals")
    .select(
      "*,crm_proposal_items(*),crm_proposal_versions(*),crm_leads(title,contacts(name,email,company_id,crm_companies(name))),contacts(name,email,company_id,crm_companies(name))",
    )
    .eq("organization_id", auth.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (r.error) return fail("internal_error", "Não foi possível carregar a proposta.", 503);
  if (!r.data) return fail("not_found", "Proposta não encontrada.", 404);
  return ok(r.data, { headers: { "Cache-Control": "private, no-store" } });
}
