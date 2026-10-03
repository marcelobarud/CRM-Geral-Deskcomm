# CRM Geral — Bloco E: relatórios e forecast simples

Checkpoint de 2026-10-03. Implementação e provas SQL concluídas;
**homologação JWT/UI real Forecast pendente**. Não constitui aceite final nem
autoriza iniciar o Bloco F.

## Base e auditoria

Bloco D publicado em origin/bloco-d-b2b-simples e integrado por fast-forward
na main do fork, publicada em `8e8014b44ac7b2da1df7a91caf277d000b31083b`.
Destino verificado: https://github.com/marcelobarud/CRM-Geral-Deskcomm.git.
E permanece na branch local `bloco-e-relatorios-forecast`, sem push/merge/rebase.
Auditoria anterior ao código em REPORTING_FORECAST_AUDIT.md, commit `26acf745`.

Reutilizados: crm_leads, crm_stages, edição de etapas e /app/metrics (Desempenho).
Relatórios de atendentes, atividades, atrito e dashboard de plataforma foram
preservados. Não há download de milhares de leads nem cálculo monetário no client.
Empresa continua derivada do contato; nenhuma FK nova no lead. Tags/empresa não
viraram dimensões analíticas novas neste recorte; pipeline/owner/source atendem
os filtros comerciais iniciais. Sem IA, caixa, câmbio, metas, propostas ou Ads.

## Probabilidade e dinheiro

crm_stages.probability_percent: smallint nullable, CHECK 0..100 inteiro.
Etapas antigas/nova mantêm null; não há backfill comercial nem 50% implícito.
Won/lost podem ter campo configurado, mas não entram no forecast aberto: status
da oportunidade é o contrato vigente. Nome Pedidos/Pago não define probabilidade.
Score de IA individual não é lido pelo read model.

Forecast = round(value_cents::numeric × probability_percent / 100) por negócio
aberto, seguido da soma dos cents arredondados. Numeric decimal no PostgreSQL;
meio centavo é arredondado para longe de zero. Exemplo 10000 × 50% = 5000 cents;
1 × 50% = 1 cent. Zero conhecido é válido; ausência não é zero.
Weighted não é persistido. Mudança de etapa/probabilidade muda a leitura atual;
não há reconstrução de forecast histórico no Bloco E.

Totais monetários são strings de inteiros no JSON, inclusive bigint além da
precisão de Number. UI usa BigInt e escala de cents, sem converter para float.
Moedas são agrupadas separadamente; não existe total monetário BRL+USD.
Moeda ausente possui grupo sem moeda com valores indisponíveis, nunca BRL presumido.

## Período e métricas

Janela semiaberta [from,to), datas UTC, limite 366 dias, exposto nos labels.

| Leitura | Semântica |
|---|---|
| Pipeline/valor aberto | Snapshot de todos os abertos visíveis com os filtros |
| Forecast ponderado atual | Abertos com valor/moeda/probabilidade conhecidos, todas as datas |
| Forecast do período | Mesmo recorte + expected_close_date na faixa UTC de datas |
| Ganhos/perdas | won/lost + closed_at na janela; valor comercial, não recebimento |
| Criadas | created_at na janela, qualquer status |
| Conversão | won/(won+lost) dos encerrados na janela; null se denominador zero |
| Origem | Categoria source atual por moeda; source_metadata não vira atribuição Ads |

Dados sem previsão de fechamento não são atribuídos a um mês por criação ou
atualização. Abertos sem valor, sem probabilidade, sem data e encerrados sem
closed_at/valor aparecem explicitamente. Totais conhecidos são parciais quando
há lacuna. Zero e indisponível usam representações diferentes.

## Banco, autorização e compatibilidade

Migration `20261003220000_0255_crm_geral_reporting_forecast.sql`, apêndice literal
idempotente no baseline, linha MANIFEST e aplicação Geral 1 concluídos.
Tipos regenerados contra Geral 1, sem edição manual.
Sem tabela nova, alteração de policies ou grants ampliados de tabelas.

