import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublishShadowOpsInboxViewModelFromProjection,
  getPublishShadowOpsInboxViewModel,
  mapPublishShadowProjectionToOpsInboxWorkItems,
  type PublishShadowOpsInboxDerivedItemType,
} from "./aaf-publish-shadow-ops-inbox-view-model";
import type {
  PublishShadowRedactedField,
  PublishShadowRedactedLink,
  PublishShadowRedactedResultProjection,
} from "./aaf-publish-shadow-result-redaction";
import type {
  PublishShadowFreshnessState,
  PublishShadowResultReadModel,
  PublishShadowSeverity,
  PublishShadowStatus,
} from "./aaf-publish-shadow-result-read-model";

const SITE_ID = "site-safe-test";
const SITE_VERSION_ID = "version-safe-test";
const RAW_DDOM_REF = "gnr8:gnr8_ddom_readiness_snapshots:ddom-sensitive-test";
const RAW_IDEMPOTENCY_KEY = "idem-sensitive-test";

function full<T>(value: T): PublishShadowRedactedField<T> {
  return { visibility: "full", value };
}

function summarized<T>(summary: string, count?: number): PublishShadowRedactedField<T> {
  return { visibility: "summarized", summary, ...(count == null ? {} : { count }) };
}

function hidden<T>(): PublishShadowRedactedField<T> {
  return { visibility: "hidden", reason: "field_not_authorized" };
}

function fullLink(kind: PublishShadowRedactedLink["kind"], ref: string, label: string): PublishShadowRedactedLink {
  return { kind, visibility: "full", ref, label };
}

function redactedLink(kind: PublishShadowRedactedLink["kind"], label: string): PublishShadowRedactedLink {
  return { kind, visibility: "redacted", label, reason: "raw_identifier_redacted" };
}

