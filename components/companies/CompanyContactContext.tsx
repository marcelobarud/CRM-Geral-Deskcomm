"use client";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useCompanies, useCompanyCommand } from "@/hooks/companies/useCompanies";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
export function CompanyContactContext({
  contactId,
  editable = false,
}: {
  contactId: string;
  editable?: boolean;
}) {
  const t = useT(),
    { activeOrg, user } = useAuth(),
    [search, setSearch] = useState(""),
    [choice, setChoice] = useState(""),
    [quick, setQuick] = useState("");
  const q = useCompanies({ contact_id: contactId, search }),
    command = useCompanyCommand();
  const currentId = q.data?.contact_company_id;
  const current = useCompanies(currentId ? { company_id: currentId } : { contact_id: contactId });
  const company = currentId ? current.data?.companies.find((c) => c.id === currentId) : null;
  const canWrite =
    editable &&
    !!activeOrg &&
    activeOrg.role !== "viewer" &&
    user.support?.access_mode !== "support_readonly";
  if (q.isPending) return <p role="status">{t("Carregando empresa…")}</p>;
  if (q.isError || current.isError)
    return (
      <div role="alert">
        {t("Não foi possível carregar empresas.")}
        <Button
          onClick={() => {
            void q.refetch();
            void current.refetch();
          }}
        >
          {t("Tentar novamente")}
        </Button>
      </div>
    );
  return (
    <section aria-label={t("Empresa")} className="min-w-0 space-y-2">
      <h3 className="text-sm font-medium">{t("Empresa")}</h3>
      {company ? (
        <Link className="break-words underline" href={"/app/companies/" + company.id}>
          {company.name}
        </Link>
      ) : (
        <p className="text-sm text-text-muted">{t("Nenhuma empresa vinculada.")}</p>
      )}
      {canWrite && (
        <>
          <label className="block text-sm">
            {t("Buscar empresa")}
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            {t("Selecionar empresa")}
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
            >
              <option value="">{t("Selecione uma empresa")}</option>
              {q.data?.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {!q.data?.companies.length && <p>{t("Nenhuma empresa encontrada.")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!choice || command.isPending}
              onClick={() =>
                command.mutate({ action: "link", contact_id: contactId, company_id: choice })
              }
            >
              {t("Vincular empresa")}
            </Button>
            <Button
              variant="outline"
              disabled={!currentId || command.isPending}
              onClick={() =>
                command.mutate({ action: "link", contact_id: contactId, company_id: null })
              }
            >
              {t("Remover vínculo")}
            </Button>
          </div>
          {activeOrg?.role === "admin" && (
            <div className="space-y-2">
              <label className="block text-sm">
                {t("Nome da nova empresa")}
                <input
                  maxLength={200}
                  className="mt-1 w-full rounded-md border p-2"
                  value={quick}
                  onChange={(e) => setQuick(e.target.value)}
                />
              </label>
              <Button
                variant="outline"
                disabled={!quick.trim() || command.isPending}
                onClick={async () => {
                  const result = await command
                    .mutateAsync({ action: "create", data: { name: quick.trim() } })
                    .catch(() => null);
                  if (result?.data.company_id) {
                    setChoice(result.data.company_id);
                    setQuick("");
                    await command
                      .mutateAsync({
                        action: "link",
                        contact_id: contactId,
                        company_id: result.data.company_id,
                      })
                      .catch(() => null);
                  }
                }}
              >
                {t("Criar e vincular empresa")}
              </Button>
            </div>
          )}
        </>
      )}
      {command.isError && (
        <p role="alert">{t("Não foi possível salvar. Confira os dados e tente novamente.")}</p>
      )}
    </section>
  );
}
