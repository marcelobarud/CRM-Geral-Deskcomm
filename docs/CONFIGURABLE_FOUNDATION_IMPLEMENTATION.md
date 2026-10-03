# Bloco A — Fundação configurável

Data: 2026-10-03. Base confirmada: `main` em `b4532f56fc80559a56a58e92094afca99e0e6e08`. A branch documental da Fase 2.5 e a main foram publicadas no fork CRM Geral, com integração fast-forward. Implementação em `bloco-a-fundacao-configuravel`, somente commits locais.

## Decisão e fonte da verdade

CONFIRMADO: reutilizamos `organizations.settings`, RBAC/MFA/suporte, RLS, clientes Supabase canônicos, navegação centralizada, React Query e auditoria existentes. A [auditoria inicial](CONFIGURABLE_FOUNDATION_AUDIT.md) antecedeu o código. Flags de canal, bindings de IA e preferências pessoais de interface continuam com seus contratos próprios.

O registry `lib/capabilities/registry.ts` declara suporte da release, default e papel mínimo. A release atual registra somente **Respostas rápidas** (`message_templates`), recurso existente sem integração externa obrigatória. Seu default é ligado, para organizações novas e existentes. Agenda, Inbox, IA, canais e automações não foram convertidos em módulos nesta fase.

A configuração editável está exclusivamente em `organizations.settings.capabilities`:

```json
{ "version": 1, "revision": 1, "overrides": { "message_templates": false } }
```

Ausência do namespace ou de override conserva o default do recurso conhecido. Capacidade desconhecida não recebe suporte nem permissão de execução. Formato incompatível ou erro de leitura falha fechado. `version` é a versão do formato; `revision` cresce a cada escrita administrativa. Não há flags concorrentes em env ou Redis. Configurações da instalação, marca e credenciais de integração continuam separadas: suporte da release não significa configuração/prontidão de um serviço.

## Estados e autorização

O tipo canônico `EffectiveCapability` separa `supported`, `enabled`, `authorized`, `state`, `can_execute`, motivo, versão e revisão. Estados: `UNAVAILABLE`, `DISABLED`, `ENABLED_NOT_CONFIGURED`, `READY`, `DEGRADED`. Um recurso pode estar pronto e o usuário não ter permissão. Flags nunca concedem papel, acesso a dados ou bypass de RLS.

`resolveCapability()` recebe prontidão de um adapter confiável de servidor. Para respostas rápidas não há credencial externa necessária. Integrações futuras precisam conectar seu adapter ao carregador backend antes de se registrarem como prontas; a existência do enum, sozinha, não homologa essas integrações.

## Backend, API e banco

`lib/capabilities/server.ts` oferece `loadCapabilities`, `assertCapability`, `requireCapability` e `runCapabilityEffect`. A leitura é fresca, sem cache. A organização vem de autenticação/membership validado ou contexto confiável do executor. Erro de configuração devolve resposta segura, sem divulgar credenciais de conexão.

`GET /api/v1/settings/capabilities` exige viewer e retorna o read model da organização ativa, sem secrets, com `private, no-store`. `PATCH` exige admin, MFA quando aplicável e suporte de escrita. O body estrito aceita somente capacidade conhecida e booleano; não aceita organization_id. A RPC autenticada faz lock da organização, altera somente o namespace e incrementa revisão. `capability.config_changed` reutiliza a auditoria da aplicação com ator, organização, estado anterior/novo e revisão. Esse registro usa o mecanismo existente; não constitui uma transação atômica entre alteração e auditoria nem garante auditoria de SQL administrativo direto.

Migrations novas, todas repetidas no baseline e manifest:

| Migration | Responsabilidade                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------- |
| 0240      | Leitura e escrita de configuração; policies restritivas de INSERT/UPDATE/DELETE em message_templates |
| 0241      | Revoga EXECUTE do setter de service_role, inclusive grant herdado por default privileges             |
| 0242      | Protege namespace contra sobrescrita por snapshots de formulários irmãos; redefine setter canônico   |

Os apêndices entram antes da varredura final de anon. Nenhuma migration histórica foi editada. Funções novas revogam public/anon; setter concede apenas authenticated, após validação interna de admin, suporte e MFA. A varredura de definers documenta o call site autorizado do setter.

