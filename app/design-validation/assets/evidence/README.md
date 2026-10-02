# Evidências — Central de Ativos

Registro da validação visual do experimento não-CRM. Os dados são fictícios e não devem ser substituídos por dados de operação.

## Legenda

- **IMPLEMENTED** — estado previsto e controlável pelo laboratório.
- **CAPTURED** — captura feita no Chrome externo durante esta rodada.
- **VISUALLY_REVIEWED** — captura lida visualmente, incluindo a árvore acessível.
- **ISSUE_FOUND** — problema encontrado e corrigido dentro do experimento.
- **BLOCKED** — não foi possível completar a prova solicitada.

## Matriz de captura/revisão

| Evidência | Estado/variante                    | Tema           | Viewport                  | Implementação | Captura/revisão                                      | Resultado                   |
| --------- | ---------------------------------- | -------------- | ------------------------- | ------------- | ---------------------------------------------------- | --------------------------- |
| E01       | Default com lista e banner Info    | Claro + escuro | Desktop 1440×900          | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E02       | Filtros ativos + chips             | Claro          | Desktop 1440×900          | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E03       | Empty natural                      | Claro          | Desktop 1440×900          | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E04       | Empty filtered                     | Claro          | Desktop 1440×900          | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E05       | Loading                            | Claro          | Desktop 1440×900          | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E06       | Error recuperável                  | Claro          | Desktop 1440×900          | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E07       | Drawer de detalhe                  | Claro          | Desktop                   | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E08       | Formulário inválido                | Claro          | Desktop                   | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E09       | Dialog de arquivamento + toast     | Claro          | Desktop                   | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |
| E10       | Row-to-Card                        | Claro + escuro | Mobile 390×844            | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED · ISSUE_FOUND corrigido | Aprovado com ajuste local   |
| E11       | Priority Columns                   | Claro          | Mobile 390×844            | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado para listas densas |
| E12       | Banner Warning/Error + tema escuro | Escuro         | Desktop 1440×900 e mobile | IMPLEMENTED   | CAPTURED · VISUALLY_REVIEWED                         | Aprovado                    |

## Cobertura adicional

- Tablet 768×1024: shell, filtros, tabela com rolagem horizontal contida e drawer foram capturados e revisados.
- Navegação mobile: Sheet de navegação aberto e revisado.
- Teclado: abertura do detalhe com Enter, fechamento com Escape e retorno do foco ao botão de origem foram verificados.
- Formulário: submissão vazia exibiu mensagens associadas para nome, categoria e localização.
- Aviso: fechamento removeu o banner e mudança de variante o reexibiu.

## Validações técnicas

- Formatação, typecheck estrito e ESLint dos arquivos experimentais: concluídos sem erro.
- Build Next.js: concluído; a rota experimental foi incluída no bundle.
- Testes direcionados de hidratação, tokens de contraste e datas: passaram.
- A suíte unitária completa não ficou verde: a guarda de espanhol reporta a prosa PT-BR intencional da rota experimental e outras guardas globais também falharam fora do escopo. Nenhum arquivo compartilhado foi alterado.

## Persistência das capturas

As capturas foram produzidas no Chrome externo e exibidas inline durante a revisão. A API de navegador disponível nesta rodada retornou os bytes para exibição, mas não ofereceu caminho de gravação no diretório `evidence/screenshots/`. Por isso, não há PNG inventado nem caminho de arquivo declarado como se existisse.

## Resultado da revisão

- **ISSUE_FOUND corrigido:** a estratégia Row-to-Card ultrapassava a largura de 390 px por causa da largura intrínseca do cartão; o ajuste local adicionou contenção de largura e flexibilidade ao título/status.
- **ISSUE_FOUND corrigido:** o Sheet não devolvia foco ao acionador após Escape; o experimento passou a guardar e restaurar o elemento de origem.
- Nenhum overflow horizontal permaneceu no Row-to-Card após a correção.
- O painel de validação continua explicitamente identificado como laboratório e não deve ser promovido ao produto.
