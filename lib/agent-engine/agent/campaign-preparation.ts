import type pg from 'pg';
import type { JobRow } from '@/lib/agent-engine/queue/queue';

type CampaignJobHandler = (job: JobRow, pool: pg.Pool, ctx: { workerId: string }) => Promise<void>;

type CampaignRpcClient = {
  rpc(
    name: 'fn_campaign_prepare_batch' | 'fn_campaign_fail_batch',
    args: Record<string, string | number>,
  ): PromiseLike<{ data: unknown; error: { code?: string; message?: string } | null }>;
};

function campaignId(job: JobRow): string {
  const value = job.payload.campaign_id;
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new Error('campaign_payload_invalid');
  }
  return value;
}

function batchNumber(job: JobRow): number {
  const value = job.payload.batch;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new Error('campaign_payload_invalid');
  }
  return value;
}

/**
 * Worker adapter for the production, tenant-scoped preparation RPC. The RPC
 * verifies the queue lease and never calls a transport or writes a send ledger.
 */
export function createCampaignPreparationHandler(client: CampaignRpcClient): CampaignJobHandler {
  return async (job, _pool: pg.Pool, { workerId }) => {
    if (job.kind !== 'campaign_prepare') throw new Error('campaign_job_kind_invalid');
    const claim = job.claim_acquired_at;
    if (!claim) throw new Error('campaign_claim_missing');
    const common = {
      p_org: job.organization_id,
      p_campaign: campaignId(job),
      p_job: job.id,
      p_worker: workerId,
      p_claim: claim,
    };
    const { error } = await client.rpc('fn_campaign_prepare_batch', {
      ...common,
      p_batch: batchNumber(job),
    });
    if (!error) return;

    if (job.attempts >= job.max_attempts) {
      const failed = await client.rpc('fn_campaign_fail_batch', common);
      if (!failed.error) return;
    }
    // Do not copy PostgREST/SQL messages into job logs or recipient-facing state.
    throw new Error('campaign_preparation_failed');
  };
}
