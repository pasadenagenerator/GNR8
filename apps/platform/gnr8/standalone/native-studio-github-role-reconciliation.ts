import 'server-only';
import { configuredNativeStudioCloudflareCredential } from './native-studio-cloudflare-account-credential';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serializeNativeAccessRoles, validateNativeAccessRoles } from '../../../../scripts/stacki/native-access-roles.mjs';
import { readStoredVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { configuredNativeStudioBootstrapSite } from './native-studio-bootstrap-site';
import { inspectGitHubNativeStudioBranch } from './github-native-studio-head';
import { issueConfiguredNativeStudioGitHubToken } from './github-native-studio-token';
import { inspectCurrentNativeStudioAccessOwnerPolicy } from './native-studio-access-policy-reconciliation';
import { readVerifiedNativeStudioAccessAppV2Binding } from './native-studio-access-app-reservation';
import { isNativeStudioReconciliationActor,
  requireNativeStudioReconciliationAuthority,
  type NativeStudioReconciliationActor } from './native-studio-reconciliation-authority';
import type { NativeStudioScope } from './native-studio-binding-store';
import type { PublicationStore } from './publication-store';

type Environment = Record<string, string | undefined>;
type Site = Awaited<ReturnType<typeof configuredNativeStudioBootstrapSite>>;
type Store = Pick<PublicationStore, 'read' | 'getBytes' | 'claim'>;
type PolicyProof = { state: 'observed-exact-access-policy'; appId: string;
  policyId: string; principals: string[] };
export type NativeStudioGitHubRoles = { sourceId: string; headCommit: string;
  treeSha: string; roleBlobSha: string; previousPrincipals: string[] };

const SHA1 = /^[a-f0-9]{40}$/;
const SHA256 = /^[a-f0-9]{64}$/;
const TOKEN = /^ghs_[A-Za-z0-9._-]{20,4092}$/;
const APP_ID = /^(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const sha256 = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const blobSha = (body: Buffer) => createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');

function target(scope: NativeStudioScope, site: Site, sourceId: string) {
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value =>
      typeof value === 'string' && UUID.test(value)) || site?.siteId !== scope.siteId ||
      !SHA256.test(sourceId)) throw Error('native_studio_roles_target_invalid');
  return { scope, site, sourceId };
}

function api(site: Site, credential: string, transport: typeof fetch) {
  if (!TOKEN.test(credential) || typeof transport !== 'function')
    throw Error('native_studio_roles_credential_invalid');
  const [owner, repo] = site.repository.split('/');
  if (!owner || !repo) throw Error('native_studio_roles_target_invalid');
  const root = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  return async (path: string, method = 'GET', payload?: unknown): Promise<Record<string, unknown>> => {
    let response: Response;
    try {
      response = await transport(`${root}${path}`, { method, redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: { authorization: `Bearer ${credential}`,
          accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(payload === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }) });
    } catch { throw Error('native_studio_roles_github_unavailable'); }
    if (response.headers.get('x-oauth-scopes')?.split(',').map(value => value.trim()).includes('repo'))
      throw Error('native_studio_roles_credential_too_broad');
    if (!response.ok) throw Error(response.status === 409 || response.status === 422
      ? 'native_studio_roles_github_conflict' : 'native_studio_roles_github_unavailable');
    let body: unknown;
    try { body = await response.json(); }
    catch { throw Error('native_studio_roles_github_invalid'); }
    if (!object(body)) throw Error('native_studio_roles_github_invalid');
    return body;
  };
}

