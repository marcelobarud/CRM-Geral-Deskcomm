# Deskcomm UI Blueprint

> Blueprint visual reutilizável, independente de domínio e sem implementação. Derivado da auditoria em [`docs/DESKCOMM_VISUAL_AUDIT.md`](./DESKCOMM_VISUAL_AUDIT.md), com snapshot de referência em 2026-09-13.

## 1. Propósito

Este documento transforma a linguagem visual observada no produto em um blueprint reutilizável para produtos operacionais, administrativos, SaaS e ferramentas internas.

Ele define:

- princípios de composição e hierarquia;
- foundations semânticas;
- anatomia e comportamento de primitives e componentes;
- padrões de página e layouts;
- regras de densidade, responsividade, acessibilidade e status;
- fronteiras entre o núcleo visual, adaptações de marca e kits de domínio;
- decisões ainda abertas antes de uma futura biblioteca de Design System.

Ele não define:

- código, framework, biblioteca de componentes, classes, APIs ou arquivos de implementação;
- regras de negócio;
- nomes de entidades, estados ou fluxos de um CRM;
- uma nova direção visual desconectada da interface auditada.

O resultado deve ser lido como uma especificação conceitual: suficientemente preciso para orientar design e produto, mas ainda independente da tecnologia que venha a implementá-lo.

## 2. Relação com a auditoria visual

A auditoria é o registro de evidências: código, componentes existentes, rotas, tokens, padrões recorrentes e capturas rastreadas. Este blueprint é a síntese normativa do que merece ser preservado e reutilizado.

| Fonte | Papel neste blueprint |
|---|---|
| App operacional | Evidência de padrões que já funcionam em uso real |
| `components/ui` e shell | Evidência de primitives e casca com maior potencial de reuso |
| `app/globals.css` | Evidência de semântica de cor, spacing, radius, elevation, motion e tema |
| `app/design` | Laboratório de direção; não é tratado como implementação já aplicada |
| Capturas rastreadas | Evidência visual contextual, não baseline completa de todas as telas |

Quando a auditoria encontrou divergência, o blueprint não inventa uma decisão final: registra a divergência e a converte em `OPEN DECISION`.

## 3. Deskcomm Visual DNA

O DNA abaixo descreve a origem da linguagem sem confundir origem com obrigação de domínio. Cada item está classificado como estrutural, específico de marca ou específico de domínio.

1. **Superfícies greige próximas, com bordas suaves** — `STRUCTURAL`; cria agrupamento sem transformar cada bloco em uma caixa chamativa.
2. **Accent sage reservado para ação, seleção e foco** — `BRAND-SPECIFIC`; pode ser substituído por outro accent sem mudar a gramática de interação.
3. **Hierarquia silenciosa baseada em tipo, spacing e alinhamento** — `STRUCTURAL`; permite densidade sem uma parede de cores.
4. **Border antes de shadow** — `STRUCTURAL`; profundidade nasce primeiro da separação e depois da elevação.
5. **Radius contido e sem ornamentação excessiva** — `STRUCTURAL`; controles, cards, overlays e pills têm funções diferentes.
6. **Sidebar agrupada com estado ativo inequívoco** — `STRUCTURAL`; orienta produtos com vários módulos sem exigir uma lista interminável.
7. **Top utility bar separada do Page Header** — `STRUCTURAL`; utilidades globais não competem com o título e a ação da página.
8. **Densidade contextual** — `STRUCTURAL`; frequência, volume e risco da tarefa determinam o respiro.
9. **Empty state como explicação e próximo passo** — `STRUCTURAL`; ausência de dados deixa de parecer erro sem saída.
10. **Status acompanhado por texto, ícone ou geometria** — `STRUCTURAL`; cor nunca é o único canal de significado.
11. **Dados operacionais em linhas, metadados pequenos e numerais legíveis** — `STRUCTURAL`; herança do uso intenso do produto, aplicável fora do CRM.
12. **Inbox, pipeline, atendimento, conexão de WhatsApp e LGPD** — `DOMAIN-SPECIFIC`; são expressões da origem do blueprint e ficam fora do core.

## 4. Princípios de design

### 4.1 Densidade é contextual, não uniforme

**Regra:** escolha densidade segundo frequência, volume, risco e complexidade da tarefa.

**Por que funciona:** preserva capacidade em operações repetitivas sem levar compactação para onboarding, leitura ou formulários.

**Onde aplicar:** tabelas, listas, navegação, dashboards, formulários e páginas de detalhe, cada qual com uma intenção explícita.

**Onde não aplicar:** não use a densidade compacta de uma operação como padrão universal do produto.

**Anti-pattern:** reduzir padding, fonte e altura de tudo até caber mais conteúdo.

**Evidência no Deskcomm:** Inbox e navegação são compactos; settings, cards e onboarding respiram mais.

### 4.2 Hierarquia vem antes da cor

**Regra:** estabeleça ordem por tipografia, espaçamento, alinhamento e agrupamento; use cor para ação, estado, atenção e seleção.

**Por que funciona:** a interface continua compreensível em temas, marcas e condições de contraste diferentes.

**Onde aplicar:** títulos, seções, cards, tabelas, menus, métricas e estados vazios.

**Onde não aplicar:** não use um accent ou uma cor de status para compensar uma estrutura mal organizada.

**Anti-pattern:** colorir todos os cards, labels e títulos para criar hierarquia.

**Evidência no Deskcomm:** o contraste greige/sage é silencioso e a leitura depende principalmente de tipo e espaço.

### 4.3 Superfície próxima, borda suave, sombra contida

**Regra:** tente primeiro canvas, surface, diferença de tonalidade e border; reserve shadow para interação e elevação.

**Por que funciona:** reduz ruído visual e mantém a interface com aparência operacional.

**Onde aplicar:** cards, tabelas, menus, dialogs, drawers e agrupamentos de formulário.

**Onde não aplicar:** não adicione sombra a todo elemento que precisa apenas de separação.

**Anti-pattern:** cards flutuantes empilhados com shadow forte e backgrounds contrastantes.

**Evidência no Deskcomm:** cards usam shadow discreta; dialogs e sheets concentram a elevação.

### 4.4 Uma ação dominante por contexto

**Regra:** uma área deve deixar claro qual ação principal é esperada; ações secundárias ficam visualmente abaixo dela.

**Por que funciona:** reduz competição e acelera decisão sem retirar opções legítimas.

**Onde aplicar:** Page Header, footer de formulário, empty state, dialogs, cards de seleção e hubs.

**Onde não aplicar:** não force uma ação primária quando a tarefa é apenas leitura ou exploração.

**Anti-pattern:** três ou mais botões primários com peso visual idêntico.

**Evidência no Deskcomm:** headers combinam título, descrição e uma ação forte, enquanto cancelar/voltar usa tratamento mais discreto.

### 4.5 Estados devem orientar

**Regra:** loading, vazio, erro, sucesso e atenção devem dizer o que ocorreu e, quando possível, qual é o próximo passo.

**Por que funciona:** mantém continuidade e evita que uma tela pareça quebrada ou abandonada.

**Onde aplicar:** listas, tabelas, dashboards, formulários, notificações, banners e drawers.

**Onde não aplicar:** não transforme todo feedback pequeno em banner persistente.

**Anti-pattern:** mostrar uma ilustração ou badge de estado sem explicação nem ação.

**Evidência no Deskcomm:** EmptyState combina sinal visual, texto e uma ou duas ações; estados de erro incluem retry ou identificação quando necessário.

### 4.6 Dados densos precisam de ritmo

**Regra:** use alinhamento de colunas, metadata menor, truncamento acessível, numerais tabulares e separação consistente.

**Por que funciona:** o olhar encontra padrões sem que cada linha precise virar um card.

**Onde aplicar:** tabelas, listas, históricos, métricas, filtros e painéis de operação.

**Onde não aplicar:** não aplique microtipografia a textos longos, instruções ou conteúdo que exige leitura contemplativa.

**Anti-pattern:** esconder informação essencial em tooltip ou comprimir tudo em uma linha.

**Evidência no Deskcomm:** tabelas usam cabeçalho leve, border-bottom e hover discreto; metadados aparecem em tamanhos menores.

### 4.7 Navegação é uma estrutura, não uma lista local

**Regra:** grupos, destinos, hubs, busca global e estado ativo devem derivar de uma mesma concepção de navegação.

**Por que funciona:** reduz divergência entre sidebar, breadcrumbs, busca e telas de entrada.

**Onde aplicar:** produtos multi-módulo, ferramentas administrativas e aplicações com áreas relacionadas.

