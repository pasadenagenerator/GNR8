import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { SingleSitePublishOperatorReadonlyProjection } from "@/gnr8/single-site/single-site-publish-operator-readonly-projection";

import {
  SingleSitePublishOperatorPanel,
  filterSingleSitePublishOperatorDrilldownRows,
  filterSingleSitePublishOperatorTimelineRows,
} from "./_components/SingleSitePublishOperatorPanel";

const { renderToStaticMarkup } = ReactDomServer;

const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const PANEL_FILE = new URL("./_components/SingleSitePublishOperatorPanel.tsx", import.meta.url);
const LAYOUT_FILE = new URL("../layout.tsx", import.meta.url);
const GENERIC_PUBLISH_ROUTE = new URL("../../../api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts", import.meta.url);
const CLIENT_CONTENT_PUBLISH_ROUTE = new URL("../../../api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts", import.meta.url);
const OPS_INBOX_PAGE = new URL("../ops-inbox/page.tsx", import.meta.url);
const SOURCE_BOUNDARY = { ownership: "source-owned read" as const, truthRole: "source-owned read" as const, enforcing: false as const, mutating: false as const };
const DERIVED_BOUNDARY = { ownership: "derived-only" as const, truthRole: "derived-only" as const, enforcing: false as const, mutating: false as const };

