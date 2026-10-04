# Geral 1 — execução com credenciais em memória

Execute no PowerShell, na raiz do CRM Geral:

```powershell
.\scripts\supabase\start-geral-1.ps1
```

O modo padrão `Verify` solicita a chave de servidor e a chave pública do **Geral 1** com entrada oculta. Se já estiverem presentes no processo, usa as variáveis existentes. Nunca cole chaves no chat nem passe valores como argumentos do comando. O destino é fixo; o adapter local fica desligado. Não é criado arquivo de credenciais. As variáveis anteriores do terminal são restauradas ao terminar.

Use `-Prompt` para solicitar novamente ambas as chaves, mesmo quando existirem variáveis anteriores no terminal. Uma recusa 401 no check `chave de servidor/projeto` ocorre antes da criação das fixtures: confira que o primeiro campo recebeu a chave **secret/service_role** do Geral 1, e o segundo recebeu a chave pública **publishable/anon** desse mesmo projeto.

A homologação cria organizações e usuários fictícios exclusivos desta execução, verifica Auth, RLS/RBAC, RPC, capabilities, Storage, Realtime e o app em Chrome. Não envia convites ou e-mails de confirmação. Ao final, tenta remover apenas as fixtures identificadas pela execução, revogar suas sessões e encerrar o servidor filho. Uma falha de limpeza reprova a execução e deixa os IDs próprios no relatório para investigação; não autoriza limpar outros dados.

Resultados sanitizados e capturas ficam em `.local-dev/d2/`, ignorado pelo Git. Não são gravados HAR, trace, sessão do navegador, senha, token, segredo TOTP ou saída bruta do servidor. O relatório `result.json` contém etapa, último check, código de erro restrito e resultado de limpeza. A execução exige Node do projeto, dependências instaladas, Chrome e porta 3002 livre. Outro `next dev` no mesmo checkout também pode disputar o lock do Next; encerre sua própria execução antes de iniciar a homologação.

Para homologar também a jornada comercial do Bloco B:

```powershell
.\scripts\supabase\start-geral-1.ps1 -Prompt -Suite Commercial
```

`Commercial` executa a D2 e os testes de contato, relacionamento em preparação
com tarefa humana, oportunidade, responsável, origem/moeda/centavos, próxima
tarefa, agenda interna, ganho/perda e histórico. Usa JWT reais A/B, viewer,
agent, anon e service role para testar referências comerciais. Resultados e
capturas ficam em `.local-dev/bloco-b/`; a limpeza segue os mesmos IDs exclusivos.
Sem `-Suite Commercial`, o comando executa somente a D2.

Para abrir o app usando o mesmo mecanismo de entrada oculta:

```powershell
.\scripts\supabase\start-geral-1.ps1 -Mode Run
```

Esse modo usa a porta 3000 e permanece ativo até ser encerrado no terminal. O comando comum `pnpm dev` continua dependendo da configuração do ambiente; o iniciador não altera `.env*`. A existência do iniciador não equivale à homologação aprovada: consulte os relatórios D2 e o resultado efetivamente produzido.

## Bloco G: sessão automática segura

Execute `./scripts/supabase/start-geral-1.ps1 -Prompt -Suite Automations -Mode AgentLoop`. As chaves são recebidas de forma oculta e permanecem na memória do terminal por até 60 minutos. Mantenha-o aberto durante a homologação; Ctrl+C encerra a sessão. O agente pode solicitar apenas execução da suíte fixa ou encerramento, sem fornecer comandos arbitrários. Resultados sanitizados e capturas fictícias ficam em `.local-dev/bloco-g/`, ignorado pelo Git. A suíte reutiliza D2 e testa regras/tags, roteiro de três passos, falha e retomada, edição com snapshot, desktop/mobile, JWT A/B e MFA. Não valida instalação limpa/update da distribuição.
