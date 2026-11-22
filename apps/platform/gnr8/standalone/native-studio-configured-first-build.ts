import 'server-only';
import { lstat, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { exportStudioBuildArtifactDirectory } from '../../../../scripts/stacki/build-artifact-transfer.mjs';
import { disposeVerifiedStudioCheckout } from '../../../../scripts/stacki/verified-studio-checkout.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { configuredNativeStudioBuildHandoff } from './native-studio-configured-build-handoff';
import { configuredFirstStudioGitHubPush } from './native-studio-configured-first-github-push';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { configuredNativeStudioSourceCheckout } from './native-studio-configured-source-checkout';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
const SHA = /^[a-f0-9]{64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  checkout: configuredNativeStudioSourceCheckout,
  build: configuredNativeStudioBuildHandoff,
  push: configuredFirstStudioGitHubPush,
  export: exportStudioBuildArtifactDirectory,
  dispose: disposeVerifiedStudioCheckout,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Environment) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

export async function disposeNativeStudioFirstBuildArtifact(root: string) {
  if (!isAbsolute(root) || dirname(resolve(root)) !== resolve(tmpdir()) ||
      !/^gnr8-first-build-artifact-[A-Za-z0-9]{6}$/.test(basename(root)))
    throw Error('native_studio_first_build_artifact_invalid');
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink())
    throw Error('native_studio_first_build_artifact_invalid');
  await rm(root, { recursive: true, force: true });
}

/** Trusted predeployment stage. It returns only verified build output for an
 * isolated deploy job; the source commit is already durable on GitHub.
 */
export async function configuredNativeStudioFirstBuild(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  trustedGit: string; author: { name: string; email: string };
}, env: Environment = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, sourceId, trustedGit, author } = input;
  if (!scope || !client || !SHA.test(sourceId) || !trustedGit || !author)
    throw Error('native_studio_first_build_input_invalid');
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const reserved = await store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT);
  const workerId = reserved?.workers?.studio?.id;
  if (!workerId || !HEX32.test(workerId) ||
      reserved.target?.scope?.siteId !== scope.siteId ||
      reserved.target?.repository !== site.repository ||
      reserved.target?.accountId !== site.accountId ||
      reserved.target?.studioOrigin !== site.studioOrigin ||
      String(reserved.target?.repositoryId) !== site.repositoryId)
    throw Error('native_studio_first_build_resources_unverified');
  const checkout = await deps.checkout({ scope, client, sourceId,
    trustedGit, author }, env, transport);
  let artifactRoot: string | null = null;
  try {
    await deps.build({ scope, client, project: checkout.project,
      sourceId, commit: checkout.commit, workerId }, env);
    if (JSON.stringify(await deps.site(scope, client, env)) !== JSON.stringify(site))
      throw Error('native_studio_first_build_target_changed');
    artifactRoot = await mkdtemp(join(tmpdir(), 'gnr8-first-build-artifact-'));
    const artifactDir = join(artifactRoot, 'artifact');
    await deps.export({ project: checkout.project, artifactDir, store,
      sourceId, commit: checkout.commit, scope, site, workerId });
    const pushed = await deps.push({ scope, client, store,
      project: checkout.project, sourceId, commit: checkout.commit,
      workerId, trustedGit }, env, transport);
    if (pushed.state !== 'verified' || pushed.commit !== checkout.commit)
      throw Error('native_studio_first_build_push_pending');
    return { artifactRoot, artifactDir, sourceId,
      commit: checkout.commit, workerId };
  } catch (error) {
    if (artifactRoot) await rm(artifactRoot, { recursive: true, force: true });
    throw error;
  } finally {
    await deps.dispose(checkout.root);
  }
}
