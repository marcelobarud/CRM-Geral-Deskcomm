import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HandlerCtx } from "@/lib/api/handlers/types";
const auditSpy = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/lib/audit", () => ({ audit: auditSpy, isServiceRoleConfigured: () => false, hashEmail: (email: string) => email }));
const ctx: HandlerCtx = { organization_id: "org-a", actor: { type: "user", id: "user-a" }, requestId: "req-test" };
function fake(options: { missing?: boolean; rpcFalse?: boolean; error?: { code: string; message: string } } = {}) {
  const deleteSpy = vi.fn(() => { throw new Error("DELETE fora da transação"); });
  const rpc = vi.fn(async (name: string) => name === "fn_apagar_contato_com_historico"
    ? { data: !options.rpcFalse, error: options.error ?? null } : { data: null, error: null });
  const chain = { eq: () => chain, maybeSingle: async () => ({ data: options.missing ? null : { id: "contact-a" }, error: null }) };
  return { from: () => ({ select: () => chain, delete: deleteSpy }), rpc, deleteSpy };
}
beforeEach(() => auditSpy.mockClear());
describe("exclusão de contato", () => {
  it("usa uma RPC transacional e emite sucesso", async () => {
    const { deleteContactHandler } = await import("@/app/api/v1/contacts/_handler");
    const client = fake();
    expect(await deleteContactHandler(client as never, ctx, "contact-a")).toEqual({ id: "contact-a" });
    expect(client.rpc).toHaveBeenCalledWith("fn_apagar_contato_com_historico", { p_contact_id: "contact-a", p_organization_id: "org-a" });
    expect(client.deleteSpy).not.toHaveBeenCalled();
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: "contact.deleted" }));
  });
  it.each(["23503", "23001", "42501", "XX000"])("audita rollback de %s sem sucesso nem exclusão parcial", async code => {
    const { deleteContactHandler } = await import("@/app/api/v1/contacts/_handler");
    const client = fake({ error: { code, message: "failure" } });
    await expect(deleteContactHandler(client as never, ctx, "contact-a")).rejects.toMatchObject({ status: code === "23503" || code === "23001" ? 409 : 500 });
    expect(client.deleteSpy).not.toHaveBeenCalled();
    expect(auditSpy).toHaveBeenCalledWith(expect.objectContaining({ action: "contact.delete_blocked", metadata: expect.objectContaining({ apagados: [] }) }));
    expect(auditSpy).not.toHaveBeenCalledWith(expect.objectContaining({ action: "contact.deleted" }));
  });
  it.each([{ missing: true }, { rpcFalse: true }])("404 para ficha inacessível ou removida em corrida", async options => {
    const { deleteContactHandler } = await import("@/app/api/v1/contacts/_handler");
    await expect(deleteContactHandler(fake(options) as never, ctx, "contact-a")).rejects.toMatchObject({ status: 404 });
    expect(auditSpy).not.toHaveBeenCalled();
  });
});
