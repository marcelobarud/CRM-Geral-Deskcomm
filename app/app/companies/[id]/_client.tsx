"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useCompanies, useCompanyCommand } from "@/hooks/companies/useCompanies";
import { CompanyForm, COMPANY_FIELDS } from "@/components/companies/CompanyForm";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
export function CompanyDetailClient({ id }: { id: string }) {
  const t = useT(),
    router = useRouter(),
    { activeOrg, user } = useAuth(),
    q = useCompanies({ company_id: id }),
    command = useCompanyCommand(),
    [editing, setEditing] = useState(false),
    [archive, setArchive] = useState(false);
  const admin = activeOrg?.role === "admin" && user.support?.access_mode !== "support_readonly";
  if (q.isPending)
    return (
      <p role="status" className="p-6">
        {t("Carregando empresa…")}
      </p>
    );
  if (q.isError || !q.data?.companies[0])
    return (
      <div role="alert" className="p-6">
        {t("Não foi possível carregar empresas.")}
        <Button onClick={() => void q.refetch()}>{t("Tentar novamente")}</Button>
      </div>
    );
  const c = q.data.companies[0],
    contacts = q.data.contacts,
    leads = q.data.leads;
  return (
    <main className="min-w-0 space-y-4 p-6">
      <Link className="underline" href="/app/companies">
        {t("Empresas")}
      </Link>
      <h1 className="text-2xl font-semibold break-words">{c.name}</h1>
      {c.is_archived && <p>{t("Empresa arquivada.")}</p>}
      {admin && !c.is_archived && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            {t("Editar empresa")}
          </Button>
          <Button variant="outline" onClick={() => setArchive(true)}>
            {t("Arquivar empresa")}
          </Button>
        </div>
      )}
      {editing ? (
        <CompanyForm
          company={c}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <dl className="space-y-2 break-words">
          {COMPANY_FIELDS.filter(([key]) => key !== "name")
            .filter(([key]) => c[key])
            .map(([key, label]) => (
              <div key={key}>
                <dt className="text-sm text-text-muted">{t(label)}</dt>
                <dd className="whitespace-pre-wrap">{c[key]}</dd>
              </div>
            ))}
        </dl>
      )}
      <h2 className="font-medium">{t("Contatos vinculados")}</h2>
      {!contacts.length && <p>{t("Nenhum contato vinculado.")}</p>}
      <ul>
        {contacts.map((v) => (
          <li key={v.id}>
            <Link className="break-words underline" href={"/app/contacts/" + v.id}>
              {v.display_name ?? v.name ?? t("Sem nome")}
            </Link>
          </li>
        ))}
      </ul>
      <h2 className="font-medium">{t("Oportunidades dos contatos")}</h2>
      {!leads.length && <p>{t("Nenhuma oportunidade relacionada.")}</p>}
      <ul>
        {leads.map((v) => (
          <li key={v.id}>
            <Link
              className="break-words underline"
              href={`/app/pipelines/${v.pipeline_id}?lead=${v.id}`}
            >
              {v.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm text-text-muted">
        {t("Consulte atividades e histórico na ficha de cada contato.")}
      </p>
      <Dialog open={archive} onOpenChange={setArchive}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Arquivar empresa")}</DialogTitle>
            <DialogDescription>
              {t("O cadastro será arquivado. Contatos e histórico não serão apagados.")}
            </DialogDescription>
          </DialogHeader>
          <p>
            {t("Contatos vinculados")}: {contacts.length}
          </p>
          {contacts.length > 0 && (
            <p role="alert">{t("Remova ou troque os vínculos antes de arquivar.")}</p>
          )}
          {command.isError && (
            <p role="alert">{t("Não foi possível salvar. Confira os dados e tente novamente.")}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchive(false)}>
              {t("Cancelar")}
            </Button>
            <Button
              disabled={!!contacts.length || command.isPending}
              onClick={async () => {
                const result = await command
                  .mutateAsync({ action: "archive", company_id: id })
                  .catch(() => null);
                if (result) router.push("/app/companies");
              }}
            >
              {t("Confirmar arquivamento")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
