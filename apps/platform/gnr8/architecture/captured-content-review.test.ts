import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { reviewCapturedRoute } from './captured-content-review';
import { loadCapturedContentReview } from '../site/captured-content-review-loader';
const review = (html:string) => reviewCapturedRoute({route:'/',sourceUrl:'https://example.com/',filePath:'index.html',html,siteId:'site_test',filePaths:new Set(['one.webp'])});
test('preserves order, evidence, unknown widgets and unresolved assets without executing source',()=>{
 const r=review('<header><nav><a href="/en">English</a></nav></header><main><h1>Hello</h1><div class="gallery"><a href="one.webp"><img src="one.webp"></a><img src="missing.webp"></div><div data-widget="custom">Unknown</div></main><footer>Contact</footer>');
 const gallery=r.items.find(i=>i.kind==='gallery')!;
 assert.equal(gallery.members.length,2);
 assert.deepEqual(gallery.members,r.items.filter(i=>i.kind==='image').map(i=>i.id));
 assert.equal(r.items.find(i=>i.kind==='link')?.region,'navigation');
 assert.equal(r.items.find(i=>i.kind==='link')?.target,'/en');
 assert.equal(r.items.find(i=>i.kind==='unknown-widget')?.status,'captured');
 assert.equal(r.items.find(i=>i.kind==='unknown-widget')?.support,'unverified');
 assert.equal(r.items.filter(i=>i.kind==='image')[1].status,'missing');
 assert.ok(r.items.every(i=>i.geometry===null));
 assert.deepEqual(review('<p>A</p>').items,review('<p>A</p>').items);
});
test('five slides, video sources and form constraints are retained without claiming supported behavior',()=>{
 const r=review(`<div class="slider">${Array.from({length:5},(_,i)=>`<div class="slide"><p>Slide ${i+1}</p></div>`).join('')}</div><video controls poster="one.webp"><source src="https://example.com/movie.mp4"></video><form action="/contact" method="post"><input name="email" type="email" required><button>Send</button></form>`);
 assert.equal(r.items.find(i=>i.kind==='slider')?.members.length,5);
 assert.equal(r.items.filter(i=>i.kind==='slide').length,5);
 assert.equal(r.items.find(i=>i.kind==='video')?.members.length,1);
 assert.equal(r.items.find(i=>i.kind==='form')?.status,'captured');
 assert.equal(r.items.find(i=>i.kind==='form')?.support,'unverified');
 assert.equal(r.items.find(i=>i.kind==='form')?.target,'/contact');
 assert.equal(r.items.find(i=>i.kind==='field')?.attributes.required,'');
 assert.equal(r.items.find(i=>i.kind==='media-source')?.assets[0].status,'unverified');
});
test('existing retained friend-site fixture remains readable',()=>{
 const r=review(readFileSync(new URL('../validation/fixtures/friend-site-01/index.html',import.meta.url),'utf8'));
 assert.ok(r.items.length>0);assert.ok(r.items.some(i=>i.kind==='form'));
});
test('read failure is visible per route and never becomes an empty success',async()=>{
 const r=await loadCapturedContentReview({siteId:'site_test',siteVersionId:'version',artifactId:'artifact',entryHtmlPath:'index.html',fileMap:{'index.html':{path:'index.html',mediaType:'text/html',sizeBytes:12,sha256:'x'}},provenance:null,read:async()=>new Response('',{status:500})});
 assert.equal(r.routes.length,1);assert.equal(r.routes[0].items.length,0);assert.match(r.routes[0].limitations[0],/could not be read/);
});
test('reviews every route in a 32-page retained import within the bounded HTML budget',async()=>{
 const routeMap=Array.from({length:31},(_,i)=>({status:'assembled',routePath:`/page-${i+1}`,rawFilePath:`pages/page-${i+1}.html`,sourceUrl:`https://example.com/page-${i+1}`,finalUrl:`https://example.com/page-${i+1}`}));
 const fileMap=Object.fromEntries(['index.html',...routeMap.map(r=>r.rawFilePath)].map(path=>[path,{path,mediaType:'text/html',sizeBytes:27,sha256:'x'}]));
 const provenance={multiPageDiscovery:{rawArtifactAssembly:{enabled:true,routeMap}}};
 const read:string[]=[];
 const result=await loadCapturedContentReview({siteId:'site_test',siteVersionId:'version',artifactId:'artifact',entryHtmlPath:'index.html',fileMap,provenance:provenance as any,read:async path=>{read.push(path);return new Response('<main><h1>Saved</h1></main>');}});
 assert.equal(result.routes.length,32);assert.equal(result.routes.filter(r=>r.state==='reviewed').length,32);
 assert.equal(read.length,32);assert.ok(!result.limitations.some(s=>s.includes('first 30')));
});