**Onde não aplicar:** não imponha sidebar complexa a um fluxo linear ou a uma landing page.

**Anti-pattern:** cada tela inventa seus próprios nomes, grupos, ícones e caminhos.

**Evidência no Deskcomm:** catálogo e registry de navegação alimentam sidebar, hubs e Command Palette.

### 4.8 Responsividade muda a composição

**Regra:** em viewport menor, reordene, empilhe, oculte o secundário ou troque o padrão de interação; não apenas reduza dimensões.

**Por que funciona:** preserva legibilidade e prioridade quando a geometria muda.

**Onde aplicar:** shell, navegação, tabelas, dashboards, multi-pane, dialogs, filtros e ações.

**Onde não aplicar:** não transforme um layout desktop inteiro em uma miniatura ilegível.

**Anti-pattern:** três colunas estreitas, botões espremidos e metadata mantida a qualquer custo.

**Evidência no Deskcomm:** a navegação vira Sheet, actions empilham, tabs rolam e o multi-pane alterna painéis.

### 4.9 Acessibilidade é parte da aparência

**Regra:** foco, labels, contraste, nomes acessíveis, estados e touch targets devem existir desde a anatomia visual.

**Por que funciona:** uma interface só é reutilizável se continuar utilizável por teclado, zoom, leitores e temas diferentes.

**Onde aplicar:** todos os primitives, overlays, navegação, tabelas, gráficos e estados.

**Onde não aplicar:** não trate acessibilidade como revisão posterior apenas da implementação.

**Anti-pattern:** icon-only sem label, estado indicado apenas por cor ou texto truncado sem alternativa.

**Evidência no Deskcomm:** há focus ring visível, `aria-current`, labels associadas, áreas de toque de referência 44px e texto completo preservado em truncamentos.

### 4.10 Marca personaliza a expressão, não a anatomia

**Regra:** branding pode alterar logo, accent, fonte, ilustração e tom; não deve alterar sem motivo a estrutura dos controles e dos padrões.

**Por que funciona:** mantém a interface reconhecível e permite white-label sem produzir um produto diferente a cada instalação.

**Onde aplicar:** temas, logos, superfícies de marca, empty states ilustrados e comunicação.

**Onde não aplicar:** não deixe a marca redefinir arbitrariamente focus, ordem de ações, semântica de status ou comportamento mobile.

**Anti-pattern:** cada cliente recebe radius, botão, modal e navegação incompatíveis.

**Evidência no Deskcomm:** o produto suporta marca resolvida por instalação/organização, enquanto a casca visual permanece compartilhada.

## 5. Marca versus sistema de UI

### O que pertence à marca

- nome, logo, favicon e tratamento visual da instalação;
- accent principal e seus tons derivados, dentro de limites de contraste;
- família tipográfica escolhida, caso a decisão final permita substituição;
- ilustrações, fotografia, textura e linguagem editorial;
- tom de voz, vocabulário de produto e mensagens de marketing;
- cores auxiliares de campanha, desde que não sejam confundidas com estados universais.

### O que pertence ao sistema de UI

- anatomia, ordem e estados de Button, Field, Card, Modal e Table;
- papéis semânticos de superfície, texto, border, foco e status;
- escala de spacing, radius, elevation e motion;
- Page Header, Filter Bar, estados vazios e layouts;
- regras de keyboard, labels, contraste, touch e responsividade;
- relação entre navegação, shell, conteúdo e camadas contextuais.

### Regra de fronteira

Uma marca pode trocar a cor do accent, mas não deve transformar um estado de erro em accent. Pode escolher uma fonte, mas não deve destruir leitura de numerais ou densidade. Pode usar uma ilustração em Empty State, mas não deve remover a explicação e a próxima ação.

## 6. Foundations

### 6.1 Cor

A paleta de referência nasce de um canvas greige claro, surfaces brancas ou levemente quentes, texto escuro quente, borders suaves e um accent sage dessaturado. A paleta é uma referência de expressão; os papéis semânticos são a parte reutilizável.

| Papel semântico | Função | Contraste esperado | Frequência | Relação light/dark |
|---|---|---|---|---|
| Canvas | Fundo principal e continuidade da página | Não carrega texto sozinho; deve distinguir surface | Muito alta | Claro e quente no light; escuro e quente no dark |
| Surface | Card, painel e área de conteúdo | Deve sustentar texto primário e controles | Muito alta | Branco ou quase branco no light; surface escura elevada no dark |
| Surface Muted | Agrupamento secundário, input discreto, cabeçalho de tabela | Texto secundário legível | Alta | Tonalidade próxima do canvas, sem virar status |
| Surface Elevated | Menu, popover, card elevado ou área selecionada | Texto primário e focus precisam permanecer claros | Média | Mais separada do canvas em ambos os temas |
| Text Primary | Títulos, valores e conteúdo principal | Contraste de texto normal alto | Muito alta | Escuro no light; claro no dark |
| Text Secondary | Descrições, labels auxiliares e contexto | Contraste suficiente para texto normal quando informativo | Alta | Menor contraste que primary, nunca apagado |
| Text Subtle | Metadata, captions e instruções secundárias | Preferencialmente texto curto; validar contraste | Alta | Mais próximo do fundo, com limite acessível |
| Text Disabled | Controle indisponível, não conteúdo necessário | Não deve ser usado para informação essencial | Baixa | Dessaturado, preservando distinção do enabled |
| Border Default | Separação de rotina | Deve ser perceptível sem competir com conteúdo | Muito alta | Claro e suave no light; mais claro que surface no dark |
| Border Strong | Hover, foco estrutural, divisa importante | Deve se destacar do border default | Média | Reforçada proporcionalmente ao tema |
| Accent | Ação principal, seleção, link, foco e avanço | Texto sobre accent precisa ter contraste validado | Média | Rampas próprias para light/dark; não apenas inverter |
| Accent Hover | Feedback de interação | Mais forte ou mais escuro/claro que accent base | Média | Derivado do mesmo papel, sem mudar semântica |
| Accent Subtle | Fundo de seleção suave ou estado de navegação | Texto e ícone devem continuar legíveis | Média | Leve no light; surface-accentuada no dark |
| Accent Foreground | Conteúdo sobre accent | Contraste alto contra accent e hover | Conforme accent | Claro ou escuro conforme contraste, não conforme preferência |
| Success | Resultado positivo, concluído, disponível | Nunca depender apenas do verde | Média | Tons claros/escuros ajustados ao tema |
| Warning | Atenção, risco ou necessidade de revisão | Texto, ícone ou label acompanham a cor | Média | Âmbar controlado, sem saturação decorativa |
| Error | Falha, bloqueio ou ação destrutiva | Contraste alto e mensagem explícita | Média | Vermelho ajustado ao tema e ao texto |
| Info | Informação contextual ou neutra explicativa | Deve ser distinto de accent e success | Baixa/média | Azul ou outro matiz informativo, sempre semântico |

#### Regras de cor

- `Accent` não deve carregar a semântica de sucesso, alerta ou erro.
- UI state colors e data-viz colors são camadas diferentes. Um gráfico pode usar séries diferenciadas sem transformar cada série em estado operacional.
- Uma cor direta de feature só deve existir quando houver papel documentado, contraste validado e comportamento de tema definido.
- Status sempre combina cor com texto, ícone, forma, posição ou outro sinal.
- O accent de marca pode ser substituído, mas precisa gerar uma rampa funcional para hover, subtle, foreground e focus.

### 6.2 Tipografia

O blueprint não fixa uma família tipográfica final. Atkinson Hyperlegible é a referência aplicada no produto auditado; o showcase também propõe pareamentos com Bricolage Grotesque, Plus Jakarta Sans, Fraunces, Manrope, Source Serif 4 e IBM Plex Sans. Essa diferença fica como `OPEN DECISION`.

| Papel | Função | Tamanho relativo | Peso | Line-height | Uso |
|---|---|---:|---:|---:|---|
| Display | Abertura editorial ou destaque raro | Maior | Regular/semibold conforme a família | Apertado, sem colidir | Marketing, onboarding especial, hero |
| Page Title | Identificar a página | Grande | Semibold | Apertado | Uma vez por página |
| Section Title | Separar uma seção | Médio-grande | Semibold | Normal | Seções e blocos principais |
| Card Title | Nomear um agrupamento | Médio | Semibold | Normal | Card, painel, item selecionável |
| Body | Leitura principal | Base | Regular | Confortável | Instruções, descrição e conteúdo |
| Body Small | Contexto curto | Um passo abaixo de Body | Regular/medium | Normal | Apoio de controles e cards |
| Label | Nomear um controle | Base ou um passo abaixo | Medium/semibold | Compacto | Fields e filtros |
| Caption | Explicar detalhe secundário | Pequeno | Regular/medium | Normal | Legendas e suporte |
| Metadata | Identificar tempo, código ou contexto | Pequeno | Regular/medium; mono quando útil | Compacto | Tabelas, listas, timestamps |
| Code/Numeric | Preservar distinção e alinhamento | Base ou pequeno | Mono/tabular quando apropriado | Normal | IDs, códigos, valores e métricas |

