# Bloco A — auditoria da fundação configurável

Base CONFIRMADA: `main` e `origin/main` em `b4532f56fc80559a56a58e92094afca99e0e6e08`, Fase 2.5 integrada por fast-forward. Inspeção estática em 03/10/2026; não é auditoria integral do upstream. Autoridades: AGENTS/CLAUDE e relatórios 2.3, 2.4 e 2.5. A auditoria 2.1 permanece não rastreada e preservada.

## O que existe e o que reaproveitar

| Mecanismo | Evidência | Proteção / reutilização |
|---|---|---|
| Configuração da organização | `organizations.settings`; settings/routing, agenda, branding e actions/settings | JSONB compartilhado; reutilizar namespace próprio com atualização atômica para não sobrescrever donos irmãos |
| Permissões | `lib/auth/require-role.ts`, `lib/auth/types.ts`, RLS e suporte | JWT validado, organização ativa de fonte confiável, papel do banco e MFA; preservar como autorização independente |
| Configuração de instalação | `platform_branding`, `lib/branding/instalacao.ts`, env e distribuição | Marca e credenciais não são flags; release define suporte instalado. Não criar catálogo global de flags sem caso real |
| Navegação | `lib/navigation/catalogo.ts`, `registry.ts`, `interface.ts` | Registro único; interface por vínculo é apresentação, explicitamente não autorização; adicionar projeção de capacidade sem substituir RBAC |
| Capacidades de canais | `lib/channels/capabilities.ts` | Contrato técnico de transporte/provider, não habilitação de módulo comercial |
| IA e tools | `lib/ai/pontos/capacidade-em-vigor.ts`, `lib/mcp/tools/{catalogo-servido,selecao-por-pacote}.ts` | Binding/prontidão e escolha de ferramentas por agente; não equivalem a flag organizacional. Manter seleção e guards existentes |
| Auditoria | `lib/audit/index.ts`, `actions.ts`, painel `/admin/audit` | Reusar código rastreável para mudança administrativa; não emitir evento sem consumidor |
| Eventos/workers | `lib/event-log/{dispatcher,drain,register-handlers}.ts`, `workers/`, crons | Consumidores identificados, retries/dedupe e drivers existentes; guard futuro deve reler antes de efeito, sem segundo scheduler |
| Cache | Marca possui TTL de processo; templates usam React Query com 60s | Não reutilizar memo da marca para flags; leitura backend fresca, invalidação e atualização client delimitadas |
| Respostas rápidas | API message-templates; `lib/operacao/` para listar/preencher; MCP operacao; hook e composer | Recurso existente sem serviço externo obrigatório. Prova cobre mutações, uso no composer/MCP, consulta histórica e navegação |

## Duplicações e ausências

CONFIRMADO pela inspeção: há vários campos `enabled` de recursos específicos (regras, integrações, agentes), sem contrato genérico de capacidade de produto. Unificá-los indiscriminadamente mudaria regras existentes. Interface simplificada/ocultar destinos é apenas UI; os endpoints continuam com autorização própria.

Não foram encontrados módulos locais equivalentes aos novos recortes upstream de propostas, campanhas, entidade Pessoa/empresa completa, Jev ou catálogo público de extensões nos caminhos de produto analisados. O relatório 2.3 descreve recursos do SHA upstream congelado, não sua disponibilidade no checkout. Não registrar todos esses nomes como suportados pela release.

## Desenho orientador

PROPOSTA para implementação nesta fase: registry client-safe com apenas `message_templates`; configuração canônica em `organizations.settings.capabilities`, versão de formato e revisão; escrita admin atômica por RPC autenticada, com MFA e suporte, preservando outras settings. Ausência mantém a capacidade existente ligada; desconhecida/versão inválida falha fechada. Separar suporte, habilitação, autorização e prontidão, inclusive estados de degradação.

Backend lê organização confiável sem cache e aplica guard em cada porta de uso/mutação. RLS deve bloquear mutações diretas quando desligada, preservando SELECT histórico. Consulta de histórico explicitamente autorizada é diferente de usar resposta pronta para preparar uma ação. Frontend consome read model único e não recebe segredos. Runtime futuro usa guard com organização do evento/job e rechecagem próxima ao efeito; nenhum worker fictício em produção.

## Riscos e limites

Flag só no menu é insuficiente; escrita read-modify-write pode perder configuração concorrente; cache ou job em voo pode agir após desativação; MCP/service role precisa de organização explícita; configuração malformada não pode habilitar por acidente; desligamento não pode apagar histórico. Sem transação/lock abrangendo um efeito remoto não há promessa de cancelamento retroativo ou atomicidade entre banco e envio.

Não desligar agenda, Inbox, IA, automação ou canal por default. Não adicionar Redis, novas integrações, D2/cloud ou recursos dos blocos B–H. Migrations seguem tripla e banco local real; UI exige evidência nas duas dimensões pedidas. Test doubles de worker validam o contrato da fundação, não certificam campanhas futuras.
