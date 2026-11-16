import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createVerifiedRetainedAssetReader } from './verified-retained-asset';
import { readStackiResponse } from '../stacki/stacki-response';

test('Git-referenced retained asset serves verified cache bytes while database row holds no file body',async()=>{
 const bytes=Buffer.from('git-backed-image'),sha=createHash('sha256').update(bytes).digest('hex');
 const gitArchive={scope:{agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'},
   repository:'owner/site',commit:'a'.repeat(40),manifestPath:'raw-import/version/.gnr8-import-manifest.json',manifestSha256:'b'.repeat(64)};
 const client={from(table:string){const q={select(){return q},eq(){return q},in(){return q},limit(){return Promise.resolve(table==='gnr8_runtime_raw_template_artifacts'
   ?{error:null,data:[{id:'artifact',file_map:{'image.png':{path:'image.png',sizeBytes:bytes.length,sha256:sha,mediaType:'image/png'}},metadata_json:{gitArchive}}]}
   :{error:null,data:[{content_bytes:'\\x',sha256:sha,file_size_bytes:bytes.length,media_type:'image/png'}]});}};return q;}} as unknown as SupabaseClient;
 let cacheReads=0;
 const cache={read:async(ref:unknown,version:string,file:{sha256:string;sizeBytes:number})=>{
   cacheReads++;assert.deepEqual(ref,gitArchive);assert.equal(version,'version');assert.equal(file.sha256,sha);return bytes;
 }};
 const response=await createVerifiedRetainedAssetReader(client,false,undefined,undefined,cache)(
   {siteId:'site',siteVersionId:'version',path:'image.png',expectedSha256:sha});
 assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);assert.equal(cacheReads,1);
});

test('one request shares immutable metadata reads, but verifies every file and isolates versions', async () => {
  const bytes=Buffer.from('retained-image'),sha=createHash('sha256').update(bytes).digest('hex');
  let metadataReads=0,fileReads=0;
  const client={from(table:string){
    const filters:Record<string,string>={};
    const query={select(){return query},eq(k:string,v:string){filters[k]=v;return query},in(){return query},limit(){
      if(table==='gnr8_runtime_raw_template_artifacts'){
        metadataReads++;
        return Promise.resolve({error:null,data:filters.site_version_id==='foreign'?[]:[{id:'artifact',file_map:{'image.png':{path:'image.png',sizeBytes:bytes.length,sha256:sha,mediaType:'image/png'}}}]});
      }
      fileReads++;
      return Promise.resolve({error:null,data:[{content_bytes:'\\x'+bytes.toString('hex'),sha256:sha,file_size_bytes:bytes.length,media_type:'image/png'}]});
    }};return query;
  }} as unknown as SupabaseClient;
  const read=createVerifiedRetainedAssetReader(client),input={siteId:'site',siteVersionId:'version',path:'image.png',expectedSha256:sha};
  const results=await Promise.all(Array.from({length:644},()=>read(input)));
  assert.ok(results.every(r=>r.status===200));assert.equal(metadataReads,1);assert.equal(fileReads,644);
  assert.equal((await read({...input,expectedSha256:'0'.repeat(64)})).status,500);
  assert.equal((await read({...input,siteVersionId:'foreign'})).status,404);
  assert.equal(metadataReads,2);
  await createVerifiedRetainedAssetReader(client)(input);assert.equal(metadataReads,3);
});

test('plain-text gateway failure reports unconfirmed state; valid application responses are preserved',async()=>{
  await assert.rejects(readStackiResponse(new Response('An error occurred',{status:504})),/časovno omejitev/);
  await assert.rejects(readStackiResponse(new Response('<html>error</html>',{status:502})),/ni potrjen/);
  assert.deepEqual(await readStackiResponse(Response.json({ok:false,reason:'STACKI_SESSION_START_PENDING'},{status:409})),{ok:false,reason:'STACKI_SESSION_START_PENDING'});
});

