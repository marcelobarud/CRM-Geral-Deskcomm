# DeskcommCRM — Visual Audit

> Auditoria de inspeção, sem alterações de interface. Snapshot analisado em 2026-09-13.

## Escopo, método e nível de evidência

Esta auditoria combina:

- leitura estática do frontend, tokens, componentes, layouts e rotas;
- busca de padrões recorrentes de classes e imports;
- inspeção visual das evidências rastreadas em `loop/checkpoints/evidence/`;
- comparação entre o app operacional e o showcase público `/design`.

O servidor local não foi usado para uma nova captura porque `pnpm dev` encontrou um prompt para remover e reinstalar `node_modules`; essa operação foi recusada por estar fora do escopo. Portanto, afirmações visuais estão classificadas como **confirmadas por código**, **observadas nas evidências visuais rastreadas** ou **não verificadas nesta rodada**. As capturas existentes são evidência de jornadas específicas, não uma baseline visual determinística de todas as rotas.

## 1. Executive Summary

O produto tem uma linguagem visual reconhecível: superfícies claras greige, acento sage, bordas finas, radius contido, tipografia Atkinson Hyperlegible no app, ícones Phosphor e hierarquia apoiada principalmente em tipografia, espaçamento e estado ativo. A interface é operacional e relativamente silenciosa: cor e sombra são reservadas para ação, estado, alerta e profundidade.

Existe, sim, um **Design System implícito e parcialmente explícito**, mas ainda não um sistema único e totalmente aplicado. Há duas camadas:

1. uma base operacional consolidada em `app/globals.css`, `components/ui/*`, `components/shell/*` e `lib/navigation/*`;
2. uma direção de Design System mais deliberada em `app/design/lib/tokens.ts` e `app/design/showcase.css`, isolada do app real.

O maior valor reutilizável não está nos conceitos de CRM, mas na casca operacional: App Shell, sidebar agrupada, Page Header, filtros, estados vazios, cards, badges, tabelas, dialogs/sheets e o princípio de “mensagem + próxima ação”. A principal cautela é não copiar literalmente a densidade do Inbox/Kanban nem assumir que a paleta sage, a linguagem de pipeline ou os estados de atendimento são universais.

### Veredito rápido

| Dimensão | Avaliação |
|---|---|
| Identidade visual | 🟢 Forte e reconhecível |
| Foundations explícitas | 🟢 Boas, sobretudo tokens de cor, spacing, radius e elevation |
| Aplicação uniforme | 🟡 Parcial; há deriva entre showcase, primitives e telas locais |
| Composição de páginas | 🟢 Vários arquétipos claros |
| Densidade operacional | 🟢 Muito forte no Inbox e no Kanban |
| Responsividade | 🟡 Boa intenção e cobertura ampla; exceções locais existem |
| Acessibilidade básica | 🟡 Vários bons cuidados; foco, labels e cores ainda não são totalmente uniformes |
| Base para biblioteca futura | 🟢 Vale a pena, começando pela casca e pelos primitives |

## 2. Stack visual

### Confirmado no código

- Next.js 16 App Router, React 19 e TypeScript estrito (`package.json`).
- Tailwind CSS 4 em modo CSS-first: `@source`, `@custom-variant dark` e `@theme inline` em [`app/globals.css`](../app/globals.css).
- shadcn/ui em estilo `new-york`, configuração `neutral` em [`components.json`](../components.json).
- Radix UI para Dialog, AlertDialog, Avatar, DropdownMenu, Label, Popover, ScrollArea, Select, Separator, Switch, Tabs e Tooltip.
- `class-variance-authority`, `clsx` e `tailwind-merge` para composição de classes e variantes.
- Phosphor Icons como biblioteca canônica via [`lib/ui/icons.ts`](../lib/ui/icons.ts).
- Lucide Icons ainda aparece dentro de primitives Radix/shadcn (`dialog.tsx`, `select.tsx`, `dropdown-menu.tsx`, `sheet.tsx`), sobretudo para `X`, chevrons, check e circle.
- Sonner para toasts, Recharts para gráficos, `@hello-pangea/dnd` para drag-and-drop e TanStack Query para dados client-side.
- Tema claro/escuro por `data-theme="light|dark"`, com `system` resolvido no provider em [`lib/theme.tsx`](../lib/theme.tsx).
- Showcase isolado em [`app/design`](../app/design), com tokens, paletas, tipografias, densidades, motion e iconografia.

### Leitura arquitetural

O visual não é produzido por Material, Ant, Chakra ou Bootstrap. É uma combinação de primitives próprios baseados em Radix/shadcn, tokens CSS próprios e composição local de Tailwind. Isso favorece controle e acessibilidade de comportamento, mas permite que uma tela crie um estilo paralelo se não usar os primitives ou tokens semânticos.

## 3. Estrutura global

O App Shell é composto por:

- `Sidebar`: item normal do flex, sticky, `w-60` aberto e `w-16` recolhido;
- `TopBar`: sticky, `h-14`, border-bottom, busca central, tenant switcher, alertas, idioma, tema e usuário;
- `main`: `flex-1 overflow-auto p-6`;
- `MobileSidebar`: Sheet lateral a partir do mobile;
- `CommandPalette`: busca global via `⌘K`;
- `AlertsBell`, `UserMenu`, `TenantSwitcher` e `VersionFooter`.

Referências: [`AppShell.tsx`](../app/app/_components/AppShell.tsx), [`Sidebar.tsx`](../components/shell/Sidebar.tsx), [`TopBar.tsx`](../components/shell/TopBar.tsx) e [`MobileSidebar.tsx`](../components/shell/MobileSidebar.tsx).

### Área de conteúdo

Não existe um container máximo global único. A casca entrega `p-6`, e cada tela escolhe a largura que faz sentido:

