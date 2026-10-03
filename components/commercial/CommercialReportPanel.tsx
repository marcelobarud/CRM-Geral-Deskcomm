"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useTeamMembers } from "@/hooks/team/useTeamMembers";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { ROLE_RANK } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import {
  commercialQuerySchema,
  formatCommercialCents,
  type CommercialReport,
  type CommercialGroup,
} from "@/lib/reports/commercial";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export function CommercialReportPanel({
  pipelines,
  loadError = false,
}: {
  pipelines: { id: string; name: string }[];
  loadError?: boolean;
}) {
  const t = useT(),
    { activeOrg } = useAuth(),
    role = activeOrg?.role;
  const allowed = !!role && ROLE_RANK[role] >= ROLE_RANK.agent,
    compare = !!role && ROLE_RANK[role] >= ROLE_RANK.manager;
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    return {
      from: isoDay(new Date(now.getTime() - 30 * 86400000)),
      to: isoDay(new Date(now.getTime() + 86400000)),
      pipeline_id: "",
      owner_user_id: "",
      source: "",
    };
  });
  const [applied, setApplied] = useState(filters),
    [invalid, setInvalid] = useState(false);
  const team = useTeamMembers({ enabled: compare });
  const report = useQuery({
    queryKey: ["commercial-report", activeOrg?.orgId, applied],
    enabled: allowed,
    queryFn: async () => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(applied)) if (v) params.set(k, v);
      return (
        await apiClient.get<{ data: CommercialReport }>("/api/v1/reports/commercial?" + params)
      ).data;
    },
  });
  const money = (v: string | null, c: string | null, count: number) =>
    formatCommercialCents(v ?? (count === 0 && c ? "0" : null), c);
  if (!allowed)
    return (
      <section aria-label={t("Relatório comercial")}>
        <p>{t("Sem permissão para relatórios comerciais.")}</p>
      </section>
    );
  const currencies = report.data?.currencies ?? [];
  return (
    <section
      aria-label={t("Relatório comercial")}
      className="min-w-0 space-y-4 rounded-md border p-4"
    >
      <h2 className="text-xl font-semibold">{t("Relatório comercial")}</h2>
      <p className="text-sm text-text-muted">
        {t(
          "Forecast ponderado usa o valor das oportunidades abertas multiplicado pela probabilidade da etapa.",
        )}
      </p>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const q = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
          if (!commercialQuerySchema.safeParse(q).success) {
            setInvalid(true);
            return;
          }
          setInvalid(false);
          if (JSON.stringify(applied) === JSON.stringify(filters)) void report.refetch();
          else setApplied({ ...filters });
        }}
      >
        <label className="min-w-0">
          {t("De (UTC)")}
          <input
            className="block max-w-full rounded-md border p-2"
            type="date"
            required
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </label>
        <label className="min-w-0">
          {t("Até (UTC, exclusivo)")}
          <input
            className="block max-w-full rounded-md border p-2"
            type="date"
            required
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </label>
        <label className="min-w-0">
          {t("Funil")}
          <select
            className="block max-w-full rounded-md border p-2"
            value={filters.pipeline_id}
            onChange={(e) => setFilters({ ...filters, pipeline_id: e.target.value })}
          >
            <option value="">{t("Todos os funis")}</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {compare && (
          <label className="min-w-0">
            {t("Responsável")}
            <select
              className="block max-w-full rounded-md border p-2"
              value={filters.owner_user_id}
              onChange={(e) => setFilters({ ...filters, owner_user_id: e.target.value })}
            >
              <option value="">{t("Todos os atendentes")}</option>
              {team.data?.data.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name ?? m.email ?? m.user_id}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="min-w-0">
          {t("Origem")}
          <input
            className="block w-40 max-w-full rounded-md border p-2"
            maxLength={100}
            value={filters.source}
            onChange={(e) => setFilters({ ...filters, source: e.target.value })}
          />
        </label>
        <Button type="submit">{t("Aplicar filtros")}</Button>
      </form>
      {invalid && (
        <p role="alert">{t("Período inválido. Use até 366 dias e fim posterior ao início.")}</p>
      )}
      {(loadError || team.isError) && (
        <p role="alert">{t("Não foi possível carregar opções de filtros.")}</p>
      )}
      <p className="text-sm">
        {t(
          "Pipeline e forecast atuais: abertos visíveis agora. Forecast do período: data prevista de fechamento. Ganhos, perdas e conversão: data de fechamento. Criadas: data de criação.",
        )}
      </p>
      <p className="text-sm text-text-muted">
        {t(
          "Valores comerciais estimados; não representam recebimento ou caixa. Moedas não são convertidas nem somadas entre si.",
        )}
      </p>
      {report.isPending ? (
        <p role="status">{t("Carregando relatório comercial…")}</p>
      ) : report.isError ? (
        <div role="alert">
          <p>{t("Não foi possível carregar o relatório comercial.")}</p>
          <Button onClick={() => void report.refetch()}>{t("Tentar novamente")}</Button>
        </div>
      ) : (
        <>
          {!currencies.length && <p>{t("Sem oportunidades para os filtros selecionados.")}</p>}
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            {currencies.map((c) => (
              <article
                key={c.currency ?? "unknown"}
                className="min-w-0 space-y-2 rounded-md border p-3"
                aria-label={c.currency ?? t("Moeda não informada")}
              >
                <h3 className="font-semibold">{c.currency ?? t("Moeda não informada")}</h3>
                <dl className="space-y-2 break-words">
                  <Metric label={t("Oportunidades abertas")} value={String(c.open_count)} />
                  <Metric
                    label={t("Valor aberto informado")}
                    value={money(c.open_value_cents, c.currency, c.open_count)}
                  />
                  <Metric
                    label={t("Forecast ponderado atual")}
                    value={money(c.weighted_current_cents, c.currency, c.open_count)}
                  />
                  <Metric
                    label={t("Forecast ponderado do período")}
                    value={money(c.weighted_period_cents, c.currency, c.horizon_count)}
                  />
                  <Metric
                    label={t("Ganhos no período")}
                    value={`${c.won_count} · ${money(c.won_value_cents, c.currency, c.won_count)}`}
                  />
                  <Metric
                    label={t("Perdas no período")}
                    value={`${c.lost_count} · ${money(c.lost_value_cents, c.currency, c.lost_count)}`}
                  />
                  <Metric
                    label={t("Conversão dos encerrados")}
                    value={c.conversion_percent === null ? "—" : `${c.conversion_percent}%`}
                  />
                  <Metric label={t("Criadas no período")} value={String(c.created_count)} />
                </dl>
                <p className="text-sm">
                  {t("Conversão = ganhos / (ganhos + perdas). Sem encerrados = não disponível.")}
                </p>
                <p
                  className="text-sm"
                  role={
                    c.missing_value || c.missing_probability || c.missing_date || !c.currency
                      ? "status"
                      : undefined
                  }
                >
                  {t("Abertas sem valor")}: {c.missing_value} · {t("Sem probabilidade")}:{" "}
                  {c.missing_probability} · {t("Sem data prevista")}: {c.missing_date}
                </p>
                <p className="text-sm">
                  {t("Encerradas sem data de fechamento")}: {c.missing_closed_date} ·{" "}
                  {t("Ganhos/perdas sem valor")}: {c.won_missing_value}/{c.lost_missing_value}
                </p>
                {(!c.currency ||
                  c.missing_value > 0 ||
                  c.missing_probability > 0 ||
                  c.missing_date > 0) && (
                  <p className="text-sm">
                    {t(
                      "Forecast incompleto: configure os dados ausentes. Os totais incluem somente valores conhecidos.",
                    )}
                  </p>
                )}
              </article>
            ))}
          </div>
          <h3 className="font-semibold">{t("Distribuição por etapa e moeda")}</h3>
          <div
            className="overflow-x-auto"
            tabIndex={0}
            aria-label={t("Distribuição por etapa e moeda")}
          >
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  {[
                    t("Etapa"),
                    t("Moeda"),
                    t("Abertas"),
                    t("Valor informado"),
                    t("Probabilidade (%)"),
                    t("Forecast atual"),
                  ].map((x) => (
                    <th key={x} className="p-2" scope="col">
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.data?.stages
                  .filter((s) => s.open_count > 0)
                  .map((s) => (
                    <tr key={`${s.stage_id}:${s.currency}`}>
                      <td className="p-2">{s.stage_name ?? "—"}</td>
                      <td className="p-2">{s.currency ?? t("Moeda não informada")}</td>
                      <td className="p-2">{s.open_count}</td>
                      <td className="p-2">{money(s.open_value_cents, s.currency, s.open_count)}</td>
                      <td className="p-2">{s.probability_percent ?? t("Não configurada")}</td>
                      <td className="p-2">
                        {money(s.weighted_current_cents, s.currency, s.open_count)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <h3 className="font-semibold">{t("Origem e resultado comercial por moeda")}</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {report.data?.sources.map((s: CommercialGroup) => (
              <div
                key={`${s.source}:${s.currency}`}
                className="min-w-0 rounded-md border p-2 break-words"
              >
                <p>
                  {s.source} · {s.currency ?? t("Moeda não informada")}
                </p>
                <p>
                  {t("Criadas no período")}: {s.created_count} · {t("Abertas")}: {s.open_count} ·{" "}
                  {t("Ganhos no período")}: {s.won_count} ·{" "}
                  {money(s.won_value_cents, s.currency, s.won_count)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
