# CRM Geral — Homologação Operacional de Release e Recuperação

**Data da avaliação:** 2026-10-06
**Branch de trabalho:** `fase-i-2-homologacao-operacional`
**Base da Fase I.2:** `275e7d85a4e63455301937efffd944cb84cdad12`
**Decisão:** **NO-GO para Cliente Zero**

Esta fase não executou instalação destrutiva, update, backup ou restore no Geral 1. O staging permaneceu intocado. A ausência de Docker e de um destino descartável impediu a homologação comercial fim a fim.

## Integração da Fase I.1 e release

A branch `fase-i-1-correcao-readiness-distribuicao` foi publicada no fork, integrada em `main` por fast-forward e publicada. O HEAD integrado foi `275e7d85a4e63455301937efffd944cb84cdad12`. A branch local da Fase I.2 parte desse commit e não foi enviada ao remoto.

O workflow [Publicar imagem Docker (GHCR), run 37500794285](https://github.com/marcelobarud/CRM-Geral-Deskcomm/actions/runs/37500794285) terminou com sucesso. Construiu e enviou as três imagens do fork, todas com os mesmos metadados de build: `APP_VERSION=275e7d8`, commit `275e7d85a4e63455301937efffd944cb84cdad12` e schema `0276`.

| Artefato no GHCR | Digest do run | Resultado |
|---|---|---|
| `ghcr.io/marcelobarud/deskcommcrm:main` | `sha256:c0ecf09e764e690177b60f3f40ab5b51f0add76350901bd9eab80be8c218d0ab` | Build e push concluídos; o smoke test do container do app passou. |
| `ghcr.io/marcelobarud/deskcomm-worker:main` | `sha256:39280c0873ea56c6caad17343a3d1b94ca6dc5b8ac0d0ef929daf901048250cc` | Build e push concluídos. |
| `ghcr.io/marcelobarud/deskcomm-scheduler:main` | `sha256:e2bb664844939efae769dd099f51f71062f758d69364b3d164099abe627e974f` | Build e push concluídos. |

O workflow também publica o canal `latest` em pushes para `main`. A promoção de `stable` foi pulada. Não existe release candidate semver, tag de release ou prova de `docker pull`/inspeção local dos manifestos OCI; os digests acima comprovam o resultado do push no workflow, não a obtenção e execução pelo cliente.

O workflow [release, run 37500794284](https://github.com/marcelobarud/CRM-Geral-Deskcomm/actions/runs/37500794284) falhou antes de calcular ou criar tag: o input do GitHub App veio vazio. O fluxo depende de `RELEASE_APP_ID` e `RELEASE_APP_PRIVATE_KEY`. Não houve PR de release, tag ou publicação `stable`, e nenhum atalho manual foi usado.

## Ferramentas no ambiente local

| Ferramenta | Resultado observado |
|---|---|
| Docker CLI / daemon | CLI ausente; daemon não pôde ser consultado. |
| Podman, nerdctl, crane, skopeo, oras | Ausentes; sem meio local alternativo para obter imagens. |
| Supabase CLI / `psql` | Ausentes. |
| Node | `v24.15.0`. |
| pnpm | `9.15.9` via Corepack. |
| Git | `2.55.0.windows.4`. |
| Git Bash | `5.3.15`, encontrado em `C:\Program Files\Git\bin\bash.exe`, fora do PATH desta sessão. |
| Playwright browser cache | Ausente em `%LOCALAPPDATA%\ms-playwright`. |

Como Docker e ferramentas OCI não estão disponíveis, não foi tentado simular instalação, atualização, backup ou restore.

## Histórico de migrations e autoridade do schema

Há 259 arquivos SQL locais: 258 timestampados e o stub `00001_initial_schema.sql`. A reconciliação deixou 258/258 migrations timestampadas com timestamp e slug no MANIFEST. `0013_ai_faq_items` e `0021_incidents` já tinham arquivos e linhas descritivas no MANIFEST; suas versões estavam indicadas apenas como waves. Os timestamps foram alinhados aos prefixos dos arquivos sem reescrever SQL histórico.

O registro `0016_lgpd_emergency_scope` foi preservado como histórico: não existe migration com esse slug em nenhum ref Git acessível. A baseline atual contém os campos `emergency` e `scope` e o índice descritos pela linha, mas a fonte e a proveniência do SQL não foram localizadas. Portanto, não foi removido nem tratado como arquivo executável.

O ledger de Geral 1 tem 49 entradas de instalação consolidada, probes e reaplicações; sua numeração não corresponde 1:1 às migrations timestampadas do checkout. O ledger mais recente observado termina em `20261004230243`, uma reexecução relacionada a 0275. Não foi inventada equivalência individual. 0276 e 0277 não foram aplicadas a Geral 1.

Autoridade observada no fork:

- `install.sh` aplica `supabase/baseline.sql` para instalação pelo kit.
- `update.sh` reaplica a baseline inteira no schema existente, tolera somente erros classificados de objetos já existentes e para diante de erro inesperado. Não seleciona apenas migrations pendentes pelo ledger.
- `supabase/migrations/*.sql` e MANIFEST compõem o histórico incremental de auditoria e a fonte versionada para novas mudanças. Cada mudança nova mantém migration + apêndice idempotente na baseline + linha no MANIFEST.
- A aplicação operacional desses caminhos continua sem homologação pelo instalador/updater real. A presença estática dos apêndices não prova clean install nem compatibilidade com dados existentes.

A Fase I.2 adicionou a migration forward `0277_revoke_public_execute_seed_pipeline`, seu apêndice de baseline e a linha correspondente no MANIFEST. Também reposicionou a varredura final de `anon` para depois dos apêndices 0276/0277. Isso corrige a violação estrutural detectada no CI sem alterar o histórico da migration 0276. A verificação local focalizada da varredura e da tripla passou; a aplicação SQL não foi executada localmente nem em Geral 1.

## Evidências e resultado dos testes

Os workflows no commit publicado `275e7d85` tiveram estes resultados:

- **Typecheck e lint no CI:** passaram. O lint concluiu com zero erros.
- **Build:** o workflow de imagens construiu os três containers e o smoke test do app passou. Os shards E2E também concluíram seus builds de produção antes dos testes. Nenhum build local foi iniciado para preservar `.next` existente.
- **Suíte unitária completa:** não passou: 816/820 arquivos passaram; 8.597 testes passaram, 4 falharam e 1 é falha esperada. Uma falha foi a varredura de `anon` posicionada antes do apêndice 0276; esta foi corrigida localmente e os testes focalizados passaram. Permanecem falhas de localização espanhola, do texto de triagem de release e do vocabulário visível do funil. A suíte completa não foi repetida após a correção.
- **`test:db` em banco efêmero no CI:** o harness iniciou PostgreSQL 15, aplicou baseline em modo install (`install ok`) e reaplicou em modo update (`update ok`, sem erro). O gate completo falhou nas invariants: 181/190 arquivos passaram, 8 falharam e 1 foi pulado; 1.501 testes passaram, 14 falharam, 1 era falha esperada e 19 foram pulados. Entre as falhas estão `crm_proposals` fora da cascata de redação LGPD, cobertura comportamental RLS ausente para tabelas tenant-aware, divergência dos testes do funil e fixtures/mock de automação. Isso não substitui execução do `install.sh`/`update.sh` do kit com as imagens publicadas.
- **E2E no CI:** falhou em 8 casos, distribuídos em duas das três partes: quatro textos em português no idioma espanhol, testes de gestão/navegação de funil, timeout em webhook e fixture de lead recusada com `tag_catalog_required`, além de falhas de navegação e wizard. O run 37500794371 terminou em failure.
- **Performance:** passou no run 37500794186.
- **Teste focalizado do worker que havia travado anteriormente:** `app/api/v1/products/route.test.ts` passou isolado, 3/3. A suíte completa do CI terminou em aproximadamente 346 s sem aquele timeout; a causa exata do timeout local anterior permanece inconclusiva, mas não foi reproduzida nesse arquivo isolado.
- **Testes focados após o ajuste local:** 7 arquivos e 26 testes passaram, incluindo varredura final de anon, manifesto, idempotência/reaplicabilidade do baseline, correspondência do apêndice e o teste de products.
- **Lint local:** passou sem erros, com 351 avisos.
- **Typecheck local:** falhou ao analisar `.next/dev/types/routes.d.ts`, arquivo gerado preexistente com erros de sintaxe. O arquivo foi preservado; typecheck no CI havia passado no commit remoto. Não se atribui a falha ao código SQL/documental local.
- **Build local:** não executado. As evidências de build são dos workflows remotos no commit anterior à migration local 0277.
- **`test:shell`:** não executado. O CI parou antes dessa etapa após falhas unitárias, e o ambiente local não tem Docker.

## Gates de homologação

Os status distinguem implementação verificada de execução operacional real.

| Gate | Fase I.1 | Fase I.2 | Evidência |
|---|---|---|---|
| Release consumível | PASS WITH LIMITATION | FAIL | Fork publicado em `main`; imagens branch foram enviadas, mas sem RC/tag, pull/execução pelo cliente; workflow de release sem input válido do GitHub App. |
| Imagens app/worker/scheduler | PASS WITH LIMITATION | PASS WITH LIMITATION | Os três pushes e metadados comuns `275e7d8`/`0276` passaram no CI; sem inspeção OCI/pull local e anteriores ao 0277 local. |
| Clean install pelo kit | NOT TESTED | PASS WITH LIMITATION | Harness CI instalou a baseline em PostgreSQL efêmero; `install.sh` com release/imagens de cliente não foi executado. |
| Update real com dados | NOT TESTED | PASS WITH LIMITATION | Reaplicação baseline do harness passou; update via updater com snapshot preexistente e fixtures A–H não foi executado. |
| Backup de banco + Storage | PASS WITH LIMITATION | NOT TESTED | Código/testes do kit preparados na I.1; nenhum bundle real foi criado ou inspecionado. |
| Restore de banco + Storage | PASS WITH LIMITATION | NOT TESTED | Guards/checksum implementados na I.1; nenhum restore em segundo destino isolado. |
| Novo tenant e defaults 0276 | PASS WITH LIMITATION | NOT TESTED | Migration e testes estáticos presentes; nenhum signup/onboarding em instalação descartável. |
| RLS/Auth/isolamento | PASS WITH LIMITATION | FAIL | Suites reais anteriores no Geral 1 passaram para os cenários D2; o CI da Fase I.2 reprovou invariants de RLS/definer. Geral 1 não foi alterado. |
| Capabilities opcionais | PASS WITH LIMITATION | NOT TESTED | Registry e testes por bloco existem; ciclo em tenant novo `disabled → enabled → ready → disabled` não foi executado nesta fase. |
| Jornada integrada A–H | PASS WITH LIMITATION | NOT TESTED | Blocos foram homologados separadamente em staging nas fases anteriores; nenhuma jornada integrada de Cliente Zero em tenant descartável. |
| Visual/login/primeiro uso | PASS WITH LIMITATION | FAIL | Evidência anterior em staging incluiu 1440×900 e 390×844; E2E remoto desta fase falhou em oito casos. Não houve nova validação visual local. |
| Testes globais e shell | PASS WITH LIMITATION | FAIL | CI: typecheck/lint/build de imagem passaram; unit/invariants/E2E falharam; shell não chegou a executar. Typecheck local foi impedido por tipo gerado inválido. |
| Provisionamento/rollback/observabilidade | NOT TESTED | NOT TESTED | Fluxo comercial, rollback após DDL, bloqueio por ausência de backup e incidentes com worker/scheduler não foram exercitados em ambiente descartável. |

## Gaps por prioridade

**P0:** nenhum P0 novo foi comprovado pelos ensaios executados; isso não reduz os blockers P1 abaixo.

**P1 — bloqueiam Cliente Zero:**

- release candidate versionada e obtida por pull; corrigir configuração do GitHub App pelo fluxo autorizado;
- clean install pelo `install.sh` com os três artefatos da mesma versão;
- update com dados e Storage a partir de checkpoint anterior, com backup obrigatório e verificação de preservação;
- backup e restore reais de banco + bytes/metadados Storage, com checksum, guard de destino e RLS pós-restore;
- criação de tenant pelo onboarding e verificação de 0276, capabilities e primeiro login;
- fechar os gates que falharam no CI: 14 assertions de invariants e oito E2E; triagem das três falhas unitárias remanescentes após a correção local;
- reconciliar a proveniência da linha histórica 0016 ou obter a migration-fonte antes de afirmar equivalência individual.

**P2:** benchmark de carga, SSR de login em runtime de produção, alertas externos e medição de RPO/RTO seguem sem evidência.

**P3:** nenhum item adicional foi classificado nesta fase.

## Git e dados preservados

- `main` do fork permanece em `275e7d85` e contém a integração da Fase I.1.
- `fase-i-2-homologacao-operacional` permanece local, sem push, merge ou rebase.
- Nenhuma tag de release foi criada ou movida.
- O Geral 1 permaneceu sem alterações de schema/dados nesta homologação; 0276/0277 não foram aplicadas nele.
- O arquivo local de auditoria upstream permaneceu não rastreado e inalterado; SHA-256 verificado: `1689EF1DBD1FCA2A2B8E3C88522897471BC2CDE7A0ACFB5F6CF9474D2EA9F7D4`.

**Conclusão:** **NO-GO**. A preparação técnica e alguns gates de harness passaram, mas release versionada/pull, update com dados, backup/restore, novo tenant e jornada integrada ainda não foram comprovados; há falhas ativas de invariants e E2E.
