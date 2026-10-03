import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), db: vi.fn(), audit: vi.fn(), support: vi.fn() }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: mocks.auth }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.db }));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: mocks.support }));
import { GET, PATCH } from "./route";
import { POST, GET as templatesGET } from "@/app/api/v1/message-templates/route";
import { crmListMessageTemplates, crmRenderMessageTemplate } from "@/lib/mcp/tools/operacao";
import type { McpContext } from "@/lib/mcp/types";
describe("API e MCP com flag real", () => {
  const configs: Record<string, boolean> = { A: false, B: true };
  let actorOrg = "A";
  let effects: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    actorOrg = "A";
    configs.A = false;
    configs.B = true;
    mocks.support.mockResolvedValue(null);
    mocks.auth.mockImplementation(async () => ({
      ok: true,
      user: { id: "admin", idioma: "pt-BR" },
      org: { orgId: actorOrg, role: "admin" },
    }));
    effects = vi.fn(() => ({
      select: () => ({ single: async () => ({ data: { id: "new" }, error: null }) }),
    }));
    mocks.db.mockResolvedValue({
      from: (table: string) =>
        table === "organizations"
          ? {
              select: () => ({
                eq: (_key: string, id: string) => ({
                  maybeSingle: async () => ({
                    data: {
                      settings: {
                        capabilities: {
                          version: 1,
                          revision: 1,
                          overrides: { message_templates: configs[id] },
                        },
                      },
                    },
                    error: null,
                  }),
                }),
              }),
            }
          : {
              insert: effects,
              select: () => ({
                eq: () => ({ order: async () => ({ data: [{ id: "history" }], error: null }) }),
              }),
            },
      rpc: vi.fn(async () => ({
        data: { previous_enabled: false, enabled: true, revision: 2 },
        error: null,
      })),
    });
  });
  it("bloqueia POST direto antes da mutação; habilitada e autorizada permite", async () => {
    const req = () =>
      new NextRequest("http://localhost/api/v1/message-templates", {
        method: "POST",
        body: JSON.stringify({ title: "Teste", body: "Texto", shared: false }),
      });
    expect((await POST(req())).status).toBe(403);
    expect(effects).not.toHaveBeenCalled();
    actorOrg = "B";
    expect((await POST(req())).status).toBe(201);
    expect(effects).toHaveBeenCalledTimes(1);
  });
  it("histórico autorizado permanece acessível; consulta para uso é bloqueada", async () => {
    expect(
      (await templatesGET(new NextRequest("http://localhost/api/v1/message-templates"))).status,
    ).toBe(403);
    const response = await templatesGET(
      new NextRequest("http://localhost/api/v1/message-templates?history=1"),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([{ id: "history" }]);
  });
  it("mantém recusa RBAC e não consulta configuração nessa situação", async () => {
    const { fail } = await import("@/lib/api/wrappers");
    mocks.auth.mockResolvedValue({
      ok: false,
      response: fail("forbidden_role", "Sem permissão", 403),
    });
    expect((await GET()).status).toBe(403);
    expect(mocks.db).not.toHaveBeenCalled();
  });
  it("read model não aceita org do corpo e PATCH valida chave/booleana e audita", async () => {
    expect((await (await GET()).json()).data.organization_id).toBe("A");
    const patch = (body: unknown) =>
      PATCH(new Request("http://localhost", { method: "PATCH", body: JSON.stringify(body) }));
    expect((await patch({ capability: "campaigns", enabled: true })).status).toBe(422);
    expect(
      (await patch({ capability: "message_templates", enabled: true, organization_id: "B" }))
        .status,
    ).toBe(422);
    expect((await patch({ capability: "message_templates", enabled: true })).status).toBe(200);
    expect(mocks.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "A",
        metadata: expect.objectContaining({ previous_enabled: false, enabled: true, revision: 2 }),
      }),
    );
  });
  it("MCP não contorna desativação por usar service role", async () => {
    const ctx = { organizationId: "A", role: "agent", supabase: await mocks.db() } as McpContext;
    await expect(crmListMessageTemplates.handler({}, ctx)).rejects.toMatchObject({
      code: "capability_blocked",
    });
    await expect(
      crmRenderMessageTemplate.handler(
        { template_id: "00000000-0000-0000-0000-000000000001" },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "capability_blocked" });
  });
});
