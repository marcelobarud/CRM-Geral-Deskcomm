# Fase 2.3 — seleção funcional do upstream para o CRM Geral

## 1. Resumo executivo

O melhor aproveitamento do upstream é melhorar a organização do trabalho comercial: tags consistentes, probabilidade por etapa, filtros e contexto da Inbox, agenda confiável e relatórios de conversão. Propostas simples e empresas podem ter valor alto, mas exigem decisões sobre o modelo do produto. Financeiro completo, campanhas com envio automático, prospecção autônoma e telefonia ampliam substancialmente a operação e a manutenção.

**Todas as prioridades e formas de adoção deste documento são propostas INFERIDAS, não decisões aprovadas, autorização de implementação ou roadmap.** A existência de código no upstream não demonstra necessidade para o CRM Geral. A classificação ESSENCIAL indica importância conceitual para o CRM; não manda importar a implementação upstream.

Mais interessantes, sem ordem de execução: tags gerenciáveis; probabilidade por etapa; relatórios comerciais; filtros/contexto da Inbox; agenda local; propostas básicas; empresa vinculada ao relacionamento; listas de prospects; roteiros curtos de atendimento; configuração de IA por capacidade. Os três últimos grupos comerciais maiores continuam sujeitos às perguntas finais.

Provavelmente desnecessários no core: ERP financeiro, honorários jurídicos, rodízio de números para campanhas, prospecção autônoma, catálogo público de extensões, banco externo genérico e infraestrutura SIP/AudioSocket. Podem existir como módulos ou integrações se houver demanda aprovada.

**Base CONFIRMADA:** análise em 02/10/2026, branch `main`, HEAD `591c99635db11c9a6b1483c46fa3196b76d8e5a1`, sincronizada com `origin/main`. O histórico contém os sete commits originais da Fase 2.2 e o ajuste posterior de invariantes, até `78e780e5cd08d3b07a533603b40ef0defae4db30`. A tag `crm-geral-pre-functional-selection` identifica essa base. O único remote é o fork `https://github.com/marcelobarud/CRM-Geral-Deskcomm.git`.

Referências: [auditoria 2.1](DESKCOMM_UPSTREAM_AUDIT.md), [hardening 2.2](UPSTREAM_HARDENING_PHASE_2_2.md), baseline histórico `61a65b3894d5ba2e0a41398705503a81e31dbc16` e upstream congelado `bb20342d6aacdf762201bd48d0da6809b7d9cb6d` (U). Referências a caminhos upstream neste relatório significam o arquivo em U, consultável com `git show U:caminho`; não significam que o arquivo existe na base local.

SSRF, path traversal, auditoria, RLS de follow-up, LGPD portada, segredo dos crons selecionados e fixes da Inbox tratados na Fase 2.2: **já incorporado / fora desta seleção**.

## 2. Princípios usados

- Favorecer relacionamento, oportunidade, atendimento, agenda e visibilidade comercial, reutilizáveis entre segmentos.
- Separar valor de produto de prontidão técnica: uma feature útil pode depender de serviços ainda não equivalentes no runtime local.
- Separar capacidade básica de módulo completo; dados comerciais não equivalem a contabilidade, e atribuição não equivale a plataforma de anúncios.
- Evitar duplicar entidades, telas e motores já existentes. Primeiro identificar a lacuna que o recorte resolve.
- Preservar PostgreSQL/Auth/REST locais e contratos de distribuição. Não presumir equivalência com PostgREST, Storage, Realtime ou integrações externas.
- Complexidade inclui dados, permissões, API, UI, workers, serviços, recuperação de falhas e manutenção futura. Não é estimativa de dias.
- CONFIRMADO significa observado nas referências ou no código consultado; INFERIDO identifica avaliação/proposta. Não houve execução de features upstream nem validação operacional nesta fase.

O inventário vem da auditoria 2.1, especialmente §§5–6, 12–20, 22–24 e 27–31. Código U foi consultado apenas para esclarecer B2B, propostas, comanda, extensões, banco externo, roteiro, rascunhos e Jev. Não foi repetido o inventário completo de commits, migrations, rotas ou páginas.

## 3. Mapa Core × Módulo × Integração

Mapa proposto INFERIDO; a classificação detalhada por recorte está na matriz (§27).

| Tipo | Capacidades candidatas | Limite proposto |
|---|---|---|
| CORE CRM | Tags, probabilidade por etapa, filtros/notas textuais, agenda local, valor do negócio, relatórios comerciais, atribuição de origem | Trabalhar com o relacionamento e o negócio, sem exigir operação externa adicional |
| MÓDULO OPCIONAL | Propostas, B2B completo, campanhas de relacionamento, roteiros, automações avançadas | Ativação deliberada; não multiplicar menus para quem não usa |
| INTEGRAÇÃO | Google Calendar/Meet, Ads, enriquecimento, transcrição, banco externo | Credenciais, rede e falhas próprias; core continua útil sem elas |
| INFRAESTRUTURA | SMTP, configuração de instalação, providers genéricos, indexação RAG | Apoia capacidades; não é uma nova área comercial |
| EXTENSÃO FUTURA | Honorários, financeiro completo, catálogo de extensões, Jev, SIP/AudioSocket | Exige demanda, contrato de produto e capacidade operacional antes de desenho definitivo |

Empresa pode pertencer ao CORE CRM em uma visão B2B, mas isso ainda é **PRECISA DECISÃO DO USUÁRIO**. Propostas podem ser opcionais ou parte principal da venda; não se escolhe esse posicionamento pela estrutura de menus upstream.

## 4. Quick wins

**Quick wins funcionais propostos:** recortes pequenos que usam dados existentes e não precisam, por natureza, de novo serviço externo. A confirmação técnica de isolamento fica para uma fase autorizada.

| Candidato | Utilidade | Limite para continuar pequeno |
|---|---|---|
| Busca no texto das mensagens já carregadas | Localizar contexto sem percorrer a conversa inteira | Deixar claro que não pesquisa todo o histórico; sem indexador novo |
| Exibir transcrição já disponível no balão | Ler áudio em ambiente de trabalho | Só renderizar texto existente; não instalar serviço de transcrição |
| Filtro de tags existentes | Encontrar grupos de contatos/negócios/conversas | Sem normalização global ou novo catálogo neste recorte |
| Resumo de valor ganho por moeda | Visibilidade comercial com `value_cents`, `currency` e status existentes | Não chamar de recebimento/caixa; não somar moedas distintas |
| Clareza de fuso, endereço e situação na agenda | Evitar interpretação errada do compromisso | Apenas dados já disponíveis; sem integração Google ou motor de lembretes |

Cores de tags, probabilidade persistida por etapa, merge de tags, anexos, rascunhos sugeridos por integração e PDF de propostas **não** são considerados quick wins completos: atravessam persistência, contratos ou serviços. Cálculo puro de previsão pode ser isolável tecnicamente, mas sozinho não entrega uma feature ao usuário.

## 5. Tags

**CONFIRMADO — auditoria §12:** U normaliza o vocabulário, oferece cores e operações transacionais de renomear, juntar e excluir, com filtros. A tela de configuração usa `fn_vocabulario_de_tags` e `fn_vocabulario_de_tags_operar`. A criação ocorre pela atribuição ao dado; não foi comprovado catálogo independente de tags vazias. A API de relatório existe, mas não equivale a uma página de relatório pronta.

Resolve nomes duplicados e segmentação inconsistente para atendentes, vendedores e gestores. Aparece como etiquetas nos registros, filtros e gestão do vocabulário. Sobrepõe as tags em strings já existentes: `lib/types/leads.ts` local declara `tags: string[]`. A migração para identidade estável altera dados, automações e relatórios, portanto não é apenas ajuste visual.

**Proposta INFERIDA:** tag como entidade gerenciável por organização, com nome normalizado e cor opcional; atribuições contextualizadas a contatos, leads e conversas. Automações consomem/aplicam tags, sem pressupor que a própria regra seja uma quarta entidade etiquetável. Renomear/merge preservariam referências; retirar de um registro seria diferente de excluir do vocabulário inteiro. Exclusão global precisaria apresentar os impactos e tratar regras que recriam a tag. Não adotar exclusão global silenciosa.

O relatório por tag vale quando a equipe realmente usa segmentação; começar por filtros e contagens com contexto, evitando contar contato, lead e conversa como a mesma unidade. Merge é útil para higiene do vocabulário; cores são conveniência, não informação única. **PRECISA DECISÃO DO USUÁRIO** sobre entidade, escopos e exclusão. Valor ALTO, tipo CORE CRM, complexidade MÉDIA para versão contextual básica e ALTA para identidade/merge/múltiplos escopos; adoção proposta: ADOTAR SIMPLIFICADO.

## 6. Forecast

