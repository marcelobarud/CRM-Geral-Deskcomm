import type { CapabilityState, EffectiveCapability } from "./registry";
import { CAPABILITIES } from "./registry";
export const CAPABILITY_LABELS: Record<CapabilityState, string> = {
  UNAVAILABLE: "Indisponível nesta release",
  DISABLED: "Desativado",
  ENABLED_NOT_CONFIGURED: "Habilitado, falta configurar",
  READY: "Pronto",
  DEGRADED: "Disponibilidade limitada",
};
/** Sem snapshot, UI não inventa disponibilidade. Backend revalida sempre. */
export function capabilityDestinations<T extends { href: string }>(
  items: T[],
  capabilities?: EffectiveCapability[],
) {
  if (!capabilities) return items; // Consumidores anteriores sem capabilities mantêm sua projeção.
  return items.filter((item) => {
    const id = Object.entries(CAPABILITIES).find(
      ([, definition]) => definition.href === item.href,
    )?.[0];
    return !id || capabilities.some((c) => c.id === id && c.can_execute);
  });
}
