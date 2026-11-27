import { inngest } from '@/gnr8/inngest/client';
import { NATIVE_STUDIO_FIRST_BUILD_EVENT } from './native-studio-first-build-job';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const SHA=/^[a-f0-9]{64}$/;

/** Recheck event authority and the current confirmation before Access setup,
 * because Inngest delivery alone does not authorize a provider mutation. */
type SourcePreflightDeps = {
  client: () => Promise<any>; actor: (client:any,scope:any,actor:string)=>Promise<void>;
  ownership: (siteVersionId:string)=>Promise<any>;
  confirmed: (client:any,input:any)=>Promise<any>;
  parse: (input:unknown)=>any; fingerprint: (value:unknown)=>string;
};
export async function authorizeNativeStudioSourceEventBeforeAccess(data: any,
 deps?: SourcePreflightDeps){
 if(!deps){
  const {parsePublicationSelection,fingerprint}=await import('@/gnr8/standalone/publication-contract');
  deps={
  client: async()=>{const {getSupabaseServiceRoleClient}=await import('@/src/supabase/service-role-server');
   return getSupabaseServiceRoleClient();},
  actor: async(client,scope,actor)=>{const {requireAgencyBackgroundActor}=await import('@/src/auth/agency-background-action');
   await requireAgencyBackgroundActor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});},
  ownership: async(siteVersionId)=>{const {SupabaseAstroCandidateOwnershipResolver}=await import('@/gnr8/output-adapters/astro-production-candidate-ownership-resolver');
   return new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId});},
  confirmed: async(client,input)=>{const {requireCurrentStudioSourceSelection}=await import('@/gnr8/standalone/current-confirmed-import');
   return requireCurrentStudioSourceSelection(client,input);},
  parse: parsePublicationSelection,
  fingerprint,
  };
 }
 const {scope,actor,requestId,attemptId}=data??{};
 if(data?.mode!=='source'||!scope||![scope.agencyId,scope.clientId,scope.siteId,actor].every(value=>
   typeof value==='string'&&UUID.test(value))||typeof requestId!=='string'||!SHA.test(requestId)||
   (attemptId!==undefined&&(typeof attemptId!=='string'||!UUID.test(attemptId))))
  throw Error('native_studio_request_invalid');
 const input=deps.parse(data.input),selected=input.selection.scope;
 if(!selected||selected.agencyId!==scope.agencyId||selected.clientId!==scope.clientId||
   selected.siteId!==scope.siteId||typeof selected.siteVersionId!=='string'||
   !UUID.test(selected.siteVersionId))throw Error('native_studio_selection_mismatch');
 const client=await deps.client();if(!client)throw Error('native_studio_store_unavailable');
 await deps.actor(client,scope,actor);
 const current=await deps.confirmed(client,input);
 if(typeof current?.confirmationSha256!=='string'||!SHA.test(current.confirmationSha256)||
   typeof current.artifactVersionId!=='string'||!UUID.test(current.artifactVersionId)||
   typeof current.captureVersionId!=='string'||!UUID.test(current.captureVersionId)||
   deps.fingerprint({input,confirmationSha256:current.confirmationSha256})!==requestId)
  throw Error('native_studio_request_stale');
 for(const siteVersionId of new Set([selected.siteVersionId,
  current.artifactVersionId,current.captureVersionId])){
  const owner=await deps.ownership(siteVersionId);
  if(owner.agencyId!==scope.agencyId||owner.organizationId!==scope.clientId||
    owner.ownershipSiteId!==scope.siteId)throw Error('native_studio_ownership_mismatch');
 }
 return {client,scope};
}