**CONFIRMADO:** U adiciona probabilidade de ganho por etapa e previsão ponderada. `lib/leads/previsao.ts` agrupa negócios abertos por moeda e mês de fechamento esperado, separa ausência de data/probabilidade e permite fonte por etapa ou IA quando houver. A base local já tem valor, moeda, data prevista e score de IA (`lib/types/leads.ts`); score individual não é a mesma coisa que taxa configurada por etapa.

Serve a gestores que precisam interpretar o funil. Probabilidade aparece na edição da etapa; forecast agrega previsão em uma visão comercial. Depende de oportunidades e estágios, não de comandas nem de contas financeiras. Previsão ponderada não garante receita e não deve receber a aparência de saldo a receber.

| Recorte | Parecer proposto | Complexidade / adoção |
|---|---|---|
| Probabilidade por etapa | INTERESSANTE; ALTO; CORE CRM | MÉDIA; ADOTAR COMO ESTÁ CONCEITUALMENTE |
| Resumo ponderado por moeda/período | INTERESSANTE; ALTO; CORE CRM | MÉDIA; ADOTAR SIMPLIFICADO |
| Dashboard completo e escolha entre probabilidade da etapa/IA | OPCIONAL; MÉDIO; MÓDULO OPCIONAL | ALTA; ADOTAR PARCIALMENTE |

Proposta: primeiro definir fonte e significado; não combinar silenciosamente score de IA e taxa da etapa. Não importar percentuais padrão como regra do CRM Geral. Dashboard completo pode esperar demanda; há valor na configuração por etapa mesmo sem ele.

## 7. CRM B2B

**CONFIRMADO:** U implementa `companies`, `people`, `company_people`, importações e `contacts.person_id`. A migration 0448 e `lib/crm-b2b/schemas.ts` permitem múltiplos vínculos pessoa–empresa, com cargo, departamento, decisor e contato principal. `people-handler.ts` lê esses vínculos; a importação faz associação de empresas/pessoas/contatos. O recurso inclui enriquecimento, que não é requisito conceitual para cadastrar uma empresa manualmente.

Resolve relacionamentos com organizações e vários interlocutores, para vendas B2B e serviços corporativos. Aparece em fichas/listas de empresas e pessoas e importação de planilha. Sobrepõe o contato atual: criar uma pessoa nova sem definir sua relação com o contato pode duplicar identificação e histórico. A base local liga lead a `contact_id`; empresa e pessoa não são campos equivalentes já disponíveis nesse contrato.

**PRECISA DECISÃO DO USUÁRIO:** empresa como entidade própria; contato como ponto de comunicação ou identidade comercial; múltiplas afiliações; oportunidade vinculada à empresa e a uma ou mais pessoas. Não há aprovação para substituir o contato atual. A proposta mais simples seria empresa opcional vinculada a contatos existentes, preservando o atendimento; um cadastro `people` separado só se trouxer benefício demonstrável.

Importação em massa é útil para migração de clientes e entrada de carteiras, mas exige prévia, deduplicação, identificação de erros e associação inequívoca. Não precisa ser aprovada junto com o B2B inteiro. B2B completo: valor ALTO para operação corporativa e MÉDIO para uso genérico, tipo MÓDULO OPCIONAL enquanto o posicionamento não é definido, complexidade ALTA, adoção REIMPLEMENTAR PARA O CRM GERAL. Vínculo simples empresa–contato: ADOTAR SIMPLIFICADO, complexidade MÉDIA.

## 8. Financeiro

**CONFIRMADO — auditoria §5 e código `lib/financeiro/comanda.ts`:** U acrescenta contas, métodos de pagamento, plano de contas, vendas/comandas, itens, lançamentos, recorrência, comissões, fidelidade e relatórios. A comanda tem cálculo de item e regras de comissão vinculadas a pessoa/serviço; não é somente soma do valor de leads. Aparece em áreas de comandas/faturamento e serve especialmente a operações com atendimento, caixa e serviços.

Sobreposição: o CRM já registra valor/moeda/status do negócio. Valor ganho é resultado comercial, não prova de pagamento. O financeiro completo acrescenta responsabilidades sobre lançamento, estorno, saldo, parcelas, fechamento e acesso a dinheiro; multiplicaria tabelas, permissões, rotinas e telas. Complexidade MUITO ALTA para o conjunto, valor ESPECÍFICO DE NICHO sob o perfil genérico.

| Conceito | Limite proposto |
|---|---|
| Valor da oportunidade | CORE CRM; ESSENCIAL; usar o conceito existente |
| Valor de negócios ganhos | CORE CRM; INTERESSANTE; relatório comercial por moeda, sem equivaler a caixa |
| Comissão comercial | MÓDULO OPCIONAL; PRECISA DECISÃO DO USUÁRIO; definir base, responsáveis e momento de reconhecimento |
| Contas/lançamentos/comandas/recorrência/fidelidade | EXTENSÃO FUTURA; PRECISA DECISÃO DO USUÁRIO; não importar regras financeiras do upstream |

FULL UPSTREAM → operação financeira e de serviços. CRM GERAL SIMPLIFICADA → valor do negócio e análise de ganhos; comissão opcional somente após definição própria. Simplificar significa deliberadamente não oferecer controle financeiro completo. Adoção: ADOTAR PARCIALMENTE para visão comercial; MANTER COMO IDEIA FUTURA para o financeiro integral.

## 9. Honorários

**CONFIRMADO:** `app/api/v1/honorarios/contratos/route.ts` usa cobrança fixa, por êxito ou mista, valor fixo, percentual de êxito e `repasse_advogado_pct`, com vínculo opcional ao lead. Há parcelas e ação de pagamento. O módulo é instalado na administração da instalação; não é apenas um interruptor de menu.

O contrato explícito de repasse a advogado confirma orientação vertical de advocacia, com possível analogia a outros serviços profissionais. Não é uma comissão comercial genérica pronta. Serve a equipes que acompanham contratos e parcelas de honorários; aparece em contratos/parcelas/pagamentos. Sobrepõe parte de comissão/financeiro e usaria identidade, oportunidade e permissões existentes.

Proposta: FORA DO ESCOPO do core genérico; valor ESPECÍFICO DE NICHO; EXTENSÃO FUTURA; ALTA; MANTER COMO IDEIA FUTURA. Uma adaptação para serviços profissionais exigiria nova decisão de regras, não apenas renomear advogado. Não há dependência obrigatória do financeiro completo demonstrada neste recorte; não inventar essa cadeia.

## 10. Propostas

**CONFIRMADO:** U oferece itens, modelos, versões/substituição, briefing assistido, revisão, PDF, envio, status e expiração. `lib/propostas/tipos.ts` guarda vínculo com lead/contato, total, versão e resultado do envio. O schema de itens referencia catálogo de produtos; `lib/propostas/storage.ts` usa armazenamento. `porta.ts` controla capacidade por organização.

Resolve a passagem de conversa/oportunidade para documento comercial, para vendas consultivas e serviços de diferentes segmentos. Aparece como editor/lista de propostas, modelos e documento ao cliente. Há sobreposição com valor do lead, catálogo e contexto do agente; o benefício é formalizar a oferta, não recriar toda a oportunidade.

**PRECISA DECISÃO DO USUÁRIO** sobre ser módulo principal ou opcional, autonomia de edição e documentar versão enviada. Proposta simplificada: título, destinatário, itens, total/moeda, validade, estados básicos e versão enviada preservada. Modelo reutilizável e PDF são recortes independentes de IA; briefing inteligente, revisão assistida e envio integrado podem esperar.

Valor ALTO, tipo MÓDULO OPCIONAL, ALTA na versão básica com PDF/armazenamento e MUITO ALTA no conjunto assistido. Adoção ADOTAR SIMPLIFICADO. Não foi demonstrado B2B ou financeiro completo como pré-requisito obrigatório; os vínculos comerciais principais confirmados são lead e contato. Modelos/documentos enviados exigem persistência e autoria; copiar só o editor não entrega a jornada.

## 11. Campanhas

**CONFIRMADO — auditoria §§5, 16–17:** U tem listas/destinatários, templates, supressões, métricas e agendamento de envio; a operação WhatsApp depende de canal/WAHA e workers. Grupos não equivalem a destinatários individuais. O escopo analisado inclui rodízio de números, que acrescenta coordenação operacional.

Resolve contato planejado com uma carteira, para relacionamento, retomada e comunicação comercial. Aparece como campanha com público, texto e acompanhamento. Sobrepõe tags, filtros, templates, follow-ups e automações. Antes de outro motor, é preciso distinguir uma ação sobre uma lista de uma sequência de acompanhamento individual.

