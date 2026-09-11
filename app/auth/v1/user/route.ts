import { NextResponse } from "next/server";

import { localClaimsFromRequest, userFromClaims } from "@/lib/local-dev/auth";
import { localDisabled } from "@/lib/local-dev/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.LOCAL_DEV_AUTH || process.env.NODE_ENV === "production") return localDisabled();
  const claims = await localClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  return NextResponse.json(userFromClaims(claims));
}
