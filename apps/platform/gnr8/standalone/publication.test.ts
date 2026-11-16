import assert from 'node:assert/strict';
import test from 'node:test';
import {publicationService,type PublicationProvider} from './publication-service';
import {runStandalonePublication} from './publication-worker';
import {fingerprint,releaseEvidence,type Release,type GitReceipt,type DeploymentReceipt,type LiveRelease} from './publication-contract';
import type {PublicationStore} from './publication-store';
const scope={agencyId:'10000000-0000-4000-8000-000000000001',clientId:'10000000-0000-4000-8000-000000000002',siteId:'10000000-0000-4000-8000-000000000003',siteVersionId:'10000000-0000-4000-8000-000000000004'};
const hash='a'.repeat(64);
const release:Release={id:'b'.repeat(64),input:{selection:{scope,revision:4,sha256:hash},artifactId:scope.siteVersionId,artifactSha256:hash},target:{githubOwner:'owner',githubOwnerId:12,githubOwnerKind:'User',repository:'dedicated-site',vercelTeamId:'team_123',project:'dedicated-site',host:'site.example.com',authorizationId:'approved-plan',maxFiles:10,maxBytes:1000},manifestSha256:hash,files:[],routes:['/']};
const git:GitReceipt={repositoryId:34,ownerId:12,repository:'owner/dedicated-site',commit:'c'.repeat(40),tree:'d'.repeat(40),manifestSha256:hash};
const deployment:DeploymentReceipt={projectId:'prj_test',deploymentId:'dpl_test',url:'https://immutable.vercel.app',commit:git.commit,manifestSha256:hash,configurationSha256:'e'.repeat(64),target:'production'};
class MemoryStore implements PublicationStore{values=new Map<string,any>();async read<T>(k:string){return structuredClone(this.values.get(k)??null) as T|null;}async claim(k:string,v:any){if(this.values.has(k))return false;this.values.set(k,structuredClone(v));return true;}async put<T>(k:string,v:T){await this.claim(k,v);const stored=await this.read<T>(k);if(fingerprint(stored)!==fingerprint(v))throw Error('conflict');return stored!;}async putBytes(){}async getBytes(){return Buffer.from('');}}
function fixture(){const store=new MemoryStore();const live:LiveRelease={...deployment,ready:true,current:false,domainReady:true,repositoryId:34,ownerId:12};const writes:string[]=[];let revoked=false;
 const provider:PublicationProvider={async prepareGit(_r,_f,create){if(create)writes.push('git');return git;},async stage(_r,_g,create){if(create)writes.push('build');return deployment;},async inspect(){return {...live};},async promote(){writes.push('promote');live.current=true;}};
 const service=publicationService(store,provider,async()=>{if(revoked)throw Error('revoked');return {userId:'actor'};});return {store,live,writes,provider,service,revoke(){revoked=true;}};}
