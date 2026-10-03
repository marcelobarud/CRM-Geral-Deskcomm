import { z } from "zod";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; version: string }> },
) {
  const a = await requireCapability("proposals", "agent", "history");
  if (!a.ok) return a.response;
  const p = await ctx.params;
  if (!z.uuid().safeParse(p.id).success || !z.uuid().safeParse(p.version).success)
    return fail("validation_failed", "Versão inválida.", 422);
  const db = await createClient();
  const r = await db
    .from("crm_proposal_versions")
    .select("pdf_path,state")
    .eq("organization_id", a.org.orgId)
    .eq("proposal_id", p.id)
    .eq("id", p.version)
    .maybeSingle();
  if (r.error) return fail("internal_error", "Não foi possível consultar o PDF.", 503);
  if (!r.data) return fail("not_found", "PDF enviado não encontrado.", 404);
  const url = await db.storage.from("proposal-documents").createSignedUrl(r.data.pdf_path, 60);
  if (url.error || !url.data)
    return fail("storage_unavailable", "Documento indisponível. Tente novamente.", 503);
  return ok({ url: url.data.signedUrl }, { headers: { "Cache-Control": "private, no-store" } });
}
