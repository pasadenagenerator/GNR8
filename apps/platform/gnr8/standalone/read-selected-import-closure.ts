import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RawTemplateSiteFileMeta, RuntimeImportProvenanceSummary } from '../runtime/types';
import { createVerifiedRetainedAssetReader } from '../output-adapters/verified-retained-asset';
import { readGeneratedOutputReviewModel } from '../output-adapters/generated-output-publication-composition';
import { loadCapturedContentReview } from '../site/captured-content-review-loader';
import { getEvidenceCaptureBaselineArtifactFromImportProvenanceSummary } from '../site/evidence-capture-baseline-read-model';
import { evaluateSelectedImportClosure } from './selected-import-closure';
import { fingerprint } from './publication-contract';
import type { ConfirmedImport } from './publication-foundation';

export type SelectedImportClosureInput={client:SupabaseClient;siteVersionId:string;
 artifactId:string;artifactSha256:string;captureVersionId:string;captureArtifactId:string;
 runtimeSiteId:string;raw:{file_map:Record<string,RawTemplateSiteFileMeta>;entry_html_path:string};
 provenance:RuntimeImportProvenanceSummary|null;selectedRoutes:string[]};

export async function requireCurrentSelectedImportClosure(input:SelectedImportClosureInput,
 confirmation:ConfirmedImport,read:typeof readSelectedImportClosure=readSelectedImportClosure){
 if(confirmation.completeness?.scope!=='selected_routes'||confirmation.completeness.wholeSiteComplete!==false)
  throw Error('selected_import_confirmation_stale');
 let closure:Awaited<ReturnType<typeof readSelectedImportClosure>>;
 try{closure=await read(input);}catch{throw Error('selected_import_confirmation_stale');}
 if(closure.status!=='selected_routes_verified'||closure.wholeSiteComplete!==false||
    fingerprint(closure)!==confirmation.completeness.evidenceSha256)
  throw Error('selected_import_confirmation_stale');
 return closure;
}

export async function readSelectedImportClosure(input:SelectedImportClosureInput){
 const model=await readGeneratedOutputReviewModel(input.siteVersionId);
 if(model.artifactId!==input.artifactId||model.artifactBundleSha256!==input.artifactSha256)
  throw Error('selected_import_source_stale');
 const read=createVerifiedRetainedAssetReader(input.client);
 const review=await loadCapturedContentReview({siteId:input.runtimeSiteId,siteVersionId:input.captureVersionId,
  artifactId:input.captureArtifactId,entryHtmlPath:input.raw.entry_html_path,fileMap:input.raw.file_map,
  provenance:input.provenance,baseline:getEvidenceCaptureBaselineArtifactFromImportProvenanceSummary(input.provenance),
  read:path=>read({siteId:input.runtimeSiteId,siteVersionId:input.captureVersionId,path})});
 return evaluateSelectedImportClosure({review,selectedRoutes:input.selectedRoutes,technical:model.decision.technical,
  captureVersionId:input.captureVersionId,captureArtifactId:input.captureArtifactId});
}
