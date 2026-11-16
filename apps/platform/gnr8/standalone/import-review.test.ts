import test from 'node:test';
import assert from 'node:assert/strict';
import {createImportReviewRoutes,importReviewDependencies} from './import-review-routes';
import {requireConfirmedImport} from './publication-foundation';
import {publicationSelectionForArtifact} from './publication-contract';
import {createGeneratedOutputBuildEvidence,createGeneratedOutputContentManifest} from '../output-adapters/generated-output-eligibility';
import {ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION} from '../output-adapters/astro-static-site-internal-preview-bridge';
import {ASTRO_STATIC_EXPORT_MANIFEST_VERSION} from '../output-adapters/astro-static-site-build-export-proof';
import type {ImportReviewModel} from './import-review';
import {fingerprint} from './publication-contract';
const id=(n:number)=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const scope={agencyId:id(1),clientId:id(2),siteId:id(3),siteVersionId:id(4)},captureId=id(5),rawId=id(6),sha='a'.repeat(64);
const paths=Array.from({length:32},(_,i)=>i?`/page-${i}`:'/').sort((a,b)=>a.localeCompare(b));
function fixture(unsupportedCapabilities=['dynamic widget']){
 const content=createGeneratedOutputContentManifest({sourceRef:'retained',scope:{kind:'static_site',outputPaths:paths,unsupportedCapabilities,allowedPublishStages:['production']},requiredAssets:[],requiredContent:[],requiredNavigation:[]});
 const build=createGeneratedOutputBuildEvidence({establishedBy:'server_astro_build_export_pipeline',proofVersion:'gnr8-astro-build-export-proof:v1',candidateId:'candidate',candidateContentSha256:sha,candidateStorageSha256:sha,
  producerKind:'stacki_saved_source_build_export_bridge',producerVersion:'v1',adapterId:'astro-static-site',conversionVersion:ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,exportManifestVersion:ASTRO_STATIC_EXPORT_MANIFEST_VERSION,rendererCompatibilityVersion:'v1',
  sourceCapture:{sourceUrl:'https://example.com',snapshotId:'snapshot',snapshotRunId:'run',capturedAt:'2026-11-05T10:00:00.000Z',runtimeSiteId:'runtime',siteVersionId:captureId,artifactId:id(9),artifactBundleSha256:sha,htmlSha256:sha},
  toolVersions:{node:'26.13.0',pnpm:'10.28.2',astro:'7.4.4'},buildExecution:{receiptSha256:sha,installationCompleted:true,buildCompleted:true,sourceUnchanged:true,cleanupCompleted:true,workspaceRemoved:true,cleanupErrorCount:0},submissionAttestation:{mode:'direct_server_execution',operationId:'local-test',packageSha256:sha,submittedByActorId:id(8),receivedAt:'2026-11-05T10:00:00.000Z'},
  buildCompletedAt:'2026-11-05T10:00:00.000Z',sourceSnapshotSha256:sha,exportSha256:sha,outputPaths:paths,assetFingerprintMapSha256:sha,contentManifestSourceRef:content.sourceRef,derivedFromEvidenceSha256:null});
 const source={artifact:{id:id(7),bundleSha256:sha,manifest:{generatedOutputSourceWorkspace:{adapterId:'astro-static-site',stackiRevision:{scope,revision:2,sha256:sha}},generatedOutputBuildEvidence:build,generatedOutputContentManifest:content}}};
 let provenance:Record<string,unknown>={capture:{retain:'all fields'}},updatedAt='2026-11-05T10:00:00.000Z',writes=0,reads=0,deny:string|null=null,conflict=false;
 let selectedClosure:ImportReviewModel['selectedClosure']=null;
 const authorized:string[]=[];
 const db={from(table:string){reads++;let update:Record<string,unknown>|null=null;const filters:Record<string,string>={};
  const q={select(){if(update){assert.equal(table,'gnr8_runtime_site_versions');assert.equal(filters.id,captureId);assert.equal(filters.site_id,'runtime');const ok=!conflict&&filters.updated_at===updatedAt;if(ok){provenance=update.import_provenance_summary as Record<string,unknown>;updatedAt=update.updated_at as string;writes++;}return Promise.resolve({data:ok?[{id:captureId}]:[],error:null});}return q;},
   eq(k:string,v:string){filters[k]=v;return q;},update(v:Record<string,unknown>){update=v;return q;},async single(){return {error:null,data:table==='gnr8_runtime_site_versions'?{import_provenance_summary:structuredClone(provenance),updated_at:updatedAt}:{id:rawId,file_map:{'index.html':{sha256:sha}},entry_html_path:'index.html'}};}};return q;
 }};
 const deps={...importReviewDependencies,authorize:async(_scope:unknown,versionId:string)=>{authorized.push(versionId);if(deny===versionId)throw Error('403|Dostop zavrnjen.');return {userId:id(8)};},readSource:async()=>{reads++;return structuredClone(source);},client:()=>db,readSelectedClosure:async()=>selectedClosure};
 const routes=createImportReviewRoutes(deps as unknown as typeof importReviewDependencies),context={params:Promise.resolve(scope)};
 const selection={siteVersionId:scope.siteVersionId,artifactId:source.artifact.id,artifactBundleSha256:sha};
 const url=`https://app.test/review?agencyId=${scope.agencyId}`;
 const get=()=>routes.GET(new Request(url+'&'+new URLSearchParams(selection)),context);
 const post=(body:Record<string,unknown>,origin='https://app.test')=>routes.POST(new Request(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({...selection,...body})}),context);
 const read=async()=>{const r=await get();assert.equal(r.status,200,JSON.stringify(await r.clone().json()));return (await r.json()).data as ImportReviewModel;};
 const save=(m:ImportReviewModel,extra:Record<string,unknown>={})=>post({token:m.token,routes:m.routes,brandConfirmed:false,...extra});
 return {get,read,post,save,source,authorized,selection,get provenance(){return provenance;},get writes(){return writes;},get reads(){return reads;},set deny(v:string|null){deny=v;},set conflict(v:boolean){conflict=v;},setClosure(v:ImportReviewModel['selectedClosure']){selectedClosure=v;},touch(){updatedAt=new Date(Date.parse(updatedAt)+1).toISOString();}};
}
test('selected-route evidence is visible and a changed result invalidates the old review token',async()=>{
 const f=fixture(),before=await f.read();
 f.setClosure({kind:'gnr8-selected-import-closure:v1',status:'blocked',blockers:['selected_asset_unverified'],selectedRoutes:paths,
  technicalEvidenceSha256:sha,captureReviewSha256:sha,wholeSiteComplete:false});
 const after=await f.read();assert.equal(after.selectedClosure?.status,'blocked');assert.notEqual(after.token,before.token);
 assert.equal((await f.save(before)).status,409);
});
test('save and reopen all 32 route decisions without certifying completeness or changing source',async()=>{
 const f=fixture(),m=await f.read(),source=structuredClone(f.source);
 assert.equal(m.routes.length,32);assert.equal(m.revision,2);assert.ok(m.routes.every(r=>!r.contentConfirmed&&!r.layoutConfirmed));
 m.routes[31]!.contentConfirmed=true;m.routes[0]!.layoutConfirmed=true;
 f.provenance.confirmedImport={old:'certificate'};
 assert.equal((await f.save(m)).status,200);
 const reopened=await f.read();assert.deepEqual(reopened.routes,m.routes);assert.equal(reopened.completeness,'unverified');assert.match(reopened.blockers.join(),/dynamic widget/);
 assert.deepEqual(f.provenance.capture,{retain:'all fields'});assert.equal(f.provenance.confirmedImport,undefined);assert.deepEqual(f.source,source);
 assert.throws(()=>requireConfirmedImport({selection:publicationSelectionForArtifact(scope,f.source.artifact),routes:paths,unsupportedCapabilities:[],captureVersionId:captureId,captureArtifactId:rawId,provenance:f.provenance}),/confirmation_missing/);
 reopened.routes[0]!.layoutConfirmed=false;assert.equal((await f.save(reopened)).status,200);assert.equal((await f.read()).routes[0]!.layoutConfirmed,false);
});
test('malformed, forged, incomplete, duplicate and foreign-route submissions never write',async()=>{
 const f=fixture(),m=await f.read();
 for(const extra of [{routes:m.routes.slice(1)},{routes:m.routes.map(()=>m.routes[0])},{routes:[{...m.routes[0],path:'/foreign'},...m.routes.slice(1)]},{routes:[{...m.routes[0],contentConfirmed:'true'},...m.routes.slice(1)]},{brandConfirmed:true},{actor:id(99)},{completeness:{status:'complete'}},{confirmedImport:{}}])assert.equal((await f.save(m,extra)).status,422);
 assert.equal(f.writes,0);
});
test('stale tab and concurrent Brand update are rejected by token and CAS',async()=>{
 const f=fixture(),m=await f.read();assert.equal((await f.save(m)).status,200);assert.equal((await f.save(m)).status,409);
 const next=await f.read();f.touch();assert.equal((await f.save(next)).status,409);
 const fresh=await f.read();f.conflict=true;assert.equal((await f.save(fresh)).status,409);assert.equal(f.writes,1);
});
test('source or Brand change clears earlier decisions and prevents stale writes',async()=>{
 const f=fixture(),m=await f.read();m.routes[0]!.contentConfirmed=true;await f.save(m);
 let previous=await f.read();f.provenance.brandStyleGuide={revision:2};let current=await f.read();assert.equal(current.stale,true);assert.ok(current.routes.every(r=>!r.contentConfirmed));assert.equal((await f.save(previous)).status,409);
 await f.save(current);previous=await f.read();f.source.artifact.manifest.generatedOutputSourceWorkspace.stackiRevision.revision=5;
 current=await f.read();assert.equal(current.revision,5);assert.equal(current.stale,true);assert.equal((await f.save(previous)).status,409);
});
test('authorization covers selected version, lineage and capture; wrong origin fails before reads',async()=>{
 for(const denied of [scope.siteVersionId,captureId]){const f=fixture();f.deny=denied;assert.equal((await f.get()).status,403);assert.equal(f.writes,0);}
 const f=fixture();const response=await f.post({},'https://other.test');assert.equal(response.status,403);assert.equal(f.reads,0);
 const m=await f.read();assert.ok(f.authorized.includes(captureId));
 assert.equal((await f.save(m,{artifactBundleSha256:'b'.repeat(64)})).status,409);
 f.source.artifact.manifest.generatedOutputSourceWorkspace.stackiRevision.scope={...scope,agencyId:id(90)};
 assert.equal((await f.get()).status,404);assert.equal(f.writes,0);
 const lineage=fixture();lineage.source.artifact.manifest.generatedOutputSourceWorkspace.stackiRevision.scope={...scope,siteVersionId:id(10)};lineage.deny=id(10);
 assert.equal((await lineage.get()).status,403);assert.equal(lineage.writes,0);
});
test('modified build or content evidence cannot become a reviewable selection',async()=>{
 const f=fixture();f.source.artifact.manifest.generatedOutputBuildEvidence.sourceCapture.siteVersionId=id(99);
 assert.equal((await f.get()).status,409);assert.equal(f.writes,0);
 const content=fixture();content.source.artifact.manifest.generatedOutputContentManifest.scope.outputPaths.pop();
 assert.equal((await content.get()).status,409);assert.equal(content.writes,0);
});
test('Brand acceptance binds displayed values and revision and remains a user review only',async()=>{
 const f=fixture();
 const values={logo:'logo.svg',logoPosition:'left',background:'white',text:'black',accent:'red',fontFamily:'Arial',fontSize:'16px',fontWeight:'400',lineHeight:'1.5',headingFamily:'Arial',headingSize:'32px',headingWeight:'700',headingLineHeight:'1.2',spacing:'16px',contentWidth:'1200px',border:'none',radius:'0',shadow:'none',buttonBackground:'red',buttonText:'white',buttonPadding:'16px',breakpoints:'600px, 1200px'};
 const brand={kind:'brand_style_guide_v1',siteVersionId:captureId,artifactId:rawId,revision:1,savedAt:'2026-11-05T10:00:00.000Z',savedBy:id(8),decisions:Object.fromEntries(Object.entries(values).map(([k,value])=>[k,{value,confirmed:true}]))};
 f.provenance.brandStyleGuide=brand;
 const m=await f.read();assert.equal(m.brand.ready,true);assert.equal(m.brand.values.length,22);assert.equal(m.brand.confirmed,false);
 assert.equal((await f.save(m,{brandConfirmed:true})).status,200);const reopened=await f.read();assert.equal(reopened.brand.confirmed,true);assert.equal(f.provenance.confirmedImport,undefined);
 (f.provenance.brandStyleGuide as typeof brand).revision++;assert.equal((await f.save(reopened,{brandConfirmed:true})).status,409);assert.equal((await f.read()).brand.confirmed,false);
});
test('explicit selected-scope confirmation persists only after a complete current review',async()=>{
 const f=fixture([]);
 const values={logo:'logo.svg',logoPosition:'left',background:'white',text:'black',accent:'red',fontFamily:'Arial',fontSize:'16px',fontWeight:'400',lineHeight:'1.5',headingFamily:'Arial',headingSize:'32px',headingWeight:'700',headingLineHeight:'1.2',spacing:'16px',contentWidth:'1200px',border:'none',radius:'0',shadow:'none',buttonBackground:'red',buttonText:'white',buttonPadding:'16px',breakpoints:'600px, 1200px'};
 f.provenance.brandStyleGuide={kind:'brand_style_guide_v1',siteVersionId:captureId,artifactId:rawId,
  revision:1,savedAt:'2026-11-05T10:00:00.000Z',savedBy:id(8),
  decisions:Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value,confirmed:true}]))};
 f.setClosure({kind:'gnr8-selected-import-closure:v1',status:'selected_routes_verified',blockers:[],selectedRoutes:paths,
  technicalEvidenceSha256:sha,captureReviewSha256:sha,wholeSiteComplete:false});
 let m=await f.read();
 assert.equal((await f.post({action:'confirm',token:m.token,scopeConfirmed:true,functionsConfirmed:true})).status,409);
 m.routes=m.routes.map(route=>({...route,contentConfirmed:true,layoutConfirmed:true}));
 assert.equal((await f.save(m,{brandConfirmed:true})).status,200);
 m=await f.read();
 assert.equal((await f.post({action:'confirm',token:m.token,scopeConfirmed:false,functionsConfirmed:true})).status,422);
 assert.equal((await f.post({action:'confirm',token:m.token,scopeConfirmed:true})).status,422);
 assert.equal((await f.post({action:'confirm',token:m.token,scopeConfirmed:true,functionsConfirmed:false})).status,422);
 assert.equal((await f.post({action:'confirm',token:m.token,scopeConfirmed:true,functionsConfirmed:true})).status,200);
 const confirmed=await f.read();
 assert.ok(confirmed.confirmedAt);
 const cert=f.provenance.confirmedImport as {functionsConfirmed:boolean;completeness:{scope:string;wholeSiteComplete:boolean;evidenceSha256:string}};
 assert.equal(cert.functionsConfirmed,true);
 assert.equal(cert.completeness.scope,'selected_routes');
 assert.equal(cert.completeness.wholeSiteComplete,false);
 assert.equal(cert.completeness.evidenceSha256,fingerprint(confirmed.selectedClosure));
 assert.ok(requireConfirmedImport({selection:publicationSelectionForArtifact(scope,f.source.artifact),routes:paths,
  unsupportedCapabilities:[],captureVersionId:captureId,captureArtifactId:rawId,provenance:f.provenance}).confirmationSha256);
 f.setClosure({...confirmed.selectedClosure!,technicalEvidenceSha256:'b'.repeat(64)});
 assert.equal((await f.read()).confirmedAt,null);
 assert.equal((await f.post({action:'confirm',token:confirmed.token,scopeConfirmed:true,functionsConfirmed:true})).status,409);
});
test('unsupported output cannot be certified even if a closure result is supplied',async()=>{
 const f=fixture();
 f.setClosure({kind:'gnr8-selected-import-closure:v1',status:'selected_routes_verified',blockers:[],selectedRoutes:paths,
  technicalEvidenceSha256:sha,captureReviewSha256:sha,wholeSiteComplete:false});
 const m=await f.read();
 assert.equal(m.unsupportedCapabilities.length,1);
 assert.equal((await f.post({action:'confirm',token:m.token,scopeConfirmed:true,functionsConfirmed:true})).status,409);
 assert.equal(f.writes,0);
});
