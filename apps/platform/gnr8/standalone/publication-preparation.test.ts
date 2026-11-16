import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareStandaloneRelease,type PublicationPreparationDependencies} from './publication-preparation';
import {publicationFailureCode,StandalonePreparationError} from './publication-errors';
import {StackiDraftError} from '../stacki/stacki-draft-contract';
import {AstroBuildExportProofError} from '../output-adapters/astro-static-site-build-export-proof';
import type {PublicationStore} from './publication-store';
import type {PublicationTarget} from './publication-contract';
const scope={agencyId:'10000000-0000-4000-8000-000000000001',clientId:'10000000-0000-4000-8000-000000000002',siteId:'10000000-0000-4000-8000-000000000003',siteVersionId:'10000000-0000-4000-8000-000000000004'};
const input={selection:{scope,revision:4,sha256:'a'.repeat(64)},artifactId:'10000000-0000-4000-8000-000000000005',artifactSha256:'b'.repeat(64)};
const target:PublicationTarget={githubOwner:'owner',githubOwnerId:12,githubOwnerKind:'User',repository:'dedicated-site',vercelTeamId:'team_123',project:'dedicated-site',host:'site.example.com',authorizationId:'approved-plan',maxFiles:800,maxBytes:100000000};
function fixture(){
 let writes=0;
 const store={read:async()=>null,claim:async()=>{writes++;return true;},put:async()=>{writes++;},putBytes:async()=>{writes++;}} as unknown as PublicationStore;
 const dependencies:PublicationPreparationDependencies={
  confirmImport:async()=>({confirmationSha256:'1'.repeat(64),brandSha256:'2'.repeat(64),brandRevision:1}),
  resolveOwnership:async()=>({agencyId:scope.agencyId,organizationId:scope.clientId,ownershipSiteId:scope.siteId}) as any,
  readArtifactVersion:async()=>input.artifactId,
  readSourceContext:async id=>({artifact:id===input.artifactId?{id:input.artifactId,bundleSha256:input.artifactSha256,manifest:{generatedOutputSourceWorkspace:{adapterId:'astro-static-site',stackiRevision:{...input.selection,sourceArtifactId:scope.siteVersionId,sourceArtifactSha256:'c'.repeat(64)},acceptedFunctionalReductions:{contact:{recipientConfirmed:true,recipient:'info@example.com'}}}}}:{id:scope.siteVersionId,bundleSha256:'c'.repeat(64)}}) as any,
  readRevision:async()=>({}) as any,loadSource:async()=>[],
  planAssets:async()=>({entries:[{path:'asset.png',name:'e'.repeat(64),sha256:'f'.repeat(64),bytes:1}],identity:'d'.repeat(64),read:async()=>{throw new StackiDraftError(503,'STACKI_SOURCE_ASSET_UNAVAILABLE');}}),
  build:async()=>{throw Error('unexpected_build');},
 };
 return {dependencies,run:()=>prepareStandaloneRelease(input,target,{} as any,store,'local-only',dependencies),writes:()=>writes};
}
test('preparation retains asset failure phase and code and never reserves or writes an incomplete release',async()=>{
 const f=fixture();await assert.rejects(f.run(),e=>e instanceof StandalonePreparationError&&e.phase==='assets'&&e.message==='standalone_stacki_source_asset_unavailable');assert.equal(f.writes(),0);
});
test('wrong owner and changed saved selection fail before checkpoint or asset access',async()=>{
 for(const reason of ['owner','selection']){
  const f=fixture();let reads=0;f.dependencies.readRevision=async()=>{reads++;throw Error('unexpected_read');};
  if(reason==='owner')f.dependencies.resolveOwnership=async()=>({agencyId:'other'}) as any;
  else {const read=f.dependencies.readSourceContext;f.dependencies.readSourceContext=async id=>{const c=await read(id);if(id===input.artifactId)(c!.artifact.manifest.generatedOutputSourceWorkspace as any).stackiRevision.revision=5;return c;};}
  await assert.rejects(f.run(),new RegExp(reason==='owner'?'ownership_mismatch':'selection_stale'));assert.equal(reads,0);assert.equal(f.writes(),0);
 }
});
test('preparation reads bounded selections sequentially and stops before reserving on a later failure',async()=>{
 for(const failSecond of [false,true]){
  const f=fixture();let active=0,peak=0;const seen:string[][]=[];
  const entries=Array.from({length:33},(_,i)=>({path:`asset-${i}.png`,name:i.toString(16).padStart(64,'0'),sha256:'f'.repeat(64),bytes:1}));
  f.dependencies.planAssets=async()=>({identity:'d'.repeat(64),entries,read:async selection=>{
   active++;peak=Math.max(peak,active);seen.push(selection.map(e=>e.path));
   await new Promise(resolve=>setImmediate(resolve));active--;
   if(failSecond&&seen.length===2)throw new StackiDraftError(503,'STACKI_SOURCE_ASSET_UNAVAILABLE');
   return selection.map(e=>({name:e.name,body:Buffer.from('x')}));
  }});
  // In the successful-read case this minimal fixture stops at export; the
  // real retained-input replay separately covers the unchanged exporter.
  await assert.rejects(f.run(),e=>e instanceof StandalonePreparationError&&e.phase===(failSecond?'assets':'export'));
  assert.equal(peak,1);assert.equal(active,0);assert.equal(f.writes(),0);
  assert.deepEqual(seen.map(s=>s.length),failSecond?[16,16]:[16,16,1]);
  assert.deepEqual(seen.flat(),entries.slice(0,failSecond?32:33).map(e=>e.path));
 }
});
test('diagnostics preserve internal build codes without copying messages, output, URLs or secrets',()=>{
 const privateText='private provider response token=secret https://private.example/path';
 assert.equal(publicationFailureCode(new AstroBuildExportProofError('install_failed',privateText,{} as any)),'standalone_build_install_failed');
 assert.equal(publicationFailureCode(new Error('standalone_missing_dependency:'+privateText)),'standalone_missing_dependency');
 assert.equal(publicationFailureCode(new Error(privateText)),'standalone_preparation_failed');
 assert.equal(new StandalonePreparationError('baseline',new TypeError(privateText)).message,'standalone_preparation_baseline_failed');
 assert.equal(publicationFailureCode({code:'STACKI_SECRET',message:privateText}),'standalone_preparation_failed');
});

test('missing user confirmations stop before checkpoint, assets, reservations and providers',async()=>{
 const f=fixture();let reads=0;f.dependencies.confirmImport=async()=>{throw Error('standalone_import_confirmation_missing');};f.dependencies.readRevision=async()=>{reads++;throw Error('unexpected_read');};await assert.rejects(f.run(),/standalone_import_confirmation_missing/);assert.equal(reads,0);assert.equal(f.writes(),0);
});
