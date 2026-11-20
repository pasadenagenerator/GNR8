import 'server-only';
import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { requireAgencyBackgroundActor } from '../../src/auth/agency-background-action';
import { SupabaseAstroCandidateOwnershipResolver } from '../output-adapters/astro-production-candidate-ownership-resolver';
import { SupabasePublicationStore } from './publication-store';
import { requireCurrentConfirmedImport } from './current-confirmed-import';
import type { Release } from './publication-contract';
import { persistPreparedStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';
import { readNativeStudioBindingForScope, type NativeStudioScope } from './native-studio-binding-store';

type Scope={agencyId:string;clientId:string;siteId:string};
type Request={scope:Scope;releaseId:string;actor:string};
export async function configuredNativeStudioSite(scope:NativeStudioScope){
 if(process.env.GNR8_NATIVE_STUDIO_PREPARE_ENABLED!=='1')throw Error('native_studio_disabled');
 return readNativeStudioBindingForScope(scope);
}
const defaults={
 client:getSupabaseServiceRoleClient,actor:requireAgencyBackgroundActor,
 ownership:async(id:string)=>new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId:id}),
 site:configuredNativeStudioSite,persist:persistPreparedStudio,confirm:requireCurrentConfirmedImport,
 store:(client:NonNullable<ReturnType<typeof getSupabaseServiceRoleClient>>,scope:Scope)=>new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope),
};
/** Separate preparation action; it never invokes the Vercel publication provider. */
export async function runNativeStudioPreparation(request:Request,deps=defaults){
 const {scope,releaseId,actor}=request??{} as Request;
 if(!scope||![scope.agencyId,scope.clientId,scope.siteId,actor].every(v=>/^[a-f0-9-]{36}$/.test(v))||
    !/^[a-f0-9]{64}$/.test(releaseId))throw Error('native_studio_request_invalid');
 const client=deps.client();if(!client)throw Error('native_studio_store_unavailable');
 await deps.actor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});
 const site=await deps.site(scope);
 const store=deps.store(client,scope);
 const release=await store.read<Release>(`releases/${releaseId}/release.json`);
 if(!release||release.id!==releaseId||release.input.selection.scope.agencyId!==scope.agencyId||
    release.input.selection.scope.clientId!==scope.clientId||release.input.selection.scope.siteId!==scope.siteId)
  throw Error('native_studio_release_mismatch');
 const build=await store.read<{sourceUnchanged:boolean;foundation?:{confirmationSha256:string;transformIdentity:string}}>(`releases/${releaseId}/build.json`);
 if(!release.foundation||!build?.sourceUnchanged||
    build.foundation?.confirmationSha256!==release.foundation.confirmationSha256||
    build.foundation?.transformIdentity!==release.foundation.transformIdentity)
  throw Error('native_studio_build_unverified');
 const owner=await deps.ownership(release.input.selection.scope.siteVersionId);
 if(owner.agencyId!==scope.agencyId||owner.organizationId!==scope.clientId||owner.ownershipSiteId!==scope.siteId)
  throw Error('native_studio_ownership_mismatch');
 const current=await deps.confirm(client,release);
 if(current.artifactVersionId){
  const selected=await deps.ownership(current.artifactVersionId);
  if(selected.agencyId!==scope.agencyId||selected.organizationId!==scope.clientId||selected.ownershipSiteId!==scope.siteId)
   throw Error('native_studio_ownership_mismatch');
 }
 await deps.actor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});
 const result=await deps.persist({store,releaseId,releaseFile:undefined,site});
 return {releaseId,sourceManifestSha256:result.receipt.sourceManifestSha256,
   studioVersion:result.receipt.version,files:result.receipt.files.length,reused:result.reused,hosted:false};
}
