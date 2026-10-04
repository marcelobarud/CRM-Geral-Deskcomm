import { describe, expect, it, vi } from "vitest";
import type pg from "pg";
import type { JobRow } from "@/lib/agent-engine/queue/queue";
import { createCampaignPreparationHandler } from "./campaign-preparation";

const job: JobRow = {
  id: "f532ae47-0da1-4eb0-ac55-7e5ed31cf71d",
  organization_id: "ad26b471-eb16-4f86-a8bb-8a999e0b1acd",
  contact_id: null,
  kind: "campaign_prepare",
  source_event_id: "2ef8e6dd-462d-4a6c-977b-7f526b6e8063",
  payload: { campaign_id: "d9cc2a64-f43b-4d08-8528-1f833fce3df4", batch: 2 },
  status: "running",
  priority: 40,
  run_after: new Date("2026-10-04T12:00:00.000Z"),
  attempts: 1,
  max_attempts: 5,
  last_error: null,
  locked_by: "worker-test",
  locked_at: new Date("2026-10-04T12:00:01.000Z"),
  claim_acquired_at: "2026-10-04 12:00:01+00",
  created_at: new Date("2026-10-04T11:00:00.000Z"),
};

describe("campaign preparation worker adapter", () => {
  it("delegates the tenant-scoped batch and exact lease to the production RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { status: "prepared" }, error: null });
    const handler = createCampaignPreparationHandler({ rpc } as never);

    await handler(job, {} as pg.Pool, { workerId: "worker-test" });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("fn_campaign_prepare_batch", {
      p_org: job.organization_id,
      p_campaign: job.payload.campaign_id,
      p_batch: 2,
      p_job: job.id,
      p_worker: "worker-test",
      p_claim: job.claim_acquired_at,
    });
    expect(rpc.mock.calls[0]?.[0]).not.toMatch(/send|provider|ledger/i);
  });

  it("retries transient storage errors without attempting another effect", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { code: "08006", message: "private detail" } });
    const handler = createCampaignPreparationHandler({ rpc } as never);

    await expect(handler(job, {} as pg.Pool, { workerId: "worker-test" }))
      .rejects.toThrow("campaign_preparation_failed");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("marks the campaign failed through a sanitized terminal RPC after retry exhaustion", async () => {
    const finalAttempt = { ...job, attempts: 5 };
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: "XX000", message: "private detail" } })
      .mockResolvedValueOnce({ data: { status: "failed" }, error: null });
    const handler = createCampaignPreparationHandler({ rpc } as never);

    await handler(finalAttempt, {} as pg.Pool, { workerId: "worker-test" });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "fn_campaign_prepare_batch",
      "fn_campaign_fail_batch",
    ]);
  });
});
