import 'server-only';
import { requirePublicOutputVersion } from '../output-adapters/public-output-access';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '../output-adapters/astro-candidate-runtime-artifact-store';
import { publicationComposition } from './publication-composition';
import { publicationSelectionForArtifact, type Release } from './publication-contract';
import { readBoundedJson, requireSameOriginJson } from '../stacki/stacki-draft-route-handlers';
import { inngest } from '../inngest/client';
type Context={params:Promise<{clientId:string;siteId:string}>};
const headers={'cache-control':'private,no-store','referrer-policy':'no-referrer'};
const defaultDependencies={
 authorize:requirePublicOutputVersion,
 readSource:async(id:string)=>{const client=getSupabaseServiceRoleClient();if(!client)throw Error('standalone_store_unavailable');return new SupabaseAstroCandidateRuntimeArtifactStore(client).readSourceContext(id);},
 compose:publicationComposition,
 send:async(event:{name:string;data:unknown})=>{await inngest.send(event);},
};
export function createStandaloneRoutes(deps=defaultDependencies){
 async function run(request:Request,context:Context){
  try{
   if(process.env.GNR8_STANDALONE_PUBLICATION_ENABLED!=='1')return Response.json({ok:true,data:{state:'disabled'}},{headers});
   const url=new URL(request.url);const scope={...await context.params,agencyId:url.searchParams.get('agencyId')??''};
   let payload:Record<string,unknown>=Object.fromEntries(url.searchParams);
   if(request.method==='POST'){requireSameOriginJson(request);payload=await readBoundedJson(request) as Record<string,unknown>;}
   const siteVersionId=String(payload.siteVersionId??'');
   const authorize=()=>deps.authorize(scope,siteVersionId);
   const actor=await authorize();
   const source=await deps.readSource(siteVersionId);
   if(!source||source.artifact.id!==payload.artifactId||source.artifact.bundleSha256!==payload.artifactBundleSha256)throw Error('standalone_selection_stale');
   const input=publicationSelectionForArtifact({...scope,siteVersionId},source.artifact);
   if(input.selection.scope.agencyId!==scope.agencyId||input.selection.scope.clientId!==scope.clientId||input.selection.scope.siteId!==scope.siteId)throw Error('standalone_ownership_mismatch');
   await deps.authorize(scope,input.selection.scope.siteVersionId);
   const c=await deps.compose(input,authorize);
   const release=await c.store.read<Release>(`requests/${c.requestId}-release.json`);
   if(release&&(release.input.artifactId!==input.artifactId||release.target.authorizationId!==c.target.authorizationId))throw Error('standalone_selection_stale');
   if(request.method==='POST'){
    if(payload.action==='prepare'){
     if(Object.keys(payload).some(k=>!['action','siteVersionId','artifactId','artifactBundleSha256'].includes(k)))throw Error('standalone_request_invalid');
     const path=`requests/${c.requestId}.json`;
     await c.store.claim(path,{input,target:c.target,actor:actor.userId});
     const saved=await c.store.read<{actor:string}>(path);if(saved?.actor!==actor.userId)throw Error('standalone_request_actor_mismatch');
     await authorize();
     // Inngest retries are disabled; resumption is explicit and provider writes
     // have their own durable claims. Save never emits this event.
     await deps.send({name:'gnr8/standalone.prepare.requested',data:{input,requestId:c.requestId,actor:actor.userId}});
     return Response.json({ok:true,data:{state:'preparing',target:c.target}},{headers});
    }
    if(!release||typeof payload.evidenceSha256!=='string')throw Error('standalone_release_not_ready');
    if(payload.action==='approve'&&payload.confirmation==='approve-exact-standalone-deployment')await c.service.approve(release,payload.evidenceSha256);
    else if(payload.action==='connect-domain'&&payload.confirmation==='connect-reviewed-release-host')await c.service.connectDomain(release,payload.evidenceSha256);
    else if(payload.action==='publish'&&payload.confirmation==='publish-exact-standalone-deployment')await c.service.publish(release,payload.evidenceSha256);
    else throw Error('standalone_confirmation_required');
   }
   const firstFailure=await c.store.read(`requests/${c.requestId}-first-error.json`);
   return Response.json({ok:true,data:{...(release?await c.service.status(release):{state:'unprepared',target:c.target}),firstFailure}},{headers});
  }catch(error){const message=error instanceof Error?error.message:'';const requestErrors:Record<string,string>={STACKI_ORIGIN_INVALID:'standalone_origin_invalid',STACKI_JSON_REQUIRED:'standalone_json_required',STACKI_CHECKPOINT_INVALID:'standalone_request_invalid',STACKI_CHECKPOINT_TOO_LARGE:'standalone_request_too_large'};const code=requestErrors[message]??(/^standalone_[a-z0-9_]+$/.test(message)?message:'standalone_unavailable');return Response.json({ok:false,error:code},{status:409,headers});}
 }
 return {GET:run,POST:run};
}
