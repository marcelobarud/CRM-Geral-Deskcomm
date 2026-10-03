# D2 — Implementação e evidências

Data: 2026-10-03. Projeto confirmado: **Geral 1**, organização CRM Geral, staging. Branch: `d2-supabase-geral-1`. Situação: schema e serviços reais homologados; decisão de runtime **A**.

## Integração aprovada do Bloco A

Os cinco commits aprovados foram publicados na branch `bloco-a-fundacao-configuravel` do fork, integrados por fast-forward e publicados na main. HEAD da main: `8a9888a787d45764ba747edcd118f51768eacb2a`. O destino origin foi confirmado como `https://github.com/marcelobarud/CRM-Geral-Deskcomm.git`. Nenhuma publicação ao upstream Deskcomm.

## Schema confirmado no Geral 1

O inventário inicial vazio consta em `SUPABASE_D2_AUDIT.md`. A instalação aplicou o baseline versionado, com os pré-requisitos vector, citext e pg_trgm em public já usados pelo kit existente. Uma segunda aplicação integral do baseline passou, comprovando a atualização nesse projeto. Nenhum dump local, reset ou remoção de dados existentes.

As migrations 0240–0242 foram executadas explicitamente após o baseline, não apenas marcadas como aplicadas. O conector atribuiu as versões de execução abaixo; os nomes identificam os arquivos versionados de origem.

| Versão remota  | Operação                             |
| -------------- | ------------------------------------ |
| 20261003123418 | crm_geral_d2_baseline_install        |
| 20261003123513 | crm_geral_d2_baseline_update_probe   |
| 20261003123536 | 0240_crm_geral_capacidades           |
| 20261003123538 | 0241_crm_geral_capacidades_grants    |
| 20261003123539 | 0242_crm_geral_capacidades_namespace |

Inventário confirmado após a instalação: 126 tabelas public, todas com RLS; 371 funções public; 504 policies em public/storage. Nenhuma função SECURITY DEFINER em public executável por anon. `fn_set_capability` concede execução a authenticated e a nega a anon/service_role. Isso comprova grants, ainda não substitui testes com JWT de usuários reais.

Buckets criados pela fonte aprovada: ai-policy, lgpd-exports, skill-assets e whatsapp-media privados; brand-logos público. Publicação Realtime restrita às 12 tabelas contratuais: ai_agent_runs, ai_agents, ai_knowledge_sources, conversations, crm_lead_activities, crm_leads, messages, user_organizations, crm_lead_risk_states, crm_lead_reactivations, calendar_appointments e voice_calls. Nenhum scheduler concorrente foi criado.

## Tipos e iniciador

`lib/database.types.ts` foi regenerado pelo conector a partir do schema real do Geral 1. Não foi editado à mão. A comparação identifica 122 tabelas anteriores e 126 atuais, sem remoção de tabelas; as quatro adições são ad_insights_connections, catalog_products, crm_tasks e org_voice_calls, já presentes no baseline. Os contratos das duas RPCs de capabilities agora existem no arquivo gerado. O escopo retornado pelo gerador é public; o bloco graphql_public legado deixou de aparecer. Typecheck passou com os tipos reais.

`scripts/supabase/start-geral-1.ps1` recebe credenciais de forma oculta e temporária. `verify-geral-1.mjs` usa usuários e organizações fictícios próprios, testa serviços reais e a jornada visual, e faz limpeza restrita às fixtures da execução. Nenhuma credencial será solicitada em chat ou gravada em arquivo pelo iniciador. Instruções reproduzíveis em `scripts/supabase/README.md`.

## Advisor e gaps

O advisor retornou 12 avisos informativos de tabelas com RLS sem policy; três funções com search_path mutável; três extensões em public; e 30 funções SECURITY DEFINER executáveis por authenticated. Não representam automaticamente uma vulnerabilidade: tabelas de serviço precisam ser inacessíveis ao usuário, extensões seguem o contrato aprovado e RPCs precisam validar identidade/organização. Não foram adicionadas policies permissivas nem alterados contratos globais para eliminar avisos.

