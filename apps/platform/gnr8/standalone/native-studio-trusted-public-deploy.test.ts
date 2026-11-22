import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuration } from '../../../../scripts/stacki/prepare-native-studio.mjs';
import { fingerprint } from './publication-contract';
import { PUBLIC_INTENT } from './native-studio-configured-public-deploy-intent';
import { runTrustedNativeStudioPublicDeploy } from './native-studio-trusted-public-deploy';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const site = { siteId: scope.siteId, accountId: 'a'.repeat(32),
  repository: 'example/site', repositoryId: '42', branch: 'codex/native-stacki',
  studioOrigin: 'https://site.app.pasadenagenerator.com',
  appId: '10', installationId: '11', clientId: 'Iv1.example' };
const sourceId = 'b'.repeat(64), commit = 'c'.repeat(40);
const studioWorkerId = 'd'.repeat(32), publicWorkerId = 'e'.repeat(32);
const studioIdentity = 'f'.repeat(64), studioTag = `gnr8-first-${studioIdentity}`;
const cloudflareCredential = 'g'.repeat(40);
const domain = new URL(site.studioOrigin).hostname;
const identity = fingerprint({ scope, accountId: site.accountId,
  sourceId, commit, publicWorkerId, studioTag, domain,
  repository: site.repository });

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-public-deploy-test-'));
  const project = join(root, 'project');
  await mkdir(project);
  await mkdir(join(project, 'studio'));
  await writeFile(join(project, 'wrangler.json'),
    configuration(site).files.get('wrangler.json')!);
  const saved = new Map<string, unknown>([
    [PUBLIC_INTENT, { identity, commit, publicWorkerId }],
    ['native-studio/first-deploy-intent-v1.json',
      { identity: studioIdentity, commit }],
    ['native-studio/first-deploy-attempt-v1.json',
      { identity: studioIdentity, commit }],
  ]);
  const store = {
    read: async <T>(key: string) => (saved.get(key) ?? null) as T | null,
    claim: async (key: string, value: unknown) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    },
  };
  const calls: string[] = [];
  const deps = {
    site: async () => site,
    verifySource: async () => ({ sourceId, commit,
      branch: site.branch, repository: site.repository }),
    verifyHandoff: async () => ({ scope, sourceId, commit,
      workerId: studioWorkerId }),
    head: async () => ({ repositoryId: site.repositoryId,
      branch: site.branch, commit }),
    studio: async () => ({ state: 'verified-source-control-plane',
      workerId: studioWorkerId }),
    vacancy: async () => { calls.push('vacancy'); return {
      state: 'vacant', workerId: publicWorkerId, domain }; },
    invoke: async (_file: string, args: string[], options: any) => {
      calls.push('invoke');
      assert.deepEqual(args, ['deploy', '--config', 'wrangler.json',
        '--tag', `gnr8-public-first-${identity}`]);
      assert.equal(options.cwd, await realpath(project));
      assert.equal(options.shell, false);
      assert.equal(options.env.CLOUDFLARE_API_TOKEN, cloudflareCredential);
      assert.equal(options.env.GNR8_TEST_AMBIENT_SECRET, undefined);
    },
  } as any;
  const input = { scope, client: {} as SupabaseClient, store,
    project, sourceId, commit, studioWorkerId, publicWorkerId, studioTag,
    trustedWrangler: process.execPath, cloudflareCredential };
  return { root, project, saved, calls, deps, input };
}

test('one public deploy uses the exact root config and isolated command', async t => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  assert.deepEqual(await runTrustedNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), { state: 'attempted', commit, publicWorkerId,
    tag: `gnr8-public-first-${identity}` });
  assert.deepEqual(f.calls, ['vacancy', 'invoke']);
  assert.deepEqual(f.saved.get('native-studio/first-public-deploy-attempt-v1.json'),
    { identity, commit, publicWorkerId });
  await assert.rejects(runTrustedNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), /already_attempted/);
  assert.equal(f.calls.filter(value => value === 'invoke').length, 1);
});

test('changed config and occupied domain stop before claiming an attempt', async t => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await writeFile(join(f.project, 'wrangler.json'), '{}');
  await assert.rejects(runTrustedNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), /config_unverified/);
  assert.equal(f.saved.has('native-studio/first-public-deploy-attempt-v1.json'), false);
  await writeFile(join(f.project, 'wrangler.json'),
    configuration(site).files.get('wrangler.json')!);
  f.deps.vacancy = async () => { throw Error('domain occupied'); };
  await assert.rejects(runTrustedNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), /domain occupied/);
  assert.equal(f.saved.has('native-studio/first-public-deploy-attempt-v1.json'), false);
});

test('checkout dotenv files cannot enter the credentialed Wrangler process', async t => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  await writeFile(join(f.project, '.env.production'), 'UNEXPECTED=secret');
  await assert.rejects(runTrustedNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), /local_env_forbidden/);
  assert.equal(f.saved.has('native-studio/first-public-deploy-attempt-v1.json'), false);
  assert.equal(f.calls.includes('invoke'), false);
});

test('an ambiguous provider failure never permits a second deploy', async t => {
  const f = await fixture();
  t.after(() => rm(f.root, { recursive: true, force: true }));
  f.deps.invoke = async () => { f.calls.push('invoke');
    throw Error('private provider message'); };
  await assert.rejects(runTrustedNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), error => error instanceof Error &&
      error.message === 'native_studio_public_deploy_failed');
  await assert.rejects(runTrustedNativeStudioPublicDeploy(f.input,
    {}, fetch, f.deps), /already_attempted/);
  assert.equal(f.calls.filter(value => value === 'invoke').length, 1);
});
