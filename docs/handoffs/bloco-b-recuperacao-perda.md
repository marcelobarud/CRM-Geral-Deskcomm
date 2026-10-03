# Bloco B — confirmação de perda e recuperação da homologação

Data: 2026-10-03. Projeto: Supabase Geral 1. Branch: `bloco-b-jornada-comercial-base`.

## Causa confirmada

Os diálogos de edição e perda são portais React descendentes do card. O clique no motivo da perda propagava até `KanbanCard` e abria o dossiê sobre a confirmação. Retirar `?lead=` antes de abrir o menu não corrigia esse segundo clique.

O card agora ignora cliques originados fora de seu elemento DOM. Clicar no card continua abrindo o dossiê; a seleção com modificador continua disponível. A regra de ganho/perda e a persistência permanecem as existentes.

O teste `KanbanCard.portal.test.tsx` passou com a correção e reprovou, de forma controlada, quando a proteção foi retirada. O código corrigido foi restaurado imediatamente. Os 18 testes focados de card, contexto comercial, tarefas, valores, rótulos e encerramento passaram; typecheck passou.

## Recuperação restrita das fixtures

A execução `3413538d-2bee-48d9-a1db-211481c7bb2e` terminou por rejeição não tratada de `waitForResponse`. Seu relatório final não foi gravado; o arquivo anterior não comprovava a limpeza dessa tentativa.

O inventário confirmou duas organizações com marcador e slugs dessa execução, quatro usuários Auth com identidade fictícia da execução, seis sessões e nenhum objeto Storage. A recuperação transacional conferiu quantidade, marcador, identidade fictícia e ausência de memberships externas antes de remover sessões, organizações e usuários. A consulta posterior confirmou zero organizações, usuários e objetos Storage restantes; a transação confirmou zero sessões restantes. Nenhuma credencial foi lida, impressa ou persistida.

## Proteção do teste

A espera da resposta e o clique de confirmação são tratados conjuntamente por `Promise.all`, permitindo que erros cheguem ao `finally` de limpeza. O teste exige um único diálogo após selecionar o motivo e confirmação habilitada antes de enviar a operação. A execução grava um resultado inicial e um diário com apenas IDs de fixtures próprias; o resultado final registra a limpeza. Erros de tempo do navegador recebem categoria sanitizada.

## Conclusão da homologação

Execução `3bfec33a-e022-475e-8a6a-a1c6cd32e021`, concluída em
2026-10-03 às 12:52:34 (America/Sao_Paulo): `passed=true` e
`fixtures_cleaned=true`. A suíte Commercial confirmou ganho/perda pela tela,
histórico e MFA. A consulta posterior confirmou ausência de organizações,
usuários e arquivos das duas execuções mencionadas neste registro.
