import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordStudioFirstDeployDryRun } from '../../../../scripts/stacki/first-studio-dry-run.mjs';
import { withConfiguredNativeStudioFirstDeployCheckout } from './native-studio-configured-first-deploy-checkout';
import type { NativeStudioScope } from './native-studio-binding-store';

type Environment = Record<string, string | undefined>;
const defaults = { withCheckout: withConfiguredNativeStudioFirstDeployCheckout,
  record: recordStudioFirstDeployDryRun };

/** Credential-free first-deploy preflight, run in its own disposable job. */
export async function configuredNativeStudioFirstDeployDryRun(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  sourceCommit: string; workerId: string; trustedGit: string;
  trustedWrangler: string;
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { trustedWrangler, ...checkoutInput } = input;
  return deps.withCheckout(checkoutInput, prepared => deps.record({
    project: prepared.project, store: prepared.store,
    sourceId: prepared.sourceId, commit: prepared.commit,
    scope: checkoutInput.scope, site: prepared.site,
    workerId: prepared.workerId, trustedWrangler,
  }), env, transport);
}
