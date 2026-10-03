import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { requireCapability } from "@/lib/capabilities/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { ok, fail } from "@/lib/api/wrappers";
import { logger } from "@/lib/logger";
import { marcaDaSaida } from "@/lib/branding/saida";
import {
  proposalDraftSchema,
  proposalSendSchema,
  proposalTemplateSchema,
  proposalTotal,
  type ProposalSnapshot,
} from "./contracts";
import { renderProposalPdf } from "./pdf";
import type { Json } from "@/lib/database.types";
const idSchema = z.uuid();
export async function proposalCommand(req: NextRequest, id?: string, action = "create") {
  const requestId = randomUUID(),
    support = await requireSupportWrite();
  if (support) return support;
  const auth = await requireCapability(
    "proposals",
    action.startsWith("template_") ? "manager" : "agent",
  );
  if (!auth.ok) return auth.response;
  const key = idSchema.safeParse(req.headers.get("Idempotency-Key"));
  if (!key.success || (id && !idSchema.safeParse(id).success))
    return fail(
      "validation_failed",
      "Informe uma chave de operação e identificador válidos.",
      422,
      { requestId },
    );
  const body = await req.json().catch(() => null);
  const schema =
    action === "send" || action === "generate"
      ? proposalSendSchema
      : action.startsWith("template_")
        ? proposalTemplateSchema
        : action === "archive"
          ? z.object({}).strict()
          : proposalDraftSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return fail("validation_failed", "Confira os dados da proposta.", 422, { requestId });
  const db = await createClient(),
    org = auth.org.orgId;
  try {
    const command = async (commandAction: string, data: Json, request = key.data) => {
      const r = await db.rpc("fn_proposal_command", {
        p_org: org,
        p_action: commandAction,
        p_proposal: id,
        p_data: data,
        p_request: request,
      });
      if (r.error)
        throw Object.assign(new Error("proposal_command_failed"), { code: r.error.code });
      return r.data;
    };
    if (action === "send" || action === "generate") {
      const brand = await marcaDaSaida(org);
      const raw = await command("prepare", { ...parsed.data, brand: { nome: brand.nome } } as Json);
      const v = raw as unknown as {
        id: string;
        pdf_path: string;
        state: string;
        pdf_sha256: string;
        version_number: number;
        snapshot: ProposalSnapshot;
      };
      if (v.state === "sent") return ok(v, { requestId });
      // Exceção limitada de Storage: organização confiável e versão lida pela RPC autorizada.
      // Sem service role para ler/escrever tabelas comerciais; bytes só neste caminho.
      if (
        !v.pdf_path.startsWith(org + "/" + id + "/") ||
        v.pdf_path !== org + "/" + id + "/" + v.id + ".pdf"
      )
        throw new Error("proposal_path_invalid");
      const storage = createAdminClient().storage.from("proposal-documents");
      const existing = await storage.download(v.pdf_path);
      let bytes: Buffer;
      if (existing.data) bytes = Buffer.from(await existing.data.arrayBuffer());
      else {
        bytes = await renderProposalPdf(v.snapshot, v.version_number);
        const upload = await storage.upload(v.pdf_path, bytes, {
          contentType: "application/pdf",
          upsert: false,
        });
        if (upload.error) {
          const winner = await storage.download(v.pdf_path);
          if (!winner.data) throw new Error("proposal_pdf_failed");
          bytes = Buffer.from(await winner.data.arrayBuffer());
        }
      }
      if (action === "generate")
        return ok(
          await command("record_pdf", {
            version_id: v.id,
            pdf_sha256: createHash("sha256").update(bytes).digest("hex"),
          }),
          { requestId },
        );
      const result = await command("finalize", {
        version_id: v.id,
        pdf_sha256: createHash("sha256").update(bytes).digest("hex"),
      });
      return ok(result, { requestId });
    }
    if (action === "create" || action === "update")
      proposalTotal(proposalDraftSchema.parse(body).items);
    return ok(await command(action, parsed.data as Json), { requestId });
  } catch (error) {
    const code = (error as { code?: string }).code;
    logger.warn("proposal_action_failed", {
      requestId,
      organizationId: org,
      action,
      code: code ?? "pdf_failure",
    });
    return fail(
      code === "42501" ? "forbidden" : code === "23505" ? "conflict" : "proposal_operation_failed",
      code === "23505"
        ? "A proposta mudou ou esta chave já foi utilizada. Recarregue antes de repetir."
        : "Não foi possível concluir. A versão preparada foi preservada; tente novamente com a mesma chave.",
      code === "42501" ? 403 : code === "23505" ? 409 : 503,
      { requestId },
    );
  }
}
