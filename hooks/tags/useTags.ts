"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { apiClient } from "@/lib/api/client";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import type { TagCommand, TagKind } from "@/lib/tags/schemas";
import type { TagCatalog } from "@/lib/tags/types";
export function useTags(kind?: TagKind, entityId?: string, impactTagId?: string) {
  const { activeOrg } = useAuth();
  const params = new URLSearchParams();
  if (kind && entityId) {
    params.set("entity_kind", kind);
    params.set("entity_id", entityId);
  }
  if (impactTagId) params.set("impact_tag_id", impactTagId);
  return useQuery({
    queryKey: ["tags", activeOrg?.orgId, kind, entityId, impactTagId],
    enabled: !!activeOrg,
    queryFn: async () => (await apiClient.get<{ data: TagCatalog }>(`/api/v1/tags?${params}`)).data,
  });
}
export function useTagCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (command: TagCommand) => apiClient.post("/api/v1/tags", command),
    onError: showApiError,
    onSuccess: () => {
      for (const key of [
        "tags",
        "contacts",
        "contact",
        "contact-list",
        "conversations",
        "conversation",
        "conversation-tag-vocabulary",
        "board",
        "pipeline-board",
        "leads",
        "lead",
      ])
        void qc.invalidateQueries({ queryKey: [key] });
    },
  });
}
