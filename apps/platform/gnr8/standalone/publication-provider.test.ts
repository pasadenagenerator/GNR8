import test from 'node:test';
import assert from 'node:assert/strict';
import {GitHubVercelPublicationProvider,parseStageRecoveryAuthorization} from './publication-provider';
import {fingerprint,type Release,type GitReceipt} from './publication-contract';
import type {PublicationStore} from './publication-store';
import {validateStaticClosure} from './standalone-export';
const scope={agencyId:'10000000-0000-4000-8000-000000000001',clientId:'10000000-0000-4000-8000-000000000002',siteId:'10000000-0000-4000-8000-000000000003',siteVersionId:'10000000-0000-4000-8000-000000000004'};
const hash='a'.repeat(64);
const release:Release={id:'b'.repeat(64),input:{selection:{scope,revision:4,sha256:hash},artifactId:scope.siteVersionId,artifactSha256:hash},target:{githubOwner:'owner',githubOwnerId:12,githubOwnerKind:'User',repository:'site',vercelTeamId:'team_123',project:'site',host:'site.example.com',authorizationId:'plan-2026',maxFiles:10,maxBytes:1000},manifestSha256:hash,files:[],routes:['/']};
const git:GitReceipt={repositoryId:34,ownerId:12,repository:'owner/site',commit:'c'.repeat(40),tree:'d'.repeat(40),manifestSha256:hash};
class Store implements PublicationStore{values=new Map<string,any>();async read<T>(k:string){return structuredClone(this.values.get(k)??null) as T|null;}async claim(k:string,v:unknown){if(this.values.has(k))return false;this.values.set(k,structuredClone(v));return true;}async put<T>(k:string,v:T){await this.claim(k,v);assert.equal(fingerprint(this.values.get(k)),fingerprint(v));return v;}async putBytes(){}async getBytes(){return Buffer.from('');}}
function fixture(nodeVersion:'22.x'|'26.x'='22.x'){const store=new Store();const writes:any[]=[];let deployed:any=null;const env=['CONTACT_REDIS_URL','CONTACT_REDIS_TOKEN','CONTACT_RATE_SECRET','CONTACT_RESEND_KEY','CONTACT_FROM','CONTACT_ALLOWED_HOSTS','CONTACT_MAX_CLAIMS'].map((key,i)=>({key,id:String(i),target:['production'],type:'encrypted',updatedAt:123}));const project:any={id:'prj_site',name:'site',accountId:'team_123',autoAssignCustomDomains:false,framework:'astro',nodeVersion,buildCommand:'npm run build',installCommand:'npm ci --no-audit --no-fund',outputDirectory:'dist'};
 const key=`resources/${fingerprint({siteId:scope.siteId,githubOwnerId:12,repository:'site',vercelTeamId:'team_123',project:'site'})}-vercel-receipt.json`;store.values.set(key,{id:project.id});
 const transport:typeof fetch=async(url,init)=>{const u=new URL(String(url));const method=init?.method??'GET';const body=init?.body?JSON.parse(String(init.body)):undefined;if(method!=='GET')writes.push({path:u.pathname,body});assert(!u.searchParams.has('decrypt')||u.searchParams.get('decrypt')==='false');let answer:any;
 if(u.pathname==='/v9/projects/site')answer=project;
 else if(u.pathname==='/v10/projects/prj_site/env')answer={envs:env};
 else if(u.pathname==='/v6/deployments')answer={deployments:deployed?[deployed]:[]};
 else if(u.pathname==='/v13/deployments'&&method==='POST'){deployed={id:'dpl_one',projectId:project.id,url:'site-immutable.vercel.app',readyState:'READY',...body};answer=deployed;}
 else if(u.pathname==='/v13/deployments/dpl_one')answer=deployed;
 else if(u.pathname==='/v10/projects/prj_site/promote/dpl_one'){project.targets={production:{id:'dpl_one'}};answer={};}
 else throw Error('Unexpected provider request '+method+' '+u.pathname);
 return Response.json(answer);};return {store,writes,env,project,transport,provider:new GitHubVercelPublicationProvider(store,{github:'test',vercel:'test'},transport)};}
