import { createAdminClient } from "@/lib/supabase/admin";
/** Exceção explícita: saúde de bucket privado, sem leitura de documentos/dados de tenant. */
export async function proposalReadiness() {
  try {
    const { data, error } = await createAdminClient().storage.getBucket("proposal-documents");
    if (error) return { configured: String(error.status ?? "") !== "404", healthy: false };
    return { configured: !!data, healthy: !!data && !data.public };
  } catch {
    return { configured: true, healthy: false };
  }
}
