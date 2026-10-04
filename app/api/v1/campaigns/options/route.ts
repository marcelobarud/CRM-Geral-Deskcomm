import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireCapability("scheduled_campaigns", "manager", "history");
  if (!auth.ok) return auth.response;
  const db = await createClient();
  const [organization, tags] = await Promise.all([
    db.from("organizations").select("timezone").eq("id", auth.org.orgId).maybeSingle(),
    db.from("crm_tags").select("id,name").eq("organization_id", auth.org.orgId)
      .eq("is_archived", false).is("merged_into", null).order("name"),
  ]);
  if (organization.error || !organization.data || tags.error)
    return fail("internal_error", "Não foi possível carregar público e fuso da organização.", 503);
  return ok({ timezone: organization.data.timezone, tags: tags.data ?? [] }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
