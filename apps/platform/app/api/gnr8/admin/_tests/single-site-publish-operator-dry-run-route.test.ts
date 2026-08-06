import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createSingleSitePublishOperatorDryRunRouteHandlers } from "@/app/api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers";
import {
  SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_CALLER_VERSION,
  validateSingleSitePublishOperatorDryRunRequest,
  type SingleSitePublishOperatorDryRunRequest,
} from "@/gnr8/single-site/single-site-publish-operator-dry-run-caller";
import {
  SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
  type SingleSitePublishWrapperInput,
  type SingleSitePublishWrapperResult,
} from "@/gnr8/single-site/single-site-publish-wrapper-orchestrator";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PLATFORM_ROOT = path.resolve(TEST_DIR, "../../../../..");
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const CALLER_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/single-site-publish-operator-dry-run-caller.ts");
const ROUTE_HANDLER_SOURCE = path.join(
  APP_ROOT,
  "api/gnr8/admin/single-site-publish/dry-run/single-site-publish-operator-dry-run-route-handlers.ts",
);
const GENERIC_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts");
const CLIENT_CONTENT_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts");
const OPS_INBOX_PAGE_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/page.tsx");
const OPS_INBOX_SHELL_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx");

const BASE_REQUEST: SingleSitePublishOperatorDryRunRequest = {
  mode: "dry_run",
  tenantId: "tenant-mvp54",
  clientId: "client-mvp54",
  siteId: "site-mvp54",
  migrationId: "migration-mvp54",
  candidateSiteVersionRef: "gnr8:gnr8_runtime_site_versions:site-version-mvp54",
  runtimeArtifactRef: "gnr8:gnr8_runtime_artifacts:artifact-mvp54",
  expectedPublishTargetRef: "gnr8:gnr8_publish_targets:production",
  publishStage: "production",
  publishEnvironment: "production",
  expectedLaunchReadinessEvidenceRef: "aaf:evidence_package:evidence-mvp54",
  expectedPublishActivationRequestRef: "request-mvp54",
  expectedPublishActivationDecisionRef: "decision-mvp54",
  expectedGateAttemptResultRef: "gate-mvp54",
  expectedHandoffWatermark: "single-site-publish-activation-handoff:mvp54",
  expectedGateInputWatermark: `single-site-publish-activation-gate-input:${"c".repeat(64)}`,
  operatorConfirmation: {
    mode: "dry_run",
    dryRunOnly: true,
    publishes: false,
    runtimeMutation: false,
    migrationId: "migration-mvp54",
    candidateSiteVersionRef: "site-version-mvp54",
  },
  idempotencyKey: "idem-mvp54",
  correlationId: "corr-mvp54",
  allowWarningsWithLimitations: true,
};

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/single-site-publish/dry-run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function wrapperResult(overrides: Partial<SingleSitePublishWrapperResult> = {}): SingleSitePublishWrapperResult {
  return {
    wrapperVersion: SINGLE_SITE_PUBLISH_WRAPPER_ORCHESTRATOR_VERSION,
    status: "dry_run_ready",
    strictContextSummary: {
      tenantId: BASE_REQUEST.tenantId,
      clientId: BASE_REQUEST.clientId,
      siteId: BASE_REQUEST.siteId,
      migrationId: BASE_REQUEST.migrationId,
      siteVersionId: "site-version-mvp54",
      runtimeArtifactId: "artifact-mvp54",
      publishTargetId: "production",
      publishStage: "production",
      publishEnvironment: "production",
      publishActivationRequestId: "request-mvp54",
      publishActivationDecisionId: "decision-mvp54",
      gateAttemptId: "gate-mvp54",
      launchReadinessEvidenceId: "evidence-mvp54",
      metadataWatermark: "metadata-watermark-mvp54",
      handoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
      gateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
      contextWatermark: "context-watermark-mvp54",
    },
    metadataHandoffCompleteness: {
      status: "complete",
      complete: true,
      missingCodes: [],
      mismatchCodes: [],
      warningCodes: ["limitations_carried_forward"],
      safeIds: {
        tenantId: BASE_REQUEST.tenantId,
        clientId: BASE_REQUEST.clientId,
        siteId: BASE_REQUEST.siteId,
        migrationId: BASE_REQUEST.migrationId,
        siteVersionId: "site-version-mvp54",
        runtimeArtifactId: "artifact-mvp54",
        publishTargetId: "production",
        publishStage: "production",
        publishEnvironment: "production",
        publishActivationRequestId: "request-mvp54",
        publishActivationDecisionId: "decision-mvp54",
        gateAttemptId: "gate-mvp54",
        launchReadinessEvidenceId: "evidence-mvp54",
        metadataWatermark: "metadata-watermark-mvp54",
        handoffWatermark: BASE_REQUEST.expectedHandoffWatermark,
        gateInputWatermark: BASE_REQUEST.expectedGateInputWatermark,
        contextWatermark: "context-watermark-mvp54",
      },
    },
    resolverDiagnostics: {
      status: "complete",
      complete: true,
      blockerCodes: [],
      missingCodes: [],
      mismatchCodes: [],
      staleCodes: [],
      warningCodes: ["limitations_carried_forward"],
      transactionCapturedAt: "2026-08-06T00:00:00.000Z",
      safeIds: {
        siteId: BASE_REQUEST.siteId,
        siteVersionId: "site-version-mvp54",
        runtimeArtifactId: "artifact-mvp54",
        publishTargetId: "production",
        publishActivationRequestId: "request-mvp54",
        publishActivationDecisionId: "decision-mvp54",
        gateAttemptId: "gate-mvp54",
      },
    },
    resolverResult: {
      resolverVersion: "mvp-49-publish-activation-metadata-resolver:v1",
      publishActivationMetadataHandoff: null,
      diagnostics: {
        status: "complete",
        complete: true,
        blockerCodes: [],
        missingCodes: [],
        mismatchCodes: [],
        staleCodes: [],
        warningCodes: ["limitations_carried_forward"],
        transactionCapturedAt: "2026-08-06T00:00:00.000Z",
        safeIds: {
          siteId: BASE_REQUEST.siteId,
          siteVersionId: "site-version-mvp54",
          runtimeArtifactId: "artifact-mvp54",
          publishTargetId: "production",
          publishActivationRequestId: "request-mvp54",
          publishActivationDecisionId: "decision-mvp54",
          gateAttemptId: "gate-mvp54",
        },
      },
      metadataWatermark: "metadata-watermark-mvp54",
      flags: {
        readOnly: true,
        createsAafRecords: false,
        createsGateAttempt: false,
        evaluatesGate: false,
        pasrInvoked: false,
        createsDdomSnapshots: false,
        providerCalls: false,
        publishes: false,
        runtimeMutation: false,
        enforcementApplied: false,
      },
    },
    publishOrchestratorResult: { secret: "must-not-leak" } as never,
    publishOrchestratorInput: { rawEvidence: "must-not-leak" } as never,
    limitations: { readiness: [{ code: "dns_waiting", secret: "must-not-leak" }], decision: [], combined: [] },
    warnings: ["limitations_carried_forward"],
    blockerCodes: [],
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

test("authorized superadmin can run single-site publish operator dry-run", async () => {
  const wrapperInputs: SingleSitePublishWrapperInput[] = [];
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperInputs.push(input);
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.callerVersion, SINGLE_SITE_PUBLISH_OPERATOR_DRY_RUN_CALLER_VERSION);
  assert.equal(body.mode, "dry_run");
  assert.equal(body.dryRun, true);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(body.blockingEnforcementApplied, false);
  assert.equal(body.createsAafRecords, false);
  assert.equal(body.createsGateAttempt, false);
  assert.equal(body.evaluatesGate, false);
  assert.equal(wrapperInputs.length, 1);
  assert.equal(wrapperInputs[0]!.enabled, true);
  assert.equal(wrapperInputs[0]!.mode, "shadow_publish");
  assert.equal(wrapperInputs[0]!.dryRun, true);
  assert.equal(wrapperInputs[0]!.actor.actorRole, "platform_superadmin");
  assert.equal(wrapperInputs[0]!.actor.actorId, "superadmin-mvp54");
});

test("unauthorized actors fail closed before wrapper invocation", async () => {
  for (const error of [
    new Error("Unauthorized"),
    new Error("Forbidden: superadmin only"),
    new Error("Forbidden: agency owner denied"),
    new Error("Forbidden: client reviewer denied"),
    new Error("Forbidden: ops inbox actor denied"),
  ]) {
    let wrapperCalls = 0;
    const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
      requireSuperadminUserId: async () => {
        throw error;
      },
      wrapperDependencies: {
        publishSingleSiteApprovedCandidateShadow: async () => {
          wrapperCalls += 1;
          return wrapperResult();
        },
      },
    });

    const response = await handlers.POST(request(BASE_REQUEST));
    const body = (await response.json()) as { ok: boolean; publishes: boolean; runtimeMutation: boolean };

    assert.equal(body.ok, false);
    assert.equal(body.publishes, false);
    assert.equal(body.runtimeMutation, false);
    assert.equal(wrapperCalls, 0);
    assert.equal(response.status === 401 || response.status === 403, true);
  }
});

