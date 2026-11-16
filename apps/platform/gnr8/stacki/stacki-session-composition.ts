import { StackiAssetPreparation } from './stacki-asset-preparation';
import { planStackiRuntimeAssets } from './stacki-source-loader';
import { requirePublicOutputVersion } from '../output-adapters/public-output-access';
import "server-only";
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from "../output-adapters/astro-production-candidate-object-store";
import { getSupabaseServiceRoleClient } from "../../src/supabase/service-role-server";
import { authorizeConfiguredStackiPilot, createConfiguredStackiDraftRoutes } from "./stacki-draft-composition";
import { StackiDraftError } from "./stacki-draft-contract";
import { StackiSessionStore } from "./stacki-session-store";
import { createStackiSessionRoutes } from "./stacki-session-routes";
import { VercelStackiProvider } from "./stacki-vercel-provider";
import { configuredStackiStore } from './stacki-github-composition';
import { stackiLazyAssetsEnabled } from './stacki-github-config';
import { GitHubStackiStore } from './stacki-github-store';

export function stackiSessionsConfigured() {
  return process.env.GNR8_STACKI_DRAFTS_ENABLED === "1" &&
    process.env.GNR8_STACKI_SESSIONS_ENABLED === "1" &&
    Boolean(process.env.GNR8_STACKI_RUNTIME_SNAPSHOT) &&
    Boolean(process.env.GNR8_STACKI_PILOT_USER_ID);
}
export function createConfiguredStackiSessionRoutes() {
  function storage() {
    const client = getSupabaseServiceRoleClient();
    if (!client) throw new StackiDraftError(503, "STACKI_DRAFT_STORAGE_UNAVAILABLE");
    return { client, bucket: process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? "" };
  }
  return createStackiSessionRoutes({
    enabled: stackiSessionsConfigured,
    authorize: authorizeConfiguredStackiPilot,
    drafts: configuredStackiStore,
    history: async scope => {
      const store = await configuredStackiStore(scope);
      if (!(store instanceof GitHubStackiStore)) throw new StackiDraftError(404,'STACKI_GITHUB_NOT_CONFIGURED');
      return store.history();
    },
    sessions: () => { const { client, bucket } = storage(); return new StackiSessionStore(client, bucket); },
    prepare: createConfiguredStackiDraftRoutes().PREPARE,
    loadPrepared: async scope => {
      const store = await configuredStackiStore(scope);
      if (!(store instanceof GitHubStackiStore)) return null;
      const startedAt = Date.now();
      console.info('gnr8-stacki-github-read-start');
      const fast = stackiLazyAssetsEnabled() ? await store.preparedForOpen() : null;
      const prepared = fast ?? await store.prepared();
      console.info('gnr8-stacki-github-read-complete', { elapsedMs: Date.now() - startedAt,
        files: prepared?.record.files.length ?? 0, assets: prepared?.assets.length ?? 0 });
      return prepared ? { draft: prepared.record, retainedAssets: prepared.assets,
        ...(fast ? {delivery:fast.delivery} : {}) } : null;
    },
    retainedAssets: async scope => {
      const store = await configuredStackiStore(scope);
      if (store instanceof GitHubStackiStore) {
        return store.retainedAssets();
      }
      const {client,bucket}=storage();
      return new StackiAssetPreparation(client,bucket).readAll(await planStackiRuntimeAssets(scope,client,requirePublicOutputVersion));
    },
    prepareAssets: async (scope,index,identity,confirm) => {
      const store = await configuredStackiStore(scope);
      if (store instanceof GitHubStackiStore) {
        if (await store.isInitialized()) {
          if (stackiLazyAssetsEnabled()) {
            try { await store.preparedForOpen(); }
            catch (error) {
              if (!(error instanceof StackiDraftError) || error.code !== 'STACKI_GITHUB_DELIVERY_UNAVAILABLE') throw error;
              await store.prepareDelivery(confirm);
            }
          }
          await confirm();
          return {identity:'0'.repeat(64),completed:0,total:0,ready:true};
        }
      }
      const {client,bucket}=storage();
      const plan=await planStackiRuntimeAssets(scope,client,requirePublicOutputVersion);
      if((index>0 || identity!==null) && identity!==plan.identity)throw new StackiDraftError(409,'STACKI_ASSET_PLAN_CHANGED');
      return new StackiAssetPreparation(client,bucket).step(plan,index,confirm);
    },
    provider: () => new VercelStackiProvider(process.env.GNR8_STACKI_RUNTIME_SNAPSHOT ?? ""),
  });
}
