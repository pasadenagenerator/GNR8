import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyStudioFirstDeployDryRun } from '../../../../scripts/stacki/first-studio-dry-run.mjs';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import { configuredFirstStudioDeployIntent } from './native-studio-configured-first-deploy-intent';
import { configuredNativeStudioDeploymentCredentials } from './native-studio-configured-deployment-credentials';
import { advanceNativeStudioDetachedDeploy } from './native-studio-detached-deploy';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const SNAPSHOT = /^snap_[A-Za-z0-9]+$/;
const EXECUTABLE = /^\/(?:usr|opt)\/[A-Za-z0-9_+./-]+$/;
const defaults = {
  withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  verifyPreflight: verifyStudioFirstDeployDryRun,
  credentials: configuredNativeStudioDeploymentCredentials,
  prepareIntent: configuredFirstStudioDeployIntent,
  inspect: inspectBoundCloudflareStudioFirstDeployment,
  advance: advanceNativeStudioDetachedDeploy,
};

/** Resume the same scoped deployment across bounded Worker invocations. The
 * source checkout and its build artifact are restored without Cloudflare
 * credentials; the detached runner opens secrets only after remote rehash. */
export async function configuredNativeStudioDetachedDeploy(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const snapshotId = env.GNR8_NATIVE_STUDIO_DEPLOY_SNAPSHOT ?? '';
  const wranglerPath = env.GNR8_NATIVE_STUDIO_DEPLOY_WRANGLER_PATH ?? '';
  const sandboxTimeoutMs = Number(
    env.GNR8_NATIVE_STUDIO_DEPLOY_SANDBOX_TIMEOUT_MS);
  if (!input?.scope || !input.client ||
      !SNAPSHOT.test(snapshotId) ||
      !EXECUTABLE.test(wranglerPath) || wranglerPath.includes('..') ||
      !Number.isSafeInteger(sandboxTimeoutMs) ||
      sandboxTimeoutMs < 30 * 60_000 ||
      sandboxTimeoutMs > 90 * 60_000)
    throw Error('native_studio_detached_deploy_not_configured');
  return deps.withCheckout(input, async prepared => {
    if (prepared.sourceId !== input.sourceId ||
        prepared.commit !== input.sourceCommit ||
        prepared.workerId !== input.workerId ||
        prepared.site.siteId !== input.scope.siteId)
      throw Error('native_studio_detached_deploy_checkout_unverified');
    const expected = { sourceId: prepared.sourceId,
      commit: prepared.commit, workerId: prepared.workerId,
      files: prepared.files };
    const proof = await deps.verifyPreflight({ project: prepared.project,
      store: prepared.store, sourceId: prepared.sourceId,
      commit: prepared.commit, scope: input.scope, site: prepared.site,
      workerId: prepared.workerId });
    if (JSON.stringify(proof) !== JSON.stringify(expected))
      throw Error('native_studio_detached_deploy_preflight_unverified');
    return deps.advance({ scope: input.scope, site: prepared.site,
      store: prepared.store, artifactProject: prepared.project,
      sourceId: prepared.sourceId, commit: prepared.commit,
      workerId: prepared.workerId, snapshotId,
      networkPolicy: { allow: ['api.cloudflare.com'] },
      sandboxTimeoutMs, wranglerPath,
      loadCredentials: () => deps.credentials(input.scope, prepared.store,
        prepared.site.accountId, env),
      prepareIntent: async credentials => {
        const intent = await deps.prepareIntent({
        scope: input.scope, client: input.client, store: prepared.store,
        project: prepared.project, sourceId: prepared.sourceId,
        commit: prepared.commit, workerId: prepared.workerId,
        cloudflareCredential: credentials.cloudflareCredential,
        secrets: credentials.secrets,
        }, env, transport);
        if (intent.state !== 'prepared' && intent.state !== 'pending-review')
          throw Error('native_studio_detached_deploy_intent_unverified');
        return { state: intent.state, commit: intent.commit, tag: intent.tag };
      },
      inspect: (credential, tag) => deps.inspect(input.scope,
        input.client, prepared.site.accountId, prepared.workerId,
        credential, transport, tag, true,
        { store: prepared.store, sourceId: prepared.sourceId,
          commit: prepared.commit,
          site: prepared.site }),
    });
  }, env, transport);
}
