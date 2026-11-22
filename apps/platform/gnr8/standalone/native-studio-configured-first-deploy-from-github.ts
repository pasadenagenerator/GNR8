import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configuredFirstStudioDeployIntent } from './native-studio-configured-first-deploy-intent';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { NativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';

type Environment = Record<string, string | undefined>;
const defaults = { withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  prepareIntent: configuredFirstStudioDeployIntent };

/** Prepare one durable first-deploy intent from the exact GitHub source and
 * artifact refs. A trusted host loads deployment secrets only after transfer.
 */
export async function prepareConfiguredNativeStudioFirstDeployFromGitHub(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
  loadDeploymentCredentials: () => Promise<{
    cloudflareCredential: string; secrets: NativeStudioRuntimeSecrets }>;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { loadDeploymentCredentials, ...checkoutInput } = input ?? {};
  if (typeof loadDeploymentCredentials !== 'function')
    throw Error('native_studio_deploy_credentials_loader_missing');
  return deps.withCheckout(checkoutInput, async prepared => {
    const { cloudflareCredential, secrets } = await loadDeploymentCredentials();
    return deps.prepareIntent({ scope: checkoutInput.scope,
      client: checkoutInput.client, store: prepared.store,
      project: prepared.project, sourceId: prepared.sourceId,
      commit: prepared.commit, workerId: prepared.workerId,
      cloudflareCredential, secrets }, env, transport);
  }, env, transport);
}