#### Requisitos tipográficos

- legibilidade em tamanhos pequenos e em alta densidade;
- numerais distinguíveis e, quando necessário, tabulares;
- diferenciação clara entre caracteres semelhantes;
- pesos suficientes para título, label, foco e disabled sem depender só de cor;
- carregamento e fallback compatíveis com o contexto do produto;
- suporte consistente a PT-BR e acentuação;
- largura de linha adequada para leitura e instruções;
- texto auxiliar nunca tão fraco que pareça desabilitado.

### 6.3 Spacing

A referência é uma base de 4px, com uma escala estendida de microespaços até grandes separações. A base orienta ritmo; não é uma lei que justifique aplicar o mesmo intervalo em qualquer contexto.

| Categoria | Intenção | Exemplos conceituais |
|---|---|---|
| Micro | Relação imediata entre ícone, label, badge ou linhas | 4–8px |
| Control | Conteúdo interno e distância entre controles irmãos | 8–12px |
| Component | Padding e agrupamento interno de card, field ou toolbar | 12–24px |
| Section | Separação entre blocos da mesma página | 24–40px |
| Page | Respiro da página, hero e mudanças de contexto | 40–96px |

Spacing deve expressar relação: itens pertencentes ficam próximos; blocos com mudança de intenção respiram mais.

### 6.4 Densidade

O blueprint nomeia três modos conceituais:

| Modo | Intenção | Contextos possíveis |
|---|---|---|
| Comfortable | Leitura, orientação e baixa carga operacional | Onboarding, login, marketing, formulário simples |
| Default | Equilíbrio entre leitura e capacidade | Dashboard, detalhe, settings, páginas gerais |
| Compact | Alta frequência e alto volume | Tabelas densas, navegação, listas operacionais |

Os valores auditados — aproximadamente 56px, 44px e 32px para linhas/controles, com gaps e paddings menores — são referências de ritmo, não um contrato universal. Um mesmo layout pode combinar header default com tabela compacta.

### 6.5 Radius

Aliases semânticos são preferíveis a nomes genéricos:

| Alias | Função | Referência Deskcomm |
|---|---|---:|
| Control | Inputs, selects e buttons | 4–8px |
| Card | Agrupamentos de conteúdo | 8–12px |
| Overlay | Dialogs, sheets e superfícies de contexto | 8–16px |
| Pill | Badges, filtros selecionados e indicadores | Full |
| Avatar | Pessoa, entidade ou fallback visual | Full |

Áreas de dados podem usar radius zero ou contido. A gramática observada de 4/8/12/16px é reutilizável; o valor definitivo por alias permanece `OPEN DECISION`.

### 6.6 Elevation

Princípio: border primeiro, shadow segundo.

| Nível | Função |
|---|---|
| Canvas | Fundo e whitespace; sem elevação |
| Surface | Conteúdo no fluxo; border ou contraste de tonalidade |
| Raised | Card interativo, hover ou destaque leve |
| Popover | Menu, dropdown, tooltip estruturado ou toast |
| Modal | Dialog, sheet e camada que interrompe o fluxo |

Sombras devem ser discretas em light e ajustadas no dark. Overlay só aparece quando há relação de camada real; não é decoração. A diferença auditada entre overlays fortes e tokens mais suaves exige unificação futura.

### 6.7 Motion

Motion é feedback, não espetáculo.

- feedback imediato para press, toggle e validação;
- hover e focus curtos e discretos;
- entrada e saída de menu, popover, modal e drawer com duração curta;
- transições de layout apenas quando ajudam a manter orientação;
- preservar legibilidade durante loading e mudança de estado;
- oferecer comportamento equivalente quando movimento reduzido for solicitado.

As referências observadas de aproximadamente 120ms, 200ms e 320ms formam uma escala conceitual, não uma obrigação de implementação.

### 6.8 Iconografia

- escolha uma biblioteca principal e um peso de traço coerente;
- mantenha tamanhos previsíveis por contexto: navegação, controle, status e destaque;
- icon-only exige nome acessível e tooltip quando o significado não for óbvio;
- ações críticas ou ambíguas usam ícone + texto;
- não misture bibliotecas ou estilos sem uma exceção documentada;
- ícone acompanha o texto, não substitui uma instrução importante.

Phosphor é a referência canônica encontrada no app; Lucide permanece em primitives de origem. O blueprint registra essa divergência, mas não escolhe a resolução final.

## 7. Modelo semântico de tokens

Este é um modelo conceitual de nomenclatura. Não representa arquivos, variáveis ou uma API.

```text
ui
├── color
│   ├── canvas
│   ├── surface / surface-muted / surface-elevated
│   ├── text-primary / secondary / subtle / disabled
│   ├── border-default / strong
│   ├── accent / accent-hover / accent-subtle / accent-foreground
│   ├── state-neutral / info / success / warning / error
│   └── data-viz-series-1..n
├── spacing
│   ├── micro / control / component / section / page
│   └── density-comfortable / default / compact
├── radius
│   ├── control / card / overlay / pill / avatar
├── elevation
│   ├── canvas / surface / raised / popover / modal
├── typography
│   ├── display / page-title / section-title / card-title
│   ├── body / body-small / label / caption / metadata / numeric
├── motion
│   ├── feedback / hover / overlay / layout
├── size
│   ├── touch / control / icon / avatar
└── layer
    ├── base / raised / dropdown / sticky / modal / toast
```

Tokens semânticos devem expressar intenção, não tecnologia, cor literal ou componente de um único domínio. `state-error` é preferível a `red-500`; `surface-elevated` é preferível a uma classe de implementação; `data-viz-series-1` não deve ser confundido com `state-success`.

## 8. Primitives

Primitives são as menores unidades com contrato visual e comportamental próprio.

### Button

- **Propósito:** iniciar, confirmar, cancelar, navegar ou executar uma ação.
- **Anatomia:** label; ícone opcional; área de interação; estado visual.
- **Variantes:** Primary, Secondary, Outline, Ghost, Destructive, Link e Icon Button.
- **Estados:** default, hover, focus-visible, pressed, disabled, loading e, quando necessário, success.
- **Densidade:** compacto para toolbars; default para páginas; comfortable quando a ação é central ou touch-first.
- **Acessibilidade:** nome claro, foco visível, estado de loading anunciado e alvo de toque de referência mínima de 44px em contextos touch.
- **Faça:** mantenha uma ação dominante e preserve o label em ações críticas.
- **Não faça:** use muitos Primary lado a lado ou Icon Button sem nome acessível.

### Icon Button

- **Propósito:** ação curta representada por um ícone.
- **Anatomia:** ícone centrado, área de toque, nome acessível e, se necessário, tooltip.
- **Variantes:** subtle, outline, ghost, destructive e selected.
- **Estados:** default, hover, focus, pressed, disabled e loading.
- **Densidade:** pode ser compacta em desktop, mas não deve perder área touch em mobile.
- **Acessibilidade:** `aria-label` ou equivalente semântico; tooltip não substitui nome acessível.
- **Faça:** use ícones familiares e consistentes.
- **Não faça:** use ícone ambíguo para ação irreversível sem texto ou confirmação.

### Input

- **Propósito:** capturar uma informação curta.
- **Anatomia:** label externo, controle, placeholder opcional, helper/error e ações laterais opcionais.
- **Variantes:** text, search, numeric, secret, date-like e read-only.
- **Estados:** default, hover, focus, invalid, disabled, read-only, loading e success apenas quando útil.
- **Densidade:** compacta em filtros; default em forms; comfortable em onboarding.
- **Acessibilidade:** label associado, descrição e erro associados, autocomplete quando aplicável, não usar placeholder como label.
- **Faça:** mantenha altura, radius, background e focus coerentes com outros controls.
- **Não faça:** misture controles nativos visualmente incompatíveis sem uma decisão explícita.

### Textarea

