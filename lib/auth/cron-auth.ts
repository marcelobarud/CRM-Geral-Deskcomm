import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export function timingSafeStringEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right) && a.length > 0 && b.length > 0;
}

/** Mantém os transportes de cada rota; segredo ausente nunca autoriza. */
export function autorizaCron(req: Pick<Request, "headers">, allowHeaderSecret = false): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const provided = bearer || (allowHeaderSecret ? req.headers.get("x-cron-secret")?.trim() ?? "" : "");
  const accepted = [env.INTERNAL_CRON_SECRET, env.INTERNAL_SECRET].filter(
    (secret): secret is string => typeof secret === "string" && secret.length > 0,
  );
  // Avalia todos os segredos configurados, sem parada no primeiro acerto.
  return accepted.reduce((matched, secret) => Number(timingSafeStringEqual(provided, secret)) | matched, 0) !== 0;
}
