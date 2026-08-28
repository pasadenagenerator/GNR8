import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createSingleSiteMvpOperatorActionRouteHandlers } from "@/app/api/gnr8/admin/single-site-mvp/single-site-mvp-operator-action-route-handlers";
import {
  SINGLE_SITE_MVP_OPERATOR_ACTION_FACADE_VERSION,
  type SingleSiteMvpOperatorActionInput,
  type SingleSiteMvpOperatorActionOutput,
} from "@/gnr8/single-site/single-site-mvp-operator-action-facade";
import { SINGLE_SITE_MVP_ORCHESTRATION_SERVICE_VERSION } from "@/gnr8/single-site/single-site-mvp-orchestration-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const PLATFORM_ROOT = path.resolve(TEST_DIR, "../../../../..");
const FACADE_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/single-site-mvp-operator-action-facade.ts");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/single-site-mvp/single-site-mvp-operator-action-route-handlers.ts");
const STATUS_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/single-site-mvp/status/route.ts");
const ACTION_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/single-site-mvp/action/route.ts");
const GENERIC_RUNTIME_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/runtime/versions/[siteVersionId]/publish/route.ts");
const GENERIC_CLIENT_PUBLISH_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/clients/[clientId]/sites/[siteId]/content/publish/route.ts");
const CLIENT_PORTAL_PAGE_SOURCE = path.join(APP_ROOT, "gnr8/client/page.tsx");
const AGENCY_CLIENT_SITE_ACTIONS_SOURCE = path.join(APP_ROOT, "gnr8/agency/clients/[clientId]/sites/[siteId]/SiteActionsPanel.tsx");
const OPS_INBOX_PAGE_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/page.tsx");
const OPS_INBOX_SHELL_SOURCE = path.join(APP_ROOT, "gnr8/command-center/ops-inbox/_components/OpsInboxShell.tsx");
const COMMAND_CENTER_PANEL_SOURCE = path.join(APP_ROOT, "gnr8/command-center/single-site-publish/_components/SingleSitePublishOperatorPanel.tsx");

function request(url: string, body?: unknown): Request {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function facadeOutput(input: Partial<SingleSiteMvpOperatorActionOutput> = {}): SingleSiteMvpOperatorActionOutput {
  return {
    facadeVersion: SINGLE_SITE_MVP_OPERATOR_ACTION_FACADE_VERSION,
    orchestrationStatus: {
      orchestrationVersion: SINGLE_SITE_MVP_ORCHESTRATION_SERVICE_VERSION,
      generatedAt: "2026-08-13T13:00:00.000Z",
      identity: {
        tenantId: "tenant-route",
        clientId: "client-route",
        siteId: "site-route",
        migrationId: "migration-route",
        candidateVersionRef: "candidate-route",
        runtimeArtifactRef: "artifact-route",
        publishTargetRef: "target-route",
        correlationId: "corr-route",
      },
      boundary: {
        serverOnly: true,
        readOnly: true,
        advisoryOnly: true,
        mutatesSourceTruth: false,
        createsApprovals: false,
        createsAafRecords: false,
        createsGateAttempts: false,
        evaluatesGate: false,
        publishes: false,
        shadowPublishes: false,
        runtimeMutation: false,
        providerCalls: false,
        billingCalls: false,
        domainDnsCalls: false,
        routesAdded: false,
        uiAdded: false,
      },
      sourceSystemsRead: ["state_spine"],
      stateReadModel: { available: true, readModelVersion: "test", currentState: "publish_ready", lifecycle: "active", recommendedNextAction: "run_operator_dry_run" },
      publishOperatorProjection: { available: true, panelVersion: "test", nextAction: "run_operator_dry_run", readinessState: "ready" },
      nextOperation: {
        key: "run_operator_dry_run",
        step: "operator_dry_run",
        sourceOwner: "operator_audit",
        reason: "test",
        requiredRefs: [],
        currentRefs: [],
        readOnly: true,
        advisoryOnly: true,
        mutatesSourceTruth: false,
      },
      steps: [],
      checklist: [],
      blockers: [],
      warnings: [],
      limitations: [],
    },
    requestedOperation: null,
    allowed: true,
    reasonCode: "status_read_allowed",
    blockers: [],
    warnings: [],
    limitations: [],
    safeRefs: [],
    executionResult: null,
    mutationFlags: {
      facadeCreatesAafRecords: false,
      facadeCreatesGateAttempts: false,
      facadeEvaluatesGate: false,
      facadeInvokesPasr: false,
      facadeCreatesDdomSnapshots: false,
      facadeProviderCalls: false,
      facadeBillingCalls: false,
      facadeDomainDnsCalls: false,
      facadeDirectRuntimeMutation: false,
      facadeDirectPublishTargetMutation: false,
      facadeDirectActivePointerMutation: false,
      facadeDirectRollbackMutation: false,
      commandCenterUiAdded: false,
      clientPortalExposure: false,
      opsInboxAction: false,
      dryRun: false,
      shadowPublish: false,
      publishes: false,
      runtimeMutation: false,
      publishMayHaveExecuted: false,
    },
    correlationId: "corr-route",
    idempotencyKey: null,
    redactions: ["serverActor"],
    ...input,
  };
}

test("GET status requires superadmin before facade access", async () => {
  let facadeCalls = 0;
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    async readSingleSiteMvpOperatorStatus() {
      facadeCalls += 1;
      return facadeOutput();
    },
  });

  const response = await handlers.GET(request("https://app.test/api/gnr8/admin/single-site-mvp/status?tenantId=t&clientId=c&siteId=s"));
  const body = (await response.json()) as { ok: boolean; diagnostics: string[] };

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.diagnostics.includes("single_site_mvp_operator_superadmin_required"), true);
  assert.equal(facadeCalls, 0);
});

