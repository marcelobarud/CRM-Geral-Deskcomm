import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  guard: vi.fn(),
  rpc: vi.fn(),
  warn: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: m.guard }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: m.rpc, from: m.from }),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/logger", () => ({ logger: { warn: m.warn } }));
import { POST } from "@/app/api/v1/companies/route";
const id = "11111111-1111-4111-8111-111111111111",
  org = "22222222-2222-4222-8222-222222222222";
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/v1/companies", {
    method: "POST",
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.guard.mockResolvedValue({ ok: true, org: { orgId: org }, user: { id } });
  m.rpc.mockResolvedValue({ data: { company_id: id }, error: null });
  const chain = { update: m.update, eq: m.eq, is: m.is, select: m.select, single: m.single };
  m.from.mockReturnValue(chain);
  for (const fn of [m.update, m.eq, m.is, m.select]) fn.mockReturnValue(chain);
  m.single.mockResolvedValue({ data: { id, company_id: null }, error: null });
});
describe("B2B API: autorização e referências", () => {
  it.each(["create", "edit", "archive"])("%s exige admin e org da sessão", async (action) => {
    const body =
      action === "create"
        ? { action, data: { name: "ACME" } }
        : action === "edit"
          ? { action, company_id: id, data: { name: "ACME" } }
          : { action, company_id: id };
    expect((await POST(request(body))).status).toBe(200);
    expect(m.guard).toHaveBeenCalledWith("admin", expect.anything());
    expect(m.rpc).toHaveBeenCalledWith(
      "fn_crm_company_command",
      expect.objectContaining({ p_org: org, p_action: action }),
    );
  });
  it.each([id, null])("vínculo %s exige agent e filtra contact/org", async (company_id) => {
    expect((await POST(request({ action: "link", contact_id: id, company_id }))).status).toBe(200);
    expect(m.guard).toHaveBeenCalledWith("agent", expect.anything());
    expect(m.eq).toHaveBeenCalledWith("organization_id", org);
    expect(m.eq).toHaveBeenCalledWith("id", id);
    expect(m.update).toHaveBeenCalledWith({ company_id });
  });
  it("rejeita tenant no body antes do banco", async () => {
    expect(
      (await POST(request({ action: "create", organization_id: org, data: { name: "ACME" } })))
        .status,
    ).toBe(422);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it("não escreve quando guard nega", async () => {
    m.guard.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await POST(request({ action: "create", data: { name: "ACME" } }))).status).toBe(403);
    expect(m.rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["23505", 409],
    ["23503", 409],
    ["42501", 403],
    ["23514", 422],
  ])("sanitiza falha %s", async (code, status) => {
    m.rpc.mockResolvedValue({ data: null, error: { code, message: "private detail" } });
    const r = await POST(request({ action: "archive", company_id: id }));
    expect(r.status).toBe(status);
    expect(JSON.stringify(await r.json())).not.toContain("private detail");
  });
});
