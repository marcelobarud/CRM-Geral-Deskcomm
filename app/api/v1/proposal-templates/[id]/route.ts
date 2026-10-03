import type { NextRequest } from "next/server";
import { proposalCommand } from "@/lib/proposals/api";
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return proposalCommand(req, (await ctx.params).id, "template_update");
}
