import { describe, it, expect } from "vitest";
import { companyDataSchema, companyCommandSchema } from "@/lib/companies/schemas";
describe("B2B simples: contratos de entrada", () => {
  it("normaliza espaços sem identificar homônimos", () =>
    expect(companyDataSchema.parse({ name: "  ACME   Ltda " }).name).toBe("ACME Ltda"));
  it.each(["", " ".repeat(3), "a".repeat(201)])("recusa nome inválido %s", (name) =>
    expect(companyDataSchema.safeParse({ name }).success).toBe(false),
  );
  it.each([{ document: "123" }, { document_type: "registro" }])(
    "documento requer par explícito",
    (value) =>
      expect(companyDataSchema.safeParse({ name: "Empresa", ...value }).success).toBe(false),
  );
  it("permite registro genérico sem pressupor CNPJ", () =>
    expect(
      companyDataSchema.parse({ name: "Empresa", document: "AB-123", document_type: "registro" })
        .document,
    ).toBe("AB-123"));
  it.each(["javascript:alert(1)", "file:///private", "ftp://example.com"])(
    "não aceita site com protocolo %s",
    (website) =>
      expect(companyDataSchema.safeParse({ name: "Empresa", website }).success).toBe(false),
  );
  it("não aceita tenant, estado ou campos fiscais no body", () => {
    for (const extra of [
      { organization_id: "11111111-1111-4111-8111-111111111111" },
      { is_archived: true },
      { cnae: "123" },
    ])
      expect(companyDataSchema.safeParse({ name: "Empresa", ...extra }).success).toBe(false);
  });
  it("não aceita pessoa ou lista de afiliações", () =>
    expect(
      companyCommandSchema.safeParse({
        action: "link",
        contact_id: "11111111-1111-4111-8111-111111111111",
        company_ids: [],
      }).success,
    ).toBe(false));
  it("remove só vínculo opcional", () =>
    expect(
      companyCommandSchema.parse({
        action: "link",
        contact_id: "11111111-1111-4111-8111-111111111111",
        company_id: null,
      }).action,
    ).toBe("link"));
});
