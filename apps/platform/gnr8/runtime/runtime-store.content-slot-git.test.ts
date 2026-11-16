import assert from 'node:assert/strict';
import test from 'node:test';
import {sha256Hex,stableStringify} from './deterministic';
import {generatedArtifactGitPackage} from '../site/generated-artifact-git-archive';
import {GeneratedArtifactGitCache,generatedArtifactReferenceColumns} from '../site/generated-artifact-git-cache';

test('Git-backed content slots restore exact original text without database copies',async t=>{
  const envKeys=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET'] as const;
  const previous=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
  t.after(()=>{for(const key of envKeys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];});
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_SERVICE_ROLE_KEY:'local-test-only',
    GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET:'private-assets'});
  const version='44444444-4444-4444-8444-444444444444';
  const sources=[{slotKey:'hero.title',sourceText:'Original title'},{slotKey:'hero.cta.href',sourceText:'https://example.com'}];
  const manifest={kind:'raw-import',cmsSlotSources:sources,cmsSlotSourcesVersion:'v1',
    cmsSlotSourcesCount:sources.length,cmsSlotSourcesSha256:sha256Hex(stableStringify(sources))};
  const input={scope:{agencyId:'11111111-1111-4111-8111-111111111111',
    clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'},
    runtimeSiteId:'site_123',siteVersionId:version,htmlByPath:{'/':'<h1>Original title</h1>'},
    compiledTokenStyles:'',manifest,target:{owner:'owner',ownerId:1,repository:'site',repositoryId:1,token:'local'}};
  const pkg=generatedArtifactGitPackage(input);
  const ref={scope:input.scope,repository:'owner/site',commit:'a'.repeat(40),manifestPath:pkg.manifestPath,
    manifestSha256:pkg.manifestSha256,routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,
    runtimeManifest:pkg.descriptor.runtimeManifest};
  const objects=new Map<string,Buffer>();
  const storage={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async(key:string,body:Buffer)=>{objects.set(key,Buffer.from(body));return {error:null};},
    download:async(key:string)=>{const body=objects.get(key);return {data:body?new Blob([new Uint8Array(body)]):null,
      error:body?null:Error('missing')};},
  })}};
  await new GeneratedArtifactGitCache(storage as never,'private-assets').prepare(ref,version,input);
  const stored=generatedArtifactReferenceColumns({siteVersionId:version,htmlByPath:input.htmlByPath,
    compiledTokenStyles:input.compiledTokenStyles,manifest:{...manifest,generatedGitArchive:ref}}).manifest;
  assert.equal('cmsSlotSources' in stored,false);
  t.mock.method(globalThis,'fetch',async(requestInput:RequestInfo|URL,init?:RequestInit)=>{
    const request=new Request(requestInput,init),path=new URL(request.url).pathname;
    if(path==='/storage/v1/bucket/private-assets')return Response.json({id:'private-assets',public:false});
    const prefix='/storage/v1/object/private-assets/';
    if(path.startsWith(prefix)){
      const body=objects.get(decodeURIComponent(path.slice(prefix.length)));
      return body?new Response(new Uint8Array(body)):new Response('missing',{status:404});
    }
    throw Error(`Unexpected local request: ${path}`);
  });
  const rows=sources.map((source,index)=>({id:String(index),site_id:'site_123',site_version_id:version,
    slot_key:source.slotKey,slot_type:index?'url':'text',source_selector:null,source_text:null,
    source_asset_path:null,confidence:'1',diagnostics:{},created_at:'2026-11-08',updated_at:'2026-11-08'}));
  const db={query:async(sql:string)=>({rows:sql.includes('from public.gnr8_content_slots')?rows:
    sql.includes('select a.manifest from public.gnr8_runtime_site_versions')?[{manifest:stored}]:[],rowCount:0})};
  const {listContentSlots}=await import('./runtime-store');
  const restored=await listContentSlots(version,{dbClient:db as never});
  assert.deepEqual(restored.map(slot=>({slotKey:slot.slotKey,sourceText:slot.sourceText})),sources);
  const key=[...objects.keys()].find(item=>item.endsWith(`/${ref.runtimeManifest.sha256}`));
  assert.ok(key);objects.delete(key);
  await assert.rejects(listContentSlots(version,{dbClient:db as never}),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
});
