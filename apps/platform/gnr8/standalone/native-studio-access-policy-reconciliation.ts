import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PublicationStore } from './publication-store';
import type { NativeStudioScope } from './native-studio-binding-store';
import { fingerprint } from './publication-contract';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { inspectCloudflareStudioAccessApp } from './cloudflare-studio-access-app';
import { readVerifiedNativeStudioAccessAppV2Binding } from './native-studio-access-app-reservation';
import { inspectNativeStudioAccessPolicyReadback } from './cloudflare-studio-access-policy';
import { isNativeStudioReconciliationActor,
  requireNativeStudioReconciliationAuthority,
  type NativeStudioReconciliationActor } from './native-studio-reconciliation-authority';
import { serializeNativeAccessRoles, validateNativeAccessRoles } from '../../../../scripts/stacki/native-access-roles.mjs';

const POLICY_INTENT = 'native-studio/access-policy-create-intent-v1.json';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX32 = /^[a-f0-9]{32}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const COMMIT = /^[a-f0-9]{40,64}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a: unknown, b: unknown) => fingerprint(a) === fingerprint(b);
const fail = (reason: string): never => { throw Error(`native_studio_access_reconciliation_${reason}`); };
type Store = Pick<PublicationStore, 'read' | 'claim'>;
type Input = { scope: NativeStudioScope; client: SupabaseClient; accountId: string;
  zoneId: string; appId: string; credential: string; store: Store };
type Mutation = Input & { actor: NativeStudioReconciliationActor;
  previousCommit: string; previousPrincipals: string[] };

const defaults = { target: readNativeStudioBootstrapTarget,
  candidates: readCurrentNativeStudioAccessCandidates,
  app: inspectCloudflareStudioAccessApp,
  binding: readVerifiedNativeStudioAccessAppV2Binding,
  actor: requireNativeStudioReconciliationAuthority };

function canonical(input: unknown): string[] {
  try { return validateNativeAccessRoles(serializeNativeAccessRoles(input)); }
  catch { return fail('principals_invalid'); }
}
function validate(input: Input) {
  if (!input?.scope || ![input.scope.agencyId, input.scope.clientId, input.scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
    !input.client || !HEX32.test(input.accountId) || !HEX32.test(input.zoneId) ||
    !APP_ID.test(input.appId) ||
    !TOKEN.test(input.credential) || !input.store ||
    typeof input.store.read !== 'function' || typeof input.store.claim !== 'function')
    fail('input_invalid');
}
async function context(input: Input, transport: typeof fetch, deps: typeof defaults) {
  validate(input);
  if (typeof transport !== 'function') fail('input_invalid');
  const { scope, client, accountId, zoneId, appId, credential, store } = input;
  const binding = await deps.binding({ scope, client, accountId, zoneId, store },
    { target: deps.target });
  const { target } = binding;
  const policyIntent = await store.read<Record<string, unknown>>(POLICY_INTENT);
  if (binding.appId !== appId || !object(policyIntent) ||
      policyIntent.appId !== appId || policyIntent.accountId !== accountId ||
      !object(policyIntent.scope) || !object(policyIntent.target) ||
      !same(policyIntent.scope, scope) || !same(policyIntent.target, target) ||
      !Array.isArray(policyIntent.principals) ||
      policyIntent.identity !== fingerprint({ scope, target, accountId, appId,
        principals: canonical(policyIntent.principals) })) fail('binding_unverified');
  const app = await deps.app(scope, { siteId: scope.siteId,
    studioOrigin: target.studioOrigin, accountId }, appId, credential, transport,
    'studio-and-preview');
  if (app.state !== 'observed-access-app' || app.appId !== appId ||
      app.accountId !== accountId || app.studioOrigin !== target.studioOrigin ||
      app.aud !== binding.aud || app.teamDomain !== binding.teamDomain ||
      app.protection !== 'studio-and-preview' ||
      app.previewOrigin !== binding.previewOrigin)
    fail('app_unverified');
  const principals = canonical((await deps.candidates(scope, client)).map(item => item.principal));
  return { target, principals };
}

async function policyList(input: Input, transport: typeof fetch) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${input.accountId}` +
    `/access/apps/${input.appId}/policies`;
  let body: unknown;
  try {
    const response = await transport(url, { method: 'GET', redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${input.credential}`, accept: 'application/json' } });
    if (!response.ok) fail('provider_unavailable');
    body = await response.json();
  } catch { fail('provider_unavailable'); }
  const result = object(body) && Array.isArray(body.result) ? body.result : null;
  const policy = result?.[0];
  if (!object(body) || body.success !== true || !result ||
      result.length !== 1 || !object(policy) ||
      !UUID.test(policy.id as string) ||
      policy.name !== `gnr8-${input.scope.siteId}-studio-owners`)
    fail('policy_unverified');
  return { body, policyId: policy.id as string, url };
}
function matches(body: unknown, principals: string[]): boolean {
  try { inspectNativeStudioAccessPolicyReadback(body, principals); return true; }
  catch { return false; }
}
async function fresh(input: Input, expectedTarget: unknown, expectedPrincipals: string[],
  deps: typeof defaults) {
  const [target, candidates] = await Promise.all([
    deps.target(input.scope, input.client, input.accountId),
    deps.candidates(input.scope, input.client),
  ]);
  if (!same(target, expectedTarget) ||
      !same(canonical(candidates.map(item => item.principal)), expectedPrincipals))
    fail('members_changed');
}

