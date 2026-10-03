"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/AuthProvider";
import type { EffectiveCapability, CapabilityId } from "@/lib/capabilities/registry";

export interface CapabilityReadModel {
  organization_id: string;
  can_manage: boolean;
  capabilities: EffectiveCapability[];
  error?: string;
}
const Context = createContext<CapabilityReadModel | null>(null);
export const capabilityQueryKey = (org: string) => ["capabilities", org] as const;
export function CapabilitiesProvider({
  initial,
  children,
}: {
  initial: CapabilityReadModel | null;
  children: ReactNode;
}) {
  const { activeOrg } = useAuth();
  const org = activeOrg?.orgId ?? "none";
  const query = useQuery({
    queryKey: capabilityQueryKey(org),
    enabled: !!activeOrg,
    initialData: initial?.organization_id === org ? initial : undefined,
    queryFn: async () => {
      const response = await fetch("/api/v1/settings/capabilities", { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível consultar as capacidades.");
      const result = (await response.json()) as { data: CapabilityReadModel };
      if (result.data.organization_id !== org) throw new Error("A organização ativa mudou.");
      return result.data;
    },
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
  const value = query.data?.organization_id === org ? query.data : null;
  // Snapshot client não autoriza efeitos. Falha de refresh retira ações da UI.
  const safe =
    query.isError && activeOrg
      ? {
          organization_id: org,
          can_manage: false,
          error: "Não foi possível atualizar a configuração.",
          capabilities: (value?.capabilities ?? []).map((c) => ({
            ...c,
            state: "DEGRADED" as const,
            can_execute: false,
            enabled: false,
            reason: "Não foi possível atualizar a configuração.",
          })),
        }
      : value;
  return <Context.Provider value={safe}>{children}</Context.Provider>;
}
export function useCapabilities() {
  return useContext(Context);
}
export function useCapability(id: CapabilityId) {
  return useCapabilities()?.capabilities.find((c) => c.id === id);
}
