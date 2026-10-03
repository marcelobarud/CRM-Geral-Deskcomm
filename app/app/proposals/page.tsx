import { ProposalsWorkspace } from "@/components/proposals/ProposalsWorkspace";
export const dynamic = "force-dynamic";
export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <ProposalsWorkspace
      initialLead={typeof query.lead_id === "string" ? query.lead_id : ""}
      initialContact={typeof query.contact_id === "string" ? query.contact_id : ""}
    />
  );
}