Proposta: segmentação/lista e template aprovável são INTERESSANTES, valor MÉDIO e MÓDULO OPCIONAL; execução agendada é ALTA. **PRECISA DECISÃO DO USUÁRIO** para envio em lote: escolher objetivo, consentimento/supressão e quem opera. Versão simplificada pode preparar ações/tarefas ou mensagens para revisão humana, sem scheduler próprio. Supressão precisa funcionar em qualquer versão que envie.

Plataforma de marketing em massa e rodízio de números: NÃO PRIORITÁRIA, valor BAIXO para o core genérico, MUITO ALTA, NÃO ADOTAR no recorte atual. Não interpretar rodízio como garantia de entrega. Adoção do recorte de relacionamento: ADOTAR SIMPLIFICADO; full automático: MANTER COMO IDEIA FUTURA.

## 12. Prospecção

**CONFIRMADO — auditoria §5:** U pesquisa empresas, prepara contatos e enfileira outreach gradual com IA, com persistência, crons e integração ao atendimento. Isso inclui descoberta e ação, não apenas uma lista comercial.

| Recorte / público e UX | Sobreposição e dependência | Proposta |
|---|---|---|
| Lista de prospects: pré-vendas organiza alvos e próximo passo | Contatos/leads/filtros existentes; evitar cadastro paralelo permanente | INTERESSANTE; MÉDIO; CORE CRM; MÉDIA; ADOTAR SIMPLIFICADO |
| Pesquisa/enriquecimento: operador completa informações e revisa origem | Empresa opcional, fontes externas, rede e procedência | OPCIONAL; MÉDIO; INTEGRAÇÃO; ALTA; ADOTAR PARCIALMENTE |
| Outreach automático: operador define público/texto/ritmo e acompanha execução | Canal, workers, opt-out, dedupe; sobrepõe campanhas/follow-up | PRECISA DECISÃO DO USUÁRIO; MÉDIO; MÓDULO OPCIONAL; MUITO ALTA; MANTER COMO IDEIA FUTURA |
| IA de prospecção: pesquisa/decide abordagem e prepara ou executa ações | IA, custos, fontes e revisão; domínio de atuação precisa ser definido | ADIAR; MÉDIO; EXTENSÃO FUTURA; MUITO ALTA; MANTER COMO IDEIA FUTURA |

FULL UPSTREAM combina descoberta e abordagem automatizada. Versão simplificada usa contatos/oportunidades com origem e status de pré-venda, pesquisa manual e tarefa humana. Lista não exige contratar fonte de enriquecimento nem ligar envio. Não há autorização para descobrir dados pessoais ou abordar alvos nesta fase.

## 13. Extensões

**CONFIRMADO:** `lib/extensions/manifest.ts` define perfil declarativo, cartões/blocos, ações por capacidades permitidas, `dependencies: []` e `data.mode: none`. Há catálogo, compatibilidade, instalação e reversão. Isso não é mecanismo de instalar código arbitrário, DDL ou um ERP dentro do CRM.

Para administradores e equipes com necessidades distintas, aparece como catálogo e cartões que orientam/acionam capacidades do host. Sobrepõe configuração de capacidades/módulos, mas não é equivalente a ela. Honorários instalável e propostas ativadas por organização são mecanismos diferentes; não generalizar um único ciclo de instalação para todos.

**PRECISA DECISÃO DO USUÁRIO:** core pequeno com módulos opcionais é uma escolha de produto; catálogo/manifesto de terceiros é outra. Proposta: preservar a possibilidade de módulos bem delimitados e ativação por cliente, sem construir uma plataforma pública de extensões antes de existirem necessidades concretas. Catálogo declarativo não resolve sozinho financeiro/honorários com dados próprios.

Valor MÉDIO, EXTENSÃO FUTURA, ALTA, MANTER COMO IDEIA FUTURA. Uma configuração simples de capacidades teria complexidade MÉDIA e adoção ADOTAR SIMPLIFICADO, sem prometer ecossistema de plugins.

## 14. Roteiros/Jev

### Roteiros de atendimento

**CONFIRMADO:** `lib/agent-engine/agent/roteiro-no-turno.ts` integra um módulo opcional ao turno do agente, coleta/valida respostas, mantém estado, pode acrescentar skills no passo e aplicar finalização. O roteiro pode ser indicado pela intenção do roteador. Serve a qualificação, triagem e coleta padronizada; aparece como editor de roteiro e andamento da conversa. Reutiliza o agente e infraestrutura de fluxos, portanto não é um chatbot independente.

| Conceito | Função no produto |
|---|---|
| Prompt | Instruções gerais de comportamento do agente |
| Skill do agente de produto | Conhecimento/instrução reutilizável aplicado conforme contexto; diferente dos guias de agentes de código |
| Roteiro | Sequência com estado, perguntas/campos e critério de conclusão durante atendimento |
| Follow-up | Retomada/acompanhamento ao longo do tempo, normalmente com espera e condições de continuidade |
| Automação | Reação a eventos com condições e ações sobre o CRM/canais |

Proposta: INTERESSANTE, ALTO, MÓDULO OPCIONAL, ALTA, ADOTAR SIMPLIFICADO. Roteiro curto com campos obrigatórios pode resolver uma lacuna real; fluxos extensos com ramificações aproximam-se de workflow builder. Evitar três lugares contraditórios dizendo quando perguntar e quando retomar. Depende de estado do atendimento e publicação/versionamento, sobrepõe skills/follow-up; uso genérico se configurável, embora exemplos sejam de nicho.

### Jev — segunda avaliação de decisões do atendimento

**CONFIRMADO no código U (`lib/ai/decisao/{config,tarefas,roteador,clima}.ts`):** é um serviço externo que avalia sinais/decisões ao lado dos mecanismos atuais. Não é mais um atendente que responde ao cliente. Tem tarefas para clima da conversa, manipulação, escolha de intenção/agente, pedido de humano, pedido de parar e classificação de resposta a follow-up.

Em modo observação registra resultados para comparação. Algumas tarefas podem decidir: clima pode usar o serviço primeiro com IA de reserva; roteador compara entre as intenções configuradas e pode usar sua escolha, mantendo o mecanismo existente como reserva. Manipulação acrescenta sinal. Pedidos de humano/parar não transferem nem bloqueiam automaticamente: quando a regra não reconhece o pedido, podem abrir aviso na Central para a equipe. Classificação de follow-up **somente observa** nesse snapshot. Os efeitos não são iguais para todas as tarefas.

Para gestores de operação de IA, a UX é cartão de configuração, comparação, execuções/cobertura e avisos. Resolve análise de qualidade e sinais não percebidos; sobrepõe roteador, classificadores, guardrails e alertas existentes. Exige API/credencial BYOK externa, aceite explícito do administrador sobre o alcance enviado, telemetria/persistência, workers e reservas por tarefa. Dados continuam sujeitos a tratamento e revisão de privacidade; não presumir anonimização integral porque há scrub.

Proposta: ADIAR, MÉDIO, EXTENSÃO FUTURA, MUITO ALTA, MANTER COMO IDEIA FUTURA. Primeiro demonstrar que classificadores/relatórios atuais deixam uma lacuna. Uma versão independente do fornecedor pode limitar-se à revisão humana de decisões e avisos existentes; isso seria REIMPLEMENTAR PARA O CRM GERAL, não importar o Jev completo.

## 15. Inbox

**CONFIRMADO — auditoria §13 e `lib/inbox/rascunho-sugerido.ts` em U:** há evolução de notas, anexos, grupos, transcrição, filtros/tags, fila/handoff, presença, arquivamento e rascunhos. A base local já possui drafts do agente (`draft-reply.ts`, `reply-drafts.ts`); rascunho sugerido por integração é outra origem: texto persistido abre no composer, identifica a origem e exige clique humano para enviar.

| Recorte | Valor/UX/público | Dependências e parecer proposto |
|---|---|---|
| Notas textuais, filtros e tags | Contexto de equipe, organização da fila e busca; atendentes/gestores | Úteis sobre conversas existentes sem WAHA; CORE CRM, ALTO, INTERESSANTE; notas adicionais MÉDIA |
| Anexos em notas | Documentação compartilhada na ficha/conversa | Storage, autorização e retenção; ALTA, OPCIONAL; Realtime não é necessário para a ideia, mas faz parte da implementação U |
| Grupos | Atendimento em conversas coletivas com remetente identificado | WAHA, modelo de interlocutores e exclusão de fluxos individuais; ALTA, ADIAR |
| Transcrição visível | Acessibilidade e consulta ao conteúdo de áudio | Texto já disponível: BAIXA/INTERESSANTE; produzir texto: integração de mídia/IA, ALTA/OPCIONAL |
| Handoff/fila com contexto | Saber quem atende e não perder responsabilidade | Equipe/atribuição/estado; sem nova conexão WAHA para ler/gerir histórico; ALTA, INTERESSANTE |
| Presença | Indicação de atividade/disponibilidade | Distinguir presença humana de sinal do canal; sinal WAHA requer serviço; MÉDIA, OPCIONAL |
| Arquivamento | Reduzir ruído preservando histórico | Estado + rechecagem de envio/destino; ALTA, INTERESSANTE; botão isolado não basta |
| Rascunho sugerido por integração | Atendente revisa texto de ERP/outro sistema antes de enviar | Persistência, token, validade/consumo e composer; MÉDIA, OPCIONAL; não é só salvar digitação local |