function projection(
  status: PublishShadowStatus,
  overrides: Partial<PublishShadowRedactedResultProjection> = {},
): PublishShadowRedactedResultProjection {
  return {
    derivedOnly: true,
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    createsDdomSnapshot: false,
    createsApproval: false,
    mutatesSourceTruth: false,
    redactionVersion: "pasr-6-publish-shadow-result-redaction:v1",
    readModelVersion: "pasr-4-publish-shadow-result-read-model:v1",
    generatedAt: "2026-07-28T08:10:00.000Z",
    access: {
      allowed: true,
      role: "platform_superadmin",
      surface: "ops_inbox",
      denialReason: null,
      scopeMatch: {
        tenant: "matched",
        agency: "not_required",
        client: "matched",
        site: "matched",
        siteVersion: "matched",
      },
      visibilityProfile: {
        overall: "full",
        subjectRefs: "full",
        runtimeRefs: "full",
        ddom: "full",
        ddomRefs: "full",
        publishTarget: "full",
        approval: "full",
        approvalActors: "redacted",
        evidenceRefs: "full",
        sourceRefs: "full",
        auditRefs: "full",
        gateBlockers: "full",
        correlation: "redacted",
        idempotency: "hidden",
        failureReason: "redacted",
        internalDiagnostics: "redacted",
        nextAction: "full",
      },
    },
    visibility: "full",
    hiddenFields: [],
    redactedFields: [],
    status: {
      shadowStatus: full(status),
      severity: full<PublishShadowSeverity>("high"),
      readinessResult: full("not_ready"),
      operatorLabel: full(`Shadow readiness: ${status}. Publish was not blocked; result is derived only.`),
      projectionFreshness: full<PublishShadowFreshnessState>("fresh"),
    },
    summary: {
      operatorSummary: `Shadow readiness: ${status}. Publish was not blocked; result is derived only. Boundary: derived-only, shadow-only, non-enforcing, did not block publish.`,
      freshnessSummary: "Projection freshness is fresh; source truth has 5 available, 0 missing, and 0 stale categories.",
      missingSourceTruthCategories: [],
      staleSourceTruthCategories: [],
      boundaryLabels: [
        "derived_only",
        "shadow_only",
        "non_enforcing",
        "publish_not_blocked",
        "ddom_readiness_not_publish_activation_approval",
      ],
    },
    subject: {
      tenantId: full("tenant-safe-test"),
      clientId: full("client-safe-test"),
      siteId: full(SITE_ID),
      siteVersionId: full(SITE_VERSION_ID),
      runtimeArtifactId: full("artifact-safe-test"),
      publishAttemptRef: full("publish-attempt-safe-test"),
      intendedPublishTarget: full("production"),
      intendedPublishStage: full("production"),
      trustedPublishEnvironment: full("production"),
    },
    recommendedNextAction: {
      visibility: "full",
      actionKey: "review_gate_dry_run_failure",
      label: "Escalate gate dry-run issue.",
      ownerRole: "technical_operator",
      reason: full("Shadow exception requires source-owned follow-up."),
      safeNow: true,
      blocksCurrentPublish: false,
      blocksFutureEnforcementReadiness: true,
      requiredRefs: [fullLink("source", "source-safe-ref", "Required source ref")],
    },
    sourceTruth: {
      visibility: "full",
      summary: {
        missingCount: 0,
        staleCount: 0,
        availableCount: 5,
        missingCategories: [],
        staleCategories: [],
      },
      refs: [],
      watermarks: full({}),
    },
    ddomReadiness: {
      visibility: "full",
      status: full("present"),
      readinessState: full("blocked"),
      snapshot: fullLink("ddom_snapshot", RAW_DDOM_REF, "DDOM snapshot ref"),
      freshnessState: full("fresh"),
      capturedAt: full("2026-07-28T08:00:00.000Z"),
      freshUntil: full("2026-07-29T08:00:00.000Z"),
      staleReason: full(null),
      blockers: full([]),
      warnings: full([]),
      createsSnapshot: false,
    },
    publishTarget: {
      visibility: "full",
      status: full("present"),
      publishTargetId: full("publish-target-safe-test"),
      environment: full("production"),
      publishStage: full("production"),
      policyVersion: full("ptt-1"),
      sourceRef: fullLink("publish_target", "publish-target-ref-safe-test", "Publish target source ref"),
      sourceWatermark: full("publishTarget:wm"),
      limitations: full([]),
    },
    approval: {
      visibility: "full",
      launchSignoff: full("not_required"),
      publishActivation: full("present"),
      approvalRequest: fullLink("approval", "approval-request-safe-test", "Approval request ref"),
      approvalDecision: fullLink("approval", "approval-decision-safe-test", "Approval decision ref"),
      decisionStatus: full("granted"),
      scope: full("publish_activation"),
      expiresAt: full(null),
      actor: summarized("Approval actor details restricted."),
      createsApproval: false,
      limitations: full([]),
    },
    evidence: {
      visibility: "full",
      evidencePackage: fullLink("evidence", "evidence-safe-test", "Evidence package ref"),
      packageStatus: full("created"),
      packageType: full("publish_activation_evidence"),
      evidenceCreatedAt: full("2026-07-28T08:00:00.000Z"),
      freshnessLabel: full("fresh"),
      sourceWatermark: full("source:wm"),
      evidenceIdempotencyKey: hidden(),
      limitations: full([]),
    },
    evidenceRefs: [],
    gateDryRunStatus: {
      visibility: "full",
      dryRunOnly: true,
      actionKey: "publish.activation",
      scope: "publish_activation",
      subjectType: "site_version",
      subjectId: full(SITE_VERSION_ID),
      status: full("evaluated"),
      gateResult: full("blocked"),
      policyResult: full("approval_blocked"),
      approvalDecision: fullLink("approval", "gate-approval-safe-test", "Approval decision ref"),
      gateAttempt: fullLink("audit", "gate-attempt-safe-test", "Gate attempt ref"),
      auditEvent: fullLink("audit", "audit-event-safe-test", "Audit event ref"),
      gateDryRunIdempotencyKey: hidden(),
      blockedReasons: full(["domain_readiness_blocked"]),
      staleEvidenceReasons: full([]),
      missingSourceWatermarks: full([]),
      warnings: full(["dry_run_only_no_publish_execution"]),
    },
    correlation: {
      visibility: "redacted",
      correlationId: summarized("Correlation restricted."),
      causationId: hidden(),
      requestId: hidden(),
      idempotencyKey: hidden(),
      shadowEvaluationId: hidden(),
      evidenceIdempotencyKey: hidden(),
      gateDryRunIdempotencyKey: hidden(),
      publishAttemptRef: summarized("Publish attempt ref restricted."),
      linkageStrategy: summarized("Linkage strategy restricted."),
    },
    diagnostics: {
      visibility: "redacted",
      errorState: summarized("Error state summarized."),
      failureReason: summarized("Failure reason summarized."),
      warnings: full([]),
      limitations: full([]),
      projectionLimitations: summarized("Projection limitations summarized."),
    },
    ...overrides,
  };
}

