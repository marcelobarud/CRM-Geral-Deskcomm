# Fase 2.0.1 — consolidação controlada das instruções

Consolidação documental do CRM Geral em 2026-10-02. Base: branch fase-2-postgres-local-runtime, revisão 4b8a7e8fa6135c6075f1996d905fffc82014439d. Trabalho em fase-2-0-1-agent-rules-consolidation. Sem alteração funcional do aplicativo, banco, schema, dependências ou runtime local. Sem push.

## Antes

A [auditoria anterior](AGENT_RULES_AUDIT.md) classificou como ALTO o risco de interpretar contexto histórico como regra vigente. Principais causas: CLAUDE como autoridade concorrente, origin/main confundido com Deskcomm, Supabase Cloud generalizado ao desenvolvimento, receitas/contagens antigas no contrato global, exposição de connection string e handoffs com ordens “permanentes”. O diagnóstico foi preservado, com apenas uma nota de status; seu inventário e suas conclusões não foram reescritos.

## Alterações e autoridade final

AGENTS é o contrato global conciso do CRM Geral. CLAUDE conserva o detalhamento compatível, segurança, white-label e Definition of Done, com leitura pertinente ao trabalho. A [hierarquia](AGENT_INSTRUCTION_HIERARCHY.md) distingue instruções do usuário/plataforma, contrato global, detalhamento, fontes especializadas e snapshots históricos. Índice, guias de ferramentas e protocolos herdados apontam essa precedência.

Os 12 handoffs da raiz foram movidos por git mv para docs/handoffs. Seus corpos são iguais aos anteriores, com somente o cabeçalho histórico padronizado. Handoffs já arquivados receberam o mesmo contexto. O [índice de handoffs](handoffs/README.md) documenta a convenção nova e o alcance histórico dos caminhos originais. Nada foi descartado por ser antigo.

Fonte de skills: .agents/skills. Espelho gerado: .claude/skills. Sincronização oficial executada; metadados agents/openai.yaml ficam apenas na fonte por desenho do sincronizador. Cursor e regras de agentes compartilham o mesmo texto por escopo. O lembrete SessionStart agora aponta AGENTS e restringe contribuição ao destino upstream intencional, sem pedir armamento automático. Comentários de escopo dos scripts preservam sua lógica. Nenhum hook foi armado no checkout.

O único teste editado é o gate documental evidencia-citada: dois caminhos de handoffs na lista histórica acompanharam a movimentação. Nenhum teste funcional foi alterado. O gate manteve a mesma política e as mesmas exceções.

## Conflitos conhecidos: antes e depois

| Achado da auditoria | Resolução |
|---|---|
| F01 npm versus pnpm | pnpm canônico; versão em packageManager. |
| F02 main obrigatória / autoridade remota | Base autorizada pela tarefa; origin é fork, upstream verificado e específico; sem merge/propagação automática. |
| F03 .env versus grep de credencial | Presença/saída mascarada; consumo seguro quando necessário; removida receita que expunha a URL. |
| F04 pg15 versus pg17 | Handoff antigo contextualizado; piso do harness, ambiente original e PostgreSQL local são distintos. |
| F05 prova UI versus dispensa externa | Aceite preservado; eventual mudança de responsável pela prova upstream não dispensa o critério local. |
| F06 estado vivo versus snapshot | Documentos de estado indicados como snapshots, exigindo revalidação. |
| F07 ordens permanentes de épicos | Cabeçalho limita ao contexto original e à autorização atual. |

Os sete conflitos principais estão resolvidos como ambiguidades de instrução nas fontes tratadas. Isso não afirma inexistência de toda divergência no acervo, nem reaudita o produto.

## CRM Geral e Deskcomm

Origin verificado: https://github.com/marcelobarud/CRM-Geral-Deskcomm.git. Deskcomm original é referência funcional/histórica; não foi criado remoto upstream nem importada sua main. Contribuição intencional ao original usa destino/revisão verificados e a skill específica; scripts legados assumem checkout dedicado cujo origin seja o original e não são fluxo de desenvolvimento interno.

