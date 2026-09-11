import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeArtifact, CanonicalSiteVersionSnapshot } from "../runtime/types";
import {
  airshipGovernedDryRunIdempotencyKey,
  runAirshipGovernedDryRun,
  type AirshipGovernedDryRunRefs,
} from "./airship-governed-dry-run-service";
import type { AirshipPublishReadinessRecord, AirshipPublishReadinessRepository } from "./airship-single-site-publish-readiness-service";
import type {
  SingleSitePublishOperatorActionAuditInput,
  SingleSitePublishOperatorActionAuditRow,
} from "./single-site-publish-operator-action-audit";
import {
  SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
  type SingleSitePublishWrapperInput,
  type SingleSitePublishWrapperResult,
} from "./single-site-publish-wrapper-orchestrator";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const READINESS_ID = "3fdcde40-e178-40b5-83e1-217d600315ef";
const REVIEW_ID = "4bcca499-468b-40ff-b124-9cee88061263";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";

function refs(overrides: Partial<AirshipGovernedDryRunRefs> = {}): AirshipGovernedDryRunRefs {
  return {
    readinessPackageId: READINESS_ID,
    reviewRecordId: REVIEW_ID,
    candidateVersionId: CANDIDATE_VERSION_ID,
    artifactId: ARTIFACT_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    migrationId: MIGRATION_ID,
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
    sourceEvidenceSummary: {
      status: "source_supported",
      detail: "Source-supported imported-site evidence.",
      evidenceItems: [],
    },
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
    metadata: { internalPreviewOnly: true },
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
  constructor(private readonly record: AirshipPublishReadinessRecord | null = readiness()) {}

  async createOrReuseReadiness(): Promise<never> {
    throw new Error("not used by dry-run tests");
  }

  async readLatestReadiness(): Promise<AirshipPublishReadinessRecord | null> {
    return this.record;
  }

  async readReadinessById(readinessPackageId: string): Promise<AirshipPublishReadinessRecord | null> {
    return this.record?.id === readinessPackageId ? this.record : null;
  }
}

function rowFromInput(input: SingleSitePublishOperatorActionAuditInput): SingleSitePublishOperatorActionAuditRow {
  return {
    id: "77777777-7777-4777-8777-777777777777",
    tenant_id: input.tenantId,
    client_id: input.clientId,
    site_id: input.siteId,
    migration_id: input.migrationId,
    mode: input.mode,
    route_action_source: input.routeActionSource,
    actor_id: input.actor.actorId,
    actor_type: input.actor.actorType,
    actor_role: input.actor.actorRole,
    confirmation_marker: input.confirmationMarker,
    candidate_site_version_ref: input.candidateSiteVersionRef,
    runtime_artifact_ref: input.runtimeArtifactRef,
    publish_target_ref: input.publishTargetRef,
    publish_stage: input.publishStage,
    publish_environment: input.publishEnvironment,
    launch_readiness_evidence_ref: input.launchReadinessEvidenceRef,
    publish_activation_request_ref: input.publishActivationRequestRef,
    publish_activation_decision_ref: input.publishActivationDecisionRef,
    gate_attempt_result_ref: input.gateAttemptResultRef,
    handoff_watermark: input.handoffWatermark,
    gate_input_watermark: input.gateInputWatermark,
    idempotency_key: input.idempotencyKey,
    correlation_id: input.correlationId,
    semantic_fingerprint: "fingerprint",
    status: "requested",
    result_summary_json: {},
    redacted_diagnostics_json: {},
    limitation_summary_json: {},
    error_summary_json: {},
    started_at: "2026-09-10T12:21:00.000Z",
    completed_at: null,
    created_at: "2026-09-10T12:21:00.000Z",
    updated_at: "2026-09-10T12:21:00.000Z",
    privacy_label: "internal_operational",
    retention_class: "compliance_long",
  };
}

function fakeAuditService() {
  let row: SingleSitePublishOperatorActionAuditRow | null = null;
  const events: string[] = [];
  return {
    events,
    async readActionByIdempotencyKey(idempotencyKey: string) {
      return row?.idempotency_key === idempotencyKey ? row : null;
    },
    async createOrReuseAction(input: SingleSitePublishOperatorActionAuditInput) {
      const existing = row?.idempotency_key === input.idempotencyKey ? row : null;
      row = existing ?? rowFromInput(input);
      events.push("action_requested");
      return { action: row, reusedExisting: Boolean(existing), eventActions: ["action_requested" as const], refRoles: [] };
    },
    async markDryRunStarted() {
      events.push("dry_run_started");
    },
    async markDryRunCompleted(input: { result: { ok: boolean; preflightStatus: string; wrapperDryRunStatus: string; resolverStatus: string | null; blockerCodes: string[]; warnings: string[]; limitationCodes: string[]; safeRefs: unknown } }) {
      assert.ok(row);
      row.status = "dry_run_completed";
      row.result_summary_json = {
        ok: input.result.ok,
        mode: "dry_run",
        preflightStatus: input.result.preflightStatus,
        wrapperStatus: input.result.wrapperDryRunStatus,
        resolverStatus: input.result.resolverStatus,
        publishes: false,
        runtimeMutation: false,
      };
      row.redacted_diagnostics_json = {
        blockerCodes: input.result.blockerCodes,
        warnings: input.result.warnings,
        limitationCodes: input.result.limitationCodes,
        safeRefs: input.result.safeRefs,
      };
      row.limitation_summary_json = {
        blockerCodes: input.result.blockerCodes,
        warningCodes: input.result.warnings,
        limitationCodes: input.result.limitationCodes,
      };
      row.completed_at = "2026-09-10T12:21:01.000Z";
      events.push("dry_run_completed");
      return row;
    },
  };
}

function wrapperResult(input: SingleSitePublishWrapperInput, overrides: Partial<SingleSitePublishWrapperResult> = {}): SingleSitePublishWrapperResult {
  return {
    wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
    status: "preflight_blocked",
    strictContextSummary: {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      migrationId: input.migrationId,
      siteVersionId: CANDIDATE_VERSION_ID,
      runtimeArtifactId: ARTIFACT_ID,
      publishTargetId: "production",
      publishStage: "production",
      publishEnvironment: "production",
      publishActivationRequestId: null,
      publishActivationDecisionId: null,
      gateAttemptId: null,
      launchReadinessEvidenceId: null,
      metadataWatermark: "metadata-watermark",
      handoffWatermark: null,
      gateInputWatermark: null,
      contextWatermark: "context-watermark",
    },
    metadataHandoffCompleteness: {
      status: "incomplete",
      complete: false,
      missingCodes: ["publish_activation_request_missing", "publish_activation_gate_missing"],
      mismatchCodes: [],
      warningCodes: [],
      safeIds: {
        tenantId: input.tenantId,
        clientId: input.clientId,
        siteId: input.siteId,
        migrationId: input.migrationId,
        siteVersionId: CANDIDATE_VERSION_ID,
        runtimeArtifactId: ARTIFACT_ID,
        publishTargetId: "production",
        publishStage: "production",
        publishEnvironment: "production",
        publishActivationRequestId: null,
        publishActivationDecisionId: null,
        gateAttemptId: null,
        launchReadinessEvidenceId: null,
        metadataWatermark: "metadata-watermark",
        handoffWatermark: null,
        gateInputWatermark: null,
        contextWatermark: "context-watermark",
      },
    },
    resolverDiagnostics: {
      status: "incomplete",
      complete: false,
      blockerCodes: [],
      missingCodes: ["publish_activation_request_missing", "publish_activation_gate_missing"],
      mismatchCodes: [],
      staleCodes: [],
      warningCodes: ["limitations_carried_forward"],
      transactionCapturedAt: "2026-09-10T12:21:00.000Z",
      safeIds: {
        siteId: input.siteId,
        siteVersionId: CANDIDATE_VERSION_ID,
        runtimeArtifactId: ARTIFACT_ID,
        publishTargetId: "production",
        publishActivationRequestId: null,
        publishActivationDecisionId: null,
        gateAttemptId: null,
      },
    },
    resolverResult: null,
    publishOrchestratorResult: null,
    publishOrchestratorInput: null,
    limitations: { readiness: [{ code: "airship_internal_preview_only" }], decision: [], combined: [] },
    warnings: ["limitations_carried_forward"],
    blockerCodes: ["publish_activation_request_missing", "publish_activation_gate_missing"],
    dryRun: true,
    publishes: false,
    runtimeMutation: false,
    flags: {
      wrapperOnly: true,
      shadowOnly: true,
      blockingEnforcementApplied: false,
      publishesOnlyThroughExistingOrchestrator: true,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
      pasrInvokedByWrapper: false,
      createsDdomSnapshots: false,
      providerCalls: false,
    },
    ...overrides,
  };
}

function deps(overrides: {
  readinessRecord?: AirshipPublishReadinessRecord | null;
  version?: CanonicalSiteVersionSnapshot | null;
  artifactRecord?: RuntimeArtifact | null;
  activePointer?: { siteVersionId: string; artifactId: string } | null;
  auditService?: ReturnType<typeof fakeAuditService>;
  wrapper?: (input: SingleSitePublishWrapperInput) => Promise<SingleSitePublishWrapperResult>;
} = {}) {
  return {
    readinessRepository: new MemoryReadinessRepository(overrides.readinessRecord === undefined ? readiness() : overrides.readinessRecord),
    getSiteVersion: async () => overrides.version === undefined ? candidateVersion() : overrides.version,
    getArtifactById: async () => overrides.artifactRecord === undefined ? artifact() : overrides.artifactRecord,
    getActivePointerForSite: async () =>
      overrides.activePointer === undefined
        ? { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID }
        : overrides.activePointer,
    auditService: overrides.auditService ?? fakeAuditService(),
    publishSingleSiteApprovedCandidateShadow: overrides.wrapper ?? (async (input: SingleSitePublishWrapperInput) => wrapperResult(input)),
  };
}

test("airship readiness package adapts into a governed dry-run input and records blockers without mutation", async () => {
  const wrapperInputs: SingleSitePublishWrapperInput[] = [];
  const auditService = fakeAuditService();
  const result = await runAirshipGovernedDryRun(
    {
      ...refs(),
      actorId: "superadmin-airship",
    },
    deps({
      auditService,
      wrapper: async (input) => {
        wrapperInputs.push(input);
        return wrapperResult(input);
      },
    }),
  );

  assert.equal(result.status, "created");
  assert.equal(result.refs.readinessPackageId, READINESS_ID);
  assert.equal(result.refs.reviewRecordId, REVIEW_ID);
  assert.equal(result.refs.candidateVersionId, CANDIDATE_VERSION_ID);
  assert.equal(result.result.ok, false);
  assert.deepEqual(result.result.blockerCodes, ["publish_activation_gate_missing", "publish_activation_request_missing"]);
  assert.equal(result.nextStep, "resolve listed blockers");
  assert.equal(result.mutationFlags.dryRunAttemptExecuted, true);
  assert.equal(result.mutationFlags.publishes, false);
  assert.equal(result.mutationFlags.shadowPublish, false);
  assert.equal(result.mutationFlags.activePointerChanged, false);
  assert.equal(wrapperInputs.length, 1);
  assert.equal(wrapperInputs[0]!.dryRun, true);
  assert.equal(wrapperInputs[0]!.mode, "shadow_publish");
  assert.equal(
    typeof wrapperInputs[0]!.expectedLaunchReadinessEvidenceRef === "object" && wrapperInputs[0]!.expectedLaunchReadinessEvidenceRef?.sourceRecordId,
    READINESS_ID,
  );
  assert.equal(wrapperInputs[0]!.expectedPublishActivationRequestRef, null);
  assert.deepEqual(auditService.events, ["action_requested", "dry_run_started", "dry_run_completed"]);
});

test("airship governed dry-run is idempotent for readiness package refs", async () => {
  const auditService = fakeAuditService();
  let wrapperCalls = 0;
  const dependencies = deps({
    auditService,
    wrapper: async (input) => {
      wrapperCalls += 1;
      return wrapperResult(input);
    },
  });
  const input = { ...refs(), actorId: "superadmin-airship" };
  const first = await runAirshipGovernedDryRun(input, dependencies);
  const second = await runAirshipGovernedDryRun(input, dependencies);

  assert.equal(first.status, "created");
  assert.equal(second.status, "reused");
  assert.equal(wrapperCalls, 1);
  assert.equal(second.mutationFlags.dryRunAttemptExecuted, false);
  assert.equal(second.result.idempotencyKey, airshipGovernedDryRunIdempotencyKey(refs()));
});

test("airship governed dry-run refuses missing, unapproved, stale, and mismatched readiness packages", async () => {
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs(), actorId: "superadmin-airship" }, deps({ readinessRecord: null })),
    /airship_governed_dry_run_readiness_package_missing/,
  );
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs(), actorId: "superadmin-airship" }, deps({ readinessRecord: readiness({ reviewStatus: "pending" as "approved" }) })),
    /airship_governed_dry_run_readiness_unapproved/,
  );
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs({ artifactId: "11111111-1111-4111-8111-111111111111" }), actorId: "superadmin-airship" }, deps()),
    /airship_governed_dry_run_artifact_mismatch/,
  );
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs(), actorId: "superadmin-airship" }, deps({ activePointer: { siteVersionId: "11111111-1111-4111-8111-111111111111", artifactId: LIVE_ARTIFACT_ID } })),
    /airship_governed_dry_run_active_pointer_stale/,
  );
});