O trigger mantém o namespace antigo quando outro dono de settings atualiza a organização. O marcador transacional `crm.capabilities_write` coordena a escrita interna da RPC; **não é mecanismo de autorização contra código com SQL privilegiado**. Os limites de segurança são grants, RLS e validação do ator na RPC. Código com service role exige filtro manual de organização.

Não há DROP ao desligar, schema por cliente ou migration por cliente. `lib/database.types.ts` não foi editado manualmente; a RPC nova utiliza um contrato TypeScript local estreito. A regeneração completa dos tipos pelo schema continua pendente do processo de distribuição/Supabase disponível.

## Portas protegidas e histórico

| Porta existente                                              | Comportamento                                                                                 |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| API message-templates GET operacional e POST/PATCH/DELETE    | Guard de capacidade + autorização original; mutações também encontram cerca RLS               |
| GET message-templates?history=1                              | Leitura histórica explícita, com autorização e isolamento originais                           |
| MCP crm_list_message_templates / crm_render_message_template | Consulta fresca antes de listar/preparar resposta para uso, organização confiável do contexto |
| Composer, sidebar, hubs e busca                              | Consomem disponibilidade canônica; resposta desativada não é oferecida para uso               |
| /app/templates por acesso direto                             | Histórico preservado; criação/edição/exclusão retiradas ou desabilitadas                      |

Não apagar texto já copiado, mensagens enviadas ou dados antigos. Uma resposta já copiada para um campo de mensagem vira texto livre: não há revogação retroativa desse conteúdo. Leitura histórica deliberadamente continua autorizada quando a capacidade é desligada.

## Frontend e administração

`CapabilitiesProvider` recebe snapshot inicial do servidor e consulta um único read model, com chave por organização. Refaz a leitura a cada 15 segundos, no foco da janela e após alteração administrativa. Erro de atualização retira ações do client. Snapshot client nunca autoriza efeito backend; outro navegador pode exibir estado antigo até atualizar, mas API e RLS verificam a configuração vigente.

Configurações → Módulos e capacidades mostra nome, descrição, estado, motivo e revisão. Admin pode habilitar/desabilitar; outros papéis consultam, com controle desabilitado. Textos novos usam a tradução existente. O mapa `docs/architecture/capacidades-configuraveis.architecture.json` registra portas, dados e retorno humano pela tela e auditoria.

## Runtime e jobs em andamento

Respostas rápidas não têm worker próprio: não registramos worker, scheduler ou evento fictício em produção. `runCapabilityEffect()` foi provado com executor controlado em teste: mudança de flag impede novo callback/efeito e preserva histórico; organização B continua habilitada.

Contrato para módulos futuros: verificar antes de produzir/enfileirar e novamente no consumidor, imediatamente antes de **cada** efeito externo. Job desligado deve terminar com estado e motivo observáveis, sem perder histórico. Adotar cancelamento/cooperatividade entre etapas e definir retry/resume do módulo. Não iniciar novos jobs/eventos da capacidade desligada. A rechecagem não desfaz efeito já consumado e não elimina corrida entre leitura e operação remota; garantias mais fortes exigem desenho transacional/idempotência próprio do módulo.

## Validação e evidências

CONFIRMADO nesta worktree:

