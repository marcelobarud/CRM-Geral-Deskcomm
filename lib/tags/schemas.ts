import { z } from "zod";

export function normalizeTagName(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, " ").trim().toLowerCase();
}
export const tagNameSchema = z
  .string()
  .transform((v) => v.normalize("NFC").replace(/\s+/gu, " ").trim())
  .pipe(z.string().min(1).max(40));
export const tagColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .nullable();
export const tagKindSchema = z.enum(["contact", "lead", "conversation"]);
const id = z.string().uuid();
export const tagCommandSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("create"), name: tagNameSchema, color: tagColorSchema.optional() })
    .strict(),
  z
    .object({
      action: z.literal("rename"),
      tag_id: id,
      name: tagNameSchema,
    })
    .strict(),
  z.object({ action: z.literal("color"), tag_id: id, color: tagColorSchema }).strict(),
  z.object({ action: z.literal("merge"), tag_id: id, destination_id: id }).strict(),
  z.object({ action: z.literal("delete"), tag_id: id }).strict(),
  z
    .object({
      action: z.literal("assign"),
      tag_id: id,
      entity_kind: tagKindSchema,
      entity_id: id,
      assigned: z.boolean(),
    })
    .strict(),
]);
export type TagCommand = z.infer<typeof tagCommandSchema>;
export type TagKind = z.infer<typeof tagKindSchema>;
export const tagReadSchema = z
  .object({
    entity_kind: tagKindSchema.optional(),
    entity_id: id.optional(),
    impact_tag_id: id.optional(),
  })
  .strict()
  .refine((v) => !!v.entity_kind === !!v.entity_id);
