# Readiness para Cliente Zero — relatório da Fase I

**Conclusão:** NO-GO para instalar Cliente Zero agora. Os bloqueios são verificáveis: o caminho de install/update não passou em ambiente limpo; o kit e o registry self-host ainda apontam para artefatos do upstream; o backup não cobre bytes de Storage e o restore só foi inspecionado, não ensaiado; o tenant novo ainda pode nascer com funil de e-commerce se o onboarding for pulado.

Isto não declara que os módulos comerciais A–H falham. As suítes individuais homologadas no Geral 1 passaram, mas não houve uma jornada A–H integrada nem prova de distribuição/recuperação.

**Escopo:** auditoria A–H, correções de readiness e documentação na branch local fase-i-consolidacao-cliente-zero. Sem deploy ou dados de cliente. Geral 1 é staging. Nenhum push/merge da Fase I.

## Estado A–H

| Bloco | Função | Classe | Capability/default | Banco/UI | Homologação Geral 1 | Limite |
|---|---|---|---|---|---|---|
| A | Fundação configurável | Infrastructure | Registro central; gates de estado e role | settings, RPCs/API e tela de capabilities | D2/A passou, 7 checks, cleanup confirmado | Sem novo tenant de ponta a ponta |
| B | Contatos, oportunidades, tarefas, agenda, Inbox/contexto | Core | Sem capability própria | CRM tenant-scoped e UI comercial | Commercial passou, 9 checks, cleanup confirmado | Jornada transversal com C–H não executada nesta fase |
| C | Tags e segmentação | Core | Sem capability própria | Catálogo, aliases, assignments, guards | Tags passou, 10 checks, cleanup confirmado | Interop com campanha e automação não testada em uma única organização integrada |
| D | Empresa B2B simples | Core | Sem capability própria | crm_companies, vínculo/histórico, API e UI | B2B passou, 10 checks, cleanup confirmado | Nenhuma carga/escala; mantém limitações do modelo aprovado |
| E | Relatório comercial e forecast | Core | Sem capability própria | read model/RPC e UI | Forecast passou, 9 checks, cleanup confirmado | Sem benchmark; não é forecast multimoeda consolidado |
| F | Propostas, versões e PDF preparado | Optional | proposals: desligada; mínimo agent; bucket privado | tabelas/RPC, API/UI e Storage proposal-documents | Proposals passou, 9 checks, cleanup confirmado | Restauração dos bytes não provada; preparar PDF não equivale a entrega externa |
| G | Roteiros curtos e automações | Optional | short_scripts: desligada; mínimo agent | tabelas/sessões, regras/eventos e worker existente | Automations passou, 10 checks, cleanup confirmado | Efeito de capability tem janela TOCTOU; interop full A–H não testada |
| H | Campanhas agendadas | Optional | scheduled_campaigns: desligada; mínimo manager | tabelas/recipients, comando e worker de preparação | Campaigns passou, 10 checks, cleanup confirmado | Prepara/classifica audiência; não envia pelo provider. Não inserir campanha na publication Realtime |

A contagem acima é de suítes isoladas anteriores no Geral 1, não de uma execução integrada nova. Todas relataram fixtures criadas e removidas. A fase atual não criou fixtures cloud.

## Produto consolidado e capabilities

O modelo aprovado e código sustentam como core: contatos/prospects manuais, empresas, oportunidades/funil, tarefas, agenda, Inbox/contexto, tags, relatórios e forecast. Não fazem parte: prospecção automática/outreach, financeiro, assinatura, workflow builder amplo e integrações adiadas.

O registry real tem quatro IDs: message_templates (ligada por padrão, agent), proposals (desligada, agent), short_scripts (desligada, agent) e scheduled_campaigns (desligada, manager). Resolver estados: UNAVAILABLE, DISABLED, ENABLED_NOT_CONFIGURED, READY e DEGRADED. Config inválida fecha execução. API usa requireCapability; F consulta readiness do bucket privado. Workers de scripts/campanhas revalidam pelo domínio/worker. Histórico permanece ao desativar. Não existe ID de capability para automations como produto separado; G usa a infraestrutura de automação existente.

