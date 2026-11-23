import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyAccessProtectedStudioEntry } from '../../../../scripts/stacki/verify-studio-health.mjs';
import type { NativeStudioScope } from './native-studio-binding-store';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { inspectCloudflareStudioAccessApp } from './cloudflare-studio-access-app';
import { inspectNativeStudioAccessPolicyReadback } from './cloudflare-studio-access-policy';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const defaults = {
  target: readNativeStudioBootstrapTarget,
  candidates: readCurrentNativeStudioAccessCandidates,
  app: inspectCloudflareStudioAccessApp,
  policy: inspectNativeStudioAccessPolicyReadback,
  challenge: verifyAccessProtectedStudioEntry,
};

/** Observe the exact Access application, current owner policy and login
 * challenge for a bound site. This is a first-open prerequisite, not an
 * authenticated editor session or a ready binding. No provider mutation.
 */
export async function inspectBoundNativeStudioAccessEntry(input: {
  scope: NativeStudioScope; client: SupabaseClient; accountId: string;
  appId: string; credential: string;
}, transport: typeof fetch = fetch, deps = defaults) {
  const { scope, client, accountId, appId, credential } = input ?? {} as typeof input;
  if (!scope || !client || typeof accountId !== 'string' ||
      typeof appId !== 'string' || typeof credential !== 'string' ||
      typeof transport !== 'function')
    throw Error('native_studio_access_entry_input_invalid');
  const before = await deps.target(scope, client, accountId);
  const members = await deps.candidates(scope, client);
  const principals = members.map(member => member.principal);
  const app = await deps.app(scope, { siteId: scope.siteId,
    studioOrigin: before.studioOrigin, accountId }, appId, credential, transport);
  let response: Response;
  try {
    response = await transport(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps/${appId}/policies`,
      { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json' } });
  } catch { throw Error('native_studio_access_entry_policy_unavailable'); }
  if (!response.ok) throw Error('native_studio_access_entry_policy_unavailable');
  let body: unknown;
  try { body = await response.json(); }
  catch { throw Error('native_studio_access_entry_policy_unavailable'); }
  const policy = deps.policy(body, principals);
  if (policy.state !== 'observed-exact-access-policy' ||
      policy.memberCount !== principals.length)
    throw Error('native_studio_access_entry_policy_unverified');
  const challenge = await deps.challenge({ studioOrigin: before.studioOrigin,
    authDomain: app.teamDomain }, transport);
  if (challenge.state !== 'access-studio-challenge-observed' ||
      challenge.studioOrigin !== before.studioOrigin)
    throw Error('native_studio_access_entry_challenge_unverified');
  const [after, current] = await Promise.all([
    deps.target(scope, client, accountId), deps.candidates(scope, client),
  ]);
  if (!same(after, before) || !same(current, members) ||
      !object(app) || app.state !== 'observed-access-app' ||
      app.studioOrigin !== before.studioOrigin || app.accountId !== accountId ||
      app.appId !== appId)
    throw Error('native_studio_access_entry_target_changed');
  return { state: 'observed-access-entry' as const,
    scope, studioOrigin: before.studioOrigin, repository: before.repository,
    appId, aud: app.aud, teamDomain: app.teamDomain,
    memberCount: policy.memberCount };
}
