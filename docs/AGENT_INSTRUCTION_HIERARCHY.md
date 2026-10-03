# Hierarquia das instruções do CRM Geral

1. Instruções explícitas do usuário e regras da plataforma.
2. `AGENTS.md`: contrato global principal do fork.
3. `CLAUDE.md`: detalhamento compatível e subordinado.
4. Specs, PRDs, regras de negócio e doutrinas locais pertinentes: contratos especializados. Divergência não autoriza inventar comportamento; registre e peça decisão quando necessário.
5. Skills e instruções de ferramentas: escopo específico, sem sobrepor o contrato global. `.agents/skills/` é fonte; `.claude/skills/` é espelho gerado.
6. Handoffs, planos, checkpoints, auditorias e memórias: contexto histórico/snapshot; revalidar antes de executar. Uma ordem “permanente” de épico não se torna lei global.

`origin` pertence ao CRM Geral. Deskcomm upstream é referência funcional/histórica consultada com remoto e revisão explicitamente identificados, nunca autoridade automática. Rotinas de contribuir/triagem/governança upstream só se aplicam quando essa contribuição é pedida.

Desenvolvimento local usa [PostgreSQL local](LOCAL_POSTGRES_SETUP.md); receitas Supabase/VPS se aplicam à distribuição prevista, sem eliminar Auth/RLS/Storage/Realtime. Versão local, piso do harness e ambiente de uma receita histórica são conceitos diferentes.

Handoffs ficam em [docs/handoffs](handoffs/README.md). `.specs/project/STATE.md`, `plan/`, `tasks/todo.md` e checkpoints de loop descrevem sua época, não o backlog atual. Memórias pessoais ausentes, graphify e plugins externos não bloqueiam trabalho: use fontes presentes. Exceções de escopo devem ser explícitas, não inferidas do nome de uma ferramenta.
