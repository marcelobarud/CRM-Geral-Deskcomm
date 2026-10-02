# UI Construction Guide

Manual prático e reutilizável para construir interfaces administrativas, SaaS e ferramentas operacionais com boa hierarquia, organização, densidade e comportamento visual.

Este guia descreve métodos de construção. Ele não é um Design System formal, uma biblioteca de componentes, um catálogo de classes ou uma especificação de branding.

---

## 1. Purpose

Use este guia para planejar, construir ou reformular interfaces que precisam ser:

- fáceis de entender antes de serem decoradas;
- consistentes sem ficarem monótonas;
- densas quando a tarefa pede comparação;
- espaçosas quando a tarefa pede leitura ou preenchimento;
- responsivas por composição, não apenas por redução de tamanho;
- acessíveis por teclado, toque e tecnologias assistivas;
- independentes de um domínio específico.

O guia pode orientar dashboards, sistemas financeiros, estoque, projetos, gestão de ativos, ferramentas internas, produtos SaaS e aplicações administrativas.

## 2. How to Use This Guide

Antes de escrever interface:

1. identifique quem usa a tela e qual decisão ou tarefa ela suporta;
2. classifique a tela: Dashboard, List, Detail, Form, Settings, Hub ou Multi-pane;
3. desenhe a hierarquia em texto antes de escolher cores e ilustrações;
4. defina o shell, a navegação, o Page Header, o conteúdo principal e as ações;
5. escolha a densidade pela tarefa, não por preferência estética;
6. planeje Loading, Empty, Error e Success junto com o estado normal;
7. defina a composição de tablet e mobile antes de finalizar o desktop;
8. teste teclado, foco, zoom, contraste, toque e textos longos;
9. revise a tela inteira, não apenas os componentes isolados.

Quando este documento for usado por um agente de código, peça primeiro uma análise da estrutura existente e uma classificação das telas. A implementação deve preservar as regras de negócio e a identidade do produto, aplicando os métodos deste guia.

## 3. Core Visual Philosophy

### Hierarchy before decoration

Tipografia, posição, alinhamento, espaçamento e agrupamento devem explicar a interface antes de qualquer cor forte, sombra ou ilustração.

Se uma tela só funciona depois de adicionar cor, reduza a decoração e corrija a hierarquia.

### Border first, shadow second

Use tonalidade e border para separar superfícies no estado normal. Use shadow quando houver uma mudança real de elevação: menu flutuante, Drawer, Sheet, Dialog ou superfície destacada.

Aplicar sombra em todos os cards cria ruído e faz cada bloco parecer igualmente importante.

### Accent with discipline

Accent serve principalmente para ação, seleção, foco, navegação ativa e links relevantes. Neutros devem ocupar a maior parte da tela. O accent não deve pintar todos os títulos, borders, cards e ícones ao mesmo tempo.

### Contextual density

Navigation, filtros, metadados e tabelas podem ser compactos. Headers, dashboards e cards gerais normalmente precisam de densidade default. Formulários, onboarding, empty states e confirmações importantes podem ser confortáveis.

Uma mesma página pode combinar densidades diferentes quando a mudança acompanha a tarefa.

### One dominant action

Cada contexto deve ter uma ação claramente dominante. Ações secundárias devem ser discretas, agrupadas ou colocadas no menu contextual. Se tudo parece primário, nada é primário.

### States orient the user

Loading, Empty, Error e Success não são apenas variações visuais. Eles devem dizer o que aconteceu, o que permanece disponível e qual é o próximo passo.

### Responsive changes composition

Mobile não é desktop comprimido. Em telas menores, a interface pode empilhar, esconder metadados secundários, transformar tabela em cards, mover detalhes para Drawer, agrupar filtros e empilhar ações.

### Structure is reusable; branding is configurable

Hierarquia, espaçamento, anatomia de página, comportamento dos controles, responsividade, uso de estados e densidade são métodos reutilizáveis.

Logo, cor accent, família tipográfica, ilustrações, tom editorial e detalhes de marca pertencem ao produto que está sendo construído.

## 4. Application Structure

Comece com uma estrutura simples:

```text
Application
├── App Shell
│   ├── Sidebar
│   ├── Top Utility Bar
│   └── Main Canvas
└── Contextual Layer
    ├── Drawer / Sheet
    ├── Dialog
    └── Popover / Menu
```

### App Shell