test("POST action requires superadmin before facade access", async () => {
  let facadeCalls = 0;
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Unauthorized");
    },
    async preflightSingleSiteMvpOperatorAction() {
      facadeCalls += 1;
      return facadeOutput();
    },
  });

  const response = await handlers.POST(request("https://app.test/api/gnr8/admin/single-site-mvp/action", { actionMode: "preflight" }));

  assert.equal(response.status, 401);
  assert.equal(facadeCalls, 0);
});

test("GET status returns redacted orchestration model", async () => {
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
    async readSingleSiteMvpOperatorStatus(input: SingleSiteMvpOperatorActionInput) {
      assert.equal(input.actor.actorId, "superadmin-route");
      assert.equal(input.actor.actorRole, "platform_superadmin");
      return facadeOutput();
    },
  });

  const response = await handlers.GET(
    request("https://app.test/api/gnr8/admin/single-site-mvp/status?tenantId=tenant-route&clientId=client-route&siteId=site-route&correlationId=corr-route"),
  );
  const body = (await response.json()) as SingleSiteMvpOperatorActionOutput;

  assert.equal(response.status, 200);
  assert.equal(body.allowed, true);
  assert.equal(body.orchestrationStatus.nextOperation.key, "run_operator_dry_run");
  assert.equal("actor" in body.orchestrationStatus.identity, false);
});

test("missing identity fields are rejected before facade access", async () => {
  let facadeCalls = 0;
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
    async readSingleSiteMvpOperatorStatus() {
      facadeCalls += 1;
      return facadeOutput();
    },
    async preflightSingleSiteMvpOperatorAction() {
      facadeCalls += 1;
      return facadeOutput();
    },
  });

  const getResponse = await handlers.GET(request("https://app.test/api/gnr8/admin/single-site-mvp/status?tenantId=tenant-route"));
  const postResponse = await handlers.POST(
    request("https://app.test/api/gnr8/admin/single-site-mvp/action", {
      actionMode: "preflight",
      tenantId: "tenant-route",
      requestedOperationKey: "run_operator_dry_run",
    }),
  );
  const getBody = (await getResponse.json()) as { diagnostics: string[] };
  const postBody = (await postResponse.json()) as { diagnostics: string[] };

  assert.equal(getResponse.status, 400);
  assert.equal(postResponse.status, 400);
  assert.equal(getBody.diagnostics.includes("single_site_mvp_operator_client_id_missing"), true);
  assert.equal(getBody.diagnostics.includes("single_site_mvp_operator_site_id_missing"), true);
  assert.equal(postBody.diagnostics.includes("single_site_mvp_operator_client_id_missing"), true);
  assert.equal(postBody.diagnostics.includes("single_site_mvp_operator_site_id_missing"), true);
  assert.equal(facadeCalls, 0);
});

