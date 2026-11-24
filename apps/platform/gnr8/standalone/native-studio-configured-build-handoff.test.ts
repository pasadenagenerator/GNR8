import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordStudioSandboxBuildArtifact } from '../../../../scripts/stacki/build-artifact-transfer.mjs';
import { scanStudioBuildOutputs } from '../../../../scripts/stacki/build-handoff.mjs';
import { configuredNativeStudioBuildHandoff } from './native-studio-configured-build-handoff';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const client = {} as SupabaseClient;
const site = { siteId: scope.siteId, repository: 'example/site',
  branch: 'codex/native-stacki', studioOrigin: 'https://site.example.com',
  accountId: 'd'.repeat(32), repositoryId: '42' };
const sourceId = 'a'.repeat(64), commit = 'b'.repeat(40);
const workerId = 'c'.repeat(32);
const input = { scope, client, project: '/private/tmp/checked-source',
  sourceId, commit, workerId };
const reserved = { target: { scope, accountId: site.accountId,
  repository: site.repository, repositoryId: 42,
  studioOrigin: site.studioOrigin },
  draftBucket: { bucket: `gnr8-${scope.siteId}-drafts`, bucketId: 'e'.repeat(32) },
  workers: { studio: { worker: `gnr8-${scope.siteId}-studio`, id: workerId },
    publicSite: { worker: `gnr8-${scope.siteId}-site`, id: 'f'.repeat(32) } } };

async function fixture() {
  const artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-native-build-artifact-'));
  const calls: string[] = [];
  const store = { read: async () => reserved, claim: async () => true };
  const receipt = { sourceId, commit, scope, workerId, site, files: [] };
  const deps = {
    site: async () => { calls.push('site'); return site; },
    store: () => store,
    verifySource: async () => { calls.push('verify'); return {
      sourceId, commit, repository: site.repository, branch: site.branch }; },
    build: async () => { calls.push('build'); return {
      state: 'complete', artifactDir, sourceId, files: [] }; },
    record: async (value: any) => {
      calls.push('record');
      assert.deepEqual(value, { project: input.project, artifactDir,
        files: [], store, sourceId, commit, scope, site, workerId });
      return receipt;
    },
  } as any;
  return { artifactDir, calls, deps, receipt };
}

test('verified source builds once and records exact scoped handoff', async () => {
  const f = await fixture();
  assert.deepEqual(await configuredNativeStudioBuildHandoff(input, {}, f.deps),
    f.receipt);
  assert.deepEqual(f.calls, ['site', 'verify', 'build', 'site', 'record']);
  await assert.rejects(stat(f.artifactDir), { code: 'ENOENT' });
});

test('source mismatch stops before running the Sandbox build', async () => {
  const f = await fixture();
  f.deps.verifySource = async () => ({ sourceId, commit: 'd'.repeat(40),
    repository: site.repository, branch: site.branch });
  await assert.rejects(configuredNativeStudioBuildHandoff(input, {}, f.deps),
    /source_unverified/);
  assert(!f.calls.includes('build'));
  await rm(f.artifactDir, { recursive: true, force: true });
});

test('running detached build returns before artifact transfer', async () => {
  const f = await fixture();
  f.deps.build = async () => ({ state: 'running' });
  assert.deepEqual(await configuredNativeStudioBuildHandoff(input, {}, f.deps),
    { state: 'running' });
  assert.deepEqual(f.calls, ['site', 'verify']);
  await rm(f.artifactDir, { recursive: true, force: true });
});

test('unreserved Worker ID stops before checkout verification or build', async () => {
  const f = await fixture();
  await assert.rejects(configuredNativeStudioBuildHandoff({ ...input,
    workerId: 'f'.repeat(32) }, {}, f.deps), /resources_unverified/);
  assert.deepEqual(f.calls, ['site']);
  await rm(f.artifactDir, { recursive: true, force: true });
});

test('changed site after build prevents receipt and removes output', async () => {
  const f = await fixture();
  let reads = 0;
  f.deps.site = async () => ++reads === 1 ? site : { ...site,
    repository: 'example/changed' };
  await assert.rejects(configuredNativeStudioBuildHandoff(input, {}, f.deps),
    /target_changed/);
  assert(!f.calls.includes('record'));
  await assert.rejects(stat(f.artifactDir), { code: 'ENOENT' });
});

test('failed receipt write removes output for a safe retry', async () => {
  const f = await fixture();
  f.deps.record = async () => { throw Error('receipt failed'); };
  await assert.rejects(configuredNativeStudioBuildHandoff(input, {}, f.deps),
    /receipt failed/);
  await assert.rejects(stat(f.artifactDir), { code: 'ENOENT' });
});

test('unexpected build directory is never removed', async () => {
  const f = await fixture();
  const protectedDir = await mkdtemp(join(tmpdir(), 'gnr8-protected-'));
  f.deps.build = async () => ({ state: 'complete', artifactDir: protectedDir,
    sourceId, files: [] });
  await assert.rejects(configuredNativeStudioBuildHandoff(input, {}, f.deps),
    /artifact_invalid/);
  assert((await stat(protectedDir)).isDirectory());
  await rm(protectedDir, { recursive: true, force: true });
  await rm(f.artifactDir, { recursive: true, force: true });
});

test('configured build feeds its exact output into the real handoff receipt', async () => {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-handoff-integration-'));
  const artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-native-build-artifact-'));
  const project = join(root, 'source');
  try {
    await mkdir(join(project, 'studio'), { recursive: true });
    await mkdir(join(artifactDir, 'dist'));
    await mkdir(join(artifactDir, 'studio/dist'), { recursive: true });
    await writeFile(join(artifactDir, 'dist/index.html'), '<main>site</main>');
    await writeFile(join(artifactDir, 'studio/dist/studio.js'), 'built');
    const files = await scanStudioBuildOutputs(artifactDir);
    const saved = new Map<string, unknown>([
      ['native-studio/resources-reserved-v1.json', reserved],
    ]);
    const store = { read: async (key: string) => saved.get(key) ?? null,
      claim: async (key: string, value: unknown) => {
        if (saved.has(key)) return false;
        saved.set(key, value); return true;
      } };
    const verifySource = async () => ({ sourceId, commit,
      repository: site.repository, branch: site.branch });
    const deps = { site: async () => site, store: () => store, verifySource,
      build: async () => ({ state: 'complete', artifactDir, sourceId, files }),
      record: (value: any) => recordStudioSandboxBuildArtifact(value,
        { verifySource }),
    } as any;
    const receipt = await configuredNativeStudioBuildHandoff({ ...input,
      project }, {}, deps);
    assert.deepEqual(receipt.files, files);
    assert.deepEqual(saved.get('native-studio/build-handoff-v1.json'), receipt);
    assert.equal(await readFile(join(project, 'dist/index.html'), 'utf8'),
      '<main>site</main>');
    await assert.rejects(stat(artifactDir), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(artifactDir, { recursive: true, force: true });
  }
});
