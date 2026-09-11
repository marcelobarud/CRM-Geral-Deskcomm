# Inventário funcional e técnico do DeskcommCRM

**Fase:** 1/2 — inventário e execução funcional local com PostgreSQL

**Baseline:** `deskcomm-baseline` / `61a65b3894d5ba2e0a41398705503a81e31dbc16`

**Branches:** `fase-1-postgres-inventario` e `fase-2-postgres-local-runtime`

**Data da coleta:** 2026-09-11
**Repositório de trabalho:** auxiliar `CRM-Geral-Deskcomm`

## 1. Escopo e método

Este documento registra o comportamento e a arquitetura encontrados no código do DeskcommCRM. A coleta combinou:

- leitura estática de `app/`, `lib/`, `workers/`, `scripts/` e `supabase/baseline.sql`;
- enumeração de páginas Next.js e handlers de API;
- leitura de `lib/env.ts`, `.env.example`, clientes Supabase e middleware;
- aplicação do baseline SQL original, sem edição, em um banco PostgreSQL local isolado;
- validações de instalação, tipagem, lint, build e testes já executadas na Fase 0 e repetidas nesta branch.

O inventário é técnico-funcional: a existência de uma rota ou tela indica que a capacidade está implementada no código, mas não significa que foi exercitada ponta a ponta neste ambiente.

## 2. Execução local com PostgreSQL

O computador já possuía PostgreSQL instalado pelo usuário em `D:\PostGre`.

| Item                               | Resultado                                                            |
| ---------------------------------- | -------------------------------------------------------------------- |
| Serviço existente                  | `postgresql-x64-18`, em execução, preservado sem alterações          |
| Versão                             | PostgreSQL 18.6                                                      |
| Binários usados                    | `D:\PostGre\bin`                                                     |
| Cluster de validação               | temporário e isolado, fora do repositório                            |
| Porta de validação                 | `55432`                                                              |
| Banco de validação                 | `crm_geral_deskcomm_apply`                                           |
| Autenticação do cluster temporário | `trust`, somente para a validação local                              |
| Dados de negócio importados        | nenhum; somente estrutura e infraestrutura mínima de compatibilidade |

Foi criado um cluster temporário para não tocar no cluster já existente em `D:\PostGre`. O banco de validação recebeu apenas uma camada temporária, fora do repositório, com os papéis `anon`, `authenticated` e `service_role`, schemas mínimos `auth` e `storage`, funções mínimas `auth.uid()`/`auth.jwt()`, tabelas mínimas de usuários/sessões/objetos e as extensões nativas disponíveis `pgcrypto`, `uuid-ossp`, `citext` e `pg_trgm`.

O `supabase/baseline.sql` foi aplicado sem modificação. A maior parte do modelo relacional, funções, triggers, índices, RLS e policies foi criada. A aplicação parou de ser estruturalmente completa por dois limites identificados:

1. o tipo/extensão `vector` não está instalado em `D:\PostGre`; por isso `ai_chunks` e os objetos que dependem dele não puderam ser criados;
2. a publicação `supabase_realtime` registrou aviso porque o cluster temporário não estava com `wal_level=logical`. Isso é necessário para um serviço de Realtime, não para o PostgreSQL relacional isolado.