Use App Shell quando o produto possui navegação persistente, várias áreas ou uma rotina operacional contínua.

O shell deve responder a três perguntas sem esforço:

1. onde estou;
2. onde posso ir;
3. qual é o conteúdo principal deste contexto.

Não deixe o shell competir com a página. A navegação orienta; o Main Canvas concentra a tarefa.

### Main Canvas

O canvas deve possuir largura útil, padding consistente e ritmo vertical previsível. Centralize o conteúdo quando isso melhorar leitura, mas não limite tabelas e áreas operacionais a uma largura estreita sem motivo.

### Contextual Layer

Use uma camada contextual para detalhes, decisões e edições curtas sem retirar o usuário da página de origem. O overlay deve ter título, contexto, conteúdo, ação e fechamento claros.

## 5. App Shell

### Quando usar

- produto com mais de uma área principal;
- ferramenta administrativa ou SaaS;
- rotina em que o usuário alterna entre módulos;
- aplicação que precisa manter localização e contexto.

### Quando evitar

- landing page ou fluxo linear muito curto;
- formulário único sem navegação persistente;
- experiência em que uma página focada é mais clara que um shell.

### Desktop

Mantenha a Sidebar persistente quando a navegação frequente for importante. O Main Canvas deve começar depois dela, com uma Top Utility Bar alinhada ao conteúdo.

Uma Sidebar pode possuir modo rail/collapsed, mas o estado colapsado não pode remover orientação essencial: preserve tooltips, accessible names e uma forma clara de identificar o destino ativo.

### Mobile

A Sidebar deve virar Drawer ou Sheet temporário. Não tente manter a sidebar desktop comprimida em uma coluna estreita. O menu abre sobre o conteúdo, fecha com Escape e devolve o foco ao acionador.

## 6. Sidebar

### Anatomia

```text
Brand / Product Mark
Navigation Groups
Navigation Items
Flexible Space
Secondary Utilities
Environment / Account Context
```

### Receita prática

1. agrupe destinos por tarefa ou área;
2. mantenha poucos grupos com nomes previsíveis;
3. use um item ativo claramente visível;
4. deixe itens inativos discretos, mas legíveis;
5. escolha uma biblioteca principal de ícones;
6. reserve a parte inferior para utilidades secundárias;
7. use hubs quando a quantidade de destinos crescer;
8. transforme o menu em Sheet no mobile.

### Use hubs quando

uma área possui várias telas relacionadas. Um Hub funciona como ponto de entrada com grupos de destinos e reduz uma Sidebar infinita.

### Evite

- dezenas de itens no mesmo nível;
- mais níveis de submenu do que a tarefa justifica;
- item ativo indicado apenas por uma mudança sutil de texto;
- ícones de estilos, pesos ou famílias incompatíveis;
- colocar ações específicas da página dentro da navegação global.

## 7. Top Utility Bar

A Top Utility Bar concentra funções globais, por exemplo:

- busca global;
- organização, workspace ou contexto atual;
- alertas e notificações;
- tema e idioma;
- conta e preferências.

Ela não deve competir com o Page Header. A ação de criar, salvar, importar ou executar algo específico da página normalmente pertence ao Page Header.

No mobile, preserve apenas o que é realmente global e transforme o restante em menu ou Sheet.

## 8. Main Content

O Main Canvas deve seguir uma sequência fácil de escanear:

```text
Context / Breadcrumb optional
Page Header
Filters or Period optional
Primary Content
Secondary Information
```

O espaço entre blocos deve indicar mudança de contexto. Dentro de um grupo, reduza o gap. Entre seções, aumente-o.

Não comece a página com uma coleção de cards sem título, contexto ou ação. O usuário precisa entender o que está vendo antes de interpretar os dados.

## 9. Page Construction

Construa páginas de cima para baixo:

1. contexto e localização;
2. título e propósito;
3. ação principal;
4. filtros ou período;
5. conteúdo primário;
6. estados do conteúdo;
7. ações secundárias;
8. camadas contextuais.

O estado vazio, o erro e o loading devem conservar aproximadamente a geometria da tela normal para não causar saltos desnecessários.

## 10. Page Header

### Anatomia

```text
Title
Description optional
Primary Action
Secondary Actions optional
```

### Desktop

```text
Title / Description                         Actions
```

### Mobile

```text
Title
Description
Actions
```

### Regras

