import { normalizeTagName } from "./schemas";
import type { TagCatalog, CatalogTag } from "./types";
/** Strings são projeção de compatibilidade; a interface deduplica por identidade. */
export function presentTags(raw: readonly string[], catalog: TagCatalog): CatalogTag[] {
  const normalized = new Set(raw.map(normalizeTagName));
  const ids = new Set(
    catalog.aliases
      .filter((v) => v.normalized_name !== null && normalized.has(v.normalized_name))
      .map((v) => v.tag_id),
  );
  return catalog.tags.filter(
    (v) => ids.has(v.id) || (v.normalized_name !== null && normalized.has(v.normalized_name)),
  );
}
