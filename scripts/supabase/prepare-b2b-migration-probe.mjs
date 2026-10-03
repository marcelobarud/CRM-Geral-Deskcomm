import {readFile,writeFile,mkdir} from "node:fs/promises";
const files=["20261003210000_0251_crm_geral_b2b_simples.sql","20261003211000_0252_crm_geral_b2b_history.sql","20261003212000_0253_crm_geral_b2b_idempotency.sql","20261003213000_0254_crm_geral_b2b_receipts_guard.sql"];
const bodies=await Promise.all(files.map(f=>readFile("supabase/migrations/"+f,"utf8")));
const source=await readFile("scripts/supabase/b2b-migration-probe.sql","utf8");
await mkdir(".local-dev/bloco-d",{recursive:true});
await writeFile(".local-dev/bloco-d/migration-probe.sql",source.replace("-- __B2B_MIGRATION__",()=>bodies.concat(bodies).join("\n")));
process.stdout.write("Prova B2B preparada sem credenciais.\n");

