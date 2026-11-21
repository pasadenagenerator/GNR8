import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, symlink, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareGitBranch, commitPreparedStudio, prepareGitBranchFromSource, commitPreparedSource } from './prepare-git-branch.mjs';
import { createHash } from 'node:crypto';
import { exportStandaloneProject } from '../../apps/platform/gnr8/standalone/standalone-export.ts';
import { prepareFromConfirmedExport, prepareFromVerifiedAstroExport, prepareFromStoredRelease, persistPreparedStudio, persistVerifiedAstroStudio, readStoredVerifiedAstroStudio } from './prepare-from-confirmed-export.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
const id = '11111111-1111-4111-8111-111111111111';
const scope = { agencyId: id, clientId: id, siteId: id, siteVersionId: id };
const site = { siteId: id, repository: 'example/website', repositoryId: '123', branch: 'main',
  studioOrigin: 'https://website.example.com', accountId: 'a'.repeat(32), appId: '456', installationId: '789', clientId: 'Iv1.example' };
const releaseFile = process.env.STACKI_RELEASE_FILE;
async function fixture() {
  const baseline = [
    { path: 'package.json', base64: Buffer.from('{"dependencies":{"astro":"5.18.2"}}').toString('base64') },
    { path: 'src/pages/index.astro', base64: Buffer.from('<h1>Approved import</h1>').toString('base64') },
  ];
  const exported = await exportStandaloneProject({ baseline, selection: { kind: 'generated-source', scope, sha256: 'a'.repeat(64) }, sourceArtifact: { id, sha256: 'b'.repeat(64) }, assets: [] });
  const release = { id: 'd'.repeat(64), input: { selection: exported.manifest.selection }, target: { githubOwner: 'example', repository: 'website', provisionedRepositoryId: 123 },
    foundation: { confirmationSha256: 'c'.repeat(64) }, manifestSha256: exported.manifestSha256,
    contactRequired: false, files: exported.files.map(file => ({ path: file.path, bytes: file.body.length, sha256: sha(file.body) })) };
  return { release, files: exported.files, exported };
}
test('verified Astro export prepares the same offline Studio without a Vercel release', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async () => {
  const { release, files, exported } = await fixture();
  const direct = await prepareFromVerifiedAstroExport({
    exported, selection: release.input.selection,
    confirmationSha256: release.foundation.confirmationSha256, releaseFile, site });
  const legacy = await prepareFromConfirmedExport({ release, files, releaseFile, site });
  assert.deepEqual(direct, legacy);
  assert.equal(direct.status.hosted, false);
  assert.equal(direct.confirmationSha256, release.foundation.confirmationSha256);
  await assert.rejects(prepareFromVerifiedAstroExport({
    exported: { ...exported, files: files.map(file => file.path === 'src/pages/index.astro' ?
      { ...file, body: Buffer.from('altered') } : file) },
    selection: release.input.selection, confirmationSha256: release.foundation.confirmationSha256,
    releaseFile, site }), /mismatch/);
  await assert.rejects(prepareFromVerifiedAstroExport({
    exported, selection: release.input.selection,
    confirmationSha256: release.foundation.confirmationSha256, releaseFile,
    site: { ...site, siteId: '22222222-2222-4222-8222-222222222222' } }), /mismatch/);
});
test('target-free Studio source persists once and binds export, confirmation and site', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async () => {
  const { release, exported } = await fixture();
  const objects = new Map(), bytes = new Map();
  let loads = 0;
  const store = {
    read: async key => objects.get(key) ?? null,
    getBytes: async hash => bytes.get(hash),
    putBytes: async (hash, body) => { assert.equal(hash, sha(body)); bytes.set(hash, body); },
    put: async (key, value) => {
      if (objects.has(key)) assert.deepEqual(objects.get(key), value);
      else objects.set(key, value);
      return value;
    },
  };
  const request = { store, exported, selection: release.input.selection,
    confirmationSha256: release.foundation.confirmationSha256, site,
    getReleaseFile: async () => { loads++; return releaseFile; } };
  const first = await persistVerifiedAstroStudio(request);
  const again = await persistVerifiedAstroStudio(request);
  assert.equal(first.reused, false);
  assert.equal(again.reused, true);
  assert.deepEqual(first.files, again.files);
  assert.equal(loads, 1);
  assert.equal(objects.size, 1);
  assert.equal(first.receipt.confirmationSha256, request.confirmationSha256);
  assert.equal(first.receipt.sourceManifestSha256, exported.manifestSha256);
  assert.equal(first.receipt.files.some(file => file.path === 'vercel.json'), false);
  const different = await persistVerifiedAstroStudio({ ...request, confirmationSha256: 'd'.repeat(64) });
  assert.notEqual(different.receipt.identitySha256, first.receipt.identitySha256);
  assert.equal(objects.size, 2);
  const changedSite = await persistVerifiedAstroStudio({ ...request, site: { ...site, branch: 'codex/other' } });
  assert.notEqual(changedSite.receipt.identitySha256, first.receipt.identitySha256);
  assert.equal(objects.size, 3);
  assert.deepEqual((await readStoredVerifiedAstroStudio({ store, sourceId:first.receipt.identitySha256, site })).files, first.files);
  await assert.rejects(readStoredVerifiedAstroStudio({ store, sourceId:first.receipt.identitySha256,
    site: { ...site, branch: 'other' } }), /mismatch/);
  const key = `native-sources/${first.receipt.identitySha256}.json`;
  const original = objects.get(key);
  objects.set(key, { ...original, files: [{ path: '.git/config', sha256: sha(Buffer.from('bad')), bytes: 3 }] });
  await assert.rejects(readStoredVerifiedAstroStudio({ store, sourceId:first.receipt.identitySha256, site }), /mismatch/);
  objects.set(key, original);
  const file = first.receipt.files.find(item => item.path === 'src/pages/index.astro');
  bytes.set(file.sha256, Buffer.from('tampered'));
  await assert.rejects(persistVerifiedAstroStudio(request), /mismatch/);
  assert.equal(objects.size, 3);
});