test('bounded batch reads retain per-file integrity and reject missing, duplicate or foreign rows', async () => {
  const bytes=Buffer.from('image'),sha=createHash('sha256').update(bytes).digest('hex');
  const paths=Array.from({length:17},(_,i)=>`${i}.png`);
  const file_map=Object.fromEntries(paths.map(path=>[path,{path,sizeBytes:bytes.length,sha256:sha,mediaType:'image/png'}]));
  let calls=0,mode='normal';const sizes:number[]=[];
  const client={from(table:string){let selected:string[]=[];const q={select(){return q},eq(){return q},in(key:string,values:string[]){if(key==='file_path')selected=values;return q},limit(){
    if(table==='gnr8_runtime_raw_template_artifacts')return Promise.resolve({data:[{id:'artifact',file_map}],error:null});
    calls++;sizes.push(selected.length);
    let data=selected.map(file_path=>({file_path,content_bytes:'\\x'+bytes.toString('hex'),sha256:sha,file_size_bytes:bytes.length,media_type:'image/png'}));
    if(mode==='missing')data.pop();
    if(mode==='duplicate')data[1]=data[0];
    if(mode==='foreign')data[0]={...data[0],file_path:'foreign'};
    return Promise.resolve({data,error:null});
  }};return q}} as unknown as SupabaseClient;
  const input={siteId:'site',siteVersionId:'version',allowedPaths:paths,expectedSha256:sha};
  const read=createVerifiedRetainedAssetReader(client,true);
  const result=await Promise.all(paths.map(path=>read({...input,path})));
  assert.ok(result.every(r=>r.status===200));assert.equal(calls,3);assert.deepEqual(sizes,[8,8,1]);
  assert.equal((await read({...input,path:paths[0],expectedSha256:'0'.repeat(64)})).status,500);
  for(mode of ['missing','duplicate','foreign'])assert.equal((await createVerifiedRetainedAssetReader(client,true)({...input,path:paths[0]})).status,500);
});

test('a large read queue runs at most four database batches concurrently', async () => {
  const bytes=Buffer.from('image'),sha=createHash('sha256').update(bytes).digest('hex');
  const paths=Array.from({length:96},(_,i)=>`${i}.png`);
  const file_map=Object.fromEntries(paths.map(path=>[path,{path,sizeBytes:bytes.length,sha256:sha,mediaType:'image/png'}]));
  let active=0,peak=0,calls=0;
  const client={from(table:string){let selected:string[]=[];const q={select(){return q},eq(){return q},in(key:string,values:string[]){if(key==='file_path')selected=values;return q},async limit(){
    if(table==='gnr8_runtime_raw_template_artifacts')return{data:[{id:'artifact',file_map}],error:null};
    calls++;active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,2));active--;
    return{data:selected.map(file_path=>({file_path,content_bytes:'\\x'+bytes.toString('hex'),sha256:sha,file_size_bytes:bytes.length,media_type:'image/png'})),error:null};
  }};return q}} as unknown as SupabaseClient;
  const read=createVerifiedRetainedAssetReader(client,true);
  const results=await Promise.all(paths.map(path=>read({siteId:'site',siteVersionId:'version',path,allowedPaths:paths,expectedSha256:sha})));
  assert.ok(results.every(r=>r.status===200));assert.equal(calls,12);assert.equal(peak,4);assert.equal(active,0);
});

