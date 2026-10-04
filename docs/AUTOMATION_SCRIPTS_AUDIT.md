# Bloco G — auditoria de automações e roteiros curtos

Base CONFIRMADA: `7002c066c91cd965b9e86365bd02b445bcf8d301`, integrada por
fast-forward e publicada na main do fork em 2026-10-03. Branch de trabalho local:
`bloco-g-automacoes-roteiros`. Inventário por leitura do checkout e catálogo do
Supabase Geral 1 (`zwjrhqqwizjpzmeayrju`); sem leitura de secrets.

## Fontes e decisões

Fontes: PRODUCT_MODEL_AND_FUNCTIONAL_ROADMAP, UPSTREAM_FUNCTIONAL_SELECTION,
CONFIGURABLE_FOUNDATION_IMPLEMENTATION, COMMERCIAL_JOURNEY_IMPLEMENTATION,
TAGS_FOUNDATION_IMPLEMENTATION, B2B_SIMPLE_IMPLEMENTATION,
REPORTING_FORECAST_IMPLEMENTATION, PROPOSALS_IMPLEMENTATION,
SUPABASE_D2_IMPLEMENTATION, AGENTS e CLAUDE. Decisão aprovada 10A: evoluir regras
existentes e roteiros curtos. Os documentos históricos descrevem estados da sua
fase; não são comprovação do checkout atual.

CONFIRMADO: `roteiro-no-turno.ts`, mencionado na seleção como referência upstream,
não existe neste checkout. Não há tabela de definição/sessão de roteiro no
catálogo real. `lead_checkpoints` guarda resumo, compromissos, objeções e declaração
do turno: não representa perguntas ordenadas nem respostas validadas.

## Motores, consumidores e tempo

| Mecanismo existente | Responsabilidade e consumidores concretos | Tempo / efeitos / proteção |
|---|---|---|
| `lib/automation/engine.ts` | Regras ativas em automation_rules, AND de condições, catálogo de executores; engine.handler registrado em event-log/register-handlers | Reage a cinco eventos; executa ações imediatas, pode adiar antes de qualquer efeito; metadata caused_by_rule evita ciclo |
| `lib/event-log/dispatcher.ts`, drain.ts e drain-loop.ts | Registry compartilhado, consumed_by por consumidor, claim pending→processing; cron event-log-drain e worker existente | Retry exponencial, limite cinco tentativas, recuperação de processing órfão; não torna efeito externo exactly-once |
| `lib/followup/engine.ts` | Grafo publicado/pinned, inscrição exclusiva, espera, classificação, match_reply, ação e fim; cron followup-flow-worker e ponte turn-bridge | Claim/lease, eventos idempotentes por passo, execução temporal e ponte para job_queue; respostas podem atualizar CRM via persistir-resposta |
| `lib/agent-engine/queue` e cron/scheduler.ts | Fila durável de turnos, cron_jobs; workers/agent-worker/main.ts mantém loops | Scheduler enfileira, não substitui fila; transação e SKIP LOCKED, retry, inbox de falhas |
| inbound-turn/operator-turn/followup-turn | Comportamento conversacional, prompt, skills, contexto/checkpoints, tools com IDs confiáveis do job | Provider somente quando precisa gerar linguagem; send-ledger protege transporte; não é catálogo de roteiro |
| human-handoff.ts | force_human, silêncio da conversa, cancelamento de crons e agent_inbox_items com contexto | Pedido determinístico ou tool; continuidade humana, não coleta padronizada |

Automação reage a evento; follow-up acompanha ao longo do tempo; roteiro conduz
coleta; prompt orienta linguagem; scheduler agenda. A sobreposição é em ações
como iniciar follow-up ou enviar mensagem. Não justifica unificar os mecanismos.
`start_message_flow` já delega a enrollFollowupFlow: não há motor de mensagens
separado a duplicar. O builder de grafo de follow-up permanece fora da nova UI.

## Eventos, ações, interfaces e lacunas confirmadas

Eventos consumidos: lead.created, lead.stage_changed, lead.tag_added,
contact.tag_added e message.received. Kind canônico protegido no engine. Produtores
são triggers/rotas de CRM, ingestão e ação add_tag. Nenhum evento empresarial,
de forecast ou de proposta será inventado.

