import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createVerifiedRetainedAssetReader } from './verified-retained-asset';
import { createRetainedAssetReadFetch } from './retained-asset-read-fetch';

const artifactId = '3598ee7f-5474-497d-b432-500f71c18876';
const path = 'assets/large.png';
const bytes = Buffer.alloc(6_029_710, 173);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const entry = { path, sizeBytes: bytes.length, sha256, mediaType: 'image/png' };
const row = { file_path: path, file_size_bytes: bytes.length, sha256, media_type: 'image/png' };

test('actual SDK and verified reader consume a large binary after a JSON query cancellation', async () => {
  const calls: Array<{select:string|null;accept:string|null}> = [];
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(init?.method, 'GET');
    if (url.pathname.endsWith('/gnr8_runtime_raw_template_artifacts')) {
      assert.equal(url.searchParams.get('site_id'), 'eq.site');
      assert.equal(url.searchParams.get('site_version_id'), 'eq.version');
      return Response.json([{id:artifactId,file_map:{[path]:entry}}]);
    }
    assert.equal(url.searchParams.get('artifact_id'), 'eq.' + artifactId);
    assert.equal(url.searchParams.get('file_path'), 'in.(' + path + ')');
    assert.equal(url.searchParams.get('limit'), '2');
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer local-only');
    const select = url.searchParams.get('select');
    const accept = new Headers(init?.headers).get('accept');
    calls.push({select,accept});
    if (select?.includes('content_bytes,' ) || select?.endsWith(',content_bytes')) {
      return Response.json({code:'57014',message:'query canceled'}, {status:500});
    }
    if (select === 'content_bytes') {
      assert.equal(accept, 'application/octet-stream');
      return new Response(bytes, {headers:{'content-type':'application/octet-stream'}});
    }
    return Response.json([row]);
  };
  const client = (adapted:boolean) => createClient('https://offline.invalid','local-only',{
    auth:{persistSession:false,autoRefreshToken:false},global:{fetch:adapted?createRetainedAssetReadFetch(transport):transport},
  });
  const input = {siteId:'site',siteVersionId:'version',path,expectedSha256:sha256};
  const failures:unknown[]=[];
  assert.equal((await createVerifiedRetainedAssetReader(client(false),true,[path],f=>failures.push(f))(input)).status,500);
  assert.equal((failures[0] as {providerCode:string}).providerCode,'57014');
  calls.length = 0;
  const read = createVerifiedRetainedAssetReader(client(true),true,[path]);
  const results = await Promise.all([read(input),read(input)]);
  assert.deepEqual(results.map(r=>r.status),[200,200]);
  assert.deepEqual(Buffer.from(await results[0].arrayBuffer()),bytes);
  assert.equal(calls.length,2); // One shared metadata GET and one binary GET, no retries.
  assert.equal(calls[0].select,'file_path,media_type,file_size_bytes,sha256');
  assert.equal((await read({...input,expectedSha256:'0'.repeat(64)})).status,500);
});

test('binary transport rejects corrupt, short, oversized and non-binary bodies without retry',async()=>{
  for(const mode of ['corrupt','short','oversized','wrong-type','provider-error'] as const){
    let fileCalls=0;
    const failures:any[]=[];
    const transport:typeof fetch=async(input)=>{
      const url=new URL(String(input));
      if(url.pathname.endsWith('/gnr8_runtime_raw_template_artifacts'))return Response.json([{id:artifactId,file_map:{[path]:entry}}]);
      fileCalls++;
      if(url.searchParams.get('select')!=='content_bytes')return Response.json([row]);
      if(mode==='provider-error')return Response.json({code:'57014',message:'private provider detail'},{status:500});
      const body=mode==='short'?bytes.subarray(1):mode==='oversized'?Buffer.concat([bytes,Buffer.from([1])]):mode==='corrupt'?Buffer.alloc(bytes.length,1):bytes;
      return new Response(body,{headers:{'content-type':mode==='wrong-type'?'application/json':'application/octet-stream'}});
    };
    const client=createClient('https://offline.invalid','local-only',{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:createRetainedAssetReadFetch(transport)}});
    const response=await createVerifiedRetainedAssetReader(client,true,[path],f=>failures.push(f))({siteId:'site',siteVersionId:'version',path,expectedSha256:sha256});
    assert.equal(response.status,500,mode);assert.equal(fileCalls,2,mode);
    if(mode==='corrupt')assert.equal(failures[0].reason,'integrity_mismatch');
    if(mode==='provider-error')assert.equal(failures[0].providerCode,'57014');
  }
});

test('other queries and mutations are passed through unchanged; ambiguous metadata never reads bytes',async()=>{
  const calls:string[]=[];
  const transport:typeof fetch=async(input)=>{calls.push(String(input));return Response.json([{...row},{...row}]);};
  const wrapped=createRetainedAssetReadFetch(transport);
  const base='https://offline.invalid/rest/v1/gnr8_runtime_raw_template_artifact_files?select=file_path,media_type,file_size_bytes,sha256,content_bytes&artifact_id=eq.'+artifactId+'&file_path=in.(assets/large.png)&limit=';
  for(const [url,method]of [[base+'9','GET'],[base+'2','POST'],['https://offline.invalid/rest/v1/other','GET']]){
    await wrapped(url,{method});assert.equal(calls.at(-1),url);
  }
  calls.length=0;
  const response=await wrapped(base+'2',{method:'GET'});
  assert.equal((await response.json()).length,2);assert.equal(calls.length,1);
});