test("missing required fields fail before wrapper invocation", async () => {
  let wrapperCalls = 0;
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => {
        wrapperCalls += 1;
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(
    request({
      ...BASE_REQUEST,
      expectedGateInputWatermark: "",
      operatorConfirmation: {
        ...BASE_REQUEST.operatorConfirmation,
        candidateSiteVersionRef: "other-site-version",
      },
    }),
  );
  const body = (await response.json()) as { diagnostics: string[]; publishes: boolean; runtimeMutation: boolean };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_expectedGateInputWatermark_missing"), true);
  assert.equal(body.diagnostics.includes("single_site_publish_operator_confirmation_invalid"), true);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(wrapperCalls, 0);
});

test("execute and shadow-publish request fields are rejected before wrapper invocation", async () => {
  const validation = validateSingleSitePublishOperatorDryRunRequest({
    ...BASE_REQUEST,
    mode: "shadow_publish",
    dryRun: false,
    enabled: true,
    publishOrchestratorInput: { siteVersionId: "site-version-mvp54" },
  });

  assert.equal(validation.valid, false);
  if (validation.valid) return;
  assert.equal(validation.errors.includes("single_site_publish_operator_mode_dry_run_required"), true);
  assert.equal(validation.errors.includes("single_site_publish_operator_execution_field_forbidden:dryRun"), true);
  assert.equal(validation.errors.includes("single_site_publish_operator_execution_field_forbidden:enabled"), true);
  assert.equal(validation.errors.includes("single_site_publish_operator_execution_field_forbidden:publishOrchestratorInput"), true);
});

test("wrapper execute mode is never called and publish orchestrator is not directly callable", async () => {
  let wrapperCalls = 0;
  let directPublishOrchestratorCalls = 0;
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async (input) => {
        wrapperCalls += 1;
        if (input.dryRun !== true || input.mode !== "shadow_publish") {
          directPublishOrchestratorCalls += 1;
          throw new Error("execute mode reached");
        }
        return wrapperResult();
      },
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as { ok: boolean; dryRun: boolean; publishes: boolean; runtimeMutation: boolean };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.dryRun, true);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
  assert.equal(wrapperCalls, 1);
  assert.equal(directPublishOrchestratorCalls, 0);
});

