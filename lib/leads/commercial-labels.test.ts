import { expect, it } from "vitest";
import { activityLabel } from "./activity-vocabulary";
import { REASON_LABELS } from "./lost-reasons";
import { CANONICAL_LOST_REASONS } from "@/lib/schemas/leads";
it("criação manual não afirma entrada por um canal", () => {
  expect(activityLabel("lead_created")).toBe("Oportunidade criada");
});
it("todos os motivos canônicos continuam legíveis no resultado e no formulário", () => {
  for (const reason of CANONICAL_LOST_REASONS) expect(REASON_LABELS[reason]).toBeTruthy();
  expect(REASON_LABELS.price).toBe("Preço");
});
