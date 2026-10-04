# Campanhas agendadas — Bloco H

## Escopo entregue

Campanhas são uma capacidade opcional iniciada por gerente ou administrador. A capability `scheduled_campaigns` nasce desligada. A primeira entrega salva um rascunho, congela por tag o conjunto de contatos ao agendar e prepara esse conjunto pela fila existente. A release não envia mensagens, não chama provider, não cria registros `sent`, `delivered` ou `read` e não inicia campanha por automação ou IA.

O WhatsApp é somente o canal comercial candidato. A auditoria não encontrou sandbox/test mode do provider conectado, e o fluxo existente fala com a conta real da organização. Não há receiver externo controlado homologado. Por isso a campanha termina em `prepared` com `error_code=provider_unavailable`; `ready` indica somente que o contato passou pela preparação.

## Domínio e público

`crm_scheduled_campaigns` guarda nome, texto simples, tag UUID, canal candidato, fuso capturado da organização, instante UTC e estado. `crm_scheduled_campaign_recipients` guarda uma linha por contato no snapshot, com estado individual e motivo sanitizado. A tela pagina campanhas em grupos de 20 e destinatários em grupos de 25; os totais são agregados no banco. Não existe tabela de run, executor externo ou ledger paralelo.

O snapshot é criado dentro da transação que agenda o job e contém os contatos atualmente vinculados à tag ativa. A lista não muda se a tag for editada depois. O worker revalida a elegibilidade no instante de preparo: existência e organização, anonimização, mescla, bloqueio, passagem para atendimento humano, opt-out, base legal de marketing e telefone E.164. A falta de consentimento de marketing ou de referência registrada de legítimo interesse é tratada como inelegível. Alterações posteriores no público não adicionam nem removem pessoas do snapshot.

O texto fica persistido para revisão e é mostrado como texto, sem interpolação executável. Ele não entra no payload do job nem em metadata de auditoria. A interface não pede destinatário manual nem lista nomes/telefones em massa.

## Horário, scheduler e worker

O horário é informado como hora de parede no `organizations.timezone`. A rota valida calendário e fuso, usa `instanteDe()` e persiste um `timestamptz` UTC. Horários inexistentes durante a mudança de verão são recusados; em horário repetido, é usada a primeira ocorrência, conforme o contrato vigente da agenda.

O scheduler é o relógio da fila durável `job_queue.run_after`. Agendar cria um job `campaign_prepare` para o instante escolhido; não há cron novo, processo separado, `setInterval` ou fila nova. O claim e o loop de polling existentes cuidam da concorrência. O worker chama um RPC transacional dedicado com `organization_id`, campanha, lote, job, worker e horário do lease. O RPC confere o lease atual, a capability e o estado, e usa `FOR UPDATE SKIP LOCKED` para classificar no máximo 50 recipients por chamada. Se ainda há pendentes, grava um próximo job com `source_event_id` determinístico; o replay do lote anterior não cria outro efeito nem outro job lógico.

O limite de 50 é tamanho técnico do lote, não regra comercial. Rate limiting de provider é inaplicável porque não existe envio. O retry fica no mecanismo existente da fila, com cinco tentativas. Depois do último erro, o RPC grava falha sanitizada e encerra como `failed`. Não se declara exactly-once; esta implementação não tem efeito remoto para deduplicar.

## Cancelamento, capability e auditoria

Agendar, preparar e cada lote consultam novamente a capability. A checagem e o comando de configuração travam a linha da organização, evitando que um preparo comece depois de a desativação ser confirmada. Com capability desligada, o worker cancela os pendentes e preserva o histórico. Cancelamento humano continua disponível após desativar a capability; impede novas preparações, marca pendentes e elegíveis como cancelados, não apaga recipients e não tenta desfazer mensagens — nenhuma mensagem foi enviada.

O comando de usuário usa `getUser()` e `requireRole("manager")`, organization ativa confiável, Zod, `fn_support_write_allowed`, MFA e RPC idempotente por `Idempotency-Key`. Leitura é manager/admin sob RLS; as tabelas não concedem escrita direta a authenticated ou service role. Os RPCs worker só aceitam JWT `service_role`, validam tenant, campaign, job e lease, e executam filtros explícitos por organização. Triggers impedem recipients vinculados a contato de outra organização ou transferência de organização enquanto houver referência.

Auditoria registra `campaign.created`, `campaign.updated`, `campaign.scheduled`, `campaign.cancelled`, `campaign.prepared` e `campaign.preparation_failed`. Registra IDs, tag, instante, contagens e códigos; não registra o conteúdo da mensagem nem dados pessoais do destinatário. Nenhum evento automático de campanha foi adicionado ao motor do Bloco G.

## Banco, capability e UI

Migration `0273_scheduled_campaigns` segue a tripla do repositório: migration versionada, apêndice idempotente em `supabase/baseline.sql` e MANIFEST. A correção aditiva `0274_campaign_update_id_validation` permite o identificador no comando de edição e o exige nesse caminho, sem reescrever uma migration já aplicada. A migration `0275_campaign_fk_indexes` cobre os quatro FKs sinalizados pelo advisor do Geral 1; ambas também estão no baseline e MANIFEST. A capability está no registry com default `false`, papel mínimo `manager` e rota `/app/campaigns`; `fn_capability_enabled` e `fn_set_capability` reconhecem o novo identificador. Os tipos foram regenerados do Geral 1. As policies só permitem SELECT de gerente e o agregado de contagens é `security invoker`.

A tela mostra criação, seleção de público por tag, estimativa, conteúdo, fuso, rascunho editável, revisão explícita, data de agendamento, status, totais, destinatários paginados, motivos, atualização moderada e confirmação de cancelamento. Gerentes podem cancelar campanhas em histórico mesmo quando a capability está desligada; a execução permanece bloqueada. O estado é sempre textual, e mensagens de bloqueio explicam que não houve envio. Com a capability desligada, a entrada operacional some da navegação; a rota preserva consulta do histórico em modo de leitura. A UI não oferece retry de envio, pause/resume ou analytics de marketing.

## Limites e validação

O Geral 1 é staging. A homologação precisa provar isolamento A/B, MFA AAL1/AAL2, snapshot, lote, cancelamento, bloqueio por capability, consentimento, opt-out, motivos e limpeza independente de fixtures. Qualquer teste usa somente organizações/contatos fictícios; não usa provider nem destinatários reais. As capturas desktop 1440×900 e mobile 390×844 são evidência da UI, não evidência de envio.

P1 separado: instalação/update limpa ainda não comprovada. Git Bash está disponível, mas o host não tem Docker CLI, exigido por `pnpm test:db`. A fase não declara produção ou Cliente Zero prontos. P2 herdado: ações externas legadas não têm exactly-once universal no intervalo entre efeito e registro; H não amplia esse risco porque não produz efeito externo. Advisors preexistentes serão distinguidos dos alertas novos, sem relaxar grants para ocultá-los.

## Gaps

| Prioridade | Estado |
|---|---|
| P0 | Nenhum efeito externo foi habilitado; não há contato real alcançável por campanha nesta release. |
| P1 | Instalação/update limpa ainda sem prova local por ausência de Docker CLI; separado do aceite de staging. |
| P2 | Provider sandbox e política comercial/LGPD de campanha continuam sem homologação; legado externo não tem exactly-once universal. |
| P3 | Pause/resume, personalização de conteúdo e métricas de marketing ficaram fora do escopo. |