test('extensionless CSS uses verified MIME and retains relative dependency rewriting',async()=>{
 const bytes=Buffer.from('@import "./nested";body{background:url(../image.png)}'),hash=createHash('sha256').update(bytes).digest('hex');
 const paths=['css/sheet','css/nested','image.png'];
 const client={from(table:string){const q={select(){return q},eq(){return q},in(){return q},limit(){return Promise.resolve(table==='gnr8_runtime_raw_template_artifacts'?{error:null,data:[{id:'a',file_map:Object.fromEntries(paths.map(path=>[path,{path,sizeBytes:bytes.length,sha256:hash,mediaType:'text/css'}]))}]}:{error:null,data:[{content_bytes:'\\x'+bytes.toString('hex'),sha256:hash,file_size_bytes:bytes.length,media_type:'text/css'}]});}};return q;}} as unknown as SupabaseClient;
 const response=await createVerifiedRetainedAssetReader(client)({siteId:'site',siteVersionId:'version',path:'css/sheet',allowedPaths:paths,expectedSha256:hash});
 assert.equal(response.status,200);const css=await response.text();assert(css.includes('/api/gnr8/runtime/preview-assets/site/version/css/nested'));assert(css.includes('/api/gnr8/runtime/preview-assets/site/version/image.png'));
});

test('asset diagnostics distinguish provider failures from integrity failures without exposing private payloads',async()=>{
 const bytes=Buffer.from('private image'),sha=createHash('sha256').update(bytes).digest('hex');
 const path='private-customer-name.png';let provider=true;const failures:any[]=[];
 const client={from(table:string){const q={select(){return q},eq(){return q},in(){return q},limit(){
  if(table==='gnr8_runtime_raw_template_artifacts')return Promise.resolve({data:[{id:'a',file_map:{[path]:{path,sizeBytes:bytes.length,sha256:sha,mediaType:'image/png'}}}],error:null});
  return Promise.resolve(provider?{data:null,error:{code:'57014',message:'private SQL payload',details:'token=secret'}}:{data:[{file_path:path,content_bytes:'\\x'+bytes.toString('hex'),sha256:'0'.repeat(64),file_size_bytes:bytes.length,media_type:'image/png'}],error:null});
 }};return q;}} as unknown as SupabaseClient;
 const input={siteId:'s',siteVersionId:'v',path,expectedSha256:sha};
 let response=await createVerifiedRetainedAssetReader(client,true,[path],f=>failures.push(f))(input);
 assert.equal(response.status,500);assert.equal(await response.text(),'Retained asset unavailable.');
 assert.deepEqual(failures[0],{reason:'file_query',status:500,pathSha256:createHash('sha256').update(path).digest('hex'),providerCode:'57014'});
 provider=false;response=await createVerifiedRetainedAssetReader(client,true,[path],f=>failures.push(f))(input);
 assert.equal(response.status,500);assert.equal(failures[1].reason,'integrity_mismatch');
 assert(!JSON.stringify(failures).includes('secret'));assert(!JSON.stringify(failures).includes(path));assert(!JSON.stringify(failures).includes('SQL'));
});

test('PostgREST diagnostics retain upstream HTTP status and safe codes without copying provider messages',async()=>{
 const path='asset.png',bytes=Buffer.from('image'),sha=createHash('sha256').update(bytes).digest('hex');
 let code='PGRST107';const failures:any[]=[];
 const client={from(table:string){const q={select(){return q},eq(){return q},in(){return q},limit(){
  return Promise.resolve(table==='gnr8_runtime_raw_template_artifacts'
   ?{data:[{id:'a',file_map:{[path]:{path,sizeBytes:bytes.length,sha256:sha,mediaType:'image/png'}}}],error:null,status:200}
   :{data:null,error:{code,message:'private SQL or token=secret',details:'private details'},status:406});
 }};return q;}} as unknown as SupabaseClient;
 for(code of ['PGRST107','PGRSTX00','private-token=secret']){
  const response=await createVerifiedRetainedAssetReader(client,true,[path],f=>failures.push(f))({siteId:'s',siteVersionId:'v',path,expectedSha256:sha});
  assert.equal(response.status,500);assert.equal(await response.text(),'Retained asset unavailable.');
 }
 assert.deepEqual(failures.map(f=>f.providerCode),['PGRST107','PGRSTX00',undefined]);
 assert(failures.every(f=>f.providerStatus===406));assert(!JSON.stringify(failures).includes('secret'));
});
