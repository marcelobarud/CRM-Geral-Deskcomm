# CRM Geral — Bloco D: B2B simples

Checkpoint de implementação de 2026-10-03. **Homologação Auth/UI/MFA B2B pendente**;
este relatório não declara o critério de saída concluído.

## Base, auditoria e integração

CONFIRMADO: Bloco C publicado em origin/bloco-c-tags-estruturais e integrado por
fast-forward na main; main publicada no fork CRM Geral em
`ca1e1a380372d8c703ef5bdb012affef1d35eab7`.
Destino verificado: https://github.com/marcelobarud/CRM-Geral-Deskcomm.git.
Nenhum rebase/squash ou envio ao upstream. D nasce dessa main na branch
`bloco-d-b2b-simples`, local.

Auditoria anterior ao código: `B2B_SIMPLE_AUDIT.md`. Nenhuma entidade comercial
Empresa existia no checkout/schema real. CNPJ/legal_name de organizations são
dados do tenant/controlador. Respondi/company_name permanece texto de origem e
título, não identidade. Contagem agregada no Geral 1 de custom_fields.company e
company_name em contatos: zero. Não houve conversão automática de texto ou perda
de dados. People/company_people do upstream foram deliberadamente excluídos.

## Modelo, documento e vínculo

`crm_companies`: UUID estável, organization_id, name obrigatório, legal_name,
document/document_type, email, phone, website, address, city, state, country,
notes opcionais, is_archived e timestamps UTC. Organization é o tenant que usa
o CRM; crm_company é cliente/prospect empresarial dentro desse tenant.

Empresa 1:N contatos; contato 0..1 empresa em contacts.company_id nullable.
FK composta (company_id,organization_id) → crm_companies(id,organization_id).
Sem Pessoa, afiliações, múltiplos interlocutores, hierarquia ou tabela histórica.

Nome recebe trim/redução de espaços, preserva identidade e homônimos. Documento
exige tipo junto, é genérico; trim/case define unicidade por organização/tipo
quando preenchido. Não é algoritmo fiscal ou merge automático. Documentos com
pontuações diferentes não são inferidos como iguais. Não há import empresarial
ou enriquecimento. Zod limita/valida campos, email, telefone E.164 e website HTTP(S).

Fonte canônica do vínculo atual: contato. Oportunidade e Inbox leem empresa pelo
contato, sem FK redundante no lead. Lead sem contato não ganha empresa inferida.
Trocar/remove vínculo não exclui empresa nem altera lead/tarefas/história.
Edição da empresa mantém ID e contatos. Arquivo bloqueado no banco sob lock se
qualquer contato ainda estiver vinculado, inclusive contato mesclado. Não há
DELETE comercial ou cascade de contatos. Arquivo é definitivo nesta superfície;
não foi criado fluxo de desarquivamento.

Anônimo não lê catálogo. Viewer lê; agent/manager/admin vinculam contatos dentro
da permissão existente. Admin cria/edita/arquiva cadastro e pode criar/vincular
rapidamente pela ficha do contato. API e banco verificam sessão/MFA/suporte.
Catálogo não permite escrita direta por authenticated ou service role. Escrita
técnica de contacts por service role continua exigindo organização explícita e
passa por FK/trigger estrutural. Organização não vem do body.

## Banco e compatibilidade

Quatro migrations novas, baseline idempotente literal antes da varredura anon,
quatro linhas no MANIFEST, aplicadas no Geral 1:

| Migration | Efeito |
|---|---|
| 0251 | Cadastro, RLS, FK de contato, guards, gestão/arquivo e auditoria |
| 0252 | Histórico de vínculo usa auditoria existente e sua projeção na timeline |
| 0253 | Criação idempotente no ledger existente; auditoria de vínculo não bloqueia mutação se falhar |
| 0254 | Protege apenas o namespace B2B do ledger contra adulteração direta |

0251 revelou na prova que crm_lead_activities exige lead_id. A correção 0252 não
inventou oportunidade para contato: projeta contact.company_changed do audit
log na timeline existente de contacts. A migration aplicada não foi reescrita.
O histórico usa IDs anteriores/atuais e frases humanas sem nomes/documentos em
logs. Falha do catálogo no audit é comunicada ao logger pelo flag audit_recorded;
falha de audit do trigger de vínculo emite warning sanitizado do banco e não
derruba a mutação. A timeline mostra erro de leitura, não vazio falso.

