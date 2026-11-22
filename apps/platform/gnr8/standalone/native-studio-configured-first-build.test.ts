import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exportStudioBuildArtifactDirectory } from '../../../../scripts/stacki/build-artifact-transfer.mjs';
import { scanStudioBuildOutputs } from '../../../../scripts/stacki/build-handoff.mjs';
import { configuredNativeStudioFirstBuild,
  disposeNativeStudioFirstBuildArtifact } from './native-studio-configured-first-build';

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

test('first build sequences verified checkout, handoff, export and first push', async () => {
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
      assert.equal(value.project, project);
      await mkdir(join(project, 'dist'));
      await mkdir(join(project, 'studio/dist'), { recursive: true });
      await writeFile(join(project, 'dist/index.html'), '<main>built</main>');
      await writeFile(join(project, 'studio/dist/studio.js'), 'built'); },
    export: async (value: any) => {
      calls.push('export'); assert.equal(value.workerId, workerId);
      const files = await scanStudioBuildOutputs(project);
      return exportStudioBuildArtifactDirectory(value, {
        verifyHandoff: async () => ({ files, sourceId, commit }),
      }); },
    push: async (value: any) => {
      calls.push('push'); assert.equal(value.commit, commit);
      return { state: 'verified', commit }; },
    dispose: async (path: string) => { calls.push('dispose');
      await rm(path, { recursive: true, force: true }); },
  } as any;
  const result = await configuredNativeStudioFirstBuild(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps);
  try {
    assert.deepEqual(calls, ['site', 'checkout', 'build', 'site',
      'export', 'push', 'dispose']);
    assert.equal(result.workerId, workerId);
    assert.equal(await readFile(join(result.artifactDir, 'dist/index.html'),
      'utf8'), '<main>built</main>');
    assert.equal(await readFile(join(result.artifactDir,
      'studio/dist/studio.js'), 'utf8'), 'built');
    await assert.rejects(stat(root), { code: 'ENOENT' });
  } finally { await disposeNativeStudioFirstBuildArtifact(result.artifactRoot); }
});

test('pending first push removes temporary output and checkout', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  let artifactRoot = '';
  const deps = {
    site: async () => site, store: () => ({ read: async () => reserved }),
    checkout: async () => ({ root, project: join(root, 'project'), commit }),
    build: async () => ({}),
    export: async (value: any) => { artifactRoot = value.artifactDir.slice(0, -'/artifact'.length);
      await mkdir(value.artifactDir); },
    push: async () => ({ state: 'pending-review', commit }),
    dispose: async (path: string) => rm(path, { recursive: true, force: true }),
  } as any;
  await assert.rejects(configuredNativeStudioFirstBuild(input, {},
    (async () => { throw Error('no provider call'); }) as typeof fetch, deps),
  /push_pending/);
  await assert.rejects(stat(root), { code: 'ENOENT' });
  await assert.rejects(stat(artifactRoot), { code: 'ENOENT' });
});
