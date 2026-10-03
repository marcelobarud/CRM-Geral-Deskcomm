import {readFile,writeFile,mkdir} from "node:fs/promises";
const base=new URL("../../",import.meta.url),sql=await readFile(new URL("supabase/migrations/20261003220000_0255_crm_geral_reporting_forecast.sql",base),"utf8");
const template=await readFile(new URL("scripts/supabase/forecast-migration-probe.sql",base),"utf8");
await mkdir(new URL(".local-dev/bloco-e/",base),{recursive:true});
await writeFile(new URL(".local-dev/bloco-e/migration-probe.sql",base),template.replace("-- __FORECAST_MIGRATION__",()=>sql+"\n"+sql));
