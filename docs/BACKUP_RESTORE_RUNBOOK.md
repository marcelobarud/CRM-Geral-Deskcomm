# Runbook de backup e restore — CRM Geral

**Estado Fase I.1: desenho implementado, execução não homologada.** Docker/psql não estão disponíveis neste ambiente e nenhum backup/restore foi executado. O Geral 1 é staging ativo e não pode ser destino de restore. Até um ensaio isolado passar, backup/restore permanecem bloqueadores P1 e a recomendação é NO-GO.

## O que o pacote inclui

`hostgator-setup-kit/backup.sh` exige `BACKUP_DIR` absoluto fora do checkout. Cada execução grava num diretório temporário e só o publica ao final, com checksum SHA-256 do pacote. A operação falha se a exportação de qualquer componente ou a releitura dos checksums falhar. O diretório padrão dentro da VPS foi removido; o operador deve apontar um mount/destino externo e criptografado.

O pacote contém:

- dump PostgreSQL no formato custom, com dados dos schemas `public`, `private` e `auth`; sessões e tabelas transitórias de refresh/challenge/flow são excluídas;
- a `baseline.sql` e o `MANIFEST.md` presentes no checkout usado;
- inventário/configuração dos buckets e bytes de cada objeto no Storage JSONL, com path, MIME, cache-control, metadados e SHA-256 por objeto;
- versão do app, commit, versão do schema e refs das imagens sem valores de configuração;
- `waha-data.tar.gz` somente quando `BACKUP_WAHA_DATA=1` for pedido; inclui estado sensível de sessão e exige destino protegido.

O arquivo não copia `.env`, service-role key, connection strings ou tokens. A recuperação precisa de configuração separada em vault: secrets do runtime, project/API keys, Auth URLs/providers, SMTP/OAuth, DNS e serviços externos. Sessões Auth são excluídas; os usuários precisam autenticar novamente. A compatibilidade de hashes de senha, MFA e Auth entre projetos ainda não foi provada. Não declare recuperação completa de Auth.

## Criar e conferir um backup

1. Defina `BACKUP_DIR` para um destino externo ao checkout, com criptografia em repouso e acesso controlado. Em produção, replique o bundle para storage offsite; o script não criptografa o conteúdo por conta própria.
2. Rode `bash hostgator-setup-kit/backup.sh` no diretório da instalação, com Docker/Compose funcionais e com a imagem do app contendo `scripts/storage-archive.mjs`.
3. Confirme o caminho final impresso, o exit code zero e o arquivo `SHA256SUMS`. Rode `sha256sum --check SHA256SUMS` depois de copiar o bundle para o destino externo.
4. Se o volume WAHA fizer parte da política aprovada, repita com `BACKUP_WAHA_DATA=1`; o volume contém estado de sessão e não deve ser aberto nem incluído em artefato de teste.
5. Registre RPO/RTO, retenção, criptografia, localização e responsável. Não configure cron antes de validar espaço, rotação e cópia offsite.

O atualizador chama este backup antes de mudar código ou banco e para se ele falhar. `--skip-backup` é uma exceção explícita; não substitui um pacote recente verificado.

## Restore isolado

`hostgator-setup-kit/restore.sh <bundle>` é intencionalmente explícito e destrutivo **somente para o alvo declarado**. Antes de escrever, valida os checksums, exige URL/ref/chave service-role/DB URL separados, recusa Geral 1 e a origem, confere que a URL, ref e conexão PostgreSQL identificam o mesmo projeto, exige organização/Auth/Storage vazios e pede que o operador digite a referência exata. A credencial do Storage trafega por stdin, não por argumentos nem por log. Nunca forneça os valores do projeto de origem.

O procedimento aplica a baseline capturada, restaura os dados customizados/Auth, depois recria buckets e faz upload/verificação SHA-256 dos objetos. Se qualquer etapa falhar, o alvo pode ficar parcialmente preenchido: descarte o projeto descartável e recomece com outro destino vazio. Não aponte para uma instalação ativa. O restore não restaura secrets, Auth provider configuration, JWT/API keys, sessões ou configuração externa.

Após o script terminar, ainda é obrigatório provar, no destino isolado:

- schema/invariants, organizations, membership/admin e usuários Auth;
- RLS real com tenant A/B, anon, viewer, agent e admin, mais MFA aplicável;
- bucket/path/contagem/hash, incluindo PDF sintético de proposta e logo sintético;
- ligação proposal version → object path → bytes/hash;
- login, health, worker/scheduler e jornada comercial sem provider/contato real.

Um teste unitário com Storage em memória cobre bytes sintéticos de PDF/logo e recusa de destinos conhecidos; ele não substitui restore Supabase real. Nenhum cenário A/B ou RLS após restore foi executado nesta Fase I.1.

## Limites e fontes

- Backup lógico do banco não contém os bytes de Storage; consulte [Database Backups do Supabase](https://supabase.com/docs/guides/platform/backups).
- Clonagem de projeto também não substitui cópia de Storage, Auth settings, chaves, Realtime ou Edge Functions; consulte [Clone project](https://supabase.com/docs/guides/platform/clone-project).
- `scripts/backup-db.sh` continua sendo ferramenta local de regressão para schema `public`, não backup comercial.
- Instalação/restore clean, compatibilidade dos dumps Auth/managed schema, volume WAHA e checks RLS pós-restore seguem **NOT TESTED**. Não usar Geral 1 como alvo de ensaio.
