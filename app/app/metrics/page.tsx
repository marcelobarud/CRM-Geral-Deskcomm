import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { ROLE_RANK } from "@/lib/auth/types";

import { MetricsClient } from "./_components/MetricsClient";
import { CommercialReportPanel } from "@/components/commercial/CommercialReportPanel";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  // spec 13 §6.1: agent vê as próprias (RLS); a comparação por atendente é manager+.
  const canCompare = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;
  // `t` local em vez do hook: esta página é componente de SERVIDOR, e lá o
  // idioma vem resolvido em `user.idioma` (a cadeia pessoa → organização →
  // padrão vive em `lib/auth/server.ts`), sem reler o `locale` cru.
  const idioma = user.idioma;
  const t = (texto: string) => traduzir(texto, idioma);
  const db = await createClient();
  const pipelines = activeOrg ? await db.from("crm_pipelines").select("id,name").eq("organization_id",activeOrg.orgId).eq("is_archived",false).order("position") : null;

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Desempenho")}</h1>
        <p className="text-sm text-muted-foreground">
          {canCompare
            ? t("Atrito, funil e performance por atendente nos últimos 30 dias.")
            : t("Atrito, seu funil e sua performance nos últimos 30 dias.")}
        </p>
      </header>

      <CommercialReportPanel pipelines={pipelines?.data??[]} loadError={!!pipelines?.error}/>
      <MetricsClient canCompare={canCompare} currentUserId={user.id} />
    </div>
  );
}
