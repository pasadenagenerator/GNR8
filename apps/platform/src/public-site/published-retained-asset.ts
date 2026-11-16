import 'server-only';
import { readPublicPreparation } from '@/gnr8/output-adapters/astro-public-preparation-contract';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { SupabaseAstroCandidateOwnershipResolver } from '@/gnr8/output-adapters/astro-production-candidate-ownership-resolver';
import { readVerifiedRetainedAsset } from '@/app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/protected-preview-asset';

/** An active, explicitly prepared public artifact is the authority for source-file reads. */
export async function readPublishedRetainedAsset(input: { host: string; siteId: string; siteVersionId: string; path: string }, deps = {
  client: getSupabaseServiceRoleClient,
  ownership: (siteVersionId: string, expectedRuntimeSiteId: string) => new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId, expectedRuntimeSiteId}),
  readAsset: readVerifiedRetainedAsset,
}): Promise<Response | null> {
  const client = deps.client();
  if (!client || process.env.VERCEL_ENV === 'preview') return null;
  const denied = () => new Response('Asset unavailable.', {status:403,headers:{'cache-control':'no-store'}});
  try {
    const host = input.host.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
    const binding = await client.from('gnr8_runtime_domain_host_bindings').select('site_id,site_version_id,status')
      .eq('domain',host).eq('status','active').maybeSingle();
    if (binding.error) return denied();
    if (!binding.data) return null;
    const pointer = await client.from('gnr8_runtime_active_pointers').select('active_site_version_id,active_artifact_id')
      .eq('site_id',binding.data.site_id).maybeSingle();
    if (pointer.error || !pointer.data) return null;
    const artifact = await client.from('gnr8_runtime_artifacts')
      .select('site_id,site_version_id,publish_stage,shadow_restricted,manifest,asset_fingerprint_map')
      .eq('id',pointer.data.active_artifact_id).maybeSingle();
    if (artifact.error) return denied();
    const a = artifact.data;
    if (!a?.manifest?.publicPreparation) return null; // Existing sites retain their existing resolution path.
    const preparation = readPublicPreparation(a.manifest);
    if (!preparation || preparation.host !== host ||
      a.site_id !== input.siteId || binding.data.site_id !== input.siteId ||
      a.site_version_id !== pointer.data.active_site_version_id || binding.data.site_version_id !== a.site_version_id ||
      a.publish_stage !== 'production' || a.shadow_restricted) return denied();
    const capture = a.manifest.generatedOutputBuildEvidence?.sourceCapture;
    if (capture?.runtimeSiteId !== input.siteId || capture?.siteVersionId !== input.siteVersionId) return denied();
    const prefix = `/api/gnr8/runtime/preview-assets/${input.siteId}/${input.siteVersionId}/`;
    const url = prefix + input.path;
    const required = a.manifest.generatedOutputContentManifest?.requiredAssets as Array<{path:string;sha256:string}> | undefined;
    const sha = required?.find(x=>x.path===url)?.sha256;
    if (!sha || a.asset_fingerprint_map[url] !== sha || !/\.(?:css|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot)$/i.test(input.path)) return denied();
    const [source,active] = await Promise.all([deps.ownership(input.siteVersionId,input.siteId),deps.ownership(a.site_version_id,input.siteId)]);
    if (source.ownershipSiteId !== active.ownershipSiteId || source.organizationId !== active.organizationId) return denied();
    return await deps.readAsset({...input,expectedSha256:sha,allowedPaths:required!.filter(x=>x.path.startsWith(prefix)).map(x=>x.path.slice(prefix.length))},client);
  } catch { return denied(); }
}