test("wrapper blocked result remains safely dry-run and non-mutating", async () => {
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () =>
        wrapperResult({
          status: "preflight_blocked",
          metadataHandoffCompleteness: {
            status: "incomplete",
            complete: false,
            missingCodes: ["publish_activation_decision_missing"],
            mismatchCodes: [],
            warningCodes: [],
            safeIds: wrapperResult().strictContextSummary,
          },
          blockerCodes: ["publish_activation_decision_missing"],
          dryRun: true,
          publishes: false,
          runtimeMutation: false,
        }),
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as {
    ok: boolean;
    preflightStatus: string;
    wrapperDryRunStatus: string;
    blockerCodes: string[];
    publishes: boolean;
    runtimeMutation: boolean;
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.preflightStatus, "wrapper_blocked");
  assert.equal(body.wrapperDryRunStatus, "preflight_blocked");
  assert.deepEqual(body.blockerCodes, ["publish_activation_decision_missing"]);
  assert.equal(body.publishes, false);
  assert.equal(body.runtimeMutation, false);
});

test("safe operator response redacts raw wrapper internals", async () => {
  const handlers = createSingleSitePublishOperatorDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp54",
    wrapperDependencies: {
      publishSingleSiteApprovedCandidateShadow: async () => wrapperResult(),
    },
  });

  const response = await handlers.POST(request(BASE_REQUEST));
  const body = (await response.json()) as Record<string, unknown>;
  const json = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal("resolverResult" in body, false);
  assert.equal("publishOrchestratorInput" in body, false);
  assert.equal("publishOrchestratorResult" in body, false);
  assert.equal(json.includes("must-not-leak"), false);
  assert.deepEqual(body.limitationCodes, ["dns_waiting"]);
  assert.equal(Array.isArray(body.redactions), true);
});

