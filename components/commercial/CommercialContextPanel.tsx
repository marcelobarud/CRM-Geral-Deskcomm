"use client";

import { CompanyContactContext } from "@/components/companies/CompanyContactContext";
import { ProposalContextLink } from "@/components/proposals/ProposalContextLink";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { REASON_LABELS } from "@/lib/leads/lost-reasons";
import type { CanonicalLostReason } from "@/lib/schemas/leads";
import { ROTULO_DA_SITUACAO, type SituacaoDoAgendamento } from "@/lib/agenda/tipos";
import { formatCents } from "@/lib/money";
import { apiClient } from "@/lib/api/client";
import type { CommercialContext } from "@/lib/commercial/types";
import { useAuth, usePermission } from "@/hooks/auth/AuthProvider";
import { useDefaultPipeline } from "@/hooks/pipelines/useDefaultPipeline";
import { useTasks } from "@/hooks/tasks/useTasks";
import { useT } from "@/hooks/i18n/useT";
import { NewLeadDialog } from "@/components/kanban/NewLeadDialog";
import { FormularioDeTarefa } from "@/app/app/tasks/_components/FormularioDeTarefa";
import { Button } from "@/components/ui/button";

export function CommercialContextPanel({
  contactId,
  leadId,
  allowActions = true,
}: {
  contactId: string;
  leadId?: string;
  allowActions?: boolean;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const permission = usePermission("inbox.reply");
  const canWrite = permission && allowActions;
  const [completing, setCompleting] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState(false);
  const cache = useQueryClient();
  const key = ["commercial-context", activeOrg?.orgId, contactId];
  const context = useQuery({
    queryKey: key,
    queryFn: async () =>
      (
        await apiClient.get<{ data: CommercialContext }>(
          `/api/v1/contacts/${contactId}/commercial-context`,
        )
      ).data,
    refetchOnWindowFocus: true,
  });
  const pipeline = useDefaultPipeline(canWrite);
  const tasks = useTasks({ contact_id: contactId });
  const [leadOpen, setLeadOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskGeneration, setTaskGeneration] = useState(0);
  const [taskLead, setTaskLead] = useState(leadId ?? "");
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: key });
  };

  if (context.isPending) return <p role="status">{t("Carregando contexto comercial…")}</p>;
  if (context.isError)
    return (
      <div role="alert">
        <p>{t("Não foi possível carregar o contexto comercial.")}</p>
        <Button variant="outline" onClick={() => void context.refetch()}>
          {t("Tentar novamente")}
        </Button>
      </div>
    );
  const data = context.data;
  const visibleLeads = data.leads.filter((lead) => !leadId || lead.id === leadId);
  const visibleTasks = data.tasks.filter((task) => !leadId || task.lead_id === leadId);
  return (
    <section className="space-y-3 rounded-md border p-3" aria-label={t("Contexto comercial")}>
      <h2 className="font-semibold">{t("Contexto comercial")}</h2>
      <div className="flex flex-wrap gap-2">
        {leadId && (
          <Button variant="outline" asChild>
            <Link href={`/app/contacts/${contactId}`}>{t("Ver contato")}</Link>
          </Button>
        )}
        {canWrite && (
          <>
            <Button variant="outline" disabled={!pipeline.data} onClick={() => setLeadOpen(true)}>
              {t("Criar oportunidade")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTaskGeneration((n) => n + 1);
                setTaskOpen(true);
              }}
            >
              {t("Nova tarefa")}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/app/agenda?contato=${contactId}`}>{t("Agendar compromisso")}</Link>
            </Button>
          </>
        )}
      </div>
      {canWrite && pipeline.isError && (
        <p role="alert">{t("Não foi possível carregar o funil padrão.")}</p>
      )}
      {leadId && <CompanyContactContext contactId={contactId} />}
      <ProposalContextLink contactId={contactId} />
      <h3 className="text-sm font-medium">{t("Oportunidades")}</h3>
      {!visibleLeads.length && (
        <p className="text-sm text-text-muted">
          {t("Sem oportunidade. Organize uma tarefa humana antes de avançar o relacionamento.")}
        </p>
      )}
      <ul className="space-y-2">
        {visibleLeads.map((lead) => (
          <li key={lead.id} className="text-sm break-words">
            <Link className="underline" href={`/app/pipelines/${lead.pipeline_id}?lead=${lead.id}`}>
              {lead.title}
            </Link>{" "}
            · {t(lead.status === "won" ? "Ganho" : lead.status === "lost" ? "Perdido" : "Aberto")}
            {lead.value_cents !== null && (
              <span> · {formatCents(lead.value_cents, lead.currency || "BRL")}</span>
            )}
            <p className="text-text-muted">
              {t("Origem")}: {lead.source}
              {lead.lost_reason
                ? ` · ${t(REASON_LABELS[lead.lost_reason as CanonicalLostReason] ?? lead.lost_reason)}`
                : ""}
            </p>
          </li>
        ))}
      </ul>
      <h3 className="text-sm font-medium">{t("Próximo passo humano")}</h3>
      {completionError && (
        <p role="alert">{t("Não foi possível concluir a tarefa. Tente novamente.")}</p>
      )}
      {!visibleTasks.length && (
        <p className="text-sm text-text-muted">{t("Nenhuma tarefa vinculada.")}</p>
      )}
      <ul className="space-y-2">
        {visibleTasks.map((task) => (
          <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {task.title} ·{" "}
              {t(
                task.status === "done"
                  ? "Concluída"
                  : task.status === "cancelled"
                    ? "Cancelada"
                    : task.status === "in_progress"
                      ? "Em andamento"
                      : "Pendente",
              )}
              {task.due_date ? ` · ${new Date(task.due_date).toLocaleString()}` : ""}
            </span>
            {canWrite && !["done", "cancelled"].includes(task.status) && (
              <Button
                variant="outline"
                size="sm"
                disabled={completing !== null}
                onClick={async () => {
                  setCompleting(task.id);
                  setCompletionError(false);
                  try {
                    await tasks.editarTarefa(task.id, { status: "done" });
                    refresh();
                  } catch {
                    setCompletionError(true);
                  } finally {
                    setCompleting(null);
                  }
                }}
              >
                {t("Concluir tarefa")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <h3 className="text-sm font-medium">{t("Compromissos do contato")}</h3>
      <p className="text-xs text-text-muted">
        {t("A agenda pertence ao contato; não é exclusiva desta oportunidade.")}
      </p>
      {!data.appointments.length && <p className="text-sm">{t("Nenhum compromisso vinculado.")}</p>}
      <ul>
        {data.appointments.map((appointment) => (
          <li key={appointment.id} className="text-sm break-words">
            <Link className="underline" href={`/app/agenda?compromisso=${appointment.id}`}>
              {appointment.title}
            </Link>{" "}
            ·{" "}
            {new Date(appointment.starts_at).toLocaleString(undefined, {
              timeZone: appointment.time_zone,
            })}{" "}
            · {appointment.time_zone} ·{" "}
            {t(
              ROTULO_DA_SITUACAO[appointment.status as SituacaoDoAgendamento] ?? appointment.status,
            )}
          </li>
        ))}
      </ul>
      {canWrite && !leadId && (
        <label className="block text-sm">
          {t("Vincular tarefa à oportunidade")}
          <select
            className="mt-1 w-full rounded-md border bg-surface p-2"
            value={taskLead}
            onChange={(e) => setTaskLead(e.target.value)}
          >
            <option value="">{t("Somente ao contato")}</option>
            {data.leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <FormularioDeTarefa
        key={`${taskGeneration}:${taskLead}`}
        aberto={taskOpen}
        aoMudarAbertura={setTaskOpen}
        contactId={contactId}
        leadId={taskLead || null}
        aoSalvar={async (input) => {
          await tasks.criarTarefa(input);
          refresh();
        }}
      />
      {pipeline.data && (
        <NewLeadDialog
          open={leadOpen}
          onOpenChange={setLeadOpen}
          pipelineId={pipeline.data.pipeline.id}
          stages={pipeline.data.stages}
          contactId={contactId}
          onCreated={refresh}
        />
      )}
    </section>
  );
}
