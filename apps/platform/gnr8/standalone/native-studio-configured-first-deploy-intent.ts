import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { prepareFirstStudioDeployIntentFromHandoff } from '../../../../scripts/stacki/first-studio-deploy-intent.mjs';
import { verifyStoredFirstDeployHandoff } from '../../../../scripts/stacki/verify-stored-first-deploy.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { inspectConfiguredNativeStudioGitHubHead } from './native-studio-configured-github-head';
import { inspectBoundCloudflareStudioFirstDeployment } from './cloudflare-studio-first-deployment';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublicationStore } from './publication-store';
import type { NativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';

type Environment = Record<string, string | undefined>;

/** Trusted post-build preparation. It reads provider state and claims the
 * exact deploy intent without running site source or deploying a Worker.
 */
export async function configuredFirstStudioDeployIntent(input: {
  scope: NativeStudioScope; client: SupabaseClient;
  store: Pick<PublicationStore, 'read' | 'claim' | 'getBytes'>;
  project: string; sourceId: string; commit: string; workerId: string;
  cloudflareCredential: string; secrets: NativeStudioRuntimeSecrets;
}, env: Environment = process.env, transport: typeof fetch = fetch) {
  const { scope, client, store, project, sourceId, commit, workerId,
    cloudflareCredential, secrets } = input;
  const site = await configuredNativeStudioBootstrapSite(scope, client, env);
  return prepareFirstStudioDeployIntentFromHandoff({ project, store, sourceId,
    commit, scope, site, accountId: site.accountId, workerId,
    token: cloudflareCredential, secrets }, {
      verifyHandoff: async () => (await verifyStoredFirstDeployHandoff({
        store, scope, site, sourceId, commit, workerId })).handoff,
      readSite: () => configuredNativeStudioBootstrapSite(scope, client, env),
      inspectGitHubHead: () => inspectConfiguredNativeStudioGitHubHead(
        scope, client, env, transport),
      inspectCloudflare: () => inspectBoundCloudflareStudioFirstDeployment(
        scope, client, site.accountId, workerId, cloudflareCredential, transport,
        undefined, false, { store, sourceId, site }),
    });
}