test("source guardrails keep MVP-54 away from publish execution and excluded surfaces", () => {
  const callerSource = readFileSync(CALLER_SOURCE, "utf8");
  const routeSource = readFileSync(ROUTE_HANDLER_SOURCE, "utf8");
  const newSources = `${callerSource}\n${routeSource}`;
  const genericPublishRoute = readFileSync(GENERIC_PUBLISH_ROUTE_SOURCE, "utf8");
  const clientContentPublishRoute = readFileSync(CLIENT_CONTENT_PUBLISH_ROUTE_SOURCE, "utf8");
  const opsInboxSources = `${readFileSync(OPS_INBOX_PAGE_SOURCE, "utf8")}\n${readFileSync(OPS_INBOX_SHELL_SOURCE, "utf8")}`;

  assert.doesNotMatch(newSources, /from\s+["'][^"']*publish-activation-orchestrator|switchActivePointer\s*\(|archivePublishedVersionsExcept\s*\(/);
  assert.doesNotMatch(newSources, /createActionGateAttempt|createApprovalRequest|createApprovalDecision|AafWriterRepository|publish-activation-gate-evaluator/);
  assert.doesNotMatch(newSources, /readPasr|pasrSource|pasrObserver|aaf-publish-activation-shadow-observer/);
  assert.doesNotMatch(newSources, /ddom-readiness|createDdomReadinessSnapshot|manualSnapshot|liveDns/i);
  assert.doesNotMatch(newSources, /vercel|openprovider|registrar|dns-provider|stripe\.|new Stripe|ai_execution/i);
  assert.doesNotMatch(newSources, /billingMutation:\s*true|domainMutation:\s*true|entitlementService|subscriptionService|new Stripe|stripe\./i);
  assert.doesNotMatch(newSources, /app\/api\/gnr8\/runtime\/versions|app\/api\/gnr8\/clients|ops-inbox/);

  assert.doesNotMatch(genericPublishRoute, /single-site-publish-operator-dry-run|single-site-publish\/dry-run|publishSingleSiteApprovedCandidateShadow/);
  assert.doesNotMatch(clientContentPublishRoute, /single-site-publish-operator-dry-run|single-site-publish\/dry-run|publishSingleSiteApprovedCandidateShadow/);
  assert.doesNotMatch(opsInboxSources, /single-site-publish-operator-dry-run|single-site-publish\/dry-run|publishSingleSiteApprovedCandidateShadow/);
});
