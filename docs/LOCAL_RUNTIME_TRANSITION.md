# D2 — Papel dos runtimes

Data: 2026-10-03. Decisão: **A — Geral 1 pronto para ser runtime principal de desenvolvimento/homologação; PostgreSQL local rebaixado a fallback/regressão/diagnóstico**.

O Geral 1 recebeu install e update do schema aprovado e execução explícita das migrations 0240–0242. A execução `c250974a-da3f-46e1-864a-acf92ef47fbb`, concluída às 10:16:34 BRT, comprovou Auth/login/logout/refresh/MFA, REST/RPC/RLS com JWT real e isolamento A/B, capabilities e histórico, Storage e Realtime reais, jornada do app e capturas 1440×900/390×844. Relatório `passed=true`, `fixtures_cleaned=true`. Nenhuma equivalência foi presumida a partir do adapter local.

Para homologar o cloud, execute `scripts/supabase/start-geral-1.ps1` conforme seu README. Para executar o app nesse projeto, use `-Mode Run`; o destino Geral 1 e `LOCAL_DEV_AUTH=false` são definidos no processo. Nenhum `.env*` foi alterado e o comando comum `pnpm dev` depende da configuração existente. Não há troca silenciosa de ambiente.

PostgreSQL local instalado, dados locais, adapters e scripts foram preservados. O fallback continua disponível pelos procedimentos em `docs/LOCAL_POSTGRES_SETUP.md`. O cloud precisa sempre usar os clients canônicos, Auth real e RLS; não apontar o adapter local para Geral 1 nem reutilizar credenciais locais como chaves de API.

| Arquivos/contratos                                                                                                     | Classificação         | Papel preservado                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------- |
| lib/local-dev/auth.ts, http.ts, postgres.ts, rest.ts                                                                   | REMOVÍVEL FUTURAMENTE | Adapter de fallback, ainda preservado                             |
| app/auth/v1/user/route.ts, token/route.ts, logout/route.ts, signup/route.ts                                            | REMOVÍVEL FUTURAMENTE | Auth local, fechado quando desabilitado                           |
| app/rest/v1/[table]/route.ts, rpc/[fn]/route.ts                                                                        | REMOVÍVEL FUTURAMENTE | REST/RPC local, fechado fora do modo local                        |
| scripts/local-dev/setup.ps1, bootstrap-postgres.sql, seed-development.sql, apply-hardening.ps1, apply-capabilities.ps1 | ÚTIL PARA TESTES      | Bootstrap e diagnóstico do fallback                               |
| tests/invariants/capabilities-local.test.ts, upstream-hardening-local.test.ts; vitest.capabilities-local.config.ts     | ÚTIL PARA TESTES      | Regressão SQL/PostgreSQL local                                    |
| tests/unit/local-rpc-hardening.test.ts, local-auth-config.test.ts                                                      | ÚTIL PARA TESTES      | Segurança/isolamento do adapter preservado                        |
| LOCAL_DEV_AUTH, LOCAL_DEV_AUTH_EMAIL, LOCAL_DEV_AUTH_PASSWORD, LOCAL_DEV_AUTH_SECRET                                   | REMOVÍVEL FUTURAMENTE | Configuração apenas do fallback; sem valores documentados         |
| CRM_GERAL_DBA_URL                                                                                                      | ÚTIL PARA TESTES      | Aplicação local administrativa, apenas em memória                 |
| SUPABASE_DB_URL, lib/env.ts, scripts/lib/env-de-teste.ts, scripts/test-db.sh                                           | COMPARTILHADO         | Conexão direta/configuração/harness também usados fora do adapter |
| app/auth/confirm, lib/supabase/, .env.example, docs/LOCAL_POSTGRES_SETUP.md                                            | COMPARTILHADO         | Contratos canônicos, template e referência de fallback            |
| scripts/supabase/start-geral-1.ps1, verify-geral-1.mjs                                                                 | AINDA NECESSÁRIO      | Entrada segura do cloud e homologação reproduzível                |

Não apagar o PostgreSQL instalado, dados ou adapters nesta fase. Remoção definitiva exige tarefa própria autorizada, inventário de consumidores de rotas/envs, ausência comprovada de necessidade de fallback, migração de testes e regressão da distribuição com recursos efetivamente usados. O harness Docker é complementar: sua ausência não bloqueou as provas reais no cloud.

Nenhum bloqueador P0/P1 D2 demonstrado permanece para começar o Bloco B em tarefa posterior. O login público ainda precisa de configuração white-label (P2), registrada no relatório de implementação, antes de exposição comercial. Essa conclusão cobre a jornada atual, sem homologar futuros módulos, WAHA, OAuth externo, scheduler/worker de produção, instalação VPS ou distribuição comercial. A branch D2 permanece local, sem push/merge.
