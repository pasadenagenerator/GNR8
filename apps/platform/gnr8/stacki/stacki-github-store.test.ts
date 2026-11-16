import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StackiGitHubDelivery } from './stacki-github-delivery';
import { createStackiLocalStorage } from './stacki-local-storage-transport';
import { retainedAssetName } from './stacki-retained-assets';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import test from 'node:test';
import { createStackiRecord, StackiDraftError } from './stacki-draft-contract';
import { GitHubStackiStore } from './stacki-github-store';
import { configuredGitHubStackiStore, stackiGithubSelected } from './stacki-github-config';
import type { pushStandaloneGit } from '../standalone/publication-git';

const scope = { agencyId: '00000000-0000-4000-8000-000000000001',
  clientId: '00000000-0000-4000-8000-000000000002', siteId: '00000000-0000-4000-8000-000000000003',
  siteVersionId: '00000000-0000-4000-8000-000000000004' };
const actor = '00000000-0000-4000-8000-000000000005';
const sha = (value: unknown) => createHash('sha1').update(JSON.stringify(value)).digest('hex');
const file = (path: string, content: string) => ({ path, base64: Buffer.from(content).toString('base64') });
const project = (title: string) => [file('package.json', '{}'), file('astro.config.mjs', 'export default {}'),
  file('src/pages/index.astro', `<h1>${title}</h1>`), file('.studio-state/project.json', '{}')];

function fakeGitHub(blobLatencyMs = 0) {
  const blobs = new Map<string, Buffer>(), trees = new Map<string, any>(), commits = new Map<string, any>();
  const branch = `refs/heads/stacki/${scope.siteVersionId}`;
  const base = 'a'.repeat(40);
  let head: string | null = null;
  let rejectNextRef = false;
  let pushes = 0;
  let activeBlobs = 0, peakBlobs = 0, blobGets = 0;
  const push = async (input: Parameters<typeof pushStandaloneGit>[0]) => {
    pushes++;
    if (rejectNextRef) { rejectNextRef = false; throw Error('ref conflict'); }
    if (input.parent !== (head ?? base)) throw Error('stale parent');
    const entries = input.files.map(file => {
      const id = createHash('sha1').update(`blob ${file.body.length}\0`).update(file.body).digest('hex');
      blobs.set(id, file.body);
      return { path: file.path, mode: '100644', type: 'blob', sha: id };
    });
    const tree = sha(entries);
    trees.set(tree, entries);
    const commit = sha({ tree, parent: input.parent, revision: pushes });
    commits.set(commit, { tree: { sha: tree }, parents: [{ sha: input.parent }] });
    head = commit;
    return { commit, tree };
  };
  const request: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname.replace('/repos/owner/site', '');
    const method = options?.method ?? 'GET';
    const input = options?.body ? JSON.parse(String(options.body)) : null;
    const response = (data: unknown, status = 200) => Response.json(data, { status });
    if (path === '' && method === 'GET') return response({ id: 12, private: true, name: 'site', default_branch: 'main',
      description: `GNR8 standalone site ${scope.siteId}`,
      owner: { id: 10, login: 'owner' }, permissions: { push: true } });
    if (path === '/git/ref/heads/main') return response({ object: { sha: base } });
    if (path === `/git/ref/heads/stacki/${scope.siteVersionId}`) return head
      ? response({ object: { sha: head } }) : response({}, 404);
    if (path === '/git/blobs' && method === 'POST') {
      const body = Buffer.from(input.content, 'base64');
      const id = createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
      blobs.set(id, body); return response({ sha: id });
    }
    if (path.startsWith('/git/blobs/')) {
      blobGets++; peakBlobs = Math.max(peakBlobs, ++activeBlobs);
      if (blobLatencyMs) await new Promise(resolve => setTimeout(resolve, blobLatencyMs));
      const body = blobs.get(path.slice('/git/blobs/'.length));
      activeBlobs--;
      return body ? response({ encoding: 'base64', content: body.toString('base64'), size: body.length }) : response({}, 404);
    }
    if (path === '/git/trees' && method === 'POST') {
      const prior = input.base_tree ? trees.get(input.base_tree) ?? [] : [];
      const merged = new Map<string, any>(prior.map((entry: any) => [entry.path, entry]));
      for (const entry of input.tree) {
        if (entry.sha === null) merged.delete(entry.path);
        else merged.set(entry.path, entry);
      }
      const tree = [...merged.values()];
      const id = sha(tree); trees.set(id, tree); return response({ sha: id });
    }
    if (path.startsWith('/git/trees/')) {
      const id = path.slice('/git/trees/'.length), tree = trees.get(id);
      return tree ? response({ truncated: false, tree }) : response({}, 404);
    }
    if (path === '/git/commits' && method === 'POST') {
      const id = sha(input); commits.set(id, { tree: { sha: input.tree }, parents: input.parents.map((sha: string) => ({ sha })) });
      return response({ sha: id });
    }
    if (path.startsWith('/git/commits/')) return response(commits.get(path.slice('/git/commits/'.length)) ?? {},
      commits.has(path.slice('/git/commits/'.length)) ? 200 : 404);
    if (path === '/git/refs' && method === 'POST') {
      if (head || input.ref !== branch) return response({}, 422);
      head = input.sha; return response({ ref: branch });
    }
    if (path === `/git/refs/heads/stacki/${scope.siteVersionId}` && method === 'PATCH') {
      if (rejectNextRef) { rejectNextRef = false; return response({}, 409); }
      if (commits.get(input.sha)?.parents?.[0]?.sha !== head || input.force !== false) return response({}, 409);
      head = input.sha; return response({ ref: branch });
    }
    throw Error(`unexpected fake GitHub request ${method} ${path}`);
  };
  return { request, push, rejectRef: () => { rejectNextRef = true; }, blobs,
    pushCount: () => pushes, stats: () => ({ blobGets, peakBlobs }) };
}