function model(overrides: Partial<SingleSitePublishOperatorReadonlyProjection> = {}): SingleSitePublishOperatorReadonlyProjection {
  const attempt = {
    actionId: "00000000-0000-4000-8000-000000000101",
    mode: "dry_run" as const,
    status: "dry_run_completed" as const,
    routeActionSource: "api/gnr8/admin/single-site-publish/dry-run",
    startedAt: "2026-08-10T09:00:00.000Z",
    completedAt: "2026-08-10T09:00:01.000Z",
    updatedAt: "2026-08-10T09:00:01.000Z",
    actor: { actorType: "human", actorRole: "platform_superadmin", actorId: "superadmin-panel" },
    correlationId: "corr-panel",
    idempotencyKey: "idem-panel",
    candidateSiteVersionRef: `gnr8:gnr8_runtime_site_versions:${"candidate-version-ref-".repeat(8)}`,
    runtimeArtifactRef: `gnr8:gnr8_runtime_artifacts:${"runtime-artifact-ref-".repeat(8)}`,
    publishTargetRef: "gnr8:gnr8_publish_targets:production",
    publishStage: "production",
    publishEnvironment: "production",
    launchReadinessEvidenceRef: "aaf:evidence_package:evidence-panel",
    publishActivationRequestRef: "request-panel",
    publishActivationDecisionRef: "decision-panel",
    gateAttemptResultRef: "gate-panel",
    handoffWatermark: "handoff-watermark-panel",
    gateInputWatermark: `single-site-publish-activation-gate-input:${"b".repeat(64)}`,
    resultStatus: "dry_run_ready",
    resolverStatus: "complete",
    wrapperStatus: "dry_run_ready",
    publishOrchestratorStatus: "not_called",
    blockerCodes: [],
    warningCodes: [],
    limitationCodes: ["read_only_panel"],
    redactedDiagnosticSummary: {
      available: true,
      status: "ok",
      reasonCodes: ["dry_run_ready"],
      omittedUnsafeDiagnostics: false,
    },
    persistedMutationFlags: {
      publishes: false,
      runtimeMutation: false,
      blockingEnforcementApplied: false,
      enforcementApplied: false,
      publishMayHaveExecuted: null,
    },
    refs: [],
  };

  return {
    panelVersion: "mvp-61-single-site-publish-operator-readonly-runbook:v1",
    generatedAt: "2026-08-10T09:01:00.000Z",
    lookup: {
      migrationId: "migration-panel",
      siteId: null,
      candidateSiteVersionRef: null,
    },
    state: "visible",
    identity: {
      tenantId: "tenant-panel",
      clientId: "client-panel",
      siteId: "site-panel",
      migrationId: "migration-panel",
    },
    publishContext: {
      candidateSiteVersionRef: attempt.candidateSiteVersionRef,
      runtimeArtifactRef: attempt.runtimeArtifactRef,
      publishTargetRef: attempt.publishTargetRef,
      publishStage: "production",
      publishEnvironment: "production",
    },
    governedPublishChain: {
      launchReadinessEvidence: { ref: "aaf:evidence_package:evidence-panel", status: "available" },
      publishActivationRequest: { ref: "request-panel", status: "available" },
      publishActivationDecision: { ref: "decision-panel", status: "available" },
      gateResult: { ref: "gate-panel", status: "available" },
      handoffWatermark: "handoff-watermark-panel",
      gateInputWatermark: attempt.gateInputWatermark,
    },
    sourceBoundaries: {
      launchReadiness: SOURCE_BOUNDARY,
      publishActivationRequest: SOURCE_BOUNDARY,
      publishActivationDecision: SOURCE_BOUNDARY,
      gateHandoffEvaluation: SOURCE_BOUNDARY,
      metadataResolver: DERIVED_BOUNDARY,
      operatorAudit: SOURCE_BOUNDARY,
      derivedNextAction: DERIVED_BOUNDARY,
    },
    launchReadiness: {
      boundary: SOURCE_BOUNDARY,
      recordId: "readiness-panel",
      recordRef: "gnr8:gnr8_single_site_launch_readiness_records:readiness-panel",
      status: "ready_with_limitations",
      freshnessStatus: "fresh",
      sourceWatermark: "wm:readiness-panel",
      readinessSummary: ["ready_with_limitations"],
      flags: { ready: false, readyWithLimitations: true, blocked: false, stale: false, missing: false },
      requiredMissingDimensions: [],
      staleDimensions: [],
      blockedDimensions: [],
      acceptedLimitations: ["operator_visibility_only"],
      dimensionDrilldown: [
        {
          id: "dimension-ready",
          group: "ready",
          label: "publish_target",
          status: "ready",
          freshnessStatus: "fresh",
          severity: null,
          category: "required",
          code: "publish_target",
          ref: "gnr8:gnr8_publish_targets:production",
          watermark: "wm:target",
          summary: "ready",
        },
        {
          id: "dimension-blocked",
          group: "blocked",
          label: "domain_readiness",
          status: "blocked",
          freshnessStatus: "fresh",
          severity: null,
          category: "required",
          code: "domain_readiness_blocked",
          ref: "gnr8:domain:blocked",
          watermark: "wm:domain",
          summary: "Domain readiness blocked.",
        },
        {
          id: "dimension-stale",
          group: "stale",
          label: "metadata_snapshot",
          status: "ready",
          freshnessStatus: "stale",
          severity: null,
          category: "required",
          code: "metadata_snapshot_stale",
          ref: "gnr8:metadata:stale",
          watermark: "wm:metadata",
          summary: "Metadata source is stale.",
        },
        {
          id: "dimension-missing",
          group: "missing",
          label: "billing_attestation",
          status: "missing",
          freshnessStatus: "missing",
          severity: null,
          category: "required",
          code: "billing_attestation_missing",
          ref: null,
          watermark: null,
          summary: "Required metadata missing.",
        },
      ],
      dimensionGroups: {
        ready: ["publish_target"],
        stale: ["metadata_snapshot_stale"],
        missing: ["billing_attestation_missing"],
        blocked: ["domain_readiness_blocked"],
        optional: [],
      },
      blockerCountBySeverity: [{ key: "p1_major", count: 1 }],
      blockerCountByCategory: [{ key: "domain", count: 1 }],
      openBlockers: [],
      evidencePackageRef: "aaf:evidence_package:evidence-panel",
      evidencePackageStatus: "created",
      evidenceWatermark: "wm:evidence-panel",
    },
    publishActivationRequest: {
      boundary: SOURCE_BOUNDARY,
      id: "request-panel",
      ref: "aaf:approval_request:request-panel",
      status: "requested",
      scope: "publish_activation",
      action: "publish.activation",
      subjectType: "site_version",
      subjectId: "candidate-panel",
      linkedLaunchReadinessEvidenceRef: "aaf:evidence_package:evidence-panel",
      evidenceRefs: ["aaf:evidence_package:evidence-panel"],
      policyMetadata: {
        policyVersion: "mvp-41",
        policyEvaluationId: "policy-request-panel",
        requestedExpiresAt: null,
      },
    },
    publishActivationDecision: {
      boundary: SOURCE_BOUNDARY,
      id: "decision-panel",
      ref: "aaf:approval_decision:decision-panel",
      status: "granted_with_limitations",
      projection: "granted_with_limitations",
      granted: false,
      grantedWithLimitations: true,
      rejected: false,
      invalid: false,
      revoked: false,
      superseded: false,
      expired: false,
      expiresAt: null,
      limitations: ["operator_visibility_only"],
      evidenceRefs: ["aaf:evidence_package:evidence-panel"],
      indicators: [],
    },
    gateHandoffEvaluation: {
      boundary: SOURCE_BOUNDARY,
      handoffReadinessStatus: "handoff_ready",
      handoffWatermark: "handoff-watermark-panel",
      gateInputWatermark: attempt.gateInputWatermark,
      gateResultId: "gate-panel",
      gateResultRef: "aaf:action_gate_attempt:gate-panel",
      gateResultStatus: "allowed",
      gateBlockers: [],
      gateWarnings: [],
      newerConflict: false,
      stale: false,
      mismatchIndicators: [],
      conflictDetails: [],
    },
    metadataResolver: {
      boundary: DERIVED_BOUNDARY,
      completenessStatus: "complete",
      missingMetadataCodes: [],
      expectedResolvedMismatchCodes: [],
      safeDiagnostics: [],
      detailRows: [],
    },
    operatorAudit: {
      boundary: SOURCE_BOUNDARY,
      latestDryRunActionId: attempt.actionId,
      latestShadowPublishActionId: null,
      recentAttemptCount: 1,
      actorCorrelationIdempotencyProjection: [{
        actionId: attempt.actionId,
        actorRole: attempt.actor.actorRole,
        correlationId: attempt.correlationId,
        idempotencyKey: attempt.idempotencyKey,
      }],
      recentEvents: [
        {
          actionId: attempt.actionId,
          eventAction: "completed",
          status: "dry_run_completed",
          actorRole: attempt.actor.actorRole,
          occurredAt: attempt.completedAt!,
          resultStatus: "dry_run_ready",
          reasonCodes: ["dry_run_ready"],
        },
      ],
      timelineSummaries: [
        {
          id: attempt.actionId,
          group: "ready",
          label: "dry_run",
          status: "dry_run_completed",
          freshnessStatus: attempt.updatedAt,
          severity: null,
          category: "dry_run_ready",
          code: "dry_run_ready",
          ref: attempt.actionId,
          watermark: attempt.gateInputWatermark,
          summary: "dry_run:dry_run_completed:dry_run_ready",
        },
      ],
      persistedResultFlags: {
        anyPublishMayHaveExecuted: false,
        anyRuntimeMutationFlag: false,
        anyBlockingEnforcementAppliedFlag: false,
      },
    },
    readinessState: "ready",
    latestDryRun: attempt,
    latestShadowPublish: null,
    timeline: [attempt],
    blockerCodes: [],
    warningCodes: [],
    limitationCodes: ["read_only_panel"],
    staleOrMissingMetadataIndicators: [],
    runbookSummary: {
      totalEntries: 2,
      blockingEntries: 1,
      staleEntries: 0,
      missingEntries: 0,
      conflictEntries: 0,
      severityCounts: [{ key: "blocked", count: 1 }, { key: "info", count: 1 }],
      sourceOwnerCounts: [{ key: "launch_readiness", count: 1 }, { key: "operator_audit", count: 1 }],
      topBlockingReason: {
        code: "LAUNCH_READINESS_BLOCKED",
        severity: "blocked",
        sourceOwner: "launch_readiness",
        title: "Launch readiness is blocked",
        safeNextInspectionHint: "Inspect open launch readiness blockers and blocked dimension rows before reviewing approval state.",
      },
      recommendedInspectionOrder: ["launch_readiness"],
    },
    runbookEntries: [
      {
        code: "LAUNCH_READINESS_BLOCKED",
        severity: "blocked",
        sourceOwner: "launch_readiness",
        title: "Launch readiness is blocked",
        diagnosticExplanation: "One or more launch readiness dimensions or source blockers prevents publish readiness.",
        safeNextInspectionHint: "Inspect open launch readiness blockers and blocked dimension rows before reviewing approval state.",
        requiredUpstreamSource: "launch_readiness",
        blocking: true,
        stale: false,
        missing: false,
        conflict: false,
        relatedSafeRefs: ["gnr8:gnr8_single_site_launch_readiness_records:readiness-panel"],
        relatedSafeCodes: ["domain_readiness_blocked"],
        readOnly: true,
        actionAvailable: false,
      },
      {
        code: "AUDIT_SHADOW_PUBLISH_AVAILABLE_NOT_RUN",
        severity: "info",
        sourceOwner: "operator_audit",
        title: "Shadow publish is available but not recorded",
        diagnosticExplanation: "The read-only projection indicates shadow publish could be a future upstream action, but this panel provides no action control.",
        safeNextInspectionHint: "Inspect the latest dry-run and governed publish chain before using any external source-owned workflow.",
        requiredUpstreamSource: "operator_audit",
        blocking: false,
        stale: false,
        missing: false,
        conflict: false,
        relatedSafeRefs: [attempt.actionId],
        relatedSafeCodes: [],
        readOnly: true,
        actionAvailable: false,
      },
    ],
    nextAction: "shadow_publish_available",
    flags: {
      readOnly: true,
      publishes: false,
      runtimeMutation: false,
      enforcementApplied: false,
      createsAafRecords: false,
      createsGateAttempt: false,
      evaluatesGate: false,
      pasrInvoked: false,
      createsDdomSnapshots: false,
      providerCalls: false,
    },
    ...overrides,
  };
}

