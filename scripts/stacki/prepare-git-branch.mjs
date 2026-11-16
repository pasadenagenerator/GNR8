/** Local-only Git preparation for one dedicated website repository. */
import { execFileSync } from 'node:child_process';
import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { prepareFromStoredRelease, readStoredVerifiedAstroStudio } from './prepare-from-confirmed-export.mjs';

const git = (root, ...args) => execFileSync('git',
  ['-C', root, '-c', 'core.fsmonitor=false', '-c', 'core.attributesFile=/dev/null',
    '-c', 'core.hooksPath=/dev/null', ...args],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_ATTR_NOSYSTEM: '1' } }).trim();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function prepareGitBranch({ project, store, releaseId, releaseFile, site }) {
  checkGitBinding(project, site);
  const prepared = await prepareFromStoredRelease({ store, releaseId, releaseFile, site });
  return stagePreparedFiles({ project, site, prepared, identity: { releaseId } });
}
export async function prepareGitBranchFromSource({ project, store, sourceId, site }) {
  checkGitBinding(project, site);
  const prepared = await readStoredVerifiedAstroStudio({ store, sourceId, site });
  return stagePreparedFiles({ project, site, prepared, identity: { sourceId } });
}
function checkGitBinding(project, site) {
  project = resolve(project);
  const branch = git(project, 'branch', '--show-current');
  if (branch !== site.branch) throw Error('Studio branch differs from the connected branch');
  const origin = git(project, 'remote', 'get-url', 'origin');
  const expected = site.repository.toLowerCase();
  if (!new RegExp(`^(?:https://github\\.com/|git@github\\.com:)${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\.git)?$`, 'i').test(origin))
    throw Error('Studio checkout repository differs from the binding');
}
async function safeCheckoutPath(root, relative) {
  let path = root;
  for (const part of relative.split('/')) {
    path = join(path, part);
    const stat = await lstat(path).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error));
    if (stat?.isSymbolicLink()) throw Error('Studio checkout contains a symbolic link');
  }
}
async function stagePreparedFiles({ project, site, prepared, identity }) {
  project = resolve(project);
  if ((await lstat(project)).isSymbolicLink()) throw Error('Studio checkout contains a symbolic link');
  checkGitBinding(project, site);
  const privateAttributes=resolve(project,git(project,'rev-parse','--git-path','info/attributes'));
  if(await lstat(privateAttributes).then(()=>true,error=>error.code==='ENOENT'?false:Promise.reject(error)))
    throw Error('Git filters require separate review');
  const tracked = new Set(git(project, 'ls-files').split('\n').filter(Boolean));
  const expectedFiles = new Set(prepared.files.map(file => file.path));
  if ([...tracked].some(path => path === '.gitattributes' || path.endsWith('/.gitattributes'))) throw Error('Git filters require separate review');
  for (const line of git(project, 'status', '--porcelain', '-z').split('\0').filter(Boolean)) {
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
  git(project, 'add', '--', ...prepared.files.map(file => file.path));
  const staged = git(project, 'diff', '--cached', '--name-only');
  const stagedFiles = staged ? staged.split('\n') : [];
  if (stagedFiles.some(path => !expectedFiles.has(path)) ||
      (stagedFiles.length !== prepared.files.length && !(stagedFiles.length === 0 &&
        [...expectedFiles].every(path => tracked.has(path)))))
    throw Error('Studio staged files incomplete');
  return { branch: site.branch, repository: site.repository, ...identity, stagedFiles,
    committed: stagedFiles.length === 0, commit: stagedFiles.length === 0 ? git(project, 'rev-parse', 'HEAD') : null,
    pushed: false };
}


/** Local commit only. Exact staged bytes are checked before commit; hooks and
 * signing are disabled so this cannot run repository-provided commands. */
export async function commitPreparedStudio(input) {
  return commitPrepared(input, prepareGitBranch, input.releaseId);
}
export async function commitPreparedSource(input) {
  return commitPrepared(input, prepareGitBranchFromSource, input.sourceId);
}
async function commitPrepared(input, prepare, identity) {
  const staged = await prepare(input);
  if (staged.committed) return staged;
  const author = input.author;
  if (!author || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,79}$/.test(author.name) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(author.email)) throw Error('Studio commit author invalid');
  const project = resolve(input.project);
  git(project, '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false',
    '-c', `user.name=${author.name}`, '-c', `user.email=${author.email}`,
    'commit', '-m', `Prepare native Stacki Studio for ${identity}`, '--', ...staged.stagedFiles);
  const result = await prepare(input);
  if (!result.committed) throw Error('Studio commit unconfirmed');
  return result;
}
