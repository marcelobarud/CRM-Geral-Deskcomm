# Auditoria de campanhas agendadas — Bloco H

Data: 2026-10-04. Base confirmada: `main` do fork, commit `1081d29d4f74a76c9b86d1ed1d078d2ede124ffe`. Auditoria feita antes de mudanças funcionais; a próxima implementação permanece na branch local `bloco-h-campanhas-agendadas`.

## Escopo e autoridade

CONFIRMADO: a decisão de produto aprova campanhas em lote agendadas como módulo opcional (`docs/PRODUCT_MODEL_AND_FUNCTIONAL_ROADMAP.md`, decisão 7B). Prospecção autônoma, outreach inteligente, sequências, A/B, tracking e marketing attribution avançada estão fora do escopo. A seleção funcional registra que as regras operacionais de campanhas continuam abertas (`docs/UPSTREAM_FUNCTIONAL_SELECTION.md`, §28). Esta auditoria não importa o módulo upstream nem transforma requisitos antigos de provider em regras comerciais do CRM Geral.

CONFIRMADO: o Bloco G usa o motor, os drains, o worker e o cron existentes e não cria uma ação de automação para iniciar campanhas (`docs/AUTOMATION_SCRIPTS_IMPLEMENTATION.md`). Campanha será criada e revisada por uma pessoa.

## Inventário

| Pergunta | Resultado observado |
|---|---|
| Quais mecanismos de envio já existem? | `sendMessageHandler` em `app/api/v1/messages/_handler.ts` grava a mensagem outbound, resolve o adapter pela sessão e envia pelo contrato de canal. `lib/channels/index.ts` registra WAHA, Meta Cloud e Zernio; `wacalls` não transporta mensagens. O fluxo de agente chama a mesma borda por `lib/agent-engine/edge/crm/send-message.ts`. Não existe módulo de campanha CRM no checkout; `app/api/v1/ads/meta/campaigns` trata campanhas de anúncios, não mensagens a contatos. |
| Qual é o ledger de transporte atual? | `send_ledger`, definido na migration `0050_agent_harness`: chave lógica `(job_id, seq)`, hash SHA-256 do corpo e estados `requested`, `accepted`, `queued`, `vetoed`, `failed`. `sendTurnMessage` usa o id do ledger como chave de idempotência em `messages.metadata`; `accepted` evita reenvio e uma linha da mensagem reconcilia uma interrupção após o efeito. `accepted`/`sent` significa que o transporte registrou/aceitou o envio; `delivered` e `read` só aparecem com confirmação posterior do provider. O ledger está acoplado a um job do worker de atendimento e não é um ledger genérico de campanhas. |
| Que filas e workers já existem? | `job_queue` é a fila durável compartilhada, com claim transacional `FOR UPDATE SKIP LOCKED`, limite global, lane de um job em execução por contato e payload JSON. `workers/agent-worker/main.ts` despacha tipos registrados. `cron_jobs` é o scheduler persistente por contato: ao vencer, enfileira na `job_queue` e registra falha/backoff. `event_log` tem seu drain e handlers próprios. Não há fila ou handler de campanha. |
| Como retry funciona? | A fila incrementa tentativas no claim, aplica backoff exponencial limitado, devolve falhas transitórias a `pending` e encaminha jobs esgotados a `dead`/aviso humano. O cron também classifica falhas e adia ou desativa a agenda. No envio do agente, a combinação ledger/mensagem reconcilia `requested` e não repete `accepted`; falha definitiva pode girar a chave lógica. A incerteza entre efeito remoto e confirmação continua impedindo uma garantia universal exactly-once. |
| Como dedupe funciona? | Índice parcial da fila deduplica evento por `(organization_id, source_event_id)`; claim serializado e índice parcial protegem a lane por contato. O ledger deduplica por `(job_id, seq)` e encontra mensagem por `metadata.idempotency_key`. Essas garantias são específicas aos contratos atuais e não devem ser declaradas para uma campanha sem integrar seu id estável a ambas as camadas. |
| Há rate limiting? | O caminho de agente possui pacing persistido por sessão em `channel_knobs`/`pacing_ledger`, janela e caps consultados sob lock por `runBeforeSend`; o handler usa o adapter e respeita estado da sessão. A ação antiga de automação tem espaçamento em memória de processo (`lib/automation/throttle.ts`), que não serve como limite durável distribuído de campanha. Não existe limitador próprio de campanha. |
| Há bloqueio/opt-out? | Sim. `contacts.is_blocked` é o bloqueio irrevogável aplicado pelo opt-out inbound; `force_human` também interrompe caminhos proativos. `contacts.consent.marketing.declined_at` é a recusa explícita consultada pela guarda de contato. O handler de mensagem volta a conferir `is_blocked`; o gate de saída do agente também relê o estado sob lock. Contatos mesclados/anonimizados têm estados próprios e precisam ser excluídos/revalidados. |
| Há consentimento/modelo LGPD? | `contacts.consent` guarda finalidade de marketing (`granted_at`, `declined_at` e proveniência); a base de interesse legítimo pode estar em `consent.legitimate_interest.ref`. `deriveLgpdFromContact` e `isLegalBasisValid` definem a leitura defensiva e exigem prova para primeiro toque de prospecção; contato importado sem prova não passa. O código registra que não há gestão geral de consentimento na UI. Uma campanha é um envio fora de resposta a inbound e não pode herdar silenciosamente a exceção de resposta do agente nem inventar base legal. |
| Existe campanha upstream reaproveitável? | Não há módulo de campanhas de CRM ou executor em lote no checkout. Há uma rota de campanhas de anúncios e documentação/trechos antigos de WhatsApp, sem contrato compatível com as decisões atuais. Não foi importado código upstream. |
| Quais dependências são excessivas? | Um segundo scheduler, fila, Redis/Kafka, provider, motor de automações, workflow/segment builder universal, editor rich-text ou dependência de tracking seriam redundantes ou excederiam o recorte. As primitivas necessárias já existem em Postgres, `pg`, Supabase e Playwright/Vitest. |
| Qual canal pode ser homologado de forma segura primeiro? | WhatsApp é o candidato técnico mais maduro: possui adapters de mensagem, envio real, status de sessão, ledger e controles de pacing. Porém, o sender atual chama o canal conectado e não declara modo sandbox/teste; a execução não tem um destinatário de teste externo explicitamente autorizado. O caminho de campanha também não monta o contexto de atendimento que hoje aciona o gate LGPD/pacing/ledger. Portanto, **nenhum canal de campanha pode ser marcado como homologado com efeito externo seguro nesta etapa**. E-mail operacional existente não é um sender de campanhas. |