- mostre o título uma vez;
- use descrição quando ela explicar escopo ou decisão;
- escolha normalmente uma ação dominante;
- deixe cancelar, voltar e opções secundárias mais discretos;
- empilhe naturalmente no mobile;
- permita que a ação principal fique full-width quando necessário;
- não duplique ações globais da Top Utility Bar;
- não use uma grande ilustração para substituir um título claro.

## 11. Page Types

Classificar a tela antes de escolher seus blocos reduz decisões arbitrárias.

### List Page

```text
Page Header
Filter Bar
Collection: Table / List / Cards
Pagination or Secondary Actions
```

Use para localizar, comparar, ordenar e operar sobre uma coleção. Evite quando um único objeto ou uma decisão isolada for o foco.

Desktop favorece tabela e comparação. Mobile exige estratégia de priorização, cards ou detalhe contextual. Densidade geralmente compacta/default.

### Dashboard

```text
Page Header
Period / Filters
Metric Group
Primary Visualization
Supporting Information
```

Use quando a pessoa precisa entender o estado geral e escolher onde investigar. Evite transformar cada número em um card ou misturar visualizações sem relação.

Densidade default; gráficos e tabelas secundárias podem ser mais compactos.

### Detail Page

```text
Detail Header
Status / Context
Tabs or Sections
Primary Content
Actions
```

Use quando o objeto possui conteúdo suficiente para merecer uma URL e uma leitura completa. Use Drawer quando o detalhe é curto e o contexto da lista deve permanecer.

### Form Page

```text
Page Header
Form Sections
Field Feedback
Action Footer
```

Use quando há muitos campos, etapas ou necessidade de navegação própria. Densidade default/comfortable. Divida em seções sem transformar cada grupo em Card automaticamente.

### Settings Page

```text
Page Header
Grouped Settings
Persistence Feedback
Sensitive Actions separated
```

Agrupe preferências por assunto, mostre como salvar ou quando a persistência ocorreu e isole ações destrutivas.

### Hub Page

```text
Page Header
Destination Groups
Navigation Cards / Links
```

Use para apresentar áreas de um módulo. Cada destino precisa de nome, contexto e affordance previsível. Não use cards navegáveis apenas para preencher espaço.

### Multi-pane Workspace

```text
Navigator
Primary Workspace
Optional Context Panel
```

Use quando a tarefa exige alternar entre itens e trabalhar no conteúdo principal. No mobile, alterne entre lista e conteúdo ou use uma navegação temporária; não force três painéis espremidos.

## 12. Metric Groups

### Anatomia

```text
Label
Value
Unit / Period
Trend optional
Context optional
```

### Método

1. escolha métricas que respondem à pergunta da página;
2. dê maior hierarquia ao valor;
3. torne unidade e período explícitos;
4. use tendência apenas quando houver comparação compreensível;
5. escreva o contexto próximo do número;
6. mantenha os cards como uma família visual;
7. aplique cor somente quando ela possuir significado.

Evite o “rainbow dashboard”: uma cor diferente por métrica raramente melhora a leitura.

## 13. Filter Bars

### Possíveis elementos

- Search;
- Filters;
- Sort;
- Period;
- Active Filters;
- Clear.

### Desktop

Uma linha horizontal funciona quando os controles cabem sem compressão. Dê prioridade à busca e aos filtros que mudam mais o resultado.

### Tablet

Permita wrap controlado. Não deixe controles desaparecerem por falta de largura nem crie uma segunda linha sem ritmo visual.

### Mobile

Use grupo compacto, painel, Sheet ou Popover. Filtros ativos precisam continuar visíveis mesmo quando os controles completos estiverem recolhidos.

### Regras

- o filtro deve explicar o escopo atual;
- estados ativos devem ter representação textual;
- “Limpar” deve estar próximo do resumo dos filtros;
- não esconda todos os filtros atrás de um botão sem indicar quantos estão ativos;
- ao limpar, restaure a leitura natural da coleção;
- Empty filtered deve explicar que o problema pode estar nos filtros.

## 14. Data Tables

### Quando usar

Data Table funciona bem para comparação, listas densas, valores numéricos e informação estruturada. Use List ou Cards quando o contexto de cada item for mais importante que a comparação por coluna.

### Anatomia

```text
Primary Field
Secondary Metadata
Status
Numeric / Date
Actions
```

### Regras

