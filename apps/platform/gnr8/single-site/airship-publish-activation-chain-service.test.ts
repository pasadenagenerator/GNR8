import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeArtifact, CanonicalSiteVersionSnapshot } from "../runtime/types";
import {
  AIRSHIP_PUBLISH_ACTIVATION_CHAIN_SERVICE_VERSION,
  airshipPublishActivationChainIdempotencyKey,
  createAirshipPublishActivationChain,
  type AirshipPublishActivationChainRecord,
  type AirshipPublishActivationChainDependencies,
  type AirshipPublishActivationChainRefs,
} from "./airship-publish-activation-chain-service";
import type { AirshipPublishReadinessRecord, AirshipPublishReadinessRepository } from "./airship-single-site-publish-readiness-service";
import type { PublishActivationDecisionReadModel } from "./publish-activation-decision-read-model";
import type { PublishActivationGateHandoffPackage } from "./publish-activation-gate-handoff";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const READINESS_ID = "3fdcde40-e178-40b5-83e1-217d600315ef";
const REVIEW_ID = "4bcca499-468b-40ff-b124-9cee88061263";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";
const EVIDENCE_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const DECISION_ID = "33333333-3333-4333-8333-333333333333";
const GATE_ID = "44444444-4444-4444-8444-444444444444";
const GATE_INPUT_WATERMARK = `single-site-publish-activation-gate-input:${"a".repeat(64)}`;

function refs(overrides: Partial<AirshipPublishActivationChainRefs> = {}): AirshipPublishActivationChainRefs {
  return {
    readinessPackageId: READINESS_ID,
    reviewRecordId: REVIEW_ID,
    candidateVersionId: CANDIDATE_VERSION_ID,
    artifactId: ARTIFACT_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    ...overrides,
  };
}

function readiness(overrides: Partial<AirshipPublishReadinessRecord> = {}): AirshipPublishReadinessRecord {
  return {
    id: READINESS_ID,
    migrationId: MIGRATION_ID,
    reviewRecordId: REVIEW_ID,
    readinessStatus: "complete",
    nextStep: "governed dry-run later, not publish",
    siteClientSourceLabels: {
      tenantId: "tenant-synthetic",
      clientId: "client-synthetic",
      siteId: "site-synthetic",
      sourceUrl: "https://example-imported.test/",
      liveUrl: "https://example-imported.test/",
      importedSiteLabel: "example imported site",
    },
    reviewedCandidateSiteVersionId: CANDIDATE_VERSION_ID,
    reviewedArtifactId: ARTIFACT_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    reviewStatus: "approved",
    reviewDecision: "approved_for_publish_readiness",
    reviewedAt: "2026-09-10T12:18:00.750Z",
    currentLiveActivePointerBefore: { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID },
    currentLiveActivePointerAfter: { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID },
    sourceEvidenceSummary: { status: "source_supported", detail: "Source-supported evidence.", evidenceItems: [] },
    savedDraftFieldSummary: [],
    internalPreviewUrl: `/api/gnr8/admin/single-site-studio/versions/${CANDIDATE_VERSION_ID}/preview?mode=transformed`,
    limitationsWarnings: ["Internal preview only; not live; not published; active pointer unchanged."],
    noPublishConfirmation: {
      internalPreviewOnly: true,
      notLive: true,
      notPublished: true,
      candidateRuntimeState: "DRAFT",
      activePointerChanged: false,
      runtimeVersionStateMutated: false,
      liveSiteMutated: false,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      providerCall: false,
    },
    serviceVersion: "airship-6-publish-readiness-package:v1",
    idempotencyKey: "readiness-key",
    correlationId: "readiness-correlation",
    metadata: {},
    createdAt: "2026-09-10T12:20:00.000Z",
    updatedAt: "2026-09-10T12:20:00.000Z",
    ...overrides,
  };
}

function candidateVersion(state: CanonicalSiteVersionSnapshot["state"] = "DRAFT"): CanonicalSiteVersionSnapshot {
  return {
    id: CANDIDATE_VERSION_ID,
    siteId: "runtime-synthetic",
    versionNo: 12,
    state,
    source: "manual",
    actor: "superadmin-test:airship-draft-candidate",
    createdAt: "2026-09-10T00:06:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: ARTIFACT_ID,
    importProvenanceSummary: null,
    pages: [],
  };
}

