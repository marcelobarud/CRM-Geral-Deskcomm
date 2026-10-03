import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { assertCapability, runCapabilityEffect } from "./server";
function database() {
  const overrides: Record<string, boolean> = { A: true, B: true };
  const rows = [{ text: "Histórico" }];
  const db = {
    from: vi.fn(() => ({
      select: () => ({
        eq: (_key: string, id: string) => ({
          maybeSingle: async () => ({
            data: {
              settings: {
                capabilities: {
                  version: 1,
                  revision: 0,
                  overrides: { message_templates: overrides[id] },
                },
              },
            },
            error: null,
          }),
        }),
      }),
    })),
  } as unknown as SupabaseClient;
  return { db, overrides, rows };
}
describe("guard e contrato de executor", () => {
  it("relê antes de cada efeito e preserva histórico sem contaminar outra organização", async () => {
    const { db, overrides, rows } = database();
    const effect = vi.fn(async () => "executado");
    await expect(runCapabilityEffect(db, "A", "message_templates", "agent", effect)).resolves.toBe(
      "executado",
    );
    overrides.A = false;
    await expect(
      runCapabilityEffect(db, "A", "message_templates", "agent", effect),
    ).rejects.toMatchObject({ code: "capability_blocked" });
    expect(effect).toHaveBeenCalledTimes(1);
    expect(rows).toEqual([{ text: "Histórico" }]);
    await expect(
      assertCapability(db, "A", "message_templates", "agent", "history"),
    ).resolves.toMatchObject({ state: "DISABLED" });
    await expect(runCapabilityEffect(db, "B", "message_templates", "agent", effect)).resolves.toBe(
      "executado",
    );
  });
  it("habilitação não substitui permissão", async () => {
    const { db } = database();
    const effect = vi.fn();
    await expect(
      runCapabilityEffect(db, "A", "message_templates", "viewer", effect),
    ).rejects.toMatchObject({ code: "capability_blocked" });
    expect(effect).not.toHaveBeenCalled();
  });
  it("falha de banco não usa default permissivo", async () => {
    const db = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: {} }) }) }),
      }),
    } as unknown as SupabaseClient;
    await expect(assertCapability(db, "A", "message_templates", "admin")).rejects.toMatchObject({
      status: 503,
    });
  });
});
