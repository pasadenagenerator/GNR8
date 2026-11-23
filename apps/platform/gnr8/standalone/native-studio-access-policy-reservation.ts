import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicationStore } from './publication-store';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { inspectCloudflareStudioAccessApp } from './cloudflare-studio-access-app';
import { inspectNativeStudioAccessPolicyReadback } from './cloudflare-studio-access-policy';

const KEY = 'native-studio/access-policy-create-intent-v1.json';
const APP_INTENT = 'native-studio/access-app-create-intent-v1.json';
const APP_BOUND = 'native-studio/access-app-bound-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX32 = /^[a-f0-9]{32}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;
const EMAIL = /^[a-z0-9][a-z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);

type Target = Awaited<ReturnType<typeof readNativeStudioBootstrapTarget>>;
type Candidates = Awaited<ReturnType<typeof readCurrentNativeStudioAccessCandidates>>;
type Intent = { identity: string; scope: NativeStudioScope; accountId: string;
  appId: string; target: Target; principals: string[] };

const defaults = {
  target: readNativeStudioBootstrapTarget,
  candidates: readCurrentNativeStudioAccessCandidates,
  app: inspectCloudflareStudioAccessApp,
};

function principalsFrom(candidates: Candidates): string[] {
  if (!Array.isArray(candidates) || !candidates.length || candidates.length > 200)
    throw Error('native_studio_access_policy_identity_unverified');
  const principals = candidates.map(candidate => {
    if (!object(candidate) || typeof candidate.principal !== 'string' ||
        !candidate.principal.startsWith('access:') ||
        !EMAIL.test(candidate.principal.slice(7)))
      throw Error('native_studio_access_policy_identity_unverified');
    return candidate.principal;
  }).sort();
  if (new Set(principals).size !== principals.length)
    throw Error('native_studio_access_policy_identity_unverified');
  return principals;
}

function exactIntent(value: unknown, expected: Intent): value is Intent {
  return object(value) && Object.keys(value).sort().join() ===
    'accountId,appId,identity,principals,scope,target' && same(value, expected);
}

/** A complete, empty list or one exact policy. Any other provider state is a
 * conflict. List pagination is not permission to assume an empty policy set.
 */
