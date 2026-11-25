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
export const ACCESS_APP_V2_INTENT = 'native-studio/access-app-create-intent-v2.json';
export const ACCESS_APP_V2_BOUND = 'native-studio/access-app-bound-v2.json';
const URI_REPAIR_INTENT = 'native-studio/access-app-public-uri-repair-v1.json';
const LEGACY_INTENT = 'native-studio/access-app-create-intent-v1.json';
const LEGACY_BOUND = 'native-studio/access-app-bound-v1.json';
const FORMAT = 'gnr8-native-studio-access-app:v2';
const PROTECTION = 'studio-and-preview';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function v2Intent(scope: NativeStudioScope, target: Awaited<ReturnType<typeof readNativeStudioBootstrapTarget>>,
  zoneId: string) {
  const host = new URL(target.studioOrigin).hostname;
  const name = `gnr8-${scope.siteId}-studio-access`;
  const domain = `${host}/studio`;
  const previewDomain = `preview.${host}`;
  const previewOrigin = `https://${previewDomain}`;
  const identity = createHash('sha256').update(JSON.stringify({
    format: FORMAT, scope, accountId: target.accountId, zoneId,
    studioOrigin: target.studioOrigin, repository: target.repository,
    repositoryId: target.repositoryId, name, domain, previewDomain,
  })).digest('hex');
  return { intended: { format: FORMAT, identity, target, zoneId, name,
    domain, previewDomain }, previewOrigin };
}

/** Verify the immutable dual-host app receipt against current site/repository
 * binding. A prior single-host receipt is never silently promoted. */
