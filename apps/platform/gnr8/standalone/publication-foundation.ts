import { BRAND_FIELDS, parseBrandDecisions, type BrandSaved } from '../brand/brand-guide';
import { fingerprint, type PublicationSelection } from './publication-contract';
import { createAstroStaticSiteSourceSnapshot } from '../output-adapters/astro-static-site-workspace-preparation';
import type { AstroBuildExportProofEvidence } from '../output-adapters/astro-static-site-build-export-proof';
import type { ExportFile } from './standalone-export';

/** Approval evidence in the existing version provenance, never a second source
 * or a draft head. Only an authenticated acceptance writer may persist this. */
export type ConfirmedImport = {
 kind:'gnr8-confirmed-import:v1'; selectionSha256:string;
 captureVersionId:string; captureArtifactId:string;
 routes:Array<{path:string;contentConfirmed:true;layoutConfirmed:true}>;
 functionsConfirmed:true;
 completeness:{status:'complete';evidenceSha256:string;unresolved:string[];scope?:'selected_routes';wholeSiteComplete?:false};
 brandSha256:string; actor:string; confirmedAt:string;
};
export function requireConfirmedImport(input: {
 selection:PublicationSelection; routes:string[]; unsupportedCapabilities:string[];
 captureVersionId:string; captureArtifactId:string;
 provenance:Record<string,unknown>|null;
}) {
 const saved=input.provenance?.confirmedImport as ConfirmedImport|undefined;
 if(!saved)throw Error('standalone_import_confirmation_missing');
 if(saved.kind!=='gnr8-confirmed-import:v1'||saved.selectionSha256!==fingerprint(input.selection)||
   saved.captureVersionId!==input.captureVersionId||saved.captureArtifactId!==input.captureArtifactId||
   saved.functionsConfirmed!==true||!/^[a-f0-9-]{36}$/.test(saved.actor)||!Number.isFinite(Date.parse(saved.confirmedAt)))
  throw Error('standalone_import_confirmation_stale');
 const paths=input.routes;
 if(!paths.length||new Set(paths).size!==paths.length||!Array.isArray(saved.routes)||
   saved.routes.length!==paths.length||new Set(saved.routes.map(r=>r.path)).size!==paths.length||
   saved.routes.some(r=>!paths.includes(r.path)||r.contentConfirmed!==true||r.layoutConfirmed!==true))
  throw Error('standalone_routes_unconfirmed');
 if(saved.completeness?.status!=='complete'||!/^[a-f0-9]{64}$/.test(saved.completeness.evidenceSha256)||
   !Array.isArray(saved.completeness.unresolved)||saved.completeness.unresolved.length||input.unsupportedCapabilities.length)
  throw Error('standalone_import_incomplete');
 if((saved.completeness.scope!==undefined||saved.completeness.wholeSiteComplete!==undefined)&&
   (saved.completeness.scope!=='selected_routes'||saved.completeness.wholeSiteComplete!==false))
  throw Error('standalone_import_incomplete');
 const brand=input.provenance?.brandStyleGuide as BrandSaved|undefined;
 if(!brand||brand.kind!=='brand_style_guide_v1'||brand.siteVersionId!==input.captureVersionId||
   brand.artifactId!==input.captureArtifactId||!Number.isSafeInteger(brand.revision)||brand.revision<1||
   saved.brandSha256!==fingerprint(brand))throw Error('standalone_brand_unconfirmed');
 let decisions;
 try { decisions=parseBrandDecisions(brand.decisions); } catch { throw Error('standalone_brand_unconfirmed'); }
 if(Object.keys(BRAND_FIELDS).some(key=>!decisions[key as keyof typeof BRAND_FIELDS]?.confirmed))
  throw Error('standalone_brand_unconfirmed');
 return {confirmationSha256:fingerprint(saved),brandSha256:saved.brandSha256,brandRevision:brand.revision};
}

/** Only the reviewed Astro 5/7 source versions may enter the shared Astro
 * 7.4.7 output. The target is checked independently of source provenance. */
export function requireCompatibleStandaloneToolchain(source:ExportFile[],exported:ExportFile[]) {
 const read=(files:ExportFile[])=>{
  try{return JSON.parse(files.find(f=>f.path==='package.json')!.body.toString());}
  catch{throw Error('standalone_toolchain_unverified');}
 };
 const before=read(source),after=read(exported);
 if(!['5.18.2','7.4.4','7.4.7'].includes(before.dependencies?.astro) ||
   after.dependencies?.astro!=='7.4.7' || after.engines?.node!=='26.x')
  throw Error('standalone_toolchain_transform_unsupported');
}

/** A successful process exit alone is not a verified source/build binding. */
export function requireFoundationBuild(files:ExportFile[],routes:string[],proof:AstroBuildExportProofEvidence) {
 const source=createAstroStaticSiteSourceSnapshot(files);
 const same=proof.sourceComparison;
 if(!proof.installation.completed||!proof.build.completed||!same.unchanged||
   same.baselineAggregateSha256!==source.aggregateSha256||same.finalAggregateSha256!==source.aggregateSha256||
   !proof.cleanup.completed||!proof.export.aggregateSha256)
  throw Error('standalone_build_source_unverified');
 const actual=proof.export.files.filter(f=>f.path.endsWith('.html')).map(f=>
  f.path==='index.html'?'/':'/'+f.path.replace(/\/index\.html$/,'').replace(/\.html$/,''));
 if(fingerprint([...actual].sort())!==fingerprint([...routes].sort()))throw Error('standalone_build_routes_incomplete');
 return {sourceSha256:source.aggregateSha256,exportSha256:proof.export.aggregateSha256,versions:proof.versions};
}
