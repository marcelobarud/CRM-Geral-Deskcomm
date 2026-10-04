# Automações e roteiros curtos — Bloco G

## Estado e integração

CONFIRMADO: Bloco F publicado no fork origin e integrado por fast-forward. Main/origin/main: 7002c066c91cd965b9e86365bd02b445bcf8d301. Desenvolvimento G em bloco-g-automacoes-roteiros; auditoria prévia no commit 0de95a2f. Nenhum push/merge G autorizado nesta fase.

## Recorte implementado

Motor existente lib/automation/engine.ts, dispatcher/drain/worker e cron permanecem os consumidores. Não há novo scheduler, fila ou provider. Mantidos cinco gatilhos existentes: lead.created, lead.stage_changed, lead.tag_added, contact.tag_added e message.received. Mantidas ações conhecidas; add_tag evolui para catálogo do Bloco C com UUIDs e aliases/text bridge. Configuração por UI de Webhooks, validação Zod, referências de organização no banco e resultados em Atividade. Condições rejeitam caminhos prototype; o comportamento legado de neq/null foi preservado.

A ação de tags usa fn_automation_add_tag: organização do evento/regra, alvo recuperado do banco, referência canônica/merge e recibo evento/regra/índice em transação. Falha retornada ao drain somente para conjuntos de ações transacionais de tags; regras mistas não recebem redrive automático novo. Checkpoints por índice evitam repetir ações externas já registradas e evitam reexecutar configuração alterada após tentativa. Não se afirma exactly-once para HTTP/envio externo no intervalo efeito/registro. Falha de persistência externa conserva diagnóstico automation_external_result_unconfirmed, sem repetição automática insegura.

## Roteiros curtos

Capacidade short_scripts opcional, default desligada. Gerente/admin configura; agent+ opera conforme visibilidade da conversa. Editor linear: nome, descrição, ativação, ordem e até 12 perguntas. Tipos texto, escolha (2–6 opções) e confirmação. Limites são proteção técnica do formulário/RPC, não SLA ou política comercial. Não há branching, loops, scripts executáveis, integrações arbitrárias ou builder genérico.

Entrada pelo hub CRM/Roteiros e painel de CRM do Inbox. API /api/v1/scripts usa getUser/guards canônicos, organização confiável, Zod strict, revisão otimista e Idempotency-Key. Definição em crm_short_scripts; sessão em crm_script_sessions mantém snapshot, passo, respostas, revisão e status running/interrupted/completed. Respostas permanecem coleta para revisão humana, sem promoção automática de contatos, empresas, oportunidades ou probabilidade.

Atualização de definição só afeta novos inícios. Passagem humana existente (silenciamento infinito/encerramento) interrompe sessão e preserva respostas. Interrupção explícita entrega contexto no atendimento. Retomada continua perguntas, sem reativar IA. Falha de comando é mostrada pela UI, conserva rascunho/resposta e pode ser repetida com a mesma chave; transação não cria avanço parcial. Histórico consultável com capability desligada; mutações bloqueadas. O runtime IA/MCP não ganhou ferramentas de execução nem promoção de respostas: primeira entrega determinística assistida por humano.

## Banco e segurança

Tripla 0268–0272: migrations novas, apêndices idempotentes baseline e MANIFEST. As já aplicadas não foram reescritas; correções posteriores em novas migrations. RLS, organization_id, FKs compostas, sessão viva única por conversa, grants SELECT mínimos e RPC autenticada com suporte/MFA/role/escopo. Service role não opera roteiro como usuário. Recibos protegidos contra falsificação direta. Replay revalida visibilidade/role atual; remoção direta de regra exige MFA/suporte.

0268: definições/sessões/capability/comandos/receipt. 0269: tags atômicas. 0270: interrupção pelo controle humano e validação de tags das regras. 0271: impacto de UUIDs/merge e retenção do recibo de efeito. 0272: replay conforme escopo atual e remoção de regra protegida.

CONFIRMADO: aplicação e reaplicação no Geral 1; probe transacional com rollback passou. Tipos regenerados do schema. Varredura anon foi recolocada depois de todos os apêndices (inclusive os posteriores à varredura no estado herdado), preservando o conteúdo e grants finais; teste de ordem passou. Isso não substitui install/update completos.

Advisors: alerta esperado authenticated_security_definer_function_executable em fn_script_command (entrada autenticada intencional, guards internos e EXECUTE revogado de PUBLIC/anon/service). INFO unused_index em crm_script_sessions_conversation durante homologação inicial. Demais achados do projeto preexistente não foram tratados. Nenhuma remoção de guard/grant para silenciar advisor.

## Jornada e evidências

