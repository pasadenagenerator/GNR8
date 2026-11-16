import type { ExportFile } from './standalone-export';
import { fingerprint, releaseEvidence, requireApprovedManifest, requirePublicationApproval, requireReleaseGitReceipt, type Approval, type DeploymentReceipt, type GitReceipt, type LiveRelease, type Release } from './publication-contract';
import type { PublicationStore } from './publication-store';
export interface PublicationProvider {
 prepareGit(release:Release,files:ExportFile[],canCreate:boolean):Promise<GitReceipt>;
 stage(release:Release,git:GitReceipt,canCreate:boolean):Promise<DeploymentReceipt>;
 inspect(release:Release,git:GitReceipt,deployment:DeploymentReceipt):Promise<LiveRelease>;
 connectDomain?(release:Release,deployment:DeploymentReceipt):Promise<void>;
 promote(release:Release,deployment:DeploymentReceipt):Promise<void>;
}
/** All provider operations are reached only after server authorization and an
 * operator-approved exact target. A lost write response is reconciled by read;
 * a claim is never leased/reopened, preventing blind build/mail retries. */
export function publicationService(store:PublicationStore,provider:PublicationProvider,authorize:()=>Promise<{userId:string}>){
 const key=(r:Release,part:string)=>`releases/${r.id}/${part}.json`;
 return {
  async prepare(release:Release,files:ExportFile[]){
   await authorize();
   requireApprovedManifest(release.target,release.manifestSha256);
   if(release.files.length>release.target.maxFiles||release.files.reduce((n,f)=>n+f.bytes,0)>release.target.maxBytes)throw Error('standalone_approved_budget_exceeded');
   // One exact release per operator-approved hosted authorization. A different
   // revision or rebuild needs a new bounded authorization, not another click.
   const budgetKey=`authorizations/${release.target.authorizationId}.json`;
   await store.claim(budgetKey,{releaseId:release.id});
   if((await store.read<{releaseId:string}>(budgetKey))?.releaseId!==release.id)throw Error('standalone_approved_operation_budget_exceeded');
   await store.put(key(release,'release'),release);
   let git=await store.read<GitReceipt>(key(release,'git'));
   if(git)git=requireReleaseGitReceipt(release,git);
   if(!git){const claimed=await store.claim(key(release,'git-claim'),{releaseId:release.id});await authorize();git=requireReleaseGitReceipt(release,await provider.prepareGit(release,files,claimed));await store.put(key(release,'git'),git);}
   let deployment=await store.read<DeploymentReceipt>(key(release,'deployment'));
   if(!deployment){const claimed=await store.claim(key(release,'deployment-claim'),{releaseId:release.id});await authorize();deployment=await provider.stage(release,git,claimed);await store.put(key(release,'deployment'),deployment);}
   return {git,deployment};
  },
  async status(release:Release){
   await authorize();const storedGit=await store.read<GitReceipt>(key(release,'git'));
   const git=storedGit?requireReleaseGitReceipt(release,storedGit):null;
   const deployment=await store.read<DeploymentReceipt>(key(release,'deployment'));
   if(!git||!deployment)return {release,git,deployment,state:'preparing' as const};
   const live=await provider.inspect(release,git,deployment);
   if(!live.ready)return {release,git,deployment,state:'building' as const};
   const evidenceSha256=releaseEvidence(release,git,deployment,live);
   const approval=await store.read<Approval>(key(release,`approval-${evidenceSha256}`));
   return {release,git,deployment,live,evidenceSha256,approval,state:live.current?'published' as const:approval?'approved' as const:'review' as const};
  },
  async approve(release:Release,expectedEvidence:string){
   const actor=await authorize();const status=await this.status(release);
   if(!status.evidenceSha256||status.evidenceSha256!==expectedEvidence)throw Error('standalone_review_stale');
   const path=key(release,`approval-${expectedEvidence}`);
   const existing=await store.read<Approval>(path);if(existing)return existing;
   const approval={releaseId:release.id,evidenceSha256:expectedEvidence,actor:actor.userId,approvedAt:new Date().toISOString()};
   await store.claim(path,approval);return store.read<Approval>(path);
  },
  async connectDomain(release:Release,expectedEvidence:string){
   await authorize();const s=await this.status(release);
   if(!s.deployment||!s.approval||s.evidenceSha256!==expectedEvidence||s.approval.evidenceSha256!==expectedEvidence)throw Error('standalone_approval_missing_or_stale');
   if(release.target.domainMode!=='new'||!provider.connectDomain)throw Error('standalone_domain_transfer_requires_owner');
   await authorize();await provider.connectDomain(release,s.deployment);return this.status(release);
  },
  async publish(release:Release,expectedEvidence:string){
   await authorize();const s=await this.status(release);
   if(!s.git||!s.deployment||!s.live||s.evidenceSha256!==expectedEvidence)throw Error('standalone_review_stale');
   requirePublicationApproval(release,s.git,s.deployment,s.live,s.approval??null);
   if(s.live.current)return s;
   if((s.live as LiveRelease&{previousDeploymentId?:string}).previousDeploymentId===s.deployment.deploymentId)throw Error('standalone_promotion_pending_refresh');
   // Serialize promotions per site. The immutable preceding current deployment
   // is the CAS slot; concurrent different releases cannot both win it.
   const slot=await store.claim(`promotion-${fingerprint({project:s.deployment.projectId,previous:(s.live as LiveRelease&{previousDeploymentId?:string}).previousDeploymentId??null})}.json`,{releaseId:release.id,evidenceSha256:expectedEvidence});
   if(!slot)throw Error('standalone_promotion_pending_refresh');
   await authorize();const fresh=await provider.inspect(release,s.git,s.deployment);
   requirePublicationApproval(release,s.git,s.deployment,fresh,s.approval??null);
   if((fresh as LiveRelease&{previousDeploymentId?:string}).previousDeploymentId!==(s.live as LiveRelease&{previousDeploymentId?:string}).previousDeploymentId)throw Error('standalone_review_stale');
   await provider.promote(release,s.deployment);
   return this.status(release);
  },
 };
}
