/** Totais informativos de etapa, sem converter ou misturar moedas. */
export function commercialValuesByCurrency(
  leads: readonly { value_cents: number | null; currency: string | null }[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const lead of leads) {
    if (lead.value_cents === null) continue;
    const currency = lead.currency || "BRL";
    totals.set(currency, (totals.get(currency) ?? 0) + lead.value_cents);
  }
  return totals;
}
