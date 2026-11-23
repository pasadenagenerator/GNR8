import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '../output-adapters/astro-candidate-runtime-artifact-store';
import { SupabaseAstroCandidateOwnershipResolver } from '../output-adapters/astro-production-candidate-ownership-resolver';
import { SupabaseStackiDraftStore } from '../stacki/stacki-draft-store';
import { loadStackiSource, planStackiRuntimeAssets } from '../stacki/stacki-source-loader';
import { exportStandaloneProject } from './standalone-export';
import { fingerprint, publicationSelectionForArtifact, parsePublicationSelection, validateTarget, requireApprovedManifest, type PublicationTarget, type PublicationSelection, type Release } from './publication-contract';
import type { PublicationStore } from './publication-store';
import { prepareAstroStaticSiteSourceWorkspace } from '../output-adapters/astro-static-site-workspace-preparation';
import { runAstroBuildExportProof } from '../output-adapters/astro-static-site-build-export-proof';
import { StandalonePreparationError, type PreparationPhase } from './publication-errors';
import { requireCompatibleStandaloneToolchain, requireConfirmedImport, requireFoundationBuild } from './publication-foundation';
import { validateGeneratedOutputBuildEvidence, validateGeneratedOutputContentManifest } from '../output-adapters/generated-output-eligibility';
import { createAstroStaticSiteSourceSnapshot } from '../output-adapters/astro-static-site-workspace-preparation';
import {getSiteVersion,isGitBackedImportMarker} from '../runtime/runtime-store';
import { requireCurrentSelectedImportClosure } from './read-selected-import-closure';
import type { ConfirmedImport } from './publication-foundation';

/** Replace hosted I/O at the existing boundaries for retained-input replay.
 * Selection, ownership comparisons, export and release checks still run here. */
export interface PublicationPreparationDependencies {
 resolveOwnership: SupabaseAstroCandidateOwnershipResolver['resolve'];
 readArtifactVersion: (id:string)=>Promise<string>;
 readSourceContext: SupabaseAstroCandidateRuntimeArtifactStore['readSourceContext'];
 readRevision: SupabaseStackiDraftStore['revision'];
 loadSource: typeof loadStackiSource;
 planAssets: typeof planStackiRuntimeAssets;
 build: typeof runAstroBuildExportProof;
 confirmImport: (input:PublicationSelection,manifest:Record<string,unknown>)=>Promise<ReturnType<typeof requireConfirmedImport>>;
}

/** Worker-only, using exactly the same saved source selection, authoritative
 * source loader and verified asset planner as candidate preparation. */
