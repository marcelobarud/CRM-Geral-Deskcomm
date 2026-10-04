import { z } from "zod";

export const scriptStepSchema = z.discriminatedUnion("type", [
  z.strictObject({
    id: z.uuid(),
    type: z.literal("text"),
    prompt: z.string().trim().min(1).max(500),
  }),
  z.strictObject({
    id: z.uuid(),
    type: z.literal("choice"),
    prompt: z.string().trim().min(1).max(500),
    options: z
      .array(z.string().trim().min(1).max(100))
      .min(2)
      .max(6)
      .refine((v) => new Set(v).size === v.length),
  }),
  z.strictObject({
    id: z.uuid(),
    type: z.literal("confirmation"),
    prompt: z.string().trim().min(1).max(500),
  }),
]);
export const scriptDefinitionSchema = z.strictObject({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000),
  is_active: z.boolean(),
  steps: z
    .array(scriptStepSchema)
    .min(1)
    .max(12)
    .refine((v) => new Set(v.map((s) => s.id)).size === v.length),
});
export type ScriptDefinition = z.infer<typeof scriptDefinitionSchema>;
export type ScriptStep = z.infer<typeof scriptStepSchema>;
export const scriptCommandSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("create"), definition: scriptDefinitionSchema }),
  z.strictObject({
    action: z.literal("update"),
    id: z.uuid(),
    expected_revision: z.number().int().positive(),
    definition: scriptDefinitionSchema,
  }),
  z.strictObject({ action: z.literal("start"), script_id: z.uuid(), conversation_id: z.uuid() }),
  z.strictObject({
    action: z.literal("answer"),
    id: z.uuid(),
    expected_revision: z.number().int().positive(),
    step_id: z.uuid(),
    answer: z.union([z.string().trim().min(1).max(2000), z.boolean()]),
  }),
  z.strictObject({
    action: z.literal("interrupt"),
    id: z.uuid(),
    expected_revision: z.number().int().positive(),
    reason: z.string().trim().min(1).max(300),
  }),
  z.strictObject({
    action: z.literal("resume"),
    id: z.uuid(),
    expected_revision: z.number().int().positive(),
  }),
]);
export type ScriptSession = {
  id: string;
  script_id: string;
  conversation_id: string;
  snapshot: ScriptDefinition;
  status: "running" | "interrupted" | "completed";
  current_step: number;
  answers: Record<string, string | boolean>;
  interruption_reason: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};
export function answerValid(step: ScriptStep, answer: unknown) {
  if (step.type === "confirmation") return typeof answer === "boolean";
  if (typeof answer !== "string" || !answer.trim() || answer.length > 2000) return false;
  return step.type !== "choice" || step.options.includes(answer);
}
