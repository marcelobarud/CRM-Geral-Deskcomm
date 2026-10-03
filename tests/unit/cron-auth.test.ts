import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as NodeCrypto from "node:crypto";
const config = vi.hoisted(() => ({ INTERNAL_CRON_SECRET: "cron-test", INTERNAL_SECRET: "fallback-test" }));
const comparisons = vi.hoisted(() => vi.fn());
vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof NodeCrypto>();
  const timingSafeEqual = (a: NodeJS.ArrayBufferView, b: NodeJS.ArrayBufferView) => {
    comparisons(a.byteLength, b.byteLength);
    return actual.timingSafeEqual(a, b);
  };
  return { ...actual, timingSafeEqual, default: { ...actual, timingSafeEqual } };
});
vi.mock("@/lib/env", () => ({ env: config }));
import { autorizaCron, timingSafeStringEqual } from "@/lib/auth/cron-auth";
const request = (value?: string, header = "authorization") => ({ headers: new Headers(value ? { [header]: value } : {}) });
describe("autorização cron", () => {
  beforeEach(() => { comparisons.mockClear(); config.INTERNAL_CRON_SECRET = "cron-test"; config.INTERNAL_SECRET = "fallback-test"; });
  it.each(["Bearer cron-test", "Bearer fallback-test"])("aceita segredo configurado %s", value => {
    expect(autorizaCron(request(value))).toBe(true);
  });
  it.each([undefined, "Bearer invalid", "Bearer", "Basic cron-test", "Bearer c"])("recusa %s", value => {
    expect(autorizaCron(request(value))).toBe(false);
  });
  it("segredo ausente fecha ambos os transportes", () => {
    config.INTERNAL_CRON_SECRET = ""; config.INTERNAL_SECRET = "";
    expect(autorizaCron(request("Bearer cron-test"))).toBe(false);
    expect(autorizaCron(request("cron-test", "x-cron-secret"), true)).toBe(false);
  });
  it("não cria transporte alternativo em rotas que só aceitam Bearer", () => {
    expect(autorizaCron(request("cron-test", "x-cron-secret"))).toBe(false);
    expect(autorizaCron(request("cron-test", "x-cron-secret"), true)).toBe(true);
  });
  it("compara conteúdo de comprimentos distintos e nunca autoriza vazio", () => {
    expect(timingSafeStringEqual("a", "a")).toBe(true);
    expect(timingSafeStringEqual("a", "aa")).toBe(false);
    expect(timingSafeStringEqual("", "")).toBe(false);
  });
  it("compara os dois segredos com buffers de tamanho fixo, mesmo acertando o primeiro", () => {
    expect(autorizaCron(request("Bearer cron-test"))).toBe(true);
    expect(comparisons.mock.calls).toEqual([[32, 32], [32, 32]]);
  });
});