- tarefas: `max-w-5xl`, `p-4 sm:p-6`;
- hubs: grid de uma a três colunas;
- forms/settings: geralmente `p-6`, com grids locais;
- Inbox: altura calculada e colunas fixas por breakpoint;
- Kanban: largura horizontal orientada ao quadro;
- dashboards/admin: grids responsivos de cards e tabelas.

Isso funciona porque a casca não impõe uma largura artificial a todas as jornadas. A contrapartida é que páginas com o mesmo nível de importância podem ter margens e densidades ligeiramente diferentes.

## 4. Design foundations

### Fonte de verdade encontrada

O arquivo mais explícito de foundations é [`app/design/lib/tokens.ts`](../app/design/lib/tokens.ts). A aplicação operacional espelha parte dele em [`app/globals.css`](../app/globals.css), com aliases compatíveis com shadcn.

### Foundation Matrix

| Foundation | Valores encontrados | Frequência / evidência | Consistência |
|---|---|---|---|
| Spacing | 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px; densidade 56/44/32px | `--space-*` em `globals.css`; classes recorrentes `gap-2`, `p-2`, `p-4`, `p-6` | 🟢 Tokens bons; aplicação local ainda usa classes arbitrárias |
| Radius | 0, 4, 8, 12, 16, full | tokens globais; `rounded-md` é o padrão mais recorrente em primitives e telas | 🟡 Coerente em intenção, com diferenças entre app e showcase |
| Typography | Atkinson no app; 4 pares no showcase; `text-xs`/`text-sm` dominantes; títulos usualmente `text-2xl` | classes de texto aparecem de forma muito recorrente; não há escala semântica única | 🟡 Hierarquia reconhecível, mas tipografia não está totalmente tokenizada |
| Colors | background/surface/elevated/text/border/accent/estados | tokens semânticos em `globals.css`; exceções diretas em admin, banners e gráficos | 🟡 Núcleo bom; estados antigos ainda usam red/amber/emerald/blue diretamente |
| Shadows | xs, sm, md, lg, xl, além de none/inset no showcase | `Card` usa `shadow-xs`; overlays usam `shadow-lg`; tabs usam `shadow-sm` | 🟢 Elevação discreta e hierárquica |
| Motion | 120ms, 200ms, 320ms, spring | tokens em CSS e `MOTION` no showcase; Radix usa animações utilitárias | 🟡 Existe a intenção; não é uma API visual única |

## 5. Typography

### App operacional

O app carrega `Atkinson Hyperlegible` como `--font-atkinson` e `IBM Plex Mono` como `--font-mono` no [`app/layout.tsx`](../app/layout.tsx). O `body` usa Atkinson, com antialiasing, `font-feature-settings`, `text-rendering: optimizeLegibility` e numerais tabulares em código/monospace.

### Showcase

O showcase oferece quatro pareamentos configuráveis:

- Bricolage Grotesque + Plus Jakarta Sans;
- Fraunces + Manrope;
- Atkinson Hyperlegible;
- Source Serif 4 + IBM Plex Sans.

O showcase usa display/body/mono separados e define escala de 1.2 a 1.333. O app real, porém, não alterna entre esses pareamentos: a fonte efetiva continua Atkinson. Esta é uma das maiores diferenças entre direção proposta e produto aplicado.

### Hierarquia observada

| Papel | Evidência real |
|---|---|
| Título de página | geralmente `text-2xl font-semibold tracking-tight` |
| Título de seção/card | `text-base` ou `text-lg`, `font-semibold`, muitas vezes `tracking-tight` |
| KPI | `text-2xl` ou, no admin, `text-3xl font-bold tabular-nums` |
| Body | principalmente `text-sm`; descrições com `leading-relaxed` |
| Label | `text-sm font-medium`; em áreas densas, `text-xs` e uppercase/tracking-wide |
| Auxiliar | `text-xs text-muted-foreground` ou `text-[10|11px]` em agenda e metadados |
| Badge | `text-xs font-medium leading-5` |
| Botão | `text-sm` por padrão; `text-xs` em ações compactas |
| Tabela | `text-sm`; cabeçalho `font-medium text-muted-foreground` |
| Código/IDs | IBM Plex Mono/`font-mono`, `tabular-nums`, tracking maior para códigos MFA |

### Avaliação

🟢 A hierarquia funciona porque o título de página é repetido de forma muito consistente e o texto auxiliar tem cor e tamanho previsíveis. 🟡 Não há tokens do tipo `heading-1`, `body-sm` ou `label`; a escala existe como convenção de classes, não como contrato formal. ⚠️ O showcase propõe display/body contrastados, mas o app operacional não os aplica.

## 6. Colors

### Paleta semântica principal

Light:

- background: `#faf9f6`;
- surface/card: `#ffffff`;
- surface elevated/muted: `#f5f3ee`;
- text: `#1c1a16`;
- text muted: `#5d594f`;
- text subtle: `#7d786c`;
- border: `#e7e3da`;
- border strong: `#d2cdbf`;
- accent sage: ramp `#f3f6f1` → `#171f15`, semantic default `#506d48`;
- success: `#5a8a5f`;
- warning: `#b07a2b`;
- error: `#a94a3c`;
- info: `#4a7a93`.

Dark:

- background: `#161510`;
- surface: `#1d1c17`;
- elevated: `#272620`;
- text: `#f5f4ef`;
- muted: `#8e8b7f`;
- border: `#33312a`;
- accent default: `#82a077`;
- states claros e dessaturados para manter legibilidade no fundo escuro.

### Uso contextual

- accent: item ativo da sidebar, botões primários, links, focus ring, barras de métricas e ações de avanço;
- surface/elevated: canvas, cards, menus, tabs, inputs e blocos de agrupamento;
- success/warning/error/info: badges, mensagens de estado, alertas, risco, conexão e validação;
- neutros: quase toda a hierarquia de texto e a separação de tabelas/listas;
- cores de pessoa na agenda: oito trilhas específicas, separadas da cor de marca e acompanhadas por iniciais.