test('provider stages one production build at exact Git commit without automatic aliases; resume is read-only; Publish is promote',async()=>{const f=fixture();const d=await f.provider.stage(release,git,true);await f.provider.stage(release,git,false);assert.equal(f.writes.length,1);assert.equal(f.writes[0].body.target,'production');assert.equal('skipAutoAssignDomains' in f.writes[0].body,false);assert.equal(f.project.autoAssignCustomDomains,false);assert.deepEqual(f.writes[0].body.projectSettings,{framework:'astro',nodeVersion:'22.x',buildCommand:'npm run build',installCommand:'npm ci --no-audit --no-fund',outputDirectory:'dist',rootDirectory:null,serverlessFunctionRegion:'fra1'});assert.equal(f.writes[0].body.gitSource.sha,git.commit);assert.equal(f.writes[0].body.gitSource.ref,git.commit);await f.provider.promote(release,d);assert.deepEqual(f.writes.map(x=>x.path),['/v13/deployments','/v10/projects/prj_site/promote/dpl_one']);});
test('Astro 7 release requires a Node 26 project and stages Node 26 settings',async()=>{
 const release26={...release,foundation:{nodeVersion:'26.x' as const}} as Release;
 const wrong=fixture();await assert.rejects(wrong.provider.stage(release26,git,true),/standalone_project_configuration_not_ready/);
 assert.equal(wrong.writes.length,0);
 const right=fixture('26.x');await right.provider.stage(release26,git,true);
 assert.equal(right.writes[0]!.body.projectSettings.nodeVersion,'26.x');
});
test('promotion accepts documented empty 201/202 responses and still rejects HTTP errors',async()=>{
 for(const status of [201,202,403]){
  const f=fixture();const d=await f.provider.stage(release,git,true);let promotions=0;
  const transport:typeof fetch=async(url,init)=>{
   assert.equal(new URL(String(url)).pathname,'/v10/projects/prj_site/promote/dpl_one');
   assert.equal(init?.method,'POST');promotions++;
   return new Response(null,{status});
  };
  const provider=new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},transport);
  if(status===403)await assert.rejects(provider.promote(release,d),/^Error: standalone_vercel_403$/);
  else await provider.promote(release,d);
  assert.equal(promotions,1);
 }
});
test('environment drift consumes no additional build and changed authorization does not adopt another project',async()=>{const f=fixture();await f.provider.stage(release,git,true);f.env[0]!.updatedAt++;await assert.rejects(f.provider.stage(release,git,false),/configuration_changed/);assert.equal(f.writes.length,1);f.env[0]!.updatedAt--;await f.provider.stage({...release,target:{...release.target,authorizationId:'new-plan',maxBytes:2000}},git,false);f.project.id='prj_someone_else';await assert.rejects(f.provider.stage(release,git,true),/occupied_or_unconfirmed/);assert.equal(f.writes.length,1);});
test('unconfirmed project ownership and unsafe automatic publication fail before any deployment',async()=>{for(const mutation of [{accountId:'team_other'},{autoAssignCustomDomains:true},{link:{type:'github'}}]){const f=fixture();Object.assign(f.project,mutation);await assert.rejects(f.provider.stage(release,git,true));assert.equal(f.writes.length,0);}});
test('v13 request matches retained public schema keys and supplies settings required for the first deployment',async()=>{
 // Official https://vercel.com/openapi.json, read 2026-10-26: additionalProperties=false.
 // The previous body contained skipAutoAssignDomains, absent from this schema.
 const allowed=new Set(['buildMachine','customEnvironmentSlugOrId','deploymentId','files','gitAccessToken','gitMetadata','gitSource','meta','monorepoManager','name','project','projectSettings','target','withLatestCommit']);
 const f=fixture();const transport:typeof fetch=async(url,init)=>{
  if(init?.method==='POST'){
   const body=JSON.parse(String(init.body));
   assert.deepEqual(Object.keys(body).filter(k=>!allowed.has(k)),[]);
   assert.equal(body.projectSettings.framework,'astro');
   assert.equal(body.projectSettings.nodeVersion,'22.x');
   assert.equal(body.gitSource.ref,git.commit);assert.equal(body.gitSource.sha,git.commit);
  }
  return f.transport(url,init);
 };
 await new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},transport).stage(release,git,true);
 assert.equal(f.writes.length,1);
});
test('rejected deployment preserves bounded HTTP evidence after empty reconciliation and never sends another POST',async()=>{
 for(const providerCode of ['bad_request','secret_that_must_not_be_logged']){
  const f=fixture();let posts=0;
  const transport:typeof fetch=async(url,init)=>{
   if(init?.method==='POST'){posts++;return Response.json({error:{code:providerCode,message:'private-key-and-user-data',details:{authorization:'do-not-log'}}},{status:400});}
   return f.transport(url,init);
  };
  const p=new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},transport);
  await assert.rejects(p.stage(release,git,true),/^Error: standalone_vercel_400$/);
  await assert.rejects(p.stage(release,git,false),/^Error: standalone_vercel_400$/);
  assert.equal(posts,1);
  assert.deepEqual(await f.store.read(`releases/${release.id}/stage-failure.json`),{code:'standalone_vercel_400',status:400,...(providerCode==='bad_request'?{providerCode}:{})});
  assert(!JSON.stringify([...f.store.values]).includes('private-key'));
  assert(!JSON.stringify([...f.store.values]).includes('secret_that'));
 }
});
test('lost create response reconciles existing deployment and resume never rebuilds',async()=>{
 const f=fixture();let posts=0;const transport:typeof fetch=async(url,init)=>{
  const response=await f.transport(url,init);
  if(init?.method==='POST'){posts++;throw Error('transport details must not escape');}
  return response;
 };
 const p=new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},transport);
 assert.equal((await p.stage(release,git,true)).deploymentId,'dpl_one');
 assert.equal((await p.stage(release,git,false)).deploymentId,'dpl_one');
 assert.equal(posts,1);
 assert.deepEqual(await f.store.read(`releases/${release.id}/stage-failure.json`),{code:'standalone_deployment_creation_unconfirmed'});
});
test('explicit recovery grants exactly one additional create for the same frozen release and never resets the initial claim',async()=>{
 const f=fixture();let posts=0;
 const reject:typeof fetch=async(url,init)=>{if(init?.method==='POST'){posts++;return Response.json({error:{code:'bad_request'}},{status:400});}return f.transport(url,init);};
 const initial=new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},reject);
 await assert.rejects(initial.stage(release,git,true),/standalone_vercel_400/);
 const original=await f.store.read(`releases/${release.id}/stage-request.json`);
 const grant={id:'approved-recovery-1',releaseId:release.id,projectId:f.project.id,commit:git.commit,manifestSha256:hash};
 const recovery=new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},reject,grant);
 await assert.rejects(recovery.stage(release,git,false),/standalone_vercel_400/);
 await assert.rejects(recovery.stage(release,git,false),/standalone_vercel_400/);
 assert.equal(posts,2);assert.deepEqual(await f.store.read(`releases/${release.id}/stage-request.json`),original);
 assert(await f.store.read('authorizations/approved-recovery-1-stage-recovery.json'));
 // A late accepted original response may still be reconciled without a write.
 const success=new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},f.transport,{...grant,id:'approved-recovery-2'});
 assert.equal((await success.stage(release,git,false)).deploymentId,'dpl_one');
 await success.stage(release,git,false);assert.equal(f.writes.length,1);
});
test('recovery rejects wrong release, commit, project, environment drift and occupied project before a POST',async()=>{
 for(const scenario of ['release','commit','project','environment','occupied','no-original'] as const){
  const f=fixture();const reject:typeof fetch=async(url,init)=>init?.method==='POST'?Response.json({error:{code:'bad_request'}},{status:400}):f.transport(url,init);
  if(scenario!=='no-original')await assert.rejects(new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},reject).stage(release,git,true));
  const grant={id:'approved-recovery-1',releaseId:scenario==='release'?'e'.repeat(64):release.id,projectId:scenario==='project'?'prj_other':f.project.id,commit:scenario==='commit'?'e'.repeat(40):git.commit,manifestSha256:hash};
  if(scenario==='environment')f.env[0]!.updatedAt++;
  const readOnly:typeof fetch=async(url,init)=>{assert.equal(init?.method,'GET');const u=new URL(String(url));if(scenario==='occupied'&&u.pathname==='/v6/deployments'&&!u.searchParams.has('meta-gnr8Release'))return Response.json({deployments:[{id:'dpl_other'}]});return f.transport(url,init);};
  await assert.rejects(new GitHubVercelPublicationProvider(f.store,{github:'test',vercel:'test'},readOnly,grant).stage(release,git,false));
  assert.equal(f.writes.length,0);assert.equal(await f.store.read('authorizations/approved-recovery-1-stage-recovery.json'),null);
 }
 assert.throws(()=>parseStageRecoveryAuthorization({id:'arbitrary'}),/not_authorized/);
 assert.equal(parseStageRecoveryAuthorization(undefined),undefined);
});
test('static closure rejects missing CSS imports and loaded external files, preserving navigation to uncaptured originals',()=>{const file=(path:string,body:string)=>({path,body:Buffer.from(body)});const html=file('src/pages/index.astro','<link rel="stylesheet" href="/a.css"><a href="https://www.pasadenagenerator.com/original">Original</a>');validateStaticClosure([html,file('public/a.css','@import "nested.css";'),file('public/nested.css','body{background:url("/hero.png")}'),file('public/hero.png','image')],['/']);assert.throws(()=>validateStaticClosure([html,file('public/a.css','@import "missing.css";')],['/']),/missing_dependency/);assert.throws(()=>validateStaticClosure([file('src/pages/index.astro','<script src="https://example.com/runtime.js"></script>')],['/']),/external_loaded_dependency/);});