test('raw import repository lookup validates target and reuses immutable branch parent', async () => {
  const base = 'a'.repeat(40), commit = 'b'.repeat(40), oldParent = 'c'.repeat(40);
  let branchExists = false;
  const request: typeof fetch = async (url) => {
    const path = new URL(String(url)).pathname.replace('/repos/owner/site', '');
    if (path === '') return Response.json({id:12, private:true, name:'site', default_branch:'main',
      description:`GNR8 standalone site ${scope.siteId}`, owner:{id:10, login:'owner'}, permissions:{push:true}});
    if (path === '/git/ref/heads/main') return Response.json({object:{sha:base}});
    if (path === `/git/ref/heads/imports/${scope.siteVersionId}`)
      return branchExists ? Response.json({object:{sha:commit}}) : Response.json({}, {status:404});
    if (path === `/git/ref/heads/artifacts/${scope.siteVersionId}/${'d'.repeat(64)}`)
      return Response.json({}, {status:404});
    if (path === `/git/commits/${commit}`) return Response.json({parents:[{sha:oldParent}]});
    throw Error(`unexpected request ${path}`);
  };
  const store = new GitHubStackiStore(scope, {owner:'owner', ownerId:10, repository:'site',
    repositoryId:12, token:'test-token'}, request);
  assert.deepEqual(await store.rawImportRepository(scope.siteVersionId), {defaultBranch:'main', parent:base});
  assert.deepEqual(await store.immutableRepository(`artifacts/${scope.siteVersionId}/${'d'.repeat(64)}`),
    {defaultBranch:'main', parent:base});
  branchExists = true;
  assert.deepEqual(await store.rawImportRepository(scope.siteVersionId),
    {defaultBranch:'main', parent:oldParent, existingCommit:commit});
});