O pgvector é uma extensão separada do PostgreSQL; a referência oficial de instalação e suporte é o [README do pgvector](https://github.com/pgvector/pgvector).

## 3. Arquitetura encontrada

O sistema é uma aplicação Next.js 16 com React 19, TypeScript, Supabase JS/SSR, PostgreSQL, workers Node/tsx e integração com WAHA para WhatsApp. O desenho é multi-tenant, com `organizations` como eixo de tenant, `user_organizations` como vínculo de usuário e RLS/policies para isolamento.

### 3.1 Matriz PostgreSQL x Supabase

| Camada                                    | PostgreSQL local                      | Dependência Supabase                                 | Situação local                                                         |
| ----------------------------------------- | ------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Tabelas, views, constraints e índices     | Sim                                   | Não obrigatória                                      | Majoritariamente criada pelo baseline                                  |
| Funções SQL e triggers                    | Sim                                   | Não obrigatória para execução SQL                    | Criadas conforme o baseline, com perdas causadas pelo `vector` ausente |
| RLS e policies                            | Sim                                   | Não obrigatória no banco                             | Presente no modelo aplicado                                            |
| `auth.users`, `auth.uid()`, JWT e sessões | Armazenamento pode existir            | GoTrue/Auth e emissão/validação de sessão            | Shim estrutural insuficiente para login real                           |
| Cliente de dados da aplicação             | PostgreSQL direto em alguns workers   | Supabase PostgREST via `@supabase/supabase-js`/SSR   | Não substituído por acesso direto                                      |
| Storage                                   | Tabelas podem existir                 | API Supabase Storage, upload, download e signed URLs | Não disponível somente com PostgreSQL                                  |
| Realtime                                  | Publicação PostgreSQL é parte da base | Serviço Supabase Realtime e canais WebSocket         | Não disponível; `wal_level=logical` também não estava habilitado       |
| RPC exposto à aplicação                   | Função SQL pode existir               | PostgREST/RPC HTTP                                   | Funções SQL locais existem, endpoint HTTP Supabase não                 |
| Vetores/RAG                               | PostgreSQL com pgvector               | Não é exclusivo do Supabase                          | Bloqueado: `vector.control` ausente                                    |

Conclusão operacional: o banco relacional pode ser executado em PostgreSQL padrão. Na Fase 2, Auth, PostgREST e RPC ganharam um adaptador local mínimo sobre o Next.js, preservando os clientes Supabase e o RLS. Storage, Realtime, WAHA, Redis e provedores externos continuam dependências opcionais; remover completamente essas dependências é uma etapa de arquitetura posterior.

### 3.2 Inicialização e autenticação

- `proxy.ts` cria cliente Supabase SSR, lê `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` e valida o usuário com `supabase.auth.getUser()`.
- As rotas protegidas redirecionam telas para `/login` e retornam envelope JSON `401` para APIs.
- Há autorização adicional para plataforma/admin por RPC `fn_is_platform_admin`.
- Rotas públicas incluem login, signup, confirmação, páginas legais, webhooks, cron, health, callbacks OAuth e endpoints internos definidos explicitamente em `lib/auth/public-paths.ts`.
- O fluxo depende de cookies, GoTrue, JWT, recuperação de senha, MFA, convites e callbacks OAuth; uma tabela `auth.users` isolada não implementa esses fluxos.

### 3.3 Dados, continuidade e observabilidade

O código contém entidades de CRM, conversas, mensagens, agentes de IA, follow-ups, agenda, tarefas, LGPD, auditoria, métricas, filas e logs de eventos. Há workers e cron routes para continuar o processamento assíncrono, além de trilhas de auditoria, `event_log`, `job_queue`, health checks e incidentes.

## 4. Inventário funcional

| Área             | Funcionalidade                                                             | Estado                                        | Banco                                                                            | Serviço externo                    | Observações                                                 |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- |
| Acesso           | Login, signup, recuperação, reset, MFA e confirmação                       | Implementado no código; não exercitado        | `auth.users`, sessões e códigos                                                  | Supabase Auth/GoTrue               | Requer URL/chaves Supabase e cookies de sessão              |
| Tenancy          | Organizações, vínculo de usuários, suspensão e suporte                     | Implementado no código                        | `organizations`, `user_organizations`, tabelas de suporte                        | Supabase Auth/PostgREST            | RLS e gate de admin fazem parte do desenho                  |
| CRM              | Contatos, leads, pipelines, stages, atividades e tarefas                   | Implementado no código                        | `contacts`, `crm_leads`, `crm_pipelines`, `crm_stages`, `crm_tasks`, atividades  | Nenhum obrigatório para o modelo   | Operação acessada principalmente via Supabase JS            |
| Inbox            | Conversas, mensagens, notas, atribuição, leitura, pausa e transferência    | Implementado no código                        | `conversations`, `messages`, `conversation_notes`, eventos de atribuição         | WAHA/WhatsApp                      | Realtime é usado para atualização de interface              |
| WhatsApp         | Sessões, QR, conexão, ingestão, envio e mídia                              | Implementado no código; dependente de serviço | `channel_sessions`, saúde e logs de canal                                        | WAHA, Supabase Storage             | Webhooks públicos possuem autenticação própria              |
| IA               | Agentes, versões, routers, skills, runs, providers, orçamento e guardrails | Implementado no código                        | `ai_agents`, `ai_agent_versions`, `ai_routers`, `ai_agent_runs`, tabelas de IA   | OpenAI, Anthropic, Google, MCP     | Chaves e catálogo de modelos são configuráveis              |
| RAG/Conhecimento | Fontes, trechos, reindexação, busca e uso de conversas                     | Parcial no ambiente                           | `ai_knowledge_sources`, `ai_knowledge_versions`, `ai_chunks`                     | Storage e provedor de embeddings   | `ai_chunks` não foi criado sem pgvector                     |
| Follow-up        | Fluxos, versões, inscrições, promessas, fila e workers                     | Implementado no código                        | `followup_*`, `promise_table_*`, `job_queue`                                     | WAHA e IA                          | Execução assíncrona por cron/worker                         |
| Agenda           | Tipos, disponibilidade, agendamentos, Google Meet e reconciliação          | Implementado no código; não exercitado        | `calendar_*`, `appointment_recovery_receipts`                                    | Google Calendar/Meet               | OAuth, callbacks e sincronização dependem de credenciais    |
| Produtos/pedidos | Catálogo, produtos, pedidos e propostas                                    | Implementado no código                        | `catalog_products`, `nuvemshop_products`, `orders`, propostas relacionadas       | Nuvemshop                          | Integração é opcional e controlada por ambiente             |
| Marketing        | Contas Meta, campanhas e conversões                                        | Implementado no código                        | `ad_platform_connections`, `ad_insights_connections`, `ad_conversion_dispatches` | Meta Ads                           | APIs e credenciais externas necessárias                     |
| Automação        | Regras, execuções, reenvio e ações de canal                                | Implementado no código                        | `automation_rules`, `automation_rule_runs`, `event_log`                          | WAHA/Resend conforme ação          | Cron/worker mantém continuidade                             |
| LGPD             | Solicitações, aprovação, anonimização e exportação                         | Implementado no código                        | `lgpd_requests`, fila de redaction e auditoria                                   | Resend; Nuvemshop quando aplicável | Fluxos possuem SLA watcher e workers                        |
| Auditoria        | Auditoria de API, exportação, incidentes e health                          | Implementado no código                        | `api_audit_log`, `incidents`, `event_log`                                        | Sentry opcional                    | Logs não substituem configuração de observabilidade externa |
| Voz              | Sessões, chamadas, WebRTC, histórico e opt-in                              | Implementado no código; não exercitado        | `voice_calls`, `org_voice_calls`                                                 | Provedor de voz/WebRTC             | Depende de infraestrutura de voz compatível                 |
| Notificações     | Push e templates                                                           | Implementado no código; não exercitado        | `push_subscriptions`, `message_templates`                                        | Web Push/Resend                    | Requer chaves do serviço                                    |

## 5. Inventário de telas

Foram encontrados **112 arquivos `page.tsx`**.

| Superfície                       | Quantidade aproximada | Principais capacidades                                                                          |
| -------------------------------- | --------------------: | ----------------------------------------------------------------------------------------------- |
| `/app/*`                         |                    63 | CRM, inbox, agenda, IA, métricas, conexões, produtos, tarefas, equipe, configurações e webhooks |
| `/admin/*`                       |                    21 | Dashboard de plataforma, tenants, usuários, auditoria, LGPD, incidentes, marca e uso            |
| `/onboarding/*`                  |                     9 | Boas-vindas, equipe, funil, IA, WhatsApp, Nuvemshop, teste e conclusão                          |
| `/login/*`                       |                     5 | Login, MFA, recuperação, reset e recovery                                                       |
| Legais, erro, convite e públicas |                    14 | Landing, termos, privacidade, convite, estados de erro, agenda pública e telas auxiliares       |

Rotas representativas: `/app`, `/app/inbox`, `/app/contacts`, `/app/leads/[id]`, `/app/kanban`, `/app/agenda`, `/app/ai/agents`, `/app/ai/knowledge/sources`, `/app/settings/tenant/whatsapp`, `/admin/tenants`, `/admin/audit`, `/onboarding/setup-ai` e `/vitrine-agenda`.

A execução visual da Fase 2 foi concluída no navegador local com o seed de desenvolvimento: login, inbox, contatos, funis, agenda, tarefas, central de IA e dashboard administrativo abriram. As integrações externas continuam fora do escopo desta aprovação visual.

## 9. Runtime local da Fase 2

O procedimento operacional completo está em [`docs/LOCAL_POSTGRES_SETUP.md`](LOCAL_POSTGRES_SETUP.md). A execução confirmou o caminho vivo `login → sessão local → proxy → REST/RPC → PostgreSQL/RLS → telas`, além do CRUD básico de `contacts`. O serviço local sobe com Redis, WAHA, Storage e Realtime degradados quando não configurados, sem afirmar que essas integrações externas foram simuladas.

## 6. Inventário de APIs

Foram encontrados **268 arquivos `route.ts`**. A distribuição por grupo é:

| Grupo              | Rotas |
| ------------------ | ----: |
| `ai`               |    66 |
| `conversations`    |    19 |
| `admin`            |    21 |
| `cron`             |    22 |
| `leads`            |    13 |
| `voice`            |    11 |
| `contacts`         |    10 |
| `webhooks`         |     9 |
| `team`             |     8 |
| `pipelines`        |     7 |
| `agenda`           |    15 |
| `automation-rules` |     5 |
| `channel-sessions` |     5 |
| `channels`         |     5 |
| `lgpd`             |     5 |
| `auth`             |     4 |
| `settings`         |     4 |
| `products`         |     3 |
| `webhook-sources`  |     3 |
| Outros grupos      |    26 |

Na detecção por exportação direta foram identificados **155 GET, 127 POST, 32 PATCH, 26 DELETE e 7 PUT**. Sete handlers de cron usam uma forma de exportação que não foi capturada por essa expressão; por isso os números de métodos são indicativos, enquanto o total de arquivos é a contagem do código.

Famílias de API relevantes:

- `/api/v1/admin/*`: tenants, usuários, plataforma, auditoria, incidentes, LGPD, uso e impersonação;
- `/api/v1/ai/*`: agentes, versões, testes, providers, credenciais, routers, skills, memória, conhecimento, follow-ups, cases, runs e métricas;
- `/api/v1/contacts/*`, `/leads/*`, `/pipelines/*`, `/products/*`, `/tasks/*` e `/conversations/*`: núcleo CRM e atendimento;
- `/api/v1/channel-sessions/*`, `/channels/*`, `/messages/*`, `/voice/*` e `/webhooks/*`: canais e comunicação;
- `/api/v1/agenda/*`, `/integrations/nuvemshop/*`, `/ads/meta/*`: integrações de agenda, comércio e marketing;
- `/api/v1/cron/*`, `/system/*`, `/health`, `/internal/*` e `/api/mcp/*`: operação, workers, health e automação;
- `/api/v1/lgpd/*`, `/audit/*`, `/metrics/*` e `/reports/*`: governança e análise.

As rotas públicas não são necessariamente anônimas: webhooks, cron, agent heartbeat, relógio e callbacks possuem autenticação própria dentro da rota. O middleware apenas não faz a validação de cookie nesses caminhos.

## 7. Inventário do banco

### 7.1 Contagem observada no banco local

Após a aplicação parcial do baseline em PostgreSQL local:

| Objeto                          |                                Quantidade |
| ------------------------------- | ----------------------------------------: |
| Tabelas `public`                |                                       125 |
| Views `public`                  |                                         3 |
| Funções `public`                |                                       245 |
| Triggers explícitos em `public` |                                       115 |
| Índices `public`                |                                       424 |
| Tabelas `public` com RLS        |                                       125 |
| Policies `public`               |                                       468 |
| Schemas presentes na validação  | `public`, `auth`, `storage`, `extensions` |

O texto do baseline também contém objetos condicionais/repetidos e referências de infraestrutura que não são equivalentes a uma simples contagem de objetos finais. Por isso a contagem acima é a observada no catálogo PostgreSQL após a execução, e não uma promessa de que todo objeto do baseline ficou íntegro.

### 7.2 Entidades centrais

- **Tenancy:** `organizations`, `user_organizations`, `platform_admins`, `platform_support_sessions`;
- **CRM:** `contacts`, `crm_leads`, `crm_lead_links`, `crm_lead_activities`, `crm_pipelines`, `crm_stages`, `crm_tasks`, `catalog_products`, `orders`;
- **Atendimento:** `conversations`, `messages`, `conversation_notes`, `conversation_assignment_events`, `channel_sessions`, `channel_session_health`;
- **IA:** `ai_agents`, `ai_agent_versions`, `ai_agent_runs`, `ai_routers`, `ai_router_members`, `ai_models`, `ai_provider_credentials`, `ai_knowledge_sources`, `ai_knowledge_versions`, `ai_chunks`;
- **Continuidade:** `event_log`, `event_service_origins`, `job_queue`, `cron_jobs`, `idempotency_keys`, `watchdog_cursors`, `send_ledger`;
- **Agenda:** `calendar_appointments`, `calendar_availability_exceptions`, `calendar_connections`, `calendar_connection_calendars`, `calendar_event_types`, `calendar_external_events`;
- **Governança:** `api_audit_log`, `incidents`, `lgpd_requests`, `storage_redaction_queue`, `webhook_events_log`;
- **Follow-up e operação:** `followup_enrollments`, `followup_flow_versions`, `followup_flow_pointers`, `promise_table_versions`, `pacing_ledger`, `automation_rules`, `automation_rule_runs`;
- **Canais e integrações:** `webhook_sources`, `webhook_lead_captures`, `tenant_integrations`, tabelas de Meta, Nuvemshop, push e voz.

### 7.3 Dependências de infraestrutura SQL

O baseline referencia `auth.users`, `auth.uid()`, `auth.jwt()`, `auth.sessions`, `auth.mfa_factors`, `storage.buckets`, `storage.objects`, `public.vector`, `extensions.uuid_generate_v4()`, a publicação `supabase_realtime` e extensões `pgcrypto`, `uuid-ossp`, `citext`, `pg_trgm` e pgvector. As primeiras foram simuladas apenas no cluster temporário para permitir a inspeção; isso não constitui substituição funcional de Supabase Auth, Storage ou Realtime.

## 8. Integrações e variáveis de ambiente

`lib/env.ts` classifica como obrigatórias para boot, entre outras, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `INTERNAL_SECRET`, `CPF_ENCRYPTION_KEY`, `WAHA_BYO_ENCRYPTION_KEY`, `WAHA_API_BASE_URL`, `WAHA_API_KEY`, `WAHA_WEBHOOK_BASE_URL`, `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

Integrações opcionais ou condicionais encontradas:

- **WAHA/WhatsApp:** sessão, QR, webhooks, envio, mídia, saúde e presença;
- **Redis/Upstash:** filas, rate limiting e coordenação de jobs conforme os módulos;
- **OpenAI, Anthropic e Google:** modelos e embeddings/IA, conforme credenciais cadastradas;
- **Google Calendar/Meet:** OAuth, calendários, eventos e videoconferência;
- **Meta Ads:** contas, campanhas, insights e conversões;
- **Nuvemshop:** OAuth, produtos, pedidos e callbacks LGPD;
- **Resend:** convites, notificações e fluxos LGPD;
- **Sentry:** telemetria opcional;
- **Web Push:** inscrições e notificações;
- **MCP:** ferramentas para agentes e integrações server-to-server.

Nenhum segredo foi criado, gravado ou incluído neste inventário.

## 9. Limitações, riscos e dívida observados

- PostgreSQL local funciona para a camada relacional, mas o aplicativo depende de Supabase Auth, PostgREST, Storage e Realtime para boot e execução completa.
- pgvector não está instalado em `D:\PostGre`; o caminho RAG não ficou estruturalmente completo.
- O cluster de validação temporário não usou `wal_level=logical`; Realtime não foi validado.
- Não houve importação de dados reais do Deskcomm, apenas aplicação do baseline estrutural.
- Não houve alteração em `supabase/baseline.sql`, código funcional, branding ou dependências.
- A Fase 0 registrou 349 warnings de lint, falha do `format:check` em 2.224 arquivos e falhas/hang em parte do `test:unit`; esses resultados são baseline de saúde do repositório, não foram corrigidos nesta fase.
- A aplicação não foi explorada visualmente em runtime porque as variáveis obrigatórias e os serviços HTTP Supabase não estavam disponíveis.
- O script `db:migrate` ainda é um placeholder (`TODO: wire supabase db push or pg-migrate`); a fonte estrutural usada nesta fase foi o baseline SQL.

## 10. Conclusão da Fase 1

O DeskcommCRM possui uma base PostgreSQL extensa e multi-tenant, com RLS, funções, triggers, filas e domínio funcional amplo. É possível inicializar a parte relacional em PostgreSQL padrão, como demonstrado no cluster local isolado. Porém, a aplicação atual não é executável de forma completa apenas apontando `SUPABASE_DB_URL` para PostgreSQL: o código exige as APIs e serviços Supabase para autenticação, acesso HTTP aos dados, storage e realtime.

O único artefato versionado desta fase é este inventário. O PostgreSQL existente do usuário em `D:\PostGre` foi preservado, e toda a infraestrutura auxiliar usada para a inspeção ficou fora do repositório.
