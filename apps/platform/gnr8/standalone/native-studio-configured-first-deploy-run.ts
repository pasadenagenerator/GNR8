import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstStudioDeployIdentity } from '../../../../scripts/stacki/first-studio-deploy-identity.mjs';
import { verifyStudioFirstDeployDryRun } from '../../../../scripts/stacki/first-studio-dry-run.mjs';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import { configuredFirstStudioDeployIntent } from './native-studio-configured-first-deploy-intent';
import { configuredNativeStudioTrustedDeploy } from './native-studio-configured-trusted-deploy';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { NativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';

type Environment = Record<string, string | undefined>;
const ATTEMPT = 'native-studio/first-deploy-attempt-v1.json';
const INTENT = 'native-studio/first-deploy-intent-v1.json';
const defaults = {
  withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  prepareIntent: configuredFirstStudioDeployIntent,
  deploy: configuredNativeStudioTrustedDeploy,
  inspect: inspectBoundCloudflareStudioFirstDeployment,
  credentials: configuredNativeStudioDeploymentCredentials,
};

/** One first-deploy attempt from verified GitHub refs. The caller supplies a
 * trusted credential-free preflight result from a separate build environment.
 * This function does not invoke npm directly. The downstream trusted gate now
 * requires an immutable prebuilt image receipt. The hosted runner stays off
 * until a separate credential-free image build and registry push supplies it.
 */
export async function runConfiguredNativeStudioFirstDeploy(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
  trustedWrangler: string;
  verifyPreflight?: (prepared: { sourceId: string; commit: string;
    workerId: string; files: number }) => Promise<{ sourceId: string;
      commit: string; workerId: string; files: number }>;
  loadDeploymentCredentials?: () => Promise<{
    cloudflareCredential: string; secrets: NativeStudioRuntimeSecrets }>;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { verifyPreflight, loadDeploymentCredentials, trustedWrangler,
    ...checkoutInput } = input ?? {};
  if (verifyPreflight !== undefined && typeof verifyPreflight !== 'function' ||
      (loadDeploymentCredentials !== undefined &&
        typeof loadDeploymentCredentials !== 'function') ||
      typeof trustedWrangler !== 'string' || !trustedWrangler)
    throw Error('native_studio_configured_first_deploy_input_invalid');
  return deps.withCheckout(checkoutInput, async prepared => {
    const expected = { sourceId: prepared.sourceId, commit: prepared.commit,
      workerId: prepared.workerId, files: prepared.files };
    const proof = await (verifyPreflight ? verifyPreflight(expected) :
      verifyStudioFirstDeployDryRun({ project: prepared.project,
        store: prepared.store, sourceId: prepared.sourceId,
        commit: prepared.commit, scope: checkoutInput.scope,
        site: prepared.site, workerId: prepared.workerId }));
    if (JSON.stringify(proof) !== JSON.stringify(expected))
      throw Error('native_studio_configured_first_deploy_preflight_unverified');
    const { cloudflareCredential, secrets } = await (loadDeploymentCredentials
      ? loadDeploymentCredentials()
      : deps.credentials(checkoutInput.scope, prepared.store,
        prepared.site.accountId, env));
    const expectedIdentity = firstStudioDeployIdentity({ scope: checkoutInput.scope,
      accountId: prepared.site.accountId, workerId: prepared.workerId,
      sourceId: prepared.sourceId, site: prepared.site,
      token: cloudflareCredential, secrets, commit: prepared.commit });
    const observe = async () => {
      let observed;
      try {
        observed = await deps.inspect(checkoutInput.scope, checkoutInput.client,
          prepared.site.accountId, prepared.workerId, cloudflareCredential,
          transport, expectedIdentity.tag, true);
      } catch {
        return { state: 'pending-review' as const, commit: prepared.commit,
          observation: 'readback-unavailable' };
      }
      return { state: observed.state === 'verified-source-control-plane'
        ? 'reconcile-required' as const : 'pending-review' as const,
        commit: prepared.commit, observation: observed.state };
    };
    const prior = await prepared.store.read(INTENT) as
      { identity: string; commit: string } | null;
    if (prior) {
      if (prior.identity !== expectedIdentity.identity ||
          prior.commit !== prepared.commit)
        throw Error('native_studio_configured_first_deploy_intent_unverified');
      const attempted = await prepared.store.read(ATTEMPT) as
        { identity: string; commit: string } | null;
      if (attempted) {
        if (attempted.identity !== expectedIdentity.identity ||
            attempted.commit !== prepared.commit)
          throw Error('native_studio_configured_first_deploy_attempt_unverified');
        return observe();
      }
    }
    const intent = await deps.prepareIntent({ scope: checkoutInput.scope,
      client: checkoutInput.client, store: prepared.store,
      project: prepared.project, sourceId: prepared.sourceId,
      commit: prepared.commit, workerId: prepared.workerId,
      cloudflareCredential, secrets }, env, transport);
    if (intent.commit !== prepared.commit ||
        (intent.state !== 'prepared' && intent.state !== 'pending-review'))
      throw Error('native_studio_configured_first_deploy_intent_unverified');
    const resume = Boolean(prior) && intent.state === 'pending-review' &&
      intent.tag === expectedIdentity.tag;
    if (intent.state !== 'prepared' && !resume)
      return { state: 'pending-review' as const, commit: prepared.commit,
        observation: 'existing-intent' };
    const args = resume ? ['deploy', '--config', 'cloudflare/wrangler.jsonc',
      '--tag', expectedIdentity.tag] : intent.args;
    if (!Array.isArray(args) || args.length !== 5 ||
        args[4] !== intent.tag || intent.tag !== expectedIdentity.tag ||
        !/^gnr8-first-[a-f0-9]{64}$/.test(intent.tag))
      throw Error('native_studio_configured_first_deploy_intent_unverified');
    try {
      await deps.deploy({ scope: checkoutInput.scope,
        client: checkoutInput.client, store: prepared.store,
        project: prepared.project, sourceId: prepared.sourceId,
        commit: prepared.commit, workerId: prepared.workerId,
        trustedWrangler, args,
        cloudflareCredential, secrets }, env, transport);
    } catch (error) {
      const attempt = await prepared.store.read(ATTEMPT) as
        { identity: string; commit: string } | null;
      if (attempt?.identity !== expectedIdentity.identity ||
          attempt.commit !== prepared.commit) throw error;
    }
    const attempt = await prepared.store.read(ATTEMPT) as
      { identity: string; commit: string } | null;
    if (attempt?.identity !== expectedIdentity.identity ||
        attempt.commit !== prepared.commit)
      throw Error('native_studio_configured_first_deploy_attempt_unverified');
    return observe();
  }, env, transport);
}
