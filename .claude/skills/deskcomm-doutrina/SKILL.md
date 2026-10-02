---
name: deskcomm-doutrina
description: Doutrina de código do DeskcommCRM — multi-tenancy com RLS, tripla de migration, restrição de canal, eixo self-host. USE SEMPRE ao escrever ou revisar código neste repositório, e antes de responder pergunta sobre convenção, schema, tenancy, WhatsApp/WAHA, instalador ou Definition of Done. É o ponteiro para a doutrina viva do repo; subordinado ao AGENTS.md e ao detalhamento pertinente de CLAUDE.md.
---

# DeskcommCRM — doutrina de código

O contrato global é `AGENTS.md` do checkout autorizado do CRM Geral. `CLAUDE.md` detalha convenções compatíveis; consulte as seções pertinentes. Não leia origin/main como se fosse automaticamente Deskcomm upstream. `VISION.md` registra posicionamento herdado; decisões comerciais do fork não são inferidas dele.

## 1. Leia antes de escrever

Leia AGENTS, o detalhamento pertinente de CLAUDE e specs/doutrinas locais da peça. Desenvolvimento PostgreSQL local segue `docs/LOCAL_POSTGRES_SETUP.md`; não exige Supabase Cloud. RLS, Auth, Storage e Realtime da distribuição permanecem contratos. Para contribuição intencional upstream, use o guia específico com destino verificado.

## 2. As três que mais custam

**Multi-tenancy.** Toda tabela tenant-aware leva `organization_id uuid not null` e RLS com policy
`tenant_isolation_<tabela>_all` via `fn_user_org_ids()`. Service role bypassa RLS — handler que o usa
filtra `organization_id` **manualmente**, resolvido de fonte confiável (cookie, JWT, segredo de
webhook, token de path), **nunca do body**. No backend é sempre `getUser()`, nunca `getSession()`.

**Schema sai em tripla.** Arquivo em `supabase/migrations/`, apêndice **idempotente** no
`supabase/baseline.sql`, e linha no `MANIFEST.md`. O kit self-host aplica **só o baseline** — o que
não chega lá não chega em quem instalou numa VPS, que é o cliente que paga. Constraint nova exige
corrigir os dados **antes**, senão o `update.sh` do clone quebra.

**Nenhuma feature nomeia um provider.** Provider vive em `lib/channels/`. `pnpm lint:channels` é
catraca com lista de dívida: arquivo novo sujo reprova — e arquivo que ficou limpo e não saiu da
lista **também** reprova.

## 3. O eixo que não é técnico

Na distribuição original, o eixo é **self-host em VPS**. Preserve compatibilidade de instalação até decisão explícita; isso não define o modelo comercial do fork. Uma mudança
pode ser tecnicamente impecável e ainda assim ser recusada — env var nova sem default quebra
instalação fresca, dependência de serviço pago obrigatório quebra o modelo, e a pior de todas é a
**falha-em-verde**: a sonda que declara sucesso medindo caminho diferente do que o usuário usa. Num
produto que a pessoa instala sozinha, ela não descobre que está quebrado.

## 4. Antes de dizer "pronto"

Verde de teste não é prova de comportamento. Para correção comportamental, confira que o teste relevante detecta a regressão; quando necessário, use sabotagem controlada e reversível para demonstrá-lo. A suíte deve ficar **vermelha** diante da regressão — teste que não reprova não guarda nada. E declare o que **não** mediu: é o campo
que separa medição de relato.

## Não-objetivos

Não lista comandos de fluxo — não existem `/fix-bug` nem `/add-module` neste repo. Não descreve
estrutura de pastas nem convenção de nome de arquivo: a versão anterior deste arquivo era gerada
automaticamente e ensinava `snake_case` com imports relativos, quando o repo usa kebab-case com
alias `@/`. Detalhes devem ser revalidados nas fontes do checkout; esta skill não promete estado atual.
