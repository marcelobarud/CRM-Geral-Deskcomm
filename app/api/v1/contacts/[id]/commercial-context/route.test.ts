import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const id = "11111111-1111-4111-8111-111111111111";
const org = "22222222-2222-4222-8222-222222222222";
const calls: { table: string; column: string; value: unknown }[] = [];
let missing = false;
let failed = false;
let related = false;
beforeEach(() => {
  calls.length = 0;
  missing = false;
  failed = false;
  related = false;
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    org: { orgId: org, role: "viewer", name: "Fixture" },
    user: {},
  } as never);
  vi.mocked(createClient).mockResolvedValue({
    from(table: string) {
      const result = () => ({
        data:
          table === "contacts"
            ? missing
              ? null
              : { id }
            : related && table === "crm_leads"
              ? [{ id }]
              : related && table === "crm_tasks"
                ? [{ id: "task", due_date: null, created_at: "2026-10-03T00:00:00Z" }]
                : [],
        error: failed && table === "crm_tasks" ? { message: "private internal detail" } : null,
      });
      const query = {
        select: () => query,
        eq: (column: string, value: unknown) => {
          calls.push({ table, column, value });
          return query;
        },
        order: () => query,
        or: () => query,
        in: (column: string, value: unknown) => {
          calls.push({ table, column, value });
          return query;
        },
        limit: () => query,
        maybeSingle: async () => result(),
        then: (resolve: (value: unknown) => void) => Promise.resolve(result()).then(resolve),
      };
      return query;
    },
  } as never);
});
const read = (contact = id) =>
  GET(
    new Request(
      `http://localhost/api/v1/contacts/${contact}/commercial-context?organization_id=untrusted`,
    ),
    { params: Promise.resolve({ id: contact }) },
  );
describe("Contexto comercial autenticado", () => {
  it("inclui tarefas do contato e da oportunidade sem duplicar o registro", async () => {
    related = true;
    const response = await read();
    expect((await response.json()).data.tasks).toHaveLength(1);
    expect(calls).toContainEqual({ table: "crm_tasks", column: "lead_id", value: [id] });
    expect(calls).toContainEqual({ table: "crm_tasks", column: "contact_id", value: id });
  });
  it("retorna os estados vazios reais e filtra todas as tabelas pela organização confiável", async () => {
    const response = await read();
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ leads: [], tasks: [], appointments: [] });
    expect(response.headers.get("cache-control")).toContain("no-store");
    for (const table of ["contacts", "crm_leads", "crm_tasks", "calendar_appointments"])
      expect(calls).toContainEqual({ table, column: "organization_id", value: org });
  });
  it("não transforma falha parcial em contexto vazio nem revela erro interno", async () => {
    failed = true;
    const response = await read();
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private internal detail");
  });
  it("contato inexistente ou invisível não consulta relações", async () => {
    missing = true;
    expect((await read()).status).toBe(404);
    expect(calls.every((call) => call.table === "contacts")).toBe(true);
  });
  it("recusa identificador inválido antes de consultar", async () => {
    expect((await read("invalid")).status).toBe(422);
    expect(calls).toHaveLength(0);
  });
  it("repassa a recusa do guard sem consultar banco", async () => {
    vi.mocked(requireRole).mockResolvedValue({
      ok: false,
      response: new NextResponse(null, { status: 401 }),
    });
    expect((await read()).status).toBe(401);
    expect(calls).toHaveLength(0);
  });
});