- header silencioso;
- campo primário dominante;
- metadados menores e discretos;
- status com texto, não apenas cor;
- números alinhados e em formato previsível;
- datas consistentes e legíveis;
- actions discretas, com accessible name;
- hover leve;
- borders suaves e ritmo de linha estável;
- longos podem truncar visualmente, mas continuam acessíveis por título, detalhe ou leitura assistiva.

Não transforme cada linha em uma coleção de badges e botões. A ação deve permanecer encontrável sem dominar a tabela.

## 15. Data Tables on Mobile

Não existe uma regra universal. Escolha pela tarefa e pelo formato dos dados.

### Strategy A — Priority Columns

Boa para listas densas e varredura rápida. Preserve apenas:

```text
Primary
Status
Action
```

Metadados restantes vão para detalhe. A estratégia reduz altura e funciona quando o usuário reconhece o item principalmente pelo campo primário e estado.

### Strategy B — Row-to-Card

Boa quando inspeção, custo, data, local ou outros metadados são importantes para a decisão. Um cartão pode reunir:

```text
Primary + Context
Status
Key Metadata
Actions
```

O experimento não-CRM indicou Row-to-Card como melhor para a Central de Ativos depois da correção de contenção de largura. Priority Columns continuou superior para contextos de maior densidade.

Regra reutilizável:

> escolha a estratégia mobile pelo formato dos dados e pela tarefa, não por uma preferência universal.

### Teste obrigatório

Em 390 px, verifique texto longo, status, ações, custo, datas e ausência de overflow horizontal. O cartão precisa ter `min-width` controlado, título que possa truncar ou quebrar e actions que nunca desapareçam.

## 16. Cards

Card indica agrupamento semântico. Não use apenas porque existe conteúdo.

Variações conceituais:

- **Standard:** grupo de conteúdo relacionado;
- **Interactive:** item selecionável ou navegável;
- **Metric:** valor e contexto resumido;
- **Selection:** opção de escolha;
- **Dense:** informação repetitiva e compacta.

Um Card deve ter motivo de existir, limites claros e um nível de importância coerente. Evite:

```text
Card
└── Card
    └── Card
```

sem mudança real de contexto. Prefira whitespace e borders simples quando uma nova superfície não acrescentar significado.

## 17. Drawers and Sheets

### Use quando

- manter o contexto da página é importante;
- o detalhe é curto ou contextual;
- uma edição não justifica uma página inteira;
- o usuário precisa retornar rapidamente à lista.

### Estrutura

```text
Header
Status / Context
Content
Actions
Close
```

### Desktop

Drawer lateral com largura suficiente para leitura, rolagem interna quando necessário e footer de ações estável.

### Mobile

Pode ocupar grande parte ou toda a viewport. Empilhe ações e reserve margens para não colidir com o gesto de navegação.

### Regras

- título claro;
- close sempre acessível;
- conteúdo com hierarquia própria;
- ações agrupadas no final;
- Escape fecha;
- foco fica preso enquanto a camada está aberta;
- foco retorna ao acionador quando fecha;
- se a camada parecer outra página completa, use Detail Page.

## 18. Dialogs

Use Dialog para confirmação, decisão obrigatória, ação de alto impacto ou tarefa curta e focada.

### Anatomia

```text
Title
Consequence / Description
Content optional
Actions
```

Evite “Tem certeza?” sem explicar a consequência. A ação destrutiva deve ser visualmente diferente de Cancelar, mas não pode depender apenas da cor.

O Dialog deve fechar com Escape quando isso não colocar a tarefa em risco, manter foco interno e devolver o foco ao acionador.

## 19. Forms and Fields

### Receita de Field

```text
Label
Control
Helper / Error
```

Opcionalmente:

```text
Leading Icon
Trailing Action
```

### Regras

- Label não é placeholder;
- Helper explica algo útil, não repete o label;
- Error diz como corrigir;
- required é compreensível;
- controles têm alturas coerentes;
- radius e focus seguem a mesma linguagem;
- mensagens ficam próximas do campo;
- estados disabled continuam legíveis;
- loading impede dupla submissão e explica o que está acontecendo;
- erros não dependem de borda vermelha ou cor isolada;
- formulários longos são divididos em Form Sections.

### Form Sections

```text
Section Title
Description optional
Related Fields
Local Feedback
```

Use whitespace para separar seções. Só crie Card quando o grupo realmente precisar de uma superfície própria.

## 20. Status and Feedback

### Statuses

```text
Neutral
Info
Success
Warning
Error
```

### Veículos

