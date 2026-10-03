import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { TagsCatalogClient } from "./_client";
export const dynamic = "force-dynamic";
export default async function TagsPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org) redirect("/app");
  if (org.role !== "admin") redirect("/403");
  return <TagsCatalogClient />;
}
