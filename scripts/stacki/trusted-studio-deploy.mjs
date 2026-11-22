/** Run only in a dedicated deploy job with the verified checkout mounted
 * read-only. The build job must have ended before this process receives keys.
 * Importing this module never contacts Cloudflare.
 */
import { execFile } from 'node:child_process';
import { createHash, createHmac } from 'node:crypto';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { verifyCommittedStudioSource } from './prepare-git-branch.mjs';

const exec = promisify(execFile);
const TAG = /^gnr8-first-[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const INTENT = 'native-studio/first-deploy-intent-v1.json';
const ATTEMPT = 'native-studio/first-deploy-attempt-v1.json';
const NAMES = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];

const defaults = { verifySource: verifyCommittedStudioSource, invoke: exec };

export async function runTrustedStudioDeploy(input, deps = defaults) {
  const { file, args, cwd, token, secrets, scope, accountId, workerId,
    sourceId, site, store, commit } = input ?? {};
  if (typeof file !== 'string' || !isAbsolute(file) ||
      typeof cwd !== 'string' || !isAbsolute(cwd) ||
      !Array.isArray(args) || args.length !== 5 ||
      args[0] !== 'deploy' || args[1] !== '--config' ||
      args[2] !== 'cloudflare/wrangler.jsonc' || args[3] !== '--tag' ||
      typeof args[4] !== 'string' || !TAG.test(args[4]) ||
      typeof token !== 'string' || !TOKEN.test(token) ||
      !secrets || typeof secrets !== 'object' || Array.isArray(secrets) ||
      Object.keys(secrets).sort().join() !== NAMES.join() ||
      !NAMES.every(name => typeof secrets[name] === 'string' && secrets[name].length >= 16) ||
      !scope || ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      !HEX32.test(accountId) || !HEX32.test(workerId) ||
      !HEX64.test(sourceId) || !COMMIT.test(commit) ||
      !site || site.siteId !== scope.siteId || site.accountId !== accountId ||
      typeof site.repository !== 'string' || !site.repository ||
      typeof site.repositoryId !== 'string' ||
      !/^[1-9][0-9]*$/.test(site.repositoryId) ||
      !Number.isSafeInteger(Number(site.repositoryId)) ||
      typeof site.branch !== 'string' || !site.branch ||
      typeof site.studioOrigin !== 'string' || !store ||
      typeof store.read !== 'function' || typeof store.claim !== 'function' ||
      typeof deps.verifySource !== 'function' ||
      typeof deps.inspectGitHubHead !== 'function' ||
      typeof deps.invoke !== 'function')
    throw Error('native_studio_trusted_deploy_input_invalid');
  let domain;
  try { domain = new URL(site.studioOrigin).hostname; }
  catch { throw Error('native_studio_trusted_deploy_input_invalid'); }
  if (`https://${domain}` !== site.studioOrigin)
    throw Error('native_studio_trusted_deploy_input_invalid');
  const secretIdentity = createHmac('sha256', token)
    .update(JSON.stringify(secrets)).digest('hex');
  const target = { scope, accountId, workerId, sourceId, site, secretIdentity, commit };
  const expectedTag = `gnr8-first-${createHash('sha256')
    .update(JSON.stringify(target)).digest('hex')}`;
  if (args[4] !== expectedTag)
    throw Error('native_studio_trusted_deploy_target_mismatch');
  const studio = await realpath(cwd);
  if (basename(studio) !== 'studio')
    throw Error('native_studio_trusted_deploy_input_invalid');
  const checkout = resolve(studio, '..');
  const executable = await realpath(file);
  if (executable === checkout || executable.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_trusted_deploy_executable_invalid');
  let checked;
  try { checked = await deps.verifySource({ project: checkout, store, sourceId, site }); }
  catch { throw Error('native_studio_trusted_deploy_source_unverified'); }
  if (checked?.sourceId !== sourceId || checked.commit !== commit ||
      checked.branch !== site.branch || checked.repository !== site.repository)
    throw Error('native_studio_trusted_deploy_source_unverified');
  const identity = expectedTag.slice('gnr8-first-'.length);
  const intent = await store.read(INTENT);
  if (!intent || Object.keys(intent).sort().join() !== 'commit,identity' ||
      intent.identity !== identity || intent.commit !== commit)
    throw Error('native_studio_trusted_deploy_intent_mismatch');
  const head = await deps.inspectGitHubHead({ scope, site, commit });
  if (!head || head.repositoryId !== site.repositoryId ||
      head.branch !== site.branch || head.commit !== commit)
    throw Error('native_studio_trusted_deploy_github_head_unverified');
  if (!await store.claim(ATTEMPT, { identity, commit }))
    throw Error('native_studio_trusted_deploy_already_attempted');
  const privateHome = await mkdtemp(join(tmpdir(), 'gnr8-studio-deploy-'));
  try {
    const secretFile = join(privateHome, 'secrets.json');
    await writeFile(secretFile, JSON.stringify(secrets), { flag: 'wx', mode: 0o600 });
    try {
      await deps.invoke(executable, [...args, '--secrets-file', secretFile], {
        cwd: studio, shell: false, windowsHide: true, timeout: 15 * 60_000,
        maxBuffer: 2 * 1024 * 1024,
        env: { PATH: process.env.PATH ?? '', HOME: privateHome, TMPDIR: tmpdir(),
          CI: '1', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_API_TOKEN: token },
      });
    } catch { throw Error('native_studio_trusted_deploy_failed'); }
  } finally {
    await rm(privateHome, { recursive: true, force: true });
  }
}
