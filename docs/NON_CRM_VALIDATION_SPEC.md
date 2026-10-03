# Non-CRM Validation Spec — Central de Ativos

> Especificação formal para um protótipo visual isolado. Esta etapa define o que deverá ser construído e avaliado; não implementa a tela, não cria screenshots e não encerra as decisões abertas do [`docs/DESKCOMM_UI_BLUEPRINT.md`](./DESKCOMM_UI_BLUEPRINT.md).

## 1. Propósito

Esta especificação prepara a futura implementação da tela fictícia **Central de Ativos**, pertencente a um produto de **Gestão de Ativos**.

O protótipo servirá para verificar se a linguagem visual extraída do Deskcomm permanece:

- coerente fora do domínio de CRM;
- funcional em uma aplicação operacional;
- reconhecível por seus princípios, e não por seus conteúdos de origem;
- capaz de acomodar dados, estados, camadas e densidades diferentes;
- independente de uma marca, framework ou biblioteca de UI específicos.

Esta especificação é o contrato da próxima etapa. Ela descreve requisitos, dados fictícios, estados, viewports, fluxos e critérios. A implementação futura será responsável por transformar este contrato em uma tela isolada e produzir as evidências visuais.

## 2. Hipótese de validação

### Hipótese principal

> Os princípios, foundations, primitives, components, patterns e layouts definidos em `DESKCOMM_UI_BLUEPRINT.md` formam uma linguagem visual suficientemente abstrata para construir uma aplicação operacional não-CRM sem depender de elementos específicos do DeskcommCRM.

### Resultado aprovado

**Hipótese aprovada:** a linguagem funciona de forma coerente em um domínio diferente. A Central de Ativos consegue orientar, exibir dados, receber ações e tratar estados usando o núcleo do Blueprint, sem importar conceitos de CRM nem exigir overrides locais para parecer consistente.

### Resultado parcialmente aprovado

**Hipótese parcialmente aprovada:** a maior parte funciona, mas alguns patterns precisam de ajustes ou abstração adicional. A neutralidade é preservada, porém contratos como Field, Page Header, Data Table mobile, overlay, density ou status ainda precisam de revisão antes de serem considerados estáveis.

### Resultado rejeitado

**Hipótese rejeitada:** a interface depende excessivamente de decisões específicas do CRM ou precisa importar padrões de domínio para parecer coerente. A Central de Ativos perde hierarquia, continuidade, responsividade ou clareza quando esses elementos são removidos.

## 3. Escopo

### Incluído

- uma superfície principal de operação chamada Central de Ativos;
- App Shell, Sidebar, Top Utility Bar e Main Canvas;
- resumo de métricas;
- filtros;
- tabela de ativos;
- estados default, loading, empty e error;
- Drawer/Sheet de detalhe;
- experiência de criação para exercitar Field contract;
- Dialog de confirmação para arquivar um ativo;
- Toast ou feedback equivalente;
- tema claro e tema escuro;
- densidades Comfortable, Default e Compact;
- validação em desktop, tablet e mobile;
- fluxos curtos e checklist de acessibilidade;
- plano futuro de screenshots e relatório.

### Fora do escopo

- implementação da tela;
- frontend, CSS, tokens, componentes ou dependências;
- backend, persistência, autenticação ou regras reais de ativos;
- múltiplas páginas completas;
- dashboard analítico separado;
- sistema de permissões;
- branding alternativo;
- dados reais;
- screenshots nesta etapa;
- visual regression nesta etapa;
- Storybook ou biblioteca de Design System;
- escolha definitiva de fonte, ícones, overlay, radius, densidade ou tabela mobile.

## 4. Regras de neutralidade de domínio

### Domínio permitido

A Central de Ativos representa uma organização que administra ativos físicos, como:

- computadores;
- equipamentos;
- veículos;
- máquinas;
- dispositivos;
- ferramentas.

Os dados servem apenas para preencher e tensionar a interface. Não são necessárias regras reais de inventário, manutenção, contabilidade ou logística.

### Conceitos proibidos

A especificação não pode depender de:

- leads;
- contatos comerciais;
- oportunidades;
- pipeline;
- funil;
- WhatsApp;
- mensagens;
- inbox;
- SLA de atendimento;
- agentes comerciais;
- score;
- owner comercial;
- etapas de venda;
- LGPD específica do CRM;
- conexão WAHA;
- campanhas;
- atendimento.

Esses termos aparecem aqui somente para delimitar o teste. Não podem aparecer como requisito, label, estado ou justificativa da interface futura.

### Regra de falha

Se um componente CORE só parecer coerente após importar qualquer conceito proibido, isso é evidência contra a hipótese principal. A geometria, o ritmo e o contrato precisam funcionar com ativos, operações, localização, estado e manutenção genérica.

## 5. Conceito da Central de Ativos

### Premissa

Uma organização acompanha os ativos físicos sob sua responsabilidade. A tela principal permite localizar um ativo, entender seu estado, consultar uma medida resumida, abrir detalhes e iniciar uma alteração.

### Intenção da superfície

Responder rapidamente a quatro perguntas:

1. O que existe e em que estado está?
2. Onde está cada ativo?
3. Há algo que exige atenção?
4. Qual é a próxima ação disponível?

### Limite de complexidade

Uma única tela principal deve ser suficiente. Detail Drawer, formulário de criação, Dialog, Filter Bar e estados alternativos são camadas ou fixtures da mesma superfície, não novas áreas completas do produto.

### Vocabulário aprovado

Ativo, categoria, localização, estado, inspeção, custo, utilização, manutenção, observação, arquivar, adicionar, editar, limpar filtros, tentar novamente.

## 6. Arquitetura da informação

```text
Aplicação
├── Visão geral
├── Ativos
│   └── Central de Ativos
├── Operações
├── Relatórios
└── Configurações
```

### Decisão de navegação

O menu é deliberadamente pequeno. Ele testa agrupamento, ativo, item selecionado, rail/recolhimento e navegação mobile sem criar destinos artificiais apenas para preencher a Sidebar.

### Item principal

**Central de Ativos** é a tela ativa dentro de **Ativos**. A Sidebar deve deixar claro o caminho atual sem precisar de uma lista extensa.

### O que não testar aqui

Não criar submenus, breadcrumbs complexos ou uma Command Palette com dezenas de destinos. A validação precisa concentrar-se na qualidade do shell, não na quantidade de navegação.

## 7. App Shell

### Composição

```text
┌───────────────────────────────────────────────────────────────┐
│ Sidebar │ Top Utility Bar                                    │
│         ├─────────────────────────────────────────────────────┤
│         │ Main Canvas                                         │
│         │ Page Header → Metrics → Banner → Filters → Table    │
└───────────────────────────────────────────────────────────────┘
```

### Requisitos