const STATUS_CASES: Array<{
  status: PublishShadowStatus;
  type: PublishShadowOpsInboxDerivedItemType;
  patch?: Partial<PublishShadowRedactedResultProjection>;
}> = [
  {
    status: "shadow_missing_ddom_snapshot",
    type: "publish_shadow_missing_ddom_snapshot",
    patch: {
      ddomReadiness: {
        ...projection("shadow_missing_ddom_snapshot").ddomReadiness,
        status: full("missing"),
        snapshot: redactedLink("ddom_snapshot", "DDOM snapshot ref"),
      },
    },
  },
  {
    status: "shadow_stale_ddom_snapshot",
    type: "publish_shadow_stale_ddom_snapshot",
    patch: {
      ddomReadiness: {
        ...projection("shadow_stale_ddom_snapshot").ddomReadiness,
        status: full("stale"),
        freshnessState: full("stale"),
      },
    },
  },
  { status: "shadow_missing_publish_activation_approval", type: "publish_shadow_missing_publish_activation_approval" },
  { status: "shadow_missing_publish_target", type: "publish_shadow_missing_publish_target" },
  { status: "shadow_gate_not_ready", type: "publish_shadow_gate_not_ready" },
  { status: "shadow_evaluation_failed", type: "publish_shadow_evaluation_failed" },
  {
    status: "shadow_missing_source_truth",
    type: "publish_shadow_source_truth_missing",
    patch: {
      sourceTruth: {
        ...projection("shadow_missing_source_truth").sourceTruth,
        summary: {
          missingCount: 1,
          staleCount: 0,
          availableCount: 4,
          missingCategories: ["runtimeArtifact"],
          staleCategories: [],
        },
      },
    },
  },
  {
    status: "shadow_stale_source_truth",
    type: "publish_shadow_source_truth_stale",
    patch: {
      sourceTruth: {
        ...projection("shadow_stale_source_truth").sourceTruth,
        summary: {
          missingCount: 0,
          staleCount: 1,
          availableCount: 4,
          missingCategories: [],
          staleCategories: ["runtimeArtifact"],
        },
      },
    },
  },
];

for (const itemCase of STATUS_CASES) {
  test(`${itemCase.status} maps to a derived Ops Inbox item`, () => {
    const items = mapPublishShadowProjectionToOpsInboxWorkItems(projection(itemCase.status, itemCase.patch));

    assert.equal(items.length, 1);
    assert.equal(items[0]?.type, itemCase.type);
    assert.equal(items[0]?.shadowOnly, true);
    assert.equal(items[0]?.derivedOnly, true);
    assert.equal(items[0]?.nonEnforcing, true);
    assert.equal(items[0]?.nonBlocking, true);
    assert.equal(items[0]?.hasActionPayload, false);
    assert.deepEqual(items[0]?.actionButtons, []);
    assert.equal("actionPayload" in items[0]!, false);
    assert.equal(items[0]?.summary.includes("non-enforcing"), true);
    assert.equal(items[0]?.summary.includes("non-blocking"), true);
  });
}

test("ready and empty shadow statuses do not create exception items", () => {
  assert.deepEqual(mapPublishShadowProjectionToOpsInboxWorkItems(projection("shadow_ready")), []);
  assert.deepEqual(mapPublishShadowProjectionToOpsInboxWorkItems(projection("shadow_not_enabled")), []);
  assert.deepEqual(mapPublishShadowProjectionToOpsInboxWorkItems(projection("shadow_not_available")), []);
});

test("repository unavailable projection returns unavailable state and no items", () => {
  const model = buildPublishShadowOpsInboxViewModelFromProjection(projection("shadow_not_available", {
    diagnostics: {
      ...projection("shadow_not_available").diagnostics,
      limitations: full(["publish_shadow_read_repository_unavailable"]),
    },
  }));

  assert.equal(model.state, "unavailable");
  assert.deepEqual(model.items, []);
});

