import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { PublishActivationGateDryRunInput, PublishActivationGateDryRunResult } from "./aaf-publish-activation-gate-adapter";
import type {
  BuildPublishActivationEvidencePackageInput,
  PublishActivationCanonicalSourceSnapshot,
  PublishActivationEvidenceBuilderResult,
  PublishActivationEvidenceSourceReader,
  PublishActivationSourceReaderResult,
} from "./aaf-publish-activation-evidence-builder";
import {
  AafPublishActivationShadowObserver,
  isPublishActivationShadowGateEnabled,
  type PublishActivationShadowObserverDependencies,
  type PublishActivationShadowObserverInput,
} from "./aaf-publish-activation-shadow-observer";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATH = path.join(TEST_DIR, "aaf-publish-activation-shadow-observer.ts");
const ORCHESTRATOR_PATH = path.join(TEST_DIR, "../runtime/publish-activation-orchestrator.ts");

function source(
  sourceTable: string,
  sourceRecordId: string,
  canonicalFields: Record<string, unknown>,
  overrides: Partial<PublishActivationCanonicalSourceSnapshot> = {},
): PublishActivationCanonicalSourceSnapshot {
  return {
    sourceSystem: "gnr8",
    sourceTable,
    sourceRecordId,
    sourceRef: `gnr8:${sourceTable}:${sourceRecordId}`,
    sourceVersion: String(canonicalFields.version ?? canonicalFields.updatedAt ?? "1"),
    canonicalFields,
    canonicalWatermark: `${sourceTable}:${sourceRecordId}:wm`,
    canonicalWatermarkField: "synthetic_test_watermark",
    freshness: "fresh",
    limitations: [],
    ...overrides,
  };
}

function completeSources(overrides: Partial<PublishActivationSourceReaderResult> = {}): PublishActivationSourceReaderResult {
  return {
    siteVersion: source("gnr8_runtime_site_versions", "site-version-test", {
      id: "site-version-test",
      siteId: "site-test",
      state: "APPROVED",
      artifactId: "artifact-test",
    }),
    runtimeArtifact: source("gnr8_runtime_artifacts", "artifact-test", {
      id: "artifact-test",
      siteId: "site-test",
      siteVersionId: "site-version-test",
      bundleSha256: "bundle-test",
      publishStage: "production",
    }),
    activePointer: {
      ...source("gnr8_runtime_active_pointers", "site-test", {
        siteId: "site-test",
        activeSiteVersionId: "site-version-current",
        activeArtifactId: "artifact-current",
      }),
      activeSiteVersionId: "site-version-current",
      activeArtifactId: "artifact-current",
    },
    publishTarget: source("gnr8_publish_targets", "production", {
      id: "production",
      status: "active",
      policyVersion: "ptt-1",
    }),
    domainReadiness: {
      ...source("gnr8_ddom_readiness_snapshots", "ddom-ready-test", {
        readinessState: "ready",
        sourceWatermark: "ddom-ready-wm",
      }),
      readinessStatus: "ready",
      snapshotRef: "gnr8:gnr8_ddom_readiness_snapshots:ddom-ready-test",
      blockers: [],
      warnings: [],
    },
    contentOverridePublishedState: {
      ...source("gnr8_content_overrides", "site-version:site-version-test:published", {
        status: "not_applicable",
      }),
      status: "not_applicable",
    },
    launchSignoff: null,
    publishActivationApproval: {
      ...source("gnr8_aaf_approval_decisions", "publish-decision-test", {
        scope: "publish_activation",
        approvalDecisionId: "publish-decision-test",
      }),
      approvalRequestId: "publish-request-test",
      approvalDecisionId: "publish-decision-test",
      scope: "publish_activation",
      requiredByPolicy: true,
    },
    warnings: [],
    limitations: [],
    ...overrides,
  };
}

function sourceReader(result: PublishActivationSourceReaderResult, calls: PublishActivationShadowObserverInput[] = []): PublishActivationEvidenceSourceReader {
  return {
    async readPublishActivationSources(input) {
      calls.push(input);
      return result;
    },
  };
}

function sourceRef(snapshot: PublishActivationCanonicalSourceSnapshot) {
  const watermark = snapshot.canonicalWatermark ?? `${snapshot.sourceTable}:${snapshot.sourceRecordId}:wm`;
  return {
    sourceSystem: snapshot.sourceSystem ?? "gnr8",
    sourceTable: snapshot.sourceTable,
    sourceRecordId: snapshot.sourceRecordId,
    sourceRef: snapshot.sourceRef ?? null,
    sourceVersion: snapshot.sourceVersion ?? null,
    currentWatermark: watermark,
    evidenceWatermark: watermark,
  };
}

