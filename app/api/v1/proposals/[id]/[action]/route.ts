import { type NextRequest } from "next/server";
import { proposalCommand } from "@/lib/proposals/api";
import { fail } from "@/lib/api/wrappers";
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await ctx.params;
  if (!["send", "generate", "archive"].includes(action))
    return fail("not_found", "Ação não encontrada.", 404);
  return proposalCommand(req, id, action);
}
