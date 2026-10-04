"use client";
import { randomId } from "@/lib/random-id";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useRef, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useCapability } from "@/hooks/capabilities/CapabilitiesProvider";
import { useT } from "@/hooks/i18n/useT";
import { Button } from "@/components/ui/button";
import {
  scriptDefinitionSchema,
  type ScriptDefinition,
  type ScriptStep,
} from "@/lib/scripts/contracts";
import { ScriptSessionPanel, type ScriptsData } from "./ScriptSessionPanel";
const newStep = (): ScriptStep => ({ id: randomId(), type: "text", prompt: "" });
export function ScriptsWorkspace({ conversationId }: { conversationId?: string }) {
  const t = useT(),
    cap = useCapability("short_scripts");
  const { activeOrg } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["short-scripts", activeOrg?.orgId],
    queryFn: () => apiClient.get<{ data: ScriptsData }>("/api/v1/scripts"),
    enabled: !!cap?.authorized,
  });
  const [editing, setEditing] = useState<{
      id?: string;
      revision?: number;
      definition: ScriptDefinition;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const keys = useRef(new Map<string, string>()),
    nameRef = useRef<HTMLInputElement>(null);
  const manager = !!query.data?.data.can_manage,
    rows = query.data?.data.definitions ?? [];
  async function save() {
    if (!editing) return;
    const parsed = scriptDefinitionSchema.safeParse(editing.definition);
    if (!parsed.success) {
      setError(
        t("Preencha o nome e as perguntas. As escolhas precisam de duas a seis opções diferentes."),
      );
      return;
    }
    const body = editing.id
      ? {
          action: "update",
          id: editing.id,
          expected_revision: editing.revision,
          definition: parsed.data,
        }
      : { action: "create", definition: parsed.data };
    const serialized = JSON.stringify(body);
    let key = keys.current.get(serialized);
    if (!key) {
      key = randomId();
      keys.current.set(serialized, key);
    }
    setBusy(true);
    setError("");
    try {
      await apiClient.post("/api/v1/scripts", body, { idempotencyKey: key });
      await Promise.all([
        query.refetch(),
        queryClient.invalidateQueries({ queryKey: ["script-session", activeOrg?.orgId] }),
      ]);
      setEditing(null);
    } catch {
      setError(
        t(
          "Não foi possível salvar. Recarregue para conferir a versão; seu rascunho foi preservado.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  function patchStep(index: number, step: ScriptStep) {
    setEditing((e) =>
      e
        ? {
            ...e,
            definition: {
              ...e.definition,
              steps: e.definition.steps.map((s, i) => (i === index ? step : s)),
            },
          }
        : e,
    );
  }
  function move(index: number, offset: number) {
    setEditing((e) => {
      if (!e) return e;
      const steps = [...e.definition.steps],
        current = steps[index],
        next = steps[index + offset];
      if (!current || !next) return e;
      steps[index] = next;
      steps[index + offset] = current;
      return { ...e, definition: { ...e.definition, steps } };
    });
  }
  return (
    <main className="mx-auto max-w-4xl min-w-0 space-y-4 p-4">
      <h1 className="text-2xl font-semibold">{t("Roteiros curtos")}</h1>
      <p>
        {t(
          "Perguntas em sequência para continuar o atendimento com contexto. Sem atualizar o cadastro automaticamente.",
        )}
      </p>
      <Link href="/app/inbox" className="underline">
        {t("Abrir atendimento")}
      </Link>
      {!cap?.can_execute && <p role="status">{cap?.reason || t("Carregando disponibilidade…")}</p>}
      {query.isLoading && <p role="status">{t("Carregando roteiros…")}</p>}
      {(query.isError || error) && (
        <div role="alert">
          {error || t("Não foi possível ler os roteiros.")}{" "}
          <Button onClick={() => void query.refetch()}>{t("Recarregar")}</Button>
        </div>
      )}
      {manager && (
        <Button
          disabled={!cap?.can_execute}
          onClick={() => {
            setEditing({
              definition: { name: "", description: "", is_active: false, steps: [newStep()] },
            });
            setError("");
            setTimeout(() => nameRef.current?.focus(), 0);
          }}
        >
          {t("Novo roteiro")}
        </Button>
      )}
      {!query.isLoading && !rows.length && !query.isError && (
        <p>{t("Nenhum roteiro cadastrado. Um gerente pode configurar a primeira coleta.")}</p>
      )}
      <ul className="space-y-3">
        {rows.map((s) => (
          <li key={s.id} className="rounded-lg border p-3">
            <h2 className="font-semibold">{s.definition.name}</h2>
            <p className="break-words">{s.definition.description}</p>
            <p>
              {s.definition.is_active ? t("Ativo") : t("Desativado")} · {s.definition.steps.length}{" "}
              {t("passos")}
            </p>
            {manager && (
              <Button
                variant="outline"
                disabled={!cap?.can_execute}
                onClick={() => {
                  setEditing({ id: s.id, revision: s.revision, definition: s.definition });
                  setError("");
                  setTimeout(() => nameRef.current?.focus(), 0);
                }}
              >
                {t("Editar roteiro")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {editing && (
        <form
          className="space-y-4 rounded-lg border p-4"
          aria-label={t("Editar roteiro curto")}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label className="block">
            {t("Nome do roteiro")}
            <input
              ref={nameRef}
              required
              maxLength={160}
              className="w-full rounded-md border bg-background p-2"
              value={editing.definition.name}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  definition: { ...editing.definition, name: e.target.value },
                })
              }
            />
          </label>
          <label className="block">
            {t("Descrição do roteiro")}
            <textarea
              maxLength={1000}
              className="w-full rounded-md border bg-background p-2"
              value={editing.definition.description}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  definition: { ...editing.definition, description: e.target.value },
                })
              }
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={editing.definition.is_active}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  definition: { ...editing.definition, is_active: e.target.checked },
                })
              }
            />
            {t("Ativar roteiro")}
          </label>
          <p>{t("Sessões já iniciadas continuam com a versão original das perguntas.")}</p>
          {editing.definition.steps.map((s, i) => (
            <fieldset key={s.id} className="space-y-2 rounded-md border p-3">
              <legend>
                {t("Passo")} {i + 1}
              </legend>
              <label className="block">
                {t("Tipo de pergunta")}
                <select
                  aria-label={t("Tipo de pergunta")}
                  className="w-full rounded-md border bg-background p-2"
                  value={s.type}
                  onChange={(e) =>
                    patchStep(
                      i,
                      e.target.value === "choice"
                        ? { id: s.id, prompt: s.prompt, type: "choice", options: ["", ""] }
                        : {
                            id: s.id,
                            prompt: s.prompt,
                            type: e.target.value as "text" | "confirmation",
                          },
                    )
                  }
                >
                  <option value="text">{t("Texto")}</option>
                  <option value="choice">{t("Escolha")}</option>
                  <option value="confirmation">{t("Confirmação")}</option>
                </select>
              </label>
              <label className="block">
                {t("Pergunta")}
                <input
                  required
                  maxLength={500}
                  className="w-full rounded-md border bg-background p-2"
                  value={s.prompt}
                  onChange={(e) => patchStep(i, { ...s, prompt: e.target.value })}
                />
              </label>
              {s.type === "choice" && (
                <label className="block">
                  {t("Opções, uma por linha")}
                  <textarea
                    className="w-full rounded-md border bg-background p-2"
                    value={s.options.join("\n")}
                    onChange={(e) => patchStep(i, { ...s, options: e.target.value.split("\n") })}
                  />
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={i === 0}
                  aria-label={`${t("Mover passo para cima")} ${i + 1}`}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={i === editing.definition.steps.length - 1}
                  aria-label={`${t("Mover passo para baixo")} ${i + 1}`}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={editing.definition.steps.length === 1}
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          "Remover esta pergunta do rascunho? Sessões anteriores serão preservadas.",
                        ),
                      )
                    )
                      setEditing({
                        ...editing,
                        definition: {
                          ...editing.definition,
                          steps: editing.definition.steps.filter((p) => p.id !== s.id),
                        },
                      });
                  }}
                >
                  {t("Remover passo")}
                </Button>
              </div>
            </fieldset>
          ))}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={editing.definition.steps.length >= 12}
              onClick={() =>
                setEditing({
                  ...editing,
                  definition: {
                    ...editing.definition,
                    steps: [...editing.definition.steps, newStep()],
                  },
                })
              }
            >
              {t("Adicionar passo")}
            </Button>
            <Button type="submit" disabled={busy || !cap?.can_execute}>
              {busy ? t("Salvando…") : t("Salvar roteiro")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              {t("Cancelar")}
            </Button>
          </div>
        </form>
      )}
      {conversationId && (
        <ScriptSessionPanel key={conversationId} conversationId={conversationId} />
      )}
    </main>
  );
}