test("operator panel renders dense read-only status without mutation buttons", () => {
  const html = renderToStaticMarkup(<SingleSitePublishOperatorPanel model={model()} />);

  assert.equal(html.includes("Single-Site Publish Operator Panel"), true);
  assert.equal(html.includes("Read-Only Boundary"), true);
  assert.equal(html.includes("Display Filters"), true);
  assert.equal(html.includes("Diagnostics Runbook"), true);
  assert.equal(html.includes("Severity counts"), true);
  assert.equal(html.includes("Source owner counts"), true);
  assert.equal(html.includes("Inspection order"), true);
  assert.equal(html.includes("Launch readiness is blocked"), true);
  assert.equal(html.includes("LAUNCH_READINESS_BLOCKED"), true);
  assert.equal(html.includes("read only"), true);
  assert.equal(html.includes("no action"), true);
  assert.equal(html.includes("Launch Readiness"), true);
  assert.equal(html.includes("Publish Activation"), true);
  assert.equal(html.includes("Gate Handoff"), true);
  assert.equal(html.includes("Metadata Resolver"), true);
  assert.equal(html.includes("Audit Projection"), true);
  assert.equal(html.includes("Filtered Diagnostic Rows"), true);
  assert.equal(html.includes("Blockers only"), true);
  assert.equal(html.includes("Stale only"), true);
  assert.equal(html.includes("Missing only"), true);
  assert.equal(html.includes("Newest first"), true);
  assert.equal(html.includes("<select"), true);
  assert.equal(html.includes("<input"), true);
  assert.equal(html.includes("source-owned read"), true);
  assert.equal(html.includes("derived-only"), true);
  assert.equal(html.includes("publishes"), true);
  assert.equal(html.includes("runtimeMutation"), true);
  assert.equal(html.includes("enforcementApplied"), true);
  assert.equal(html.includes("<button"), false);
  assert.equal(html.includes("<form"), false);
  assert.equal(html.includes("Approve"), false);
  assert.equal(html.includes("Retry"), false);
  assert.equal(html.includes("Rollback"), false);
  assert.equal(html.includes("Shadow-Publish</button>"), false);
});

