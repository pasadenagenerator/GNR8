import 'server-only';
import { createHash } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleClient } from '../../src/supabase/service-role-server';
import { requireAgencyBackgroundActor } from '../../src/auth/agency-background-action';
import { SupabaseAstroCandidateOwnershipResolver } from '../output-adapters/astro-production-candidate-ownership-resolver';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '../output-adapters/astro-candidate-runtime-artifact-store';
import { SupabaseStackiDraftStore } from '../stacki/stacki-draft-store';
import { resolvedGitHubStackiStore } from '../stacki/stacki-github-config';
import { loadStackiSource, planStackiRuntimeAssets } from '../stacki/stacki-source-loader';
import { exportStandaloneProject } from './standalone-export';
import { requireCompatibleStandaloneToolchain } from './publication-foundation';
import { fingerprint, parsePublicationSelection, publicationSelectionForArtifact, type PublicationSelection } from './publication-contract';
import { requireCurrentConfirmedSelection } from './current-confirmed-import';
import { SupabasePublicationStore } from './publication-store';
import { configuredNativeStudioDirectSourceSite } from './native-studio-bootstrap-site';
import { nativeStudioSourceResultKey } from './native-studio-source-status';
import { isRetainedLegacyNativeStudioSite } from './native-studio-binding-store';
import { readCurrentNativeStudioAccessCandidates } from './native-studio-access-candidates';
import { inspectCloudflareStudioAccessApp } from './cloudflare-studio-access-app';
import { inspectNativeStudioAccessPolicyReadback } from './cloudflare-studio-access-policy';
import { persistVerifiedAstroStudio } from '../../../../scripts/stacki/prepare-from-confirmed-export.mjs';

type Scope={agencyId:string;clientId:string;siteId:string};
type Request={scope:Scope;input:PublicationSelection;actor:string;requestId?:string;attemptId?:string};
type NativeSite=Awaited<ReturnType<typeof configuredNativeStudioDirectSourceSite>>;
const APP_INTENT='native-studio/access-app-create-intent-v1.json';
const APP_BOUND='native-studio/access-app-bound-v1.json';
const POLICY_INTENT='native-studio/access-policy-create-intent-v1.json';
const HEX32=/^[a-f0-9]{32}$/;
const TOKEN=/^[A-Za-z0-9_-]{16,256}$/;
const same=(a:unknown,b:unknown)=>a===undefined||b===undefined?a===b:fingerprint(a)===fingerprint(b);
const object=(value:unknown):value is Record<string,unknown>=>
 value!==null&&typeof value==='object'&&!Array.isArray(value);

const accessDefaults={
 candidates:readCurrentNativeStudioAccessCandidates,
 app:inspectCloudflareStudioAccessApp,
 transport:fetch,
};

/** Read current GNR8 members and exact Cloudflare app/policy before producing
 * source bytes. Only the four retained sites may continue without Access. */
export async function readVerifiedNativeStudioAccessForPreparation(
 scope:Scope,client:SupabaseClient,site:NativeSite,
 store:Pick<SupabasePublicationStore,'read'>,
 env:Record<string,string|undefined>=process.env,
 deps=accessDefaults,
){
 const [appIntent,appBound,policyIntent]=await Promise.all([
  store.read<Record<string,unknown>>(APP_INTENT),
  store.read<Record<string,unknown>>(APP_BOUND),
  store.read<Record<string,unknown>>(POLICY_INTENT),
 ]);
 if(!appBound){
  if(appIntent||policyIntent||!isRetainedLegacyNativeStudioSite(scope.siteId))
   throw Error('native_studio_access_binding_missing');
  return undefined;
 }
 const credential=env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ACCESS_MANAGER??'';
 const zoneId=env.GNR8_NATIVE_STUDIO_CLOUDFLARE_ZONE_ID??'';
 if(env.GNR8_NATIVE_STUDIO_ACCESS_SETUP_ENABLED!=='1'||
    !TOKEN.test(credential)||!HEX32.test(zoneId))
  throw Error('native_studio_access_setup_not_configured');
 const target={scope,accountId:site.accountId,studioOrigin:site.studioOrigin,
  repository:site.repository,repositoryId:Number(site.repositoryId)};
 const domain=`${new URL(site.studioOrigin).hostname}/studio`;
 const name=`gnr8-${scope.siteId}-studio-access`;
 const identity=createHash('sha256').update(JSON.stringify({scope,
  accountId:site.accountId,zoneId,studioOrigin:site.studioOrigin,
  repository:site.repository,repositoryId:Number(site.repositoryId),name,domain})).digest('hex');
 if(!object(appIntent)||!object(appBound)||!object(policyIntent)||
    !same(appIntent,{identity,target,zoneId,name,domain})||
    appBound.identity!==identity||typeof appBound.appId!=='string'||
    typeof appBound.aud!=='string'||typeof appBound.teamDomain!=='string')
  throw Error('native_studio_access_binding_unverified');
 const candidates=await deps.candidates(scope,client);
 const admins=candidates.map(candidate=>candidate.principal);
 if(!admins.length||!same(policyIntent,{identity:fingerprint({scope,target,
   accountId:site.accountId,appId:appBound.appId,principals:admins}),scope,
   accountId:site.accountId,appId:appBound.appId,target,principals:admins}))
  throw Error('native_studio_access_policy_stale');
 const app=await deps.app(scope,{siteId:scope.siteId,studioOrigin:site.studioOrigin,
  accountId:site.accountId},appBound.appId,credential,deps.transport);
 if(app.state!=='observed-access-app'||app.appId!==appBound.appId||
    app.aud!==appBound.aud||app.teamDomain!==appBound.teamDomain||
    app.studioOrigin!==site.studioOrigin||app.accountId!==site.accountId)
  throw Error('native_studio_access_app_stale');
 let body:unknown;
 try{
  const response=await deps.transport(`https://api.cloudflare.com/client/v4/accounts/`+
   `${site.accountId}/access/apps/${appBound.appId}/policies`,{
    method:'GET',redirect:'error',signal:AbortSignal.timeout(30_000),
    headers:{authorization:`Bearer ${credential}`,accept:'application/json'},
   });
  if(!response.ok)throw Error();
  body=await response.json();
 }catch{throw Error('native_studio_access_policy_unavailable');}
 inspectNativeStudioAccessPolicyReadback(body,admins);
 return {version:2 as const,provider:'access' as const,
  aud:app.aud,teamDomain:app.teamDomain,admins};
}

