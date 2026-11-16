import assert from 'node:assert/strict';
import test from 'node:test';
import {generatedArtifactGitPackage} from '../site/generated-artifact-git-archive';
import {GeneratedArtifactGitCache} from '../site/generated-artifact-git-cache';
import {prepareSuccessorSourceGit} from '../output-adapters/astro-successor-publication-service';
import {createSiteVersionFromMigration,getSiteVersion,getSiteVersionGitSourceStatus} from './runtime-store';

test('Git-backed import keeps page text out of both page tables while preserving legacy writes',async()=>{
  const siteId='site_123';
  const siteVersionId='44444444-4444-4444-8444-444444444444';
  const page={pageId:'home',path:'/',title:'UNIQUE_IMPORTED_PAGE_TITLE',
    structureModel:{},contentModel:{},styleTokens:{},assetGraph:[],semanticSignals:[],
    source:'migration' as const,actor:'test'};
  async function write(metadataOnly:boolean){
    const writes:Array<{sql:string;values:unknown[]}>=[];
    const db={query:async(sql:string,values:unknown[]=[])=>{
      if(sql.includes('insert into public.gnr8_runtime_pages')||
        sql.includes('insert into public.gnr8_runtime_page_versions'))writes.push({sql,values});
      if(sql.includes('from public.gnr8_runtime_site_versions')&&sql.includes('where id = $1::uuid'))
        return {rows:[{id:siteVersionId,site_id:siteId,version_no:1}],rowCount:1};
      return {rows:[],rowCount:0};
    }};
    await createSiteVersionFromMigration({siteId,siteVersionId,sourceUrl:'https://example.test/',
      actor:'test',rendererCompatibilityVersion:'v1',pages:[page],metadataOnly,
      createSourceHostBinding:false,dbClient:db as never});
    return writes;
  }
  const gitWrites=await write(true);
  assert.equal(gitWrites.length,2);
  assert.equal(gitWrites[0]!.values[3],null);
  assert.equal(gitWrites[1]!.values[3],null);
  assert.equal(JSON.stringify(gitWrites).includes(page.title),false);
  const legacyWrites=await write(false);
  assert.equal(legacyWrites.length,2);
  assert.equal(legacyWrites[0]!.values[3],page.title);
  assert.equal(legacyWrites[1]!.values[3],page.title);
});

test('new Git source version stores its pinned reference before any page content',async()=>{
  const version='44444444-4444-4444-8444-444444444444';
  const ref={scope:{agencyId:'11111111-1111-4111-8111-111111111111',
    clientId:'22222222-2222-4222-8222-222222222222',
    siteId:'33333333-3333-4333-8333-333333333333'},
    repository:'owner/site',commit:'a'.repeat(40),manifestPath:`generated/${version}/.gnr8-generated-manifest.json`,
    manifestSha256:'b'.repeat(64),routes:[],styles:{path:'styles',bytes:0,sha256:'c'.repeat(64)},
    runtimeManifest:{path:`generated/${version}/runtime-manifest.json`,bytes:1,sha256:'d'.repeat(64)}} as never;
  const writes:Array<{sql:string;values:unknown[]}>=[];
  const db={query:async(sql:string,values:unknown[]=[])=>{
    if(sql.includes('insert into public.gnr8_runtime_site_versions')||
      sql.includes('insert into public.gnr8_runtime_page_versions'))writes.push({sql,values});
    if(sql.includes('select coalesce(max(version_no)'))return {rows:[{next:1}],rowCount:1};
    if(sql.includes('insert into public.gnr8_runtime_site_versions'))return {rows:[{id:version}],rowCount:1};
    return {rows:[],rowCount:0};
  }};
  await createSiteVersionFromMigration({siteId:'site_123',siteVersionId:version,
    sourceUrl:'https://example.test/',actor:'test',rendererCompatibilityVersion:'v1',
    pages:[{pageId:'home',path:'/',title:'PRIVATE_SOURCE_TITLE',structureModel:{},
      contentModel:{heading:'PRIVATE_SOURCE_BODY'},styleTokens:{},assetGraph:[],semanticSignals:[],
      source:'migration',actor:'test'}] as never,
    importProvenanceSummary:{kind:'successor'} as never,metadataOnly:true,sourceGitArchive:ref,
    createSourceHostBinding:false,dbClient:db as never});
  assert.equal(writes.length,2);
  const marker=JSON.parse(writes[0]!.values[5] as string);
  assert.deepEqual(marker.sourceGitArchive,ref);
  assert.equal(marker.runtimeSiteId,'site_123');
  assert.equal(writes[1]!.values[3],null);
  assert.equal(JSON.stringify(writes).includes('PRIVATE_SOURCE_TITLE'),false);
  assert.equal(JSON.stringify(writes).includes('PRIVATE_SOURCE_BODY'),false);
  await assert.rejects(createSiteVersionFromMigration({siteId:'site_123',siteVersionId:version,
    sourceUrl:'https://example.test/',actor:'test',rendererCompatibilityVersion:'v1',pages:[],
    metadataOnly:true,sourceGitArchive:{...ref,manifestPath:'generated/other/.gnr8-generated-manifest.json'},
    dbClient:db as never}),/GITHUB_IMPORT_SOURCE_REFERENCE_INVALID/);
  assert.equal(writes.length,2,'invalid source never reaches the database writer');
});

