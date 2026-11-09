import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from '../output-adapters/astro-production-candidate-object-store';
import { StackiGitHubDelivery } from './stacki-github-delivery';
import { StackiDraftError, type StackiDraftScope } from './stacki-draft-contract';
import { GitHubStackiStore } from './stacki-github-store';

/** Pilot allowlist. A missing or malformed binding fails closed for selected sites. */
export function stackiGithubSelected(scope: StackiDraftScope): boolean {
  if (process.env.GNR8_STACKI_GITHUB_ENABLED !== '1') return false;
  let siteIds: string[];
  try { siteIds = JSON.parse(process.env.GNR8_STACKI_GITHUB_SITE_IDS ?? '[]'); }
  catch { throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED'); }
  if (!Array.isArray(siteIds) || siteIds.length > 100 || siteIds.some(id => typeof id !== 'string' ||
      !/^[a-f0-9-]{36}$/.test(id)))
    throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED');
  return siteIds.includes(scope.siteId);
}
export function configuredGitHubTarget(scope: StackiDraftScope) {
  if (!stackiGithubSelected(scope)) throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED');
  let targets: Record<string, {owner:string;ownerId:number;repository:string;repositoryId:number}>;
  try { targets = JSON.parse(process.env.GNR8_STACKI_GITHUB_TARGETS ?? '{}'); }
  catch { throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED'); }
  const target = targets[scope.siteId], token = process.env.GNR8_STACKI_GITHUB_TOKEN;
  if (!target || Object.keys(target).sort().join() !== 'owner,ownerId,repository,repositoryId' || !token)
    throw new StackiDraftError(503, 'STACKI_GITHUB_NOT_CONFIGURED');
  return {...target, token};
}
export function configuredGitHubStackiStore(scope: StackiDraftScope) {
  const target = configuredGitHubTarget(scope);
  let delivery: StackiGitHubDelivery | undefined;
  if (stackiLazyAssetsEnabled()) {
    const client = getSupabaseServiceRoleClient();
    if (!client) throw new StackiDraftError(503, 'STACKI_GITHUB_DELIVERY_UNAVAILABLE');
    delivery = new StackiGitHubDelivery(client, process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? '');
  }
  return new GitHubStackiStore(scope, target, undefined, undefined, delivery);
}

export function stackiLazyAssetsEnabled() { return process.env.GNR8_STACKI_LAZY_ASSETS_ENABLED === '1'; }
