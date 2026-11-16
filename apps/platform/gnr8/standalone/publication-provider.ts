import 'server-only';
import {verifyPublicationTls} from './publication-domain';
import { createHash } from 'node:crypto';
import type { ExportFile } from './standalone-export';
import { fingerprint, type DeploymentReceipt, type GitReceipt, type Release, type LiveRelease } from './publication-contract';
import type { PublicationProvider } from './publication-service';
import type { PublicationStore } from './publication-store';
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const gitBlob=(b:Buffer)=>createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex');
const requiredEnv=['CONTACT_REDIS_URL','CONTACT_REDIS_TOKEN','CONTACT_RATE_SECRET','CONTACT_RESEND_KEY','CONTACT_FROM','CONTACT_ALLOWED_HOSTS','CONTACT_MAX_CLAIMS'];
type Json=Record<string,any>;
const safeProviderCodes=new Set(['bad_request','invalid_request','validation_error','unauthorized','forbidden','not_found','rate_limited','builds_rate_limited','invalid_git_source','git_repository_not_found','project_not_found','internal_server_error']);
class ProviderHttpError extends Error {
 constructor(readonly service:'github'|'vercel',readonly status:number,readonly providerCode?:string){super(`standalone_${service}_${status}`);}
}
type StageFailure={code:string;status?:number;providerCode?:string};
export type StageRecoveryAuthorization={id:string;releaseId:string;projectId:string;commit:string;manifestSha256:string};
export function parseStageRecoveryAuthorization(value:unknown):StageRecoveryAuthorization|undefined{
 if(value===undefined)return undefined;
 const v=value as StageRecoveryAuthorization;
 if(!v||Object.keys(v).sort().join()!=='commit,id,manifestSha256,projectId,releaseId'||
  !/^[A-Za-z0-9_-]{8,80}$/.test(v.id)||!/^prj_[A-Za-z0-9]+$/.test(v.projectId)||
  !/^[a-f0-9]{40}$/.test(v.commit)||! /^[a-f0-9]{64}$/.test(v.releaseId)||! /^[a-f0-9]{64}$/.test(v.manifestSha256))throw Error('standalone_recovery_not_authorized');
 return v;
}
/** Explicit credentials for this bounded publication connection; never reuse
 * Stacki tokens, GNR8 database secrets or a user's browser credential. */