test('reserved version attaches its Git source reference before writing page metadata',async()=>{
  const version='44444444-4444-4444-8444-444444444444';
  const ref={commit:'a'.repeat(40),manifestSha256:'b'.repeat(64),
    manifestPath:`generated/${version}/.gnr8-generated-manifest.json`,
    runtimeManifest:{path:`generated/${version}/runtime-manifest.json`}} as never;
  const statements:Array<{sql:string;values:unknown[]}>=[];
  let canAttach=true;
  const db={query:async(sql:string,values:unknown[]=[])=>{
    statements.push({sql,values});
    if(sql.includes('from public.gnr8_runtime_site_versions')&&sql.includes('where id = $1::uuid'))
      return {rows:[{id:version,site_id:'site_123',version_no:1}],rowCount:1};
    if(sql.includes('update public.gnr8_runtime_site_versions')&&sql.includes('returning id::text as id'))
      return {rows:canAttach?[{id:version}]:[],rowCount:canAttach?1:0};
    return {rows:[],rowCount:0};
  }};
  const input={siteId:'site_123',siteVersionId:version,sourceUrl:'https://example.test/',
    actor:'test',rendererCompatibilityVersion:'v1',pages:[{pageId:'home',path:'/',
      title:'Git source title',structureModel:{},contentModel:{heading:'Git source body'},
      styleTokens:{},assetGraph:[],semanticSignals:[],source:'migration',actor:'test'}] as never,
    metadataOnly:true,sourceGitArchive:ref,createSourceHostBinding:false,dbClient:db as never};
  await createSiteVersionFromMigration(input);
  const attached=statements.find(item=>item.sql.includes('update public.gnr8_runtime_site_versions')&&
    item.sql.includes('returning id::text as id'));
  const pageWrite=statements.findIndex(item=>item.sql.includes('insert into public.gnr8_runtime_page_versions'));
  assert.ok(attached);
  assert.ok(statements.indexOf(attached)<pageWrite);
  assert.deepEqual(JSON.parse(attached.values[1] as string).sourceGitArchive,ref);
  assert.equal(JSON.stringify(statements).includes('Git source body'),false);
  canAttach=false;statements.length=0;
  await assert.rejects(createSiteVersionFromMigration(input),/GITHUB_IMPORT_SOURCE_REFERENCE_CONFLICT/);
  assert.equal(statements.some(item=>item.sql.includes('insert into public.gnr8_runtime_page_versions')),false);
});

test('retry accepts a Git source reference only when page rows contain metadata',async()=>{
  const ref={repository:'owner/site',commit:'a'.repeat(40)} as never;
  const marker={kind:'runtime_import_provenance_summary_v1',githubSource:true,
    runtimeSiteId:'site_123',sourceGitArchive:ref};
  let metadataOnly=true;
  const db={query:async(sql:string)=>({rows:sql.includes('as metadata_only')
    ? [{import_provenance_summary:marker,metadata_only:metadataOnly}]:[],rowCount:1})};
  const version='44444444-4444-4444-8444-444444444444';
  assert.deepEqual(await getSiteVersionGitSourceStatus(version,{dbClient:db as never}),
    {reference:ref,metadataOnly:true});
  metadataOnly=false;
  assert.deepEqual(await getSiteVersionGitSourceStatus(version,{dbClient:db as never}),
    {reference:ref,metadataOnly:false});
});