- Sidebar persistente em desktop;
- Top Utility Bar separada das ações da página;
- Main Canvas com hierarquia de página;
- item ativo perceptível;
- superfícies e borders suficientes para distinguir shell e conteúdo;
- camada contextual disponível para Drawer, Sheet e Dialog;
- ausência de ornamentação que não ajude na orientação.

### Comportamento esperado

- desktop: Sidebar + Top Utility Bar + conteúdo;
- tablet: manter orientação, reduzindo ou reorganizando a Sidebar se necessário;
- mobile: Sidebar persistente substituída por navegação temporária;
- shell deve permanecer reconhecível nos estados loading, empty e error;
- camada contextual não deve apagar a relação entre lista e detalhe.

## 8. Sidebar

### Conteúdo

- Visão geral;
- Ativos;
- Operações;
- Relatórios;
- Configurações.

### Regras visuais

- item ativo com accent ou tratamento equivalente de alto reconhecimento;
- itens inativos com baixo ruído;
- grupos, caso usados, curtos e semanticamente nomeados;
- ícones com peso e escala coerentes;
- rail recolhido preserva nome acessível e indicação de ativo;
- área inferior opcional para utilidade de conta ou ajuda, sem competir com o menu;
- no mobile, abertura e fechamento devem ser claros.

### Estados a observar

- aberta;
- recolhida;
- grupo aberto, se houver;
- item ativo;
- navegação mobile aberta;
- navegação mobile fechada;
- foco por teclado;
- tema claro e escuro.

### Critério de neutralidade

A Sidebar deve funcionar com cinco destinos genéricos. Se parecer vazia, artificial ou precisar de módulos de CRM para ganhar sentido, registrar como problema de composição do shell.

## 9. Top Utility Bar

### Função

A barra superior testa funções globais e não ações da página.

### Conteúdo mínimo

- busca global;
- unidade ou organização atual;
- tema;
- notificações;
- usuário.

### Regras

- não repetir “Adicionar ativo” na barra superior;
- distinguir busca global de busca da tabela;
- manter zones compreensíveis quando labels desaparecerem em viewport menor;
- preservar foco, nome acessível e ordem de teclado;
- não transformar a barra em segundo Page Header.

### Dados de exibição

Usar valores neutros, por exemplo **Unidade Centro** ou **Operações Gerais**, sem sugerir contexto comercial.

## 10. Page Header

### Conteúdo

- título: **Central de Ativos**;
- descrição: **Acompanhe localização, estado e custos dos ativos da organização.**;
- ação principal: **Adicionar ativo**;
- actions secundárias opcionais somente se ajudarem o teste.

### Desktop

```text
Central de Ativos                                      [Adicionar ativo]
Acompanhe localização, estado e custos dos ativos...
```

Título e descrição ficam à esquerda; actions ficam à direita, alinhadas sem competir com o título.

### Mobile

```text
Central de Ativos
Acompanhe localização, estado e custos dos ativos...
[Adicionar ativo]
```

Título, descrição e actions empilham. A ação principal pode ocupar a largura disponível.

### O que validar

- título aparece uma única vez como orientação principal;
- descrição não vira metadata fraca;
- ação primária é inequívoca;
- header não depende do accent para criar hierarquia;
- ação não é duplicada no Top Utility Bar;
- a anatomia permanece a mesma entre desktop, tablet e mobile.

## 11. Metric Group

### Métricas obrigatórias

| Label | Valor fictício | Unidade/contexto | Tendência opcional |
|---|---:|---|---|
| Ativos em operação | 128 | ativos | +6 no período |
| Em manutenção | 9 | ativos | 2 novos nesta semana |
| Utilização média | 74% | do período atual | +4 p.p. vs. período anterior |
| Custo no período | R$ 48.320 | período atual | -3,2% vs. período anterior |

Os valores são conteúdo fictício, não regra de negócio. A implementação poderá ajustar os números se mantiver variedade, unidade e contexto.

### Anatomia

- label;
- valor primário;
- unidade ou período;
- tendência opcional;
- status apenas quando houver significado real;
- superfície ou agrupamento comum.

### Regras de uso

- não colorir cada métrica apenas para diferenciá-la;
- valor e unidade devem ser legíveis sem tooltip;
- tendência deve indicar direção e comparação, não apenas uma seta;
- “Em manutenção” não precisa ser verde ou vermelho por padrão;
- um card pode ser neutro quando a cor não acrescenta informação;
- se o card for clicável, toda a superfície deve comunicar isso.

### Validação

Testar Metric Cards em grupo Default e em uma versão Compact para verificar se continuam pertencendo à mesma família. O grupo não deve parecer um mosaico de quatro marcas ou quatro estados.

## 12. Status Banner

### Estado informativo

**Mensagem:** `7 ativos possuem manutenção programada para os próximos 7 dias.`

**Tratamento:** Info, sem urgência artificial. Pode ter ação contextual como **Ver programação**, desde que a ação não exija construir uma área de agenda completa.

### Estado warning/error

**Mensagem:** `A sincronização do inventário está temporariamente indisponível.`

**Tratamento:** Warning ou Error conforme a implementação justificar impacto. Deve incluir contexto e uma ação como **Tentar novamente** ou **Ver detalhes**.

### Regras

- testar pelo menos um estado Info e um estado Warning/Error;
- banner não deve permanecer visível apenas para preencher espaço;
- mensagem deve explicar o que está acontecendo;
- ação deve resolver, explicar ou levar ao contexto correto;
- cor deve ser acompanhada de texto e ícone/sinal;
- se o problema não bloquear a tela, não abrir Dialog;
- testar em light/dark e em mobile com actions empilhadas.

## 13. Filter Bar

### Controles

- busca textual;
- localização;
- tipo de ativo;
- estado operacional;
- período;
- limpar filtros.

### Estado sem filtros

Mostrar controles em estado neutro e uma indicação discreta de que todos os ativos estão no escopo atual.

### Estado com um filtro

Aplicar, por exemplo, **Localização: Unidade Centro**. O filtro ativo deve permanecer visível fora do menu original, como chip, label resumido ou tratamento equivalente.

### Estado com vários filtros

Aplicar pelo menos localização, tipo e estado. O usuário deve identificar quais filtros estão ativos e conseguir remover um filtro individual ou limpar tudo.

### Estado vazio causado por filtro

Usar uma combinação que não retorna registros. A causa deve ser perceptível na relação entre Filter Bar e Empty State.

### Regras responsivas

- desktop: controles em uma barra ou composição equivalente;
- tablet: permitir quebra controlada sem perder a ação de limpar;
- mobile: testar linha rolável, agrupamento em popover ou painel temporário;
- resumo de filtros ativos deve continuar visível quando os controles forem recolhidos;
- não esconder todos os filtros sem oferecer uma maneira clara de saber que há filtros ativos.