Simplificar: contexto textual/filtros sobre histórico disponível e sugestões com revisão humana. Não exigir grupos, anexos Realtime e produção de áudio para melhorar a Inbox. Consulta de histórico, notas e organização de fila podem ser úteis sem WAHA; envio, recebimento real, grupos e sinais do canal dependem dele. Adoção geral ADOTAR PARCIALMENTE; ALTO para organização do atendimento e MÉDIO para recursos adicionais.

## 16. Agenda

**CONFIRMADO — auditoria §15:** U evolui endereços, remarcação, lembretes/reconciliação, fuso, comparecimento/falta e cliente criado do agendamento; integra disponibilidade Google, Meet opcional e calendários de colegas. A agenda já existe na base, logo não se propõe outro módulo de calendário.

Serve a equipes que convertem conversa em compromisso, com grade, ficha, disponibilidade e situação. Core local: horário/fuso explícito, endereço/local, remarcação compreensível, situação de presença/falta e vínculo/criação controlada do cliente. São genéricos e de valor ALTO; core de agenda INTERESSANTE, MÉDIA, ADOTAR PARCIALMENTE. Criar cliente requer deduplicação e distinção entre agendar para contato existente e cadastrar outro.

Lembretes são úteis, mas demandam scheduler/canal, cancelamento e prevenção de envio repetido; não são apenas campo na tela. Comparecimento/falta pode alimentar funil/automação, porém a regra comercial de movimentação não está aprovada. Adoção ADOTAR SIMPLIFICADO para status e tarefas, não copiar regra de um nicho.

Google/Meet/colegas: INTEGRAÇÃO, MÉDIO, ALTA, OPCIONAL, ADOTAR PARCIALMENTE. Depende de OAuth, permissões por calendário, privacidade de títulos e reconciliação. Agenda local deve funcionar sem Google; escolher integração não autoriza expor agenda privada de colegas.

## 17. Automações

**CONFIRMADO:** a base local já possui eventos, regras/condições e executores (`lib/automation/{engine,types}.ts`), além de follow-ups com grafo. U amplia gatilhos, condições/graph, falhas de envio, eventos de etapa, IA, janelas/debounce e deduplicação; a auditoria §17 identifica esses grupos. Automação não precisa nascer novamente.

Resolve tarefas repetidas e continuidade de atendimento para operadores/gestores, via regras/fluxos e histórico de execução. Sobrepõe roteiros e follow-ups: é essencial esclarecer qual motor é responsável por qual ação. Dedupe/retries/eventos são capacidades de execução, não módulos comerciais nem promessa de executar tudo uma vez em qualquer cenário.

Proposta: evoluir recortes demonstráveis — gatilhos de etapa, condições legíveis, janelas e visibilidade do resultado — é INTERESSANTE, ALTO, MÓDULO OPCIONAL, ALTA, ADOTAR PARCIALMENTE. A suficiência atual **não foi demonstrada por operação real**; inventário de código não prova atender às necessidades do usuário. **PRECISA DECISÃO DO USUÁRIO** sobre workflow builder generalista, com complexidade MUITO ALTA. Reutilizar fluxos existentes pode evitar novo editor e novo motor.

IA em condição/classificação é opcional e introduz custo/indeterminação; retries e dedupe devem respeitar ações já concluídas. Janelas de contato e debounce têm significados diferentes. Qualquer futura alteração de execução exige revisão de produtor/consumidor, sem presumir que toda automação dependa de Redis.

## 18. IA/providers

**CONFIRMADO — auditoria §14:** U acrescenta DeepSeek, Requesty, provider customizado, embeddings Gemini, controles de raciocínio/transcrição, CSV no RAG, hash/rebuild e evolução de contexto/memória/roteiros. A base já tem providers, skills, drafts, guardrails e contexto do agente; multiplicar nomes não comprova ganho para o produto.

| Recurso / problema / UX | Proposta e dependências |
|---|---|
| Provider genérico: escolher capacidade/modelo/credencial sem alterar cada feature | INTERESSANTE, ALTO, INFRAESTRUTURA, ALTA; REIMPLEMENTAR PARA O CRM GERAL respeitando registry existente, limites, tools e erros |
| DeepSeek/Requesty/custom: acesso a modelos ou gateway compatível | OPCIONAL, MÉDIO, INTEGRAÇÃO, MÉDIA por adapter conhecido; ADOTAR PARCIALMENTE. Não foi avaliada qualidade, preço ou disponibilidade atual de fornecedores |
| Raciocínio: configurar esforço onde o modelo suporta | OPCIONAL, MÉDIO, INFRAESTRUTURA, MÉDIA; ADOTAR PARCIALMENTE, com compatibilidade explícita, sem parâmetro universal |
| Transcrição: converter áudio em conteúdo consultável | OPCIONAL, MÉDIO, INTEGRAÇÃO, ALTA; ADOTAR PARCIALMENTE, separando serviço de renderização na Inbox |
| Gemini embeddings | ADIAR, MÉDIO, INFRAESTRUTURA, ALTA; MANTER COMO IDEIA FUTURA. Troca de dimensão/modelo exige indexação coerente e pgvector validado |
| RAG CSV e rebuild | ADIAR, ALTO quando há conhecimento tabular, INFRAESTRUTURA, ALTA; ADOTAR PARCIALMENTE conceitualmente. Upload/Storage, pipeline vetorial, versões e visibilidade de indexação |
| Memória/contexto | INTERESSANTE, ALTO, CORE CRM, ALTA; ADOTAR PARCIALMENTE somente quando há lacuna identificada; evitar histórico duplicado e fato inferido tratado como cadastro |

Para quem configura agentes, a UX útil é seleção por tarefa/capacidade e diagnóstico de execução/custo; operadores recebem respostas e sugestões mais previsíveis. Não adotar substituição integral do turno upstream. Memória já existe conceitualmente no CRM; não foi demonstrado um módulo novo universal de memória a importar. Roteiros têm avaliação própria no §14.

## 19. SMTP

**CONFIRMADO — auditoria §§5/19:** U permite SMTP ao lado de Resend, usa nodemailer e acrescenta configuração da instalação. É infraestrutura para convite, recuperação e notificações; não cria por si uma campanha de e-mail ou caixa postal CRM.

Serve ao administrador da instalação, especialmente na distribuição self-host. Aparece em configuração/teste de envio, remetente e diagnóstico. Sobrepõe o transporte de e-mail atual. Valor MÉDIO, INFRAESTRUTURA, MÉDIA, OPCIONAL, ADOTAR COMO ESTÁ CONCEITUALMENTE. A capacidade deve esconder diferenças de transporte das features.

Proposta simplificada: um transporte por instalação, remetente configurado, teste e erro legível, sem editor de marketing nem credenciais por atendente. Importância imediata depende do modelo de distribuição; **PRECISA DECISÃO DO USUÁRIO** sobre prioridade self-host. Nenhuma configuração real foi aberta ou testada nesta seleção.

## 20. Banco externo

**CONFIRMADO:** `lib/external-db/types.ts` define conexão PostgreSQL externa, TLS, limites de linhas/filtros/bytes, catálogo de tabelas/views e leitura com operadores fechados. A auditoria registra credenciais cifradas e acesso administrado. Não é promessa de suporte a qualquer banco ou SQL arbitrário.

Pode permitir ao agente consultar pedido, estoque, contrato ou situação em outro sistema, para empresas com dados existentes. Aparece em cadastro/teste da conexão, catálogo e autorização de leitura. Sobrepõe integração por API e RAG; dado transacional atualizado não tem o mesmo uso de documento indexado.

Proposta: ADIAR, MÉDIO, INTEGRAÇÃO, MUITO ALTA, MANTER COMO IDEIA FUTURA. Credenciais, destinos de rede, TLS, allowlists de tabelas/colunas, limites, identidade de tenant e dados enviados à IA aumentam a superfície de manutenção. Leitura externa deve ter credencial restrita e exposição deliberada; essas condições são critérios de produto/arquitetura futura, não certificação da implementação U.

Versão simplificada preferível para caso concreto: conector de leitura a uma API/view definida, sem navegador universal de bancos. Pode ser módulo/plugin futuro, mas o manifesto declarativo atual de extensões não basta para executar esse conector. **PRECISA DECISÃO DO USUÁRIO** se há necessidade real; não construir infraestrutura por hipótese.

