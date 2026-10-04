import { z } from "zod";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireCapability("scheduled_campaigns", "manager");
  if (!auth.ok) return auth.response;
  const parsed = z.object({ tag_id: z.uuid() }).strict().safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return fail("validation_failed", "Selecione uma tag válida.", 422);
  const db = await createClient();
  const tag = await db.from("crm_tags").select("id").eq("organization_id", auth.org.orgId).eq("id", parsed.data.tag_id)
    .eq("is_archived", false).is("merged_into", null).maybeSingle();
  if (tag.error) return fail("internal_error", "Não foi possível consultar o público.", 503);
  if (!tag.data) return fail("not_found", "A tag não está disponível nesta organização.", 404);
  const assignments = await db.from("crm_tag_assignments").select("entity_id", { count: "exact", head: true })
    .eq("organization_id", auth.org.orgId).eq("tag_id", parsed.data.tag_id).eq("entity_kind", "contact");
  if (assignments.error) return fail("internal_error", "Não foi possível estimar o público.", 503);
  return ok({ estimated_count: assignments.count ?? 0 }, { headers: { "Cache-Control": "private, no-store" } });
}
