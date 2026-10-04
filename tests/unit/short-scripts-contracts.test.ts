import { describe, it, expect } from "vitest";
import { scriptDefinitionSchema, scriptCommandSchema, answerValid } from "@/lib/scripts/contracts";
import { conditionSchema, actionSchema } from "@/lib/schemas/webhooks";
import { resolveField, evaluateConditions } from "@/lib/automation/conditions";
const id = "8bdc1a90-5e0d-4d42-81b1-94b1928dbfe0";
const text = { id, type: "text" as const, prompt: "Necessidade?" };
const definition = { name: "Coleta", description: "Fictícia", is_active: true, steps: [text] };
describe("Coleta curta — fronteira de estrutura e resposta", () => {
  it("recusa código, tipos arbitrários, loop e campos extras", () => {
    for (const extra of [
      { code: "eval(x)" },
      { next_step: id },
      { http: "https://example.invalid" },
    ])
      expect(
        scriptDefinitionSchema.safeParse({ ...definition, steps: [{ ...text, ...extra }] }).success,
      ).toBe(false);
    expect(
      scriptDefinitionSchema.safeParse({ ...definition, steps: [{ ...text, type: "loop" }] })
        .success,
    ).toBe(false);
  });
  it("recusa IDs duplicados e escolhas ambíguas", () => {
    expect(scriptDefinitionSchema.safeParse({ ...definition, steps: [text, text] }).success).toBe(
      false,
    );
    expect(
      scriptDefinitionSchema.safeParse({
        ...definition,
        steps: [{ ...text, type: "choice", options: ["Sim", "Sim"] }],
      }).success,
    ).toBe(false);
  });
  it("resposta é validada no tipo do passo, sem coerção de confirmação", () => {
    expect(answerValid({ ...text, type: "confirmation" }, "true")).toBe(false);
    expect(answerValid({ ...text, type: "confirmation" }, false)).toBe(true);
    expect(answerValid({ ...text, type: "choice", options: ["A", "B"] }, "C")).toBe(false);
    expect(answerValid(text, " ")).toBe(false);
  });
  it("comando não pode promover resposta ao CRM nem escolher organização", () => {
    const answer = { action: "answer", id, expected_revision: 1, step_id: id, answer: "Fictício" };
    expect(scriptCommandSchema.safeParse(answer).success).toBe(true);
    expect(scriptCommandSchema.safeParse({ ...answer, organization_id: id }).success).toBe(false);
    expect(scriptCommandSchema.safeParse({ ...answer, update_contact: true }).success).toBe(false);
    expect(scriptCommandSchema.safeParse({ ...answer, expected_revision: 0 }).success).toBe(false);
  });
});
describe("Condições do motor existente", () => {
  it("não lê propriedade herdada nem prototype", () => {
    expect(resolveField({ lead: Object.create({ name: "herdado" }) }, "lead.name")).toBeUndefined();
    expect(
      conditionSchema.safeParse({ field: "lead.__proto__.name", op: "eq", value: "x" }).success,
    ).toBe(false);
    expect(conditionSchema.safeParse({ field: "constructor", op: "eq", value: "x" }).success).toBe(
      false,
    );
  });
  it("documenta null e conserva alias textual e UUID", () => {
    expect(
      evaluateConditions([{ field: "lead.name", op: "neq", value: "x" }], { lead: { name: null } }),
    ).toBe(true);
    expect(
      evaluateConditions([{ field: "lead.tag_ids", op: "contains", value: id }], {
        lead: { tag_ids: [id], tags: ["VIP"] },
      }),
    ).toBe(true);
    expect(
      evaluateConditions([{ field: "lead.tags", op: "contains", value: "VIP" }], {
        lead: { tags: ["VIP"] },
      }),
    ).toBe(true);
  });
  it("novas ações escolhem identidade, contrato legado permanece aceito", () => {
    expect(actionSchema.safeParse({ type: "add_tag", config: { tag_ids: [id] } }).success).toBe(
      true,
    );
    expect(actionSchema.safeParse({ type: "add_tag", config: { tags: ["VIP"] } }).success).toBe(
      true,
    );
    expect(
      actionSchema.safeParse({ type: "add_tag", config: { tag_ids: [id], sql: "delete" } }).success,
    ).toBe(false);
  });
});
