import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { env } from "@/lib/env";
import { requestAuth, type LocalRequestAuth } from "@/lib/local-dev/http";
import { setRequestDatabaseContext, withLocalDb } from "@/lib/local-dev/postgres";

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export function identifier(value: string): string {
  if (!IDENTIFIER.test(value)) throw new Error("Identificador inválido.");
  return `"${value}"`;
}

export function tableFromParams(value: string): string {
  if (!IDENTIFIER.test(value)) throw new Error("Tabela inválida.");
  return value;
}

async function tableExists(client: PoolClient, table: string) {
  const result = await client.query(
    `select 1 from information_schema.tables
      where table_schema = 'public' and table_name = $1
      union all
    select 1 from information_schema.views
      where table_schema = 'public' and table_name = $1
      limit 1`,
    [table],
  );
  return result.rowCount === 1;
}

async function columnsFor(client: PoolClient, table: string) {
  const result = await client.query<{ column_name: string; data_type: string }>(
    `select column_name, data_type
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [table],
  );
  return new Map(result.rows.map((row) => [row.column_name, row.data_type]));
}

export function responseRows(rows: unknown[], request: Request, status = 200) {
  const objectResponse = request.headers.get("accept")?.includes("application/vnd.pgrst.object+json");
  if (objectResponse) {
    if (rows.length !== 1) return NextResponse.json({ message: "JSON object requested, multiple (or no) rows returned" }, { status: 406 });
    return NextResponse.json(rows[0], { status });
  }
  return NextResponse.json(rows, { status, headers: { "content-range": `0-${Math.max(rows.length - 1, 0)}/*` } });
}

export async function withRestContext<T>(request: Request, fn: (client: PoolClient, auth: LocalRequestAuth) => Promise<T>): Promise<T | Response> {
  const auth = await requestAuth(request);
  if (auth instanceof Response) return auth;
  return withLocalDb(async (client) => {
    await setRequestDatabaseContext(client, auth.claims, auth.role);
    return fn(client, auth);
  });
}

export async function validateTable(client: PoolClient, table: string) {
  if (!(await tableExists(client, table))) throw new Error("Tabela não encontrada.");
  return columnsFor(client, table);
}

export { env };