- **Propósito:** capturar texto que pode ocupar múltiplas linhas.
- **Anatomia:** label, área redimensionável ou de altura definida, helper/error e contador opcional.
- **Variantes:** default, read-only, code-like e compact quando a tarefa exigir.
- **Estados:** os mesmos de Input, com cuidado adicional para loading e invalid.
- **Densidade:** default ou comfortable; compact só para notas muito curtas.
- **Acessibilidade:** label, instrução de formato, limite e erro associados.
- **Faça:** permita leitura confortável e preserve line-height.
- **Não faça:** comprima texto longo em altura de uma linha.

### Select

- **Propósito:** escolher uma opção em um conjunto conhecido.
- **Anatomia:** label, trigger, valor/placeholder, indicador e menu de opções.
- **Variantes:** single, grouped, searchable quando necessário e compact filter.
- **Estados:** closed/open, hover, focus, selected, disabled, invalid e loading.
- **Densidade:** compact em Filter Bar; default em settings; comfortable quando há orientação.
- **Acessibilidade:** nome, opção selecionada, teclado, foco no menu e relação com erro/helper.
- **Faça:** use quando as opções são finitas e reconhecíveis.
- **Não faça:** use para uma lista enorme sem busca ou para navegar entre áreas do produto.

### Checkbox

- **Propósito:** permitir escolhas independentes.
- **Anatomia:** indicador, label, helper/error e grupo opcional.
- **Variantes:** unchecked, checked, indeterminate e disabled.
- **Estados:** default, hover, focus, checked, invalid e disabled.
- **Densidade:** compact em listas; default em forms.
- **Acessibilidade:** label clicável, estado indeterminate anunciado e grupo nomeado quando houver várias opções.
- **Faça:** explique o efeito da seleção.
- **Não faça:** use checkbox para uma escolha mutuamente exclusiva.

### Radio

- **Propósito:** escolher uma opção exclusiva em um grupo.
- **Anatomia:** indicador, label, descrição e grupo.
- **Variantes:** inline, stacked e card selection.
- **Estados:** unchecked, checked, focus, invalid, disabled.
- **Densidade:** default; comfortable quando a descrição influencia a decisão.
- **Acessibilidade:** grupo nomeado e navegação de teclado previsível.
- **Faça:** mostre todas as opções relevantes juntas.
- **Não faça:** use para ações imediatas que deveriam ser Button ou Switch.

### Switch

- **Propósito:** alternar uma configuração persistente ou binária.
- **Anatomia:** trilho, thumb, label e helper opcional.
- **Variantes:** default, prominent e compact.
- **Estados:** on, off, focus, disabled, loading e erro de persistência.
- **Densidade:** compact em tabelas; default em settings.
- **Acessibilidade:** label explica o efeito e estado é exposto além da cor.
- **Faça:** use quando a mudança tem efeito claro e reversível.
- **Não faça:** use para escolher entre múltiplas opções ou esconder confirmação importante.

### Label

- **Propósito:** nomear controls e reduzir ambiguidade.
- **Anatomia:** texto, indicador de obrigatório quando aplicável e relação com controle.
- **Variantes:** standard, compact, inline e group label.
- **Estados:** default, disabled-context e error-context.
- **Densidade:** acompanha o Field, sem reduzir legibilidade para caber.
- **Acessibilidade:** associação programática e texto distinto de placeholder.
- **Faça:** mantenha label próxima do controle.
- **Não faça:** use texto solto que parece label mas não nomeia o controle.

### Helper Text

- **Propósito:** explicar formato, consequência ou contexto antes da interação.
- **Anatomia:** texto curto associado ao controle.
- **Variantes:** neutral, info e contextual.
- **Estados:** visível, oculto apenas quando há alternativa equivalente.
- **Densidade:** compacta, sem cair abaixo de legibilidade.
- **Acessibilidade:** associado ao controle e não comunicado apenas por cor.
- **Faça:** antecipe dúvida real.
- **Não faça:** repita instruções genéricas em todos os campos.

### Error Message

- **Propósito:** explicar uma falha acionável.
- **Anatomia:** sinal semântico, mensagem, relação com controle e retry/ação opcional.
- **Variantes:** field error, inline error, summary error e blocking error.
- **Estados:** presente, resolvido, loading/retry.
- **Densidade:** compacta quando inline; comfortable em falha bloqueante.
- **Acessibilidade:** `role=alert` ou equivalente quando necessário, foco orientado e mensagem específica.
- **Faça:** diga o que falhou e como corrigir.
- **Não faça:** exiba apenas “erro” ou um código sem contexto.

### Badge

- **Propósito:** sinalizar uma propriedade curta ou status resumido.
- **Anatomia:** label curta, cor/ícone opcional e forma pill.
- **Variantes:** neutral, info, success, warning, error e accent.
- **Estados:** static, selected e disabled-context.
- **Densidade:** compact por natureza, sem virar texto microscópico.
- **Acessibilidade:** significado também aparece em texto; cor não é o único canal.
- **Faça:** use para informação rápida e repetível.
- **Não faça:** transforme todos os textos de uma tela em badges.

### Avatar

- **Propósito:** representar pessoa, equipe, entidade ou fallback visual.
- **Anatomia:** imagem ou iniciais, nome acessível e status opcional.
- **Variantes:** image, initials, icon, group e presence.
- **Estados:** loaded, fallback, unavailable e selected.
- **Densidade:** tamanhos previsíveis por lista, header e destaque.
- **Acessibilidade:** alt/nome, distinção não dependente apenas de cor.
- **Faça:** use iniciais ou ícone quando a imagem não estiver disponível.
- **Não faça:** use avatar sem identificar o que ele representa.

### Separator

- **Propósito:** separar conteúdo relacionado sem criar nova hierarquia.
- **Anatomia:** linha ou espaço semântico.
- **Variantes:** horizontal, vertical, subtle e strong.
- **Estados:** normalmente estático.
- **Densidade:** acompanha o contexto.
- **Acessibilidade:** não deve ser anunciado como conteúdo; usar separador semântico quando necessário.
- **Faça:** use para ritmo e agrupamento.
- **Não faça:** desenhe divisórias em excesso onde whitespace resolve.

### Skeleton

- **Propósito:** preservar a forma do conteúdo durante loading.
- **Anatomia:** blocos que refletem o tamanho aproximado da interface futura.
- **Variantes:** text, avatar, card, row e table.
- **Estados:** loading e substituição pelo conteúdo real.
- **Densidade:** igual à densidade do conteúdo que representa.
- **Acessibilidade:** região comunica loading sem fazer o usuário navegar por conteúdo falso.
- **Faça:** preserve layout e expectativa.
- **Não faça:** use skeleton indefinido ou mais chamativo que a interface.

## 9. Componentes

### Card

- **Propósito:** agrupar conteúdo relacionado.
- **Anatomia:** header, content, footer opcional e superfície.
- **Variantes:** Standard, Interactive, Metric, Selection e Dense.
- **Densidade:** padding e espaçamento variam por modo, não por improviso local.
- **Interação:** Interactive comunica hover/focus/pressed; Standard não parece clicável.
- **Responsividade:** reduz padding e empilha footer quando necessário.
- **Acessibilidade:** título identificável, ordem de leitura correta e região semântica quando útil.
- **Anti-patterns:** card dentro de card sem relação clara; card como decoração; shadow forte em todos os níveis.

### Modal/Dialog

- **Propósito:** interromper o fluxo para decisão, confirmação ou tarefa focada.
- **Anatomia:** overlay, title, description, body e action footer.
- **Variantes:** form, confirmation, destructive e informational.
- **Densidade:** default; comfortable para tarefa complexa; compact apenas para confirmação simples.
- **Interação:** abre com foco previsível, prende foco enquanto modal, fecha de forma segura e retorna foco.
- **Responsividade:** largura total com margem segura, footer empilhado em viewport menor.
- **Acessibilidade:** nome, descrição, foco, escape e leitura de estado de erro.
- **Anti-patterns:** esconder informação essencial em modal; dialog dentro de dialog; overlay usado para qualquer painel.

### Drawer/Sheet

- **Propósito:** manter contexto enquanto expõe detalhe, edição ou navegação temporária.
- **Anatomia:** edge, header, body, footer opcional e overlay quando interrompe.
- **Variantes:** navigation, detail, edit e contextual.
- **Densidade:** default; compact para navegação; comfortable para edição.
- **Interação:** preservar contexto, permitir fechar claramente e não competir com o conteúdo principal.
- **Responsividade:** pode ser lateral no desktop e full-width ou bottom sheet no mobile.
- **Acessibilidade:** nome, foco, close acessível e ordem de tab previsível.
- **Anti-patterns:** transformar o fluxo inteiro em drawer; esconder ações críticas sem título.

### Dropdown