Catálogo atual: add_tag, assign_owner, create_or_move_lead, call_webhook,
send_whatsapp_message, send_ai_message e start_message_flow. Não há ação criar
tarefa no catálogo atual. O teste deve usar ação real, sem acrescentar uma ação
hipotética apenas para homologação.

UI existente: /app/webhooks, RulesTab, RuleEditor e atividade de execuções;
APIs automation-rules CRUD/runs e resend. Gestão manager+, support-write e guard
de autenticação canônicos. No banco, automation_rules tem manager-write e
automation_rule_runs leitura por organização. Policies adicionais de suporte
são permissivas: grants e guard de escrita precisam ser considerados juntos;
não inferir segurança somente de nome de policy.

Lacunas CONFIRMADAS por leitura:

- Conditions aceita caminho arbitrário, resolve propriedades herdadas, e o
  comentário diz ausente=false enquanto neq para null/undefined retorna true.
  Delimitar campos/operadores e tornar a semântica explícita, preservando contratos
  legados válidos e aliases de tags.
- add_tag escreve text[] com snapshot read-modify-write. O Bloco C converte pela
  ponte, mas contratos novos podem escolher IDs estáveis. Preservar a ponte para
  consumidores legados e resolver merge/rename por identidade.
- Engine grava falha/partial mas devolve ok ao event-log; não existe checkpoint
  por ação que permita repetir só efeito seguro sem refazer ações já sucedidas.
  Retry global irrestrito seria perigoso. Resend existente reexecuta apenas
  webhook, que tem retry de transporte próprio e não prova exactly-once remoto.
- Contadores de regra são informativos read-modify-write; não são ledger. Há
  lookups de contador sem filtro explícito de organização a corrigir no recorte.
- Registro de run que falha é apenas logado; é necessário distinguir execução
  não registrada, sem repetir cegamente efeito externo.
- Não há coleta sequencial persistente com snapshot e respostas separadas do CRM.
  Follow-up save_to pode promover respostas a dados canônicos: reutilizá-lo sem
  adaptação violaria o contrato desta tarefa.

## Decisões de reutilização para implementação

PROPOSTA TÉCNICA, derivada das lacunas acima: manter engine/registry/drain e
executores existentes. Acrescentar proteção de replay e retry apenas para ação
relacional comprovadamente segura; não repetir envio/webhook automaticamente
após resultado incerto. Execuções e correção ficam na atividade existente.

Roteiro será coleta determinística curta no contexto da conversa, com definição
limitada, sessão persistente e snapshot. Nenhuma fila/scheduler/provider novo.
Usar autorização/visibilidade da conversa, UI de atendimento e continuidade
humana existente. Respostas não promovem campos do contato/oportunidade. Edição
da definição não altera sessão iniciada. Interrupção e retomada são explícitas.

O recorte novo é módulo comercial opcional conforme roadmap §6: capacidade
`short_scripts`, default desligada, gestão manager+ e execução agent+. O motor
preexistente de automação permanece fundação; não depende dessa flag. Histórico
de roteiro permanece consultável quando desativado, mutações exigem habilitação.
MFA administrativo respeita sessão provada quando a organização exige MFA;
operação não inventa um desafio por pergunta.

MCP/tools: o runtime já usa contexto de job/conversa e whitelist. Não aceitar
IDs escolhidos livremente pelo modelo; primeira entrega pode operar sem IA.
Integrar contexto persistido ao handoff, sem expor respostas em logs/audit.

## Verificação planejada e limites

Tripla após 0267, grants mínimos/RLS/refs compostas, aplicação e reaplicação no
Geral 1, tipos gerados. JWT reais A/B e papéis, replay/retry/falha, edição durante
sessão, UI desktop/mobile/teclado e limpeza independente. Checkpoint SQL não
substitui homologação com JWT/UI. Nenhuma dessas provas novas está declarada
executada neste documento anterior ao código.

P1 distribuição: instalação/update limpa no harness ainda não comprovada;
explicitamente não bloqueia o Bloco G e não certifica Cliente Zero. Sem campanhas,
workflow builder genérico, outreach, execução arbitrária, Redis/Kafka novo,
criação/envio automático de propostas ou alteração automática de probability.