test('target-free stored package stages and commits only on its dedicated local branch',
 { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async t => {
  const { release, exported } = await fixture();
  const objects = new Map(), bytes = new Map();
  const store = {
    read: async key => objects.get(key) ?? null,
    getBytes: async hash => bytes.get(hash),
    putBytes: async (hash, body) => { assert.equal(hash, sha(body)); bytes.set(hash, body); },
    put: async (key, value) => { objects.set(key, value); return value; },
  };
  const saved = await persistVerifiedAstroStudio({ store, exported,
    selection: release.input.selection, confirmationSha256: release.foundation.confirmationSha256,
    releaseFile, site });
  const sourceId = saved.receipt.identitySha256;
  const root = await mkdtemp(join(tmpdir(), 'gnr8-direct-studio-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q', '-b', site.branch);
  git('config', 'user.name', 'Local Test');git('config', 'user.email', 'local@example.com');
  git('remote', 'add', 'origin', 'https://github.com/example/website.git');
  git('commit', '-q', '--allow-empty', '-m', 'Initialize');
  const request = { project:root,store,sourceId,site };
  const staged = await prepareGitBranchFromSource(request);
  assert.equal(staged.sourceId,sourceId);assert.equal(staged.pushed,false);
  assert(staged.stagedFiles.includes('studio/src/cloudflare/site.ts'));
  const committed = await commitPreparedSource({ ...request, author:{name:'Local Test',email:'local@example.com'} });
  assert.match(committed.commit,/^[a-f0-9]{40}$/);
  assert.deepEqual(await commitPreparedSource({ ...request, author:{name:'Local Test',email:'local@example.com'} }),committed);
  await assert.rejects(prepareGitBranchFromSource({ ...request, site:{ ...site,repository:'example/other' } }),/differs/);
  await writeFile(join(root,'.git/info/attributes'),'*.astro filter=custom\n');
  await assert.rejects(prepareGitBranchFromSource(request),/Git filters/);
  const other = await mkdtemp(join(tmpdir(), 'gnr8-direct-studio-link-'));
  t.after(() => rm(other, { recursive:true,force:true }));
  const otherGit=(...args)=>execFileSync('git',['-C',other,...args],{encoding:'utf8'}).trim();
  otherGit('init','-q','-b',site.branch);
  otherGit('config','user.name','Local Test');otherGit('config','user.email','local@example.com');
  otherGit('remote','add','origin','https://github.com/example/website.git');
  await mkdir(join(other,'outside'));
  await symlink('outside',join(other,'studio'));
  otherGit('add','studio');otherGit('commit','-q','-m','Existing link');
  await assert.rejects(prepareGitBranchFromSource({ ...request,project:other }),/symbolic link/);
});
test('confirmed export bytes and repository identity yield repeatable native Studio source', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async () => {
  const { release, files } = await fixture();
  const one = await prepareFromConfirmedExport({ release, files, releaseFile, site });
  const store = { read: async key => key === `releases/${release.id}/release.json` ? release : null,
    getBytes: async hash => files.find(file => sha(file.body) === hash)?.body };
  const two = await prepareFromStoredRelease({ store, releaseId: release.id, releaseFile, site });
  assert.deepEqual(one, two);
  const objects = new Map();
  const bytes = new Map(files.map(file => [sha(file.body), file.body]));
  const durable = { read: async key => key === `releases/${release.id}/release.json` ? release : objects.get(key) ?? null,
    getBytes: async hash => bytes.get(hash),
    putBytes: async (hash, body) => { assert.equal(hash, sha(body)); bytes.set(hash, body); },
    put: async (key, value) => { if (objects.has(key)) assert.deepEqual(objects.get(key), value); else objects.set(key, value); return value; } };
  let loads = 0;
  const getReleaseFile = async () => { loads++; return releaseFile; };
  const saved = await persistPreparedStudio({ store: durable, releaseId: release.id, site, getReleaseFile });
  assert.equal(saved.reused, false);
  const resumed = await persistPreparedStudio({ store: durable, releaseId: release.id, site, getReleaseFile });
  assert.equal(loads, 1);
  assert.equal(resumed.reused, true);
  assert.deepEqual(saved.files, resumed.files);
  assert.equal(objects.size, 1);

  assert.equal(one.sourceManifestSha256, release.manifestSha256);
  assert(one.files.some(file => file.path === 'studio/src/cloudflare/site.ts'));
  assert.equal(one.files.some(file => file.path === 'vercel.json'), false);
  assert(one.files.some(file => file.path === 'README.native-studio.md'));
  assert.deepEqual(one.files.find(file => file.path === 'source-manifest.json')?.body, files.find(file => file.path === 'source-manifest.json')?.body);
  assert(one.files.some(file => file.path === 'wrangler.json'));
  assert.deepEqual(one.files.find(file => file.path === 'src/pages/index.astro')?.body, files.find(file => file.path === 'src/pages/index.astro')?.body);
  assert.equal(one.files.some(file => file.path === '.gnr8/native-studio.json'), false);
  await assert.rejects(prepareFromConfirmedExport({ release, files: files.map(file => file.path === 'src/pages/index.astro' ? { ...file, body: Buffer.from('changed') } : file), releaseFile, site }), /mismatch/);
  await assert.rejects(prepareFromConfirmedExport({ release, files, releaseFile, site: { ...site, repositoryId: '999' } }), /mismatch/);
  await assert.rejects(prepareFromConfirmedExport({ release: { ...release, contactRequired: true }, files, releaseFile, site }), /mismatch/);
  await assert.rejects(prepareFromConfirmedExport({ release: { ...release, foundation: null }, files, releaseFile, site }), /mismatch/);
});

test('prepared native source stages once on its dedicated stable branch', { skip: !releaseFile && 'Set STACKI_RELEASE_FILE' }, async t => {
  const { release, files } = await fixture();
  const root = await mkdtemp(join(tmpdir(), 'gnr8-native-git-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  git('init', '-q', '-b', site.branch);
  git('config', 'user.name', 'Local Test'); git('config', 'user.email', 'local@example.com');
  git('remote', 'add', 'origin', 'https://github.com/example/website.git');
  git('commit', '-q', '--allow-empty', '-m', 'Initialize');
  const store = { read: async key => key === `releases/${release.id}/release.json` ? release : null,
    getBytes: async hash => files.find(file => sha(file.body) === hash)?.body };
  const first = await prepareGitBranch({ project: root, store, releaseId: release.id, releaseFile, site });
  assert.equal(first.branch, 'main'); assert.equal(first.committed, false); assert.equal(first.pushed, false);
  assert(first.stagedFiles.includes('studio/src/cloudflare/site.ts'));
  assert.equal(first.stagedFiles.includes('vercel.json'), false);
  assert.deepEqual(await prepareGitBranch({ project: root, store, releaseId: release.id, releaseFile, site }), first);
  const committed = await commitPreparedStudio({ project: root, store, releaseId: release.id, releaseFile, site,
    author: { name: 'Local Test', email: 'local@example.com' } });
  assert.equal(committed.committed, true);
  assert.match(committed.commit, /^[a-f0-9]{40}$/);
  assert.deepEqual(await commitPreparedStudio({ project: root, store, releaseId: release.id, releaseFile, site,
    author: { name: 'Local Test', email: 'local@example.com' } }), committed);
  await assert.rejects(prepareGitBranch({ project: root, store, releaseId: release.id, releaseFile, site: { ...site, repository: 'example/other' } }), /mismatch|differs/);
});
