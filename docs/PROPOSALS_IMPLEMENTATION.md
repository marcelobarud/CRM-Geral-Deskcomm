# Bloco F — Propostas opcionais

## Estado do checkpoint

CONFIRMADO: Bloco E publicado no fork e integrado por fast-forward em main, HEAD d5468f80a940c2c3f7fc3a54157123edf57ae1c5. Branch local de trabalho: bloco-f-propostas. Auditoria documentada e commitada antes do código (0dc21e867). Sem push/merge do Bloco F, sem início de G/H.

CONFIRMADO: implementação, migrations aplicadas ao Geral 1, probe SQL transacional, checks locais e revisão visual de PDF fictício.
PENDENTE: suíte Proposals com JWTs reais e evidências desktop/mobile/teclado; não declarar homologado ou pronto para G antes dela.

## Auditoria e escolhas

A fonte de decisões é o roadmap do fork e docs/PROPOSALS_AUDIT.md. Não havia módulo comercial local; entidades homônimas de sugestões de IA não foram reutilizadas. Catálogo existente é opcional e copiado. Engine @react-pdf/renderer existente foi reutilizado sem dependência nova. Storage upstream com overwrite/URL longa não foi importado. Nenhuma IA, assinatura, financeiro, transporte, tracking ou automação de validade foi introduzida.

INFERIDO como desenho técnico: separar rascunho editável, preparação imutável de versão/PDF e registro explícito como enviado; registro não comprova entrega externa.

## Capability e RBAC

proposals no registro, default false, namespace de configuração existente. Setter admin, suporte e MFA vigentes. UI/API/generation/new effects dependem de can_execute; histórico e PDF autorizado continuam disponíveis quando desligado. Prontidão: disabled/not configured/ready/degraded pela presença e privacidade do bucket real.

Agent cria e opera suas propostas; manager/admin acessam o escopo da equipe e administram modelos; viewer não acessa este módulo. Leitura comercial com client autenticado e organização derivada da sessão; DML somente via command autorizado. Nenhuma organização do body é aceita. A feature não cria path público, worker, scheduler ou ferramenta de IA.

## Modelo e dinheiro

crm_proposals: identidade estável, título/moeda/textos, contexto oportunidade OU contato, autoria, status draft/sent/archived e revisão otimista.
crm_proposal_items: descrição, quantidade decimal positiva até três casas, unit_price_cents, posição e produto opcional.
crm_proposal_templates: modelo simples com moeda/textos/itens copiados ao aplicar; edição posterior do modelo não altera proposta.
crm_proposal_versions: número incremental, revisão, snapshot, destinatário/canal informado, autoria/data, estado prepared/sent, caminho privado e hash SHA256.

Empresa é derivada do contato da oportunidade ou contato direto; não há FK redundante. Snapshot preserva nome/documento da empresa, contato, itens, valores, marca, autor e data. Alterações atuais não reescrevem versões históricas.

Dinheiro: cents e currency, BigInt no servidor, limite inteiro seguro; quantidade em milésimos e arredondamento half-up por item, soma de itens já arredondados. Não converter moedas nem usar float para calcular totais. Probe confirmou 0,5 × 1 centavo + 2 × 10000 = 20001 cents.

## PDF, Storage e falhas

Bucket proposal-documents privado, MIME application/pdf, limite 10 MB. Caminho org/proposta/versão.pdf validado com organização confiável; sem upsert. Engine lê apenas snapshot. Preparar PDF não marca envio; record_pdf confirma hash/objeto, finalize registra envio somente com objeto presente. Retry reutiliza versão/arquivo/receipt; conflito de conteúdo com mesma chave retorna conflito.

Banco e Storage não têm transação distribuída: versão preparada e arquivo são estados recuperáveis. Upload existente é lido e seu hash confirmado, nunca sobrescrito. Novos efeitos são bloqueados se a capability mudar antes da finalização; histórico permanece.

Signed URL 60 segundos, resposta no-store. Botão abre PDF na mesma janela para evitar bloqueio de popup. SELECT JWT/RLS valida versão e acesso à proposta; policies restritivas bloqueiam escrita/overwrite/delete de usuários no bucket. Exceção privilegiada no app limitada a saúde do bucket e escrita/leitura dos bytes no caminho já autorizado; não lê/escreve tabelas comerciais por service role.

