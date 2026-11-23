import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from '@/gnr8/inngest/client';
import { SCHEDULED_NATIVE_STUDIO_RECONCILIATION } from
  '@/gnr8/standalone/native-studio-reconciliation-authority';

export const NATIVE_STUDIO_ACCESS_SCHEDULED_JOB_ID =
  'native-studio-access-scheduled-job';
export const NATIVE_STUDIO_ACCESS_SCHEDULED_CRON = '*/15 * * * *';
const PAGE_SIZE = 100;
const MAX_PAGES = 10;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SOURCE = /^[a-f0-9]{64}$/;
type Scope = { agencyId: string; clientId: string; siteId: string };
type Entry = { scope: Scope; sourceId: string };
type InventoryError = { siteId: string; code: string };
type Page = { entries: Entry[]; errors: InventoryError[];
  nextCursor: string | null };

const defaults = {
  enabled: () => process.env.GNR8_NATIVE_STUDIO_ACCESS_RECONCILE_ENABLED === '1' &&
    process.env.GNR8_NATIVE_STUDIO_ACCESS_SCHEDULED_ENABLED === '1',
  client: async () => {
    const { getSupabaseServiceRoleClient } = await import('@/src/supabase/service-role-server');
    return getSupabaseServiceRoleClient();
  },
  inventory: async (client: SupabaseClient, cursor: string | undefined): Promise<Page> => {
    const { listVerifiedNativeStudioAccessV2Scopes } = await import(
      '@/gnr8/standalone/native-studio-access-v2-inventory');
    return listVerifiedNativeStudioAccessV2Scopes({ client, cursor, limit: PAGE_SIZE });
  },
  reconcile: async (input: Entry & { client: SupabaseClient }) => {
    const { configuredNativeStudioAccessReconciliation } = await import(
      '@/gnr8/standalone/native-studio-configured-access-reconciliation');
    return configuredNativeStudioAccessReconciliation({ ...input,
      actor: SCHEDULED_NATIVE_STUDIO_RECONCILIATION });
  },
  log: (record: { scope?: Scope; siteId?: string; state: string;
    code?: string; sourceId?: string; policyId?: string; commit?: string;
    principalCount?: number; removedCount?: number; sessionState?: string; scanned?: number;
    failures?: number; pending?: number }) => {
    const line = { actorType: 'system', cause: 'system', ...record };
    if (record.state === 'failed' || record.state === 'needs-attention')
      console.error('[gnr8.native_studio.access_reconciliation]', line);
    else console.info('[gnr8.native_studio.access_reconciliation]', line);
  },
};

function valid(entry: Entry): boolean {
  return !!entry && !!entry.scope &&
    Object.keys(entry).sort().join() === 'scope,sourceId' &&
    Object.keys(entry.scope).sort().join() === 'agencyId,clientId,siteId' &&
    [entry.scope.agencyId, entry.scope.clientId, entry.scope.siteId]
      .every(value => typeof value === 'string' && UUID.test(value)) &&
    typeof entry.sourceId === 'string' && SOURCE.test(entry.sourceId);
}

/** Production cron has no event payload and chooses no user-supplied target.
 * Read every page before provider work; overflow fails visibly instead of
 * repeatedly processing only the first page and starving later sites. */
export async function runNativeStudioScheduledAccessReconciliation(
  deps: typeof defaults = defaults,
) {
  if (!deps.enabled()) return { state: 'disabled' as const,
    scanned: 0, verified: 0, pending: 0, failures: 0,
    inventoryErrors: [], results: [] };
  const client = await deps.client();
  if (!client) throw Error('native_studio_access_scheduled_store_unavailable');
  const entries: Entry[] = [];
  const inventoryErrors: InventoryError[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const page = await deps.inventory(client, cursor);
    if (!page || !Array.isArray(page.entries) ||
        !Array.isArray(page.errors) ||
        (page.nextCursor !== null &&
          (typeof page.nextCursor !== 'string' || !UUID.test(page.nextCursor) ||
           (cursor !== undefined && page.nextCursor <= cursor))))
      throw Error('native_studio_access_scheduled_inventory_invalid');
    for (const entry of page.entries) {
      if (!valid(entry) || seen.has(entry.scope.siteId))
        throw Error('native_studio_access_scheduled_inventory_invalid');
      seen.add(entry.scope.siteId);
      entries.push(entry);
    }
    for (const error of page.errors) {
      if (!error || typeof error.siteId !== 'string' ||
          error.siteId.length > 128 || !['row_invalid', 'target_invalid',
            'handoff_invalid', 'source_invalid'].includes(error.code))
        throw Error('native_studio_access_scheduled_inventory_invalid');
      inventoryErrors.push(error);
    }
    if (page.nextCursor === null) break;
    if (pageIndex === MAX_PAGES - 1)
      throw Error('native_studio_access_scheduled_inventory_limit');
    cursor = page.nextCursor;
  }
  let verified = 0, pending = 0, failures = inventoryErrors.length;
  const results: Array<{ scope: Scope; state: 'verified' | 'pending-review' | 'failed' }> = [];
  for (const error of inventoryErrors)
    deps.log({ siteId: error.siteId, state: 'failed', code: error.code });
  for (const entry of entries) {
    try {
      const result = await deps.reconcile({ ...entry, client });
      if (!result || result.scope.siteId !== entry.scope.siteId ||
          result.scope.agencyId !== entry.scope.agencyId ||
          result.scope.clientId !== entry.scope.clientId ||
          result.sourceId !== entry.sourceId ||
          result.actorType !== 'system' ||
          !['verified', 'pending-review'].includes(result.state))
        throw Error('native_studio_access_scheduled_result_invalid');
      if (result.state === 'verified') verified++;
      else pending++;
      results.push({ scope: entry.scope, state: result.state });
      deps.log({ scope: entry.scope, sourceId: entry.sourceId,
        state: result.state,
        policyId: typeof result.policyId === 'string' ? result.policyId : undefined,
        commit: typeof result.commit === 'string' ? result.commit : undefined,
        principalCount: Array.isArray(result.principals) ?
          result.principals.length : undefined,
        removedCount: Number.isSafeInteger(result.removedCount) ?
          result.removedCount : undefined,
        sessionState: typeof result.sessions === 'string' ?
          result.sessions : undefined });
    } catch (error) {
      failures++;
      results.push({ scope: entry.scope, state: 'failed' });
      const code = error instanceof Error &&
        /^native_studio_[a-z0-9_]+$/.test(error.message) ?
        error.message : 'internal_error';
      deps.log({ scope: entry.scope, sourceId: entry.sourceId,
        state: 'failed', code });
    }
  }
  const summary = { state: failures || pending ? 'needs-attention' as const :
    'verified' as const,
    scanned: entries.length + inventoryErrors.length, verified, pending,
    failures, inventoryErrors, results };
  if (failures || pending) {
    deps.log({ state: 'needs-attention', scanned: summary.scanned,
      failures, pending });
    throw Error('native_studio_access_scheduled_needs_attention');
  }
  return summary;
}

export const nativeStudioAccessScheduledJob = inngest.createFunction({
  id: NATIVE_STUDIO_ACCESS_SCHEDULED_JOB_ID, retries: 0,
  concurrency: { limit: 1 },
}, { cron: NATIVE_STUDIO_ACCESS_SCHEDULED_CRON },
async ({ step }) => step.run('scan-access-v2-sites',
  () => runNativeStudioScheduledAccessReconciliation()));
