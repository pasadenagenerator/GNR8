/** Fetch only the recorded artifact ref into a fresh verified source checkout.
 * GitHub credentials never reach the output directory or site processes.
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, sep } from 'node:path';
import { promisify } from 'node:util';
import { restoreStudioBuildArtifactDirectory } from './build-artifact-transfer.mjs';

const exec = promisify(execFile);
const SHA = /^[a-f0-9]{40,64}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const TOKEN = /^ghs_[A-Za-z0-9._-]{20,4092}$/;
const pathSafe = path => typeof path === 'string' && path.length <= 300 &&
  !/[\\\x00-\x1f\x7f]/.test(path) && !path.startsWith('/') &&
  path.split('/').every(part => part && part !== '.' && part !== '..' &&
    part !== '.git') &&
  (path.startsWith('dist/') || path.startsWith('studio/dist/'));

export async function restoreStudioBuildArtifactGit(input, deps = {}) {
  const { project, store, scope, site, sourceId, sourceCommit, workerId,
    credential, trustedGit } = input ?? {};
  if (!project || !store || typeof store.read !== 'function' || !scope ||
      site?.siteId !== scope.siteId || !SOURCE.test(sourceId) ||
      !SHA.test(sourceCommit) || !TOKEN.test(credential) ||
      !isAbsolute(trustedGit))
    throw Error('native_studio_build_git_restore_input_invalid');
  const intent = await store.read('native-studio/build-artifact-github-push-v1.json');
  const receipt = await store.read('native-studio/build-handoff-v1.json');
  const branch = `gnr8-build-${sourceCommit}`;
  if (!intent || intent.sourceId !== sourceId ||
      intent.sourceCommit !== sourceCommit || intent.workerId !== workerId ||
      intent.branch !== branch || !SHA.test(intent.artifactCommit) ||
      !SHA.test(intent.tree) || !receipt || receipt.sourceId !== sourceId ||
      receipt.commit !== sourceCommit || receipt.workerId !== workerId ||
      !Array.isArray(receipt.files) || !receipt.files.length)
    throw Error('native_studio_build_git_restore_receipt_conflict');
  const projectRoot = await realpath(project);
  const git = await realpath(trustedGit);
  if (git === projectRoot || git.startsWith(`${projectRoot}${sep}`))
    throw Error('native_studio_build_git_restore_untrusted_executable');
  await access(git, constants.X_OK);
  const root = await mkdtemp(join(tmpdir(), 'gnr8-build-restore-'));
  const artifactDir = join(root, 'artifact');
  const askpass = join(root, 'askpass');
  const env = { PATH: '/usr/bin:/bin', HOME: root, XDG_CONFIG_HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0',
    GIT_ATTR_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1',
    GIT_TERMINAL_PROMPT: '0' };
  const run = async (args, extra = {}, maxBuffer = 2 * 1024 * 1024) =>
    (await exec(git, ['-C', projectRoot, '-c', 'core.hooksPath=/dev/null',
      '-c', 'credential.helper=', ...args], {
      env: { ...env, ...extra }, cwd: root, shell: false,
      timeout: 120_000, maxBuffer, windowsHide: true, encoding: 'buffer',
    })).stdout;
  try {
    if ((await run(['rev-parse', 'HEAD'])).toString().trim() !== sourceCommit)
      throw Error('native_studio_build_git_restore_source_changed');
    await writeFile(askpass, '#!/bin/sh\ncase "$1" in\n  *Username*) printf x-access-token ;;\n  *Password*) printf %s "$GNR8_GITHUB_TOKEN" ;;\n  *) exit 1 ;;\nesac\n',
      { mode: 0o700, flag: 'wx' });
    await run(['fetch', '--no-tags', deps.fetchUrl?.(site) ??
      `https://github.com/${site.repository}.git`, `refs/heads/${branch}`],
    { GIT_ASKPASS: askpass, GNR8_GITHUB_TOKEN: credential });
    await rm(askpass, { force: true });
    const found = (await run(['rev-parse', 'FETCH_HEAD'])).toString().trim();
    if (found !== intent.artifactCommit ||
        (await run(['rev-list', '--parents', '-n', '1', found])).toString().trim() !==
          `${found} ${sourceCommit}` ||
        (await run(['rev-parse', `${found}^{tree}`])).toString().trim() !== intent.tree)
      throw Error('native_studio_build_git_restore_commit_changed');
    const listed = (await run(['ls-tree', '-r', '-z', found])).toString('utf8')
      .split('\0').filter(Boolean);
    const expected = new Map(receipt.files.map(file => [file.path, file]));
    if (expected.size !== receipt.files.length || listed.length !== expected.size ||
        listed.length > 20_000)
      throw Error('native_studio_build_git_restore_tree_invalid');
    await mkdir(artifactDir);
    const format = (await run(['rev-parse', '--show-object-format'])).toString().trim();
    if (!['sha1', 'sha256'].includes(format))
      throw Error('native_studio_build_git_restore_tree_invalid');
    for (const line of listed) {
      const match = /^(100644) blob ([a-f0-9]{40,64})\t(.+)$/.exec(line);
      const file = match && expected.get(match[3]);
      if (!file || !pathSafe(file.path) || !Number.isSafeInteger(file.bytes) ||
          file.bytes < 0 || file.bytes > 64 * 1024 * 1024 ||
          !SOURCE.test(file.sha256))
        throw Error('native_studio_build_git_restore_tree_invalid');
      const bytes = await run(['cat-file', 'blob', match[2]], {},
        65 * 1024 * 1024);
      if (bytes.length !== file.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== file.sha256 ||
          createHash(format).update(`blob ${bytes.length}\0`).update(bytes)
            .digest('hex') !== match[2])
        throw Error('native_studio_build_git_restore_blob_changed');
      const destination = join(artifactDir, file.path);
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
      expected.delete(file.path);
    }
    if (expected.size) throw Error('native_studio_build_git_restore_tree_invalid');
    return await (deps.restore ?? restoreStudioBuildArtifactDirectory)({
      project, artifactDir, store, scope, site, sourceId,
      commit: sourceCommit, workerId });
  } catch (error) {
    if (error instanceof Error &&
        /^native_studio_build_git_restore_[a-z_]+$/.test(error.message))
      throw error;
    throw Error('native_studio_build_git_restore_unavailable');
  } finally { await rm(root, { recursive: true, force: true }); }
}
