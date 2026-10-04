import { describe, expect, it } from "vitest";
import { CampaignLocalTimeError, campaignScheduleInstant } from "./time";

describe("campaignScheduleInstant", () => {
  it("converte hora de parede com o fuso explícito da organização", () => {
    expect(campaignScheduleInstant("2026-10-05T09:30", "America/Sao_Paulo").toISOString())
      .toBe("2026-10-05T12:30:00.000Z");
  });

  it("rejeita horário de parede inexistente durante a mudança de verão", () => {
    expect(() => campaignScheduleInstant("2026-03-08T02:30", "America/New_York"))
      .toThrowError(new CampaignLocalTimeError("nonexistent"));
  });

  it("rejeita data inválida e fuso incompatível", () => {
    expect(() => campaignScheduleInstant("2026-02-30T10:00", "America/Sao_Paulo"))
      .toThrowError(CampaignLocalTimeError);
    expect(() => campaignScheduleInstant("2026-10-05T10:00", "sem-fuso"))
      .toThrowError(new CampaignLocalTimeError("timezone"));
  });
});