### Inconsistências

⚠️ Há uso direto de `red-*`, `amber-*`, `emerald-*`, `blue-*` e cores HSL de gráficos em componentes administrativos e banners. Isso não é necessariamente um erro visual — estados precisam de semântica —, mas cria dois vocabulários: tokens semânticos do produto e cores Tailwind/Chart de feature. Para uma biblioteca futura, vale separar `state/*` de `data-viz/*` e remover dependência direta de nomes de cor onde ela não for necessária.

## 7. Spacing

O sistema declarado é base 4, com escala estendida até 128px. No produto, os valores mais recorrentes são `gap-2`, `p-2`, `p-4`, `p-6`, `text-sm` e `text-xs`. A sensação visual é de blocos com respiro moderado, mas com controles compactos no Inbox e em tabelas.

Padrões fortes:

- `space-y-4`/`space-y-6` para forms e seções;
- `gap-2` para toolbars, tags e ações inline;
- `p-4` para cards densos e filtros;
- `p-6` para conteúdo de página e `CardHeader/CardContent`;
- `gap-6` para separar grandes blocos de página;
- `p-2` em menus, filtros e controles compactos.

🟢 A escala é reutilizável. 🟡 O uso de `space-y-*` junto a labels e formas mais antigas exige cautela, pois parte das telas ainda preserva ajustes de migração do Tailwind 4 em comentários e classes locais.

## 8. Radius

### Tokens

- `none`: áreas de dados e tabelas;
- `sm`: 4px, controles e badges no showcase;
- `md`: 8px, cards de lista, itens de Inbox e Kanban;
- `lg`: 12px, containers, cards base e modais menores;
- `xl`: 16px, modais/surfaces premium;
- `full`: avatares, pills e indicadores.

### Produto real

`Card` usa `rounded-lg`; `Button` usa `rounded-sm`; `Input`/`Textarea` usam `rounded-sm`; `Select`, `Dialog`, `Popover`, `Dropdown` e `Tabs` usam `rounded-md`/`rounded-lg`; `Badge` e `Avatar` usam `rounded-full`.

🟢 Há uma gramática clara: controles menores, cards médios, modal maior, status circular. ⚠️ A nomenclatura do token e a classe nem sempre correspondem de forma direta no showcase (`radius-control` 4px, `radius-card` 12px) e no app operacional (`rounded-md` frequentemente equivale a 8px). Uma futura biblioteca deveria expor nomes semânticos, não só `sm/md/lg`.

## 9. Elevation

A interface privilegia border + diferença de superfície, usando sombra como reforço. A escala declarada é:

```text
none → border/whitespace
xs   → card base e pequenos realces
sm   → hover/tab/controle interativo
md   → popover, dropdown, toast
lg   → dialog, sheet e sobreposição
xl   → casos especiais, como MFA
```

O overlay operacional dos dialogs usa `bg-black/80`, enquanto a variável de overlay do tema é mais suave. Isso cria uma diferença perceptível entre overlays Radix/shadcn e o token de design. Nas capturas, o modal de transferência confirma que o produto consegue criar uma camada de profundidade forte sem ornamentação: canvas escurecido, surface branca, border discreta e sombra concentrada.

🟢 O princípio “border antes de shadow” é um dos melhores candidatos para reutilização. ⚠️ O overlay deveria ser tratado como token de comportamento visual único se a biblioteca futura quiser consistência entre Dialog, Sheet e AlertDialog.

## 10. Layout system

Os arquétipos de layout são compostos por flex e grid locais, sem um grid global rígido.

- `AppShell`: duas colunas desktop, uma coluna mobile;
- páginas simples: `flex h-full flex-col gap-6 p-6`;
- páginas de formulário: header + form/card + ações alinhadas ao fim;
- dashboards: cards em grid `1 → 2 → 4/5` colunas;
- hubs: cards `1 → 2 → 3` colunas;
- Inbox: layout de operação 2 colunas em medium, 3 colunas em xl/2xl;
- Kanban: colunas horizontais e cards arrastáveis;
- detalhe: header, ações e painéis/tabs;
- Agenda: grade de tempo + histórico/painéis em Sheet.

O layout é orientado à tarefa e ao volume de dados. A ausência de um container universal é adequada para Inbox/Kanban, mas pede padrões documentados para páginas de settings e relatórios.

## 11. Navigation

### Sidebar

Confirmado em [`Sidebar.tsx`](../components/shell/Sidebar.tsx):

- 240px aberta (`w-60`) e 64px recolhida (`w-16`);
- sticky, `h-screen`, `shrink-0`, border-right;
- logo em header de 56px (`h-14`), com nome ou logo da instalação;
- nav rolável com `p-2`, grupos com `space-y-1`;
- itens em `text-sm`, `gap-3`, `px-3 py-1`, `rounded-md`;
- ativo: `bg-accent text-accent-foreground`;
- inativo: `text-muted-foreground`, hover com `bg-accent/50`;
- títulos de grupos: `text-xs`, muted, botão recolhível;
- Configurações/Organização fica no rodapé fixo;
- preferências de grupos fechados ficam em `localStorage`;
- mobile: Sheet à esquerda, largura `w-72` limitada ao viewport;
- ícones: 18px no menu; grupo fechado vira separador no rail.

Na evidência visual, o sidebar funciona bem porque tem contraste de ativo forte e baixo ruído no restante. A captura do Inbox também mostra que a barra inteira continua reconhecível enquanto o conteúdo principal muda. O custo é a quantidade de destinos: a solução atual depende de agrupamento, hubs e recolhimento. Isso é decisão de produto/navegação, não apenas estética.

