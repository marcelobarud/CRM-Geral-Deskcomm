import { CompanyDetailClient } from "./_client";
export const dynamic = "force-dynamic";
export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CompanyDetailClient id={id} />;
}
