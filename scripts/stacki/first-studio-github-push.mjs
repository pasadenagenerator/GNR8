/** Trusted post-build first push of the exact verified source commit. */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA = /^[a-f0-9]{40,64}$/;
const TOKEN = /^ghs_[A-Za-z0-9._-]{20,4092}$/;
const REPOSITORY = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/;
const INTENT = 'native-studio/first-github-push-intent-v1.json';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function validSite(site, scope) {
  return site && site.siteId === scope.siteId &&
    typeof site.repository === 'string' &&
    typeof site.repositoryId === 'string' &&
    typeof site.branch === 'string' &&
    REPOSITORY.test(site.repository) &&
    /^[1-9][0-9]*$/.test(site.repositoryId) &&
    Number.isSafeInteger(Number(site.repositoryId)) &&
    BRANCH.test(site.branch) && !site.branch.includes('..') &&
    site.branch.split('/').every(part => part && !part.startsWith('.') && !part.endsWith('.'));
}

function observedHead(value, site) {
  if (!value || value.repositoryId !== site.repositoryId ||
      value.branch !== site.branch ||
      (value.commit !== null &&
        (typeof value.commit !== 'string' || !SHA.test(value.commit))) ||
      (value.baseCommit !== undefined &&
        (typeof value.baseCommit !== 'string' || !SHA.test(value.baseCommit))))
    throw Error('native_studio_github_push_remote_unverified');
  return value;
}

/** The checkout is never used for credentialed Git operations. This fresh bare
 * repository reads only verified Git objects through alternates; its config,
 * hooks, credential helpers and remote URL are controlled by the trusted job.
 */