### O que não decidir agora

Não escolher definitivamente entre popover, drawer, linha rolável ou combinação mobile. A implementação futura deve escolher uma composição e registrar a evidência de legibilidade, descoberta e operação.

## 14. Data Table

### Colunas

| Coluna | Papel |
|---|---|
| Ativo | Campo principal e identificador visual |
| Categoria | Contexto secundário |
| Localização | Contexto operacional |
| Estado | Status Badge + texto |
| Última inspeção | Data |
| Custo | Número monetário |
| Ações | Ação inline ou menu |

### Estrutura de linha

Cada linha deve permitir observar:

- informação principal;
- metadata secundária;
- Badge/Status;
- número com unidade;
- data;
- ação inline;
- seleção opcional, se não aumentar complexidade artificial.

### Regras visuais

- cabeçalho mais silencioso que o conteúdo principal;
- border-bottom e hover discreto;
- alinhamento previsível de datas e números;
- custo com unidade monetária visível;
- nomes longos truncados com alternativa acessível;
- ausência de campo secundário não deve quebrar a linha;
- ações não devem dominar a tabela;
- não transformar toda linha em card no desktop.

### Interações mínimas

- abrir detalhe ao selecionar a linha ou ação claramente nomeada;
- ação inline de editar ou menu de ações;
- ação de arquivar acessível a partir do detalhe ou menu;
- seleção opcional somente se houver um motivo visual claro;
- loading, empty e error preservam a região da tabela.

## 15. Status dos ativos

### Estados fictícios

- Operacional;
- Em manutenção;
- Atenção;
- Inativo.

### Mapeamento a testar

| Estado do ativo | Papel semântico candidato | Justificativa a observar |
|---|---|---|
| Operacional | Neutral ou Success | “Operacional” descreve condição; não assume automaticamente que verde é necessário |
| Em manutenção | Info ou Warning | Pode ser uma condição normal ou exigir atenção, conforme contexto exibido |
| Atenção | Warning | Indica revisão ou risco, sem afirmar falha completa |
| Inativo | Neutral, Warning ou Error | Depende da consequência; não deve ser decidido só pela palavra |

### Regra de avaliação

A implementação deve escolher tratamentos provisórios e registrar o raciocínio. A spec não declara que “Operacional” precisa ser verde. O resultado será avaliado por:

- significado compreensível sem depender de cor;
- diferença suficiente entre estados;
- contraste em light/dark;
- ausência de colorização decorativa;
- coerência entre Badge, tabela, detalhe e banner.

## 16. Experimento de Data Table mobile

A política mobile de tabela é uma `OPEN DECISION` do Blueprint. Esta spec exige pelo menos duas estratégias, sem escolher a vencedora.

### Estratégia A — Priority Columns

No mobile, manter diretamente na tabela ou lista:

- Ativo;
- Estado;
- Ação.

Categoria, localização, inspeção e custo ficam acessíveis pelo Detail Drawer/Sheet.

**Hipótese:** preserva escaneabilidade e ação imediata com menor largura.

**Risco:** esconde contexto e exige abertura repetida do detalhe.

### Estratégia B — Row-to-Card

Cada registro vira uma composição vertical compacta contendo:

- nome do ativo;
- categoria e localização;
- Estado Badge;
- inspeção e custo como metadata;
- ação principal e menu secundário.

**Hipótese:** preserva mais contexto sem scroll horizontal.

**Risco:** aumenta a altura, reduz comparação entre registros e pode parecer um conjunto de cards sem ritmo.

### Como comparar

Avaliar ambas com os mesmos dados e nos mesmos viewports mobile:

| Dimensão | Pergunta |
|---|---|
| Orientação | O usuário identifica rapidamente o ativo selecionado? |
| Comparação | É possível comparar estado, custo e data sem esforço excessivo? |
| Ação | A abertura do detalhe e ações ficam descobertas? |
| Densidade | Compact continua legível e não vira microtexto? |
| Contexto | Informação secundária está acessível sem perda de continuidade? |
| Acessibilidade | Ordem de leitura, nomes e foco continuam claros? |
| Consistência | A estratégia ainda parece pertencer ao mesmo sistema? |

### Resultado permitido

O relatório futuro pode recomendar A, B, combinação ou uma decisão por formato de dados. Esta spec não escolhe a vencedora.

## 17. Detail Drawer / Sheet

### Abertura

Ao selecionar um ativo, abrir uma camada contextual sem abandonar visualmente a lista.

### Conteúdo

- nome;
- categoria;
- estado;
- localização;
- custo;
- última inspeção;
- observação;
- histórico simplificado de manutenção;
- ações Editar, Arquivar e Fechar.

### Objetivo de validação

Testar a hipótese de que um Drawer preserva contexto sem transformar a lista em uma navegação perdida.

### Desktop

Testar camada lateral com largura suficiente para conteúdo, header nomeado, body rolável se necessário e footer/actions previsíveis. A lista deve continuar reconhecível atrás da camada.

### Mobile — alternativas a observar

Não decidir arbitrariamente nesta fase. Testar e comparar:

1. Sheet lateral ou full-width com header fixo;
2. Sheet que ocupa quase toda a tela;
3. composição equivalente de detalhe em tela interna, desde que preserve o retorno à lista.

O critério é continuidade, foco, legibilidade e facilidade de fechar — não fidelidade a uma geometria específica.

### Regras

- título do ativo sempre visível ao abrir;
- ação de fechar clara;
- foco entra na camada e retorna ao trigger;
- overlay não deve tornar a página ilegível em light/dark;
- actions destrutivas não devem parecer ação primária comum;
- conteúdo pode rolar sem perder header ou saída;
- não transformar o Drawer em uma página inteira sem justificar a troca.

## 18. Form Section e criação

### Entrada

A ação **Adicionar ativo** do Page Header abre uma experiência de criação. A forma exata — Drawer, Sheet, modal amplo ou composição equivalente — deve ser registrada na implementação futura, pois esta etapa valida o Field contract e não a tecnologia de camada.

### Campos

| Campo | Tipo conceitual | Requerido | Helper sugerido |
|---|---|---:|---|
| Nome | Input | Sim | Use um nome reconhecível para localizar o ativo |
| Categoria | Select | Sim | Escolha a categoria que melhor descreve o ativo |
| Localização | Select ou Input assistido | Sim | Indique a unidade ou local físico |
| Data de aquisição | Date-like field | Não | Use o formato local esperado |
| Custo | Numeric/currency Input | Não | Informe o custo de referência, se conhecido |
| Observações | Textarea | Não | Registre contexto útil para a equipe de operações |

### Hierarquia de Form Sections

**Identificação**

- Nome;
- Categoria.

**Localização e ciclo**

- Localização;
- Data de aquisição.

