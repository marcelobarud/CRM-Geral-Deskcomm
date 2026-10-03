import type { Database } from "@/lib/database.types";
export type CatalogTag = Pick<
  Database["public"]["Tables"]["crm_tags"]["Row"],
  "id" | "name" | "normalized_name" | "color" | "created_at" | "updated_at"
>;
export type TagCatalog = {
  tags: CatalogTag[];
  aliases: Pick<
    Database["public"]["Tables"]["crm_tag_aliases"]["Row"],
    "tag_id" | "normalized_name"
  >[];
  assigned_ids: string[];
  impact?: { assignments: number; configuration_references: number };
};