test('one REST read verifies a Pasadena-sized GitHub checkpoint with bounded concurrency', async () => {
  const git = fakeGitHub(20);
  const store = new GitHubStackiStore(scope, { owner: 'owner', ownerId: 10,
    repository: 'site', repositoryId: 12, token: 'test-token' }, git.request, git.push);
  const record = createStackiRecord(scope, actor, { expectedRevision: 5, files: project('large') });
  const assets = Array.from({ length: 644 }, (_, i) => ({
    name: createHash('sha256').update(`asset-${i}`).digest('hex'), body: randomBytes(115_000) }));
  await store.migrate(record, assets);
  const before = git.stats().blobGets;
  const prepared = await store.prepared();
  assert.equal(prepared?.record.sha256, record.sha256);
  assert.equal(prepared?.assets.length, assets.length);
  for (let i = 0; i < assets.length; i++) assert(prepared?.assets[i].body.equals(assets[i].body));
  assert.equal(git.stats().blobGets - before, assets.length + record.files.length + 1);
  assert.equal(git.stats().peakBlobs, 16);
  const beforeLatest = git.stats().blobGets;
  await store.latest();
  assert.equal(git.stats().blobGets - beforeLatest, record.files.length + 1, 'latest must not download assets');
  const beforeSave = git.stats().blobGets;
  const changed = createStackiRecord(scope, actor, { expectedRevision: record.revision,
    files: project('one changed title') });
  assert.equal((await store.save(scope, actor, { expectedRevision: record.revision,
    files: project('one changed title') })).sha256, changed.sha256);
  assert(git.stats().blobGets - beforeSave < 20, 'Save must not download retained assets');
  assert.equal(git.pushCount(), 1, 'Save must reuse existing Git assets');
  assert.equal((await store.prepared())?.assets.length, assets.length);
});

