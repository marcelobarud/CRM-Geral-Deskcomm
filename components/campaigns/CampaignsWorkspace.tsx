"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCapability } from "@/hooks/capabilities/CapabilitiesProvider";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { apiClient } from "@/lib/api/client";
import { ROLE_RANK } from "@/lib/auth/types";
import { randomId } from "@/lib/random-id";

type CampaignCounts = {
  total_count: number;
  pending_count: number;
  ready_count: number;
  skipped_count: number;
  cancelled_count: number;
};
type Campaign = {
  id: string;
  name: string;
  channel: string;
  status: string;
  tag_id: string;
  timezone: string;
  scheduled_at: string | null;
  prepared_at: string | null;
  cancelled_at: string | null;
  error_code: string | null;
  created_at: string;
  crm_tags: { name: string } | null;
  counts: CampaignCounts;
};
type CampaignDetail = Omit<Campaign, "counts"> & { content: string };
type Tag = { id: string; name: string };
type Recipient = {
  id: string;
  contact_id: string | null;
  status: string;
  reason_code: string | null;
  updated_at: string;
  contacts: { name: string | null } | null;
};
type DetailResponse = {
  data: {
    campaign: CampaignDetail;
    counts: CampaignCounts;
    recipients: Recipient[];
    recipients_meta: { page: number; has_more: boolean; total: number };
  };
};
type CampaignsResponse = { data: Campaign[]; meta: { has_more: boolean; page: number } };
type OptionsResponse = { data: { timezone: string; tags: Tag[] } };
type AudienceResponse = { data: { estimated_count: number } };

const STATUS: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  preparing: "Preparando público",
  prepared: "Público preparado — envio não homologado",
  cancelled: "Cancelada",
  failed: "Falha no preparo",
};
const RECIPIENT_STATUS: Record<string, string> = {
  pending: "Aguardando preparo",
  ready: "Elegível para envio futuro",
  skipped: "Ignorado",
  cancelled: "Cancelado",
};
const REASON: Record<string, string> = {
  opted_out: "Contato recusou comunicações de marketing",
  contact_blocked: "Contato bloqueado",
  requires_human: "Atendimento exige acompanhamento humano",
  contact_anonymized: "Contato anonimizado",
  contact_merged: "Contato mesclado",
  contact_removed: "Contato removido",
  invalid_recipient: "Telefone fora do padrão E.164",
  marketing_consent_required: "Base legal de marketing não comprovada",
  capability_disabled: "Capacidade desativada",
  preparation_failed: "Falha técnica no preparo",
  cancelled: "Campanha cancelada",
};

