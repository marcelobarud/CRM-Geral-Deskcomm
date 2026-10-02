# Experimento — Central de Ativos

> Inventário e manifesto de remoção do protótipo visual não-CRM. Este arquivo pertence exclusivamente ao laboratório experimental.

## Objetivo

Validar, em uma interface fictícia de Gestão de Ativos, se o `DESKCOMM_UI_BLUEPRINT.md` funciona fora do domínio de CRM.

O experimento é temporário, descartável e não representa uma feature do produto principal.

## Rota

- `/design-validation/assets`
- acesso direto por URL;
- não foi adicionada ao catálogo/registry de navegação produtiva;
- usa a autenticação e os providers globais existentes apenas porque a rota não altera o middleware nem cria uma superfície pública nova.

## Arquivos criados

- `app/design-validation/assets/page.tsx`
- `app/design-validation/assets/EXPERIMENT.md`
- `app/design-validation/assets/_data/fixtures.ts`
- `app/design-validation/assets/_components/AssetsValidationWorkspace.tsx`
- `app/design-validation/assets/_components/AssetTable.tsx`
- `app/design-validation/assets/_components/AssetDetailsSheet.tsx`
- `app/design-validation/assets/_components/AssetFormSheet.tsx`
- `app/design-validation/assets/_components/ValidationLabControls.tsx`
- `app/design-validation/assets/_components/ValidationSidebar.tsx`

## Arquivos existentes modificados

Nenhum arquivo existente foi modificado.

## Dependências

Nenhuma dependência nova foi instalada ou adicionada.

## Componentes reutilizados — REUSED

O experimento usa, sem alterações, primitives existentes do produto:

- `Button`;
- `Badge`;
- `Card`;
- `Input`;
- `Label`;
- `Select`;
- `Skeleton`;
- `Sheet`;
- `Textarea`;
- `Switch`;
- `lib/ui/icons` como barrel canônico de ícones;
- `useTheme` e o provider de tema já existente;
- `Table` e seus subcomponentes.

## Componentes adaptados — ADAPTED

Os seguintes contratos foram compostos localmente para a validação, sem alterar o componente compartilhado:

- Sidebar e Top Utility Bar experimentais;
- Page Header;
- Metric Group e Metric Card;
- Filter Bar;
- Status Banner;
- estados Empty/Error/Loading;
- composição de Data Table desktop/mobile;
- Drawer de detalhe;
- formulário em Sheet;
- Dialog de arquivamento;
- feedback via Toast.

## Componentes criados exclusivamente — CREATED_FOR_VALIDATION

- `AssetsValidationWorkspace`;
- `AssetTable`;
- `AssetDetailsSheet`;
- `AssetFormSheet`;
- `ValidationLabControls`;
- `ValidationSidebar`;
- fixtures e tipos de `fixtures.ts`;
- `ArchiveDialog` local;
- `LoadingContent`, `ErrorContent`, `EmptyContent`, `StatusBanner`, `Metrics` e `FilterBar` locais.

Essa classificação foi transferida para `docs/NON_CRM_VALIDATION_REPORT.md` após a produção das evidências.

## Evidências

- `evidence/README.md` registra a matriz de estados, temas, estratégias mobile e a validação executada.
- A captura visual foi executada no Chrome externo com sessão autenticada nos viewports 1440×900, 768×1024 e 390×844.
- A tentativa de abrir uma segunda porta de preview foi bloqueada pelo ambiente do Chrome (`ERR_BLOCKED_BY_CLIENT`); a prova autenticada continuou na rota local original, sem bypass.
- Não foi criado screenshot com dados reais nem foi alterado o middleware para contornar a autenticação.
- As capturas ficaram disponíveis inline durante a revisão; a API não ofereceu caminho de persistência para `evidence/screenshots/`.
- Foram corrigidos dois problemas restritos ao experimento: overflow horizontal do Row-to-Card em 390 px e retorno de foco do Sheet após Escape.