test('owner-provisioned repository requires exact configured ID and initial authorization; never recreates a missing pinned repository',async()=>{
 const repo={id:34,private:true,owner:{id:12,login:'owner'},name:'site',full_name:'owner/site',description:`GNR8 standalone site ${scope.siteId}`,permissions:{push:true},default_branch:'main'};
 for(const scenario of ['valid','wrong-id','unpinned','no-authorization','missing'] as const){
  const store=new Store();const calls:string[]=[];
  const transport:typeof fetch=async(url,init)=>{assert.equal(init?.method,'GET');const path=new URL(String(url)).pathname;calls.push(path);
   if(path==='/repos/owner/site')return scenario==='missing'?new Response('',{status:404}):Response.json(repo);
   if(path.includes('/git/ref/'))return Response.json({object:{sha:git.commit}});
   if(path.includes('/git/commits/'))return Response.json({sha:git.commit,tree:{sha:git.tree}});
   if(path.includes('/git/trees/'))return Response.json({tree:[],truncated:false});
   throw Error('unexpected '+path);
  };
  const r={...release,target:{...release.target,...(scenario==='unpinned'?{}:{provisionedRepositoryId:scenario==='wrong-id'?35:34})}};
  const provider=new GitHubVercelPublicationProvider(store,{github:'test',vercel:'test'},transport);
  if(scenario==='valid'){assert.equal((await provider.prepareGit(r,[],true)).repositoryId,34);await provider.prepareGit(r,[],false);assert.equal(store.values.size,2);}
  else{await assert.rejects(provider.prepareGit(r,[],scenario!=='no-authorization'));assert.equal(store.values.size,0);assert.equal(calls.length,1);}
 }
});