test("operator panel keeps long refs constrained and avoids unsafe diagnostics", () => {
  const fixture = model({
    latestDryRun: {
      ...model().latestDryRun!,
      redactedDiagnosticSummary: {
          status: "failed",
          reasonCodes: ["publish_activation_missing_dns_readiness"],
          available: true,
          omittedUnsafeDiagnostics: true,
        },
    },
  });
  const html = renderToStaticMarkup(<SingleSitePublishOperatorPanel model={fixture} />);

  assert.equal(html.includes("text-overflow:ellipsis"), true);
  assert.equal(html.includes("white-space:nowrap"), true);
  assert.equal(html.includes("candidate-version-ref-"), true);
  assert.equal(html.includes("publish_activation_missing_dns_readiness"), true);
  assert.equal(html.includes("rawSqlError"), false);
  assert.equal(html.includes("stackTrace"), false);
});

test("operator panel renders useful empty states for source and audit gaps", () => {
  const empty = model({
    state: "visible",
    launchReadiness: {
      ...model().launchReadiness,
      recordId: null,
      recordRef: null,
      status: "missing",
      freshnessStatus: "missing",
      flags: { ready: false, readyWithLimitations: false, blocked: false, stale: false, missing: true },
      dimensionDrilldown: [],
      dimensionGroups: { ready: [], stale: [], missing: [], blocked: [], optional: [] },
      blockerCountBySeverity: [],
      blockerCountByCategory: [],
      evidencePackageRef: null,
      evidencePackageStatus: "missing",
      evidenceWatermark: null,
    },
    publishActivationRequest: { ...model().publishActivationRequest, id: null, ref: null, status: "missing", linkedLaunchReadinessEvidenceRef: null },
    publishActivationDecision: { ...model().publishActivationDecision, id: null, ref: null, status: "missing", projection: "missing", grantedWithLimitations: false, limitations: [], evidenceRefs: [], indicators: [] },
    gateHandoffEvaluation: { ...model().gateHandoffEvaluation, handoffReadinessStatus: "missing", gateResultId: null, gateResultRef: null, gateResultStatus: "missing", gateInputWatermark: null, conflictDetails: [] },
    metadataResolver: {
      ...model().metadataResolver,
      completenessStatus: "incomplete",
      missingMetadataCodes: ["launch_readiness_evidence_ref_missing", "publish_activation_request_ref_missing"],
      detailRows: [
        {
          id: "launch_readiness_evidence_ref_missing",
          group: "missing",
          label: "launch_readiness_evidence_ref_missing",
          status: "missing",
          freshnessStatus: null,
          severity: null,
          category: null,
          code: "launch_readiness_evidence_ref_missing",
          ref: null,
          watermark: null,
          summary: "Required publish activation metadata is not available.",
        },
      ],
    },
    latestDryRun: null,
    latestShadowPublish: null,
    timeline: [],
    operatorAudit: {
      ...model().operatorAudit,
      latestDryRunActionId: null,
      latestShadowPublishActionId: null,
      recentAttemptCount: 0,
      actorCorrelationIdempotencyProjection: [],
      recentEvents: [],
      timelineSummaries: [],
    },
    nextAction: "collect_launch_readiness_evidence",
  });
  const html = renderToStaticMarkup(<SingleSitePublishOperatorPanel model={empty} />);

  assert.equal(html.includes("No persisted attempt is available for this lookup."), true);
  assert.equal(html.includes("No audit attempts match this lookup."), true);
  assert.equal(html.includes("No launch readiness record is available for this lookup."), true);
  assert.equal(html.includes("No publish activation request is available."), true);
  assert.equal(html.includes("No publish activation decision is available."), true);
  assert.equal(html.includes("No gate attempt is available."), true);
  assert.equal(html.includes("Metadata is incomplete for this lookup."), true);
  assert.equal(html.includes("No audit event history is available."), true);
  assert.equal(html.includes("launch_readiness_evidence_ref_missing"), true);
  assert.equal(html.includes("<form"), false);
  assert.equal(html.includes("<button"), false);
});

