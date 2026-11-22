/** Prepare the first deploy in a fresh trusted job after the build ends. */
import { verifyStudioBuildHandoff } from './build-handoff.mjs';
import { firstStudioDeployIdentity } from './first-studio-deploy-identity.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;
const INTENT = 'native-studio/first-deploy-intent-v1.json';
const SECRET_NAMES = ['AI_API_KEY', 'CONTAINER_TOKEN', 'GITHUB_CLIENT_SECRET',
  'GITHUB_PRIVATE_KEY', 'PUBLISH_CLOUDFLARE_API_TOKEN', 'SESSION_SECRET'];
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** No site code or GitHub/Cloudflare mutation runs here. A caller supplies scoped,
 * read-only GitHub and Cloudflare inspectors and an authoritative site reader.
 */
export async function prepareFirstStudioDeployIntentFromHandoff(input, deps = {}) {
  const { project, store, sourceId, commit, scope, site, accountId, workerId,
    token, secrets } = input ?? {};
  const verifyHandoff = deps.verifyHandoff ?? verifyStudioBuildHandoff;
  if (typeof project !== 'string' || !project || !store ||
      typeof store.read !== 'function' || typeof store.claim !== 'function' ||
      typeof sourceId !== 'string' || !SHA.test(sourceId) ||
      typeof commit !== 'string' || !COMMIT.test(commit) ||
      !scope || Object.keys(scope).sort().join() !== 'agencyId,clientId,siteId' ||
      ![scope.agencyId, scope.clientId, scope.siteId]
        .every(value => typeof value === 'string' && UUID.test(value)) ||
      !site || site.siteId !== scope.siteId || site.accountId !== accountId ||
      typeof site.repositoryId !== 'string' ||
      !/^[1-9][0-9]*$/.test(site.repositoryId) ||
      !Number.isSafeInteger(Number(site.repositoryId)) ||
      typeof site.branch !== 'string' || !site.branch ||
      typeof site.repository !== 'string' || !site.repository ||
      typeof site.studioOrigin !== 'string' ||
      typeof accountId !== 'string' || !HEX32.test(accountId) ||
      typeof workerId !== 'string' || !HEX32.test(workerId) ||
      typeof token !== 'string' || !TOKEN.test(token) ||
      !secrets || typeof secrets !== 'object' || Array.isArray(secrets) ||
      Object.keys(secrets).sort().join() !== SECRET_NAMES.join() ||
      !SECRET_NAMES.every(name => typeof secrets[name] === 'string' &&
        secrets[name].length >= 16) ||
      typeof deps.readSite !== 'function' ||
      typeof verifyHandoff !== 'function' ||
      typeof deps.inspectGitHubHead !== 'function' ||
      typeof deps.inspectCloudflare !== 'function')
    throw Error('native_studio_first_deploy_intent_input_invalid');
  let domain;
  try { domain = new URL(site.studioOrigin).hostname; }
  catch { throw Error('native_studio_first_deploy_intent_input_invalid'); }
  if (`https://${domain}` !== site.studioOrigin)
    throw Error('native_studio_first_deploy_intent_input_invalid');
  if (!same(await deps.readSite(scope), site))
    throw Error('native_studio_first_deploy_intent_target_changed');
  const handoff = await verifyHandoff({ project, store, sourceId, commit,
    scope, site, workerId });
  if (handoff?.sourceId !== sourceId || handoff.commit !== commit ||
      !same(handoff.scope, scope) || handoff.workerId !== workerId)
    throw Error('native_studio_first_deploy_intent_handoff_unverified');
  const head = await deps.inspectGitHubHead({ scope, site, commit });
  if (!head || head.repositoryId !== site.repositoryId ||
      head.branch !== site.branch || head.commit !== commit)
    throw Error('native_studio_first_deploy_intent_github_head_unverified');
  const cloudflare = await deps.inspectCloudflare({ scope, accountId, workerId,
    domain, repository: site.repository, token });
  if (cloudflare?.state !== 'pending' || cloudflare.reason !== 'no-deployment')
    throw Error('native_studio_first_deploy_intent_existing_deployment');
  if (!same(await deps.readSite(scope), site))
    throw Error('native_studio_first_deploy_intent_target_changed');
  const { identity, tag } = firstStudioDeployIdentity({ scope, accountId,
    workerId, sourceId, site, token, secrets, commit });
  const receipt = { identity, commit };
  const previous = await store.read(INTENT);
  if (previous && !same(previous, receipt))
    throw Error('native_studio_first_deploy_intent_conflict');
  if (previous) return { state: 'pending-review', commit, tag };
  const claimed = await store.claim(INTENT, receipt);
  if (!same(await store.read(INTENT), receipt))
    throw Error('native_studio_first_deploy_intent_conflict');
  return { state: claimed ? 'prepared' : 'pending-review', commit, tag,
    args: ['deploy', '--config', 'cloudflare/wrangler.jsonc', '--tag', tag] };
}