- **Propósito:** oferecer ações ou escolhas relacionadas a um trigger.
- **Anatomia:** trigger, menu, grupos, items, separators e estados.
- **Variantes:** action menu, selection menu e account menu.
- **Densidade:** compacta, com alvos de toque adequados em mobile.
- **Interação:** posicionamento previsível, teclado e fechamento após ação quando apropriado.
- **Responsividade:** pode trocar para sheet quando a lista ou ação exige mais espaço.
- **Acessibilidade:** nome do trigger, item focusável e grupos compreensíveis.
- **Anti-patterns:** menu usado como navegação principal ou com dezenas de itens sem agrupamento.

### Popover

- **Propósito:** mostrar contexto ou controle relacionado sem interromper a página inteira.
- **Anatomia:** anchor, surface, content e close/escape quando aplicável.
- **Variantes:** help, filter, picker e contextual detail.
- **Densidade:** compact ou default conforme conteúdo.
- **Interação:** ancoragem estável, não cobrir o alvo sem necessidade e fechar de forma previsível.
- **Responsividade:** deve virar modal/sheet se não houver espaço seguro.
- **Acessibilidade:** relacionamento com trigger, foco e nome do conteúdo.
- **Anti-patterns:** usar popover para fluxo extenso ou esconder uma etapa indispensável.

### Tabs

- **Propósito:** alternar entre visões irmãs no mesmo contexto.
- **Anatomia:** list, tab, active indicator e panels.
- **Variantes:** underline, segmented e compact.
- **Densidade:** default; compact em áreas de operação.
- **Interação:** active claro, keyboard previsível e URL/estado preservado quando necessário.
- **Responsividade:** rolagem horizontal ou menu equivalente; não comprimir labels até perder sentido.
- **Acessibilidade:** relação tab/panel, estado selecionado e foco.
- **Anti-patterns:** tabs para etapas obrigatórias, hierarquias diferentes ou navegação global.

### Data Table

- **Propósito:** comparar e operar sobre registros em linhas e colunas.
- **Anatomia:** caption opcional, header, primary field, secondary fields, status, actions, selection e pagination.
- **Variantes:** read-only, selectable, sortable, filterable e dense.
- **Densidade:** Compact para volume; Default para leitura; evitar Comfortable se a comparação é o objetivo.
- **Interação:** hover discreto, foco por linha/célula/ação e ações claras sem transformar cada linha em card.
- **Responsividade:** escolher entre scroll horizontal, colunas prioritárias, transformação em lista/card ou combinação; política não é universal.
- **Acessibilidade:** headers semânticos, scope, ordem de leitura, status textual e alternativa para gráficos/ações.
- **Anti-patterns:** tabela infinita sem paginação/virtualização, colunas essenciais ocultas ou overflow sem indicação.

### Toast

- **Propósito:** feedback breve sobre uma ação que não exige interrupção.
- **Anatomia:** status/icon, message, optional action e dismiss.
- **Variantes:** neutral, success, warning, error e promise/progress.
- **Densidade:** compacta, mas legível.
- **Interação:** duração suficiente, pausa quando necessário e não empilhar ruído.
- **Responsividade:** respeitar safe areas e largura da viewport; ações continuam alcançáveis.
- **Acessibilidade:** `role=status` ou `alert` conforme urgência, mensagem textual e ação nomeada.
- **Anti-patterns:** usar toast para erro que bloqueia o trabalho ou para informação que precisa permanecer visível.

### Empty / Error / Loading State

- **Propósito:** explicar ausência, falha ou espera mantendo a continuidade.
- **Anatomia:** sinal visual, headline, explicação, próxima ação e secondary action opcional.
- **Variantes:** empty normal, empty filtered, loading, recoverable error e blocking error.
- **Densidade:** confortável para onboarding; default ou compact dentro de painéis.
- **Interação:** retry, criar, ajustar filtro, voltar ou outro próximo passo explícito.
- **Responsividade:** texto e ações empilham; sinal não deve dominar a tela pequena.
- **Acessibilidade:** estado anunciado, mensagem clara e foco orientado quando necessário.
- **Anti-patterns:** “sem dados” sem dizer por quê; loading que não preserva estrutura; erro sem saída.

### Status Banner

- **Propósito:** comunicar uma condição relevante para uma área ou para o sistema.
- **Anatomia:** ícone/sinal, title ou message, details opcional e action/dismiss.
- **Variantes:** info, success, warning, error e neutral.
- **Densidade:** default; compacta para contexto local; confortável para bloqueio importante.
- **Interação:** ação deve resolver, explicar ou levar ao contexto correto.
- **Responsividade:** conteúdo e ações empilham sem cortar a mensagem.
- **Acessibilidade:** role apropriado, texto explícito, contraste e não dependência de cor.
- **Anti-patterns:** banner permanente para eventos triviais; vários banners competindo no topo.

### Metric Card

- **Propósito:** destacar uma medida, sua unidade e contexto.
- **Anatomia:** label, value, unit, comparison/trend opcional, period/context e action opcional.
- **Variantes:** neutral, positive/negative trend, target, compact e featured.
- **Densidade:** default; compact em grupos de muitas métricas.
- **Interação:** se clicável, toda a superfície comunica isso; tendência não substitui valor absoluto.
- **Responsividade:** grid reduz colunas e pode transformar cards em lista; labels permanecem compreensíveis.
- **Acessibilidade:** valor, unidade e direção da tendência em texto; gráfico não pode ser a única leitura.
- **Anti-patterns:** usar cor para dizer se o número é bom sem explicar contexto; métricas sem período.

## 10. Patterns

### Page Header

**Problema resolvido:** orienta a página e destaca a ação relevante.

**Receita:** título + descrição opcional à esquerda; ações à direita em desktop; no mobile, título, descrição e actions empilhados. A ação principal pode ocupar a largura disponível, mas não deve competir com o título.

**Não confundir com:** Top utility bar, breadcrumb ou título de um card.

### Filter Bar

**Problema resolvido:** controlar escopo, busca, período, ordenação ou visualização.

**Receita:** busca ou filtro principal, filtros secundários, limpar/reset, contagem ou estado resumido; separar filtros persistentes de ações da página.

**Comportamento:** compacta em listas densas; em mobile pode virar drawer, popover ou linha rolável. Filtros ativos devem ser visíveis e removíveis.

### Form Section

**Problema resolvido:** dividir uma tarefa de edição em grupos compreensíveis.

**Receita:** título/descrição da seção, Fields relacionados, helper/error e ação local apenas quando necessária. Footer global contém cancelar/salvar/confirmar.

**Não usar:** card em toda seção por hábito; whitespace pode bastar.

### Settings Section

**Problema resolvido:** organizar preferências sem parecer um formulário infinito.

**Receita:** seção nomeada, explicação da consequência, controles alinhados e estado de persistência. Separar configuração perigosa ou irreversível visualmente.

### Data List

**Problema resolvido:** mostrar itens com leitura rápida quando colunas rígidas não são necessárias.

**Receita:** linha com campo primário, contexto secundário, metadata, status e ação. Use avatar, ícone ou indicador apenas quando ajudar a escanear.

### Detail Header

**Problema resolvido:** identificar um item e oferecer ações sem perder o contexto.

**Receita:** título/identificador, metadata resumida, status, ações principais e navegação de retorno. Tabs ou timeline ficam abaixo, não dentro do título sem hierarquia.

### Metric Group

**Problema resolvido:** apresentar várias medidas comparáveis.

**Receita:** grupo de Metric Cards com mesma escala, período explícito e ordem de leitura. Usar gráfico apenas quando acrescenta relação ou tendência.

### Status Area

**Problema resolvido:** concentrar condição atual, risco, sucesso ou necessidade de atenção.

**Receita:** escolher entre badge, inline message, banner ou toast conforme persistência e urgência. Sempre complementar cor com texto/ícone.

### Empty / Error / Loading Triad

**Problema resolvido:** tornar previsíveis os três estados básicos de conteúdo assíncrono.

**Receita:** manter a forma e a hierarquia semelhantes; mudar apenas a mensagem, sinal e ação. Loading preserva expectativa; empty explica normalidade; error explica recuperação.

## 11. Arquétipos de página

### List Page

Page Header → Filter Bar → Data Table ou Data List → pagination/secondary actions → empty/error/loading.

Use para coleções comparáveis. Evite inserir detalhes extensos em cada linha; abra Detail ou Drawer.

### Dashboard

Page Header → período/filtros → Metric Group → gráficos ou painéis → tabela/lista de aprofundamento.

Use para orientação e decisão. Evite transformar toda medida em card ou misturar estados de interface com cores de séries.

### Detail Page

Detail Header → status/context → tabs ou sections → conteúdo principal → ações contextuais e destructive protection.