test('Git-backed page title and content restore from the verified source manifest',async t=>{
  const envKeys=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET'] as const;
  const previous=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
  t.after(()=>{for(const key of envKeys)if(previous[key]===undefined)delete process.env[key];
    else process.env[key]=previous[key];});
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:1',
    SUPABASE_SERVICE_ROLE_KEY:'local-test-only',GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET:'private-assets'});
  const siteVersionId='44444444-4444-4444-8444-444444444444';
  const scope={agencyId:'11111111-1111-4111-8111-111111111111',
    clientId:'22222222-2222-4222-8222-222222222222',
    siteId:'33333333-3333-4333-8333-333333333333'};
  const sourcePage={pageId:'home',path:'/',title:'Restored title',
    structureModel:{sections:[]},contentModel:{heading:'Restored body'},
    styleTokens:{},assetGraph:[],semanticSignals:[],source:'migration',actor:'test'};
  const objects=new Map<string,Buffer>();
  const storage={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async(key:string,body:Buffer)=>{objects.set(key,Buffer.from(body));return {error:null};},
    download:async(key:string)=>{const body=objects.get(key);return {data:body?new Blob([new Uint8Array(body)]):null,
      error:body?null:Error('missing')};},
  })}};
  const lineage={sourceUrl:'https://example.test/'} as never;
  const ref=await prepareSuccessorSourceGit({pages:[sourcePage] as never,lineage,
    candidate:{htmlByPath:{'/':'<h1>Restored title</h1>'},compiledTokenStyles:''} as never,
    ownership:{agencyId:scope.agencyId,organizationId:scope.clientId,
      ownershipSiteId:scope.siteId,runtimeSiteId:'site_123',siteVersionId} as never,
    prepareGeneratedGit:async artifact=>{
      const input={scope,runtimeSiteId:'site_123',siteVersionId,...artifact,
        target:{owner:'owner',ownerId:1,repository:'site',repositoryId:1,token:'local-test-only'}};
      const pkg=generatedArtifactGitPackage(input);
      const prepared={scope,repository:'owner/site',commit:'a'.repeat(40),manifestPath:pkg.manifestPath,
        manifestSha256:pkg.manifestSha256,routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,
        runtimeManifest:pkg.descriptor.runtimeManifest};
      await new GeneratedArtifactGitCache(storage as never,'private-assets').prepare(prepared,siteVersionId,input);
      return prepared;
    }});
  assert.ok(ref);
  t.mock.method(globalThis,'fetch',async(requestInput:RequestInfo|URL,init?:RequestInit)=>{
    const path=new URL(new Request(requestInput,init).url).pathname;
    if(path==='/storage/v1/bucket/private-assets')return Response.json({id:'private-assets',public:false});
    const prefix='/storage/v1/object/private-assets/';
    const body=path.startsWith(prefix)?objects.get(decodeURIComponent(path.slice(prefix.length))):undefined;
    return body?new Response(new Uint8Array(body)):new Response('missing',{status:404});
  });
  let marker:Record<string,unknown>|null=null;
  let pageValues:unknown[]|null=null;
  const db={query:async(sql:string,values:unknown[]=[])=>{
    if(sql.includes('select coalesce(max(version_no)'))return {rows:[{next:1}],rowCount:1};
    if(sql.includes('from public.gnr8_runtime_site_versions')&&sql.includes('version_no::int as version_no'))
      return {rows:[],rowCount:0};
    if(sql.includes('insert into public.gnr8_runtime_site_versions')){
      marker=JSON.parse(values[5] as string);
      return {rows:[{id:siteVersionId}],rowCount:1};
    }
    if(sql.includes('insert into public.gnr8_runtime_page_versions'))pageValues=values;
    return {rows:sql.includes('from public.gnr8_runtime_site_versions')
    ? [{id:siteVersionId,site_id:'site_123',version_no:1,state:'DRAFT',source:'migration',
      actor:'test',renderer_compatibility_version:'v1',import_provenance_summary:marker,
      artifact_id:null,created_at:'2026-11-16'}]
    : sql.includes('from public.gnr8_runtime_page_versions')
      ? pageValues?[{id:'page_version_123',site_version_id:siteVersionId,page_id:pageValues[1],
        path:pageValues[2],title:pageValues[3],structure_model:JSON.parse(pageValues[4] as string),
        content_model:JSON.parse(pageValues[5] as string),style_tokens:JSON.parse(pageValues[6] as string),
        asset_graph:JSON.parse(pageValues[7] as string),semantic_signals:JSON.parse(pageValues[8] as string),
        migration_governance:pageValues[9],source:pageValues[10],actor:pageValues[11],
        created_at:'2026-11-16'}]:[]
      : [],rowCount:1};
  }};
  await createSiteVersionFromMigration({siteId:'site_123',siteVersionId,
    sourceUrl:'https://example.test/',actor:'test',rendererCompatibilityVersion:'v1',
    pages:[sourcePage] as never,importProvenanceSummary:lineage,metadataOnly:true,
    sourceGitArchive:ref,createSourceHostBinding:false,dbClient:db as never});
  assert.equal(JSON.stringify({marker,pageValues}).includes('Restored body'),false);
  assert.equal(JSON.stringify({marker,pageValues}).includes('Restored title'),false);
  const restored=await getSiteVersion(siteVersionId,{dbClient:db as never});
  assert.equal(restored?.artifactId,null,'source content restores before artifact allocation');
  assert.equal(restored?.pages[0]?.title,'Restored title');
  assert.deepEqual(restored?.pages[0]?.contentModel,{heading:'Restored body'});
  const key=[...objects.keys()].find(item=>item.endsWith(`/${ref.runtimeManifest.sha256}`));
  assert.ok(key);objects.delete(key);
  await assert.rejects(getSiteVersion(siteVersionId,{dbClient:db as never}),
    /GITHUB_IMPORT_SOURCE_INTEGRITY_FAILED/);
});
