# Bloco C — Auditoria de tags e segmentação

Data: 2026-10-03. Base `410a757d29d4c7afdcdd8d071d57d0cb12e47d73`, após push do
Bloco B, integração fast-forward e push da main no fork CRM Geral. Branch local:
`bloco-c-tags-estruturais`. Auditoria anterior a alterações de código.

## Modelo confirmado no checkout e no Geral 1

`contacts.tags`, `crm_leads.tags` e `conversations.tags` são `text[]` com índices
GIN; não há catálogo nem identidade de tag/atribuição. A migration 0033 implantou
tags de conversa. O vocabulário JSON `organizations.settings.canonical_conversation_tags`
é sugestão, não catálogo. `crm_pipelines.settings.canonical_tags` governa o marcador
visual do card, não outra espécie de atribuição.

Em 2026-10-03 o inventário cloud contou zero registros com tags atribuídas em cada
um desses três escopos. Isso não dispensa backfill genérico nem teste com dados
legados. A próxima sequência disponível no checkout é 0244, após conferência dos
nomes de migrations (não apenas da ordem dos arquivos).

## Escritores, leitores e dependências

| Superfície | Contrato encontrado | Risco |
| --- | --- | --- |
| Contatos | `_handler`, formulários New/EditContactDialog, ContactTagsEditor, CSV/import, MCP | Normalização variável; criação de nome livre; listas duplicadas |
| Oportunidades | `_handler`, LeadFieldsForm/EditLeadDialog, bulk/import, MCP, automação add_tag | Texto livre; add_tag publica evento com caused_by_rule |
| Conversas/Inbox | `_handler`, ConversationTagsEditor, useConversationTags, InboxFilters | Trim/lowercase, limite 40 caracteres/20 tags; sugestões JSON distintas |
| Busca/filtros | ContactsClient, handlers contacts/conversations, FilterBar/board | `contains(tags,[texto])` e comparações exatas |
| Automações | conditions, actions/add-tag, RuleEditor/ActionConfigForm | Comparação de lead.tags/contact.tags; valores persistidos em JSON |
| Follow-up | node-handlers, silence-sweep, turn-bridge/engine | `includes`, eq/contains e segments; grafos publicados imutáveis |
| IA/MCP | governance.crm_manage_tags, leads/contacts/conversations, get-lead-context, listarMarcadores | Escrita/leitura textual e contagem de sugestões/uso |
| Saídas/histórico | LGPD/export, payloads de evento/webhook e atividades | Preservar contexto histórico; não reescrever logs |
| Configurações | settings da organização/pipeline, automation_rules e followup_flow_pointers/versions | Rename/delete podem invalidar textos se não houver compatibilidade |

Duplicação: trim/lowercase/dedup nos dois editores da Inbox, Zod de conversa,
CSV e escritores de lead/contato. Nome está confundido com identidade. A remoção
atual é apenas edição da lista de um registro; não existe exclusão global segura.

Fora do escopo: ai_faq_items.tags classifica conteúdo; metrics.labels identifica
métricas; api_key_tag é material criptográfico; stage/etag/labels de UI não são
tags comerciais. Não migrar esses significados por coincidência textual.

O código upstream já presente no fork oferece editores, filtros, índices e
eventos úteis; não demonstrou catálogo gerenciado reutilizável. Esses contratos
serão adaptados, sem importar implementação remota ou autoridade upstream.

## Estratégia de implementação

Catálogo `crm_tags` por organização; identidade UUID, nome, normalized_name, cor
opcional e timestamps. Atribuições distinguem entidade contact/lead/conversation
e registro; validação confere organização de tag e alvo. RLS e RPCs guardadas
separam leitura, atribuição (agent+) e gestão (admin, como Configurações da org).

Normalização técnica proposta: NFC, trim, colapso de espaços internos e lowercase;
acentos e pontuação preservados. Nome novo segue o limite de 40 caracteres já
usado na conversa; legado válido mais longo não será truncado. Valores inválidos
devem interromper a conversão com diagnóstico, nunca ser apagados silenciosamente.

Aliases preservam grafias/textos antigos e identidade após rename/merge. As listas
textuais serão projeções das atribuições e aliases para consumidores existentes;
uma ponte delimitada traduz escritores legados para a identidade canônica.
Não são duas fontes independentes: catálogo/atribuições determinam a projeção.
Novos editores e gestão usam identidade, evitando apresentar aliases duplicados.

Backfill genérico e idempotente, com deduplicação por organização/normalização e
relatório de colisões. Rename conserva id; merge transacional move/deduplica
atribuições e preserva aliases/histórico. Delete global só com zero atribuições e
zero dependências em configurações/automações/grafos; preferir desativação segura
com identidade preservada. Remoção contextual nunca apaga catálogo.

## Prova e limites

Migration + baseline + MANIFEST, aplicação/reaplicação no Geral 1 e types gerados.
Fixtures A/B precisam provar migração case/duplicidade, FK/trigger cross-tenant,
RBAC, assign/unassign, rename/merge e delete bloqueado por uso. Jornada real de
gestão, três contextos e filtros em desktop/mobile, sem mensagens externas.

Riscos principais: nomes usados em JSON/grafos imutáveis, escritores service_role,
colisões concorrentes e reversão de legado recriando tag desativada. A solução
precisa conservar aliases, bloquear recriação silenciosa e serializar mutações
por organização. Não alterar grafos publicados, logs ou regras comerciais.

Fontes: PRODUCT_MODEL_AND_FUNCTIONAL_ROADMAP §10, UPSTREAM_FUNCTIONAL_SELECTION
(3A), COMMERCIAL_JOURNEY_IMPLEMENTATION, CONFIGURABLE_FOUNDATION_IMPLEMENTATION,
SUPABASE_D2_IMPLEMENTATION, AGENTS/CLAUDE e fontes reais citadas na tabela.
P2 de branding e funil histórico permanecem fora deste bloco.
