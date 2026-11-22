/** Build an artifact-only Git commit whose sole parent is the verified source.
 * No provider call, site command, hook or credential is used here.
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, sep } from 'node:path';
import { promisify } from 'node:util';
import { verifyStudioBuildHandoff } from './build-handoff.mjs';

const exec = promisify(execFile);
const SHA = /^[a-f0-9]{40,64}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const safePath = path => typeof path === 'string' && path.length > 0 &&
  path.length <= 300 && !path.startsWith('/') &&
  !/[\\\x00-\x1f\x7f]/.test(path) &&
  path.split('/').every(part => part && part !== '.' &&
    part !== '..' && part !== '.git');

export async function prepareStudioBuildArtifactGitCommit(input, deps = {}) {
  const { project, store, sourceId, commit, site, scope, workerId,
    trustedGit } = input ?? {};
  if (typeof project !== 'string' || !project || !store ||
      !SOURCE.test(sourceId) || !SHA.test(commit) || !HEX32.test(workerId) ||
      !site || site.siteId !== scope?.siteId ||
      typeof trustedGit !== 'string' || !isAbsolute(trustedGit))
    throw Error('native_studio_build_git_input_invalid');
  const receipt = await (deps.verifyHandoff ?? verifyStudioBuildHandoff)(input);
  if (receipt.sourceId !== sourceId || receipt.commit !== commit ||
      receipt.workerId !== workerId || !Array.isArray(receipt.files) ||
      !receipt.files.length)
    throw Error('native_studio_build_git_handoff_unverified');
  const checkout = await realpath(project);
  const git = await realpath(trustedGit);
  if (git === checkout || git.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_build_git_untrusted_executable');
  await access(git, constants.X_OK);
  const root = await mkdtemp(join(tmpdir(), 'gnr8-build-git-'));
  const env = { PATH: '/usr/bin:/bin', HOME: root, XDG_CONFIG_HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0',
    GIT_ATTR_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1',
    GIT_INDEX_FILE: join(root, 'index'), GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'GNR8 Build', GIT_AUTHOR_EMAIL: 'build@pasadenagenerator.com',
    GIT_COMMITTER_NAME: 'GNR8 Build',
    GIT_COMMITTER_EMAIL: 'build@pasadenagenerator.com',
    GIT_AUTHOR_DATE: '2000-01-01T00:00:00Z',
    GIT_COMMITTER_DATE: '2000-01-01T00:00:00Z' };
  const run = async args => (await exec(git,
    ['-C', checkout, '-c', 'core.hooksPath=/dev/null',
      '-c', 'core.attributesFile=/dev/null', ...args],
    { env, cwd: root, shell: false, timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024, windowsHide: true })).stdout.trim();
  try {
    const files = receipt.files;
    if (files.length > 20_000 || files.some(file => !safePath(file.path) ||
        !(file.path.startsWith('dist/') || file.path.startsWith('studio/dist/')) ||
        !Number.isSafeInteger(file.bytes) || file.bytes < 0 ||
        file.bytes > 64 * 1024 * 1024 ||
        !SOURCE.test(file.sha256)) ||
        new Set(files.map(file => file.path)).size !== files.length ||
        !files.some(file => file.path.startsWith('dist/')) ||
        !files.some(file => file.path.startsWith('studio/dist/')) ||
        files.reduce((size, file) => size + file.bytes, 0) > 512 * 1024 * 1024)
      throw Error('native_studio_build_git_handoff_unverified');
    const format = await run(['rev-parse', '--show-object-format']);
    if (!['sha1', 'sha256'].includes(format))
      throw Error('native_studio_build_git_object_format_invalid');
    await run(['read-tree', '--empty']);
    for (let offset = 0; offset < files.length; offset += 100)
      await run(['add', '-f', '--', ...files.slice(offset, offset + 100)
        .map(file => file.path)]);
    const tree = await run(['write-tree']);
    const artifactCommit = await run(['commit-tree', tree, '-p', commit,
      '-m', `Native Studio build ${sourceId}`]);
    if (!SHA.test(artifactCommit) ||
        await run(['rev-list', '--parents', '-n', '1', artifactCommit]) !==
          `${artifactCommit} ${commit}`)
      throw Error('native_studio_build_git_commit_invalid');
    const listed = (await run(['ls-tree', '-r', '-z', artifactCommit]))
      .split('\0').filter(Boolean);
    if (listed.length !== files.length)
      throw Error('native_studio_build_git_tree_invalid');
    const expected = new Map(files.map(file => [file.path, file]));
    for (const line of listed) {
      const match = /^(100644) blob ([a-f0-9]{40,64})\t(.+)$/.exec(line);
      const file = match && expected.get(match[3]);
      if (!file) throw Error('native_studio_build_git_tree_invalid');
      const bytes = await readFile(join(checkout, file.path));
      if (bytes.length !== file.bytes ||
          createHash('sha256').update(bytes).digest('hex') !== file.sha256 ||
          createHash(format).update(`blob ${bytes.length}\0`).update(bytes)
            .digest('hex') !== match[2])
        throw Error('native_studio_build_git_tree_invalid');
      expected.delete(file.path);
    }
    if (expected.size)
      throw Error('native_studio_build_git_tree_invalid');
    return { commit: artifactCommit, tree,
      ref: `refs/heads/gnr8-build-${commit}`, sourceCommit: commit,
      sourceId, files: files.length };
  } catch (error) {
    if (error instanceof Error && /^native_studio_build_git_[a-z_]+$/.test(error.message))
      throw error;
    throw Error('native_studio_build_git_unavailable');
  } finally { await rm(root, { recursive: true, force: true }); }
}