| Situação             | Componente indicado |
| -------------------- | ------------------- |
| propriedade curta    | Badge               |
| contexto de campo    | Inline message      |
| condição persistente | Banner              |
| feedback temporário  | Toast               |
| decisão obrigatória  | Dialog              |

Cor nunca deve ser o único significado. Combine texto, posição, ícone quando necessário e affordance de ação.

### Mensagem boa

Uma mensagem boa responde:

1. o que aconteceu;
2. qual é o impacto;
3. qual é o próximo passo.

## 21. Empty, Error and Loading

### Empty state

```text
Visual Cue
Headline
Explanation
Next Action
Optional Secondary Action
```

#### Empty natural

Não existem dados. Explique como criar o primeiro item ou qual é a ação inicial.

#### Empty filtered

Existem dados, mas os filtros atuais não retornaram resultado. Mostre o resumo dos filtros e ofereça limpar ou ajustar.

As duas situações não devem usar a mesma mensagem genérica.

### Error state

Prefira:

```text
Message
Context
Retry
```

Um erro recuperável deve manter o usuário na tela e dizer que os dados ou alterações preservados. Evite bloquear toda a aplicação com Modal quando apenas uma coleção falhou.

### Loading

Quando a geometria é conhecida, use Skeletons que preservem aproximadamente cards, linhas, espaços e ritmo. Evite spinner central como única representação de uma tela estruturada.

O Loading deve desaparecer de forma previsível e não fazer a página saltar desnecessariamente.

## 22. Typography

Não existe uma família universal. Escolha a fonte conforme o produto, mas mantenha papéis previsíveis:

- Page Title;
- Section Title;
- Card Title;
- Body;
- Body Small;
- Label;
- Caption;
- Metadata;
- Numeric / Code.

### Método

- use tamanho e peso para marcar importância;
- mantenha line-height confortável para leitura;
- reduza tamanho para metadados, não contraste a ponto de torná-los invisíveis;
- use mono ou tabular numbers quando alinhamento e comparação numérica importarem;
- não use muitos pesos e tamanhos sem função;
- preserve títulos longos por wrap, truncamento acessível ou detalhe.

## 23. Spacing

Spacing deve expressar relação, não preencher lacunas.

### Categorias

```text
Micro    → ícone, texto e detalhe imediato
Control  → label e controle, ações próximas
Component→ conteúdo dentro de card, field ou banner
Section  → mudança de grupo ou contexto
Page     → margem do canvas e grandes blocos
```

Elementos que pertencem ao mesmo grupo recebem menos espaço. Mudança de contexto recebe mais espaço. Use uma escala pequena e progressiva, por exemplo uma base próxima de 4 px e passos como 8, 12, 16, 24 e 32, ajustando ao produto.

Não use o mesmo gap em todos os níveis. Repetição uniforme demais apaga a estrutura.

## 24. Density

### Compact

Bom para navigation, filters, tables, metadata e operações repetitivas. Use altura de controle menor, textos auxiliares enxutos e menos espaço entre itens relacionados.

### Default

Bom para dashboards, headers, details e cards gerais. Deve equilibrar escaneabilidade e conforto.

### Comfortable

Bom para forms, onboarding, empty states, leitura importante e confirmação. Use mais respiro e mensagens mais completas.

A densidade muda pela tarefa. Não force a tela inteira para Compact nem faça uma tabela operacional respirar como uma página de leitura.

## 25. Color Usage

Defina papéis semânticos, não uma paleta obrigatória:

- Canvas;
- Surface;
- Surface Muted;
- Surface Elevated;
- Text Primary;
- Text Secondary;
- Border;
- Accent;
- Success;
- Warning;
- Error;
- Info.

Neutros dominam. Accent chama atenção. States aparecem quando necessários. A cor deve funcionar no claro e no escuro sem depender de uma marca específica.

Não transforme uma cor da marca em regra universal. Um produto pode usar greige, sage, azul, roxo ou outra identidade, desde que preserve papéis, contraste e disciplina de uso.

## 26. Borders, Radius and Shadows

### Border first, shadow second

- **Border:** separação normal entre superfícies;
- **Shadow:** mudança real de elevação;
- **Radius:** linguagem de agrupamento e hierarquia, com valores moderados.

Papéis conceituais:

- Control;
- Card;
- Overlay;
- Pill;
- Avatar.

Mantenha poucos níveis de radius. Evite interfaces excessivamente “bubble”, em que todo texto e toda seção parecem uma cápsula independente.

