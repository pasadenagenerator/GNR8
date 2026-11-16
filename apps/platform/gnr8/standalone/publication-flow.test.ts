import assert from 'node:assert/strict';
import test from 'node:test';
import {rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createStandaloneRoutes} from './publication-routes';
import {runStandalonePublication} from './publication-worker';
import {prepareStandaloneRelease} from './publication-preparation';
import {publicationService,type PublicationProvider} from './publication-service';
import {fingerprint,publicationSelectionForArtifact,type Release,type DeploymentReceipt,type GitReceipt} from './publication-contract';
import {connectionTarget,type ConnectionSettings} from './publication-connection';
import type {PublicationStore} from './publication-store';
import {createAstroStaticSiteProjectManifest} from '../output-adapters/astro-static-site-adapter';
import {astroDevServerSmokeProofFixture} from '../output-adapters/astro-static-site-dev-server-smoke-proof';
import {createAstroStaticSiteSourceSnapshot} from '../output-adapters/astro-static-site-workspace-preparation';
import {prepareStackiSourceProject} from '../stacki/stacki-source-project';
import {CONTACT_ACTION} from '../contact/contact-form';
const scope={agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333',siteVersionId:'44444444-4444-4444-8444-444444444444'};
const actor='55555555-5555-4555-8555-555555555555',artifactId='66666666-6666-4666-8666-666666666666';
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
class Store implements PublicationStore{
 values=new Map<string,any>();bytes=new Map<string,Buffer>();
 async read<T>(k:string){return structuredClone(this.values.get(k)??null) as T|null;}
 async claim(k:string,v:unknown){if(this.values.has(k))return false;this.values.set(k,structuredClone(v));return true;}
 async put<T>(k:string,v:T){await this.claim(k,v);assert.equal(fingerprint(this.values.get(k)),fingerprint(v));return v;}
 async putBytes(k:string,b:Buffer){assert.equal(sha(b),k);this.bytes.set(k,b);}
 async getBytes(k:string){return this.bytes.get(k)!;}
}
export function generatedFixture(contact=false){
 const form=`<form data-gnr8-contact="v1" method="post" action="${CONTACT_ACTION}?path=%2F"><input name="name" required><input name="email" type="email" required><textarea name="message" required></textarea><input name="website"><button>Send</button></form>`;
 const manifest=createAstroStaticSiteProjectManifest(contact?{...astroDevServerSmokeProofFixture(),pages:[{path:'/',title:'Independent presentation',headHtml:'',bodyHtml:'<h1>Independent presentation</h1>'+form}]}:astroDevServerSmokeProofFixture());
 // This suite exercises the supported legacy standalone transform explicitly.
 const pkg=manifest.files.find(f=>f.path==='package.json')!;const pinned=JSON.parse(pkg.contents);pinned.dependencies.astro='5.18.2';pkg.contents=JSON.stringify(pinned);
 const files=manifest.files.map(f=>({...f,sha256:sha(Buffer.from(f.contents)),bytes:Buffer.byteLength(f.contents)}));
 const workspace={adapterId:'astro-static-site',adapterVersion:'gnr8-output-adapter-selection:v1',sourceSiteVersionId:scope.siteVersionId,sourceArtifactId:artifactId,files,assetEvidence:[]};
 const artifact={id:artifactId,bundleSha256:'b'.repeat(64),manifest:{generatedOutputSourceWorkspace:workspace}};
 const binding={runtimeSiteId:'presentation',sourceSiteVersionId:scope.siteVersionId,sourceArtifactId:artifactId,sourceSnapshotSha256:createAstroStaticSiteSourceSnapshot(files.map(f=>({path:f.path,body:Buffer.from(f.contents)}))).aggregateSha256,requiredAssets:[]};
 return {workspace,artifact,binding};
}
function fixture(contact=false){
 const retained=generatedFixture(contact),store=new Store();const input=publicationSelectionForArtifact(scope,retained.artifact);
 const settings:ConnectionSettings={githubOwner:'owner',githubOwnerId:12,githubOwnerKind:'User',repository:'presentation',vercelTeamId:'team_123',project:'presentation',host:'presentation.example.com',hostPurpose:'working',domainMode:'new',contact:contact?{recipient:'owner@example.com',confirmed:true,maxClaims:80,perHour:3,retentionDays:14}:null};
 const target=connectionTarget({scope:{agencyId:scope.agencyId,clientId:scope.clientId,siteId:scope.siteId},settings,tokens:{github:'fake',vercel:'fake'},revision:1},input);
 let builds=0,gitWrites=0,stages=0,promotions=0,current=false,revoked=false,environment='c'.repeat(64),lost=false;let release:Release;let git:GitReceipt;let deployment:DeploymentReceipt;
 const provider:PublicationProvider={
  async prepareGit(r,files,create){if(create)gitWrites++;assert(files.every(f=>!f.body.includes('never-return')));assert.equal(files.some(f=>f.path==='api/contact.mjs'),contact);assert.equal(files.some(f=>f.path==='server/contact-runtime.mjs'),contact);release=r;return git={repositoryId:20,ownerId:12,repository:'owner/presentation',commit:'d'.repeat(40),tree:'e'.repeat(40),manifestSha256:r.manifestSha256};},
  async stage(r,g,create){if(create)stages++;deployment={projectId:'prj_one',deploymentId:'dpl_one',url:'https://presentation-one.vercel.app',commit:g.commit,manifestSha256:r.manifestSha256,configurationSha256:environment,target:'production'};if(lost){lost=false;throw Error('lost');}return deployment;},
  async inspect(){return {...deployment,configurationSha256:environment,ready:true,current,domainReady:true,repositoryId:20,ownerId:12};},
  async promote(){promotions++;current=true;},
 };
 const authorize=async()=>{if(revoked)throw Error('standalone_ownership_mismatch');return {userId:actor};};
 const compose=async(i:typeof input,a:typeof authorize)=>({target,store,client:{} as any,bucket:'test',provider,service:publicationService(store,provider,a),requestId:fingerprint({input:i,target})}) as any;
 const preparation={confirmImport:async()=>({confirmationSha256:'1'.repeat(64),brandSha256:'2'.repeat(64),brandRevision:1}),resolveOwnership:async()=>({agencyId:scope.agencyId,organizationId:scope.clientId,ownershipSiteId:scope.siteId}) as any,readArtifactVersion:async()=>scope.siteVersionId,readSourceContext:async()=>({artifact:retained.artifact}) as any,readRevision:async()=>{throw Error('must not invent Stacki revision');},loadSource:async()=> (await prepareStackiSourceProject({workspace:retained.workspace,binding:retained.binding,readVerifiedAsset:async()=>{throw Error('unexpected assets');}})).files,planAssets:async()=>({entries:[],identity:'f'.repeat(64),read:async()=>[]}),build:async(args:any)=>{builds++;const workspace=await args.dependencies.prepareWorkspace({});const hash=workspace.sourceSnapshot.aggregateSha256;await rm(workspace.workspacePath,{recursive:true,force:true});return {installation:{completed:true},build:{completed:true},cleanup:{completed:true},sourceComparison:{unchanged:true,baselineAggregateSha256:hash,finalAggregateSha256:hash},export:{files:workspace.sourceSnapshot.files.filter((f:any)=>f.path.startsWith('src/pages/')&&f.path.endsWith('.astro')).map((f:any)=>({path:f.path.slice(10).replace(/\.astro$/,'.html')})),fileCount:1,aggregateSha256:'f'.repeat(64)},versions:{node:process.version}} as any;}};
 const workerDeps={client:()=>({}) as any,actor:async()=>{await authorize();},ownership:preparation.resolveOwnership,compose,prepare:(...args:Parameters<typeof prepareStandaloneRelease>)=>prepareStandaloneRelease(...args.slice(0,5) as Parameters<typeof prepareStandaloneRelease>,preparation)} as any;
 const route=createStandaloneRoutes({authorize:authorize as any,readSource:async()=>({artifact:retained.artifact}) as any,compose,send:async(event)=>{await runStandalonePublication(event.data,workerDeps);}});
 const context={params:Promise.resolve({clientId:scope.clientId,siteId:scope.siteId})};const selection={siteVersionId:scope.siteVersionId,artifactId,artifactBundleSha256:retained.artifact.bundleSha256};
 const url='https://gnr8.example/api/standalone?agencyId='+scope.agencyId;
 async function call(action?:string,extra:Record<string,unknown>={}){const request=action?new Request(url,{method:'POST',headers:{origin:'https://gnr8.example','content-type':'application/json'},body:JSON.stringify({...selection,action,...extra})}):new Request(url+'&'+new URLSearchParams(selection));const response=await (action?route.POST:route.GET)(request,context);assert.equal(response.headers.get('cache-control'),'private,no-store');return response.json();}
 return {call,store,input,target,retained,preparation,get release(){return release!;},get counts(){return {builds,gitWrites,stages,promotions};},revoke(){revoked=true;},drift(){environment='a'.repeat(64);},lose(){lost=true;}};
}
for(const contact of [false,true])test(`API → worker → saved source → export → provider → approval/publish (${contact?'contact':'no contact'})`,async()=>{
 process.env.GNR8_STANDALONE_PUBLICATION_ENABLED='1';const f=fixture(contact);
 assert.equal((await f.call('prepare')).ok,true);assert.equal((await f.call('prepare')).ok,true);
 assert.equal(f.release.foundation?.nodeVersion,'22.x');
 assert.equal(f.release.input.selection.revision,undefined);assert.equal((f.release.input.selection as any).kind,'generated-source');assert.equal(f.release.contactRequired,contact);
 const review=await f.call();assert.equal(review.data.state,'review');const evidenceSha256=review.data.evidenceSha256;
 assert.equal((await f.call('publish',{evidenceSha256,confirmation:'publish-exact-standalone-deployment'})).ok,false);
 assert.equal((await f.call('approve',{evidenceSha256,confirmation:'approve-exact-standalone-deployment'})).data.state,'approved');
 assert.equal((await f.call('publish',{evidenceSha256,confirmation:'publish-exact-standalone-deployment'})).data.state,'published');await f.call('publish',{evidenceSha256,confirmation:'publish-exact-standalone-deployment'});
 assert.deepEqual(f.counts,{builds:1,gitWrites:1,stages:1,promotions:1});
});
test('lost worker response resumes without another build; stale selection, ownership and environment block approval',async()=>{
 process.env.GNR8_STANDALONE_PUBLICATION_ENABLED='1';const f=fixture();f.lose();assert.equal((await f.call('prepare')).ok,false);assert.equal((await f.call('prepare')).ok,true);assert.equal(f.counts.builds,1);assert.equal(f.counts.stages,1);
 const review=await f.call();f.drift();assert.equal((await f.call('approve',{evidenceSha256:review.data.evidenceSha256,confirmation:'approve-exact-standalone-deployment'})).ok,false);
 assert.equal((await f.call('prepare',{artifactBundleSha256:'0'.repeat(64)})).error,'standalone_selection_stale');f.revoke();assert.equal((await f.call('prepare')).error,'standalone_ownership_mismatch');assert.equal(f.counts.promotions,0);
});
test('changed retained workspace is stale before build/provider operations',async()=>{
 const f=fixture();f.retained.workspace.files[0]!.contents+='tampered';await assert.rejects(prepareStandaloneRelease(f.input,f.target,{} as any,f.store,'test',f.preparation),/selection_stale/);assert.deepEqual(f.counts,{builds:0,gitWrites:0,stages:0,promotions:0});
});

for(const failure of ['build','routes','confirmation'])test(`failed ${failure} cannot create ready evidence or reach providers`,async()=>{
 process.env.GNR8_STANDALONE_PUBLICATION_ENABLED='1';const f=fixture();
 if(failure==='confirmation')f.preparation.confirmImport=async()=>{throw Error('standalone_import_confirmation_missing');};
 else {const build=f.preparation.build;f.preparation.build=async args=>{const proof=await build(args);if(failure==='build')proof.sourceComparison.unchanged=false;else proof.export.files=[];return proof;};}
 assert.equal((await f.call('prepare')).ok,false);
 assert.equal(f.counts.gitWrites,0);assert.equal(f.counts.stages,0);
 assert(![...f.store.values.keys()].some(k=>k.endsWith('/release.json')||k.endsWith('/build.json')));
 assert.equal(f.store.bytes.size,0);
});
test('confirmation changed during build cannot be stored as ready',async()=>{
 process.env.GNR8_STANDALONE_PUBLICATION_ENABLED='1';const f=fixture();let checks=0;
 f.preparation.confirmImport=async()=>({confirmationSha256:String(++checks).repeat(64),brandSha256:'2'.repeat(64),brandRevision:1});
 const response=await f.call('prepare');assert.equal(response.ok,false);assert.equal(response.error,'standalone_import_confirmation_stale');
 assert.equal(f.counts.builds,1);assert.equal(f.counts.gitWrites,0);assert.equal(f.counts.stages,0);assert.equal(f.store.bytes.size,0);
 assert(![...f.store.values.keys()].some(k=>k.endsWith('/release.json')||k.endsWith('/build.json')));
});