function missingRef(key: string, sourceRecordId: string) {
  return {
    sourceSystem: "gnr8",
    sourceTable: `missing_source_truth:${key}`,
    sourceRecordId,
    sourceRef: null,
    sourceVersion: null,
    currentWatermark: null,
    evidenceWatermark: null,
  };
}

async function fakeBuild(input: BuildPublishActivationEvidencePackageInput): Promise<PublishActivationEvidenceBuilderResult> {
  const sources = await input.sourceReader.readPublishActivationSources(input);
  const missingSourceTruth = [
    ...(!sources.siteVersion ? ["siteVersion"] : []),
    ...(!sources.runtimeArtifact ? ["runtimeArtifact"] : []),
    ...(!sources.activePointer ? ["activePointer"] : []),
    ...(!sources.publishTarget ? ["publishTarget"] : []),
    ...(!sources.domainReadiness ? ["domainReadiness"] : []),
  ];
  const sourceRefs = {
    siteVersion: sources.siteVersion ? sourceRef(sources.siteVersion) : missingRef("siteVersion", "missing_site_version"),
    runtimeArtifact: sources.runtimeArtifact ? sourceRef(sources.runtimeArtifact) : missingRef("runtimeArtifact", "missing_runtime_artifact"),
    activePointer: sources.activePointer ? sourceRef(sources.activePointer) : missingRef("activePointer", "missing_active_pointer"),
    publishTarget: sources.publishTarget ? sourceRef(sources.publishTarget) : missingRef("publishTarget", "missing_publish_target"),
    domainReadiness: sources.domainReadiness ? sourceRef(sources.domainReadiness) : missingRef("domainReadiness", "missing_domain_readiness"),
    contentOverridePublishedState: sources.contentOverridePublishedState ? sourceRef(sources.contentOverridePublishedState) : null,
  };
  const dryRunInput: PublishActivationGateDryRunInput = {
    tenantId: input.tenantId,
    clientId: input.clientId ?? null,
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    runtimeArtifactId: input.runtimeArtifactId ?? "artifact-test",
    currentActivePointer: {
      siteVersionId: sources.activePointer?.activeSiteVersionId ?? null,
      artifactId: sources.activePointer?.activeArtifactId ?? null,
    },
    intendedPublishTarget: input.intendedPublishTarget,
    domainReadiness: {
      status: sources.domainReadiness?.stale ? "blocked" : (sources.domainReadiness?.readinessStatus ?? "blocked"),
      snapshotRef: sources.domainReadiness?.snapshotRef ?? null,
      blockers: sources.domainReadiness?.blockers ?? [],
    },
    contentOverridePublishedState: { status: "not_applicable" },
    launchSignoffApproval: { requiredByPolicy: input.launchSignoffRequiredByPolicy === true },
    publishActivationApproval: sources.publishActivationApproval
      ? {
          approvalRequestId: sources.publishActivationApproval.approvalRequestId,
          approvalDecisionId: sources.publishActivationApproval.approvalDecisionId,
          scope: sources.publishActivationApproval.scope,
        }
      : null,
    evidencePackageId: "evidence-test",
    policyVersion: input.policyVersion,
    actorType: input.actorType,
    actorId: input.actorId,
    actorRole: input.actorRole,
    correlationId: input.correlationId,
    idempotencyKey: `${input.idempotencyKey}:dry-run`,
    sourceRefs,
  };
  return {
    dryRunInput,
    evidencePackageId: "evidence-test",
    sourceRefs,
    sourceWatermarks: {
      siteVersion: sourceRefs.siteVersion.currentWatermark,
      runtimeArtifact: sourceRefs.runtimeArtifact.currentWatermark,
      activePointer: sourceRefs.activePointer.currentWatermark,
      publishTarget: sourceRefs.publishTarget.currentWatermark,
      domainReadiness: sourceRefs.domainReadiness.currentWatermark,
      contentOverridePublishedState: sourceRefs.contentOverridePublishedState?.currentWatermark ?? null,
      launchSignoff: null,
      publishActivationApproval: sources.publishActivationApproval ? sourceRef(sources.publishActivationApproval).currentWatermark : null,
    },
    watermarkMetadata: {
      siteVersion: null,
      runtimeArtifact: null,
      activePointer: null,
      publishTarget: null,
      domainReadiness: null,
      contentOverridePublishedState: null,
      launchSignoff: null,
      publishActivationApproval: null,
    },
    missingSourceTruth,
    freshnessStatus: {
      siteVersion: sources.siteVersion?.freshness ?? "failed",
      runtimeArtifact: sources.runtimeArtifact?.freshness ?? "failed",
      activePointer: sources.activePointer?.freshness ?? "failed",
      publishTarget: sources.publishTarget?.freshness ?? "failed",
      domainReadiness: sources.domainReadiness?.freshness ?? "failed",
      contentOverridePublishedState: "fresh",
      launchSignoff: "fresh",
      publishActivationApproval: sources.publishActivationApproval?.freshness ?? "fresh",
    },
    limitations: [...(sources.limitations ?? []), ...missingSourceTruth.map((key) => `missing_source_truth:${key}`)],
    warnings: [...(sources.warnings ?? [])],
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
  };
}

