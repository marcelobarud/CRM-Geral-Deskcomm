import { describe, expect, it, vi } from "vitest";
const failure = vi.hoisted(() => ({ code: "23503" }));
vi.mock("@/lib/local-dev/rest", () => ({
  identifier: (name: string) => name,
  responseRows: vi.fn(),
  withRestContext: async () => { throw Object.assign(new Error("valor pessoal que não deve sair"), failure); },
}));
import { POST } from "@/app/rest/v1/rpc/[fn]/route";
describe("RPC local preserva SQLSTATE sem expor o erro do driver", () => {
  it.each([["23503", 409], ["23001", 409], ["42501", 403], ["XX000", 500]])("%s retorna %s", async (code, status) => {
    failure.code = String(code);
    const response = await POST(new Request("http://localhost/rest/v1/rpc/fn_apagar_contato_com_historico", { method: "POST" }), { params: Promise.resolve({ fn: "fn_apagar_contato_com_historico" }) });
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain("valor pessoal");
  });
});