## 21. Administração

**CONFIRMADO — auditoria §20:** novos recortes U incluem email/configuração/sistema/módulos, destinos internos, extensões e observação de agente de tenant. Suporte/impersonação, métricas e billing de plataforma interagem com isso, mas não são automaticamente novos recursos comerciais do tenant.

| Domínio / usuário | Valor proposto | Limite |
|---|---|---|
| Administração do produto/instalação | Diagnóstico de configuração, email e capacidades: MÉDIO; INFRAESTRUTURA | OPCIONAL; MÉDIA; ADOTAR SIMPLIFICADO, sem copiar governança/release/triagem upstream |
| Administração do tenant | Equipe, configuração de IA e ativação de capacidades: ALTO; CORE CRM | INTERESSANTE; MÉDIA; ADOTAR PARCIALMENTE sobre settings existentes |
| Suporte da plataforma | Operação assistida entre organizações: MÉDIO; INFRAESTRUTURA | PRECISA DECISÃO DO USUÁRIO; ALTA; REIMPLEMENTAR PARA O CRM GERAL se o modelo operacional exigir |

UX proposta: configuração com situação clara e indicação de quem pode alterar, não uma coleção de novas telas administrativas. Sobrepõe admin/settings existentes. Não recomendar billing multi-cliente, provisionamento ou suspensão operacional como consequência automática do upstream; esses itens dependem do modelo de distribuição/operador e não foram reavaliados como hardening nesta fase.

## 22. Ads

**CONFIRMADO — auditoria §19:** U expande Meta/Google Ads, UTM, cliques/conversões, tracking e reprocessamento. Conversões por etapa dependem de contratos de evento e serviços externos. A base já possui origem/metadados de leads e código de atribuição (`lib/leads/atribuicao-de-anuncio.ts`), portanto não se parte de ausência total de atribuição.

Serve a vendas e marketing que precisam ligar origem à oportunidade ganha, com origem na ficha e análise de conversão. Separar CORE CRM — origem/UTM e consistência de atribuição — de INTEGRAÇÃO — credenciais Meta/Google, envio de conversão, tracking e links rastreáveis. Não pressupor que criar link rastreável seja requisito para cadastrar origem.

Origem/UTM: INTERESSANTE, ALTO, CORE CRM, MÉDIA, ADOTAR PARCIALMENTE; preservar significado já existente. Integrações Ads e links instrumentados: OPCIONAL, MÉDIO, INTEGRAÇÃO, ALTA, MANTER COMO IDEIA FUTURA. Dependem de OAuth/tokens, IDs de cliques, consentimentos aplicáveis, rede e workers/retries. FULL UPSTREAM mede/envia eventos externos; simplificada apresenta origem e resultados comerciais locais, sem gerenciador de anúncios.

## 23. VoIP

**CONFIRMADO — auditoria §§3/14/24:** voz já existia no baseline. A evolução adiciona SIP/trunk/AudioSocket e escolha de modelo por agente; não é uma feature nova simples de botão de chamada.

Registrar/chamar a partir da ficha atende vendas e suporte; telefonia completa serve a operações com infraestrutura de voz. UX: chamada e histórico no CRM versus administração de troncos, sessões e mídia de áudio. Sobrepõe canal de voz preexistente, mas SIP/AudioSocket acrescenta serviços próprios e processamento em tempo real, além de canal, consentimento e eventuais transcrições.

Registro comercial de chamada: INTERESSANTE, MÉDIO, CORE CRM, MÉDIA, ADOTAR SIMPLIFICADO se houver lacuna nas atividades atuais. Integração simples com serviço de chamada: OPCIONAL, MÉDIO, INTEGRAÇÃO, ALTA, MANTER COMO IDEIA FUTURA. SIP/AudioSocket integral: ADIAR, ESPECÍFICO DE NICHO, EXTENSÃO FUTURA, MUITO ALTA, MANTER COMO IDEIA FUTURA. Não prometer uma versão de telefonia completa com os mesmos requisitos de uma atividade manual.

## 24. Relatórios

**CONFIRMADO — auditoria §18:** há recortes de pipeline/forecast/tags, financeiro, campanhas, prospecção e administração. API por tag não demonstrou página dedicada completa. Relatório deve usar unidade e filtros coerentes, sem inferir dashboard operacional por existência de endpoint.

| Relatório / público | Precisa de módulos novos? | Proposta |
|---|---|---|
| Pipeline e conversão, gestor comercial | Não para visão de estágios/ganhos/perdas existente | ESSENCIAL, ALTO, CORE CRM; ADOTAR SIMPLIFICADO, MÉDIA |
| Valor ganho por moeda, vendedor/gestor | Não; valor/status já existem | INTERESSANTE, ALTO; não confundir com recebido |
| Produtividade de atendimento/equipe, gestor | Não para recortes derivados de eventos existentes | INTERESSANTE, ALTO; definir unidade, período e significado sem inventar SLA |
| Forecast, gestor comercial | Sim à fonte de probabilidade escolhida, não ao financeiro | INTERESSANTE, ALTO; ADOTAR SIMPLIFICADO |
| Tags, gestor/operador | Pode usar strings atuais; catálogo melhora consistência | OPCIONAL, MÉDIO; contagem/filtro antes de dashboard dedicado |
| Financeiro/caixa | Sim a lançamentos/comandas e suas regras | ADIAR, ESPECÍFICO DE NICHO; acompanhar decisão do financeiro |
| Campanhas/prospecção | Sim aos registros de execução do módulo respectivo | ADIAR, MÉDIO; não criar dashboards vazios antes dos módulos |

Sobrepõe relatórios/estatísticas locais; selecionar perguntas comerciais primeiro, não uma tela para cada tabela upstream. Complexidade MÉDIA nos recortes comerciais existentes e ALTA nos painéis entre módulos. Moedas, transferências, duplicidade e mudanças de etapa precisam de definição semântica; um gráfico atraente não resolve isso. Não há medição de desempenho ou verificação de números em operação real nesta fase.

## 25. Dependências entre módulos

As relações abaixo distinguem dependência observada de composição proposta. Não representam ordem de implementação.

| Relação | Evidência / status | Consequência |
|---|---|---|
| Oportunidades + valor/moeda/data + probabilidade → forecast | CONFIRMADO: `lib/leads/previsao.ts`, probabilidade em etapa (0427) e auditoria §18 | Probabilidade/fonte alimenta forecast; não é forecast que precisa existir para editar probabilidade |
| Tags atribuídas → vocabulário/operações → filtros/relatório | CONFIRMADO: auditoria §12 e RPCs nela identificadas | Operações globais precisam acompanhar os usos; relatório não exige módulo financeiro |
| Empresa ↔ vínculo pessoa–empresa ↔ pessoa ← contato opcional | CONFIRMADO: schema 0448, `contacts.person_id`, `people-handler.ts` | Suporta múltiplas afiliações; não obriga converter todo contato em pessoa |
| Lead/contato/conversa + itens/modelos + armazenamento → propostas | CONFIRMADO: schema de propostas, `tipos.ts`, `storage.ts`; FK de item para catálogo | B2B e financeiro completo não foram demonstrados como dependências obrigatórias |
| Agenda/atendente/serviço ↔ itens/comissão da comanda | CONFIRMADO: `lib/financeiro/comanda.ts` | O financeiro U tem acoplamento com serviço/atendente; não é apenas total de propostas |
| Dados de prospect + pesquisa/IA + fila/canal → outreach | CONFIRMADO no recorte da auditoria §5 | Lista manual pode existir sem pesquisa e envio automático |
| Destinatários/templates/supressões + scheduler/workers + canal → campanha enviada | CONFIRMADO: auditoria §§5/16–17 | Só segmentar não exige executar a campanha |
| Turno do agente + estado/perguntas + skills → roteiro | CONFIRMADO: `roteiro-no-turno.ts` | Reutiliza atendimento/follow-up; não substituir todo o agente |
| Roteador/classificadores + API externa + configuração/telemetria → Jev | CONFIRMADO: `lib/ai/decisao/` | Não funciona apenas com PostgreSQL e não deve eliminar reservas sem decisão por tarefa |
| Notas/anexos U → Realtime/Storage | CONFIRMADO: auditoria §§13/23 | Nota textual local simplificada pode dispensar esses serviços (INFERIDO) |
| CSV/embeddings/rebuild → indexação vetorial + armazenamento | CONFIRMADO: auditoria §§14/23–24 | pgvector local pendente impede presumir jornada pronta |
| Core pequeno → módulos opcionais | INFERIDO: proposta de organização do produto | Não exige catálogo declarativo de terceiros; manifesto U não instala código/tabelas dos módulos |

