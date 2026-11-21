import 'server-only';
import type { PublicationStore } from './publication-store';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';
import { readNativeStudioPublishToken, saveNativeStudioPublishToken,
  type NativeStudioPublishToken } from './native-studio-secret-vault';

const INTENT_KEY = 'native-studio/publish-token-creation-v1.json';
const RECOVERY_KEY = 'native-studio/publish-token-recovery-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const RECOVERY_DELAY_MS = 5 * 60_000;

export type PublishTokenTarget = Readonly<{
  accountId: string; zoneId: string; worker: string; name: string;
}>;
export type PublishTokenMetadata = PublishTokenTarget & Readonly<{
  id: string; status: 'active' | 'disabled' | 'expired';
  permissions: readonly string[];
}>;

/** Provider implementation must map Cloudflare's raw policy to these exact
 * resource identities, never infer scope from a token name alone.
 */
export interface PublishTokenProvider {
  assertWorker(target: PublishTokenTarget): Promise<void>;
  findByName(target: PublishTokenTarget): Promise<readonly PublishTokenMetadata[]>;
  create(target: PublishTokenTarget): Promise<{ id: string; value: string }>;
  roll(target: PublishTokenTarget, id: string): Promise<string>;
  verifyValue(target: PublishTokenTarget, id: string, value: string): Promise<boolean>;
}

type Intent = Readonly<{ target: PublishTokenTarget; startedAt: number }>;

function validIntent(intent: Intent | null, target: PublishTokenTarget, now: number): intent is Intent {
  return !!intent && !!intent.target && typeof intent.target === 'object' &&
    Object.keys(intent).sort().join() === 'startedAt,target' &&
    Object.keys(intent.target).sort().join() === 'accountId,name,worker,zoneId' &&
    Number.isSafeInteger(intent.startedAt) && intent.startedAt >= 0 &&
    intent.startedAt <= now && fingerprint(intent.target) === fingerprint(target);
}

function targetFor(scope: NativeStudioScope, accountId: string, zoneId: string): PublishTokenTarget {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value => UUID.test(value)) ||
      !HEX32.test(accountId) || !HEX32.test(zoneId))
    throw Error('native_studio_publish_target_invalid');
  return { accountId, zoneId, worker: `gnr8-${scope.siteId}-site`,
    name: `gnr8-${scope.siteId}-native-publish` };
}

function exactMetadata(target: PublishTokenTarget, values: readonly PublishTokenMetadata[]) {
  if (!Array.isArray(values) || values.length > 1) throw Error('native_studio_publish_token_ambiguous');
  const value = values[0];
  if (!value) return null;
  if (value.name !== target.name || value.accountId !== target.accountId ||
      value.zoneId !== target.zoneId || value.worker !== target.worker ||
      !HEX32.test(value.id) || value.status !== 'active' ||
      !Array.isArray(value.permissions) ||
      [...value.permissions].sort().join() !== 'Individual Workers Editor,Workers Routes Write')
    throw Error('native_studio_publish_token_scope_mismatch');
  return value;
}

async function verifySaved(provider: PublishTokenProvider, target: PublishTokenTarget,
  saved: NativeStudioPublishToken) {
  const live = exactMetadata(target, await provider.findByName(target));
  if (!live || live.id !== saved.tokenId ||
      !(await provider.verifyValue(target, saved.tokenId, saved.value)))
    throw Error('native_studio_publish_token_unverified');
  return saved;
}

/** One creation claim per site. A missing token after an ambiguous create is
 * left pending rather than risking a second provider token. An existing exact
 * token can be rolled after the in-flight creation window and saved securely.
 */
export async function ensureNativeStudioPublishToken(
  scope: NativeStudioScope,
  accountId: string,
  zoneId: string,
  store: Pick<PublicationStore, 'read' | 'claim'>,
  masterKey: string,
  provider: PublishTokenProvider,
  now = Date.now,
): Promise<NativeStudioPublishToken> {
  const target = targetFor(scope, accountId, zoneId);
  const saved = await readNativeStudioPublishToken(scope, store, accountId, masterKey);
  await provider.assertWorker(target);
  if (saved) return verifySaved(provider, target, saved);
  const existing = exactMetadata(target, await provider.findByName(target));
  let intent = await store.read<Intent>(INTENT_KEY);
  if (intent && !validIntent(intent, target, now()))
    throw Error('native_studio_publish_token_intent_conflict');
  if (!intent) {
    if (existing) throw Error('native_studio_publish_token_unowned');
    const proposed = { target, startedAt: now() };
    const won = await store.claim(INTENT_KEY, proposed);
    intent = await store.read<Intent>(INTENT_KEY);
    if (!validIntent(intent, target, now()))
      throw Error('native_studio_publish_token_intent_conflict');
    if (!won) throw Error('native_studio_publish_token_pending');
    let created: { id: string; value: string };
    try { created = await provider.create(target); }
    catch {
      // The provider may have created the token despite a lost response. A
      // later retry reconciles it; this invocation never creates again.
      throw Error('native_studio_publish_token_pending');
    }
    // A successful create response is not proof of least privilege. Check the
    // provider's effective policy and token identity before sealing its value.
    const live = exactMetadata(target, await provider.findByName(target));
    if (!live || live.id !== created.id ||
        !(await provider.verifyValue(target, created.id, created.value)))
      throw Error('native_studio_publish_token_unverified');
    const token = await saveNativeStudioPublishToken(scope, store,
      { accountId, tokenId: created.id, worker: target.worker, value: created.value }, masterKey);
    return verifySaved(provider, target, token);
  }
  if (!existing || now() - intent.startedAt < RECOVERY_DELAY_MS)
    throw Error('native_studio_publish_token_pending');
  const raced = await readNativeStudioPublishToken(scope, store, accountId, masterKey);
  if (raced) return verifySaved(provider, target, raced);
  if (!await store.claim(RECOVERY_KEY, { target, tokenId: existing.id }))
    throw Error('native_studio_publish_token_pending');
  const recovered = await provider.roll(target, existing.id);
  // A roll can succeed remotely while returning a stale or unusable value.
  // Never seal that value before Cloudflare verifies its effective identity.
  const live = exactMetadata(target, await provider.findByName(target));
  if (!live || live.id !== existing.id ||
      !(await provider.verifyValue(target, existing.id, recovered)))
    throw Error('native_studio_publish_token_unverified');
  const token = await saveNativeStudioPublishToken(scope, store,
    { accountId, tokenId: existing.id, worker: target.worker, value: recovered }, masterKey);
  return verifySaved(provider, target, token);
}
