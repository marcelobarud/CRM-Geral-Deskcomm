"use client";
import { useState } from "react";
import { useT } from "@/hooks/i18n/useT";
import { useTags, useTagCommand } from "@/hooks/tags/useTags";
import type { CatalogTag } from "@/lib/tags/types";
import type { TagCommand } from "@/lib/tags/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function TagOperation({
  tag,
  mode,
  close,
}: {
  tag: CatalogTag;
  mode: "rename" | "merge" | "delete" | "color";
  close: () => void;
}) {
  const t = useT();
  const query = useTags(undefined, undefined, tag.id);
  const mutation = useTagCommand();
  const [name, setName] = useState(tag.name);
  const [destination, setDestination] = useState("");
  const [color, setColor] = useState(tag.color ?? "");
  const titles = {
    rename: "Renomear tag",
    merge: "Mesclar tags",
    delete: "Excluir tag do catálogo",
    color: "Alterar cor",
  };
  const impact = query.data?.impact;
  const used = !!impact && (impact.assignments > 0 || impact.configuration_references > 0);
  function confirm() {
    const command: TagCommand =
      mode === "rename"
        ? { action: mode, tag_id: tag.id, name }
        : mode === "merge"
          ? { action: mode, tag_id: tag.id, destination_id: destination }
          : mode === "color"
            ? { action: mode, tag_id: tag.id, color: color || null }
            : { action: mode, tag_id: tag.id };
    mutation.mutate(command, { onSuccess: close });
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(titles[mode])}</DialogTitle>
          <DialogDescription>{tag.name}</DialogDescription>
        </DialogHeader>
        {query.isPending && <p role="status">{t("Conferindo vínculos…")}</p>}
        {query.isError && (
          <div role="alert">
            {t("Não foi possível conferir os vínculos.")}{" "}
            <Button onClick={() => void query.refetch()}>{t("Tentar novamente")}</Button>
          </div>
        )}
        {impact && (
          <p className="text-sm">
            {t("Vínculos em registros")}: {impact.assignments}. {t("Referências em configurações")}:{" "}
            {impact.configuration_references}.
          </p>
        )}
        {mode === "rename" && (
          <div className="space-y-2">
            <label className="block" htmlFor="tag-rename">
              {t("Nome da tag")}
            </label>
            <Input
              id="tag-rename"
              maxLength={40}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}
        {mode === "color" && (
          <div className="space-y-2">
            <label className="block" htmlFor="tag-color">
              {t("Cor opcional")}
            </label>
            <Input
              id="tag-color"
              type="color"
              value={color || "#64748b"}
              onChange={(e) => setColor(e.target.value)}
            />
            <Button variant="outline" onClick={() => setColor("")}>
              {t("Sem cor")}
            </Button>
          </div>
        )}
        {mode === "merge" && (
          <>
            <p className="text-sm">
              {t(
                "Os vínculos serão transferidos para a tag de destino. Referências anteriores continuarão funcionando.",
              )}
            </p>
            <label className="block" htmlFor="tag-destination">
              {t("Tag de destino")}
            </label>
            <select
              id="tag-destination"
              className="h-10 max-w-full rounded-md border border-border bg-background px-2"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">{t("Selecione uma tag")}</option>
              {query.data?.tags
                .filter((v) => v.id !== tag.id)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
            </select>
          </>
        )}
        {mode === "delete" && (
          <p role={used ? "alert" : undefined} className="text-sm">
            {t(
              used
                ? "Esta tag está em uso. Remova os vínculos e referências antes de excluir."
                : "A tag será retirada do catálogo. Esta ação não remove dados dos registros.",
            )}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="text-sm text-error-fg">
            {t("A alteração não foi concluída. Tente novamente.")}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" disabled={mutation.isPending} onClick={close}>
            {t("Cancelar")}
          </Button>
          <Button
            variant={mode === "delete" ? "destructive" : "default"}
            disabled={
              mutation.isPending ||
              !impact ||
              query.isError ||
              (mode === "delete" && used) ||
              (mode === "merge" && !destination) ||
              (mode === "rename" && !name.trim())
            }
            onClick={confirm}
          >
            {mutation.isPending ? t("Salvando…") : t("Confirmar")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function TagsCatalogClient() {
  const t = useT();
  const query = useTags();
  const mutation = useTagCommand();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [operation, setOperation] = useState<{
    tag: CatalogTag;
    mode: "rename" | "merge" | "delete" | "color";
  } | null>(null);
  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold">{t("Catálogo de tags")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Organize contatos, oportunidades e conversas com tags da sua organização.")}
        </p>
      </header>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate({ action: "create", name }, { onSuccess: () => setName("") });
        }}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor="tag-name" className="block text-sm">
            {t("Nome da tag")}
          </label>
          <Input
            id="tag-name"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!name.trim() || mutation.isPending}>
          {t("Criar tag")}
        </Button>
      </form>
      {mutation.isError && (
        <p role="alert" className="text-error-fg">
          {t("A alteração não foi concluída. Tente novamente.")}
        </p>
      )}
      <div>
        <label htmlFor="tag-search" className="block text-sm">
          {t("Buscar tags")}
        </label>
        <Input id="tag-search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {query.isPending && <p role="status">{t("Carregando tags…")}</p>}
      {query.isError && (
        <div role="alert">
          {t("Não foi possível carregar tags.")}{" "}
          <Button variant="outline" onClick={() => void query.refetch()}>
            {t("Tentar novamente")}
          </Button>
        </div>
      )}
      {query.data && !query.data.tags.length && <p>{t("O catálogo ainda não tem tags.")}</p>}
      <ul className="space-y-3">
        {query.data?.tags
          .filter((tag) => tag.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
          .map((tag) => (
            <li
              key={tag.id}
              className="flex min-w-0 flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex min-w-0 items-center gap-2">
                {tag.color && (
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                <span className="font-medium break-words">{tag.name}</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {(["rename", "color", "merge", "delete"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant="outline"
                    size="sm"
                    onClick={() => setOperation({ tag, mode })}
                  >
                    {t(
                      { rename: "Renomear", color: "Cor", merge: "Mesclar", delete: "Excluir" }[
                        mode
                      ],
                    )}
                  </Button>
                ))}
              </div>
            </li>
          ))}
      </ul>
      {query.data &&
        !!query.data.tags.length &&
        !query.data.tags.some((tag) =>
          tag.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
        ) && <p>{t("Nenhuma tag encontrada.")}</p>}
      {operation && <TagOperation {...operation} close={() => setOperation(null)} />}
    </div>
  );
}
