import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { AafGateValidationInput, AafGateValidationResult } from "./aaf-policy-gate-facade";
import {
  AafPublishActivationGateAdapter,
  type PublishActivationGateDryRunInput,
} from "./aaf-publish-activation-gate-adapter";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "aaf-publish-activation-gate-adapter.ts");

class FakePublishActivationGateValidator {
  calls: AafGateValidationInput[] = [];
  nextResult?: Partial<AafGateValidationResult>;
  throwError: Error | null = null;

  async validateGate(input: AafGateValidationInput): Promise<AafGateValidationResult> {
    this.calls.push(input);
    if (this.throwError) throw this.throwError;
    const blockedReason = input.policyRules?.blockedReason ?? null;
    const scenario = input.evidencePackageId;
    const scenarioResult = this.resultForScenario(String(scenario ?? ""));
    const gateResult =
      this.nextResult?.gateResult ??
      scenarioResult?.gateResult ??
      (blockedReason ? "blocked" : !input.evidencePackageId ? "evidence_missing" : !input.approvalDecisionId ? "approval_required" : "allowed");
    const defaultBlockers =
      !blockedReason && !scenarioResult && !this.nextResult?.blockerCodes
        ? gateResult === "evidence_missing"
          ? ["evidence_missing"]
          : gateResult === "approval_required"
            ? ["approval_missing"]
            : []
        : [];
    const blockerCodes = [
      ...(blockedReason ? [blockedReason] : []),
      ...(scenarioResult?.blockerCodes ?? []),
      ...(this.nextResult?.blockerCodes ?? []),
      ...defaultBlockers,
    ];
    return {
      gateResult,
      policyEvaluation: {
        id: "policy-evaluation-test",
        result: blockedReason ? "approval_blocked" : "approval_required",
      },
      gateAttempt: { id: "gate-attempt-test", gate_result: gateResult },
      preActionAuditEvent: { id: "audit-event-test", event_family: input.auditEventFamily ?? null },
      blockerCodes,
      failClosedReason: this.nextResult?.failClosedReason ?? null,
    };
  }

  private resultForScenario(scenario: string): Pick<AafGateValidationResult, "gateResult" | "blockerCodes"> | null {
    if (scenario === "wrong-type") return { gateResult: "blocked", blockerCodes: ["evidence_type_mismatch"] };
    if (scenario === "stale") return { gateResult: "evidence_stale", blockerCodes: ["evidence_stale"] };
    if (scenario === "expired") return { gateResult: "evidence_stale", blockerCodes: ["evidence_expired"] };
    if (scenario === "freshness-failed") return { gateResult: "blocked", blockerCodes: ["freshness_failed"] };
    if (scenario === "superseded") return { gateResult: "evidence_stale", blockerCodes: ["evidence_superseded"] };
    if (scenario === "missing-source-refs") return { gateResult: "evidence_missing", blockerCodes: ["evidence_source_refs_missing"] };
    return null;
  }
}

function sourceRef(sourceTable: string, sourceRecordId: string, watermark: string) {
  return {
    sourceSystem: "synthetic_test_data",
    sourceTable,
    sourceRecordId,
    sourceRef: `${sourceTable}:${sourceRecordId}`,
    sourceVersion: "1",
    currentWatermark: watermark,
    evidenceWatermark: watermark,
  };
}

function baseInput(overrides: Partial<PublishActivationGateDryRunInput> = {}): PublishActivationGateDryRunInput {
  const siteId = "site-test";
  const siteVersionId = "site-version-test";
  const runtimeArtifactId = "artifact-test";
  const base: PublishActivationGateDryRunInput = {
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId,
    siteVersionId,
    runtimeArtifactId,
    currentActivePointer: { siteVersionId: "site-version-current", artifactId: "artifact-current" },
    intendedPublishTarget: "production",
    domainReadiness: { status: "ready", snapshotRef: "domain-readiness:test" },
    contentOverridePublishedState: { status: "published", snapshotRef: "content-override:test" },
    launchSignoffApproval: { approvalDecisionId: "launch-signoff-decision", requiredByPolicy: true },
    publishActivationApproval: {
      approvalDecisionId: "publish-activation-decision",
      approvalRequestId: "publish-activation-request",
      scope: "publish_activation",
    },
    evidencePackageId: "evidence-test",
    policyId: "policy-test",
    policyVersion: "policy-v1",
    actorType: "human",
    actorId: "operator-test",
    actorRole: "agency_admin",
    correlationId: "corr-test",
    idempotencyKey: "idem-test",
    sourceRefs: {
      siteVersion: sourceRef("gnr8_runtime_site_versions", siteVersionId, "synthetic_test_site_version_wm_1"),
      runtimeArtifact: sourceRef("gnr8_runtime_artifacts", runtimeArtifactId, "synthetic_test_runtime_artifact_wm_1"),
      activePointer: sourceRef("gnr8_runtime_active_pointers", siteId, "synthetic_test_active_pointer_wm_1"),
      publishTarget: sourceRef("gnr8_publish_targets", "production", "synthetic_test_publish_target_wm_1"),
      domainReadiness: sourceRef("gnr8_domain_readiness_snapshots", "domain-ready", "synthetic_test_domain_readiness_wm_1"),
      contentOverridePublishedState: sourceRef(
        "gnr8_content_overrides",
        siteVersionId,
        "synthetic_test_content_override_wm_1",
      ),
    },
  };
  return { ...base, ...overrides };
}