function gateResult(overrides: Partial<PublishActivationGateDryRunResult> = {}): PublishActivationGateDryRunResult {
  return {
    dryRunOnly: true,
    actionKey: "publish.activation",
    scope: "publish_activation",
    subjectType: "site_version",
    subjectId: "site-version-test",
    gateResult: "allowed",
    policyResult: "approval_required",
    approvalDecisionId: "publish-decision-test",
    evidencePackageId: "evidence-test",
    gateAttemptId: "gate-attempt-test",
    auditEventId: "audit-event-test",
    sourceWatermarks: {
      siteVersion: null,
      runtimeArtifact: null,
      activePointer: null,
      publishTarget: null,
      domainReadiness: null,
      contentOverridePublishedState: null,
    },
    missingSourceWatermarks: [],
    staleEvidenceReasons: [],
    blockedReasons: [],
    warnings: ["dry_run_only_no_publish_execution"],
    correlationId: "corr-test",
    idempotencyKey: "idem-test",
    ...overrides,
  };
}

function deps(
  sources: PublishActivationSourceReaderResult,
  gate: PublishActivationGateDryRunResult = gateResult(),
): PublishActivationShadowObserverDependencies {
  return {
    sourceReader: sourceReader(sources),
    buildEvidencePackage: fakeBuild,
    gateAdapter: {
      async evaluatePublishActivationGateDryRun() {
        return gate;
      },
    },
  };
}

function input(overrides: Partial<PublishActivationShadowObserverInput> = {}): PublishActivationShadowObserverInput {
  return {
    tenantId: "tenant-test",
    clientId: "client-test",
    siteId: "site-test",
    siteVersionId: "site-version-test",
    runtimeArtifactId: "artifact-test",
    intendedPublishTarget: "production",
    trustedPublishEnvironment: "production",
    intendedPublishStage: "production",
    actorType: "human",
    actorId: "operator-test",
    actorRole: "agency_admin",
    correlationId: "corr-test",
    idempotencyKey: "idem-test",
    policyVersion: "PASR-2-shadow",
    ...overrides,
  };
}

test("shadow observer is server-only and import-isolated from DDOM triggers and provider mutation paths", () => {
  const sourceText = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(sourceText, /^import "server-only";/);
  assert.doesNotMatch(
    sourceText,
    /ddom-readiness-manual-snapshot-caller|ddom-readiness-manual-snapshot-trigger|publishApprovedSiteVersion|executeMigrationPublishActivation|switchActivePointer|rollbackToSiteVersionArtifact|publishDraftContentOverrides|rollbackContentOverride|activateDomainHostBindingsForSiteVersion|checkDomainStatus|openprovider|stripe|vercel|ai_execution/i,
  );
});

test("shadow adapter success with complete source truth remains non-enforcing", async () => {
  const result = await new AafPublishActivationShadowObserver(deps(completeSources())).observe(input());
  assert.equal(result.shadowOnly, true);
  assert.equal(result.enforcementApplied, false);
  assert.equal(result.publishActionBlocked, false);
  assert.equal(result.sourceReadStatus.status, "completed");
  assert.equal(result.evidenceBuildStatus.status, "built");
  assert.equal(result.gateDryRunStatus.status, "evaluated");
  assert.equal(result.readinessResult, "ready");
  assert.deepEqual(result.missingSourceTruth, []);
  assert.equal(result.ddomReadinessSnapshotStatus.status, "present");
  assert.equal(result.approvalStatusSummary.publishActivation, "present");
  assert.equal(result.publishTargetStatusSummary.status, "present");
});

test("missing DDOM snapshot is reported as non-blocking shadow limitation", async () => {
  const sources = completeSources({ domainReadiness: null, limitations: ["missing_ddom_snapshot"] });
  const result = await new AafPublishActivationShadowObserver(deps(sources, gateResult({ gateResult: "blocked", blockedReasons: ["domain_readiness_blocked"] }))).observe(input());
  assert.equal(result.publishActionBlocked, false);
  assert.equal(result.readinessResult, "not_ready");
  assert.ok(result.missingSourceTruth.includes("domainReadiness"));
  assert.equal(result.ddomReadinessSnapshotStatus.status, "missing");
  assert.ok(result.ddomReadinessSnapshotStatus.warnings.includes("run_manual_ddom_readiness_snapshot_trigger"));
});

