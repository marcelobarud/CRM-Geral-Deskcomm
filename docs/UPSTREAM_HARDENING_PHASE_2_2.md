# Fase 2.2 — hardening seletivo do upstream

## Base e método

- Branch inicial: `fase-2-postgres-local-runtime`.
- HEAD inicial confirmado: `5b9e7a45ac5be6a6b70b52f74c6203165bb0bf15`.
- Branch de trabalho: `fase-2-2-hardening-upstream`.
- Upstream congelado: `bb20342d6aacdf762201bd48d0da6809b7d9cb6d`.
- Baseline da comparação upstream: `61a65b3894d5ba2e0a41398705503a81e31dbc16`.
- Referência: `DESKCOMM_UPSTREAM_AUDIT.md`, preexistente, preservada fora dos commits.
- Não houve merge, rebase, atualização geral, importação de módulos nem instalação de dependências. As correções foram adaptadas individualmente.

`CONFIRMADO` neste relatório significa observado no código, no catálogo do banco ou em execução. Limitações e inferências são identificadas separadamente. Auth local, PostgreSQL, adaptadores REST/RPC, seed e os mecanismos de futura distribuição Supabase foram preservados.

## Correções e origem

| Correção | Referência upstream estudada | Implementação local e diferença | Prova |
|---|---|---|---|
| Exclusão transacional do contato | `0283ca4e0cfddc6e14179ef6c0ef9fe00738da0f`; final 0488 em `3a8eb07f6801bf3e6087e95c0f0a30da8edaa903` | `app/api/v1/contacts/_handler.ts`, `lib/audit/actions.ts`, migration 0237. Uma RPC invoker faz os três DELETEs; bloqueia a ficha primeiro; falha de FK ou recusa de DELETE pela RLS reverte todo o histórico. DELETE direto dos jobs internos continua proibido; cascade pode removê-los. Trata SQLSTATE 23503 e o 23001 observado na FK RESTRICT local. | Casos de sucesso, inexistência, outra organização, recusa de RLS, FK sintética e FK real de agenda. Bloqueio auditado sem sucesso falso. |
| Auditoria append-only | `7321b5cedc1989031e27ad43306840ae306e5793`, `60bea990f259d493937be8fa66c89229ba6230bd`, `0122faa0f6565f58ced177a683b45c9b5d056083` | Migration 0238 revoga UPDATE, DELETE e TRUNCATE de `api_audit_log`, inclusive do papel local `crm_geral_app`. INSERT e SELECT existentes preservados. Não revoga a função explícita de retenção nem os poderes do dono/DBA. | INSERT legítimo e tentativas reais de adulteração por authenticated, service_role e crm_geral_app. |
| RLS de fluxos e inscrições | `768c768593852774c3f3fb2d994f099e2bd39c4d` | 0238 substitui policies permissivas ALL por policies por operação em pointers/enrollments, usando a autorização manager+ já existente nas rotas. Guards de suporte existentes permanecem. | viewer, agent, manager, admin; duas organizações; INSERT, UPDATE e DELETE; troca de organization_id. |
| Eventos e versões de follow-up | `4961e6a87cfd5b1c84b7960e533394843f5e6851` | 0238: eventos são append-only para sessão humana; versões não permitem INSERT/UPDATE humano direto. Publicação interna existente permanece. DELETE de versão exige manager+. | Escrita humana proibida e isolamento entre organizações. |
| SSRF em mídia externa | `cbfe05eaa41aaafab0ebed6be47fcf8c9cc2b602` | `lib/messaging/media/url-de-midia-externa.ts`, `lib/automation/outbound-ip.ts`, `app/api/v1/messages/_handler.ts`. Reutiliza guard textual e resolução DNS antes de INSERT/envio. Canonicaliza IPv6; rejeita credenciais e redes especiais. Não abre exceção para Storage, ausente no runtime local. | URL pública, IP privado/metadata/loopback, IPv4 alternativo, IPv6 expandido/mapped, DNS misto/vazio e falha de resolução; handler não insere nem envia ao recusar URL. |
| Traversal e nomes ambíguos | `50916a868e5fe10203795260876513cf3ef9d4d1` | `lib/messaging/media/upload-validation.ts`: prefixo exato de organização/conversa e apenas um nome de arquivo; recusa separadores, percent-encoding, segmentos ambíguos, controles e formas Unicode normalizadas. Upload já gera nome UUID no servidor. | Caminho legítimo aceito; caminho de outra organização/conversa e variantes de traversal recusados. |
| LGPD no footprint existente | `802ea6dfca5bfe3a554ebddd9debcfb935eaff03`; 0414 em `e8e5252b81e1bbfde4252dbc088f70d5e79105cf`; 0494 em `d169ad4b3c7e81fea0339e280fb4e5502ae029f8`; 0497 em `816e59a6276e147c8e2c82aab57b648d527b023d` | 0239 adapta funções locais: anonimização da ficha chama a cascata canônica; mensagens/transcrições, notas, checkpoints, estado e argumentos/erros de execução são redigidos. Mantém guards locais de papel, MFA, suporte e escopo. Trigger impede retorno de transcrição em mensagem já redigida. Sem tabelas de módulos ausentes, nem backfill automático. | Anonimização canônica e formal, segunda chamada idempotente, transcrição tardia, fila de remoção de mídia e tenant B preservado. |
| Worker atrasado após LGPD | `4f4cb4991fbc65ef8e8b89a8d191d1e33b9b7f68` | `workers/media-derive-worker.ts`: UPDATE condicionado ao mesmo media_storage_path lido no começo, id e organização. Detecta zero linhas e erro de escrita. Evita a comparação de body com NULL que excluiria mensagens legítimas sem texto. | Corrida de redação e erro de escrita em teste de execução do worker; defesa adicional no banco. |
| Exportação correspondente à redação | Consequência da adaptação LGPD, conforme gate local `lgpd-exporta-o-que-redige` | `lib/lgpd/export-collector.ts` inclui transcrição e contexto pessoal das tabelas existentes, sempre com organization_id. Falha das novas consultas impede gerar export incompleto silenciosamente. Nenhuma marca adicionada ao PDF. | Gate local de tabelas redigidas/exportadas e typecheck. A coleta completa em operação real não foi exercitada com dados de clientes. |
| Segredo de cron | `ab58b20e5ab353673dfd2de2f5c12463092a4e81` | `lib/auth/cron-auth.ts`, cron routing-worker e data-retention. SHA-256 produz buffers fixos antes de timingSafeEqual; avalia ambos os segredos. Preserva fallback e os transportes específicos de cada rota. Falta de segredo fecha acesso. | Segredos válidos/inválidos/ausentes, comprimentos diferentes, x-cron-secret somente onde já aceito; verificação dos buffers e das duas comparações. |
| Sincronização da busca Inbox | `554aa650c591f5a7546452049dfd76553e60e06c` | `components/inbox/InboxFilters.tsx`: acompanha reset externo de value.search e evita que retorno do debounce sobrescreva a digitação atual. O componente local não possui o botão novo de limpar filtros do upstream. | Dois testes de componente; busca digitada e apagada na Inbox real. Reset externo é provado no harness controlado, não por um botão inexistente nesta base. |
| Seletor no cabeçalho móvel | `01424ab1e8227b6bd855da45677e38b209647163` | `components/shell/TenantSwitcher.tsx`, `lib/i18n/dicionario.ts`. Oculta nome/chevron abaixo de md e preserva aria-label e ícone. Mantém desktop. | Três testes de componente; Chrome desktop e 390×844. Botão móvel de 40 px e nome visual oculto. |
| Compatibilidade de erros RPC locais | Adaptação necessária à exclusão transacional | `app/rest/v1/rpc/[fn]/route.ts` devolve SQLSTATE no protocolo esperado pelo SDK, após rollback. Mensagem genérica; não expõe valores do erro do driver. Não modifica Auth nem o contrato REST de `/api/v1`. | Quatro testes de resposta 23503/23001/42501/XX000, sem mensagem pessoal; smoke real REST/RPC. |

