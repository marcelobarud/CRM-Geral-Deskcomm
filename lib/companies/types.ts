import type { Database } from "@/lib/database.types";
export type Company = Database["public"]["Tables"]["crm_companies"]["Row"];
export type CompanyCatalog = {
  companies: Company[];
  total: number;
  page: number;
  has_more: boolean;
  contact_company_id?: string | null;
  contact_counts: Record<string, number>;
  contacts: { id: string; name: string | null; display_name: string | null }[];
  leads: { id: string; title: string; pipeline_id: string; contact_id: string | null }[];
};