P0/P1: nenhum bloqueador demonstrado permanece na jornada homologada. P2: configuração white-label do login público ainda herdada, conforme evidência visual abaixo; nenhuma funcionalidade futura foi antecipada. P3: triagem contextual dos avisos do advisor e regressão Docker complementar, indisponível neste ambiente; Docker não foi instalado apenas para D2. WAHA, OAuth externo e scheduler/workers de produção não foram acionados por esse teste; continuam fora da comprovação D2, não são funcionalidades implementadas nesta fase.

## Homologação real aprovada

Execução `c250974a-da3f-46e1-864a-acf92ef47fbb`, término 2026-10-03 às 10:16:34 BRT. Resultado sanitizado: `passed=true`, `fixtures_cleaned=true`, sem código de falha. Todos os usuários/organizações/arquivos fictícios da execução foram removidos e sessões revogadas. Evidências locais em `.local-dev/d2/`, ignoradas pelo Git; nenhum segredo ou sessão do navegador foi versionado.

| Área         | Evidência real                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Auth         | Admin bootstrap fictício, login/getUser, refresh, logout e novo login                                                                   |
| MFA          | TOTP inscrito/verificado, AAL1 bloqueia setter; AAL2 permite                                                                            |
| REST/RLS     | Usuário lê sua organização e não a outra; anon negado; insert com returning                                                             |
| RPC/RBAC     | Viewer/agent/cross-tenant/service_role/anon não administram; admin autorizado                                                           |
| Capabilities | Desconhecida fechada, desativação isolada A/B, mutação bloqueada e histórico preservado; reativação                                     |
| Storage      | Upload/download/remoção em ai-policy, signed URL efetivamente aberta, B não lê arquivo A                                                |
| Realtime     | UPDATE crm_leads entregue ao usuário A, assinatura B não recebe evento A                                                                |
| App          | Login pela tela; Contatos, Funis, Inbox, Agenda, Configurações; módulo READY/DISABLED, teclado/foco, histórico e API; viewer sem edição |
| Visual       | Login e shell, estados de capabilities em 1440×900 e 390×844, sem overflow móvel; capturas inspecionadas                                |

As correções do harness preservaram a negação anônima 42501, o funil padrão sem competição por unicidade e o bootstrap de JWT antes do primeiro join Realtime. A única correção funcional foi fazer authConfigOrResponse devolver 404 quando o adapter está desligado/produção, sem carregar credenciais locais; três testes verificam esses guards e preservam 503 para configuração ausente no modo local.

As capturas incluem indicadores do Next em modo desenvolvimento; não são imagens de produção. Não houve redesenho. Realtime provado por evento real, não apenas por SUBSCRIBED ou existência da publication.

## Verificações do projeto

Sintaxe PowerShell/JavaScript e lint do iniciador passaram. Typecheck e build passaram. Os quatro arquivos de testes focados passaram (46 testes), além dos três testes da correção do adapter. Lint geral: zero erros e 350 avisos preexistentes; lint dos arquivos da correção também passou. Build advertiu sobre a futura descontinuação do import withSentryConfig, sem falha. Nenhum push/merge da branch D2 nesta etapa.

Limitações visuais observadas: o login público ainda exibe marca herdada Deskcomm/DeskcommCRM, enquanto o shell autenticado usa CRM Geral da fixture organizacional. É gap **P2 de configuração white-label da instalação**, a regularizar antes de exposição comercial; não foi feita alteração de produto/marca global neste teste. A captura de Contatos foi obtida durante carregamento, comprovando shell/navegação, não renderização final ou CRUD completo dessa área. O teste profundo desta fase cobre capabilities; novas jornadas comerciais ficam para Bloco B. Essas limitações não foram ocultadas pelo resultado automatizado.
