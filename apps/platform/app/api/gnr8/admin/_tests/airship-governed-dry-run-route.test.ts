import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipGovernedDryRunRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/governed-dry-run/airship-governed-dry-run-route-handlers";
import type { AirshipGovernedDryRunOutput } from "@/gnr8/single-site/airship-governed-dry-run-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const PLATFORM_ROOT = path.resolve(TEST_DIR, "../../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/governed-dry-run/airship-governed-dry-run-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/governed-dry-run/route.ts");
const UI_SOURCE = path.join(APP_ROOT, "gnr8/airship/single-site/airship-publish-readiness-action.tsx");
const SERVICE_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/airship-governed-dry-run-service.ts");
const SHADOW_ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/single-site-publish/shadow-publish/single-site-shadow-publish-route-handlers.ts");

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const READINESS_ID = "3fdcde40-e178-40b5-83e1-217d600315ef";
const REVIEW_ID = "4bcca499-468b-40ff-b124-9cee88061263";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/governed-dry-run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    actionMode: "run_governed_dry_run",
    migrationId: MIGRATION_ID,
    readinessPackageId: READINESS_ID,
    reviewRecordId: REVIEW_ID,
    candidateVersionId: CANDIDATE_VERSION_ID,
    artifactId: ARTIFACT_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    ...overrides,
  };
}

function output(status: "created" | "reused" = "created"): AirshipGovernedDryRunOutput {
  return {
    status,
    serviceVersion: "airship-21-governed-dry-run:v1",
    refs: {
      migrationId: MIGRATION_ID,
      readinessPackageId: READINESS_ID,
      reviewRecordId: REVIEW_ID,
      candidateVersionId: CANDIDATE_VERSION_ID,
      artifactId: ARTIFACT_ID,
      draftId: DRAFT_ID,
      draftVersion: 44,
    },
    readiness: {
      id: READINESS_ID,
      readinessStatus: "complete",
      nextStep: "governed dry-run later, not publish",
      currentLiveActivePointerBefore: { siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f", artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254" },
      currentLiveActivePointerAfter: { siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f", artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254" },
      siteClientSourceLabels: {
        tenantId: "tenant-chs",
        clientId: "client-chs",
        siteId: "site-chs",
        sourceUrl: "https://www.chs.si/",
        liveUrl: "https://www.chs.si/",
        importedSiteLabel: "chs.si",
      },
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
    },
    result: {
      ok: false,
      actionId: "77777777-7777-4777-8777-777777777777",
      actionStatus: "dry_run_completed",
      preflightStatus: "wrapper_blocked",
      resolverStatus: "incomplete",
      wrapperDryRunStatus: "preflight_blocked",
      blockerCodes: ["publish_activation_gate_missing"],
      warnings: ["limitations_carried_forward"],
      limitationCodes: [],
      safeRefs: null,
      idempotencyKey: "airship-governed-dry-run:key",
      correlationId: "airship-governed-dry-run:corr",
      createdAt: "2026-09-10T12:21:00.000Z",
      completedAt: "2026-09-10T12:21:01.000Z",
    },
    dryRunResult: null,
    nextStep: "resolve listed blockers",
    mutationFlags: {
      dryRunRecordMutation: status === "created",
      dryRunAttemptExecuted: status === "created",
      dryRun: true,
      publishes: false,
      shadowPublish: false,
      runtimeMutation: false,
      activePointerChanged: false,
      liveSiteMutated: false,
      sourceCapture: false,
      providerCall: false,
    },
  };
}

test("airship governed dry-run route requires superadmin before running service", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipGovernedDryRunRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    runAirshipGovernedDryRun: async () => {
      serviceCalls += 1;
      return output();
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(serviceCalls, 0);
  assert.equal(payload.diagnostics.includes("airship_governed_dry_run_superadmin_required"), true);
  assert.equal(payload.mutationFlags.publishes, false);
  assert.equal(payload.mutationFlags.shadowPublish, false);
});