test('CSS transforms never imply a form and gallery anchors are not gallery widgets',()=>{
 const r=review('<html class="csstransforms csstransforms3d"><body><a id="gallery"></a><div class="gallery"><img src="one.webp"></div></body></html>');
 assert.equal(r.items.filter(i=>i.kind.includes('form')).length,0);
 assert.equal(r.items.filter(i=>i.kind==='gallery').length,1);
});

test('retained Ladja Žaba: all routes, gallery order and source identity', {skip:!process.env.GNR8_RETAINED_REVIEW_DIR}, async()=>{
 const {createHash}=await import('node:crypto');
 const dir=process.env.GNR8_RETAINED_REVIEW_DIR!;
 const a=JSON.parse(readFileSync(dir+'/artifact.json','utf8'));
 const assembly=JSON.parse(readFileSync(dir+'/files/multipage-raw-artifact-assembly/manifest.json','utf8'));
 const acquisition=JSON.parse(readFileSync(dir+'/files/multipage-html-acquisition/manifest.json','utf8'));
 const r=await loadCapturedContentReview({siteId:a.site_id,siteVersionId:a.site_version_id,artifactId:a.id,entryHtmlPath:'index.html',fileMap:a.file_map,provenance:{multiPageDiscovery:{rawArtifactAssembly:assembly,acquisition}} as never,read:async path=>{
  const bytes=readFileSync(dir+'/files/'+path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),a.file_map[path].sha256);
  assert.equal(bytes.length,a.file_map[path].sizeBytes);
  return new Response(new Uint8Array(bytes));
 }});
 assert.deepEqual(r.routes.map(route=>route.route),['/','/en','/it']);
 for(const route of r.routes){
  const gallery=route.items.find(i=>i.kind==='gallery')!;
  assert.equal(gallery.members.length,15);
  assert.deepEqual(gallery.members,route.items.filter(i=>i.kind==='image'&&gallery.members.includes(i.id)).map(i=>i.id));
  assert.equal(route.items.filter(i=>i.kind==='form'||i.kind==='detector:form').length,0);
  assert.ok(route.sourceUrl?.startsWith('https://'));
  assert.ok(route.items.some(i=>i.region==='footer'));
 }
});