const defaults={
 client:getSupabaseServiceRoleClient,actor:requireAgencyBackgroundActor,
 site:configuredNativeStudioDirectSourceSite,
 ownership:async(siteVersionId:string)=>new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId}),
 artifactVersion:async(client:SupabaseClient,id:string)=>{
  const rows=await client.from('gnr8_runtime_artifacts').select('site_version_id').eq('id',id).limit(2);
  if(rows.error||rows.data?.length!==1)throw Error('native_studio_source_stale');
  return rows.data[0]!.site_version_id as string;
 },
 source:async(client:SupabaseClient,id:string)=>new SupabaseAstroCandidateRuntimeArtifactStore(client).readSourceContext(id),
 confirm:requireCurrentConfirmedSelection,loadSource:loadStackiSource,planAssets:planStackiRuntimeAssets,
 revision:async(client:SupabaseClient,bucket:string,scope:PublicationSelection['selection']['scope'],revision:number)=>
  (await resolvedGitHubStackiStore(scope)??new SupabaseStackiDraftStore(client,bucket)).revision(scope,revision),
 export:exportStandaloneProject,persist:persistVerifiedAstroStudio,
 access:readVerifiedNativeStudioAccessForPreparation,
 record:async(store:SupabasePublicationStore,key:string,value:unknown)=>store.put(key,value),
 store:(client:SupabaseClient,scope:Scope)=>new SupabasePublicationStore(client,process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes',scope),
};

/** Prepare and store source bytes only. No Git push, Cloudflare deployment or
 * generated-code execution takes place here. */
