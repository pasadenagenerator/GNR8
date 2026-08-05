import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { PublishActivationMetadataHandoff } from "./publish-activation-metadata-handoff";
import { normalizePublishActivationMetadataHandoff } from "./publish-activation-metadata-handoff";
import {
  PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
  PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
  type PublishActivationMetadataResolverResult,
} from "./publish-activation-metadata-resolver";
import {
  buildSingleSitePublishContextWatermark,
  prepareSingleSitePublishContext,
  publishSingleSiteApprovedCandidateShadow,
  type SingleSitePublishWrapperInput,
  type SingleSitePublishWrapperPublishApprovedSiteVersion,
} from "./single-site-publish-wrapper-orchestrator";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "single-site-publish-wrapper-orchestrator.ts");
const TENANT_ID = "tenant-mvp52";
const CLIENT_ID = "client-mvp52";
const SITE_ID = "site-mvp52";
const MIGRATION_ID = "migration-mvp52";
const SITE_VERSION_ID = "site-version-mvp52";
const ARTIFACT_ID = "artifact-mvp52";
const PUBLISH_TARGET_ID = "production";
const REQUEST_ID = "request-mvp52";
const DECISION_ID = "decision-mvp52";
const GATE_ID = "gate-mvp52";
const EVIDENCE_ID = "evidence-mvp52";
const HANDOFF_WATERMARK = "single-site-publish-activation-handoff:mvp52";
const GATE_INPUT_WATERMARK = `single-site-publish-activation-gate-input:${"b".repeat(64)}`;

function ref(sourceTable: string, sourceRecordId: string) {
  return {
    role: sourceTable === "gnr8_publish_targets" ? "publish_target" : sourceTable === "gnr8_runtime_artifacts" ? "runtime_artifact" : "candidate_site_version",
    sourceSystem: "gnr8",
    sourceTable,
    sourceRecordId,
    sourceVersion: "v1",
    sourceWatermark: `wm:${sourceRecordId}`,
    sourceRef: `gnr8:${sourceTable}:${sourceRecordId}`,
  };
}

function input(overrides: Partial<SingleSitePublishWrapperInput> = {}): SingleSitePublishWrapperInput {
  return {
    mode: "shadow_publish",
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    candidateSiteVersionRef: ref("gnr8_runtime_site_versions", SITE_VERSION_ID),
    runtimeArtifactRef: ref("gnr8_runtime_artifacts", ARTIFACT_ID),
    publishStage: "production",
    publishEnvironment: "production",
    actor: { actorType: "human", actorId: "release-operator", actorRole: "release_operator" },
    correlationId: "corr-mvp52",
    idempotencyKey: "idem-mvp52",
    expectedPublishTargetRef: ref("gnr8_publish_targets", PUBLISH_TARGET_ID),
    expectedLaunchReadinessEvidenceRef: `aaf:evidence_package:${EVIDENCE_ID}`,
    expectedPublishActivationRequestRef: REQUEST_ID,
    expectedPublishActivationDecisionRef: DECISION_ID,
    expectedGateAttemptResultRef: GATE_ID,
    expectedHandoffWatermark: HANDOFF_WATERMARK,
    expectedGateInputWatermark: GATE_INPUT_WATERMARK,
    allowWarningsWithLimitations: true,
    maxGateAgeMs: 60 * 60 * 1000,
    evaluatedAt: "2026-08-05T12:00:00.000Z",
    ...overrides,
  };
}

