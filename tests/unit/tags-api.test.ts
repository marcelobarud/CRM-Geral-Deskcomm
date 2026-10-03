import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ guard: vi.fn(), rpc: vi.fn(), warn: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.guard }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/atendimento/origem", () => ({ observeServiceOrigin: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: async () => null }));
vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn } }));
import { POST } from "@/app/api/v1/tags/route";
const id = "11111111-1111-4111-8111-111111111111";
const org = "22222222-2222-4222-8222-222222222222";
const request = (body: unknown) =>
  new NextRequest("http://localhost/api/v1/tags", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.guard.mockResolvedValue({ ok: true, org: { orgId: org }, user: { id } });
  mocks.rpc.mockResolvedValue({ data: { tag_id: id, audit_recorded: true }, error: null });
});
describe("tags: API não confia em escopo do cliente", () => {
  it.each(["create", "rename", "color", "merge", "delete"])("%s exige admin", async (action) => {
    const payload =
      action === "create"
        ? { action, name: "VIP" }
        : action === "rename"
          ? { action, tag_id: id, name: "VIP" }
          : action === "color"
            ? { action, tag_id: id, color: null }
            : action === "merge"
              ? { action, tag_id: id, destination_id: org }
              : { action, tag_id: id };
    expect((await POST(request(payload))).status).toBe(200);
    expect(mocks.guard).toHaveBeenCalledWith("admin", expect.anything());
    expect(mocks.rpc).toHaveBeenCalledWith(
      "fn_crm_tag_manage",
      expect.objectContaining({ p_org: org, p_action: action }),
    );
  });
  it.each([true, false])(
    "atribuição %s exige agent e usa organização validada",
    async (assigned) => {
      expect(
        (
          await POST(
            request({
              action: "assign",
              tag_id: id,
              entity_kind: "lead",
              entity_id: org,
              assigned,
            }),
          )
        ).status,
      ).toBe(200);
      expect(mocks.guard).toHaveBeenCalledWith("agent", expect.anything());
      expect(mocks.rpc).toHaveBeenCalledWith(
        "fn_crm_tag_assign",
        expect.objectContaining({ p_org: org, p_assign: assigned }),
      );
    },
  );
  it("rejeita organização no body sem chamar o banco", async () => {
    expect(
      (await POST(request({ action: "delete", tag_id: id, organization_id: org }))).status,
    ).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("propaga negação do guard sem mutação", async () => {
    mocks.guard.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) });
    expect((await POST(request({ action: "create", name: "VIP" }))).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each([
    ["23505", 409],
    ["23503", 409],
    ["42501", 403],
    ["22023", 422],
  ])("erro %s é comunicado sem dados brutos", async (code, status) => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code, message: "private database contents" },
    });
    const response = await POST(request({ action: "delete", tag_id: id }));
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain("private database contents");
  });
});
