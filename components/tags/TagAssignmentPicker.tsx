"use client";
import { useId, useState } from "react";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { roleAtLeast } from "@/lib/auth/types";
import { useTags, useTagCommand } from "@/hooks/tags/useTags";
import type { TagKind } from "@/lib/tags/schemas";
import { Button } from "@/components/ui/button";
import { useT } from "@/hooks/i18n/useT";
import { Input } from "@/components/ui/input";
export function TagAssignmentPicker({
  kind,
  entityId,
  disabled = false,
}: {
  kind: TagKind;
  entityId: string;
  disabled?: boolean;
}) {
  const t = useT();
  const id = useId();
  const { activeOrg } = useAuth();
  const query = useTags(kind, entityId);
  const command = useTagCommand();
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const canEdit = !disabled && roleAtLeast(activeOrg?.role, "agent");
  if (query.isPending) return <p role="status">{t("Carregando tags…")}</p>;
  if (query.isError)
    return (
      <div role="alert">
        {t("Não foi possível carregar tags.")}{" "}
        <Button type="button" variant="outline" onClick={() => void query.refetch()}>
          {t("Tentar novamente")}
        </Button>
      </div>
    );
  const data = query.data;
  const assigned = data.tags.filter((v) => data.assigned_ids.includes(v.id));
  const available = data.tags.filter((v) => !data.assigned_ids.includes(v.id));
  const apply = (tagId: string, assigned: boolean) =>
    command.mutate(
      { action: "assign", tag_id: tagId, entity_kind: kind, entity_id: entityId, assigned },
      { onSuccess: () => setSelected("") },
    );
  return (
    <section data-testid={`tags-${kind}`} aria-label={t("Tags")} className="min-w-0 space-y-2">
      <h3 className="text-sm font-medium">{t("Tags")}</h3>
      <div className="flex flex-wrap gap-2">
        {assigned.length ? (
          assigned.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex max-w-full items-center gap-2 rounded-md border border-border px-2 py-1 text-sm"
            >
              {tag.color && (
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: tag.color }}
                />
              )}
              <span className="break-words">{tag.name}</span>
              {canEdit && (
                <button
                  type="button"
                  className="rounded-md px-1 focus-visible:outline-2 focus-visible:outline-ring"
                  aria-label={`${t("Remover tag")} ${tag.name}`}
                  disabled={command.isPending}
                  onClick={() => apply(tag.id, false)}
                >
                  ×
                </button>
              )}
            </span>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">{t("Sem tags.")}</span>
        )}
      </div>
      {canEdit && available.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-full">
            <label htmlFor={`${id}-search`} className="block text-xs">
              {t("Buscar tags")}
            </label>
            <Input
              id={`${id}-search`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelected("");
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor={id} className="block text-xs">
              {t("Selecionar tag")}
            </label>
            <select
              id={id}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={command.isPending}
            >
              <option value="">{t("Selecione uma tag")}</option>
              {available
                .filter((tag) => tag.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
                .map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!selected || command.isPending}
            onClick={() => apply(selected, true)}
          >
            {t("Adicionar tag")}
          </Button>
        </div>
      )}
      {!data.tags.length && (
        <p className="text-xs text-muted-foreground">
          {t("O catálogo ainda não tem tags.")}
          {activeOrg?.role === "admin" && (
            <>
              {" "}
              <a className="underline" href="/app/settings/tenant/tags">
                {t("Gerenciar tags")}
              </a>
            </>
          )}
        </p>
      )}
      {command.isError && (
        <p role="alert" className="text-sm text-error-fg">
          {t("A alteração não foi concluída. Tente novamente.")}
        </p>
      )}
      {command.isPending && (
        <p role="status" className="text-xs">
          {t("Salvando…")}
        </p>
      )}
    </section>
  );
}
