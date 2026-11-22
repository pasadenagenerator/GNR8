import { inngest } from '@/gnr8/inngest/client';
import { NATIVE_STUDIO_FIRST_BUILD_EVENT } from './native-studio-first-build-job';

export const nativeStudioPreparationJob=inngest.createFunction({id:'native-studio-preparation-job',retries:1,
 concurrency:{limit:1,key:'event.data.scope.siteId'}},{event:'gnr8/native-studio.prepare.requested'},async({event})=>{
 if(event.data.mode==='source'){
  const {runDirectNativeStudioPreparation}=await import('@/gnr8/standalone/native-studio-direct-preparation');
  let prepared;
  try{prepared=await runDirectNativeStudioPreparation(event.data);}
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
     requestId:prepared.requestId,sourceId:prepared.sourceId}});
  return prepared;
 }
 const {runNativeStudioPreparation}=await import('@/gnr8/standalone/native-studio-preparation');
 return runNativeStudioPreparation(event.data);
});