test("stale DDOM snapshot is reported as non-blocking shadow limitation", async () => {
  const sources = completeSources({
    domainReadiness: {
      ...completeSources().domainReadiness!,
      freshness: "stale",
      stale: true,
      staleReason: "ttl_expired",
      blockers: ["domain_readiness_stale"],
      limitations: ["stale_ddom_snapshot"],
    },
    limitations: ["stale_ddom_snapshot"],
  });
  const result = await new AafPublishActivationShadowObserver(
    deps(sources, gateResult({ gateResult: "evidence_stale", staleEvidenceReasons: ["domainReadiness"], blockedReasons: ["domain_readiness_stale"] })),
  ).observe(input());
  assert.equal(result.publishActionBlocked, false);
  assert.equal(result.readinessResult, "not_ready");
  assert.equal(result.ddomReadinessSnapshotStatus.status, "stale");
  assert.ok(result.staleSourceTruth.includes("domainReadiness"));
});

test("missing publish activation approval is a non-blocking shadow gate result", async () => {
  const sources = completeSources({ publishActivationApproval: null });
  const result = await new AafPublishActivationShadowObserver(deps(sources, gateResult({ gateResult: "approval_required", approvalDecisionId: null, blockedReasons: ["approval_missing"] }))).observe(input());
  assert.equal(result.publishActionBlocked, false);
  assert.equal(result.readinessResult, "not_ready");
  assert.equal(result.approvalStatusSummary.publishActivation, "missing");
  assert.ok(result.gateDryRunStatus.blockedReasons.includes("approval_missing"));
});

test("missing publish target is a non-blocking shadow limitation", async () => {
  const sources = completeSources({ publishTarget: null, limitations: ["missing_publish_target"] });
  const result = await new AafPublishActivationShadowObserver(deps(sources, gateResult({ gateResult: "blocked", blockedReasons: ["publish_target_missing"] }))).observe(input());
  assert.equal(result.publishActionBlocked, false);
  assert.ok(result.missingSourceTruth.includes("publishTarget"));
  assert.equal(result.publishTargetStatusSummary.status, "missing");
});

test("source reader failure returns shadow unavailable and does not attempt build or gate", async () => {
  let buildCalls = 0;
  let gateCalls = 0;
  const observer = new AafPublishActivationShadowObserver({
    sourceReader: {
      async readPublishActivationSources() {
        throw new Error("synthetic source read failure");
      },
    },
    async buildEvidencePackage() {
      buildCalls += 1;
      return fakeBuild(input() as BuildPublishActivationEvidencePackageInput);
    },
    gateAdapter: {
      async evaluatePublishActivationGateDryRun() {
        gateCalls += 1;
        return gateResult();
      },
    },
  });
  const result = await observer.observe(input());
  assert.equal(result.readinessResult, "unavailable");
  assert.equal(result.sourceReadStatus.status, "unavailable");
  assert.equal(result.evidenceBuildStatus.status, "not_attempted");
  assert.equal(result.gateDryRunStatus.status, "not_attempted");
  assert.equal(buildCalls, 0);
  assert.equal(gateCalls, 0);
});

test("evidence builder failure and gate dry-run failure remain shadow unavailable", async () => {
  const evidenceFailure = await new AafPublishActivationShadowObserver({
    sourceReader: sourceReader(completeSources()),
    async buildEvidencePackage() {
      throw new Error("synthetic evidence failure");
    },
  }).observe(input());
  assert.equal(evidenceFailure.readinessResult, "unavailable");
  assert.equal(evidenceFailure.evidenceBuildStatus.status, "unavailable");
  assert.equal(evidenceFailure.gateDryRunStatus.status, "not_attempted");

  const gateFailure = await new AafPublishActivationShadowObserver({
    sourceReader: sourceReader(completeSources()),
    buildEvidencePackage: fakeBuild,
    gateAdapter: {
      async evaluatePublishActivationGateDryRun() {
        throw new Error("synthetic gate failure");
      },
    },
  }).observe(input());
  assert.equal(gateFailure.readinessResult, "unavailable");
  assert.equal(gateFailure.evidenceBuildStatus.status, "built");
  assert.equal(gateFailure.gateDryRunStatus.status, "unavailable");
});

test("feature flag parser is explicit and absent flag is disabled", () => {
  assert.equal(isPublishActivationShadowGateEnabled(undefined), false);
  assert.equal(isPublishActivationShadowGateEnabled(""), false);
  assert.equal(isPublishActivationShadowGateEnabled("enabled"), true);
  assert.equal(isPublishActivationShadowGateEnabled("true"), true);
  assert.equal(isPublishActivationShadowGateEnabled("0"), false);
});

test("orchestrator keeps provider and DDOM trigger imports out of the shadow hook", () => {
  const sourceText = fs.readFileSync(ORCHESTRATOR_PATH, "utf8");
  assert.doesNotMatch(sourceText, /ddom-readiness-manual-snapshot-caller|ddom-readiness-manual-snapshot-trigger/i);
});
