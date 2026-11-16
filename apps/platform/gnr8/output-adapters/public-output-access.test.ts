import test from 'node:test';
import assert from 'node:assert/strict';
import { requirePublicOutputSite, requirePublicOutputVersion } from './public-output-access';
const scope={agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'};
const actor={userId:'signed-in-owner',agencyId:scope.agencyId} as never;
test('site access requires membership before storage, and checks the full agency/client/site tuple',async()=>{
  let reads=0;
  await assert.rejects(requirePublicOutputSite(scope,{authorize:async()=>{throw new Error('403|No membership');},client:()=>{reads++;return null;}}),/No membership/);
  assert.equal(reads,0);
  const filters:Record<string,string>={};
  const q={select(){return q;},eq(key:string,value:string){filters[key]=value;return q;},async maybeSingle(){return {data:filters.id===scope.siteId&&filters.org_id===scope.clientId&&filters.agency_id===scope.agencyId?{id:scope.siteId}:null,error:null};}};
  const deps={authorize:async()=>actor,client:()=>({from:()=>q}) as never};
  assert.equal((await requirePublicOutputSite(scope,deps)).userId,'signed-in-owner');
  await assert.rejects(requirePublicOutputSite({...scope,clientId:scope.agencyId},deps),/PUBLIC_OUTPUT_NOT_FOUND/);
});
test('an agency owner cannot select another site or organization target',async()=>{
  const ownership={agencyId:scope.agencyId,organizationId:scope.clientId,ownershipSiteId:scope.siteId,runtimeSiteId:'runtime',siteVersionId:scope.siteId};
  for(const mismatch of [{ownershipSiteId:scope.clientId},{organizationId:scope.siteId},{agencyId:scope.clientId}]){
    await assert.rejects(requirePublicOutputVersion(scope,scope.siteId,{authorizeSite:async()=>actor,resolve:async()=>({...ownership,...mismatch})}),/PUBLIC_OUTPUT_NOT_FOUND/);
  }
  assert.equal((await requirePublicOutputVersion(scope,scope.siteId,{authorizeSite:async()=>actor,resolve:async()=>ownership})).userId,'signed-in-owner');
});
