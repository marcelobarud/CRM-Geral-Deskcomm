import { instanteDe, partesNoFuso } from "@/lib/agenda/fuso";
import { fusoValido } from "@/lib/tempo/fusos";

export class CampaignLocalTimeError extends Error {
  constructor(readonly code: "invalid" | "timezone" | "nonexistent") {
    super(code);
    this.name = "CampaignLocalTimeError";
  }
}

/** Interpreta o valor datetime-local no fuso da organização e devolve um instante UTC. */
export function campaignScheduleInstant(value: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new CampaignLocalTimeError("invalid");
  if (!fusoValido(timezone)) throw new CampaignLocalTimeError("timezone");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const check = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute
  ) {
    throw new CampaignLocalTimeError("invalid");
  }
  const instant = instanteDe({ ano: year, mes: month, dia: day, hora: hour, minuto: minute }, timezone);
  const resolved = partesNoFuso(instant, timezone);
  if (
    resolved.ano !== year || resolved.mes !== month || resolved.dia !== day ||
    resolved.hora !== hour || resolved.minuto !== minute
  ) {
    throw new CampaignLocalTimeError("nonexistent");
  }
  return instant;
}
