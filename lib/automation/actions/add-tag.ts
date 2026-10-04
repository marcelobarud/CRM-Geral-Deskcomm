/** Ação existente; o banco conserva identidade/aliases e recibo por evento/regra/passagem. */
import { originFromAutomationEvent } from "@/lib/atendimento/origem-automacao";
import { registerAction } from "@/lib/automation/actions";
import type { ActionCtx, ActionResultDetail } from "@/lib/automation/types";
import type { Json } from "@/lib/database.types";
export async function executeAddTag(ctx: ActionCtx): Promise<ActionResultDetail> {
  const lead = ctx.context.lead as { contact_id?: string } | undefined;
  const contact = ctx.context.contact as { id?: string } | undefined;
  const contactId = lead?.contact_id ?? contact?.id;
  const origin = contactId ? await originFromAutomationEvent(ctx, contactId) : null;
  const r = await ctx.admin.rpc("fn_automation_add_tag", {
    p_org: ctx.organizationId,
    p_rule: ctx.ruleId,
    p_event: ctx.event.id,
    p_index: ctx.actionIndex ?? 0,
    p_origin: origin as Json,
  });
  if (r.error)
    return {
      type: "add_tag",
      status: "failed",
      error: "tag_action_failed",
      detail: { code: r.error.code, retry_safe: true },
    };
  const detail = r.data as Record<string, unknown>;
  return { type: "add_tag", status: detail.skipped ? "skipped" : "success", detail };
}
registerAction({ type: "add_tag", execute: executeAddTag });
