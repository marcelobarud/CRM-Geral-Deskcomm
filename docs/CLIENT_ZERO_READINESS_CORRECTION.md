# Cliente Zero — correção de readiness da Fase I.1

**Data:** 2026-10-06

**Conclusão:** **NO-GO** para instalar ou comercializar o CRM Geral como Cliente Zero. A Fase I.1 corrige bloqueios prioritários no código de distribuição, backup/restore e defaults de uma organização nova. Os testes de shell e os checks de compilação disponíveis passaram, mas a publicação das imagens e a prova operacional em instalação limpa, update com dados e restore continuam pendentes.

Este documento complementa, sem substituir ou reescrever a conclusão histórica, o [relatório da Fase I](CLIENT_ZERO_READINESS_REPORT.md). Nenhuma credencial foi exibida ou persistida. O projeto Geral 1 não foi usado nesta fase.

## Correções implementadas

- Instalador, updater, Compose, exemplos de ambiente, Dockerfiles e workflow foram alinhados à linhagem do fork CRM Geral. As imagens carregam metadados OCI com versão, commit e schema; o endpoint de saúde informa commit e versão do schema.
- O updater valida a origem esperada antes de alterar código, schema ou imagem. O caminho exige backup aprovado antes da atualização; `--skip-backup` é uma escolha explícita para cenários que não dependam da proteção do kit.
- O cliente PostgreSQL efêmero recebe a URI por `stdin`; ela não é colocada nos argumentos de processo do Docker. O instalador falha fechado diante de baseline ausente, extensão ou schema não aplicados e removeu-se o `db:migrate` que podia aparentar sucesso sem migrar.
- Backup e restore agora incluem dump PostgreSQL, configuração/metadados e bytes de Storage, baseline e manifesto exatos, checksums e metadados do bundle, com escrita atômica fora do checkout. A restauração valida o bundle, exige marcador explícito e destino vazio, e recusa Geral 1 e a origem ativa.
- A migration nova `20261006010000_0276_defaults_genericos_nova_organizacao.sql`, acompanhada pelo apêndice idempotente da baseline e entrada no manifesto, troca apenas o funil criado para organizações futuras por etapas comerciais genéricas. Organizações existentes não são alteradas. Os testes de defaults cobrem o contrato novo.
- Runbooks de provisionamento, update e backup/restore, documentação de packaging e inventário de migrations foram atualizados. A contagem local é **258 SQLs**, dos quais **257 timestamped**; **255/257** correspondem a slug no manifesto. Permanecem duas migrations locais sem slug correspondente (`0021_incidents`, `0013_ai_faq_items`) e uma entrada do manifesto sem arquivo (`0016_lgpd_emergency_scope`); o stub não timestamped `00001_initial_schema.sql` também permanece identificado no inventário.

## Evidência de validação desta fase

| Verificação | Resultado | Limite da evidência |
|---|---|---|
| `corepack pnpm typecheck` | Passou na cópia isolada após `next typegen` | O checkout principal tinha tipos de rota de `.next/dev` inválidos gerados por um processo de desenvolvimento ativo; não foram apagados nem alterados. |
| `corepack pnpm build` | Passou na cópia isolada, com 57 páginas estáticas | Houve avisos de configuração opcional de IA, Supabase ausente durante prerender e API Sentry depreciada. Não comprova instalação ou operação em VPS. |
| `corepack pnpm lint` | 0 erros; 351 avisos | Os avisos permanecem fora do escopo de correção desta fase. |
| `corepack pnpm test:shell` | Passou, saída 0 | Inclui fixtures do instalador, updater, backup/Storage, restore, conexões PostgreSQL por `stdin` e cron sem crontab inicial. São testes de harness, não ensaio em VPS real. |
| Testes focados de unidade | 4 arquivos / 32 testes passaram | Cobrem archive de Storage, defaults genéricos, namespace de imagens e packaging. |
| `corepack pnpm test:unit` completo | **Sem resultado final** | A tentativa ficou sem novas linhas de progresso por mais de sete minutos e reportou timeout ao terminar o worker de `app/api/v1/products/route.test.ts`; foi interrompida após mais de 20 minutos. A saída parcial também mostrou falhas em sondas globais e testes de UI/locale/importação. Não há contagem total confiável e a suite não é declarada aprovada. |
| `corepack pnpm test:db` | Bloqueado pelo ambiente | Docker CLI/daemon e Supabase CLI não estão disponíveis; o script termina com `docker: command not found`. Não foi iniciado banco nem container. |
| Migrations | Inventário conferido | Não foi feito `db push` nem aplicação em projeto remoto. A divergência entre o ledger do Geral 1 e o histórico local segue sem reconciliação arquivo por arquivo. |

## Bloqueios comerciais que permanecem

- As três imagens `ghcr.io/marcelobarud/deskcommcrm:stable`, `ghcr.io/marcelobarud/deskcomm-worker:stable` e `ghcr.io/marcelobarud/deskcomm-scheduler:stable` retornaram **404** na consulta anônima. O fork ainda não tem uma release `stable` consumível.
- A execução mais recente observada do workflow de release falhou; o runbook identifica `RELEASE_APP_ID` e `RELEASE_APP_PRIVATE_KEY` como configuração ausente. A branch `main` do fork também não tinha proteção obrigatória de checks na consulta, que retornou “branch not protected”.
- Não foram executados em ambiente descartável o install limpo, update de uma instalação com dados, backup/restauração real com Storage ou onboarding de organização nova. Fixtures de shell não comprovam essas jornadas.
- O harness de banco não pôde rodar por ausência do Docker. A homologação Geral 1 das fases anteriores não substitui esses ensaios nem foi reutilizada nesta fase.

## Decisão

O hardening reduz risco e fecha as correções de distribuição previstas nesta fase, mas **não muda o NO-GO** do Cliente Zero. Antes de liberar uma instalação comercial, publicar e verificar as três imagens de uma mesma release do fork e executar, em infraestrutura descartável, install limpo, update com dados, backup e restore de PostgreSQL + Storage, além da criação de uma organização nova com defaults genéricos. Reconciliar também o inventário/ledger antes de tratar migration history como alinhado.

## Estado Git

As alterações da Fase I.1 permanecem na branch local `fase-i-1-correcao-readiness-distribuicao`, baseada em `7e0343f9d3740ed8ad5737ea494fd139d0eca3b8` na verificação inicial. Não foi feito push, merge ou rebase. O arquivo não rastreado `docs/DESKCOMM_UPSTREAM_AUDIT.md` foi preservado sem alteração; SHA-256 verificado: `1689EF1DBD1FCA2A2B8E3C88522897471BC2CDE7A0ACFB5F6CF9474D2EA9F7D4`.
