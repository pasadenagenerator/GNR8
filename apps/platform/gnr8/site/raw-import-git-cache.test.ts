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

test('private raw import cache verifies bytes; corruption and public bucket fail closed',async()=>{
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
  const pkg=rawImportGitPackage({scope:ref.scope,runtimeSiteId:'site_123',siteVersionId:versionId,files:[file]});
  const pinned={...ref,manifestSha256:pkg.manifestSha256};
  const files=new Map(pkg.gitFiles.map(entry=>[entry.path,Buffer.from(entry.body)]));
  const git={resolveTarget:async()=>({owner:'owner',ownerId:1,repository:'site',repositoryId:2,token:'local'}),
    verifyTarget:async()=>{},read:async()=>({commit:pinned.commit,parent:'c'.repeat(40),parentCount:1,files})};
  const verified=new RawImportGitCache(client as never,'private-assets',git as never);
  assert.deepEqual(await verified.read(pinned,versionId,file),body);
  const key=[...objects.keys()][0];
  objects.set(key,Buffer.from('corrupt'));
  await assert.rejects(verified.read(pinned,versionId,file),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
  publicBucket=true;
  await assert.rejects(new RawImportGitCache(client as never,'private-assets',git as never).read(pinned,versionId,file),
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
  await assert.rejects(new RawImportGitCache(client as never,'private-assets',git as never)
    .read(pinned,versionId,file),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
  assert.equal(reads,1);
  repo='site';files.set(`raw-import/${versionId}/${file.path}`,Buffer.from('changed'));
  await assert.rejects(new RawImportGitCache(client as never,'private-assets',git as never)
    .read(pinned,versionId,file),/RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
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

test('unavailable cache metadata restores multiple files from one verified Git read',async()=>{
  const secondBody=Buffer.from('<p>English</p>');
  const second={path:'en/index.html',mediaType:'text/html',sizeBytes:secondBody.length,
    sha256:createHash('sha256').update(secondBody).digest('hex'),bytes:secondBody};
  const pkg=rawImportGitPackage({scope:ref.scope,runtimeSiteId:'site_123',siteVersionId:versionId,files:[file,second]});
  const pinned={...ref,manifestSha256:pkg.manifestSha256};
  const files=new Map(pkg.gitFiles.map(entry=>[entry.path,Buffer.from(entry.body)]));
  let reads=0;
  const git={resolveTarget:async()=>({owner:'owner',ownerId:1,repository:'site',repositoryId:2,token:'local'}),
    verifyTarget:async()=>{},read:async()=>{reads++;return {commit:pinned.commit,parent:'c'.repeat(40),parentCount:1,files};}};
  const unavailable={storage:{getBucket:async()=>{throw Error('storage unavailable');}}};
  const cache=new RawImportGitCache(unavailable as never,'private-assets',git as never);
  assert.deepEqual(await cache.read(pinned,versionId,file),body);
  assert.deepEqual(await cache.read(pinned,versionId,second),secondBody);
  assert.equal(reads,1);
  assert.deepEqual(await new RawImportGitCache(null,'',git as never).read(pinned,versionId,file),body);
});
