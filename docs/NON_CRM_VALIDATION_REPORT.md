# Relatório de validação não-CRM — Central de Ativos

Status: **validado visualmente com ajustes locais**.

Data da rodada: 14/09/2026. Rota: `/design-validation/assets`. Sessão autenticada local, sem bypass de autenticação e sem acesso a dados reais.

## 1. Resultado executivo

Score final qualitativo: **8,7/10**.

A linguagem visual se sustenta fora do CRM. A tela orienta, exibe dados operacionais, trata estados e oferece ações sem depender de leads, conversas, funil, agenda, agente ou canal. O resultado é **aprovado com ajustes locais** para consideração futura no design system; esta rodada não cria nem promove uma biblioteca.

### Comparações principais

- **Mobile A — Priority Columns:** melhor para varredura rápida e listas densas; preserva nome, contexto, estado e ação em uma linha curta.
- **Mobile B — Row-to-Card:** melhor para contexto e comparação de inspeção/custo; depois do ajuste de largura, foi a estratégia recomendada para a Central de Ativos.
- **Claro e escuro:** ambos mantêm hierarquia, surfaces semânticas e estados legíveis. O claro favorece leitura prolongada; o escuro mantém a expressão operacional calma.
- **Densidades:** a tela combina densidade compacta na tabela, default no shell/métricas e confortável nos detalhes/formulário. A densidade é contextual, não um toggle do produto.

## 2. Pontuação

| Dimensão                 | Nota | Evidência observada                                                                                       |
| ------------------------ | ---: | --------------------------------------------------------------------------------------------------------- |
| Hierarquia e layout      |  8,8 | Page Header, métricas, aviso, filtros e lista aparecem em ordem clara nos três tamanhos.                  |
| Cores e estados          |  8,6 | Info, Warning, Error, neutro, claro e escuro mantêm semântica sem depender de cor isolada.                |
| Tipografia e densidade   |  8,6 | Títulos, metadados e numerais têm contraste de escala e ritmo operacional consistente.                    |
| Componentes              |  8,8 | Button, Badge, Card, Select, Sheet, Dialog, Toast e Table foram reutilizados sem alteração compartilhada. |
| Feedback                 |  9,0 | Loading, empty, erro com retry, validação, fechamento de aviso, dialog e toast foram exercitados.         |
| Responsividade           |  8,7 | 390×844, 768×1024 e 1440×900 revisados; a estratégia B recebeu correção local de overflow.                |
| Acessibilidade           |  8,5 | Labels, headings, roles, nomes de ação, Enter, Escape, foco visível e retorno de foco foram verificados.  |
| Independência de domínio |  8,9 | O domínio de ativos explica a tela sem importar vocabulário estrutural do CRM.                            |

## 3. Cobertura executada

- Default, filtros ativos, empty natural, empty filtered, loading e error recuperável.
- Banner Info, Warning, Error, oculto e reexibição após fechamento.
- Drawer de detalhe em desktop, mobile e tablet.
- Formulário vazio com mensagens por campo, estado opcional de custo e ações do Sheet.
- Dialog de arquivamento, cancelamento, confirmação e Toast; a mutação ficou restrita ao fixture local.
- Navegação mobile em Sheet.
- Estratégias A e B em 390×844, incluindo tema escuro após a correção.
- Shell, filtros, tabela e drawer em 768×1024.
- Default claro/escuro e estados principais em 1440×900.

A matriz está em [evidence/README.md](../app/design-validation/assets/evidence/README.md). O manifesto do experimento está em [EXPERIMENT.md](../app/design-validation/assets/EXPERIMENT.md).

## 4. Problemas encontrados e correções

1. **Overflow horizontal em Row-to-Card a 390 px — corrigido.** A largura intrínseca do cartão crescia além do contêiner. A correção foi restrita a `AssetTable.tsx`: `min-w-0` no cartão, título flexível e badge sem shrink.
2. **Retorno de foco do detalhe — corrigido.** O experimento passou a guardar o acionador e devolver foco a ele após Escape/fechamento.
3. **Painel de desenvolvimento — limitação da execução.** O Chrome mostrou o indicador de issues do Next durante o servidor de desenvolvimento, associado a avisos locais de autenticação; isso não faz parte da superfície do produto. A tentativa de preview em outra porta foi bloqueada pelo navegador, então a revisão autenticada continuou na porta local original.

## 5. Classificação para uso futuro

### Aprovados como candidatos

App Shell, Page Header, grupo de métricas, Filter Bar, Status Banner semântico, Empty/Error/Loading orientados a ação, ritmo de tabela, Sheet de detalhe, formulário em Sheet, Dialog e Toast.

### Aprovados com ajustes

Row-to-Card para mobile, condicionado à contenção de largura validada nesta rodada. Priority Columns permanece indicado para contextos que priorizam densidade e varredura.

### Em aberto

- A escolha definitiva entre A e B deve considerar outros domínios de dados antes de virar padrão global.
- A densidade contextual foi validada nesta tela, mas ainda não há estudo comparativo transversal entre várias telas.
- As capturas devem ser persistidas em um pipeline que ofereça gravação de screenshots antes de qualquer aprovação formal de biblioteca.

### Não recomendado

Promover os controles do laboratório, os nomes de navegação fictícios ou qualquer vocabulário específico do CRM ao core visual.

## 6. Arquivos e fronteira

- Criados apenas em `app/design-validation/assets/`: fixtures, composições, estados, laboratório e manifesto.
- Os dois ajustes de implementação ficaram restritos a `AssetTable.tsx` e `AssetsValidationWorkspace.tsx`, dentro da pasta experimental.
- Nenhuma alteração em `DESKCOMM_UI_BLUEPRINT.md`, `NON_CRM_VALIDATION_SPEC.md` ou `DESKCOMM_VISUAL_AUDIT.md`.
- Nenhuma alteração em registry de navegação, componentes compartilhados, banco, API, middleware, dependências ou configuração de autenticação.

## 7. Verificações

- Prettier, typecheck estrito, ESLint e build Next.js: **passaram** após as correções.
- Testes direcionados de hidratação, tokens de contraste e datas: **passaram**.
- Suíte unitária completa: **não verde nesta máquina**; a guarda de espanhol acusa as strings PT-BR intencionais do laboratório e existem falhas globais fora do escopo. Isso está registrado sem alterar allowlists ou arquivos compartilhados.
- Capturas do Chrome: **produzidas e revisadas inline**, mas não persistidas porque a API disponível não expôs gravação em `evidence/screenshots/`.

## 8. Remoção e publicação

Para remover o experimento, apagar `app/design-validation/assets/` e este relatório. Nenhuma reversão compartilhada é necessária.

Nenhum commit, push, PR ou merge foi criado.
