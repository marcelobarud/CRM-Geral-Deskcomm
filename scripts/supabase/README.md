# Geral 1 — execução com credenciais em memória

Execute no PowerShell, na raiz do CRM Geral:

```powershell
.\scripts\supabase\start-geral-1.ps1
```

O modo padrão `Verify` solicita a chave de servidor e a chave pública do **Geral 1** com entrada oculta. Se já estiverem presentes no processo, usa as variáveis existentes. Nunca cole chaves no chat nem passe valores como argumentos do comando. O destino é fixo; o adapter local fica desligado. Não é criado arquivo de credenciais. As variáveis anteriores do terminal são restauradas ao terminar.

Use `-Prompt` para solicitar novamente ambas as chaves, mesmo quando existirem variáveis anteriores no terminal. Uma recusa 401 no check `chave de servidor/projeto` ocorre antes da criação das fixtures: confira que o primeiro campo recebeu a chave **secret/service_role** do Geral 1, e o segundo recebeu a chave pública **publishable/anon** desse mesmo projeto.

A homologação cria organizações e usuários fictícios exclusivos desta execução, verifica Auth, RLS/RBAC, RPC, capabilities, Storage, Realtime e o app em Chrome. Não envia convites ou e-mails de confirmação. Ao final, tenta remover apenas as fixtures identificadas pela execução, revogar suas sessões e encerrar o servidor filho. Uma falha de limpeza reprova a execução e deixa os IDs próprios no relatório para investigação; não autoriza limpar outros dados.

Resultados sanitizados e capturas ficam em `.local-dev/d2/`, ignorado pelo Git. Não são gravados HAR, trace, sessão do navegador, senha, token, segredo TOTP ou saída bruta do servidor. O relatório `result.json` contém etapa, último check, código de erro restrito e resultado de limpeza. A execução exige Node do projeto, dependências instaladas, Chrome e porta 3002 livre. Outro `next dev` no mesmo checkout também pode disputar o lock do Next; encerre sua própria execução antes de iniciar a homologação.

Para abrir o app usando o mesmo mecanismo de entrada oculta:

```powershell
.\scripts\supabase\start-geral-1.ps1 -Mode Run
```

Esse modo usa a porta 3000 e permanece ativo até ser encerrado no terminal. O comando comum `pnpm dev` continua dependendo da configuração do ambiente; o iniciador não altera `.env*`. A existência do iniciador não equivale à homologação aprovada: consulte os relatórios D2 e o resultado efetivamente produzido.