Os testes individuais cobriram habilitar/bloquear, papéis, MFA e efeitos controlados por módulo. Não foi executada nesta Fase I a sequência integrada disabled → enable → configure → ready → disable para uma organização nova e única.

## Geral 1, schema e drift

Consulta somente leitura em 2026-10-06 UTC: projeto ACTIVE_HEALTHY, PostgreSQL 17.11.0.002; 138 tabelas públicas, RLS ativa em 138, FORCE RLS em 0, 510 policies. 12 tabelas públicas na publicação Realtime. Seis buckets listados no inventário abaixo; todos com zero objetos. Contagens: zero organizações, contatos, leads, tags, empresas, propostas, campanhas e recipients; api_audit_log tinha 1.399 registros e dados de catálogo/plataforma existem. Portanto, o banco não é “vazio”; ele não continha fixtures comerciais A–H no momento da consulta.

O ledger remoto contém 49 linhas e o histórico local 257 SQLs. Registros de baseline e entradas de módulos/probes não mapeiam arquivo por arquivo: versões/timestamps e alguns nomes diferem. O inventário completo está em [MIGRATION_INVENTORY.md](MIGRATION_INVENTORY.md). Não declarar migrations alinhadas para um futuro db push até fechar uma auditoria de ledger/CLI em ambiente descartável.

Tipos TypeScript gerados pelo conector foram comparados ao arquivo versionado e coincidiram byte a byte após normalizar BOM/CRLF (317.995 caracteres). Isso confirma o tipo local contra a introspecção Geral 1, não contra clean install. Não há schema limpo para comparar; drift clean-versus-cloud permanece NOT TESTED.

Advisor de segurança atual: 12 tabelas com RLS sem policy (inclui objetos platform/server-only; INFO, revisar grants e intenção), 3 funções com search_path mutável (WARN), 3 extensões em public (WARN) e 40 funções SECURITY DEFINER executáveis por authenticated (WARN). Advisor de performance: 178 FKs sem índice (INFO), 11 initplan em RLS (WARN), 5 tabelas sem PK (INFO), 108 índices não usados (INFO), 157 ocorrências de policies permissivas múltiplas (WARN), um índice duplicado (WARN). Totais são do projeto inteiro; não atribuí-los ao Bloco H/A–H sem análise função/tabela. Não foi feita “limpeza de warnings” em massa.

RLS foi habilitada nas 138 tabelas observadas; isso não prova policy correta nem FORCE RLS. Suites A/B reais de cada módulo verificaram leitura/escrita tenant-scoped, usuário A/B, anon e papéis conforme o módulo; políticas transversais e suporte readonly não tiveram nova matriz completa nesta fase. MFA AAL1/AAL2 passou nas operações protegidas dentro das suítes individuais. Support mode segue os guards canônicos, mas uma bateria A–H integrada sob support não foi executada.

Uso de service role está concentrado em endpoints/server actions e workers confiáveis, com filtro de organização requerido por AGENTS.md. A–H adicionam RPCs SECURITY DEFINER de capabilities, tags, empresa, relatório, proposals, scripts e campaigns; autorizam papel/MFA/suporte/tenant nos guards internos conforme contrato do módulo. O Advisor lista 40 funções gerais e não foi concluída inspeção de ACL + corpo, uma por uma, para todas as funções. Tratar o WARN como inventário pendente, não como vulnerabilidade confirmada nem como aceite automático.

## Install clean, update e migration history

Ambiente revalidado: Node v24.15.0, Corepack/pnpm 9.15.9 e Git Bash presentes; Docker CLI/daemon, psql e Supabase CLI ausentes; WSL não instalado.

- corepack pnpm test:db parou porque bash não foi encontrado no PATH do PowerShell.
- Invocando scripts/test-db.sh pelo Git Bash instalado, o processo saiu 127: docker: command not found.
- O harness cria banco pgvector/pg15 descartável, aplica baseline e executa tests/invariants; não foi removida nenhuma assertion.
- scripts/test-update-com-dados.sh também saiu 127 por Docker ausente. Seu cenário aplica baseline sobre seed sintético limitado; não fornece sozinho a origem pós-F/G pedida para dados A–H.
- package script db:migrate continua TODO/exit 0; não é mecanismo de update.
- clean install, migração histórica com fixtures A–H, idempotência final e schema diff estão NOT TESTED. Não considerar General1 como install clean.

