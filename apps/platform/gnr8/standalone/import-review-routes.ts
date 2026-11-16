import 'server-only';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { parseAgencyActionContextError } from '@/app/api/gnr8/agency/_lib/agency-action-access';
import { requirePublicOutputVersion } from '../output-adapters/public-output-access';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '../output-adapters/astro-candidate-runtime-artifact-store';
import { validateGeneratedOutputBuildEvidence, validateGeneratedOutputContentManifest } from '../output-adapters/generated-output-eligibility';
import { requireSameOriginJson, readBoundedJson } from '../stacki/stacki-draft-route-handlers';
import { fingerprint, publicationSelectionForArtifact } from './publication-contract';
import { confirmSelectedImport, importReviewModel, saveImportReview } from './import-review';
import { readSelectedImportClosure } from './read-selected-import-closure';
import {getSiteVersion,isGitBackedImportMarker} from '../runtime/runtime-store';
import { configuredNativeStudioSite } from './native-studio-preparation';

type Context={params:Promise<{clientId:string;siteId:string}>};
const headers={'cache-control':'private, no-store','referrer-policy':'no-referrer'};
export const importReviewDependencies={
 authorize:requirePublicOutputVersion,client:getSupabaseServiceRoleClient,
 readSelectedClosure:async(input:Parameters<typeof readSelectedImportClosure>[0])=>{
  try{return await readSelectedImportClosure(input);}catch{return null;}
 },
 readSource:async(id:string)=>{
  const db=getSupabaseServiceRoleClient();if(!db)throw Error('503|Shramba ni na voljo.');
  return new SupabaseAstroCandidateRuntimeArtifactStore(db).readSourceContext(id);
 },
};
export function createImportReviewRoutes(deps=importReviewDependencies){
 async function run(request:Request,context:Context){
  try {
   const url=new URL(request.url),scope={...await context.params,agencyId:url.searchParams.get('agencyId')??''};
   if(request.method==='POST')requireSameOriginJson(request);
   const body=(request.method==='POST'?await readBoundedJson(request):Object.fromEntries(url.searchParams)) as Record<string,unknown>;
   if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!(request.method==='POST'?
    ['siteVersionId','artifactId','artifactBundleSha256','token','routes','brandConfirmed','action','scopeConfirmed','functionsConfirmed']:['agencyId','siteVersionId','artifactId','artifactBundleSha256']).includes(k)))throw Error('422|Neveljavna zahteva.');
   if(['siteVersionId','artifactId','artifactBundleSha256'].some(k=>typeof body[k]!=='string'))throw Error('422|Izberite shranjeno različico.');
   const siteVersionId=body.siteVersionId as string,actor=await deps.authorize(scope,siteVersionId);
   const source=await deps.readSource(siteVersionId);
   if(!source||source.artifact.id!==body.artifactId||source.artifact.bundleSha256!==body.artifactBundleSha256)throw Error('409|Izbrani izvor se je spremenil.');
   const selection=publicationSelectionForArtifact({...scope,siteVersionId},source.artifact);
   const lineage=selection.selection.scope;
   if(lineage.agencyId!==scope.agencyId||lineage.clientId!==scope.clientId||lineage.siteId!==scope.siteId)throw Error('404|Stran ni najdena.');
   await deps.authorize(scope,lineage.siteVersionId);
   const manifest=source.artifact.manifest;
   const build=validateGeneratedOutputBuildEvidence(manifest.generatedOutputBuildEvidence);
   const content=validateGeneratedOutputContentManifest(manifest.generatedOutputContentManifest);
   if(!build||!content||content.sourceRef!==build.contentManifestSourceRef||fingerprint([...build.outputPaths].sort())!==fingerprint([...content.scope.outputPaths].sort()))throw Error('409|Dokazi izvora niso na voljo.');
   const capture=build.sourceCapture;
   await deps.authorize(scope,capture.siteVersionId);
   const db=deps.client();if(!db)throw Error('503|Shramba ni na voljo.');
   const version=await db.from('gnr8_runtime_site_versions').select('import_provenance_summary,updated_at').eq('id',capture.siteVersionId).eq('site_id',capture.runtimeSiteId).single();
   const raw=await db.from('gnr8_runtime_raw_template_artifacts').select('id,file_map,entry_html_path').eq('site_version_id',capture.siteVersionId).eq('site_id',capture.runtimeSiteId).single();
   if(version.error||raw.error||!version.data||!raw.data)throw Error('503|Zajema ni mogoče prebrati.');
   const stored=version.data.import_provenance_summary as Record<string,unknown>|null;
   const gitBacked=isGitBackedImportMarker(stored);
   const hydrated=gitBacked?await getSiteVersion(capture.siteVersionId):null;
   if(gitBacked&&(!hydrated||hydrated.siteId!==capture.runtimeSiteId))throw Error('503|Izvora ni mogoče prebrati.');
   const previous=(hydrated?.importProvenanceSummary??stored) as Record<string,unknown>|null;
   if(typeof version.data.updated_at!=='string'||!Number.isFinite(Date.parse(version.data.updated_at)))throw Error('503|Različice ni mogoče varno shraniti.');
   // Mutable acceptance records must not change the evidence they accept.
   const captureEvidence=Object.fromEntries(Object.entries(previous??{}).filter(([k])=>!['importReview','confirmedImport','brandStyleGuide'].includes(k)));
   const closure=await deps.readSelectedClosure({client:db,siteVersionId,artifactId:source.artifact.id,
    artifactSha256:source.artifact.bundleSha256,captureVersionId:capture.siteVersionId,captureArtifactId:raw.data.id,
    runtimeSiteId:capture.runtimeSiteId,raw:raw.data,
    provenance:previous as Parameters<typeof readSelectedImportClosure>[0]['provenance'],selectedRoutes:content.scope.outputPaths});
   let nativeStudioAvailable=false;
   try{configuredNativeStudioSite(scope.siteId);nativeStudioAvailable=true;}
   catch{nativeStudioAvailable=false;}
   const input={selection,paths:content.scope.outputPaths,unsupported:content.scope.unsupportedCapabilities,captureVersionId:capture.siteVersionId,captureArtifactId:raw.data.id,
    provenance:previous,updatedAt:version.data.updated_at,evidence:{build,content,raw:raw.data,captureEvidence,closure},closure,nativeStudioAvailable};
   const model=importReviewModel(input);
   if(request.method==='GET')return Response.json({ok:true,data:model},{headers});
   if(body.action==='confirm'){
    if(Object.keys(body).some(k=>!['siteVersionId','artifactId','artifactBundleSha256','token','action','scopeConfirmed','functionsConfirmed'].includes(k)))throw Error('422|Neveljavna zahteva.');
    const certificate=confirmSelectedImport(model,body,actor.userId,new Date().toISOString());
    const updatedAt=new Date(Math.max(Date.now(),Date.parse(version.data.updated_at)+1)).toISOString();
    const provenance={...previous,confirmedImport:certificate};
    await deps.authorize(scope,capture.siteVersionId);
    const persistedProvenance=gitBacked?{...stored,confirmedImport:certificate}:provenance;
    const result=await db.from('gnr8_runtime_site_versions').update({import_provenance_summary:persistedProvenance,updated_at:updatedAt})
     .eq('id',capture.siteVersionId).eq('site_id',capture.runtimeSiteId).eq('updated_at',version.data.updated_at).select('id');
    if(result.error)throw Error('503|Potrditve ni mogoče shraniti.');
    if(result.data?.length!==1)throw Error('409|Vhod se je med potrjevanjem spremenil. Osvežite pregled.');
    return Response.json({ok:true,data:importReviewModel({...input,provenance,updatedAt})},{headers});
   }
   if(body.action!==undefined)throw Error('422|Neveljavna zahteva.');
   const saved=saveImportReview(model,body,actor.userId,new Date().toISOString());
   const updatedAt=new Date(Math.max(Date.now(),Date.parse(version.data.updated_at)+1)).toISOString();
   const provenance={...previous,importReview:saved};
   // A changed/withdrawn user review invalidates any older complete certificate.
   delete (provenance as Record<string,unknown>).confirmedImport;
   await deps.authorize(scope,capture.siteVersionId);
   const persistedProvenance=gitBacked?{...stored,importReview:saved,confirmedImport:null}:provenance;
   const result=await db.from('gnr8_runtime_site_versions').update({import_provenance_summary:persistedProvenance,updated_at:updatedAt})
    .eq('id',capture.siteVersionId).eq('site_id',capture.runtimeSiteId).eq('updated_at',version.data.updated_at).select('id');
   if(result.error)throw Error('503|Shranjevanje ni uspelo.');
   if(result.data?.length!==1)throw Error('409|Vhod se je med pregledom spremenil. Osvežite pregled.');
   return Response.json({ok:true,data:importReviewModel({...input,provenance,updatedAt})},{headers});
  } catch(error){
   const message=error instanceof Error?error.message:'';
   const mapped=parseAgencyActionContextError(error);
   const status=(error as {status?:number})?.status??mapped.status;
   return Response.json({ok:false,error:message.startsWith('STACKI_')?'Zahteva mora priti iz iste aplikacije in vsebovati veljaven JSON.':status>=500?'Pregleda trenutno ni mogoče prebrati ali shraniti.':mapped.message},{status,headers});
  }
 }
 return {GET:run,POST:run};
}
