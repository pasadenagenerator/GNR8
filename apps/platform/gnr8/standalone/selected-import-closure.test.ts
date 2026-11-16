import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSelectedImportClosure } from './selected-import-closure';
import { requireCurrentSelectedImportClosure } from './read-selected-import-closure';
import { fingerprint } from './publication-contract';
import { loadCapturedContentReview } from '../site/captured-content-review-loader';
import { reviewCapturedRoute } from '../architecture/captured-content-review';
const id='11111111-1111-4111-8111-111111111111';
const review={siteVersionId:id,artifactId:id,routes:[{route:'/',state:'reviewed',items:[{kind:'text',status:'captured',assets:[{status:'captured'}]}],limitations:[]}],omittedLinks:[],limitations:['Prikazane so shranjene poti. Ali zajem vključuje vse strani izvirnega spletišča, še ni preverjeno.']};
const technical={status:'PASS',blockerReasons:[],scope:{outputPaths:['/'],unsupportedCapabilities:[]},evidenceSha256:'a'.repeat(64)};
const run=(changes:Record<string,unknown>={})=>evaluateSelectedImportClosure({review,technical,selectedRoutes:['/'],captureVersionId:id,captureArtifactId:id,...changes} as any);
test('selected route proof binds retained review and technical pass without claiming whole-site completeness',()=>{
 const passed=run();assert.equal(passed.status,'selected_routes_verified');assert.equal(passed.wholeSiteComplete,false);
 assert.equal(run({selectedRoutes:['/','/about']}).status,'blocked');
 assert(run({review:{...review,omittedLinks:[{reference:'/lost'}]}}).blockers.includes('omitted_links_unresolved'));
 assert(run({review:{...review,routes:[{...review.routes[0],items:[{kind:'image',status:'missing',assets:[]}]}]}}).blockers.includes('selected_asset_unverified'));
 assert(run({technical:{...technical,status:'BLOCKED'}}).blockers.includes('technical_review_blocked'));
 assert(run({review:{...review,limitations:[...review.limitations,'Capture limit reached']}}).blockers.includes('capture_limitations_unresolved'));
 assert(run({review:{...review,omittedLinks:[{reference:'tel:123',reasons:['tel'],sourceReferences:['tel:123']}]}}).status==='selected_routes_verified');
 assert(run({review:{...review,omittedLinks:[{reference:'/uploads/a.webp',reasons:['asset_link'],sourceReferences:['/uploads/a.webp']}]}}).blockers.includes('omitted_links_unresolved'));
 assert(run({review:{...review,omittedLinks:[{reference:'/lost',reasons:['depth_limit'],sourceReferences:['/lost']}]}}).blockers.includes('omitted_links_unresolved'));
});
test('real retained HTML can verify selected routes while keeping generic scope notes visible',async()=>{
 const html='<h1>Hello</h1><a href="mailto:hi@example.com">Email</a>';
 const captured=await loadCapturedContentReview({siteId:'site',siteVersionId:id,artifactId:id,
  entryHtmlPath:'index.html',fileMap:{'index.html':{path:'index.html',mediaType:'text/html',sizeBytes:Buffer.byteLength(html),sha256:'a'.repeat(64)}},
  read:async()=>new Response(html),provenance:{multiPageDiscovery:{manifest:{skippedLinks:[
   {originalHref:'mailto:hi@example.com',skippedReason:'mailto'},
   {originalHref:'https://other.example/',skippedReason:'external_host'},
  ],discoveredPages:[]}}} as never});
 assert.equal(captured.routes[0]?.limitations.length,3);
 assert.equal(captured.omittedLinks.length,2);
 const result=run({review:captured});
 assert.equal(result.status,'selected_routes_verified');
 assert.equal(result.wholeSiteComplete,false);
 assert(run({review:{...captured,routes:captured.routes.map(route=>({...route,limitations:[...route.limitations,'Missing retained image']}))}})
  .blockers.includes('selected_route_limited'));
});
test('an unknown source widget cannot silently pass the selected import closure',()=>{
 const route=reviewCapturedRoute({route:'/',sourceUrl:'https://example.com/',filePath:'index.html',
  html:'<main><h1>Saved</h1><div data-widget="booking">Reserve</div></main>',siteId:'site',filePaths:new Set(['index.html'])});
 assert.equal(route.items.find(item=>item.kind==='unknown-widget')?.status,'captured');
 assert.equal(route.items.find(item=>item.kind==='unknown-widget')?.support,'unverified');
 const result=run({review:{...review,routes:[route]}});
 assert.equal(result.status,'blocked');
 assert(result.blockers.includes('selected_widget_unverified'));
});
test('a selected-scope certificate is accepted only for the current complete closure',async()=>{
 const closure=run();
 const confirmation={completeness:{scope:'selected_routes',wholeSiteComplete:false,evidenceSha256:fingerprint(closure)}};
 const read=async()=>closure;
 assert.deepEqual(await requireCurrentSelectedImportClosure({} as any,confirmation as any,read as any),closure);
 await assert.rejects(requireCurrentSelectedImportClosure({} as any,confirmation as any,async()=>({...closure,technicalEvidenceSha256:'b'.repeat(64)}) as any),/confirmation_stale/);
 await assert.rejects(requireCurrentSelectedImportClosure({} as any,confirmation as any,async()=>run({technical:{...technical,status:'BLOCKED'}}) as any),/confirmation_stale/);
 await assert.rejects(requireCurrentSelectedImportClosure({} as any,confirmation as any,async()=>{throw Error('read failed');}),/confirmation_stale/);
 await assert.rejects(requireCurrentSelectedImportClosure({} as any,{...confirmation,completeness:{...confirmation.completeness,wholeSiteComplete:true}} as any,read as any),/confirmation_stale/);
});
