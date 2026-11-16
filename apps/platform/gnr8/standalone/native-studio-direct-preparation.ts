import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { requireAgencyBackgroundActor } from '../../src/auth/agency-background-action';
import { SupabaseAstroCandidateOwnershipResolver } from '../output-adapters/astro-production-candidate-ownership-resolver';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '../output-adapters/astro-candidate-runtime-artifact-store';
import { SupabaseStackiDraftStore } from '../stacki/stacki-draft-store';
import { resolvedGitHubStackiStore } from '../stacki/stacki-github-config';
import { loadStackiSource, planStackiRuntimeAssets } from '../stacki/stacki-source-loader';
import { exportStandaloneProject } from './standalone-export';
import { requireCompatibleStandaloneToolchain } from './publication-foundation';
import { fingerprint, parsePublicationSelection, publicationSelectionForArtifact, type PublicationSelection } from './publication-contract';
import { requireCurrentConfirmedSelection } from './current-confirmed-import';
import { SupabasePublicationStore } from './publication-store';
import { configuredNativeStudioSite } from './native-studio-preparation';
import { persistVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';

type Scope={agencyId:string;clientId:string;siteId:string};
type Request={scope:Scope;input:PublicationSelection;actor:string;requestId?:string};
const defaults={
 client:getSupabaseServiceRoleClient,actor:requireAgencyBackgroundActor,site:configuredNativeStudioSite,
 ownership:async(siteVersionId:string)=>new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId}),
 artifactVersion:async(client:SupabaseClient,id:string)=>{
  const rows=await client.from('gnr8_runtime_artifacts').select('site_version_id').eq('id',id).limit(2);
  if(rows.error||rows.data?.length!==1)throw Error('native_studio_source_stale');
  return rows.data[0]!.site_version_id as string;
 },
 source:async(client:SupabaseClient,id:string)=>new SupabaseAstroCandidateRuntimeArtifactStore(client).readSourceContext(id),
 confirm:requireCurrentConfirmedSelection,loadSource:loadStackiSource,planAssets:planStackiRuntimeAssets,
 revision:async(client:SupabaseClient,bucket:string,scope:PublicationSelection['selection']['scope'],revision:number)=>
  (await resolvedGitHubStackiStore(scope)??new SupabaseStackiDraftStore(client,bucket)).revision(scope,revision),
 export:exportStandaloneProject,persist:persistVerifiedAstroStudio,
 record:async(store:SupabasePublicationStore,key:string,value:unknown)=>store.put(key,value),
 store:(client:SupabaseClient,scope:Scope)=>new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope),
};

/** Prepare and store source bytes only. No Git push, Cloudflare deployment or
 * generated-code execution takes place here. */