test("airship governed dry-run route runs one service call with readiness refs", async () => {
  const inputs: unknown[] = [];
  const handlers = createAirshipGovernedDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    runAirshipGovernedDryRun: async (input) => {
      inputs.push(input);
      return output("created");
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as AirshipGovernedDryRunOutput & { ok: boolean; labels: string[]; idempotency: { reused: boolean } };

  assert.equal(response.status, 201);
  assert.equal(payload.ok, true);
  assert.equal(payload.refs.readinessPackageId, READINESS_ID);
  assert.equal(payload.result.blockerCodes.includes("publish_activation_gate_missing"), true);
  assert.equal(payload.nextStep, "resolve listed blockers");
  assert.equal(payload.mutationFlags.dryRun, true);
  assert.equal(payload.mutationFlags.publishes, false);
  assert.equal(payload.mutationFlags.shadowPublish, false);
  assert.equal(payload.labels.includes("No publish"), true);
  assert.equal(inputs.length, 1);
});

test("airship governed dry-run route rejects invalid refs and forbidden execution fields", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipGovernedDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    runAirshipGovernedDryRun: async () => {
      serviceCalls += 1;
      return output();
    },
  });

  const response = await handlers.POST(request(body({
    migrationId: "",
    publish: true,
    shadowPublish: true,
    activePointer: "mutate",
  })));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 400);
  assert.equal(payload.diagnostics.includes("airship_governed_dry_run_migrationId_required"), true);
  assert.equal(payload.diagnostics.includes("airship_governed_dry_run_forbidden_field:publish"), true);
  assert.equal(payload.diagnostics.includes("airship_governed_dry_run_forbidden_field:shadowPublish"), true);
  assert.equal(payload.diagnostics.includes("airship_governed_dry_run_forbidden_field:activePointer"), true);
  assert.equal(payload.mutationFlags.publishes, false);
  assert.equal(serviceCalls, 0);
});

test("airship governed dry-run route refuses stale readiness from the service", async () => {
  const handlers = createAirshipGovernedDryRunRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    runAirshipGovernedDryRun: async () => {
      throw new Error("airship_governed_dry_run_candidate_version_mismatch");
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 409);
  assert.deepEqual(payload.diagnostics, ["airship_governed_dry_run_candidate_version_mismatch"]);
  assert.equal(payload.mutationFlags.liveSiteMutated, false);
});

test("airship governed dry-run action surface stays non-publishing", () => {
  const routeSources = `${readFileSync(ROUTE_HANDLER_SOURCE, "utf8")}\n${readFileSync(ROUTE_SOURCE, "utf8")}`;
  const uiSource = readFileSync(UI_SOURCE, "utf8");
  const serviceSource = readFileSync(SERVICE_SOURCE, "utf8");
  const shadowRouteSource = readFileSync(SHADOW_ROUTE_SOURCE, "utf8");

  assert.match(uiSource, /Run governed dry-run/);
  assert.match(uiSource, /no publish/);
  assert.match(uiSource, /no shadow-publish/);
  const uiFetchUrls = Array.from(uiSource.matchAll(/fetch\(["']([^"']+)["']/g), (match) => match[1]).sort();
  assert.deepEqual(uiFetchUrls, [
    "/api/gnr8/admin/airship/single-site/governed-dry-run",
    "/api/gnr8/admin/airship/single-site/publish-readiness",
  ]);
  assert.equal(uiFetchUrls.some((url) => /shadow-publish|source-capture|rollback/i.test(url)), false);
  assert.doesNotMatch(routeSources, /publishApprovedSiteVersion|switchActivePointer|archivePublishedVersionsExcept|runRollback|executeRollback|source-capture/i);
  assert.doesNotMatch(routeSources, /vercel|openprovider|registrar|dns-provider|stripe\.|new Stripe|ai_execution/i);
  assert.match(serviceSource, /dryRun:\s*true/);
  assert.doesNotMatch(shadowRouteSource, /airship\/single-site\/governed-dry-run/);
});
