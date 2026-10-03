import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ guard: vi.fn(), support: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/capabilities/server", () => ({ requireCapability: mocks.guard }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: mocks.support }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/branding/saida", () => ({ marcaDaSaida: vi.fn() }));
vi.mock("@/lib/proposals/pdf", () => ({ renderProposalPdf: vi.fn() }));
import { proposalCommand } from "@/lib/proposals/api";
const request = (data: unknown, key = "c5f4a856-bbb4-4a9a-b541-c3d602d12c9d") =>
  new NextRequest("http://localhost/api/v1/proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(data),
  });
const body = {
  title: "Fictícia",
  currency: "BRL",
  items: [{ description: "A", quantity: "1", unit_price_cents: "100" }],
};
describe("API propostas: cercas e organização", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.support.mockResolvedValue(null);
    mocks.guard.mockResolvedValue({ ok: true, org: { orgId: "org-confiável" } });
    mocks.rpc.mockResolvedValue({ data: { id: "p" }, error: null });
  });
  it("guard bloqueia sem executar comando", async () => {
    mocks.guard.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await proposalCommand(request(body))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("não aceita organização no body", async () => {
    expect((await proposalCommand(request({ ...body, organization_id: "forjada" }))).status).toBe(
      422,
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("leva organização autenticada e idempotência ao comando", async () => {
    expect((await proposalCommand(request(body))).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "fn_proposal_command",
      expect.objectContaining({
        p_org: "org-confiável",
        p_action: "create",
        p_request: "c5f4a856-bbb4-4a9a-b541-c3d602d12c9d",
      }),
    );
  });
  it("recusa chave inválida e dinheiro inválido", async () => {
    expect((await proposalCommand(request(body, "bad"))).status).toBe(422);
    expect(
      (
        await proposalCommand(
          request({
            ...body,
            items: [{ description: "A", quantity: "-1", unit_price_cents: "1" }],
          }),
        )
      ).status,
    ).toBe(422);
  });
  it("erro do banco não vira sucesso nem vaza mensagem", async () => {
    mocks.rpc.mockResolvedValue({
      error: { code: "23505", message: "segredo que não pode sair" },
      data: null,
    });
    const response = await proposalCommand(request(body));
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain("segredo");
  });
});
