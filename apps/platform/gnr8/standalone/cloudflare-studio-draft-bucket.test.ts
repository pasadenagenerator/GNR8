import assert from 'node:assert/strict';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureCloudflareStudioDraftBucket,
  ensureBoundCloudflareStudioDraftBucket } from './cloudflare-studio-draft-bucket';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const credential = 'c'.repeat(40);
const bucket = `gnr8-${scope.siteId}-drafts`;
const bucketId = 'b'.repeat(32);

function fixture(mode: 'normal' | 'lost' | 'absent' = 'normal') {
  const saved = new Map<string, unknown>();
  let live = false;
  let publicManaged = false;
  let publicCustom = false;
  let jurisdiction = 'default';
  let creates = 0;
  const store = {
    read: async <T>(key: string) => (saved.get(key) as T) ?? null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const transport = (async (url: string, options: RequestInit) => {
    const path = new URL(url).pathname;
    assert.equal(new Headers(options.headers).get('authorization'), `Bearer ${credential}`);
    if (path.endsWith(`/r2/buckets/${bucket}`))
      return live ? Response.json({ success: true, result: { name: bucket, jurisdiction } })
        : new Response(null, { status: 404 });
    assert(live || path.endsWith('/r2/buckets'));
    if (path.endsWith('/domains/managed'))
      return Response.json({ success: true, result: { bucketId, enabled: publicManaged } });
    if (path.endsWith('/domains/custom'))
      return Response.json({ success: true, result: { domains: publicCustom
        ? [{ domain: 'drafts.example.com', enabled: true }] : [] } });
    assert(path.endsWith('/r2/buckets'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(String(options.body)), { name: bucket });
    creates++;
    if (mode !== 'absent') live = true;
    if (mode !== 'normal') throw Error('lost provider response');
    return Response.json({ success: true, result: { name: bucket } });
  }) as typeof fetch;
  return { store, transport, saved, creates: () => creates,
    setLive: (value: boolean) => { live = value; },
    setManagedPublic: () => { publicManaged = true; },
    setCustomPublic: () => { publicCustom = true; },
    setJurisdiction: (value: string) => { jurisdiction = value; } };
}

test('creates the exact private draft bucket once and reuses it', async () => {
  const f = fixture();
  const first = await ensureCloudflareStudioDraftBucket(scope, accountId,
    credential, f.store, f.transport);
  assert.deepEqual(first, { bucket, bucketId });
  assert.deepEqual(await ensureCloudflareStudioDraftBucket(scope, accountId,
    credential, f.store, f.transport), first);
  assert.equal(f.creates(), 1);
});

test('reconciles a lost create response without repeating an unconfirmed create', async () => {
  const recovered = fixture('lost');
  assert.deepEqual(await ensureCloudflareStudioDraftBucket(scope, accountId,
    credential, recovered.store, recovered.transport), { bucket, bucketId });
  assert.equal(recovered.creates(), 1);
  const pending = fixture('absent');
  await assert.rejects(ensureCloudflareStudioDraftBucket(scope, accountId,
    credential, pending.store, pending.transport), /native_studio_draft_bucket_pending/);
  await assert.rejects(ensureCloudflareStudioDraftBucket(scope, accountId,
    credential, pending.store, pending.transport), /native_studio_draft_bucket_pending/);
  assert.equal(pending.creates(), 1);
});

test('rejects a public or wrong-jurisdiction draft bucket', async () => {
  for (const change of ['setManagedPublic', 'setCustomPublic', 'setJurisdiction'] as const) {
    const f = fixture();
    f.setLive(true);
    if (change === 'setJurisdiction') f.setJurisdiction('eu');
    else f[change]();
    await assert.rejects(ensureCloudflareStudioDraftBucket(scope, accountId,
      credential, f.store, f.transport), /native_studio_draft_bucket_(not_private|conflict)/);
    assert.equal(f.creates(), 0);
  }
});

test('rejects invalid scope before provider access', async () => {
  let requests = 0;
  await assert.rejects(ensureCloudflareStudioDraftBucket(
    { ...scope, siteId: '../other' }, accountId, credential,
    fixture().store, (async () => { requests++; throw Error('unexpected'); }) as typeof fetch),
  /native_studio_draft_bucket_setup_invalid/);
  assert.equal(requests, 0);
});

test('a saved create intent cannot move the draft bucket to another account', async () => {
  const f = fixture();
  await ensureCloudflareStudioDraftBucket(scope, accountId,
    credential, f.store, f.transport);
  let requests = 0;
  await assert.rejects(ensureCloudflareStudioDraftBucket(scope, 'd'.repeat(32),
    credential, f.store, (async () => { requests++; throw Error('unexpected'); }) as typeof fetch),
  /native_studio_draft_bucket_conflict/);
  assert.equal(requests, 0);
});

test('hosted boundary requires the current site and bound repository', async () => {
  const f = fixture();
  const client = { from(name: string) {
    const filters: Record<string, string> = {};
    const query = { eq(key: string, value: string) { filters[key] = value; return query; },
      async maybeSingle() {
        assert.equal(filters.site_id ?? filters.id, scope.siteId);
        assert.equal(filters.agency_id, scope.agencyId);
        assert.equal(filters.client_id ?? filters.org_id, scope.clientId);
        return { error: null, data: name === 'sites'
          ? { domain: 'site.app.pasadenagenerator.com' }
          : { github_owner: 'pasadenagenerator', github_owner_id: 123,
              github_owner_kind: 'User', repository: 'gnr8-site-3333',
              repository_id: 456, binding_state: 'bound' } };
      } };
    return { select: () => query };
  } } as unknown as SupabaseClient;
  await ensureBoundCloudflareStudioDraftBucket(scope, client, accountId,
    credential, f.store, f.transport);
  assert.equal(f.creates(), 1);
  let requests = 0;
  const absent = { from(name: string) {
    return { select() { return { eq() { return this; },
      async maybeSingle() { return { error: null, data: name === 'sites'
        ? { domain: 'site.app.pasadenagenerator.com' } : null }; } }; } };
  } } as unknown as SupabaseClient;
  await assert.rejects(ensureBoundCloudflareStudioDraftBucket(scope,
    absent, accountId, credential, fixture().store,
    (async () => { requests++; throw Error('unexpected'); }) as typeof fetch),
  /native_studio_draft_bucket_scope_unverified/);
  assert.equal(requests, 0);
});
