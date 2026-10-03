"use client";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useCapability } from "@/hooks/capabilities/CapabilitiesProvider";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface MessageTemplate {
  id: string;
  title: string;
  body: string;
  shortcut: string | null;
  owner_user_id: string | null;
}

/** Onda 5: templates de script (pessoais + compartilhados) para o slash-menu do composer. */
export function useMessageTemplates(history = false) {
  const podeConsultar = usePermission("message-templates.view");
  const capability = useCapability("message_templates");
  const allowed = podeConsultar && (history || !!capability?.can_execute);
  const result = useQuery({
    enabled: allowed,
    queryKey: ["message-templates", history ? "history" : "use"],
    queryFn: async () => apiClient.get<{ data: MessageTemplate[] }>(`/api/v1/message-templates${history ? "?history=1" : ""}`),
    staleTime: 60_000,
    select: (res) => res.data,
  });
  return { ...result, data: allowed ? result.data : [] };
}
