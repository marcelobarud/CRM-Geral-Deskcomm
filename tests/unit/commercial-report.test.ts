import { describe, it, expect } from "vitest";
import { commercialQuerySchema, formatCommercialCents } from "@/lib/reports/commercial";
describe("Contrato de relatório comercial", () => {
  it("formata bigint e moeda sem perder centavos", () => {
    expect(formatCommercialCents("9007199254740993", "BRL")).toBe("BRL 90.071.992.547.409,93");
    expect(formatCommercialCents("0", "USD")).toBe("USD 0,00");
    expect(formatCommercialCents("-123", "BRL")).toBe("BRL -1,23");
  });
  it("ausência não é zero nem moeda presumida", () => {
    expect(formatCommercialCents(null, "BRL")).toBe("—");
    expect(formatCommercialCents("123", null)).toBe("—");
  });
  it("período tem datas válidas, ordenadas e limite", () => {
    expect(commercialQuerySchema.safeParse({ from: "2026-01-01", to: "2026-02-01" }).success).toBe(
      true,
    );
    for (const data of [
      { from: "2026-01-01", to: "2026-01-01" },
      { from: "2026-02-01", to: "2026-01-01" },
      { from: "2026-02-30", to: "2026-03-01" },
      { from: "2025-01-01", to: "2027-01-01" },
      { from: "2026-01-01", to: "2026-02-01", organization_id: "forged" },
    ])
      expect(commercialQuerySchema.safeParse(data).success).toBe(false);
  });
});
