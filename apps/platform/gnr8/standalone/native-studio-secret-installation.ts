import 'server-only';
import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublishTokenProvider } from './native-studio-publish-token-issuer';
import { ensureNativeStudioPublishToken } from './native-studio-publish-token-issuer';
import { assertNativeStudioSharedSecrets, nativeStudioRuntimeSecrets,
  type NativeStudioSharedSecrets } from './native-studio-runtime-secrets';
import { installNativeStudioSecrets } from './cloudflare-studio-secrets';

const INTENT = 'native-studio/secret-install-intent-v1.json';
const RECEIPT = 'native-studio/secret-install-receipt-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SECRET_NAMES = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];

async function assertBoundSite(scope: NativeStudioScope, client: SupabaseClient) {
  const [site, repository] = await Promise.all([
    client.from('sites').select('domain').eq('id', scope.siteId)
      .eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle(),
    client.from('gnr8_site_github_repository_bindings')
      .select('github_owner,repository,repository_id,binding_state')
      .eq('site_id', scope.siteId).eq('agency_id', scope.agencyId)
      .eq('client_id', scope.clientId).maybeSingle(),
  ]);
  const domain = site.data?.domain;
  const bound = repository.data;
  if (site.error || repository.error || typeof domain !== 'string' ||
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain) ||
      bound?.binding_state !== 'bound' ||
      !/^[A-Za-z0-9-]{1,39}$/.test(bound.github_owner) ||
      !/^[a-z0-9][a-z0-9-]{0,62}$/.test(bound.repository) ||
      !Number.isSafeInteger(Number(bound.repository_id)) || Number(bound.repository_id) < 1)
    throw Error('native_studio_site_not_bound');
}

/** A one-attempt provisioning step, not a ready-site receipt. The caller must
 * already have created both Workers and isolated the per-site private store.
 * Container health and the native editor flow need separate verification.
 */
export async function installNativeStudioRuntimeSecrets(
  scope: NativeStudioScope,
  accountId: string,
  zoneId: string,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  vaultKey: string,
  shared: NativeStudioSharedSecrets,
  publishTokenProvider: PublishTokenProvider,
  studioSetupCredential: string,
  siteClient: SupabaseClient,
  transport: typeof fetch = fetch,
): Promise<{ worker: string; secretNames: readonly string[]; versionId: string }> {
  assertNativeStudioSharedSecrets(shared);
  if (typeof studioSetupCredential !== 'string' ||
      studioSetupCredential.length < 16 || /\s/.test(studioSetupCredential))
    throw Error('native_studio_secret_install_invalid');
  await assertBoundSite(scope, siteClient);
  await ensureNativeStudioPublishToken(scope, accountId, zoneId,
    store, vaultKey, publishTokenProvider);
  const runtime = await nativeStudioRuntimeSecrets(scope, store,
    shared, accountId, vaultKey);
  const worker = `gnr8-${scope.siteId}-studio`;
  const identity = createHmac('sha256', Buffer.from(vaultKey, 'hex'))
    .update(JSON.stringify({ scope, accountId, zoneId, runtime })).digest('hex');
  const expected = { accountId, worker, identity };
  const intent = await store.read<typeof expected>(INTENT);
  if (intent && JSON.stringify(intent) !== JSON.stringify(expected))
    throw Error('native_studio_secret_install_intent_conflict');
  async function savedReceipt() {
    const receipt = await store.read<{ identity: string; worker: string;
      secretNames: readonly string[]; versionId: string }>(RECEIPT);
    if (!receipt) return null;
    if (receipt.identity !== identity || receipt.worker !== worker ||
        !UUID.test(receipt.versionId) ||
        JSON.stringify(receipt.secretNames) !== JSON.stringify(SECRET_NAMES))
      throw Error('native_studio_secret_install_receipt_conflict');
    return { worker, secretNames: receipt.secretNames, versionId: receipt.versionId };
  }
  if (intent) {
    const receipt = await savedReceipt();
    if (receipt) return receipt;
    throw Error('native_studio_secret_install_pending_review');
  }
  const claimed = await store.claim(INTENT, expected);
  const savedIntent = await store.read<typeof expected>(INTENT);
  if (!savedIntent || JSON.stringify(savedIntent) !== JSON.stringify(expected))
    throw Error('native_studio_secret_install_intent_conflict');
  if (!claimed) throw Error('native_studio_secret_install_pending_review');
  const result = await installNativeStudioSecrets(scope, accountId,
    studioSetupCredential, runtime, transport);
  await store.claim(RECEIPT, { identity, ...result });
  const receipt = await savedReceipt();
  if (!receipt) throw Error('native_studio_secret_install_receipt_unconfirmed');
  if (receipt.versionId !== result.versionId)
    throw Error('native_studio_secret_install_receipt_conflict');
  return receipt;
}