**Não confirmada como cadeia obrigatória:** B2B → propostas → financeiro. O schema original de propostas referencia lead/contato e catálogo, e o contrato final admite vínculos comerciais opcionais; não exige empresa. O financeiro da comanda usa seus próprios itens e regras. Esses módulos podem conversar, mas a sequência comercial é uma proposta, não uma dependência técnica integral comprovada. Não foi calculada closure transitiva de SQL/imports para implementação.

## 26. Versões simplificadas possíveis

Comparações INFERIDAS; a coluna simplificada é uma opção a aprovar, não paridade com U.

| Capacidade | FULL UPSTREAM | CRM GERAL SIMPLIFICADA | O que deixa de oferecer |
|---|---|---|---|
| Tags | Vocabulário global, normalização, cores, rename/merge/delete, relatório API | Gestão por organização, atribuição contextual, filtro e cor opcional | Relatório avançado e gestão de todos os escopos simultaneamente |
| Forecast | Probabilidade etapa/IA, agrupamento, API/UI/MCP | Probabilidade por etapa e resumo ponderado separado por moeda | Seleção dinâmica de fontes e painel completo |
| B2B | Empresas, pessoas, vínculos múltiplos, importação/enriquecimento | Empresa opcional ligada ao contato, preservando histórico | Cadastro de pessoas separado, enriquecimento e importação complexa |
| Financeiro | Contas, comanda, itens, lançamentos, recorrência, comissão, fidelidade | Valor do negócio, ganhos comerciais e comissão somente se aprovada | Controle de caixa, pagamentos e obrigações financeiras |
| Propostas | Briefing/IA, modelos, revisão, versões, PDF, envio, status/expiração | Editor básico, versão enviada, validade e PDF; modelos simples opcionais | Assistente, catálogo sofisticado e automação completa de envio |
| Campanhas | Listas/templates, supressão, métricas, scheduler e números | Segmento de relacionamento e ação revisada pelo operador | Disparo automático, rodízio e plataforma de marketing |
| Prospecção | Descoberta/enriquecimento e abordagem com IA | Carteira de alvos, origem, tarefa e conversão para oportunidade | Pesquisa/abordagem autônomas |
| Extensões | Catálogo declarativo, manifesto, compatibilidade e reversão | Capacidades/módulos deliberadamente ativáveis | Loja/ecossistema de terceiros e instalação de pacotes |
| Roteiros/Jev | Roteiro com estado/validação e segunda avaliação externa por tarefa | Roteiro curto; revisão humana de decisões existentes | Classificador externo paralelo e decisão automática adicional |
| Inbox | Contexto, anexos/Realtime, grupos, presença e rascunhos por integração | Histórico, notas textuais/filtros e revisão de sugestões | Jornada coletiva/tempo real sem infraestrutura |
| Agenda | Agenda local + Google/Meet/colegas e reconciliação | Fuso/local/status/remarcação e vínculo de cliente | Sincronização de calendário externo |
| Automações | Mais eventos/condições/grafo/IA e coordenação de execução | Regras existentes com poucos gatilhos claros e histórico | Builder genérico adicional |
| IA/RAG | Vários adapters, raciocínio, transcrição, CSV e rebuild | Seleção por capacidade e pipeline de conhecimento único validado | Compatibilidade irrestrita de modelos/formatos |
| SMTP/Admin | Transporte configurável e ampliação administrativa | Transporte de email e diagnóstico por instalação | Nova operação de plataforma/billing |
| Banco externo | Cadastro/catálogo e leitura parametrizada de PostgreSQL | Conector a caso/API/view delimitada | Explorador genérico de bancos |
| Ads | Tracking/cliques/UTM e conversões Meta/Google | Origem/UTM e conversão comercial local | Envio/gestão de eventos externos |
| VoIP | SIP/trunk/AudioSocket e runtime de voz | Atividade de chamada ou integração a serviço já contratado | Operar infraestrutura telefônica |
| Relatórios | Painéis dos vários módulos | Pipeline, ganhos por moeda, conversão e produtividade com dados existentes | Painéis sem módulo produtor de dados |

Honorários não recebe uma versão “genérica” presumida: exige definição de um módulo vertical próprio. Simplificar módulos financeiros ou jurídicos não autoriza importar regras de pagamento upstream.

## 27. Matriz completa

Complexidade avalia o recorte nomeado. Valor é qualitativo sob o perfil genérico; justificativa acompanha a categoria. Todos os pareceres são INFERIDOS. Linhas separadas evitam aprovar um módulo inteiro por gostar de uma parte. A forma de adoção é conceitual e não autoriza executar código.

