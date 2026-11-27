import 'server-only';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runTrustedStudioDeploy } from '../../../../scripts/stacki/trusted-studio-deploy.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { inspectConfiguredNativeStudioGitHubHead } from './native-studio-configured-github-head';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { NativeStudioRuntimeSecrets } from './native-studio-runtime-secrets';
import type { PublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const defaults = { site: configuredNativeStudioBootstrapSite,
  head: inspectConfiguredNativeStudioGitHubHead,
  deploy: runTrustedStudioDeploy };

/** One exact native Studio deploy command in an isolated trusted job. The
 * underlying gate verifies source, build bytes, GitHub head and durable intent.
 */
export async function configuredNativeStudioTrustedDeploy(input: {
  scope: NativeStudioScope; client: SupabaseClient;
  store: Pick<PublicationStore, 'read' | 'claim'>;
  project: string; sourceId: string; commit: string; workerId: string;
  trustedWrangler: string; args: string[];
  cloudflareCredential: string; secrets: NativeStudioRuntimeSecrets;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, store, project, sourceId, commit, workerId,
    trustedWrangler, args, cloudflareCredential, secrets } = input;
  const site = await deps.site(scope, client, env);
  const deploy = deps.deploy as unknown as (input: unknown,
    overrides: { inspectGitHubHead: () => Promise<unknown> }) => Promise<unknown>;
  return deploy({ file: trustedWrangler, args,
    cwd: join(project, 'studio'), token: cloudflareCredential, secrets,
    scope, accountId: site.accountId, workerId, sourceId, site, store,
    commit }, {
      inspectGitHubHead: async () => {
        if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
          throw Error('native_studio_configured_deploy_target_changed');
        return deps.head(scope, client, env, transport);
      },
    });
}