function formatInstant(value: string | null, timezone: string, locale: string) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export function CampaignsWorkspace() {
  const t = useT();
  const locale = useTagDeIdioma();
  const { activeOrg } = useAuth();
  const capability = useCapability("scheduled_campaigns");
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, string>());
  const draftRequestKey = useRef<string | null>(null);
  const keyFor = (identity: unknown) => {
    const key = JSON.stringify(identity);
    let id = keys.current.get(key);
    if (!id) {
      id = randomId();
      keys.current.set(key, id);
    }
    return id;
  };
  const manager = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;
  const canOperate = !!capability?.can_execute && manager;
  const canCancel = !!capability?.authorized && manager;
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [recipientStatus, setRecipientStatus] = useState("");
  const [recipientPage, setRecipientPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [name, setName] = useState("");
  const [tagId, setTagId] = useState("");
  const [content, setContent] = useState("");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["scheduled-campaigns", activeOrg?.orgId, page],
    enabled: manager,
    queryFn: () => apiClient.get<CampaignsResponse>(`/api/v1/campaigns?page=${page}`),
    refetchInterval: (query) =>
      query.state.data?.data.some((campaign) => ["scheduled", "preparing"].includes(campaign.status))
        ? 20_000
        : false,
  });
  const options = useQuery({
    queryKey: ["scheduled-campaign-options", activeOrg?.orgId],
    enabled: manager,
    queryFn: () => apiClient.get<OptionsResponse>("/api/v1/campaigns/options"),
    staleTime: 60_000,
  });
  const detail = useQuery({
    queryKey: ["scheduled-campaign", activeOrg?.orgId, selected, recipientStatus, recipientPage],
    enabled: manager && !!selected,
    queryFn: () => apiClient.get<DetailResponse>(
      `/api/v1/campaigns/${selected}?${new URLSearchParams({ page: String(recipientPage), ...(recipientStatus ? { status: recipientStatus } : {}) })}`,
    ),
    refetchInterval: (query) => ["scheduled", "preparing"].includes(query.state.data?.data.campaign.status ?? "") ? 20_000 : false,
  });
  const audience = useQuery({
    queryKey: ["scheduled-campaign-audience", activeOrg?.orgId, tagId],
    enabled: canOperate && !!tagId,
    queryFn: () => apiClient.get<AudienceResponse>(`/api/v1/campaigns/audience?tag_id=${encodeURIComponent(tagId)}`),
  });

  const campaign = detail.data?.data.campaign;
  const tags = options.data?.data.tags ?? [];
  const audienceText = audience.isLoading
    ? t("Calculando público…")
    : `${t("Estimativa no momento:")} ${audience.data?.data.estimated_count ?? 0} ${t("contatos")}`;

  function resetForm() {
    setName(""); setTagId(""); setContent(""); setScheduledLocal("");
    setCreating(false); setReviewing(false); setEditing(false); setSelected(null); setDraftId(null); setError("");
    draftRequestKey.current = null;
  }

  function beginCreate() {
    resetForm();
    draftRequestKey.current = randomId();
    setCreating(true);
  }

  async function refresh(campaignId: string | null = selected) {
    const invalidations = [
      queryClient.invalidateQueries({ queryKey: ["scheduled-campaigns", activeOrg?.orgId] }),
    ];
    if (campaignId) {
      invalidations.push(
        queryClient.invalidateQueries({
          queryKey: ["scheduled-campaign", activeOrg?.orgId, campaignId],
          refetchType: "all",
        }),
      );
    }
    await Promise.all(invalidations);
  }

  async function act(run: () => Promise<void>) {
    setBusy(true); setError("");
    try { await run(); } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Não foi possível concluir. Tente novamente."));
    } finally { setBusy(false); }
  }

  async function createAndSchedule() {
    await act(async () => {
      const createBody = { name, tag_id: tagId, content, channel: "whatsapp" as const };
      let id = draftId;
      if (!id) {
        const created = await apiClient.post<{ data: CampaignDetail }>("/api/v1/campaigns", createBody, {
          headers: { "Idempotency-Key": draftRequestKey.current ?? randomId() },
        });
        id = created.data.id;
        setDraftId(id);
      } else {
        const updateBody = { action: "update", ...createBody };
        await apiClient.patch(`/api/v1/campaigns/${id}`, updateBody, {
          headers: { "Idempotency-Key": keyFor({ id, updateBody }) },
        });
      }
      setSelected(id);
      const scheduleBody = { action: "schedule", scheduled_local: scheduledLocal };
      await apiClient.patch(`/api/v1/campaigns/${id}`, scheduleBody, {
        headers: { "Idempotency-Key": keyFor({ id, scheduleBody }) },
      });
      setCreating(false); setReviewing(false); setDraftId(null); draftRequestKey.current = null;
      await refresh(id);
    });
  }

  async function saveDraft() {
    await act(async () => {
      const body = { name, tag_id: tagId, content, channel: "whatsapp" as const };
      let id = draftId;
      if (id) {
        await apiClient.patch(`/api/v1/campaigns/${id}`, { action: "update", ...body }, {
          headers: { "Idempotency-Key": keyFor({ id, body }) },
        });
      } else {
        const created = await apiClient.post<{ data: CampaignDetail }>("/api/v1/campaigns", body, {
          headers: { "Idempotency-Key": draftRequestKey.current ?? randomId() },
        });
        id = created.data.id;
      }
      setCreating(false); setReviewing(false); setEditing(false); setDraftId(null);
      draftRequestKey.current = null;
      setSelected(id);
      await refresh(id);
    });
  }

  function beginScheduleDraft(value: CampaignDetail) {
    setName(value.name);
    setTagId(value.tag_id);
    setContent(value.content);
    setScheduledLocal("");
    setDraftId(value.id);
    setCreating(true);
    setReviewing(false);
    setEditing(false);
    setSelected(null);
    setError("");
  }

  async function saveEdit() {
    if (!campaign) return;
    await act(async () => {
      const body = { action: "update", name, tag_id: tagId, content, channel: "whatsapp" as const };
      await apiClient.patch(`/api/v1/campaigns/${campaign.id}`, body, {
        headers: { "Idempotency-Key": keyFor({ id: campaign.id, body }) },
      });
      setEditing(false); await refresh();
    });
  }

  async function cancelCampaign() {
    if (!campaign) return;
    await act(async () => {
      const body = { action: "cancel" };
      await apiClient.patch(`/api/v1/campaigns/${campaign.id}`, body, {
        headers: { "Idempotency-Key": keyFor({ id: campaign.id, body }) },
      });
      setConfirmCancel(false); await refresh();
    });
  }

  if (!manager) return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-semibold">{t("Campanhas")}</h1><p role="status" className="mt-3">{t("Esta área é destinada a gerentes e administradores.")}</p></main>;

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t("Campanhas agendadas")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {t("Crie um lote por tag, revise o público e agende a preparação. Esta versão não envia mensagens a contatos.")}
          </p>
        </div>
        <span className="rounded-md border px-3 py-2 text-sm font-medium" role="status">
          {t("WhatsApp: envio não homologado")}
        </span>
      </header>

      {!capability?.enabled && (
        <section className="rounded-lg border p-4" aria-labelledby="campaign-disabled-title">
          <h2 id="campaign-disabled-title" className="font-semibold">{t("Capacidade desativada")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(capability?.reason ?? "Campanhas estão desativadas nesta organização.")}</p>
          <p className="mt-2 text-sm">{t("O histórico existente continua disponível. Um administrador pode habilitar Campanhas em Configurações → Capacidades.")}</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-4 rounded-lg border p-4 md:p-5" aria-labelledby="campaign-list-title">
          <div className="flex items-center justify-between gap-3">
            <h2 id="campaign-list-title" className="text-xl font-semibold">{t("Campanhas")}</h2>
            {canOperate && !creating && <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={beginCreate}>{t("Nova campanha")}</button>}
          </div>
          {list.isLoading && <p role="status">{t("Carregando campanhas…")}</p>}
          {list.isError && <div role="alert" className="space-y-2"><p>{t("Não foi possível carregar as campanhas.")}</p><button className="underline" onClick={() => void list.refetch()}>{t("Tentar novamente")}</button></div>}
          {!list.isLoading && !list.isError && list.data?.data.length === 0 && (
            <div className="rounded-md border border-dashed p-5 text-sm">
              <p className="font-medium">{t("Nenhuma campanha ainda")}</p>
              <p className="mt-1 text-muted-foreground">{canOperate ? t("Campanhas são iniciadas por uma pessoa e ficam sem envio até um canal ser homologado.") : t("Quando houver campanhas nesta organização, elas aparecerão aqui.")}</p>
            </div>
          )}
          <ul className="space-y-2" aria-label={t("Lista de campanhas")}>
            {list.data?.data.map((item) => (
              <li key={item.id}>
                <button
                  className={`w-full rounded-md border p-3 text-left hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 ${selected === item.id ? "border-primary" : ""}`}
                  aria-current={selected === item.id ? "true" : undefined}
                  onClick={() => { setSelected(item.id); setCreating(false); setEditing(false); setRecipientPage(0); }}
                >
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <strong>{item.name}</strong><span className="text-sm">{t(STATUS[item.status] ?? item.status)}</span>
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {item.crm_tags?.name ?? t("Tag indisponível")} · {t("WhatsApp")}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {item.scheduled_at ? formatInstant(item.scheduled_at, item.timezone, locale) : t("Sem horário definido")} · {item.counts.total_count} {t("contatos no snapshot")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t pt-3">
            <button className="rounded-md border px-3 py-2 text-sm" disabled={page === 0 || list.isFetching} onClick={() => setPage((value) => Math.max(0, value - 1))}>{t("Anterior")}</button>
            <span className="text-sm" aria-live="polite">{t("Página")} {page + 1}</span>
            <button className="rounded-md border px-3 py-2 text-sm" disabled={!list.data?.meta.has_more || list.isFetching} onClick={() => setPage((value) => value + 1)}>{t("Próxima")}</button>
          </div>
        </section>

        <section className="space-y-4 rounded-lg border p-4 md:p-5" aria-labelledby="campaign-detail-title">
          <h2 id="campaign-detail-title" className="text-xl font-semibold">{creating ? (draftId ? t("Agendar rascunho") : t("Nova campanha")) : t("Detalhes da campanha")}</h2>
          {error && <p role="alert" className="rounded-md border border-destructive p-3 text-sm">{error}</p>}

          {(creating || editing) && (
            <form className="space-y-4" aria-label={creating ? t("Criar campanha") : t("Editar rascunho")} onSubmit={(event) => { event.preventDefault(); if (creating) setReviewing(true); else void saveEdit(); }}>
              <label className="block space-y-1 text-sm font-medium">
                <span>{t("Nome da campanha")}</span>
                <input className="w-full rounded-md border bg-background px-3 py-2" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="block space-y-1 text-sm font-medium">
                <span>{t("Público por tag")}</span>
                <select className="w-full rounded-md border bg-background px-3 py-2" required value={tagId} onChange={(event) => setTagId(event.target.value)}>
                  <option value="">{t("Selecione uma tag")}</option>
                  {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                </select>
                {tagId && <span className="block pt-1 text-xs text-muted-foreground" aria-live="polite">{audienceText}</span>}
              </label>
              <label className="block space-y-1 text-sm font-medium">
                <span>{t("Mensagem em texto simples")}</span>
                <textarea className="min-h-32 w-full rounded-md border bg-background px-3 py-2" required maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} />
                <span className="block text-xs text-muted-foreground">{content.length}/2000 · {t("A mensagem fica salva para revisão; nenhum provider recebe esse texto.")}</span>
              </label>
              {creating && (
                <label className="block space-y-1 text-sm font-medium">
                  <span>{t("Data e hora no fuso")} {options.data?.data.timezone ?? "…"}</span>
                  <input className="w-full rounded-md border bg-background px-3 py-2" required type="datetime-local" value={scheduledLocal} onChange={(event) => setScheduledLocal(event.target.value)} />
                </label>
              )}
              {creating && !reviewing && <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit" disabled={busy || !canOperate}>{t("Revisar campanha")}</button>}
              {creating && !reviewing && <button className="rounded-md border px-4 py-2" type="button" disabled={busy || !canOperate} onClick={() => void saveDraft()}>{t("Salvar rascunho")}</button>}
              {creating && reviewing && (
                <section className="space-y-3 rounded-lg border bg-muted/30 p-4" aria-labelledby="campaign-review-title">
                  <h3 id="campaign-review-title" className="font-semibold">{t("Revisão antes do agendamento")}</h3>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
                    <dt className="font-medium">{t("Público")}</dt><dd>{tags.find((tag) => tag.id === tagId)?.name ?? "—"} · {audience.data?.data.estimated_count ?? 0} {t("contatos estimados")}</dd>
                    <dt className="font-medium">{t("Canal")}</dt><dd>{t("WhatsApp · envio desabilitado")}</dd>
                    <dt className="font-medium">{t("Horário")}</dt><dd>{scheduledLocal.replace("T", " ")} ({options.data?.data.timezone ?? "—"})</dd>
                  </dl>
                  <div className="rounded-md border p-3 text-sm"><p className="font-medium">{t("Conteúdo")}</p><p className="mt-1 whitespace-pre-wrap">{content}</p></div>
                  <p role="status" className="text-sm">{t("Confirmar cria o snapshot e agenda apenas a preparação. Nenhuma mensagem será enviada.")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-md border px-3 py-2" type="button" disabled={busy} onClick={() => setReviewing(false)}>{t("Voltar e revisar")}</button>
                    <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" type="button" disabled={busy || !canOperate || (audience.data?.data.estimated_count ?? 0) < 1} onClick={() => void createAndSchedule()}>{busy ? t("Agendando…") : t("Confirmar e agendar")}</button>
                  </div>
                </section>
              )}
              {editing && <div className="flex gap-2"><button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" type="submit" disabled={busy}>{t("Salvar rascunho")}</button><button className="rounded-md border px-4 py-2" type="button" onClick={() => setEditing(false)}>{t("Cancelar edição")}</button></div>}
            </form>
          )}

          {!creating && !selected && <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">{t("Selecione uma campanha para ver público, estado e histórico de preparo.")}</p>}
          {selected && detail.isLoading && <p role="status">{t("Carregando detalhes…")}</p>}
          {selected && detail.isError && <div role="alert" className="space-y-2"><p>{t("Não foi possível carregar os detalhes.")}</p><button className="underline" onClick={() => void detail.refetch()}>{t("Tentar novamente")}</button></div>}
          {selected && campaign && !creating && !editing && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{campaign.name}</h3>
                  <p className="mt-1 text-sm">{t(STATUS[campaign.status] ?? campaign.status)}</p>
                  <p className="text-sm text-muted-foreground">{campaign.crm_tags?.name ?? t("Tag indisponível")} · {t("WhatsApp")}</p>
                  <p className="text-sm text-muted-foreground">{campaign.scheduled_at ? formatInstant(campaign.scheduled_at, campaign.timezone, locale) : t("Sem horário definido")} ({campaign.timezone})</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canOperate && campaign.status === "draft" && <button className="rounded-md border px-3 py-2 text-sm" onClick={() => { setName(campaign.name); setTagId(campaign.tag_id); setContent(campaign.content); setEditing(true); }}>{t("Editar rascunho")}</button>}
                  {canOperate && campaign.status === "draft" && <button className="rounded-md border px-3 py-2 text-sm" onClick={() => beginScheduleDraft(campaign)}>{t("Agendar rascunho")}</button>}
                  {canCancel && ["scheduled", "preparing", "prepared"].includes(campaign.status) && !confirmCancel && <button className="rounded-md border border-destructive px-3 py-2 text-sm" onClick={() => setConfirmCancel(true)}>{t("Cancelar campanha")}</button>}
                </div>
              </div>

              {confirmCancel && (
                <fieldset className="rounded-md border border-destructive p-4">
                  <legend className="px-1 font-medium">{t("Confirmar cancelamento")}</legend>
                  <p className="text-sm">{t("As próximas preparações serão interrompidas. Campanhas canceladas não podem ser retomadas.")}</p>
                  <div className="mt-3 flex gap-2"><button className="rounded-md bg-destructive px-3 py-2 text-destructive-foreground" disabled={busy} onClick={() => void cancelCampaign()}>{t("Sim, cancelar campanha")}</button><button className="rounded-md border px-3 py-2" disabled={busy} onClick={() => setConfirmCancel(false)}>{t("Voltar")}</button></div>
                </fieldset>
              )}

              <section className="rounded-md border p-4" aria-labelledby="campaign-progress-title">
                <h4 id="campaign-progress-title" className="font-semibold">{t("Resumo do público")}</h4>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">{t("No snapshot")}</dt><dd className="text-lg font-semibold">{detail.data?.data.counts.total_count ?? 0}</dd></div>
                  <div><dt className="text-muted-foreground">{t("Aguardando")}</dt><dd className="text-lg font-semibold">{detail.data?.data.counts.pending_count ?? 0}</dd></div>
                  <div><dt className="text-muted-foreground">{t("Elegíveis")}</dt><dd className="text-lg font-semibold">{detail.data?.data.counts.ready_count ?? 0}</dd></div>
                  <div><dt className="text-muted-foreground">{t("Ignorados/cancelados")}</dt><dd className="text-lg font-semibold">{(detail.data?.data.counts.skipped_count ?? 0) + (detail.data?.data.counts.cancelled_count ?? 0)}</dd></div>
                </dl>
                <p role="status" className="mt-3 text-sm text-muted-foreground">{t("Elegível significa apenas que passou pela revisão. Não significa enviado, entregue ou lido.")}</p>
                {campaign.status === "prepared" && <p className="mt-2 rounded-md border p-3 text-sm font-medium">{t("Provider de campanhas indisponível nesta release. Nenhum envio externo foi feito.")}</p>}
                {campaign.error_code && <p className="mt-2 text-sm text-muted-foreground">{t("Código de estado")}: {campaign.error_code}</p>}
              </section>

              <section aria-labelledby="campaign-recipients-title" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h4 id="campaign-recipients-title" className="font-semibold">{t("Destinatários do snapshot")}</h4>
                  <label className="flex items-center gap-2 text-sm"><span>{t("Estado")}</span><select className="rounded-md border bg-background px-2 py-1" value={recipientStatus} onChange={(event) => { setRecipientStatus(event.target.value); setRecipientPage(0); }}><option value="">{t("Todos")}</option><option value="pending">{t("Aguardando preparo")}</option><option value="ready">{t("Elegível")}</option><option value="skipped">{t("Ignorado")}</option><option value="cancelled">{t("Cancelado")}</option></select></label>
                </div>
                {detail.data?.data.recipients.length === 0 && <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{t("Não há destinatários neste filtro.")}</p>}
                <ul className="divide-y rounded-md border" aria-label={t("Destinatários paginados")}>
                  {detail.data?.data.recipients.map((recipient) => (
                    <li key={recipient.id} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium">{recipient.contacts?.name || (recipient.contact_id ? t("Contato sem nome") : t("Contato removido"))}</span>
                      <span className="text-sm">{t(RECIPIENT_STATUS[recipient.status] ?? recipient.status)}{recipient.reason_code ? ` · ${t(REASON[recipient.reason_code] ?? recipient.reason_code)}` : ""}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between text-sm">
                  <button className="rounded-md border px-3 py-2" disabled={recipientPage === 0 || detail.isFetching} onClick={() => setRecipientPage((value) => Math.max(0, value - 1))}>{t("Anterior")}</button>
                  <span aria-live="polite">{detail.data?.data.recipients_meta.total ?? 0} {t("destinatários")}</span>
                  <button className="rounded-md border px-3 py-2" disabled={!detail.data?.data.recipients_meta.has_more || detail.isFetching} onClick={() => setRecipientPage((value) => value + 1)}>{t("Próxima")}</button>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
      <p className="text-xs text-muted-foreground">{t("Instalação/update limpa ainda não comprovada. Esta homologação não autoriza produção nem envio a contatos reais.")}</p>
    </main>
  );
}