## Checklist Sistema Vivo — escopo experimental

- Entrada: CONFIRMADO — URL direta `/design-validation/assets`.
- Saída: CONFIRMADO — filtros, estados, drawer, formulário, diálogo, toast e controles atualizam o mock local.
- Registro: INFERIDO/INTENCIONAL — sem `event_log`, pois o laboratório não executa operação real nem persiste dados.
- Visibilidade: CONFIRMADO — a própria tela expõe métricas, estados e controles de validação.
- Alcance: CONFIRMADO — acesso direto após autenticação existente; sem entrada no menu por escopo.
- Antimorte: INFERIDO/INTENCIONAL — não há fila, lead, atendimento ou processo operacional para abandonar.
- Configuração: CONFIRMADO — cenário, banner, estratégia mobile e tema são observáveis na interface.
- IA ↔ humano: NÃO APLICÁVEL — nenhum agente ou handoff existe neste protótipo.
- Retorno: CONFIRMADO — retry, reset de filtros, fechar/reabrir superfícies e troca de cenário permitem retornar ao fluxo.
- Mapa: INFERIDO/INTENCIONAL — o experimento não entra no mapa de arquitetura enquanto não for promovido a produto.

## Alterações compartilhadas inevitáveis

Nenhuma. Não houve alteração em:

- `components/ui`;
- shell produtivo;
- `lib/navigation`;
- `lib/auth/public-paths.ts`;
- `app/globals.css`;
- tokens globais;
- providers globais;
- banco, API ou modelos de domínio.

## Controles de laboratório

O painel `Controles de validação` permite alternar localmente:

- Default;
- um filtro ativo;
- vários filtros ativos;
- Empty natural;
- Empty filtered;
- Loading;
- Error recuperável;
- Banner Info, Warning, Error ou oculto;
- Priority Columns ou Row-to-Card.

O tema é alternado pelo controle local do Top Utility Bar usando o provider de tema existente. Esses controles não devem ser promovidos para a Central de Ativos final.

## Dados

Todos os dados vêm de `fixtures.ts`. Não há acesso a banco, REST, RPC, Supabase, PostgreSQL, APIs reais, stores de domínio ou entidades do CRM.

## Cleanup Manifest

### Apagar

- pasta `app/design-validation/assets/` inteira;
- rota experimental `/design-validation/assets`;
- `page.tsx`;
- `EXPERIMENT.md`;
- `_components/`;
- `_data/fixtures.ts`;
- todos os controles de laboratório e estados locais;
- quaisquer screenshots ou evidências que futuramente sejam criados dentro desta pasta.

### Reverter

Nenhuma reversão compartilhada é necessária, pois nenhum arquivo existente foi modificado e nenhuma dependência foi adicionada.

Se a implementação futura criar uma entrada temporária de navegação, configuração ou arquivo fora desta pasta, ela deverá ser registrada aqui antes do merge e listada explicitamente nesta seção.

### Manter

Por enquanto, somente a documentação oficial já existente fora desta pasta deve ser considerada candidata a permanência:

- `docs/DESKCOMM_VISUAL_AUDIT.md`;
- `docs/DESKCOMM_UI_BLUEPRINT.md`;
- `docs/NON_CRM_VALIDATION_SPEC.md`.

Este experimento não altera esses documentos. O futuro `docs/NON_CRM_VALIDATION_REPORT.md` só deve ser mantido após revisão explícita do resultado.

## Teste de removibilidade

Checklist esperado antes da remoção:

- arquivos existentes alterados: 0;
- lógica experimental em componente produtivo: não;
- tokens globais alterados: não;
- dependências novas: 0;
- item no registry produtivo: não;
- mocks fora da pasta experimental: não;
- CSS experimental fora da pasta experimental: não;
- documentação/evidência espalhada: não prevista.

## Regra de encerramento

O laboratório não deve ser integrado definitivamente ao produto, ao Design System ou à navegação. A remoção somente ocorrerá após a revisão do relatório de validação.