## Matriz de autorização

Matriz derivada dos guards existentes e aplicada/testada com papéis PostgreSQL reais. `C/U/D` = INSERT/UPDATE/DELETE. O papel humano vale por organização, não globalmente.

| Objeto/operação | viewer | agent | manager | admin | Outra organização |
|---|---|---|---|---|---|
| Pointers/enrollments: SELECT | Sim | Sim | Sim | Sim | Sem linhas |
| Pointers/enrollments: C/U/D | Não | Não | Sim | Sim | Não |
| Events: SELECT | Sim | Sim | Sim | Sim | Sem linhas |
| Events: INSERT | Não | Não | Sim | Sim | Não |
| Events: UPDATE/DELETE | Não | Não | Não | Não | Não |
| Versions: SELECT | Sim | Sim | Sim | Sim | Sem linhas |
| Versions: INSERT/UPDATE direto | Não | Não | Não | Não | Não |
| Versions: DELETE | Não | Não | Sim | Sim | Não |
| Audit: UPDATE/DELETE/TRUNCATE | Não | Não | Não | Não | Não |

Service role continua bypassando RLS para os workers; escopo explícito é necessário. Na auditoria, BYPASSRLS não substitui o privilégio revogado: adulteração também é recusada para service_role. Dono/DBA e retenção por função security definer são exceções administrativas explícitas; não se afirma imutabilidade contra um superusuário.

