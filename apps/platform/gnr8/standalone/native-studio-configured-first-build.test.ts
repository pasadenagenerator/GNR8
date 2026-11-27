import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredNativeStudioFirstBuild } from './native-studio-configured-first-build';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const client = {} as SupabaseClient;
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki',
  accountId: 'a'.repeat(32), studioOrigin: 'https://site.example.com' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40);
const workerId = 'd'.repeat(32);
const reserved = { target: { scope, accountId: site.accountId,
  repository: site.repository, repositoryId: 42,
  studioOrigin: site.studioOrigin },
  workers: { studio: { id: workerId } } };
const input = { scope, client, sourceId, trustedGit: '/usr/bin/git',
  author: { name: 'GNR8', email: 'gnr8@example.com' } };

test('first build sequences verified checkout, source push and artifact ref', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  const project = join(root, 'project');
  await mkdir(project);
  const calls: string[] = [];
  const store = { read: async () => reserved };
  const deps = {
    site: async () => { calls.push('site'); return site; },
    store: () => store,
    checkout: async () => { calls.push('checkout'); return { root, project, commit }; },
    build: async (value: any) => {
      calls.push('build'); assert.equal(value.workerId, workerId);
      assert.equal(value.project, project); return {}; },
    push: async (value: any) => {
      calls.push('push'); assert.equal(value.commit, commit);
      return { state: 'verified', commit }; },
    artifactPush: async (value: any) => {
      calls.push('artifactPush'); assert.equal(value.sourceCommit, commit);
      assert.equal(value.workerId, workerId);
      return { state: 'verified', sourceCommit: commit,
        branch: `gnr8-build-${commit}`, commit: 'f'.repeat(40) }; },
    dispose: async (path: string) => { calls.push('dispose');
      await rm(path, { recursive: true, force: true }); },
  } as any;
  const result = await configuredNativeStudioFirstBuild(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps);
  assert.deepEqual(calls, ['site', 'checkout', 'build', 'site',
    'push', 'artifactPush', 'dispose']);
  assert.equal(result.workerId, workerId);
  assert.equal(result.artifactBranch, `gnr8-build-${commit}`);
  await assert.rejects(stat(root), { code: 'ENOENT' });
});

test('pending first push removes checkout before artifact publication', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  let artifactCalls = 0;
  const deps = {
    site: async () => site, store: () => ({ read: async () => reserved }),
    checkout: async () => ({ root, project: join(root, 'project'), commit }),
    build: async () => ({}),
    push: async () => ({ state: 'pending-review', commit }),
    artifactPush: async () => { artifactCalls++; },
    dispose: async (path: string) => rm(path, { recursive: true, force: true }),
  } as any;
  await assert.rejects(configuredNativeStudioFirstBuild(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  /push_pending/);
  await assert.rejects(stat(root), { code: 'ENOENT' });
  assert.equal(artifactCalls, 0);
});

test('running source build releases checkout without GitHub writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  const calls: string[] = [];
  const deps = {
    site: async () => site, store: () => ({ read: async () => reserved }),
    checkout: async () => ({ root, project: join(root, 'project'), commit }),
    build: async () => ({ state: 'running' }),
    push: async () => { calls.push('push'); },
    artifactPush: async () => { calls.push('artifactPush'); },
    dispose: async (path: string) => rm(path, { recursive: true, force: true }),
  } as any;
  assert.deepEqual(await configuredNativeStudioFirstBuild(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  { state: 'running' });
  assert.deepEqual(calls, []);
  await assert.rejects(stat(root), { code: 'ENOENT' });
});

test('only an absent reservation can wait before checkout or push', async () => {
  const calls: string[] = [];
  const deps = {
    site: async () => { calls.push('site'); return site; },
    store: () => ({ read: async () => { calls.push('reservation');
      return null; } }),
    checkout: async () => { calls.push('checkout'); throw Error('unexpected'); },
  } as any;
  await assert.rejects(configuredNativeStudioFirstBuild(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  /native_studio_first_build_resources_pending/);
  assert.deepEqual(calls, ['site', 'reservation']);
  const conflict = { ...deps,
    store: () => ({ read: async () => { calls.push('reservation');
      return { ...reserved, target: { ...reserved.target,
        repository: 'example/other' } }; } }),
  };
  await assert.rejects(configuredNativeStudioFirstBuild(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch,
    conflict), /native_studio_first_build_resources_unverified/);
  assert.deepEqual(calls, ['site', 'reservation', 'site', 'reservation']);
});