## 27. Iconography

- escolha uma biblioteca principal;
- mantenha peso e estilo consistentes;
- defina tamanhos previsíveis;
- dê accessible name a icon-only;
- use texto quando o ícone for ambíguo;
- não use ícone como único significado de status;
- não misture famílias visualmente incompatíveis;
- reserve ícones expressivos para orientar, não decorar todos os blocos.

## 28. Responsive Construction

Pense em regras de composição:

- **stack:** empilhar grupos e ações;
- **hide secondary metadata:** remover o que não é essencial do resumo;
- **drawer:** mover detalhe para uma camada contextual;
- **collapse:** recolher filtros e navegação;
- **priority columns:** preservar poucos campos essenciais;
- **row-to-card:** transformar cada item em agrupamento semântico;
- **grid reduction:** reduzir colunas mantendo leitura;
- **action stacking:** empilhar ações e ampliar área de toque;
- **tab scrolling:** permitir rolagem horizontal controlada;
- **multi-pane switching:** alternar entre navegador, conteúdo e contexto.

### Breakpoint method

Não escolha breakpoints apenas por dispositivo. Escolha-os quando a composição deixa de funcionar:

1. o header não cabe sem competição;
2. os filtros ficam apertados;
3. a tabela perde comparação;
4. os targets ficam pequenos;
5. o detalhe deixa de ser legível.

Teste pelo menos um desktop amplo, um tablet e um mobile estreito. Em 390 px, procure overflow horizontal, títulos longos, ações escondidas, dialogs sem margem e drawers que bloqueiam o fechamento.

## 29. Mobile Rules

- use touch targets adequados;
- torne ações importantes fáceis de alcançar;
- transforme Sidebar em Sheet;
- empilhe Page Header;
- permita ação principal full-width quando isso ajudar;
- recolha filtros, mas mantenha filtros ativos visíveis;
- leve metadados secundários para detalhe;
- escolha explicitamente entre Priority Columns e Row-to-Card;
- mantenha Dialog dentro da viewport com margens seguras;
- permita Drawer quase full-screen;
- não esconda contexto sem oferecer uma forma clara de recuperá-lo;
- preserve foco e Escape em todas as camadas.

## 30. Accessibility

Acessibilidade faz parte da construção, não é uma revisão posterior.

### Navegação e foco

- foco visível em controles interativos;
- ordem de Tab coerente;
- Shift+Tab retorna de forma previsível;
- Enter e Space acionam o que parece acionável;
- Escape fecha Sheet, Dialog, Popover e menu quando apropriado;
- foco fica dentro de camadas modais;
- foco retorna ao acionador ao fechar;
- estado ativo é anunciado além da aparência;
- foco não fica perdido atrás de overlay.

### Conteúdo e controles

- labels associados a campos;
- accessible names em icon-only;
- headings em ordem;
- tabelas com caption/descrição quando necessário;
- status textual;
- mensagens de erro próximas do campo;
- disabled não pode parecer conteúdo removido;
- Loading e Error precisam ser comunicados;
- truncamento visual preserva texto por acessibilidade ou detalhe;
- não dependa apenas de cor, posição ou ícone.

### Resolução e movimento

- contraste suficiente entre texto, fundo e estado;
- interface utilizável com zoom de 200%;
- áreas de toque confortáveis;
- animação reduzida quando o usuário prefere reduced motion;
- transições não podem esconder informação ou bloquear a tarefa.

## 31. Do / Don't

### DO

- comece pela hierarquia;
- escolha uma ação principal;
- use grouping claro;
- prefira surfaces e borders antes de shadows;
- mantenha metadata discreta;
- use spacing conforme relação;
- trate estados junto com o estado normal;
- adapte composição no mobile;
- preserve labels e foco;
- teste texto longo e dados reais de formato, mesmo usando fixtures.

### DON'T

- usar Card para tudo;
- usar Shadow para tudo;
- criar rainbow dashboard;
- colocar vários Primary no mesmo contexto;
- comprimir o desktop até caber no mobile;
- comunicar status só por cor;
- criar menu infinito;
- deixar Empty sem ação ou explicação;
- esconder Error sem retry ou próximo passo;
- misturar bibliotecas de ícones incompatíveis;
- transformar branding em regra estrutural;
- copiar nomenclatura específica de outro domínio.

## 32. Common Anti-patterns

### Decoration-led layout

