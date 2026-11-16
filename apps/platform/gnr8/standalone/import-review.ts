import type { evaluateSelectedImportClosure } from './selected-import-closure';
import { BRAND_FIELDS, parseBrandDecisions, type BrandSaved } from '../brand/brand-guide';
import { fingerprint, type PublicationSelection } from './publication-contract';
import type { ConfirmedImport } from './publication-foundation';

export type RouteDecision = {path:string;contentConfirmed:boolean;layoutConfirmed:boolean};
/** User review is evidence of acceptance, not a technical completeness certificate. */
export type ImportReview = {
 kind:'gnr8-import-review:v1'; selectionSha256:string; evidenceSha256:string;
 captureVersionId:string; captureArtifactId:string; routes:RouteDecision[];
 brandSha256:string|null; brandConfirmed:boolean; actor:string; savedAt:string;
};
export type ImportReviewModel = {
 token:string; evidenceSha256:string; selectionSha256:string; revision:number|null;
 captureVersionId:string; captureArtifactId:string;
 routes:RouteDecision[]; brand:{revision:number|null;sha256:string|null;ready:boolean;confirmed:boolean;values:Array<{label:string;value:string}>};
 savedAt:string|null; stale:boolean; blockers:string[];
 unsupportedCapabilities:string[];
 nativeStudioAvailable:boolean;
 confirmedAt:string|null;
 completeness:'unverified';selectedClosure:ReturnType<typeof evaluateSelectedImportClosure>|null;
};
const capabilityLabels:Record<string,string>={
 'arbitrary third-party scripts':'poljubnih zunanjih skript',
 'forms outside the supported native contact schema':'obrazcev zunaj podprtega kontaktnega obrazca',
 application_state:'stanja aplikacije',checkout:'blagajne in plačil',inventory:'upravljanja zaloge',account:'uporabniških računov',platform_theme_runtime:'izvirnega sistema tem',
};
export function parseRouteDecisions(value:unknown, paths:string[]):RouteDecision[] {
 if(!Array.isArray(value)||value.length!==paths.length||new Set(value.map(r=>r?.path)).size!==paths.length)
  throw Error('422|Potrdite samo prikazani seznam strani.');
 const rows=value.map(r=>{
  if(!r||Object.keys(r).sort().join()!=='contentConfirmed,layoutConfirmed,path'||!paths.includes(r.path)||
    typeof r.contentConfirmed!=='boolean'||typeof r.layoutConfirmed!=='boolean')
   throw Error('422|Neveljavna potrditev strani.');
  return {path:r.path as string,contentConfirmed:r.contentConfirmed as boolean,layoutConfirmed:r.layoutConfirmed as boolean};
 });
 return paths.map(path=>rows.find(r=>r.path===path)!);
}
export function importReviewModel(input:{selection:PublicationSelection;paths:string[];unsupported:string[];
 captureVersionId:string;captureArtifactId:string;provenance:Record<string,unknown>|null;updatedAt:string;
 evidence:unknown;closure?:ReturnType<typeof evaluateSelectedImportClosure>|null;nativeStudioAvailable?:boolean}):ImportReviewModel {
 const brand=input.provenance?.brandStyleGuide as BrandSaved|undefined;
 let brandReady=false;
 try {
  const decisions=parseBrandDecisions(brand?.decisions);
  brandReady=brand?.kind==='brand_style_guide_v1'&&brand.siteVersionId===input.captureVersionId&&brand.artifactId===input.captureArtifactId&&
   Number.isSafeInteger(brand.revision)&&brand.revision>=1&&Object.keys(BRAND_FIELDS).every(k=>decisions[k as keyof typeof BRAND_FIELDS]?.confirmed);
 } catch { /* Missing or invalid Brand decisions remain unconfirmed. */ }
 const brandSha256=brand?fingerprint(brand):null;
 const selectionSha256=fingerprint(input.selection);
 const evidenceSha256=fingerprint({selectionSha256,captureVersionId:input.captureVersionId,captureArtifactId:input.captureArtifactId,evidence:input.evidence,brandSha256});
 const saved=input.provenance?.importReview as ImportReview|undefined;
 let routes=input.paths.map(path=>({path,contentConfirmed:false,layoutConfirmed:false})),current=false;
 if(saved?.kind==='gnr8-import-review:v1'&&saved.selectionSha256===selectionSha256&&saved.evidenceSha256===evidenceSha256&&
   saved.captureVersionId===input.captureVersionId&&saved.captureArtifactId===input.captureArtifactId&&saved.brandSha256===brandSha256&&
   typeof saved.brandConfirmed==='boolean'&&typeof saved.savedAt==='string'&&Number.isFinite(Date.parse(saved.savedAt))){
  try { routes=parseRouteDecisions(saved.routes,input.paths); current=true; } catch { /* Stale evidence must be reviewed again. */ }
 }
 const confirmed=input.provenance?.confirmedImport as ConfirmedImport|undefined;
 const closure=input.closure;
 const confirmedAt=current&&brandReady&&saved!.brandConfirmed&&routes.every(route=>route.contentConfirmed&&route.layoutConfirmed)&&
  closure?.status==='selected_routes_verified'&&closure.wholeSiteComplete===false&&
  confirmed?.kind==='gnr8-confirmed-import:v1'&&confirmed.functionsConfirmed===true&&confirmed.selectionSha256===selectionSha256&&
  confirmed.captureVersionId===input.captureVersionId&&confirmed.captureArtifactId===input.captureArtifactId&&
  confirmed.brandSha256===brandSha256&&confirmed.completeness?.scope==='selected_routes'&&
  confirmed.completeness.wholeSiteComplete===false&&confirmed.completeness.evidenceSha256===fingerprint(closure)&&
  Array.isArray(confirmed.routes)&&fingerprint(confirmed.routes)===fingerprint(routes)&&
  typeof confirmed.confirmedAt==='string'&&Number.isFinite(Date.parse(confirmed.confirmedAt))
  ?confirmed.confirmedAt:null;
 return {token:fingerprint({selectionSha256,evidenceSha256,updatedAt:input.updatedAt,saved:saved??null}),evidenceSha256,selectionSha256,
  revision:input.selection.selection.revision??null,captureVersionId:input.captureVersionId,captureArtifactId:input.captureArtifactId,
  routes,brand:{revision:brand?.revision??null,sha256:brandSha256,ready:brandReady,confirmed:current&&brandReady&&saved!.brandConfirmed,
   values:brandReady?Object.entries(BRAND_FIELDS).map(([key,label])=>({label,value:brand!.decisions[key as keyof typeof BRAND_FIELDS]!.value})):[]},
 savedAt:current?saved!.savedAt:null,stale:!!saved&&!current,confirmedAt,unsupportedCapabilities:input.unsupported,
  nativeStudioAvailable:input.nativeStudioAvailable===true,completeness:'unverified',selectedClosure:input.closure??null,
  blockers:['Celovitost izvirnega zajema še ni dokazana. Shranjen uporabniški pregled je ne potrdi.',
   ...input.unsupported.map(capability=>'Izvoz ne podpira: '+(capabilityLabels[capability]??capability)),
   ...(!brandReady?['V vodiču znamke še niso potrjena vsa veljavna polja za ta zajem.']:[])],
 };
}
export function saveImportReview(model:ImportReviewModel,body:Record<string,unknown>,actor:string,now:string):ImportReview {
 if(body.token!==model.token)throw Error('409|Izvor, vodič ali pregled se je spremenil. Osvežite pregled.');
 if(typeof body.brandConfirmed!=='boolean'||(body.brandConfirmed&&!model.brand.ready))throw Error('422|Najprej dokončajte vodič znamke za prikazani zajem.');
 return {kind:'gnr8-import-review:v1',selectionSha256:model.selectionSha256,evidenceSha256:model.evidenceSha256,
  captureVersionId:model.captureVersionId,captureArtifactId:model.captureArtifactId,
  routes:parseRouteDecisions(body.routes,model.routes.map(r=>r.path)),brandSha256:model.brand.sha256,brandConfirmed:body.brandConfirmed,actor,savedAt:now};
}

