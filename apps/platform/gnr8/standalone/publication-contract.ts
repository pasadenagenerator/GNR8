import { createHash } from 'node:crypto';
import { stableStringify } from '../runtime/deterministic';
import { parseStackiScope, type StackiDraftScope } from '../stacki/stacki-draft-contract';
import { parseStackiCandidateSelection, type StackiCandidateSelection } from '../stacki/stacki-candidate-selection';
export const STANDALONE_TRANSFORM_VERSION='gnr8-standalone-transform:v6';
export const fingerprint=(value:unknown)=>createHash('sha256').update(stableStringify(value)).digest('hex');
export type PublicationScope=Omit<StackiDraftScope,'siteVersionId'>;
export type ContactPolicy={recipient:string;confirmed:true;maxClaims:number;perHour:number;retentionDays:number};
export type PublicationTarget={domainMode?:'new'|'transfer';contactPolicy?:ContactPolicy|null;githubOwner:string;githubOwnerId:number;githubOwnerKind:'User'|'Organization';repository:string;provisionedRepositoryId?:number;vercelTeamId:string;project:string;host:string;authorizationId:string;approvedManifestSha256?:string;maxFiles:number;maxBytes:number};
export type StoredSourceSelection={kind:'generated-source';scope:StackiDraftScope;sha256:string;revision?:never};
export type PublicationSourceSelection=StackiCandidateSelection|StoredSourceSelection;
export type PublicationSelection={selection:PublicationSourceSelection;artifactId:string;artifactSha256:string};
export type GitReceipt={repositoryId:number;ownerId:number;repository:string;commit:string;tree:string;manifestSha256:string};
export function requireReleaseGitReceipt(release:Release,value:unknown):GitReceipt{
 const git=value as GitReceipt;
 if(!git||Object.keys(git).sort().join()!=='commit,manifestSha256,ownerId,repository,repositoryId,tree'||
  !Number.isSafeInteger(git.repositoryId)||git.repositoryId<1||
  git.ownerId!==release.target.githubOwnerId||
  (release.target.provisionedRepositoryId!==undefined&&git.repositoryId!==release.target.provisionedRepositoryId)||
  typeof git.repository!=='string'||git.repository.toLowerCase()!==`${release.target.githubOwner}/${release.target.repository}`.toLowerCase()||
  !/^[a-f0-9]{40}$/.test(git.commit)||!/^[a-f0-9]{40}$/.test(git.tree)||
  git.manifestSha256!==release.manifestSha256)throw Error('standalone_git_receipt_invalid');
 return git;
}
export type DeploymentReceipt={projectId:string;deploymentId:string;url:string;commit:string;manifestSha256:string;configurationSha256:string;target:'production'};
export type Release={id:string;input:PublicationSelection;target:PublicationTarget;manifestSha256:string;files:Array<{path:string;sha256:string;bytes:number}>;routes:string[];contactRequired?:boolean;foundation?:{confirmationSha256:string;brandSha256:string;brandRevision:number;stackiSourceSha256:string;assetPlanSha256:string;transformIdentity:string;nodeVersion?:'22.x'|'26.x'}};
export type LiveRelease=DeploymentReceipt&{ready:boolean;current:boolean;domainReady:boolean;repositoryId:number;ownerId:number};
export type Approval={releaseId:string;evidenceSha256:string;actor:string;approvedAt:string};
export function parsePublicationSelection(value:unknown):PublicationSelection{
 const v=value as PublicationSelection;
 if(!v||Object.keys(v).sort().join()!=='artifactId,artifactSha256,selection'||! /^[a-f0-9-]{36}$/.test(v.artifactId)||! /^[a-f0-9]{64}$/.test(v.artifactSha256))throw Error('standalone_selection_invalid');
 return {...v,selection:parsePublicationSourceSelection(v.selection)};
}
export function validateTarget(t:PublicationTarget){
 if(t?.domainMode!==undefined&&!['new','transfer'].includes(t.domainMode))throw Error('standalone_target_invalid');
 if(t?.approvedManifestSha256!==undefined&&!/^[a-f0-9]{64}$/.test(t.approvedManifestSha256))throw Error('standalone_target_invalid');
 if(!t||(t.provisionedRepositoryId!==undefined&&(!Number.isSafeInteger(t.provisionedRepositoryId)||t.provisionedRepositoryId<1))||! /^[A-Za-z0-9-]{1,39}$/.test(t.githubOwner)||!Number.isSafeInteger(t.githubOwnerId)||t.githubOwnerId<1||!['User','Organization'].includes(t.githubOwnerKind)||! /^[a-z0-9][a-z0-9-]{0,62}$/.test(t.repository)||! /^team_[A-Za-z0-9]+$/.test(t.vercelTeamId)||! /^[a-z0-9][a-z0-9-]{0,62}$/.test(t.project)||! /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(t.host)||! /^[A-Za-z0-9_-]{8,80}$/.test(t.authorizationId)||!Number.isInteger(t.maxFiles)||t.maxFiles<1||t.maxFiles>2000||!Number.isInteger(t.maxBytes)||t.maxBytes<1||t.maxBytes>128*1024*1024)throw Error('standalone_target_invalid');return t;
}
/** An operator can bind a bounded hosted authorization to a locally reviewed
 * export before its first claim, rather than accepting whichever export wins. */