Snapshot sent não pode mudar ou ser excluído. Desvinculação do ator excluído preserva snapshot. Cascata da organização removida é permitida para descarte controlado/fixtures; objetos Storage são removidos pelo harness antes da organização. Não foi criada política comercial de retenção/LGPD ou rotina de expurgo automático.

## Jornada e histórico

Lista com pesquisa e páginas de 20; estado vazio/erro/retry/carregamento; ficha, rascunho, itens livres/catálogo, modelo criar/editar/aplicar, preparar PDF, registrar envio, versões e arquivo seguro. Contexto acessível pela oportunidade e contato; empresa aparece derivada. Histórico usa timeline comercial existente para oportunidade e a projeção de api_audit_log da timeline do contato para contato direto, sem tabela paralela.

Opções e modelos limitados a 100 registros. Histórico autorizado preservado ao desligar; novas ações desaparecem/bloqueiam na API. UI traduzida para espanhol, labels e controles nativos; evidência real ainda pendente.

## Schema e grants

Tripla versionada: 0256–0266, apêndices de baseline.sql e MANIFEST.md. Cada correção já aplicada é preservada e corrigida por migration nova, sem reescrita:
- 0256 módulo/capability/RLS/Storage/command;
- 0257 edição de modelo/autoria/retry sem dependência da marca atual;
- 0258 PDF preparado sem envio;
- 0259 índices de FKs e desvinculação do ator;
- 0260/0261 timeline e ator canônico user;
- 0262/0263 tentativa de contexto direto na tabela de atividades; 0264 restaura contrato lead_id obrigatório e projeta contato pela auditoria existente;
- 0265/0266 guard do namespace proposal:* no ledger compartilhado, sem acesso direto a receipts.

Tabelas tenant-aware com organization_id/RLS; SELECT authenticated e escrita por RPC. Composite FK de filhos e trigger de referências catálogo/contexto validam tenant também em operações privilegiadas. Funções novas revogam public/anon; command/access somente authenticated com guards e search_path fixo. Guard de receipts bloqueia inserção/update/delete diretos, inclusive service, preservando cascata controlada. Types gerados do schema real; sem edição manual de arquivo gerado ou lockfile.

Aplicações no Geral 1 (zwjrhqqwizjpzmeayrju) confirmadas. Reaplicações 0256–0258 e probe final confirmados. Probe roda em transação/rollback; verificação independente encontrou zero organizações/usuários proposal-probe restantes. Não equivale a instalação limpa do baseline ou prova JWT.

## Validação local

- typecheck: PASS.
- lint completo: PASS, zero erros/350 avisos preexistentes.
- build final: PASS.
- sete arquivos focados: 46 testes PASS (contratos, guards/API, PDF real, UI, navegação e suporte).
- i18n: cobertura das novas frases PASS; gate de prosa crua falha em 79 textos históricos do laboratório design-validation, fora do módulo.
- maps/fluxos: arquitetura JSON, sitemap e mapa de jornada atualizados; gates do mapa previamente passaram.
- node --check dos dois harnesses e git diff --check: PASS.
- PDF fictício renderizado com engine real e PNG via Poppler, revisado sem corte/overflow; evidência local ignorada, sem dados reais.
- suíte global test:unit --maxWorkers=2: executada, encontrou falhas históricas e foi interrompida sem resumo final; não declarar global verde. Falhas do inventário de navegação/guarda relacionadas ao delta foram corrigidas e passaram em teste focado.
- test:db: indisponível neste terminal por bash ausente; nenhum install/update limpo via harness Docker foi comprovado. Probe Geral 1 é complementar, não substituto.

Advisors finais: sem FK nova sem índice. Dois avisos de SECURITY DEFINER authenticated são intencionais para helper RLS e command guardado; public/anon/service não podem executar command. Índices sem uso são esperados antes de tráfego e foram preservados.
Referências: [SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index).

## Homologação real preparada, ainda pendente

Executar em terminal local:
` .\scripts\supabase\start-geral-1.ps1 -Prompt -Suite Proposals `

Chaves somente nos campos ocultos, memória do processo e restauração do ambiente; não persistir nem colar no chat. Resultado sanitizado: .local-dev/bloco-f/result.json; diário de fixtures e imagens fictícias no mesmo diretório ignorado.

