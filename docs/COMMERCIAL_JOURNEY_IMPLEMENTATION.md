# Bloco B — Jornada Comercial Base

Data: 2026-10-03. Ambiente principal: Supabase Geral 1
(`zwjrhqqwizjpzmeayrju`), organização Supabase CRM Geral.
Branch local: `bloco-b-jornada-comercial-base`.

## Integração D2 e estado inicial

CONFIRMADO: a branch `d2-supabase-geral-1` foi publicada no fork
`https://github.com/marcelobarud/CRM-Geral-Deskcomm.git`; a main recebeu a D2 por
fast-forward e foi publicada. Main e main remota:
`f13933d914a41f4b1333e60748bc38141c8bbda1`.
O Bloco B parte desse estado, sem alterar outras worktrees.

A [auditoria](COMMERCIAL_JOURNEY_AUDIT.md) foi versionada antes do código no
commit `a88331239`. Identificou estruturas suficientes para CRM manual, mas
faltavam portas entre contato, oportunidade, tarefa e agenda, atribuição humana
no formulário de tarefas e proteção de referências comerciais entre tenants.

## Decisões e entidades reutilizadas

| Conceito | Implementação final |
| --- | --- |
| Contato | `contacts`: identidade reutilizável; criação, edição, pesquisa, telefone E.164, email e origem preservados |
| Oportunidade | `crm_leads`: título, contato, funil, etapa, dono humano/agente, status, cents, moeda, origem e fechamento |
| Funil | `crm_pipelines` e `crm_stages`: ordenação, movimento com versão atual, ganho/perda e histórico existentes |
| Prospect manual | Contato com tarefa humana antes da oportunidade; conversão cria lead ligado à mesma identidade |
| Próximo passo | `crm_tasks`: título, responsável, prazo, status, contato e/ou lead; criação e conclusão existentes |
| Agenda | `calendar_appointments`: contato, responsável, horário, fuso, local e status existentes |
| Histórico | `crm_lead_activities`, auditoria e `event_log`; consumidores e agrupamento da timeline preservados |
| Atendimento | Inbox, CRMSidePanel e ConversaNoDossie existentes; passagem ao contato e oportunidade preservada |

Não foram criadas entidades opportunities, prospects, Empresa, calendário ou
motor de timeline paralelos. CRM manual não depende de IA ou canal. Conversa
real continua dependendo de seu canal; a homologação não enviou mensagens.

Os responsáveis permanecem distintos: dono da oportunidade, `assigned_to` da
tarefa, responsável da conversa e dono do agendamento. Não há sincronização
automática nem obrigação universal de atribuição inventada nesta fase.

## Aplicação, APIs e navegação

`GET /api/v1/contacts/[id]/commercial-context` valida UUID, exige viewer e
organização confiável e projeta leads, tarefas e compromissos existentes.
Todas as consultas filtram organização; falhas retornam erro sanitizado, sem
simular contexto vazio. Resposta privada sem cache. As duas consultas de tarefas
são deduplicadas e usam operadores suportados pelo adapter local.

`CommercialContextPanel` aparece no contato e no dossiê da oportunidade: criar
oportunidade, criar/concluir tarefa, selecionar vínculo comercial, abrir contato,
abrir oportunidade e agendar compromisso. `OpportunityTasks` oferece tarefa
humana em oportunidades sem contato. Contato anonimizado e viewer não recebem
ações de escrita. A agenda é explicitamente apresentada como agenda do contato,
sem alegar vínculo exclusivo a um lead inexistente no schema.

O formulário existente de oportunidade permite selecionar contato quando não
vem de contexto, dono humano, origem e moeda já servida pelo produto
(BRL/MXN/USD). Preserva cents; card e dossiê mostram centavos e os totais de
coluna separam moedas. Ganho comercial não representa pagamento recebido.
`source_metadata`/UTM existentes permanecem disponíveis no contrato de API;
não foi criado tracking externo ou formulário de JSON bruto.

O formulário existente de tarefa expõe responsável sem fundir domínios. Modais
permitem rolagem no celular; etiquetas e erros de título/origem são explícitos.
Contexto distingue carregamento, vazio, erro com recuperação e somente leitura.
Conclusão com falha preserva a tarefa e permite tentar novamente.