export async function prepareNativeStudioSourceEvent(data:any,deps={
 authorize:authorizeNativeStudioSourceEventBeforeAccess,
 prerequisite:async(scope:any,client:any)=>{const {ensureConfiguredNativeStudioAccessBeforeSource}=await import('@/gnr8/standalone/native-studio-configured-access-prerequisite');
  return ensureConfiguredNativeStudioAccessBeforeSource(scope,client);},
 prepare:async(data:any)=>{const {runDirectNativeStudioPreparation}=await import('@/gnr8/standalone/native-studio-direct-preparation');
  return runDirectNativeStudioPreparation(data);},
}){
 const {client,scope}=await deps.authorize(data);
 try { await deps.prerequisite(scope,client); }
 catch(error){
  if(error instanceof Error&&/^native_studio_[a-z0-9_]+$/.test(error.message))throw error;
  throw Error('native_studio_access_prerequisite_failed');
 }
 try { return await deps.prepare(data); }
 catch(error){
  if(error instanceof Error&&/^native_studio_[a-z0-9_]+$/.test(error.message))throw error;
  throw Error('native_studio_source_preparation_failed');
 }
}

export const nativeStudioPreparationJob=inngest.createFunction({id:'native-studio-preparation-job',retries:1,
 concurrency:{limit:1,key:'event.data.scope.siteId'}},{event:'gnr8/native-studio.prepare.requested'},async({event})=>{
 if(event.data.mode==='source'){
  let prepared;
  try{prepared=await prepareNativeStudioSourceEvent(event.data);}
  catch(error){
   const {scope,actor,requestId,attemptId}=event.data;
   if(scope&&[scope.agencyId,scope.clientId,scope.siteId,actor].every(value=>/^[a-f0-9-]{36}$/.test(value))&&
      typeof requestId==='string'&&/^[a-f0-9]{64}$/.test(requestId)){
    try{
     const {getSupabaseServiceRoleClient}=await import('@/src/supabase/service-role-server');
     const {requireAgencyBackgroundActor}=await import('@/src/auth/agency-background-action');
     const {SupabaseAstroCandidateOwnershipResolver}=await import('@/gnr8/output-adapters/astro-production-candidate-ownership-resolver');
     const {SupabasePublicationStore}=await import('@/gnr8/standalone/publication-store');
     const client=getSupabaseServiceRoleClient();
     if(client){
      await requireAgencyBackgroundActor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});
      const selected=event.data.input?.selection?.scope;
      if(!selected||selected.agencyId!==scope.agencyId||selected.clientId!==scope.clientId||
         selected.siteId!==scope.siteId)throw Error('native_studio_selection_mismatch');
      const owner=await new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId:selected.siteVersionId});
      if(owner.agencyId!==scope.agencyId||owner.organizationId!==scope.clientId||owner.ownershipSiteId!==scope.siteId)
       throw Error('native_studio_ownership_mismatch');
      const store=new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope);
      const code=error instanceof Error&&/^native_studio_[a-z0-9_]+$/.test(error.message)
       ?error.message:'native_studio_preparation_failed';
      const scopedAttempt=typeof attemptId==='string'&&
       /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(attemptId)?attemptId:null;
      if(attemptId!==undefined&&!scopedAttempt)throw Error('native_studio_request_invalid');
      await store.claim(`native-requests/${requestId}${scopedAttempt?`-${scopedAttempt}`:''}-failure.json`,
       {requestId,code,...(scopedAttempt?{attemptId:scopedAttempt}:{})});
     }
    }catch{/* A failed status write must never disguise the original failure. */}
   }
   throw Error('native_studio_preparation_failed');
  }
  if(process.env.GNR8_NATIVE_STUDIO_FIRST_BUILD_ENABLED==='1')
   await inngest.send({name:NATIVE_STUDIO_FIRST_BUILD_EVENT,
    data:{scope:event.data.scope,actor:event.data.actor,
     requestId:prepared.requestId,sourceId:prepared.sourceId,
     ...(prepared.attemptId?{attemptId:prepared.attemptId}:{})}});
  return prepared;
 }
 const {runNativeStudioPreparation}=await import('@/gnr8/standalone/native-studio-preparation');
 return runNativeStudioPreparation(event.data);
});
