# Auditoria de prontidão para Cliente Zero — retrato inicial

**Data do retrato:** 2026-10-05 (horário local; consultas Supabase registradas em 2026-10-06 UTC)

**Branch:** `fase-i-consolidacao-cliente-zero`

**Commit-base:** `1fa658c63935c98a7d97e9d5578911d1ec61aec1`
**Escopo:** auditoria A–H anterior a correções da Fase I. Este arquivo será atualizado com evidências e resultados finais; não representa aprovação de release.

## Fontes e limites

Foram conferidos os documentos de distribuição/modelo do produto, as implementações A–H, `docs/SUPABASE_D2_IMPLEMENTATION.md`, `docs/LOCAL_RUNTIME_TRANSITION.md`, `AGENTS.md`, `CLAUDE.md` e `supabase/migrations/MANIFEST.md`. Os relatórios sanitizados locais das suítes D2/A–H foram lidos somente nos campos de estado, contagem de checks e limpeza. Nenhuma chave foi lida ou exibida.

O estado descrito abaixo é evidência observada no checkout e no projeto Supabase Geral 1, não uma afirmação sobre produção. As suítes individuais A–H passaram e declararam limpeza; a jornada cruzada única A–H, o install/update limpos, restore e branding ainda precisam de prova separada.

## Matriz A–H — inventário inicial

| Bloco | Função | Classificação | Banco / RLS | API / UI | Capability / runtime | Evidência atual | Pendência inicial |
|---|---|---|---|---|---|---|---|
| A | Fundação configurável e gates de capacidade | Infrastructure | Configuração em `organizations.settings`; funções de leitura/escrita com autorização/MFA descritas na implementação A | Endpoint e tela de capacidades | Registry em `lib/capabilities/registry.ts`; estados `DISABLED`, `ENABLED_NOT_CONFIGURED`, `READY`, `DEGRADED`, `UNAVAILABLE` | D2/A: passou, 7 checks, cleanup=true | Provar defaults em tenant novo e fechamento dos gates em todos os efeitos |
| B | Contatos, empresas, oportunidades, tarefas, agenda e contexto comercial | Core | Schema e políticas tenant-aware nos objetos do CRM; testar transversalmente A/B | Rotas `/contacts`, `/companies`, `/leads`, `/tasks`; telas correspondentes | Sem capability opcional própria | Bloco B: passou, 9 checks, cleanup=true | Jornada cruzada com C–H e seed inicial de tenant |
| C | Catálogo e vínculos de tags estruturais | Core | `crm_tags`, aliases e assignments com isolamento e guardas | API de tags/vínculos; UI de organização/segmentação | Sem capability opcional própria; reusa filtros existentes | Tags: passou, 10 checks, cleanup=true | Interoperabilidade com filtros de campanha/automação na jornada única |
| D | Empresas B2B simples e vínculos comerciais | Core | Modelo e histórico tenant-aware; políticas incluídas no schema A–H | API/UI de empresas e contexto comercial | Sem capability opcional própria | B2B: passou, 10 checks, cleanup=true | Interoperabilidade com contatos, oportunidades e propostas |
| E | Relatórios comerciais e forecast | Core | Métricas/probabilidade com leitura sob escopo de organização | API e UI de relatórios/forecast | Sem capability opcional própria | Forecast: passou, 9 checks, cleanup=true | Confirmar defaults e contagens em organização realmente nova |
| F | Propostas versionadas e documentos PDF privados | Optional | `crm_proposals`, itens, versões/templates; bucket privado `proposal-documents` | Rotas de propostas/PDF e interfaces comerciais/IA | `proposals`, default desligado; readiness consulta Storage | Proposals: passou, 9 checks, cleanup=true | Teste integrado com Storage/restore de objetos e virada disabled→ready |
| G | Roteiros curtos e continuidade humana | Optional | `crm_short_scripts`, sessões e vínculos de automação/retomada com RLS | API/UI de roteiros e sessão de atendimento | `short_scripts`, default desligado; reusa engine/fila já existente; não introduz envio autônomo no Bloco G | Automations: passou, 10 checks, cleanup=true | Mapear todos os gates antes de qualquer efeito e testar histórico ao desligar |
| H | Campanhas agendadas: classificação/preparação e cancelamento | Optional | `crm_scheduled_campaigns` e recipients, RLS habilitada, status e índices; migration 0273–0275 | API `/campaigns` e UI `/app/campaigns` | `scheduled_campaigns`, default desligado; usa fila/worker existentes; contrato do Bloco H não envia por provider | Campaigns: passou, 10 checks, cleanup=true | A prova individual não substitui interop A–H; confirmar jobs/ownership no deploy |

## Classificação funcional vista no código

O registry contém quatro IDs: `message_templates` (ligada por padrão), `proposals` (desligada), `short_scripts` (desligada) e `scheduled_campaigns` (desligada). A configuração inválida fecha a execução (`DEGRADED`). A capability `proposals` consulta readiness do bucket; as outras readiness ainda recebem o default configurado no resolver. `runCapabilityEffect()` documenta que recheck reduz, mas não remove a corrida entre leitura e efeito externo.