function artifact(publishStage: RuntimeArtifact["publishStage"] = "shadow"): RuntimeArtifact {
  return {
    id: ARTIFACT_ID,
    siteId: "runtime-synthetic",
    siteVersionId: CANDIDATE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    bundleSha256: "bundle-synthetic",
    htmlByPath: { "/": "<html><body>Synthetic imported-site headline</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { sourceKind: "airship_single_site_draft_candidate" },
    publishStage,
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY"],
      pageRolloutPolicyState: ["AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY",
      siteRolloutPolicyState: "AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage,
    },
    createdAt: "2026-09-10T00:07:00.000Z",
  };
}

class MemoryReadinessRepository implements AirshipPublishReadinessRepository {
  constructor(public record: AirshipPublishReadinessRecord | null = readiness()) {}
  updates = 0;

  async createOrReuseReadiness(): Promise<never> {
    throw new Error("not used by activation-chain tests");
  }

  async readLatestReadiness(): Promise<AirshipPublishReadinessRecord | null> {
    return this.record;
  }

  async readReadinessById(readinessPackageId: string): Promise<AirshipPublishReadinessRecord | null> {
    return this.record?.id === readinessPackageId ? this.record : null;
  }

  async attachActivationChainMetadata(input: { metadata: Record<string, unknown> }): Promise<AirshipPublishReadinessRecord> {
    assert.ok(this.record);
    this.updates += 1;
    this.record = {
      ...this.record,
      metadata: { ...this.record.metadata, ...input.metadata },
    };
    return this.record;
  }
}

function decisionReadModel(): PublishActivationDecisionReadModel {
  return {
    readModelVersion: "mvp-43-publish-activation-decision-read-model:v1",
    identity: { tenantId: "tenant-synthetic", clientId: "client-synthetic", siteId: "site-synthetic", migrationId: MIGRATION_ID },
    transactionCapturedAt: "2026-09-10T12:25:00.000Z",
    publishActivationRequest: {
      id: REQUEST_ID,
      ref: `aaf:approval_request:${REQUEST_ID}`,
      scope: "publish_activation",
      action: "publish.activation",
      subjectType: "site_version",
      subjectId: CANDIDATE_VERSION_ID,
      status: "requested",
      policyVersion: "MVP-41",
      semanticWatermark: "wm:request",
      requestedExpiresAt: null,
    },
    publishActivationDecision: {
      id: DECISION_ID,
      ref: `aaf:approval_decision:${DECISION_ID}`,
      status: "granted_with_limitations",
      policyVersion: "MVP-41",
      semanticWatermark: "wm:decision",
      decidedAt: "2026-09-10T12:25:00.000Z",
      expiresAt: null,
      limitations: [{ code: "airship_internal_preview_only" }],
    },
    launchReadinessEvidence: {
      packageId: EVIDENCE_ID,
      packageRef: `aaf:evidence_package:${EVIDENCE_ID}`,
      packageType: "single_site_launch_readiness_evidence",
      subjectType: "single_site_launch_readiness_package",
      subjectId: READINESS_ID,
      status: "created",
      freshnessLabel: "fresh",
      sourceWatermark: "wm:evidence",
      contentHash: "hash-evidence",
      readinessStatus: "ready_with_limitations",
      payloadSemanticWatermarks: {},
    },
    improvedCandidateSiteVersionRef: {
      role: "improved_candidate_site_version",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_runtime_site_versions",
      sourceRecordId: CANDIDATE_VERSION_ID,
      sourceRef: `gnr8:gnr8_runtime_site_versions:${CANDIDATE_VERSION_ID}`,
      sourceWatermark: "wm:candidate",
    },
    runtimeArtifactRef: {
      role: "improved_runtime_artifact",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_runtime_artifacts",
      sourceRecordId: ARTIFACT_ID,
      sourceRef: `gnr8:gnr8_runtime_artifacts:${ARTIFACT_ID}`,
      sourceWatermark: "wm:artifact",
    },
    publishTargetRef: {
      role: "publish_target",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_publish_targets",
      sourceRecordId: "production",
      sourceRef: "gnr8:gnr8_publish_targets:production",
      sourceWatermark: "wm:production",
    },
    readinessLimitations: [{ code: "airship_internal_preview_only" }],
    decisionLimitations: [{ code: "airship_internal_preview_only" }],
    evidenceFreshnessStatus: { status: "fresh", currentSourceWatermark: "wm:evidence", expiresAt: null, rowsRead: 1 },
    policyMetadata: {
      requestPolicyEvaluationId: "policy-request",
      decisionPolicyEvaluationId: "policy-decision",
      requestPolicyResult: "approval_required",
      policyVersion: "MVP-41",
      action: "publish.activation",
      scope: "publish_activation",
    },
    sourceRefs: [],
    auditRefs: [],
    diagnostics: { blockers: [], missing: [], stale: [], warnings: [], conflictingDecisionIds: [] },
    validationSummary: { valid: true, status: "decision_granted_with_limitations", blockerCodes: [], missingCodes: [], staleCodes: [], warningCodes: [] },
    nextAction: "prepare_gate_evaluation",
    semanticWatermark: "wm:read-model",
    flags: {
      derivedOnly: true,
      mutatesSourceTruth: false,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
      publishes: false,
      readyForPublishExecution: false,
      publishActivationApproved: true,
      readyForGateEvaluation: true,
    },
  };
}

function deps(repository = new MemoryReadinessRepository()): Partial<AirshipPublishActivationChainDependencies> & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    readinessRepository: repository,
    getSiteVersion: async () => candidateVersion(),
    getArtifactById: async () => artifact(),
    getActivePointerForSite: async () => ({ siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID }),
    evidenceWriter: {
      async createEvidencePackageTransaction(input: { evidencePackage: Record<string, unknown>; sourceRefs?: unknown[] }) {
        calls.push("evidence");
        assert.equal(input.evidencePackage.subjectId, READINESS_ID);
        assert.equal(input.evidencePackage.packageType, "single_site_launch_readiness_evidence");
        assert.ok(input.sourceRefs?.length);
        return {
          evidencePackage: { id: EVIDENCE_ID, status: "created", sourceWatermark: "wm:evidence", ...input.evidencePackage },
          sourceRefs: [],
          items: [],
          freshnessCheck: { id: "freshness", result: "fresh" },
          auditLink: null,
        };
      },
    },
    requestBridge: {
      async preparePublishActivationRequestFromLaunchReadiness(input: { launchReadinessRecordId: string; launchReadinessEvidencePackageId: string }) {
        calls.push("request");
        assert.equal(input.launchReadinessRecordId, READINESS_ID);
        assert.equal(input.launchReadinessEvidencePackageId, EVIDENCE_ID);
        return {
          requestId: REQUEST_ID,
          requestRef: `aaf:approval_request:${REQUEST_ID}`,
          status: "requested",
          semanticWatermark: "wm:request",
        };
      },
    },
    decisionService: {
      async recordPublishActivationDecision(input: { publishActivationRequestId: string; launchReadinessEvidencePackageId: string }) {
        calls.push("decision");
        assert.equal(input.publishActivationRequestId, REQUEST_ID);
        assert.equal(input.launchReadinessEvidencePackageId, EVIDENCE_ID);
        return {
          decisionId: DECISION_ID,
          decisionRef: `aaf:approval_decision:${DECISION_ID}`,
          decisionStatus: "granted_with_limitations",
        };
      },
    },
    buildDecisionReadModel: async () => {
      calls.push("read-model");
      return decisionReadModel();
    },
    gateEvaluator: {
      async evaluatePublishActivationGateFromHandoff(input: { handoff: PublishActivationGateHandoffPackage }) {
        calls.push("gate");
        assert.equal(input.handoff.status, "handoff_ready");
        return {
          gateAttemptId: GATE_ID,
          gateResult: "allowed",
          evaluationStatus: "warning",
          semanticGateInputWatermark: GATE_INPUT_WATERMARK,
          blockerCodes: [],
          sourceWatermarks: { semanticGateInput: GATE_INPUT_WATERMARK },
        };
      },
    },
  } as unknown as Partial<AirshipPublishActivationChainDependencies> & { calls: string[] };
}