**Valor e observações**

- Custo;
- Observações.

Cada seção precisa de título e, quando necessário, descrição curta. Card é opcional; whitespace e agrupamento podem ser suficientes.

### Estados obrigatórios

- default;
- required;
- invalid;
- disabled;
- loading durante submit;
- sucesso após submit;
- erro recuperável sem perder valores preenchidos.

### Cenários de campo

- Nome vazio ao tentar salvar;
- Categoria não selecionada;
- Custo com formato inválido;
- campo disabled contextual, apenas quando houver motivo explícito;
- submit loading preservando o conteúdo;
- erro associado ao campo correto;
- mensagem de ajuda visível antes da interação.

### Regras

- Label não é placeholder;
- Helper Text explica formato ou consequência real;
- Error Message explica como corrigir;
- Required é visível e sem depender apenas de asterisco;
- controls têm altura, radius, background e focus coerentes;
- não misturar controles nativos e primitives incompatíveis sem registrar a razão.

## 19. Dialog de confirmação

### Ação

**Arquivar ativo**

### Mensagem

**Título:** `Arquivar este ativo?`

**Descrição:** `O ativo será removido da lista operacional e deixará de aparecer como disponível para novas operações. O histórico existente será preservado.`

### Ações

- Cancelar;
- Arquivar ativo.

### Requisitos

- título e descrição nomeiam a consequência;
- ação destrutiva possui tratamento semântico;
- Cancelar não compete visualmente com a ação destrutiva;
- foco entra no Dialog e retorna ao trigger;
- Escape e close têm comportamento seguro;
- overlay e elevation são perceptíveis sem excesso;
- footer empilha no mobile;
- erro de confirmação, se testado, não apaga o contexto.

### Proibição

Não usar apenas `Tem certeza?`. A confirmação deve explicar o que muda e o que permanece.

## 20. Empty States

### Empty natural

**Cenário:** nenhum ativo foi cadastrado.

**Estrutura:**

- visual cue neutro, sem ilustração obrigatória;
- headline: `Nenhum ativo cadastrado`;
- explicação: `Adicione o primeiro ativo para começar a acompanhar localização, estado e custos.`;
- ação primária: `Adicionar ativo`;
- ação secundária opcional: nenhuma, salvo se houver caminho real de importação no protótipo.

**Intenção:** mostrar que a ausência é normal para uma coleção nova e orientar o primeiro passo.

### Empty filtered

**Cenário:** filtros aplicados não retornam ativos.

**Estrutura:**

- visual cue menor ou neutro;
- headline: `Nenhum ativo corresponde aos filtros`;
- explicação: `Tente remover um filtro ou pesquisar por outro termo.`;
- ação primária: `Limpar filtros`;
- ação secundária opcional: `Adicionar ativo`, somente se não confundir a causa.

**Intenção:** deixar claro que a coleção pode existir e que os filtros são a causa provável.

### Regra

As mensagens, hierarquias e ações dos dois vazios não podem ser idênticas.

## 21. Error State

### Cenário

`Não foi possível carregar os ativos.`

### Contexto

`Verifique sua conexão ou tente novamente. Nenhuma alteração local foi perdida.`

### Elementos

- mensagem clara;
- contexto suficiente;
- ação `Tentar novamente`;
- identificador técnico discreto opcional, como `ID da tentativa: A-2048`;
- tabela ou região de conteúdo preservada visualmente;
- ausência de Dialog bloqueante para erro recuperável.

### O que observar

- error state parece parte do mesmo sistema;
- retry é descoberto e não compete com a navegação;
- erro não depende de vermelho para ser compreendido;
- light/dark preservam contraste;
- foco pode ser orientado para a mensagem sem prender o usuário.

## 22. Loading State

### Regra geral

Loading preserva aproximadamente a geometria final e evita spinner central como única representação quando a estrutura é conhecida.

### Skeletons obrigatórios

- quatro Metric Cards;
- Filter Bar, quando seu carregamento for simulado;
- cabeçalho e linhas da Data Table;
- eventual conteúdo inicial do Drawer.

### Requisitos

- proporção de linhas e cards próxima do estado default;
- foco e navegação não atravessam conteúdo inexistente;
- `aria-busy` ou equivalente comunica espera;
- motion discreta e compatível com reduced motion;
- loading não deve parecer erro ou empty.

## 23. Toast e feedback

### Eventos

1. **Ativo criado:** `Ativo adicionado com sucesso.`
2. **Ativo atualizado:** `Alterações salvas.`
3. **Falha não bloqueante:** `Não foi possível salvar as alterações. Tente novamente.`

### Teste de adequação

O futuro protótipo deve registrar se Toast é adequado para cada evento:

- criação/atualização concluída: Toast breve pode ser suficiente;
- falha recuperável sem perda de contexto: Toast pode incluir retry;
- condição que precisa permanecer visível: usar Banner ou Error State, não apenas Toast;
- confirmação destrutiva: Dialog antes; Toast depois apenas para resultado.

### Regras

- feedback possui mensagem textual;
- urgência determina role e duração;
- ações no Toast têm nome acessível;
- não empilhar vários feedbacks equivalentes;
- mobile respeita área segura e largura disponível.

## 24. Cobertura de temas

### Light

Validar:

- Canvas greige ou equivalente semântico;
- Surface clara;
- Border suave visível;
- Text Primary e Secondary legíveis;
- Accent controlado;
- states com contraste e diferenciação;
- overlay suficientemente forte para separar camadas;
- focus perceptível.

### Dark

Validar:

- Canvas e Surface não se fundem;
- Border continua distinguível sem linhas brilhantes demais;
- Text Secondary não desaparece;
- Accent não fica neon ou decorativo;
- Warning/Error/Success preservam significado e contraste;
- overlay não transforma tudo em preto sem contexto;
- focus permanece visível;
- tabela, skeleton, Drawer e Dialog mantêm a mesma hierarquia.

### Limite

Não criar branding alternativo nesta fase. O teste é de light/dark sem alterar logo, accent ou família tipográfica.

## 25. Cobertura de densidade

As três densidades devem coexistir na mesma superfície sem parecer três produtos diferentes.

### Compact

Aplicar a:

- Sidebar;
- Data Table;
- Filter Bar;
- metadata de alta frequência.

**Justificativa:** esses elementos precisam preservar capacidade e escaneabilidade.

### Default

Aplicar a:

- Page Header;
- Metric Group;
- Status Banner;
- Detail Drawer;
- estrutura geral da tela.

**Justificativa:** são áreas de decisão e contexto, não apenas volume.

### Comfortable

Aplicar a:

- Form Sections;
- Empty State;
- Dialog de confirmação quando a consequência exigir leitura;
- mensagens de erro importantes.

**Justificativa:** leitura e correção precisam de respiro.