test("body actor overrides and unknown fields are rejected before facade execution", async () => {
  let executeCalls = 0;
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
    async executeSingleSiteMvpOperatorAction() {
      executeCalls += 1;
      return facadeOutput();
    },
  });

  const response = await handlers.POST(
    request("https://app.test/api/gnr8/admin/single-site-mvp/action", {
      actionMode: "execute",
      tenantId: "tenant-route",
      clientId: "client-route",
      siteId: "site-route",
      requestedOperationKey: "run_operator_dry_run",
      actor: { actorId: "override", actorRole: "platform_superadmin" },
      actorRole: "platform_superadmin",
      rawSql: "select secret",
    }),
  );
  const body = (await response.json()) as { diagnostics: string[]; mutationFlags: { publishMayHaveExecuted: boolean } };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("single_site_mvp_operator_actor_override_forbidden:actor"), true);
  assert.equal(body.diagnostics.includes("single_site_mvp_operator_actor_override_forbidden:actorRole"), true);
  assert.equal(body.diagnostics.includes("single_site_mvp_operator_forbidden_field:rawSql"), true);
  assert.equal(body.mutationFlags.publishMayHaveExecuted, false);
  assert.equal(executeCalls, 0);
});

test("POST preflight and execute derive actor server-side", async () => {
  const seen: SingleSiteMvpOperatorActionInput[] = [];
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
    async preflightSingleSiteMvpOperatorAction(input) {
      seen.push(input);
      return facadeOutput({ requestedOperation: input.requestedOperationKey ?? null, reasonCode: "preflight_allowed" });
    },
    async executeSingleSiteMvpOperatorAction(input) {
      seen.push(input);
      return facadeOutput({ requestedOperation: input.requestedOperationKey ?? null, reasonCode: "execution_completed" });
    },
  });

  const baseBody = {
    tenantId: "tenant-route",
    clientId: "client-route",
    siteId: "site-route",
    requestedOperationKey: "run_operator_dry_run",
    correlationId: "corr-route",
  };
  const preflight = await handlers.POST(request("https://app.test/api/gnr8/admin/single-site-mvp/action", { ...baseBody, actionMode: "preflight" }));
  const execute = await handlers.POST(request("https://app.test/api/gnr8/admin/single-site-mvp/action", { ...baseBody, actionMode: "execute" }));

  assert.equal(preflight.status, 200);
  assert.equal(execute.status, 200);
  assert.equal(seen.length, 2);
  assert.equal(seen[0]!.actor.actorId, "superadmin-route");
  assert.equal(seen[0]!.actor.actorRole, "platform_superadmin");
  assert.equal(seen[1]!.actor.actorId, "superadmin-route");
});

test("POST action preserves canonical dry-run refs for facade execution", async () => {
  const seen: SingleSiteMvpOperatorActionInput[] = [];
  const canonicalCandidateRef = {
    role: "candidate_site_version",
    sourceSystem: "gnr8",
    sourceTable: "gnr8_runtime_site_versions",
    sourceRecordId: "site-version-route",
    sourceRef: "gnr8:gnr8_runtime_site_versions:site-version-route",
    sourceWatermark: "updated_at:2026-08-21 06:18:00.763932+00",
  };
  const canonicalEvidenceRef = {
    role: "launch_readiness_evidence",
    sourceSystem: "aaf",
    sourceTable: "gnr8_aaf_evidence_packages",
    sourceRecordId: "evidence-route",
    sourceRef: "aaf:evidence_package:evidence-route",
    sourceWatermark: `single-site-launch-readiness:${"d".repeat(64)}`,
  };
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
    async executeSingleSiteMvpOperatorAction(input) {
      seen.push(input);
      return facadeOutput({ requestedOperation: input.requestedOperationKey ?? null, reasonCode: "execution_completed" });
    },
  });

  const response = await handlers.POST(
    request("https://app.test/api/gnr8/admin/single-site-mvp/action", {
      actionMode: "execute",
      tenantId: "tenant-route",
      clientId: "client-route",
      siteId: "site-route",
      requestedOperationKey: "run_operator_dry_run",
      candidateVersionRef: canonicalCandidateRef,
      expectedLaunchReadinessEvidenceRef: canonicalEvidenceRef,
      expectedGateAttemptResultDisplayRef: "aaf:action_gate_attempt:gate-route",
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0]!.candidateVersionRef, canonicalCandidateRef);
  assert.deepEqual(seen[0]!.expectedLaunchReadinessEvidenceRef, canonicalEvidenceRef);
  assert.equal(seen[0]!.expectedGateAttemptResultDisplayRef, "aaf:action_gate_attempt:gate-route");
});