export async function pushVerifiedStudioCommit({ project, site, commit, baseCommit, credential,
  trustedGit, preflightOnly = false }) {
  if (typeof project !== 'string' || !project ||
      !validSite(site, { siteId: site?.siteId }) ||
      typeof commit !== 'string' || !SHA.test(commit) ||
      typeof baseCommit !== 'string' || !SHA.test(baseCommit) ||
      typeof credential !== 'string' || !TOKEN.test(credential) ||
      typeof trustedGit !== 'string' || !isAbsolute(trustedGit))
    throw Error('native_studio_github_push_input_invalid');
  const checkout = await realpath(project);
  const git = await realpath(trustedGit);
  if (git === checkout || git.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_github_push_untrusted_git');
  const root = await mkdtemp(join(tmpdir(), 'gnr8-first-github-'));
  const bare = join(root, 'repository.git');
  const template = join(root, 'template');
  const askpass = join(root, 'askpass');
  const baseEnv = { PATH: '/usr/bin:/bin', HOME: root, XDG_CONFIG_HOME: root,
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_COUNT: '0',
    GIT_ATTR_NOSYSTEM: '1', GIT_NO_REPLACE_OBJECTS: '1',
    GIT_TEMPLATE_DIR: template, GIT_TERMINAL_PROMPT: '0' };
  const run = async (args, env = baseEnv) => {
    const result = await exec(git, args, { env, cwd: root, shell: false,
      timeout: 120_000, maxBuffer: 1024 * 1024, windowsHide: true });
    return result.stdout.trim();
  };
  try {
    await mkdir(template);
    // This command has no credential. It is used solely to locate the object
    // store; no checkout config is read by the subsequent network command.
    const objectPath = await run(['-C', checkout, 'rev-parse', '--git-path', 'objects']);
    const objects = await realpath(resolve(checkout, objectPath));
    if (/[\r\n]/.test(objects)) throw Error('native_studio_github_push_object_path_invalid');
    await run(['init', '--bare', '--quiet', bare]);
    await writeFile(join(bare, 'objects', 'info', 'alternates'), `${objects}\n`, { flag: 'wx' });
    if (await run(['-C', bare, 'cat-file', '-t', commit]) !== 'commit')
      throw Error('native_studio_github_push_commit_missing');
    if (await run(['-C', bare, 'rev-list', '--parents', '-n', '1', commit]) !==
        `${commit} ${baseCommit}`)
      throw Error('native_studio_github_push_parent_conflict');
    if (preflightOnly) return;
    await writeFile(askpass, '#!/bin/sh\ncase "$1" in\n  *Username*) printf x-access-token ;;\n  *Password*) printf %s "$GNR8_GITHUB_TOKEN" ;;\n  *) exit 1 ;;\nesac\n',
      { mode: 0o700, flag: 'wx' });
    const url = `https://github.com/${site.repository}.git`;
    await run(['-C', bare, '-c', 'credential.helper=',
      '-c', 'core.hooksPath=/dev/null', 'push', '--porcelain', '--no-verify',
      url, `${commit}:refs/heads/${site.branch}`],
    { ...baseEnv, GIT_ASKPASS: askpass, GNR8_GITHUB_TOKEN: credential });
  } catch (error) {
    if (error instanceof Error && [
      'native_studio_github_push_object_path_invalid',
      'native_studio_github_push_commit_missing',
      'native_studio_github_push_parent_conflict',
    ].includes(error.message)) throw error;
    throw Error('native_studio_github_push_transfer_ambiguous');
  }
  finally { await rm(root, { recursive: true, force: true }); }
}

export async function verifyStudioCommitParent(input) {
  return pushVerifiedStudioCommit({ ...input, preflightOnly: true });
}

/** A durable intent precedes the only push attempt. After an ambiguous result,
 * inspect the exact remote head; never retry by guessing whether it succeeded.
 */
export async function runFirstStudioGitHubPush(input, deps) {
  const { project, store, sourceId, site, scope, credential, trustedGit } = input ?? {};
  if (typeof project !== 'string' || !project || !store ||
      typeof store.read !== 'function' || typeof store.claim !== 'function' ||
      !SHA.test(sourceId) || !scope ||
      ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      !validSite(site, scope) || typeof credential !== 'string' ||
      !TOKEN.test(credential) || typeof trustedGit !== 'string' ||
      !isAbsolute(trustedGit) ||
      !deps || typeof deps.verifySource !== 'function' ||
      typeof deps.verifyParent !== 'function' ||
      typeof deps.readSite !== 'function' ||
      typeof deps.inspectRemote !== 'function' ||
      typeof deps.transfer !== 'function' ||
      (deps.verifyAccess !== undefined && typeof deps.verifyAccess !== 'function'))
    throw Error('native_studio_github_push_input_invalid');
  const current = await deps.readSite(scope);
  if (JSON.stringify(current) !== JSON.stringify(site))
    throw Error('native_studio_github_push_target_changed');
  const verified = await deps.verifySource({ project, store, sourceId, site });
  if (verified.sourceId !== sourceId || verified.repository !== site.repository ||
      verified.branch !== site.branch || typeof verified.commit !== 'string' ||
      !SHA.test(verified.commit))
    throw Error('native_studio_github_push_source_unverified');
  const existing = await store.read(INTENT);
  if (existing && (Object.keys(existing).sort().join() !== 'baseCommit,commit,identity' ||
      typeof existing.baseCommit !== 'string' || !SHA.test(existing.baseCommit) ||
      existing.commit !== verified.commit ||
      existing.identity !== digest({ scope, sourceId, site, commit: verified.commit,
        baseCommit: existing.baseCommit })))
    throw Error('native_studio_github_push_intent_conflict');
  const before = observedHead(await deps.inspectRemote(site, credential), site);
  if (before.commit === verified.commit) return { state: 'verified', commit: verified.commit };
  if (before.commit !== null) throw Error('native_studio_github_push_branch_conflict');
  if (typeof before.baseCommit !== 'string' || !SHA.test(before.baseCommit))
    throw Error('native_studio_github_push_base_unverified');
  const identity = digest({ scope, sourceId, site, commit: verified.commit,
    baseCommit: before.baseCommit });
  const expectedIntent = { identity, commit: verified.commit,
    baseCommit: before.baseCommit };
  if (existing && JSON.stringify(existing) !== JSON.stringify(expectedIntent))
    throw Error('native_studio_github_push_intent_conflict');
  if (existing) return { state: 'pending-review', commit: verified.commit };
  await deps.verifyParent({ project, site, commit: verified.commit,
    baseCommit: before.baseCommit, credential, trustedGit });
  if (deps.verifyAccess) await deps.verifyAccess();
  const claimed = await store.claim(INTENT, expectedIntent);
  const recorded = await store.read(INTENT);
  if (!recorded || JSON.stringify(recorded) !== JSON.stringify(expectedIntent))
    throw Error('native_studio_github_push_intent_conflict');
  if (!claimed) return { state: 'pending-review', commit: verified.commit };
  const rebound = await deps.readSite(scope);
  if (JSON.stringify(rebound) !== JSON.stringify(site))
    throw Error('native_studio_github_push_target_changed');
  if (deps.verifyAccess) await deps.verifyAccess();
  try { await deps.transfer({ project, site, commit: verified.commit,
    baseCommit: before.baseCommit,
    credential, trustedGit }); }
  catch (error) {
    if (error instanceof Error && [
      'native_studio_github_push_object_path_invalid',
      'native_studio_github_push_commit_missing',
      'native_studio_github_push_parent_conflict',
    ].includes(error.message)) throw error;
    // A lost response may follow a successful push. Read back once.
  }
  let after;
  try { after = observedHead(await deps.inspectRemote(site, credential), site); }
  catch { return { state: 'pending-review', commit: verified.commit }; }
  if (after.commit === verified.commit) return { state: 'verified', commit: verified.commit };
  if (after.commit !== null) throw Error('native_studio_github_push_branch_conflict');
  return { state: 'pending-review', commit: verified.commit };
}