async function remoteRoles(site: Site, sourceId: string, credential: string,
  transport: typeof fetch): Promise<NativeStudioGitHubRoles> {
  const head = await inspectGitHubNativeStudioBranch(site, credential, transport);
  if (!head.commit || !SHA1.test(head.commit)) throw Error('native_studio_roles_head_unverified');
  const request = api(site, credential, transport);
  const commit = await request(`/git/commits/${head.commit}`);
  if (commit.sha !== head.commit || !object(commit.tree) ||
      !SHA1.test(commit.tree.sha as string))
    throw Error('native_studio_roles_commit_unverified');
  const treeSha = commit.tree.sha as string;
  const tree = await request(`/git/trees/${treeSha}?recursive=1`);
  if (tree.sha !== treeSha || tree.truncated !== false || !Array.isArray(tree.tree))
    throw Error('native_studio_roles_tree_unverified');
  const roles = tree.tree.filter(entry => object(entry) && entry.path === '.stacki/roles.json');
  if (roles.length !== 1 || !object(roles[0]) || roles[0].mode !== '100644' ||
      roles[0].type !== 'blob' || !SHA1.test(roles[0].sha as string))
    throw Error('native_studio_roles_file_unverified');
  const roleBlobSha = roles[0].sha as string;
  const blob = await request(`/git/blobs/${roleBlobSha}`);
  if (blob.sha !== roleBlobSha || blob.encoding !== 'base64' ||
      typeof blob.content !== 'string' || !Number.isSafeInteger(blob.size) ||
      (blob.size as number) > 262_144)
    throw Error('native_studio_roles_file_unverified');
  const bytes = Buffer.from(blob.content.replace(/\s/g, ''), 'base64');
  if (bytes.length !== blob.size || blobSha(bytes) !== roleBlobSha)
    throw Error('native_studio_roles_file_unverified');
  const source = bytes.toString('utf8');
  let previousPrincipals: string[];
  try {
    previousPrincipals = validateNativeAccessRoles(source);
    if (serializeNativeAccessRoles(previousPrincipals) !== source) throw Error();
  } catch { throw Error('native_studio_roles_file_unmanaged'); }
  const after = await inspectGitHubNativeStudioBranch(site, credential, transport);
  if (after.commit !== head.commit)
    throw Error('native_studio_roles_head_changed');
  return { sourceId, headCommit: head.commit, treeSha, roleBlobSha, previousPrincipals };
}

const defaults = {
  site: configuredNativeStudioBootstrapSite,
  token: issueConfiguredNativeStudioGitHubToken,
  remote: remoteRoles,
  source: readStoredVerifiedAstroStudio,
  policy: inspectCurrentNativeStudioAccessOwnerPolicy,
  binding: readVerifiedNativeStudioAccessAppV2Binding,
  actor: requireNativeStudioReconciliationAuthority,
};

async function boundSource(scope: NativeStudioScope, client: SupabaseClient,
  store: Store, sourceId: string, env: Environment, deps: typeof defaults) {
  const site = await deps.site(scope, client, env);
  target(scope, site, sourceId);
  let source;
  try { source = await deps.source({ store, sourceId, site }); }
  catch { throw Error('native_studio_roles_source_unverified'); }
  if (source.receipt.format !== 'gnr8-native-studio-source:v2' ||
      source.receipt.identitySha256 !== sourceId || !object(source.receipt.access))
    throw Error('native_studio_roles_source_unverified');
  return { site, access: source.receipt.access };
}

/** Inspect the exact current source branch and GNR8-generated native role file.
 * A richer file edited inside Stacki is left untouched for separate review. */
export async function inspectBoundNativeStudioGitHubRoles(input: {
  scope: NativeStudioScope; client: SupabaseClient; store: Store; sourceId: string;
  actor: NativeStudioReconciliationActor;
}, env: Environment = process.env, transport: typeof fetch = fetch, deps = defaults) {
  const { scope, client, store, sourceId, actor } = input ?? {} as typeof input;
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value =>
        typeof value === 'string' && UUID.test(value)) || !SHA256.test(sourceId) ||
      !client || !store || typeof store.read !== 'function' ||
      typeof store.getBytes !== 'function' || typeof store.claim !== 'function' ||
      !isNativeStudioReconciliationActor(actor))
    throw Error('native_studio_roles_input_invalid');
  await deps.actor(client, { actor, scope });
  const { site } = await boundSource(scope, client, store, sourceId, env, deps);
  const issued = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'read');
  if (issued.repositoryId !== site.repositoryId)
    throw Error('native_studio_roles_repository_changed');
  const roles = await deps.remote(site, sourceId, issued.token, transport);
  if (roles.sourceId !== sourceId || !SHA1.test(roles.headCommit) ||
      !SHA1.test(roles.treeSha) || !SHA1.test(roles.roleBlobSha))
    throw Error('native_studio_roles_remote_unverified');
  return roles;
}