test('image navigation is not a missing asset, but full gallery images are checked',()=>{
 const nav=review('<a href="/booking"><img src="one.webp"></a>');
 assert.equal(nav.items.find(i=>i.kind==='link')?.status,'captured');
 assert.equal(nav.items.find(i=>i.kind==='link')?.assets.length,0);
 const gallery=review('<div class="gallery"><a href="missing-full.webp"><img src="one.webp"></a></div>');
 assert.equal(gallery.items.find(i=>i.kind==='link')?.status,'missing');
});
test('srcset alternatives, inline CSS and empty media have honest capture states',()=>{
 const r=review('<picture><source srcset="one.webp 1x, missing.webp 2x"><img src="one.webp"></picture><img data-srcset="one.webp,missing.webp"><img><div style="background-image:url(missing-bg.webp)"></div><i class="fa fa-phone"></i>');
 assert.deepEqual(r.items.find(i=>i.kind==='media-source')?.assets.map(a=>a.reference),['one.webp','missing.webp']);
 assert.equal(r.items.find(i=>i.kind==='media-source')?.status,'missing');
 assert.equal(r.items.filter(i=>i.kind==='image')[1].status,'missing');
 assert.equal(r.items.filter(i=>i.kind==='image')[2].status,'unverified');
 assert.equal(r.items.find(i=>i.kind==='background')?.status,'missing');
 assert.equal(r.items.find(i=>i.kind==='icon')?.status,'unverified');
 assert.equal(r.coverage.length,4);
 const data=review('<img srcset="data:image/png;base64,AAAA 1x, one.webp 2x">');
 assert.deepEqual(data.items[0].assets.map(a=>a.reference),['data:image/png;base64,AAAA','one.webp']);
});
test('Swiper has one actual slider, five slides, and no duplicate class detector widget',()=>{
 const r=review('<div class="swiper">'+Array.from({length:5},(_,i)=>'<div class="swiper-slide">'+i+'</div>').join('')+'</div>');
 assert.equal(r.items.filter(i=>i.kind==='slider').length,1);
 assert.equal(r.items.filter(i=>i.kind==='slide').length,5);
 assert.deepEqual(r.items.find(i=>i.kind==='slider')?.members,r.items.filter(i=>i.kind==='slide').map(i=>i.id));
 assert.equal(r.items.filter(i=>i.evidence==='detector').length,0);
 assert.equal(r.items.find(i=>i.kind==='slider')?.status,'captured');
 assert.equal(r.items.find(i=>i.kind==='slider')?.support,'unverified');
});
test('known failed, excluded and discovered-only routes remain visible with original reasons',async()=>{
 const r=await loadCapturedContentReview({siteId:'s',siteVersionId:'v',artifactId:'a',entryHtmlPath:'index.html',fileMap:{'index.html':{path:'index.html',mediaType:'text/html',sizeBytes:12,sha256:'x'}},read:async()=>new Response('<p>Hello</p>'),provenance:{multiPageDiscovery:{rawArtifactAssembly:{enabled:true,routeMap:[],excludedPages:[{routePath:'/excluded',sourceUrl:'https://example.com/excluded',reason:'duplicate_body'}],failedPages:[{normalizedRoutePath:'/failed',normalizedUrl:'https://example.com/failed',status:'failed',failureReason:'timeout'}]},manifest:{skippedLinks:[{normalizedRoutePath:'/skip',skippedReason:'depth_limit'}],discoveredPages:[{normalizedRoutePath:'/pending',normalizedUrl:'https://example.com/pending'}],limitsApplied:{maxDepth:2}}}} as never});
 assert.equal(r.routes.find(x=>x.route==='/failed')?.state,'failed');
 assert.match(r.routes.find(x=>x.route==='/failed')!.limitations.join(),/timeout/);
 assert.equal(r.routes.find(x=>x.route==='/excluded')?.state,'excluded');
 assert.match(r.routes.find(x=>x.route==='/excluded')!.limitations.join(),/duplicate_body/);
 assert.equal(r.routes.find(x=>x.route==='/skip')?.state,'excluded');
 assert.equal(r.routes.find(x=>x.route==='/pending')?.state,'unverified');
 assert.ok(r.limitations.some(s=>s.includes('maxDepth')));
});

test('non-page omissions are grouped across acquisition and discovery, never shown as missing pages',async()=>{
 const r=await loadCapturedContentReview({siteId:'s',siteVersionId:'v',artifactId:'a',entryHtmlPath:'index.html',fileMap:{'index.html':{path:'index.html',mediaType:'text/html',sizeBytes:12,sha256:'x'}},read:async()=>new Response('<p>Hello</p>'),provenance:{multiPageDiscovery:{acquisition:{seedUrl:'https://www.example.com/',pages:[{originalHref:'/uploads/a.webp',normalizedRoutePath:'/uploads/a.webp',status:'skipped',skippedReason:'discovery_asset_link'}]},manifest:{skippedLinks:[{originalHref:'/uploads/a.webp',absoluteUrl:'https://example.com/uploads/a.webp',skippedReason:'asset_link'},{originalHref:'tel:123',skippedReason:'tel'}],discoveredPages:[]}}} as never});
 assert.deepEqual(r.routes.map(x=>x.route),['/']);
 assert.equal(r.omittedLinks.length,2);
 assert.equal(r.omittedLinks[0].reasons.length,2);
});

test('failed acquisition outranks exclusion while a retained reviewed route stays reviewed',async()=>{
 const r=await loadCapturedContentReview({siteId:'s',siteVersionId:'v',artifactId:'a',entryHtmlPath:'index.html',fileMap:{'index.html':{path:'index.html',mediaType:'text/html',sizeBytes:12,sha256:'x'}},read:async()=>new Response('<p>Hello</p>'),provenance:{multiPageDiscovery:{rawArtifactAssembly:{enabled:true,routeMap:[],excludedPages:[{routePath:'/problem',reason:'duplicate_body'},{routePath:'/',reason:'duplicate_body'}],failedPages:[{normalizedRoutePath:'/problem',status:'failed',failureReason:'timeout'},{normalizedRoutePath:'/',status:'failed',failureReason:'older_attempt'}]}}} as never});
 assert.equal(r.routes.find(x=>x.route==='/problem')?.state,'failed');
 assert.match(r.routes.find(x=>x.route==='/problem')!.limitations.join(),/duplicate_body.*timeout/);
 assert.equal(r.routes.find(x=>x.route==='/')?.state,'reviewed');
 assert.match(r.routes[0].coverage[0].detail,/Sklicev na datoteke vzorcev sloga: 0/);
});