Use quando o item merece URL e espaço próprio. Use Drawer quando o contexto da lista deve permanecer central.

### Form Page

Page Header → Form Sections → helper/error → action footer.

Use para criação ou edição que exige concentração. Reduza distrações e não replique a navegação global dentro do form.

### Settings Page

Page Header → Settings Sections → persistência e feedback → área separada para ações sensíveis.

Use Default ou Comfortable. Evite uma sequência interminável de cards sem agrupamento semântico.

### Hub Page

Page Header → grupos de destinos → cards ou links de entrada.

Use quando uma área possui vários subdestinos. Hubs são preferíveis a uma sidebar com todos os itens expostos ao mesmo tempo.

### Multi-pane Workspace

Lista/contexto → conteúdo principal → painel contextual opcional.

Use para tarefas de comparação e continuidade. Em mobile, alternar painéis ou mover o contexto para Drawer/Sheet; não espremer todas as colunas.

## 12. Layouts

### App Shell

**Composição:** Sidebar agrupada, top utility bar, main canvas e camada contextual opcional.

**Quando usar:** produtos administrativos, SaaS, ferramentas internas e aplicações multi-módulo.

**Quando não usar:** landing page, fluxo linear simples ou produto mobile-first sem necessidade de navegação persistente.

**Referência auditada:** sidebar aberta próxima de 240px, rail recolhido próximo de 64px, top bar próxima de 56px e conteúdo com respiro local.

### Sidebar Layout

**Composição:** logo/marca, grupos recolhíveis, item ativo, navegação rolável e área inferior fixa para utilidades secundárias.

**Regras:** ativo forte; inativos silenciosos; ícones consistentes; grupos nomeados; rail recolhido ainda precisa de tooltip/nome; mobile troca por navegação temporária.

**Não fazer:** usar todos os destinos no mesmo nível ou colocar estado de negócio na navegação sem necessidade.

### Dashboard Layout

**Composição:** header, filtros/período, cards de métrica, visualizações e aprofundamento.

**Largura:** grid adaptável; não exigir uma quantidade fixa de colunas.

**Mobile:** reordenar por prioridade; reduzir colunas; manter valor e contexto antes da tendência visual.

### List Layout

**Composição:** header, filters, collection, pagination e feedback.

**Largura:** suficiente para o primary field e ações; usar container local quando leitura se beneficia de limite.

**Mobile:** usar scroll, prioridade de colunas, list transformation ou uma combinação documentada.

### Detail Layout

**Composição:** header, status, conteúdo central, painel secundário/tabs e ações protegidas.

**Mobile:** priorizar identificação e ação; mover secundário para abaixo ou Drawer.

### Form Layout

**Composição:** header, seções, fields e footer.

**Largura:** limitar a leitura dos campos quando a largura total não acrescentar valor; campos longos podem ocupar mais espaço.

**Mobile:** uma coluna, actions empilhadas e mensagens sem truncamento.

### Multi-pane Layout

**Composição:** lista, foco principal e contexto opcional.

**Desktop:** duas colunas quando o contexto é opcional; três quando a tarefa exige comparação constante.

**Mobile:** alternância de panes, rota interna ou Sheet; guardar o contexto de retorno.

## 13. Navegação

### Modelo de Sidebar

- grupos curtos e semanticamente estáveis;
- item ativo com accent sólido ou equivalente de alto reconhecimento;
- inativos com texto e ícone muted;
- grupos recolhíveis quando a quantidade de destinos crescer;
- área inferior reservada para utilidades persistentes, não para conteúdo principal;
- rail recolhido preserva ícone, foco e nome acessível;
- mobile usa uma camada temporária com close claro;
- hub agrupa destinos relacionados sem poluir o nível global.

### Top Utility Bar

É uma barra global de utilidades: contexto da instalação, busca, alertas, tema, idioma, conta ou outras funções transversais. Não substitui o Page Header e não deve repetir suas ações de página.

### Registro de navegação

Uma futura implementação deve permitir que sidebar, hubs, Command Palette, breadcrumbs e active state compartilhem uma fonte de configuração. O blueprint não define o formato dessa fonte.

## 14. Filosofia responsiva

Responsive não é apenas reduzir pixels. As transformações esperadas são:

- stack de ações e fields;
- esconder metadata secundária, sem esconder o primary field;
- sidebar persistente → drawer/sheet;
- painel contextual → abaixo do conteúdo ou camada temporária;
- actions inline → menu ou grupo empilhado;
- grid de quatro → duas → uma coluna;
- tabs → rolagem ou seletor equivalente;
- tabela → scroll horizontal, colunas prioritárias, lista ou cards, conforme o caso;
- multi-pane → navegação entre panes.

Use 44px como referência auditada para áreas touch, não como lei universal. O alvo deve ser confortável, distinguível e separado de alvos vizinhos.

## 15. Hierarquia da informação

```text
Page
  → Section
    → Primary content
      → Secondary information
        → Metadata
          → Actions
```

As principais ferramentas de diferenciação, nesta ordem, são:

1. posição e ordem;
2. tipografia;
3. espaçamento;
4. alinhamento e agrupamento;
5. surface e border;
6. status, accent e outros sinais de cor.

Ação não deve parecer metadata; metadata não deve competir com o primary content; status não deve se tornar título.

## 16. Sistema de status

### Estados semânticos

- **Neutral:** estado normal, sem atenção específica.
- **Info:** informação útil ou explicativa.
- **Success:** concluído, disponível ou saudável.
- **Warning:** atenção, risco ou revisão necessária.
- **Error:** falha, bloqueio ou consequência negativa.
- **Accent opcional:** seleção, foco, avanço ou ação de marca; não é sinônimo de success.

### Escolha de veículo

| Veículo | Persistência | Uso |
|---|---|---|
| Badge | Curta e local | Sinal resumido em linha/card |
| Inline message | Associada a um campo/bloco | Explicação contextual |
| Status Banner | Persistente e relevante para uma área | Condição que precisa ser vista |
| Toast | Breve e não bloqueante | Feedback de uma ação concluída ou falha recuperável |
| Dialog/Alert | Interrompe e exige decisão | Confirmação ou ação de alto impacto |

Não faça todas as condições virarem badges coloridos. Status deve ter texto explícito e, quando necessário, ícone, forma, posição ou ação complementar.

## 17. Acessibilidade

O blueprint exige, como parte do contrato visual:

- focus-visible perceptível, com contraste e offset adequados;
- navegação por teclado em shell, menus, tabs, dialogs, sheets e tabelas;
- HTML semântico e headings em ordem;
- labels associadas a todos os controls;
- `aria-label`, `aria-current`, `aria-expanded`, `aria-pressed` e estados equivalentes quando necessários;
- `aria-busy` ou comunicação equivalente durante loading;
- `role=alert` para erro urgente e `role=status` para feedback não urgente, com parcimônia;
- disabled, loading, invalid, read-only e success distinguíveis sem depender somente de cor;
- texto e ícone juntos em estados importantes;
- referência de 44px para touch targets em viewport touch;
- truncamento com alternativa acessível, como texto completo disponível ou descrição adequada;
- tabelas testadas em viewport estreita e com zoom;
- gráficos com alternativa textual ou tabela de dados quando a visualização carrega informação relevante;
- respeito a reduced motion;
- contraste validado para cada tema e para accents de marca;
- foco devolvido ao trigger após fechar uma camada temporária.

Esta lista é um contrato de intenção do blueprint, não evidência de que todos os pontos já foram testados no app. A auditoria não executou uma auditoria WCAG automatizada completa.

## 18. Do / Don’t

### Faça

- use semantic surfaces, borders e spacing para criar estrutura;
- escolha densidade por tarefa;
- mantenha um Page Header legível;
- mostre uma ação principal por contexto;
- use Empty State com explicação e próximo passo;
- faça tables e multi-pane terem política mobile explícita;
- preserve nomes acessíveis em icon-only;
- separe state colors de data-viz;
- permita que a marca altere expressão sem quebrar anatomia;
- documente exceções de componente e de ícone.

### Não faça

- não use card, radius ou shadow em tudo;
- não transforme cada status em badge colorido;
- não use várias Primary competindo;
- não misture icon libraries sem justificativa;
- não permita deriva visual entre native controls e primitives sem contrato;
- não use cor decorativa para substituir hierarquia;
- não comprima desktop para caber no mobile;
- não deixe tabelas enormes sem política de resposta;
- não deixe Empty State sem ação ou explicação;
- não indique estado somente por cor.

## 19. Anti-patterns

