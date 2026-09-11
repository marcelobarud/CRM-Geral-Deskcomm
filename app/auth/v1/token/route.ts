import { NextResponse } from "next/server";

import { createLocalAccessToken, localUserFromRow, type LocalAuthClaims } from "@/lib/local-dev/auth";
import { authConfigOrResponse } from "@/lib/local-dev/http";
import { withLocalDb } from "@/lib/local-dev/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = authConfigOrResponse();
  if (config instanceof Response) return config;

  const grantType = new URL(request.url).searchParams.get("grant_type");
  if (grantType && grantType !== "password") {
    return NextResponse.json({ error: "unsupported_grant_type", error_description: "Somente password é suportado no runtime local." }, { status: 400 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const email = String(body.email ?? config.email).trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });

  const result = await withLocalDb(async (client) => {
    const found = await client.query(
      `select id, email, raw_user_meta_data, raw_app_meta_data
         from auth.users
        where lower(email) = lower($1)
          and deleted_at is null
          and encrypted_password is not null
          and extensions.crypt($2, encrypted_password) = encrypted_password
        limit 1`,
      [email, password],
    );
    const row = found.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    const sessionId = crypto.randomUUID();
    const claims = localUserFromRow({ ...row, session_id: sessionId });
    await client.query(
      `insert into auth.sessions (id, user_id, factor_id, aal, not_after)
       values ($1, $2, null, 'aal1', now() + interval '1 hour')`,
      [sessionId, row.id],
    );
    return { claims, user: row };
  });

  if (!result) return NextResponse.json({ error: "invalid_credentials", error_description: "Email ou senha inválidos." }, { status: 400 });

  const accessToken = await createLocalAccessToken(result.claims as LocalAuthClaims);
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
  const user = {
    ...result.user,
    id: result.claims.sub,
    aud: "authenticated",
    role: "authenticated",
    email: result.claims.email,
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return NextResponse.json({
    access_token: accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    refresh_token: accessToken,
    user,
    session: { access_token: accessToken, refresh_token: accessToken, token_type: "bearer", expires_in: 3600, expires_at: expiresAt, user },
  });
}