/** Explicit acceptance of the selected scope after the review has been saved. */
export function confirmSelectedImport(model:ImportReviewModel,body:Record<string,unknown>,actor:string,now:string):ConfirmedImport {
 if(body.token!==model.token)throw Error('409|Izvor ali pregled se je spremenil. Osvežite pregled.');
 if(body.scopeConfirmed!==true)throw Error('422|Potrdite seznam izbranih strani.');
 if(body.functionsConfirmed!==true)throw Error('422|Potrdite delovanje izbranih strani.');
 if(!model.savedAt||model.stale||!model.brand.confirmed||model.unsupportedCapabilities.length||
    model.routes.some(route=>!route.contentConfirmed||!route.layoutConfirmed)||
    model.selectedClosure?.status!=='selected_routes_verified'||
    model.selectedClosure.wholeSiteComplete!==false||
    fingerprint([...model.routes.map(route=>route.path)].sort())!==fingerprint(model.selectedClosure.selectedRoutes))
  throw Error('409|Izbrani uvoz še ni preverjen in potrjen.');
 return {kind:'gnr8-confirmed-import:v1',selectionSha256:model.selectionSha256,
  captureVersionId:model.captureVersionId,captureArtifactId:model.captureArtifactId,
  functionsConfirmed:true,
  routes:model.routes.map(route=>({path:route.path,contentConfirmed:true as const,layoutConfirmed:true as const})),
  completeness:{status:'complete',evidenceSha256:fingerprint(model.selectedClosure),unresolved:[],scope:'selected_routes',wholeSiteComplete:false},
  brandSha256:model.brand.sha256!,actor,confirmedAt:now};
}
