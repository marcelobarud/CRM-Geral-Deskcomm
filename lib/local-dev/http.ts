import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import {
  bearerToken,
  localClaimsFromRequest,
  localAuthConfig,
  type LocalAuthClaims,
} from "@/lib/local-dev/auth";

export type LocalRequestAuth =
  | { role: "anon"; claims: null }
  | { role: "authenticated"; claims: LocalAuthClaims }
  | { role: "service_role"; claims: null };

export function localDisabled(): NextResponse {
  return NextResponse.json({ error: "Local runtime desabilitado." }, { status: 404 });
}

export async function requestAuth(request: Request): Promise<LocalRequestAuth | NextResponse> {
  if (!env.LOCAL_DEV_AUTH || env.NODE_ENV === "production") return localDisabled();
  const token = bearerToken(request);
  if (!token) return { role: "anon", claims: null };
  if (token === env.SUPABASE_SERVICE_ROLE_KEY) return { role: "service_role", claims: null };
  const claims = await localClaimsFromRequest(request);
  return claims ? { role: "authenticated", claims } : NextResponse.json({ error: "Token inválido." }, { status: 401 });
}

export function authConfigOrResponse(): { email: string; password: string } | NextResponse {
  try {
    const config = localAuthConfig();
    if (!config.password) {
      return NextResponse.json({ error: "LOCAL_DEV_AUTH_PASSWORD ausente." }, { status: 503 });
    }
    return config;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Auth local indisponível." }, { status: 503 });
  }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