Idempotency-Key UUID: criação serializada por organização, ledger já existente,
fingerprint SHA256 do JSON canônico, chave por ator e TTL de 24h. Replay retorna
a mesma identidade; conteúdo diferente com a mesma chave conflita. Trigger
privado protege somente endpoint crm-company:create, sem alterar permissões
históricas de outros endpoints; cascata da organização própria foi provada.

Migrations são reaplicadas em ordem duas vezes pela prova versionada
`scripts/supabase/b2b-migration-probe.sql`, preparada por
`prepare-b2b-migration-probe.mjs`; resultado ignorado em
`.local-dev/bloco-d/migration-probe.sql`. Prova Geral 1 em rollback passou:
RLS A/B, vínculo, troca, remoção, rename mantendo ID, homônimos, documento/tipo
duplicado, arquivo usado bloqueado, arquivo sem vínculo, catálogo preservado,
viewer negado, histórico, replay/conflito e recibo protegido. Isso usa
role/claims SQL controlados, **não substitui JWT reais**.
Prova adicional de cleanup da organização com contato ainda vinculado passou.

Types regenerados pelo conector contra o schema real; sem edição manual.
Constraints/grants verificáveis no schema aplicado. RLS da empresa limita SELECT
à organização; não há caminho direto de escrita para papéis de cliente.

Legado empresarial de integrations/custom_fields permanece informação de
origem; não é escrito como vínculo canônico. Writers antigos de contatos
continuam funcionando sem company_id. Alterar empresa usa API dedicada, sem
sobrescrever por formulário/import legado. Merge de contatos mantém os vínculos
de cada registro preservado, sem escolher silenciosamente empresa diferente
para o principal. Revisão manual resolve divergência antes de arquivar.
Anonimização remove company_id; não elimina a empresa compartilhada.
Retirada de textos de origem requer migrar seus leitores/imports explicitamente
em fase futura. Nenhum segundo catálogo empresarial foi mantido.

## API, UI e contexto

GET /api/v1/companies: busca por nome, paginação, catálogo, empresa específica ou
vínculo atual de contato. Contagens/contatos/oportunidades consideram registros
visíveis e são lidos com organização explícita; listas derivadas percorrem os
lotes REST para não confundir limite de resposta com total.
POST: comandos estritos create/edit/archive/link; admin no catálogo, agent no
vínculo; wrappers/erros canônicos e logger sanitizado.

CRM → Empresas é registrado no catálogo central/hub/paleta. Lista tem busca,
documento/tipo, cidade/estado, número de contatos visíveis e acesso à ficha.
Ficha apresenta dados, contatos e oportunidades derivadas; atividades continuam
na ficha/timeline dos contatos, sem timeline empresarial paralela.

Contato tem seletor buscável, abrir empresa, trocar/remover vínculo e criação
rápida admin por nome. Formulário empresarial fica na área Empresa; não amplia
o formulário de contato. Dossiê e ficha já existente da Inbox apresentam empresa
como leitura contextual. Não há edição redundante do vínculo na oportunidade.
MCP crm_get_contact retorna id/name da empresa derivada, com organização explícita;
não foram criadas tools de gestão empresarial ou ações/eventos de automação.

Estados loading/empty/erro/retry/sem empresa/sem contatos são distintos. Viewer
não recebe controles de escrita, suporte readonly é respeitado. Labels, controles
nativos, diálogo e texto quebrável foram implementados; inspeção e jornada real
nas duas viewports ainda estão pendentes.

## Verificação e limites

- Typecheck passou após tipos e API finais.
- Lint: 0 erros, 350 warnings preexistentes.
- Build final passou após o ajuste de seção única de empresa.
- Testes focados de aceite: 164 casos em oito arquivos passaram, incluindo UI
  contextual, API/Zod, painel comercial, baseline, mapa, navegação e tokens.
  Contratos de navegação/suporte/fragmentos: 48 casos passaram; quatro checks
  de tradução passaram e um permanece na dívida do laboratório visual anterior.
  Rodadas se sobrepõem e não devem ser somadas.