export class GitHubVercelPublicationProvider implements PublicationProvider {
 constructor(private store:PublicationStore,private tokens:{github:string;vercel:string},private transport:typeof fetch=fetch,private recovery?:StageRecoveryAuthorization,private tls=verifyPublicationTls){}
 private async request(service:'github'|'vercel',path:string,method='GET',body?:unknown,missing=false,responseMode:'json'|'empty'='json'):Promise<Json|null>{
  const response=await this.transport((service==='github'?'https://api.github.com':'https://api.vercel.com')+path,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{authorization:`Bearer ${this.tokens[service]}`,'content-type':'application/json',...(service==='github'?{accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(missing&&response.status===404)return null;
  if(!response.ok){
   // Preserve only fixed diagnostics. Provider messages, request bodies and
   // arbitrary error-code strings can contain credentials or customer data.
   const detail=await response.json().catch(()=>null);
   const code=typeof detail?.error?.code==='string'&&safeProviderCodes.has(detail.error.code)?detail.error.code:undefined;
   throw new ProviderHttpError(service,response.status,code);
  }
  // Promote acknowledges acceptance without a JSON body. Publication is still
  // confirmed by the service's readback, never by this acknowledgement alone.
  return responseMode==='empty'||response.status===204?{}:await response.json();
 }
 private gh(r:Release,path=''){return `/repos/${r.target.githubOwner}/${r.target.repository}${path}`;}
 private vc(r:Release,path:string){return path+(path.includes('?')?'&':'?')+'teamId='+encodeURIComponent(r.target.vercelTeamId);}
 private nodeVersion(r:Release){const version=r.foundation?.nodeVersion??'22.x';if(version!=='22.x'&&version!=='26.x')throw Error('standalone_toolchain_unverified');return version;}
 private async repository(r:Release){const repo=await this.request('github',this.gh(r),'GET',undefined,true);if(repo&&(repo.private!==true||(r.target.provisionedRepositoryId!==undefined&&repo.id!==r.target.provisionedRepositoryId)||repo.owner?.id!==r.target.githubOwnerId||repo.owner?.login?.toLowerCase()!==r.target.githubOwner.toLowerCase()||repo.name!==r.target.repository||repo.description!==`GNR8 standalone site ${r.input.selection.scope.siteId}`||repo.permissions?.push!==true))throw Error('standalone_repository_ownership_mismatch');return repo;}
 async prepareGit(r:Release,files:ExportFile[],canCreate:boolean):Promise<GitReceipt>{
  if(files.length!==r.files.length||files.some(f=>!r.files.some(x=>x.path===f.path&&x.sha256===sha(f.body)&&x.bytes===f.body.length)))throw Error('standalone_export_drift');
  const targetKey=`resources/${fingerprint({siteId:r.input.selection.scope.siteId,githubOwnerId:r.target.githubOwnerId,repository:r.target.repository,vercelTeamId:r.target.vercelTeamId,project:r.target.project})}-github.json`;
  let repo=await this.repository(r);
  if(!repo){
   if(r.target.provisionedRepositoryId!==undefined)throw Error('standalone_provisioned_repository_missing');
   if(!canCreate||!await this.store.claim(targetKey,{site:r.input.selection.scope.siteId}))throw Error('standalone_repository_creation_unconfirmed');
   const owner=await this.request('github',`/users/${r.target.githubOwner}`);
   if(owner?.id!==r.target.githubOwnerId||owner.type!==r.target.githubOwnerKind)throw Error('standalone_repository_owner_mismatch');
   const endpoint=r.target.githubOwnerKind==='Organization'?`/orgs/${r.target.githubOwner}/repos`:'/user/repos';
   if(r.target.githubOwnerKind==='User'){const user=await this.request('github','/user');if(user?.id!==r.target.githubOwnerId)throw Error('standalone_repository_owner_mismatch');}
   try{await this.request('github',endpoint,'POST',{name:r.target.repository,private:true,auto_init:true,has_issues:false,has_projects:false,has_wiki:false,description:`GNR8 standalone site ${r.input.selection.scope.siteId}`});}catch{/* reconcile exact named private resource */}
   repo=await this.repository(r);if(!repo)throw Error('standalone_repository_creation_unconfirmed');
  }else if(!await this.store.read(targetKey)){
   // Explicit server configuration can bind an owner-provisioned repository so
   // its connection needs Contents access to this repository only. Never adopt
   // a resource merely because its name/description happens to match.
   if(!canCreate||r.target.provisionedRepositoryId!==repo.id||!await this.store.claim(targetKey,{site:r.input.selection.scope.siteId,repositoryId:repo.id}))throw Error('standalone_repository_name_occupied');
  }
  const repositoryReceiptKey=targetKey.replace('.json','-receipt.json');
  const repositoryReceipt=await this.store.read<{id:number}>(repositoryReceiptKey);
  if(repositoryReceipt&&repositoryReceipt.id!==repo.id)throw Error('standalone_repository_ownership_mismatch');
  if(!repositoryReceipt)await this.store.put(repositoryReceiptKey,{id:repo.id});
  const refName='heads/gnr8-release-'+r.manifestSha256;
  let ref=await this.request('github',this.gh(r,'/git/ref/'+refName),'GET',undefined,true);
  if(!ref){
   if(!canCreate)throw Error('standalone_git_write_unconfirmed');
   const base=await this.request('github',this.gh(r,'/git/ref/heads/'+repo.default_branch));
   const actor=await this.request('github','/user');
   if(!Number.isSafeInteger(actor?.id)||! /^[A-Za-z0-9-]{1,39}$/.test(actor?.login??''))throw Error('standalone_git_actor_unconfirmed');
   const author={name:actor!.login,email:`${actor!.id}+${actor!.login}@users.noreply.github.com`};
   const {pushStandaloneGit}=await import('./publication-git');
   try{await pushStandaloneGit({owner:r.target.githubOwner,repository:r.target.repository,defaultBranch:repo.default_branch,parent:base!.object.sha,ref:refName,manifestSha256:r.manifestSha256,files,token:this.tokens.github,author},this.transport);}catch{/* reconcile immutable ref, never push twice after ambiguous response */}
   ref=await this.request('github',this.gh(r,'/git/ref/'+refName));
  }
  if(!ref?.object?.sha)throw Error('standalone_git_write_unconfirmed');
  const commit=await this.request('github',this.gh(r,'/git/commits/'+ref.object.sha));
  const tree=await this.request('github',this.gh(r,'/git/trees/'+commit!.tree.sha+'?recursive=1'));
  const blobs=tree!.tree.filter((f:Json)=>f.type==='blob');
  if(tree!.truncated||blobs.length!==files.length||blobs.some((b:Json)=>b.mode!=='100644'||!files.some(f=>f.path===b.path&&gitBlob(f.body)===b.sha)))throw Error('standalone_git_tree_mismatch');
  return {repositoryId:repo.id,ownerId:repo.owner.id,repository:repo.full_name,commit:commit!.sha,tree:commit!.tree.sha,manifestSha256:r.manifestSha256};
 }
 private async project(r:Release){const p=await this.request('vercel',this.vc(r,'/v9/projects/'+r.target.project),'GET',undefined,true);if(p&&(p.name!==r.target.project||p.accountId!==r.target.vercelTeamId))throw Error('standalone_project_ownership_mismatch');return p;}
 private async configuration(r:Release,p:Json){
  if(p.autoAssignCustomDomains!==false||p.link||p.framework!=='astro'||p.nodeVersion!==this.nodeVersion(r)||p.rootDirectory||p.buildCommand!=='npm run build'||p.installCommand!=='npm ci --no-audit --no-fund'||p.outputDirectory!=='dist')throw Error('standalone_project_configuration_not_ready');
  const result=await this.request('vercel',this.vc(r,`/v10/projects/${p.id}/env?decrypt=false`));
  const env=(result!.envs as Json[]).filter(e=>e.target?.includes('production'));
  if((r.contactRequired!==false&&requiredEnv.filter(k=>!r.target.contactPolicy||k!=='CONTACT_MAX_CLAIMS').some(k=>env.filter(e=>e.key===k).length!==1))||env.some(e=>/^(GNR8_|SUPABASE_|DATABASE_URL$|NEXT_PUBLIC_SUPABASE_)/.test(e.key))||env.some(e=>!e.id||!Number.isFinite(e.updatedAt??e.createdAt)))throw Error('standalone_environment_not_ready');
  return fingerprint({projectId:p.id,team:p.accountId,framework:p.framework,node:p.nodeVersion,build:p.buildCommand,install:p.installCommand,output:p.outputDirectory,root:p.rootDirectory??null,regions:p.serverlessFunctionRegion??'fra1',resourceConfig:p.resourceConfig??null,protection:p.ssoProtection??null,env:env.map(e=>({id:e.id,key:e.key,type:e.type,target:e.target,updatedAt:e.updatedAt??e.createdAt})).sort((a,b)=>a.id.localeCompare(b.id))});
 }
 async stage(r:Release,git:GitReceipt,canCreate:boolean):Promise<DeploymentReceipt>{
  const targetKey=`resources/${fingerprint({siteId:r.input.selection.scope.siteId,githubOwnerId:r.target.githubOwnerId,repository:r.target.repository,vercelTeamId:r.target.vercelTeamId,project:r.target.project})}-vercel.json`;
  let project=await this.project(r);
  if(!project){
   if(!canCreate||!await this.store.claim(targetKey,{site:r.input.selection.scope.siteId}))throw Error('standalone_project_creation_unconfirmed');
   const created=await this.request('vercel',this.vc(r,'/v10/projects'),'POST',{name:r.target.project,framework:'astro',buildCommand:'npm run build',installCommand:'npm ci --no-audit --no-fund',outputDirectory:'dist',serverlessFunctionRegion:'fra1'});
   if(!created?.id||created.accountId!==r.target.vercelTeamId)throw Error('standalone_project_creation_unconfirmed');
   await this.store.put(targetKey.replace('.json','-receipt.json'),{id:created.id});
   project=await this.project(r);if(!project||project.id!==created.id)throw Error('standalone_project_creation_unconfirmed');
   await this.request('vercel',this.vc(r,'/v9/projects/'+project.id),'PATCH',{autoAssignCustomDomains:false,nodeVersion:this.nodeVersion(r)});
   project=await this.project(r);
  }else {
   const receipt=await this.store.read<{id:string}>(targetKey.replace('.json','-receipt.json'));
   if(!receipt||receipt.id!==project.id)throw Error('standalone_project_name_occupied_or_unconfirmed');
  }
  const configurationSha256=await this.configuration(r,project!);
  const stageKey=`releases/${r.id}/stage-request.json`;
  let failureKey=`releases/${r.id}/stage-failure.json`;
  const expected={projectId:project!.id,commit:git.commit,manifestSha256:r.manifestSha256,configurationSha256};
  const previous=await this.store.read(stageKey);if(previous&&fingerprint(previous)!==fingerprint(expected))throw Error('standalone_staged_configuration_changed');
  const listed=await this.request('vercel',this.vc(r,`/v6/deployments?projectId=${project!.id}&meta-gnr8Release=${r.id}&limit=2`));
  let deployments=listed!.deployments as Json[];
  if(deployments.length>1)throw Error('standalone_deployment_ambiguous');
  if(!deployments.length){
   let attemptKey=stageKey;
   let attempt:unknown=expected;
   if(this.recovery){
    const grant=parseStageRecoveryAuthorization(this.recovery)!;
    // Recovery is an explicitly authorized, server-only budget. It cannot erase
    // the original claim, change the release/environment, or adopt a build.
    if(!previous||grant.releaseId!==r.id||grant.projectId!==project!.id||grant.commit!==git.commit||grant.manifestSha256!==r.manifestSha256)throw Error('standalone_recovery_not_authorized');
    const all=await this.request('vercel',this.vc(r,`/v6/deployments?projectId=${project!.id}&limit=1`));
    if(!Array.isArray(all!.deployments)||all!.deployments.length||all!.pagination?.next)throw Error('standalone_recovery_project_not_empty');
    attemptKey=`authorizations/${grant.id}-stage-recovery.json`;
    failureKey=`authorizations/${grant.id}-stage-recovery-failure.json`;
    attempt={...expected,releaseId:r.id};
   }
   // Configuration can be completed after resource creation. Only this separate
   // CAS consumes the single build, even when the outer UI resumes the request.
   if(!await this.store.claim(attemptKey,attempt)){
    const failure=await this.store.read<StageFailure>(failureKey);
    throw Error(failure&&/^standalone_vercel_[45]\d{2}$/.test(failure.code)?failure.code:'standalone_deployment_creation_unconfirmed');
   }
   try{
    // Public v13 rejects unknown properties (including skipAutoAssignDomains).
    // Staging uses the already verified autoAssignCustomDomains=false project
    // setting. Send the same settings explicitly for this first deployment.
    const created=await this.request('vercel',this.vc(r,'/v13/deployments'),'POST',{
     name:r.target.project,project:project!.id,target:'production',
     projectSettings:{framework:project!.framework,nodeVersion:project!.nodeVersion,buildCommand:project!.buildCommand,installCommand:project!.installCommand,outputDirectory:project!.outputDirectory,rootDirectory:null,serverlessFunctionRegion:project!.serverlessFunctionRegion??'fra1'},
     gitSource:{type:'github',repoId:String(git.repositoryId),ref:git.commit,sha:git.commit},
     meta:{gnr8Release:r.id,gnr8Manifest:r.manifestSha256,gnr8Configuration:configurationSha256},
    });deployments=[created!];
   }catch(error){
    const failure:StageFailure=error instanceof ProviderHttpError
     ?{code:error.message,status:error.status,...(error.providerCode?{providerCode:error.providerCode}:{})}
     :{code:'standalone_deployment_creation_unconfirmed'};
    await this.store.claim(failureKey,failure);
    const found=await this.request('vercel',this.vc(r,`/v6/deployments?projectId=${project!.id}&meta-gnr8Release=${r.id}&limit=2`));deployments=found!.deployments;
    if(!deployments.length)throw Error(failure.code);
   }
  }
  if(deployments.length!==1)throw Error('standalone_deployment_creation_unconfirmed');
  const d=await this.request('vercel',this.vc(r,'/v13/deployments/'+(deployments[0]!.uid??deployments[0]!.id)));
  this.assertDeployment(r,git,d!,project!.id,configurationSha256);
  return {projectId:project!.id,deploymentId:d!.id,url:'https://'+d!.url,commit:git.commit,manifestSha256:r.manifestSha256,configurationSha256,target:'production'};
 }
 private assertDeployment(r:Release,git:GitReceipt,d:Json,projectId:string,configurationSha256:string){
  if(d.projectId!==projectId||d.target!=='production'||(d.gitSource?.sha??d.meta?.githubCommitSha)!==git.commit||d.meta?.gnr8Release!==r.id||d.meta?.gnr8Manifest!==r.manifestSha256||d.meta?.gnr8Configuration!==configurationSha256||! /^[a-z0-9-]+\.vercel\.app$/.test(d.url))throw Error('standalone_deployment_identity_mismatch');
 }
 async inspect(r:Release,git:GitReceipt,d:DeploymentReceipt):Promise<LiveRelease>{
  const repo=await this.repository(r);if(repo?.id!==git.repositoryId)throw Error('standalone_repository_ownership_mismatch');
  const ref=await this.request('github',this.gh(r,'/git/ref/heads/gnr8-release-'+r.manifestSha256));if(ref?.object?.sha!==git.commit)throw Error('standalone_commit_changed');
  const project=await this.project(r);if(project?.id!==d.projectId)throw Error('standalone_project_ownership_mismatch');
  const configurationSha256=await this.configuration(r,project);
  const deployment=await this.request('vercel',this.vc(r,'/v13/deployments/'+d.deploymentId));
  this.assertDeployment(r,git,deployment!,d.projectId,configurationSha256);
  if(['ERROR','CANCELED'].includes(deployment!.readyState))throw Error('standalone_build_failed');
  const domains=await this.request('vercel',this.vc(r,`/v9/projects/${d.projectId}/domains?limit=100`));
  const custom=domains!.domains.filter((x:Json)=>!x.name.endsWith('.vercel.app'));
  if(domains!.pagination?.next||custom.some((x:Json)=>x.name!==r.target.host))throw Error('standalone_unapproved_domain');
  const current=project.targets?.production?.id??null;
  const domain=custom.find((x:Json)=>x.name===r.target.host);
  let domainReady=false,aliasCurrent=false;
  if(domain?.verified===true&&domain.gitBranch==null&&domain.customEnvironmentId==null&&domain.redirect==null){
   const config=await this.request('vercel',this.vc(r,`/v6/domains/${r.target.host}/config`));
   domainReady=config?.misconfigured===false&&await this.tls(r.target.host);
   const alias=await this.request('vercel',this.vc(r,`/v4/aliases/${r.target.host}`),'GET',undefined,true);
   aliasCurrent=alias?.projectId===d.projectId&&(alias?.deploymentId??alias?.deployment?.id)===d.deploymentId;
  }
  return {...d,configurationSha256,ready:deployment!.readyState==='READY',current:current===d.deploymentId&&aliasCurrent&&domainReady,domainReady,repositoryId:repo.id,ownerId:repo.owner.id,previousDeploymentId:current} as LiveRelease;
 }
 async connectDomain(r:Release,d:DeploymentReceipt){
  if(r.target.domainMode!=='new')throw Error('standalone_domain_transfer_requires_owner');
  const project=await this.project(r);
  if(project?.id!==d.projectId||await this.configuration(r,project)!==d.configurationSha256)throw Error('standalone_review_stale');
  const path=this.vc(r,`/v9/projects/${d.projectId}/domains/${r.target.host}`);
  const existing=await this.request('vercel',path,'GET',undefined,true);
  if(existing){if(existing.name!==r.target.host||existing.projectId!==d.projectId)throw Error('standalone_domain_attachment_unconfirmed');return;}
  // A new host on an already serving project would expose its previous target
  // immediately. That transition needs the explicit owner transfer procedure.
  if(project.targets?.production?.id)throw Error('standalone_domain_attach_requires_empty_project');
  const alias=await this.request('vercel',this.vc(r,`/v4/aliases/${r.target.host}`),'GET',undefined,true);
  if(alias)throw Error('standalone_existing_domain_transfer_required');
  const claim=`domains/${fingerprint({projectId:d.projectId,host:r.target.host})}-attach.json`;
  if(await this.store.claim(claim,{releaseId:r.id,projectId:d.projectId,host:r.target.host})){
   try{await this.request('vercel',this.vc(r,`/v10/projects/${d.projectId}/domains`),'POST',{name:r.target.host});}catch{/* Read back this exact binding before any further action. */}
  }
  const domain=await this.request('vercel',path,'GET',undefined,true);
  if(!domain||domain.name!==r.target.host||domain.projectId!==d.projectId)throw Error('standalone_domain_attachment_unconfirmed');
 }
 async promote(r:Release,d:DeploymentReceipt){await this.request('vercel',this.vc(r,`/v10/projects/${d.projectId}/promote/${d.deploymentId}`),'POST',undefined,false,'empty');}
}