### TopBar

`h-14`, sticky, `bg-background/95 backdrop-blur`, border-bottom e três zonas: organização/navegação, busca central e ações. O centro possui `md:max-w-md`; no mobile, labels e atalho ficam ocultos. É uma barra de utilidade, não um segundo Page Header.

### Registro de navegação

`lib/navigation/catalogo.ts` e `registry.ts` centralizam destinos, grupos, hubs, roles e busca. É uma decisão estrutural forte: sidebar, hubs e Command Palette são projeções do mesmo registro. 🟢 Reutilizável como padrão de produto; os nomes dos grupos e destinos são específicos do CRM.

## 12. Components

### Primitives compartilhados

`components/ui` contém 21 arquivos: Button, Card, Input, Textarea, Label, Badge, Avatar, Table, Select, Tabs, Switch, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Tooltip, Separator, ScrollArea, Skeleton e Sonner.

Uso aproximado por arquivos importadores no workspace:

- Button: 216;
- Input: 87;
- Card: 83;
- Badge: 83;
- Select: 54;
- Skeleton: 53;
- Dialog: 36;
- Switch: 17;
- Sheet: 14;
- Table: 19;
- Tabs: 11;
- DropdownMenu: 11;
- Tooltip: 6;
- Popover: 5.

Esses números foram obtidos por busca de imports, não representam instâncias renderizadas.

### Button

Variantes reais: primary/default, secondary, outline, ghost, destructive e link. Tamanhos: `sm`, default/md, `lg`, `icon`. Desktop: 32/36px nos compactos; mobile: 44px de altura. Focus ring de 2px, disabled com opacity 50% e ícones SVG de 16px.

🟢 É um dos primeiros candidatos a biblioteca compartilhada. A separação entre primary, secondary, ghost e destructive é clara e observável nas capturas.

### Card

Base: `rounded-lg border bg-surface text-text shadow-xs`. Header/content/footer têm padding 6 (`24px`), com `pt-0` em content/footer. As telas frequentemente sobrescrevem para cards densos com `p-4`.

🟢 O princípio é forte. 🟡 Uma futura versão deveria nomear variantes de densidade e interatividade em vez de depender de `className` local.

### Badge, Avatar e status

Badge é pill, 12px, com estados neutral/success/warning/error/info e aliases shadcn. Avatares usam fallback de iniciais, cor suave e status opcional. `OwnerBadge` diferencia humano e agente por geometria/avatar, não somente por cor — uma boa decisão de acessibilidade e semântica.

### Empty State, Skeleton e feedback

`components/empty` fornece variantes para Inbox, Kanban, contatos, auditoria, funil, equipe, tokens, timeline, merge, filtro e agenda. O padrão é ícone em círculo + headline + subcopy + uma ou duas ações. `SegmentError` e `ApiErrorToast` completam a camada de falha.

🟢 O empty state é uma das peças mais maduras: ele não só descreve ausência, mas frequentemente orienta a próxima ação. A Agenda, por exemplo, mantém a grade e explica de onde os agendamentos virão.

## 13. Forms

### Padrão geral

O padrão é:

```text
Page Header
  título + descrição
Form Section / Card
  label
  input/select/textarea
  mensagem de erro ou ajuda
Footer de ações
  cancelar/voltar + salvar/confirmar
```

Login/signup usam React Hook Form + Zod + Label/Input/Button. Settings usa `space-y`, grids responsivos e botões que passam a largura total em mobile. Formulários mais complexos, como Agenda, Agent e Webhooks, usam seções locais, selects nativos ou Radix, notices e painéis.

### Campos

- Input: h-10, 4px radius, px-4, background de página, border semântica, focus com border accent e ring suave;
- Textarea: min-height 80px, px-4/py-3, `leading-relaxed`;
- Select: h-9, 8px radius, shadow-sm, ring de 1px e menu Radix;
- Label: 14px, medium, `leading-none`, inline-block;
- Checkbox/radio/switch: aparecem tanto em primitives quanto em controles nativos locais;
- Date/datetime: principalmente input nativo e controles de Agenda;
- Search: Input com `type=search` ou SearchTrigger com atalho.

### Avaliação

🟢 Labels e mensagens de erro são geralmente próximos do campo e o backend valida novamente. 🟡 A diferença visual entre Input base, Select base e `<input>/<select>` nativos de features é real. ⚠️ Algumas telas usam `bg-background`, outras `bg-bg`, `bg-surface` ou `bg-transparent`; todas podem renderizar de modo correto, mas a intenção não é tão legível para uma futura biblioteca.

## 14. Tables and lists

### Tabelas

O primitive `Table` usa wrapper `overflow-auto`, cabeçalho de 40px, células com padding 8px e linhas com border-bottom + hover muted. Contatos, Equipe, métricas, admin tenants/users/audit e várias configurações reutilizam a mesma estrutura.

As capturas de Equipe mostram o padrão com clareza: título/descrição, ação primária no topo, tabela com cabeçalho leve, status em badges, inputs inline e switch no fim. O componente consegue acomodar dados densos sem card em cada linha.

### Listas

Inbox usa linhas com avatar, posição/espera, título, preview, tempo e contador. Kanban usa cards com título, valor, tags, dono, score, próximo passo e sinais de risco. A lista do Inbox é mais densa e linear; o Kanban é mais espacial e agrupado por estágio.

🟢 Boa separação entre dados tabulares e informação operacional. ⚠️ O comportamento de mobile de tabelas depende do wrapper horizontal, enquanto algumas telas transformam o layout em stack; isso deve ser decidido por padrão de componente, não por tela.

## 15. Modals and overlays

### Dialog

Dialog/AlertDialog: centro da viewport, width full com `max-w-lg`, `p-6`, `shadow-lg`, overlay escuro, animação de fade/zoom e radius a partir de `sm`. Footer empilha ações no mobile e alinha à direita em telas maiores.

