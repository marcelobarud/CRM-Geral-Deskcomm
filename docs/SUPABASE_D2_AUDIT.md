# D2 — Auditoria Supabase Geral 1

Data: 2026-10-03. Base aprovada integrada: `main` em `8a9888a787d45764ba747edcd118f51768eacb2a`. Branch de trabalho: `d2-supabase-geral-1`.

## Destino confirmado e inventário anterior a alterações

CONFIRMADO pelo conector Supabase: organização **CRM Geral**, projeto **Geral 1**, região us-east-1, status ACTIVE_HEALTHY, PostgreSQL 17.11. Projeto de desenvolvimento/staging, sem cliente real ou produção comercial.

Inventário inicial: zero tabelas/functions em public, zero policies public/storage, zero migrations registradas, zero usuários Auth, zero buckets. Publicação supabase_realtime existe sem tabelas. Extensões habilitadas: plpgsql, pg_stat_statements, uuid-ossp, pgcrypto e supabase_vault. vector 0.8.2 disponível, ainda não habilitado; pg_cron, pg_net e btree_gist disponíveis, não habilitados.

Não existe banco local a copiar nem dado de cliente a importar. A instalação deve partir do repositório aprovado. Nenhum reset, remoção de projeto ou reconstrução de dados existentes é necessário.

## Caminho existente

`hostgator-setup-kit/install.sh` e `update.sh` aplicam supabase/baseline.sql; habilitam vector, citext e pg_trgm em public antes do baseline. O schema usa public.vector. O update do kit tolera mensagens de objetos já existentes; o harness test:db verifica install/update com tratamento próprio e ON_ERROR_STOP. Não presumir que o dump inteiro é reaplicável dentro de uma única transação sem adaptação.

Migrations históricas representam evolução anterior e não devem ser reaplicadas cegamente depois do baseline consolidado. O MANIFEST contém referências históricas upstream, sem representar migrações já executadas no Geral 1. As migrations 0240–0242 precisam execução e validação explícita, não simples marcação.

## Matriz local × Supabase

| Área | PostgreSQL local | Geral 1 antes da instalação | Gap/prova necessária |
| --- | --- | --- | --- |
| Database | PostgreSQL instalado + schema do produto | PG17.11, public vazio | Instalar fonte versionada, comparar objetos e atualização |
| Auth | lib/local-dev/auth.ts + rotas /auth/v1 | GoTrue disponível, sem usuários | Admin bootstrap fictício, login/logout/refresh reais, MFA aplicável |
| REST/PostgREST | lib/local-dev/rest.ts + /rest/v1/[table] | Data API gerenciada | Filtros, status, returning e erros reais com JWT |
| RPC | adapter local permite RPC public autorizada | PostgREST real, sem RPCs do produto | Grants, definer/search_path e organização confiável |
| RLS | Policies reais, JWT simulado/local | Sem tabelas do produto | JWTs Auth reais A/B, anon, agent/viewer/admin |
| Roles | bootstrap local cria roles mínimas | Roles Supabase gerenciadas | Não alterar roles/schemas gerenciados para imitar adapter |
| Storage | Stubs SQL; não homologa serviço | Serviço real, sem buckets | Buckets/policies aprovados, upload/leitura/remoção e cross-tenant |
| Realtime | adapter não implementa WebSocket | Publicação vazia | Publicar apenas tabelas contratuais e verificar subscription com RLS |
| Extensions | Dependem da instalação local | pgcrypto já ativo; vector disponível | vector/citext/pg_trgm do kit e objetos qualificados corretos |
| pgvector | Não comprovado pelo runtime local | vector não ativo | Habilitar em public conforme contrato do schema |
| Triggers/functions | Fonte baseline + migrations | Zero funções do produto | Segurança, grants mínimos e efeitos idempotentes |
| Cron/jobs | dev-crons/worker separados | Nenhum scheduler do CRM instalado | Não criar scheduler concorrente nem cron cloud sem contrato |
| Capabilities | Prova Bloco A em banco temporário | Sem namespace/RPC/RLS | Instalar 0240–0242; repetir READY/DISABLED, A/B e histórico |
| Generated types | Arquivo legado + contrato RPC estreito | Tipos do schema real ainda indisponíveis | Gerar via conector/CLI e investigar diff antes de aceitar |

## Clientes e ambiente

Clientes canônicos: lib/supabase/browser.ts (anon/publishable), server.ts (cookie/JWT), admin.ts (chave privilegiada somente servidor), proxy/middleware e workers. Configuração pública e privilegiada deve apontar ao mesmo projeto. LOCAL_DEV_AUTH=false é obrigatório para essa jornada; adapters locais devem falhar fechados fora do modo local.

O conector permite inventário e DDL, sem fornecer ao app a chave de servidor. A presença de credenciais foi checada sem imprimir valores. Será preparado iniciador interativo: entrada oculta e variáveis somente no processo filho, sem arquivo de segredo. Nunca usar credencial de PostgreSQL local como substituta de chave Supabase.

## Referências verificadas

- [Changelog PG15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes): mudanças de pgcrypto e operadores; projeto vazio evita migração de ciphertext/index existente. Confirmar extensão e funções reais, sem inferir compatibilidade completa.
- [pgvector](https://supabase.com/docs/guides/database/extensions/pgvector): extensão precisa ser habilitada; seu schema deve corresponder ao contrato versionado.
- [Data API e segurança](https://supabase.com/docs/guides/api/securing-your-api): grants e RLS são controles distintos; não usar service role para provar isolamento do usuário.

## Situação da transição

Auditável não significa homologado. Até evidência de schema, Auth/RLS/Storage/Realtime e app reais, PostgreSQL local continua principal temporariamente. Docker não será instalado apenas para iniciar D2; o harness permanece regressão complementar, sem substituir provas do Supabase.
