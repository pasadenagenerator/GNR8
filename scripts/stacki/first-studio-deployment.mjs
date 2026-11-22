/** One-attempt first Studio deployment for a trusted, disposable Docker runner.
 * No provider operation happens on import. A caller must supply a scoped
 * Cloudflare inspector and an append-only per-site intent store.
 */
import { createHash, createHmac } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { verifyCommittedStudioSource } from './prepare-git-branch.mjs';

const exec = promisify(execFile);
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const HEX64 = /^[a-f0-9]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const INTENT = 'native-studio/first-deploy-intent-v1.json';
const SECRET_NAMES = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export async function runIsolatedStudioCommand({ file, args, cwd, home }) {
  const env = { PATH: process.env.PATH ?? '', HOME: home, TMPDIR: tmpdir(), CI: '1',
    WRANGLER_SEND_METRICS: 'false' };
  await exec(file, args, { cwd, env, shell: false, timeout: 15 * 60_000,
    maxBuffer: 2 * 1024 * 1024, windowsHide: true });
}

const defaults = { verifySource: verifyCommittedStudioSource,
  runCommand: runIsolatedStudioCommand };

/** The source package and checkout are verified after local builds and dry run.
 * A durable intent is claimed before the only live deploy attempt. Any lost
 * response becomes reconciliation work; this function never retries deploy.
 */
export async function runFirstStudioDeployment(input, deps = defaults) {
  const { project, store, sourceId, site, scope, accountId, workerId, token, secrets } = input ?? {};
  if (!project || typeof project !== 'string' || !store ||
      typeof store.read !== 'function' || typeof store.claim !== 'function' ||
      !scope || ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      !site || site.siteId !== scope.siteId || site.accountId !== accountId ||
      typeof site.repositoryId !== 'string' ||
      !/^[1-9][0-9]*$/.test(site.repositoryId) ||
      !Number.isSafeInteger(Number(site.repositoryId)) ||
      typeof site.studioOrigin !== 'string' || !HEX64.test(sourceId) ||
      !HEX32.test(accountId) || !HEX32.test(workerId) || !TOKEN.test(token) ||
      !secrets || typeof secrets !== 'object' || Array.isArray(secrets) ||
      Object.keys(secrets).sort().join() !== SECRET_NAMES.join() ||
      !SECRET_NAMES.every(name => typeof secrets[name] === 'string' && secrets[name].length >= 16) ||
      typeof deps.inspect !== 'function' ||
      typeof deps.inspectGitHubHead !== 'function' ||
      typeof deps.verifySource !== 'function' || typeof deps.runCommand !== 'function' ||
      typeof deps.deploy !== 'function' ||
      typeof deps.trustedWrangler !== 'string' || !isAbsolute(deps.trustedWrangler))
    throw Error('native_studio_first_deploy_input_invalid');
  const domain = new URL(site.studioOrigin).hostname;
  if (`https://${domain}` !== site.studioOrigin)
    throw Error('native_studio_first_deploy_input_invalid');
  const checkout = resolve(project);
  const canonicalCheckout = await realpath(checkout);
  const trustedWrangler = await realpath(deps.trustedWrangler);
  if (trustedWrangler === canonicalCheckout ||
      trustedWrangler.startsWith(`${canonicalCheckout}${sep}`))
    throw Error('native_studio_first_deploy_untrusted_wrangler');
  const secretIdentity = createHmac('sha256', token)
    .update(JSON.stringify(secrets)).digest('hex');
  const target = { scope, accountId, workerId, sourceId, site, secretIdentity };
  const inspection = expectedTag => deps.inspect({ scope, accountId, workerId, domain,
    token, repository: site.repository,
    ...(expectedTag ? { expectedTag, requireSecrets: true } : {}) });
  const requireGitHubHead = async commit => {
    const head = await deps.inspectGitHubHead({ scope, site, commit });
    if (!head || head.repositoryId !== site.repositoryId ||
        head.branch !== site.branch || head.commit !== commit)
      throw Error('native_studio_first_deploy_github_head_unverified');
  };
  let intent = await store.read(INTENT);
  if (intent && (Object.keys(intent).sort().join() !== 'commit,identity' ||
      !/^[a-f0-9]{40,64}$/.test(intent.commit) ||
      intent.identity !== digest({ ...target, commit: intent.commit })))
    throw Error('native_studio_first_deploy_intent_conflict');
  if (intent) {
    const checked = await deps.verifySource({ project: checkout, store, sourceId, site });
    if (checked.commit !== intent.commit) throw Error('native_studio_first_deploy_source_changed');
    await requireGitHubHead(intent.commit);
    const observed = await inspection(`gnr8-first-${intent.identity}`);
    return { state: observed.state === 'verified-source-control-plane'
      ? 'reconcile-required' : 'pending-review', commit: intent.commit,
      observation: observed.state };
  }
  const initial = await deps.verifySource({ project: checkout, store, sourceId, site });
  if (initial.sourceId !== sourceId || initial.branch !== site.branch ||
      initial.repository !== site.repository || !/^[a-f0-9]{40,64}$/.test(initial.commit))
    throw Error('native_studio_first_deploy_source_unverified');
  const before = await inspection();
  if (before.state !== 'pending' || before.reason !== 'no-deployment')
    throw Error('native_studio_first_deploy_existing_deployment');

  const home = await mkdtemp(join(tmpdir(), 'gnr8-first-studio-'));
  try {
    const rootCommand = (args) => deps.runCommand({ file: 'npm', args, cwd: checkout, home });
    const studioCommand = (args) => deps.runCommand({ file: 'npm', args,
      cwd: join(checkout, 'studio'), home });
    await rootCommand(['ci']);
    await studioCommand(['ci']);
    await rootCommand(['run', 'build']);
    await studioCommand(['run', 'build']);
    await deps.runCommand({ file: trustedWrangler,
      args: ['deploy', '--dry-run', '--config', 'cloudflare/wrangler.jsonc'],
      cwd: join(checkout, 'studio'), home });
    const checked = await deps.verifySource({ project: checkout, store, sourceId, site });
    if (checked.sourceId !== sourceId || checked.branch !== site.branch ||
        checked.repository !== site.repository || checked.commit !== initial.commit)
      throw Error('native_studio_first_deploy_source_unverified');
    await requireGitHubHead(checked.commit);
    const identity = digest({ ...target, commit: checked.commit });
    const expectedTag = `gnr8-first-${identity}`;
    const claimed = await store.claim(INTENT, { identity, commit: checked.commit });
    intent = await store.read(INTENT);
    if (!intent || intent.identity !== identity || intent.commit !== checked.commit)
      throw Error('native_studio_first_deploy_intent_conflict');
    if (!claimed) return { state: 'pending-review', commit: checked.commit,
      observation: 'concurrent-intent' };
    try {
      await deps.deploy({ file: trustedWrangler,
        args: ['deploy', '--config', 'cloudflare/wrangler.jsonc', '--tag', expectedTag],
        cwd: join(checkout, 'studio'), token, secrets, scope, accountId, workerId,
        sourceId, site, store, commit: checked.commit });
    } catch { /* A failed command can still have deployed. Inspect, never repeat. */ }
    let observed;
    try { observed = await inspection(expectedTag); }
    catch { return { state: 'pending-review', commit: checked.commit,
      observation: 'readback-unavailable' }; }
    return { state: observed.state === 'verified-source-control-plane'
      ? 'reconcile-required' : 'pending-review', commit: checked.commit,
      observation: observed.state };
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}