### Sheet/drawer

Sheet: lateral por padrão, `w-3/4` com max-width em telas maiores, `p-6`, overlay z-50 e shadow-lg. É usado para reatribuição, detalhe de lead, conexão, captura, Agenda, menus móveis e edição complexa.

### Evidência visual

A captura `loop/checkpoints/evidence/G3/G3-01-reassign-dialog.png` mostra a composição esperada: overlay cobre a aplicação, modal central com título e descrição, select, textarea e footer de ações. O modal é visualmente consistente com a gramática de cards, porém mais elevado.

⚠️ Há pelo menos dois contratos de overlay: primitives Radix/shadcn com `bg-black/80` e componentes específicos com `bg-black/60`, `bg-black/55` ou classes locais. A diferença raramente é visível como bug, mas é uma oportunidade clara de unificação.

## 16. Page patterns

### Tipo A — Listagem operacional

Header com título/descrição + ação; barra de filtros; tabela ou lista; estados loading/empty/error. Exemplos: Contatos, Equipe, Agentes, Webhooks, Templates, Solicitações LGPD.

### Tipo B — Inbox de três painéis

TopBar global; lista de conversas; thread; ficha CRM. Em desktop, `md:grid-cols-[300px_1fr]`, `xl:grid-cols-[272px_1fr_296px]`, `2xl:grid-cols-[300px_1fr_320px]`. Em mobile, alterna entre lista e conversa, e o painel CRM fica fora do viewport principal.

### Tipo C — Dashboard/relatório

Header + filtros/período + KPIs + gráficos/cards + tabela ou painel de atrito. Métricas usa cards e barras; admin usage usa charts; admin dashboard usa cinco KPI cards em desktop.

### Tipo D — Quadro/Kanban

Header + FilterBar + colunas por etapa + cards drag-and-drop + ações inline + drawers de detalhe. O vocabulário de CRM é estrutural ao pattern e não deve virar componente genérico sem abstração.

### Tipo E — Cadastro/settings

Header + seções em cards ou blocos + grids de campos + footer de salvar. Exemplos: Perfil, Organização, Segurança, Tipos de agendamento, Meta Ads, WhatsApp, API Tokens.

### Tipo F — Detalhe/dossiê

Header com identificador e ações + tabs ou timeline + painéis contextuais + ações destrutivas protegidas. Exemplos: detalhe de contato, lead, execução de IA, tenant admin e LGPD.

### Tipo G — Hub de navegação

Header + descrição + cards de destinos por seção. `NavHub` fornece o padrão para Configurações, CRM, IA e Análise.

## 17. Responsive patterns

Breakpoints encontrados:

- `sm`: ponto dominante para empilhar/desempilhar forms, grids e ações;
- `md`: sidebar desktop, duas colunas, Inbox com lista + conversa;
- `lg`: controles compactos, grids de três/mais colunas e Agenda larga;
- `xl`: painel CRM do Inbox, grids avançados e knowledge cards;
- `2xl`: apenas casos específicos de Inbox.

Padrões positivos:

- botões principais full-width no mobile e auto-width no desktop;
- Dialog footer empilhado no mobile;
- Sheet com `w-full` + max-width;
- Sidebar desktop substituída por Sheet mobile;
- tabs com `max-w-full overflow-x-auto`;
- Inbox alterna painéis, não tenta encolher três colunas em 390px;
- grids de cards reduzem progressivamente.

⚠️ A maior fragilidade é a mistura entre tabelas com overflow horizontal, grids locais e controles nativos. O código registra correções para estouro horizontal em tabs e Inbox, mas isso sinaliza que telas novas devem usar receitas existentes antes de adicionar exceções.

## 18. Visual hierarchy

A hierarquia do produto é mais tipográfica e espacial que cromática:

1. título `text-2xl` e ação primária;
2. bloco ou card de tarefa;
3. texto principal em `text-sm`/`text-base`;
4. metadata em `text-xs` muted/mono;
5. cor apenas para ação, estado, atenção ou seleção.

Isso explica por que a interface mostra bastante informação sem parecer uma parede de cores. O Inbox usa linhas e alinhamento; Equipe usa tabela e badges; Kanban usa colunas e cards; os três compartilham o mesmo contraste suave.

## 19. Density

O sistema explicitamente nomeia densidades no showcase: Aerada (56/24/20/16), Equilibrada (44/16/16/10) e Compacta (32/8/10/6). O app operacional, no entanto, não expõe um seletor de densidade global e usa uma combinação contextual:

- Inbox e nav: compactos, para capacidade e frequência;
- settings/cards: equilibrados;
- Agenda: microtipografia e slots pequenos, mas painéis arejados;
- onboarding/login: arejados, com poucos elementos;
- Kanban: cards médios com bastante espaço vertical.

As técnicas que controlam a densidade são:

- grouping por bordas e colunas;
- metadata menor e muted;
- numerais tabulares/mono para leitura rápida;
- uso limitado de badges;
- estado ativo forte, estados inativos discretos;
- poucos níveis de sombra;
- texto truncado com `title`/tooltip quando necessário;
- navegação agrupada e hubs para não deixar o sidebar infinito.

🟢 Este é um princípio de alto valor. ⚠️ Não copiar a densidade do Inbox para forms ou onboarding; ela é condicionada ao tempo de uso e ao volume da tarefa.

## 20. Consistency analysis

### Padrões bem consolidados

- título de página `text-2xl font-semibold tracking-tight`;
- sidebar ativo em accent sólido;
- Button/Input/Card/Badge como primitives amplamente usados;
- states vazios com ícone + orientação;
- Table com border-bottom e hover leve;
- dialogs/sheets baseados em Radix;
- focus ring de 2px;
- mobile com botões de 44px e Sheet;
- nomenclatura semântica no core (`bg-surface`, `text-muted`, `border-border`).

