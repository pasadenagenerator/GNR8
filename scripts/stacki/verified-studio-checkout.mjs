/** Trusted checkout of a private site's verified base, before isolated build.
 * GitHub credentials are used only for the fetch and never enter site code.
 */
import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, lstat, mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { commitPreparedSource, verifyCommittedStudioSource } from './prepare-git-branch.mjs';

const exec = promisify(execFile);
const SHA = /^[a-f0-9]{40,64}$/;
const SOURCE = /^[a-f0-9]{64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const TOKEN = /^ghs_[A-Za-z0-9._-]{20,4092}$/;
const REPOSITORY = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const defaults = { commitSource: commitPreparedSource,
  verifySource: verifyCommittedStudioSource,
  fetchUrl: site => `https://github.com/${site.repository}.git` };

function validSite(site) {
  return site && typeof site.siteId === 'string' && UUID.test(site.siteId) &&
    REPOSITORY.test(site.repository) &&
    typeof site.repositoryId === 'string' &&
    /^[1-9][0-9]*$/.test(site.repositoryId) &&
    Number.isSafeInteger(Number(site.repositoryId)) &&
    BRANCH.test(site.branch) && !site.branch.includes('..') &&
    site.branch.split('/').every(part => part &&
      !part.startsWith('.') && !part.endsWith('.'));
}

/** Remove only a checkout root returned by this module. */
export async function disposeVerifiedStudioCheckout(root) {
  if (typeof root !== 'string' || !isAbsolute(root) ||
      dirname(resolve(root)) !== resolve(tmpdir()) ||
      !/^gnr8-source-checkout-[A-Za-z0-9]{6}$/.test(basename(root)))
    throw Error('native_studio_checkout_cleanup_invalid');
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw Error('native_studio_checkout_cleanup_invalid');
  await rm(root, { recursive: true, force: true });
}

/** The caller must first read the exact private repository ID and default
 * branch HEAD with a repository-only installation token. It owns the returned
 * temporary root and must remove it after the build handoff is complete.
 */
export async function prepareVerifiedStudioCheckout(input, deps = defaults) {
  const { site, sourceId, baseCommit, store, credential, trustedGit,
    author } = input ?? {};
  if (!validSite(site) || !SOURCE.test(sourceId) || !SHA.test(baseCommit) ||
      !store || typeof store.read !== 'function' ||
      typeof credential !== 'string' || !TOKEN.test(credential) ||
      typeof trustedGit !== 'string' || !isAbsolute(trustedGit) ||
      !author || typeof author.name !== 'string' ||
      typeof author.email !== 'string')
    throw Error('native_studio_checkout_input_invalid');
  const git = await realpath(trustedGit);
  await access(git, constants.X_OK);
  const root = await mkdtemp(join(tmpdir(), 'gnr8-source-checkout-'));
  const project = join(root, 'project');
  const template = join(root, 'template');
  const askpass = join(root, 'askpass');
  const url = `https://github.com/${site.repository}.git`;
  const baseEnv = { PATH: '/usr/bin:/bin', HOME: root, XDG_CONFIG_HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0',
    GIT_ATTR_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1',
    GIT_TEMPLATE_DIR: template, GIT_TERMINAL_PROMPT: '0' };
  const run = async (args, env = baseEnv) => (await exec(git, args, {
    env, cwd: root, shell: false, timeout: 120_000, maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  })).stdout.trim();
  let completed = false;
  try {
    await mkdir(template);
    await run(['init', '--quiet', project]);
    await run(['-C', project, 'remote', 'add', 'origin', deps.fetchUrl(site)]);
    await writeFile(askpass, '#!/bin/sh\ncase "$1" in\n  *Username*) printf x-access-token ;;\n  *Password*) printf %s "$GNR8_GITHUB_TOKEN" ;;\n  *) exit 1 ;;\nesac\n',
      { mode: 0o700, flag: 'wx' });
    await run(['-C', project, '-c', 'credential.helper=', 'fetch', '--no-tags',
      'origin', 'HEAD'], { ...baseEnv, GIT_ASKPASS: askpass,
      GNR8_GITHUB_TOKEN: credential });
    await rm(askpass, { force: true });
    if (await run(['-C', project, 'rev-parse', 'FETCH_HEAD']) !== baseCommit)
      throw Error('native_studio_checkout_base_changed');
    const tree = await run(['-C', project, 'ls-tree', '-r', '-z', 'FETCH_HEAD']);
    for (const line of tree.split('\0').filter(Boolean)) {
      const match = /^(\d{6}) (blob|commit) [a-f0-9]{40,64}\t(.+)$/.exec(line);
      if (!match || !['100644', '100755'].includes(match[1]) ||
          match[3] === '.gitattributes' || match[3] === '.gitmodules' ||
          match[3].endsWith('/.gitattributes') ||
          match[3].endsWith('/.gitmodules'))
        throw Error('native_studio_checkout_base_unsafe');
    }
    await run(['-C', project, 'checkout', '--quiet', '-b', site.branch,
      'FETCH_HEAD']);
    await run(['-C', project, 'remote', 'set-url', 'origin', url]);
    const committed = await deps.commitSource({ project, store, sourceId,
      site, author });
    const checked = await deps.verifySource({ project, store, sourceId, site });
    if (committed.commit !== checked.commit || checked.sourceId !== sourceId ||
        checked.repository !== site.repository || checked.branch !== site.branch ||
        (await run(['-C', project, 'rev-list', '--parents', '-n', '1',
          checked.commit])) !== `${checked.commit} ${baseCommit}`)
      throw Error('native_studio_checkout_source_unverified');
    completed = true;
    return { root, project, sourceId, baseCommit, commit: checked.commit };
  } catch (error) {
    if (error instanceof Error && /^native_studio_checkout_[a-z_]+$/.test(error.message))
      throw error;
    throw Error('native_studio_checkout_unavailable');
  } finally {
    if (!completed) await rm(root, { recursive: true, force: true });
  }
}