test("operator panel renders empty diagnostics runbook state", () => {
  const clean = model({
    runbookSummary: {
      totalEntries: 0,
      blockingEntries: 0,
      staleEntries: 0,
      missingEntries: 0,
      conflictEntries: 0,
      severityCounts: [],
      sourceOwnerCounts: [],
      topBlockingReason: null,
      recommendedInspectionOrder: [],
    },
    runbookEntries: [],
  });
  const html = renderToStaticMarkup(<SingleSitePublishOperatorPanel model={clean} />);

  assert.equal(html.includes("No blocking runbook reason is active."), true);
  assert.equal(html.includes("No diagnostic runbook entries are active for this projection."), true);
  assert.equal(html.includes("No blocking or warning sources"), true);
  assert.equal(html.includes("<button"), false);
  assert.equal(html.includes("<form"), false);
});

test("operator panel local filters isolate blocker stale missing and timeline rows", () => {
  const fixture = model();
  const rows = [
    ...fixture.launchReadiness.dimensionDrilldown,
    ...fixture.metadataResolver.detailRows,
    ...fixture.operatorAudit.timelineSummaries,
  ];
  const blockerRows = filterSingleSitePublishOperatorDrilldownRows(rows, { rowFilter: "blockers" });
  const staleRows = filterSingleSitePublishOperatorDrilldownRows(rows, { rowFilter: "stale" });
  const missingRows = filterSingleSitePublishOperatorDrilldownRows(rows, { rowFilter: "missing" });
  const searchedRows = filterSingleSitePublishOperatorDrilldownRows(rows, { rowFilter: "all", search: "domain_readiness" });

  assert.deepEqual(blockerRows.map((row) => row.code), ["domain_readiness_blocked"]);
  assert.deepEqual(staleRows.map((row) => row.code), ["metadata_snapshot_stale"]);
  assert.deepEqual(missingRows.map((row) => row.code), ["billing_attestation_missing"]);
  assert.deepEqual(searchedRows.map((row) => row.code), ["domain_readiness_blocked"]);

  const shadow = { ...fixture.latestDryRun!, actionId: "00000000-0000-4000-8000-000000000202", mode: "shadow_publish" as const, updatedAt: "2026-08-10T10:00:00.000Z", status: "shadow_publish_completed" as const };
  const filtered = filterSingleSitePublishOperatorTimelineRows([fixture.latestDryRun!, shadow], { mode: "shadow_publish", sort: "newest", search: "completed" });

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].mode, "shadow_publish");
});

