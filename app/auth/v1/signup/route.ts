import { NextResponse } from "next/server";

import { authConfigOrResponse } from "@/lib/local-dev/http";

export const dynamic = "force-dynamic";

export async function POST() {
  const config = authConfigOrResponse();
  if (config instanceof Response) return config;
  return NextResponse.json({ error: "signup_disabled", error_description: "A conta local é criada pelo seed de desenvolvimento." }, { status: 400 });
}
