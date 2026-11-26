import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyAccessProtectedStudioEntry,
  verifyAccessProtectedPreviewEntry } from '../../../../scripts/stacki/verify-studio-health.mjs';
import type { NativeStudioScope } from './native-studio-binding-store';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { inspectCloudflareStudioAccessApp } from './cloudflare-studio-access-app';
import { inspectNativeStudioAccessPolicyReadback } from './cloudflare-studio-access-policy';
import { readCompleteCloudflareAccessAppInventory } from './cloudflare-studio-access-inventory-readback';
import { inspectNativeStudioAccessApplicationInventory } from './cloudflare-studio-access-inventory';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const HEX32 = /^[a-f0-9]{32}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const defaults = {
  target: readNativeStudioBootstrapTarget,
  candidates: readCurrentNativeStudioAccessCandidates,
  app: inspectCloudflareStudioAccessApp,
  inventoryRead: readCompleteCloudflareAccessAppInventory,
  inventory: inspectNativeStudioAccessApplicationInventory,
  policy: inspectNativeStudioAccessPolicyReadback,
  challenge: verifyAccessProtectedStudioEntry,
  previewChallenge: verifyAccessProtectedPreviewEntry,
};

/** Observe the exact Access application, current owner policy and login
 * challenge for a bound site. This is a first-open prerequisite, not an
 * authenticated editor session or a ready binding. Pass the zone ID only
 * from central configuration, never from an event payload. No provider mutation.
 */
export async function inspectBoundNativeStudioAccessEntry(input: {
  scope: NativeStudioScope; client: SupabaseClient; accountId: string; zoneId: string;
  appId: string; credential: string;
}, transport: typeof fetch = fetch, deps = defaults) {
  const { scope, client, accountId, zoneId, appId, credential } = input ?? {} as typeof input;
  if (!scope || !client || !HEX32.test(accountId) || !HEX32.test(zoneId) ||
      typeof appId !== 'string' || typeof credential !== 'string' ||
      typeof transport !== 'function')
    throw Error('native_studio_access_entry_input_invalid');
  const before = await deps.target(scope, client, accountId);
  const members = await deps.candidates(scope, client);
  const principals = members.map(member => member.principal);
  const app = await deps.app(scope, { siteId: scope.siteId,
    studioOrigin: before.studioOrigin, accountId }, appId, credential, transport,
    'studio-and-preview');
  const host = new URL(before.studioOrigin).hostname;
  const previewOrigin = `https://preview.${host}`;
  if (app.protection !== 'studio-and-preview' ||
      app.previewOrigin !== previewOrigin)
    throw Error('native_studio_access_entry_app_unverified');
  const [accountApps, zoneApps] = await Promise.all([
    deps.inventoryRead('accounts', accountId, credential, transport),
    deps.inventoryRead('zones', zoneId, credential, transport),
  ]);
  const previewHost = new URL(previewOrigin).hostname;
  const mirroredZoneAppId = zoneApps.result.some(item =>
    object(item) && item.id === appId) ? appId : null;
  const accountInventory = deps.inventory(accountApps, appId, host, previewHost);
  const zoneInventory = deps.inventory(zoneApps, mirroredZoneAppId, host, previewHost);
  if (accountInventory.state !== 'observed-no-access-overlap' ||
      accountInventory.appId !== appId ||
      zoneInventory.state !== 'observed-no-access-overlap' ||
      zoneInventory.appId !== mirroredZoneAppId)
    throw Error('native_studio_access_entry_inventory_unverified');
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
  const [challenge, previewChallenge] = await Promise.all([
    deps.challenge({ studioOrigin: before.studioOrigin,
      authDomain: app.teamDomain }, transport),
    deps.previewChallenge({ studioOrigin: before.studioOrigin,
      previewOrigin, authDomain: app.teamDomain }, transport),
  ]);
  if (challenge.state !== 'access-studio-challenge-observed' ||
      challenge.studioOrigin !== before.studioOrigin ||
      previewChallenge.state !== 'access-preview-challenge-observed' ||
      previewChallenge.previewOrigin !== previewOrigin)
    throw Error('native_studio_access_entry_challenge_unverified');
  const [after, current] = await Promise.all([
    deps.target(scope, client, accountId), deps.candidates(scope, client),
  ]);
  if (!same(after, before) || !same(current, members) ||
      !object(app) || app.state !== 'observed-access-app' ||
      app.studioOrigin !== before.studioOrigin || app.accountId !== accountId ||
      app.appId !== appId || app.protection !== 'studio-and-preview' ||
      app.previewOrigin !== previewOrigin)
    throw Error('native_studio_access_entry_target_changed');
  return { state: 'observed-access-entry' as const,
    scope, studioOrigin: before.studioOrigin, repository: before.repository,
    appId, aud: app.aud, teamDomain: app.teamDomain,
    protection: 'studio-and-preview' as const, previewOrigin,
    memberCount: policy.memberCount };
}
