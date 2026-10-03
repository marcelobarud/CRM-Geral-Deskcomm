# Bloco B — Auditoria da jornada comercial atual

Data: 2026-10-03. CONFIRMADO no checkout e catálogo do Geral 1. Base `f13933d914a41f4b1333e60748bc38141c8bbda1`, após push da D2, integração fast-forward e push da main no fork. Branch local `bloco-b-jornada-comercial-base`. Auditoria anterior a alterações funcionais.

## Entidades e consumidores

| Conceito | Fonte vigente | Tela / API | Registro e saída |
| --- | --- | --- | --- |
| Identidade comercial | contacts, source/source_metadata | /app/contacts e /app/contacts/[id]; /api/v1/contacts | Histórico do contato, conversa e oportunidade |
| Oportunidade | crm_leads, contact_id, pipeline_id, stage_id | /app/pipelines/[id]; /api/v1/leads e /[id] | crm_lead_activities, event_log, auditoria |
| Funil/etapa | crm_pipelines, crm_stages | /app/kanban, pipelines/[id], configuração do funil | /move, /win, /lose; trigger deriva open/won/lost |
| Responsável comercial | owner_user_id ou owner_agent_id, owner_kind | Menu do card, API PATCH lead | Atividade de atribuição; não confundir com responsável do canal |
| Atividade / timeline | crm_lead_activities, ator, performed_at, payload | LeadDossier, TimelineView, CRMSidePanel; APIs timeline | Histórico único, não criar segundo motor |
| Próxima tarefa humana | crm_tasks: lead_id, contact_id, assigned_to, prazo, status | /app/tasks; /api/v1/tasks e /[id] | lib/tarefas/atividade.ts emite criação/conclusão na timeline |
| Compromisso | calendar_appointments: contact_id, conversation_id, dono, fuso e status | /app/agenda; /api/v1/agenda/agendamentos | Atividade/eventos existentes; sem lead_id direto |
| Atendimento/contexto | conversations e contacts | Inbox/CRMSidePanel, ConversaNoDossie; contact crm-summary | Responsável da conversa independente do negócio/agenda |
| Prospect manual | Identidade contacts, tarefa humana e eventual lead | Sem tabela prospect; estruturas existentes bastam para lista manual | Conversão cria oportunidade para o MESMO contato; sem automação |
| Origem | contacts.source e crm_leads.source/source_metadata | APIs aceitam origem, filtros existentes | UTM é metadado, não provider de Ads ou enriquecimento |
| Valor/resultado | crm_leads.value_cents, currency, closed_at, lost_reason | Card/dossiê e APIs /win /lose; relatórios existentes | Ganho comercial não equivale a recebimento; separar moedas |

## Achados confirmados

1. NewLeadDialog permite criar em funil/etapa e recebe contactId da Inbox, mas não oferece seleção de contato no board; fixa BRL/manual. A ficha de contato não oferece a criação de oportunidade nem tarefas/agenda relacionadas.
2. FormularioDeTarefa recebe leadId/contactId, mas só é montado por TarefasClient sem contexto. Não oferece assigned_to, embora banco/API já o suportem. A UI anuncia ligação com negócio, sem uma porta prática para criá-la.
3. LeadDossier mostra timeline/dados e conversa, mas não próximo passo humano nem passagem ao contato/agenda. Inbox já tem resumo CRM e criação de lead; reutilizar essa continuidade, não reconstruir o atendimento.
4. Agenda já tem contato, responsável, fuso, local/remarcação, eventos e projeções. Não existe vínculo lead_id direto; mostrar compromissos pelo contato, com essa semântica explícita, sem presumir compromisso exclusivo de uma oportunidade.
5. FKs de leads e tarefas apontam apenas ao UUID dos registros. O catálogo não mostrou trigger de validação das relações comerciais entre tenants. RLS protege a linha da oportunidade/tarefa, mas não prova que os UUIDs vinculados pertencem à mesma organização. Validar pelo caminho JWT e fechar esse contrato antes de declarar pronto.
6. Não criar opportunities, prospects, calendário de tarefas paralelo, entidade Empresa ou segundo timeline engine. Prospect será identidade em preparação comercial com tarefa humana; criar a oportunidade preserva o contato, sem exigir um estágio universal inventado.

## Escopo e riscos

Manual CRM reutiliza banco, API, autorização, auditoria e telas; não exige canal/IA. Conversa real exige canal; fixtures de contexto não autorizam disparar mensagens. Follow-up, risco, atividade do agente e eventos CRM têm consumidores existentes em lib/leads/, lib/followup/ e workers; nenhum worker novo é necessário para próxima tarefa humana.

Plano INFERIDO de implementação: fechar integridade das relações existentes; ligar contato/lead a tarefas e agenda com projeção contextual; expor responsável, origem e moeda no formulário existente; provar jornada real e isolamento A/B. Qualquer decisão de produto ausente continua aberta; nenhum percentual, SLA ou automação será inventado.

P0/P1 potencial: referências comerciais entre tenants precisam prova e proteção. P2: portas/formulários/contexto acima e branding público herdado já registrado na D2. P3: advisor, limites de projeções, harness Docker complementar e dívida global conhecida; não usar warnings como justificativa para permissões amplas.

Fontes: PRODUCT_MODEL_AND_FUNCTIONAL_ROADMAP, UPSTREAM_FUNCTIONAL_SELECTION (decisões posteriores), PRODUCT_DISTRIBUTION_ARCHITECTURE, CONFIGURABLE_FOUNDATION_IMPLEMENTATION, SUPABASE_D2_IMPLEMENTATION, LOCAL_RUNTIME_TRANSITION, AGENTS/CLAUDE e mapas crm-vivo/gestao-funis/marca-propria. Snapshots históricos não substituem este inventário.
