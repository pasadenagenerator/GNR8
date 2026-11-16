import 'server-only';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import {requireAgencyBackgroundActor} from '@/src/auth/agency-background-action';
import { SupabaseAstroCandidateOwnershipResolver } from '../output-adapters/astro-production-candidate-ownership-resolver';
import { publicationComposition } from './publication-composition';
import { prepareStandaloneRelease } from './publication-preparation';
import { fingerprint, parsePublicationSelection, requireReleaseGitReceipt, type GitReceipt, type PublicationSelection, type Release } from './publication-contract';
import { publicationFailureCode, StandalonePreparationError } from './publication-errors';

const defaultDependencies={
 client:getSupabaseServiceRoleClient,actor:requireAgencyBackgroundActor,
 ownership:async(client:NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,siteVersionId:string)=>new SupabaseAstroCandidateOwnershipResolver(()=>client as unknown as import("../output-adapters/astro-production-candidate-ownership-resolver").AstroCandidateOwnershipReadClient).resolve({siteVersionId}),
 compose:publicationComposition,prepare:prepareStandaloneRelease,
};
export async function runStandalonePublication(eventData:unknown,deps=defaultDependencies){
 const data=eventData as {input:PublicationSelection;requestId:string;actor:string};
 const input=parsePublicationSelection(data?.input);
 if(!/^[a-f0-9-]{36}$/.test(data.actor)||!/^[a-f0-9]{64}$/.test(data.requestId))throw Error('standalone_request_invalid');
 const authorize=async()=>{
  const client=deps.client();if(!client)throw Error('standalone_store_unavailable');
  await deps.actor(client,{userId:data.actor,agencyId:input.selection.scope.agencyId,action:'publish'});
  const owner=await deps.ownership(client,input.selection.scope.siteVersionId);
  if(owner.agencyId!==input.selection.scope.agencyId||owner.organizationId!==input.selection.scope.clientId||owner.ownershipSiteId!==input.selection.scope.siteId)throw Error('standalone_ownership_mismatch');return {userId:data.actor};
 };
 await authorize();const c=await deps.compose(input,authorize);
 if(data.requestId!==c.requestId)throw Error('standalone_request_stale');
 const request=await c.store.read<{input:PublicationSelection;actor:string;target:unknown}>(`requests/${c.requestId}.json`);
 if(!request||request.actor!==data.actor||fingerprint(request.input)!==fingerprint(input)||fingerprint(request.target)!==fingerprint(c.target))throw Error('standalone_request_unconfirmed');
 let release=await c.store.read<Release>(`requests/${c.requestId}-release.json`);
 try{
  if(!release){release=await deps.prepare(input,c.target,c.client,c.store,c.bucket);await c.store.put(`requests/${c.requestId}-release.json`,release);}
  const git=await c.store.read<GitReceipt>(`releases/${release.id}/git.json`);
  if(git)requireReleaseGitReceipt(release,git);
  const files=[];if(!git)for(const file of release.files)files.push({path:file.path,body:await c.store.getBytes(file.sha256)});
  return await c.service.prepare(release,files);
 }catch(error){
  // Sanitized immutable attempt evidence, never provider responses or secrets.
  const code=publicationFailureCode(error);
  const phase=error instanceof StandalonePreparationError?error.phase:'provider';
  console.error('[standalone.prepare]',{requestId:c.requestId,phase,code});
  await c.store.claim(`requests/${c.requestId}-first-error.json`,{code,phase});throw Error(code);
 }
}
