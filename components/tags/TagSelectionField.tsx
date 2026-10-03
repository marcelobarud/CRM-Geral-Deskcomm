"use client";
import { useId } from "react";
import { useTags } from "@/hooks/tags/useTags";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
/** Antes de existir um registro, envia somente nomes do catálogo à ponte legada. */
export function TagSelectionField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const id = useId();
  const t = useT();
  const query = useTags();
  return (
    <div className="space-y-2">
      <label className="block" htmlFor={id}>
        {t("Tags")}
      </label>
      {query.isPending ? (
        <p role="status">{t("Carregando tags…")}</p>
      ) : query.isError ? (
        <p role="alert">
          {t("Não foi possível carregar tags.")}{" "}
          <Button type="button" onClick={() => void query.refetch()}>
            {t("Tentar novamente")}
          </Button>
        </p>
      ) : (
        <select
          id={id}
          multiple
          className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm"
          value={value}
          onChange={(e) => onChange(Array.from(e.target.selectedOptions, (v) => v.value))}
        >
          {query.data?.tags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
      )}
      {!query.isPending && !query.isError && !query.data?.tags.length && (
        <p className="text-xs text-muted-foreground">{t("O catálogo ainda não tem tags.")}</p>
      )}
    </div>
  );
}
