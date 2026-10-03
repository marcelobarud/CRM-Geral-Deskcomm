import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/require-role";
import { CapabilitiesForm } from "./_form";
export const dynamic = "force-dynamic";
export default async function CapabilitiesPage() {
  const authz = await requireRole("viewer", { resource: "capabilities" });
  if (!authz.ok) redirect("/403");
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <CapabilitiesForm />
    </div>
  );
}
