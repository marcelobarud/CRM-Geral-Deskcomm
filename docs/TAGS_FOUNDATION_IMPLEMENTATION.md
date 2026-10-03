# CRM Geral — Bloco C: tags estruturais

Estado de implementação em 2026-10-03. Este relatório é um checkpoint verificável;
a homologação com JWT reais e evidências visuais ainda depende da suíte Tags.
A prova SQL final confirmou também a proteção de configurações com nomes na
grafia normalizada legada, sem modificar a RLS de organizações.

## Integração anterior

CONFIRMADO: os oito commits aprovados do Bloco B foram publicados em
`origin/bloco-b-jornada-comercial-base`; a integração em `main` foi fast-forward,
sem squash/rebase. `origin` foi conferido como fork
`https://github.com/marcelobarud/CRM-Geral-Deskcomm.git`.
`main` e `origin/main`: `410a757d29d4c7afdcdd8d071d57d0cb12e47d73`.
O desenvolvimento C está na branch local `bloco-c-tags-estruturais`, sem push.

## Modelo e operações

CONFIRMADO: `crm_tags` possui UUID, organização, nome, nome normalizado gerado no
banco, cor opcional, timestamps, arquivamento e destino de mesclagem. A unicidade
é `(organization_id, normalized_name)`, nunca o nome como PK. `crm_tag_aliases`
conserva grafias anteriores; `crm_tag_assignments` separa a identidade do uso em
`contact`, `lead` ou `conversation`, sem novos escopos etiquetáveis.

FKs compostas asseguram que catálogo, aliases e vínculos pertencem à mesma
organização. Um trigger valida também a organização do registro polimórfico,
inclusive para service role. DELETE do registro remove seus vínculos. PK composta
impede vínculo repetido. As operações serializam por organização com advisory
lock transacional; o merge inteiro ocorre em uma chamada PostgreSQL.

Normalização: NFC, trim, espaços internos consecutivos reduzidos a um e lowercase.
Acentos e pontuação permanecem significativos: `Pré venda` difere de `Pre venda`.
Nomes novos têm 1–40 caracteres, preservando o contrato existente. A migração não
trunca nomes legados válidos mais longos; branco/null exige revisão, sem descarte
silencioso. Duplicidades triviais convergem na migração; criação/rename
conflitantes retornam conflito. A decisão semântica de merge pertence ao admin.

Cor: `null` ou `#RRGGBB`, apoio decorativo com texto sempre presente. Rename muda
o nome, preserva ID/vínculos e cria alias. Merge transfere os três escopos ao
destino, deduplica, reaponta aliases e desativa a origem, mantendo sua referência
histórica. Remoção contextual apaga apenas o vínculo solicitado. Exclusão global
arquiva somente tags sem vínculos nem referências de configuração, após
confirmação explícita; o banco confere novamente sob lock.

Impacto considera settings da organização/funis, conditions/actions das
automações, rascunhos/trigger_config de follow-up e grafos publicados. A busca
textual em JSON é conservadora: pode bloquear uma referência que precise de
revisão, mas não remove silenciosamente uma configuração. Grafos publicados e
logs históricos não são reescritos.

## Migração e compatibilidade delimitada

Tripla versionada, aplicada no Geral 1:

| Migration | Responsabilidade                                                        |
| --------- | ----------------------------------------------------------------------- |
| 0244      | Catálogo, aliases, vínculos, RLS, backfill e RPCs de operação           |
| 0245      | Guards de suporte/MFA nas operações                                     |
| 0246      | Guarda também na remoção da última tag pela ponte legada                |
| 0247      | Guard booleano estreito de escrita, sem liberar helpers privados de MFA |
| 0248      | Auditoria dos vínculos reais e identificação de replay idempotente      |
| 0249      | Índices das FKs novas apontadas pelo Advisor                            |
| 0250      | Projeção e proteção de referências também na grafia normalizada legada  |

Os sete arquivos têm apêndices idempotentes literais em `supabase/baseline.sql`,
antes da varredura final de revogação de anon, e linhas em `MANIFEST.md`. Migrations
já aplicadas não foram reescritas. O gerenciamento Supabase atribui timestamps
próprios no histórico remoto; a correspondência é pelos nomes e definições,
sem editar a tabela de histórico para imitar os timestamps dos arquivos.

