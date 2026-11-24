import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '../output-adapters/astro-candidate-runtime-artifact-store';
import { validateGeneratedOutputBuildEvidence, validateGeneratedOutputContentManifest } from '../output-adapters/generated-output-eligibility';
import { getSiteVersion, isGitBackedImportMarker } from '../runtime/runtime-store';
import { fingerprint, publicationSelectionForArtifact, type PublicationSelection, type Release, type StoredSourceSelection } from './publication-contract';
import { requireConfirmedImport } from './publication-foundation';
import { requireCurrentSelectedImportClosure } from './read-selected-import-closure';
import { readGeneratedOutputReviewModel, readLatestReview, type GeneratedOutputReviewModel } from '../output-adapters/generated-output-publication-composition';
import type { GeneratedOutputReviewRecord } from '../output-adapters/generated-output-eligibility';

/** Revalidate the mutable acceptance, not merely the saved release certificate. */
export async function requireCurrentConfirmedSelection(client:SupabaseClient,input:PublicationSelection){
 const scope=input.selection.scope;
 const artifact=await client.from('gnr8_runtime_artifacts').select('site_version_id')
  .eq('id',input.artifactId).limit(2);
 if(artifact.error||artifact.data?.length!==1)throw Error('native_studio_source_stale');
 const artifactVersionId=artifact.data[0]!.site_version_id as string;
 const context=await new SupabaseAstroCandidateRuntimeArtifactStore(client).readSourceContext(artifactVersionId);
 if(!context||context.artifact.id!==input.artifactId||
    context.artifact.bundleSha256!==input.artifactSha256||
    fingerprint(publicationSelectionForArtifact({...scope,siteVersionId:artifactVersionId},context.artifact))!==fingerprint(input))
  throw Error('native_studio_source_stale');
 const manifest=context.artifact.manifest;
 const build=validateGeneratedOutputBuildEvidence(manifest.generatedOutputBuildEvidence);
 const content=validateGeneratedOutputContentManifest(manifest.generatedOutputContentManifest);
 if(!build||!content||content.sourceRef!==build.contentManifestSourceRef||
    fingerprint([...content.scope.outputPaths].sort())!==fingerprint([...build.outputPaths].sort()))
  throw Error('native_studio_source_stale');
 const capture=build.sourceCapture;
 const version=await client.from('gnr8_runtime_site_versions').select('import_provenance_summary')
  .eq('id',capture.siteVersionId).eq('site_id',capture.runtimeSiteId).single();
 const raw=await client.from('gnr8_runtime_raw_template_artifacts').select('id,file_map,entry_html_path')
  .eq('site_version_id',capture.siteVersionId).eq('site_id',capture.runtimeSiteId).single();
 if(version.error||raw.error||!raw.data)throw Error('native_studio_confirmation_unavailable');
 const stored=version.data.import_provenance_summary;
 const hydrated=isGitBackedImportMarker(stored)?await getSiteVersion(capture.siteVersionId):null;
 if(isGitBackedImportMarker(stored)&&(!hydrated||hydrated.siteId!==capture.runtimeSiteId))
  throw Error('native_studio_confirmation_unavailable');
 const current=requireConfirmedImport({selection:input,routes:content.scope.outputPaths,
  unsupportedCapabilities:content.scope.unsupportedCapabilities,captureVersionId:capture.siteVersionId,
  captureArtifactId:raw.data.id,provenance:hydrated?.importProvenanceSummary??stored});
 const provenance=hydrated?.importProvenanceSummary??stored;
 const saved=(provenance as Record<string,unknown>|null)?.confirmedImport as import('./publication-foundation').ConfirmedImport;
 try {
  await requireCurrentSelectedImportClosure({client,siteVersionId:artifactVersionId,
   artifactId:input.artifactId,artifactSha256:input.artifactSha256,
   captureVersionId:capture.siteVersionId,captureArtifactId:raw.data.id,
   runtimeSiteId:capture.runtimeSiteId,raw:raw.data,provenance,
   selectedRoutes:content.scope.outputPaths},saved);
 } catch { throw Error('native_studio_confirmation_stale'); }
 return {...current,artifactVersionId,captureVersionId:capture.siteVersionId,
  routes:content.scope.outputPaths,manifest};
}

/** A reviewed generated artifact may seed Studio without certifying that the
 * original site's capture was complete. The review is bound to the exact
 * artifact, candidate, manifest and technical evaluation. */
export function requireReviewedGeneratedStudioSource(input:PublicationSelection,
 model:GeneratedOutputReviewModel,review:GeneratedOutputReviewRecord|null){
 const scope=input.selection.scope;
 if(!isGeneratedSource(input)||scope.siteVersionId!==model.siteVersionId||
  model.artifactId!==input.artifactId||model.artifactBundleSha256!==input.artifactSha256||
  model.decision.technical.status!=='PASS'||model.decision.review.status!=='APPROVED'||
  !review||review.decision!=='APPROVED'||review.artifactId!==model.artifactId||
  review.artifactBundleSha256!==model.artifactBundleSha256||review.candidateId!==model.candidateId||
  review.candidateContentSha256!==model.candidateContentSha256||
  review.contentManifestSha256!==model.contentManifestSha256||
  review.technicalEvaluationSha256!==model.decision.technical.evidenceSha256||
  !model.outputPaths.length||new Set(model.outputPaths).size!==model.outputPaths.length)
  throw Error('native_studio_confirmation_stale');
 return {confirmationSha256:review.reviewSha256,artifactVersionId:model.siteVersionId,
  captureVersionId:model.sourceCapture.siteVersionId,routes:model.outputPaths};
}

/** Studio source preparation accepts either the existing complete-import
 * certificate or an exact generated-output approval. Public release of an
 * imported source keeps the stricter complete-import contract above. */
export async function requireCurrentStudioSourceSelection(client:SupabaseClient,input:PublicationSelection,deps={
 source:(db:SupabaseClient,id:string)=>new SupabaseAstroCandidateRuntimeArtifactStore(db).readSourceContext(id),
 model:readGeneratedOutputReviewModel,
 review:readLatestReview,
}){
 if(!isGeneratedSource(input))return requireCurrentConfirmedSelection(client,input);
 const siteVersionId=input.selection.scope.siteVersionId;
 const context=await deps.source(client,siteVersionId);
 if(!context||context.artifact.id!==input.artifactId||context.artifact.bundleSha256!==input.artifactSha256||
  fingerprint(publicationSelectionForArtifact(input.selection.scope,context.artifact))!==fingerprint(input))
  throw Error('native_studio_source_stale');
 const model=await deps.model(siteVersionId);
 const review=await deps.review(client,siteVersionId);
 return {...requireReviewedGeneratedStudioSource(input,model,review),manifest:context.artifact.manifest};
}
function isGeneratedSource(input:PublicationSelection):input is PublicationSelection&{selection:StoredSourceSelection}{
 return 'kind' in input.selection&&input.selection.kind==='generated-source';
}
export async function requireCurrentConfirmedImport(client:SupabaseClient,release:Release){
 const current=await requireCurrentConfirmedSelection(client,release.input);
 if(fingerprint([...current.routes].sort())!==fingerprint([...release.routes].sort()))
  throw Error('native_studio_source_stale');
 if(current.confirmationSha256!==release.foundation?.confirmationSha256||
    current.brandSha256!==release.foundation.brandSha256||
    current.brandRevision!==release.foundation.brandRevision)
  throw Error('native_studio_confirmation_stale');
 return current;
}