test('static release needs no contact environment and a second release reuses the project without creating another resource',async()=>{
 const f=fixture();f.env.splice(0);const deployments:any[]=[];
 const transport:typeof fetch=async(url,init)=>{const u=new URL(String(url));
  if(u.pathname==='/v6/deployments')return Response.json({deployments:deployments.filter(d=>d.meta.gnr8Release===u.searchParams.get('meta-gnr8Release'))});
  if(u.pathname==='/v13/deployments'&&init?.method==='POST'){const body=JSON.parse(String(init.body));const d={...body,id:'dpl_'+(deployments.length+1),projectId:f.project.id,url:'presentation-'+(deployments.length+1)+'.vercel.app'};deployments.push(d);return Response.json(d);}
  if(u.pathname.startsWith('/v13/deployments/'))return Response.json(deployments.find(d=>u.pathname.endsWith('/'+d.id)));
  return f.transport(url,init);
 };
 const p=new GitHubVercelPublicationProvider(f.store,{github:'fake',vercel:'fake'},transport);
 const first={...release,contactRequired:false};const a=await p.stage(first,git,true);await p.stage(first,git,false);
 const second={...first,id:'f'.repeat(64),target:{...first.target,authorizationId:'second-release'}};const b=await p.stage(second,git,true);await p.stage(second,git,false);
 assert.equal(a.projectId,b.projectId);assert.notEqual(a.deploymentId,b.deploymentId);assert.equal(deployments.length,2);assert.equal(f.writes.length,0);
});

