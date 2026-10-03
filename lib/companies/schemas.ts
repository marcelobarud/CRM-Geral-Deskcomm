import { z } from "zod";
const text = (max: number) => z.string().trim().max(max).nullable().optional();
export const companyDataSchema = z
  .object({
    name: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s+/g, " "))
      .pipe(z.string().min(1).max(200)),
    legal_name: text(200),
    document: text(100),
    document_type: text(50),
    email: z.email().nullable().optional(),
    phone: z
      .string()
      .regex(/^\+\d{8,15}$/)
      .nullable()
      .optional(),
    website: z
      .url()
      .refine((v) => /^https?:\/\//i.test(v))
      .nullable()
      .optional(),
    address: text(300),
    city: text(100),
    state: text(100),
    country: text(100),
    notes: text(4000),
  })
  .strict()
  .refine((v) => Boolean(v.document?.trim()) === Boolean(v.document_type?.trim()), {
    message: "Informe documento e tipo juntos.",
  });
export const companyCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: companyDataSchema }).strict(),
  z.object({ action: z.literal("edit"), company_id: z.uuid(), data: companyDataSchema }).strict(),
  z.object({ action: z.literal("archive"), company_id: z.uuid() }).strict(),
  z
    .object({ action: z.literal("link"), contact_id: z.uuid(), company_id: z.uuid().nullable() })
    .strict(),
]);
export const companyReadSchema = z
  .object({
    company_id: z.uuid().optional(),
    contact_id: z.uuid().optional(),
    search: z.string().trim().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();
export type CompanyCommand = z.infer<typeof companyCommandSchema>;
