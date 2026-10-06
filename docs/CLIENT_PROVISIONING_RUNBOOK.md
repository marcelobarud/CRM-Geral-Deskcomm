# Runbook de provisionamento — Cliente Zero CRM Geral

**Estado Fase I.1: alinhamento local corrigido; instalação comercial ainda não homologada. NO-GO.** Os defaults agora apontam ao fork e a nova organização recebe seed genérico, mas não existe release `stable` publicada no fork, nem foi executada instalação limpa ou criação real de novo tenant. Geral 1 permanece staging e não pode ser usado como Cliente Zero/produção ou como destino de restore.

## Topologia e fonte de artefatos

Uma instalação por cliente: VPS dedicada, projeto Supabase dedicado, domínio e credenciais próprias. O pacote versionado baixa código de `https://github.com/marcelobarud/CRM-Geral-Deskcomm.git`; o namespace default das três imagens é `ghcr.io/marcelobarud` (nomes mantidos por compatibilidade). O updater compara `origin` ao fork configurado e recusa origem divergente. Não altere imagens para `latest` no fluxo comercial.

O CI publica app, worker e scheduler com versão, commit e schema nos labels/envs; `/api/v1/health` expõe versão, revisão e schema. Isso descreve o artefato construído, não prova que uma release está disponível. No fork não há release `stable`; o workflow de release falhou porque faltam `RELEASE_APP_ID` e `RELEASE_APP_PRIVATE_KEY`. Não iniciar instalação até as três imagens da mesma versão estarem públicas e verificadas.

## Variáveis a provisionar em vault

| Nome | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | endereço e chave pública do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | server/worker; nunca expor no browser |
| `SUPABASE_DB_URL`, opcional `SUPABASE_DB_ADMIN_URL` | conexão de runtime e conexão administrativa para DDL |
| `INTERNAL_SECRET`, opcional `INTERNAL_CRON_SECRET` | scheduler/rotas internas |
| `APP_IMAGE`, `WORKER_IMAGE`, `SCHEDULER_IMAGE` | três refs versionadas da mesma release do fork |
| `DOMAIN`, `ACME_EMAIL` | domínio e TLS |
| `BACKUP_DIR` | destino absoluto fora do checkout; no ambiente comercial deve ser externo/offsite e criptografado |
| `WAHA_API_KEY_SHA512`, `WAHA_HMAC_SECRET` | somente quando WhatsApp for contratado/configurado |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | conforme runtime escolhido |
| `SMTP_*` e credenciais de OAuth | somente providers contratados; gerenciar fora do Git |

Registre nomes/estado, nunca valores secretos. `SUPABASE_ACCESS_TOKEN` é temporário para Management API e não deve entrar no `.env` do cliente.

## Sequência após os gates

1. Conferir tag/commit/schema e visibilidade/digest das três imagens; comparar refs da release.
2. Criar projeto Supabase dedicado, definir região/plano, redirects Auth, extensões e parâmetros externos. Aplicar a baseline com conexão administrativa; não usar `db:reset` como procedimento comercial.
3. Confirmar functions/triggers/grants/RLS/policies, Storage, Realtime e health em banco limpo. Essa etapa ainda não foi executada nesta Fase I.1.
4. Rodar o instalador do fork. Ele deve interromper se baseline, extensões ou verificação mínima de schema falharem; não continuar com erros inesperados.
5. Criar o admin pelo signup/invite canônico, nunca por INSERT manual. Validar organization e membership admin no mesmo tenant.
6. Primeiro acesso esperado pelo código: signup aceita `org_name`; sem organização ativa a pessoa passa por `/get-started`, e a organização não onboarded passa por `/onboarding`. A criação real de tenant não foi executada, então isso permanece **INFERIDO / NOT TESTED** como jornada completa.
7. Defaults de schema confirmados estaticamente: BRL, `America/Sao_Paulo`, `pt-BR`, branding sem override e settings vazias. Migration 0276 muda apenas novas organizações para pipeline `Comercial`, etapas `Novo`, `Em contato`, `Em negociação`, `Ganho`, `Perdido` e hints canônicos `new/contacted/negotiating/won/lost`; probabilities não são preenchidas. Prova pelo fluxo real de onboarding permanece **NOT TESTED**.
8. Registry de código: `message_templates` ligada por padrão; `proposals`, `short_scripts` e `scheduled_campaigns` desligadas. Confirmado em `lib/capabilities/registry.ts`; persistência/visibilidade do tenant novo real não foi testada.
9. Completar branding, fuso/moeda se necessário, equipe, funil, capacidades e integrações. Executar smoke A/B, desktop/mobile, Storage, worker/scheduler, sem provider ou destinatário real; limpar fixtures e conferir audit/filas.
10. Registrar domínio/TLS, release, backup offsite cifrado, RPO/RTO, responsáveis, suporte e estado READY/DEGRADED/NOT_CONFIGURED.

## Gaps de liberação

- Não há release publicada/`stable` das três imagens no fork, nem workflow de release verde.
- Clean install e invariants não foram executados porque faltam Docker/daemon e Supabase CLI.
- Novo tenant real, primeiro login, defaults/capabilities persistidos e smoke visual não foram testados nesta fase.
- Backup/restore com Storage foi implementado em scripts, mas não homologado em ambiente isolado; destino offsite/criptografia são configuração operacional.

Não provisionar cliente real, não usar Geral 1 como produção e não ativar envio externo para validar o pacote.
