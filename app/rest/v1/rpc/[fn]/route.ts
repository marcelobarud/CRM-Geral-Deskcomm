import { NextResponse } from "next/server";

import { identifier, responseRows, withRestContext } from "@/lib/local-dev/rest";

export const dynamic = "force-dynamic";

type RouteProps = { params: Promise<{ fn: string }> };

export async function POST(request: Request, props: RouteProps) {
  const fn = (await props.params).fn;
  if (!/^[a-z_][a-z0-9_]*$/.test(fn)) return NextResponse.json({ message: "Função inválida." }, { status: 400 });
  try {
    return await withRestContext(request, async (client) => {
      const body = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
      const found = await client.query<{ arg_names: string[] | null; return_set: boolean; type_name: string }>(
        `select coalesce(proargnames[1:pronargs], '{}') as arg_names,
                proretset as return_set,
                t.typname as type_name
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            join pg_type t on t.oid = p.prorettype
          where n.nspname = 'public' and p.proname = $1
          order by p.oid limit 1`,
        [fn],
      );
      if (!found.rowCount) return NextResponse.json({ message: "Função não encontrada." }, { status: 404 });
      const names = found.rows[0]?.arg_names ?? [];
      const args = names.map((name) => body[name]);
      const placeholders = args.map((_, index) => `$${index + 1}`).join(", ");
      const result = await client.query(`select * from public.${identifier(fn)}(${placeholders})`, args);
      if (!found.rows[0]?.return_set) {
        const row = result.rows[0] ?? {};
        const value = Object.prototype.hasOwnProperty.call(row, fn) ? row[fn] : row;
        return NextResponse.json(value);
      }
      return responseRows(result.rows, request);
    });
  } catch (error) {
    // O SDK precisa do SQLSTATE para distinguir FK/RLS de erro interno.
    // Mensagens do driver podem carregar valores pessoais: nunca as devolvemos.
    const rawCode = error && typeof error === "object" && "code" in error ? error.code : null;
    const code = typeof rawCode === "string" && /^[0-9A-Z]{5}$/.test(rawCode) ? rawCode : "XX000";
    const status = code === "42501" ? 403 : ["23001", "23503", "23505"].includes(code) ? 409 : 500;
    return NextResponse.json({ code, message: "A operação no banco não pôde ser concluída.", details: null, hint: null }, { status });
  }
}
