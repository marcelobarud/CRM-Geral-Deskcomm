import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const RAIZ = process.cwd();
const MIGRATION = path.join(
  RAIZ,
  "supabase/migrations/20261006010000_0276_defaults_genericos_nova_organizacao.sql",
);

describe("defaults de organização — migration 0276", () => {
  const migration = fs.readFileSync(MIGRATION, "utf8");
  const baseline = fs.readFileSync(path.join(RAIZ, "supabase/baseline.sql"), "utf8");

  it("usa exclusivamente o seed genérico e mapeia ganho/perda aos contratos canônicos", () => {
    for (const forbidden of ["Carrinho abandonado", "Em separação", "Aguardando pagamento", "Pago", "Cancelado"]) {
      expect(migration).not.toContain(forbidden);
    }
    expect(migration).toContain("'Comercial'");
    expect(migration).toContain("'Em negociação'");
    expect(migration).toMatch(/'Ganho',\s*'ganho',\s*true,\s*false,\s*'won'/);
    expect(migration).toMatch(/'Perdido',\s*'perdido',\s*false,\s*true,\s*'lost'/);
    expect(migration).toContain("agent_stage_hint");
    expect(migration).not.toMatch(/(?:probability|probabilidade)\s*[:=]\s*\d/i);
  });

  it("não renomeia dados existentes e o baseline termina com a mesma correção", () => {
    expect(migration).not.toMatch(/update\s+public\.crm_(pipelines|stages)/i);
    expect(baseline).toContain("-- ---- defaults genéricos para organizações novas (migration 0276) ----");
    expect(baseline.slice(baseline.indexOf("-- ---- defaults genéricos para organizações novas (migration 0276) ----")))
      .toContain("'Comercial'");
    expect(fs.readFileSync(path.join(RAIZ, "supabase/migrations/MANIFEST.md"), "utf8"))
      .toContain("20261006010000` | `0276_defaults_genericos_nova_organizacao");
  });
});