async function readPolicyList(url: string, credential: string,
  transport: typeof fetch, principals: string[]) {
  let body: unknown;
  try {
    const response = await transport(url, { method: 'GET', redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json' } });
    if (!response.ok) throw Error();
    body = await response.json();
  } catch { throw Error('native_studio_access_policy_provider_unavailable'); }
  if (!object(body) || body.success !== true || !Array.isArray(body.result) ||
      !object(body.result_info) || body.result_info.page !== 1 ||
      body.result_info.count !== body.result.length ||
      body.result_info.total_count !== body.result.length ||
      (body.result_info.total_pages !== undefined &&
        ![body.result.length ? 1 : 0, 1].includes(body.result_info.total_pages as number)))
    throw Error('native_studio_access_policy_provider_unverified');
  if (!body.result.length) return 'empty' as const;
  inspectNativeStudioAccessPolicyReadback(body, principals);
  return 'exact' as const;
}

/** Install one exact owner policy on an already bound, default-deny Access app.
 * The append-only intent is single use. A lost POST response is reconciled by
 * readback; never submit another POST for that intent. Membership changes
 * require a separate policy reconciler, not another create attempt here.
 */
export async function ensureNativeStudioAccessOwnerPolicy(input: {
  scope: NativeStudioScope; client: SupabaseClient; accountId: string;
  appId: string; credential: string;
  store: Pick<PublicationStore, 'read' | 'claim'>;
}, transport: typeof fetch = fetch, deps = defaults) {
  const { scope, client, accountId, appId, credential, store } = input ?? {} as typeof input;
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(id =>
      typeof id === 'string' && UUID.test(id)) || !client ||
      !HEX32.test(accountId) || !APP_ID.test(appId) || !TOKEN.test(credential) ||
      !store || typeof store.read !== 'function' ||
      typeof store.claim !== 'function' || typeof transport !== 'function')
    throw Error('native_studio_access_policy_input_invalid');
  const target = await deps.target(scope, client, accountId);
  const appIntent = await store.read<Record<string, unknown>>(APP_INTENT);
  const appBound = await store.read<Record<string, unknown>>(APP_BOUND);
  if (!object(appIntent) || !object(appIntent.target) ||
      !same(appIntent.target, target) || !same(appIntent.target.scope, scope) ||
      !object(appBound) || appBound.identity !== appIntent.identity ||
      appBound.appId !== appId)
    throw Error('native_studio_access_policy_app_unbound');
  const app = await deps.app(scope, { siteId: scope.siteId,
    studioOrigin: target.studioOrigin, accountId }, appId, credential, transport);
  if (app.state !== 'observed-access-app' || app.appId !== appId ||
      app.studioOrigin !== target.studioOrigin || app.accountId !== accountId ||
      appBound.aud !== app.aud || appBound.teamDomain !== app.teamDomain)
    throw Error('native_studio_access_policy_app_unverified');
  const initial = principalsFrom(await deps.candidates(scope, client));
  const identity = fingerprint({ scope, target, accountId, appId, principals: initial });
  const expected: Intent = { identity, scope, accountId, appId,
    target, principals: initial };
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}` +
    `/access/apps/${appId}/policies`;
  const previous = await store.read<Intent>(KEY);
  if (previous && !exactIntent(previous, expected))
    throw Error('native_studio_access_policy_intent_conflict');
  const state = await readPolicyList(url, credential, transport, initial);
  if (state === 'exact') {
    if (!previous) throw Error('native_studio_access_policy_unowned');
    const current = await deps.target(scope, client, accountId);
    const members = principalsFrom(await deps.candidates(scope, client));
    if (!same(current, target) || !same(members, initial))
      throw Error('native_studio_access_policy_members_changed');
    return { state: 'observed-exact-access-policy' as const,
      appId, memberCount: initial.length };
  }
  if (previous) throw Error('native_studio_access_policy_pending');

  // Authorization can change while the provider was read. Recheck before the
  // irreversible intent and again directly before the provider mutation.
  const beforeIntent = await deps.target(scope, client, accountId);
  const beforeMembers = principalsFrom(await deps.candidates(scope, client));
  if (!same(beforeIntent, target) || !same(beforeMembers, initial))
    throw Error('native_studio_access_policy_members_changed');
  const won = await store.claim(KEY, expected);
  const recorded = await store.read<Intent>(KEY);
  if (!exactIntent(recorded, expected))
    throw Error('native_studio_access_policy_intent_conflict');
  if (!won) throw Error('native_studio_access_policy_pending');
  const beforePost = await deps.target(scope, client, accountId);
  const postMembers = principalsFrom(await deps.candidates(scope, client));
  if (!same(beforePost, target) || !same(postMembers, initial))
    throw Error('native_studio_access_policy_members_changed');

  const name = `gnr8-${scope.siteId}-studio-owners`;
  const include = initial.map(principal => ({ email: { email: principal.slice(7) } }));
  try {
    await transport(url, { method: 'POST', redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
        'content-type': 'application/json' },
      body: JSON.stringify({ name, decision: 'allow', include }) });
  } catch { /* A lost response may follow a successful write. Read once. */ }
  let observed: 'empty' | 'exact';
  try { observed = await readPolicyList(url, credential, transport, initial); }
  catch { throw Error('native_studio_access_policy_pending'); }
  if (observed !== 'exact') throw Error('native_studio_access_policy_pending');
  const [current, members] = await Promise.all([
    deps.target(scope, client, accountId), deps.candidates(scope, client),
  ]);
  if (!same(current, target) || !same(principalsFrom(members), initial))
    throw Error('native_studio_access_policy_members_changed');
  return { state: 'observed-exact-access-policy' as const,
    appId, memberCount: initial.length };
}
