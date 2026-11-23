import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';
import { fingerprint } from './publication-contract';
import { inspectCurrentNativeStudioAccessOwnerPolicy } from './native-studio-access-policy-reconciliation';
import { requireAgencyBackgroundActor } from '../../src/auth/agency-background-action';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX32 = /^[a-f0-9]{32}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const COMMIT = /^[a-f0-9]{40,64}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

type PolicyProof = { state: 'observed-exact-access-policy'; appId: string;
  policyId: string; principals: string[] };
type Store = Pick<PublicationStore, 'read' | 'claim' | 'put'>;
type Input = { scope: NativeStudioScope; client: SupabaseClient; store: Store;
  accountId: string; appId: string; credential: string; actor: string;
  previousCommit: string; previousPrincipals: string[]; policyProof: PolicyProof };
const defaults = { policy: inspectCurrentNativeStudioAccessOwnerPolicy,
  actor: requireAgencyBackgroundActor };

/** A removal signs out every user of this one bound Access application.
 * Cloudflare offers no token-level readback, so an ambiguous POST is never
 * replayed automatically. A durable success receipt proves only that the
 * revoke API accepted the request, not that a preview host is protected. */
export async function revokeBoundNativeStudioAccessSessions(input: Input,
  transport: typeof fetch = fetch, deps = defaults) {
  const { scope, client, store, accountId, appId, credential, actor,
    previousCommit, previousPrincipals, policyProof } = input ?? {} as Input;
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value =>
      typeof value === 'string' && UUID.test(value)) || !client || !store ||
      typeof store.read !== 'function' || typeof store.claim !== 'function' ||
      typeof store.put !== 'function' || !HEX32.test(accountId) ||
      !APP_ID.test(appId) || !TOKEN.test(credential) || !UUID.test(actor) ||
      !COMMIT.test(previousCommit) || !Array.isArray(previousPrincipals) ||
      !policyProof || policyProof.state !== 'observed-exact-access-policy' ||
      policyProof.appId !== appId || !UUID.test(policyProof.policyId) ||
      !Array.isArray(policyProof.principals) || typeof transport !== 'function')
    throw Error('native_studio_access_session_revoke_input_invalid');
  const removed = previousPrincipals.filter(principal =>
    !policyProof.principals.includes(principal));
  if (!removed.length)
    throw Error('native_studio_access_session_revoke_no_removal');
  const exact = async () => {
    await deps.actor(client, { userId: actor, agencyId: scope.agencyId,
      action: 'publish' });
    const current = await deps.policy({ scope, client, store, accountId,
      appId, credential }, transport);
    if (fingerprint(current) !== fingerprint(policyProof))
      throw Error('native_studio_access_session_revoke_policy_changed');
  };
  await exact();
  const identity = fingerprint({ scope, accountId, appId,
    previousCommit, previousPrincipals, policyProof });
  const intent = { identity, scope, accountId, appId, previousCommit,
    previousPrincipals, policyProof };
  const intentKey = `native-studio/access-session-revoke-${identity}.json`;
  const receiptKey = `native-studio/access-session-revoke-result-${identity}.json`;
  const prior = await store.read<typeof intent>(intentKey);
  if (prior && fingerprint(prior) !== fingerprint(intent))
    throw Error('native_studio_access_session_revoke_intent_conflict');
  const receipt = await store.read<{ identity: string; state: string }>(receiptKey);
  if (receipt) {
    if (!prior || receipt.identity !== identity || receipt.state !== 'revoke-accepted')
      throw Error('native_studio_access_session_revoke_receipt_conflict');
    return { state: 'revoke-accepted' as const, appId, removed };
  }
  if (prior) throw Error('native_studio_access_session_revoke_pending_review');
  const won = await store.claim(intentKey, intent);
  if (fingerprint(await store.read(intentKey)) !== fingerprint(intent))
    throw Error('native_studio_access_session_revoke_intent_conflict');
  if (!won) throw Error('native_studio_access_session_revoke_pending_review');
  await exact();
  let accepted = false;
  try {
    const response = await transport(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
      `/access/apps/${appId}/revoke_tokens`, { method: 'POST', redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json' } });
    const body: unknown = await response.json();
    accepted = response.ok && object(body) && body.success === true &&
      object(body.result) && Object.keys(body.result).length === 0;
  } catch { /* The response may be lost after revocation. */ }
  if (!accepted) throw Error('native_studio_access_session_revoke_pending_review');
  await store.put(receiptKey, { identity, state: 'revoke-accepted' });
  await exact();
  return { state: 'revoke-accepted' as const, appId, removed };
}
