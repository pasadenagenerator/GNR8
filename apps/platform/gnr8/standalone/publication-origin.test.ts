import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {requireSameOriginJson} from '../stacki/stacki-draft-route-handlers';

test('local publication uses canonical localhost with the unchanged same-origin guard',()=>{
 const request=(url:string,origin:string)=>new NextRequest(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'});
 const ip=request('http://127.0.0.1:3010/api/publication','http://127.0.0.1:3010');
 assert.equal(new URL(ip.url).origin,'http://localhost:3010');
 assert.throws(()=>requireSameOriginJson(ip),/STACKI_ORIGIN_INVALID/);
 assert.doesNotThrow(()=>requireSameOriginJson(request('http://localhost:3010/api/publication','http://localhost:3010')));
 assert.throws(()=>requireSameOriginJson(request('http://localhost:3010/api/publication','https://untrusted.example')),/STACKI_ORIGIN_INVALID/);
 assert.doesNotThrow(()=>requireSameOriginJson(request('https://app.example/api/publication','https://app.example')));
});
