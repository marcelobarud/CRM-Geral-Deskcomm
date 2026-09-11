import { NextResponse } from "next/server";

import { localClaimsFromRequest } from "@/lib/local-dev/auth";
import { localDisabled } from "@/lib/local-dev/http";
import { withLocalDb } from "@/lib/local-dev/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.LOCAL_DEV_AUTH || process.env.NODE_ENV === "production") return localDisabled();
  const claims = await localClaimsFromRequest(request);
  if (claims) {
    await withLocalDb((client) => client.query("delete from auth.sessions where id = $1", [claims.session_id]));
  }
  return NextResponse.json({});
}
