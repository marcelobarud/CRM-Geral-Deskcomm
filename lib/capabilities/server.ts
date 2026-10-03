import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api/types";
import { fail } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import type { Role } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";
import {
  CAPABILITIES,
  resolveCapability,
  type EffectiveCapability,
  type CapabilityId,
} from "./registry";

/** Sem cache. O caller fornece organização já autenticada ou de evento confiável. */
export async function loadCapabilities(
  db: SupabaseClient,
  organizationId: string,
  role: Role | null,
) {
  const { data, error } = await db
    .from("organizations")
    .select("settings")
    .eq("id", organizationId)
    .maybeSingle();
  if (error || !data)
    throw new ApiError(
      503,
      "capability_unavailable",
      undefined,
      randomUUID(),
      "Não foi possível consultar a configuração da organização.",
    );
  return Object.keys(CAPABILITIES).map((id) => resolveCapability(id, data.settings, role));
}

export function assertEffectiveCapability(
  capability: EffectiveCapability,
  operation: "execute" | "history" = "execute",
) {
  if (
    !capability.supported ||
    !capability.authorized ||
    (operation === "execute" && !capability.can_execute)
  ) {
    throw new ApiError(
      403,
      "capability_blocked",
      { capability: capability.id, state: capability.state },
      randomUUID(),
      capability.reason ?? "Esta capacidade não está disponível.",
    );
  }
}

export async function assertCapability(
  db: SupabaseClient,
  organizationId: string,
  id: CapabilityId,
  role: Role,
  operation: "execute" | "history" = "execute",
) {
  const capability =
    (await loadCapabilities(db, organizationId, role)).find((item) => item.id === id) ??
    resolveCapability(id, {}, role);
  assertEffectiveCapability(capability, operation);
  return capability;
}

/** Guard de rota conserva RBAC/MFA, suporte e organização resolvida pelo helper canônico. */
export async function requireCapability(
  id: CapabilityId,
  minRole: Role,
  operation: "execute" | "history" = "execute",
) {
  const authz = await requireRole(minRole, { resource: id });
  if (!authz.ok) return authz;
  try {
    await assertCapability(await createClient(), authz.org.orgId, id, authz.org.role, operation);
    return authz;
  } catch (error) {
    if (error instanceof ApiError)
      return {
        ok: false as const,
        response: fail(error.code, error.message, error.status, { details: error.details }),
      };
    throw error;
  }
}

/** Worker deve chamar imediatamente antes de cada efeito; callback não apaga histórico.
 * Não reserva um envio remoto nem desfaz efeitos já consumados. Rechecagem reduz,
 * mas não elimina a corrida entre esta leitura e um efeito externo não transacional. */
export async function runCapabilityEffect<T>(
  db: SupabaseClient,
  organizationId: string,
  id: CapabilityId,
  role: Role,
  effect: () => Promise<T>,
): Promise<T> {
  await assertCapability(db, organizationId, id, role);
  return effect();
}
