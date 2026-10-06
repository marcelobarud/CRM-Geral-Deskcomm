# Runbook de atualização — CRM Geral

**Estado Fase I.1: controles corrigidos no código; update com dados permanece NOT TESTED. NO-GO para liberar update comercial.** Não executar contra Geral 1 nem produção para provar o procedimento. Não há release `stable` publicada no fork para instalar.

## Fonte e pré-condições

- `origin` deve ser `https://github.com/marcelobarud/CRM-Geral-Deskcomm.git` ou override explícito autorizado por `CRM_GERAL_REPO_URL`/`REPO_URL`; `update.sh` recusa origem diferente antes de backup, fetch ou escrita.
- Release alvo deve estar publicada e as imagens app/worker/scheduler devem ter o mesmo número, commit e schema. Não usar `latest` comercialmente.
- Ter backup recente em destino externo criptografado e confirmar checksums/cópia legível; `BACKUP_DIR` deve estar configurado fora do checkout. O script automático aborta antes de alterar código/schema se o backup falhar. `--skip-backup` exige decisão e backup alternativo explícitos.
- Verificar janela, compatibilidade schema/app, migrations, configuração/Auth/integrações e espaço. Baseline é a aplicação consolidada usada pelo kit; `db:migrate` foi removido por ser placeholder. `db:reset` é fluxo local de desenvolvimento, não install/update.

## Sequência do updater

O `hostgator-setup-kit/update.sh` valida repositório/alvo, cria backup, troca checkout, habilita extensões, reaplica a baseline pelo cliente PostgreSQL efêmero com credencial recebida via stdin, interrompe diante de erro inesperado, então atualiza refs das imagens e executa health check/automação. Cada etapa e a compatibilidade de dados ainda precisam ser provadas por harness histórico antes de uso comercial.

Reaplicar baseline sobre banco existente ainda tolera somente erros reconhecidos como “já existe” e equivalentes. Erro inesperado agora interrompe o fluxo antes de atualizar imagens; o estado do schema precisa ser inspecionado antes de retomar. Falha depois de parte do DDL pode exigir correção forward. Voltar imagem não desfaz migration nem dados.

## Homologação obrigatória antes de release

1. Preparar uma origem realista anterior e fixada por commit/schema (pós-F/G ou posterior), em banco descartável.
2. Carregar somente fixtures sintéticas que cubram organização/admin, contatos, empresas, tags, oportunidades/stages, tarefas/agenda, proposal/PDF, script/session, automação e campanha se o schema de origem suportar.
3. Rodar o updater real com a release candidata e registrar backup, versão, refs das imagens, saída sanitizada e checksums.
4. Comparar IDs, relações, valores, capabilities, timeline, proposal metadata/bytes, referências de automação/script/campanha e contagens antes/depois.
5. Executar RLS tenant A/B, anon/viewer/admin/MFA, Auth, Storage, health, worker e scheduler; conferir logs/audit/filas. Nenhum provider real.
6. Restaurar o bundle em outro destino isolado e validar o fluxo após restore antes de aprovar rollback/recuperação.

O harness `scripts/test-update-com-dados.sh` requer Docker e contém cenário sintético limitado; não cobre por si só estado A–H pós-F/G. O ledger remoto do Geral 1 e os 258 SQLs locais têm identidade/timestamps diferentes; não fabricar mapeamento 1:1 nem rodar `db push` como experimento. A estratégia futura deve manter baseline consolidada + migrations versionadas/MANIFEST e reconciliar ledger num destino descartável.

## Resultado desta Fase I.1

- Guard de fork/origin: implementado e teste shell preparado.
- Backup antes do update e falha fechada: implementado; execução real indisponível sem Docker.
- Origem anterior + fixtures completos + preservação/IDs: **NOT TESTED**.
- Schema drift/compatibilidade após update: **NOT TESTED**.
- Rollback de app/database/Storage em projeto isolado: **NOT TESTED**.
