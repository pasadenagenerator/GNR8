import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeStudioSourceFailureKey, nativeStudioSourceResultKey,
 readNativeStudioSourceStatus } from './native-studio-source-status';

const requestId='a'.repeat(64);
const first='11111111-1111-4111-8111-111111111111';
const retry='22222222-2222-4222-8222-222222222222';

test('a new preparation attempt does not inherit an earlier failure',async()=>{
 const values=new Map<string,unknown>([[nativeStudioSourceFailureKey(requestId,first),
  {requestId,attemptId:first,code:'native_studio_preparation_failed'}]]);
 const store={read:async<T>(key:string)=>values.get(key) as T??null};
 assert.deepEqual(await readNativeStudioSourceStatus(store,requestId,retry),
  {state:'preparing-source',requestId});
 values.set(nativeStudioSourceFailureKey(requestId,retry),
  {requestId,attemptId:retry,code:'native_studio_asset_missing'});
 assert.deepEqual(await readNativeStudioSourceStatus(store,requestId,retry),
  {state:'failed-source',requestId,error:'native_studio_asset_missing'});
 values.set(`native-requests/${requestId}-result.json`,{requestId,sourceId:'b'.repeat(64),
  sourceManifestSha256:'c'.repeat(64),studioVersion:'1.4.8',files:42,hosted:false});
 assert.equal((await readNativeStudioSourceStatus(store,requestId,retry)).state,
  'failed-source');
 values.set(nativeStudioSourceResultKey(requestId,retry),{requestId,attemptId:retry,
  sourceId:'d'.repeat(64),sourceManifestSha256:'c'.repeat(64),
  studioVersion:'1.4.13',files:42,hosted:false});
 assert.equal((await readNativeStudioSourceStatus(store,requestId,retry)).state,
  'prepared-source');
 const legacy=await readNativeStudioSourceStatus(store,requestId);
 assert.equal(legacy.state,'prepared-source');
 if(legacy.state!=='prepared-source')throw Error('expected prepared source');
 assert.equal(legacy.sourceId,'b'.repeat(64));
});

test('legacy status remains readable and foreign or malformed attempts fail closed',async()=>{
 const values=new Map<string,unknown>([[nativeStudioSourceFailureKey(requestId),
  {requestId,code:'native_studio_preparation_failed'}]]);
 const store={read:async<T>(key:string)=>values.get(key) as T??null};
 assert.equal((await readNativeStudioSourceStatus(store,requestId)).state,'failed-source');
 await assert.rejects(readNativeStudioSourceStatus(store,requestId,'not-a-uuid'),
  /native_studio_request_invalid/);
 values.set(nativeStudioSourceFailureKey(requestId,retry),
  {requestId,attemptId:first,code:'native_studio_preparation_failed'});
 await assert.rejects(readNativeStudioSourceStatus(store,requestId,retry),
  /native_studio_receipt_invalid/);
});
