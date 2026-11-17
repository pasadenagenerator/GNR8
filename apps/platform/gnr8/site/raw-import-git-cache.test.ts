import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RawImportGitCache} from './raw-import-git-cache';
import {rawImportGitPackage} from './raw-import-git-archive';

const body=Buffer.from('<h1>GNR8</h1>');
const file={path:'index.html',mediaType:'text/html',sizeBytes:body.length,
  sha256:createHash('sha256').update(body).digest('hex'),bytes:body};
const versionId='44444444-4444-4444-8444-444444444444';
const ref={scope:{agencyId:'11111111-1111-4111-8111-111111111111',
  clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'},
  repository:'owner/site',commit:'a'.repeat(40),
  manifestPath:`raw-import/${versionId}/.gnr8-import-manifest.json`,manifestSha256:'b'.repeat(64)};

test('prepare reconciles transient read failures without retrying corrupted bytes',async()=>{
  let reads=0,corrupt=false;
  const client={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async()=>({data:null,error:{statusCode:'409'}}),
    download:async()=>{
      reads++;
      if(reads===1)return {data:null,error:{statusCode:'503',message:'private provider detail'}};
      return {data:new Blob([new Uint8Array(corrupt?Buffer.from('changed'):body)]),error:null};
    },
  })}};
  const cache=new RawImportGitCache(client as never,'private-assets');
  await cache.prepare(ref,versionId,[file]);assert.equal(reads,2);
  corrupt=true;
  await assert.rejects(cache.prepare(ref,versionId,[file]),error=>{
    assert.equal((error as {retryable?:boolean}).retryable,false);
    assert.match(String(error),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);return true;
  });
  assert.equal(reads,3);
});

test('prepare retries an upload that did not create its private object',async()=>{
  let uploads=0,reads=0;
  let stored:Buffer|null=null;
  const client={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async(_key:string,bytes:Buffer)=>{
      uploads++;
      if(uploads===1)return {data:null,error:{statusCode:'503'}};
      stored=Buffer.from(bytes);return {data:{},error:null};
    },
    download:async()=>{
      reads++;
      return stored?{data:new Blob([new Uint8Array(stored)]),error:null}:
        {data:null,error:{status:404}};
    },
  })}};
  await new RawImportGitCache(client as never,'private-assets').prepare(ref,versionId,[file]);
  assert.equal(uploads,2);
  assert.equal(reads,2);
});

test('prepare leaves a persistently missing object unavailable after bounded retries',async()=>{
  let uploads=0;
  const client={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async()=>{uploads++;return {data:null,error:{statusCode:'503'}};},
    download:async()=>({data:null,error:{status:404}}),
  })}};
  await assert.rejects(new RawImportGitCache(client as never,'private-assets').prepare(ref,versionId,[file]),
    /RAW_IMPORT_CACHE_READBACK_UNAVAILABLE:[a-f0-9]{64}:404/);
  assert.equal(uploads,4);
});

test('private raw import cache prepares and verifies bytes; corruption and public bucket fail closed',async()=>{
  const objects=new Map<string,Buffer>();let publicBucket=false;
  const client={storage:{
    getBucket:async()=>({data:{public:publicBucket},error:null}),
    from:()=>({
      upload:async(key:string,bytes:Buffer)=>{objects.set(key,Buffer.from(bytes));return {data:{},error:null};},
      download:async(key:string)=>({data:objects.has(key)?new Blob([new Uint8Array(objects.get(key)!)]):null,
        error:objects.has(key)?null:Error('missing')}),
    }),
  }};
  const cache=new RawImportGitCache(client as never,'private-assets');
  await cache.prepare(ref,versionId,[file]);
  assert.deepEqual(await cache.read(ref,versionId,file),body);
  const key=[...objects.keys()][0];
  objects.set(key,Buffer.from('corrupt'));
  await assert.rejects(cache.read(ref,versionId,file),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
  publicBucket=true;
  await assert.rejects(new RawImportGitCache(client as never,'private-assets').read(ref,versionId,file),
    /RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
});

test('missing raw derivative restores exact pinned Git bytes and rejects wrong source',async()=>{
  const pkg=rawImportGitPackage({scope:ref.scope,runtimeSiteId:'site_123',siteVersionId:versionId,files:[file]});
  const pinned={...ref,manifestSha256:pkg.manifestSha256};
  const files=new Map(pkg.gitFiles.map(entry=>[entry.path,Buffer.from(entry.body)]));
  const objects=new Map<string,Buffer>();let repo='site',reads=0,uploadBlocked=false;
  const client={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async(key:string,bytes:Buffer)=>{if(uploadBlocked)throw Error('cache unavailable');
      objects.set(key,Buffer.from(bytes));return {error:null};},
    download:async(key:string)=>{const bytes=objects.get(key);return {data:bytes?new Blob([new Uint8Array(bytes)]):null,
      error:bytes?null:Error('missing')};},
  })}};
  const git={resolveTarget:async()=>({owner:'owner',ownerId:1,repository:repo,repositoryId:2,token:'local'}),
    verifyTarget:async()=>{},read:async(input:{branch:string;commit:string})=>{
      assert.equal(input.branch,`imports/${versionId}`);assert.equal(input.commit,pinned.commit);
      reads++;return {commit:pinned.commit,parent:'c'.repeat(40),parentCount:1,files};}};
  const cache=new RawImportGitCache(client as never,'private-assets',git as never);
  assert.deepEqual(await cache.read(pinned,versionId,file),body);
  assert.deepEqual(await cache.read(pinned,versionId,file),body);
  assert.equal(reads,1);
  const key=[...objects.keys()][0]!;
  objects.set(key,Buffer.from('corrupt'));
  await assert.rejects(cache.read(pinned,versionId,file),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
  assert.equal(reads,1);
  objects.delete(key);repo='other';
  await assert.rejects(cache.read(pinned,versionId,file),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
  assert.equal(reads,1);
  repo='site';files.set(`raw-import/${versionId}/${file.path}`,Buffer.from('changed'));
  await assert.rejects(cache.read(pinned,versionId,file),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
  files.set(`raw-import/${versionId}/${file.path}`,Buffer.from(body));uploadBlocked=true;
  assert.deepEqual(await cache.read(pinned,versionId,file),body,
    'verified Git bytes remain readable when the disposable cache cannot be filled');
  const unavailable={storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async()=>{throw Error('cache unavailable');},
    download:async()=>{throw Error('cache unavailable');},
  })}};
  assert.deepEqual(await new RawImportGitCache(unavailable as never,'private-assets',git as never)
    .read(pinned,versionId,file),body);
});