PostgreSQL local segue LOCAL_POSTGRES_SETUP, preservado sem edição. Supabase Cloud não é requisito de desenvolvimento; Supabase/Auth/RLS/Storage/Realtime permanecem arquitetura prevista de distribuição/produção. O ambiente local não demonstra equivalência integral com a distribuição. Versão Node vem de engines, comandos/checks de package.json e workflows do fork. White-label permanece até decisão de produto.

UI_CONSTRUCTION_GUIDE permanece referência especializada quando invocada por tarefa de UI, não requisito global para backend. Arquivos de UI preexistentes ficaram intactos e fora dos commits.

## Upstream: decisões individuais

| Decisão | Resultado |
|---|---|
| Confirmação destrutiva | Adotada: alvo, consequência, autorização explícita antes de perder dados/trabalho. |
| Handoffs fora da raiz | Adotada com preservação de corpos e história Git. |
| pnpm consistente | Adotada, sem mudar dependências. |
| Definição vigente de migration/objeto | Adotada como instrução de leitura canônica; nenhuma migration alterada. |
| Prova em par (agente + ferramenta direta) | Não adotada como obrigação global: o diagnóstico não demonstra necessidade genérica do fork. Prova direta relevante continua obrigatória; avaliar protocolo específico em tarefa futura. |
| Operação comercial de agentes, preço, SLA, software livre/operação paga | Não importados: falta decisão do CRM Geral. Contratos herdados preservados não decidem novo modelo comercial. |
| Extensões | Adiadas para decisão de arquitetura; nenhuma arquitetura ou ferramenta nova criada. |
| Ferramentas/rituais novos de triagem | Não importados automaticamente; fluxo herdado fica especializado, dependências ausentes opcionais. |

## Métricas e limites

Contagem por splitlines, antes em 4b8a7e8 e depois no checkout consolidado:

| Medida | Antes | Depois |
|---|---:|---:|
| AGENTS.md | 288 linhas | 64 linhas |
| CLAUDE.md | 518 linhas | 326 linhas |
| Handoffs na raiz | 12 | 0 |
| Conflitos principais F01–F07 sem tratamento | 7 | 0 nas fontes tratadas |
| Pares de arquivos de skills divergentes | 0 de 35 | 0 de 35 |

AGENTS + CLAUDE passaram de 806 a 390 linhas; apenas AGENTS é o contrato global sempre carregável, CLAUDE é consultado por pertinência. Linhas não medem sozinhas carga semântica; corpos históricos e detalhes de negócio não foram incorporados ao contrato curto.

A auditoria anuncia 11 candidatos de obsolescência, mas sua tabela da seção 7 enumera 10 IDs (F08–F16 e F22). Não foi inventado um décimo primeiro candidato para fechar a contagem. Nove desses IDs foram removidos como pré-condição, contextualizados ou corrigidos nas fontes tratadas: Cloud/pooler, banco VPS, memórias ausentes, graphify, Tailwind legado, gov:verify, contagens e alcance físico do pre-push. F16 continua pendente: duas fontes ausentes do prompt especializado Decola. Isso não bloqueia instruções globais e não foi criado arquivo substituto fictício.

## Validação

- corepack pnpm typecheck: passou, exit 0.
- corepack pnpm lint: exit 0, zero erros e 349 avisos em arquivos fora da alteração; avisos não corrigidos nesta fase.
- Sincronizador oficial skills:sync executado e conferência --check: zero divergências nos 35 pares; agents/openai.yaml é intencionalmente só fonte.
- Cinco arquivos de testes documentais/skills/guia: 127 testes passaram. O aviso de configuração futura do Vite não impediu a execução.
- Scripts/hooks de contribuição em repositórios descartáveis: 34 casos passaram. Nenhuma alteração de hooks/configuração do checkout foi feita pelo teste.
- Varredura semântica de npm install, origin/main, Supabase obrigatório/sem Supabase, pg15/pg17, HANDOFF/permanente, graphify e tailwind.config.ts: usos remanescentes são exemplos/receitas especializados, snapshots ou explicação de distinções; contratos globais não impõem ambientes/ferramentas históricos.
- Diff revisado por escopo; git diff --check sem erros. Sem E2E completo, teste de banco ou build: não houve mudança de produto, schema ou UI.

