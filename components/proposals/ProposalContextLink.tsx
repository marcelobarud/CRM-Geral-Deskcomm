"use client";
import Link from "next/link";
import { useCapability } from "@/hooks/capabilities/CapabilitiesProvider";
import { useT } from "@/hooks/i18n/useT";
export function ProposalContextLink({
  leadId,
  contactId,
}: {
  leadId?: string;
  contactId?: string;
}) {
  const cap = useCapability("proposals"),
    t = useT();
  return cap?.can_execute ? (
    <Link
      className="inline-block py-2 underline"
      href={leadId ? "/app/proposals?lead_id=" + leadId : "/app/proposals?contact_id=" + contactId}
    >
      {leadId ? t("Criar proposta") : t("Propostas relacionadas")}
    </Link>
  ) : null;
}