O registro de criação passou a dizer “Oportunidade criada”, sem atribuir criação
manual a WhatsApp. Motivos de perda são legíveis no contexto. O card ignora
cliques de diálogos em portal para não abrir o dossiê sobre edição/perda.

## Schema, RLS e tipos

Tripla versionada: migration
`20261003140000_0243_crm_geral_relacoes_comerciais.sql`, apêndice idempotente no
baseline antes da varredura final de anon e linha no MANIFEST.

`fn_validate_commercial_links()` e os triggers de leads/tarefas recusam funil,
etapa, contato, lead e responsáveis incompatíveis com a organização. Tarefa com
lead e contato exige a mesma identidade. A função usa search_path fixo,
referências qualificadas e não permite execução direta por public, anon,
authenticated ou service_role. Não amplia grants/policies nem substitui RLS.
Erros de referência no handler de leads passam a 422 sanitizado.

O inventário anterior não encontrou leads/tarefas com referências inválidas;
não houve backfill de dados. A migration foi aplicada ao Geral 1 e reaplicada
como prova idempotente (`0243_commercial_links_update_probe` no histórico remoto).
Essa segunda entrada não representa alteração adicional de schema.

`lib/database.types.ts` foi regenerado pelo conector contra o schema real após
a migration. O resultado coincide com o arquivo vigente: não houve diff de
tipos, pois a mudança é de função de trigger, não de estrutura de linha/API RPC.
Nenhum arquivo gerado ou lockfile foi editado à mão.

## Homologação real e evidências

CONFIRMADO: execução `3bfec33a-e022-475e-8a6a-a1c6cd32e021`, finalizada em
2026-10-03 às **12:52:34 America/Sao_Paulo**. Relatório local sanitizado
`.local-dev/bloco-b/result.json`: `passed=true`, `fixtures_cleaned=true`.

JWTs reais de A/B, viewer e agent, anon e service role comprovaram acesso próprio,
isolamento, negação de escrita viewer/anon e referências cross-tenant recusadas.
Auth/login/getUser/refresh, Storage/upload/leitura/signed URL/remoção, Realtime
com evento autorizado e ausência cross-tenant e MFA AAL1/AAL2 passaram.

A jornada pela tela criou e editou contato fictício, pesquisou sua identidade,
validou telefone, criou tarefa de prospect, criou oportunidade com responsável,
valor e origem, vinculou e concluiu próximo passo, agendou compromisso com fuso,
consultou dossiê/timeline, moveu etapa e confirmou ganho e perda com motivo.
O viewer leu contexto e recebeu negação de escrita pela API.

Capturas locais da mesma execução, em `.local-dev/bloco-b/`: `commercial-*`
registram contato/validação, formulários, prospect/tarefa, contexto, agenda,
dossiê, ganho, motivo/perda e viewer em 1440×900 e 390×844. A captura de timeline
mostra tarefa criada/concluída e agendamento. O teste abre os grupos recolhidos,
verifica foco/teclado e ausência de overflow horizontal da página.

As capturas foram inspecionadas. Um aviso de funil exclusivo de criação estava
aparecendo para viewer; a condição foi corrigida após a execução, com teste de
regressão para viewer/anonimizado e preservação do aviso para quem pode escrever.
Essa alteração final de apresentação teve teste focado/typecheck/lint/build;
não representa outra execução da suíte cloud.

Fixtures eram exclusivas da execução e tiveram sessões revogadas, objetos,
organizações e usuários removidos. Consulta posterior confirmou zero
organizações/usuários/arquivos dessa execução e da tentativa interrompida
`3413538d-2bee-48d9-a1db-211481c7bb2e`. A recuperação restrita está no
[handoff](handoffs/bloco-b-recuperacao-perda.md). Chaves/senhas não foram
persistidas, logadas ou fornecidas ao agente; apenas resultados e IDs fictícios.

## Verificações e limites da prova

