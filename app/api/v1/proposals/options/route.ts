import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { ok, fail } from "@/lib/api/wrappers";
export async function GET() {
  const a = await requireCapability("proposals", "agent");
  if (!a.ok) return a.response;
  const db = await createClient(),
    org = a.org.orgId;
  const [leads, contacts, products] = await Promise.all([
    db
      .from("crm_leads")
      .select("id,title,contact_id")
      .eq("organization_id", org)
      .order("updated_at", { ascending: false })
      .limit(100),
    db
      .from("contacts")
      .select("id,name")
      .eq("organization_id", org)
      .eq("is_anonymized", false)
      .order("name")
      .limit(100),
    db
      .from("catalog_products")
      .select("id,nome,preco_cents,moeda")
      .eq("organization_id", org)
      .eq("ativo", true)
      .order("nome")
      .limit(100),
  ]);
  if (leads.error || contacts.error || products.error)
    return fail("internal_error", "Não foi possível carregar o contexto comercial.", 503);
  return ok({ leads: leads.data, contacts: contacts.data, products: products.data });
}
