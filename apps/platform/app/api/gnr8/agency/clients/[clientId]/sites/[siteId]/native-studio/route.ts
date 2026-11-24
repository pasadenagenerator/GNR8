import { randomUUID } from 'node:crypto';
import { requirePublicOutputSite, requirePublicOutputVersion } from '@/gnr8/output-adapters/public-output-access';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { SupabasePublicationStore } from '@/gnr8/standalone/publication-store';
import { readBoundedJson, requireSameOriginJson } from '@/gnr8/stacki/stacki-draft-route-handlers';
import { inngest } from '@/gnr8/inngest/client';
import { fingerprint, publicationSelectionForArtifact, type Release } from '@/gnr8/standalone/publication-contract';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '@/gnr8/output-adapters/astro-candidate-runtime-artifact-store';
import { requireCurrentStudioSourceSelection } from '@/gnr8/standalone/current-confirmed-import';
import { configuredNativeStudioSite } from '@/gnr8/standalone/native-studio-preparation';
import { configuredNativeStudioDirectSourceSite } from '@/gnr8/standalone/native-studio-bootstrap-site';
import { readNativeStudioSourceStatus } from '@/gnr8/standalone/native-studio-source-status';
export const runtime='nodejs';
type Scope={agencyId:string;clientId:string;siteId:string};
async function currentSource(scope:Scope,client:NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,
 selection:Record<string,unknown>){
 if(![selection.siteVersionId,selection.artifactId,selection.artifactBundleSha256].every(value=>typeof value==='string'))
  throw Error('native_studio_request_invalid');
 const siteVersionId=selection.siteVersionId as string;
 await requirePublicOutputVersion(scope,siteVersionId);
 const source=await new SupabaseAstroCandidateRuntimeArtifactStore(client).readSourceContext(siteVersionId);
 if(!source||source.artifact.id!==selection.artifactId||source.artifact.bundleSha256!==selection.artifactBundleSha256)
  throw Error('native_studio_source_stale');
 const input=publicationSelectionForArtifact({...scope,siteVersionId},source.artifact);
 const selected=input.selection.scope;
 if(selected.agencyId!==scope.agencyId||selected.clientId!==scope.clientId||selected.siteId!==scope.siteId)
  throw Error('native_studio_selection_mismatch');
 await requirePublicOutputVersion(scope,selected.siteVersionId);
 let current;
 try{current=await requireCurrentStudioSourceSelection(client,input);}
 catch{throw Error('native_studio_confirmation_stale');}
 await requirePublicOutputVersion(scope,current.artifactVersionId);
 await requirePublicOutputVersion(scope,current.captureVersionId);
 return {input,requestId:fingerprint({input,confirmationSha256:current.confirmationSha256})};
}
export async function GET(request:Request,context:{params:Promise<{clientId:string;siteId:string}>}){
 const headers={'cache-control':'private,no-store'};
 try{
  const url=new URL(request.url);
  const scope={...await context.params,agencyId:url.searchParams.get('agencyId')??''};
  await requirePublicOutputSite(scope);
  const client=getSupabaseServiceRoleClient();if(!client)throw Error('native_studio_store_unavailable');
  await configuredNativeStudioDirectSourceSite(scope,client);
  const attemptId=url.searchParams.get('attemptId');
  if(attemptId!==null&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(attemptId))
   throw Error('native_studio_request_invalid');
  let requestId=url.searchParams.get('requestId')??'';
  if(!requestId){
   if([...url.searchParams.keys()].sort().join()!==
      (attemptId===null?'agencyId,artifactBundleSha256,artifactId,siteVersionId':
       'agencyId,artifactBundleSha256,artifactId,attemptId,siteVersionId'))
    throw Error('native_studio_request_invalid');
   requestId=(await currentSource(scope,client,Object.fromEntries(url.searchParams))).requestId;
  }
  if(!/^[a-f0-9]{64}$/.test(requestId))throw Error('native_studio_request_invalid');
  const store=new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope);
  return Response.json({ok:true,data:await readNativeStudioSourceStatus(store,requestId,attemptId)},{headers});
 }catch(error){
  const code=error instanceof Error&&/^native_studio_[a-z0-9_]+$/.test(error.message)?error.message:'native_studio_unavailable';
  return Response.json({ok:false,error:code},{status:409,headers});
 }
}
export async function POST(request:Request,context:{params:Promise<{clientId:string;siteId:string}>}){
 const headers={'cache-control':'private,no-store'};
 try{
  requireSameOriginJson(request);
  const body=await readBoundedJson(request) as Record<string,unknown>;
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.agencyId!=='string')
   throw Error('native_studio_request_invalid');
  const scope={...await context.params,agencyId:body.agencyId};
  const actor=await requirePublicOutputSite(scope);
  const client=getSupabaseServiceRoleClient();if(!client)throw Error('native_studio_store_unavailable');
  if(body.action==='prepare-source'){
   await configuredNativeStudioDirectSourceSite(scope,client);
   if(Object.keys(body).sort().join()!=='action,agencyId,artifactBundleSha256,artifactId,siteVersionId'||
      ![body.siteVersionId,body.artifactId,body.artifactBundleSha256].every(value=>typeof value==='string'))
    throw Error('native_studio_request_invalid');
   const {input,requestId}=await currentSource(scope,client,body);
   const attemptId=randomUUID();
   await inngest.send({name:'gnr8/native-studio.prepare.requested',
    data:{mode:'source',scope,input,requestId,attemptId,actor:actor.userId}});
   return Response.json({ok:true,data:{state:'preparing-source',requestId,attemptId}},{headers});
  }
  if(Object.keys(body).sort().join()!=='agencyId,releaseId'||typeof body.releaseId!=='string'||
     !/^[a-f0-9]{64}$/.test(body.releaseId))throw Error('native_studio_request_invalid');
  await configuredNativeStudioSite(scope);
  const store=new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope);
  const release=await store.read<Release>(`releases/${body.releaseId}/release.json`);
  if(!release||release.id!==body.releaseId||release.input.selection.scope.siteId!==scope.siteId||
     release.input.selection.scope.clientId!==scope.clientId||release.input.selection.scope.agencyId!==scope.agencyId)
    throw Error('native_studio_release_mismatch');
  const build=await store.read<{sourceUnchanged:boolean;foundation?:{confirmationSha256:string;transformIdentity:string}}>(`releases/${body.releaseId}/build.json`);
  if(!release.foundation||!build?.sourceUnchanged||
     build.foundation?.confirmationSha256!==release.foundation.confirmationSha256||
     build.foundation?.transformIdentity!==release.foundation.transformIdentity)
    throw Error('native_studio_build_unverified');
  await requirePublicOutputVersion(scope,release.input.selection.scope.siteVersionId);
  await inngest.send({name:'gnr8/native-studio.prepare.requested',data:{scope,releaseId:body.releaseId,actor:actor.userId}});
  return Response.json({ok:true,data:{state:'preparing',releaseId:body.releaseId}},{headers});
 }catch(error){const code=error instanceof Error&&/^native_studio_[a-z0-9_]+$/.test(error.message)?error.message:'native_studio_unavailable';
  return Response.json({ok:false,error:code},{status:409,headers});}
}
