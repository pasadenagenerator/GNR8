import 'server-only';
import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from '../output-adapters/astro-production-candidate-object-store';
import { requirePublicOutputVersion } from '../output-adapters/public-output-access';
import { StackiDraftError, createStackiRecord, type StackiDraftScope } from './stacki-draft-contract';
import { SupabaseStackiDraftStore } from './stacki-draft-store';
import { GitHubStackiStore } from './stacki-github-store';
import { loadStackiSource, planStackiRuntimeAssets } from './stacki-source-loader';
import { StackiAssetPreparation } from './stacki-asset-preparation';
import { resolvedGitHubStackiStore, stackiGithubSelected } from './stacki-github-config';

export async function configuredStackiStore(scope: StackiDraftScope) {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new StackiDraftError(503, 'STACKI_DRAFT_STORAGE_UNAVAILABLE');
  const bucket = process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? '';
  return await resolvedGitHubStackiStore(scope) ?? new SupabaseStackiDraftStore(client, bucket);
}

/** Compatibility migration for versions created before GitHub initialization.
 * New Astro 7 baselines initialize their Git branch during Worker preparation. */
export async function bootstrapStackiGithub(scope: StackiDraftScope, actor: string, confirm: () => Promise<void>) {
  if(process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED!=='1' && !stackiGithubSelected(scope))return null;
  let phase = 'configure';
  const startedAt = Date.now();
  try {
    const store = await configuredStackiStore(scope);
    if (!(store instanceof GitHubStackiStore)) return null;
    phase = 'github-read';
    const existing = await store.latest();
    if (existing) return existing;
    const client = getSupabaseServiceRoleClient();
    if (!client) throw new StackiDraftError(503, 'STACKI_DRAFT_STORAGE_UNAVAILABLE');
    const bucket = process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? '';
    phase = 'legacy-read';
    const legacy = await new SupabaseStackiDraftStore(client, bucket).latest(scope);
    phase = 'source-read';
    const record = legacy ?? createStackiRecord(scope, actor, { expectedRevision: 0,
      files: await loadStackiSource(scope, client, requirePublicOutputVersion) });
    phase = 'asset-plan';
    const plan = await planStackiRuntimeAssets(scope, client, requirePublicOutputVersion);
    phase = 'asset-read';
    const assets = await new StackiAssetPreparation(client,bucket).readAll(plan);
    await confirm();
    phase = 'github-migrate';
    return await store.migrate(record, assets, confirm);
  } catch (error) {
    console.warn('gnr8-stacki-github-bootstrap-failure', { phase, elapsedMs: Date.now() - startedAt,
      reason: error instanceof StackiDraftError ? error.code : 'STACKI_DRAFT_UNAVAILABLE' });
    throw error;
  }
}