export async function runDirectNativeStudioPreparation(request:Request,deps=defaults){
 const {scope,actor}=request??{} as Request;
 if(!scope||![scope.agencyId,scope.clientId,scope.siteId,actor].every(v=>/^[a-f0-9-]{36}$/.test(v)))
  throw Error('native_studio_request_invalid');
 const attemptId=request.attemptId??null;
 if(attemptId!==null&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(attemptId))
  throw Error('native_studio_request_invalid');
 const input=parsePublicationSelection(request.input);
 const selected=input.selection.scope;
 if(selected.agencyId!==scope.agencyId||selected.clientId!==scope.clientId||selected.siteId!==scope.siteId)
  throw Error('native_studio_selection_mismatch');
 const client=deps.client();if(!client)throw Error('native_studio_store_unavailable');
 await deps.actor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});
 const site=await deps.site(scope,client);
 const store=deps.store(client,scope);
 const access=await deps.access(scope,client,site,store);
 const authorize=async(id:string)=>{
  const owner=await deps.ownership(id);
  if(owner.agencyId!==scope.agencyId||owner.organizationId!==scope.clientId||owner.ownershipSiteId!==scope.siteId)
   throw Error('native_studio_ownership_mismatch');
  return owner;
 };
 const artifactVersionId=await deps.artifactVersion(client,input.artifactId);
 await authorize(artifactVersionId);await authorize(selected.siteVersionId);
 const current=await deps.confirm(client,input);
 if(current.artifactVersionId!==artifactVersionId)throw Error('native_studio_source_stale');
 await authorize(current.captureVersionId);
 const context=await deps.source(client,artifactVersionId);
 if(!context||context.artifact.id!==input.artifactId||context.artifact.bundleSha256!==input.artifactSha256||
    fingerprint(publicationSelectionForArtifact({...selected,siteVersionId:artifactVersionId},context.artifact))!==fingerprint(input))
  throw Error('native_studio_source_stale');
 const workspace=context.artifact.manifest.generatedOutputSourceWorkspace as Record<string,unknown>|undefined;
 if(!workspace||!Array.isArray(workspace.assetEvidence))throw Error('native_studio_source_stale');
 const lineage=workspace.stackiRevision as {sourceArtifactId?:string;sourceArtifactSha256?:string}|undefined;
 const source=await deps.source(client,selected.siteVersionId);
 if(!source||(lineage&&(source.artifact.id!==lineage.sourceArtifactId||
   source.artifact.bundleSha256!==lineage.sourceArtifactSha256)))throw Error('native_studio_source_stale');
 const bucket=process.env.GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET??'gnr8-astro-candidate-routes';
 const authorizedVersion=async(_scope:unknown,id:string)=>authorize(id);
 const checkpoint=input.selection.revision!==undefined
  ?await deps.revision(client,bucket,selected,input.selection.revision):null;
 const baseline=await deps.loadSource(selected,client,authorizedVersion);
 const plan=await deps.planAssets(selected,client,authorizedVersion);
 const retained:Awaited<ReturnType<typeof plan.read>>=[];
 for(let offset=0;offset<plan.entries.length;offset+=16)
  retained.push(...await plan.read(plan.entries.slice(offset,offset+16)));
 const evidence=new Map((workspace.assetEvidence as Array<{path:string;mediaType:string}>).map(asset=>[asset.path,asset]));
 const common={baseline,sourceArtifact:{id:input.artifactId,sha256:input.artifactSha256},
  assets:plan.entries.map(entry=>{
   const asset=retained.find(value=>value.name===entry.name),media=evidence.get(entry.path);
   if(!asset||!media)throw Error('native_studio_asset_missing');
   return {path:entry.path,body:asset.body,mediaType:media.mediaType,sourceSha256:entry.sha256};
  })};
 const exported=await deps.export(input.selection.revision!==undefined?{
  ...common,checkpoint:checkpoint!,scope:selected,selection:input.selection,
  expectedRevision:input.selection.revision,expectedSha256:input.selection.sha256,
  sourcePaths:(source.artifact.manifest.generatedOutputSourceWorkspace as {files:Array<{path:string}>}).files.map(file=>file.path),
  ownedImagePaths:(workspace.assetEvidence as Array<{path:string;mediaType:string}>)
   .filter(asset=>asset.mediaType.startsWith('image/')).map(asset=>asset.path),
 }:{...common,selection:input.selection});
 if(exported.contactRequired||fingerprint([...exported.manifest.routes].sort())!==fingerprint([...current.routes].sort()))
  throw Error('native_studio_export_unverified');
 const sourceFiles=(checkpoint?.files??baseline).filter(file=>!file.path.startsWith('.studio-state/'))
  .map(file=>({path:file.path,body:Buffer.from(file.base64,'base64')}));
 requireCompatibleStandaloneToolchain(sourceFiles,exported.files);
 // A long asset read or export may outlive an acceptance change.
 const fresh=await deps.confirm(client,input);
 if(fresh.confirmationSha256!==current.confirmationSha256||
    fresh.artifactVersionId!==artifactVersionId)throw Error('native_studio_confirmation_stale');
 const requestId=fingerprint({input,confirmationSha256:current.confirmationSha256});
 if(request.requestId!==undefined&&request.requestId!==requestId)throw Error('native_studio_request_stale');
 await authorize(artifactVersionId);
 await deps.actor(client,{userId:actor,agencyId:scope.agencyId,action:'publish'});
 const latestSite=await deps.site(scope,client);
 if(fingerprint(latestSite)!==fingerprint(site))throw Error('native_studio_site_stale');
 const freshAccess=await deps.access(scope,client,site,store);
 if(!same(freshAccess,access))throw Error('native_studio_access_stale');
 const result=await deps.persist({store,exported,selection:input.selection,
  confirmationSha256:current.confirmationSha256,site,access,releaseFile:undefined});
 const summary={requestId,...(attemptId?{attemptId}:{}),sourceId:result.receipt.identitySha256,sourceManifestSha256:result.receipt.sourceManifestSha256,
  studioVersion:result.receipt.version,files:result.receipt.files.length,hosted:false};
 await deps.record(store,nativeStudioSourceResultKey(requestId,attemptId),summary);
 return {...summary,reused:result.reused};
}