Correção relacionada ao install: o apêndice da baseline de 0272 tinha delimitadores PL/pgSQL de dollar quote incompatíveis com o arquivo de migration para fn_script_command e fn_automation_rule_delete_guard. A baseline local foi corrigida para $$; a migration aplicada não foi alterada. O teste de baseline focalizado passou. Isso não substitui aplicar baseline em banco vazio.

## Backup e restore

hostgator-setup-kit/backup.sh prevê backup diário por cron e retenção dos 14 mais recentes; salva dump PostgreSQL e volume waha-data, mas não exporta bytes do Storage. Diretório padrão fica no host da instalação. scripts/backup-db.sh guarda dump do schema public por 14 dias e também não salva Storage/Auth/volumes. Não existe prova da execução ou legibilidade de um artefato desta fase.

O restore.sh exige confirmação, mas restaura na conexão configurada e pode sobrescrever o banco da instalação atual. Não foi executado. Não há restore isolado, procedimento Storage em operação nem evidência de volume/Auth restaurados. Backups gerenciados do Geral 1/plano não foram confirmados. Backup completo e restore isolado são bloqueadores P1. Veja [runbook de backup/restore](BACKUP_RESTORE_RUNBOOK.md).

## Segurança e efeitos externos

Os módulos mantêm tenant id derivado de sessão/evento confiável e guardas de organização; não houve ataque integrado novo nem efeito para contato real. O uso server-side de service role continua exigindo filtro explícito de organização. Históricos/auditoria são usados por CRM, tags, empresas, propostas, scripts e campanhas.

Fluxo dos opcionais:
- Propostas: UI → API → RPC/banco → PDF privado Storage. Registrar envio não envia email/provider por si só; restore de bytes não está provado.
- Roteiros/automações: UI/API → sessões/regras/ledger e fila/eventos existentes → worker; script dá suporte à continuidade humana; ação add_tag é mutação interna.
- Campanhas: UI/API → comando/freeze de audiência → job_queue → campaign_prepare worker → atualização e audit dos recipients. Lotes de preparação são limitados; ready/prepared não significa enviado. No contrato atual não existe chamada de provider de campanha.
- WAHA e email são dependências configuráveis do restante do CRM; não houve envio real novo nesta fase. Google Calendar, Ads, Nuvemshop e banco externo podem permanecer desligados se o cliente não os usar.

runCapabilityEffect revalida antes do callback, mas o comentário do código documenta corrida entre checagem e efeito não transacional; não usar a checagem como reserva atômica de provider.

## Workers, cron, health e observabilidade

O agent-worker consome job_queue e registra campaign_prepare; também executa loops existentes de agent dispatcher, follow-up, event-log drain, health/circuit e reconciliação de sessão conforme flags/configuração. Repetição usa leases/receipts/idempotência de cada domínio. Campanha só prepara audiência neste bloco.

O scheduler self-host deriva crontab no startup e chama endpoints internos autenticados. Entry point versionado programa: dispatcher, follow-up, event drain, routing e recover-stuck a cada minuto; redaction, snooze, heartbeat, channel health, agenda push e reminder a cada 5 min; avatars e Google refresh a cada 10 min; Google sync e risk watcher a cada 15; contact phones a cada 30; outros watchers/retention/catálogo em horários diários. O endpoint campanhas usa o job queue; não tem cron de provider-send. Crons dependem de INTERNAL_SECRET e app healthy. O scheduler da distro depende de imagem separada ainda com namespace upstream.

GET /api/v1/health verifica Supabase, Redis e WAHA, distingue unhealthy/degraded e só expõe destinos autenticado; a versão sai de APP_VERSION ou “desconhecido”. Worker healthz é separado. Logs/audit/system_update_runs, filas e event runs dão contexto, mas não foi ensaiada resposta a incidente em cliente nem alerta externo. Não afirmar cobertura de alerting.

