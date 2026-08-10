import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { SingleSitePublishOperatorReadonlyProjection } from "@/gnr8/single-site/single-site-publish-operator-readonly-projection";

import { SingleSitePublishOperatorPanel } from "./_components/SingleSitePublishOperatorPanel";

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
    panelVersion: "mvp-59-single-site-publish-operator-readonly-source-enrichment:v1",
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
    },
    metadataResolver: {
      boundary: DERIVED_BOUNDARY,
      completenessStatus: "complete",
      missingMetadataCodes: [],
      expectedResolvedMismatchCodes: [],
      safeDiagnostics: [],
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
  assert.equal(html.includes("Launch Readiness"), true);
  assert.equal(html.includes("Publish Activation"), true);
  assert.equal(html.includes("Gate And Metadata"), true);
  assert.equal(html.includes("Audit Projection"), true);
  assert.equal(html.includes("source-owned read"), true);
  assert.equal(html.includes("derived-only"), true);
  assert.equal(html.includes("publishes"), true);
  assert.equal(html.includes("runtimeMutation"), true);
  assert.equal(html.includes("enforcementApplied"), true);
  assert.equal(html.includes("<button"), false);
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
      evidencePackageRef: null,
      evidencePackageStatus: "missing",
      evidenceWatermark: null,
    },
    publishActivationRequest: { ...model().publishActivationRequest, id: null, ref: null, status: "missing", linkedLaunchReadinessEvidenceRef: null },
    publishActivationDecision: { ...model().publishActivationDecision, id: null, ref: null, status: "missing", projection: "missing", grantedWithLimitations: false, limitations: [] },
    gateHandoffEvaluation: { ...model().gateHandoffEvaluation, handoffReadinessStatus: "missing", gateResultId: null, gateResultRef: null, gateResultStatus: "missing", gateInputWatermark: null },
    metadataResolver: { ...model().metadataResolver, completenessStatus: "incomplete", missingMetadataCodes: ["launch_readiness_evidence_ref_missing", "publish_activation_request_ref_missing"] },
    latestDryRun: null,
    latestShadowPublish: null,
    timeline: [],
    operatorAudit: {
      ...model().operatorAudit,
      latestDryRunActionId: null,
      latestShadowPublishActionId: null,
      recentAttemptCount: 0,
      actorCorrelationIdempotencyProjection: [],
    },
    nextAction: "collect_launch_readiness_evidence",
  });
  const html = renderToStaticMarkup(<SingleSitePublishOperatorPanel model={empty} />);

  assert.equal(html.includes("No persisted attempt is available for this lookup."), true);
  assert.equal(html.includes("No audit attempts match this lookup."), true);
  assert.equal(html.includes("launch_readiness_evidence_ref_missing"), true);
  assert.equal(html.includes("<form"), false);
  assert.equal(html.includes("<button"), false);
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
