import { it, expect } from "vitest";
import { renderProposalPdf } from "@/lib/proposals/pdf";
import type { ProposalSnapshot } from "@/lib/proposals/contracts";
it("gera PDF de snapshot versionado sem alterar o input", async () => {
  const snapshot: ProposalSnapshot = {
    title: "Oferta fictícia",
    notes: "Texto preservado",
    currency: "BRL",
    total_cents: "20001",
    items: [
      { description: "Serviço", quantity: "2", unit_price_cents: "10000", total_cents: "20000" },
      { description: "Meio centavo", quantity: "0.5", unit_price_cents: "1", total_cents: "1" },
    ],
    brand: { nome: "Marca fictícia" },
    context: null,
    created_at: "2026-01-01T00:00:00Z",
    author_id: "ator-fictício",
  };
  const original = JSON.stringify(snapshot);
  const pdf = await renderProposalPdf(snapshot, 1);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(1000);
  expect(JSON.stringify(snapshot)).toBe(original);
}, 30000);
