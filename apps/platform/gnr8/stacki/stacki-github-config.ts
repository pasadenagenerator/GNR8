import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from '../output-adapters/astro-production-candidate-object-store';
import { StackiGitHubDelivery } from './stacki-github-delivery';
import { StackiDraftError, type StackiDraftScope } from './stacki-draft-contract';
import { GitHubStackiStore } from './stacki-github-store';

type Target = { owner: string; ownerId: number; repository: string; repositoryId: number; token: string };
type ConfiguredTarget = Omit<Target, 'token'>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const ownerName = /^[A-Za-z0-9-]{1,39}$/;
const repoName = /^[a-z0-9][a-z0-9-]{0,62}$/;
const resolved = new Map<string, { until: number; value: Promise<Target> }>();

function notConfigured(): never { throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED'); }

/** The existing enable switch selects GitHub for every new site. Repository
 * identity is checked against the site ID, rather than a per-site env allowlist. */
export function stackiGithubSelected(scope: StackiDraftScope): boolean {
  return process.env.GNR8_STACKI_GITHUB_ENABLED === '1' && uuid.test(scope.siteId);
}

function bindings(): { token: string; owner: string; ownerId: number; targets: Record<string, ConfiguredTarget> } {
  const token = process.env.GNR8_STACKI_GITHUB_TOKEN;
  if (!token) notConfigured();
  let targets: Record<string, ConfiguredTarget>;
  try { targets = JSON.parse(process.env.GNR8_STACKI_GITHUB_TARGETS ?? '{}'); }
  catch { notConfigured(); }
  if (!targets || typeof targets !== 'object' || Array.isArray(targets)) notConfigured();
  const existing = Object.values(targets);
  const first = existing[0];
  // The old mapping supplies the account identity during migration. New sites
  // never need another entry in that mapping.
  if (!first || !ownerName.test(first.owner) || !Number.isSafeInteger(first.ownerId) || first.ownerId < 1 ||
      existing.some(item => item?.owner !== first.owner || item.ownerId !== first.ownerId)) notConfigured();
  return { token, owner: first.owner, ownerId: first.ownerId, targets };
}

async function verifiedRepository(input: { scope: StackiDraftScope; owner: string; ownerId: number;
  repository: string; token: string; create: boolean; transport: typeof fetch }): Promise<Target> {
  const { scope, owner, ownerId, repository, token, create, transport } = input;
  if (!repoName.test(repository)) notConfigured();
  const headers = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'content-type': 'application/json' };
  const endpoint = `https://api.github.com/repos/${owner}/${repository}`;
  let response = await transport(endpoint, { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) });
  if (response.headers.get('x-oauth-scopes')?.split(',').map(value => value.trim()).includes('repo'))
    throw new StackiDraftError(503, 'STACKI_GITHUB_CREDENTIAL_TOO_BROAD');
  if (response.status === 404 && create) {
    response = await transport('https://api.github.com/user/repos', {
      method: 'POST', headers, redirect: 'error', signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({ name: repository, description: `GNR8 standalone site ${scope.siteId}`,
        private: true, auto_init: true }),
    });
    if (response.status === 403) throw new StackiDraftError(503, 'STACKI_GITHUB_REPOSITORY_CREATION_PERMISSION_REQUIRED');
    if (response.status === 422) response = await transport(endpoint, {
      headers, redirect: 'error', signal: AbortSignal.timeout(30_000),
    });
    if (response.headers.get('x-oauth-scopes')?.split(',').map(value => value.trim()).includes('repo'))
      throw new StackiDraftError(503, 'STACKI_GITHUB_CREDENTIAL_TOO_BROAD');
  }
  if (!response.ok) throw new StackiDraftError(503, 'STACKI_GITHUB_TARGET_UNAVAILABLE');
  const repo = await response.json();
  if (repo?.private !== true || repo.name !== repository || repo.owner?.login?.toLowerCase() !== owner.toLowerCase() ||
      repo.owner?.id !== ownerId || !Number.isSafeInteger(repo.id) || repo.id < 1 ||
      repo.description !== `GNR8 standalone site ${scope.siteId}` || repo.permissions?.push !== true)
    throw new StackiDraftError(503, 'STACKI_GITHUB_TARGET_MISMATCH');
  return { owner, ownerId, repository, repositoryId: repo.id, token };
}

/** A persisted immutable import reference selects its exact repository.
 * A fresh site gets a deterministic private repository, created once if the
 * account credential has GitHub's Repository creation permission. */
export async function configuredGitHubTarget(scope: StackiDraftScope, persistedRepository?: string,
  transport: typeof fetch = fetch): Promise<Target> {
  if (!stackiGithubSelected(scope)) notConfigured();
  const { token, owner, ownerId, targets } = bindings();
  const legacy = targets[scope.siteId];
  if (legacy && (!persistedRepository || persistedRepository === `${legacy.owner}/${legacy.repository}`)) {
    if (legacy.owner !== owner || legacy.ownerId !== ownerId || !repoName.test(legacy.repository) ||
        !Number.isSafeInteger(legacy.repositoryId) || legacy.repositoryId < 1) notConfigured();
    return { ...legacy, token };
  }
  let repository: string;
  if (persistedRepository) {
    const parts = persistedRepository.split('/');
    if (parts.length !== 2 || parts[0]?.toLowerCase() !== owner.toLowerCase() || !repoName.test(parts[1])) notConfigured();
    repository = parts[1];
    if (legacy && legacy.repository !== repository) throw new StackiDraftError(503, 'STACKI_GITHUB_TARGET_MISMATCH');
  } else repository = `gnr8-${scope.siteId}`;
  const key = `${scope.siteId}/${repository}/${token}`;
  const cached = resolved.get(key);
  if (cached && cached.until > Date.now()) return cached.value;
  const value = verifiedRepository({ scope, owner, ownerId, repository, token,
    create: !persistedRepository, transport });
  resolved.set(key, { until: Date.now() + 60_000, value });
  if (resolved.size > 100) resolved.delete(resolved.keys().next().value!);
  try { return await value; } catch (error) { resolved.delete(key); throw error; }
}

export async function configuredGitHubStackiStore(scope: StackiDraftScope) {
  const target = await configuredGitHubTarget(scope);
  let delivery: StackiGitHubDelivery | undefined;
  if (stackiLazyAssetsEnabled()) {
    const client = getSupabaseServiceRoleClient();
    if (!client) throw new StackiDraftError(503, 'STACKI_GITHUB_DELIVERY_UNAVAILABLE');
    delivery = new StackiGitHubDelivery(client, process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? '');
  }
  return new GitHubStackiStore(scope, target, undefined, undefined, delivery);
}

export function stackiLazyAssetsEnabled() { return process.env.GNR8_STACKI_LAZY_ASSETS_ENABLED === '1'; }
