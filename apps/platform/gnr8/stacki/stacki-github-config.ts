import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from '../output-adapters/astro-production-candidate-object-store';
import { StackiGitHubDelivery } from './stacki-github-delivery';
import { StackiDraftError, type StackiDraftScope } from './stacki-draft-contract';
import { GitHubStackiStore } from './stacki-github-store';
import { SiteGitHubRepositoryBinding } from './site-github-repository-binding';
import type { SupabaseClient } from '@supabase/supabase-js';

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
/** Migrate an allowlisted legacy site to the same durable binding used by new sites. */
export async function bindSelectedLegacyGitHubTarget(scope: StackiDraftScope,
  client: SupabaseClient, transport: typeof fetch = fetch) {
  if (!stackiGithubSelected(scope)) return null;
  const target = configuredGitHubTarget(scope);
  const ownerKind = await new GitHubStackiStore(scope, target, transport).verifiedOwnerKind();
  return new SiteGitHubRepositoryBinding(client, transport).bindVerified(scope,
    { ...target, ownerKind });
}
export function configuredGitHubStackiStore(scope: StackiDraftScope) {
  const target = configuredGitHubTarget(scope);
  return gitHubStore(scope,target);
}
function gitHubStore(scope:StackiDraftScope,target:ReturnType<typeof configuredGitHubTarget>){
  let delivery: StackiGitHubDelivery | undefined;
  if (stackiLazyAssetsEnabled()) {
    const client = getSupabaseServiceRoleClient();
    if (!client) throw new StackiDraftError(503, 'STACKI_GITHUB_DELIVERY_UNAVAILABLE');
    delivery = new StackiGitHubDelivery(client, process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? '');
  }
  return new GitHubStackiStore(scope, target, undefined, undefined, delivery);
}

/** The pilot environment mapping remains readable while durable bindings cut over. */
export async function resolvedGitHubTarget(scope:StackiDraftScope,clientOverride?:SupabaseClient){
  if(stackiGithubSelected(scope))return configuredGitHubTarget(scope);
  if(process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED!=='1')return null;
  const client=clientOverride??getSupabaseServiceRoleClient();
  if(!client)throw new StackiDraftError(503,'STACKI_GITHUB_NOT_CONFIGURED');
  const repository=await new SiteGitHubRepositoryBinding(client).read(scope);
  if(!repository)return null;
  const token=process.env.GNR8_STACKI_GITHUB_TOKEN;
  if(!token)throw new StackiDraftError(503,'STACKI_GITHUB_NOT_CONFIGURED');
  return {...repository,token};
}
export async function resolvedGitHubStackiStore(scope:StackiDraftScope,clientOverride?:SupabaseClient){
  const target=await resolvedGitHubTarget(scope,clientOverride);
  return target?gitHubStore(scope,target):null;
}

export async function githubArchiveRequired(scope:StackiDraftScope,clientOverride?:SupabaseClient){
  if(process.env.GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED!=='1')return false;
  if(stackiGithubSelected(scope))return true;
  return Boolean(await resolvedGitHubTarget(scope,clientOverride));
}

export function stackiLazyAssetsEnabled() { return process.env.GNR8_STACKI_LAZY_ASSETS_ENABLED === '1'; }
