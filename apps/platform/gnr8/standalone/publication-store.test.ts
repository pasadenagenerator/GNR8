import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {SupabasePublicationStore} from './publication-store';
const scope={agencyId:'10000000-0000-4000-8000-000000000001',clientId:'10000000-0000-4000-8000-000000000002',siteId:'10000000-0000-4000-8000-000000000003',siteVersionId:'10000000-0000-4000-8000-000000000004'};
test('actual Supabase SDK distinguishes an absent release from denied, missing bucket, and failed reads',async()=>{
 for(const fixture of [
  {status:404,body:{code:'NoSuchKey',message:'Object not found'},missing:true},
  {status:400,body:{statusCode:'404',message:'Object not found'},missing:true},
  {status:404,body:{code:'not_found',message:'Object not found'},missing:true},
  {status:403,body:{code:'AccessDenied',message:'Object not found'},missing:false},
  {status:404,body:{code:'NoSuchBucket',message:'Bucket not found'},missing:false},
  {status:500,body:{code:'InternalError',message:'Object not found'},missing:false},
 ]){
  let calls=0;
  const client=createClient('https://offline.invalid','local-test',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(url,init)=>{
   assert.equal(init?.method??'GET','GET');calls++;
   if(String(url).endsWith('/bucket/private'))return Response.json({id:'private',name:'private',public:false});
   assert.match(String(url),/\/object\/private\/standalone-publication\/v1\//);
   return Response.json(fixture.body,{status:fixture.status});
  }}});
  const store=new SupabasePublicationStore(client,'private',scope);
  if(fixture.missing)assert.equal(await store.read('requests/first.json'),null);
  else await assert.rejects(store.read('requests/first.json'),/standalone_store_read_failed/);
  assert.equal(calls,2);
 }
});

test('a first Studio deploy intent and attempt survive a fresh store instance',async()=>{
 const objects=new Map<string,Buffer>();
 const calls:string[]=[];
 const fetchOffline:typeof fetch=async(url,init)=>{
  const path=new URL(String(url)).pathname;
  const method=init?.method??'GET';
  calls.push(`${method} ${path}`);
  if(path==='/storage/v1/bucket/private')
   return Response.json({id:'private',name:'private',public:false});
  const prefix='/storage/v1/object/private/';
  assert(path.startsWith(prefix));
  const key=decodeURIComponent(path.slice(prefix.length));
  if(method==='POST'){
   const body=Buffer.from(await new Response(init?.body).arrayBuffer());
   if(objects.has(key))return Response.json({statusCode:'409',error:'Duplicate',message:'The resource already exists'}, {status:409});
   objects.set(key,body);
   return Response.json({Key:key});
  }
  assert.equal(method,'GET');
  const body=objects.get(key);
  return body?new Response(body,{status:200,headers:{'content-type':'application/json'}})
   :Response.json({code:'NoSuchKey',message:'Object not found'},{status:404});
 };
 const client=()=>createClient('https://offline.invalid','local-test',
  {auth:{persistSession:false,autoRefreshToken:false},global:{fetch:fetchOffline}});
 const first=new SupabasePublicationStore(client(),'private',scope);
 const second=new SupabasePublicationStore(client(),'private',scope);
 const intent={identity:'a'.repeat(64),commit:'b'.repeat(40)};
 assert.equal(await first.claim('native-studio/first-deploy-intent-v1.json',intent),true);
 assert.deepEqual(await second.read('native-studio/first-deploy-intent-v1.json'),intent);
 assert.deepEqual((await Promise.all([
  first.claim('native-studio/first-deploy-attempt-v1.json',intent),
  second.claim('native-studio/first-deploy-attempt-v1.json',intent),
 ])).sort(),[false,true]);
 assert.equal(await second.claim('native-studio/first-deploy-attempt-v1.json',intent),false);
 assert.deepEqual(await second.read('native-studio/first-deploy-attempt-v1.json'),intent);
 assert.equal(objects.size,2);
 assert(calls.some(call=>call.includes('first-deploy-attempt-v1.json')));
});
