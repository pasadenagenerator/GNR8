import { rewriteRawTemplateCssForRuntime } from '@/src/public-site/raw-template-runtime';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extractBrandGuide} from './brand-guide-extraction';
import {applySavedBrand,parseBrandDecisions} from './brand-guide';
import {createBrandGuideRoutes,brandDependencies} from './brand-guide-routes';
const input={siteId:'site',siteVersionId:'version',artifactId:'artifact',entryHtmlPath:'index.html',computedStylePath:'styles.json'};
const files:Record<string,string>={'index.html':'<header><img src="logo.svg"></header><style>.button {background-color:#e60000;padding:12px} @media(max-width:600px){.container{max-width:100%}}</style>', 'logo.svg':'<svg/>','styles.json':JSON.stringify({samples:[{target:'root',selector:'body',styles:{backgroundColor:'white',color:'black',fontFamily:'Example',fontSize:'17px'}},{target:'h1',selector:'h1',styles:{color:'#e60000',fontSize:'37px'}}]})};
const fileMap=Object.fromEntries(Object.entries(files).map(([k,v])=>[k,{path:k,sizeBytes:v.length,mediaType:'text/plain',sha256:''}]));
async function extract(){return extractBrandGuide({...input,fileMap,read:async p=>new Response(files[p])});}
test('evidence stays separate from editable decisions and uncertain CSS does not become computed evidence',async()=>{
 const guide=await extract();assert.equal(guide.proposals.accent?.value,'#e60000');assert.equal(guide.proposals.logo?.value,'logo.svg');assert.equal(guide.proposals.contentWidth,undefined);
 assert.ok(guide.observations.some(o=>o.context.includes('@media')));
 const saved={...input,kind:guide.kind,revision:1,savedAt:'2026-10-30',decisions:{accent:{value:'#00ff00',confirmed:true}}};
 const reopened=applySavedBrand(guide,JSON.parse(JSON.stringify(saved)));
 assert.equal(reopened.decisions.accent?.value,'#00ff00');assert.equal(reopened.proposals.accent?.value,'#e60000');assert.equal(guide.decisions.accent,undefined);
 assert.throws(()=>applySavedBrand(guide,{...saved,artifactId:'other'}));
 assert.throws(()=>parseBrandDecisions({accent:{value:'',confirmed:true}}));
 assert.throws(()=>parseBrandDecisions({unknown:{value:'red',confirmed:true}}));
});
test('authenticated route saves/reopens, preserves capture JSON, rejects stale or cross-tenant writes and origin mismatch',async()=>{
 let summary:Record<string,unknown>={capture:'immutable'};let updatedAt='2026-10-30T00:00:00Z';let denied=false,conflict=false,writes=0;
 const db={from(table:string){let update:Record<string,unknown>|null=null;let expected:string|undefined;
   const q={select(){if(update){const ok=!conflict&&expected===updatedAt;if(ok){summary=update.import_provenance_summary as Record<string,unknown>;updatedAt=update.updated_at as string;writes++;}return Promise.resolve({data:ok?[{id:'version'}]:[],error:null});}return q;},eq(k:string,v:string){if(k==='updated_at')expected=v;return q;},is(){return q;},update(value:Record<string,unknown>){update=value;return q;},async single(){return {data:table==='gnr8_runtime_site_versions'?{import_provenance_summary:summary,updated_at:updatedAt}:{id:'artifact',entry_html_path:'index.html',file_map:fileMap},error:null};}};return q;
 }};
 const deps={...brandDependencies,authorize:async()=>({agencyId:'agency',userId:'user'}),resolve:async()=>({agencyId:denied?'other':'agency',organizationId:'client',ownershipSiteId:'site',runtimeSiteId:'runtime'}),client:()=>db,extract:async()=>extract(),reader:()=>async()=>new Response('')};
 const routes=createBrandGuideRoutes(deps as unknown as typeof brandDependencies),context={params:Promise.resolve({clientId:'client',siteId:'site'})};
 const url='https://app.test/api?agencyId=agency&siteVersionId=version';
 const save=(revision:number,origin='https://app.test')=>routes.POST(new Request(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({artifactId:'artifact',revision,decisions:{accent:{value:'green',confirmed:true}}})}),context);
 const invalid=await routes.POST(new Request(url,{method:'POST',headers:{origin:'https://app.test','content-type':'application/json'},body:JSON.stringify({artifactId:'artifact',revision:0,decisions:{fontSize:{value:'banana',confirmed:true}}})}),context);
 assert.equal(invalid.status,422);assert.equal(writes,0);
 assert.equal((await save(0)).status,200);assert.equal(summary.capture,'immutable');
 const reopened=await (await routes.GET(new Request(url),context)).json();assert.equal(reopened.guide.decisions.accent.value,'green');assert.equal(reopened.guide.revision,1);
 assert.equal((await save(0)).status,409);conflict=true;assert.equal((await save(1)).status,409);conflict=false;
 assert.equal((await save(1,'https://evil.test')).status,403);denied=true;assert.equal((await save(1)).status,404);assert.equal(writes,1);
});
test('retained Ladja replay uses seven real samples and preserves green/white identity',{skip:!process.env.GNR8_RETAINED_REVIEW_DIR},async()=>{
 const dir=process.env.GNR8_RETAINED_REVIEW_DIR!;const artifact=JSON.parse(await readFile(`${dir}/artifact.json`,'utf8'));
 const guide=await extractBrandGuide({siteId:artifact.site_id,siteVersionId:artifact.site_version_id,artifactId:artifact.id,entryHtmlPath:'index.html',computedStylePath:'/tmp/gnr8/validation/url-import-snapshots/imported-url-site-3e793a8291efa518/runs/client-site-import-1793367672538-3b9bd2e0/rendered/computed-styles.json',fileMap:artifact.file_map,read:async p=>{const bytes=await readFile(`${dir}/files/${p}`);return new Response(p.endsWith('.css')?rewriteRawTemplateCssForRuntime({css:bytes.toString('utf8'),siteId:artifact.site_id,siteVersionId:artifact.site_version_id,resolvedFilePath:p,fileMapPaths:new Set(Object.keys(artifact.file_map))}):bytes);}});
 assert.equal(guide.proposals.accent?.value,'rgb(13, 143, 53)');assert.equal(guide.proposals.background?.value,'rgb(255, 255, 255)');assert.equal(guide.proposals.fontFamily?.value,'Barlow');
 assert.equal(new Set(guide.observations.filter(o=>o.kind==='computed').map(o=>o.selector)).size,7);assert.ok(guide.proposals.logo);assert.equal(Object.keys(guide.decisions).length,0);
 for(const weight of ['400','700','900'])assert.ok(guide.fontFaces?.some(f=>f.family==='Barlow'&&f.weight===weight&&artifact.file_map[f.path]),`retained Barlow ${weight}`);
});

