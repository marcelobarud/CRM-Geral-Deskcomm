"use client";
import { useState } from "react";
import { useCompanyCommand } from "@/hooks/companies/useCompanies";
import { useT } from "@/hooks/i18n/useT";
import type { Company } from "@/lib/companies/types";
import { companyDataSchema } from "@/lib/companies/schemas";
import { Button } from "@/components/ui/button";
const fields = [
  ["name", "Nome da empresa"],
  ["legal_name", "Razão social"],
  ["document_type", "Tipo de documento"],
  ["document", "Documento"],
  ["email", "Email"],
  ["phone", "Telefone"],
  ["website", "Site"],
  ["address", "Endereço"],
  ["city", "Cidade"],
  ["state", "Estado"],
  ["country", "País"],
  ["notes", "Observações"],
] as const;
export function CompanyForm({
  company,
  onSaved,
  onCancel,
}: {
  company?: Company;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const t = useT(),
    command = useCompanyCommand(),
    [invalid, setInvalid] = useState(false);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const values = Object.fromEntries(new FormData(e.currentTarget));
        const normalized = Object.fromEntries(
          Object.entries(values).map(([k, v]) => [k, v === "" && k !== "name" ? null : v]),
        );
        const parsed = companyDataSchema.safeParse(normalized);
        setInvalid(!parsed.success);
        if (!parsed.success) return;
        const result = await command
          .mutateAsync(
            company
              ? { action: "edit", company_id: company.id, data: parsed.data }
              : { action: "create", data: parsed.data },
          )
          .catch(() => null);
        if (result?.data.company_id) onSaved(result.data.company_id);
      }}
    >
      {fields.map(([key, label]) => (
        <label key={key} className="block text-sm">
          {t(label)}
          {key === "notes" ? (
            <textarea
              name={key}
              defaultValue={company?.[key] ?? ""}
              maxLength={4000}
              className="mt-1 w-full rounded-md border p-2"
            />
          ) : (
            <input
              name={key}
              required={key === "name"}
              maxLength={
                key === "address" ? 300 : key === "name" || key === "legal_name" ? 200 : 100
              }
              type={key === "email" ? "email" : key === "website" ? "url" : "text"}
              defaultValue={company?.[key] ?? ""}
              className="mt-1 w-full rounded-md border p-2"
            />
          )}
        </label>
      ))}
      <p className="text-sm text-text-muted">
        {t(
          "Documento e tipo são opcionais; preencha os dois juntos. Telefone no formato +5511999998888.",
        )}
      </p>
      {(invalid || command.isError) && (
        <p role="alert">{t("Não foi possível salvar. Confira os dados e tente novamente.")}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={command.isPending}>
          {t("Salvar empresa")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("Cancelar")}
        </Button>
      </div>
    </form>
  );
}
