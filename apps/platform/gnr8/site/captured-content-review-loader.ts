import type { RuntimeImportProvenanceSummary, RawTemplateSiteFileMeta } from '@/gnr8/runtime/types';
import { routeMapFromProvenance, resolveRawTemplateRouteMapFile } from '@/gnr8/runtime/raw-template-route-map-resolver';
import type { EvidenceCaptureBaselineArtifactRecord } from '@/gnr8/architecture/evidence-capture-baseline-artifact';
import { CAPTURE_SCOPE_NOTE, isNonPageOmissionReason, reviewCapturedRoute, type CapturedContentReview } from '@/gnr8/architecture/captured-content-review';

const MAX_REVIEW_ROUTES = 64;
const MAX_REVIEW_HTML_BYTES = 16 * 1024 * 1024;
const REVIEW_CONCURRENCY = 4;

/** Caller supplies the existing authorized, integrity-checked retained-file reader. Never executes source HTML. */
export async function loadCapturedContentReview(input: {
  siteId: string; siteVersionId: string; artifactId: string; entryHtmlPath: string;
  fileMap: Record<string, RawTemplateSiteFileMeta>;
  provenance: RuntimeImportProvenanceSummary | null; baseline?: EvidenceCaptureBaselineArtifactRecord | null;
  read: (path: string) => Promise<Response>;
}): Promise<CapturedContentReview> {
  const routes = [...new Set(['/',...routeMapFromProvenance(input.provenance).map(r=>r.routePath)])];
  const result: CapturedContentReview = {siteVersionId:input.siteVersionId,artifactId:input.artifactId,routes:[],omittedLinks:[],limitations:[]};
  if(routes.length>MAX_REVIEW_ROUTES) result.limitations.push(`Review limited to the first ${MAX_REVIEW_ROUTES} retained routes; further routes have not been inspected.`);
  const baseline = input.baseline;
  const filePaths = new Set(Object.keys(input.fileMap));
  let reviewedHtmlBytes = 0;
  const selectedRoutes = routes.slice(0,MAX_REVIEW_ROUTES);
  const reviewRoute = async (route: string): Promise<CapturedContentReview['routes'][number]> => {
    const resolved = resolveRawTemplateRouteMapFile({siteVersionId:input.siteVersionId,requestedPath:route,entryHtmlPath:input.entryHtmlPath,fileMap:input.fileMap,importProvenanceSummary:input.provenance,routeMapServingEnabled:true});
    const filePath = resolved.outcome==='selected'?resolved.rawFilePath:route==='/'&&resolved.outcome==='disabled'?input.entryHtmlPath:null;
    const sourceUrl = ('sourceUrl' in resolved?resolved.sourceUrl:null) ?? (route==='/' ? input.provenance?.multiPageDiscovery?.rawArtifactAssembly?.seedUrl ?? baseline?.sourceUrl ?? null : null);
    const fail = (reason: string): CapturedContentReview['routes'][number] => ({state:'failed',coverage:[],route,sourceUrl,filePath,items:[],limitations:[reason]});
    if(!filePath)return fail('Retained route mapping unavailable.');
    const meta=input.fileMap[filePath];
    if(!meta || meta.sizeBytes>2*1024*1024 || !/text\/html|application\/xhtml\+xml/i.test(meta.mediaType))return fail('HTML missing, invalid or above the 2 MiB review limit.');
    if(reviewedHtmlBytes + meta.sizeBytes > MAX_REVIEW_HTML_BYTES)return fail('Retained HTML exceeds the 16 MiB total review limit; content remains unverified.');
    reviewedHtmlBytes += meta.sizeBytes;
    try {
      const response=await input.read(filePath);
      if(!response.ok)return fail('Retained HTML could not be read and verified.');
      return reviewCapturedRoute({route,sourceUrl,filePath,html:await response.text(),siteId:input.siteId,filePaths,baseline});
    } catch {return fail('Retained HTML read failed; content is unverified.');}
  };
  for(let cursor=0;cursor<selectedRoutes.length;cursor+=REVIEW_CONCURRENCY){
    result.routes.push(...await Promise.all(selectedRoutes.slice(cursor,cursor+REVIEW_CONCURRENCY).map(reviewRoute)));
  }
  // Retain known omissions from every existing acquisition stage; do not infer successful coverage.
  const discovery=input.provenance?.multiPageDiscovery;
  const unlocated = new Map<string, number>();
  const note=(route: string|null, sourceUrl: string|null, state: 'failed'|'excluded'|'unverified', reason: string) => {
    if(!route&&!sourceUrl){unlocated.set(reason,(unlocated.get(reason)??0)+1);return;}
    if (isNonPageOmissionReason(reason)) {
      const reference=sourceUrl??route!;
      let key=reference;
      try {const url=new URL(reference,discovery?.rawArtifactAssembly?.seedUrl??discovery?.acquisition?.seedUrl??'https://retained.invalid/');url.hostname=url.hostname.replace(/^www\./,'');key=url.href;} catch { /* preserve malformed evidence verbatim */ }
      const existing=result.omittedLinks.find(x=>x.reference===key);
      if(existing){if(!existing.reasons.includes(reason))existing.reasons.push(reason);if(!existing.sourceReferences.includes(reference))existing.sourceReferences.push(reference);}
      else result.omittedLinks.push({reference:key,reasons:[reason],sourceReferences:[reference]});
      return;
    }
    const key=route??sourceUrl!;
    const existing=result.routes.find(r=>r.route===key);
    if(existing){if(!existing.limitations.includes(reason))existing.limitations.push(reason);if(existing.state!=='reviewed' && state==='failed')existing.state='failed';return;}
    result.routes.push({route:key,sourceUrl,filePath:null,state,items:[],coverage:[],limitations:[reason]});
  };
  for(const route of routes.slice(MAX_REVIEW_ROUTES)) note(route,null,'unverified',`Pot presega omejitev pregleda ${MAX_REVIEW_ROUTES} shranjenih strani.`);
  for(const entry of discovery?.rawArtifactAssembly?.excludedPages??[]) note(entry.routePath,entry.sourceUrl,'excluded','Sestavljanje: '+entry.reason);
  for(const entry of [...(discovery?.rawArtifactAssembly?.failedPages??[]),...(discovery?.acquisition?.pages??[])]) {
    if(entry.status==='fetched') continue;
    note(entry.finalNormalizedRoutePath??entry.normalizedRoutePath,entry.finalUrl??entry.normalizedUrl??entry.originalHref,
      entry.status==='failed'?'failed':'excluded', 'Pridobivanje: '+(entry.failureReason??entry.skippedReason??entry.diagnostics?.join('; ')??entry.status));
  }
  for(const entry of discovery?.manifest?.skippedLinks??[]) note(entry.normalizedRoutePath,entry.normalizedUrl??entry.absoluteUrl??entry.originalHref,'excluded','Odkrivanje: '+(entry.skippedReason??'Razlog ni zapisan.'));
  for(const entry of discovery?.manifest?.discoveredPages??[]) {
    const route=entry.normalizedRoutePath;
    if(!result.routes.some(r=>r.route===route||r.sourceUrl===(entry.normalizedUrl??entry.absoluteUrl))) note(route,entry.normalizedUrl??entry.absoluteUrl,'unverified','Odkrita povezava nima potrjenega shranjenega HTML.');
  }
  for(const [reason,count] of unlocated) result.limitations.push(`${count} izločenih ali neuspelih sklicev brez zapisane poti: ${reason}`);
  if(discovery?.manifest?.limitsApplied) result.limitations.push('Omejitve odkrivanja: '+JSON.stringify(discovery.manifest.limitsApplied));
  if(discovery?.acquisition?.limitsApplied) result.limitations.push('Omejitve pridobivanja: '+JSON.stringify(discovery.acquisition.limitsApplied));
  result.limitations.push(CAPTURE_SCOPE_NOTE);
  return result;
}
