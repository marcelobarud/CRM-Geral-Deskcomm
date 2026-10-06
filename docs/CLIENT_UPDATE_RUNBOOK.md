# Runbook de atualização — CRM Geral

Estado: o kit contém uma sequência de update, mas ela não está homologada para este fork. Não executar em Geral 1 nem em produção para “provar” o procedimento.

## Gaps que bloqueiam liberação

- Repo e imagens padrão do kit ainda apontam para o upstream.
- O ledger Geral 1 tem 49 linhas e aliases/timestamps diferentes dos 257 arquivos locais. Correspondência por feature existe, mas não 1:1.
- db:reset não é install limpo suportado; a cadeia histórica falha do zero. db:migrate é placeholder.
- test-update-com-dados.sh exige Docker e usa seed sintético limitado; não prova update histórico pós-F/G com dados A–H.
- Não há prova de preservação integrada, downtime ou restore. Voltar imagem não desfaz DDL/dados.

## Gate por release

1. Confirmar cliente, domínio, VPS, projeto, versão/commit atual e alvo.
2. Revisar migration e compatibilidade app/schema; migrations destrutivas exigem plano e restauração comprovados.
3. Ter backup recente do banco, bytes de Storage e volumes necessários, em destino cifrado externo; provar legibilidade e restore isolado.
4. Comparar baseline, migrations, MANIFEST e ledger do projeto. Bloquear divergência de identidade até resolver.
5. Passar typecheck, lint, build, testes unitários/invariantes e harness install/update em ambiente isolado.
6. Confirmar imagens imutáveis do fork para app/worker/scheduler, fixadas à mesma versão.
7. Marcar janela de manutenção. Zero downtime não foi demonstrado.

## Sequência observada no kit depois de homologado

O update.sh atual executa backup, validação de versão, checkout da release, reaplica baseline via URL administrativa, puxa imagens, recria serviços, faz health check e confere automações. Usar somente depois de alinhar ao fork e provar ordem/compatibilidade.

Para cada update: pausar escrita se necessário; criar os backups; registrar checksums; implantar artefatos fixados; aplicar schema na ordem validada; testar app, Auth, tenant isolation, capabilities, health, worker, scheduler e smoke sintético; conferir logs/audit/filas; registrar resultado e limitações.

## Falha e rollback

Falha antes de DDL: voltar pin de imagem pode ser suficiente. Falha depois de DDL: não supor que rollback de imagem recupera banco; manter escrita suspensa se houver risco, diagnosticar compatibilidade e decidir correção forward ou recuperação. Se restaurar, fazer em projeto isolado com banco e Storage; restaurar direto do script atual pode sobrescrever o banco da conexão configurada. Registrar versão, etapa, horário, erro sanitizado, impacto e decisão operacional.