### Padrões parcialmente consolidados

- Page Header: geralmente igual, mas sem componente compartilhado único;
- filtros: FilterBar, flex local, selects Radix e inputs nativos;
- cards: `Card` base, `rounded-lg border`, `rounded-md border` e wrappers locais;
- estados: tokens semânticos, Tailwind `red/amber/emerald`, HSL de charts;
- tipografia: Atkinson no app, pareamentos no showcase;
- tabs: Radix Tabs, tabs locais e filtros segmentados com buttons;
- modal: Dialog, Sheet e overlays locais.

### Inconsistências relevantes

1. `components/ui` usa Lucide em primitives enquanto o restante do app usa Phosphor via barrel.
2. `Select` tem h-9/rounded-md/shadow-sm; `Input` tem h-10/rounded-sm/sem shadow.
3. `Dialog`/`Sheet` usam overlay preto forte, enquanto tokens e componentes locais usam opacidades diferentes.
4. App operacional usa Atkinson; showcase propõe Bricolage/Jakarta como default e tem tokens separados.
5. Cards de relatório/admin usam cores diretas `red/amber/emerald/blue` em vez de somente estados semânticos.
6. Page Header é uma composição repetida, não um componente único com contrato.
7. Existem inputs/selects/checkboxes nativos locais fora da mesma receita visual.
8. O showcase usa CSS próprio (`.ds-*`) e não os primitives reais; serve como laboratório, não como prova de implementação no app.
9. Algumas páginas usam nomenclaturas de produto diferentes (`Funis`, `Pipeline`, `Kanban`) em caminhos e textos; isso é principalmente vocabulário de domínio, mas afeta a percepção visual da navegação.

## 21. Accessibility observations

### Pontos fortes

- focus global visível, 2px, offset, com override para `forced-colors`;
- `aria-current` na navegação;
- `aria-expanded` em grupos recolhíveis;
- `aria-pressed` em toggles de modo/lista/calendário;
- `aria-busy` em estados de loading;
- labels associadas via `htmlFor` em forms principais;
- botões de ícone com `aria-label` em Inbox, contatos, Kanban, voz e shell;
- mensagens de erro com `role=alert` e sucesso com `role=status` em diversos fluxos;
- áreas touch de 44px abaixo de `lg` nos Buttons;
- texto completo preservado por `title` em itens truncados;
- cor de pessoa na Agenda acompanhada por iniciais, não usada como único canal;
- empty/error states com orientação e ação.

### Riscos e lacunas

- alguns `<button>`, `<input>`, `<select>` e `<textarea>` de features são nativos e não necessariamente seguem a mesma receita de focus/disabled;
- overlays locais podem não repetir todas as garantias de Dialog/Switch/Radix;
- o showcase tem botões de navegação sem `aria-current` ou nome de grupo sem semântica equivalente ao sidebar operacional;
- uso de cor direta em estados pode criar contraste desigual entre tema claro/escuro;
- tabelas densas precisam de teste de leitura em viewport estreita e com zoom;
- gráficos Recharts têm escala visual e tooltip, mas não há evidência nesta rodada de uma alternativa textual completa;
- a mensagem de tema em `ThemeToggle` é acessível, mas o ciclo de três estados pode não ser evidente para todos os usuários;
- não foi executada uma auditoria WCAG automatizada nesta rodada.

## 22. Reusable components

### Foundation

- tokens semânticos de surface/text/border/accent/state;
- spacing 4-base;
- radius semântico;
- elevation por border + shadow;
- focus ring;
- density contextual;
- motion curta e discreta;
- tema claro/escuro.

### Primitives

🟢 `Button`, `Input`, `Textarea`, `Label`, `Badge`, `Avatar`, `IconButton`, `Divider/Separator`, `Skeleton`.

### Components

🟢 `Card`, `Dialog`, `AlertDialog`, `Sheet`, `DropdownMenu`, `Popover`, `Select`, `Tabs`, `Table`, `Tooltip`, `Switch`, `Toast`, `EmptyState`.

### Patterns

🟢 Page Header, Filter Bar, Metric Card, Form Section, Settings Section, Data Table, Empty State, Error State, Status Banner, Detail Drawer.

### Layouts

🟢 App Shell, Sidebar Layout, Mobile Sheet Navigation, Dashboard Layout, List Layout, Detail Layout, Inbox Multi-pane Layout.

## 23. CRM-specific components

🔴 Específicos do domínio ou com alto acoplamento:

- Inbox multi-pane e Conversation Header;
- Message Bubble, Composer, mídia e templates de mensagem;
- Kanban Card, Stage Column, OwnerBadge, ScoreSlot, NextActionSlot, ReactivationSlot;
- Lead Dossier e Lead Timeline;
- AgendaInterativa, GradeDaAgenda, PainelDeMarcacao e Histórico;
- Contact Timeline, MergeDialog, ContactTagsEditor;
- Agent Editor, ToolPicker, Guardrails, FlowBuilder, RunTrace;
- conexão WhatsApp/WAHA, anti-ban, QR e health dot;
- LGPD request panels, redaction, preview e SLA timeline;
- Webhook source/rule/capture flows.

🟡 Alguns podem gerar componentes de domínio reutilizáveis — por exemplo `StatusBanner`, `OwnerBadge` e `Timeline` — mas não devem entrar no core visual sem contrato de dados independente do CRM.

## 24. Design principles extracted