test('exact legacy migration, Git-only assets and state, verified Save and revision history', async () => {
  const git = fakeGitHub();
  const store = new GitHubStackiStore(scope, { owner: 'owner', ownerId: 10, repository: 'site', repositoryId: 12,
    token: 'test-token' }, git.request, git.push);
  const legacy = createStackiRecord(scope, actor, { expectedRevision: 5, files: project('G3') });
  const asset = { name: 'b'.repeat(64), body: Buffer.from('retained image') };
  assert.equal((await store.migrate(legacy, [asset])).sha256, legacy.sha256);
  assert.equal(git.pushCount(), 1);
  assert.equal((await store.latest())?.revision, 6);
  assert.deepEqual(await store.retainedAssets(), [asset]);
  const saved = await store.save(scope, actor, { expectedRevision: 6, files: project('G4') });
  assert.equal(saved.revision, 7);
  assert.equal((await store.revision(scope, 6)).sha256, legacy.sha256);
  assert.equal((await store.latest())?.sha256, saved.sha256);
  assert.deepEqual(await store.retainedAssets(), [asset]);
  assert.equal((await store.save(scope, actor, { expectedRevision: 6, files: project('G4') })).sha256, saved.sha256);
  const newer = await store.save(scope, actor, { expectedRevision: 7, files: project('G5') });
  assert.deepEqual((await store.history()).map(entry=>entry.revision),[8,7,6]);
  assert.equal((await store.save(scope, actor, { expectedRevision: 6, files: project('G4') })).sha256, saved.sha256);
  await assert.rejects(store.save(scope, actor, { expectedRevision: 6, files: project('stale') }),
    (error: unknown) => error instanceof StackiDraftError && error.code === 'STACKI_DRAFT_CONFLICT');
  git.rejectRef();
  await assert.rejects(store.save(scope, actor, { expectedRevision: 8, files: project('lost') }),
    (error: unknown) => error instanceof StackiDraftError && error.code === 'STACKI_DRAFT_CONFLICT');
  assert.equal((await store.latest())?.sha256, newer.sha256);
});
test('import preflight verifies the owned private repository without reading a branch or blobs', async () => {
  const git=fakeGitHub();
  const store=new GitHubStackiStore(scope,{owner:'owner',ownerId:10,repository:'site',repositoryId:12,token:'test-token'},git.request,git.push);
  await store.verifyTarget();
  assert.equal(git.stats().blobGets,0);
  assert.equal(git.pushCount(),0);
});
test('a broad classic GitHub token cannot activate editor storage', async () => {
  const git = fakeGitHub();
  const broad: typeof fetch = async (url, options) => {
    const response = await git.request(url, options);
    const headers = new Headers(response.headers);
    headers.set('x-oauth-scopes', 'read:user, repo, workflow');
    return new Response(response.body, { status: response.status, headers });
  };
  const store = new GitHubStackiStore(scope, { owner: 'owner', ownerId: 10, repository: 'site', repositoryId: 12,
    token: 'test-token' }, broad);
  await assert.rejects(store.latest(),
    (error: unknown) => error instanceof StackiDraftError && error.code === 'STACKI_GITHUB_CREDENTIAL_TOO_BROAD');
});
test('pilot binding selects only the exact site and configured repository', () => {
  const keys = ['GNR8_STACKI_GITHUB_ENABLED','GNR8_STACKI_GITHUB_SITE_IDS',
    'GNR8_STACKI_GITHUB_TARGETS','GNR8_STACKI_GITHUB_TOKEN'] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.GNR8_STACKI_GITHUB_ENABLED = '1';
    process.env.GNR8_STACKI_GITHUB_SITE_IDS = JSON.stringify([scope.siteId]);
    process.env.GNR8_STACKI_GITHUB_TARGETS = JSON.stringify({[scope.siteId]:
      {owner:'owner',ownerId:10,repository:'site',repositoryId:12}});
    process.env.GNR8_STACKI_GITHUB_TOKEN = 'scoped-test-token';
    assert.equal(stackiGithubSelected(scope), true);
    assert.equal(stackiGithubSelected({...scope,siteId:'ffffffff-ffff-4fff-8fff-ffffffffffff'}), false);
    assert(configuredGitHubStackiStore(scope) instanceof GitHubStackiStore);
    delete process.env.GNR8_STACKI_GITHUB_TOKEN;
    assert.throws(() => configuredGitHubStackiStore(scope), /STACKI_GITHUB_NOT_CONFIGURED/);
  } finally {
    for (const key of keys) if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
  }
});


