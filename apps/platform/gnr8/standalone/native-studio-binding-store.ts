import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { configuration } from '../../../../scripts/stacki/prepare-native-studio.mjs';
import { readNativeStudioBinding } from './native-studio-binding';

export type NativeStudioScope = { agencyId: string; clientId: string; siteId: string };
type Row = {
  site_id: string; agency_id: string; client_id: string; studio_origin: string;
  repository: string; repository_id: number; branch: string; cloudflare_account_id: string;
  github_app_id: string; github_installation_id: string; github_client_id: string;
  studio_worker: string; site_worker: string; draft_bucket: string; verified_at: string;
};

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
// The deployment map predates verified receipts for these four retained sites.
// New sites must use the service-role receipt after provisioning succeeds.
const legacySiteIds = new Set([
  '2e7146cd-e516-4088-94ad-6cac90cb17f4', // Ladja Žaba
  'fb4b6b9a-f2ba-4ffb-8240-1d988ebb916e', // Logatčan
  '9ff5613e-1625-43f1-844e-c5c91a813d4f', // CHS
  'dbdd5b9f-6ae1-4736-917b-20adf94838c6', // ViroiDoc
]);
const rowColumns = 'site_id,agency_id,client_id,studio_origin,repository,repository_id,branch,cloudflare_account_id,github_app_id,github_installation_id,github_client_id,studio_worker,site_worker,draft_bucket,verified_at';

export function nativeStudioSiteFromRow(scope: NativeStudioScope, row: Row) {
  if (!row || ![scope.siteId, scope.agencyId, scope.clientId].every(value => uuid.test(value)) ||
      row.site_id !== scope.siteId || row.agency_id !== scope.agencyId || row.client_id !== scope.clientId ||
      !Number.isSafeInteger(row.repository_id) || row.repository_id < 1 ||
      !Number.isFinite(Date.parse(row.verified_at)) ||
      row.studio_worker !== `gnr8-${scope.siteId}-studio` ||
      row.site_worker !== `gnr8-${scope.siteId}-site` ||
      row.draft_bucket !== `gnr8-${scope.siteId}-drafts`)
    throw Error('native_studio_binding_invalid');
  try {
    return configuration({ siteId: scope.siteId, repository: row.repository,
      repositoryId: String(row.repository_id), branch: row.branch,
      studioOrigin: row.studio_origin, accountId: row.cloudflare_account_id,
      appId: row.github_app_id, installationId: row.github_installation_id,
      clientId: row.github_client_id }).site;
  } catch { throw Error('native_studio_binding_invalid'); }
}

/** The immutable, service-role-only receipt is written after provider readback.
 * The configured map remains a transition fallback for the four existing sites.
 */
export async function readNativeStudioBindingForScope(
  scope: NativeStudioScope,
  client: SupabaseClient | null = getSupabaseServiceRoleClient(),
  source = process.env.GNR8_NATIVE_STUDIO_SITES,
) {
  if (![scope.agencyId, scope.clientId, scope.siteId].every(value => uuid.test(value)))
    throw Error('native_studio_binding_invalid');
  if (client) {
    const result = await client.from('gnr8_native_studio_bindings').select(rowColumns)
      .eq('agency_id', scope.agencyId).eq('client_id', scope.clientId)
      .eq('site_id', scope.siteId).maybeSingle();
    if (!result.error && result.data) {
      const site = nativeStudioSiteFromRow(scope, result.data as Row);
      const [currentSite, currentRepository] = await Promise.all([
        client.from('sites').select('domain').eq('id', scope.siteId)
          .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
        client.from('gnr8_site_github_repository_bindings')
          .select('github_owner,repository,repository_id,binding_state')
          .eq('site_id', scope.siteId).eq('agency_id', scope.agencyId)
          .eq('client_id', scope.clientId).maybeSingle(),
      ]);
      if (currentSite.error || currentRepository.error ||
          `https://${String(currentSite.data?.domain ?? '').toLowerCase()}` !== site.studioOrigin ||
          currentRepository.data?.binding_state !== 'bound' ||
          `${currentRepository.data.github_owner}/${currentRepository.data.repository}` !== site.repository ||
          Number(currentRepository.data.repository_id) !== Number(site.repositoryId))
        throw Error('native_studio_binding_stale');
      return site;
    }
    if (result.error && !source) throw Error('native_studio_binding_unavailable');
  }
  if (!legacySiteIds.has(scope.siteId)) throw Error('native_studio_binding_missing');
  return readNativeStudioBinding(scope.siteId, source);
}

export async function nativeStudioUrlForScope(scope: NativeStudioScope) {
  try { return `${(await readNativeStudioBindingForScope(scope)).studioOrigin}/studio`; }
  catch { return null; }
}
