import { env } from "@/lib/env";

export type LocalAuthClaims = {
  sub: string;
  email: string;
  role: "authenticated";
  aud: "authenticated";
  session_id: string;
  aal: "aal1";
  iat: number;
  exp: number;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

const textEncoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function localSecret(): string {
  if (!env.LOCAL_DEV_AUTH || env.NODE_ENV === "production") {
    throw new Error("LOCAL_DEV_AUTH só pode ser usado explicitamente fora de produção.");
  }
  const secret = env.LOCAL_DEV_AUTH_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("LOCAL_DEV_AUTH_SECRET ausente no ambiente local.");
  return secret;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(localSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createLocalAccessToken(claims: LocalAuthClaims): Promise<string> {
  const header = toBase64Url(textEncoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = toBase64Url(textEncoder.encode(JSON.stringify(claims)));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign("HMAC", await key(), textEncoder.encode(signingInput));
  return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyLocalAccessToken(token: string): Promise<LocalAuthClaims | null> {
  if (!env.LOCAL_DEV_AUTH || env.NODE_ENV === "production") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      fromBase64Url(signature).buffer as ArrayBuffer,
      textEncoder.encode(`${header}.${payload}`),
    );
    if (!valid) return null;
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as LocalAuthClaims;
    if (parsed.aud !== "authenticated" || parsed.role !== "authenticated") return null;
    if (!parsed.sub || !parsed.session_id || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

export async function localClaimsFromRequest(request: Request): Promise<LocalAuthClaims | null> {
  const token = bearerToken(request);
  return token ? verifyLocalAccessToken(token) : null;
}

export function userFromClaims(claims: LocalAuthClaims) {
  return {
    id: claims.sub,
    aud: claims.aud,
    role: claims.role,
    email: claims.email,
    email_confirmed_at: new Date(claims.iat * 1000).toISOString(),
    user_metadata: claims.user_metadata ?? {},
    app_metadata: claims.app_metadata ?? {},
    created_at: new Date(claims.iat * 1000).toISOString(),
    updated_at: new Date(claims.iat * 1000).toISOString(),
  };
}

export function localUserFromRow(row: Record<string, unknown>): LocalAuthClaims {
  const now = Math.floor(Date.now() / 1000);
  return {
    sub: String(row.id),
    email: String(row.email ?? ""),
    role: "authenticated",
    aud: "authenticated",
    session_id: String(row.session_id ?? crypto.randomUUID()),
    aal: "aal1",
    iat: now,
    exp: now + 60 * 60,
    user_metadata: (row.raw_user_meta_data as Record<string, unknown> | null) ?? {},
    app_metadata: (row.raw_app_meta_data as Record<string, unknown> | null) ?? {},
  };
}

export function localAuthConfig() {
  if (!env.LOCAL_DEV_AUTH || env.NODE_ENV === "production") {
    throw new Error("Runtime de Auth local desabilitado ou solicitado em produção.");
  }
  return {
    email: env.LOCAL_DEV_AUTH_EMAIL.toLowerCase(),
    password: env.LOCAL_DEV_AUTH_PASSWORD,
  };
}
