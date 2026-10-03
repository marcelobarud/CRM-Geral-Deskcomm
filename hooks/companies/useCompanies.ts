"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { apiClient } from "@/lib/api/client";
import type { CompanyCatalog } from "@/lib/companies/types";
import type { CompanyCommand } from "@/lib/companies/schemas";
import { showApiError } from "@/components/feedback/ApiErrorToast";
export function useCompanies(
  options: { company_id?: string; contact_id?: string; search?: string; page?: number } = {},
) {
  const { activeOrg } = useAuth(),
    params = new URLSearchParams();
  for (const [k, v] of Object.entries(options)) if (v !== undefined) params.set(k, String(v));
  return useQuery({
    queryKey: ["companies", activeOrg?.orgId, options],
    enabled: !!activeOrg,
    queryFn: async () =>
      (await apiClient.get<{ data: CompanyCatalog }>("/api/v1/companies?" + params)).data,
  });
}
export function useCompanyCommand() {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: (c: CompanyCommand) =>
      apiClient.post<{ data: { company_id: string | null } }>("/api/v1/companies", c),
    onError: showApiError,
    onSuccess: () => {
      for (const key of [
        "companies",
        "contact",
        "contacts",
        "contact-list",
        "commercial-context",
        "timeline",
        "conversations",
        "board",
        "lead",
      ])
        void cache.invalidateQueries({ queryKey: [key] });
    },
  });
}