function rawHandoff(overrides: Partial<PublishActivationMetadataHandoff> = {}): PublishActivationMetadataHandoff {
  return {
    sourceType: "single_site_publish_activation",
    tenantId: TENANT_ID,
    clientId: CLIENT_ID,
    siteId: SITE_ID,
    migrationId: MIGRATION_ID,
    candidateSiteVersionRef: ref("gnr8_runtime_site_versions", SITE_VERSION_ID),
    runtimeArtifactRef: ref("gnr8_runtime_artifacts", ARTIFACT_ID),
    publishTargetRef: ref("gnr8_publish_targets", PUBLISH_TARGET_ID),
    publishStage: "production",
    publishEnvironment: "production",
    publishActivationRequestRef: { id: REQUEST_ID, ref: `aaf:approval_request:${REQUEST_ID}`, status: "requested" },
    publishActivationDecisionRef: { id: DECISION_ID, ref: `aaf:approval_decision:${DECISION_ID}`, status: "granted" },
    gateAttemptResultRef: {
      gateAttemptId: GATE_ID,
      gateAttemptRef: `aaf:action_gate_attempt:${GATE_ID}`,
      gateResult: "allowed",
      evaluationStatus: "allowed",
      policyResult: "approval_required",
      approvalRequestId: REQUEST_ID,
      approvalDecisionId: DECISION_ID,
      evidencePackageId: EVIDENCE_ID,
      policyEvaluationId: "policy-mvp52",
      auditEventId: "audit-mvp52",
      scope: "publish_activation",
      action: "publish.activation",
      subjectType: "site_version",
      subjectId: SITE_VERSION_ID,
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      siteId: SITE_ID,
      migrationId: MIGRATION_ID,
      candidateSiteVersionRef: ref("gnr8_runtime_site_versions", SITE_VERSION_ID),
      runtimeArtifactRef: ref("gnr8_runtime_artifacts", ARTIFACT_ID),
      publishTargetRef: ref("gnr8_publish_targets", PUBLISH_TARGET_ID),
      publishStage: "production",
      publishEnvironment: "production",
      semanticHandoffWatermark: HANDOFF_WATERMARK,
      semanticGateInputWatermark: GATE_INPUT_WATERMARK,
      blockerCodes: [],
      warnings: ["limitations_carried_forward"],
      limitations: { readiness: [{ code: "dns_waiting", severity: "warning" }], decision: [], combined: [{ code: "dns_waiting", severity: "warning" }] },
      createdAt: "2026-08-05T11:55:00.000Z",
      completedAt: "2026-08-05T11:55:00.000Z",
      correlationId: "corr-gate-mvp52",
      idempotencyKey: "idem-gate-mvp52",
    },
    handoffWatermark: HANDOFF_WATERMARK,
    gateInputWatermark: GATE_INPUT_WATERMARK,
    limitations: { readiness: [{ code: "dns_waiting", severity: "warning" }], decision: [], combined: [{ code: "dns_waiting", severity: "warning" }] },
    actorRole: "release_operator",
    actorType: "human",
    correlationId: "corr-mvp52",
    idempotencyKey: "idem-mvp52",
    requestId: REQUEST_ID,
    policy: { maxGateAgeMs: 60 * 60 * 1000, allowWarningsWithLimitations: true, rereadAaf: true, rereadPublishTarget: true, detectConflictingNewerGate: true },
    ...overrides,
  };
}

function completeResolverResult(overrides: Partial<PublishActivationMetadataHandoff> = {}): PublishActivationMetadataResolverResult {
  const normalized = normalizePublishActivationMetadataHandoff(rawHandoff(overrides), {
    siteId: SITE_ID,
    siteVersionId: SITE_VERSION_ID,
    runtimeArtifactId: ARTIFACT_ID,
    publishStage: "production",
  });
  assert.ok(normalized.normalized);
  return {
    resolverVersion: PUBLISH_ACTIVATION_METADATA_RESOLVER_VERSION,
    publishActivationMetadataHandoff: normalized.normalized,
    diagnostics: {
      status: "complete",
      complete: true,
      blockerCodes: [],
      missingCodes: [],
      mismatchCodes: [],
      staleCodes: [],
      warningCodes: ["limitations_carried_forward"],
      transactionCapturedAt: "2026-08-05T12:00:00.000Z",
      safeIds: normalized.diagnostics.safeIds,
    },
    metadataWatermark: normalized.normalized.metadataWatermark,
    flags: PUBLISH_ACTIVATION_METADATA_RESOLVER_FLAGS,
  };
}

test("dry-run complete context returns metadata and does not call publish orchestrator", async () => {
  let resolverCalls = 0;
  let publishCalls = 0;
  const result = await publishSingleSiteApprovedCandidateShadow(
    input({ dryRun: true }),
    {
      metadataResolver: async () => {
        resolverCalls += 1;
        return completeResolverResult();
      },
      publishApprovedSiteVersion: (async () => {
        publishCalls += 1;
        throw new Error("publish should not be called");
      }) as SingleSitePublishWrapperPublishApprovedSiteVersion,
    },
  );

  assert.equal(result.status, "dry_run_ready");
  assert.equal(result.dryRun, true);
  assert.equal(result.publishes, false);
  assert.equal(result.runtimeMutation, false);
  assert.equal(resolverCalls, 1);
  assert.equal(publishCalls, 0);
  assert.equal(result.metadataHandoffCompleteness?.complete, true);
  assert.equal(result.publishOrchestratorInput?.siteVersionId, SITE_VERSION_ID);
  assert.equal(result.publishOrchestratorInput?.publishActivationShadowGateEnabled, false);
  assert.equal(result.publishOrchestratorInput?.publishActivationEnforcementShadowEnabled, true);
});

