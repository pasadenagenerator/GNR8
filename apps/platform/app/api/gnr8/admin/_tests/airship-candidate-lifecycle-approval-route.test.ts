import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipCandidateLifecycleApprovalRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/approve-candidate-lifecycle/airship-candidate-lifecycle-approval-route-handlers";
import type { AirshipCandidateLifecycleApprovalOutput } from "@/gnr8/single-site/airship-candidate-lifecycle-approval-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const PLATFORM_ROOT = path.resolve(TEST_DIR, "../../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/approve-candidate-lifecycle/airship-candidate-lifecycle-approval-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/approve-candidate-lifecycle/route.ts");
const SERVICE_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/airship-candidate-lifecycle-approval-service.ts");

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const READINESS_ID = "3fdcde40-e178-40b5-83e1-217d600315ef";
const REVIEW_ID = "4bcca499-468b-40ff-b124-9cee88061263";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/approve-candidate-lifecycle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    migrationId: MIGRATION_ID,
    readinessPackageId: READINESS_ID,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    artifactId: ARTIFACT_ID,
    idempotencyKey: "airship-candidate-lifecycle:test-key",
    reason: "MVP recovery",
    ...overrides,
  };
}

function output(): AirshipCandidateLifecycleApprovalOutput {
  return {
    ok: true,
    outcome: "approved",
    changed: true,
    serviceVersion: "airship-23-candidate-lifecycle-approval:v1",
    previousState: "DRAFT",
    newState: "APPROVED",
    activePointer: { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID },
    activePointerChanged: false,
    artifactStageUnchanged: true,
    auditRefs: {
      source: "gnr8_runtime_version_audit",
      transitionAuditMarkers: ["airship-candidate-lifecycle:draft_to_ready_for_review:abc", "airship-candidate-lifecycle:ready_for_review_to_approved:def"],
      siteVersionId: CANDIDATE_VERSION_ID,
    },
    refs: {
      migrationId: MIGRATION_ID,
      readinessPackageId: READINESS_ID,
      reviewId: REVIEW_ID,
      candidateSiteVersionId: CANDIDATE_VERSION_ID,
      artifactId: ARTIFACT_ID,
      siteId: "site-chs",
      idempotencyKey: "airship-candidate-lifecycle:test-key",
    },
  };
}

test("airship candidate lifecycle route requires superadmin before running service", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipCandidateLifecycleApprovalRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    approveAirshipCandidateLifecycle: async () => {
      serviceCalls += 1;
      return output();
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(serviceCalls, 0);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_superadmin_required"), true);
  assert.equal(payload.mutationFlags.activePointerMayChange, false);
  assert.equal(payload.mutationFlags.providerCall, false);
});

test("airship candidate lifecycle route accepts only narrow body fields", async () => {
  const inputs: unknown[] = [];
  const handlers = createAirshipCandidateLifecycleApprovalRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    approveAirshipCandidateLifecycle: async (input) => {
      inputs.push(input);
      return output();
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as AirshipCandidateLifecycleApprovalOutput & { mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.changed, true);
  assert.equal(payload.auditRefs.source, "gnr8_runtime_version_audit");
  assert.equal(payload.mutationFlags.activePointerMayChange, false);
  assert.equal(payload.mutationFlags.activePointerChanged, false);
  assert.deepEqual(inputs, [
    {
      migrationId: MIGRATION_ID,
      readinessPackageId: READINESS_ID,
      candidateSiteVersionId: CANDIDATE_VERSION_ID,
      artifactId: ARTIFACT_ID,
      idempotencyKey: "airship-candidate-lifecycle:test-key",
      reason: "MVP recovery",
      actorId: "superadmin-airship",
    },
  ]);
});

test("airship candidate lifecycle route rejects invalid refs and forbidden overrides", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipCandidateLifecycleApprovalRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    approveAirshipCandidateLifecycle: async () => {
      serviceCalls += 1;
      return output();
    },
  });

  const response = await handlers.POST(request(body({
    migrationId: "",
    actorId: "request-actor",
    providerPayload: {},
    publishChain: {},
    dryRun: true,
    shadowPublish: true,
    rollback: true,
    sourceCapture: true,
    activePointer: "override",
  })));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 400);
  assert.equal(serviceCalls, 0);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_migrationId_required"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:actorId"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:providerPayload"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:publishChain"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:dryRun"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:shadowPublish"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:rollback"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:sourceCapture"), true);
  assert.equal(payload.diagnostics.includes("airship_candidate_lifecycle_forbidden_field:activePointer"), true);
  assert.equal(payload.mutationFlags.lifecycleStateMayChange, false);
});

test("airship candidate lifecycle route reports service blockers", async () => {
  const handlers = createAirshipCandidateLifecycleApprovalRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    approveAirshipCandidateLifecycle: async () => {
      throw new Error("airship_candidate_lifecycle_candidate_already_live_pointer");
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as { diagnostics: string[] };

  assert.equal(response.status, 409);
  assert.deepEqual(payload.diagnostics, ["airship_candidate_lifecycle_candidate_already_live_pointer"]);
});

test("airship candidate lifecycle action surface has no promote or pointer side paths", () => {
  const routeSources = `${readFileSync(ROUTE_HANDLER_SOURCE, "utf8")}\n${readFileSync(ROUTE_SOURCE, "utf8")}`;
  const serviceSource = readFileSync(SERVICE_SOURCE, "utf8");
  const combined = `${routeSources}\n${serviceSource}`;

  assert.doesNotMatch(combined, /switchActivePointer|publishApprovedSiteVersion|archivePublishedVersionsExcept|runRollback|executeRollback|source-capture/i);
  assert.doesNotMatch(combined, /simplePromote|promoteAirship|promote-to-live/i);
  assert.doesNotMatch(combined, /vercel|openprovider|registrar|dns-provider|stripe\.|new Stripe|ai_execution|provider\/openai/i);
  assert.match(serviceSource, /transitionSiteVersionState/);
});