Suíte scripts/supabase/verify-automation-scripts.mjs conectada ao iniciador Automations/AgentLoop. Chaves somente na memória, alvo Geral 1 fixo, fixtures próprias, sem persistir sessão/HAR/trace/segredo. Reutiliza D2 (Auth, REST, RLS, Storage, Realtime, app e MFA). CONFIRMADO: suíte completa aprovada em 2026-10-04T03:57:04.788Z, execução 32e3ba54-2518-4344-b5aa-3869622ac8ab, sem código/motivo de falha. Evento real e motor existente, uma atribuição/recibo no replay, rename/merge com condição UUID, referência de configuração preservada, roteiro de três passos, erro HTTP antes do comando, resposta preservada, editor/reordenação por teclado, snapshot preservado após edição, handoff no Inbox, retomada com foco no próximo campo e conclusão. Viewports 1440×900 e 390×844, sem overflow; botão de retomada ajustado para o painel estreito. Viewer/agent não gerenciam definição/regra, agente autorizado responde, own-scope bloqueia leitura/mutação/replay após reassociação, A/B isoladas, anon/service não operam comando autenticado. MFA real AAL1 bloqueia roteiro/regra, AAL2 permite; logout/novo login comprovados.

CONFIRMADO: limpeza independente retornou zero organizações/usuários das oito execuções, zero sessões Auth/Storage/sessões de roteiro/regras da execução final. Terminal AgentLoop encerrado; chaves não impressas/persistidas. Smoke de memória/sessão/dedupe/ações permitidas/encerramento passou.

Evidências fictícias selecionadas foram inspecionadas e versionadas; os caminhos de imagem abaixo são relativos à raiz do repositório. Restante técnico permanece ignorado em .local-dev/bloco-g:

- [Resultado sanitizado](../evidence/bloco-g/result.json)
- Conclusão desktop: `evidence/bloco-g/scripts-completed-1440.png`
- Conclusão mobile: `evidence/bloco-g/scripts-completed-390.png`
- Contexto humano no Inbox: `evidence/bloco-g/scripts-handoff-inbox-1440.png`
- Erro com resposta preservada: `evidence/bloco-g/scripts-error-1440.png`
- Editor mobile: `evidence/bloco-g/scripts-editor-390.png`
- Falha registrada na Atividade: `evidence/bloco-g/scripts-automation-failed-1440.png`

## Verificações e limitações

CONFIRMADO no estado entregue: build e typecheck passaram, lint geral sem erros (351 warnings no snapshot executado) e lint do código novo sem problemas; lint:channels/role-rank passaram. Onze arquivos/217 testes focados passaram, incluindo contratos, replay misto, condições, schemas, navegação, capabilities, baseline, mapas e fragmentos. Suíte global executada: 798 arquivos passaram/17 falharam, 8543 testes passaram/39 falharam/1 expected fail; contagem inclui leitura anterior às correções G. Falhas de ordem do baseline/navegação G corrigidas e rerun focado passou. Outros problemas fora deste recorte (propostas/visual validation/tradução/IDs/tokens/evidência/documentação/ambiente) preservados e não mascarados. Não declarar suíte global verde.

P1 ABERTO distribuição: test:db não executou porque bash não está disponível neste host; instalação/update limpa continuam sem prova, sem bloqueio artificial ao desenvolvimento G conforme prompt. Não homologado Cliente Zero/produção.

| Prioridade | Estado |
|---|---|
| P0 | Nenhum gap novo detectado no recorte exercitado. |
| P1 | Instalação/update limpa ainda não comprovada; aberta e separada do aceite funcional G. |
| P2 | Suíte global não verde com falhas fora do recorte; ações externas legadas não têm garantia universal exactly-once no intervalo efeito/registro. Redrive novo restrito a tags. |
| P3 | Nenhum gap adicional identificado no recorte entregue. |

Coleta assistida por humano é o recorte determinístico aprovado na auditoria; integração IA automática não foi declarada implementada.

## Sistema Vivo e mapa

Entrada: evento existente ou comando humano autenticado. Saída: tag canônica/recibo ou sessão persistida. Produtores/consumidores/tenant conservados. Falha: run e Atividade para tags; erro de formulário com contexto preservado para roteiro. Resolução: retry transacional ou retomada explícita. Não altera status commercial ganho/perda, probability, proposals ou B2B. Mapa fonte docs/architecture/automacoes-roteiros.architecture.json com relações de motor, recibo, UI, sessão e continuidade. Fragmento .changes/bloco-g-automacoes-roteiros.md.

## Próxima etapa

CONFIRMADO: aceite funcional G concluído; podemos iniciar Bloco H — Campanhas Agendadas em tarefa nova. H não foi iniciado e nenhuma branch H foi criada. Isso não declara distribuição/Cliente Zero prontos.

Commits locais por responsabilidade: 0de95a2f (auditoria prévia), 1bb85cf1 (banco), aaa08247 (motor/tags), 085fa371 (UI/API/coleta), 54e37e33 (suíte/evidências). Relatório/mapa/fragmento encerram em commit documental próprio. Nenhum push/merge/rebase de G. Arquivo preexistente não rastreado docs/DESKCOMM_UPSTREAM_AUDIT.md preservado fora dos commits (SHA-256 1689EF1DBD1FCA2A2B8E3C88522897471BC2CDE7A0ACFB5F6CF9474D2EA9F7D4).
