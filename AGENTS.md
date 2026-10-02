# AGENTS.md — CRM Geral

Contrato global para agentes neste fork. Leia este arquivo primeiro; consulte o detalhamento pertinente em [CLAUDE.md](CLAUDE.md), subordinado a este contrato. A [hierarquia](docs/AGENT_INSTRUCTION_HIERARCHY.md) define o alcance das demais fontes.

## Autoridade e contexto

- Instruções explícitas do usuário e regras da plataforma prevalecem. Não invente regra de negócio, SLA, número ou decisão de produto: procure em `docs/prd/`, `docs/specs/`, `docs/business-rules/` e `docs/doctrine/`; marque fatos como CONFIRMADO ou INFERIDO e pergunte por decisões ausentes.
- Este repositório é **CRM Geral**. `origin` identifica o fork; verifique `git remote -v` antes de usar qualquer referência remota. DeskcommCRM é referência funcional e histórica upstream, sem autoridade automática sobre o fork.
- Desenvolvimento atual: PostgreSQL local; veja [LOCAL_POSTGRES_SETUP.md](docs/LOCAL_POSTGRES_SETUP.md). Supabase Cloud não é requisito para desenvolver. Supabase continua como arquitetura prevista de distribuição/produção, com Auth, RLS, Storage e Realtime preservados. O ambiente local não prova equivalência completa com essa distribuição.
- Stack e comandos exatos vêm de `package.json`: Next.js 16, React 19, TypeScript 6, Tailwind 4, Zod 4, Vitest 4, Playwright 1 e Sentry 10. Node ≥22; **pnpm** na versão de `packageManager`. Tailwind é CSS-first; referências antigas a tailwind.config são históricas.
- Planos, `.specs/project/STATE.md`, `tasks/todo.md`, checkpoints, auditorias e handoffs são snapshots, não ordens permanentes nem backlog vigente. Estado atual exige revalidação no checkout. Novos handoffs ficam em [docs/handoffs/](docs/handoffs/README.md).

## Proteção do trabalho e dos dados

- Inspecione branch, status, remotes e worktrees antes de alterar. Preserve alterações e arquivos de outras sessões. Não faça merge, reset, limpeza, troca de base ou atualização de outras branches automaticamente.
- A base vem da tarefa e do checkout autorizado. `origin/main` significa a main do fork, nunca implicitamente a do Deskcomm. Contribuição upstream exige destino explicitamente verificado.
- Antes de ação destrutiva que perde dados ou trabalho, identifique alvo e consequência e obtenha autorização explícita. Não reescreva histórico compartilhado ou migrations aplicadas.
- Não abra `.env*` para inspeção genérica; `.env.example` é o template. Prefira checar presença de configuração e saídas mascaradas. Quando uma operação autorizada precisar de credencial, consuma-a pelo mecanismo de conexão sem exibir valores em chat, logs, argumentos ou histórico. Nunca commite dados reais, tokens ou dumps.
- Não importe regras comerciais ou decisões de produto upstream sem decisão explícita do fork.

## Invariantes de implementação

- Toda tabela tenant-aware tem `organization_id` e RLS. Queries filtram organização explicitamente; service role bypassa RLS, portanto seu filtro manual é obrigatório, com organização derivada de cookie/JWT/secret/token confiável, **nunca do body**.
- Backend valida com `getUser()`, nunca `getSession()`. Use os clients canônicos em `lib/supabase/` e guards `requireRole()` / `requirePlatformAdmin` ou guard próprio nas superfícies sem cookie. Adicionar path em `lib/auth/public-paths.ts` remove a checagem de borda e exige guard próprio na rota.
- Valide inputs externos com Zod; respostas usam `ok()` / `fail()` de `lib/api/wrappers.ts` e códigos de `lib/api/errors.ts`. JSON snake_case, dinheiro em `_cents` + currency, datas UTC ISO-8601.
- Preserve idempotência e deduplicação de eventos; mutações relevantes auditam. Trigger Postgres emite evento, nunca faz HTTP. Logs usam `lib/logger.ts`; sem `console.log` em código entregue.
- Tokens só em headers, plaintext mostrado uma vez e hash SHA256 persistido. HMAC com `crypto.timingSafeEqual`, fail-closed sem secret. Não logue segredo ou dado pessoal; sanitização do Sentry não substitui essa regra.
- Mudança de schema sai em **tripla**: migration nova versionada + apêndice idempotente em `supabase/baseline.sql` + linha em `supabase/migrations/MANIFEST.md`. Corrija dados antes de constraints. Use a definição canônica vigente do objeto, não a primeira ocorrência textual do dump.
- Função nova em public revoga EXECUTE de **public e anon**, concedendo só a quem precisa. Gere `lib/database.types.ts` pelo processo de schema; não edite arquivos gerados ou lockfile à mão.
- Preserve white-label até decisão explícita: marca do banco; env é semente/rollback. Sem Deskcomm/DeskcommCRM em saídas ao usuário. Fora do DOM use `marcaDaSaida()`; resolvedor nunca lança. PDF LGPD identifica controlador e DPO, sem marca.
- Features não nomeiam provider fora da camada de canais. Preserve contratos de navegação, eventos com consumidores e mecanismos de resolução/visibilidade descritos em `sistema-vivo`.

## Verificação e conclusão

- Use `pnpm typecheck`, `pnpm lint` e testes relevantes. O conteúdo de `pnpm gov:verify` é o script em `package.json`; não substitui `test:db` ou `test:e2e`.
- Schema/RLS: `pnpm test:db`, com install e update do baseline e isolamento entre tenants. O piso de compatibilidade vem do harness/configuração versionados; não se confunde com a versão do PostgreSQL local.
- UI/fluxo: teste pela tela e registre evidência visual; resposta HTTP não prova UX. Jornada de instalação exige validação da distribuição com os recursos realmente utilizados, além do runtime local.
- Docker/compose/kit: consulte [packaging](docs/doctrine/packaging.md) e rode `pnpm test:shell`. Produção usa imagens publicadas pelo CI, versão fixa para cliente, upstream fixo sem republicação e update sem edição manual. Para VPS com proxy próprio, siga os dois arquivos compose do [runbook](docs/runbooks/deploy.md).
- Consulte a Definition of Done detalhada de CLAUDE para os critérios aplicáveis. Relate resultados e limitações concretas; não declare pronto por uma lista parcial de checks ou por contagens históricas.

## Guias por escopo

Fonte editável: `.agents/skills/`; `.claude/skills/` é espelho gerado com `pnpm skills:sync`, não uma segunda autoridade.

| Pedido | Guia |
|---|---|
| código/convenção neste fork | `deskcomm-doutrina` e `sistema-vivo` |
| instalação/operação VPS da distribuição original | `deskcomm-instalar` |
| cliente/nicho, agentes e roteadores | `deskcomm-cliente-novo` |
| métricas, conversão, custo e funil | `deskcomm-metricas` |
| qualidade do prompt do agente | `deskcomm-prompt` |
| contribuição **intencional ao upstream Deskcomm** | `deskcomm-contribuir` |

Desenvolvimento interno do fork não arma hooks nem inicia rituais upstream. Skills são especializadas e subordinadas a este contrato. Graphify e memórias externas só auxiliam quando disponíveis; ausência não bloqueia trabalho, e leitura direta de fontes substitui o grafo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
