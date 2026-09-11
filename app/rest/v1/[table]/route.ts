import { NextResponse } from "next/server";

import { identifier, responseRows, tableFromParams, validateTable, withRestContext } from "@/lib/local-dev/rest";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ table: string }> };

function filters(request: Request, columns: Map<string, string>, values: unknown[]) {
  const url = new URL(request.url);
  const clauses: string[] = [];
  for (const [key, raw] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset", "columns"].includes(key)) continue;
    const column = /^([a-z_][a-z0-9_]*)$/.exec(key)?.[1];
    const filter = /^(?:(not)\.)?(eq|neq|gt|gte|lt|lte|is|like|ilike|in)\.(.*)$/.exec(raw);
    if (!column || !filter || !columns.has(column)) continue;
    const col = identifier(column);
    const operator = `${filter[1] ? "not." : ""}${filter[2]!}`;
    const value = filter[3]!;
    if (operator === "is") {
      if (value === "null") clauses.push(`${col} is null`);
      else if (value === "true" || value === "false") clauses.push(`${col} is ${value}`);
      continue;
    }
    if (operator === "in" || operator === "not.in") {
      const items = value.replace(/^\(|\)$/g, "").split(",").filter(Boolean);
      const marks = items.map((item) => {
        values.push(item);
        return `$${values.length}`;
      });
      if (marks.length) clauses.push(`${col} ${operator === "not.in" ? "not in" : "in"} (${marks.join(",")})`);
      continue;
    }
    values.push(value);
    const op = ({ eq: "=", neq: "<>", gt: ">", gte: ">=", lt: "<", lte: "<=", like: "like", ilike: "ilike", "not.eq": "<>", "not.like": "not like", "not.ilike": "not ilike" } as Record<string, string>)[operator];
    if (!op) continue;
    clauses.push(`${col} ${op} $${values.length}`);
  }
  return clauses;
}

async function handle(request: Request, tableParam: string, method: string) {
  const table = tableFromParams(tableParam);
  return withRestContext(request, async (client) => {
    const columns = await validateTable(client, table);
    const quotedTable = `public.${identifier(table)}`;
    const url = new URL(request.url);
    const values: unknown[] = [];
    const where = filters(request, columns, values);
    const whereSql = where.length ? ` where ${where.join(" and ")}` : "";
    const select = url.searchParams.get("select");
    const selected = !select || select === "*" ? "*" : select.split(",").map((name) => name.trim().split("(")[0] ?? "").filter((name): name is string => columns.has(name)).map(identifier).join(", ") || "*";

    if (method === "GET") {
      const order = url.searchParams.get("order")?.split(",").map((part) => {
        const [name, direction] = part.split(".");
        return name && columns.has(name) ? `${identifier(name)} ${direction === "desc" ? "desc" : "asc"}` : null;
      }).filter(Boolean).join(", ");
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100) || 100, 1), 500);
      const offset = Math.max(Number(url.searchParams.get("offset") ?? 0) || 0, 0);
      const result = await client.query(`select ${selected} from ${quotedTable}${whereSql}${order ? ` order by ${order}` : ""} limit ${limit} offset ${offset}`, values);
      return responseRows(result.rows, request);
    }

    if (method === "POST") {
      const body = await request.json();
      const records = Array.isArray(body) ? body : [body];
      if (!records.length || records.some((record) => !record || typeof record !== "object")) return NextResponse.json({ message: "Payload inválido." }, { status: 400 });
      const keys = [...new Set(records.flatMap((record) => Object.keys(record as object)))].filter((key) => columns.has(key));
      if (!keys.length) return NextResponse.json({ message: "Nenhuma coluna válida no payload." }, { status: 400 });
      const insertValues: unknown[] = [];
      const tuples = records.map((record) => `(${keys.map((key) => { insertValues.push((record as Record<string, unknown>)[key]); return `$${insertValues.length}`; }).join(",")})`);
      const result = await client.query(`insert into ${quotedTable} (${keys.map(identifier).join(",")}) values ${tuples.join(",")} returning ${selected}`, insertValues);
      return responseRows(result.rows, request, 201);
    }

    if (!where.length) return NextResponse.json({ message: "Escrita sem filtro não é permitida." }, { status: 400 });
    if (method === "DELETE") {
      const result = await client.query(`delete from ${quotedTable}${whereSql} returning ${selected}`, values);
      return responseRows(result.rows, request);
    }
    const body = (await request.json()) as Record<string, unknown>;
    const keys = Object.keys(body).filter((key) => columns.has(key));
    if (!keys.length) return NextResponse.json({ message: "Nenhuma coluna válida no payload." }, { status: 400 });
    const updateValues: unknown[] = [];
    const assignments = keys.map((key) => { updateValues.push(body[key]); return `${identifier(key)} = $${updateValues.length}`; });
    const updateWhere = filters(request, columns, updateValues);
    const result = await client.query(`update ${quotedTable} set ${assignments.join(", ")} where ${updateWhere.join(" and ")} returning ${selected}`, updateValues);
    return responseRows(result.rows, request);
  });
}

export async function GET(request: Request, props: RouteProps) { return handle(request, (await props.params).table, "GET"); }
export async function POST(request: Request, props: RouteProps) { return handle(request, (await props.params).table, "POST"); }
export async function PATCH(request: Request, props: RouteProps) { return handle(request, (await props.params).table, "PATCH"); }
export async function PUT(request: Request, props: RouteProps) { return handle(request, (await props.params).table, "PUT"); }
export async function DELETE(request: Request, props: RouteProps) { return handle(request, (await props.params).table, "DELETE"); }