export async function runDirectNativeStudioPreparation(request:Request,deps=defaults){
 const {scope,actor}=request??{} as Request;
 if(!scope||![scope.agencyId,scope.clientId,scope.siteId,actor].every(v=>/^[a-f0-9-]{36}$/.test(v)))
  throw Error('native_studio_request_invalid');
 const input=parsePublicationSelection(request.input);
 const selected=input.selection.scope;
 if(selected.agencyId!==scope.agencyId||selected.clientId!==scope.clientId||selected.siteId!==scope.siteId)
  throw Error('native_studio_selection_mismatch');
 const client=deps.client();if(!client)throw Error('native_studio_store_unavailable');
 await deps.actor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});
 const site=deps.site(scope.siteId);
 const authorize=async(id:string)=>{
  const owner=await deps.ownership(id);
  if(owner.agencyId!==scope.agencyId||owner.organizationId!==scope.clientId||owner.ownershipSiteId!==scope.siteId)
   throw Error('native_studio_ownership_mismatch');
  return owner;
 };
 const artifactVersionId=await deps.artifactVersion(client,input.artifactId);
 await authorize(artifactVersionId);await authorize(selected.siteVersionId);
 const current=await deps.confirm(client,input);
 if(current.artifactVersionId!==artifactVersionId)throw Error('native_studio_source_stale');
 await authorize(current.captureVersionId);
 const context=await deps.source(client,artifactVersionId);
 if(!context||context.artifact.id!==input.artifactId||context.artifact.bundleSha256!==input.artifactSha256||
    fingerprint(publicationSelectionForArtifact({...selected,siteVersionId:artifactVersionId},context.artifact))!==fingerprint(input))
  throw Error('native_studio_source_stale');
 const workspace=context.artifact.manifest.generatedOutputSourceWorkspace as Record<string,unknown>|undefined;
 if(!workspace||!Array.isArray(workspace.assetEvidence))throw Error('native_studio_source_stale');
 const lineage=workspace.stackiRevision as {sourceArtifactId?:string;sourceArtifactSha256?:string}|undefined;
 const source=await deps.source(client,selected.siteVersionId);
 if(!source||(lineage&&(source.artifact.id!==lineage.sourceArtifactId||
   source.artifact.bundleSha256!==lineage.sourceArtifactSha256)))throw Error('native_studio_source_stale');
 const bucket=process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes';
 const authorizedVersion=async(_scope:unknown,id:string)=>authorize(id);
 const checkpoint=input.selection.revision!==undefined
  ?await deps.revision(client,bucket,selected,input.selection.revision):null;
 const baseline=await deps.loadSource(selected,client,authorizedVersion);
 const plan=await deps.planAssets(selected,client,authorizedVersion);
 const retained:Awaited<ReturnType<typeof plan.read>>=[];
 for(let offset=0;offset<plan.entries.length;offset+=16)
  retained.push(...await plan.read(plan.entries.slice(offset,offset+16)));
 const evidence=new Map((workspace.assetEvidence as Array<{path:string;mediaType:string}>).map(asset=>[asset.path,asset]));
 const common={baseline,sourceArtifact:{id:input.artifactId,sha256:input.artifactSha256},
  assets:plan.entries.map(entry=>{
   const asset=retained.find(value=>value.name===entry.name),media=evidence.get(entry.path);
   if(!asset||!media)throw Error('native_studio_asset_missing');
   return {path:entry.path,body:asset.body,mediaType:media.mediaType,sourceSha256:entry.sha256};
  })};
 const exported=await deps.export(input.selection.revision!==undefined?{
  ...common,checkpoint:checkpoint!,scope:selected,selection:input.selection,
  expectedRevision:input.selection.revision,expectedSha256:input.selection.sha256,
  sourcePaths:(source.artifact.manifest.generatedOutputSourceWorkspace as {files:Array<{path:string}>}).files.map(file=>file.path),
  ownedImagePaths:(workspace.assetEvidence as Array<{path:string;mediaType:string}>)
   .filter(asset=>asset.mediaType.startsWith('image/')).map(asset=>asset.path),
 }:{...common,selection:input.selection});
 if(exported.contactRequired||fingerprint([...exported.manifest.routes].sort())!==fingerprint([...current.routes].sort()))
  throw Error('native_studio_export_unverified');
 const sourceFiles=(checkpoint?.files??baseline).filter(file=>!file.path.startsWith('.studio-state/'))
  .map(file=>({path:file.path,body:Buffer.from(file.base64,'base64')}));
 requireCompatibleStandaloneToolchain(sourceFiles,exported.files);
 // A long asset read or export may outlive an acceptance change.
 const fresh=await deps.confirm(client,input);
 if(fresh.confirmationSha256!==current.confirmationSha256||
    fresh.artifactVersionId!==artifactVersionId)throw Error('native_studio_confirmation_stale');
 const requestId=fingerprint({input,confirmationSha256:current.confirmationSha256});
 if(request.requestId!==undefined&&request.requestId!==requestId)throw Error('native_studio_request_stale');
 await authorize(artifactVersionId);
 await deps.actor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});
 const store=deps.store(client,scope);
 const result=await deps.persist({store,exported,selection:input.selection,
  confirmationSha256:current.confirmationSha256,site,releaseFile:undefined});
 const summary={requestId,sourceId:result.receipt.identitySha256,sourceManifestSha256:result.receipt.sourceManifestSha256,
  studioVersion:result.receipt.version,files:result.receipt.files.length,hosted:false};
 await deps.record(store,`native-requests/${requestId}-result.json`,summary);
 return {...summary,reused:result.reused};
}
