import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatedArtifactGitPackage} from './generated-artifact-git-archive';
import {GeneratedArtifactGitCache,generatedArtifactReferenceColumns} from './generated-artifact-git-cache';
import {sha256Hex,stableStringify} from '../runtime/deterministic';

const version='44444444-4444-4444-8444-444444444444';
const input={scope:{agencyId:'11111111-1111-4111-8111-111111111111',
  clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'},
  runtimeSiteId:'site_123',siteVersionId:version,htmlByPath:{'/':'<h1>Home</h1>','/about':'<h1>About</h1>'},
  compiledTokenStyles:'body{color:red}',manifest:{kind:'preview',
    sourceMigrationPayload:{pages:[{contentModel:{title:'Imported source text'}}],
      importProvenanceSummary:{semanticImport:{hero:{title:'Imported source text'}}}},
    sourceMigrationPayloadSha256:sha256Hex(stableStringify({
      pages:[{contentModel:{title:'Imported source text'}}],
      importProvenanceSummary:{semanticImport:{hero:{title:'Imported source text'}}}})),
    cmsSlotSources:[{slotKey:'hero.title',sourceText:'Original title'}],cmsSlotSourcesVersion:'v1',
    cmsSlotSourcesCount:1,cmsSlotSourcesSha256:sha256Hex(stableStringify([{slotKey:'hero.title',sourceText:'Original title'}])),
    generatedOutputSourceWorkspace:{
    adapterId:'astro-static-site',files:[{path:'src/index.astro',role:'page',
      contents:'<h1>Source</h1>',bytes:15,sha256:'a'.repeat(64)}]}},
  target:{owner:'owner',ownerId:10,repository:'site',repositoryId:12,token:'token'}};

test('verified private cache reads one generated route and rejects corruption or public storage',async()=>{
  const pkg=generatedArtifactGitPackage(input);
  assert.match(pkg.gitFiles.find(file=>file.path===pkg.descriptor.runtimeManifest.path)!.body.toString(),
    /Imported source text/);
  const ref={scope:input.scope,repository:'owner/site',commit:'a'.repeat(40),
    manifestPath:pkg.manifestPath,manifestSha256:pkg.manifestSha256,
    routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,runtimeManifest:pkg.descriptor.runtimeManifest};
  const objects=new Map<string,Buffer>();let publicBucket=false,downloads=0;
  const client={storage:{getBucket:async()=>({data:{public:publicBucket},error:null}),from:()=>({
    upload:async(key:string,body:Buffer)=>{objects.set(key,Buffer.from(body));return {error:null};},
    download:async(key:string)=>{downloads++;const body=objects.get(key);return {data:body?new Blob([new Uint8Array(body)]):null,error:body?null:Error('missing')};},
  })}};
  const cache=new GeneratedArtifactGitCache(client as never,'private-assets');
  const columns=generatedArtifactReferenceColumns({siteVersionId:version,
    htmlByPath:input.htmlByPath,compiledTokenStyles:input.compiledTokenStyles,
    manifest:{...input.manifest,generatedGitArchive:ref}});
  assert.deepEqual(Object.keys(columns.htmlByPath).sort(),['/','/about']);
  assert.equal(columns.compiledTokenStyles,'');
  assert.equal('cmsSlotSources' in columns.manifest,false);
  assert.equal('sourceMigrationPayload' in columns.manifest,false);
  assert.deepEqual((columns.manifest.generatedOutputSourceWorkspace as {files:unknown[]}).files,[{
    path:'src/index.astro',role:'page',bytes:15,sha256:'a'.repeat(64)}]);
  assert.notEqual(columns.htmlByPath['/'],input.htmlByPath['/']);
  assert.throws(()=>generatedArtifactReferenceColumns({siteVersionId:version,
    htmlByPath:{...input.htmlByPath,'/':'changed'},compiledTokenStyles:input.compiledTokenStyles,
    manifest:{...input.manifest,generatedGitArchive:ref}}),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
  assert.throws(()=>generatedArtifactReferenceColumns({siteVersionId:version,
    htmlByPath:input.htmlByPath,compiledTokenStyles:input.compiledTokenStyles,
    manifest:{...input.manifest,sourceMigrationPayloadSha256:'0'.repeat(64),generatedGitArchive:ref}}),
    /GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
  await cache.prepare(ref,version,input);
  assert.deepEqual(await cache.restoreManifest(ref,version,columns.manifest),
    {...input.manifest,generatedGitArchive:ref});
  await assert.rejects(cache.restoreManifest(ref,version,{...columns.manifest,kind:'changed'}),
    /GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
  downloads=0;
  assert.equal(await cache.readRoute(ref,version,'/about'),'<h1>About</h1>');
  assert.equal(downloads,1,'one route does not download the full package');
  downloads=0;
  assert.deepEqual(await cache.hydrate(ref,version,'/about'),{
    htmlByPath:{'/about':'<h1>About</h1>'},compiledTokenStyles:'body{color:red}'});
  assert.equal(downloads,2,'serving reads one HTML page and CSS');
  downloads=0;
  assert.deepEqual(Object.keys((await cache.hydrate(ref,version)).htmlByPath).sort(),['/','/about']);
  assert.equal(downloads,3,'admin read restores all pages and CSS');
  const about=ref.routes.find(route=>route.route==='/about')!;
  const key=[...objects.keys()].find(key=>key.endsWith(`/${about.sha256}`))!;
  objects.set(key,Buffer.from('corrupt'));
  await assert.rejects(cache.readRoute(ref,version,'/about'),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
  publicBucket=true;
  await assert.rejects(new GeneratedArtifactGitCache(client as never,'private-assets').readRoute(ref,version,'/'),
    /GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
});

test('resource cache restores exact bytes and fails closed on a changed object',async()=>{
  const body=Buffer.from('<svg><path d="M0 0"/></svg>');
  const file={path:'_astro/icon.svg',mediaType:'image/svg+xml',sizeBytes:body.length,
    sha256:createHash('sha256').update(body).digest('hex'),base64:body.toString('base64')};
  const artifact={...input,exportedFiles:[file]};
  const pkg=generatedArtifactGitPackage(artifact);
  const ref={scope:input.scope,repository:'owner/site',commit:'a'.repeat(40),
    manifestPath:pkg.manifestPath,manifestSha256:pkg.manifestSha256,
    routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,
    runtimeManifest:pkg.descriptor.runtimeManifest,resources:pkg.descriptor.resources!};
  const objects=new Map<string,Buffer>();
  const client={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async(key:string,bytes:Buffer)=>{objects.set(key,Buffer.from(bytes));return {error:null};},
    download:async(key:string)=>{const bytes=objects.get(key);return {data:bytes?new Blob([new Uint8Array(bytes)]):null,
      error:bytes?null:Error('missing')};},
  })}};
  const cache=new GeneratedArtifactGitCache(client as never,'private-assets');
  await cache.prepare(ref,version,artifact);
  assert.deepEqual(await cache.hydrateResources(ref,version),[file]);
  const key=[...objects.keys()].find(item=>item.endsWith(`/${file.sha256}`))!;
  objects.set(key,Buffer.from('changed'));
  await assert.rejects(cache.hydrateResources(ref,version),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
});

test('missing private derivative restores only the pinned Git file and rejects mismatched source',async()=>{
  const pkg=generatedArtifactGitPackage(input);
  const ref={scope:input.scope,repository:'owner/site',commit:'a'.repeat(40),
    manifestPath:pkg.manifestPath,manifestSha256:pkg.manifestSha256,
    routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,runtimeManifest:pkg.descriptor.runtimeManifest};
  const objects=new Map<string,Buffer>();let uploadBlocked=false;
  const client={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async(key:string,body:Buffer)=>{if(uploadBlocked)throw Error('cache unavailable');
      objects.set(key,Buffer.from(body));return {error:null};},
    download:async(key:string)=>{const body=objects.get(key);return {data:body?new Blob([new Uint8Array(body)]):null,
      error:body?null:Error('missing')};},
  })}};
  const files=new Map(pkg.gitFiles.map(file=>[file.path,Buffer.from(file.body)]));
  let reads=0,verified=0,targetRepository='site';
  const recovery={resolveTarget:async()=>({...input.target,repository:targetRepository}),
    verifyTarget:async()=>{verified++;},
    read:async(request:{owner:string;repository:string;branch:string;commit:string})=>{
      assert.deepEqual(request,{owner:'owner',repository:'site',
        branch:`artifacts/${version}/${ref.manifestSha256}`,commit:ref.commit,
        token:'token'});
      reads++;return {commit:ref.commit,parent:'b'.repeat(40),parentCount:1,files};}};
  const cache=new GeneratedArtifactGitCache(client as never,'private-assets',recovery as never);
  assert.equal(await cache.readRoute(ref,version,'/about'),'<h1>About</h1>');
  assert.equal(reads,1);
  assert.equal(verified,1);
  assert.equal(await cache.readRoute(ref,version,'/about'),'<h1>About</h1>');
  assert.equal(reads,1,'restored derivative avoids another Git read');
  const about=ref.routes.find(route=>route.route==='/about')!;
  const key=[...objects.keys()].find(key=>key.endsWith(`/${about.sha256}`))!;
  objects.set(key,Buffer.from('corrupt'));
  await assert.rejects(cache.readRoute(ref,version,'/about'),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
  assert.equal(reads,1,'corruption must not trigger recovery');
  objects.delete(key);
  targetRepository='other';
  await assert.rejects(cache.readRoute(ref,version,'/about'),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
  assert.equal(reads,1,'wrong site repository must not be read');
  targetRepository='site';
  files.set(about.path,Buffer.from('changed'));
  await assert.rejects(cache.readRoute(ref,version,'/about'),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
  files.set(about.path,Buffer.from(input.htmlByPath['/about']));uploadBlocked=true;
  await assert.rejects(cache.readRoute(ref,version,'/about'),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
});
