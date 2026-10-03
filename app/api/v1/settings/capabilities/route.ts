import { z } from "zod";
import { randomUUID } from "node:crypto";
import { requireRole } from "@/lib/auth/require-role";
import { roleAtLeast } from "@/lib/auth/types";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { fail, ok } from "@/lib/api/wrappers";
import { ApiError } from "@/lib/api/types";
import { loadCapabilities } from "@/lib/capabilities/server";
import { isCapabilityId } from "@/lib/capabilities/registry";

export const dynamic = "force-dynamic";
const patchSchema = z
  .object({ capability: z.string().refine(isCapabilityId), enabled: z.boolean() })
  .strict();
const noCache = { "Cache-Control": "private, no-store" };

export async function GET() {
  const authz = await requireRole("viewer", { resource: "capabilities" });
  if (!authz.ok) return authz.response;
  try {
    return ok(
      {
        organization_id: authz.org.orgId,
        can_manage:
          roleAtLeast(authz.org.role, "admin") &&
          (!authz.user.support || authz.user.support.access_mode === "full"),
        capabilities: await loadCapabilities(await createClient(), authz.org.orgId, authz.org.role),
      },
      { headers: noCache },
    );
  } catch (error) {
    if (error instanceof ApiError)
      return fail(error.code, error.message, error.status, { headers: noCache });
    throw error;
  }
}

export async function PATCH(req: Request) {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("admin", { requestId, resource: "capabilities" });
  if (!authz.ok) return authz.response;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return fail("validation_failed", "Capacidade ou habilitação inválida.", 422, { requestId });
  const db = await createClient();
  // RPC nova tipada pelo contrato local até regeneração de tipos via schema.
  const rpc = db as unknown as {
    rpc(
      name: "fn_set_capability",
      args: { p_org: string; p_capability: string; p_enabled: boolean },
    ): Promise<{
      data: { previous_enabled: boolean; enabled: boolean; revision: number } | null;
      error: { code?: string } | null;
    }>;
  };
  const { data, error } = await rpc.rpc("fn_set_capability", {
    p_org: authz.org.orgId,
    p_capability: parsed.data.capability,
    p_enabled: parsed.data.enabled,
  });
  if (error || !data)
    return fail(
      error?.code === "42501" ? "forbidden" : "capability_unavailable",
      "Não foi possível alterar a capacidade.",
      error?.code === "42501" ? 403 : 503,
      { requestId },
    );
  await audit({
    action: "capability.config_changed",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "organization",
    resourceId: authz.org.orgId,
    requestId,
    metadata: {
      capability: parsed.data.capability,
      previous_enabled: data.previous_enabled,
      enabled: data.enabled,
      revision: data.revision,
    },
  });
  return ok(data, { requestId, headers: noCache });
}