Sintoma: muitos efeitos, mas não se sabe o que é título, conteúdo ou ação. Correção: remover decoração temporariamente e refazer ordem, escala e spacing.

### Equal-weight everything

Sintoma: todos os cards, botões e números parecem igualmente importantes. Correção: estabelecer um campo primário, uma ação dominante e níveis de texto.

### Over-cardification

Sintoma: cada seção possui uma borda e uma sombra. Correção: usar whitespace, border-bottom ou agrupamento tipográfico antes de criar uma nova superfície.

### Hidden-state interface

Sintoma: loading, empty e error parecem telas quebradas ou não indicam o próximo passo. Correção: adicionar contexto, consequência e ação de retomada.

### Desktop shrink

Sintoma: tabela ilegível, ações fora da viewport e texto espremido. Correção: escolher stack, prioridade, card, Drawer ou troca de painéis.

### Infinite navigation

Sintoma: Sidebar com dezenas de itens sem agrupamento. Correção: hubs, seções curtas e destinos por tarefa.

### Color as meaning

Sintoma: usuário não entende o estado sem enxergar a cor. Correção: texto, label, ícone e relação espacial devem confirmar o significado.

### Action competition

Sintoma: várias ações fortes no mesmo header ou card. Correção: eleger uma ação principal e rebaixar as demais.

### Intrinsic-width failure

Sintoma: cartões mobile crescem além da viewport por causa de títulos longos, grids ou flex items. Correção: controlar min-width, permitir wrap/truncate e testar 390 px com dados longos.

## 33. Construction Recipes

### Receita — Aplicação administrativa

```text
App Shell
→ Sidebar
→ Top Utility Bar
→ Main Canvas
→ Page Header
→ Primary Content
```

### Receita — Página de listagem

```text
Page Header
→ Filter Bar
→ Active Filters
→ Data Table / Data List
→ Empty / Error / Loading
→ Pagination / Secondary Actions
```

### Receita — Dashboard

```text
Page Header
→ Period / Filters
→ Metrics
→ Primary Visualization
→ Supporting Content
→ Actionable State
```

### Receita — Cadastro

```text
Page Header
→ Form Sections
→ Fields
→ Local Validation
→ Loading / Save Feedback
→ Footer Actions
```

### Receita — Detalhe contextual

```text
Collection
→ Select Item
→ Drawer / Sheet
→ Context + Details
→ Actions
→ Return Focus
```

### Receita — Confirmação

```text
Trigger
→ Dialog Title
→ Consequence
→ Cancel
→ Confirm
→ Toast / Updated Collection
```

### Receita — Estado vazio

```text
Visual Cue
→ Headline
→ Explanation
→ Next Action
```

### Receita — Estado de erro

```text
Message
→ Context
→ Retry
→ Preserve User Context
```

## 34. New Project Checklist

### Estrutura

- [ ] Qual é a tarefa principal do produto?
- [ ] Qual é o App Shell?
- [ ] Sidebar é necessária?
- [ ] Quais são os grupos de navegação?
- [ ] Existe Top Utility Bar?
- [ ] Quais camadas contextuais serão necessárias?

### Página

- [ ] A tela é List, Dashboard, Detail, Form, Settings, Hub ou Multi-pane?
- [ ] Qual é o Page Header?
- [ ] Qual é a ação primária?
- [ ] Quais ações são secundárias?
- [ ] Qual conteúdo é primário e qual é contexto?

### Dados

- [ ] Table, List ou Cards?
- [ ] Qual é o campo primário?
- [ ] Que metadata é secundária?
- [ ] Status precisa de texto?
- [ ] Números e datas possuem formato previsível?
- [ ] Qual estratégia mobile: Priority Columns ou Row-to-Card?

### Estados

- [ ] Loading preserva a geometria?
- [ ] Empty natural tem próximo passo?
- [ ] Empty filtered mostra e limpa filtros?
- [ ] Error explica contexto e oferece retry?
- [ ] Success confirma a consequência?
- [ ] Disabled e submitting estão claros?

### Visual

- [ ] A hierarquia funciona sem accent?
- [ ] Neutros dominam a tela?
- [ ] Border foi tentado antes de shadow?
- [ ] Os gaps expressam relação?
- [ ] A densidade corresponde à tarefa?
- [ ] Há apenas uma ação dominante por contexto?
- [ ] Cards representam agrupamentos reais?

### Responsive