CONFIRMADO no inventário anterior à aplicação: nenhum contato, oportunidade ou
conversa do Geral 1 tinha array comercial não vazio. Portanto não houve colisões
reais nem conversão de tags comerciais de usuários nessa instalação. O backfill
também lê sugestões canônicas em settings da organização e funis.

Prova fictícia versionada: `scripts/supabase/tags-migration-probe.sql`, preparada
por `node scripts/supabase/prepare-tags-migration-probe.mjs`. O SQL gerado fica em
`.local-dev/bloco-c/migration-probe.sql`: BEGIN, dados A/B com grafias/duplicatas,
registros nos três escopos, registro sem tags, duas reaplicações e asserts, ROLLBACK.
Foi executado no Geral 1. A prova usa role/claims SQL controlados dentro da
transação; **não substitui o teste de JWT reais**.

Catálogo e atribuições são canônicos. Os `text[]` existentes ficam como projeção
derivada (nome atual + aliases + grafias normalizadas) para contratos exatos de automação, follow-up,
filtros/imports e contexto de IA. A ponte aceita escrita textual legada e a
converte em vínculos, respeitando permissão e referências. Desconhecidos podem
nascer apenas pela compatibilidade privilegiada ou admin; telas e MCP de uso
contextual selecionam exclusivamente tags existentes. Isso preserva writers de
integração/automação anteriores, sem autorizar atendentes a gerenciar catálogo.

MCP e ação em lote resolvem nomes/aliases para uma identidade antes de remover:
remover apenas uma grafia não deixa outra grafia reativar o mesmo vínculo.
Leitores visuais deduplicam pelo ID; aliases não viram chips/tags extras. A lista
operacional usa catálogo + atribuições e mantém o contrato textual de saída.
O motor de automações não foi expandido. Eventos `contact.tag_added` e
`lead.tag_added` preservam seus contratos/origem; replay do RPC não gera evento
novo pelo endpoint. Writers antigos conservam seu `caused_by_rule`.

Critério técnico para retirar a ponte: migrar todos os writers/imports/MCP e
condições/grafos publicados identificados na auditoria para identidade, provar
compatibilidade e só então retirar as colunas/projeções em fase explícita. Nenhuma
segunda edição independente de catálogo foi criada; não se declara essa retirada
concluída nem se inventa um prazo comercial.

## API, permissões e superfície

`GET /api/v1/tags` lista catálogo/aliases e, com `entity_kind` + `entity_id`, IDs
atribuídos. `impact_tag_id` exige admin. `POST /api/v1/tags` valida um comando
estrito de create/rename/color/merge/delete/assign com Zod. Organização deriva
exclusivamente da sessão validada por `requireRole`; body com organização é
rejeitado. Há guarda canônica de suporte, wrappers/códigos canônicos e mensagens
sanitizadas. Nenhum frontend gerencia tabelas diretamente.

Viewer lê catálogo/vínculos visíveis. Agent/manager/admin atribuem e removem
vínculos dentro de sua visibilidade. Somente admin gerencia catálogo. Funções de
apoio privadas não são executáveis por authenticated/service/anon. Manage e
impact usam SECURITY DEFINER com autorização explícita; assign e leitura de
visibilidade são INVOKER. MFA/suporte são novamente verificados no banco. Todas
as tabelas novas têm RLS; catálogo/aliases não concedem escrita direta a usuários
ou service role. Service role conserva o uso contextual técnico, com organização
explícita e trigger estrutural.

`/app/settings/tenant/tags` está no catálogo de navegação em Organização/Sua
empresa, com busca/criação, rename/cor/merge/delete e diálogo de impacto. O mesmo
seletor com busca, opções, chips e remoção aparece no contato, dossiê da
oportunidade e ficha da conversa. Formulários de criação selecionam nomes do
catálogo; formulários de edição não substituem tags livres ao salvar outros dados.
Filtros existentes de contatos, Kanban e Inbox usam o catálogo atual. Há estados
loading/erro/retry/vazio/sem tags/sem resultados, controles por papel, labels,
teclado/foco e textos em português/espanhol. A cor não determina leitura do texto.

