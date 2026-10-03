import { roleAtLeast, type Role } from "@/lib/auth/types";

/** Suporte é propriedade da release, não uma autorização editável pelo browser. */
export const CAPABILITIES = {
  proposals: {
    name: "Propostas",
    description: "Propostas comerciais com versões preservadas e PDF privado.",
    default_enabled: false,
    min_role: "agent" as Role,
    href: "/app/proposals",
  },
  message_templates: {
    name: "Respostas rápidas",
    description: "Criar e usar respostas salvas, pessoais ou da equipe.",
    default_enabled: true,
    min_role: "agent" as Role,
    href: "/app/templates",
  },
} as const;
export type CapabilityId = keyof typeof CAPABILITIES;
export type CapabilityState =
  "UNAVAILABLE" | "DISABLED" | "ENABLED_NOT_CONFIGURED" | "READY" | "DEGRADED";
export interface EffectiveCapability {
  id: string;
  name: string;
  description: string;
  supported: boolean;
  enabled: boolean;
  authorized: boolean;
  state: CapabilityState;
  can_execute: boolean;
  reason: string | null;
  config_version: number;
  revision: number;
}
export function isCapabilityId(value: string): value is CapabilityId {
  return Object.hasOwn(CAPABILITIES, value);
}
type Config = {
  valid: boolean;
  revision: number;
  overrides: Partial<Record<CapabilityId, boolean>>;
};
export function readCapabilityConfig(settings: unknown): Config {
  const root =
    settings && typeof settings === "object" ? (settings as Record<string, unknown>) : {};
  if (root.capabilities === undefined || root.capabilities === null)
    return { valid: true, revision: 0, overrides: {} };
  const raw = root.capabilities as Record<string, unknown>;
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw) ||
    raw.version !== 1 ||
    !Number.isSafeInteger(raw.revision) ||
    (raw.revision as number) < 0 ||
    !raw.overrides ||
    typeof raw.overrides !== "object" ||
    Array.isArray(raw.overrides)
  ) {
    return { valid: false, revision: 0, overrides: {} };
  }
  const overrides: Config["overrides"] = {};
  for (const [id, enabled] of Object.entries(raw.overrides)) {
    if (isCapabilityId(id)) {
      if (typeof enabled !== "boolean") return { valid: false, revision: 0, overrides: {} };
      overrides[id] = enabled;
    }
  }
  return { valid: true, revision: raw.revision as number, overrides };
}

/** Prontidão é fornecida por adapter de servidor do módulo, nunca pelo input externo. */
export function resolveCapability(
  id: string,
  settings: unknown,
  role: Role | null,
  readiness: { configured: boolean; healthy: boolean } = { configured: true, healthy: true },
): EffectiveCapability {
  const config = readCapabilityConfig(settings);
  const supported = isCapabilityId(id);
  const definition = supported ? CAPABILITIES[id] : null;
  const authorized = !!definition && roleAtLeast(role, definition.min_role);
  const enabled =
    !!definition &&
    config.valid &&
    (config.overrides[id as CapabilityId] ?? definition.default_enabled);
  const state: CapabilityState = !supported
    ? "UNAVAILABLE"
    : !config.valid
      ? "DEGRADED"
      : !enabled
        ? "DISABLED"
        : !readiness.configured
          ? "ENABLED_NOT_CONFIGURED"
          : !readiness.healthy
            ? "DEGRADED"
            : "READY";
  const reason = !supported
    ? "Esta release não oferece essa capacidade."
    : !config.valid
      ? "Configuração incompatível. Revise a habilitação com um administrador."
      : !enabled
        ? "Desativada nesta organização. Os dados existentes foram preservados."
        : !readiness.configured
          ? "A integração necessária ainda não foi configurada."
          : !readiness.healthy
            ? "A integração está indisponível no momento."
            : !authorized
              ? "Seu papel não permite utilizar esta capacidade."
              : null;
  return {
    id,
    name: definition?.name ?? id,
    description: definition?.description ?? "",
    supported,
    enabled,
    authorized,
    state,
    can_execute: state === "READY" && authorized,
    reason,
    config_version: 1,
    revision: config.revision,
  };
}

/** UI usa disponibilidade, sem confundir falta de permissão com falta de configuração. */
export function capabilityVisible(capability: EffectiveCapability | undefined): boolean {
  return !!capability?.supported && capability.enabled && capability.authorized;
}