Limites sem benchmark: campanha prepara em batches finitos; a implementação limita consultas/páginas por contrato de API; policy/performance advisor tem dívida ampla. Não há medição de volume, N+1, throughput ou polling em cliente. Não declarar escala empresarial.

## Branding e primeiro uso

Correções na Fase I mudam o nome padrão visível para CRM Geral; o logotipo vetorial passa a desenhar o nome resolvido dinamicamente e mantém a precedência de marca da instalação/organização. Showcase e testes públicos foram alinhados. Referências históricas em migrações/assets/templates internos não foram renomeadas indiscriminadamente.

Signup real cria organização ativa e membership admin; display/legal name vem de metadata org_name, prefixo do email ou “Minha empresa”. O trigger atual inicia pipeline com etapas de e-commerce. O onboarding permite trocar o quadro, mas pode ser pulado; portanto, nova organização pode ver esse funil. Corrigir requer decisão aprovada de nomes genéricos e mudança com migration + baseline + MANIFEST + teste, além de teste de tenant novo. Nenhum tenant novo foi criado no Geral 1 nesta auditoria.

O primeiro operador ainda precisa configurar usuário, branding, fuso/moeda, funil, equipe, providers e scheduler. Este percurso está documentado em [runbook de provisionamento](CLIENT_PROVISIONING_RUNBOOK.md); não foi ensaiado como Cliente Zero.

## Release e distribuição

docs/PRODUCT_DISTRIBUTION_ARCHITECTURE.md propõe cliente = VPS + Supabase + domínio próprios, releases semver e imagens versionadas. Isso é arquitetura aprovada, não execução certificada. Nenhum release comercial/manifesto completo foi gerado nesta tarefa. A imagem/composição, install/update e workflow do fork ainda usam referências upstream; o package version por si só não representa schema/configuration version. Não usar uma imagem publicada upstream para distribuir o fork.

## Baseline de testes

Primeira rodada global antes das correções, Node v24.15.0: 818 arquivos, 8.558 passed, 40 failed, 1 expected fail, 19 arquivos com falha, 740,73 s. Nenhuma assertion foi relaxada. A triagem confundiu um parser JSX frágil com botão mudo e uma tentativa anterior B2B com a evidência final; ver retificação em [auditoria inicial](CLIENT_ZERO_READINESS_AUDIT.md).

Após as correções, `corepack pnpm typecheck` passou; `corepack pnpm lint` terminou com 0 erros e 351 avisos; `corepack pnpm build` passou. O build informou avisos de configuração de IA ausente, consulta de marca ao Geral 1 indisponível durante prerender e uso de uma API Sentry depreciada, sem bloquear a compilação. Testes focalizados passaram: primeiro 14 arquivos/140 testes; depois, 3 arquivos/55 testes para locale da data de campanhas, evidência citada e scanner de botões.

Na rodada global final (`corepack pnpm test:unit`, Node v24.15.0), passaram **805 de 818 arquivos**: **8.563 testes passaram, 34 falharam e 1 é esperado falhar**, em 718,52 s. As 13 suítes com falhas foram `lib/theme.test.tsx`, `lib/ui/icons.test.ts`, `tests/unit/guarda-da-release-reconhece-o-corte.test.ts`, `tests/unit/i18n-espanhol-cobre-a-tela.test.ts`, `tests/unit/leads-import-route.test.ts`, `tests/unit/lgpd-pdf-meet.test.ts`, `tests/unit/lgpd-pdf-replies.test.ts`, `tests/unit/namespace-das-imagens.test.ts`, `tests/unit/performed-at-um-relogio-so.test.ts`, `tests/unit/rascunho-superado-nao-e-regravado.test.ts`, `tests/unit/sem-marcador-de-conflito.test.ts`, `tests/unit/triagem-termina-na-versao.test.ts` e `tests/unit/vocabulario-do-funil.test.ts`.