export async function prepareStandaloneRelease(input:PublicationSelection,target:PublicationTarget,client:SupabaseClient,store:PublicationStore,bucket:string,dependencies:Partial<PublicationPreparationDependencies>={}){
 let phase:PreparationPhase='source';
 try {
 input=parsePublicationSelection(input);validateTarget(target);
 const scope=input.selection.scope;
 const ownership=new SupabaseAstroCandidateOwnershipResolver(()=>client as unknown as import("../output-adapters/astro-production-candidate-ownership-resolver").AstroCandidateOwnershipReadClient);
 const runtime=new SupabaseAstroCandidateRuntimeArtifactStore(client);
 const deps:PublicationPreparationDependencies={
  resolveOwnership:args=>ownership.resolve(args),
  readArtifactVersion:async id=>{
   const rows=await client.from('gnr8_runtime_artifacts').select('site_version_id').eq('id',id).limit(2);
   if(rows.error||rows.data?.length!==1)throw Error('standalone_artifact_missing');
   return rows.data[0]!.site_version_id;
  },
  readSourceContext:id=>runtime.readSourceContext(id),
  readRevision:(scope,revision)=>new SupabaseStackiDraftStore(client,bucket).revision(scope,revision),
  loadSource:loadStackiSource,planAssets:planStackiRuntimeAssets,build:runAstroBuildExportProof,
  confirmImport:async (selection,manifest)=>{
   const build=validateGeneratedOutputBuildEvidence(manifest.generatedOutputBuildEvidence);
   const content=validateGeneratedOutputContentManifest(manifest.generatedOutputContentManifest);
   if(!build||!content||content.sourceRef!==build.contentManifestSourceRef)throw Error('standalone_import_evidence_missing');
   await authorize(scope,build.sourceCapture.siteVersionId);
   const captureRow=await client.from('gnr8_runtime_site_versions').select('import_provenance_summary').eq('id',build.sourceCapture.siteVersionId).eq('site_id',build.sourceCapture.runtimeSiteId).single();
   const raw=await client.from('gnr8_runtime_raw_template_artifacts').select('id,file_map,entry_html_path').eq('site_version_id',build.sourceCapture.siteVersionId).eq('site_id',build.sourceCapture.runtimeSiteId).single();
   if(captureRow.error||raw.error||!raw.data)throw Error('standalone_import_evidence_missing');
   const stored=captureRow.data.import_provenance_summary;
   const source=isGitBackedImportMarker(stored)?await getSiteVersion(build.sourceCapture.siteVersionId):null;
   if(isGitBackedImportMarker(stored)&&(!source||source.siteId!==build.sourceCapture.runtimeSiteId))throw Error('standalone_import_evidence_missing');
   const provenance=source?.importProvenanceSummary??stored;
   const confirmation=requireConfirmedImport({selection,routes:content.scope.outputPaths,unsupportedCapabilities:content.scope.unsupportedCapabilities,
    captureVersionId:build.sourceCapture.siteVersionId,captureArtifactId:raw.data.id,provenance});
   await requireCurrentSelectedImportClosure({client,siteVersionId:version,
    artifactId:selection.artifactId,artifactSha256:selection.artifactSha256,
    captureVersionId:build.sourceCapture.siteVersionId,captureArtifactId:raw.data.id,
    runtimeSiteId:build.sourceCapture.runtimeSiteId,raw:raw.data,provenance,
    selectedRoutes:content.scope.outputPaths},(provenance as Record<string,unknown>).confirmedImport as ConfirmedImport);
   return confirmation;
  },
  ...dependencies,
 };
 const authorize=async(_scope:unknown,siteVersionId:string)=>{const o=await deps.resolveOwnership({siteVersionId});if(o.agencyId!==scope.agencyId||o.organizationId!==scope.clientId||o.ownershipSiteId!==scope.siteId)throw Error('standalone_ownership_mismatch');return o;};
 // A selected published/candidate artifact carries the authoritative Stacki
 // lineage. Do not use the latest saved head or stale canonical models.
 const version=await deps.readArtifactVersion(input.artifactId);await authorize(scope,version);
 const context=await deps.readSourceContext(version);
 if(context?.artifact.id!==input.artifactId||context.artifact.bundleSha256!==input.artifactSha256)throw Error('standalone_artifact_stale');
 const workspace=context.artifact.manifest.generatedOutputSourceWorkspace as any;
 const lineage=workspace?.stackiRevision;
 const stored=publicationSelectionForArtifact({...scope,siteVersionId:version},context.artifact);
 if(fingerprint(stored)!==fingerprint(input))throw Error('standalone_selection_stale');
 await authorize(scope,scope.siteVersionId);
 const source=await deps.readSourceContext(scope.siteVersionId);
 if(!source||(lineage&&(source.artifact.id!==lineage.sourceArtifactId||source.artifact.bundleSha256!==lineage.sourceArtifactSha256)))throw Error('standalone_source_stale');
 const confirmation=await deps.confirmImport(input,context.artifact.manifest);
 const reductions=workspace.acceptedFunctionalReductions;
 const contact=target.contactPolicy!==undefined?target.contactPolicy:reductions?.contact;
 if(contact&&contact.recipientConfirmed!==true&&contact.confirmed!==true)throw Error('standalone_contact_unconfirmed');
 phase='checkpoint';const checkpoint=input.selection.revision!==undefined?await deps.readRevision(scope,input.selection.revision):null;
 phase='baseline';const baseline=await deps.loadSource(scope,client,authorize);
 phase='asset_plan';const plan=await deps.planAssets(scope,client,authorize);
 phase='assets';
 let firstAssetFailure:import('../output-adapters/verified-retained-asset').RetainedAssetReadFailure|undefined;
 const retained:Awaited<ReturnType<typeof plan.read>>=[];
 try {
  // Match the bounded selections used by the retained Pasadena read. Keep
  // one selection in flight, rather than queueing the whole export at once.
  // This bounds preparation load; it does not retry a failed database read.
  for(let offset=0;offset<plan.entries.length;offset+=16){
   retained.push(...await plan.read(plan.entries.slice(offset,offset+16),failure=>{
    if(!firstAssetFailure){firstAssetFailure=failure;console.error('[standalone.asset-read]',failure);}
   }));
  }
 }catch(error){
  if(firstAssetFailure)throw new Error(`standalone_retained_${firstAssetFailure.reason}${firstAssetFailure.providerCode?'_'+firstAssetFailure.providerCode.toLowerCase():''}`,{cause:error});
  throw error;
 }
 phase='export';
 const evidence=new Map<string,{mediaType:string}>((workspace.assetEvidence as any[]).map(a=>[a.path,a]));
 const common={baseline,sourceArtifact:{id:input.artifactId,sha256:input.artifactSha256},...(contact?{contact:{recipient:contact.recipient,confirmed:true as const,...(target.contactPolicy?{policy:target.contactPolicy}:{})}}:{}),assets:plan.entries.map(e=>{const asset=retained.find(a=>a.name===e.name);const media=evidence.get(e.path);if(!asset||!media)throw Error('standalone_asset_missing');return {path:e.path,body:asset.body,mediaType:media.mediaType,sourceSha256:e.sha256};})};
 const generated=await exportStandaloneProject(input.selection.revision!==undefined?{
 ...common,checkpoint:checkpoint!,scope,selection:input.selection,expectedRevision:input.selection.revision,expectedSha256:input.selection.sha256,sourcePaths:(source.artifact.manifest.generatedOutputSourceWorkspace as any).files.map((f:any)=>f.path),ownedImagePaths:(workspace.assetEvidence as any[]).filter(a=>a.mediaType.startsWith('image/')).map(a=>a.path),
 }:{...common,selection:input.selection});
 const stackiFiles=(checkpoint?.files??baseline).filter(f=>!f.path.startsWith('.studio-state/')).map(f=>({path:f.path,body:Buffer.from(f.base64,'base64')}));
 requireCompatibleStandaloneToolchain(stackiFiles,generated.files);
 const exportedPackage=JSON.parse(generated.files.find(f=>f.path==='package.json')!.body.toString());
 const nodeVersion:'22.x'|'26.x'=exportedPackage.dependencies?.astro==='7.4.7'&&exportedPackage.engines?.node==='26.x'?'26.x':(()=>{throw Error('standalone_toolchain_unverified');})();
 requireApprovedManifest(target,generated.manifestSha256);
 const id=fingerprint({input,target,manifestSha256:generated.manifestSha256,confirmation});
 const release:Release={id,input,target,manifestSha256:generated.manifestSha256,routes:generated.manifest.routes,contactRequired:generated.contactRequired,foundation:{...confirmation,stackiSourceSha256:createAstroStaticSiteSourceSnapshot(stackiFiles).aggregateSha256,assetPlanSha256:plan.identity,transformIdentity:generated.manifest.transformIdentity,nodeVersion},files:[...generated.manifest.files,{path:'source-manifest.json',sha256:generated.manifestSha256,bytes:generated.files.find(f=>f.path==='source-manifest.json')!.body.length}]};
 if(release.files.length>target.maxFiles||release.files.reduce((n,f)=>n+f.bytes,0)>target.maxBytes)throw Error('standalone_approved_budget_exceeded');
 const budgetKey=`authorizations/${target.authorizationId}.json`;
 phase='reservation';
 await store.claim(budgetKey,{releaseId:id});
 if((await store.read<{releaseId:string}>(budgetKey))?.releaseId!==id)throw Error('standalone_approved_operation_budget_exceeded');
 const existing=await store.read<Release>(`releases/${id}/release.json`);
 if(existing)return existing;
 const css=generated.files.find(f=>f.path==='src/pages/index.astro')!.body.toString();
 const expectedStylesheetReferences=[...css.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map(m=>m[1]!);
 phase='build';
 const proof=await deps.build({packageManager:'npm',commandEnvironment:{PATH:process.env.PATH,NODE_ENV:'production'},installTimeoutMs:180000,buildTimeoutMs:240000,verification:{expectedContent:[],expectedThemeToken:null,expectedStylesheetReferences},dependencies:{prepareWorkspace:async({workspaceRoot})=>prepareAstroStaticSiteSourceWorkspace({files:generated.files,workspaceRoot})}});
 const verifiedBuild=requireFoundationBuild(generated.files,release.routes,proof);
 // Confirmation may have changed during a long build. Never store readiness
 // for a withdrawn review, or silently substitute the latest draft head.
 if(fingerprint(await deps.confirmImport(input,context.artifact.manifest))!==fingerprint(confirmation))throw Error('standalone_import_confirmation_stale');
 phase='storage';
 await authorize(scope,version);
 for(const file of generated.files)await store.putBytes(release.files.find(f=>f.path===file.path)!.sha256,file.body);
 await store.put(`releases/${id}/build.json`,{...verifiedBuild,foundation:release.foundation,sourceUnchanged:proof.sourceComparison.unchanged,files:proof.export.fileCount});
 await store.put(`releases/${id}/release.json`,release);
 return release;
 } catch(error) { throw new StandalonePreparationError(phase,error); }
}
