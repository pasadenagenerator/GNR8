import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareFirstStudioDeployIntentFromHandoff } from './first-studio-deploy-intent.mjs';
import { runTrustedStudioDeploy } from './trusted-studio-deploy.mjs';

const scope = { agencyId: '11111111-1111-4111-8111-111111111111',
  clientId: '22222222-2222-4222-8222-222222222222',
  siteId: '33333333-3333-4333-8333-333333333333' };
const accountId = 'a'.repeat(32);
const workerId = 'b'.repeat(32);
const sourceId = 'c'.repeat(64);
const commit = 'd'.repeat(40);
const token = 'e'.repeat(40);
const site = { siteId: scope.siteId, repository: 'example/site',
  repositoryId: '42', branch: 'codex/native-stacki', accountId,
  studioOrigin: 'https://site.app.pasadenagenerator.com' };
const secrets = { AI_API_KEY: 'a'.repeat(32), CONTAINER_TOKEN: 'b'.repeat(32),
  GITHUB_CLIENT_SECRET: 'c'.repeat(32), GITHUB_PRIVATE_KEY: 'd'.repeat(32),
  PUBLISH_CLOUDFLARE_API_TOKEN: 'e'.repeat(40), SESSION_SECRET: 'f'.repeat(32) };

function fixture() {
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => { if (saved.has(key)) return false;
      saved.set(key, value); return true; } };
  let current = site;
  let githubCommit = commit;
  let cloudflare = { state: 'pending', reason: 'no-deployment' };
  const input = { project: '/unused', store, sourceId, commit, scope, site,
    accountId, workerId, token, secrets };
  const deps = {
    readSite: async () => current,
    verifyHandoff: async () => ({ sourceId, commit, scope, workerId }),
    inspectGitHubHead: async () => ({ repositoryId: site.repositoryId,
      branch: site.branch, commit: githubCommit }),
    inspectCloudflare: async () => cloudflare,
  };
  return { input, deps, saved, setSite: value => { current = value; },
    setGitHubCommit: value => { githubCommit = value; },
    setCloudflare: value => { cloudflare = value; } };
}

test('post-build intent feeds the exact trusted deploy gate without rebuilding', async () => {
  const f = fixture();
  const result = await prepareFirstStudioDeployIntentFromHandoff(f.input, f.deps);
  assert.equal(result.state, 'prepared');
  assert.equal(result.commit, commit);
  assert.deepEqual(result.args.slice(0, 4), ['deploy', '--config',
    'cloudflare/wrangler.jsonc', '--tag']);
  assert.equal(result.args[4], result.tag);
  const root = await mkdtemp(join(tmpdir(), 'gnr8-post-build-deploy-'));
  await mkdir(join(root, 'studio'));
  let invoked = 0;
  try {
    await runTrustedStudioDeploy({ file: process.execPath, args: result.args,
      cwd: join(root, 'studio'), token, secrets, scope, accountId, workerId,
      sourceId, site, store: f.input.store, commit }, {
      verifySource: async () => ({ sourceId, commit, branch: site.branch,
        repository: site.repository }),
      inspectGitHubHead: f.deps.inspectGitHubHead,
      invoke: async () => { invoked++; },
    });
    assert.equal(invoked, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
  assert.equal((await prepareFirstStudioDeployIntentFromHandoff(f.input, f.deps)).state,
    'pending-review');
});

test('wrong GitHub head or existing Cloudflare deployment claims no intent', async () => {
  const f = fixture();
  f.setGitHubCommit('f'.repeat(40));
  await assert.rejects(prepareFirstStudioDeployIntentFromHandoff(f.input, f.deps),
    /github_head_unverified/);
  assert.equal(f.saved.size, 0);
  f.setGitHubCommit(commit);
  f.setCloudflare({ state: 'verified-source-control-plane' });
  await assert.rejects(prepareFirstStudioDeployIntentFromHandoff(f.input, f.deps),
    /existing_deployment/);
  assert.equal(f.saved.size, 0);
});

test('changed authoritative site fails before any intent', async () => {
  const f = fixture();
  f.setSite({ ...site, repositoryId: '43' });
  await assert.rejects(prepareFirstStudioDeployIntentFromHandoff(f.input, f.deps),
    /target_changed/);
  assert.equal(f.saved.size, 0);
});
