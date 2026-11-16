import 'server-only';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { requireAgencyActionContext, parseAgencyActionContextError } from '@/app/api/gnr8/agency/_lib/agency-action-access';
import { SupabaseAstroCandidateOwnershipResolver } from '../output-adapters/astro-production-candidate-ownership-resolver';
import { createVerifiedRetainedAssetReader } from '../output-adapters/verified-retained-asset';
import { getEvidenceCaptureBaselineArtifactFromImportProvenanceSummary } from '../site/evidence-capture-baseline-read-model';
import { requireSameOriginJson, readBoundedJson } from '../stacki/stacki-draft-route-handlers';
import { applySavedBrand, parseBrandDecisions, type BrandSaved } from './brand-guide';
import { extractBrandGuide } from './brand-guide-extraction';
import type { RuntimeImportProvenanceSummary } from '../runtime/types';
import {getSiteVersion,isGitBackedImportMarker} from '../runtime/runtime-store';

type Context={params:Promise<{clientId:string;siteId:string}>};
const headers={'cache-control':'private, no-store'};
export const brandDependencies = {
  authorize: requireAgencyActionContext,
  resolve: (siteVersionId:string)=>new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId}),
  client: getSupabaseServiceRoleClient,
  extract: extractBrandGuide,
  reader: createVerifiedRetainedAssetReader,
};
export function createBrandGuideRoutes(deps=brandDependencies){
  async function run(request:Request, context:Context){
    try{
      const url=new URL(request.url),scope=await context.params;
      const actor=await deps.authorize({action:request.method==='GET'?'view_dashboard':'edit_client_settings',requestedAgencyId:url.searchParams.get('agencyId')});
      const siteVersionId=url.searchParams.get('siteVersionId')??'';
      const owner=await deps.resolve(siteVersionId);
      if(owner.agencyId!==actor.agencyId||owner.organizationId!==scope.clientId||owner.ownershipSiteId!==scope.siteId)throw Error('404|Stran ni najdena.');
      const db=deps.client();if(!db)throw Error('503|Shramba ni na voljo.');
      const version=await db.from('gnr8_runtime_site_versions').select('import_provenance_summary,updated_at').eq('id',siteVersionId).eq('site_id',owner.runtimeSiteId).single();
      if(version.error)throw Error('503|Branje različice ni uspelo.');
      const stored=version.data.import_provenance_summary as Record<string,unknown>|null;
      const gitBacked=isGitBackedImportMarker(stored);
      const hydrated=gitBacked?await getSiteVersion(siteVersionId):null;
      if(gitBacked&&(!hydrated||hydrated.siteId!==owner.runtimeSiteId))throw Error('503|Izvora ni mogoče prebrati.');
      const previous=(hydrated?.importProvenanceSummary??stored) as Record<string,unknown>|null;
      const result=await db.from('gnr8_runtime_raw_template_artifacts').select('id,entry_html_path,file_map').eq('site_version_id',siteVersionId).eq('site_id',owner.runtimeSiteId).single();
      if(result.error||!result.data)throw Error('404|Shranjeni vhod ni na voljo.');
      const artifact=result.data;
      const baseline=getEvidenceCaptureBaselineArtifactFromImportProvenanceSummary(previous as RuntimeImportProvenanceSummary|null);
      const read=deps.reader(db);
      const guide=applySavedBrand(await deps.extract({siteId:owner.runtimeSiteId,siteVersionId,artifactId:artifact.id,entryHtmlPath:artifact.entry_html_path,fileMap:artifact.file_map,
        computedStylePath:baseline?.persistedRefs.computedStyleRef?.uri??null,
        read:path=>read({siteId:owner.runtimeSiteId,siteVersionId,path}),
      }),previous?.brandStyleGuide);
      guide.logoOptions=guide.observations.filter(o=>o.kind==='element'&&artifact.file_map[o.value]).map(o=>({path:o.value,previewUrl:`/api/gnr8/runtime/preview-assets/${encodeURIComponent(owner.runtimeSiteId)}/${encodeURIComponent(siteVersionId)}/${o.value.split('/').map(encodeURIComponent).join('/')}`}));
      guide.fontFaces=guide.fontFaces?.map(face=>({...face,previewUrl:`/api/gnr8/runtime/preview-assets/${encodeURIComponent(owner.runtimeSiteId)}/${encodeURIComponent(siteVersionId)}/${face.path.split('/').map(encodeURIComponent).join('/')}`}));
      if(request.method==='GET')return Response.json({guide},{headers});
      requireSameOriginJson(request);
      const body=await readBoundedJson(request) as Record<string,unknown>;
      if(!body||Object.keys(body).some(k=>!['revision','artifactId','decisions'].includes(k)))throw Error('422|Neveljavna zahteva.');
      if(body.revision!==guide.revision||body.artifactId!==artifact.id)throw Error('409|Vodič je bil spremenjen. Ponovno ga odprite pred shranjevanjem.');
      const decisions=parseBrandDecisions(body.decisions);
      if(decisions.logo?.value && !artifact.file_map[decisions.logo.value])throw Error('422|Izberite pot logotipa iz shranjenega vhoda.');
      const saved:BrandSaved={kind:guide.kind,siteVersionId,artifactId:artifact.id,decisions,revision:guide.revision+1,savedAt:new Date().toISOString(),savedBy:actor.userId};
      if(typeof version.data.updated_at!=='string'||!Number.isFinite(Date.parse(version.data.updated_at)))throw Error('503|Različice ni mogoče varno shraniti.');
      const updatedAt=new Date(Math.max(Date.now(),Date.parse(version.data.updated_at)+1)).toISOString();
      // Existing provenance JSON boundary; preserve every capture field. CAS prevents lost concurrent updates.
      const persistedProvenance=gitBacked?{...stored,brandStyleGuide:saved}:{...previous,brandStyleGuide:saved};
      const write=db.from('gnr8_runtime_site_versions').update({import_provenance_summary:persistedProvenance,updated_at:updatedAt}).eq('id',siteVersionId).eq('site_id',owner.runtimeSiteId).eq('updated_at',version.data.updated_at);
      const updated=await write.select('id');
      if(updated.error)throw Error('503|Shranjevanje ni uspelo.');
      if(updated.data?.length!==1)throw Error('409|Vhod se je med urejanjem spremenil. Ponovno odprite vodič.');
      return Response.json({guide:applySavedBrand(guide,saved)},{headers});
    }catch(error){
      const mapped=parseAgencyActionContextError(error);
      const status=(error as {status?:number})?.status??mapped.status;
      return Response.json({error:status>=500?'Vodiča trenutno ni mogoče prebrati ali shraniti. Poskusite znova.':mapped.message},{status,headers});
    }
  }
  return {GET:run,POST:run};
}