test('typed values reject invalid confirmed tokens and keep valid source values',()=>{
 for(const [key,value] of [['fontSize','banana'],['accent','not-a-color'],['fontWeight','1001'],['lineHeight','-1'],['buttonPadding','-2px'],['background','url(https://example.com/x)'],['accent','rgb(300, 0, 0)']]){
  assert.throws(()=>parseBrandDecisions({[key]:{value,confirmed:true}}),/422/);
 }
 const valid={fontSize:{value:'17px',confirmed:true},fontWeight:{value:'700',confirmed:true},accent:{value:'#0d8f35',confirmed:true},lineHeight:{value:'1.4',confirmed:true},buttonPadding:{value:'12px 20px',confirmed:true},shadow:{value:'0 2px 8px #00000033',confirmed:false}};
 assert.deepEqual(parseBrandDecisions(valid),valid);
});
test('legacy invalid confirmed values remain editable but are never trusted as confirmed',async()=>{
 const guide=await extract();const reopened=applySavedBrand(guide,{...input,kind:guide.kind,revision:2,savedAt:'2026-10-30',decisions:{fontSize:{value:'banana',confirmed:true}}});
 assert.equal(reopened.decisions.fontSize?.value,'banana');assert.equal(reopened.decisions.fontSize?.confirmed,false);assert.ok(reopened.limitations.some(s=>s.includes('starejša neveljavna')));
});
test('border width rejects percentages without restricting other supported units or fields',()=>{
 for(const confirmed of [false,true]){
  assert.throws(()=>parseBrandDecisions({border:{value:'12% solid red',confirmed}}),/422.*odstotkih/);
 }
 for(const value of ['1px solid #cccccc','0.125rem solid #cccccc','0 solid red','none']){
  const decisions={border:{value,confirmed:true}};
  assert.deepEqual(parseBrandDecisions(decisions),decisions);
 }
 const percentages={fontSize:{value:'120%',confirmed:true},headingSize:{value:'150%',confirmed:true},contentWidth:{value:'90%',confirmed:true},lineHeight:{value:'140%',confirmed:true},headingLineHeight:{value:'120%',confirmed:true},spacing:{value:'2%',confirmed:true},radius:{value:'50%',confirmed:true},buttonPadding:{value:'2% 4%',confirmed:true}};
 assert.deepEqual(parseBrandDecisions(percentages),percentages);
});
test('conflict rebase preserves edited fields, latest unrelated edits, and original evidence',async()=>{
 const {rebaseBrandDraft}=await import('./brand-guide-editing');
 const guide=await extract();const draft={...guide,revision:1,decisions:{accent:{value:'red',confirmed:false},fontSize:{value:'17px',confirmed:false}}};
 const latest={...guide,revision:2,decisions:{accent:{value:'green',confirmed:true},fontSize:{value:'20px',confirmed:true}}};
 const merged=rebaseBrandDraft(draft,latest,['accent']);
 assert.equal(merged.revision,2);assert.deepEqual(merged.decisions.accent,draft.decisions.accent);assert.deepEqual(merged.decisions.fontSize,latest.decisions.fontSize);
 assert.equal(draft.revision,1);assert.equal(latest.decisions.accent.value,'green');assert.deepEqual(merged.observations,guide.observations);
 assert.throws(()=>rebaseBrandDraft(draft,{...latest,artifactId:'other'},['accent']));
});
