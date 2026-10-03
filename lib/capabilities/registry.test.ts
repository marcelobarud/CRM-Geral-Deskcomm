import { describe, expect, it } from "vitest";
import { resolveCapability, readCapabilityConfig } from "./registry";
import { capabilityDestinations, CAPABILITY_LABELS } from "./presentation";
const settings = (enabled: boolean) => ({
  capabilities: { version: 1, revision: 7, overrides: { message_templates: enabled } },
});
describe("capacidades efetivas", () => {
  it("mantém organizações existentes/novas ligadas por default", () => {
    for (const value of [null, {}, { routing: { enabled: false } }])
      expect(resolveCapability("message_templates", value, "agent")).toMatchObject({
        state: "READY",
        enabled: true,
        can_execute: true,
        revision: 0,
      });
  });
  it("desconhecida não ganha suporte nem autorização", () => {
    expect(
      resolveCapability("campaigns", { capabilities: { overrides: { campaigns: true } } }, "admin"),
    ).toMatchObject({ state: "UNAVAILABLE", can_execute: false, supported: false });
  });
  it("separa habilitação, permissão e prontidão", () => {
    expect(resolveCapability("message_templates", settings(false), "admin")).toMatchObject({
      state: "DISABLED",
      authorized: true,
      can_execute: false,
    });
    expect(resolveCapability("message_templates", settings(true), "viewer")).toMatchObject({
      state: "READY",
      enabled: true,
      authorized: false,
      can_execute: false,
    });
    expect(
      resolveCapability("message_templates", settings(true), "agent", {
        configured: false,
        healthy: false,
      }),
    ).toMatchObject({ state: "ENABLED_NOT_CONFIGURED", authorized: true, can_execute: false });
    expect(
      resolveCapability("message_templates", settings(true), "agent", {
        configured: true,
        healthy: false,
      }),
    ).toMatchObject({ state: "DEGRADED", can_execute: false });
  });
  it("config inválida falha fechada; chaves futuras não habilitam recurso conhecido", () => {
    for (const capabilities of [
      false,
      [],
      { version: 2 },
      { version: 1, revision: -1, overrides: {} },
      { version: 1, revision: 0, overrides: { message_templates: "true" } },
    ]) {
      expect(readCapabilityConfig({ capabilities }).valid).toBe(false);
      expect(resolveCapability("message_templates", { capabilities }, "admin").can_execute).toBe(
        false,
      );
    }
  });
  it("organização A não influencia B", () => {
    expect(resolveCapability("message_templates", settings(false), "agent").can_execute).toBe(
      false,
    );
    expect(resolveCapability("message_templates", {}, "agent").can_execute).toBe(true);
  });
  it("navegação retira destino desativado e mantém core/configuração", () => {
    const items = [
      { href: "/app/templates" },
      { href: "/app/inbox" },
      { href: "/app/settings/capabilities" },
    ];
    expect(
      capabilityDestinations(items, [
        resolveCapability("message_templates", settings(false), "admin"),
      ]),
    ).toEqual(items.slice(1));
    expect(
      capabilityDestinations(items, [
        resolveCapability("message_templates", settings(true), "admin"),
      ]),
    ).toEqual(items);
    expect(CAPABILITY_LABELS.ENABLED_NOT_CONFIGURED).not.toBe(CAPABILITY_LABELS.DISABLED);
  });
});
