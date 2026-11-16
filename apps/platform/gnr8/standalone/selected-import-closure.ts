import { CAPTURE_SCOPE_NOTE, ROUTE_REVIEW_SCOPE_NOTES, isPageIndependentOmissionReason, type CapturedContentReview } from '../architecture/captured-content-review';
import type { GeneratedOutputTechnicalEligibility } from '../output-adapters/generated-output-eligibility';
import { fingerprint } from './publication-contract';

/** Evidence for selected routes only; never a whole-site certificate. */
export function evaluateSelectedImportClosure(input:{review:CapturedContentReview;selectedRoutes:string[];
 technical:GeneratedOutputTechnicalEligibility;captureVersionId:string;captureArtifactId:string}){
 const blockers:string[]=[];
 const add=(reason:string)=>{if(!blockers.includes(reason))blockers.push(reason);};
 if(input.review.siteVersionId!==input.captureVersionId||input.review.artifactId!==input.captureArtifactId)add('capture_identity_mismatch');
 const selected=input.selectedRoutes;
 if(!selected.length||new Set(selected).size!==selected.length||fingerprint([...selected].sort())!==fingerprint([...input.technical.scope.outputPaths].sort()))add('selected_routes_mismatch');
 if(input.technical.status!=='PASS'||input.technical.blockerReasons.length)add('technical_review_blocked');
 if(input.technical.scope.unsupportedCapabilities.length)add('unsupported_capabilities');
 const byRoute=new Map<string,CapturedContentReview['routes']>();
 for(const route of input.review.routes){const rows=byRoute.get(route.route)??[];rows.push(route);byRoute.set(route.route,rows);}
 for(const path of selected){
  const rows=byRoute.get(path);
  if(rows?.length!==1||rows[0]!.state!=='reviewed')add('selected_route_unverified');
  if(rows?.[0]?.items.some(item=>item.status!=='captured'||item.assets.some(asset=>asset.status!=='captured')))add('selected_asset_unverified');
  if(rows?.[0]?.items.some(item=>item.kind==='unknown-widget'||item.kind.startsWith('detector:')))add('selected_widget_unverified');
  if(rows?.[0]?.limitations.some(note=>!ROUTE_REVIEW_SCOPE_NOTES.includes(note as typeof ROUTE_REVIEW_SCOPE_NOTES[number])))add('selected_route_limited');
 }
 if(input.review.routes.some(route=>!selected.includes(route.route)))add('discovered_route_unresolved');
 if(input.review.omittedLinks.some(link=>!Array.isArray(link.reasons)||!link.reasons.length||
   link.reasons.some(reason=>!isPageIndependentOmissionReason(reason))))add('omitted_links_unresolved');
 if(input.review.limitations.some(message=>message!==CAPTURE_SCOPE_NOTE))add('capture_limitations_unresolved');
 return {kind:'gnr8-selected-import-closure:v1' as const,status:blockers.length?'blocked' as const:'selected_routes_verified' as const,
  blockers,selectedRoutes:[...selected].sort(),technicalEvidenceSha256:input.technical.evidenceSha256,
  captureReviewSha256:fingerprint(input.review),wholeSiteComplete:false as const};
}
