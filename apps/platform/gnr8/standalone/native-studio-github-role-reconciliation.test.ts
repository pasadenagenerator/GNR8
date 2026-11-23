import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serializeNativeAccessRoles } from '../../../../scripts/stacki/native-access-roles.mjs';
import { inspectBoundNativeStudioGitHubRoles,
  reconcileBoundNativeStudioGitHubRoles } from './native-studio-github-role-reconciliation';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const actor = '44444444-4444-4444-8444-444444444444';
const site = { siteId: scope.siteId, repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'a'.repeat(32), appId: '10', installationId: '11', clientId: 'Iv1.example' };
const sourceId = 'f'.repeat(64), appId = 'b'.repeat(32);
const oldPrincipals = ['access:old@example.com'];
const nextPrincipals = ['access:new@example.com'];
const previous = { sourceId, headCommit: '1'.repeat(40), treeSha: '2'.repeat(40),
  roleBlobSha: '3'.repeat(40), previousPrincipals: oldPrincipals };
const proof = { state: 'observed-exact-access-policy' as const,
  appId, policyId: '4'.repeat(32), principals: nextPrincipals };
const blobId = (value: Buffer) => createHash('sha1')
  .update(`blob ${value.length}\0`).update(value).digest('hex');

function fixture() {
  const saved = new Map<string, unknown>([
    ['native-studio/access-app-bound-v1.json', { appId,
      aud: 'c'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com' }],
  ]);
  const store = { read: async <T>(key: string) => (saved.get(key) ?? null) as T | null,
    getBytes: async () => Buffer.alloc(0),
    claim: async (key: string, value: unknown) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
  let remote = previous;
  let policy = proof;
  let patches = 0;
  let failPatch = false;
  const calls: string[] = [];
  const deps = {
    site: async () => site,
    source: async () => ({ receipt: { format: 'gnr8-native-studio-source:v2',
      identitySha256: sourceId, access: { version: 2, provider: 'access',
        aud: 'c'.repeat(64), teamDomain: 'gnr8.cloudflareaccess.com',
        admins: oldPrincipals } } }),
    token: async () => ({ token: `ghs_${'z'.repeat(40)}`,
      repositoryId: site.repositoryId, expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    remote: async () => remote,
    policy: async () => policy,
    actor: async () => { calls.push('actor'); },
  } as any;
  const transport = (async (url: string, options: RequestInit) => {
    const path = new URL(url).pathname.replace('/repos/example/site', '');
    calls.push(`${options.method}:${path}`);
    if (path === '/git/blobs' && options.method === 'POST') {
      const body = JSON.parse(String(options.body));
      return Response.json({ sha: blobId(Buffer.from(body.content, 'base64')) });
    }
    if (path === '/git/trees' && options.method === 'POST') {
      const body = JSON.parse(String(options.body));
      assert.equal(body.base_tree, previous.treeSha);
      assert.deepEqual(body.tree.map((entry: { path: string }) => entry.path),
        ['.stacki/roles.json']);
      return Response.json({ sha: '5'.repeat(40) });
    }
    if (path === '/git/commits' && options.method === 'POST') {
      const body = JSON.parse(String(options.body));
      assert.deepEqual(body.parents, [previous.headCommit]);
      return Response.json({ sha: '6'.repeat(40) });
    }
    if (path === `/git/commits/${'6'.repeat(40)}` && options.method === 'GET')
      return Response.json({ sha: '6'.repeat(40), tree: { sha: '5'.repeat(40) },
        parents: [{ sha: previous.headCommit }] });
    if (path === '/git/refs/heads/codex/native-stacki' && options.method === 'PATCH') {
      patches++;
      const body = JSON.parse(String(options.body));
      assert.deepEqual(body, { sha: '6'.repeat(40), force: false });
      if (!failPatch) remote = { ...previous, headCommit: body.sha,
        roleBlobSha: blobId(Buffer.from(serializeNativeAccessRoles(nextPrincipals))),
        previousPrincipals: nextPrincipals };
      return failPatch ? new Response(null, { status: 503 }) : Response.json({});
    }
    throw Error(`unexpected ${options.method} ${path}`);
  }) as typeof fetch;
  const input = { scope, client: {} as SupabaseClient, store, sourceId, actor,
    previous, policyProof: proof };
  const env = { GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER: 'access-manager-token-12345' };
  return { saved, store, input, env, deps, transport, calls,
    setPolicy: (value: typeof proof) => { policy = value; },
    setFailPatch: (value: boolean) => { failPatch = value; },
    patches: () => patches };
}

test('bound inspector requires actor and Access v2 source before reading Git roles', async () => {
  const f = fixture();
  assert.deepEqual(await inspectBoundNativeStudioGitHubRoles(f.input,
    f.env, f.transport, f.deps), previous);
  assert.deepEqual(f.calls, ['actor']);
  await assert.rejects(inspectBoundNativeStudioGitHubRoles({ ...f.input,
    actor: 'invalid' }, f.env, f.transport, f.deps), /input_invalid/);
  await assert.rejects(inspectBoundNativeStudioGitHubRoles(f.input, f.env,
    f.transport, { ...f.deps, source: async () => ({ receipt: {
      format: 'gnr8-native-studio-source:v1', identitySha256: sourceId } }) }),
  /source_unverified/);
});

test('exact policy creates one role-only fast-forward commit and reconciles lost response', async () => {
  const f = fixture();
  const first = await reconcileBoundNativeStudioGitHubRoles(f.input,
    f.env, f.transport, f.deps);
  assert.deepEqual(first, { state: 'verified', commit: '6'.repeat(40),
    principals: nextPrincipals });
  assert.equal(f.patches(), 1);
  assert.equal([...f.saved.keys()].filter(key => key.startsWith(
    'native-studio/access-role-update-')).length, 1);
  assert.deepEqual(await reconcileBoundNativeStudioGitHubRoles(f.input,
    f.env, f.transport, f.deps), first);
  assert.equal(f.patches(), 1);
});

test('changed policy or ambiguous ref write never starts a second mutation', async () => {
  const changed = fixture();
  changed.setPolicy({ ...proof, principals: ['access:other@example.com'] });
  await assert.rejects(reconcileBoundNativeStudioGitHubRoles(changed.input,
    changed.env, changed.transport, changed.deps), /policy_changed/);
  assert.equal(changed.patches(), 0);
  const ambiguous = fixture();
  ambiguous.setFailPatch(true);
  assert.deepEqual(await reconcileBoundNativeStudioGitHubRoles(ambiguous.input,
    ambiguous.env, ambiguous.transport, ambiguous.deps),
  { state: 'pending-review', commit: '6'.repeat(40) });
  assert.deepEqual(await reconcileBoundNativeStudioGitHubRoles(ambiguous.input,
    ambiguous.env, ambiguous.transport, ambiguous.deps),
  { state: 'pending-review', commit: '6'.repeat(40) });
  assert.equal(ambiguous.patches(), 1);
});
