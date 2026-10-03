/** Catálogo estrutural por organização; contratos textuais existentes conservados. */
import { ApiError } from "@/lib/api/types";

import type { DepsDaOperacao } from "@/lib/operacao/entradas-automaticas";

export interface MarcadorEmUso {
  marcador: string;
  /** Quantas conversas o carregam agora. */
  conversas: number;
  /** `true` = está no vocabulário oficial da empresa; `false` = nasceu no uso. */
  oficial: boolean;
}

/**
 * O vocabulário oficial mais o que de fato está em uso, num só lugar.
 *
 * ⚠️ AS DUAS FONTES JUNTAS, DE PROPÓSITO. Só o oficial esconderia os marcadores
 * que a operação inventou e usa todo dia (que são justamente os que o agente
 * precisa reaproveitar); só os em uso esconderia o vocabulário que a empresa
 * declarou e ninguém aplicou ainda. Quem lê precisa das duas respostas para não
 * criar a quarta variação de "urgente".
 *
 * O teto existe porque isto entra no contexto de um modelo: uma organização com
 * mil marcadores gastaria o contexto inteiro numa lista que ninguém lê até o fim.
 */
export async function listarMarcadores(
  deps: DepsDaOperacao,
  opts: { limite?: number } = {},
): Promise<MarcadorEmUso[]> {
  const limite = opts.limite ?? 60;

  const [catalog, assignments] = await Promise.all([
    deps.supabase.from("crm_tags").select("id,name").eq("organization_id", deps.organizationId).eq("is_archived", false).is("merged_into", null),
    deps.supabase.from("crm_tag_assignments").select("tag_id").eq("organization_id", deps.organizationId).eq("entity_kind", "conversation").limit(2000),
  ]);
  if (catalog.error || assignments.error) throw new ApiError(500, "internal_error", undefined, deps.requestId, "Catálogo indisponível.");
  const counts = new Map<string, number>();
  for (const binding of assignments.data ?? []) counts.set(binding.tag_id, (counts.get(binding.tag_id) ?? 0) + 1);
  return (catalog.data ?? []).map(tag => ({ marcador: tag.name, conversas: counts.get(tag.id) ?? 0, oficial: true }))
    .sort((a,b) => b.conversas-a.conversas || a.marcador.localeCompare(b.marcador)).slice(0, limite);
}

export interface PessoaDoTime {
  user_id: string;
  papel: string;
  /** `true` enquanto o convite não foi aceito — quem ainda não pode receber trabalho. */
  convite_pendente: boolean;
  desde: string;
}

/**
 * Quem trabalha aqui e com que papel.
 *
 * ⚠️ SEM E-MAIL, SEM NOME, SEM ÚLTIMO ACESSO — e a rota REST irmã devolve os
 * três. A diferença é o destinatário: o que sai daqui entra no contexto de um
 * modelo de linguagem e pode ser repetido numa conversa com um cliente. O
 * agente precisa saber A QUEM direcionar (o `user_id` que
 * `crm_assign_conversation` consome) e QUEM PODE receber (o papel); o e-mail do
 * atendente não participa de nenhuma dessas duas decisões.
 *
 * ⚠️ SÓ LEITURA. Mudar papel de alguém é RBAC e está fora do escopo desta wave
 * por decisão do despacho — e continua sendo, porque promover um colega é a
 * definição de mudança que ninguém quer descobrir depois.
 */
export async function listarTime(deps: DepsDaOperacao): Promise<PessoaDoTime[]> {
  const { data, error } = await deps.supabase
    .from("user_organizations")
    .select("user_id, role, accepted_at, created_at")
    .eq("organization_id", deps.organizationId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new ApiError(500, "internal_error", undefined, deps.requestId, error.message);

  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((m) => ({
    user_id: m.user_id as string,
    papel: m.role as string,
    convite_pendente: m.accepted_at === null,
    desde: m.created_at as string,
  }));
}
