import assert from 'node:assert/strict';
import test from 'node:test';
import {sealConnection,openConnection,parseConnectionSettings,connectionTarget,publicConnection,type ConnectionSettings} from './publication-connection';
import {PublicationConnectionProvider} from './publication-connection-provider';
import {isPublicPublicationAddress} from './publication-domain';
import {checkIndependentContact} from './publication-contact-check';
const scope={agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'};
const tokens={github:'local-github-key-never-return',vercel:'local-vercel-key-never-return'};
const settings:ConnectionSettings={githubOwner:'owner',githubOwnerId:12,githubOwnerKind:'User',repository:'presentation',vercelTeamId:'team_123',project:'presentation',host:'test.example.com',hostPurpose:'working',domainMode:'new',contact:null};
test('credentials are encrypted with full tenant binding and never enter public read model or release target',()=>{
 const secret='a'.repeat(64),encrypted=sealConnection(tokens,scope,secret);
 assert(!JSON.stringify(encrypted).includes(tokens.github));assert.deepEqual(openConnection(encrypted,scope,secret),tokens);
 for(const changed of [{...scope,agencyId:'other'},{...scope,clientId:'other'},{...scope,siteId:'other'}])assert.throws(()=>openConnection(encrypted,changed,secret),/unavailable/);
 const connection={scope,settings,tokens,revision:1};const input={artifactId:scope.siteId,artifactSha256:'c'.repeat(64),selection:{kind:'generated-source' as const,scope:{...scope,siteVersionId:scope.siteId},sha256:'d'.repeat(64)}};
 const target=connectionTarget(connection,input);assert(!JSON.stringify({target,public:publicConnection(connection)}).includes('never-return'));
 assert.equal(connectionTarget({...connection,revision:2,tokens:{github:'rotated',vercel:'rotated'}},input).authorizationId,target.authorizationId);
 assert.notEqual(connectionTarget(connection,{...input,artifactSha256:'e'.repeat(64)}).authorizationId,target.authorizationId);
 assert.throws(()=>connectionTarget({...connection,scope:{...scope,clientId:'other'}},input),/ownership/);
});
test('publication pins the site repository created by import',()=>{
 const connection={scope,settings:{...settings,githubOwner:'gnr8-sites',githubOwnerKind:'Organization' as const,
  repository:'gnr8-site'},tokens,revision:1};
 const input={artifactId:scope.siteId,artifactSha256:'c'.repeat(64),
  selection:{kind:'generated-source' as const,scope:{...scope,siteVersionId:scope.siteId},sha256:'d'.repeat(64)}};
 const binding={owner:'gnr8-sites',ownerId:12,ownerKind:'Organization' as const,
  repository:'gnr8-site',repositoryId:34};
 const target=connectionTarget(connection,input,binding);
 assert.equal(target.provisionedRepositoryId,34);
 assert.equal(target.repository,binding.repository);
 assert.notEqual(target.authorizationId,connectionTarget(connection,input).authorizationId);
 for(const wrong of [{...binding,repository:'other'},{...binding,ownerId:13}])
  assert.throws(()=>connectionTarget(connection,input,wrong),/repository_ownership_mismatch/);
});
test('contact has no default cap or retention; wildcard and extra configuration fields fail closed',()=>{
 assert.deepEqual(parseConnectionSettings(settings),settings);
 for(const value of [{...settings,contact:{}},{...settings,host:'*.example.com'},{...settings,host:'-a.example.com'},{...settings,secret:'leak'}])assert.throws(()=>parseConnectionSettings(value));
 assert(parseConnectionSettings({...settings,contact:{recipient:'owner@example.com',confirmed:true,maxClaims:80,perHour:3,retentionDays:14}}));
});
test('connection verifies actual owner/team and rejects occupied resources before any mutation',async()=>{
 for(const scenario of ['available','wrong-owner','wrong-team','repo-taken','project-taken']){
  const calls:string[]=[];const fetcher:typeof fetch=async(url,init)=>{assert.equal(init?.method,undefined);const path=new URL(String(url)).pathname;calls.push(path);
   if(path==='/users/owner'||path==='/user')return Response.json({id:scenario==='wrong-owner'?13:12,type:'User',login:'owner'});
   if(path==='/v2/teams/team_123')return Response.json({id:'team_123',membership:{role:scenario==='wrong-team'?'MEMBER':'OWNER',confirmed:true}});
   if(path.startsWith('/repos/'))return scenario==='repo-taken'?Response.json({id:5}):new Response(null,{status:404});
   if(path.startsWith('/v9/projects/'))return scenario==='project-taken'?Response.json({id:'prj_occupied',accountId:'team_123'}):new Response(null,{status:404});
   if(path.startsWith('/v4/aliases/'))return new Response(null,{status:404});
   throw Error('unexpected request');};
  const provider=new PublicationConnectionProvider(tokens,fetcher),store={read:async()=>null} as any;
  if(scenario==='available')assert.equal((await provider.verify(settings,scope,store)).project,'available');else await assert.rejects(provider.verify(settings,scope,store));
  assert(calls.length<=6);
 }
});
test('publication connection accepts only its exact imported private repository',async()=>{
 const boundSettings={...settings,githubOwner:'gnr8-sites',githubOwnerKind:'Organization' as const,
  repository:'gnr8-site'};
 const binding={owner:'gnr8-sites',ownerId:12,ownerKind:'Organization' as const,
  repository:'gnr8-site',repositoryId:34};
 let repositoryId=34;
 const transport:typeof fetch=async(url)=>{const path=new URL(String(url)).pathname;
  if(path==='/users/gnr8-sites')return Response.json({id:12,type:'Organization',login:'gnr8-sites'});
  if(path==='/user/memberships/orgs/gnr8-sites')return Response.json({state:'active',role:'admin'});
  if(path==='/v2/teams/team_123')return Response.json({id:'team_123',membership:{role:'OWNER',confirmed:true}});
  if(path==='/repos/gnr8-sites/gnr8-site')return Response.json({id:repositoryId,private:true,
   owner:{id:12,login:'gnr8-sites'},name:'gnr8-site',permissions:{push:true},
   description:`GNR8 standalone site ${scope.siteId}`});
  if(path.startsWith('/v9/projects/')||path.startsWith('/v4/aliases/'))return new Response(null,{status:404});
  throw Error(`unexpected provider request: ${path}`);
 };
 const provider=new PublicationConnectionProvider(tokens,transport);
 const store={read:async()=>null} as any;
 assert.equal((await provider.verify(boundSettings,scope,store,binding)).repository,'bound');
 await assert.rejects(provider.verify(boundSettings,scope,store),/repository_name_occupied/);
 repositoryId=35;
 await assert.rejects(provider.verify(boundSettings,scope,store,binding),/repository_name_occupied/);
});
test('domain separates ownership, existing alias, wildcard, current DNS, recommendation and TLS',async()=>{
 const provider=new PublicationConnectionProvider(tokens,async(url)=>{const path=new URL(String(url)).pathname;
  if(path==='/v9/projects/presentation')return Response.json({id:'prj_site',accountId:'team_123',targets:{production:{id:'dpl_old'}}});
  if(path.includes('/domains/')&&path.endsWith('/config'))return Response.json({misconfigured:false,recommendedCNAME:[{value:'new.vercel-dns.com'}]});
  if(path.includes('/domains/'))return Response.json({name:settings.host,verified:true,projectId:'prj_site'});
  if(path.includes('%2A')||path.includes('*'))return Response.json({projectId:'prj_parent'});
  return Response.json({projectId:'prj_site',deploymentId:'dpl_old'});
 },async()=>true);
 const status=await provider.domain(settings);assert.equal(status.ready,true);assert.equal(status.dnsConfigured,true);assert.equal(status.wildcardProjectId,'prj_parent');assert.equal(status.aliasDeploymentId,'dpl_old');assert.deepEqual(status.recommendedCNAME,[{value:'new.vercel-dns.com'}]);
});
test('TLS diagnostics exclude private, link-local, loopback and mapped addresses',()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','169.254.169.254','192.168.1.1','100.64.1.1','::1','::ffff:127.0.0.1','fe80::1','fc00::1','2001:db8::1'])assert.equal(isPublicPublicationAddress(ip),false,ip);
 assert(isPublicPublicationAddress('76.76.21.21'));assert(isPublicPublicationAddress('2606:4700::1111'));
});
test('independent contact probe only PINGs the owner Redis and never sends mail or returns secrets',async()=>{
 const env={CONTACT_REDIS_URL:'https://test.upstash.io',CONTACT_REDIS_TOKEN:'secret',CONTACT_RATE_SECRET:'a'.repeat(32),CONTACT_RESEND_KEY:'secret-mail',CONTACT_FROM:'forms@example.com',CONTACT_ALLOWED_HOSTS:settings.host};
 let calls=0;const transport:typeof fetch=async(url,init)=>{calls++;assert.equal(String(url),'https://test.upstash.io/');assert.deepEqual(JSON.parse(String(init?.body)),['PING']);return Response.json({result:'PONG'});};
 const result=await checkIndependentContact(env,settings.host,transport);assert.equal(result.mail,'not_sent');assert(!JSON.stringify(result).includes('secret'));assert.equal(calls,1);
 await assert.rejects(checkIndependentContact({...env,CONTACT_REDIS_URL:'http://127.0.0.1'},settings.host,transport));assert.equal(calls,1);
});

