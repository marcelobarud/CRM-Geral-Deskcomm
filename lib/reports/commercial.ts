import { z } from "zod";
export const commercialQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    pipeline_id: z.uuid().optional(),
    owner_user_id: z.uuid().optional(),
    source: z.string().min(1).max(100).optional(),
  })
  .strict()
  .refine(
    (v) => {
      const gap = Date.parse(v.to) - Date.parse(v.from);
      return gap > 0 && gap <= 366 * 86400000;
    },
    { message: "Período inválido." },
  );
export interface CommercialGroup {
  currency: string | null;
  stage_id: string | null;
  stage_name: string | null;
  probability_percent: number | null;
  source: string | null;
  open_count: number;
  open_value_cents: string | null;
  weighted_current_cents: string | null;
  weighted_period_cents: string | null;
  horizon_count: number;
  missing_value: number;
  missing_probability: number;
  missing_date: number;
  created_count: number;
  won_count: number;
  lost_count: number;
  missing_closed_date: number;
  won_missing_value: number;
  lost_missing_value: number;
  won_value_cents: string | null;
  lost_value_cents: string | null;
  conversion_percent: number | null;
}
export interface CommercialReport {
  currencies: CommercialGroup[];
  stages: CommercialGroup[];
  sources: CommercialGroup[];
  window: { from: string; to: string };
}
// Renderiza cents exatos sem conversão para Number e sem pressupor escala cambial.
export function formatCommercialCents(value: string | null, currency: string | null): string {
  if (value === null) return "—";
  if (!currency) return "—";
  const n = BigInt(value),
    absolute = n < 0n ? -n : n;
  return `${currency} ${n < 0n ? "-" : ""}${(absolute / 100n).toLocaleString("pt-BR")},${String(absolute % 100n).padStart(2, "0")}`;
}
