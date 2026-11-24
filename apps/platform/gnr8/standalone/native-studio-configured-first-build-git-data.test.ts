import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordNativeStudioBuildOutputBytes,
  restoreNativeStudioBuildOutputBytes } from '../../../../scripts/stacki/build-output-bytes.mjs';
import { configuredNativeStudioFirstBuildGitData } from './native-studio-configured-first-build-git-data';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki',
  accountId: 'a'.repeat(32), studioOrigin: 'https://site.example.com' };
const sourceId = 'b'.repeat(64), baseCommit = 'c'.repeat(40);
const commit = 'd'.repeat(40), workerId = 'e'.repeat(32);
const artifactCommit = 'f'.repeat(40), artifactTree = '1'.repeat(40);
const digest = body => createHash('sha256').update(body).digest('hex');

test('first build uses verified bytes and Git Data refs without host Git', async () => {
  const records = new Map<string, any>();
  const chunks = new Map<string, Buffer>();
  records.set('native-studio/resources-reserved-v1.json', { target: {
    scope, accountId: site.accountId, repository: site.repository,
    repositoryId: 42, studioOrigin: site.studioOrigin },
    workers: { studio: { id: workerId } } });
  const store = { read: async (key: string) => records.get(key) ?? null,
    claim: async (key: string, value: any) => {
      if (records.has(key)) return false;
      records.set(key, value); return true;
    },
    putBytes: async (key: string, value: Buffer) => { chunks.set(key, value); },
    getBytes: async (key: string) => chunks.get(key)! };
  const refs = new Map<string, string>();
  const calls: string[] = [];
  const deps = {
    site: async () => site,
    store: () => store,
    source: async () => ({ files: [{
      path: 'studio/cloudflare/wrangler.jsonc',
      body: Buffer.from(JSON.stringify({ vars: { EDITOR_ACCESS: 'repository',
        AUTH_PROVIDER: 'github' } })),
    }] }),
    token: async () => ({ repositoryId: site.repositoryId,
      token: `ghs_${'a'.repeat(40)}` }),
    head: async (target: typeof site) => ({ repositoryId: target.repositoryId,
      branch: target.branch, commit: refs.get(target.branch) ?? null,
      baseCommit }),
    prepareSource: async () => { calls.push('source'); return {
      sourceId, baseCommit, commit, repository: site.repository,
      branch: site.branch }; },
    build: async () => {
      calls.push('build');
      const artifactDir = await mkdtemp(join(tmpdir(), 'gnr8-native-build-artifact-'));
      await mkdir(join(artifactDir, 'dist'));
      await mkdir(join(artifactDir, 'studio', 'dist'), { recursive: true });
      await writeFile(join(artifactDir, 'dist', 'index.html'), '<html/>');
      await writeFile(join(artifactDir, 'studio', 'dist', 'app.js'), 'app()');
      return { state: 'complete', artifactDir, sourceId, files: [
        { path: 'dist/index.html', bytes: 7,
          sha256: digest(Buffer.from('<html/>')) },
        { path: 'studio/dist/app.js', bytes: 5,
          sha256: digest(Buffer.from('app()')) },
      ] };
    },
    recordBytes: recordNativeStudioBuildOutputBytes,
    restoreBytes: restoreNativeStudioBuildOutputBytes,
    prepareArtifact: async () => { calls.push('artifact'); return {
      branch: `gnr8-build-${commit}`, commit: artifactCommit,
      tree: artifactTree }; },
    publishRef: async ({ site: target, commit: value }: any) => {
      calls.push(`ref:${target.branch}`); refs.set(target.branch, value);
      return { state: 'verified', commit: value };
    },
    accessCandidates: async () => { throw Error('not access mode'); },
    verifyRoles: () => { throw Error('not access mode'); },
  };
  const result = await configuredNativeStudioFirstBuildGitData({ scope,
    client: {} as SupabaseClient, sourceId,
    author: { name: 'GNR8 Build', email: 'build@pasadenagenerator.com' } },
  {}, (async () => { throw Error('no provider call'); }) as typeof fetch,
  deps as any);
  assert.deepEqual(result, { sourceId, commit, workerId,
    artifactBranch: `gnr8-build-${commit}`, artifactCommit });
  assert.deepEqual(calls, ['source', 'build', `ref:${site.branch}`,
    'artifact', `ref:gnr8-build-${commit}`]);
  assert.deepEqual(records.get('native-studio/build-handoff-v1.json').files,
    records.get('native-studio/build-output-bytes-v1.json').files.map(
      (file: any) => ({ path: file.path, bytes: file.bytes,
        sha256: file.sha256 })));
  assert.equal(records.get('native-studio/first-github-push-intent-v1.json').commit,
    commit);
  assert.equal(records.get('native-studio/build-artifact-github-push-v1.json')
    .artifactCommit, artifactCommit);
});
