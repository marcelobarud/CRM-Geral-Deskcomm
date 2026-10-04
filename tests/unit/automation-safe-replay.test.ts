import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventRow } from "@/lib/event-log/dispatcher";
import type { ActionResultDetail } from "@/lib/automation/types";
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));
import { runAutomationForEvent } from "@/lib/automation/engine";
import { registerAction } from "@/lib/automation/actions";
const row = {
  id: "event",
  organization_id: "org-a",
  event_type: "message.received",
  entity_kind: "message",
  entity_id: "message",
  payload: {},
  metadata: {},
} as unknown as EventRow;
function fixture(
  actions: Array<{ type: string; config?: Record<string, unknown> }>,
  failInsert = false,
) {
  const rules = [{ id: "rule", name: "Fictícia", conditions: [], actions }];
  const runs: Array<{ actions_result: ActionResultDetail[]; status: string }> = [];
  const filters: Array<[string, string, unknown]> = [];
  const db = {
    from(table: string) {
      let mutation: Record<string, unknown> | undefined,
        mode = "select",
        cols = "";
      const result = () =>
        mode === "insert"
          ? failInsert
            ? { data: null, error: { code: "08006" } }
            : (runs.push(mutation as unknown as (typeof runs)[number]),
              { data: { id: "run" }, error: null })
          : table === "automation_rule_runs"
            ? { data: runs.at(-1) ?? null, error: null }
            : cols === "run_count"
              ? { data: { run_count: 0 }, error: null }
              : { data: rules, error: null };
      const q = {
        select(value: string) {
          cols = value;
          return q;
        },
        eq(key: string, value: unknown) {
          filters.push([table, key, value]);
          return q;
        },
        order() {
          return q;
        },
        limit() {
          return q;
        },
        insert(value: Record<string, unknown>) {
          mode = "insert";
          mutation = value;
          return q;
        },
        update() {
          mode = "update";
          return q;
        },
        maybeSingle() {
          return Promise.resolve(result());
        },
        then(resolve: (value: ReturnType<typeof result>) => unknown) {
          return Promise.resolve(result()).then(resolve);
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, rules, runs, filters };
}
describe("motor: replay seguro e efeito externo incerto", () => {
  let external: number, tag: number;
  beforeEach(() => {
    external = 0;
    tag = 0;
    registerAction({
      type: "assign_owner",
      execute: async () => {
        external++;
        return { type: "assign_owner", status: "success" };
      },
    });
    registerAction({
      type: "add_tag",
      execute: async () => {
        tag++;
        return { type: "add_tag", status: tag === 1 ? "failed" : "success" };
      },
    });
  });
  it("tag transacional falha observável e permite retry pelo consumidor", async () => {
    const f = fixture([{ type: "add_tag" }]);
    expect((await runAutomationForEvent(f.db, row)).status).toBe("error");
    expect(f.runs[0]?.status).toBe("failed");
    expect((await runAutomationForEvent(f.db, row)).status).toBe("ok");
    expect(tag).toBe(2);
    expect(f.filters).toContainEqual(["automation_rule_runs", "organization_id", "org-a"]);
  });
  it("regra mista não arma retry automático e conserva efeito externo no replay explícito", async () => {
    const f = fixture([
      { type: "assign_owner", config: { user_id: "original" } },
      { type: "add_tag" },
    ]);
    expect((await runAutomationForEvent(f.db, row)).status).toBe("ok");
    expect(f.runs[0]?.status).toBe("partial");
    await runAutomationForEvent(f.db, row);
    expect(external).toBe(1);
    expect(tag).toBe(2);
    f.rules[0]!.actions[0]!.config = { user_id: "changed" };
    await runAutomationForEvent(f.db, row);
    expect(external).toBe(1);
    expect(f.runs.at(-1)?.actions_result[0]?.error).toBe("action_changed_after_attempt");
  });
  it("falha do registro só libera redrive quando todos os efeitos têm recibo transacional", async () => {
    expect((await runAutomationForEvent(fixture([{ type: "add_tag" }], true).db, row)).status).toBe(
      "error",
    );
    const result = await runAutomationForEvent(fixture([{ type: "assign_owner" }], true).db, row);
    expect(result.status).toBe("skipped");
    expect(result.detail).toBe("automation_external_result_unconfirmed");
  });
});
