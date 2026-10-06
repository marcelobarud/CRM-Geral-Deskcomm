# Runbook de backup e restore — CRM Geral

**Não homologado nesta Fase I:** nenhum backup/restore isolado foi executado. Este documento registra cobertura e procedimento seguro pretendido, não uma prova de recuperação.

## Cobertura atual

| Mecanismo | Cobertura | Cadência/retenção | Lacunas |
|---|---|---|---|
| hostgator-setup-kit/backup.sh | dump PostgreSQL e volume waha-data | comentário recomenda cron diário às 03:00; mantém 14 arquivos por tipo | não guarda bytes do Storage; destino padrão na mesma VPS; role pode produzir backup parcial; não executado aqui |
| scripts/backup-db.sh | dump do schema public | 14 dias por padrão | sem Storage, Auth gerenciado, volume WAHA ou configuração externa |
| Backup gerenciado Supabase | plano/configuração não conferidos para Geral 1 | não confirmado | bytes de Storage ficam fora do backup do banco |

Geral 1 tem seis buckets: ai-policy, brand-logos, lgpd-exports, proposal-documents, skill-assets e whatsapp-media; todos tinham zero objetos na consulta. A documentação oficial explica que backup de banco não inclui binários de Storage: [Database Backups](https://supabase.com/docs/guides/platform/backups). Clonar para projeto novo também exige reconfigurar Storage, Auth, Realtime e opções: [Restore to a new project](https://supabase.com/docs/guides/platform/clone-project).

## Política a aprovar

Definir RPO/RTO, cadência, retenção, criptografia, acesso, destino offsite e responsável. Separar banco, objetos Storage, volumes de canal usados, configuração não secreta e secrets em vault. Salvar versão/schema, timestamp, tamanho e checksum; não salvar strings de conexão, tokens ou dados reais no Git.

## Execução do backup após aprovação

1. Criar janela e limitar operações destrutivas.
2. Gerar dump lógico com versão/role compatíveis; confirmar exit code, tamanho e checksum.
3. Exportar bytes de cada bucket preservando bucket/path e metadados necessários; não substituir arquivo por URL assinada.
4. Salvar volumes persistentes necessários ao canal usado pelo cliente.
5. Copiar artefatos cifrados para destino externo, aplicar retenção aprovada e verificar leitura.
6. Registrar projeto, release e configuração requerida sem valores secretos.

## Restore em isolamento

1. Criar novo projeto/ambiente descartável compatível e confirmar que o destino não é Geral 1 nem a instalação ativa.
2. Restaurar o banco vazio e reconfigurar extensions, roles/senhas customizadas, Auth URLs/providers, buckets/policies, Realtime e functions.
3. Restaurar bytes de Storage e conferir contagens/checksums; recuperar volumes de canal apenas se necessário.
4. Validar organizações, usuários/relacionamentos autorizados, contatos, empresas, oportunidades, tags, tarefas, propostas, automações, campanhas, FKs, RLS, roles, MFA e referências a arquivos.
5. Rodar testes A/B e anon/viewer/admin, medir downtime e registrar limitações antes de decidir qualquer cutover.

hostgator-setup-kit/restore.sh confirma e restaura na conexão que está configurada; não usar como rollback automático nem contra Geral 1. Auth gerenciado, sessões, metadata de Storage, bytes de Storage, configuração do projeto, secrets e release são componentes separados. Não prometer recuperação de Auth ou sessões sem teste do caminho adotado.