1. **Densidade é contextual, não uniforme.** Inbox e nav compactam; onboarding e forms respiram.
2. **Hierarquia vem primeiro de tipo, spacing e alinhamento.** A cor apoia a leitura, não substitui a estrutura.
3. **Superfícies próximas e borders suaves substituem excesso de sombra.**
4. **Accent é reservado para ação e seleção.** Estados têm vocabulário próprio.
5. **A interface prefere uma ação clara e secundárias discretas.**
6. **Componentes com muito dado usam metadata menor, truncamento e numerais tabulares.**
7. **A navegação é uma projeção de registro, não uma lista manual por tela.**
8. **Estados vazios devem explicar o próximo passo.** Ausência sem orientação é tratada como falha de produto.
9. **Responsividade muda a composição, não apenas o tamanho.** Inbox troca painéis; mobile abre Sheet; actions viram full-width.
10. **Cor nunca deve carregar sozinha o significado operacional.** Avatares, labels, ícones e texto acompanham o estado.

## 25. Candidates for a future Design System

### Melhor ordem conceitual

```text
Foundations
  → semantic tokens, type scale, spacing, radius, elevation, states, motion
Primitives
  → Button, Input, Label, Badge, Avatar, IconButton, Separator, Skeleton
Components
  → Card, Select, Tabs, Table, Dialog, Sheet, Dropdown, Toast, EmptyState
Patterns
  → PageHeader, FilterBar, MetricCard, FormSection, DataTable, StatusBanner, DetailDrawer
Layouts
  → AppShell, Sidebar, MobileNav, List, Dashboard, Detail, MultiPane
Domain kits
  → CRM Inbox, Kanban, Agenda, Agent Builder, LGPD
```

### Primeiros candidatos

1. Button + IconButton;
2. Input/Label/Field/ErrorMessage;
3. Badge + StatusBadge;
4. Card com variantes de densidade;
5. PageHeader;
6. EmptyState + ErrorState + LoadingState;
7. FilterBar;
8. DataTable + responsive policy;
9. Dialog/Sheet/Overlay unificados;
10. App Shell + Sidebar + Mobile Navigation.

Classificação:

- 🟢 Excelente candidato: primitives, shell, empty/error, Page Header, Card, Table, Dialog/Sheet;
- 🟡 Reutilizável com ajustes: FilterBar, MetricCard, Tabs, Timeline, StatusBanner, density;
- 🔴 Específico do DeskcommCRM: Inbox, Kanban, Agenda, Lead Dossier, Agent Builder, WAHA, LGPD;
- ⚠️ Precisa revisão antes de virar contrato: typography pairings do showcase, overlays, direct colors e controles nativos locais.

## 26. Problems/inconsistencies discovered

### P0/P1 — resolver antes de extrair biblioteca

- Não existe uma fonte única aplicada para tipografia: app usa Atkinson; showcase propõe outras famílias.
- O showcase é separado dos primitives reais; mudanças no showcase não provam mudança no produto.
- Page Header é repetido em dezenas de páginas, mas não tem implementação compartilhada.
- Inputs/selects nativos de features criam deriva de height, radius, focus e background.
- Overlay e elevation variam entre Radix wrappers e componentes locais.
- Phosphor é canônico no app, mas primitives de origem shadcn usam Lucide.

### P2 — decisões a esclarecer

- Definir se `rounded-sm/md/lg` continuará sendo a API ou se haverá aliases semânticos (`control`, `card`, `overlay`, `pill`).
- Definir uma política de tabela mobile: overflow, cards ou colunas prioritárias.
- Definir tokens específicos para data-viz, sem misturar HSL de gráfico com estados de interface.
- Definir escala tipográfica formal, mantendo a leitura acessível de Atkinson se essa continuar sendo a escolha do produto.
- Definir uma API de densidade por componente, pois a densidade global do showcase não corresponde diretamente à aplicação.

### Fora da conclusão visual

- Não foram avaliados contraste real em todas as combinações de tema/marca, leitores de tela, teclado completo, zoom 200% ou axe automatizado.
- Não foi feita captura nova das rotas Login, Inbox, Contatos, Kanban, Agenda, Tarefas, IA e Administração em um ambiente fresco.
- As screenshots rastreadas podem conter widgets/overlays de ambiente de teste nos cantos; eles não foram atribuídos ao core da interface sem evidência de código.

## 27. Recommendations for the next phase

1. Decidir a fonte tipográfica do produto real antes de extrair tokens do showcase.
2. Criar um contrato compartilhado de Page Header, Field/FormSection, StatusBadge, EmptyState e DataTable.
3. Unificar overlay, elevation e focus ring entre Dialog, AlertDialog, Sheet e componentes locais.
4. Reconciliar Phosphor/Lucide: preservar o barrel canônico ou declarar uma exceção explícita para ícones internos de primitives.
5. Converter cores de estado diretas para tokens semânticos e criar uma camada separada de data-viz.
6. Documentar políticas de densidade por arquétipo de tela, não só por escala global.
7. Definir política mobile de tabelas e painéis antes de novas telas densas.
8. Rodar uma rodada visual fresca e automatizada com login, dados semeados controlados, screenshots desktop/mobile, tema claro/escuro e estados vazio/carregado/erro.
9. Só depois escolher a fronteira entre core visual reutilizável e kits de domínio CRM.

Esta auditoria não implementa nenhum desses passos.

## Matriz de componentes