/** Update only the generated native role file on the bound source branch.
 * An ambiguous ref update is never repeated for the same durable intent. */
export async function reconcileBoundNativeStudioGitHubRoles(input: {
  scope: NativeStudioScope; client: SupabaseClient; store: Store; sourceId: string;
  actor: NativeStudioReconciliationActor;
  previous: NativeStudioGitHubRoles; policyProof: PolicyProof;
}, env: Environment = process.env, transport: typeof fetch = fetch, deps = defaults) {
  const { scope, client, store, sourceId, actor, previous, policyProof } = input ?? {} as typeof input;
  if (!scope || ![scope.agencyId, scope.clientId, scope.siteId].every(value =>
        typeof value === 'string' && UUID.test(value)) || !SHA256.test(sourceId) ||
      !client || !store || typeof store.read !== 'function' ||
      typeof store.getBytes !== 'function' || typeof store.claim !== 'function' ||
      !isNativeStudioReconciliationActor(actor) ||
      !previous || previous.sourceId !== sourceId ||
      !SHA1.test(previous.headCommit) || !SHA1.test(previous.treeSha) ||
      !SHA1.test(previous.roleBlobSha) ||
      !policyProof || policyProof.state !== 'observed-exact-access-policy' ||
      !APP_ID.test(policyProof.appId) || typeof policyProof.policyId !== 'string')
    throw Error('native_studio_roles_input_invalid');
  await deps.actor(client, { actor, scope });
  const { site, access } = await boundSource(scope, client, store, sourceId, env, deps);
  const zoneId = env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID ?? '';
  const bound = await deps.binding({ scope, client, accountId: site.accountId,
    zoneId, store });
  if (bound.appId !== policyProof.appId ||
      bound.aud !== access.aud || bound.teamDomain !== access.teamDomain ||
      bound.previewOrigin !== `https://preview.${new URL(site.studioOrigin).hostname}`)
    throw Error('native_studio_roles_access_unverified');
  const credential = configuredNativeStudioCloudflareCredential(env, 'ACCESS_MANAGER');
  const accountId = site.accountId;
  const currentPolicy = async () => deps.policy({ scope, client, accountId, zoneId,
    appId: policyProof.appId, credential, store }, transport);
  const exact = async () => {
    const current = await currentPolicy();
    if (!same(current, policyProof)) throw Error('native_studio_roles_policy_changed');
  };
  await exact();
  const issued = await deps.token(scope, client, env, transport,
    deps.site, Date.now(), 'write');
  if (issued.repositoryId !== site.repositoryId)
    throw Error('native_studio_roles_repository_changed');
  let rolesSource: string;
  try { rolesSource = serializeNativeAccessRoles(policyProof.principals); }
  catch { throw Error('native_studio_roles_policy_invalid'); }
  if (same(previous.previousPrincipals, policyProof.principals)) {
    if (!same(await deps.remote(site, sourceId, issued.token, transport), previous))
      throw Error('native_studio_roles_head_changed');
    return { state: 'verified' as const, commit: previous.headCommit,
      principals: policyProof.principals };
  }
  const desiredBlob = Buffer.from(rolesSource);
  const roleBlobSha = blobSha(desiredBlob);
  const request = api(site, issued.token, transport);
  const identity = sha256({ scope, site, sourceId, previous,
    appId: policyProof.appId, policyId: policyProof.policyId, roleBlobSha });
  const key = `native-studio/access-role-update-${identity}.json`;
  const prior = await store.read<{ identity: string; baseCommit: string;
    commit: string; roleBlobSha: string }>(key);
  if (prior) {
    if (prior.identity !== identity || prior.baseCommit !== previous.headCommit ||
        prior.roleBlobSha !== roleBlobSha || !SHA1.test(prior.commit))
      throw Error('native_studio_roles_intent_conflict');
    const observed = await deps.remote(site, sourceId, issued.token, transport);
    if (observed.headCommit === prior.commit &&
        observed.roleBlobSha === roleBlobSha &&
        same(observed.previousPrincipals, policyProof.principals))
      return { state: 'verified' as const, commit: prior.commit,
        principals: policyProof.principals };
    return { state: 'pending-review' as const, commit: prior.commit };
  }
  const current = await deps.remote(site, sourceId, issued.token, transport);
  if (!same(current, previous)) throw Error('native_studio_roles_head_changed');
  const blob = await request('/git/blobs', 'POST',
    { content: desiredBlob.toString('base64'), encoding: 'base64' });
  if (blob.sha !== roleBlobSha) throw Error('native_studio_roles_blob_unverified');
  const tree = await request('/git/trees', 'POST', { base_tree: previous.treeSha,
    tree: [{ path: '.stacki/roles.json', mode: '100644', type: 'blob', sha: roleBlobSha }] });
  if (!SHA1.test(tree.sha as string)) throw Error('native_studio_roles_tree_unverified');
  const author = { name: 'GNR8 Stacki', email: 'stacki@gnr8.invalid' };
  const commit = await request('/git/commits', 'POST', { message: 'Sync Stacki access roles',
    tree: tree.sha, parents: [previous.headCommit], author, committer: author });
  if (!SHA1.test(commit.sha as string)) throw Error('native_studio_roles_commit_unverified');
  const created = await request(`/git/commits/${commit.sha}`);
  if (created.sha !== commit.sha || !object(created.tree) ||
      created.tree.sha !== tree.sha ||
      !Array.isArray(created.parents) || created.parents.length !== 1 ||
      !object(created.parents[0]) || created.parents[0].sha !== previous.headCommit)
    throw Error('native_studio_roles_commit_unverified');
  const intent = { identity, baseCommit: previous.headCommit,
    commit: commit.sha as string, roleBlobSha };
  await exact();
  if (!same(await deps.site(scope, client, env), site) ||
      (await deps.remote(site, sourceId, issued.token, transport)).headCommit !== previous.headCommit)
    throw Error('native_studio_roles_head_changed');
  const claimed = await store.claim(key, intent);
  if (!same(await store.read(key), intent)) throw Error('native_studio_roles_intent_conflict');
  if (!claimed) return { state: 'pending-review' as const, commit: intent.commit };
  await exact();
  if (!same(await deps.site(scope, client, env), site) ||
      (await deps.remote(site, sourceId, issued.token, transport)).headCommit !== previous.headCommit)
    throw Error('native_studio_roles_head_changed');
  const ref = `heads/${site.branch}`.split('/').map(encodeURIComponent).join('/');
  try { await request(`/git/refs/${ref}`, 'PATCH', { sha: intent.commit, force: false }); }
  catch { /* A lost response may follow a successful write. Read back once. */ }
  let observed: NativeStudioGitHubRoles;
  try { observed = await deps.remote(site, sourceId, issued.token, transport); }
  catch { return { state: 'pending-review' as const, commit: intent.commit }; }
  if (observed.headCommit === intent.commit && observed.roleBlobSha === roleBlobSha &&
      same(observed.previousPrincipals, policyProof.principals))
    return { state: 'verified' as const, commit: intent.commit,
      principals: policyProof.principals };
  if (observed.headCommit !== previous.headCommit)
    throw Error('native_studio_roles_head_changed');
  return { state: 'pending-review' as const, commit: intent.commit };
}
