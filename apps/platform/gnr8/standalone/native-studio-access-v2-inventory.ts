import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { SupabasePublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
type Site = Awaited<ReturnType<typeof configuredNativeStudioBootstrapSite>>;
type Store = Pick<SupabasePublicationStore, 'read' | 'getBytes'>;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const OWNER = /^[A-Za-z0-9-]{1,39}$/;
const REPO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

type Row = { site_id: string; agency_id: string; client_id: string;
  github_owner: string; repository: string; repository_id: number | string;
  binding_state: string };
type Handoff = { scope: NativeStudioScope; sourceId: string; commit: string;
  site: unknown; workerId: string; files: unknown[] };

const defaults = {
  site: configuredNativeStudioBootstrapSite,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
  source: readStoredVerifiedAstroStudio,
};

/** Read one bounded page of bound site scopes before the ready-binding writer
 * exists. Missing handoff and verified v1 sources are not Access candidates.
 * Every v2 entry is re-bound to current site/repository data and fully checked
 * against immutable source bytes; this performs no provider mutation. */
export async function listVerifiedNativeStudioAccessV2Scopes(input: {
  client: SupabaseClient; cursor?: string; limit?: number;
}, env: Environment = process.env, deps = defaults) {
  const { client, cursor, limit = DEFAULT_LIMIT } = input ?? {} as typeof input;
  if (!client || (cursor !== undefined && !UUID.test(cursor)) ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_LIMIT)
    throw Error('native_studio_access_inventory_input_invalid');
  const normalizedCursor = cursor?.toLowerCase();
  let query = client.from('gnr8_site_github_repository_bindings')
    .select('site_id,agency_id,client_id,github_owner,repository,repository_id,binding_state')
    .eq('binding_state', 'bound').order('site_id', { ascending: true });
  if (normalizedCursor) query = query.gt('site_id', normalizedCursor);
  const listed = await query.limit(limit + 1);
  if (listed.error || !Array.isArray(listed.data) || listed.data.length > limit + 1)
    throw Error('native_studio_access_inventory_unavailable');
  const rows = listed.data as Row[];
  let prior = normalizedCursor ?? '';
  for (const row of rows) {
    if (!row || typeof row.site_id !== 'string' || !UUID.test(row.site_id) ||
        row.site_id <= prior)
      throw Error('native_studio_access_inventory_row_invalid');
    prior = row.site_id;
  }
  const page = rows.slice(0, limit);
  const entries: Array<{ scope: NativeStudioScope; sourceId: string }> = [];
  const errors: Array<{ siteId: string; code: string }> = [];
  for (const row of page) {
    if (![row.agency_id, row.client_id].every(value =>
        typeof value === 'string' && UUID.test(value)) ||
        row.binding_state !== 'bound' || !OWNER.test(row.github_owner) ||
        !REPO.test(row.repository) ||
        !(typeof row.repository_id === 'number' &&
            Number.isSafeInteger(row.repository_id) && row.repository_id > 0 ||
          typeof row.repository_id === 'string' &&
            /^[1-9][0-9]*$/.test(row.repository_id) &&
            Number.isSafeInteger(Number(row.repository_id)))) {
      errors.push({ siteId: row.site_id, code: 'row_invalid' });
      continue;
    }
    const scope = { agencyId: row.agency_id,
      clientId: row.client_id, siteId: row.site_id };
    let code = 'handoff_invalid';
    try {
      const store: Store = deps.store(client, scope, env);
      const handoff = await store.read<Handoff>('native-studio/build-handoff-v1.json');
      if (!handoff) continue;
      code = 'target_invalid';
      const site: Site = await deps.site(scope, client, env);
      if (site.siteId !== scope.siteId ||
          site.repository !== `${row.github_owner}/${row.repository}` ||
          site.repositoryId !== String(row.repository_id))
        throw Error('target_changed');
      code = 'handoff_invalid';
      const expectedSite = { siteId: site.siteId, repository: site.repository,
        branch: site.branch, studioOrigin: site.studioOrigin,
        accountId: site.accountId };
      if (!same(handoff.scope, scope) || !SHA.test(handoff.sourceId) ||
          !COMMIT.test(handoff.commit) || !HEX32.test(handoff.workerId) ||
          !Array.isArray(handoff.files) || handoff.files.length === 0 ||
          !same(handoff.site, expectedSite))
        throw Error('handoff_invalid');
      code = 'source_invalid';
      const receipt = await store.read<{ format?: string; identitySha256?: string }>(
        `native-sources/${handoff.sourceId}.json`);
      if (!receipt || receipt.identitySha256 !== handoff.sourceId ||
          !['gnr8-native-studio-source:v1', 'gnr8-native-studio-source:v2']
            .includes(receipt.format ?? ''))
        throw Error('source_invalid');
      const verified = await deps.source({ store, sourceId: handoff.sourceId, site });
      if (verified.receipt.format !== receipt.format ||
          verified.receipt.identitySha256 !== handoff.sourceId)
        throw Error('source_invalid');
      if (receipt.format === 'gnr8-native-studio-source:v2')
        entries.push({ scope, sourceId: handoff.sourceId });
    } catch {
      errors.push({ siteId: row.site_id, code });
    }
  }
  return { entries, errors,
    nextCursor: rows.length > limit ? page[page.length - 1].site_id : null };
}