| Elemento | Onde aparece | Implementação | Consistência | Reutilizável | Observação |
|---|---|---|---|---|---|
| App Shell | todo `/app` | `app/app/_components/AppShell.tsx` | Alta | 🟢 Sim | Flex shell com sidebar, topbar e main |
| Sidebar | todo `/app` | `components/shell/Sidebar.tsx` | Alta | 🟢 Sim | 240/64px, grupos e hubs |
| Mobile Navigation | mobile `/app` | `components/shell/MobileSidebar.tsx` | Alta | 🟢 Sim | Sheet temporário |
| TopBar | todo `/app` | `components/shell/TopBar.tsx` | Alta | 🟢 Sim | Busca, organização, alertas e usuário |
| Command Palette | `⌘K` | `components/shell/CommandPalette.tsx` | Alta | 🟢 Sim | Alimentada pelo registro de navegação |
| Page Header | quase todas as páginas | composição local, `NavHub.tsx` em hubs | Média | 🟢 Sim | Principal lacuna de extração |
| Button | app/admin/auth | `components/ui/button.tsx` | Alta | 🟢 Sim | Variantes e touch target responsivo |
| Input/Field | forms, filtros, auth | `components/ui/input.tsx`, labels locais | Média | 🟢 Sim | Campos nativos paralelos |
| Select | filtros/settings | `components/ui/select.tsx` | Média | 🟢 Sim | Visual diferente de Input |
| Badge/Status | tabelas, cards, contatos, admin | `components/ui/badge.tsx` + variantes locais | Alta | 🟢 Sim | Estados bons; cores diretas em admin |
| Avatar/Owner | Inbox, equipe, Kanban, Agenda | `components/ui/avatar.tsx`, `components/kanban/OwnerBadge.tsx` | Média | 🟡 Com ajustes | OwnerBadge carrega semântica de CRM |
| Card | dashboards, forms, empty, admin | `components/ui/card.tsx` | Alta | 🟢 Sim | Variantes de densidade ainda locais |
| Data Table | contatos, equipe, métricas, admin | `components/ui/table.tsx` + tables locais | Média | 🟢 Sim | Política mobile não é única |
| Filter Bar | Kanban, agentes, Inbox, relatórios | `components/kanban/FilterBar.tsx` e locais | Média | 🟢 Sim | Bom pattern, várias implementações |
| Tabs | equipe, conexões, detalhes | `components/ui/tabs.tsx` | Média | 🟢 Sim | Também há tabs segmentadas locais |
| Dialog | ações destrutivas e forms | `components/ui/dialog.tsx` | Alta | 🟢 Sim | Overlay forte e max-w-lg |
| Alert Dialog | exclusões/irreversíveis | `components/ui/alert-dialog.tsx` | Alta | 🟢 Sim | Boa proteção de ações |
| Sheet/Drawer | detalhe e edição contextual | `components/ui/sheet.tsx` | Alta | 🟢 Sim | Shell excelente para mobile/contexto |
| Empty State | quase todos os domínios | `components/empty/EmptyState.tsx`, `variants.tsx` | Alta | 🟢 Sim | Inclui próxima ação |
| Error State | segmentos e toasts | `components/feedback/*` | Média | 🟢 Sim | Mensagem + ID + retry |
| Metric Card | métricas/admin | páginas locais + `KPICards.tsx` | Média | 🟡 Com ajustes | Admin diverge em cores e escala |
| Inbox multi-pane | Inbox | `components/inbox/InboxLayout.tsx` | Alta | 🔴 Não | Arquétipo de CRM/atendimento |
| Kanban Card | Funis | `components/kanban/KanbanCard.tsx` | Alta | 🔴 Não | Dados e ações são CRM-specific |
| Agenda Grid | Agenda | `components/agenda/GradeDaAgenda.tsx` | Alta | 🔴 Não | Domínio de disponibilidade e pessoa |
| Agent Editor | IA | `app/app/ai/agents/[id]/_components/*` | Média | 🔴 Não | Pode gerar kit de workflow separado |
| Status Banner | conexão, risco, impersonação | `components/app/ConexaoCaidaBanner.tsx`, admin banners | Média | 🟡 Sim | Unificar tokens e ação |

## Conclusão objetiva

### 1. Existe Design System implícito?

Sim, mas em dois níveis. O app tem foundations e primitives reais; o showcase tem uma especificação visual mais completa, porém isolada. A classificação correta é: **Design System implícito forte, parcialmente formalizado e parcialmente aplicado**.

### 2. Os 10 elementos mais fortes da identidade visual

1. paleta greige + sage dessaturada;
2. Atkinson Hyperlegible e hierarquia tipográfica clara;
3. sidebar agrupada com ativo em accent sólido;
4. borders suaves como principal separação;
5. shadows discretas por nível;
6. cards com radius contido;
7. badges semânticos e avatares de iniciais;
8. Inbox multi-pane orientado ao trabalho;
9. empty states que explicam o próximo passo;
10. densidade contextual combinada com metadata pequena e numerais tabulares.

### 3. O que evitar copiar

- a densidade do Inbox em telas não operacionais;
- nomenclatura e estados de CRM como se fossem componentes universais;
- o showcase como se já fosse o app real;
- cores diretas de features sem revisar contraste/tema;
- inputs/selects nativos locais como padrão de biblioteca;
- overlay e shadow escolhidos por tela;
- o excesso de destinos no sidebar sem a regra de hub/registro.

### 4. Padrões de maior valor para outros aplicativos

App Shell, Sidebar agrupada, Page Header, Filter Bar, Card, Badge/Status, Empty/Error State, Data Table, Dialog/Sheet, Metric Card e Command Palette.

### 5. Primeiros candidatos para biblioteca compartilhada

Button, Input/Field, Badge, Card, Page Header, EmptyState, StatusBanner, DataTable, Dialog/Sheet e App Shell.

### 6. Vale criar um Design System inspirado nesta interface?

Sim. O código já tem massa crítica suficiente, linguagem identificável e padrões repetidos em dezenas de telas. O valor está em consolidar o que já funciona, não em redesenhar o produto inteiro.

### 7. Próximo passo

Antes de implementar, fechar uma decisão de foundations: tipografia real do app, aliases semânticos de radius/elevation, política de estados/data-viz, política de tabelas mobile e contrato de Page Header/Field. Depois disso, fazer uma captura visual fresca e transformar os primeiros dez candidatos em contratos de biblioteca.