test('actual connection GET hides ciphertext/tokens and denied tenancy stops before storage or provider access',async()=>{
 const {createPublicationConnectionRoutes}=await import('./publication-connection-routes');
 const secret='a'.repeat(64);process.env.GNR8_STANDALONE_ENCRYPTION_KEY=secret;process.env.GNR8_STANDALONE_PUBLICATION_ENABLED='1';
 let reads=0,denied=false;const filters:Record<string,string>={};
 const row={settings,revision:1,encrypted_credentials:sealConnection(tokens,scope,secret)};
 const query:any={select(){return this;},eq(k:string,v:string){filters[k]=v;return this;},async maybeSingle(){reads++;return {data:row,error:null};}};
 const routes=createPublicationConnectionRoutes({authorize:async(s:any)=>{assert.deepEqual(s,scope);if(denied)throw Error('denied');return {userId:scope.agencyId} as any;},client:()=>({from:()=>query}) as any,provider:()=>{throw Error('GET must not contact providers');}});
 const context={params:Promise.resolve({clientId:scope.clientId,siteId:scope.siteId})};
 const request=new Request('https://app.example/connection?agencyId='+scope.agencyId);
 const result=await routes.GET(request,context);const text=await result.text();assert.equal(result.status,200);assert(!text.includes('never-return'));assert(!text.includes('encrypted_credentials'));assert(!text.includes(row.encrypted_credentials.body));assert.deepEqual(filters,{agency_id:scope.agencyId,client_id:scope.clientId,site_id:scope.siteId});
 denied=true;assert.equal((await routes.GET(request,context)).status,409);assert.equal(reads,1);
});