test("Airship activation chain creates real request, decision, gate refs and persists the handoff metadata", async () => {
  const repository = new MemoryReadinessRepository();
  const dependencies = deps(repository);
  const result = await createAirshipPublishActivationChain(
    { ...refs(), migrationId: MIGRATION_ID, actorId: "superadmin-airship" },
    dependencies,
  );

  assert.equal(result.status, "created");
  assert.equal(result.chain.serviceVersion, AIRSHIP_PUBLISH_ACTIVATION_CHAIN_SERVICE_VERSION);
  assert.equal(result.chain.activationRequest.id, REQUEST_ID);
  assert.equal(result.chain.activationDecision.id, DECISION_ID);
  assert.equal(result.chain.gateAttempt.id, GATE_ID);
  assert.notEqual(result.chain.activationRequest.id, READINESS_ID);
  assert.notEqual(result.chain.activationDecision.id, READINESS_ID);
  assert.notEqual(result.chain.gateAttempt.id, READINESS_ID);
  assert.equal(result.chain.gateInputWatermark, GATE_INPUT_WATERMARK);
  assert.equal(result.chain.readinessPackageId, READINESS_ID);
  assert.equal(result.chain.reviewRecordId, REVIEW_ID);
  assert.equal(result.chain.candidateVersionId, CANDIDATE_VERSION_ID);
  assert.equal(result.chain.artifactId, ARTIFACT_ID);
  assert.equal(result.chain.draftId, DRAFT_ID);
  assert.equal(result.chain.draftVersion, 44);
  assert.equal(result.chain.publishTargetRef.sourceRecordId, "production");
  assert.equal(result.chain.activePointerBefore.siteVersionId, LIVE_VERSION_ID);
  assert.equal(result.chain.activePointerAfter.siteVersionId, LIVE_VERSION_ID);
  assert.equal(result.chain.nextStep, "governed dry-run, not publish");
  assert.equal(result.chain.mutationFlags.publishes, false);
  assert.equal(result.chain.mutationFlags.dryRun, false);
  assert.equal(result.chain.mutationFlags.shadowPublish, false);
  assert.equal(result.chain.mutationFlags.activePointerChanged, false);
  assert.deepEqual(dependencies.calls, ["evidence", "request", "decision", "read-model", "gate"]);
  assert.equal(repository.updates, 1);
  assert.equal((repository.record?.metadata.airshipPublishActivationChain as AirshipPublishActivationChainRecord).gateAttempt.id, GATE_ID);
  assert.equal(repository.record?.metadata.expectedPublishActivationRequestRef, REQUEST_ID);
  assert.equal(repository.record?.metadata.expectedPublishActivationDecisionRef, DECISION_ID);
  assert.equal(repository.record?.metadata.expectedGateAttemptResultRef, GATE_ID);
  assert.equal(repository.record?.metadata.expectedGateInputWatermark, GATE_INPUT_WATERMARK);
});