export function requireApprovedManifest(target:PublicationTarget,manifestSha256:string){
 validateTarget(target);
 if(target.approvedManifestSha256!==undefined&&target.approvedManifestSha256!==manifestSha256)throw Error('standalone_approved_manifest_mismatch');
}
export function releaseEvidence(release:Release,git:GitReceipt,deployment:DeploymentReceipt,live:LiveRelease){
 if(!live.ready||live.target!=='production'||live.commit!==git.commit||deployment.commit!==git.commit||git.manifestSha256!==release.manifestSha256||deployment.manifestSha256!==release.manifestSha256||live.manifestSha256!==release.manifestSha256||live.projectId!==deployment.projectId||live.deploymentId!==deployment.deploymentId||live.configurationSha256!==deployment.configurationSha256||live.url!==deployment.url||live.repositoryId!==git.repositoryId||live.ownerId!==release.target.githubOwnerId||git.ownerId!==release.target.githubOwnerId)throw Error('standalone_review_stale');
 return fingerprint({releaseId:release.id,git,deployment,target:release.target});
}
export function requirePublicationApproval(release:Release,git:GitReceipt,deployment:DeploymentReceipt,live:LiveRelease,approval:Approval|null){
 const evidence=releaseEvidence(release,git,deployment,live);
 if(!approval||approval.releaseId!==release.id||approval.evidenceSha256!==evidence)throw Error('standalone_approval_missing_or_stale');
 if(!live.domainReady)throw Error('standalone_domain_not_ready');return evidence;
}

export function parsePublicationSourceSelection(value:unknown):PublicationSourceSelection {
 const v=value as StoredSourceSelection;
 if(v?.kind!=='generated-source')return parseStackiCandidateSelection(value);
 if(Object.keys(v).sort().join()!=='kind,scope,sha256'||!/^[a-f0-9]{64}$/.test(v.sha256))throw Error('standalone_selection_invalid');
 return {kind:'generated-source',scope:parseStackiScope(v.scope),sha256:v.sha256};
}
export function publicationSelectionForArtifact(scope:StackiDraftScope,artifact:{id:string;bundleSha256:string;manifest:unknown}):PublicationSelection {
 const workspace=(artifact.manifest as any)?.generatedOutputSourceWorkspace;
 const lineage=workspace?.stackiRevision;
 if(!workspace||workspace.adapterId!=='astro-static-site')throw Error('standalone_source_unsupported');
 return parsePublicationSelection({artifactId:artifact.id,artifactSha256:artifact.bundleSha256,selection:lineage?{scope:lineage.scope,revision:lineage.revision,sha256:lineage.sha256}:{kind:'generated-source',scope,sha256:fingerprint(workspace)}});
}