async function evaluate(input: PublishActivationGateDryRunInput, fake = new FakePublishActivationGateValidator()) {
  const adapter = new AafPublishActivationGateAdapter(fake);
  const result = await adapter.evaluatePublishActivationGateDryRun(input);
  return { result, fake };
}

test("publish activation adapter is server-only and import-isolated from runtime/provider mutation paths", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(
    source,
    /publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|publishDraftContentOverrides|rollbackContentOverride|activateDomainHostBindingsForSiteVersion|checkDomainStatus|openprovider|stripe|vercel|ai_execution/i,
  );
});

test("dry-run success uses exact publish activation scope, publish action key, publish audit family, and never hides dryRunOnly", async () => {
  const { result, fake } = await evaluate(baseInput());
  assert.equal(result.dryRunOnly, true);
  assert.equal(result.gateResult, "allowed");
  assert.equal(result.actionKey, "publish.activation");
  assert.equal(result.scope, "publish_activation");
  assert.equal(result.subjectType, "site_version");
  assert.equal(result.subjectId, "site-version-test");
  assert.equal(result.approvalDecisionId, "publish-activation-decision");
  assert.equal(result.evidencePackageId, "evidence-test");
  assert.equal(result.gateAttemptId, "gate-attempt-test");
  assert.equal(result.auditEventId, "audit-event-test");
  assert.equal(fake.calls[0]?.scope, "publish_activation");
  assert.equal(fake.calls[0]?.actionKey, "publish.activation");
  assert.equal(fake.calls[0]?.requiredEvidenceType, "publish_activation_evidence");
  assert.equal(fake.calls[0]?.auditEventFamily, "publish");
  assert.equal(fake.calls[0]?.sourceRefsRequired, true);
  assert.equal(fake.calls[0]?.auditRequired, true);
});

test("missing publish activation approval remains a dry-run approval_required result", async () => {
  const { result } = await evaluate(baseInput({ publishActivationApproval: null }));
  assert.equal(result.dryRunOnly, true);
  assert.equal(result.gateResult, "approval_required");
  assert.deepEqual(result.blockedReasons, ["approval_missing"]);
});

for (const scope of [
  "launch_signoff",
  "client_review",
  "domain_action",
  "domain_exception",
  "ai_advisory_plan_acceptance",
  "rollback",
] as const) {
  test(`${scope} approval does not satisfy publish_activation dry-run`, async () => {
    const { result, fake } = await evaluate(
      baseInput({
        publishActivationApproval: {
          approvalDecisionId: `${scope}-decision`,
          approvalRequestId: `${scope}-request`,
          scope,
        },
      }),
    );
    assert.equal(result.dryRunOnly, true);
    assert.equal(result.gateResult, "blocked");
    assert.equal(result.approvalDecisionId, null);
    assert.equal(fake.calls[0]?.approvalDecisionId, null);
    assert.ok(result.blockedReasons.includes(`approval_scope_not_publish_activation:${scope}`));
  });
}