- Typecheck passou. Lint sem erros (350 warnings anteriores). Build final passou.
- 18 testes novos de unidade/API/componente cobrem defaults, desconhecida, estados, autorização, API operacional/histórica, MCP e teclado; pacote de regressão dirigido com navegação, templates, mapa e ordem do baseline: 142 testes passaram.
- Seis testes em PostgreSQL real temporário `crm_geral_hardening_test`: A/B, RLS, texto preservado, ativação/desativação, agent/admin/anon/service role, formato inválido e snapshot antigo. Migrations 0240–0242 foram reaplicadas duas vezes em transação com ON_ERROR_STOP.
- Tela real no runtime local com banco real e usuários fictícios: 1440×900 e 390×844. Verificados estado ligado/desligado, histórico, API 403/201, teclado/foco, controle viewer e PATCH 403; sem overflow horizontal. Capturas inspecionadas em `.local-dev/capabilities-visual/` (artefatos locais ignorados). Tema claro vigente; não houve redesenho geral.
- A execução global inicial terminou com 8.401 testes passando, 34 falhando e um expected fail. A regressão de ordem do baseline foi corrigida e seu guard passou; os textos novos foram traduzidos. A falha residual de i18n possui os mesmos 79 textos anteriores na base `b4532f56f`, fora deste escopo.
- Reprodução na base anterior, isolada: nove arquivos e 30 falhas confirmadas (guard da release, importação de leads, PDF meet/replies, namespace das imagens, performed_at, rascunho, marcador de conflitos e instrução de triagem). Causas incluem bash/grep fora do PATH, comportamento Windows/path e asserções anteriores. Theme e importação do drain passaram na repetição com menor concorrência: os timeouts da rodada global não demonstram regressão desta fase. Suíte global não está verde; não foi repetida integralmente após os reparos focados.
- `pnpm test:db` não iniciou pelo bash ausente no PATH. Repetição usando Git Bash chegou ao harness e falhou por Docker ausente. Portanto **install/update completo do baseline no pgvector/PG15 e todos os invariantes do harness não estão homologados**. Os seis testes reais específicos não substituem esse gate. A mesma suíte participa do harness quando TEST_DB_CONTAINER/TEST_DB_PORT são fornecidos; config nativa dedicada permite execução local isolada.

Reprodução dos testes nativos: provisionar somente banco temporário com schema/migrations, definir `CAPABILITIES_TEST_DB_URL` para `crm_geral_hardening_test` e executar `corepack pnpm exec vitest run --config vitest.capabilities-local.config.ts`. Fixtures são fictícias, com IDs únicos e limpeza própria. Nunca apontar para banco de cliente.

Aplicação no `crm_geral_dev`: `scripts/local-dev/apply-capabilities.ps1` solicita senha DBA oculta e aplica somente 0240–0242 em uma transação. Não imprime nem persiste credencial, não faz seed ou exclusão. A sessão não recebeu credencial DBA; execução pelo usuário ainda não confirmada. A validação visual ocorreu no ambiente temporário, sem afirmar ativação no banco de desenvolvimento principal.

## Como adicionar um módulo opcional

1. Registrar apenas capacidade implementada em CAPABILITIES; definir default e papel mínimo aprovados pelo fork.
2. Definir adapter backend de prontidão/configuração/saúde, sem aceitar readiness do body.
3. Usar organização autenticada/confiável, guards canônicos, filtros explícitos e RBAC existente em todas as APIs/actions/tools.
4. Vincular navegação/componente ao read model; distinguir indisponibilidade, permissão e configuração. Preservar porta autorizada de histórico quando aplicável.
5. Proteger produtores, scheduler e consumidores; revalidar junto a cada efeito. Definir cancelamento, retry, dedupe e idempotência do módulo.
6. Se alterar schema, criar migration + apêndice idempotente antes da varredura anon + MANIFEST; registrar grants mínimos e regenerar tipos pelo processo de schema.
7. Atualizar setter/helper SQL para o catálogo suportado, mantendo defaults e contrato de versão coerentes com o registry da release.
8. Auditar alterações/efeitos sem secrets; conectar falhas a estado visível e caminho de resolução humano.
9. Testar enabled/disabled, permissão, prontidão, tenant A/B, chamadas diretas, jobs em voo e histórico preservado em banco real; provar install/update no harness.
10. Documentar cache, desligamento, limites de concorrência, mapa, release fragment e evidência visual antes de publicar.

## Próximo passo / D2

A fundação local demonstra o mecanismo solicitado. D2 permanece uma homologação paralela, ainda não executada. Antes de chamar distribuição pronta: passar o harness completo em ambiente com Docker/pgvector, regenerar tipos, aplicar as migrations no banco principal com DBA e validar Auth/RLS/PostgREST reais no Supabase Staging. Não foram criados projeto cloud, VPS, domínio, Docker de produção ou módulos futuros.

O arquivo preexistente não rastreado `docs/DESKCOMM_UPSTREAM_AUDIT.md` foi preservado integralmente e ficou fora dos commits. Não houve push ou merge da branch do Bloco A.