Triagem das falhas finais: 11 casos da importação de leads falham no parser multipart do Undici quando o teste usa `File` de outro realm do jsdom; dois testes de PDF são incompatíveis com o caminho de fontes padrão do `pdfjs-dist` no Windows; testes de imagem/release dependem de `bash`/`grep` ausentes ou recebem saída de processo vazia no Windows; varreduras de atividade/conflito/rascunho/vocabulário têm cobertura ou caminhos desatualizados; a varredura de contribuição upstream espera uma frase que não pertence ao comando atual do fork; o scanner de espanhol aponta 79 textos do laboratório sintético `/design-validation/assets`; theme/icons excedem timeout sob a transformação/importação pesada. Os testes de theme/icons isolados também excederam os limites atuais. Isso deixa pendências reais de harness/localização, mas não autoriza declarar a suite verde. Nenhuma assertion foi removida ou enfraquecida.

Validação visual: o servidor iniciou e `GET /login` respondeu 200, mas o SSR levou cerca de 10 s; a captura não terminou. O binário Chromium headless do Playwright não está instalado; a sessão Chrome controlada também expirou ao tentar navegar. Não houve screenshots desktop/mobile nem navegação autenticada; shell, dashboard e settings seguem sem evidência visual nesta tarefa. Nenhum navegador ou dependência foi instalado.

## Matriz final GO/NO-GO

| Gate | Estado | Base objetiva |
|---|---|---|
| 1. Instalação limpa | NOT TESTED | Docker/CLI indisponíveis; baseline não aplicada do zero |
| 2. Update com dados | NOT TESTED | sem origem histórica A–H reproduzível; harness limitado |
| 3. Backup | FAIL | scripts omitem objetos Storage e backup offsite não comprovado |
| 4. Restore isolado | NOT TESTED | nenhum ensaio; restore atual aponta para conexão configurada |
| 5. Isolamento/RLS | PASS WITH LIMITATION | suites reais por módulo passaram; sem suíte transversal nova; FORCE RLS 0 |
| 6. Capabilities | PASS WITH LIMITATION | registry real e suites por módulo; sem ciclo integrado em tenant novo |
| 7. Effects/workers | PASS WITH LIMITATION | campanhas sem provider-send, gates e testes por bloco; TOCTOU e operação de produção não provados |
| 8. Branding/defaults | FAIL | marca padrão corrigida no código; funnel setorial persiste se onboarding for pulado; nenhum tenant novo conferido |
| 9. Build/tests | FAIL WITH LIMITATION | typecheck/build passaram; lint 0 erros/351 avisos; global 8.563 passou/34 falhou/1 esperado; visual bloqueado pelo runtime local lento e Chromium ausente |
| 10. Provisionamento | FAIL | pacote/imagens do fork ainda não estão alinhados nem clean install comprovado |

P1 distribuição: install, update e restore sem prova; registry/install kit upstream; backup sem objetos; defaults setoriais em organização nova. P2: semver/manifesto de release para instalação ainda não consolidado, falta ensaio visual/operacional integrado, strings em espanhol no laboratório visual sintético, Advisor geral e falta alerting testado. P3: não benchmark de escala, recursos deferidos e distinção de dados históricos/demo.

## Correções da Fase I

- Corrigido dollar quoting de duas funções do apêndice da baseline para coincidir com a migration 0272; migration aplicada não reescrita.
- ProposalsWorkspace passou a usar randomId do repositório e classes de borda explícitas do Tailwind 4.
- Scanner de botões decorativos agora entende chaves/strings em abertura JSX e cobre arrow functions; botão de ScriptsWorkspace já tinha onClick.
- Marca default e superfícies do showcase passam a exibir CRM Geral respeitando branding configurável.
- CampaignsWorkspace formata datas no idioma escolhido, em vez de fixar `pt-BR`; teste de categorias de marca alinhado ao tipo declarado; documentação B2B corrigida para não citar captura local ignorada como evidência versionada.
- Sem migration nova nesta branch. Nenhum comportamento comercial novo foi adicionado.

## Documentos

Auditoria atualizada; relatório de readiness; runbooks de provisionamento, update e backup/restore; inventário de 257 migrations. Não foi alterado arquivo de secrets nem gravado dado real. docs/DESKCOMM_UPSTREAM_AUDIT.md permanece não rastreado e hash-preservado.

