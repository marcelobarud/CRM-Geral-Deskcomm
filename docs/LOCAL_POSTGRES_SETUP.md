# Runtime local com PostgreSQL

Este documento descreve o runtime local da Fase 2. Ele mantém a arquitetura de clientes Supabase do DeskcommCRM, mas fornece adaptadores HTTP locais para autenticação, REST e RPC sobre o PostgreSQL já instalado.

## Ambiente preparado

- PostgreSQL 18.6, serviço `postgresql-x64-18`, binários em `D:\PostGre\bin`.
- Banco de desenvolvimento: `crm_geral_dev`.
- Usuário de aplicação: `crm_geral_app`.
- Banco auxiliar e demais bancos existentes não são recriados nem apagados.
- Extensões disponíveis: `pgcrypto`, `uuid-ossp`, `citext` e `pg_trgm`.
- `pgvector` não está instalado; `ai_chunks` e os objetos que dependem do tipo `vector` ficam pendentes.

## Primeiro setup

O script é deliberadamente interativo para que senhas não sejam colocadas no código, no histórico do repositório ou neste documento:

```powershell
cd 'D:\Codex\CRM Geral'
.\scripts\local-dev\setup.ps1
```

O script solicita a senha administrativa temporária do PostgreSQL e a senha do usuário local do CRM, executa o bootstrap de `auth`/`storage`, aplica o `supabase/baseline.sql` sem modificá-lo e executa o seed idempotente. O log do baseline fica em `.local-dev\baseline-apply.log`, uma pasta ignorada pelo Git.

Para reaplicar apenas o seed sem tocar no baseline, use o mesmo fluxo com `-SkipBaseline`.

## Ambiente da aplicação

O `.env.local` é ignorado pelo Git. Ele deve conter a URL local, chaves locais não produtivas, `SUPABASE_DB_URL`, `LOCAL_DEV_AUTH=true` e os segredos efêmeros gerados para a máquina. Nunca copie este arquivo para commits, documentação ou produção.

O usuário seed é criado pelo script com o e-mail configurado em `LOCAL_DEV_AUTH_EMAIL`. O seed também cria uma organização de teste, vínculo `admin`, administrador de plataforma, funil padrão, estágios e um contato de teste.

## O que o adaptador local cobre

1. `/auth/v1/token`, `/auth/v1/user`, `/auth/v1/logout` e `/auth/v1/signup` (signup bloqueado; a conta vem do seed).
2. `/rest/v1/[tabela]` para leitura e operações básicas parametrizadas com filtros PostgREST comuns, retorno de representação e RLS.
3. `/rest/v1/rpc/[função]` para RPCs públicas existentes, com contexto `request.jwt.claim.*` e roles `anon`, `authenticated` e `service_role`.
4. O proxy deixa esses caminhos chegarem ao adaptador; a autorização continua dentro da rota e o banco continua com RLS habilitado.

O pool usa uma transação por requisição porque `SET LOCAL ROLE` e `set_config(..., true)` precisam do escopo transacional para que `auth.uid()` e as policies recebam o usuário correto.

## Limites conhecidos

- Não é uma implementação completa do Supabase Cloud. Storage, Realtime, WAHA, Redis, e-mail, OAuth externo e provedores de IA continuam opcionais/indisponíveis sem seus serviços.
- Relacionamentos aninhados do PostgREST são reduzidos ao conjunto de colunas simples do adaptador; páginas que dependem de Storage, Realtime ou integração externa degradam com aviso.
- O baseline original registra erros somente nos pontos dependentes de `vector`; esses erros não são ocultados e ficam no log para instalação posterior do pgvector.
- `pnpm test:db` continua sendo o gate completo de invariantes e normalmente exige Docker/pgvector; a validação desta fase foi feita no PostgreSQL local disponível e no catálogo resultante.

## Validação executada

- `pnpm typecheck`: aprovado.
- `pnpm lint`: aprovado, com os avisos preexistentes do repositório e zero erros.
- `GET /api/v1/health`: HTTP 200; Supabase local relacional OK; Redis e WAHA degradados por não configuração.
- Login visual no navegador local: aprovado.
- Telas abertas: inbox, contatos com contato seed, funis, agenda, tarefas, central de IA e dashboard administrativo.
- CRUD HTTP de `contacts`: create, update e delete aprovados; o registro temporário foi removido ao final do teste.