test('real service sequence prepares exact selection, reviews deployment, promotes once without rebuild',async()=>{const f=fixture();await f.service.prepare(release,[]);await f.service.prepare(release,[]);assert.deepEqual(f.writes,['git','build']);const s=await f.service.status(release);assert.equal(s.state,'review');await assert.rejects(f.service.publish(release,s.evidenceSha256!),/approval_missing/);await f.service.approve(release,s.evidenceSha256!);await f.service.publish(release,s.evidenceSha256!);await f.service.publish(release,s.evidenceSha256!);assert.deepEqual(f.writes,['git','build','promote']);});
test('stored Git receipt must match the approved release before a retry',async()=>{const f=fixture();await f.service.prepare(release,[]);f.store.values.set(`releases/${release.id}/git.json`,{...git,manifestSha256:'0'.repeat(64)});await assert.rejects(f.service.prepare(release,[]),/standalone_git_receipt_invalid/);});
test('worker resumes from verified Git without rereading release bytes',async()=>{
 const f=fixture();const selected={...release,files:[{path:'index.html',sha256:hash,bytes:1}]};
 const requestId=fingerprint({input:selected.input,target:selected.target});
 await f.store.put(`requests/${requestId}.json`,{input:selected.input,actor:scope.siteVersionId,target:selected.target});
 await f.store.put(`requests/${requestId}-release.json`,selected);
 await f.store.put(`releases/${selected.id}/git.json`,git);
 f.store.getBytes=async()=>{throw Error('release bytes should not be fetched');};
 await runStandalonePublication({input:selected.input,requestId,actor:scope.siteVersionId},{
  client:()=>({}) as never,actor:async()=>{},ownership:async()=>({agencyId:scope.agencyId,
   organizationId:scope.clientId,ownershipSiteId:scope.siteId}) as never,
  compose:async()=>({target:selected.target,store:f.store,client:{} as never,bucket:'test',
   service:f.service,requestId}) as never,
  prepare:async()=>{throw Error('release preparation should not repeat');},
 } as never);
 assert.deepEqual(f.writes,['build']);
});
test('commit, project, deployment, manifest, environment or ownership drift fails before promotion',async()=>{for(const mutation of [{commit:'f'.repeat(40)},{projectId:'other'},{deploymentId:'other'},{manifestSha256:'f'.repeat(64)},{configurationSha256:'f'.repeat(64)},{repositoryId:99},{ownerId:99},{target:'preview'},{ready:false}]){const f=fixture();await f.service.prepare(release,[]);const s=await f.service.status(release);await f.service.approve(release,s.evidenceSha256!);Object.assign(f.live,mutation);await assert.rejects(f.service.publish(release,s.evidenceSha256!));assert(!f.writes.includes('promote'));}});
test('source later Save cannot replace explicitly selected revision; stale UI evidence fails',async()=>{const f=fixture();await f.service.prepare(release,[]);const s=await f.service.status(release);const next={...release,id:'f'.repeat(64),input:{...release.input,selection:{...release.input.selection,revision:5}}};assert.notEqual(releaseEvidence(next,git,deployment,f.live),s.evidenceSha256);await assert.rejects(f.service.approve(release,'f'.repeat(64)),/stale/);assert.equal((await f.service.status(release)).release.input.selection.revision,4);});
test('lost provider response reconciles without another create or build',async()=>{const f=fixture();let lost=true;const stage=f.provider.stage;f.provider.stage=async(r,g,c)=>{const receipt=await stage(r,g,c);if(lost){lost=false;throw Error('lost response');}return receipt;};await assert.rejects(f.service.prepare(release,[]));await f.service.prepare(release,[]);assert.deepEqual(f.writes,['git','build']);});
test('unauthorized actor, absent domain, resource limits and concurrent preparation are blocked',async()=>{const f=fixture();await Promise.all([f.service.prepare(release,[]),f.service.prepare(release,[])]);assert.deepEqual(f.writes,['git','build']);let s=await f.service.status(release);await f.service.approve(release,s.evidenceSha256!);f.live.domainReady=false;await assert.rejects(f.service.publish(release,s.evidenceSha256!),/domain_not_ready/);f.revoke();await assert.rejects(f.service.prepare(release,[]),/revoked/);});

test('one approved hosted authorization cannot create another revision or rebuild',async()=>{const f=fixture();await f.service.prepare(release,[]);const next={...release,id:'f'.repeat(64),input:{...release.input,selection:{...release.input.selection,revision:5}}};await assert.rejects(f.service.prepare(next,[]),/approved_operation_budget_exceeded/);assert.deepEqual(f.writes,['git','build']);});

test('a pre-approved export hash blocks drift before any claim or provider operation',async()=>{
 const f=fixture();
 for(const approvedManifestSha256 of ['f'.repeat(64),'invalid']){
  await assert.rejects(f.service.prepare({...release,target:{...release.target,approvedManifestSha256}},[]),new RegExp(approvedManifestSha256==='invalid'?'target_invalid':'approved_manifest_mismatch'));
  assert.equal(f.store.values.size,0);assert.deepEqual(f.writes,[]);
 }
 await f.service.prepare({...release,target:{...release.target,approvedManifestSha256:hash}},[]);
 assert.deepEqual(f.writes,['git','build']);
});
