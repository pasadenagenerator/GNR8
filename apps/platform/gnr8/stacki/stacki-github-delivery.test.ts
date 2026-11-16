import { validStackiDeliveryPath } from './stacki-delivery-path';
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { StackiGitHubDelivery, stackiDeliveryEntries } from './stacki-github-delivery';
import { createStackiLocalStorage } from './stacki-local-storage-transport';
import { createStackiRecord } from './stacki-draft-contract';
import { retainedAssetName } from './stacki-retained-assets';

const scope={agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',
 siteId:'33333333-3333-4333-8333-333333333333',siteVersionId:'44444444-4444-4444-8444-444444444444'};
const actor='55555555-5555-4555-8555-555555555555';
const commit='a'.repeat(40);
const hash=(body:Buffer)=>createHash('sha256').update(body).digest('hex');
function fixture() {
 const routes:Record<string,{name:string;mediaType:string}>={};
 const assets=['text/css; charset=utf-8','image/svg+xml','font/woff2','image/png'].map((mediaType,i)=>{
  const path=`/api/gnr8/runtime/preview-assets/site_f34311640a819fb56f3c/${scope.siteVersionId}/asset-${i}`;
  const name=retainedAssetName(path);routes[path]={name,mediaType};
  return {name,body:Buffer.from(i===0 ? `@import './nested.css';a{background:url('../asset-3')}` : i===1 ? '<svg><image href="./asset-3"/></svg>' : `binary-${i}`)};
 });
 const refs=assets.map(asset=>({name:asset.name,sha256:hash(asset.body),bytes:asset.body.length,
  blob:createHash('sha1').update(`blob ${asset.body.length}\0`).update(asset.body).digest('hex')}));
 const files=[['package.json','{}'],['astro.config.mjs',`const retained = ${JSON.stringify(routes)};\nexport default {};`],['src/pages/index.astro','<h1>test</h1>']]
  .map(([path,content])=>({path,base64:Buffer.from(content).toString('base64')}));
 return {record:createStackiRecord(scope,actor,{expectedRevision:0,files}),assets,refs,routes};
}

test('same-origin CSS/SVG closure, scope, hashes, MIME and expiring capabilities survive cache recreation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'stacki-delivery-integrity-'));
 try {
  const storage=createStackiLocalStorage(root),f=fixture();
  const cache=new StackiGitHubDelivery(storage.client,storage.bucket);
  await cache.prepare(commit,f.record,f.refs,f.assets);
  const cold=new StackiGitHubDelivery(storage.client,storage.bucket);
  const opened=await cold.open(scope,commit,1,f.record.sha256,f.refs);
  assert.deepEqual(opened.assets,f.assets.slice(0,2),'linked CSS and SVG bytes/base URLs are unchanged');
  const delivery=await opened.delivery(Date.now()+300000);
  assert.equal(Object.keys(delivery.redirects).length,2);
  assert(Object.keys(delivery.redirects).every(path=>path.endsWith('asset-2')||path.endsWith('asset-3')));
  await assert.rejects(opened.delivery(Date.now()-1),/DELIVERY_UNAVAILABLE/);
  await assert.rejects(opened.delivery(Date.now()+21*60000),/DELIVERY_UNAVAILABLE/);
  await assert.rejects(cold.open({...scope,siteVersionId:actor},commit,1,f.record.sha256,f.refs),/DELIVERY_UNAVAILABLE/);
  await assert.rejects(cold.open(scope,commit,1,'0'.repeat(64),f.refs),/DELIVERY_UNAVAILABLE/);
  await assert.rejects(cold.open(scope,commit,1,f.record.sha256,f.refs.map((ref,i)=>i?ref:{...ref,sha256:'0'.repeat(64)})),/DELIVERY_UNAVAILABLE/);
  const remote=storage.calls.find(call=>call.method==='POST' && call.path.includes(`/assets/${f.refs[2].sha256}/`))!;
  const key=remote.path.split(`/object/${storage.bucket}/`)[1];
  assert.equal(await readFile(join(root,key)+'.mime','utf8'),'font/woff2');
  await writeFile(join(root,key),Buffer.from('corrupted'));
  await assert.rejects(cache.prepare(commit,f.record,f.refs,f.assets),/DELIVERY_UNAVAILABLE/,'conflicting object cannot be overwritten or acknowledged');
 }finally{await rm(root,{recursive:true,force:true});}
});

test('public cache and unverified asset/mapping data cannot establish readiness',async()=>{
 const root=await mkdtemp(join(tmpdir(),'stacki-delivery-reject-'));
 try {
  const f=fixture(),publicStorage=createStackiLocalStorage(root,{publicBucket:true});
  await assert.rejects(new StackiGitHubDelivery(publicStorage.client,publicStorage.bucket).prepare(commit,f.record,f.refs,f.assets),/DELIVERY_UNAVAILABLE/);
  assert(publicStorage.calls.every(call=>call.method==='GET'));
  const storage=createStackiLocalStorage(root),cache=new StackiGitHubDelivery(storage.client,storage.bucket);
  await assert.rejects(cache.prepare(commit,f.record,f.refs,f.assets.map((a,i)=>i?a:{...a,body:Buffer.from('wrong')})),/DELIVERY_UNAVAILABLE/);
  assert(!storage.calls.some(call=>call.method==='POST'&&call.path.includes('/commits/')),'no ready package after partial preparation');
  assert.throws(()=>stackiDeliveryEntries(f.record,f.refs.slice(1)),/DELIVERY_UNAVAILABLE/);
  const hostile={...f.record,files:f.record.files.map(file=>file.path==='astro.config.mjs'?{...file,base64:Buffer.from('globalThis.executed = true;').toString('base64')}:file)};
  assert.throws(()=>stackiDeliveryEntries(hostile,f.refs),/DELIVERY_UNAVAILABLE/);
 }finally{await rm(root,{recursive:true,force:true});}
});


test('delivery paths preserve opaque runtime identities and reject ambiguous namespaces',()=>{
 const prefix='/api/gnr8/runtime/preview-assets/site_f34311640a819fb56f3c/44444444-4444-4444-8444-444444444444/';
 assert(validStackiDeliveryPath(prefix+'a2e388a232383bbdcb49c06780087e3f/css/images/marker-icon.png'));
 for(const tail of ['../secret','%2e%2e/secret','a?token=bad','a#fragment','a\\b',''])assert.equal(validStackiDeliveryPath(prefix+tail),false);
});
