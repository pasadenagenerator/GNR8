import 'server-only';
import { createHash } from 'node:crypto';
import { lstat, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { recordNativeStudioBuildOutputBytes,
  restoreNativeStudioBuildOutputBytes } from '../../../../scripts/stacki/build-output-bytes.mjs';
import { prepareNativeStudioGitDataSource,
  prepareNativeStudioGitDataArtifact,
  publishNativeStudioGitDataRef } from '../../../../scripts/stacki/github-git-data.mjs';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { verifyNativeAccessRoleBytesFreshness } from '../../../../scripts/stacki/native-access-role-freshness.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { configuredNativeStudioSandboxBuild } from './native-studio-configured-sandbox-build';
import { NATIVE_STUDIO_RESOURCE_RECEIPT,
  type NativeStudioResourceReceipt } from './native-studio-configured-resource-reservation';
import { inspectGitHubNativeStudioBranch } from './github-native-studio-head';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import type { NativeStudioScope } from './native-studio-binding-store';
import { SupabasePublicationStore } from './publication-store';

type Env = Record<string, string | undefined>;
type Site = Awaited<ReturnType<typeof configuredNativeStudioBootstrapSite>>;
const SHA = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40,64}$/;
const HEX32 = /^[a-f0-9]{32}$/;
const SOURCE_PUSH = 'native-studio/first-github-push-intent-v1.json';
const ARTIFACT_PUSH = 'native-studio/build-artifact-github-push-v1.json';
const BUILD_HANDOFF = 'native-studio/build-handoff-v1.json';
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const defaults = {
  site: configuredNativeStudioBootstrapSite,
  token: issueConfiguredNativeStudioGitHubToken,
  head: inspectGitHubNativeStudioBranch,
  source: readStoredVerifiedAstroStudio,
  prepareSource: prepareNativeStudioGitDataSource,
  build: configuredNativeStudioSandboxBuild,
  recordBytes: recordNativeStudioBuildOutputBytes,
  restoreBytes: restoreNativeStudioBuildOutputBytes,
  prepareArtifact: prepareNativeStudioGitDataArtifact,
  publishRef: publishNativeStudioGitDataRef,
  accessCandidates: readCurrentNativeStudioAccessCandidates,
  verifyRoles: verifyNativeAccessRoleBytesFreshness,
  store: (client: SupabaseClient, scope: NativeStudioScope, env: Env) =>
    new SupabasePublicationStore(client,
      env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET ?? 'gnr8-astro-candidate-routes', scope),
};

async function freshTarget(scope: NativeStudioScope, client: SupabaseClient,
  env: Env, site: Site, deps: typeof defaults) {
  if (!same(await deps.site(scope, client, env), site))
    throw Error('native_studio_first_build_target_changed');
}
async function token(scope: NativeStudioScope, client: SupabaseClient,
  env: Env, transport: typeof fetch, site: Site, deps: typeof defaults) {
  const issued = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'write');
  if (issued.repositoryId !== site.repositoryId)
    throw Error('native_studio_first_build_repository_changed');
  return issued.token;
}
async function publish(store: ReturnType<typeof defaults.store>, key: string,
  intent: unknown, site: Site, commit: string, credential: string,
  transport: typeof fetch, deps: typeof defaults,
  expectedBase?: string) {
  const prior = await store.read(key);
  if (prior && !same(prior, intent))
    throw Error('native_studio_first_build_push_intent_conflict');
  const before = await deps.head(site, credential, transport,
    expectedBase !== undefined);
  if (before.repositoryId !== site.repositoryId || before.branch !== site.branch)
    throw Error('native_studio_first_build_remote_unverified');
  if (before.commit === commit) return { state: 'verified', commit };
  if (before.commit !== null ||
      (expectedBase !== undefined && before.baseCommit !== expectedBase))
    throw Error('native_studio_first_build_branch_conflict');
  if (prior) return { state: 'pending-review', commit };
  const won = await store.claim(key, intent);
  if (!same(await store.read(key), intent))
    throw Error('native_studio_first_build_push_intent_conflict');
  if (!won) return { state: 'pending-review', commit };
  return deps.publishRef({ site, commit, credential, transport,
    inspectHead: deps.head, store });
}