- [ ] Desktop amplo revisado?
- [ ] Tablet revisado?
- [ ] Mobile estreito revisado?
- [ ] Header empilha?
- [ ] Sidebar vira Sheet?
- [ ] Filtros ativos continuam visíveis?
- [ ] Tabela tem estratégia explícita?
- [ ] Texto longo não cria overflow?
- [ ] Dialog e Drawer cabem com margens seguras?

### Accessibility

- [ ] Tab e Shift+Tab têm ordem coerente?
- [ ] Foco é visível?
- [ ] Enter, Space e Escape funcionam?
- [ ] Foco retorna ao acionador?
- [ ] Labels e accessible names estão presentes?
- [ ] Erros estão associados aos campos?
- [ ] Status não depende apenas de cor?
- [ ] Zoom de 200% foi verificado?
- [ ] Reduced motion foi considerado?
- [ ] Touch targets são adequados?
- [ ] Contraste foi verificado em claro e escuro?

## 35. Codex Usage Instructions

Em um projeto futuro, use instruções como:

> Leia `UI_CONSTRUCTION_GUIDE.md` antes de alterar a interface.

Depois:

> Classifique cada tela pelo tipo de página definido no guia e aplique as receitas correspondentes. Preserve regras de negócio, dados, permissões e branding do produto. Reutilize os métodos de hierarquia, spacing, densidade, estados e responsividade; não copie literalmente a identidade visual de nenhum produto de origem.

O agente deve primeiro descrever o que encontrou, apontar riscos de overflow e acessibilidade e só então propor a alteração. Se a tela mudar, a validação deve incluir estados normais e alternativos, desktop, tablet e mobile.

## 36. Base Prompt for Future Projects

```text
Leia UI_CONSTRUCTION_GUIDE.md antes de alterar a interface.

Quero aplicar seus métodos de construção visual neste projeto.

Antes de escrever código:
1. analise a estrutura atual e preserve as regras de negócio;
2. classifique as páginas como List, Dashboard, Detail, Form, Settings, Hub ou Multi-pane;
3. identifique App Shell, Sidebar, Top Utility Bar, Page Headers, listas, tabelas, formulários e estados;
4. compare cada tela com as receitas do guia;
5. proponha quais padrões podem ser aplicados e quais decisões dependem do domínio;
6. preserve o branding existente, usando o guia para métodos e comportamento, não para copiar uma paleta ou uma marca;
7. implemente responsividade por composição: stack, priorize, esconda metadados secundários, use Drawer ou transforme a lista quando necessário;
8. trate Loading, Empty, Error, Success, foco, teclado, zoom, reduced motion e touch;
9. não introduza padrões visuais sem justificar a tarefa que eles suportam;
10. valide visualmente os viewports e estados relevantes antes de concluir.
```

## 37. Quick Reference

```text
APP
Shell → Navigation → Utility → Main Canvas → Contextual Layer

PAGE
Context → Header → Primary Content → States → Actions

LIST
Header → Filters → Active Filters → Collection → State

DASHBOARD
Header → Period → Metrics → Main View → Supporting Information

FORM
Header → Sections → Fields → Validation → Actions

DETAIL
Context → Status → Content → Actions → Return Focus

VISUAL
Hierarchy → Grouping → Spacing → Border → Color → Shadow

MOBILE
Recompose → Prioritize → Stack → Hide Secondary → Preserve Action

STATE
Explain → Preserve Context → Offer Next Step

TABLE MOBILE
Dense task → Priority Columns
Context-rich task → Row-to-Card
```

## 38. Validation Background

Este guia consolidou uma sequência de trabalho:

- auditoria visual de uma aplicação operacional existente;
- abstração dos padrões em um Blueprint;
- teste fora do domínio original com a Central de Ativos;
- revisão em desktop, tablet e mobile;
- comparação entre tema claro e escuro;
- comparação entre Priority Columns e Row-to-Card;
- verificação de estados, camadas, teclado e foco;
- score final qualitativo de 8,7/10;
- independência de CRM confirmada.

A evidência mais importante foi comportamental: a linguagem continuou coerente quando o domínio mudou, mas algumas decisões — especialmente a estratégia de tabela mobile — precisaram ser escolhidas pela tarefa. O Row-to-Card só foi aprovado depois de corrigir a contenção de largura em 390 px.

O guia não depende dessa história para ser usado. Ela existe apenas para explicar de onde vieram os métodos e quais decisões foram efetivamente verificadas.
