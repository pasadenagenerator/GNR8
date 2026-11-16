import assert from 'node:assert/strict';import test from 'node:test';import {readFile} from 'node:fs/promises';
import {createStandaloneContactHandler,CLAIM_CONTACT,FINISH_CONTACT} from './contact-runtime';
import {bundleContactRuntime} from './build-contact-template.mjs';
const config={siteKey:'owned-site',forms:{'/contact':{fields:['name','email','message'] as Array<'name'|'email'|'message'>,required:['name','email','message'] as Array<'name'|'email'|'message'>,siteId:'owned-site',siteVersionId:'revision-4',pagePath:'/contact',recipient:'info@pasadenagenerator.com',artifactId:'artifact',artifactSha256:'a'.repeat(64)}}};
const env={VERCEL_ENV:'production',VERCEL_URL:'stage.vercel.app',CONTACT_ALLOWED_HOSTS:'site.example.com',CONTACT_REDIS_URL:'https://dedicated.upstash.io',CONTACT_REDIS_TOKEN:'local-fake',CONTACT_RATE_SECRET:'local-fake-rate',CONTACT_RESEND_KEY:'local-fake-mail',CONTACT_FROM:'forms@example.com',CONTACT_MAX_CLAIMS:'50'};
const request=(body='name=Test&email=test%40example.com&message=Hello&website=',origin='https://site.example.com')=>new Request(origin+'/api/contact?path=/contact',{method:'POST',headers:{origin,'content-type':'application/x-www-form-urlencoded',accept:'application/json'},body});
function fixture(failSend=false){const calls:string[]=[];const records=new Map<string,any>();let sends=0;
 const transport:typeof fetch=async(url,options)=>{calls.push(String(url));if(String(url)==='https://api.resend.com/emails'){sends++;assert.equal(JSON.parse(String(options!.body)).to[0],'info@pasadenagenerator.com');if(failSend)throw Error('timeout');return Response.json({id:'fake-message'});}assert.equal(String(url),'https://dedicated.upstash.io/');const args=JSON.parse(String(options!.body));assert.equal(args[0],'EVAL');if(args[1]===CLAIM_CONTACT){const existing=records.get(args[3]);if(existing)return Response.json({result:existing.hash!==args[7]?['conflict']:['duplicate',existing.outcome]});records.set(args[3],{hash:args[7],outcome:'pending'});return Response.json({result:['claimed',args[3]]});}assert.equal(args[1],FINISH_CONTACT);records.get(args[3]).outcome=args[4];return Response.json({result:1});};
 return {handler:createStandaloneContactHandler(config,env,transport),calls,get sends(){return sends;}};}
test('contact works with all GNR8 unavailable; duplicate delivery sends once',async()=>{const f=fixture();const responses=await Promise.all([f.handler(request()),f.handler(request())]);assert(responses.some(r=>r.status===200));assert.equal((await f.handler(request())).status,200);assert.equal(f.sends,1);assert(f.calls.every(u=>u.includes('dedicated.upstash.io')||u==='https://api.resend.com/emails'));});
test('uncertain send remains durable and is never automatically retried',async()=>{const f=fixture(true);assert.equal((await f.handler(request())).status,502);assert.equal((await f.handler(request())).status,409);assert.equal(f.sends,1);});
test('untrusted recipient, cross-origin, preview, missing configuration and duplicate fields cannot send',async()=>{const f=fixture();assert.equal((await f.handler(request('name=A&name=B&email=a%40example.com&message=x'))).status,400);assert.equal((await f.handler(request('name=A&email=a%40example.com&message=x&recipient=attacker%40example.com'))).status,400);assert.equal((await f.handler(request(undefined,'https://attacker.example.com'))).status,503);assert.equal((await createStandaloneContactHandler(config,{...env,VERCEL_ENV:'preview'})(request())).status,503);assert.equal(f.sends,0);});
test('checked-in portable handler matches current reused validation and delivery code',async()=>{assert.deepEqual(await bundleContactRuntime(),await readFile(new URL('./templates/contact-runtime.mjs',import.meta.url)));});

test('explicit contact policy supplies owner caps and payload TTL independently of old pilot environment',async()=>{
 let sends=0,claim:any[]=[];
 const transport:typeof fetch=async(url,options)=>{
  if(String(url)==='https://api.resend.com/emails'){sends++;return Response.json({id:'one'});}
  const args=JSON.parse(String(options?.body));if(args[1]===CLAIM_CONTACT){claim=args;return Response.json({result:['claimed',args[3]]});}
  return Response.json({result:1});
 };
 const policy={maxClaims:80,perHour:3,retentionDays:14};
 const handler=createStandaloneContactHandler({...config,policy},{...env,CONTACT_MAX_CLAIMS:undefined},transport);
 assert.equal((await handler(request())).status,200);assert.equal(sends,1);
 assert.equal(claim[2],4);assert.equal(claim[9],3);assert.equal(claim[10],80);assert.equal(claim[11],14*86400);
 const invalid=createStandaloneContactHandler({...config,policy:{...policy,retentionDays:0}},env,transport);assert.equal((await invalid(request())).status,503);assert.equal(sends,1);
});