## Git e próxima decisão

HEAD-base: 1fa658c63935c98a7d97e9d5578911d1ec61aec1, main já continha H por fast-forward e origin/main apontava ao mesmo commit na captura. Fase I permanece local, sem push, merge ou rebase; não criar branch da próxima fase. A próxima execução recomendada é somente uma fase corretiva dos P1 acima, após review deste NO-GO.

## Reavaliação após Fase I.1

A Fase I.1 implementa as correções prioritárias de distribuição, backup/restore e defaults para organizações futuras, detalhadas em [CLIENT_ZERO_READINESS_CORRECTION.md](CLIENT_ZERO_READINESS_CORRECTION.md). Isso atualiza a lista de P1 corrigidos, mas **não altera a decisão: NO-GO para Cliente Zero**. O fork ainda não publica as imagens `stable`, o workflow de release falhou por configuração ausente, não houve install/update/restore real em ambiente isolado e `test:db` não rodou por falta de Docker.

Nesta verificação, `lint` terminou com 0 erros e 351 avisos; `typecheck` e `build` passaram na cópia isolada, enquanto o checkout principal tinha tipos `.next/dev` inválidos gerados pelo servidor de desenvolvimento ativo. `test:shell` passou integralmente. A tentativa da suite unitária global ficou sem progresso por mais de sete minutos, reportou timeout terminando o worker de `app/api/v1/products/route.test.ts` e foi interrompida após mais de 20 minutos; como não houve resumo final, não há contagem confiável nem aprovação global. `test:db` permaneceu bloqueado por `docker: command not found`.

Não foi usado o Geral 1 nem publicada qualquer alteração. A branch `fase-i-1-correcao-readiness-distribuicao` continua local e sem merge, push ou rebase. O arquivo não rastreado `docs/DESKCOMM_UPSTREAM_AUDIT.md` continua preservado e seu hash não mudou.

## Reavaliação após Fase I.2

Em 2026-10-06, a branch `fase-i-1-correcao-readiness-distribuicao` foi publicada no fork, integrada em `main` por fast-forward e enviada ao fork no commit `275e7d85a4e63455301937efffd944cb84cdad12`. A branch `fase-i-2-homologacao-operacional` parte desse commit e permanece local.

O pipeline GHCR construiu e publicou app, worker e scheduler para `main` com metadados comuns (`275e7d8`, schema `0276`); não houve release candidate semver, pull local ou promoção de `stable`. O workflow oficial de release falhou porque a entrada de client ID do GitHub App estava vazia. O CI passou typecheck/lint/build de imagem, mas falhou em unit, invariants e E2E. O harness `test:db` confirmou install e reaplicação da baseline em PostgreSQL efêmero, porém 14 invariants falharam; E2E teve oito casos reprovados. O teste unitário isolado do worker anterior passou 3/3.

A auditoria corrigiu os timestamps de `0013` e `0021` no MANIFEST, preservou o registro histórico sem fonte `0016` com essa limitação explícita e esclareceu que o updater atual reaplica a baseline inteira. Um forward 0277 move a varredura `anon` para o fim da baseline e revoga execução direta da função de trigger; os testes focalizados passaram. Essa alteração permanece apenas na branch local, sem aplicação em Geral 1.

O checkout local não tem Docker, Supabase CLI ou `psql`; clean install comercial, update com dados, backup, restore, novo tenant e jornada integrada A–H não foram executados. A tentativa local de typecheck encontrou erros em `.next/dev/types/routes.d.ts`; lint local terminou com zero erros e 351 avisos. O arquivo e o estado local preexistentes foram preservados.

**A decisão continua NO-GO para Cliente Zero.** Os blockers restantes e a matriz detalhada estão em [CLIENT_ZERO_OPERATIONAL_HOMOLOGATION.md](CLIENT_ZERO_OPERATIONAL_HOMOLOGATION.md). Nenhuma branch da próxima fase foi criada, e o relatório histórico acima foi mantido.