1. **Card nesting semântico vazio:** caixas dentro de caixas apenas para adicionar padding.
2. **Rainbow dashboard:** cada KPI recebe uma cor forte sem papel semântico.
3. **Primary button wall:** múltiplas ações de mesmo peso no header e no footer.
4. **Icon soup:** várias bibliotecas, pesos e tamanhos de ícone na mesma superfície.
5. **Native drift:** input, select, checkbox e switch com alturas, focus e radius incompatíveis.
6. **Tooltip as content:** informação essencial acessível só por hover.
7. **Status by color:** usuário precisa adivinhar o significado de verde, âmbar ou vermelho.
8. **Desktop squeeze:** três colunas preservadas no mobile sem reorganização.
9. **Table without escape:** overflow horizontal sem indicação, prioridade ou alternativa.
10. **Dead end state:** vazio, loading ou erro sem explicação e sem próximo passo.
11. **Modal overload:** formulário longo, navegação ou contexto inteiro escondido em modal.
12. **Brand override cascade:** a marca altera semântica, foco, ordem ou interação em vez de apenas expressão.

## 20. Classificação de reuso

| Sinal | Classe | Significado |
|---|---|---|
| 🟢 | CORE | Reutilizável entre produtos sem carregar conceitos de domínio |
| 🟡 | ADAPTABLE | Reutilizável com contrato, conteúdo ou comportamento configurável |
| 🔵 | BRAND | Expressão que pode variar por marca/instalação |
| 🔴 | DOMAIN | Acoplado a um domínio específico; deve ficar fora do core |
| ⚠️ | REVIEW | Evidência de deriva ou decisão ainda não fechada |

### Núcleo que permanece

🟢 App Shell, Sidebar agrupada, Top Utility Bar, Page Header, Button, Icon Button, Field, Badge, Avatar, Card, Tabs, Dropdown, Popover, Dialog, Sheet, Toast, Empty/Error/Loading, Status Banner, Metric Card, Data Table, Filter Bar, Form Section, Detail Header, layouts List/Dashboard/Detail/Form/Settings/Hub/Multi-pane e as foundations semânticas.

### Padrões removidos do core

🔴 Mensagens, threads de atendimento, contatos, pipeline, leads, agenda de disponibilidade, agentes de IA, conexão WhatsApp, WAHA, reativação, LGPD, score, owner, etapas de venda e qualquer estado ou label cuja interpretação dependa de CRM.

Esses conceitos podem formar kits de domínio sobre o blueprint. A geometria de uma lista ou de um painel pode ser reutilizada; o vocabulário e o contrato de dados não devem vazar para o core.

### Elementos de marca que não viram regra estrutural

🔵 Sage, logo, família tipográfica final, ilustrações, tom editorial e cores de campanha. O accent sage é a referência Deskcomm, não uma obrigação de qualquer produto derivado.

## 21. Foundation Matrix

| Foundation | Regra | Referência Deskcomm | Configurável? |
|---|---|---|---|
| Color | Roles semânticos para canvas, surface, text, border, accent e states | Greige + sage; tokens claros/escuros em `globals.css` | Sim, com contraste preservado |
| Typography | Escala por função, não por tag ou classe literal | Atkinson no app; pareamentos alternativos no showcase | Sim; decisão final aberta |
| Spacing | Base 4px e categorias micro/control/component/section/page | Escala até 128px; `p-2`, `p-4`, `p-6` recorrentes | Sim por densidade/contexto |
| Density | Comfortable, Default e Compact conforme tarefa | Showcase Aerada/Equilibrada/Compacta; app contextual | Sim por página/componente |
| Radius | Aliases control/card/overlay/pill/avatar | 4/8/12/16px e full | Sim; aliases finais em aberto |
| Elevation | Border primeiro, shadow por camada | xs/sm/md/lg/xl; overlay forte em dialogs | Parcial; overlay único em aberto |
| Motion | Feedback curto, discreto e funcional | Referências de 120/200/320ms | Sim dentro de limites |
| Iconography | Biblioteca principal, peso coerente, nome acessível | Phosphor canônico; Lucide remanescente em primitives | Sim; biblioteca final em revisão |
| Theme | Papéis preservados em light/dark | `data-theme` light/dark e system | Sim, com validação |
| Focus | Foco visível e consistente | Ring de 2px e forced-colors observado | Pouco; comportamento deve ser estável |
| Data viz | Paleta separada de states | HSL de charts coexistindo com states diretos | Sim; contrato ainda aberto |

## 22. Component Matrix

| Elemento | Camada | Reuso | Densidade | Responsivo | Classificação |
|---|---|---|---|---|---|
| App Shell | Layout | Alto | Default | Sidebar → Sheet | 🟢 CORE |
| Sidebar | Layout | Alto | Compact/Default | Rail, grupos, Sheet | 🟢 CORE |
| Top Utility Bar | Pattern/Layout | Alto | Compact/Default | Zones collapse | 🟢 CORE |
| Page Header | Pattern | Alto | Default | Actions stack | 🟢 CORE |
| Button | Primitive | Alto | All | Width/stack adapt | 🟢 CORE |
| Icon Button | Primitive | Alto | Compact/Default | Touch target preserved | 🟢 CORE |
| Field/Input | Primitive | Alto | All | Full-width on small | 🟢 CORE |
| Select | Primitive | Alto | Compact/Default | Popover/sheet if needed | 🟢 CORE |
| Checkbox/Radio/Switch | Primitive | Alto | Compact/Default | Stack groups | 🟢 CORE |
| Badge | Primitive | Alto | Compact | Wrap/retain label | 🟢 CORE |
| Avatar | Primitive | Alto | All | Resize by context | 🟢 CORE |
| Card | Component | Alto | Default/Compact | Stack content | 🟢 CORE |
| Dialog | Component | Alto | Default | Full-width safe margins | 🟢 CORE |
| Sheet/Drawer | Component | Alto | Default | Side/bottom/full-width | 🟢 CORE |
| Dropdown/Popover | Component | Alto | Compact/Default | Convert if space fails | 🟢 CORE |
| Tabs | Component | Alto | Compact/Default | Scroll or alternate | 🟢 CORE |
| Data Table | Component/Pattern | Alto | Compact/Default | Policy per data shape | 🟢 CORE |
| Toast | Component | Alto | Compact | Safe-area aware | 🟢 CORE |
| Empty/Error/Loading | Component/Pattern | Alto | All | Stack and preserve action | 🟢 CORE |
| Status Banner | Component | Medium | Default | Stack message/actions | 🟡 ADAPTABLE |
| Metric Card | Component | Medium | Default/Compact | Grid/list | 🟡 ADAPTABLE |
| Timeline | Component/Pattern | Medium | Compact/Default | Vertical stack | 🟡 ADAPTABLE |
| Illustration | Brand layer | Medium | Comfortable | Scale/crop carefully | 🔵 BRAND |
| Multi-pane Workspace | Layout | Medium | Compact/Default | Pane switching | 🟡 ADAPTABLE |
| Message Bubble | Domain component | Low outside messaging | Compact | Thread transformation | 🔴 DOMAIN |
| Stage Column | Domain component | Low outside staged workflow | Compact/Default | Horizontal scroll | 🔴 DOMAIN |
| Availability Grid | Domain component | Low outside scheduling | Compact | Scroll/alternate | 🔴 DOMAIN |
| Agent Builder | Domain kit | Low outside AI workflow | Default | Section/drawer changes | 🔴 DOMAIN |
| Consent/Redaction Panel | Domain kit | Low outside compliance | Default | Stack sections | 🔴 DOMAIN |
| Mixed icon libraries | Cross-cutting | Unclear | All | N/A | ⚠️ REVIEW |

## 23. Pattern Matrix