## Banco e aplicação

Criadas exclusivamente migrations novas:

1. `20261002180000_0237_crm_geral_exclusao_transacional.sql`.
2. `20261002181000_0238_crm_geral_auditoria_e_followup_rls.sql`.
3. `20261002182000_0239_crm_geral_lgpd_conteudo_associado.sql`.

Os mesmos corpos estão no apêndice idempotente de `supabase/baseline.sql`, antes da varredura final de EXECUTE anon, com entradas no `supabase/migrations/MANIFEST.md`. Nenhuma migration antiga foi editada. Nenhum objeto ou banco de desenvolvimento foi apagado e nenhum seed foi reexecutado.

O usuário aplicou `scripts/local-dev/apply-hardening.ps1` no `crm_geral_dev`. O script aplica os três arquivos numa única transação com ON_ERROR_STOP e usa a senha apenas em memória. A variável DBA não foi herdada por esta sessão; nenhum valor foi impresso ou persistido.

`CONFIRMADO` após a aplicação: RPC de contato e trigger de transcrição presentes; crm_geral_app sem UPDATE/DELETE/TRUNCATE da auditoria; zero policies ALL antigas nas quatro tabelas de follow-up. Os seis corpos de função, normalizados sem comentários, coincidem com o banco temporário testado.

Testes destrutivos somente no PostgreSQL temporário nativo 18.6, em `127.0.0.1:55432`, banco `crm_geral_hardening_test`, com dados fictícios e transações revertidas. O teste exige explicitamente esse nome e recusa outro alvo. Sem HARDENING_TEST_DB_URL, esse complemento fica skipped: não tenta conectar ao banco do app nem interfere no harness Docker padrão.

```powershell
& 'D:\PostGre\bin\pg_ctl.exe' -D '.local-dev/phase-2-2/pgdata' -l '.local-dev/phase-2-2/postgres.log' start
$env:HARDENING_TEST_DB_URL = 'postgresql://postgres@127.0.0.1:55432/crm_geral_hardening_test'
corepack pnpm exec vitest run --config vitest.hardening.config.ts
```

Essa URL é exclusiva do servidor temporário com trust em loopback, sem senha. Não é credencial do banco de desenvolvimento.

## Validações e evidências

Logs e screenshots ficam em `.local-dev/phase-2-2/`, ignorados pelo Git, sem credenciais ou dados reais de clientes nos artefatos criados.

| Verificação | Resultado e limite |
|---|---|
| typecheck | Passou. Uma tentativa concorrente com o servidor encontrou arquivo de tipos Next gerado inconsistente; o servidor foi parado, os tipos regenerados pelo Next e o teste passou. Não houve edição manual de arquivo gerado. |
| lint | Zero erros; 350 warnings já existentes na execução inicial. |
| build | Passou; repetido após o ajuste da resposta RPC. |
| Regressões focadas | 12 arquivos e 141 testes passaram; `unit-focused-final.log`. Inclui controles positivos e negativos, helpers de rede e equivalência baseline/migration. |
| Banco/RLS | 18 testes passaram, inclusive SQLSTATE RESTRICT real, isolamento, auditoria e LGPD. |
| Controle negativo SQL | Ao reintroduzir permissões/policies/funções antigas exclusivamente no banco temporário, 13 testes falharam; reaplicação estrita dos três arquivos restaurou os 18 verdes. |
| Controle negativo código | Uma cópia isolada da base antiga recebeu os testes novos. Componentes/handlers/worker antigos, caminho antigo e comparação cron deliberadamente insegura reproduziram 39 falhas em oito arquivos. O código de trabalho não foi revertido para essa prova. |
| Baseline install/update | Ambos executados numa base temporária nova. Os 36 erros remanescentes são de vector/ai_chunks ausentes neste PostgreSQL Windows. Nenhum erro das três migrations de hardening; aplicação/reaplicação incremental estrita passou. Isso não prova instalação completa com pgvector. |
| pnpm test:db padrão | Não executável neste ambiente: Bash/Docker indisponíveis. O complemento nativo não é apresentado como substituição de todos os invariantes do harness padrão. |
| Auth/REST/RPC | Login humano no Chrome chegou à Inbox. GET REST autenticado pelo serviço retornou 200; RPC com UUID inexistente retornou 200/false, sem remover registros. A tentativa automática com a senha configurada no ambiente retornou Auth 400; a sessão usada visualmente foi aberta pelo usuário. |
| Visual | Chrome desktop e viewport 390×844; busca digitada/limpa, seletor compacto com aria-label. Capturas `visual/inbox-desktop.png` e `visual/inbox-mobile.png`. Viewport restaurado. |
| E2E completo | Não declarado verde: não foi executada toda a suíte Playwright com infraestrutura semeada. A evidência visual é do app local real; a base não tinha conversas para testar envio WAHA. |

