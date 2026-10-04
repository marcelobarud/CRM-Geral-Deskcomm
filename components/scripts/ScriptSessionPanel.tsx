"use client";
import { randomId } from "@/lib/random-id";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCapability } from "@/hooks/capabilities/CapabilitiesProvider";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import type { ScriptDefinition, ScriptSession } from "@/lib/scripts/contracts";
type Definition = { id: string; definition: ScriptDefinition; revision: number };
export type ScriptsData = {
  definitions: Definition[];
  sessions: ScriptSession[];
  can_manage: boolean;
};
export function ScriptSessionPanel({ conversationId }: { conversationId: string }) {
  const t = useT(),
    cap = useCapability("short_scripts");
  const [script, setScript] = useState(""),
    [answer, setAnswer] = useState(""),
    [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const keys = useRef(new Map<string, string>()),
    answerInput = useRef<HTMLInputElement>(null),
    choiceInput = useRef<HTMLSelectElement>(null),
    resumeButton = useRef<HTMLButtonElement>(null),
    completedSummary = useRef<HTMLElement>(null),
    focusPending = useRef(false);
  const { activeOrg } = useAuth();
  const query = useQuery({
    queryKey: ["script-session", activeOrg?.orgId, conversationId],
    queryFn: () =>
      apiClient.get<{ data: ScriptsData }>(
        "/api/v1/scripts?" + new URLSearchParams({ conversation_id: conversationId }),
      ),
    enabled: !!cap?.authorized,
  });
  const sessions = query.data?.data.sessions ?? [],
    current = sessions.find((v) => v.status !== "completed"),
    step = current?.snapshot.steps[current.current_step];
  useEffect(() => {
    if (!focusPending.current) return;
    const target = !current?.id
      ? completedSummary.current
      : current?.status === "interrupted"
        ? resumeButton.current
        : step?.type === "text"
          ? answerInput.current
          : choiceInput.current;
    if (target) {
      target.focus();
      focusPending.current = false;
    }
  }, [current?.id, current?.current_step, current?.status, step?.type]);
  async function command(body: unknown) {
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
      focusPending.current = true;
      await query.refetch();
      setAnswer("");
    } catch {
      setError(
        t(
          "Não foi possível continuar. As respostas foram preservadas. Confira o estado e tente novamente.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  if (!cap?.authorized) return null;
  return (
    <section
      aria-label={t("Roteiro do atendimento")}
      className="min-w-0 space-y-3 rounded-lg border p-3"
    >
      <h2 className="font-semibold">{t("Roteiro do atendimento")}</h2>
      <p className="text-sm text-muted-foreground">
        {t("Respostas coletadas para revisão humana. Não alteram os dados confirmados do CRM.")}
      </p>
      {query.isLoading && <p role="status">{t("Carregando roteiro…")}</p>}
      {(query.isError || error) && (
        <div role="alert">
          <p>{error || t("Não foi possível ler o roteiro.")}</p>
          <Button
            className="h-auto max-w-full py-2 whitespace-normal"
            onClick={() => {
              setError("");
              void query.refetch();
            }}
          >
            {t("Recarregar contexto")}
          </Button>
        </div>
      )}
      {!cap.can_execute && (
        <p role="status">{t("Roteiros desativados. O contexto anterior continua disponível.")}</p>
      )}
      {!current && !query.isLoading && !query.isError && cap.can_execute && (
        <div className="space-y-2">
          <label className="block">
            {t("Roteiro para iniciar")}
            <select
              aria-label={t("Roteiro para iniciar")}
              className="w-full rounded-md border bg-background p-2"
              value={script}
              onChange={(e) => setScript(e.target.value)}
            >
              <option value="">{t("Selecione um roteiro")}</option>
              {query.data?.data.definitions
                .filter((s) => s.definition.is_active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.definition.name}
                  </option>
                ))}
            </select>
          </label>
          <Button
            className="h-auto max-w-full py-2 whitespace-normal"
            disabled={busy || !script}
            onClick={() =>
              void command({ action: "start", script_id: script, conversation_id: conversationId })
            }
          >
            {t("Iniciar roteiro")}
          </Button>
        </div>
      )}
      {current && (
        <div className="space-y-3">
          <h3>{current.snapshot.name}</h3>
          <p role="status">
            {current.status === "interrupted"
              ? t("Interrompido — continuidade humana")
              : t("Em andamento")}{" "}
            · {t("Passo")} {current.current_step + 1}/{current.snapshot.steps.length}
          </p>
          {current.interruption_reason && (
            <p className="break-words">
              {t("Motivo da interrupção")}: {current.interruption_reason}
            </p>
          )}
          {current.status === "running" && step && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void command({
                  action: "answer",
                  id: current.id,
                  expected_revision: current.revision,
                  step_id: step.id,
                  answer: step.type === "confirmation" ? answer === "true" : answer,
                });
              }}
            >
              <label className="block">
                {step.prompt}
                {step.type === "text" ? (
                  <input
                    ref={answerInput}
                    className="w-full rounded-md border bg-background p-2"
                    required
                    maxLength={2000}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                ) : (
                  <select
                    ref={choiceInput}
                    aria-label={step.prompt}
                    className="w-full rounded-md border bg-background p-2"
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  >
                    <option value="">{t("Selecione uma resposta")}</option>
                    {step.type === "choice" ? (
                      step.options.map((o) => <option key={o}>{o}</option>)
                    ) : (
                      <>
                        <option value="true">{t("Sim")}</option>
                        <option value="false">{t("Não")}</option>
                      </>
                    )}
                  </select>
                )}
              </label>
              <Button type="submit" disabled={busy || !cap.can_execute}>
                {current.current_step + 1 === current.snapshot.steps.length
                  ? t("Responder e concluir")
                  : t("Responder e avançar")}
              </Button>
            </form>
          )}
          {current.status === "running" && (
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void command({
                  action: "interrupt",
                  id: current.id,
                  expected_revision: current.revision,
                  reason,
                });
              }}
            >
              <label className="block">
                {t("Motivo para continuar com humano")}
                <input
                  required
                  className="w-full rounded-md border bg-background p-2"
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <Button type="submit" variant="outline" disabled={busy || !cap.can_execute}>
                {t("Interromper e entregar ao humano")}
              </Button>
            </form>
          )}
          {current.status === "interrupted" && (
            <Button
              className="h-auto max-w-full py-2 whitespace-normal"
              disabled={busy || !cap.can_execute}
              ref={resumeButton}
              onClick={() =>
                void command({
                  action: "resume",
                  id: current.id,
                  expected_revision: current.revision,
                })
              }
            >
              {t("Retomar com as respostas preservadas")}
            </Button>
          )}
        </div>
      )}
      {sessions.length === 0 && !query.isLoading && (
        <p>{t("Nenhuma coleta iniciada neste atendimento.")}</p>
      )}
      {sessions.map((s) => (
        <details key={s.id} open={s.status === "completed"}>
          <summary ref={s.id === sessions[0]?.id ? completedSummary : undefined}>
            {s.snapshot.name} —{" "}
            {s.status === "completed" ? t("Concluído") : t("Respostas preservadas")}
          </summary>
          <dl className="space-y-2 text-sm">
            {s.snapshot.steps
              .filter((p) => Object.hasOwn(s.answers, p.id))
              .map((p) => (
                <div key={p.id}>
                  <dt className="font-medium">{p.prompt}</dt>
                  <dd className="break-words">
                    {typeof s.answers[p.id] === "boolean"
                      ? s.answers[p.id]
                        ? t("Sim")
                        : t("Não")
                      : s.answers[p.id]}
                  </dd>
                </div>
              ))}
          </dl>
        </details>
      ))}
    </section>
  );
}