async function verifySourceAuth(scope: NativeStudioScope, client: SupabaseClient,
  files: Array<{ path: string; body: Buffer }>, deps: typeof defaults) {
  const config = files.find(file => file.path === 'studio/cloudflare/wrangler.jsonc');
  let vars: Record<string, unknown>;
  try {
    const parsed = JSON.parse(config?.body.toString('utf8') ?? '');
    if (!parsed || typeof parsed !== 'object' || !parsed.vars ||
        typeof parsed.vars !== 'object' || Array.isArray(parsed.vars)) throw Error();
    vars = parsed.vars;
  } catch { throw Error('native_studio_push_auth_config_invalid'); }
  if (vars.AUTH_PROVIDER === 'access') {
    if (vars.EDITOR_ACCESS !== 'roles' ||
        typeof vars.ACCESS_TEAM_DOMAIN !== 'string' || !vars.ACCESS_TEAM_DOMAIN ||
        typeof vars.ACCESS_AUD !== 'string' || !vars.ACCESS_AUD ||
        typeof vars.AUTH_BOOTSTRAP_ADMIN !== 'string')
      throw Error('native_studio_push_auth_config_invalid');
    const principals = (await deps.accessCandidates(scope, client))
      .map(candidate => candidate.principal);
    if (!principals.some(principal => principal === vars.AUTH_BOOTSTRAP_ADMIN))
      throw Error('native_studio_push_auth_config_invalid');
    const roles = files.find(file => file.path === '.stacki/roles.json');
    if (!roles) throw Error('native_studio_push_auth_config_invalid');
    deps.verifyRoles({ rolesBytes: roles.body, principals });
  } else if (vars.EDITOR_ACCESS !== 'repository' ||
      ![undefined, 'github'].includes(vars.AUTH_PROVIDER as string | undefined)) {
    throw Error('native_studio_push_auth_config_invalid');
  }
}

/** Git objects are created by the trusted coordinator; site scripts run only
 * in the credential-free build Sandbox. No host Git executable or checkout. */