Esta é uma leitura do registry e do código, não confirmação de decisão de produto para qualquer capability futura. Itens do core descritos na Fase 2.5 incluem contatos, empresas, oportunidades/funil, tarefas/agenda/contexto, tags e relatórios/forecast; prospecção manual precisa de confirmação da jornada de leads existente antes de ser chamada de core no primeiro login.

## Estado observado do Geral 1

- Projeto `Geral 1`, ref `zwjrhqqwizjpzmeayrju`, status `ACTIVE_HEALTHY`, PostgreSQL 17.11.0.002.
- O catálogo remoto registrou 49 migrations, com nomes de baseline D2, probes de update e entregas A–H; o mais recente é o probe de reapply dos índices 0275. O inventário remoto não é prova de install limpo.
- 138 tabelas públicas; 138 com RLS habilitada; 0 com `FORCE ROW LEVEL SECURITY`; 510 policies públicas.
- Contagens consultadas: 0 organizações, 0 campanhas e 0 recipients; também sem registros nos principais objetos comerciais A–H. `api_audit_log` continha 1.399 linhas e catálogos de modelos/skills tinham dados de plataforma. Isso não significa banco vazio.
- Buckets observados: `ai-policy` privado, `brand-logos` público, `lgpd-exports` privado, `proposal-documents` privado, `skill-assets` privado e `whatsapp-media` privado.
- A publicação `supabase_realtime` expunha 12 tabelas públicas; as duas tabelas de campanhas não estavam nela. O módulo H tem fluxo de consulta/refresh e o contrato de preparação não presume envio.
- Advisor de segurança: 4 classes (12 tabelas RLS sem policies, informativo; 3 funções com search_path mutável, warning; 3 extensões no schema public, warning; 40 funções SECURITY DEFINER executáveis por authenticated, warning). Advisor de performance: 6 classes (178 FKs sem índice, informativo; 11 policies com initplan, warning; 5 tabelas sem PK, informativo; 108 índices sem uso, informativo; 157 ocorrências de policies permissivas múltiplas, warning; 1 índice duplicado, warning). Esses achados ainda precisam ser cruzados com o escopo A–H; Advisor não determina exploração por si só.

## Ambiente local observado e gate de instalação

- Node `v24.15.0`, Corepack/pnpm `9.15.9`, dependências locais presentes.
- Git Bash está instalado; Docker CLI, serviço Docker, `psql` e Supabase CLI não foram encontrados. `wsl --status` informou que o subsistema WSL não está instalado.
- O harness `scripts/test-db.sh` usa a imagem efêmera `pgvector/pgvector:pg15`, aplica `supabase/baseline.sql` como molde e executa `tests/invariants`; exige Docker. O pacote também define `db:reset` via Supabase CLI, ainda não disponível.
- Há 257 arquivos SQL em `supabase/migrations/`; o baseline contém apêndices até o Bloco H. O comando `db:migrate` em `package.json` ainda é um placeholder que imprime TODO e termina com sucesso; não serve como mecanismo de update.
- Install clean e update clean ainda sem prova nesta captura. A disponibilidade concreta de Docker será revalidada no run do harness; o estado antigo citado em auditorias não é usado como evidência.

## Registros de homologação disponíveis

Os arquivos locais ignorados `.local-dev/d2/result.json` e `.local-dev/bloco-{b,c,d,e,f,g,h}/result.json` reportam `passed=true`, `fixtures_cleaned=true` e `fixtures_created=true` nas suítes respectivas. Contagens reportadas: A/D2 7; B 9; C 10; D 10; E 9; F 9; G 10; H 10. São evidências sanitizadas locais de suítes individuais no Geral 1, não uma nova rodada consolidada A–H.

## Primeira rodada da suíte global (antes de correções)

Rodado `corepack pnpm test:unit` em 2026-10-06 UTC no Windows/Node v24.15.0, commit-base acima: **818 arquivos; 8.558 testes passaram, 40 falharam, 1 expected fail; 19 arquivos com falha; duração 740,73 s**. Triagem inicial das 40 falhas:

- Distribuição/A–H reproduzível: `fn_script_command` tem corpo diferente no fim da cadeia de migrations e no apêndice do baseline (G; afeta o install oficial); `ProposalsWorkspace.tsx` usa `crypto.randomUUID()` cru no client e mantém nove usos de `rounded` sem token explícito; `ScriptsWorkspace.tsx:315` contém botão sem handler/estado disabled visível; relatório B2B cita `docs/b2b-failure.png`, que não consta no Git.
- Ambiente/plataforma a reproduzir isoladamente: testes de release/namespace usam comandos Unix não encontrados no PATH Windows; testes de Git avisam conversão LF→CRLF; 2 testes de timeout passaram dos limites durante carga da suíte; testes de varredura/locale falharam e precisam de análise individual.
- Demais achados de UX/docs/locale aparecem no restante das falhas, mas ainda não foram classificados como regressão A–H nem blocker P0/P1.