| ID | Feature | Problema que resolve | Tipo | Valor para CRM Geral | Complexidade | Dependências | Decisão sugerida | Versão simplificada possível? | Forma de adoção |
|---|---|---|---|---|---|---|---|---|---|
| T01 | Tags: entidade/escopos/gestão | Vocabulário duplicado e referências frágeis | CORE CRM | ALTO — segmentação transversal | ALTA | Tags atuais, atribuições, regras e RPC local | PRECISA DECISÃO DO USUÁRIO | Sim: gestão contextual | ADOTAR SIMPLIFICADO |
| T02 | Filtro por tags existentes | Encontrar carteira/contexto | CORE CRM | ALTO — organização diária | BAIXA | Tags e consultas existentes | INTERESSANTE | Sim: um escopo por vez | ADOTAR COMO ESTÁ CONCEITUALMENTE |
| F01 | Probabilidade por etapa | Interpretar maturidade comercial | CORE CRM | ALTO — previsão compreensível | MÉDIA | Estágios e significado da taxa | INTERESSANTE | Sim: uma fonte explícita | ADOTAR COMO ESTÁ CONCEITUALMENTE |
| F02 | Forecast resumido | Visualizar valor esperado | CORE CRM | ALTO — leitura do funil | MÉDIA | Valor/moeda/data e F01 ou outra fonte | INTERESSANTE | Sim: resumo por moeda | ADOTAR SIMPLIFICADO |
| F03 | Dashboard completo etapa/IA | Analisar cenários por período | MÓDULO OPCIONAL | MÉDIO — uso gerencial específico | ALTA | F02, contratos de score, API/UI | OPCIONAL | Sim: F02 | ADOTAR PARCIALMENTE |
| B01 | Empresas/pessoas/vínculos | Relacionamento B2B com interlocutores | MÓDULO OPCIONAL | ALTO — clientes corporativos | ALTA | Contatos, identidade, LGPD, joins locais | PRECISA DECISÃO DO USUÁRIO | Sim: empresa ligada ao contato | REIMPLEMENTAR PARA O CRM GERAL |
| B02 | Importação de carteira | Entrada/migração em lote | MÓDULO OPCIONAL | MÉDIO — adoção e pré-vendas | ALTA | Identidade escolhida, arquivo, dedupe | PRECISA DECISÃO DO USUÁRIO | Sim: prévia de contatos sem enriquecimento | ADOTAR SIMPLIFICADO |
| N01 | Valor/ganhos comerciais | Medir resultado de venda | CORE CRM | ALTO — uso transversal | MÉDIA | Leads/status/moeda existentes | ESSENCIAL | Sim: agregação local | ADOTAR COMO ESTÁ CONCEITUALMENTE |
| N02 | Comissão comercial | Apurar incentivo comercial | MÓDULO OPCIONAL | MÉDIO — depende da operação | ALTA | Base/momento/regra de comissão aprovados | PRECISA DECISÃO DO USUÁRIO | Sim: estimativa comercial explícita | ADOTAR SIMPLIFICADO |
| N03 | Financeiro/comandas integral | Operar caixa, serviços e pagamentos | EXTENSÃO FUTURA | ESPECÍFICO DE NICHO — operação financeira | MUITO ALTA | Contas/itens/lançamentos/serviços/workers | PRECISA DECISÃO DO USUÁRIO | Sim: N01; sem equivalência financeira | MANTER COMO IDEIA FUTURA |
| H01 | Honorários | Cobrança fixa/êxito/repasse | EXTENSÃO FUTURA | ESPECÍFICO DE NICHO — advocacia | ALTA | Contratos/parcelas, instalação de módulo | FORA DO ESCOPO | Só com produto vertical definido | MANTER COMO IDEIA FUTURA |
| P01 | Proposta básica/modelo/versão/PDF | Formalizar oferta comercial | MÓDULO OPCIONAL | ALTO — vendas consultivas | ALTA | Lead/contato, itens, documento/armazenamento | PRECISA DECISÃO DO USUÁRIO | Sim: editor e documento básicos | ADOTAR SIMPLIFICADO |
| P02 | Briefing/revisão com IA | Preparar oferta a partir da conversa | MÓDULO OPCIONAL | MÉDIO — ganho depende do processo | MUITO ALTA | P01, IA, contexto, revisão e envio | ADIAR | Sim: edição humana | MANTER COMO IDEIA FUTURA |
| C01 | Campanha de relacionamento | Ação consistente sobre uma lista | MÓDULO OPCIONAL | MÉDIO — carteira organizada | MÉDIA | Contatos/filtros/templates e revisão | PRECISA DECISÃO DO USUÁRIO | Sim: tarefa/mensagem revisada | ADOTAR SIMPLIFICADO |
| C02 | Envio agendado em lote | Executar campanha e medir resposta | MÓDULO OPCIONAL | MÉDIO — exige operador | ALTA | Supressão, canal/WAHA, scheduler/workers | PRECISA DECISÃO DO USUÁRIO | Sim: sem envio automático | MANTER COMO IDEIA FUTURA |
| C03 | Marketing em massa/rodízio | Coordenar distribuição de alto volume | EXTENSÃO FUTURA | BAIXO — amplia além do CRM | MUITO ALTA | C02, múltiplos canais e coordenação | NÃO PRIORITÁRIA | Não como plataforma equivalente | NÃO ADOTAR |
| S01 | Lista de prospects | Organizar alvos e próximos passos | CORE CRM | MÉDIO — pré-venda reutilizável | MÉDIA | Contatos/leads/origem/filtros | INTERESSANTE | Sim: evitar entidade duplicada | ADOTAR SIMPLIFICADO |
| S02 | Pesquisa/enriquecimento | Completar dados de alvos | INTEGRAÇÃO | MÉDIO — depende das fontes | ALTA | Fontes/rede/procedência e identidade | OPCIONAL | Sim: pesquisa assistida/revisada | ADOTAR PARCIALMENTE |
| S03 | Outreach automático | Abordar carteira sem ação individual | MÓDULO OPCIONAL | MÉDIO — operação específica | MUITO ALTA | S01, canal, supressão, filas/dedupe | PRECISA DECISÃO DO USUÁRIO | Sim: tarefa humana | MANTER COMO IDEIA FUTURA |
| S04 | IA de prospecção autônoma | Descoberta e abordagem coordenadas | EXTENSÃO FUTURA | MÉDIO — valor não demonstrado localmente | MUITO ALTA | S02/S03, IA/custos e revisão | ADIAR | Sim: sugestão sem execução | MANTER COMO IDEIA FUTURA |
| E01 | Ativação de capacidades por tenant | Adaptar produto sem expor todos os menus | MÓDULO OPCIONAL | ALTO — flexibilidade | MÉDIA | Permissões e limites funcionais dos módulos | PRECISA DECISÃO DO USUÁRIO | Sim: configuração simples | ADOTAR SIMPLIFICADO |
| E02 | Catálogo de extensões declarativas | Distribuir contribuições compatíveis | EXTENSÃO FUTURA | MÉDIO — ecossistema ainda incerto | ALTA | Catálogo/manifesto/capacidades/reversão | PRECISA DECISÃO DO USUÁRIO | Sim: E01 sem loja | MANTER COMO IDEIA FUTURA |
| A01 | Roteiros de atendimento | Coletar dados com sequência e estado | MÓDULO OPCIONAL | ALTO — qualificação padronizada | ALTA | Agente, estado, skills e fluxo publicado | INTERESSANTE | Sim: roteiro curto | ADOTAR SIMPLIFICADO |
| A02 | Jev | Comparar/qualificar decisões do atendimento | EXTENSÃO FUTURA | MÉDIO — requer lacuna demonstrada | MUITO ALTA | API externa/BYOK/aceite/telemetria/workers | ADIAR | Sim: revisão humana de decisões | MANTER COMO IDEIA FUTURA |
| I01 | Notas/filtros/contexto Inbox | Compartilhar contexto e organizar atendimento | CORE CRM | ALTO — trabalho de equipe | MÉDIA | Histórico, escopo e notas existentes | INTERESSANTE | Sim: texto sem Realtime | ADOTAR PARCIALMENTE |
| I02 | Anexos em notas | Guardar documentos no contexto | MÓDULO OPCIONAL | MÉDIO — apoio documental | ALTA | Storage/permissões/retenção | OPCIONAL | Sim: links controlados, se aprovados | ADOTAR PARCIALMENTE |
| I03 | Grupos | Atender conversa coletiva | INTEGRAÇÃO | ESPECÍFICO DE NICHO — interlocutores coletivos | ALTA | WAHA, remetentes e exclusões de fluxos | ADIAR | Não equivale à conversa individual | MANTER COMO IDEIA FUTURA |
| I04 | Busca carregada/transcrição visível | Encontrar e ler conteúdo disponível | CORE CRM | ALTO — acessibilidade/contexto | BAIXA | Mensagens/texto já disponíveis | INTERESSANTE | Sim: sem produção de transcrição | ADOTAR COMO ESTÁ CONCEITUALMENTE |
| I05 | Handoff/fila e arquivamento coerente | Preservar responsabilidade e histórico | CORE CRM | ALTO — continuidade | ALTA | Equipe, estados e guards de envio | INTERESSANTE | Sim: recortes de contexto/gestão | ADOTAR PARCIALMENTE |
| I06 | Presença de canal | Sinalizar atividade na conversa | INTEGRAÇÃO | MÉDIO — conveniência | MÉDIA | Canal/WAHA e eventos | OPCIONAL | Sim: disponibilidade humana separada | ADOTAR PARCIALMENTE |
| I07 | Rascunhos sugeridos por integração | Revisão humana de texto preparado externamente | MÓDULO OPCIONAL | MÉDIO — integrações concretas | MÉDIA | Persistência/token/validade/composer | OPCIONAL | Sim: uma origem confiável | ADOTAR PARCIALMENTE |
| G01 | Agenda local/contexto/status | Organizar compromisso e resultado | CORE CRM | ALTO — conversão em atendimento | MÉDIA | Agenda/contato/fuso existentes | INTERESSANTE | Sim: sem calendário externo | ADOTAR PARCIALMENTE |
| G02 | Lembretes/remarcação automatizada | Comunicar mudanças e reduzir esquecimentos | MÓDULO OPCIONAL | ALTO — continuidade | ALTA | G01, scheduler/canal/cancelamento/dedupe | INTERESSANTE | Sim: tarefa e revisão humana | ADOTAR SIMPLIFICADO |
| G03 | Google/Meet/colegas | Conciliar disponibilidade externa | INTEGRAÇÃO | MÉDIO — usuários de Google | ALTA | OAuth/calendários/reconciliação | OPCIONAL | Sim: um calendário, Meet opcional | ADOTAR PARCIALMENTE |
| W01 | Gatilhos/condições/execução visível | Automatizar recortes repetidos | MÓDULO OPCIONAL | ALTO — fluxo comercial | ALTA | Eventos/stages/engine; canal/IA por ação | INTERESSANTE | Sim: poucos gatilhos sobre motor atual | ADOTAR PARCIALMENTE |
| W02 | Workflow builder amplo | Modelar processos complexos | MÓDULO OPCIONAL | MÉDIO — só com demanda concreta | MUITO ALTA | W01, grafo/versionamento/retries/dedupe | PRECISA DECISÃO DO USUÁRIO | Sim: reutilizar fluxos existentes | MANTER COMO IDEIA FUTURA |
| AI01 | Provider por capacidade | Evitar acoplamento de feature a fornecedor | INFRAESTRUTURA | ALTO — manutenção e escolha | ALTA | Registry existente/credenciais/tools/limites | INTERESSANTE | Sim: adapters comprovados | REIMPLEMENTAR PARA O CRM GERAL |
| AI02 | DeepSeek/Requesty/custom/raciocínio | Acesso a capacidades de modelo específicas | INTEGRAÇÃO | MÉDIO — demanda por capacidade | MÉDIA | AI01, compatibilidade e rede | OPCIONAL | Sim: só recursos usados | ADOTAR PARCIALMENTE |
| AI03 | Serviço de transcrição | Tornar áudio consultável | INTEGRAÇÃO | MÉDIO — atendimento com áudio | ALTA | Mídia/provider/worker/retorno à Inbox | OPCIONAL | Sim: pipeline único | ADOTAR PARCIALMENTE |
| AI04 | CSV/Gemini embeddings/rebuild | Atualizar conhecimento indexado | INFRAESTRUTURA | ALTO — quando há base documental | ALTA | pgvector/Storage/indexação/modelo coerente | ADIAR | Sim: um formato/modelo validado | ADOTAR PARCIALMENTE |
| AI05 | Memória/contexto selecionado | Evitar repetição e resposta sem contexto | CORE CRM | ALTO — qualidade do atendimento | ALTA | Histórico/identidade/retencão/IA existentes | INTERESSANTE | Sim: fatos e fontes explícitas | ADOTAR PARCIALMENTE |
| M01 | SMTP por instalação | Enviar email operacional em self-host | INFRAESTRUTURA | MÉDIO — distribuição independente | MÉDIA | Transporte/credenciais/remetente/diagnóstico | OPCIONAL | Sim: um transporte operacional | ADOTAR COMO ESTÁ CONCEITUALMENTE |
| X01 | PostgreSQL externo administrado | Consultar dados de outro sistema | INTEGRAÇÃO | MÉDIO — caso empresarial concreto | MUITO ALTA | TLS/credenciais/rede/catálogo/limites/IA | ADIAR | Sim: conector de leitura delimitado | MANTER COMO IDEIA FUTURA |
| D01 | Configuração/diagnóstico de instalação | Operador entender situação do sistema | INFRAESTRUTURA | MÉDIO — operação do produto | MÉDIA | Admin/configuração/transportes | OPCIONAL | Sim: poucos diagnósticos | ADOTAR SIMPLIFICADO |
| D02 | Configuração do tenant | Equipe ajustar capacidades utilizadas | CORE CRM | ALTO — adaptação por organização | MÉDIA | Settings/permissões e E01 se aprovado | INTERESSANTE | Sim: ampliar settings existentes | ADOTAR PARCIALMENTE |
| D03 | Suporte da plataforma | Operar atendimento entre organizações | INFRAESTRUTURA | MÉDIO — modelo operacional indefinido | ALTA | Auth/escopo/papéis/operador | PRECISA DECISÃO DO USUÁRIO | Sim: operação restrita ao modelo aprovado | REIMPLEMENTAR PARA O CRM GERAL |
| AD01 | Origem/UTM no CRM | Relacionar aquisição e venda | CORE CRM | ALTO — atribuição comercial | MÉDIA | Source/metadados/eventos existentes | INTERESSANTE | Sim: análise local | ADOTAR PARCIALMENTE |
| AD02 | Meta/Google/conversões/tracking/links | Fechar medição com plataformas externas | INTEGRAÇÃO | MÉDIO — operação de marketing | ALTA | OAuth/tokens/cliques/consentimento/retries | OPCIONAL | Sim: apenas uma integração aprovada | MANTER COMO IDEIA FUTURA |
| V01 | Atividade/chamada na ficha | Registrar contato por telefone | CORE CRM | MÉDIO — multicanal | MÉDIA | Atividades; provider apenas se chamar | INTERESSANTE | Sim: registro sem telefonia | ADOTAR SIMPLIFICADO |
| V02 | SIP/trunk/AudioSocket | Operar voz integrada em tempo real | EXTENSÃO FUTURA | ESPECÍFICO DE NICHO — telefonia | MUITO ALTA | Serviços de voz/mídia/consentimento/runtime | ADIAR | Sim: integração externa; sem paridade | MANTER COMO IDEIA FUTURA |
| R01 | Pipeline/conversão/produtividade | Dar visibilidade da operação | CORE CRM | ALTO — gestão transversal | MÉDIA | Leads/atividades/eventos existentes | ESSENCIAL | Sim: perguntas comerciais básicas | ADOTAR SIMPLIFICADO |
| R02 | Relatório por tag | Comparar segmentos | CORE CRM | MÉDIO — se tags forem consistentes | MÉDIA | Atribuições/unidade/filtros | OPCIONAL | Sim: contagem contextual | ADOTAR SIMPLIFICADO |
| R03 | Relatórios financeiro/campanhas/prospecção | Acompanhar módulos especializados | MÓDULO OPCIONAL | MÉDIO — somente com módulos ativos | ALTA | Módulo produtor e semântica aprovada | ADIAR | Sim: somente módulo escolhido | MANTER COMO IDEIA FUTURA |