### O que avaliar

- mudanças de padding são graduais;
- tipografia não fica ilegível no Compact;
- Comfortable não cria desperdício visual;
- radius, border e shadow permanecem da mesma família;
- densidades diferentes podem coexistir sem divisões abruptas.

## 26. Viewport Matrix

Matriz mínima obrigatória:

| Viewport | Dimensão | Cobertura principal |
|---|---:|---|
| Desktop | 1440 × 900 | Shell completo, Page Header, quatro métricas, Filter Bar, tabela, banner, Drawer e Dialog |
| Tablet | 768 × 1024 | Quebra de grid, Sidebar/rail, Filter Bar, tabela e Drawer; incluir apenas estados que agreguem evidência |
| Mobile | 390 × 844 | Navigation aberta, Page Header empilhado, filtros, tabela Estratégia A/B, detalhe, form, empty e Dialog |

### Justificativa

1440×900 mostra a composição operacional completa; 768×1024 tensiona a transição entre desktop e mobile; 390×844 representa um mobile estreito onde a composição não pode depender de encolher três colunas.

### Viewports adicionais

Podem ser adicionados se uma captura revelar comportamento limítrofe. Não criar combinações apenas para aumentar o número de screenshots.

## 27. State Matrix

| Estado | Desktop | Tablet | Mobile | Light | Dark | Observação |
|---|---:|---:|---:|---:|---:|---|
| Default | ✓ | ✓ | ✓ | ✓ | ✓ | Baseline da superfície principal |
| Um filtro ativo | ✓ | — | ✓ | ✓ | — | Testa filtro visível sem multiplicar capturas |
| Vários filtros ativos | ✓ | — | ✓ | ✓ | — | Testa resumo, remoção e reset |
| Empty natural | ✓ | — | ✓ | ✓ | — | Testa primeiro uso e ação principal |
| Empty filtered | ✓ | — | ✓ | ✓ | — | Testa causa e limpeza |
| Loading | ✓ | — | ✓ | ✓ | — | Testa skeleton e geometria |
| Error recuperável | ✓ | — | ✓ | ✓ | — | Testa retry sem modal |
| Banner Info | ✓ | — | ✓ | ✓ | ✓ | Testa status persistente |
| Banner Warning/Error | ✓ | — | ✓ | ✓ | ✓ | Testa contraste e urgência |
| Drawer aberto | ✓ | ✓ | ✓ | ✓ | ✓ | Testa contexto, foco e camada |
| Form default/invalid | ✓ | — | ✓ | ✓ | — | Testa Field contract |
| Form loading/success | ✓ | — | ✓ | ✓ | — | Testa feedback e preservação |
| Dialog aberto | ✓ | — | ✓ | ✓ | ✓ | Testa overlay, foco e responsividade |
| Toast success/error | ✓ | — | ✓ | ✓ | — | Testa adequação do feedback |
| Navigation mobile aberta | — | — | ✓ | ✓ | ✓ | Testa Sidebar temporária |

`—` significa que a combinação não é obrigatória na baseline mínima, não que o estado seja proibido nesses contextos.

## 28. Component Coverage Matrix

| Elemento Blueprint | Onde será testado | Estados | Viewports | Critério |
|---|---|---|---|---|
| App Shell | Superfície principal | Default, loading, empty, error | Desktop, tablet, mobile | Orientação permanece clara |
| Sidebar | Navegação global | Aberta, recolhida, ativa, mobile aberta | Desktop, tablet, mobile | Ativo claro e menu não artificial |
| Top Utility Bar | Shell | Default, focus, dark | Desktop, tablet, mobile | Não duplica ação de página |
| Page Header | Topo da Central | Default, actions stacked | Desktop, tablet, mobile | Título, descrição e ação têm hierarquia |
| Button | Header, form, empty, dialog | Default, hover, focus, disabled, loading, destructive | Todos | Uma ação dominante e nomes claros |
| Icon Button | Shell, table/drawer actions | Default, focus, selected, disabled | Desktop, mobile | Nome acessível e alvo adequado |
| Input | Busca, formulário | Empty, filled, invalid, disabled, loading | Desktop, mobile | Label/helper/error coerentes |
| Select | Filtros e formulário | Closed, open, selected, invalid | Desktop, tablet, mobile | Opções descobertas e teclado possível |
| Badge | Estado da tabela/detalhe | Neutral, info, warning, error/success candidato | Todos | Estado não depende somente de cor |
| Card | Metric Group e formulário | Default, compact, loading | Desktop, mobile | Agrupamento sem nesting decorativo |
| Metric Card | Metric Group | Default, loading, trend | Desktop, tablet, mobile | Valor, unidade e período legíveis |
| Filter Bar | Acima da tabela | None, one, many, filtered empty | Desktop, tablet, mobile | Filtros ativos permanecem visíveis |
| Data Table | Coleção principal | Default, selection, loading, empty, error | Desktop, tablet, mobile | Dados e ações continuam utilizáveis |
| Drawer/Sheet | Detalhe do ativo | Closed, open, scroll, error optional | Desktop, tablet, mobile | Contexto preservado e foco gerido |
| Form Section | Criação/edição | Default, invalid, disabled, submit loading, success | Desktop, mobile | Field contract completo |
| Dialog | Arquivar ativo | Closed, open, focus, cancel, confirm | Desktop, mobile | Consequência explícita e saída segura |
| Empty State | Coleção vazia e filtro sem resultado | Natural, filtered | Desktop, mobile | Explica causa e próximo passo |
| Error State | Falha de carregamento | Recoverable, retry | Desktop, mobile | Não bloqueia com modal |
| Loading State | Cards, filters, rows | Skeleton | Desktop, mobile | Preserva geometria final |
| Status Banner | Informativo e warning/error | Info, warning/error | Desktop, mobile, both themes | Persistência e urgência coerentes |
| Toast | Criação, atualização, falha | Success, error, dismiss | Desktop, mobile | Adequado ao nível de persistência |

## 29. Dados fictícios

O conjunto deve ser pequeno, variado e suficiente para tensionar a composição. Não criar dezenas de registros.

| Ativo | Categoria | Localização | Estado | Última inspeção | Custo | Observação |
|---|---|---|---|---|---:|---|
| Notebook Dell Latitude 7450 | Computador | Unidade Centro | Operacional | 12/09/2026 | R$ 8.490 | Uso administrativo |
| Compressor Industrial 03 | Equipamento | Fábrica Norte | Em manutenção | 08/09/2026 | R$ 32.800 | Revisão do sistema de ar |
| Van Operacional 07 | Veículo | Garagem Sul | Atenção | 29/08/2026 | R$ 118.000 | Inspeção de pneus pendente |
| Scanner Zebra TC58 | Dispositivo | Unidade Centro | Operacional | 11/09/2026 | R$ 4.280 | — |
| Torno CNC Haas VF-2 | Máquina | Fábrica Norte | Inativo | — | R$ 286.500 | Aguardando decisão de uso |
| Kit de ferramentas de manutenção preventiva com identificação longa | Ferramenta | Oficina Leste | Operacional | 05/09/2026 | R$ 2.160 | Nome propositalmente longo para testar truncamento acessível |