test("derived keys are deterministic and use redacted-safe fallback segments", () => {
  const redactedProjection = projection("shadow_missing_ddom_snapshot", {
    subject: {
      ...projection("shadow_missing_ddom_snapshot").subject,
      siteId: summarized("Site scope matched."),
      siteVersionId: summarized("Site version scope matched."),
    },
    ddomReadiness: {
      ...projection("shadow_missing_ddom_snapshot").ddomReadiness,
      snapshot: redactedLink("ddom_snapshot", "DDOM snapshot ref"),
    },
  });

  const [first] = mapPublishShadowProjectionToOpsInboxWorkItems(redactedProjection);
  const [second] = mapPublishShadowProjectionToOpsInboxWorkItems(redactedProjection);

  assert.equal(first?.key, second?.key);
  assert.equal(first?.key.includes("site-safe-test"), false);
  assert.equal(first?.key.includes("version-safe-test"), false);
  assert.equal(first?.key.includes("ddom-sensitive-test"), false);
});

test("forbidden client projection sees no publish shadow work items", () => {
  const forbiddenProjection = projection("shadow_missing_publish_activation_approval", {
    access: {
      ...projection("shadow_missing_publish_activation_approval").access,
      allowed: false,
      role: "client_reviewer",
      surface: "ops_inbox",
      denialReason: "client_reviewer_forbidden_mvp",
    },
    visibility: "forbidden",
  });

  const model = buildPublishShadowOpsInboxViewModelFromProjection(forbiddenProjection);

  assert.equal(model.state, "forbidden");
  assert.deepEqual(model.items, []);
});

test("redacted refs and idempotency keys are not leaked into items", () => {
  const redactedProjection = projection("shadow_missing_ddom_snapshot", {
    subject: {
      ...projection("shadow_missing_ddom_snapshot").subject,
      siteId: summarized("Site scope matched."),
      siteVersionId: summarized("Site version scope matched."),
    },
    ddomReadiness: {
      ...projection("shadow_missing_ddom_snapshot").ddomReadiness,
      snapshot: redactedLink("ddom_snapshot", "DDOM snapshot ref"),
    },
    correlation: {
      ...projection("shadow_missing_ddom_snapshot").correlation,
      idempotencyKey: hidden(),
    },
  });

  const [item] = mapPublishShadowProjectionToOpsInboxWorkItems(redactedProjection);
  const serialized = JSON.stringify(item);

  assert.equal(serialized.includes(RAW_DDOM_REF), false);
  assert.equal(serialized.includes(RAW_IDEMPOTENCY_KEY), false);
  assert.deepEqual(item?.refs.filter((ref) => ref.kind === "ddom_snapshot"), []);
  assert.equal(item?.refSummaries.includes("DDOM snapshot ref"), true);
});

test("view model preserves derived-only source-of-truth boundary", () => {
  const model = buildPublishShadowOpsInboxViewModelFromProjection(projection("shadow_gate_not_ready"));

  assert.equal(model.state, "visible");
  assert.equal(model.items.length, 1);
  assert.equal(model.items[0]?.sourceOfTruthLabel, "Derived from PASR-6 redacted publish shadow projection.");
  assert.equal(model.projection?.derivedOnly, true);
  assert.equal(model.projection?.publishActionBlocked, false);
  assert.equal(model.projection?.createsDdomSnapshot, false);
  assert.equal(model.projection?.createsApproval, false);
  assert.equal(model.projection?.mutatesSourceTruth, false);
});

test("adapter reads PASR-4 then applies PASR-6 redaction for the Ops Inbox surface", async () => {
  let readCalled = false;
  let redactionSurface: string | null | undefined = null;

  const model = await getPublishShadowOpsInboxViewModel(
    {
      actorId: "viewer-test",
      actorRole: "platform_superadmin",
      tenantId: "tenant-safe-test",
      clientId: "client-safe-test",
      siteId: SITE_ID,
      siteVersionId: SITE_VERSION_ID,
    },
    {
      readPublishShadowResult: async (input) => {
        readCalled = true;
        assert.equal(input.actorType, "internal_ops_inbox");
        assert.equal(input.siteId, SITE_ID);
        assert.equal(input.siteVersionId, SITE_VERSION_ID);
        return {} as PublishShadowResultReadModel;
      },
      redactPublishShadowResultForActor: (readModel, context) => {
        assert.equal(readModel != null, true);
        redactionSurface = context.surface;
        return projection("shadow_missing_publish_target");
      },
    },
  );

  assert.equal(readCalled, true);
  assert.equal(redactionSurface, "ops_inbox");
  assert.equal(model.items[0]?.type, "publish_shadow_missing_publish_target");
});