`fn_crm_commercial_report` é STABLE SECURITY INVOKER, search_path fixo,
auth.uid + membership + piso agent, organização explícita e grants auth apenas;
PUBLIC/anon/service revogados. RLS de crm_leads define own-scope/manager org-wide;
não há service role como atalho de agregação.
Uma RPC agrega currencies/stages/sources por grouping sets; sem N+1, Redis,
materialized analytics ou dependência do limite REST de linhas.
Índices org/pipeline/status, org/status/closed_at/owner e expected_close_date
existentes foram preservados. Snapshot é O(n) dos negócios visíveis: dados grandes
exigem medição operacional futura; não foi declarado benchmark de produção.

Probabilidade entra de forma aditiva no PATCH existente manager+, stage-operations,
leitura agent-mapping e hooks useStages/useAgentMapping. Autoria e audit
pipeline.stage_updated incluem pedido/updates. Não modifica encerramento, imports,
movimento, automação, IA ou arquivos gerados por edição manual.

API GET /api/v1/reports/commercial usa requireRole(agent), client de sessão,
Zod strict, cookie confiável para organização, wrappers e erros sanitizados.
Filtro pipeline/owner/source não pode escolher outra organização. Configuração
manager+; agent lê o próprio recorte RLS; viewer recebe ausência de permissão.

## UI e continuidade

Probabilidade na gestão existente de etapas, input inteiro nullable com label,
ajuda curta, teclado e confirmação. Relatório na tela Desempenho, sem segunda
área administrativa, com atalho de volta à configuração para manager+.
Totais por moeda, tabela por etapa, origem por moeda e explicação dos períodos.
Loading/empty/erro/retry/sem permissão e incompletude distintos; erro não vira zero.
Tabelas têm apoio textual, headers, foco e scroll interno; não dependem de cor.
Rótulos novos passam por t() e receberam espanhol.

Living System Checklist: entrada stage settings/PATCH e leads; saída RPC →
CommercialReportPanel; registro de configuração no audit existente; tela
/app/metrics; porta Desempenho já registrada; leitura não é demanda/SLA; configuração
na etapa; contexto humano/IA preserva fonte única, sem criar score IA; retorno
de erro via retry e lacunas levam à configuração; mapas atualizados com
stage → read model → relatório → configuração e leads → resultado comercial.

## Verificações e limites

- Prova Geral 1 reaplicou migration duas vezes em transação, criou fixtures
  fictícias e terminou em rollback. Cálculo BRL/USD, 0/100/null, centavo,
  fechamento/período, viewer negado e filtro de tenant alheio passaram.
  Consulta independente confirmou zero organizações/Auth do namespace do probe.
- Typecheck e lint passaram no checkpoint; lint 0 erros/350 warnings preexistentes.
- Build final passou após o último ajuste de navegação/tradução. Typecheck final
  também passou; lint delta dos novos componentes/API/testes sem avisos.
- 131 testes de API/schema/etapas/compatibilidade passaram; outros 13 de
  estados UI/API/cents passaram. Rodadas sobrepostas não devem ser somadas.
- Mapas e hidratação passaram isoladamente. As três traduções novas faltantes
  foram corrigidas: cobertura t() passou. Rodada final de mapas/UI/i18n: 119
  casos passaram e um permaneceu na prosa crua do laboratório visual anterior.
- Suíte global com maxWorkers=2 foi interrompida sem conclusão/resumo integral.
  Registrou famílias preexistentes de import/release/bash/LGPD/namespace/i18n e
  probes. Hidratação estourou o tempo sob carga e passou isolada; a referência
  local a imagem no relatório B2B anterior também reprovou sua guarda. Não
  corrigir documentos de D ou laboratório visual fora do escopo; nenhuma
  aprovação global nem total agregado é presumido.
- test:db bloqueado por bash fora do PATH Windows; harness Docker complementar.
  Git Bash encontrou docker ausente; nenhum container foi criado. SQL cloud
  não equivale a instalação fresca no harness pg15.