## Decisão técnica de segurança

INFERIDO a partir da autorização expressa do Bloco H: adotar o fallback permitido pelo pedido. A primeira versão pode salvar rascunho, materializar o snapshot por tag, agendar e produzir/preparar um lote no scheduler/fila existentes. Nenhum worker de produção chamará provider, criará mensagem outbound ou marcará destinatário como `sent`/`delivered`. O preparo pode terminar em `provider_unavailable`; resultados de envio só existirão após um canal e sua autorização serem homologados numa tarefa própria.

Um executor fictício, se usado para teste de lógica, fica restrito ao harness e não altera status/ledger como se o provider tivesse aceitado uma mensagem. O teste visual e o relatório devem deixar explícita essa fronteira.

## Pontos que a implementação precisa preservar

- Capacidade `scheduled_campaigns` com default desligado; APIs, criação, agenda e produtores verificam configuração atual. Desligar impede novo preparo e preserva leitura do histórico.
- Segmento de primeira versão simples, por `tag_id` canônico da organização. Agendamento congela apenas os IDs selecionados; alterações futuras de tag não mudam a audiência. No processamento, contatos removidos, mesclados, bloqueados ou anonimizados deixam de ser elegíveis.
- `organizations.timezone` é o fuso canônico. Persistir instante UTC e o fuso usado na confirmação, exibindo ambos sem conversão implícita.
- Toda nova linha tem `organization_id`, RLS e referências que conferem tenant; papéis são os já existentes. Payloads de fila carregam IDs estáveis, não texto da campanha.
- Reuso do `cron_jobs`/`job_queue` e worker atual; sem segundo motor. Lote limitado e paginação por destinatário.
- Conteúdo e erros não entram em logs; confirmação de provider, quando um sender seguro existir, é distinta de entrega/leitura.
- Nenhum gatilho do Bloco G inicia campanha e nenhuma decisão comercial/legal nova é inferida.

## Pendências identificadas antes do código

1. O executor de envio existente é orientado a turno/conversa; não há contrato de envio de campanha, sandbox ou destinatário de teste autorizado.
2. O primeiro envio de campanha é prospecção no gate LGPD; precisa usar prova de consentimento ou LIA atual, sem aceitar esse dado do body e sem criar uma nova base legal.
3. O ledger atual tem semântica por turno `(job_id, seq)` e não expressa a chave estável `(campaign_id, recipient_id, content_version)`.
4. O pacing por sessão existe, mas campanhas não estão integradas ao lock/caps nem têm um limite conservador próprio.

Esses pontos justificam preparar e agendar o lote, sem disparo real. A distribuição ainda mantém a pendência independente **P1 — instalação/update limpa não comprovada**.