test("missing evidence package, wrong evidence type, stale, expired, failed freshness, and superseded evidence are surfaced", async () => {
  for (const [evidencePackageId, expectedGate, expectedReason] of [
    [null, "evidence_missing", "evidence_missing"],
    ["wrong-type", "blocked", "evidence_type_mismatch"],
    ["stale", "evidence_stale", "evidence_stale"],
    ["expired", "evidence_stale", "evidence_expired"],
    ["freshness-failed", "blocked", "freshness_failed"],
    ["superseded", "evidence_stale", "evidence_superseded"],
  ] as const) {
    const { result } = await evaluate(baseInput({ evidencePackageId }));
    assert.equal(result.dryRunOnly, true);
    assert.equal(result.gateResult, expectedGate);
    assert.ok(result.blockedReasons.includes(expectedReason));
  }
});

test("missing evidence source refs stay blocked as missing evidence", async () => {
  const { result } = await evaluate(baseInput({ evidencePackageId: "missing-source-refs" }));
  assert.equal(result.gateResult, "evidence_missing");
  assert.ok(result.blockedReasons.includes("evidence_source_refs_missing"));
});

test("watermark mismatch and missing active/runtime/site watermarks fail closed in dry-run result terms", async () => {
  const mismatchInput = baseInput({
    sourceRefs: {
      ...baseInput().sourceRefs,
      runtimeArtifact: {
        ...baseInput().sourceRefs.runtimeArtifact,
        evidenceWatermark: "synthetic_test_runtime_artifact_wm_older",
      },
    },
  });
  const mismatch = await evaluate(mismatchInput);
  assert.equal(mismatch.result.gateResult, "blocked");
  assert.ok(mismatch.result.blockedReasons.includes("source_watermark_mismatch:runtimeArtifact.watermark"));
  assert.ok(mismatch.result.staleEvidenceReasons.includes("source_watermark_mismatch:runtimeArtifact.watermark"));

  for (const key of ["activePointer", "runtimeArtifact", "siteVersion"] as const) {
    const input = baseInput({
      sourceRefs: {
        ...baseInput().sourceRefs,
        [key]: { ...baseInput().sourceRefs[key], currentWatermark: null },
      },
    });
    const { result } = await evaluate(input);
    assert.equal(result.gateResult, "blocked");
    assert.ok(result.missingSourceWatermarks.includes(`${key}.currentWatermark`));
    assert.ok(result.blockedReasons.includes(`source_watermark_missing:${key}.currentWatermark`));
  }
});

test("missing source refs and blocked domain readiness block the dry-run before approval can satisfy it", async () => {
  const { result } = await evaluate(
    baseInput({
      domainReadiness: { status: "blocked", blockers: ["vercel_check_failed"] },
      sourceRefs: {
        ...baseInput().sourceRefs,
        publishTarget: { ...baseInput().sourceRefs.publishTarget, sourceRecordId: "" },
      },
    }),
  );
  assert.equal(result.gateResult, "blocked");
  assert.ok(result.blockedReasons.includes("source_watermark_missing:publishTarget.sourceRef"));
  assert.ok(result.blockedReasons.includes("domain_readiness_blocked"));
  assert.ok(result.blockedReasons.includes("domain_readiness:vercel_check_failed"));
});

test("audit unavailable, policy write fail-closed, and gate write failure stay non-executing dry-runs", async () => {
  const auditFake = new FakePublishActivationGateValidator();
  auditFake.nextResult = { gateResult: "audit_unavailable", blockerCodes: ["audit_unavailable"] };
  const auditUnavailable = await evaluate(baseInput(), auditFake);
  assert.equal(auditUnavailable.result.dryRunOnly, true);
  assert.equal(auditUnavailable.result.gateResult, "audit_unavailable");

  const policyFake = new FakePublishActivationGateValidator();
  policyFake.nextResult = { gateResult: "fail_closed", blockerCodes: ["policy_evaluation_unavailable"], failClosedReason: "policy_evaluation_unavailable" };
  const policyFailure = await evaluate(baseInput(), policyFake);
  assert.equal(policyFailure.result.gateResult, "fail_closed");
  assert.ok(policyFailure.result.blockedReasons.includes("policy_evaluation_unavailable"));

  const gateFake = new FakePublishActivationGateValidator();
  gateFake.throwError = new Error("synthetic gate write failure");
  const gateFailure = await evaluate(baseInput(), gateFake);
  assert.equal(gateFailure.result.gateResult, "fail_closed");
  assert.equal(gateFailure.result.policyResult, "not_persisted");
  assert.ok(gateFailure.result.blockedReasons.includes("aaf_gate_facade_unavailable"));
  assert.ok(gateFailure.result.warnings.some((warning) => warning.includes("synthetic gate write failure")));
});