test('new-host attachment reconciles a lost response and never moves an occupied host or exposes an earlier production target',async()=>{
 for(const scenario of ['new','occupied','serving','unconfirmed'] as const){
  const f=fixture();const r={...release,target:{...release.target,domainMode:'new' as const}};const d=await f.provider.stage(r,git,true);let domain:any=null,posts=0;
  if(scenario==='serving')f.project.targets={production:{id:'dpl_previous'}};
  const transport:typeof fetch=async(url,init)=>{const path=new URL(String(url)).pathname;
   if(path==='/v9/projects/prj_site/domains/site.example.com')return domain?Response.json(domain):new Response(null,{status:404});
   if(path==='/v4/aliases/site.example.com')return scenario==='occupied'?Response.json({projectId:'prj_other'}):new Response(null,{status:404});
   if(path==='/v10/projects/prj_site/domains'){posts++;assert.equal(init?.method,'POST');assert.deepEqual(JSON.parse(String(init.body)),{name:'site.example.com'});if(scenario==='new')domain={name:'site.example.com',projectId:'prj_site',verified:false};throw Error('lost response');}
   return f.transport(url,init);
  };
  const p=new GitHubVercelPublicationProvider(f.store,{github:'fake',vercel:'fake'},transport);
  if(scenario==='new'){await p.connectDomain(r,d);await p.connectDomain(r,d);assert.equal(posts,1);}
  else{await assert.rejects(p.connectDomain(r,d));await assert.rejects(p.connectDomain(r,d));assert.equal(posts,scenario==='unconfirmed'?1:0);}
 }
});

test('actual inspection requires production domain, valid DNS/TLS and authoritative exact alias before reporting published',async()=>{
 for(const scenario of ['ready','wrong-alias','dns','tls','branch'] as const){
  const f=fixture();f.env.splice(0);const r={...release,contactRequired:false};const d=await f.provider.stage(r,git,true);f.project.targets={production:{id:d.deploymentId}};
  const transport:typeof fetch=async(url,init)=>{const path=new URL(String(url)).pathname;assert.equal(init?.method,'GET');
   if(path==='/repos/owner/site')return Response.json({id:34,private:true,owner:{id:12,login:'owner'},name:'site',description:`GNR8 standalone site ${scope.siteId}`,permissions:{push:true}});
   if(path.startsWith('/repos/owner/site/git/ref/'))return Response.json({object:{sha:git.commit}});
   if(path==='/v9/projects/prj_site/domains')return Response.json({domains:[{name:'site.example.com',verified:true,...(scenario==='branch'?{gitBranch:'feature'}:{})}]});
   if(path==='/v6/domains/site.example.com/config')return Response.json({misconfigured:scenario==='dns'});
   if(path==='/v4/aliases/site.example.com')return Response.json({projectId:'prj_site',deploymentId:scenario==='wrong-alias'?'dpl_other':d.deploymentId});
   return f.transport(url,init);
  };
  const provider=new GitHubVercelPublicationProvider(f.store,{github:'fake',vercel:'fake'},transport,undefined,async()=>scenario!=='tls');
  const live=await provider.inspect(r,git,d);assert.equal(live.current,scenario==='ready');assert.equal(live.domainReady,['ready','wrong-alias'].includes(scenario));
 }
});