### Variações necessárias

- nomes curtos e longos;
- categorias repetidas e diferentes;
- pelo menos três localizações;
- todos os estados fictícios;
- datas presentes e ausentes;
- custos pequenos e altos;
- observação presente e ausente;
- texto que exija truncamento sem perder acesso ao conteúdo completo.

## 30. Flows de validação

### Flow A — Localizar um ativo

1. abrir a Central de Ativos;
2. pesquisar por `Zebra`;
3. confirmar que o resultado e o filtro ativo são compreensíveis;
4. aplicar localização `Unidade Centro`;
5. abrir o detalhe do Scanner Zebra TC58;
6. verificar que a lista continua reconhecível;
7. fechar o Drawer e retornar à mesma posição/contexto.

**Testa:** Page Header, Filter Bar, Data Table, Badge, Drawer, foco e continuidade.

### Flow B — Criar um ativo

1. clicar em `Adicionar ativo`;
2. verificar a hierarquia das Form Sections;
3. tentar salvar com Nome vazio;
4. observar Error Message associado;
5. preencher Nome, Categoria e Localização;
6. inserir custo inválido para testar validação;
7. corrigir o custo;
8. enviar o formulário e observar loading;
9. observar feedback de sucesso;
10. confirmar que a estrutura não depende de regras reais de negócio.

**Testa:** Button, Input, Select, date-like field, Textarea, Helper, Required, Invalid, Disabled, Loading e Toast.

### Flow C — Arquivar um ativo

1. abrir o Scanner Zebra TC58;
2. acionar `Arquivar ativo`;
3. visualizar Dialog com consequência explícita;
4. testar foco e Escape;
5. cancelar;
6. repetir a ação;
7. confirmar;
8. observar feedback apropriado.

**Testa:** Drawer, Dialog, destructive action, overlay, focus return, mobile footer e Toast/Banner de resultado.

### Flow D — Mobile

1. abrir a navegação mobile;
2. fechar a navegação;
3. pesquisar um ativo;
4. abrir filtros e aplicar dois filtros;
5. comparar Estratégia A e Estratégia B da tabela;
6. abrir detalhe;
7. fechar detalhe;
8. abrir criação;
9. verificar ações empilhadas;
10. abrir e cancelar Dialog.

**Testa:** composição responsiva, descoberta, densidade, tabela mobile, Sheet, form e Dialog.

### Flow E — Estados de conteúdo

1. abrir o estado Loading;
2. transicionar para Default;
3. simular Error e usar Retry;
4. simular Empty natural;
5. simular Empty filtered;
6. limpar filtros;
7. observar a diferença entre os vazios.

**Testa:** Loading, Error, Empty, retry, filtro e continuidade visual.

## 31. Accessibility Checklist

Checklist para a futura implementação; não executada nesta etapa.

### Navegação e foco

- [ ] tab order segue shell, header, filtros, conteúdo e actions;
- [ ] focus-visible é perceptível em light e dark;
- [ ] item ativo da Sidebar é anunciado;
- [ ] grupo recolhível expõe estado;
- [ ] navegação mobile abre e fecha por teclado;
- [ ] Dialog prende foco enquanto aberto;
- [ ] Drawer/Sheet recebe foco ao abrir;
- [ ] foco retorna ao trigger ao fechar Drawer, Sheet ou Dialog;
- [ ] Escape fecha camada não destrutiva com segurança;
- [ ] fechamento não descarta dados sem aviso.

### Nomes e campos

- [ ] Icon Buttons têm accessible names;
- [ ] labels estão associadas a todos os controls;
- [ ] placeholder não substitui label;
- [ ] helper e error estão associados ao campo;
- [ ] required é comunicado;
- [ ] disabled não é usado para esconder informação necessária;
- [ ] loading de submit é comunicado;
- [ ] estados de sucesso e erro têm texto.

### Cor e contraste

- [ ] texto primário e secundário têm contraste validado;
- [ ] borders de campos são perceptíveis;
- [ ] focus contrasta em todos os themes;
- [ ] Accent não é a única forma de indicar seleção;
- [ ] estados não dependem exclusivamente de cor;
- [ ] Badges incluem texto;
- [ ] Banner Info e Warning/Error continuam compreensíveis em dark;
- [ ] overlay mantém distinção sem apagar o contexto.

### Touch, zoom e movimento

- [ ] touch targets seguem a referência de 44px quando apropriado;
- [ ] targets vizinhos não ficam difíceis de separar;
- [ ] layout continua utilizável em zoom de 200%;
- [ ] tabela não perde leitura em zoom;
- [ ] reduced motion é respeitado;
- [ ] skeleton não cria motion excessiva.

### Tabela e camadas

- [ ] headers de tabela são semânticos;
- [ ] ordem de leitura da tabela é compreensível;
- [ ] ações de linha têm nomes;
- [ ] truncamento oferece texto completo acessível;
- [ ] estratégia mobile escolhida é anunciada de forma clara;
- [ ] Drawer/Sheet tem nome e descrição;
- [ ] Dialog explica consequência e ações;
- [ ] Toast usa role adequado à urgência.

## 32. Open Decisions sob teste

Esta seção mapeia as decisões do Blueprint para evidências futuras. Nenhuma decisão é encerrada aqui.

| OPEN DECISION | O que será testado | Evidência a observar | Resultado que poderia resolver | Quando manter aberta |
|---|---|---|---|---|
| Page Header contract | Título, descrição, actions, stacking e separação da Top Bar | Mesmo header reconhecível em desktop/mobile e states | Sem overrides conceituais e com hierarquia clara | Se actions, descrição ou loading exigirem exceções incompatíveis |
| Field contract | Input, Select, date-like, Textarea, Label, Helper, Error, Required, Disabled | Mesma família visual e leitura de erro/foco | Campos se comportam como um sistema | Se controles ainda divergirem em anatomia ou acessibilidade |
| Overlay | Drawer, Sheet e Dialog em light/dark/mobile | Camadas distinguíveis, foco e retorno consistentes | Um modelo de elevação/overlay cobre os três casos | Se mobile exigir contratos distintos ou overlay perder contexto |
| Radius aliases | Control, Card, Overlay, Pill e Avatar em uma tela | Funções parecem distintas sem excesso de rounded | Aliases explicam uso melhor que tamanhos genéricos | Se valores ainda dependerem de casos locais |
| Density contract | Compact, Default e Comfortable coexistindo | Ritmo, legibilidade e mesma família | Regra por componente/contexto pode ser documentada | Se densidades parecerem produtos diferentes |
| Data Table mobile | Priority Columns vs Row-to-Card | Comparação, contexto, ação e acessibilidade | Uma estratégia ou política condicional demonstrar vantagem | Se dados diferentes produzirem resultados inconclusivos |
| Theme boundary | Light/dark sem branding alternativo | Papéis semânticos preservados | Limites de substituição ficam claros | Se contrastes ou states dependerem de nova marca |
| Icon consistency | Peso, tamanho, status e icon-only | Ícones parecem da mesma família e têm nomes | Uma biblioteca principal ou exceção documentada | Se o protótipo não cobrir variedade suficiente |
| Evidence baseline | Capturas e fixtures mínimas | Estados críticos comparáveis entre viewports/themes | Conjunto de screenshots repetível | Se ainda faltar decisão de cobertura ou ambiente |