Este resultado é um baseline de triagem, não o veredito final. Nenhuma assertion foi removida ou relaxada.

## Gates ainda sem decisão

| Gate | Estado inicial | Evidência necessária |
|---|---|---|
| Instalação limpa | NOT TESTED | Aplicar mecanismo oficial em banco efêmero vazio e verificar schema, grants, RLS, buckets/config e migrations |
| Update com dados | NOT TESTED | Origem reproduzível, fixtures sintéticas A–H, update e comparações antes/depois |
| Backup de banco e Storage | NOT TESTED | Runbook e artefato isolado sem secrets/dados reais |
| Restore isolado | NOT TESTED | Restore de banco + objetos num destino vazio; nunca Geral 1 |
| Jornada integrada A–H | NOT TESTED | Tenant sintético, fluxos cruzados e cleanup confirmado independentemente |
| Segurança transversal | PARCIAL | Suítes A/B e MFA por bloco passaram; matriz consolidada e funções novas ainda em auditoria |
| Branding/defaults | NOT TESTED | Login, shell, dashboard/settings em 1440×900 e 390×844; seed de novo tenant |
| Suíte global | NOT TESTED | typecheck, lint, build, unit/invariants/e2e com contagens e triagem |

## Preservação de estado

Na captura inicial desta auditoria, `docs/DESKCOMM_UPSTREAM_AUDIT.md` estava não rastreado. Ele deve permanecer fora dos commits e inalterado; hash inicial SHA-256: `1689EF1DBD1FCA2A2B8E3C88522897471BC2CDE7A0ACFB5F6CF9474D2EA9F7D4`.

## Retificação e resultado final — 2026-10-06 UTC

A triagem focalizada corrigiu duas leituras iniciais: o scanner JSX confundiu o `=>` de um `onClick` com fim de atributo; o botão em `ScriptsWorkspace` já tinha handler. A referência à captura B2B era um artefato de evidência local ignorado, não um arquivo necessário ao produto; a documentação foi corrigida e a execução B2B final no Geral 1 passou com cleanup confirmado. As suítes localizadas de branding/propostas/baseline e scanner decorativo também passaram depois dos ajustes; nenhuma assertion foi removida.

A suíte global final, com Node v24.15.0, registrou 818 arquivos: 805 passaram e 13 falharam; 8.563 testes passaram, 34 falharam e 1 é expected fail; duração 718,52 s. Typecheck e build passaram. Lint terminou sem erros e com 351 warnings. As falhas restantes distribuem-se entre: parser multipart Undici/jsdom com incompatibilidade de realm `File` (11 casos da importação); caminhos de fontes `pdfjs-dist` no Windows (4); chamadas a bash/grep e processos Git sem saída no Windows; timeouts de transform/import pesado (theme/icons e varreduras); scanner de atividade que não reconhece escritores; guarda de rascunho que espera caminho antigo; expectativa de frase específica do fluxo de contribuição upstream; falso positivo de vocabulário sobre o identificador `pipelines`; e 79 literais em português no laboratório visual sintético `/design-validation/assets`. As duas suítes `theme` e `icons` também excederam os timeouts quando repetidas isoladamente. Os casos de timeout e scanners precisam de harness/triagem próprios; a tela-laboratório mantém pendência localizada de espanhol. O relatório de readiness enumera as 13 suítes.

O build gerou todas as 57 páginas estáticas/dinâmicas sem erro. O typecheck atual passou após alinhar a lista de categorias do teste de marca ao tipo declarado; lint: 0 erros/351 avisos; build: sucesso, com avisos não bloqueantes de configuração opcional ausente, indisponibilidade temporária da consulta de marca ao Geral 1 no prerender e import Sentry depreciado.

A validação visual foi tentada em `/login`: `GET` respondeu 200, mas levou cerca de 10 s no servidor de desenvolvimento; as capturas não concluíram. O Chromium headless esperado pelo Playwright não está instalado e a sessão de Chrome expirou duas vezes ao navegar. Não foram obtidas capturas desktop/mobile nem acessadas áreas autenticadas. Nada foi instalado e nenhuma credencial foi solicitada ou usada.

O install/update local seguem sem prova: `test:db` requer Bash no PATH e, via Git Bash, falha porque Docker não está instalado; Supabase CLI, psql e WSL também estão ausentes. O teste de update igualmente precisa de Docker e não reproduz uma origem pós-F/G com fixtures A–H. Backup/restore foram auditados em código e documentados, mas nenhum artefato de backup ou restore isolado foi executado; Geral 1 não foi restaurado nem recebeu fixtures desta fase. Assim, o estado final permanece **NO-GO para Cliente Zero**, motivado principalmente por instalação/update/restore, distribuição do fork, backup de Storage e defaults setoriais em organização nova.