test("operator page is superadmin-only and uses the read-only projection", async () => {
  const [pageSource, layoutSource] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(LAYOUT_FILE, "utf8"),
  ]);

  assert.equal(pageSource.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(layoutSource.includes("requireSuperadminUserIdForPage"), true);
  assert.equal(pageSource.includes("getSingleSitePublishOperatorReadonlyProjection"), true);
  assert.equal(pageSource.includes("POST("), false);
  assert.equal(pageSource.includes("<button"), false);
});

test("operator panel source has no action controls or mutation route calls", async () => {
  const source = await readFile(PANEL_FILE, "utf8");

  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes("method: \"POST\""), false);
  assert.equal(source.includes("approve"), false);
  assert.equal(source.includes("retry"), false);
  assert.equal(source.includes("rollback"), false);
});

test("generic publish route, client portal publish route, and Ops Inbox do not import the panel projection", async () => {
  const [genericPublish, clientPublish, opsInbox] = await Promise.all([
    readFile(GENERIC_PUBLISH_ROUTE, "utf8"),
    readFile(CLIENT_CONTENT_PUBLISH_ROUTE, "utf8"),
    readFile(OPS_INBOX_PAGE, "utf8"),
  ]);

  assert.equal(genericPublish.includes("single-site-publish-operator-readonly-projection"), false);
  assert.equal(clientPublish.includes("single-site-publish-operator-readonly-projection"), false);
  assert.equal(opsInbox.includes("single-site-publish-operator-readonly-projection"), false);
  assert.equal(opsInbox.includes("SingleSitePublishOperatorPanel"), false);
});

test("operator panel is not added to client or public surfaces", async () => {
  async function exists(url: URL): Promise<boolean> {
    try {
      await stat(url);
      return true;
    } catch {
      return false;
    }
  }

  assert.equal(await exists(new URL("../../client/single-site-publish", import.meta.url)), false);
  assert.equal(await exists(new URL("../../public/single-site-publish", import.meta.url)), false);
});