- Typecheck: passou na conclusão.
- Lint: passou, zero erros e 350 warnings de base.
- Build: passou; recursos opcionais sem configuração continuam com avisos existentes.
- Focados finais: 35 testes em oito arquivos passaram; o teste específico de
  cobertura espanhola passou. Outras rodadas relevantes incluíram 55 testes
  aprovados de guards, tarefas, dinheiro e posição da varredura de anon.
- O teste de portal passou com a correção e reprovou ao retirar a proteção em
  sabotagem controlada; o código corrigido foi restaurado.
- Suíte global executada: 8.417 passaram, 34 falharam, uma falha esperada.
  Essa rodada aconteceu durante ajustes e não é uma aprovação global final.
  Duas falhas introduzidas de rótulo/tradução foram corrigidas e seus testes
  repassaram. As demais famílias coincidem com a medição anterior, mais um
  timeout de importação de ícones reproduzido em nova rodada dirigida.
- Permanecem falhas de base em guards de release/bash, importação de leads,
  PDF/LGPD, prosa i18n sem t(), sondas de leitura, marcador de conflito por tempo
  e triagem histórica. Não foram corrigidas como extensão desta tarefa.
- `test:db`: bloqueado pelo ambiente. O bash do Git executou o harness versionado
  pgvector/pg15, mas Docker não está instalado; nenhum container foi criado.
  Aplicação/reaplicação e JWT real no Geral 1 não substituem esse install/update
  complementar em PostgreSQL 15.
- A oportunidade sem contato tem testes de componente; não recebeu jornada
  cloud separada. Remarcação, importação CSV, WhatsApp/WAHA e toda a suíte E2E
  não foram homologados novamente; a jornada cloud cobriu o escopo manual descrito.

## Sistema Vivo e limites de produto

Entrada: contato/dossiê/Inbox e contexto autenticado. Saída: oportunidade,
tarefa/agenda e registro existente. Superfície: contato, dossiê, Tarefas e Agenda.
Responsável: campos canônicos de cada domínio. Próximo passo: tarefa humana,
inclusive antes da conversão. Recuperação: erro/retry, permissão e versão do
movimento. Registro: atividades existentes; consumidor: TimelineView e contexto
comercial. O mapa `docs/architecture/crm-vivo.architecture.json` recebeu somente
os nós/arestas concretos afetados; não foi gerado HTML novo.

Não foram criadas flags decorativas, workers, SLAs, automações de nicho,
integrações externas, financeiro ou funcionalidades dos Blocos C em diante.
Adapters locais permanecem; a projeção usa operadores compatíveis, sem afirmar
paridade completa com Auth/Storage/Realtime cloud.

## Gaps e próximo passo

| Prioridade | Situação |
| --- | --- |
| P0 | Nenhum encontrado na jornada homologada |
| P1 | Integridade comercial cross-tenant e sobreposição da perda corrigidas e comprovadas |
| P2 | Login ainda usa marca herdada do ambiente apesar da linha CRM Geral em platform_branding; configuração isolada no commit `4d61f0bf3`, limite visual confirmado no handoff de branding |
| P2 | Funil padrão histórico continua chamado Pedidos com etapas de nicho, incluindo Pago; não foi importada regra automática nem interpretado won como recebimento. Revisar configuração de apresentação para a distribuição genérica |
| P3 | Advisors Supabase anteriores, warnings/falhas de base e harness Docker complementar pendente; projeção limitada a 100 registros por conjunto, sem novo paginador |

Os advisors não autorizaram grants amplos: RLS sem policy em superfícies
privilegiadas, search_path de funções antigas, extensões públicas e EXECUTE em
funções antigas precisam triagem específica. Referências:
[RLS](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[extensões](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public),
[EXECUTE](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

O critério manual de saída do Bloco B foi demonstrado no Geral 1. É possível
planejar o Bloco C com os P2/P3 documentados, sem afirmar produção comercial ou
suíte global integralmente aprovada. Nenhuma branch ou execução do Bloco C foi
iniciada. Bloco B permanece em commits locais, sem push/merge; somente a D2 foi
publicada e integrada. `docs/DESKCOMM_UPSTREAM_AUDIT.md` permanece fora dos commits.