- Advisor final não apontou avisos relacionados a probability_percent ou
  fn_crm_commercial_report; dívidas históricas não foram alteradas.
  [RLS oficial](https://supabase.com/docs/guides/database/postgres/row-level-security)
  e [arredondamento numeric](https://www.postgresql.org/docs/current/functions-math.html)
  consultados para as decisões técnicas.

## Homologação real preparada

Iniciador `scripts/supabase/start-geral-1.ps1 -Prompt -Suite Forecast` usa apenas
chaves em memória, campos ocultos, destino fixo Geral 1 e LOCAL_DEV_AUTH=false.
Resultado sanitizado/journal/capturas fictícias ficam ignorados em .local-dev/bloco-e.
Sem tokens, senhas, headers, cookies ou traces persistidos.

Cenário: etapas 20/50/80%, valores 100000/200000/300000 cents BRL; combina com
arredondamento 1 cent, 0/100%, ausência de probabilidade/valor/data/moeda,
USD separado, EUR acima de Number.MAX_SAFE_INTEGER, janela fixa janeiro/2026,
won/lost dentro/fora, own-scope agent e dados B sem influência em A.
Jornada prepara edição pela tela/teclado → relatório → movimento → ganho pelo
Kanban → redução do forecast/entrada no resultado; 1440×900 e 390×844, viewer.
Limpeza final e conferência independente dos IDs do journal são obrigatórias.
Ainda não executar o critério de saída como se essa jornada já tivesse passado.

Primeira execução real (2026-10-03): base D2 passou; Forecast interrompido na
criação das etapas fictícias, código 23502. O lote misturava flags de ganho/perda
omitidas e explícitas; campos ausentes no lote viravam null, incompatível com
NOT NULL. Corrigido somente o harness com is_won/is_lost=false e probabilidade
null explícitos antes dos overrides. O relatório confirmou fixtures_cleaned=true.
Jornada Forecast e conferência independente continuam pendentes de nova execução.

Segunda execução real (2026-10-03): etapas criadas; timeout na primeira edição
pela UI. A captura mostra erro de carregamento de etapas. Colunas necessárias e
SELECT da probabilidade confirmados no Geral 1. Primeira compilação da rota dev
acima do timeout de 10s do client é hipótese, ainda não comprovada. O harness
agora verifica GET autenticado de agent-mapping e quantidade de etapas antes da
navegação, com prazo de compilação de 120s e status HTTP no checkpoint, sem
persistir resposta bruta. UI e persistência por PATCH continuam obrigatórias.
Limpeza independente confirmou zero organizações e usuários dos IDs do journal.

Terceira execução real (2026-10-03): configuração das probabilidades pela UI e
cenários JWT/RLS/cents/moedas/período/conversão/own-scope passaram. Timeout ao
aplicar filtros: captura mostrou data inicial padrão em vez de janeiro e erro
de período inválido. O harness aguarda dados do relatório (query após hidratação)
antes de editar inputs controlados, confirma ambos os valores e sai dos campos
por teclado antes de aplicar. Não alterada regra do produto. Cleanup confirmado
pelo resultado e por consulta independente: zero organizações/usuários do journal.
Jornada visual completa, movimento/ganho e MFA final continuam pendentes.

## Gaps e Git

P0: nenhum identificado nas provas concluídas; aceite completo ainda pendente.
P1: homologação JWT/UI Forecast e cleanup independente da suíte real.
P2: regressão global histórica, marca pública upstream e funil Pedidos/Pago,
fora do escopo. P3: harness Docker/pg15 complementar e avaliação de volume real.
Bloco F não iniciado. Prontidão depende da homologação Forecast.

Worktree rastreada deve terminar limpa; E sem push/merge/rebase.
docs/DESKCOMM_UPSTREAM_AUDIT.md não rastreado preservado, SHA256
`1689EF1DBD1FCA2A2B8E3C88522897471BC2CDE7A0ACFB5F6CF9474D2EA9F7D4`.
