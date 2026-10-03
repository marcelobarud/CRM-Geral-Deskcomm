# CRM Geral — auditoria do B2B simples

Auditoria anterior ao código, 2026-10-03. Base: `ca1e1a380`, Bloco C publicado e
integrado por fast-forward no fork. Fontes: modelo/roadmap §9, seleção upstream
§7 e respostas 1A/2B, relatórios Commercial Journey, Tags Foundation e Supabase D2.

## Inventário confirmado

- Schema versionado e schema real Geral 1: não existe entidade comercial
  `companies`, FK empresarial em contacts ou entidade Pessoa. `organizations`
  é exclusivamente tenant; seus legal_name/cnpj pertencem ao controlador do CRM.
- `contacts` possui custom_fields/source_metadata livres. No Geral 1, contagem
  agregada de contacts com chaves custom_fields.company_name/company: zero.
  Nenhum valor pessoal foi consultado. Não há informação empresarial a converter.
- `lib/webhooks/respondi.ts` mapeia company_name para companyName e composição do
  título de lead. `lib/leads/classificacao-inicial.ts` lê company_name no detector
  de spam. São textos de integração, não identidade empresarial. Permanecem
  intactos; não se associa uma empresa por semelhança de título.
- Importação, schemas REST, formulários e MCP de contatos operam identidade de
  contato, custom_fields e tags; não há contrato dedicado de empresa a reutilizar.
  Duplicidade de contatos usa telefone/email/CPF e merge explícito; não pode ser
  copiada como merge automático de empresas.
- Leads possuem contact_id opcional; Inbox deriva contato. Relatórios, IA,
  automações, settings e seeds não exigem entidade empresarial comercial.
- Upstream descrito na seleção tem companies/people/company_people e enrichment;
  esses contratos não estão no checkout e excedem a decisão 1A/2B. Não importar.
- Lista/ficha, guard requireRole, wrappers, seleção contextual e timeline de
  contacts são padrões reaproveitáveis; nenhuma UI empresarial existente.

## Estratégia escolhida

`crm_companies` com UUID/organization_id, nome obrigatório e campos genéricos
opcionais legal_name, document + document_type, email, phone, website, endereço,
cidade/estado/país e notes. Sem regra fiscal Brasil-only ou validação de documento
internacional inventada. Documento exato normalizado (trim/case), com tipo, é
único por tenant quando ambos fornecidos; nome sozinho não impede homônimos.

`contacts.company_id` nullable, FK composta com organização. Fonte única do
vínculo atual: contato. Oportunidade/conversa leem esse contato; lead sem contato
não possui empresa inferida. Sem tabela Pessoa, afiliação, FK no lead ou tags de
empresa. Troca/remoção registra atividade na timeline existente e auditoria de
IDs; não apaga história. Empresa arquiva somente sem contato vinculado; não há
DELETE comercial ou cascata de contatos.

RBAC adotado dentro dos papéis existentes: viewer lê; agent/manager/admin
vinculam contatos que já podem editar; admin cria/edita/arquiva cadastro de
empresas. Guards MFA/suporte também no banco. Escrita direta de catálogo negada.
Service role continua obrigada a filtrar organização, com FK/trigger como defesa
estrutural. Organização não vem de body.

Textos empresariais legados continuam informação de origem, nunca segunda fonte
do vínculo; futura importação estruturada exige resolução explícita por ID ou
documento/tipo e autorização. Não converte texto silenciosamente. Critério de
retirada desses textos depende da migração de seus consumidores em fase própria.

Fora: fiscal profundo, financeiro, contratos/propostas, filiais, sócios,
enriquecimento, múltiplos interlocutores, relatórios B2B e novo motor de automação.
