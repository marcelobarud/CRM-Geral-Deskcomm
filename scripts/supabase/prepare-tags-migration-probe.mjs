import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../../", import.meta.url));
const migrations = path.join(root, "supabase/migrations");
const files = (await readdir(migrations)).filter(name => /^20261003\d+_(024[4-9]|0250)_/.test(name)).sort();
if (files.length !== 7) throw new Error("Cadeia de migrations do Bloco C incompleta.");
const sql = (await Promise.all(files.map(name => readFile(path.join(migrations, name), "utf8")))).join("\n");
const template = await readFile(new URL("./tags-migration-probe.sql", import.meta.url), "utf8");
if (!template.includes("-- __TAGS_MIGRATION__")) throw new Error("Template sem ponto de aplicação.");
// Callback conserva literalmente delimitadores SQL; duas passagens provam idempotência.
const probe = template.replace("-- __TAGS_MIGRATION__", () => sql + "\n" + sql);
const dir = path.join(root, ".local-dev/bloco-c");
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, "migration-probe.sql"), probe);
process.stdout.write("Prova SQL preparada em .local-dev/bloco-c/migration-probe.sql (fixtures fictícias, BEGIN/ROLLBACK, sem credenciais).\n");