test("Airship activation chain creation is idempotent for readiness/review/candidate/artifact/draft refs", async () => {
  const repository = new MemoryReadinessRepository();
  const dependencies = deps(repository);
  const input = { ...refs(), migrationId: MIGRATION_ID, actorId: "superadmin-airship" };
  const first = await createAirshipPublishActivationChain(input, dependencies);
  const second = await createAirshipPublishActivationChain(input, dependencies);

  assert.equal(first.status, "created");
  assert.equal(second.status, "reused");
  assert.equal(second.chain.gateAttempt.id, GATE_ID);
  assert.equal(repository.updates, 1);
  assert.deepEqual(dependencies.calls, ["evidence", "request", "decision", "read-model", "gate"]);
  assert.equal(first.chain.idempotencyKey, airshipPublishActivationChainIdempotencyKey(refs()));
});

test("Airship activation chain refuses missing, unapproved, stale, mismatched, and live candidates", async () => {
  await assert.rejects(
    () => createAirshipPublishActivationChain({ ...refs(), migrationId: MIGRATION_ID, actorId: "superadmin-airship" }, deps(new MemoryReadinessRepository(null))),
    /airship_publish_activation_chain_readiness_package_missing/,
  );
  await assert.rejects(
    () => createAirshipPublishActivationChain({ ...refs(), migrationId: MIGRATION_ID, actorId: "superadmin-airship" }, deps(new MemoryReadinessRepository(readiness({ reviewStatus: "pending" as "approved" })))),
    /airship_publish_activation_chain_readiness_unapproved/,
  );
  await assert.rejects(
    () => createAirshipPublishActivationChain({ ...refs({ artifactId: "55555555-5555-4555-8555-555555555555" }), migrationId: MIGRATION_ID, actorId: "superadmin-airship" }, deps()),
    /airship_publish_activation_chain_artifact_mismatch/,
  );
  await assert.rejects(
    () => createAirshipPublishActivationChain({ ...refs(), migrationId: "not-a-uuid", actorId: "superadmin-airship" }, deps()),
    /airship_publish_activation_chain_migration_id_invalid/,
  );
  await assert.rejects(
    () => createAirshipPublishActivationChain(
      { ...refs(), migrationId: MIGRATION_ID, actorId: "superadmin-airship" },
      { ...deps(), getSiteVersion: async () => candidateVersion("PUBLISHED") },
    ),
    /airship_publish_activation_chain_candidate_not_draft/,
  );
  await assert.rejects(
    () => createAirshipPublishActivationChain(
      { ...refs(), migrationId: MIGRATION_ID, actorId: "superadmin-airship" },
      { ...deps(), getArtifactById: async () => artifact("production") },
    ),
    /airship_publish_activation_chain_artifact_production_stage/,
  );
});

test("Airship activation chain keeps generic imported-site source metadata free of CHS/Maver leakage", async () => {
  const repository = new MemoryReadinessRepository(readiness({
    siteClientSourceLabels: {
      tenantId: "tenant-luna",
      clientId: "client-luna",
      siteId: "site-luna",
      sourceUrl: "https://luna.example/",
      liveUrl: "https://luna.example/",
      importedSiteLabel: "luna.example",
    },
  }));
  const result = await createAirshipPublishActivationChain(
    { ...refs(), migrationId: MIGRATION_ID, actorId: "superadmin-airship" },
    deps(repository),
  );
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("chs.si"), false);
  assert.equal(serialized.includes("Maver"), false);
  assert.equal(result.chain.mutationFlags.liveSiteMutated, false);
  assert.equal(result.chain.mutationFlags.providerCall, false);
});
