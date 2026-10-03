import type { NextRequest } from "next/server";
import { proposalCommand } from "@/lib/proposals/api";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
export async function POST(req: NextRequest) {
  return proposalCommand(req, undefined, "template_create");
}
export async function GET() {
  const a = await requireCapability("proposals", "agent", "history");
  if (!a.ok) return a.response;
  const r = await (
    await createClient()
  )
    .from("crm_proposal_templates")
    .select("*")
    .eq("organization_id", a.org.orgId)
    .order("name")
    .limit(100);
  return r.error ? fail("internal_error", "Não foi possível carregar modelos.", 503) : ok(r.data);
}
