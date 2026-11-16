import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '../output-adapters/astro-candidate-runtime-artifact-store';
import { validateGeneratedOutputBuildEvidence, validateGeneratedOutputContentManifest } from '../output-adapters/generated-output-eligibility';
import { getSiteVersion, isGitBackedImportMarker } from '../runtime/runtime-store';
import { fingerprint, publicationSelectionForArtifact, type PublicationSelection, type Release } from './publication-contract';
import { requireConfirmedImport } from './publication-foundation';
import { requireCurrentSelectedImportClosure } from './read-selected-import-closure';

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
