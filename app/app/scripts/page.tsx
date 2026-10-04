import { ScriptsWorkspace } from "@/components/scripts/ScriptsWorkspace";
export const dynamic = "force-dynamic";
export default async function ScriptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  return (
    <ScriptsWorkspace
      conversationId={typeof query.conversation_id === "string" ? query.conversation_id : undefined}
    />
  );
}