A execução completa de `pnpm test:unit` terminou com 774 arquivos aprovados, 14 reprovados, 8.362 testes aprovados, 36 reprovados e um erro de worker. Duas falhas eram desta fase (representação CRLF no gate baseline/migration e tratamento de 23001); ambas foram corrigidas e revalidadas. Uma execução isolada da base inicial, sem as mudanças desta fase, reproduziu 30 falhas em nove arquivos: i18n da área design-validation, importação de leads, instrumentação de varreduras em Windows, scripts Bash/grep ausentes e carregamento de fontes PDF em caminho Windows. Não foram corrigidas por serem fora do escopo. Outros testes estouraram tempo sob carga; o teste de marcadores também excedeu 15 s numa repetição junto ao build. Nenhuma aprovação global de `gov:verify` é reivindicada.

## Adiados e riscos residuais

- Features e módulos maiores do upstream, Auth/RLS completo do Supabase, suspensão de tenant, novo RAG, CRM B2B, campanhas, financeiro, tags e forecast: fora da Fase 2.2.
- SSRF: DNS preflight não fixa o IP da conexão feita pelo gateway. Rebinding entre resoluções e redirects seguidos remotamente são riscos residuais. Nenhum teste de envio WAHA/redirect real foi realizado.
- Caminhos legados ambíguos deixam de ser aceitos; uploads normais já usam UUID. Não houve migração automática de objetos de Storage.
- LGPD: não houve backfill destrutivo de registros previamente anonimizados. Resíduos históricos exigem levantamento agregado e plano específico antes de intervenção.
- A nova coleta de contexto pessoal mantém limite de 500 registros por consulta, assim como a seleção existente de conversas; execução de agente vinculada apenas à conversa pode não entrar na seleção por contact_id. Completar paginação e esse vínculo é dívida explícita, não prova de export integral. Transcrição acompanha a amostra recente de mensagens já existente.
- Storage, Realtime, Supabase Cloud e todas as jornadas de instalação fresca não foram validados. A aplicação futura no Supabase continua pela cadeia/baseline, mas exige os gates da distribuição.
- Somente os dois crons da correção selecionada foram adaptados; comparações de outros crons permanecem para auditoria própria.
- A Inbox local estava vazia e o seletor mostrava o rótulo existente `Organização: —`; o teste visual prova dimensões e busca, não uma jornada completa entre tenants nem conversa ativa.
- Matriz humana não elimina a obrigação de filtro por organization_id nas consultas service role.

## Git e encerramento

Commits separados por responsabilidade: integridade do banco/RPC, mídia, cron, LGPD do worker/export e interface; documentação/fragmento de release em commit próprio. Histórico exato disponível em `git log 5b9e7a45a..HEAD --oneline`.

- `b05c8642`: exclusão transacional e compatibilidade RPC local.
- `42268118`: auditoria e RLS por operação.
- `513b0a21`: LGPD, exportação, worker e prova de banco nativo.
- `1ff8dee8`: SSRF e caminhos de mídia.
- `b82ff890`: segredos de cron.
- `b848f159d`: busca Inbox e seletor móvel.

O servidor PostgreSQL temporário foi parado após os testes; seus dados fictícios e logs permanecem ignorados no workspace. A revisão automática bloqueou a limpeza da cópia de comparação/regressão, com motivo genérico `blocked by policy`; ela foi preservada em `D:/Codex/CRM-Geral-phase-2-2-base-check`, fora do projeto principal. O app local permanece iniciado e sua Inbox aberta no Chrome.

`DESKCOMM_UPSTREAM_AUDIT.md` permanece preexistente e não versionado por esta fase. Nenhum push, merge ou rebase realizado. A Fase 2.3 não foi iniciada.