## Pendências preservadas

Não atualizar em lote snapshots de current-state, STATE, plan, checkpoints ou todo. Cotas/preços/receitas de serviços externos precisam de revalidação quando usados. F16 e outras referências específicas de cliente exigem sua própria tarefa. Scripts legados de contribuição continuam assumindo origin original; adaptar sua lógica ao fork seria outra mudança, sem necessidade para esta consolidação. Novas extensões, operação de agentes, modelo comercial e auditoria de features ficam para decisão futura.

A política do loop ainda proíbe push fora do ritual; a descrição foi corrigida para informar que seu hook físico limita main/master, não todos os destinos. Não foram alterados mecanismos de push, scripts de instalação ou permissões.

## Inventário dos arquivos

### Modificados

- .agents/rules/deskcomm-guias.md
- .agents/skills/deskcomm-contribuir/SKILL.md
- .agents/skills/deskcomm-contribuir/agents/openai.yaml
- .agents/skills/deskcomm-contribuir/references/depois-do-pr.md
- .agents/skills/deskcomm-contribuir/references/erros-recorrentes.md
- .agents/skills/deskcomm-contribuir/references/pre-voo.md
- .agents/skills/deskcomm-contribuir/references/receita-e2e-local.md
- .agents/skills/deskcomm-contribuir/scripts/armar-hooks.sh
- .agents/skills/deskcomm-contribuir/scripts/hooks/avisar-identidade.sh
- .agents/skills/deskcomm-contribuir/scripts/hooks/check-migration-triple.sh
- .agents/skills/deskcomm-contribuir/scripts/hooks/pre-commit
- .agents/skills/deskcomm-contribuir/scripts/hooks/pre-push
- .agents/skills/deskcomm-contribuir/scripts/hooks/sessao.sh
- .agents/skills/deskcomm-contribuir/scripts/pre-voo.sh
- .agents/skills/deskcomm-contribuir/scripts/quem-sou.sh
- .agents/skills/deskcomm-doutrina/SKILL.md
- .agents/skills/deskcomm-instalar/SKILL.md
- .agents/skills/deskcomm-instalar/references/supabase.md
- .agents/skills/deskcomm-metricas/SKILL.md
- .agents/skills/deskcomm-metricas/references/acesso-e-lgpd.md
- .agents/skills/sistema-vivo/SKILL.md
- .claude/agents/gov-implementer.md
- .claude/agents/gov-verifier.md
- .claude/agents/triagem-cetico.md
- .claude/agents/triagem-medidor.md
- .claude/agents/triagem-reprodutor.md
- .claude/commands/deskcomm-gov-loop.md
- .claude/commands/triagem-de-pr.md
- .claude/skills/deskcomm-contribuir/SKILL.md
- .claude/skills/deskcomm-contribuir/references/depois-do-pr.md
- .claude/skills/deskcomm-contribuir/references/erros-recorrentes.md
- .claude/skills/deskcomm-contribuir/references/pre-voo.md
- .claude/skills/deskcomm-contribuir/references/receita-e2e-local.md
- .claude/skills/deskcomm-contribuir/scripts/armar-hooks.sh
- .claude/skills/deskcomm-contribuir/scripts/hooks/avisar-identidade.sh
- .claude/skills/deskcomm-contribuir/scripts/hooks/check-migration-triple.sh
- .claude/skills/deskcomm-contribuir/scripts/hooks/pre-commit
- .claude/skills/deskcomm-contribuir/scripts/hooks/pre-push
- .claude/skills/deskcomm-contribuir/scripts/hooks/sessao.sh
- .claude/skills/deskcomm-contribuir/scripts/pre-voo.sh
- .claude/skills/deskcomm-contribuir/scripts/quem-sou.sh
- .claude/skills/deskcomm-doutrina/SKILL.md
- .claude/skills/deskcomm-instalar/SKILL.md
- .claude/skills/deskcomm-metricas/SKILL.md
- .claude/skills/deskcomm-metricas/references/acesso-e-lgpd.md
- .claude/skills/sistema-vivo/SKILL.md
- .cursor/rules/deskcomm-guias.mdc
- AGENTS.md
- CLAUDE.md
- CONTRIBUTING.md
- docs/SETUP.md
- docs/doctrine/sistema-vivo.md
- docs/doctrine/sistema-vivo/08-aplicacao.md
- docs/handoff/agente-pausado-assume-conversa.md
- docs/handoffs/2026-08-24-historico-de-captacao-e-abordagem-por-ia.md
- docs/handoffs/BRIEFING-crm-vivo.md
- docs/handoffs/BRIEFING-ia-360.md
- docs/handoffs/CONTRATO-wave5.md
- docs/handoffs/HANDOFF-canais-oficial.md
- docs/handoffs/HANDOFF-casos-humanos.md
- docs/handoffs/HANDOFF-crm-vivo.md
- docs/handoffs/HANDOFF-inbox-multimodal.md
- docs/handoffs/HANDOFF-indice-de-atrito.md
- docs/handoffs/HANDOFF-lgpd.md
- docs/handoffs/HANDOFF-provedores-de-ia.md
- docs/handoffs/HANDOFF-wave1-devvivo.md
- docs/handoffs/PR-ia-360.md
- docs/handoffs/waves/W1-painel-do-humano.md
- docs/handoffs/waves/W2-nao-perder-o-cliente.md
- docs/handoffs/waves/W3-passar-para-humano.md
- docs/handoffs/waves/W4-organizar-a-operacao.md
- docs/harness-audit.md
- docs/index.md
- docs/superpowers/handoffs/2026-07-17-webhooks.md
- docs/testing/HANDOFF-vps-qa.md
- hostgator-setup-kit/CLAUDE.md
- loop/LOOP.md
- loop/RUN.md
- tasks/todo.md
- tests/unit/evidencia-citada.test.ts
- triagem/TRIAGEM.md