## 28. Grandes decisões

Todas abaixo são **PRECISA DECISÃO DO USUÁRIO**; a sugestão de limite não é escolha aprovada.

| Decisão | Por que muda produto/arquitetura | Limite sugerido para avaliar |
|---|---|---|
| Identidade B2B | Muda contato, pessoa, empresa, afiliações e vínculos de oportunidade | Empresa opcional sem duplicar histórico de contato |
| Tags estruturais | Muda referências, exclusão, automações e segmentação | Identidade por organização e remoção contextual |
| Financeiro/comissão | Acrescenta regras monetárias e responsabilidade por apuração | Comercial separado de caixa/contabilidade |
| Propostas | Introduz documento/versionamento e jornada de aprovação/envio | Documento básico antes de assistente completo |
| Campanhas | Muda operação de relacionamento para execução sobre uma carteira | Revisão humana e supressão antes de scheduler |
| Prospecção | Passa de organizar contatos para pesquisar/abordar pessoas | Lista e tarefa antes de autonomia |
| Core/módulos/extensões | Define produto único configurável ou ecossistema com catálogo | Módulos claros antes de loja/manifestos de terceiros |
| Workflow builder | Introduz promessa de processos gerais, versionamento e recuperação | Reutilizar motores existentes e provar lacunas |
| Distribuição/suporte | Define instalação individual ou operador de múltiplos tenants | SMTP/diagnóstico e escopo de suporte conforme esse modelo |
| Banco externo | Transforma o CRM em consumidor de bases administradas por clientes | Um caso de leitura delimitado antes de plataforma genérica |

Honorários e telefonia especializada ficam fora do core sugerido, sem excluir futura decisão por um vertical. Nenhuma dessas decisões exige trazer todo o upstream. Não há sequência de entregas, prazo ou backlog aprovado neste relatório.

## 29. Questões para o usuário

Responda, por exemplo, `1A, 2B, 3A...`. As alternativas definem preferência de produto; a resposta não substitui um pedido posterior de implementação. Questões não respondidas continuam pendentes.

1. **B2B — empresa deve ter ficha própria?** A) Sim, vinculada aos contatos atuais. B) Não, manter informação no contato. C) Quero avaliar antes.
2. **Pessoas e oportunidades B2B — qual profundidade deseja?** A) Pessoa/contato pode ter várias empresas, e oportunidade identifica empresa e interlocutores. B) Um vínculo simples de empresa por contato, sem entidade Pessoa separada. C) Adiar essa modelagem.
3. **Tags — como deseja gerenciá-las?** A) Catálogo por organização, usado em contatos/leads/conversas, com remoção contextual e gestão global separada. B) Manter tags simples por registro. C) Quero avaliar os impactos primeiro.
4. **Forecast — qual recorte interessa?** A) Probabilidade por etapa e resumo ponderado simples. B) Dashboard completo com fonte etapa/IA configurável. C) Apenas valor e resultado do funil, sem previsão por enquanto.
5. **Financeiro — qual limite do produto?** A) Apenas valor do negócio e ganhos comerciais; comissão opcional a definir. B) Módulo financeiro completo separado do core. C) Não ampliar além do valor já registrado.
6. **Propostas — qual nível deseja?** A) Proposta básica, modelos simples, versão enviada e PDF. B) Módulo completo com briefing/IA/revisão/envio. C) Adiar propostas.
7. **Campanhas — qual objetivo?** A) Listas de relacionamento com ação revisada por uma pessoa. B) Envio em lote agendado, como módulo opcional. C) Não incluir campanhas agora.
8. **Prospecção — até onde o CRM deve agir?** A) Organizar prospects e tarefas humanas. B) Pesquisar/enriquecer e preparar abordagem para revisão, sem envio autônomo. C) Avaliar também abordagem autônoma em módulo próprio.
9. **Módulos/extensões — qual modelo prefere?** A) Core pequeno e capacidades opcionais por cliente, sem catálogo público. B) Preparar também catálogo de extensões. C) Produto único sem modularização adicional por enquanto.
10. **Automações/roteiros — qual evolução interessa?** A) Regras existentes e roteiros curtos de coleta. B) Workflow builder amplo com ramificações/processos. C) Manter o que existe até demonstrar lacunas na operação.
11. **Integrações — qual tem demanda concreta primeiro?** A) Google Calendar/Meet. B) Meta/Google Ads. C) Nenhuma delas por enquanto.
12. **Distribuição e administração — qual operação deve orientar o produto?** A) Instalação independente por cliente, com SMTP/diagnóstico. B) Operador central com vários tenants e suporte de plataforma. C) Desenvolvimento local primeiro; decidir distribuição depois.
13. **Banco externo — existe necessidade real?** A) Sim, um caso de leitura delimitado a especificar. B) Quero conector PostgreSQL administrável e genérico como módulo. C) Não por enquanto.

Verificação de encerramento: somente este relatório foi criado; a auditoria 2.1 preexistente permaneceu não rastreada e preservada. Nenhuma implementação, migration, alteração de banco, instalação de dependências, cherry-pick, merge, rebase, commit ou push nesta fase. Não foram executados testes da aplicação: o escopo é documental, com leitura estática e conferência de Git.
