"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useCompanies } from "@/hooks/companies/useCompanies";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
export function CompaniesClient() {
  const t = useT(),
    router = useRouter(),
    { activeOrg, user } = useAuth(),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [creating, setCreating] = useState(false),
    q = useCompanies({ search, page });
  const admin = activeOrg?.role === "admin" && user.support?.access_mode !== "support_readonly";
  return (
    <main className="min-w-0 space-y-4 p-6">
      <h1 className="text-2xl font-semibold">{t("Empresas")}</h1>
      {admin && <Button onClick={() => setCreating(true)}>{t("Nova empresa")}</Button>}
      {creating && (
        <CompanyForm
          onSaved={(id) => router.push("/app/companies/" + id)}
          onCancel={() => setCreating(false)}
        />
      )}
      <label className="block text-sm">
        {t("Buscar empresas")}
        <input
          className="mt-1 w-full rounded-md border p-2"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </label>
      {q.isPending ? (
        <p role="status">{t("Carregando empresas…")}</p>
      ) : q.isError ? (
        <div role="alert">
          {t("Não foi possível carregar empresas.")}
          <Button onClick={() => void q.refetch()}>{t("Tentar novamente")}</Button>
        </div>
      ) : (
        <>
          {!q.data.companies.length && (
            <p>{t(search ? "Nenhuma empresa encontrada." : "Nenhuma empresa cadastrada.")}</p>
          )}
          <ul className="space-y-3">
            {q.data.companies.map((c) => (
              <li key={c.id} className="space-y-1 rounded-md border p-4 break-words">
                <Link className="font-medium underline" href={"/app/companies/" + c.id}>
                  {c.name}
                </Link>
                {c.document && (
                  <p>
                    {c.document_type}: {c.document}
                  </p>
                )}
                <p>{[c.city, c.state].filter(Boolean).join(" / ")}</p>
                <p>
                  {t("Contatos vinculados")}: {q.data.contact_counts[c.id] ?? 0}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              {t("Anterior")}
            </Button>
            <Button
              variant="outline"
              disabled={!q.data.has_more}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("Próxima")}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