### Movidos (corpo preservado; cabeçalho histórico acrescentado)

- HANDOFF-conversa-vira-lead.md → docs/handoffs/HANDOFF-conversa-vira-lead.md
- HANDOFF-followup-vivo.md → docs/handoffs/HANDOFF-followup-vivo.md
- HANDOFF-fv-w1-fila.md → docs/handoffs/HANDOFF-fv-w1-fila.md
- HANDOFF-handoff-avisa-o-lead.md → docs/handoffs/HANDOFF-handoff-avisa-o-lead.md
- HANDOFF-harness-evolution.md → docs/handoffs/HANDOFF-harness-evolution.md
- HANDOFF-ia-360.md → docs/handoffs/HANDOFF-ia-360.md
- HANDOFF-marca-propria.md → docs/handoffs/HANDOFF-marca-propria.md
- HANDOFF-operacao-visivel.md → docs/handoffs/HANDOFF-operacao-visivel.md
- HANDOFF-silencio-retomada-humana-nao-gruda.md → docs/handoffs/HANDOFF-silencio-retomada-humana-nao-gruda.md
- HANDOFF-sistema-vivo-consertos.md → docs/handoffs/HANDOFF-sistema-vivo-consertos.md
- HANDOFF-tres-papeis.md → docs/handoffs/HANDOFF-tres-papeis.md
- HANDOFF.md → docs/handoffs/HANDOFF.md

### Adicionados/versionados

- docs/AGENT_INSTRUCTION_HIERARCHY.md
- docs/AGENT_RULES_AUDIT.md
- docs/AGENT_RULES_CONSOLIDATION.md
- docs/handoffs/README.md

AGENT_RULES_AUDIT já existia sem rastreamento; foi versionado como diagnóstico histórico da fase anterior.

### Removidos

Nenhum documento ou conhecimento histórico foi excluído. Os nomes da raiz deixaram de existir por movimentação, não descarte.

## Git e preservação

Branch específica pronta para revisão; commits locais separados por autoridade, handoffs e skills/consolidação. Sem push. Árvore rastreada limpa ao término; seis entradas não rastreadas preexistentes de UI/documentação permanecem fora dos commits, preservadas por comparação SHA256. “Limpa” aqui não significa apagar trabalho alheio.
