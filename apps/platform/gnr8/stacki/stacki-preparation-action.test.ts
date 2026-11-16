import test from 'node:test';
import assert from 'node:assert/strict';
import { queueStackiPreparation } from './stacki-preparation-action';
import { parseSiteAstroGenerationPayload } from '../../../worker/gnr8/site/inngest/site-astro-generation-payload';
const scope={agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333',siteVersionId:'44444444-4444-4444-8444-444444444444'};
const actor='55555555-5555-4555-8555-555555555555';
const input={siteId:scope.siteId,agencyId:scope.agencyId,actor:`user:${actor}`,actionId:'action',requestedAt:'2026-11-01T12:00:00.000Z',stackiBaseline:scope};
test('explicit baseline action reaches Worker parsing with server source and actor; ordinary revision remains distinct',async()=>{
 const events:any[]=[];
 const deps={enabled:()=>true,authorize:async()=>({userId:actor,agencyId:scope.agencyId}),source:async()=>({versionId:scope.siteVersionId,runtimeSiteId:'site_test',artifactId:'artifact',sha256:'a'.repeat(64)}),emit:async(p:unknown)=>{events.push(p)}};
 await queueStackiPreparation(input,deps);
 assert.deepEqual(parseSiteAstroGenerationPayload(events[0]),events[0]);assert.equal(events[0].actor,actor);assert.equal(events[0].stackiRevision,undefined);
 await queueStackiPreparation({...input,stackiBaseline:undefined,stackiRevision:{scope,revision:2,sha256:'b'.repeat(64)}},deps);
 assert.deepEqual(parseSiteAstroGenerationPayload(events[1]),events[1]);assert.equal(events[1].stackiBaseline,undefined);
 for(const bad of [{...events[0],stackiRevision:events[1].stackiRevision},{...events[0],ownershipSiteId:'other'},{...events[0],sourceSiteVersionId:'other'},{...events[0],stackiSourceArtifactSha256:undefined},{...events[0],strategy:'other'},{...events[0],stackiBaseline:undefined,stackiSourceArtifactSha256:undefined}])assert.equal(parseSiteAstroGenerationPayload(bad),null);
});
test('disabled, mixed, cross-scope and changed actor requests cannot dispatch',async()=>{
 let sends=0;const deps={enabled:()=>true,authorize:async()=>({userId:actor,agencyId:scope.agencyId}),source:async()=>({versionId:scope.siteVersionId,runtimeSiteId:'site_test',artifactId:'artifact',sha256:'a'.repeat(64)}),emit:async()=>{sends++}};
 await assert.rejects(queueStackiPreparation(input,{...deps,enabled:()=>false}),/DISABLED/);
 await assert.rejects(queueStackiPreparation({...input,stackiRevision:{scope,revision:1,sha256:'a'.repeat(64)}},deps),/SCOPE_MISMATCH/);
 await assert.rejects(queueStackiPreparation({...input,siteId:'other'},deps),/SCOPE_MISMATCH/);
 await assert.rejects(queueStackiPreparation({...input,actor:'other'},deps),/ACTOR_CHANGED/);
 await assert.rejects(queueStackiPreparation(input,{...deps,authorize:async()=>{throw Error('expired session')}}),/expired session/);
 assert.equal(sends,0);
});
