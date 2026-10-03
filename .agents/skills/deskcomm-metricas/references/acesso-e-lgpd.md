# Como chegar no dado — e o que pode sair dele

## Onde o dado mora e como obter acesso

Identifique o alvo sem ler valores de `.env`: local PostgreSQL do CRM Geral ou distribuição Supabase original. Session pooler é receita do ambiente Supabase descrito, não regra universal. A role da aplicação pode enxergar várias organizações: consultas sempre filtram `organization_id`, somente agregados e sem SELECT * com dados pessoais.

Use conexão já provisionada e autorizada. Confira presença de configuração com saída booleana/mascarada; não extraia credenciais por grep, não imprima URI nem coloque senha em argumentos, chat, logs ou histórico. A ferramenta de conexão consome o segredo por mecanismo seguro do ambiente, sem retorná-lo ao modelo. Se esse acesso não existir, peça provisionamento seguro do acesso mínimo; não peça que a pessoa cole credenciais no chat.

Prefira acesso somente leitura e transação read-only. Não crie roles nem conceda bypassrls como parte de uma análise; isso é mudança de privilégio separada, que exige autorização e avaliação do administrador. Confirme a organização e o período antes das consultas. Um token MCP com escopo de leitura pode oferecer listas agregadas, mas rotas de contato/conversa podem devolver dados pessoais; não as use para métricas.

Nunca peça SUPABASE_SERVICE_ROLE_KEY ou token pessoal do Supabase para analisar. Acesso já autorizado não significa permissão para escrever no banco.

## O que pode ir para o modelo (a fronteira da LGPD nativa)

A anonimização do produto apaga nome, telefone, e-mail, CPF, corpo de mensagem, notas, título do
lead, campos personalizados, mídia — e **preserva** ids, datas, estados, valores e contagens. Essa
é a linha: **o que a anonimização preserva pode ser agregado e analisado; o que ela apaga não sai
do banco**.

| pode | não pode |
|---|---|
| contagens, medianas, percentis, taxas | `messages.body`, `lead_checkpoints.*`, notas, rascunhos de resposta |
| `direction`, `sent_via`, `status`, `stage`, `outcome`, `purpose`, `vetoed_gate` | `contacts.*` (nome, telefone, e-mail, consentimento cru) |
| `value_cents`, `cost_cents`, tokens, latência | `crm_leads.title`, `lost_reason` em texto livre (trate como categoria: cruze com a lista de motivos do funil; o resto vira "outro") |
| `crm_leads.source`, nome de funil/etapa/agente/fluxo | `contact_phone` da consulta de atividades (o relatório de atividades devolve telefone nos itens — use só os totais) |

Contatos anonimizados **continuam nos contadores** (contar é aceitável; nomear não). Não há escopo
de consentimento para "análise por modelo externo" no produto — logo, agregado é o único caminho
defensável. Se a pessoa pedir "lê as conversas e me diz o que está errado", é o guia
`deskcomm-prompt`, com amostra mínima e ciência dela.

## Higiene da sessão

Consultas sem credenciais no local autorizado; relatório só com agregados e régua explícita, sem dump. Não grave connection string em arquivo intermediário nem exporte seu valor em comandos visíveis. Encerre conexão e remova apenas temporários criados nesta tarefa, preservando arquivos e configurações alheios.
