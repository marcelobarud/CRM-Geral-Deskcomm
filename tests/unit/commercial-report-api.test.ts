import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ guard: vi.fn(), rpc: vi.fn(), warn: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: m.guard }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: m.rpc }) }));
vi.mock("@/lib/logger", () => ({ logger: { warn: m.warn } }));
import { GET } from "@/app/api/v1/reports/commercial/route";
const request = (query = "from=2026-01-01&to=2026-02-01") =>
  new NextRequest("http://localhost/api/v1/reports/commercial?" + query);
beforeEach(() => {
  vi.clearAllMocks();
  m.guard.mockResolvedValue({ ok: true, org: { orgId: "trusted-org" } });
  m.rpc.mockResolvedValue({ data: { currencies: [], stages: [], sources: [] }, error: null });
});
describe("Read model comercial", () => {
  it("agent é o piso e organização vem da sessão", async () => {
    expect((await GET(request())).status).toBe(200);
    expect(m.guard).toHaveBeenCalledWith("agent", expect.anything());
    expect(m.rpc).toHaveBeenCalledWith(
      "fn_crm_commercial_report",
      expect.objectContaining({
        p_org: "trusted-org",
        p_from: "2026-01-01T00:00:00Z",
        p_to: "2026-02-01T00:00:00Z",
      }),
    );
  });
  it("não aceita organização forjada nem janela inválida", async () => {
    expect(
      (await GET(request("from=2026-01-01&to=2026-02-01&organization_id=forged"))).status,
    ).toBe(422);
    expect((await GET(request("from=2026-02-01&to=2026-01-01"))).status).toBe(422);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("nega acesso antes de consultar", async () => {
    m.guard.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await GET(request())).status).toBe(403);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("falha do banco não vira métricas zero nem expõe texto SQL", async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "internal private data" },
    });
    const r = await GET(request());
    expect(r.status).toBe(500);
    expect(await r.text()).not.toContain("internal private data");
  });
  it("RLS negada fica explícita", async () => {
    m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    expect((await GET(request())).status).toBe(403);
  });
});