test('connection route exposes the imported repository and rejects a different publication repository',async t=>{
 const {createPublicationConnectionRoutes}=await import('./publication-connection-routes');
 const oldBindings=process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED;
 const oldPublication=process.env.GNR8_STANDALONE_PUBLICATION_ENABLED;
 const oldKey=process.env.GNR8_STANDALONE_ENCRYPTION_KEY;
 t.after(()=>{for(const [key,value] of Object.entries({GNR8_STACKI_GITHUB_BINDINGS_ENABLED:oldBindings,
  GNR8_STANDALONE_PUBLICATION_ENABLED:oldPublication,GNR8_STANDALONE_ENCRYPTION_KEY:oldKey}))
  if(value===undefined)delete process.env[key];else process.env[key]=value});
 process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED='1';
 process.env.GNR8_STANDALONE_PUBLICATION_ENABLED='1';
 process.env.GNR8_STANDALONE_ENCRYPTION_KEY='a'.repeat(64);
 const bound={github_owner:'pasadenagenerator',github_owner_id:12,github_owner_kind:'User',repository:'gnr8-site',
  repository_id:34,binding_state:'bound'};
 const client={from(name:string){const data=name==='gnr8_site_github_repository_bindings'?bound:null;
  return {select(){return this},eq(){return this},async maybeSingle(){return {data,error:null}}};}};
 const routes=createPublicationConnectionRoutes({authorize:async()=>({userId:'actor'}),
  client:()=>client as any,provider:()=>{throw Error('provider must not be reached')}});
 const context={params:Promise.resolve({clientId:scope.clientId,siteId:scope.siteId})};
 const url=`https://app.example/connection?agencyId=${scope.agencyId}`;
 const get=await routes.GET(new Request(url),context);
 assert.equal(get.status,200);
 assert.deepEqual((await get.json()).data.repositoryBinding,
  {owner:'pasadenagenerator',ownerId:12,ownerKind:'User',repository:'gnr8-site',repositoryId:34});
 const post=await routes.POST(new Request(url,{method:'POST',headers:{origin:'https://app.example',
  'content-type':'application/json'},body:JSON.stringify({action:'save',tokens,
  settings,expectedRevision:0,confirmation:'connect-dedicated-publication-target'})}),context);
 assert.equal(post.status,409);
 assert.equal((await post.json()).error,'standalone_repository_ownership_mismatch');
});