test("airship governed dry-run guards invalid migration id and keeps imported-site fixture generic", async () => {
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs({ migrationId: "not-a-uuid" }), actorId: "superadmin-airship" }, deps()),
    /airship_governed_dry_run_migration_id_invalid/,
  );
  const result = await runAirshipGovernedDryRun(
    { ...refs(), actorId: "superadmin-airship" },
    deps({ readinessRecord: readiness({ siteClientSourceLabels: { ...readiness().siteClientSourceLabels, sourceUrl: "https://luna.example/", importedSiteLabel: "luna.example" } }) }),
  );
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes("chs.si"), false);
  assert.equal(serialized.includes("Maver"), false);
  assert.equal(result.mutationFlags.liveSiteMutated, false);
  assert.equal(result.mutationFlags.providerCall, false);
});

test("airship governed dry-run refuses live or production-stage candidates", async () => {
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs(), actorId: "superadmin-airship" }, deps({ version: candidateVersion("PUBLISHED") })),
    /airship_governed_dry_run_candidate_not_draft/,
  );
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs(), actorId: "superadmin-airship" }, deps({ artifactRecord: artifact("production") })),
    /airship_governed_dry_run_artifact_production_stage/,
  );
  await assert.rejects(
    () => runAirshipGovernedDryRun({ ...refs(), actorId: "superadmin-airship" }, deps({ activePointer: { siteVersionId: CANDIDATE_VERSION_ID, artifactId: ARTIFACT_ID } })),
    /airship_governed_dry_run_active_pointer_stale/,
  );
});