/** Read-only proof for the exact current policy, used immediately before the
 * bound GitHub role-file write. It grants no claim about existing Access sessions. */
export async function inspectCurrentNativeStudioAccessOwnerPolicy(input: Input,
  transport: typeof fetch = fetch, deps = defaults) {
  const { target, principals } = await context(input, transport, deps);
  const { body, policyId } = await policyList(input, transport);
  if (!matches(body, principals)) fail('policy_unverified');
  await fresh(input, target, principals, deps);
  return { state: 'observed-exact-access-policy' as const,
    appId: input.appId, policyId, principals };
}

/** Update only the sole policy of an exact bound app. The caller supplies the
 * verified old Git role principals and HEAD; a durable intent makes an
 * ambiguous PUT readback-only on retry. Git roles are written separately. */
export async function reconcileNativeStudioAccessOwnerPolicy(input: Mutation,
  transport: typeof fetch = fetch, deps = defaults) {
  validate(input);
  if (!isNativeStudioReconciliationActor(input.actor) ||
      !COMMIT.test(input.previousCommit))
    fail('input_invalid');
  const previous = canonical(input.previousPrincipals);
  await deps.actor(input.client, { actor: input.actor, scope: input.scope });
  const { target, principals } = await context(input, transport, deps);
  const { body, policyId, url } = await policyList(input, transport);
  if (same(previous, principals)) {
    if (!matches(body, principals)) fail('policy_conflict');
    await fresh(input, target, principals, deps);
    return { state: 'observed-exact-access-policy' as const,
      appId: input.appId, policyId, principals };
  }
  const identity = fingerprint({ scope: input.scope, target, accountId: input.accountId,
    appId: input.appId, policyId, previousCommit: input.previousCommit,
    previous, principals });
  const intent = { identity, scope: input.scope, target, accountId: input.accountId,
    appId: input.appId, policyId, previousCommit: input.previousCommit,
    previous, principals };
  const key = `native-studio/access-policy-reconcile-${identity}.json`;
  const prior = await input.store.read<typeof intent>(key);
  if (prior && !same(prior, intent)) fail('intent_conflict');
  if (matches(body, principals)) {
    if (!prior) fail('unowned_change');
    await fresh(input, target, principals, deps);
    return { state: 'observed-exact-access-policy' as const,
      appId: input.appId, policyId, principals };
  }
  if (!matches(body, previous)) fail('policy_conflict');
  if (prior) fail('pending');
  await fresh(input, target, principals, deps);
  const won = await input.store.claim(key, intent);
  if (!same(await input.store.read(key), intent)) fail('intent_conflict');
  if (!won) fail('pending');
  await fresh(input, target, principals, deps);
  const before = await policyList(input, transport);
  if (before.policyId !== policyId || !matches(before.body, previous))
    fail('policy_conflict');
  await deps.actor(input.client, { actor: input.actor, scope: input.scope });
  await fresh(input, target, principals, deps);
  const include = principals.map(principal => ({ email: { email: principal.slice(7) } }));
  try {
    await transport(`${url}/${policyId}`, { method: 'PUT', redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${input.credential}`, accept: 'application/json',
        'content-type': 'application/json' },
      body: JSON.stringify({ name: `gnr8-${input.scope.siteId}-studio-owners`,
        decision: 'allow', include }) });
  } catch { /* Lost response may follow a successful PUT. Inspect once. */ }
  let observed: Awaited<ReturnType<typeof policyList>> | undefined;
  try { observed = await policyList(input, transport); }
  catch { fail('pending'); }
  if (!observed) throw Error('native_studio_access_reconciliation_pending');
  if (observed.policyId !== policyId || !matches(observed.body, principals))
    fail('pending');
  await fresh(input, target, principals, deps);
  return { state: 'observed-exact-access-policy' as const,
    appId: input.appId, policyId, principals };
}
