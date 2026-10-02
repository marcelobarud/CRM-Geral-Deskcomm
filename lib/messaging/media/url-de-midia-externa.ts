import { assertSafeOutboundUrl } from "@/lib/automation/outbound-url";
import { assertDestinoResolvidoSeguro } from "@/lib/automation/outbound-ip";

/** Guarda compartilhada por REST/MCP, antes de persistir ou entregar ao canal. */
export async function assertUrlDeMidiaSegura(url: string): Promise<void> {
  assertSafeOutboundUrl(url);
  const parsed = new URL(url);
  if (parsed.username || parsed.password) throw new Error("unsafe_url:credentials");
  // Sem exceção de Storage: o runtime local não oferece esse serviço.
  await assertDestinoResolvidoSeguro(parsed.hostname);
}
