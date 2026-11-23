import 'server-only';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, sep } from 'node:path';
import { promisify } from 'node:util';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuration } from '../../../../scripts/stacki/prepare-native-studio.mjs';
import { verifyStudioBuildHandoff } from '../../../../scripts/stacki/build-handoff.mjs';
import { verifyCommittedStudioSource } from '../../../../scripts/stacki/prepare-git-branch.mjs';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import { inspectCloudflarePublicStudioGatewayVacancy } from './cloudflare-public-studio-gateway';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { inspectConfiguredNativeStudioGitHubHead } from './native-studio-configured-github-head';
import { PUBLIC_INTENT } from './native-studio-configured-public-deploy-intent';
import { fingerprint } from './publication-contract';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const ATTEMPT = 'native-studio/first-public-deploy-attempt-v1.json';
const STUDIO_INTENT = 'native-studio/first-deploy-intent-v1.json';
const STUDIO_ATTEMPT = 'native-studio/first-deploy-attempt-v1.json';
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const TAG = /^gnr8-first-[a-f0-9]{64}$/;
const execute = promisify(execFile);
const defaults = { site: configuredNativeStudioBootstrapSite,
  verifySource: verifyCommittedStudioSource,
  verifyHandoff: verifyStudioBuildHandoff,
  head: inspectConfiguredNativeStudioGitHubHead,
  studio: inspectBoundCloudflareStudioFirstDeployment,
  vacancy: inspectCloudflarePublicStudioGatewayVacancy,
  invoke: execute };

/** The domain-attaching command runs once in a dedicated trusted job. The
 * checkout is already built and must never run source after receiving a key.
 */
export async function runTrustedNativeStudioPublicDeploy(input: {
  scope: NativeStudioScope; client: SupabaseClient;
  store: Pick<PublicationStore, 'read' | 'claim' | 'getBytes'>;
  project: string; sourceId: string; commit: string;
  studioWorkerId: string; publicWorkerId: string;
  studioTag: string; trustedWrangler: string; cloudflareCredential: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, store, project, sourceId, commit,
    studioWorkerId, publicWorkerId, studioTag, trustedWrangler,
    cloudflareCredential } = input ?? {};
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId]
    .every(value => typeof value === 'string' && UUID.test(value)) ||
      !client || !store || typeof store.read !== 'function' ||
      typeof store.claim !== 'function' || !isAbsolute(project) ||
      !isAbsolute(trustedWrangler) || !SHA.test(sourceId) ||
      !COMMIT.test(commit) || !HEX32.test(studioWorkerId) ||
      !HEX32.test(publicWorkerId) || !TAG.test(studioTag) ||
      !TOKEN.test(cloudflareCredential))
    throw Error('native_studio_public_deploy_input_invalid');
  const checkout = await realpath(project);
  const wrangler = await realpath(trustedWrangler);
  if (basename(checkout) !== 'project' || wrangler === checkout ||
      wrangler.startsWith(`${checkout}${sep}`))
    throw Error('native_studio_public_deploy_executable_invalid');
  const site = await deps.site(scope, client, env);
  const domain = new URL(site.studioOrigin).hostname;
  if (`https://${domain}` !== site.studioOrigin ||
      site.siteId !== scope.siteId || !HEX32.test(site.accountId))
    throw Error('native_studio_public_deploy_target_invalid');
  const identity = fingerprint({ scope, accountId: site.accountId,
    sourceId, commit, publicWorkerId, studioTag, domain,
    repository: site.repository });
  const receipt = { identity, commit, publicWorkerId };
  const [intent, studioIntent, studioAttempt] = await Promise.all([
    store.read<typeof receipt>(PUBLIC_INTENT),
    store.read<{ identity: string; commit: string }>(STUDIO_INTENT),
    store.read<{ identity: string; commit: string }>(STUDIO_ATTEMPT),
  ]);
  if (JSON.stringify(intent) !== JSON.stringify(receipt) ||
      studioIntent?.commit !== commit || studioAttempt?.commit !== commit ||
      studioIntent?.identity !== studioTag.slice('gnr8-first-'.length) ||
      studioAttempt?.identity !== studioIntent.identity)
    throw Error('native_studio_public_deploy_intent_unverified');
  let checked, handoff;
  try {
    checked = await deps.verifySource({ project: checkout, store, sourceId,
      site, allowBuildOutputs: true });
    handoff = await deps.verifyHandoff({ project: checkout, store, sourceId,
      commit, scope, site, workerId: studioWorkerId });
  } catch { throw Error('native_studio_public_deploy_build_unverified'); }
  if (checked?.sourceId !== sourceId || checked.commit !== commit ||
      checked.branch !== site.branch || checked.repository !== site.repository ||
      handoff?.sourceId !== sourceId || handoff.commit !== commit ||
      handoff.workerId !== studioWorkerId ||
      JSON.stringify(handoff.scope) !== JSON.stringify(scope))
    throw Error('native_studio_public_deploy_build_unverified');
  const expectedConfig = configuration(site).files.get('wrangler.json');
  if (!expectedConfig || await readFile(join(checkout, 'wrangler.json'), 'utf8') !== expectedConfig)
    throw Error('native_studio_public_deploy_config_unverified');
  for (const directory of [checkout, join(checkout, 'studio')]) {
    const names = await readdir(directory);
    if (names.some(name => /^\.(?:env|dev\.vars)(?:\.|$)/.test(name)))
      throw Error('native_studio_public_deploy_local_env_forbidden');
  }
  const [head, active, vacant] = await Promise.all([
    deps.head(scope, client, env, transport),
    deps.studio(scope, client, site.accountId, studioWorkerId,
      cloudflareCredential, transport, studioTag, true,
      { store, sourceId, site }),
    deps.vacancy(scope, site.accountId, publicWorkerId, domain,
      cloudflareCredential, transport),
  ]);
  if (head.repositoryId !== site.repositoryId ||
      head.branch !== site.branch || head.commit !== commit ||
      active.state !== 'verified-source-control-plane' ||
      active.workerId !== studioWorkerId || vacant.state !== 'vacant' ||
      vacant.workerId !== publicWorkerId || vacant.domain !== domain ||
      JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
    throw Error('native_studio_public_deploy_target_changed');
  if (!await store.claim(ATTEMPT, receipt))
    throw Error('native_studio_public_deploy_already_attempted');
  const privateHome = await mkdtemp(join(tmpdir(), 'gnr8-public-deploy-'));
  try {
    await deps.invoke(wrangler, ['deploy', '--config', 'wrangler.json',
      '--tag', `gnr8-public-first-${identity}`], {
      cwd: checkout, shell: false, windowsHide: true,
      timeout: 15 * 60_000, maxBuffer: 2 * 1024 * 1024,
      env: { NODE_ENV: 'production', PATH: process.env.PATH ?? '', HOME: privateHome,
        TMPDIR: tmpdir(), CI: '1', WRANGLER_SEND_METRICS: 'false',
        CLOUDFLARE_API_TOKEN: cloudflareCredential },
    });
  } catch { throw Error('native_studio_public_deploy_failed'); }
  finally { await rm(privateHome, { recursive: true, force: true }); }
  return { state: 'attempted' as const, commit, publicWorkerId,
    tag: `gnr8-public-first-${identity}` };
}