test("GET and POST reject unsafe query or body fields", async () => {
  const handlers = createSingleSiteMvpOperatorActionRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
  });

  const getResponse = await handlers.GET(request("https://app.test/api/gnr8/admin/single-site-mvp/status?tenantId=t&clientId=c&siteId=s&providerToken=secret"));
  const postResponse = await handlers.POST(request("https://app.test/api/gnr8/admin/single-site-mvp/action", { actionMode: "preflight", tenantId: "t", clientId: "c", siteId: "s", publish: true }));
  const getBody = (await getResponse.json()) as { diagnostics: string[] };
  const postBody = (await postResponse.json()) as { diagnostics: string[] };

  assert.equal(getResponse.status, 400);
  assert.equal(postResponse.status, 400);
  assert.equal(getBody.diagnostics.includes("single_site_mvp_operator_forbidden_field:providerToken"), true);
  assert.equal(postBody.diagnostics.includes("single_site_mvp_operator_forbidden_field:publish"), true);
});

test("source guardrails keep MVP-CUTLINE-3 narrow and internal", () => {
  const facadeSource = readFileSync(FACADE_SOURCE, "utf8");
  const routeSources = [
    readFileSync(ROUTE_HANDLER_SOURCE, "utf8"),
    readFileSync(STATUS_ROUTE_SOURCE, "utf8"),
    readFileSync(ACTION_ROUTE_SOURCE, "utf8"),
  ].join("\n");
  const newSources = `${facadeSource}\n${routeSources}`;
  const genericPublishSources = `${readFileSync(GENERIC_RUNTIME_PUBLISH_ROUTE_SOURCE, "utf8")}\n${readFileSync(GENERIC_CLIENT_PUBLISH_ROUTE_SOURCE, "utf8")}`;
  const clientPortalSources = `${readFileSync(CLIENT_PORTAL_PAGE_SOURCE, "utf8")}\n${readFileSync(AGENCY_CLIENT_SITE_ACTIONS_SOURCE, "utf8")}`;
  const opsInboxSources = `${readFileSync(OPS_INBOX_PAGE_SOURCE, "utf8")}\n${readFileSync(OPS_INBOX_SHELL_SOURCE, "utf8")}`;
  const commandCenterPanelSource = readFileSync(COMMAND_CENTER_PANEL_SOURCE, "utf8");

  assert.match(routeSources, /api\/gnr8\/admin\/single-site-mvp|requireSuperadminUserId/);
  assert.match(facadeSource, /runSingleSitePublishOperatorDryRun|runSingleSiteShadowPublishOperatorAction/);
  assert.doesNotMatch(newSources, /createApprovalRequest|createApprovalDecision|AafWriterRepository|createActionGateAttempt/i);
  assert.doesNotMatch(newSources, /evaluatePublishActivationGate|publish-activation-gate-evaluator/i);
  assert.doesNotMatch(newSources, /readPasr|pasrSource|pasrObserver/i);
  assert.doesNotMatch(newSources, /ddom-readiness|createDdomReadinessSnapshot|manualSnapshot|liveDns/i);
  assert.doesNotMatch(newSources, /from\s+["'][^"']*(vercel|openprovider|registrar|dns-provider|stripe|billing|entitlement|ai)[^"']*["']/i);
  assert.doesNotMatch(newSources, /new Stripe|stripe\.|checkDomainStatus|activateDomain|registerDomain|createDdom|manualSnapshot/i);
  assert.doesNotMatch(newSources, /switchActivePointer\s*\(|archivePublishedVersionsExcept\s*\(|createArtifact\s*\(|bindArtifactToVersion\s*\(/);
  assert.doesNotMatch(routeSources, /gnr8\/command-center|gnr8\/client|ops-inbox/);
  assert.doesNotMatch(genericPublishSources, /single-site-mvp|singleSiteMvpOperator|executeSingleSiteMvpOperatorAction/);
  assert.doesNotMatch(clientPortalSources, /single-site-mvp|singleSiteMvpOperator|executeSingleSiteMvpOperatorAction/);
  assert.doesNotMatch(opsInboxSources, /single-site-mvp|singleSiteMvpOperator|executeSingleSiteMvpOperatorAction/);
  assert.doesNotMatch(commandCenterPanelSource, /single-site-mvp\/action|single-site-mvp\/status|executeSingleSiteMvpOperatorAction/);
});
