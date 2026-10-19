import 'server-only';
import type { RuntimeArtifact } from '@/gnr8/runtime/types';
import { computeRuntimeArtifactBundleSha256 } from '@/gnr8/runtime/astro-artifact-materialization';
import { stableStringify } from '@/gnr8/runtime/deterministic';
import { buildAstroCandidateRuntimeArtifact } from './astro-candidate-promotion-service';
import { deterministicUuid } from './astro-successor-operation-identity';
import { buildSuccessorBoundAstroCandidate } from './astro-successor-publication-service';
import { createAstroProductionCandidateId } from './astro-production-candidate-record';
import { createGeneratedOutputComposition, readGeneratedOutputReviewModel } from './generated-output-publication-composition';
import { readGeneratedOutputBuildEvidence, readGeneratedOutputContentManifest, rebindBuildEvidenceToCandidate } from './generated-output-evidence';
import { createGeneratedOutputContentManifest, evaluateGeneratedOutputTechnicalEligibility } from './generated-output-eligibility';

import { PUBLIC_PREPARATION_VERSION, PUBLIC_PREPARATION_PRODUCER, readPublicPreparation, type PublicPreparation } from './astro-public-preparation-contract';

/** Creates a new immutable derivative. Never approves, binds a host, or activates a pointer. */
export async function prepareRetainedAstroPublicArtifact(input: {
  sourceSiteVersionId: string;
  sourceArtifactId: string;
  expectedSourceArtifactSha256: string;
  expectedSourceCandidateId: string;
  host: string;
  actor: string;
}) {
  const c = createGeneratedOutputComposition();
  const store = await import('@/gnr8/runtime/runtime-store');
  const lifecycle = await import('@/gnr8/runtime/version-lifecycle-enforcer');
  const source = await c.runtimeStore.readContext(input.sourceSiteVersionId);
  if (!source?.artifact || source.artifact.id!==input.sourceArtifactId || source.artifact.bundleSha256!==input.expectedSourceArtifactSha256)
    throw new Error('public_preparation_source_mismatch');
  const sourceReview = await readGeneratedOutputReviewModel(input.sourceSiteVersionId);
  if (sourceReview.candidateId!==input.expectedSourceCandidateId || sourceReview.decision.technical.status!=='PASS')
    throw new Error('public_preparation_source_technical_blocked');
  const sourceOwnership = await c.ownershipResolver.resolve({siteVersionId:input.sourceSiteVersionId});
  const sourceRecord = await c.candidateRepository.read({candidateId:input.expectedSourceCandidateId,trustedScope:sourceOwnership});
  const sourceBuild = readGeneratedOutputBuildEvidence(source.artifact.manifest);
  const sourceContent = readGeneratedOutputContentManifest(source.artifact.manifest);
  if (!sourceBuild || !sourceContent) throw new Error('public_preparation_source_evidence_missing');
  const preparation: PublicPreparation = {
    version:PUBLIC_PREPARATION_VERSION, host:input.host, expectedActivePointer:null,
    sourceSiteVersionId:input.sourceSiteVersionId,sourceArtifactId:source.artifact.id,
    sourceArtifactSha256:source.artifact.bundleSha256,sourceCandidateId:sourceRecord.identity.candidateId,
    sourceCandidateContentSha256:sourceRecord.candidate.contentSha256,
    sourceTechnicalEvidenceSha256:sourceReview.decision.technical.evidenceSha256,
  };
  if (!readPublicPreparation({publicPreparation:preparation})) throw new Error('public_preparation_invalid_host');
  const seed = stableStringify(preparation);
  const siteVersionId = deterministicUuid(seed+':version');
  const operationId = deterministicUuid(seed+':candidate');
  const candidateId = createAstroProductionCandidateId(operationId);
  const existing = await c.runtimeStore.readContext(siteVersionId);
  if (existing?.artifact) {
    if (stableStringify(existing.artifact.manifest.publicPreparation)!==seed) throw new Error('public_preparation_conflict');
    if (existing.siteVersion.state === 'DRAFT') await lifecycle.transitionSiteVersionState({siteVersionId,nextState:'READY_FOR_REVIEW',actor:input.actor,source:'manual',details:{workflow:PUBLIC_PREPARATION_VERSION,publicPreparation:preparation}});
    const model = await readGeneratedOutputReviewModel(siteVersionId);
    if (model.decision.technical.status !== 'PASS') throw new Error('public_preparation_existing_invalid');
    return model;
  }
  const pointer = await c.client.from('gnr8_runtime_active_pointers').select('site_id').eq('site_id',sourceOwnership.runtimeSiteId).maybeSingle();
  if (pointer.error || pointer.data) throw new Error('public_preparation_requires_empty_pointer');
  if (!existing) {
    await store.createSiteVersionFromMigration({
      siteId:sourceOwnership.runtimeSiteId,sourceUrl:sourceBuild.sourceCapture.sourceUrl,actor:input.actor,
      siteVersionId,createSourceHostBinding:false,rendererCompatibilityVersion:sourceRecord.candidate.rendererCompatibilityVersion,
      pages:source.siteVersion.pages.map(page=>({...page,actor:input.actor})),
      importProvenanceSummary:source.siteVersion.importProvenanceSummary,
    });
  }
  await store.linkRuntimeSiteVersionOwnershipIfAllowed({siteVersionId,ownershipSiteId:sourceOwnership.ownershipSiteId});
  const ownership = await c.ownershipResolver.resolve({siteVersionId,expectedRuntimeSiteId:sourceOwnership.runtimeSiteId});
  if (ownership.organizationId!==sourceOwnership.organizationId || ownership.ownershipSiteId!==sourceOwnership.ownershipSiteId)
    throw new Error('public_preparation_ownership_mismatch');
  const context = await c.runtimeStore.readContext(siteVersionId);
  if (!context || context.siteVersion.state!=='DRAFT') throw new Error('public_preparation_state_conflict');
  const candidate = buildSuccessorBoundAstroCandidate({source:sourceRecord,successorSiteVersionId:siteVersionId,successorCandidateId:candidateId,createdAt:context.siteVersion.createdAt});
  const created = await c.candidateRepository.create({candidate,trustedScope:ownership,registration:{
    registeredByActorId:input.actor,producerKind:PUBLIC_PREPARATION_PRODUCER,producerVersion:'v1',producerRef:sourceRecord.identity.candidateId,
    idempotencyKey:`public-preparation:${operationId}`,correlationId:`public-preparation:${siteVersionId}`,
  }});
  const record = created.record;
  const contentManifest = createGeneratedOutputContentManifest({
    sourceRef:sourceContent.sourceRef,requiredContent:sourceContent.requiredContent,requiredNavigation:sourceContent.requiredNavigation,requiredAssets:sourceContent.requiredAssets,
    scope:{...sourceContent.scope,allowedPublishStages:['production'],unsupportedCapabilities:sourceContent.scope.unsupportedCapabilities.map(x=>x==='scripts'?'arbitrary third-party scripts':x==='forms'?'forms outside the supported native contact schema':x)},
  });
  const buildEvidence = rebindBuildEvidenceToCandidate({sourceEvidence:sourceBuild,successorRecord:record});
  const placeholder: RuntimeArtifact = {...source.artifact,id:deterministicUuid(seed+':artifact'),siteVersionId,manifest:{},createdAt:context.siteVersion.createdAt};
  const artifact = buildAstroCandidateRuntimeArtifact({siteVersion:context.siteVersion,artifact:placeholder,record,ownership,input:{
    actorUserId:input.actor,siteVersionId,candidateId,expectedContentSha256:record.candidate.contentSha256,expectedStorageSha256:record.storageSha256,
    idempotencyKey:`public-preparation:${operationId}`,generatedOutputEvidence:{buildEvidence,contentManifest,sourceWorkspace:source.artifact.manifest.generatedOutputSourceWorkspace as Record<string,unknown>},
  }});
  artifact.manifest.publicPreparation = preparation;
  artifact.manifest.publishStage = artifact.publishStage = 'production';
  artifact.manifest.shadowRestricted = artifact.shadowRestricted = false;
  artifact.manifest.enforcementDecision = 'ALLOW';
  artifact.bundleSha256 = computeRuntimeArtifactBundleSha256({htmlByPath:artifact.htmlByPath,compiledTokenStyles:artifact.compiledTokenStyles,assetFingerprintMap:artifact.assetFingerprintMap,manifest:artifact.manifest});
  const capture = await c.runtimeStore.readContext(buildEvidence.sourceCapture.siteVersionId);
  const technical = evaluateGeneratedOutputTechnicalEligibility({siteVersion:context.siteVersion,artifact,authoritativeOwnership:ownership,candidateRecord:record,buildEvidence,contentManifest,
    sourceCaptureSiteVersion:capture?.siteVersion??null,sourceCaptureArtifact:capture?.artifact??null,publicSourceArtifact:source.artifact});
  if (technical.status!=='PASS') throw new Error(`public_preparation_blocked:${technical.blockerReasons.map(x=>x.code).join(',')}`);
  // Generated-output governance is derived from the exact full technical evaluation,
  // not the unrelated migration score. Human approval remains a separate mandatory gate.
  const pages = Object.keys(artifact.htmlByPath).map(()=>'ALLOW');
  artifact.artifactGovernance = {pageGateState:pages.map(()=>'GENERATED_OUTPUT_PASS'),pageRolloutPolicyState:pages.map(()=>'EXACT_ARTIFACT_REVIEW_REQUIRED'),
    pageEnforcementState:{shadow:pages.map(()=>'DENY'),canary:pages.map(()=>'DENY'),production:pages},siteGateState:'GENERATED_OUTPUT_PASS',siteRolloutPolicyState:'EXACT_ARTIFACT_REVIEW_REQUIRED',
    siteEnforcementState:{shadow:'DENY',canary:'DENY',production:'ALLOW'},publishStage:'production'};
  const persisted = await store.createArtifact(artifact);
  await store.bindArtifactToVersion({siteVersionId,artifactId:persisted.artifactId,rendererCompatibilityVersion:artifact.rendererCompatibilityVersion});
  await lifecycle.transitionSiteVersionState({siteVersionId,nextState:'READY_FOR_REVIEW',actor:input.actor,source:'manual',details:{workflow:PUBLIC_PREPARATION_VERSION,publicPreparation:preparation}});
  const model = await readGeneratedOutputReviewModel(siteVersionId);
  if (model.artifactBundleSha256!==artifact.bundleSha256 || model.decision.technical.status!=='PASS' || model.decision.review.status!=='MISSING')
    throw new Error('public_preparation_readback_mismatch');
  return model;
}