### Regra de interpretação

Uma evidência isolada não encerra uma decisão de sistema. O relatório futuro deve combinar observação visual, operação por teclado, comparação entre viewports e consistência entre estados.

## 33. Decisões fora da capacidade desta validação

A Central de Ativos pode fornecer sinais, mas não deve ser usada para resolver sozinha:

- família tipográfica final do produto;
- escolha completa de uma combinação display/body;
- estratégia de data visualization além do Metric Card simples;
- integração ou destino do showcase;
- governança, versionamento e distribuição do futuro Design System;
- API de componentes ou tecnologia de implementação;
- limites de personalização de marca em múltiplos clientes;
- política completa de conteúdo, localization e voice & tone;
- comportamento de tabelas para todos os formatos de dados;
- adequação de patterns de domínio que não aparecem nesta tela.

Essas decisões permanecem `OPEN DECISION` no Blueprint mesmo que a Central de Ativos pareça coerente.

## 34. Critérios de sucesso

### Critérios críticos

Neutralidade de domínio e hierarquia são críticos. Uma média alta não compensa falha nesses dois pontos.

### Rubrica qualitativa

| Critério | Evidência de sucesso |
|---|---|
| Neutralidade de domínio | Nenhum componente exige vocabulário ou conceito proibido |
| Hierarquia | Página, seção, primary content, metadata e ação são identificáveis |
| Densidade | Compact, Default e Comfortable parecem variações do mesmo sistema |
| Cor | Accent e states são usados com disciplina e significado |
| Spacing | Relações e ritmo são previsíveis sem uniformidade rígida |
| Components | Buttons, fields, cards, badges, layers e states pertencem à mesma família |
| Responsive | A composição melhora ao adaptar, em vez de apenas encolher |
| Accessibility | Focus, labels, contrast, touch e keyboard estão contemplados |
| Branding independence | A interface continua coerente sem depender de sage ou outra cor específica |
| Domain independence | Nenhum componente exige entidade, fluxo ou linguagem de CRM |

### Resultado aprovado

- nenhuma categoria crítica abaixo de 4;
- média geral alta na escala definida na seção seguinte;
- todos os CORE principais cobertos;
- estados default, loading, empty, error, Drawer, Dialog e temas evidenciados;
- nenhuma falha específica de domínio;
- tabela mobile testada em pelo menos duas estratégias.

### Resultado aprovado com ajustes

- nenhum critério crítico abaixo de 3;
- linguagem permanece reconhecível e operacional;
- um ou mais contracts exigem revisão;
- não há dependência de CRM para corrigir a coerência;
- decisões abertas podem ser encaminhadas para uma próxima rodada.

### Resultado reprovado

- qualquer critério crítico igual a 1 ou 2;
- linguagem precisa de elementos de CRM para parecer completa;
- tabela ou shell inutilizável em mobile;
- states ou dark mode destroem a hierarquia;
- acessibilidade básica é incompatível com a anatomia;
- componentes precisam de tantos overrides que deixam de ser um sistema.

## 35. Sistema de pontuação

Escala:

```text
5 — Excelente
4 — Bom
3 — Aceitável com ajustes
2 — Fraco
1 — Falha
```

### Nota 5

O critério funciona em todos os viewports/themes previstos, exige pouca interpretação, permanece coerente entre estados e não depende de conteúdo de CRM.

### Nota 3

O critério funciona no caso principal, mas apresenta uma inconsistência, uma exceção ou uma decisão ainda não documentada em algum viewport, estado ou camada.

### Nota 1

O critério falha no caso principal, depende de um conceito proibido, perde legibilidade/ação, ou exige reconfiguração local suficiente para quebrar a família visual.

### Aplicação

Pontuar os dez critérios de sucesso. Registrar evidência e observação, não apenas número. A média serve para leitura geral, mas neutralidade e hierarquia continuam gates críticos.

## 36. Critérios de falha específicos

Registrar como falha quando ocorrer qualquer um dos casos abaixo:

- a tela só parece coerente após introduzir elementos típicos de CRM;
- Sidebar depende de quantidade artificial de módulos;
- Top Utility Bar repete a ação `Adicionar ativo`;
- Data Table fica inutilizável no mobile;
- a Estratégia A ou B esconde ação/estado sem alternativa acessível;
- accent começa a ser usado como decoração de cada métrica;
- componentes exigem muitos overrides locais para alinhar altura, radius ou focus;
- Compact, Default e Comfortable parecem três produtos diferentes;
- Page Header muda de anatomia sem razão entre viewport ou state;
- Drawer não preserva contexto ou não devolve foco;
- Dialog não explica consequência;
- dark mode perde distinção entre Canvas, Surface, Text e Border;
- status depende somente de cor;
- Empty State não diferencia ausência natural de zero filtrado;
- Error State bloqueia a tela com modal sem necessidade;
- Loading não preserva a geometria final;
- Toast é usado para condição que precisa permanecer visível;
- tabela usa números/datas sem alinhamento ou unidade;
- truncamento torna informação essencial inacessível;
- a interface não funciona por teclado ou com zoom de 200%;
- a tela precisa do accent sage para manter orientação, contrariando a independência de marca.

## 37. Visual Regression Baseline futura

Não criar screenshots agora. A implementação futura deverá organizar conceitualmente as evidências assim:

```text
validation/
├── desktop/
│   ├── default-light
│   ├── filters-active-light
│   ├── empty-light
│   ├── drawer-light
│   ├── modal-light
│   └── default-dark
├── tablet/
│   ├── shell-transition-light
│   └── table-transition-light
├── mobile/
│   ├── default-light
│   ├── navigation-open-light
│   ├── filters-light
│   ├── table-priority-columns-light
│   ├── table-row-to-card-light
│   ├── detail-light
│   ├── empty-light
│   └── modal-light
└── accessibility/
    ├── keyboard-focus
    ├── zoom-200
    └── reduced-motion
```

