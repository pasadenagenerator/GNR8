import assert from 'node:assert/strict';
import test from 'node:test';
import {requireConfirmedImport,requireFoundationBuild,requireCompatibleStandaloneToolchain,type ConfirmedImport} from './publication-foundation';
import {fingerprint,type PublicationSelection} from './publication-contract';
import {createAstroStaticSiteSourceSnapshot} from '../output-adapters/astro-static-site-workspace-preparation';
import type {BrandSaved} from '../brand/brand-guide';
const id='11111111-1111-4111-8111-111111111111';
const selection:PublicationSelection={artifactId:id,artifactSha256:'a'.repeat(64),selection:{scope:{agencyId:id,clientId:id,siteId:id,siteVersionId:id},revision:4,sha256:'b'.repeat(64)}};
function fixture(){
 const values={logo:'logo.svg',logoPosition:'left',background:'white',text:'black',accent:'red',fontFamily:'Arial',fontSize:'16px',fontWeight:'400',lineHeight:'1.5',headingFamily:'Arial',headingSize:'32px',headingWeight:'700',headingLineHeight:'1.2',spacing:'16px',contentWidth:'1200px',border:'none',radius:'0',shadow:'none',buttonBackground:'red',buttonText:'white',buttonPadding:'16px',breakpoints:'600px, 1200px'};
 const brand:BrandSaved={kind:'brand_style_guide_v1',siteVersionId:id,artifactId:id,revision:1,savedAt:'2026-11-05T10:00:00Z',savedBy:id,decisions:Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{value,confirmed:true}]))};
 const approval:ConfirmedImport={kind:'gnr8-confirmed-import:v1',selectionSha256:fingerprint(selection),captureVersionId:id,captureArtifactId:id,routes:[{path:'/',contentConfirmed:true,layoutConfirmed:true},{path:'/about',contentConfirmed:true,layoutConfirmed:true}],functionsConfirmed:true,completeness:{status:'complete',evidenceSha256:'c'.repeat(64),unresolved:[]},brandSha256:fingerprint(brand),actor:id,confirmedAt:'2026-11-05T10:00:00Z'};
 return {selection:structuredClone(selection),routes:['/','/about'],unsupportedCapabilities:[] as string[],captureVersionId:id,captureArtifactId:id,provenance:{confirmedImport:approval,brandStyleGuide:brand}};
}
test('confirmation binds exact selection, all routes and confirmed Brand revision without implying publication',()=>{
 const f=fixture();assert.equal(requireConfirmedImport(f).confirmationSha256,fingerprint(f.provenance.confirmedImport));
 for(const mutate of [
  (f:ReturnType<typeof fixture>)=>{f.selection.selection.sha256='d'.repeat(64);},
  (f:ReturnType<typeof fixture>)=>{f.provenance.confirmedImport.routes.pop();},
  (f:ReturnType<typeof fixture>)=>{f.provenance.confirmedImport.routes[1]=f.provenance.confirmedImport.routes[0]!;},
  (f:ReturnType<typeof fixture>)=>{(f.provenance.confirmedImport as {functionsConfirmed:boolean}).functionsConfirmed=false;},
  (f:ReturnType<typeof fixture>)=>{f.provenance.confirmedImport.completeness.unresolved.push('missing image');},
  (f:ReturnType<typeof fixture>)=>{f.unsupportedCapabilities.push('commerce');},
  (f:ReturnType<typeof fixture>)=>{f.provenance.brandStyleGuide.revision++;},
  (f:ReturnType<typeof fixture>)=>{f.provenance.brandStyleGuide.decisions.accent!.confirmed=false;f.provenance.confirmedImport.brandSha256=fingerprint(f.provenance.brandStyleGuide);},
 ]){const changed=fixture();mutate(changed);assert.throws(()=>requireConfirmedImport(changed),/standalone_/);}
 assert.throws(()=>requireConfirmedImport({...f,provenance:null}),/confirmation_missing/);
});
test('build must cover every route and bind the unchanged exported source',()=>{
 const files=[{path:'src/pages/index.astro',body:Buffer.from('<h1>home</h1>')}];
 const hash=createAstroStaticSiteSourceSnapshot(files).aggregateSha256;
 const proof:any={installation:{completed:true},build:{completed:true},cleanup:{completed:true},sourceComparison:{unchanged:true,baselineAggregateSha256:hash,finalAggregateSha256:hash},export:{aggregateSha256:'a'.repeat(64),files:[{path:'index.html'},{path:'about/index.html'}]},versions:{astro:'5.18.2'}};
 assert.equal(requireFoundationBuild(files,['/','/about'],proof).sourceSha256,hash);
 for(const changed of [{...proof,build:{completed:false}},{...proof,sourceComparison:{...proof.sourceComparison,finalAggregateSha256:'b'.repeat(64)}},{...proof,export:{...proof.export,files:[{path:'index.html'}]}}])assert.throws(()=>requireFoundationBuild(files,['/','/about'],changed),/standalone_build_/);
});
test('Astro 7 cannot be silently exported as Astro 5, nor can an unpinned legacy range claim exact equivalence',()=>{
 const pkg=(astro:string)=>[{path:'package.json',body:Buffer.from(JSON.stringify({dependencies:{astro}}))}];
 assert.throws(()=>requireCompatibleStandaloneToolchain(pkg('7.4.4'),pkg('5.18.2')),/transform_unsupported/);
 assert.throws(()=>requireCompatibleStandaloneToolchain(pkg('^5.0.0'),pkg('5.18.2')),/transform_unsupported/);
 assert.doesNotThrow(()=>requireCompatibleStandaloneToolchain(pkg('5.18.2'),pkg('5.18.2')));
});