| Pattern | Problema resolvido | Componentes envolvidos | Quando usar | Quando evitar |
|---|---|---|---|---|
| Page Header | Orientação e ação principal | Heading, description, Button, Icon Button | Toda página com objetivo claro | Não duplicar dentro de cada card |
| Filter Bar | Reduzir e ordenar o escopo | Input, Select, Tabs, Button, Badge | Lista, tabela, relatório, coleção | Não esconder filtros críticos sem resumo |
| Form Section | Agrupar inputs por intenção | Label, Field, Helper, Error, Card opcional | Criação, edição, settings | Não criar card por seção automaticamente |
| Settings Section | Tornar preferências navegáveis | Section title, Field, Switch, Status Banner | Configurações persistentes | Não usar para fluxo transacional curto |
| Data List | Escanear itens sem tabela rígida | Avatar/Icon, primary, metadata, Badge, action | Coleções com conteúdo variável | Não para comparação numérica extensa |
| Detail Header | Identificação e ações contextuais | Heading, metadata, Badge, Button | Item com detalhe próprio | Não substituir Page Header global |
| Metric Group | Comparar medidas | Metric Card, period/filter, trend | Dashboard e resumo executivo | Não quando não há contexto temporal |
| Status Area | Tornar condição visível | Badge, Inline, Banner, Toast | Saúde, atenção, resultado, disponibilidade | Não colorir toda a interface |
| Empty/Error/Loading Triad | Dar continuidade a estados de dados | Skeleton, Empty, Error, retry/action | Qualquer conteúdo assíncrono | Não mostrar estados incompatíveis ao mesmo tempo |
| Multi-pane Workspace | Preservar contexto e comparação | List, main content, Drawer/Sheet | Operação de alta frequência | Não em telas simples ou mobile-first sem ganho |
| Hub | Organizar subdestinos | Page Header, Card/Link, groups | Áreas com vários módulos | Não esconder um único destino atrás de hub |

## 24. Mapa de dependências

```text
Foundations
  → Primitives
    → Components
      → Patterns
        → Layouts
```

Exemplos:

```text
Button
  → Page Header
    → List Page

Badge + Card + Metadata
  → Metric Card
    → Dashboard

Label + Input + Helper/Error
  → Form Section
    → Form Page / Settings Page

Dialog + Overlay + Focus contract
  → Confirmation Pattern
    → Destructive action in a Detail Page

Sidebar + Top Utility Bar + Main canvas
  → App Shell
    → Any multi-module operational product
```

Dependências devem subir de camada sem importar vocabulário de domínio para baixo. Um pattern de domínio pode compor o core; o core não deve depender dele.

## 25. Decisões abertas

Todas as questões abaixo permanecem explicitamente `OPEN DECISION`.

1. **OPEN DECISION — Família tipográfica final:** o produto continuará com Atkinson Hyperlegible ou adotará uma combinação display/body do showcase?
2. **OPEN DECISION — Showcase e produto:** o showcase será integrado ao produto real, mantido como laboratório ou substituído por uma documentação visual independente?
3. **OPEN DECISION — API de radius:** os contratos futuros exporão aliases semânticos ou manterão nomes genéricos de tamanho?
4. **OPEN DECISION — Política de overlay:** qual opacidade, elevation e comportamento único valem para Dialog, AlertDialog, Sheet e camadas locais?
5. **OPEN DECISION — Biblioteca de ícones:** Phosphor será a única biblioteca pública, com exceções internas documentadas, ou haverá migração completa?
6. **OPEN DECISION — Data visualization:** qual paleta e quais regras de contraste distinguem séries, semântica e interação?
7. **OPEN DECISION — Density contract:** densidade será escolhida por página, por componente, por preferência do usuário ou por combinação?
8. **OPEN DECISION — Tabela mobile:** quando usar scroll, colunas prioritárias, lista ou transformação em cards?
9. **OPEN DECISION — Page Header:** qual é o contrato único para título, descrição, breadcrumbs, actions e estados de loading?
10. **OPEN DECISION — Field contract:** inputs, selects e controls nativos serão substituídos, envelopados ou apenas documentados como exceção?
11. **OPEN DECISION — Theme boundary:** quais tokens a marca pode substituir sem quebrar contraste, status e foco?
12. **OPEN DECISION — Evidence baseline:** qual conjunto de telas, estados, temas, viewports e zoom será a baseline visual oficial?

## 26. Blueprint versus Design System futuro

Este blueprint termina antes da implementação.

### O que pertence a este blueprint

- princípios;
- papéis semânticos;
- anatomia de elementos;
- variantes conceituais;
- estados;
- densidade;
- comportamento responsivo;
- acessibilidade como requisito visual;
- padrões de composição;
- matriz de reuso;
- decisões abertas.

### O que pertence a um futuro Design System

- tokens implementados e temas;
- componentes codificados e APIs estáveis;
- documentação de propriedades e exemplos;
- testes unitários, de interação e acessibilidade;
- visual regression e screenshots determinísticas;
- guidelines de contribuição e versionamento;
- pacotes, distribuição e governança;
- kits de domínio separados do core.

Não há implementação, refatoração, alteração de CSS, mudança de tema ou criação de componentes como parte deste documento.

## 27. Non-CRM Validation Screen

Antes de transformar o blueprint em biblioteca, validar a neutralidade em uma interface fictícia de **operações de ativos**. O domínio é deliberadamente distante de CRM: itens físicos, manutenção, localização, disponibilidade e custos operacionais.

### Proposta de tela

**Nome fictício:** Central de Ativos

**Shell:** sidebar com grupos genéricos como Visão geral, Operações, Relatórios, Configurações e Ajuda; top utility bar com busca, tema e conta.

**Page Header:** “Central de Ativos”, descrição curta e ação “Adicionar ativo”.

**Metric Group:** ativos em operação, itens em manutenção, utilização média e custo do período. Os valores devem ter unidade e período, sem usar score, lead, venda ou etapa.

**Filter Bar:** busca, localização, estado operacional, tipo e período.

**Data Table:** nome do ativo, categoria, localização, estado, última inspeção, custo e ação. Testar seleção, sorting, empty, loading e error.

**Detail Drawer:** resumo do ativo, metadata, histórico de manutenção genérico e ações de editar/fechar.

**Form Section:** cadastro/edição com nome, categoria, localização, data, custo e observação.

**Empty State:** “Nenhum ativo corresponde aos filtros”, explicação e ações “Limpar filtros” e “Adicionar ativo”.

**Modal:** confirmação de arquivamento de um ativo, com consequência explícita e ações secundárias.

**Status Banner:** manutenção programada ou falha de sincronização, sem linguagem de conexão de canal ou atendimento.

### O que essa tela deve testar

- orientação pelo App Shell sem depender de CRM;
- Sidebar agrupada e item ativo;
- Page Header e uma ação dominante;
- Card e Metric Card sem colorização decorativa;
- Filter Bar e Field contract;
- Data Table com política mobile explícita;
- Detail Drawer preservando contexto;
- Form Section, helper/error e footer;
- Empty/Error/Loading Triad;
- Dialog/overlay/elevation;
- tema claro/escuro;
- Comfortable, Default e Compact em contextos apropriados;
- responsividade em desktop, tablet e mobile;
- acessibilidade por teclado, zoom e leitor de tela.

### Critério de neutralidade

A tela falha na validação se precisar importar conceitos de contato, conversa, pipeline, agenda de pessoa, agente, canal, score, proprietário comercial ou compliance específico para explicar sua composição. Se a geometria funciona com ativos, operações e manutenção, o blueprint demonstrou independência de CRM.

## 28. Validação final do blueprint

| Pergunta | Resultado |
|---|---|
| Uma pessoa consegue se orientar em um produto não CRM? | Sim: shell, navegação e arquétipos usam linguagem abstrata |
| Conceitos de CRM vazaram para o core? | Não: foram classificados como `🔴 DOMAIN` ou removidos |
| Os princípios dependem de Tailwind ou framework? | Não: descrevem intenção, anatomia e comportamento |
| Branding está separado do sistema? | Sim: marca altera expressão; UI preserva anatomia |
| Desktop e mobile foram tratados? | Sim: responsividade altera composição |
| Densidade foi documentada? | Sim: Comfortable, Default e Compact, com contexto |
| Foundations semânticas existem? | Sim: cor, tipo, spacing, radius, elevation, motion e ícones |
| Components têm anatomia e comportamento? | Sim: primitives e componentes receberam contratos conceituais |
| Do/Don’t e anti-patterns estão explícitos? | Sim |
| Decisões não resolvidas estão marcadas? | Sim: todas usam `OPEN DECISION` |

## Conclusão

O blueprint preserva a parte mais valiosa da interface auditada: uma casca operacional silenciosa, densa quando necessário, acessível por intenção e baseada em hierarquia antes de decoração. O núcleo reutilizável é formado por foundations, primitives, componentes de estado, shell, padrões de página e layouts responsivos.

Foram removidos do core os conceitos que só fazem sentido no produto de origem. Sage, tipografia específica, ilustrações e tom ficam na camada de marca. Inbox, pipeline, atendimento, agenda, IA, WhatsApp, LGPD e demais vocabulários de CRM ficam em kits de domínio.

As decisões de maior impacto — tipografia final, integração do showcase, overlay, ícones, data-viz, densidade, tabelas mobile e contratos de Page Header/Field — permanecem abertas. O próximo passo conceitual é validar a independência na Central de Ativos fictícia. A etapa deste blueprint termina aí; nenhuma implementação é parte do escopo.