### Nomenclatura

Formato conceitual:

```text
<viewport>-<scenario>-<theme>-<variant>
```

Exemplos:

- `desktop-default-light`;
- `mobile-filters-dark`;
- `mobile-table-row-to-card-light`.

Cada evidência futura deve registrar viewport, theme, density, estado, estratégia de tabela e data da captura.

### Baseline mínima

O conjunto mínimo deve conter os cenários definidos no Screenshot Plan. Tablet só entra quando acrescentar evidência sobre transição ou layout, evitando combinações redundantes.

## 38. Screenshot Plan

Não capturar nesta etapa. Planejar as futuras capturas.

### Desktop — 1440×900

- Default light;
- Filters active light;
- Empty filtered light;
- Drawer open light;
- Dialog open light;
- Default dark;
- Error ou Loading, conforme o estado revelar maior risco.

### Tablet — 768×1024

- Shell e quebra de conteúdo;
- Filter Bar/tabela em transição;
- Drawer, apenas se o comportamento diferir do desktop;
- um tema preferencial para evitar duplicidade, salvo problema específico no dark.

### Mobile — 390×844

- Default light;
- Navigation open light;
- Filters active light;
- Priority Columns light;
- Row-to-Card light;
- Detail light;
- Empty natural ou filtered light;
- Dialog light;
- Default dark ou Drawer dark quando houver risco de contraste.

### Regras de captura

- usar os mesmos dados fictícios quando comparar estratégias;
- registrar densidade e estado;
- não comparar pixels com screenshots do Deskcomm;
- não incluir widgets de ambiente ou overlays externos como parte do produto;
- capturar apenas depois que a implementação estiver estável o suficiente para comparação.

## 39. Comparative Review

A revisão futura deve comparar:

```text
Blueprint intention
vs.
Implemented result
```

Não deve comparar:

```text
Central de Ativos
vs.
Screenshot do Deskcomm
```

A Central de Ativos não precisa parecer uma cópia exata do Deskcomm. Ela precisa obedecer aos mesmos princípios: hierarquia silenciosa, surfaces semânticas, densidade contextual, ações claras, states orientadores, shell reconhecível e responsive composicional.

## 40. Não usar o Deskcomm como pixel reference

A auditoria é evidência de origem; o Blueprint é a regra atual; esta spec é o contrato do teste.

Não instruir a implementação futura a:

- copiar pixels;
- copiar telas;
- copiar classes;
- copiar exatamente spacing local;
- copiar conteúdos;
- copiar o layout específico de Inbox/Kanban;
- reproduzir nomenclatura ou estados de CRM;
- usar a screenshot existente como critério de igualdade visual.

O que deve ser preservado é a intenção estrutural, não a aparência literal de uma tela de origem.

## 41. Contrato do relatório futuro

Ao final da implementação, criar:

`docs/NON_CRM_VALIDATION_REPORT.md`

A spec não cria esse relatório, mas define os dados que ele deverá registrar:

- hipótese avaliada;
- resumo do protótipo implementado;
- score de cada critério;
- média geral, sem ignorar gates críticos;
- screenshots e matriz de cobertura;
- viewport, theme, density e estado de cada evidência;
- comparação das estratégias de tabela mobile;
- inconsistências observadas;
- componentes aprovados;
- components/patterns reprovados ou `REVIEW`;
- decisões resolvidas por evidência;
- decisões que continuam abertas;
- dependências de marca identificadas;
- dependências de domínio identificadas;
- recomendações para o futuro Design System;
- limitações da validação;
- confirmação de que não houve comparação pixel-a-pixel com o Deskcomm.

## 42. Implementation Boundary

### Esta Spec define

- requisitos da Central de Ativos;
- domínio permitido e conceitos proibidos;
- arquitetura mínima;
- componentes e patterns a exercitar;
- estados;
- dados fictícios;
- viewports;
- temas e densidades;
- fluxos;
- checklist de acessibilidade;
- critérios de sucesso, falha e pontuação;
- plano de screenshots;
- formato do relatório futuro.

### Future implementation será responsável por

- construir o protótipo visual isolado;
- criar os componentes necessários dentro do escopo;
- fornecer os dados mockados;
- implementar as interações dos flows;
- exercitar as alternativas de tabela mobile;
- produzir screenshots;
- verificar temas, densidades e viewports;
- avaliar teclado, foco, zoom e reduced motion;
- preencher o relatório futuro.

### Regra de separação

Nenhuma decisão de implementação deve ser tratada como resolução automática de uma `OPEN DECISION` do Blueprint. Quando uma escolha for necessária para construir o protótipo, ela deve ser registrada como hipótese, variante ou decisão provisória no relatório.

## 43. Validação final da especificação

| Pergunta | Resultado |
|---|---|
| A tela é realmente não-CRM? | Sim; o domínio é Gestão de Ativos e os conceitos proibidos são apenas limites do teste |
| Todos os principais CORE do Blueprint são testados? | Sim; shell, navigation, header, fields, cards, metrics, filters, table, layers, states, feedback, themes e density estão cobertos |
| Há componentes desnecessários apenas para “mostrar tudo”? | Não; a proposta usa uma única superfície e camadas indispensáveis |
| Existem estados normal, loading, empty e error? | Sim, com natural/filtered e retry separados |
| Desktop e mobile estão suficientemente cobertos? | Sim, com 1440×900, 768×1024 e 390×844 |
| Light e Dark estão cobertos? | Sim, com matriz de estados e critérios semânticos |
| Existe teste explícito da Data Table mobile? | Sim; Priority Columns e Row-to-Card serão comparadas sem vencedora prévia |
| As OPEN DECISION foram mapeadas sem encerramento arbitrário? | Sim; cada uma tem evidência, possível resolução e condição para permanecer aberta |
| Existem critérios objetivos de sucesso e falha? | Sim; gates críticos, rubrica 1–5 e falhas específicas |
| A implementação poderá ser executada lendo apenas esta spec + Blueprint? | Sim para o protótipo visual isolado; regras reais de produto continuam fora do escopo |

## Conclusão

A Central de Ativos é o menor experimento proposto para testar a linguagem visual fora do CRM: uma tela principal com shell, métricas, filtros, tabela, estados e camadas de detalhe/criação/confirmação.

O experimento não tenta provar que cada decisão do Blueprint está fechada. Ele deve revelar quais padrões são genuinamente CORE, quais são ADAPTABLE, quais dependem da marca e quais precisam continuar em `REVIEW`.

O próximo passo autorizado por esta especificação é somente a implementação do protótipo visual isolado, seguida de evidências e do relatório futuro. Nesta etapa, nenhum código, frontend, token, CSS, Blueprint, auditoria, screenshot ou teste visual foi criado ou alterado.
