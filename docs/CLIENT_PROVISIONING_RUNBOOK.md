# Runbook de provisionamento — Cliente Zero CRM Geral

Estado: documentado, mas ainda não homologado ponta a ponta. A recomendação atual é NO-GO até alinhamento do pacote do fork, install limpo e defaults genéricos de organização.

## Topologia e bloqueio

Uma instalação por cliente: VPS dedicada, Supabase Project dedicado, domínio e credenciais próprias. Não criar branch por cliente; diferenças ficam em configuração, capabilities, branding, permissões e dados.

O instalador hostgator-setup-kit/install.sh, compose, template de ambiente e workflows ainda apontam para o repositório/imagens upstream. Não executar como instalador CRM Geral antes de alinhar REPO_URL, APP_IMAGE, WORKER_IMAGE, SCHEDULER_IMAGE, permissões do registry, CI e instruções de suporte ao fork. db:migrate no package é placeholder. O caminho declarado é supabase/baseline.sql, mas clean install não foi provado.

## Configuração a inventariar no vault

| Nome | Necessidade/uso |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | URL pública do projeto |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | chave pública; nunca substitui autorização server-side |
| SUPABASE_SERVICE_ROLE_KEY | secret do servidor/worker; jamais expor no browser |
| SUPABASE_DB_URL | operações de schema e rotinas que usam conexão direta |
| SUPABASE_DB_ADMIN_URL | condicional para DDL quando a conexão de app não tem privilégio |
| INTERNAL_SECRET | chamada autenticada do scheduler self-host |
| INTERNAL_CRON_SECRET | opcional; vazio usa INTERNAL_SECRET |
| APP_IMAGE / WORKER_IMAGE / SCHEDULER_IMAGE | versões imutáveis alinhadas do registry do fork |
| DOMAIN / ACME_EMAIL | domínio e TLS no self-host |
| WAHA_API_KEY_SHA512 / WAHA_HMAC_SECRET | somente se WhatsApp estiver contratado/configurado |
| UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN | conforme runtime configurado |
| SUPABASE_ACCESS_TOKEN | temporário para Management API; não persistir |
| SMTP_* | somente se email operacional estiver habilitado |

Esta lista é de nomes em templates/código. Não registrar valores neste runbook; confirmar variáveis da release selecionada antes de cadastrar. Regionalização/plano, RPO/RTO, responsável, provedor e política de retenção continuam decisões abertas.

## Procedimento após liberação do pacote

1. Conferir tag, commit e manifesto de release; garantir que app, worker e scheduler são da mesma versão do CRM Geral.
2. Criar projeto Supabase dedicado; registrar URL/Auth redirect, extensões, RLS/policies, buckets, Realtime e owners sem inserir secrets no relatório.
3. Aplicar baseline com a conexão administrativa prevista; validar functions, triggers, grants, RLS, policies, Storage, Realtime e types.
4. Subir app/worker/scheduler e dependências com imagens verificadas; validar health e observar execuções do cron.
5. Criar admin pelo fluxo de signup/convite aprovado; confirmar membership admin da organização correta. Não inserir org/membership via SQL manual.
6. Configurar fuso, moeda, branding, equipe e funil. Hoje signup usa org_name/email prefixo/“Minha empresa”; o trigger semeia funil de e-commerce. Se o wizard for pulado, essas etapas permanecem. Decisão de defaults neutros é gate antes do Cliente Zero.
7. Confirmar capabilities: message_templates ligada por padrão; proposals, short_scripts e scheduled_campaigns desligadas por padrão. Integrar providers só após configuração/aceite.
8. Rodar smoke test sintético em login, core comercial, RLS A/B, Admin, mobile/desktop, cron e Storage; limpar e conferir fixtures.
9. Ativar domínio/TLS, registrar versão, responsáveis, estado READY/DEGRADED/NOT_CONFIGURED e plano de suporte.

Não usar Geral 1 como produção ou como prova de restore. Não ativar provider/campanha com destinatário real em teste.