- O painel comercial tinha mocks antigos sem useMutation; foi isolado o novo
  componente filho e adicionados testes próprios de viewer, agent, leitura,
  erro/retry e loading. Os casos passaram após atualização.
- Duas tentativas da suíte global foram interrompidas por falta de conclusão,
  incluindo a segunda com maxWorkers=4. Não houve resumo integral confiável.
  Os logs registram falhas das famílias preexistentes (release/bash, import de
  leads, LGPD PDF, namespace, i18n/probes). As novas falhas de mock do painel
  e inventário do hub foram corrigidas e seus casos passaram em execução focada.
  Três famílias com timeout na primeira tentativa (icons/theme/marker) passaram
  novamente: seis casos. Não declarar suíte global aprovada ou inventar total.
- test:db não executou no PATH Windows sem bash; Git Bash confirmou docker
  ausente. Docker/harness pg15 continua
  complementar e não foi declarado aprovado.
- A prova SQL terminou em rollback; consulta independente confirmou zero
  organizações dos namespaces b2b-probe/b2b-cleanup. A limpeza da
  futura suíte JWT/browser ainda exige relatório e conferência independente.

Advisor relacionado: funções manage, contact_history e command usam SECURITY
DEFINER intencionalmente, com escopo/autorização explícitos, search_path fixo e
PUBLIC/anon revogados. [Orientação](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
Índice novo contacts_company_org inicialmente sem uso; não remover um índice
de FK para esconder o aviso. [Orientação](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).
Avisos de objetos históricos fora de D permanecem fora do escopo.
[RLS oficial](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Living System Checklist

1. Entrada: UI/POST companies e vínculo validado em contacts.
2. Saída: contato → dossiê/Inbox; empresa → lista de contatos/oportunidades.
3. Registro: api_audit_log company.* e contact.company_changed.
4. Tela: ficha Empresa e projeção de vínculo na TimelineView do contato.
5. Porta: NAV_CATALOG /app/companies, lista e links contextuais.
6. Anti-morte: cadastro não é demanda; oportunidades/tarefas mantêm os mecanismos
   do Bloco B, sem inventar SLA ou follow-up empresarial.
7. Configuração: admin vê/edita cadastro; ausência aparece como sem empresa.
8. Continuidade: pessoa registra vínculo; MCP/contexto humano lê mesma identidade.
9. Retorno: erro da escrita permanece visível com retry; vínculo incorreto pode
   ser trocado/removido com auditoria, sem decisão automática.
10. Mapa: crm-vivo inclui Empresa → contato → oportunidade e auditoria → timeline
    do contato; sitemap e user-journey-map foram atualizados.

## Gaps e Git

Tentativa real B2B de 2026-10-03: Auth/REST/Storage/Realtime e a bateria JWT
B2B de isolamento/permissões passaram. A jornada parou por browser_timeout
no bloco de contato/vínculo, antes de confirmar a tela; fixtures_cleaned=true.
Não representa homologação completa. O harness agora distingue seletor,
envio por teclado, resposta HTTP e exibição do vínculo, e captura somente
a tela fictícia em b2b-failure.png quando houver falha. Nenhuma mudança
funcional foi feita por hipótese; próxima execução deve localizar a causa.

P0: nenhum identificado nas provas concluídas; não constitui aceite final.
P1: Auth/JWT/MFA reais, jornada/inspeção 1440×900/390×844 e cleanup B2B pendentes.
P2: dívidas preexistentes da suíte global e branding público/funil histórico,
fora do escopo; nenhum Bloco E, propostas ou financeiro foi iniciado.
P3: harness Docker/pg15 complementar, observações do Advisor e futura importação
estruturada/retirada de textos de origem, sem novo requisito de produto.

D permanece local, sem push/merge/rebase. `docs/DESKCOMM_UPSTREAM_AUDIT.md`
preservado não rastreado, fora de commits, SHA256
`1689EF1DBD1FCA2A2B8E3C88522897471BC2CDE7A0ACFB5F6CF9474D2EA9F7D4`.
Não iniciar Bloco E: prontidão depende de encerrar a homologação B2B.