export async function readVerifiedNativeStudioAccessAppV2Binding(input: {
  scope: NativeStudioScope; client: SupabaseClient; accountId: string;
  zoneId: string; store: Pick<PublicationStore, 'read'>;
}, deps: Pick<typeof defaults, 'target'> = defaults) {
  const { scope, client, accountId, zoneId, store } = input ?? {} as typeof input;
  if (!scope || !client || !HEX32.test(accountId) || !HEX32.test(zoneId) ||
      !store || typeof store.read !== 'function')
    throw Error('native_studio_access_app_v2_input_invalid');
  const target = await deps.target(scope, client, accountId);
  if (target.accountId !== accountId || !same(target.scope, scope) ||
      !Number.isSafeInteger(target.repositoryId) || target.repositoryId <= 0)
    throw Error('native_studio_access_app_v2_target_unverified');
  const { intended, previewOrigin } = v2Intent(scope, target, zoneId);
  const [legacyIntent, legacyBound, intent, bound] = await Promise.all([
    store.read(LEGACY_INTENT), store.read(LEGACY_BOUND),
    store.read(ACCESS_APP_V2_INTENT),
    store.read<Record<string, unknown>>(ACCESS_APP_V2_BOUND),
  ]);
  if (legacyIntent || legacyBound)
    throw Error('native_studio_access_app_v2_legacy_conflict');
  if (!same(intent, intended) || !object(bound) ||
      bound.identity !== intended.identity ||
      typeof bound.appId !== 'string' || !APP_ID.test(bound.appId) ||
      typeof bound.aud !== 'string' || !/^[a-f0-9]{64}$/.test(bound.aud) ||
      typeof bound.teamDomain !== 'string' || !bound.teamDomain ||
      bound.protection !== PROTECTION || bound.previewOrigin !== previewOrigin ||
      !same(bound, { identity: intended.identity, appId: bound.appId,
        aud: bound.aud, teamDomain: bound.teamDomain,
        protection: PROTECTION, previewOrigin }))
    throw Error('native_studio_access_app_v2_binding_unverified');
  return { target, appId: bound.appId, aud: bound.aud as string,
    teamDomain: bound.teamDomain as string, previewOrigin,
    domain: intended.domain, previewDomain: intended.previewDomain,
    name: intended.name, identity: intended.identity };
}

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
  const { intended, previewOrigin } = v2Intent(scope, target, zoneId);
  const { identity, name, domain, previewDomain } = intended;
  const [legacyIntent, legacyBound, priorIntent, priorBound] = await Promise.all([
    store.read(LEGACY_INTENT), store.read(LEGACY_BOUND),
    store.read<typeof intended>(ACCESS_APP_V2_INTENT),
    store.read<{ identity: string; appId: string; aud: string;
      teamDomain: string; protection: string; previewOrigin: string }>(ACCESS_APP_V2_BOUND),
  ]);
  if (legacyIntent || legacyBound)
    throw Error('native_studio_access_app_reservation_legacy_conflict');
  if (priorIntent && !same(priorIntent, intended))
    throw Error('native_studio_access_app_reservation_intent_conflict');
  if (priorBound && (!priorIntent || priorBound.identity !== identity ||
      !APP_ID.test(priorBound.appId) ||
      priorBound.protection !== PROTECTION || priorBound.previewOrigin !== previewOrigin))
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
  deps.overlap(before.accountApps, beforeId ?? null, host, previewDomain);
  deps.overlap(before.zoneApps, null, host, previewDomain);
  if (priorBound && beforeId !== priorBound.appId)
    throw Error('native_studio_access_app_reservation_binding_conflict');
  if (!priorIntent && beforeId)
    throw Error('native_studio_access_app_reservation_unowned');

  if (!priorIntent || !beforeId && !priorBound) {
    const current = await deps.target(scope, client, accountId);
    if (!same(current, target))
      throw Error('native_studio_access_app_reservation_target_changed');
    const repair = { identity, domain, previewDomain, format: 'public-uri-without-scheme' };
    const won = priorIntent ? await store.claim(URI_REPAIR_INTENT, repair) :
      await store.claim(ACCESS_APP_V2_INTENT, intended);
    if (!same(await store.read<typeof intended>(ACCESS_APP_V2_INTENT), intended))
      throw Error('native_studio_access_app_reservation_intent_conflict');
    if (priorIntent && !same(await store.read(URI_REPAIR_INTENT), repair))
      throw Error('native_studio_access_app_reservation_intent_conflict');
    if (!won) throw Error('native_studio_access_app_reservation_pending');
    // Minimal self-hosted app remains default-deny until a separately
    // verified exact-email Allow policy is installed.
    try {
      await transport(`https://api.cloudflare.com/client/v4/accounts/${accountId}/access/apps`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`, accept: 'application/json',
          'content-type': 'application/json' },
        body: JSON.stringify({ type: 'self_hosted', name, domain,
          destinations: [{ type: 'public', uri: domain },
            { type: 'public', uri: previewDomain }] }),
      });
    } catch { /* A lost response can follow a successful create. Read back. */ }
  }

  const after = await inventories();
  const appId = exactApp(after.accountApps);
  if (!appId) throw Error('native_studio_access_app_reservation_pending');
  deps.overlap(after.accountApps, appId, host, previewDomain);
  deps.overlap(after.zoneApps, null, host, previewDomain);
  const app = await deps.app(scope, { siteId: scope.siteId,
    studioOrigin: target.studioOrigin, accountId }, appId, credential, transport,
  PROTECTION);
  if (app.state !== 'observed-access-app' || app.appId !== appId ||
      app.studioOrigin !== target.studioOrigin || app.accountId !== accountId ||
      app.protection !== PROTECTION || app.previewOrigin !== previewOrigin)
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
  const bound = { identity, appId, aud: app.aud, teamDomain: app.teamDomain,
    protection: PROTECTION, previewOrigin };
  if (priorBound && !same(priorBound, bound))
    throw Error('native_studio_access_app_reservation_binding_conflict');
  if (!priorBound) {
    await store.claim(ACCESS_APP_V2_BOUND, bound);
    if (!same(await store.read<typeof bound>(ACCESS_APP_V2_BOUND), bound))
      throw Error('native_studio_access_app_reservation_binding_conflict');
  }
  return { state: 'access-app-bound' as const, target,
    zoneId, name, domain, previewDomain, previewOrigin, protection: PROTECTION,
    appId, aud: app.aud, teamDomain: app.teamDomain };
}