A suíte inclui base D2 real, capability off/on/off, UI empty/criar/modelo/copiar/editar, catálogo/contexto, versões v1/v2, preparação/envio/retry, mudanças de contato/empresa/catálogo/modelo, PDF/hash privado/download/signed URL/overwrite negado, JWT A/B/viewer/agent/anon/service, referências cross-tenant e receipt protegido, desktop 1440×900/mobile 390×844, controles por teclado, histórico desligado e MFA AAL1/AAL2. Cleanup remove somente objetos deste teste antes de apagar suas organizações/usuários; ao concluir, verificar também inventário independente de banco/Auth/Storage.

## Gaps e próximo passo

P0: nenhum confirmado nos checks concluídos; a ausência de homologação não prova ausência de defeitos.
P1: homologação real Proposals/JWT/MFA/Storage/UX e limpeza independente pendentes; bloqueiam declarar F concluído e iniciar G. Instalação/update limpa via harness de banco também não comprovada.
P2: suíte global/i18n históricos sem verde; não corrigidos fora do escopo.
P3: busca de contexto/modelos limitada a 100; paginação de propostas usa offset e filtro de contato resolve oportunidades em query auxiliar. Evoluir quando volume exigir; sem infraestrutura antecipada.

Próximo passo imediato é executar e revisar a suíte Proposals. Não iniciar Bloco G nem publicar/mesclar F neste checkpoint.

## Primeira tentativa real e correção do harness

Execução f78ab7d5-0262-4c13-854e-69acbf32f82b: base D2 passou; Proposals interrompida antes de criar proposta. O harness tentou INSERT direto em crm_companies, mas o contrato B2B revoga essa escrita de service_role e exige fn_crm_company_manage autenticada. Criação e edição agora usam a RPC com JWT A, consumindo o retorno company_id. Nenhum grant, RLS ou código funcional foi relaxado.

O relatório havia mostrado a etapa de inventário da limpeza em vez da operação original; o diagnóstico sanitizado agora acompanha o erro até o catch principal, preservado durante cleanup. Teste de regressão passou; seis testes em dois arquivos passaram. Probe transacional Geral 1 confirmou criação/edição da empresa pela RPC e o contrato company_id, além dos checks anteriores de propostas.

Verificação independente da tentativa: zero organizações das fixtures, zero dos quatro usuários e zero objetos proposal-documents nos dois prefixos desta execução. Homologação Proposals continua pendente; executar novamente a mesma suíte. Sem push/merge do Bloco F e sem início de G.

## Segunda tentativa: formato do contato

Execução 6223ce09-6676-4662-89ab-72cd77ced01b: base D2 passou; diagnóstico preservado em F contato, código 23514. A fixture tinha telefone sem o sinal +. A inspeção das constraints revelou também escapes duplicados históricos que rejeitavam e-mail e telefone E.164 válidos. Contagem prévia confirmou zero valores existentes incompatíveis com os padrões corrigidos; nenhum dado foi alterado.

Migration 0267, baseline e MANIFEST corrigem apenas os padrões de contacts_email_format e contacts_phone_e164_format com classes explícitas, sem enfraquecer a validação ou modificar migrations históricas. Fixture usa +5511999990000. Aplicação/reaplicação Geral 1 e probe transacional passaram: criação com e-mail/E.164 válidos, rejeição de e-mail inválido e telefone sem +. Verificação independente da tentativa confirmou zero organizações/usuários/PDFs restantes. Homologação real permanece pendente, sem push/merge e sem início de G.

## Sessão automática com chaves somente em memória

`./scripts/supabase/start-geral-1.ps1 -Prompt -Suite Proposals -Mode AgentLoop` recebe as chaves em campos ocultos uma vez e mantém somente o ambiente do processo/filhos do teste. Codex não lê as chaves: solicita a execução pelo arquivo agent-request.json e lê agent-status.json/result.json, sem credenciais. Diretório de controle ignorado: .local-dev/bloco-f.

Controle fixo: ações run/stop, UUID de sessão e request, deduplicação, sem comando/caminho/endpoint fornecido pelo arquivo. Somente Proposals contra Geral 1; sessão expira após 60 minutos ou encerra por stop/Ctrl+C, restaurando o ambiente anterior. Mantenha o terminal aberto. O processo executa o harness versionado local; não há transmissão da chave para o chat, arquivo .env ou configuração persistente.

Teste sem credenciais reais (test-agent-loop.ps1) passou em três repetições: sessão antiga/ação arbitrária não executam, request repetido não repete teste, valor fictício permanece em memória e não aparece no status, stop encerra. Escrita de status usa arquivo temporário e substituição com retry limitado para disputa breve com leitores no Windows. Nenhum push/merge do Bloco F.
