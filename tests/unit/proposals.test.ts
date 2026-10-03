import { describe, it, expect } from "vitest";
import { proposalTotal, proposalItemSchema, proposalDraftSchema } from "@/lib/proposals/contracts";
import { resolveCapability } from "@/lib/capabilities/registry";
describe("propostas: dinheiro e portas", () => {
  it("multiplica milésimos com arredondamento por item e soma exata", () => {
    expect(
      proposalTotal([
        { description: "A", quantity: "0.5", unit_price_cents: "1" },
        { description: "B", quantity: "2", unit_price_cents: "10000" },
      ]),
    ).toBe("20001");
    expect(proposalTotal([{ description: "Zero", quantity: "1", unit_price_cents: "0" }])).toBe(
      "0",
    );
  });
  it.each(["0", "-1", "1.0001", "NaN"])("recusa quantidade %s", (quantity) =>
    expect(
      proposalItemSchema.safeParse({ description: "A", quantity, unit_price_cents: "1" }).success,
    ).toBe(false),
  );
  it("recusa preço negativo, overflow e contexto duplo", () => {
    expect(
      proposalItemSchema.safeParse({ description: "A", quantity: "1", unit_price_cents: "-1" })
        .success,
    ).toBe(false);
    expect(() =>
      proposalTotal([{ description: "A", quantity: "2", unit_price_cents: "9007199254740991" }]),
    ).toThrow();
    expect(
      proposalDraftSchema.safeParse({
        title: "A",
        currency: "BRL",
        items: [],
        organization_id: "forjada",
      }).success,
    ).toBe(false);
  });
  it("default desligado, readiness e RBAC são independentes", () => {
    expect(resolveCapability("proposals", {}, "admin").state).toBe("DISABLED");
    const settings = { capabilities: { version: 1, revision: 1, overrides: { proposals: true } } };
    expect(resolveCapability("proposals", settings, "viewer").can_execute).toBe(false);
    expect(
      resolveCapability("proposals", settings, "agent", { configured: false, healthy: false })
        .state,
    ).toBe("ENABLED_NOT_CONFIGURED");
    expect(
      resolveCapability("proposals", settings, "agent", { configured: true, healthy: false }).state,
    ).toBe("DEGRADED");
    expect(resolveCapability("proposals", settings, "agent").can_execute).toBe(true);
  });
});
