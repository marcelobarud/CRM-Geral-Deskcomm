"use client";
import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCapability } from "@/hooks/capabilities/CapabilitiesProvider";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { randomId } from "@/lib/random-id";
import { ROLE_RANK } from "@/lib/auth/types";
import { proposalTotal, type ProposalItem, type ProposalSnapshot } from "@/lib/proposals/contracts";
import { formatCommercialCents } from "@/lib/reports/commercial";
type Version = {
  id: string;
  version_number: number;
  state: string;
  total_cents: number;
  currency: string;
  created_at: string;
  sent_at: string | null;
  pdf_sha256: string | null;
  snapshot: ProposalSnapshot;
};
type Proposal = {
  id: string;
  title: string;
  currency: string;
  notes: string;
  status: string;
  draft_revision: number;
  lead_id: string | null;
  contact_id: string | null;
  updated_at: string;
  crm_proposal_items: {
    description: string;
    quantity: number;
    unit_price_cents: number;
    product_id: string | null;
    position?: number;
  }[];
  crm_proposal_versions: Version[];
  crm_leads?: {
    title: string;
    contacts?: { name: string; crm_companies?: { name: string } };
  } | null;
  contacts?: { name: string; crm_companies?: { name: string } } | null;
};
type Template = {
  id: string;
  name: string;
  currency: string;
  content: { notes: string; items: ProposalItem[] };
};
const emptyItem = (): ProposalItem => ({ description: "", quantity: "1", unit_price_cents: "0" });
export function ProposalsWorkspace({
  initialLead = "",
  initialContact = "",
}: {
  initialLead?: string;
  initialContact?: string;
}) {
  const operationKeys = useRef(new Map<string, string>());
  const keyFor = (body: unknown) => {
    const text = JSON.stringify(body);
    let key = operationKeys.current.get(text);
    if (!key) {
      key = randomId();
      operationKeys.current.set(text, key);
    }
    return key;
  };
  const [prepareOnly, setPrepareOnly] = useState(false);
  const t = useT(),
    cap = useCapability("proposals"),
    { activeOrg } = useAuth(),
    qc = useQueryClient();
  const authorized = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.agent,
    manager = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState(!!initialLead),
    [title, setTitle] = useState(""),
    [currency, setCurrency] = useState("BRL"),
    [notes, setNotes] = useState(""),
    [items, setItems] = useState<ProposalItem[]>([emptyItem()]),
    [lead, setLead] = useState(initialLead),
    [contact, setContact] = useState(initialContact),
    [template, setTemplate] = useState(""),
    [recipient, setRecipient] = useState(""),
    [channel, setChannel] = useState("other"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [sendKey, setSendKey] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["proposals", activeOrg?.orgId, search, page, initialContact],
    enabled: authorized,
    queryFn: () =>
      apiClient.get<{ data: Proposal[]; meta: { has_more: boolean } }>(
        "/api/v1/proposals?" +
          new URLSearchParams({
            search,
            page: String(page),
            ...(initialContact ? { contact_id: initialContact } : {}),
          }),
      ),
  });
  const detail = useQuery({
    queryKey: ["proposal", activeOrg?.orgId, selected],
    enabled: authorized && !!selected,
    queryFn: () => apiClient.get<{ data: Proposal }>("/api/v1/proposals/" + selected),
  });
  const options = useQuery({
    queryKey: ["proposal-options", activeOrg?.orgId],
    enabled: authorized && !!cap?.can_execute,
    queryFn: () =>
      apiClient.get<{
        data: {
          leads: { id: string; title: string }[];
          contacts: { id: string; name: string | null }[];
          products: { id: string; nome: string; preco_cents: number; moeda: string }[];
        };
      }>("/api/v1/proposals/options"),
  });
  const templates = useQuery({
    queryKey: ["proposal-templates", activeOrg?.orgId],
    enabled: authorized,
    queryFn: () => apiClient.get<{ data: Template[] }>("/api/v1/proposal-templates"),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["proposals"] });
    await qc.invalidateQueries({ queryKey: ["proposal"] });
  };
  const execute = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch {
      setError(t("Não foi possível concluir. Confira os dados e tente novamente."));
    } finally {
      setBusy(false);
    }
  };
  const start = (p?: Proposal) => {
    operationKeys.current.clear();
    setSendKey(null);
    setEditing(true);
    setSelected(p?.id ?? null);
    setTitle(p?.title ?? "");
    setCurrency(p?.currency ?? "BRL");
    setNotes(p?.notes ?? "");
    setLead(p?.lead_id ?? "");
    setContact(p?.contact_id ?? initialContact);
    setTemplate("");
    setItems(
      p
        ? p.crm_proposal_items
            .toSorted((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((i) => ({
              description: i.description,
              quantity: String(i.quantity),
              unit_price_cents: String(i.unit_price_cents),
              ...(i.product_id ? { product_id: i.product_id } : {}),
            }))
        : [emptyItem()],
    );
  };
  const p = detail.data?.data;
  let total: string | null = null;
  try {
    total = proposalTotal(items);
  } catch {}
  const labelClass = "block min-w-0 space-y-1",
    inputClass = "block w-full min-w-0 rounded-md border p-2";
  if (!authorized) return <p className="p-6">{t("Sem permissão para propostas.")}</p>;
  return (
    <main className="min-w-0 space-y-5 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">{t("Propostas")}</h1>
      {!cap?.can_execute && (
        <div role="status" className="rounded-md border p-3">
          <p>{cap?.reason ?? t("Consultando disponibilidade…")}</p>
          <p>{t("Histórico preservado. Novas ações estão bloqueadas.")}</p>
          <a className="underline" href="/app/settings/capabilities">
            {t("Configurar módulos")}
          </a>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <label>
          {t("Buscar propostas")}
          <input
            className={inputClass}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </label>
        {cap?.can_execute && (
          <button className="rounded-md border p-2" onClick={() => start()}>
            {t("Nova proposta")}
          </button>
        )}
      </div>
      {list.isPending ? (
        <p role="status">{t("Carregando propostas…")}</p>
      ) : list.isError ? (
        <div role="alert">
          {t("Não foi possível carregar propostas.")}
          <button onClick={() => void list.refetch()}>{t("Tentar novamente")}</button>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {list.data?.data.map((row) => (
              <li key={row.id} className="rounded-md border p-3">
                <button
                  className="underline"
                  onClick={() => {
                    setSelected(row.id);
                    setEditing(false);
                  }}
                >
                  {row.title}
                </button>
                <p>
                  {row.crm_leads?.title} · {row.crm_leads?.contacts?.name ?? row.contacts?.name} ·{" "}
                  {row.crm_leads?.contacts?.crm_companies?.name ??
                    row.contacts?.crm_companies?.name}
                </p>
                <p>
                  {t(
                    row.status === "sent"
                      ? "Registrada como enviada"
                      : row.status === "archived"
                        ? "Arquivada"
                        : "Rascunho",
                  )}{" "}
                  ·{" "}
                  {formatCommercialCents(
                    proposalTotal(
                      row.crm_proposal_items.map((i) => ({
                        description: i.description,
                        quantity: String(i.quantity),
                        unit_price_cents: String(i.unit_price_cents),
                      })),
                    ),
                    row.currency,
                  )}{" "}
                  · v{Math.max(0, ...row.crm_proposal_versions.map((v) => v.version_number))} ·{" "}
                  {new Date(row.updated_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
          {!list.data?.data.length && <p>{t("Nenhuma proposta encontrada.")}</p>}
          <div className="flex gap-3">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              {t("Anterior")}
            </button>
            <button disabled={!list.data?.meta.has_more} onClick={() => setPage(page + 1)}>
              {t("Próxima")}
            </button>
          </div>
        </>
      )}
      {selected && detail.isPending && <p role="status">{t("Carregando proposta…")}</p>}
      {detail.isError && (
        <div role="alert">
          {t("Não foi possível carregar a proposta.")}
          <button onClick={() => void detail.refetch()}>{t("Tentar novamente")}</button>
        </div>
      )}
      {p && (
        <section aria-label={t("Ficha da proposta")} className="space-y-3 rounded-md border p-4">
          <h2 className="text-xl">{p.title}</h2>
          <p>{p.notes}</p>
          <p>
            {t("Contexto comercial")}: {p.crm_leads?.title} ·{" "}
            {p.crm_leads?.contacts?.name ?? p.contacts?.name} ·{" "}
            {p.crm_leads?.contacts?.crm_companies?.name ?? p.contacts?.crm_companies?.name}
          </p>
          {p.lead_id && (
            <a href="/app/kanban" className="underline">
              {t("Ver oportunidade e próximo passo")}
            </a>
          )}
          {cap?.can_execute && p.status !== "archived" && (
            <div className="flex flex-wrap gap-3">
              <button onClick={() => start(p)}>{t("Editar rascunho")}</button>
              <button
                onClick={() => {
                  setPrepareOnly(false);
                  setSending(true);
                  setSendKey(sendKey ?? randomId());
                }}
              >
                {t("Registrar versão como enviada")}
              </button>
              <button
                onClick={() => {
                  setPrepareOnly(true);
                  setSending(true);
                  setSendKey(sendKey ?? randomId());
                }}
              >
                {t("Preparar PDF da versão")}
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  void execute(async () => {
                    await apiClient.post(
                      "/api/v1/proposals/" + p.id + "/archive",
                      {},
                      {
                        headers: {
                          "Idempotency-Key": keyFor({
                            selected,
                            title,
                            currency,
                            notes,
                            items,
                            template,
                          }),
                        },
                      },
                    );
                    await refresh();
                  })
                }
              >
                {t("Arquivar")}
              </button>
            </div>
          )}
          <h3>{t("Histórico de versões")}</h3>
          {!p.crm_proposal_versions.length && <p>{t("Sem versões registradas.")}</p>}
          {p.crm_proposal_versions
            .toSorted((a, b) => b.version_number - a.version_number)
            .map((v) => (
              <article key={v.id} className="space-y-2 rounded-md border p-3">
                <h4>
                  v{v.version_number} ·{" "}
                  {t(
                    v.state === "sent"
                      ? "Registrada como enviada"
                      : v.pdf_sha256
                        ? "PDF preparado"
                        : "PDF pendente",
                  )}{" "}
                  · {formatCommercialCents(String(v.total_cents), v.currency)}
                </h4>
                <p>{v.sent_at ?? v.created_at}</p>
                <p>
                  {t("Autor")}: {v.snapshot.author_name ?? t("Usuário da equipe")}
                </p>
                {(v.state === "sent" || !!v.pdf_sha256) && (
                  <button
                    onClick={() =>
                      void execute(async () => {
                        const r = await apiClient.get<{ data: { url: string } }>(
                          "/api/v1/proposals/" + p.id + "/versions/" + v.id + "/pdf",
                        );
                        window.location.assign(r.data.url);
                      })
                    }
                  >
                    {t("Abrir PDF")} · v{v.version_number}
                  </button>
                )}
                <details>
                  <summary>{t("Dados preservados")}</summary>
                  <p>
                    {v.snapshot.title} · {v.snapshot.context?.contact.name} ·{" "}
                    {v.snapshot.context?.company?.name}
                  </p>
                  <p>{v.snapshot.notes}</p>
                  <ul>
                    {v.snapshot.items.map((i, n) => (
                      <li key={n}>
                        {i.description} · {i.quantity} ·{" "}
                        {formatCommercialCents(i.total_cents, v.currency)}
                      </li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
        </section>
      )}
      {sending && p && (
        <form
          role="dialog"
          aria-label={t("Registrar envio da versão")}
          className="space-y-3 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void execute(async () => {
              await apiClient.post(
                "/api/v1/proposals/" + p.id + (prepareOnly ? "/generate" : "/send"),
                { recipient, channel },
                { headers: { "Idempotency-Key": sendKey! }, timeoutMs: 120000 },
              );
              if (!prepareOnly) setSendKey(null);
              setSending(false);
              await refresh();
            });
          }}
        >
          <h2>{t("Registrar envio da versão")}</h2>
          <p>
            {t(
              "Este registro gera PDF e preserva a versão. Nenhuma mensagem será enviada automaticamente.",
            )}
          </p>
          <label className={labelClass}>
            {t("Destinatário informado")}
            <input
              className={inputClass}
              required
              maxLength={300}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("Canal informado")}
            <select
              className={inputClass}
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="other">{t("Outro")}</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </label>
          <button type="submit" disabled={busy || !cap?.can_execute}>
            {busy ? t("Gerando PDF…") : prepareOnly ? t("Gerar PDF") : t("Confirmar registro")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSendKey(null);
              setSending(false);
            }}
          >
            {t("Cancelar")}
          </button>
        </form>
      )}
      {editing && cap?.can_execute && (
        <form
          aria-label={t("Rascunho da proposta")}
          className="space-y-4 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void execute(async () => {
              const body = {
                title,
                currency,
                notes,
                items,
                ...(!selected && lead ? { lead_id: lead } : {}),
                ...(!selected && !lead && contact ? { contact_id: contact } : {}),
                ...(selected ? { expected_revision: p?.draft_revision } : {}),
              };
              const r = selected
                ? await apiClient.patch<{ data: Proposal }>("/api/v1/proposals/" + selected, body, {
                    headers: {
                      "Idempotency-Key": keyFor({
                        selected,
                        title,
                        currency,
                        notes,
                        items,
                        template,
                      }),
                    },
                  })
                : await apiClient.post<{ data: Proposal }>("/api/v1/proposals", body, {
                    headers: {
                      "Idempotency-Key": keyFor({
                        selected,
                        title,
                        currency,
                        notes,
                        items,
                        template,
                      }),
                    },
                  });
              setSelected(r.data.id);
              setEditing(false);
              await refresh();
            });
          }}
        >
          <h2>{t("Rascunho atual")}</h2>
          <label className={labelClass}>
            {t("Título da proposta")}
            <input
              className={inputClass}
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            {t("Moeda")}
            <input
              className={inputClass}
              required
              pattern="[A-Z]{3}"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            />
          </label>
          <label className={labelClass}>
            {t("Aplicar modelo")}
            <select
              className={inputClass}
              value={template}
              onChange={(e) => {
                setTemplate(e.target.value);
                const m = templates.data?.data.find((x) => x.id === e.target.value);
                if (m) {
                  setCurrency(m.currency);
                  setNotes(m.content.notes);
                  setItems(m.content.items.map((i) => ({ ...i })));
                }
              }}
            >
              <option value="">{t("Sem modelo")}</option>
              {templates.data?.data.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          {templates.isError && <p role="alert">{t("Não foi possível carregar modelos.")}</p>}
          {!selected && (
            <>
              <label className={labelClass}>
                {t("Oportunidade vinculada")}
                <select
                  className={inputClass}
                  value={lead}
                  onChange={(e) => {
                    setLead(e.target.value);
                    setContact("");
                  }}
                >
                  <option value="">{t("Sem oportunidade")}</option>
                  {options.data?.data.leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </label>
              {!lead && (
                <label className={labelClass}>
                  {t("Contato vinculado")}
                  <select
                    className={inputClass}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  >
                    <option value="">{t("Sem contato")}</option>
                    {options.data?.data.contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          {options.isError && (
            <p role="alert">{t("Não foi possível carregar o contexto comercial.")}</p>
          )}
          <label className={labelClass}>
            {t("Adicionar do catálogo")}
            <select
              className={inputClass}
              value=""
              onChange={(e) => {
                const product = options.data?.data.products.find((x) => x.id === e.target.value);
                if (product && product.moeda === currency)
                  setItems([
                    ...items.filter((i) => i.description.trim()),
                    {
                      description: product.nome,
                      quantity: "1",
                      unit_price_cents: String(product.preco_cents),
                      product_id: product.id,
                    },
                  ]);
              }}
            >
              <option value="">{t("Escolher produto")}</option>
              {options.data?.data.products
                .filter((x) => x.moeda === currency)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
            </select>
          </label>
          <fieldset className="space-y-3">
            <legend>{t("Itens da proposta")}</legend>
            {items.map((i, n) => (
              <div key={n} className="grid min-w-0 gap-2 rounded-md border p-3 md:grid-cols-4">
                <label className={labelClass}>
                  {t("Descrição")} · {n + 1}
                  <input
                    className={inputClass}
                    required
                    value={i.description}
                    onChange={(e) =>
                      setItems(
                        items.map((x, k) => (k === n ? { ...x, description: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <label className={labelClass}>
                  {t("Quantidade")} · {n + 1}
                  <input
                    className={inputClass}
                    required
                    inputMode="decimal"
                    value={i.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((x, k) => (k === n ? { ...x, quantity: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <label className={labelClass}>
                  {t("Valor unitário em centavos")} · {n + 1}
                  <input
                    className={inputClass}
                    required
                    inputMode="numeric"
                    value={i.unit_price_cents}
                    onChange={(e) =>
                      setItems(
                        items.map((x, k) =>
                          k === n ? { ...x, unit_price_cents: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  disabled={items.length === 1}
                  onClick={() => setItems(items.filter((_, k) => k !== n))}
                >
                  {t("Remover item")} · {n + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={items.length >= 100}
              onClick={() => setItems([...items, emptyItem()])}
            >
              {t("Adicionar item")}
            </button>
          </fieldset>
          <p>
            {t("Total")}: {formatCommercialCents(total, currency)}
          </p>
          <label className={labelClass}>
            {t("Textos e observações")}
            <textarea
              className={inputClass}
              value={notes}
              maxLength={10000}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <button disabled={busy || total === null} type="submit">
            {t("Salvar rascunho")}
          </button>
          <button type="button" onClick={() => setEditing(false)}>
            {t("Cancelar")}
          </button>
          {manager && (
            <button
              type="button"
              disabled={busy || total === null || !title.trim()}
              onClick={() =>
                void execute(async () => {
                  await apiClient.post(
                    "/api/v1/proposal-templates",
                    { name: title, currency, content: { notes, items } },
                    {
                      headers: {
                        "Idempotency-Key": keyFor({
                          selected,
                          title,
                          currency,
                          notes,
                          items,
                          template,
                        }),
                      },
                    },
                  );
                  await qc.invalidateQueries({ queryKey: ["proposal-templates"] });
                })
              }
            >
              {t("Salvar como modelo simples")}
            </button>
          )}
          {manager && template && (
            <button
              type="button"
              disabled={busy || total === null}
              onClick={() =>
                void execute(async () => {
                  await apiClient.patch(
                    "/api/v1/proposal-templates/" + template,
                    { name: title, currency, content: { notes, items } },
                    {
                      headers: {
                        "Idempotency-Key": keyFor({
                          selected,
                          title,
                          currency,
                          notes,
                          items,
                          template,
                        }),
                      },
                    },
                  );
                  await qc.invalidateQueries({ queryKey: ["proposal-templates"] });
                })
              }
            >
              {t("Atualizar modelo selecionado")}
            </button>
          )}{" "}
        </form>
      )}
    </main>
  );
}
