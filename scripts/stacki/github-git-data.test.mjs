import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { prepareNativeStudioGitDataSource,
  prepareNativeStudioGitDataArtifact,
  publishNativeStudioGitDataRef } from './github-git-data.mjs';

const site = { siteId: '33333333-3333-4333-8333-333333333333',
  repository: 'example/site', repositoryId: '42',
  branch: 'codex/native-stacki' };
const credential = `ghs_${'a'.repeat(40)}`;
const sourceId = 'b'.repeat(64), baseCommit = 'c'.repeat(40);
const workerId = 'd'.repeat(32);
const blobSha = body => createHash('sha1').update(`blob ${body.length}\0`)
  .update(body).digest('hex');
function fixture() {
  const saved = new Map();
  const store = { read: async key => saved.get(key) ?? null,
    claim: async (key, value) => {
      if (saved.has(key)) return false;
      saved.set(key, value); return true;
    } };
  const commits = new Map([[baseCommit, { sha: baseCommit,
    tree: { sha: 'e'.repeat(40) }, parents: [] }]]);
  const trees = new Map([['e'.repeat(40), new Map([['README.md', {
    path: 'README.md', type: 'blob', mode: '100644',
    sha: blobSha(Buffer.from('base')) }]])]]);
  const refs = new Map();
  let next = 1;
  const transport = async (url, options) => {
    const path = new URL(url).pathname.replace('/repos/example/site', '');
    const body = options.body ? JSON.parse(options.body) : null;
    let result, status = 200;
    if (options.method === 'GET' && path.startsWith('/git/commits/'))
      result = commits.get(path.split('/').at(-1));
    else if (options.method === 'GET' && path.startsWith('/git/trees/')) {
      const id = path.split('/').at(-1);
      result = { sha: id, truncated: false,
        tree: [...(trees.get(id)?.values() ?? [])] };
    } else if (options.method === 'POST' && path === '/git/blobs') {
      const bytes = Buffer.from(body.content, 'base64');
      result = { sha: blobSha(bytes) }; status = 201;
    } else if (options.method === 'POST' && path === '/git/trees') {
      const entries = new Map(trees.get(body.base_tree) ?? []);
      for (const entry of body.tree) {
        const bytes = entry.content === undefined ? null :
          Buffer.from(entry.content, 'utf8');
        entries.set(entry.path, { path: entry.path,
          type: 'blob', mode: entry.mode,
          sha: bytes ? blobSha(bytes) : entry.sha });
      }
      const id = String(next++).padStart(40, '0');
      trees.set(id, entries); result = { sha: id }; status = 201;
    } else if (options.method === 'POST' && path === '/git/commits') {
      const id = String(next++).padStart(40, '0');
      result = { sha: id, tree: { sha: body.tree },
        parents: body.parents.map(sha => ({ sha })) };
      commits.set(id, result); status = 201;
    } else if (options.method === 'POST' && path === '/git/refs') {
      if (refs.has(body.ref)) status = 422;
      else { refs.set(body.ref, body.sha); status = 201; }
      result = { ref: body.ref, object: { sha: body.sha } };
    } else throw Error(`unexpected ${options.method} ${path}`);
    return { ok: status < 300, status,
      headers: { get: () => null }, json: async () => result };
  };
  const head = async current => ({ repositoryId: current.repositoryId,
    branch: current.branch, commit: refs.get(`refs/heads/${current.branch}`) ?? null,
    baseCommit });
  return { store, transport, head, refs, commits, trees };
}

test('creates exact source and artifact child commits, then verified refs', async () => {
  const f = fixture();
  const files = [{ path: 'studio/index.js', body: Buffer.from('export default 1;') },
    { path: 'package.json', body: Buffer.from('{"name":"site"}') }];
  const source = await prepareNativeStudioGitDataSource({ site,
    store: f.store, sourceId, baseCommit, author: { name: 'GNR8',
      email: 'gnr8@example.com' }, credential, transport: f.transport,
    files });
  assert.equal(source.baseCommit, baseCommit);
  assert.deepEqual(f.commits.get(source.commit).parents,
    [{ sha: baseCommit }]);
  const again = await prepareNativeStudioGitDataSource({ site,
    store: f.store, sourceId, baseCommit, author: { name: 'GNR8',
      email: 'gnr8@example.com' }, credential, transport: f.transport,
    files });
  assert.deepEqual(again, source);
  assert.deepEqual(await publishNativeStudioGitDataRef({ site,
    commit: source.commit, credential, transport: f.transport,
    inspectHead: f.head, store: f.store }),
  { state: 'verified', commit: source.commit });
  const artifact = await prepareNativeStudioGitDataArtifact({ site,
    store: f.store, sourceId, sourceCommit: source.commit, workerId,
    credential, transport: f.transport, files: [
      { path: 'dist/index.html', body: Buffer.from('<html/>') },
      { path: 'studio/dist/app.js', body: Buffer.from('app()') },
    ] });
  assert.deepEqual(f.commits.get(artifact.commit).parents,
    [{ sha: source.commit }]);
  assert.deepEqual([...f.trees.get(artifact.tree).keys()].sort(),
    ['dist/index.html', 'studio/dist/app.js']);
  assert.deepEqual(await publishNativeStudioGitDataRef({
    site: { ...site, branch: artifact.branch }, commit: artifact.commit,
    credential, transport: f.transport, inspectHead: f.head,
    store: f.store }), { state: 'verified', commit: artifact.commit });
});

test('rejects a changed base file before creating source commit', async () => {
  const f = fixture();
  await assert.rejects(prepareNativeStudioGitDataSource({ site,
    store: f.store, sourceId, baseCommit, author: { name: 'GNR8',
      email: 'gnr8@example.com' }, credential, transport: f.transport,
    files: [{ path: 'README.md', body: Buffer.from('different') }],
  }), /base_conflict/);
  assert.equal(f.commits.size, 1);
});