## Verificação confirmada e pendências

- Prova SQL real: backfill e reaplicação idempotente, isolamento A/B por role,
  rename mantendo ID, merge deduplicado nos três escopos, remoção contextual,
  delete usado bloqueado, delete sem uso e auditoria. Tudo em rollback.
- RLS e policies instaladas nas três tabelas; catálogo/aliases SELECT e vínculo
  SELECT/INSERT/DELETE conforme o guard. Types gerados do schema real do Geral 1;
  diff restrito aos objetos introduzidos neste bloco.
- Typecheck e build passaram; lint final: 0 erros e 350 warnings já existentes.
- Suíte oficial `corepack pnpm test:unit`: 8.467 passaram, 30 falharam e um
  expected fail (803 arquivos). As 30 falhas pertencem às famílias preexistentes:
  release/bash (7), import de leads/mocks (11), PDFs LGPD (4), namespace/bash (4),
  textos crus/i18n (1), probe performed_at (1), probe de rascunho (1) e prosa
  histórica de triagem (1). Nenhuma dessas famílias foi alterada neste bloco.
  A execução global ocorreu antes da última prova SQL 0250; os checks de schema
  e consumidores foram repetidos após essa mudança.
- Conjunto focado completo: 117 testes em nove arquivos passaram, incluindo
  consumidores, tokens, suporte, baseline, fragmento e Inbox. Após 0250, schema
  e consumidores: 69 passaram em cinco arquivos. Contagens se sobrepõem e não
  devem ser somadas.
- `pnpm test:db` indisponível no PATH Windows de bash; execução pelo Git Bash
  confirmou ausência de Docker. O harness pg15 install/update é complementar e
  não foi declarado aprovado. A prova Supabase real foi executada separadamente.

Advisor desta fase: três avisos de SECURITY DEFINER executável intencionalmente
por authenticated (manage/impact/guard estreito), com autorização/escopo explícitos
e anon revogado. [Aviso e orientação](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
As três FKs inicialmente sem índice foram corrigidas em 0249. Restam informações
de índices recém-criados sem uso; não foram retirados os índices de integridade
para esconder o aviso. [Índice ainda sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
Avisos históricos fora do Bloco C não foram alterados.

Homologação pendente: executar o iniciador com `-Prompt -Suite Tags`, chaves só em
memória/campos ocultos. A suíte usa Auth real A/B, viewer/agent/admin/anon, RLS,
cross-tenant inclusive service role, jornada visual nas três telas/filtros,
rename/merge/delete, teclado/foco e screenshots 1440×900/390×844. Relatório em
`.local-dev/bloco-c/result.json`. `fixtures_cleaned=true` só após confirmação do
próprio finalizador. O rollback SQL já foi comprovado; **não há ainda resultado
aprovado dessa execução real de Auth/UI no Bloco C**.

## Gaps e próximo passo

- P0: nenhum identificado nos checks executados; não é declaração de homologação
  completa.
- P1: falta confirmar a suíte real Tags/limpeza e inspecionar suas evidências
  visuais. Bloco C permanece pendente até essa prova.
- P2: branding público histórico e funil Pedidos/Pago permanecem fora do escopo;
  dívidas anteriores da suíte global serão discriminadas no fechamento.
- P3: ambiente sem Docker para compatibilidade install/update pg15; avisos
  informativos do Advisor e manutenção futura da transição textual conforme o
  critério descrito, sem novo motor ou relatório avançado.

Não iniciar Bloco D. Prontidão depende de encerrar a homologação de tags. Nenhuma
branch ou funcionalidade dos Blocos D/E/campanhas foi criada. O arquivo
`docs/DESKCOMM_UPSTREAM_AUDIT.md` permanece não rastreado, fora dos commits e sem
alteração; SHA-256 preservado
`1689EF1DBD1FCA2A2B8E3C88522897471BC2CDE7A0ACFB5F6CF9474D2EA9F7D4`.
