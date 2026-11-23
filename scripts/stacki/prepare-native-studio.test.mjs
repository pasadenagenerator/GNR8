import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STACKI_RELEASE_PIN, configuration, prepareNativeStudio } from './prepare-native-studio.mjs';
import { exportStandaloneProject } from '../../apps/platform/gnr8/standalone/standalone-export.ts';

const id = '11111111-1111-4111-8111-111111111111';
const site = { siteId: id, repository: 'example/site-one', repositoryId: '123', branch: 'astro/confirmed',
  studioOrigin: 'https://one.example.com', accountId: 'a'.repeat(32), appId: '456', installationId: '789', clientId: 'Iv1.example' };
const access = { version: 2, provider: 'access', aud: 'b'.repeat(64),
  teamDomain: 'gnr8.cloudflareaccess.com',
  admins: ['access:owner@example.com', 'access:admin@example.com'] };
const releaseFile = process.env.STACKI_RELEASE_FILE;
async function project(t) {
  const root = await mkdtemp(join(tmpdir(), 'gnr8-native-studio-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const baseline = [
    { path: 'package.json', base64: Buffer.from('{"dependencies":{"astro":"5.18.2"}}').toString('base64') },
    { path: 'src/pages/index.astro', base64: Buffer.from('<h1>Retained imported content</h1>').toString('base64') },
  ];
  const exported = await exportStandaloneProject({ baseline, selection: { kind: 'generated-source',
    scope: { agencyId: id, clientId: id, siteId: id, siteVersionId: id }, sha256: 'a'.repeat(64) },
    sourceArtifact: { id, sha256: 'b'.repeat(64) }, assets: [] });
  for (const file of exported.files) {
    const path = join(root, file.path); await mkdir(join(path, '..'), { recursive: true }); await writeFile(path, file.body);
  }
  return { root, exported };
}

test('two sites share the pin and native gateway but have separate runtime, draft and repository bindings', () => {
  const first = configuration(site), second = configuration({ ...site, siteId: id.replace(/^1/, '2'), repository: 'example/site-two', repositoryId: '124', studioOrigin: 'https://two.example.com' });
  const config = value => JSON.parse(value.files.get('studio/cloudflare/wrangler.jsonc'));
  const a = config(first), b = config(second);
  assert.notEqual(a.name, b.name); assert.notEqual(a.r2_buckets[0].bucket_name, b.r2_buckets[0].bucket_name);
  assert.notEqual(a.vars.GITHUB_REPOSITORY, b.vars.GITHUB_REPOSITORY);
  assert.equal(a.vars.EDITOR_ACCESS, 'repository'); assert.equal(a.containers[0].max_instances, 1);
  assert.equal(a.vars.PREVIEW_ORIGIN, 'https://preview.one.example.com');
  assert.equal(a.vars.AI_BASE_URL, 'https://api.openai.com/v1');
  assert.equal(a.vars.AI_MODEL, 'gpt-5.4-mini-2026-03-17');
  assert.equal(a.vars.AI_API_KEY, undefined);
  assert.equal(a.main, b.main);
  assert.equal(a.vars.GITHUB_DEPLOY_WORKER, undefined);
  assert.equal(a.vars.GITHUB_DEPLOY_ACCOUNT, undefined);
  const publish = JSON.parse(first.files.get('.stacki/publish.json'));
  const gateway = JSON.parse(first.files.get('wrangler.json'));
  assert.equal(publish.hosting.provider, 'cloudflare-workers');
  assert.equal(publish.hosting.project, gateway.name);
  assert.equal(publish.hosting.accountId, gateway.account_id);
  assert.equal(gateway.main, './studio/src/cloudflare/site.ts');
  assert.equal(gateway.assets.directory, './dist');
  assert.throws(() => configuration({ ...site, token: 'do-not-store' }), /non-secret/);
  assert.throws(() => configuration({ ...site, studioOrigin: 'http://one.example.com' }), /HTTPS/);
});

test('Access v2 adds exact native auth and roles without changing legacy files', () => {
  const legacy = configuration(site);
  const configured = configuration(site, access);
  assert.deepEqual(configuration(site, undefined), legacy);
  assert.deepEqual(configured.site, legacy.site);
  assert.deepEqual([...configured.files.keys()], [...legacy.files.keys(), '.stacki/roles.json']);
  for (const [path, content] of legacy.files) {
    if (path !== 'studio/cloudflare/wrangler.jsonc')
      assert.equal(configured.files.get(path), content);
  }
  assert.equal(legacy.files.has('.stacki/roles.json'), false);
  const vars = JSON.parse(configured.files.get('studio/cloudflare/wrangler.jsonc')).vars;
  assert.deepEqual({ provider: vars.AUTH_PROVIDER, access: vars.EDITOR_ACCESS,
    teamDomain: vars.ACCESS_TEAM_DOMAIN, aud: vars.ACCESS_AUD,
    bootstrapAdmin: vars.AUTH_BOOTSTRAP_ADMIN }, {
    provider: 'access', access: 'roles', teamDomain: access.teamDomain,
    aud: access.aud, bootstrapAdmin: 'access:admin@example.com',
  });
  assert.deepEqual(JSON.parse(configured.files.get('.stacki/roles.json')), {
    version: 1, defaultRole: 'client', roles: [
      { id: 'admin', members: ['access:admin@example.com', 'access:owner@example.com'] },
      { id: 'client', members: [] },
    ],
  });
  assert.deepEqual(configured.access.admins,
    ['access:admin@example.com', 'access:owner@example.com']);
  for (const invalid of [
    { ...access, aud: '' }, { ...access, teamDomain: 'other.example.com' },
    { ...access, admins: [] }, { ...access, admins: ['access:Owner@example.com'] },
    { ...access, extra: true }, null,
  ]) assert.throws(() => configuration(site, invalid), /Invalid verified Access binding/);
});

test('prepared Access source has a distinct immutable v2 receipt',
  { skip: !releaseFile && 'Set STACKI_RELEASE_FILE to the pinned native release' }, async t => {
    const { root } = await project(t);
    await prepareNativeStudio({ project: root, releaseFile, site, access });
    const receipt = JSON.parse(await readFile(join(root, '.gnr8/native-studio.json'), 'utf8'));
    assert.equal(receipt.format, 'gnr8-native-studio:v2');
    assert.deepEqual(receipt.access.admins,
      ['access:admin@example.com', 'access:owner@example.com']);
    assert.equal(JSON.parse(await readFile(join(root, '.stacki/roles.json'), 'utf8'))
      .defaultRole, 'client');
    await assert.rejects(prepareNativeStudio({ project: root, releaseFile, site }), /differs/);
  });

test('actual standalone export -> pinned native source -> gateway, resumable without recapture or state loss', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE to the pinned native release' }, async t => {
  const { root, exported } = await project(t);
  const result = await prepareNativeStudio({ project: root, releaseFile, site });
  assert.equal(result.hosted, false); assert.equal(result.version, STACKI_RELEASE_PIN.version);
  const native = JSON.parse(await readFile(releaseFile, 'utf8'));
  for (const file of native.files) assert.equal(await readFile(join(root, 'studio', file.path), 'utf8'), file.content);
  for (const file of exported.files) assert.deepEqual(await readFile(join(root, file.path)), file.body);
  await mkdir(join(root, 'studio/.studio-state'));
  await writeFile(join(root, 'studio/.studio-state/draft'), 'keep my draft');
  // Resume after losing a later config write; the source/capture is untouched.
  await rm(join(root, 'wrangler.json'));
  assert.deepEqual(await prepareNativeStudio({ project: root, releaseFile, site }), result);
  assert.equal(await readFile(join(root, 'studio/.studio-state/draft'), 'utf8'), 'keep my draft');
  const { serveSite } = await import(pathToFileURL(join(root, 'studio/src/features/deployment/siteGateway.ts')).href);
  const { parsePublishConfig } = await import(pathToFileURL(join(root, 'studio/vendor/stacki/shared/properties/publishConfig.ts')).href);
  const publishConfig = JSON.parse(await readFile(join(root, '.stacki/publish.json'), 'utf8'));
  assert.equal(parsePublishConfig(publishConfig).hosting.provider, 'cloudflare-workers');
  const forwarded = [];
  const env = { ASSETS: { fetch: async request => { forwarded.push(['asset', request]); return new Response('website'); } },
    STUDIO: { fetch: async request => { forwarded.push(['studio', request]); return new Response('editor'); } }, SITE_VERSION: { tag: 'c'.repeat(40) } };
  for (const path of ['/studio', '/studio/auth/callback', '/studio/api/test', '/studio/ws']) {
    const request = new Request(site.studioOrigin + path, { headers: { cookie: 'session=retained' } });
    assert.equal(await (await serveSite(request, env)).text(), 'editor'); assert.equal(forwarded.at(-1)[1], request);
  }
  assert.equal(await (await serveSite(new Request(site.studioOrigin + '/'), env)).text(), 'website');
  assert.equal(await (await serveSite(new Request(site.studioOrigin + '/studio-other'), env)).text(), 'website');
  const revision = await serveSite(new Request(site.studioOrigin + '/__studio-deployment'), env);
  assert.deepEqual(await revision.json(), { sha: 'c'.repeat(40) }); assert.equal(revision.headers.get('cache-control'), 'no-store');
  await assert.rejects(prepareNativeStudio({ project: root, releaseFile, site: { ...site, repository: 'example/wrong' } }), /differs/);
  await writeFile(join(root, 'studio/src/cloudflare/site.ts'), 'custom edit');
  await assert.rejects(prepareNativeStudio({ project: root, releaseFile, site }), /differs/);
});

test('reject tampered release, server exports and unmanaged Studio before installation', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async t => {
  const { root } = await project(t);
  const bad = join(root, 'bad-release.json'); await writeFile(bad, '{}');
  await assert.rejects(prepareNativeStudio({ project: root, releaseFile: bad, site }), /digest/);
  await mkdir(join(root, 'api'));
  await assert.rejects(prepareNativeStudio({ project: root, releaseFile, site }), /Server routes/);
  await rm(join(root, 'api'), { recursive: true });
  await mkdir(join(root, 'studio'));
  await assert.rejects(prepareNativeStudio({ project: root, releaseFile, site }), /unmanaged/);
  await rm(join(root, 'studio'), { recursive: true });
  await symlink(tmpdir(), join(root, '.gnr8'));
  await assert.rejects(prepareNativeStudio({ project: root, releaseFile, site }), /Symlink/);
});
