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
