import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeTagName } from "./schemas";
/** Única identidade por nome/alias; nenhum escritor de contexto cria catálogo. */
export async function loadTagCompatibility(db: SupabaseClient, organizationId: string) {
  const [tags, aliases] = await Promise.all([
    db
      .from("crm_tags")
      .select("id,name,normalized_name")
      .eq("organization_id", organizationId)
      .eq("is_archived", false)
      .is("merged_into", null),
    db
      .from("crm_tag_aliases")
      .select("tag_id,normalized_name")
      .eq("organization_id", organizationId),
  ]);
  if (tags.error || aliases.error) throw new Error("tag_catalog_unavailable");
  const names = new Map<string, string>();
  const identities = new Map<string, string>();
  for (const tag of tags.data ?? []) {
    names.set(tag.id, tag.name);
    identities.set(tag.normalized_name, tag.id);
  }
  for (const alias of aliases.data ?? [])
    if (names.has(alias.tag_id)) identities.set(alias.normalized_name, alias.tag_id);
  return {
    resolve(values: readonly string[]) {
      return [
        ...new Set(
          values.map((value) => {
            const id = identities.get(normalizeTagName(value));
            if (!id) throw new Error("tag_catalog_required");
            return id;
          }),
        ),
      ].map((id) => ({ id, name: names.get(id)! }));
    },
  };
}
