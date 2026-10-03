# CRM Geral — Auditoria do Bloco E

2026-10-03, antes da implementação; base main `8e8014b44ac7b2da1df7a91caf277d000b31083b`.
Bloco D publicado no fork e integrado por fast-forward. Branch E local
`bloco-e-relatorios-forecast`; auditoria upstream não rastreada preservada.

## Fontes e fatos confirmados

Referências: PRODUCT_MODEL_AND_FUNCTIONAL_ROADMAP §§4/11/12/20/roadmap E,
UPSTREAM_FUNCTIONAL_SELECTION §§6/18, COMMERCIAL_JOURNEY_IMPLEMENTATION,
B2B_SIMPLE_IMPLEMENTATION, TAGS_FOUNDATION_IMPLEMENTATION,
SUPABASE_D2_IMPLEMENTATION, AGENTS/CLAUDE. Direção aprovada 4A: probabilidade
da etapa e forecast determinístico; não importar probabilidade de IA.

- `/app/metrics` (Desempenho) é a superfície existente; MetricsClient lê
  `/api/v1/metrics/attendants` e atrito. Funil = snapshot de abertos; ganhos e
  perdas = closed_at em [from,to), padrão últimos 30 dias. Não agrega dinheiro.
- `fn_attendant_metrics` vigente no Geral 1 é SECURITY INVOKER. Counts comerciais
  são confiáveis dentro do recorte RLS; TTFR, voz e atrito medem outra unidade.
  Piso da rota agent, comparação manager+, own-scope vem de fn_can_view_lead.
- `/app/activities`, `/api/v1/reports/activities`, `fn_activity_report`: atividades
  por performed_at, limite 90 dias, fuso IANA e truncamento explícito. Não é
  previsão, resultado financeiro ou denominador de conversão comercial.
- Dashboard administrativo agrega plataforma/instalações; não é relatório de
  oportunidades de um tenant. Kanban inclui totais locais dos cards carregados;
  não reutilizar esses subtotais paginados como fonte analítica completa.
- crm_leads: value_cents bigint nullable; currency text nullable default BRL;
  status open/won/lost; closed_at timestamptz; expected_close_date **date** nullable;
  created_at/updated_at timestamptz; owner_user_id/owner_agent_id; source e
  source_metadata JSON. source é categoria; metadata não prova multi-touch.
- `fn_crm_lead_close_on_stage` marca won/lost, closed_at e reabertura. Ganho é
  valor comercial, sem prova de recebimento. Sem mutação dessa regra neste bloco.
- crm_stages não possui probabilidade. ai_probability existente pertence ao
  score individual do lead, com razão/evidência: não serve de fonte ao Bloco E.
- Stage settings/PATCH manager+ e stage-operations já centralizam configuração,
  autoria e auditoria. Reutilizar superfície/fluxo em vez de novo administrador.
- Empresa é derivada lead → contact → company; tags têm identidades por escopo.
  Filtros adicionais por empresa/tag são opcionais, não exigem novo analytics.
- Índices existentes org/pipeline/status e org/status/closed_at/owner cobrem partes
  da leitura; expected_close_date tem índice parcial org/open. Sem baixar milhares
  de leads, loops N+1 ou dependência dos limites REST para agregados.

## Decisões técnicas explícitas para implementação

1. probability_percent smallint nullable, inteiro 0..100. Null = não configurada,
   etapas antigas/nova permanecem null. Não atribuir 50%, nem usar nomes de nicho.
2. Weighted cents derivados no banco: round(value_cents::numeric * percent / 100)
   por oportunidade, meio centavo para longe de zero; somar após arredondar.
   Transportar totais monetários como strings inteiras para não perder bigint
   no JSON/JavaScript. Nada de float binário ou valor ponderado persistido.
3. Pipeline/forecast atuais = snapshot dos abertos visíveis; won/lost não entram.
   Forecast do período usa expected_close_date, faixa UTC de datas [from,to).
   Sem data fica explicitamente sem horizonte; criação não substitui previsão.
4. Ganhos/perdas/conversão usam closed_at [from,to); contagem de criados usa
   created_at. Conversão = won/(won+lost) dos encerrados da janela; sem encerrados
   retorna null. Não incluir abertos no denominador.
5. Agrupar sempre por currency; ausência de moeda, valor ou probabilidade é
   incompletude, nunca BRL/zero silencioso. Zero informado é válido.
6. Um read model RPC SECURITY INVOKER, organização explícita, sessão/membership
   e piso agent como métricas atuais; RLS decide rows, manager configura etapas.
   Sem service role para leitura. Filtros pipeline, owner e source com Zod.
7. Acrescentar leitura comercial à tela Desempenho, preservar relatórios de
   atendimento/atividade. Tabelas textuais por moeda/etapa/origem dispensam
   biblioteca nova, dashboard paralelo e agregação financeira enganosa.

## Gaps antes do código

Não há forecast atual nem contrato monetário agregado seguro. Probabilidade,
read model completo, UI de incompletude e provas de matemática/RLS são o escopo E.
Funil histórico Pedidos/Pago e marca pública upstream continuam P2 fora do escopo.
SQL de leitura deve limitar janela e validar datas; crescimento do histórico
exige medir plano/índices, sem materialized view/Redis prematuros.