export async function configuredNativeStudioFirstBuildGitData(input: {
  scope: NativeStudioScope; client: SupabaseClient; sourceId: string;
  author: { name: string; email: string };
}, env: Env = process.env, transport: typeof fetch = fetch,
deps = defaults) {
  const { scope, client, sourceId, author } = input ?? {};
  if (!scope || !client || !SHA.test(sourceId) || !author)
    throw Error('native_studio_first_build_input_invalid');
  const site = await deps.site(scope, client, env);
  const store = deps.store(client, scope, env);
  const reserved = await store.read<NativeStudioResourceReceipt>(NATIVE_STUDIO_RESOURCE_RECEIPT);
  if (!reserved) throw Error('native_studio_first_build_resources_pending');
  const workerId = reserved.workers?.studio?.id;
  if (!workerId || !HEX32.test(workerId) ||
      reserved.target?.scope?.siteId !== scope.siteId ||
      reserved.target?.repository !== site.repository ||
      reserved.target?.accountId !== site.accountId ||
      reserved.target?.studioOrigin !== site.studioOrigin ||
      String(reserved.target?.repositoryId) !== site.repositoryId)
    throw Error('native_studio_first_build_resources_unverified');
  const source = await deps.source({ store, sourceId, site });
  const sourceToken = await token(scope, client, env, transport, site, deps);
  const firstHead = await deps.head(site, sourceToken, transport, true);
  const priorSourcePush = await store.read<{ commit: string; baseCommit: string }>(SOURCE_PUSH);
  const baseCommit = firstHead.commit === null ? firstHead.baseCommit :
    priorSourcePush?.commit === firstHead.commit ? priorSourcePush.baseCommit : null;
  if (firstHead.repositoryId !== site.repositoryId ||
      firstHead.branch !== site.branch || !COMMIT.test(baseCommit ?? '') ||
      (firstHead.commit !== null && !COMMIT.test(firstHead.commit ?? '')))
    throw Error('native_studio_first_build_branch_conflict');
  await freshTarget(scope, client, env, site, deps);
  const prepared = await deps.prepareSource({ site, store, sourceId,
    baseCommit: baseCommit!, author, files: source.files,
    credential: sourceToken, transport });
  if (prepared.sourceId !== sourceId ||
      prepared.baseCommit !== baseCommit ||
      prepared.repository !== site.repository ||
      prepared.branch !== site.branch || !COMMIT.test(prepared.commit))
    throw Error('native_studio_first_build_source_unverified');
  const built = await deps.build(scope, client, sourceId, env);
  if (built.state !== 'complete') return built;
  const artifactDir = resolve(built.artifactDir);
  const artifactInfo = await lstat(artifactDir);
  if (dirname(artifactDir) !== resolve(tmpdir()) ||
      !/^gnr8-native-build-artifact-[A-Za-z0-9]{6}$/.test(basename(artifactDir)) ||
      !artifactInfo.isDirectory() || artifactInfo.isSymbolicLink())
    throw Error('native_studio_first_build_artifact_invalid');
  try {
    await freshTarget(scope, client, env, site, deps);
    if (built.sourceId !== sourceId)
      throw Error('native_studio_first_build_source_unverified');
    const recorded = await deps.recordBytes({ artifactDir, files: built.files, store,
      scope, site, sourceId, commit: prepared.commit, workerId });
    const handoff = { sourceId, commit: prepared.commit, scope, workerId,
      site: { siteId: site.siteId, repository: site.repository,
        branch: site.branch, studioOrigin: site.studioOrigin,
        accountId: site.accountId },
      files: recorded.files.map((file: { path: string; bytes: number; sha256: string }) =>
        ({ path: file.path, bytes: file.bytes, sha256: file.sha256 })) };
    const prior = await store.read(BUILD_HANDOFF);
    if (prior && !same(prior, handoff))
      throw Error('native_studio_first_build_handoff_conflict');
    if (!prior) await store.claim(BUILD_HANDOFF, handoff);
    if (!same(await store.read(BUILD_HANDOFF), handoff))
      throw Error('native_studio_first_build_handoff_conflict');
  } finally { await rm(artifactDir, { recursive: true, force: true }); }
  const pushToken = await token(scope, client, env, transport, site, deps);
  await freshTarget(scope, client, env, site, deps);
  await verifySourceAuth(scope, client, source.files, deps);
  const sourceIntent = { identity: hash({ scope, sourceId, site,
    commit: prepared.commit, baseCommit: prepared.baseCommit }),
    commit: prepared.commit, baseCommit: prepared.baseCommit };
  const pushed = await publish(store, SOURCE_PUSH, sourceIntent,
    site, prepared.commit, pushToken, transport, deps, prepared.baseCommit);
  if (pushed.state !== 'verified')
    throw Error('native_studio_first_build_push_pending');
  const outputs = await deps.restoreBytes({ store, scope, site, sourceId,
    commit: prepared.commit, workerId });
  let files;
  try {
    files = await Promise.all(outputs.files.map(async file => ({
      path: file.path, body: await readFile(join(outputs.artifactDir, file.path)),
    })));
  } finally { await outputs.cleanup(); }
  const artifactToken = await token(scope, client, env, transport, site, deps);
  const artifact = await deps.prepareArtifact({ site, store, sourceId,
    sourceCommit: prepared.commit, workerId, files,
    credential: artifactToken, transport });
  await freshTarget(scope, client, env, site, deps);
  const branch = `gnr8-build-${prepared.commit}`;
  if (artifact.branch !== branch || !COMMIT.test(artifact.commit) ||
      !COMMIT.test(artifact.tree))
    throw Error('native_studio_first_build_artifact_invalid');
  const artifactIntent = { identity: hash({ scope, site, sourceId,
    sourceCommit: prepared.commit, workerId,
    artifactCommit: artifact.commit, tree: artifact.tree }),
    sourceId, sourceCommit: prepared.commit, workerId,
    artifactCommit: artifact.commit, tree: artifact.tree, branch };
  const artifactPushed = await publish(store, ARTIFACT_PUSH, artifactIntent,
    { ...site, branch }, artifact.commit, artifactToken, transport, deps);
  if (artifactPushed.state !== 'verified')
    throw Error('native_studio_first_build_artifact_pending');
  return { sourceId, commit: prepared.commit, workerId,
    artifactBranch: branch, artifactCommit: artifact.commit };
}