test('644-asset Open uses one verified package, no Git assets; Save and reopen preserve source and commit', async t => {
  const root = await mkdtemp(join(tmpdir(), 'stacki-git-delivery-'));
  try {
    const storage = createStackiLocalStorage(root);
    const cache = new StackiGitHubDelivery(storage.client, storage.bucket);
    const git = fakeGitHub();
    const store = new GitHubStackiStore(scope, {owner:'owner',ownerId:10,repository:'site',repositoryId:12,
      token:'test-token'}, git.request, git.push, cache);
    const routes: Record<string, {name:string;mediaType:string}> = {};
    const assets = Array.from({length:644}, (_,i) => {
      const path = `/api/gnr8/runtime/preview-assets/${scope.siteId}/${scope.siteVersionId}/asset-${i}`;
      const name = retainedAssetName(path);
      routes[path] = {name,mediaType:i === 0 ? 'text/css' : 'image/png'};
      return {name,body:i === 0 ? Buffer.from(`a{background:url('/api/gnr8/runtime/preview-assets/${scope.siteId}/${scope.siteVersionId}/asset-1')}`) : randomBytes(115000)};
    });
    const files = project('Pasadena scale').map(f => f.path === 'astro.config.mjs'
      ? file(f.path, `const retained = ${JSON.stringify(routes)};\nexport default {};`) : f);
    for (let i = 0; i < 36; i++) files.push(file(`src/pages/page-${i}.astro`, `<h1>Page ${i}</h1>`));
    const record = createStackiRecord(scope, actor, {expectedRevision:0,files});
    await store.migrate(record, assets);
    const before = git.stats().blobGets, storageBefore = storage.calls.length;
    const opened = await store.preparedForOpen();
    const delivery = await opened.delivery(Date.now() + 600000);
    assert.equal(opened.record.sha256, record.sha256);
    assert.deepEqual(opened.record.files, record.files);
    assert.equal(opened.assets.length, 1, 'only linked CSS is materialized');
    assert.equal(opened.assets[0].name, assets[0].name);
    assert.equal(Object.keys(delivery.redirects).length, 643);
    assert.equal(git.stats().blobGets - before, 1, 'only Git manifest blob, zero project/asset blobs');
    const reads = storage.calls.slice(storageBefore).filter(call => call.method === 'GET' && call.path.includes('/object/'));
    assert.equal(reads.length, 1, 'one bootstrap download');
    t.diagnostic(`Open: 1 Git manifest, 1 package (${reads[0].responseBytes} bytes), ${opened.assets.length} local asset, ${Object.keys(delivery.redirects).length} lazy assets`);
    assert(reads[0].responseBytes < assets.reduce((sum,asset)=>sum+asset.body.length,0)/100, 'startup package is less than 1% of retained asset bytes');
    const savedFiles = files.map(f => f.path === 'src/pages/index.astro' ? file(f.path,'<h1>Changed</h1>') : f);
    const saved = await store.save(scope, actor, {expectedRevision:1,files:savedFiles});
    const reopened = await store.preparedForOpen();
    const next = await reopened.delivery(Date.now() + 600000);
    assert.equal(reopened.record.sha256, saved.sha256);
    assert.notEqual(next.commit, delivery.commit);
    const beforeRevision = git.stats().blobGets;
    assert.equal((await store.revision(scope,1)).sha256, record.sha256);
    assert.equal(git.stats().blobGets-beforeRevision,2,
      'candidate revision reads one Git manifest for each commit, no project or asset blobs');
    const retry = await store.save(scope,actor,{expectedRevision:1,files:savedFiles});
    assert.equal(retry.sha256,saved.sha256);
    assert.equal((await (await store.preparedForOpen()).delivery(Date.now()+600000)).commit,next.commit);
    const key = `stacki-github-delivery/v1/${scope.agencyId}/${scope.clientId}/${scope.siteId}/${scope.siteVersionId}/commits/${next.commit}.json`;
    const pack = JSON.parse(await readFile(join(root,key),'utf8'));
    pack.local[0].base64 = Buffer.from('tampered CSS').toString('base64');
    await writeFile(join(root,key),JSON.stringify(pack));
    await assert.rejects(store.preparedForOpen(), /STACKI_GITHUB_DELIVERY_UNAVAILABLE/);
    assert.equal(git.pushCount(),1,'Save reuses Git assets');
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('missing delivery fails closed on Open without rebuilding or downloading asset blobs', async () => {
  const root = await mkdtemp(join(tmpdir(),'stacki-git-no-delivery-'));
  try {
    const git = fakeGitHub(), target = {owner:'owner',ownerId:10,repository:'site',repositoryId:12,token:'test-token'};
    const original = new GitHubStackiStore(scope,target,git.request,git.push);
    await original.migrate(createStackiRecord(scope,actor,{expectedRevision:0,files:project('legacy')}),[]);
    const storage = createStackiLocalStorage(root);
    const store = new GitHubStackiStore(scope,target,git.request,git.push,new StackiGitHubDelivery(storage.client,storage.bucket));
    const before=git.stats().blobGets;
    await assert.rejects(store.preparedForOpen(),/STACKI_GITHUB_DELIVERY_UNAVAILABLE/);
    assert.equal(git.stats().blobGets-before,1);
    assert(storage.calls.every(call=>call.method==='GET'));
    await store.prepareDelivery();
    assert.equal((await store.preparedForOpen()).record.revision,1);
  } finally { await rm(root,{recursive:true,force:true}); }
});
