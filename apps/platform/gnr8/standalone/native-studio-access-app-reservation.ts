import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublicationStore } from './publication-store';
import { readNativeStudioBootstrapTarget } from './native-studio-configured-resource-reservation';
import { readCompleteCloudflareAccessAppInventory } from './cloudflare-studio-access-inventory-readback';
import { inspectNativeStudioAccessApplicationInventory } from './cloudflare-studio-access-inventory';
import { inspectCloudflareStudioAccessApp } from './cloudflare-studio-access-app';

const HEX32 = /^[a-f0-9]{32}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const TOKEN = /^[A-Za-z0-9_-]{16,256}$/;
const INTENT = 'native-studio/access-app-create-intent-v1.json';
const BOUND = 'native-studio/access-app-bound-v1.json';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const defaults = {
  target: readNativeStudioBootstrapTarget,
  inventory: readCompleteCloudflareAccessAppInventory,
  overlap: inspectNativeStudioAccessApplicationInventory,
  app: inspectCloudflareStudioAccessApp,
};

/** Create an exact Access application with no Allow policy, once per bound
 * site. Unknown POST outcomes are reconciled through full account and zone
 * inventories; a second POST is never guessed. Policy activation is separate.
 */
export async function reserveNativeStudioAccessApp(input: {
  scope: NativeStudioScope; client: SupabaseClient; accountId: string;
  zoneId: string; credential: string;
  store: Pick<PublicationStore, 'read' | 'claim'>;
}, transport: typeof fetch = fetch, deps = defaults) {
  const { scope, client, accountId, zoneId, credential, store } = input ?? {} as typeof input;
  if (!scope || !client || !HEX32.test(accountId) || !HEX32.test(zoneId) ||
      !TOKEN.test(credential) || !store || typeof store.read !== 'function' ||
      typeof store.claim !== 'function' || typeof transport !== 'function')
    throw Error('native_studio_access_app_reservation_input_invalid');
  const target = await deps.target(scope, client, accountId);
  if (target.accountId !== accountId || !target.scope || !same(target.scope, scope) ||
      !Number.isSafeInteger(target.repositoryId) || target.repositoryId <= 0)
    throw Error('native_studio_access_app_reservation_target_unverified');
  const host = new URL(target.studioOrigin).hostname;
  const name = `gnr8-${scope.siteId}-studio-access`;
  const domain = `${host}/studio`;
  const identity = createHash('sha256').update(JSON.stringify({
    scope, accountId, zoneId, studioOrigin: target.studioOrigin,
    repository: target.repository, repositoryId: target.repositoryId, name, domain,
  })).digest('hex');
  const intended = { identity, target, zoneId, name, domain };
  const priorIntent = await store.read<typeof intended>(INTENT);
  if (priorIntent && !same(priorIntent, intended))
    throw Error('native_studio_access_app_reservation_intent_conflict');
  const priorBound = await store.read<{ identity: string; appId: string;
    aud: string; teamDomain: string }>(BOUND);
  if (priorBound && (!priorIntent || priorBound.identity !== identity ||
      !APP_ID.test(priorBound.appId)))
    throw Error('native_studio_access_app_reservation_binding_conflict');

  async function inventories() {
    const [accountApps, zoneApps] = await Promise.all([
      deps.inventory('accounts', accountId, credential, transport),
      deps.inventory('zones', zoneId, credential, transport),
    ]);
    return { accountApps, zoneApps };
  }
  function exactApp(accountApps: Awaited<ReturnType<typeof inventories>>['accountApps']) {
    const entries = accountApps.result.filter(item => object(item) &&
      item.type === 'self_hosted' && item.name === name && item.domain === domain);
    if (entries.length > 1 || (entries.length === 1 &&
        (!object(entries[0]) || typeof entries[0].id !== 'string' ||
          !APP_ID.test(entries[0].id))))
      throw Error('native_studio_access_app_reservation_ambiguous');
    return entries.length === 1 ? (entries[0] as Record<string, unknown>).id as string : null;
  }
  const before = await inventories();
  const beforeId = exactApp(before.accountApps);
  deps.overlap(before.accountApps, beforeId ?? null, host);
  deps.overlap(before.zoneApps, null, host);
  if (priorBound && beforeId !== priorBound.appId)
    throw Error('native_studio_access_app_reservation_binding_conflict');
  if (!priorIntent && beforeId)
    throw Error('native_studio_access_app_reservation_unowned');

  if (!priorIntent) {
    const current = await deps.target(scope, client, accountId);
    if (!same(current, target))
      throw Error('native_studio_access_app_reservation_target_changed');
    const won = await store.claim(INTENT, intended);
    if (!same(await store.read<typeof intended>(INTENT), intended))
      throw Error('native_studio_access_app_reservation_intent_conflict');
    if (!won) throw Error('native_studio_access_app_reservation_pending');
    // Minimal self-hosted app remains default-deny until a separately
    // verified exact-email Allow policy is installed.
    try {
      await transport(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
          'content-type': 'application/json' },
        body: JSON.stringify({ type: 'self_hosted', name, domain }),
      });
    } catch { /* A lost response can follow a successful create. Read back. */ }
  }

  const after = await inventories();
  const appId = exactApp(after.accountApps);
  if (!appId) throw Error('native_studio_access_app_reservation_pending');
  deps.overlap(after.accountApps, appId, host);
  deps.overlap(after.zoneApps, null, host);
  const app = await deps.app(scope, { siteId: scope.siteId,
    studioOrigin: target.studioOrigin, accountId }, appId, credential, transport);
  if (app.state !== 'observed-access-app' || app.appId !== appId ||
      app.studioOrigin !== target.studioOrigin || app.accountId !== accountId)
    throw Error('native_studio_access_app_reservation_readback_unverified');
  if (!priorBound) {
    let body: unknown;
    try {
      const response = await transport(`https://api.cloudflare.com/client/v4/accounts/` +
        `${accountId}/access/apps/${appId}/policies`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json' },
      });
      if (!response.ok) throw Error();
      body = await response.json();
    } catch { throw Error('native_studio_access_app_reservation_policy_unverified'); }
    if (!object(body) || body.success !== true || !Array.isArray(body.result) ||
        body.result.length !== 0 || !object(body.result_info) ||
        body.result_info.page !== 1 || body.result_info.count !== 0 ||
        body.result_info.total_count !== 0 ||
        (body.result_info.total_pages !== undefined &&
          ![0, 1].includes(body.result_info.total_pages as number)))
      throw Error('native_studio_access_app_reservation_policy_unverified');
  }
  const latest = await deps.target(scope, client, accountId);
  if (!same(latest, target)) throw Error('native_studio_access_app_reservation_target_changed');
  const bound = { identity, appId, aud: app.aud, teamDomain: app.teamDomain };
  if (priorBound && !same(priorBound, bound))
    throw Error('native_studio_access_app_reservation_binding_conflict');
  if (!priorBound) {
    await store.claim(BOUND, bound);
    if (!same(await store.read<typeof bound>(BOUND), bound))
      throw Error('native_studio_access_app_reservation_binding_conflict');
  }
  return { state: 'access-app-bound' as const, target,
    zoneId, name, domain, appId, aud: app.aud, teamDomain: app.teamDomain };
}
