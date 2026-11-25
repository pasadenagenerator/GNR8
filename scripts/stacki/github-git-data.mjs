/** Trusted GitHub Git Data transport. Repository bytes are data, never code. */
import { createHash } from 'node:crypto';
import { TextDecoder } from 'node:util';

const SHA = /^[a-f0-9]{40,64}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const TOKEN = /^ghs_[A-Za-z0-9._-]{20,4092}$/;
const REPOSITORY = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const PATH = /^[A-Za-z0-9_@+.-]+(?:\/[A-Za-z0-9_@+.-]+)*$/;
const utf8 = new TextDecoder('utf-8', { fatal: true });
const gitBlob = bytes => createHash('sha1')
  .update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const SOURCE_INTENT = 'native-studio/git-data-source-v1.json';
const ARTIFACT_INTENT = 'native-studio/git-data-artifact-v1.json';

// The Studio source map is retained in the verified byte handoff, but GitHub's
// blob endpoint rejects the large generated map. It is restored from that
// handoff after the artifact ref has been verified.
export const isNativeStudioGitExcludedOutput = file =>
  file?.path === 'studio/dist/studio.js.map';

function validSite(site) {
  return site && REPOSITORY.test(site.repository) &&
    /^[1-9][0-9]*$/.test(site.repositoryId) &&
    Number.isSafeInteger(Number(site.repositoryId)) &&
    BRANCH.test(site.branch) && !site.branch.includes('..') &&
    site.branch.split('/').every(part => part && !part.startsWith('.') && !part.endsWith('.'));
}
function validPath(path) {
  return typeof path === 'string' && path.length <= 300 && PATH.test(path) &&
    !path.split('/').some(part => part === '.' || part === '..' || part === '.git') &&
    !path.split('/').some(part => part === '.gitattributes' || part === '.gitmodules');
}
function requireInput(input) {
  if (!validSite(input?.site) || !TOKEN.test(input?.credential) ||
      !input.store || typeof input.store.read !== 'function' ||
      typeof input.store.claim !== 'function' ||
      typeof input.transport !== 'function')
    throw Error('native_studio_git_data_input_invalid');
}
function exactFiles(files, prefix = '') {
  if (!Array.isArray(files) || files.length === 0 || files.length > 20_000)
    throw Error('native_studio_git_data_files_invalid');
  let total = 0;
  const found = new Set();
  for (const file of files) {
    if (!validPath(file?.path) || found.has(file.path) ||
        (prefix && !file.path.startsWith(prefix)) ||
        !Buffer.isBuffer(file.body) || file.body.length > 64 * 1024 * 1024)
      throw Error('native_studio_git_data_files_invalid');
    found.add(file.path);
    total += file.body.length;
    if (total > 512 * 1024 * 1024)
      throw Error('native_studio_git_data_files_invalid');
  }
  return [...files].sort((a, b) => a.path.localeCompare(b.path));
}
function client(site, credential, transport, delay = ms => new Promise(resolve => setTimeout(resolve, ms))) {
  const [owner, name] = site.repository.split('/');
  const root = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  let nextMutationAt = 0;
  return async (method, path, body, allow404 = false) => {
    // GitHub's secondary limit recommends at least one second between
    // content-generating REST calls. Large imported sites create many blobs.
    if (method !== 'GET') {
      const wait = nextMutationAt - Date.now();
      if (wait > 0) await delay(wait);
      nextMutationAt = Date.now() + 1100;
    }
    const response = await transport(`${root}${path}`, {
      method, redirect: 'error', signal: AbortSignal.timeout(60_000),
      headers: { authorization: `Bearer ${credential}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.headers.get('x-oauth-scopes')?.split(',')
      .map(value => value.trim()).includes('repo'))
      throw Error('native_studio_git_data_credential_too_broad');
    if (allow404 && response.status === 404) return null;
    if (!response.ok) {
      const operation = path.startsWith('/git/blobs') ? 'blob' :
        path.startsWith('/git/trees') ? 'tree' :
        path.startsWith('/git/commits') ? 'commit' :
        path.startsWith('/git/refs') ? 'ref' : 'request';
      let reason = '';
      if (operation === 'blob' && response.status === 422) {
        const failure = await response.json().catch(() => null);
        const message = typeof failure?.message === 'string' ?
          failure.message.toLowerCase() : '';
        const codes = Array.isArray(failure?.errors) ? failure.errors
          .map(error => typeof error?.code === 'string' ? error.code.toLowerCase() : '') : [];
        reason = /spam|abuse|rate limit/.test(message) ? '_limited' :
          /too.large|size|too_big/.test(`${message} ${codes.join(' ')}`) ? '_oversize' :
          /empty/.test(`${message} ${codes.join(' ')}`) ? '_empty' :
          codes.includes('invalid') ? '_invalid' : '_unknown';
      }
      throw Error(`native_studio_git_data_${operation}_${response.status}${reason}`);
    }
    const value = await response.json().catch(() => null);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw Error('native_studio_git_data_response_invalid');
    return value;
  };
}
async function commitTree(api, commit) {
  const item = await api('GET', `/git/commits/${commit}`);
  if (item.sha !== commit || !SHA.test(item.tree?.sha) ||
      !Array.isArray(item.parents))
    throw Error('native_studio_git_data_commit_unverified');
  return item;
}
async function treeEntries(api, tree) {
  const result = await api('GET', `/git/trees/${tree}?recursive=1`);
  if (result.sha !== tree || result.truncated !== false || !Array.isArray(result.tree))
    throw Error('native_studio_git_data_tree_unverified');
  const entries = new Map();
  for (const row of result.tree) {
    if (!validPath(row.path) || !SHA.test(row.sha))
      throw Error('native_studio_git_data_tree_unsafe');
    if (row.type === 'tree' && row.mode === '040000') continue;
    if (entries.has(row.path) || row.type !== 'blob' ||
        !['100644', '100755'].includes(row.mode))
      throw Error('native_studio_git_data_tree_unsafe');
    entries.set(row.path, row);
  }
  return entries;
}
async function treeForFiles(api, baseTree, files, baseEntries = new Map(),
  knownBlobs = new Set()) {
  let current = baseTree;
  let batch = [], weight = 0;
  const submit = async () => {
    if (!batch.length) return;
    const result = await api('POST', '/git/trees', {
      ...(current ? { base_tree: current } : {}), tree: batch });
    if (!SHA.test(result.sha)) throw Error('native_studio_git_data_tree_unverified');
    current = result.sha;
    batch = []; weight = 0;
  };
  for (const file of files) {
    let entry;
    const mode = baseEntries.get(file.path)?.mode ?? '100644';
    let content;
    try { content = utf8.decode(file.body); }
    catch { content = undefined; }
    if (content !== undefined && !content.includes('\0') &&
        Buffer.byteLength(content) <= 256 * 1024) {
      entry = { path: file.path, mode, type: 'blob', content };
    } else {
      const sha = gitBlob(file.body);
      if (knownBlobs.has(sha)) {
        entry = { path: file.path, mode, type: 'blob', sha };
      } else {
        let blob;
        try {
          blob = await api('POST', '/git/blobs', {
            content: file.body.toString('base64'), encoding: 'base64' });
        } catch (error) {
          if (error instanceof Error &&
              error.message.startsWith('native_studio_git_data_blob_422'))
            throw Error(`${error.message}_bytes_${file.body.length}`);
          throw error;
        }
        if (blob.sha !== sha)
          throw Error('native_studio_git_data_blob_unverified');
        knownBlobs.add(sha);
        entry = { path: file.path, mode, type: 'blob', sha };
      }
    }
    const size = Buffer.byteLength(JSON.stringify(entry));
    if (batch.length >= 80 || weight + size > 750_000) await submit();
    batch.push(entry); weight += size;
  }
  await submit();
  return current;
}
async function verifyFiles(api, tree, files, base, artifact = false) {
  const entries = await treeEntries(api, tree);
  const expected = new Set(files.map(file => file.path));
  for (const file of files) {
    const entry = entries.get(file.path);
    if (!entry || entry.mode !== (base.get(file.path)?.mode ?? '100644') ||
        entry.sha !== gitBlob(file.body))
      throw Error('native_studio_git_data_tree_unverified');
  }
  for (const [path, entry] of entries) {
    if (artifact) {
      if (!expected.has(path)) throw Error('native_studio_git_data_tree_unverified');
    } else if (path.startsWith('studio/') && !expected.has(path)) {
      throw Error('native_studio_git_data_tree_unverified');
    } else if (!expected.has(path) &&
        (!base.has(path) || !same(entry, base.get(path)))) {
      throw Error('native_studio_git_data_tree_unverified');
    }
  }
  return tree;
}
async function claimExact(store, key, receipt) {
  const prior = await store.read(key);
  if (prior && !same(prior, receipt))
    throw Error('native_studio_git_data_intent_conflict');
  if (!prior) await store.claim(key, receipt);
  if (!same(await store.read(key), receipt))
    throw Error('native_studio_git_data_intent_conflict');
  return receipt;
}
/** Build a source commit with exactly the verified files over a checked base.
 * It is intentionally unreferenced until the build output is durable. */
export async function prepareNativeStudioGitDataSource(input) {
  requireInput(input);
  const { site, store, sourceId, baseCommit, author, credential, transport } = input;
  if (!SOURCE.test(sourceId) || !SHA.test(baseCommit) ||
      !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,79}$/.test(author?.name) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author?.email))
    throw Error('native_studio_git_data_input_invalid');
  const files = exactFiles(input.files);
  const api = client(site, credential, transport, input.delay);
  const base = await commitTree(api, baseCommit);
  const baseEntries = await treeEntries(api, base.tree.sha);
  const expected = new Map(files.map(file => [file.path, file]));
  for (const [path, row] of baseEntries) {
    if (path.startsWith('studio/') && !expected.has(path))
      throw Error('native_studio_git_data_base_unsafe');
    if (expected.has(path) && row.sha !== gitBlob(expected.get(path).body))
      throw Error('native_studio_git_data_base_conflict');
  }
  const prior = await store.read(SOURCE_INTENT);
  if (prior) {
    if (prior.sourceId !== sourceId || prior.baseCommit !== baseCommit ||
        prior.repository !== site.repository || prior.branch !== site.branch ||
        !SHA.test(prior.commit) || !SHA.test(prior.tree))
      throw Error('native_studio_git_data_intent_conflict');
    const committed = await commitTree(api, prior.commit);
    if (committed.tree.sha !== prior.tree ||
        !same(committed.parents.map(item => item.sha), [baseCommit]))
      throw Error('native_studio_git_data_commit_unverified');
    await verifyFiles(api, prior.tree, files, baseEntries);
    return prior;
  }
  const tree = await treeForFiles(api, base.tree.sha, files, baseEntries);
  await verifyFiles(api, tree, files, baseEntries);
  const stamp = '2000-01-01T00:00:00Z';
  const committed = await api('POST', '/git/commits', {
    message: `Prepare native Stacki Studio for ${sourceId}`,
    tree, parents: [baseCommit],
    author: { ...author, date: stamp },
    committer: { name: 'GNR8 Build', email: 'build@pasadenagenerator.com',
      date: stamp },
  });
  if (!SHA.test(committed.sha) || committed.tree?.sha !== tree ||
      !same(committed.parents?.map(item => item.sha), [baseCommit]))
    throw Error('native_studio_git_data_commit_unverified');
  return claimExact(store, SOURCE_INTENT, { sourceId, baseCommit,
    repository: site.repository, branch: site.branch,
    commit: committed.sha, tree });
}

/** Create the artifact-only child commit from verified output bytes. */
export async function prepareNativeStudioGitDataArtifact(input) {
  requireInput(input);
  const { site, store, sourceId, sourceCommit, workerId,
    credential, transport } = input;
  if (!SOURCE.test(sourceId) || !SHA.test(sourceCommit) ||
      !/^[a-f0-9]{32}$/.test(workerId))
    throw Error('native_studio_git_data_input_invalid');
  const files = exactFiles(input.files).filter(file =>
    !isNativeStudioGitExcludedOutput(file));
  if (!files.some(file => file.path.startsWith('dist/')) ||
      !files.some(file => file.path.startsWith('studio/dist/')) ||
      files.some(file => !file.path.startsWith('dist/') &&
        !file.path.startsWith('studio/dist/')))
    throw Error('native_studio_git_data_files_invalid');
  const api = client(site, credential, transport, input.delay);
  const source = await commitTree(api, sourceCommit);
  const sourceEntries = await treeEntries(api, source.tree.sha);
  const prior = await store.read(ARTIFACT_INTENT);
  if (prior) {
    if (prior.sourceId !== sourceId || prior.sourceCommit !== sourceCommit ||
        prior.workerId !== workerId || prior.repository !== site.repository ||
        !SHA.test(prior.commit) || !SHA.test(prior.tree))
      throw Error('native_studio_git_data_intent_conflict');
    const committed = await commitTree(api, prior.commit);
    if (committed.tree.sha !== prior.tree ||
        !same(committed.parents.map(item => item.sha), [sourceCommit]))
      throw Error('native_studio_git_data_commit_unverified');
    await verifyFiles(api, prior.tree, files, new Map(), true);
    return prior;
  }
  const tree = await treeForFiles(api, null, files, new Map(),
    new Set([...sourceEntries.values()].map(entry => entry.sha)));
  await verifyFiles(api, tree, files, new Map(), true);
  const committed = await api('POST', '/git/commits', {
    message: `Native Studio build ${sourceId}`, tree,
    parents: [sourceCommit],
    author: { name: 'GNR8 Build', email: 'build@pasadenagenerator.com',
      date: '2000-01-01T00:00:00Z' },
    committer: { name: 'GNR8 Build', email: 'build@pasadenagenerator.com',
      date: '2000-01-01T00:00:00Z' },
  });
  if (!SHA.test(committed.sha) || committed.tree?.sha !== tree ||
      !same(committed.parents?.map(item => item.sha), [sourceCommit]))
    throw Error('native_studio_git_data_commit_unverified');
  return claimExact(store, ARTIFACT_INTENT, { sourceId, sourceCommit,
    workerId, repository: site.repository, branch: `gnr8-build-${sourceCommit}`,
    commit: committed.sha, tree });
}

/** The caller must check the exact bound repository and branch HEAD before
 * this one ref mutation, then read it back. Ambiguity is returned, not retried. */
export async function publishNativeStudioGitDataRef(input) {
  requireInput(input);
  const { site, commit, credential, transport, inspectHead } = input;
  if (!SHA.test(commit) || typeof inspectHead !== 'function')
    throw Error('native_studio_git_data_input_invalid');
  const before = await inspectHead(site, credential, transport);
  if (before.repositoryId !== site.repositoryId || before.branch !== site.branch)
    throw Error('native_studio_git_data_remote_unverified');
  if (before.commit === commit) return { state: 'verified', commit };
  if (before.commit !== null) throw Error('native_studio_git_data_branch_conflict');
  const api = client(site, credential, transport, input.delay);
  try {
    await api('POST', '/git/refs', { ref: `refs/heads/${site.branch}`, sha: commit });
  } catch { /* A lost response may follow a successful ref creation. */ }
  let after;
  try { after = await inspectHead(site, credential, transport); }
  catch { return { state: 'pending-review', commit }; }
  if (after.repositoryId !== site.repositoryId || after.branch !== site.branch)
    throw Error('native_studio_git_data_remote_unverified');
  if (after.commit === commit) return { state: 'verified', commit };
  if (after.commit !== null) throw Error('native_studio_git_data_branch_conflict');
  return { state: 'pending-review', commit };
}
