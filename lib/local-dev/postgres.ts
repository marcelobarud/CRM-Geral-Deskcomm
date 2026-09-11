import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { env } from "@/lib/env";

let pool: Pool | undefined;

function localPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.SUPABASE_DB_URL,
      max: 8,
      idleTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export async function withLocalDb<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await localPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function setRequestDatabaseContext(
  client: PoolClient,
  claims: { sub?: string; email?: string; session_id?: string; aal?: string } | null,
  role: "anon" | "authenticated" | "service_role",
) {
  await client.query(`set local role ${role}`);
  await client.query(`select set_config('request.jwt.claim.sub', $1, true)`, [claims?.sub ?? ""]);
  await client.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({
      sub: claims?.sub ?? null,
      email: claims?.email ?? null,
      session_id: claims?.session_id ?? null,
      aal: claims?.aal ?? "aal1",
      role,
      aud: role === "anon" ? "anon" : "authenticated",
    }),
  ]);
}

export async function first<T extends QueryResultRow>(
  client: PoolClient,
  sql: string,
  values: unknown[] = [],
): Promise<T | null> {
  const result = await client.query<T>(sql, values);
  return result.rows[0] ?? null;
}
