"use client";
import { useState } from "react";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useTasks } from "@/hooks/tasks/useTasks";
import { useT } from "@/hooks/i18n/useT";
import { FormularioDeTarefa } from "@/app/app/tasks/_components/FormularioDeTarefa";
import { Button } from "@/components/ui/button";

/** Oportunidade sem contato ainda pode exigir uma ação humana. */
export function OpportunityTasks({ leadId }: { leadId: string }) {
  const t = useT();
  const canWrite = usePermission("inbox.reply");
  const tasks = useTasks({ lead_id: leadId });
  const [open, setOpen] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section className="space-y-3 rounded-md border p-3" aria-label={t("Próximo passo humano")}>
      <h2 className="font-semibold">{t("Próximo passo humano")}</h2>
      {tasks.carregando ? (
        <p role="status">{t("Carregando…")}</p>
      ) : tasks.falhou ? (
        <div role="alert">
          <p>{t("Não foi possível carregar as tarefas.")}</p>
          <Button variant="outline" onClick={() => void tasks.recarregar()}>
            {t("Tentar novamente")}
          </Button>
        </div>
      ) : (
        <>
          {!tasks.tarefas.length && <p>{t("Nenhuma tarefa vinculada.")}</p>}
          <ul className="space-y-2">
            {tasks.tarefas.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  {task.title} ·{" "}
                  {t(
                    task.status === "done"
                      ? "Concluída"
                      : task.status === "in_progress"
                        ? "Em andamento"
                        : task.status === "cancelled"
                          ? "Cancelada"
                          : "Pendente",
                  )}
                </span>
                {canWrite && !["done", "cancelled"].includes(task.status) && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setFailed(false);
                      try {
                        await tasks.editarTarefa(task.id, { status: "done" });
                      } catch {
                        setFailed(true);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t("Concluir tarefa")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {failed && <p role="alert">{t("Não foi possível concluir a tarefa. Tente novamente.")}</p>}
      {canWrite && (
        <Button
          variant="outline"
          onClick={() => {
            setGeneration((n) => n + 1);
            setOpen(true);
          }}
        >
          {t("Nova tarefa")}
        </Button>
      )}
      <FormularioDeTarefa
        key={generation}
        aberto={open}
        aoMudarAbertura={setOpen}
        leadId={leadId}
        aoSalvar={async (input) => {
          await tasks.criarTarefa(input);
        }}
      />
    </section>
  );
}
