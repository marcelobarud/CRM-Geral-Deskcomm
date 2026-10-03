import { z } from "zod";
export const proposalItemSchema = z
  .object({
    description: z.string().trim().min(1).max(1000),
    quantity: z
      .string()
      .regex(/^[0-9]{1,9}(\.[0-9]{1,3})?$/)
      .refine((v) => /^[0-9]{1,9}(\.[0-9]{1,3})?$/.test(v) && BigInt(v.replace(".", "")) > 0),
    unit_price_cents: z
      .string()
      .regex(/^[0-9]{1,16}$/)
      .refine((v) => /^[0-9]{1,16}$/.test(v) && BigInt(v) <= BigInt(Number.MAX_SAFE_INTEGER)),
    product_id: z.uuid().optional(),
  })
  .strict();
export const proposalDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    currency: z.string().regex(/^[A-Z]{3}$/),
    notes: z.string().max(10000).default(""),
    items: z.array(proposalItemSchema).min(1).max(100),
    lead_id: z.uuid().optional(),
    contact_id: z.uuid().optional(),
    template_id: z.uuid().optional(),
    expected_revision: z.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => !(v.lead_id && v.contact_id));
export const proposalSendSchema = z
  .object({
    recipient: z.string().trim().min(1).max(300),
    channel: z.enum(["email", "whatsapp", "other"]),
  })
  .strict();
export const proposalTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    currency: z.string().regex(/^[A-Z]{3}$/),
    content: z
      .object({ notes: z.string().max(10000), items: z.array(proposalItemSchema).min(1).max(100) })
      .strict(),
  })
  .strict();
export type ProposalItem = z.infer<typeof proposalItemSchema>;
/** Inteiro de milésimos; arredondamento por item, sem ponto flutuante. */
export function proposalTotal(items: ProposalItem[]): string {
  let total = 0n;
  for (const item of items) {
    proposalItemSchema.parse(item);
    const [whole, decimal = ""] = item.quantity.split(".");
    const quantity = BigInt(whole!) * 1000n + BigInt(decimal.padEnd(3, "0"));
    total += (quantity * BigInt(item.unit_price_cents) + 500n) / 1000n;
  }
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("proposal_total_overflow");
  return total.toString();
}
export interface ProposalSnapshot {
  author_name?: string;
  title: string;
  notes: string;
  currency: string;
  total_cents: string;
  items: (ProposalItem & { total_cents: string })[];
  brand: { nome?: string } | null;
  context: {
    contact: { name: string | null; email: string | null; phone: string | null };
    company: { name?: string } | null;
  } | null;
  created_at: string;
  author_id: string;
}
