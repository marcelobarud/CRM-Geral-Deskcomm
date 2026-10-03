import { describe, expect, it } from "vitest";
import {
  normalizeTagName,
  tagCommandSchema,
  tagNameSchema,
  tagReadSchema,
} from "@/lib/tags/schemas";
import { presentTags } from "@/lib/tags/presentation";
import type { TagCatalog } from "@/lib/tags/types";
const id = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
describe("tags: identidade e entrada", () => {
  it.each(["VIP", "vip", " Vip  ", "\tVIP\n"])("converge a variante %s", (name) =>
    expect(normalizeTagName(name)).toBe("vip"),
  );
  it("conserva acentos e pontuação; NFC iguala grafias Unicode equivalentes", () => {
    expect(normalizeTagName("  Pré   venda! ")).toBe("pré venda!");
    expect(normalizeTagName("Pre\u0301 venda!")).toBe("pré venda!");
    expect(normalizeTagName("Pré venda")).not.toBe(normalizeTagName("Pre venda"));
  });
  it("rejeita branco e excesso sem truncar", () => {
    expect(tagNameSchema.safeParse(" \n ").success).toBe(false);
    expect(tagNameSchema.safeParse("a".repeat(41)).success).toBe(false);
  });
  it.each([
    { action: "create", name: "VIP" },
    { action: "rename", tag_id: id, name: "Cliente VIP" },
    { action: "color", tag_id: id, color: null },
    { action: "color", tag_id: id, color: "#ffffff" },
    { action: "merge", tag_id: id, destination_id: other },
    { action: "delete", tag_id: id },
    { action: "assign", tag_id: id, entity_kind: "contact", entity_id: other, assigned: true },
    {
      action: "assign",
      tag_id: id,
      entity_kind: "conversation",
      entity_id: other,
      assigned: false,
    },
  ])("aceita contrato %j", (command) =>
    expect(tagCommandSchema.safeParse(command).success).toBe(true),
  );
  it("rejeita organização fornecida pelo cliente e novo escopo", () => {
    expect(
      tagCommandSchema.safeParse({ action: "create", name: "VIP", organization_id: other }).success,
    ).toBe(false);
    expect(
      tagCommandSchema.safeParse({
        action: "assign",
        tag_id: id,
        entity_kind: "company",
        entity_id: other,
        assigned: true,
      }).success,
    ).toBe(false);
  });
  it("cor não permite CSS arbitrário e query exige par de contexto", () => {
    expect(
      tagCommandSchema.safeParse({ action: "color", tag_id: id, color: "url(javascript:alert(1))" })
        .success,
    ).toBe(false);
    expect(tagReadSchema.safeParse({ entity_kind: "lead" }).success).toBe(false);
  });
  it("mostra um único nome atual após rename/merge, sem expor aliases como novas tags", () => {
    const catalog: TagCatalog = {
      tags: [
        {
          id,
          name: "Relacionamento",
          normalized_name: "relacionamento",
          color: null,
          created_at: "2026-10-03",
          updated_at: "2026-10-03",
        },
      ],
      aliases: [
        { tag_id: id, normalized_name: "vip" },
        { tag_id: id, normalized_name: "cliente vip" },
      ],
      assigned_ids: [id],
    };
    expect(
      presentTags(["VIP", "vip", "Cliente VIP", "Relacionamento"], catalog).map((tag) => tag.id),
    ).toEqual([id]);
  });
});
