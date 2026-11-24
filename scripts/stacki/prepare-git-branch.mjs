/** Local-only Git preparation for one dedicated website repository. */
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { lstatSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { prepareFromStoredRelease, readStoredVerifiedAstroStudio } from './prepare-from-confirmed-export.mjs';

function gitExecutable(trustedGit) {
  if (trustedGit !== undefined &&
      (typeof trustedGit !== 'string' || !isAbsolute(trustedGit)))
    throw Error('Studio trusted Git executable invalid');
  const executable = trustedGit ?? process.env.GNR8_NATIVE_STUDIO_TRUSTED_GIT;
  if (executable !== undefined && !isAbsolute(executable))
    throw Error('Studio trusted Git executable invalid');
  return executable ?? 'git';
}
const git = (root, trustedGit, ...args) => execFileSync(gitExecutable(trustedGit),
  ['-C', root, '-c', 'core.fsmonitor=false', '-c', 'core.attributesFile=/dev/null',
    '-c', 'core.hooksPath=/dev/null', ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' } }).trim();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const gitBytes = (root, trustedGit, args, input) => execFileSync(gitExecutable(trustedGit),
  ['-C', root, '-c', 'core.fsmonitor=false', '-c', 'core.attributesFile=/dev/null',
    '-c', 'core.hooksPath=/dev/null', ...args],
  { input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 96 * 1024 * 1024,
    env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' } });
export function assertStudioCheckoutClean(project,
  { allowBuildOutputs = false, trustedGit } = {}) {
  // Generated projects ignore dist/, so Git status alone cannot distinguish a
  // clean source checkout from one with local build output before the build.
  for (const path of ['dist', 'studio/dist']) {
    let output;
    try { output = lstatSync(join(project, path)); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (!allowBuildOutputs || !output.isDirectory() || output.isSymbolicLink())
      throw Error('Studio checkout has local changes');
  }
  const changes = gitBytes(project, trustedGit,
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    .toString('utf8').split('\0').filter(Boolean);
  if (changes.some(change => !allowBuildOutputs || !change.startsWith('?? ') ||
      !(change.slice(3).startsWith('dist/') ||
        change.slice(3).startsWith('studio/dist/'))))
    throw Error('Studio checkout has local changes');
}
export async function prepareGitBranch({ project, store, releaseId, releaseFile, site,
  trustedGit }) {
  checkGitBinding(project, site, trustedGit);
  const prepared = await prepareFromStoredRelease({ store, releaseId, releaseFile, site });
  return stagePreparedFiles({ project, site, prepared, identity: { releaseId },
    trustedGit });
}
export async function prepareGitBranchFromSource({ project, store, sourceId, site,
  trustedGit }) {
  checkGitBinding(project, site, trustedGit);
  const prepared = await readStoredVerifiedAstroStudio({ store, sourceId, site });
  return stagePreparedFiles({ project, site, prepared, identity: { sourceId },
    trustedGit });
}
function checkGitBinding(project, site, trustedGit) {
  project = resolve(project);
  const branch = git(project, trustedGit, 'branch', '--show-current');
  if (branch !== site.branch) throw Error('Studio branch differs from the connected branch');
  const origin = git(project, trustedGit, 'remote', 'get-url', 'origin');
  const expected = site.repository.toLowerCase();
  if (!new RegExp(`^(?:https://github\\.com/|git@github\\.com:)${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\.git)?$`, 'i').test(origin))
    throw Error('Studio checkout repository differs from the binding');
}

/** Read-only gate for a future Container-capable first-deploy runner. The
 * committed HEAD must contain the exact verified source package; no checkout
 * changes, filters, extra Studio files or submodules are accepted.
 */
export async function verifyCommittedStudioSource({ project, store, sourceId, site,
  allowBuildOutputs = false, trustedGit = undefined }) {
  project = resolve(project);
  if ((await lstat(project)).isSymbolicLink()) throw Error('Studio checkout contains a symbolic link');
  checkGitBinding(project, site, trustedGit);
  const prepared = await readStoredVerifiedAstroStudio({ store, sourceId, site });
  const privateAttributes = resolve(project, git(project, trustedGit,
    'rev-parse', '--git-path', 'info/attributes'));
  if (await lstat(privateAttributes).then(() => true,
    error => error.code === 'ENOENT' ? false : Promise.reject(error)))
    throw Error('Git filters require separate review');
  assertStudioCheckoutClean(project, { allowBuildOutputs, trustedGit });
  const tree = gitBytes(project, trustedGit,
    ['ls-tree', '-r', '-z', 'HEAD']).toString('utf8');
  const entries = new Map();
  for (const row of tree.split('\0').filter(Boolean)) {
    const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40,64})\t(.+)$/.exec(row);
    if (!match) throw Error('Studio checkout tree invalid');
    entries.set(match[4], { mode: match[1], type: match[2] });
  }
  const expected = new Set(prepared.files.map(file => file.path));
  if ([...entries].some(([path, entry]) =>
    path === '.gitmodules' || path === '.gitattributes' ||
    path.endsWith('/.gitattributes') || path.endsWith('/.gitmodules') ||
    entry.type !== 'blob' ||
    (path.startsWith('studio/') && !expected.has(path))))
    throw Error('Studio checkout contains unmanaged Git content');
  for (const file of prepared.files) {
    const entry = entries.get(file.path);
    if (!entry || !['100644', '100755'].includes(entry.mode))
      throw Error(`Studio committed file missing: ${file.path}`);
    await safeCheckoutPath(project, file.path);
    if (!(await readFile(join(project, file.path))).equals(file.body))
      throw Error(`Studio checkout file differs: ${file.path}`);
  }
  const input = Buffer.from(prepared.files.map(file => `HEAD:${file.path}\n`).join(''));
  const blobs = gitBytes(project, trustedGit, ['cat-file', '--batch'], input);
  let offset = 0;
  for (const file of prepared.files) {
    const end = blobs.indexOf(10, offset);
    if (end < 0) throw Error('Studio committed file unreadable');
    const header = blobs.subarray(offset, end).toString('utf8');
    const match = /^[a-f0-9]{40,64} blob ([0-9]+)$/.exec(header);
    if (!match) throw Error(`Studio committed file missing: ${file.path}`);
    const length = Number(match[1]);
    const start = end + 1;
    if (length !== file.body.length ||
        !blobs.subarray(start, start + length).equals(file.body) ||
        blobs[start + length] !== 10)
      throw Error(`Studio committed file differs: ${file.path}`);
    offset = start + length + 1;
  }
  if (offset !== blobs.length) throw Error('Studio committed file response invalid');
  return { sourceId, commit: git(project, trustedGit, 'rev-parse', 'HEAD'),
    branch: site.branch, repository: site.repository, files: prepared.files.length,
    hosted: false };
}
async function safeCheckoutPath(root, relative) {
  let path = root;
  for (const part of relative.split('/')) {
    path = join(path, part);
    const stat = await lstat(path).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
    if (stat?.isSymbolicLink()) throw Error('Studio checkout contains a symbolic link');
  }
}
async function stagePreparedFiles({ project, site, prepared, identity, trustedGit }) {
  project = resolve(project);
  if ((await lstat(project)).isSymbolicLink()) throw Error('Studio checkout contains a symbolic link');
  checkGitBinding(project, site, trustedGit);
  const privateAttributes=resolve(project,git(project,trustedGit,'rev-parse','--git-path','info/attributes'));
  if(await lstat(privateAttributes).then(()=>true,error=>error.code==='ENOENT'?false:Promise.reject(error)))
    throw Error('Git filters require separate review');
  const tracked = new Set(git(project, trustedGit, 'ls-files').split('\n').filter(Boolean));
  const expectedFiles = new Set(prepared.files.map(file => file.path));
  if ([...tracked].some(path => path === '.gitattributes' || path.endsWith('/.gitattributes'))) throw Error('Git filters require separate review');
  for (const line of git(project, trustedGit, 'status', '--porcelain', '-z').split('\0').filter(Boolean)) {
    if (!/^A  /.test(line) || !expectedFiles.has(line.slice(3))) throw Error('Studio checkout has local changes');
  }
  const unexpected = [...tracked].filter(path => path.startsWith('studio/') && !expectedFiles.has(path));
  if (unexpected.length) throw Error('Existing Studio has unmanaged tracked files');
  for (const file of prepared.files) {
    await safeCheckoutPath(project, file.path);
    if (tracked.has(file.path) && sha(await readFile(join(project, file.path))) !== sha(file.body))
      throw Error(`Existing tracked file differs: ${file.path}`);
  }
  // An existing site may have hand-maintained files. Never delete or overwrite
  // anything outside the generated derivative.
  for (const file of prepared.files) {
    const path = join(project, file.path);
    if (!tracked.has(file.path)) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.body, { flag: 'wx' });
    }
  }
  git(project, trustedGit, 'add', '--', ...prepared.files.map(file => file.path));
  const staged = git(project, trustedGit, 'diff', '--cached', '--name-only');
  const stagedFiles = staged ? staged.split('\n') : [];
  if (stagedFiles.some(path => !expectedFiles.has(path)) ||
      (stagedFiles.length !== prepared.files.length && !(stagedFiles.length === 0 &&
        [...expectedFiles].every(path => tracked.has(path)))))
    throw Error('Studio staged files incomplete');
  return { branch: site.branch, repository: site.repository, ...identity, stagedFiles,
    committed: stagedFiles.length === 0, commit: stagedFiles.length === 0 ? git(project, trustedGit, 'rev-parse', 'HEAD') : null,
    pushed: false };
}


/** Local commit only. Exact staged bytes are checked before commit; hooks and
 * signing are disabled so this cannot run repository-provided commands. */
export async function commitPreparedStudio(input) {
  return commitPrepared(input, prepareGitBranch, input.releaseId);
}
export async function commitPreparedSource(input) {
  const committed = await commitPrepared(input, prepareGitBranchFromSource, input.sourceId);
  const verified = await verifyCommittedStudioSource(input);
  if (verified.commit !== committed.commit) throw Error('Studio committed source changed');
  return committed;
}
async function commitPrepared(input, prepare, identity) {
  const staged = await prepare(input);
  if (staged.committed) return staged;
  const author = input.author;
  if (!author || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,79}$/.test(author.name) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) throw Error('Studio commit author invalid');
  const project = resolve(input.project);
  git(project, input.trustedGit, '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
    '-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`,
    'commit', '-m', `Prepare native Stacki Studio for ${identity}`, '--', ...staged.stagedFiles);
  const result = await prepare(input);
  if (!result.committed) throw Error('Studio commit unconfirmed');
  return result;
}