test("execute complete context calls publish orchestrator once with metadata handoff", async () => {
  const publishInputs: Parameters<SingleSitePublishWrapperPublishApprovedSiteVersion>[0][] = [];
  const publishResult = {
    siteId: SITE_ID,
    siteVersionId: SITE_VERSION_ID,
    artifactId: ARTIFACT_ID,
    publishStage: "production",
    pointerSwitch: "atomic_site_pointer_reassignment",
    previousActivePointer: null,
    activationOutcome: "ACTIVATED",
  } as Awaited<ReturnType<SingleSitePublishWrapperPublishApprovedSiteVersion>>;

  const result = await publishSingleSiteApprovedCandidateShadow(
    input(),
    {
      metadataResolver: async () => completeResolverResult(),
      publishApprovedSiteVersion: (async (publishInput) => {
        publishInputs.push(publishInput);
        return publishResult;
      }) as SingleSitePublishWrapperPublishApprovedSiteVersion,
    },
  );

  assert.equal(result.status, "published_via_existing_orchestrator");
  assert.equal(result.publishes, true);
  assert.equal(result.runtimeMutation, true);
  assert.equal(publishInputs.length, 1);
  assert.equal(publishInputs[0]!.siteVersionId, SITE_VERSION_ID);
  assert.equal(publishInputs[0]!.stage, "production");
  assert.equal(publishInputs[0]!.publishActivationMetadataHandoff?.gateAttemptResultRef?.gateAttemptId, GATE_ID);
  assert.equal(publishInputs[0]!.publishActivationShadowGateEnabled, false);
  assert.equal(publishInputs[0]!.publishActivationEnforcementShadowEnabled, true);
  assert.equal(result.publishOrchestratorResult, publishResult);
});

test("missing required identity blocks before resolver", async () => {
  let resolverCalls = 0;
  const result = await publishSingleSiteApprovedCandidateShadow(
    input({ tenantId: " ", dryRun: true }),
    {
      metadataResolver: async () => {
        resolverCalls += 1;
        return completeResolverResult();
      },
    },
  );

  assert.equal(result.status, "preflight_blocked");
  assert.equal(resolverCalls, 0);
  assert.ok(result.blockerCodes.includes("single_site_publish_wrapper_tenant_id_missing"));
});

test("resolver incomplete blocks before publish orchestrator", async () => {
  let publishCalls = 0;
  const result = await publishSingleSiteApprovedCandidateShadow(
    input(),
    {
      metadataResolver: async () => ({
        ...completeResolverResult(),
        publishActivationMetadataHandoff: null,
        diagnostics: {
          ...completeResolverResult().diagnostics,
          status: "incomplete",
          complete: false,
          missingCodes: ["publish_activation_decision_missing"],
        },
      }),
      publishApprovedSiteVersion: (async () => {
        publishCalls += 1;
        throw new Error("publish should not be called");
      }) as SingleSitePublishWrapperPublishApprovedSiteVersion,
    },
  );

  assert.equal(result.status, "preflight_blocked");
  assert.equal(publishCalls, 0);
  assert.ok(result.blockerCodes.includes("publish_activation_decision_missing"));
});

test("resolver error blocks before publish orchestrator", async () => {
  let publishCalls = 0;
  const result = await publishSingleSiteApprovedCandidateShadow(
    input(),
    {
      metadataResolver: async () => {
        throw new Error("database unavailable");
      },
      publishApprovedSiteVersion: (async () => {
        publishCalls += 1;
        throw new Error("publish should not be called");
      }) as SingleSitePublishWrapperPublishApprovedSiteVersion,
    },
  );

  assert.equal(result.status, "resolver_unavailable");
  assert.equal(publishCalls, 0);
  assert.ok(result.blockerCodes.includes("single_site_publish_wrapper_resolver_error"));
  assert.ok(result.warnings.includes("database unavailable"));
});

