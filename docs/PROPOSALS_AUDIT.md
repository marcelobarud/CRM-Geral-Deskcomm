# CRM Geral — auditoria do Bloco F

Base confirmada: main d5468f80a940c2c3f7fc3a54157123edf57ae1c5,
integrada e publicada no fork; branch local bloco-f-propostas. Auditoria anterior
ao código. Autoridade: AGENTS/CLAUDE, PRODUCT_MODEL_AND_FUNCTIONAL_ROADMAP §13,
UPSTREAM_FUNCTIONAL_SELECTION §10 e decisão 6A, CONFIGURABLE_FOUNDATION,
COMMERCIAL_JOURNEY, B2B_SIMPLE, REPORTING_FORECAST e SUPABASE_D2_IMPLEMENTATION.

## Inventário confirmado

- Não existe módulo comercial de propostas no checkout: proposal no baseline
  e rotas refere-se a sugestões de dados de contato, leads e ajustes de IA;
  ai_budgets é orçamento de uso LLM. Não reutilizar essas identidades.
- crm_leads já relaciona oportunidade/contato; contacts.company_id deriva
  empresa. Atividades em crm_lead_activities alimentam timeline existente.
- catalog_products (0204) possui nome/descricao/preco_cents/moeda, organização,
  ativo e RLS. Catálogo é opcional: item livre mantém o CRM genérico. Item copia
  descrição/preço; versão preserva snapshot, nunca recalcula por produto atual.
- @react-pdf/renderer já está instalado; lib/lgpd/pdf-renderer.tsx demonstra
  renderToBuffer. Reutilizar engine, não template jurídico/controlador LGPD.
- Storage existente atende mídia, conhecimento e LGPD, com outras finalidades.
  Documentos comerciais requerem bucket privado dedicado e caminho por versão.
- Fundação Configurável registra somente message_templates; setter SQL também
  tem allowlist. Expandir ambos, mantendo configuração versionada e desligamento
  que preserva histórico. Autorização não é concedida pela flag.
- Idempotency ledger existente permite recibos por organização/ator/endpoint.
  Locks e recibos no banco devem impedir criação/envio duplicados por retry.
- Upstream congelado bb20342d6aacdf762201bd48d0da6809b7d9cb6d possui
  lib/propostas com assistente, briefing, revisão, transporte e PDF. Seu storage
  grava org/proposta.pdf com upsert e URL de sete dias: inadequado para versões
  imutáveis. Nenhum módulo inteiro será importado.
- MCP/IA existentes tratam outros tipos de sugestões; nenhuma tool comercial
  será adicionada. Email/WhatsApp/cron não receberão efeitos de Propostas.

## Desenho do recorte (inferido da implementação necessária)

Proposta com identidade estável e oportunidade opcional; contato direto somente
sem oportunidade. Empresa derivada. Rascunho editável com itens livres ou cópia
do catálogo e texto simples; templates independentes depois de aplicados.
Quantidade decimal exata, dinheiro em cents, moeda única, sem desconto/fiscal.
Versões numeradas imutáveis contêm contexto, itens, textos, autoria, marca e total.
PDF nasce de snapshot específico, não do cadastro atual. Preparação da versão,
upload sem sobrescrita e confirmação do registro de envio são etapas distintas;
falha permite retry, nunca sent sem PDF confirmado. Registro não envia mensagens.
Histórico autorizado e PDF enviado permanecem acessíveis com módulo desligado.
Storage indisponível deve produzir estado de prontidão explícito e retry.
Agent opera propostas; manager administra templates; viewer não acessa documentos
comerciais deste módulo. Reusar RBAC, MFA e suporte vigentes, não outro sistema.
RLS, FKs por organização e bloqueio de update/delete em versões finalizadas são
obrigatórios, inclusive diante de escrita privilegiada fora dos handlers.

## Verificação planejada

Tripla nova após 0255, aplicação/reaplicação Geral 1, tipos gerados; provas reais
A/B, capability, RBAC, Storage privado, retry/idempotência, snapshot e PDF v1/v2,
mudança de contexto, desktop/mobile e teclado. Sem assinatura, financeiro, IA,
tracking, validade automática ou transporte externo; forecast permanece intacto.
Fonte técnica consultada: https://supabase.com/docs/guides/storage/security/access-control.