test("explicit expected ref mismatch blocks before publish orchestrator", async () => {
  let publishCalls = 0;
  const result = await publishSingleSiteApprovedCandidateShadow(
    input({ expectedPublishTargetRef: ref("gnr8_publish_targets", "staging") }),
    {
      metadataResolver: async () => completeResolverResult(),
      publishApprovedSiteVersion: (async () => {
        publishCalls += 1;
        throw new Error("publish should not be called");
      }) as SingleSitePublishWrapperPublishApprovedSiteVersion,
    },
  );

  assert.equal(result.status, "preflight_blocked");
  assert.equal(publishCalls, 0);
  assert.ok(result.blockerCodes.includes("single_site_publish_wrapper_publish_target_ref_mismatch"));
});

test("default-off mode blocks before resolver or publish", async () => {
  let resolverCalls = 0;
  const result = await publishSingleSiteApprovedCandidateShadow(
    input({ mode: null, enabled: false }),
    {
      metadataResolver: async () => {
        resolverCalls += 1;
        return completeResolverResult();
      },
    },
  );

  assert.equal(result.status, "preflight_blocked");
  assert.equal(resolverCalls, 0);
  assert.ok(result.blockerCodes.includes("single_site_publish_wrapper_explicit_mode_required"));
});

test("warnings and limitations policy carries into resolver and metadata", async () => {
  let resolverAllowWarnings: boolean | undefined;
  const prepared = await prepareSingleSitePublishContext(
    input({ allowWarningsWithLimitations: true }),
    {
      metadataResolver: async (resolverInput) => {
        resolverAllowWarnings = resolverInput.allowWarningsWithLimitations;
        return completeResolverResult();
      },
    },
  );

  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;
  assert.equal(resolverAllowWarnings, true);
  assert.equal(prepared.context.publishActivationMetadataHandoff.policy?.allowWarningsWithLimitations, true);
  assert.ok(prepared.context.limitations && !Array.isArray(prepared.context.limitations));
  const limitations = prepared.context.limitations as { combined: unknown[] };
  assert.equal((limitations.combined[0] as { code?: string } | undefined)?.code, "dns_waiting");
  assert.ok(prepared.context.warnings.includes("limitations_carried_forward"));
});

test("deterministic publish context watermark is stable and input-sensitive", () => {
  const first = buildSingleSitePublishContextWatermark({ siteId: SITE_ID, version: SITE_VERSION_ID });
  const second = buildSingleSitePublishContextWatermark({ version: SITE_VERSION_ID, siteId: SITE_ID });
  const third = buildSingleSitePublishContextWatermark({ siteId: SITE_ID, version: "other" });
  assert.equal(first, second);
  assert.notEqual(first, third);
  assert.match(first, /^single-site-publish-wrapper-context:[0-9a-f]{64}$/);
});

test("wrapper source does not call gate evaluator, create AAF records, PASR, DDOM, providers, or generic callers", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");
  assert.doesNotMatch(source, /publish-activation-gate-evaluator|evaluatePublishActivationGate|createActionGateAttempt|createGateAttemptTransaction/i);
  assert.doesNotMatch(source, /AafWriterRepository|createApprovalRequest|createApprovalDecision|recordPublishActivationDecision|preparePublishActivationRequest/i);
  assert.doesNotMatch(source, /aaf-publish-activation-shadow-observer|observePublishActivationShadowGate|readPasr|pasrSource|pasrObserver/i);
  assert.doesNotMatch(source, /ddom-readiness|createDdomReadinessSnapshot|manualSnapshot|ddom-readiness-snapshot/i);
  assert.doesNotMatch(source, /vercel|openprovider|registrar|dns-provider|checkDomainStatus|activateDomain|new Stripe|stripe\.|ai_execution/i);
  assert.doesNotMatch(source, /switchActivePointer|createArtifact\s*\(|bindArtifactToVersion\s*\(|refreshArtifactForVersionPublishCandidate|transitionSiteVersionState|archivePublishedVersionsExcept/i);
  assert.doesNotMatch(source, /app\/api\/gnr8\/runtime\/versions|imported-runtime-reconciliation|reconcileDomainVerificationOnPublish/i);
});
