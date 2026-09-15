import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipSimplePromoteRollbackRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/rollback-simple-promote/airship-simple-promote-rollback-route-handlers";
import type { AirshipSimplePromoteRollbackOutput } from "@/gnr8/single-site/airship-simple-promote-rollback-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const PLATFORM_ROOT = path.resolve(TEST_DIR, "../../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/rollback-simple-promote/airship-simple-promote-rollback-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/rollback-simple-promote/route.ts");
const SERVICE_SOURCE = path.join(PLATFORM_ROOT, "gnr8/single-site/airship-simple-promote-rollback-service.ts");
const UI_SOURCE = path.join(APP_ROOT, "gnr8/airship/single-site/airship-simple-promote-rollback-action.tsx");

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const CURRENT_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const CURRENT_ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const ROLLBACK_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const ROLLBACK_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";
const PROMOTE_AUDIT_ROW_ID = "d873b627-bab9-4868-9def-e4772fb71f37";
const RUNTIME_SITE_ID = "site_57d9665a3a5867edf6ef";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/rollback-simple-promote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    migrationId: MIGRATION_ID,
    currentSiteVersionId: CURRENT_VERSION_ID,
    currentArtifactId: CURRENT_ARTIFACT_ID,
    rollbackSiteVersionId: ROLLBACK_VERSION_ID,
    rollbackArtifactId: ROLLBACK_ARTIFACT_ID,
    promoteAuditRowId: PROMOTE_AUDIT_ROW_ID,
    idempotencyKey: "airship-simple-promote-rollback:test-key",
    reason: "MVP recovery rollback",
    ...overrides,
  };
}

function output(): AirshipSimplePromoteRollbackOutput {
  return {
    ok: true,
    outcome: "rolled_back",
    rolledBack: true,
    noOp: false,
    serviceVersion: "airship-23-simple-promote-rollback:v1",
    previousPointer: { siteVersionId: CURRENT_VERSION_ID, artifactId: CURRENT_ARTIFACT_ID },
    currentPointer: { siteVersionId: CURRENT_VERSION_ID, artifactId: CURRENT_ARTIFACT_ID },
    restoredPointer: { siteVersionId: ROLLBACK_VERSION_ID, artifactId: ROLLBACK_ARTIFACT_ID },
    rollbackTarget: { siteVersionId: ROLLBACK_VERSION_ID, artifactId: ROLLBACK_ARTIFACT_ID },
    auditRefs: {
      source: "gnr8_runtime_version_audit",
      promoteAuditRowId: PROMOTE_AUDIT_ROW_ID,
      preRollbackAudit: "airship-simple-promote-rollback:pre_rollback:abc",
      postRollbackAudit: "airship-simple-promote-rollback:post_rollback_readback:def",
      siteVersionId: ROLLBACK_VERSION_ID,
    },
    refs: {
      migrationId: MIGRATION_ID,
      runtimeSiteId: RUNTIME_SITE_ID,
      currentSiteVersionId: CURRENT_VERSION_ID,
      currentArtifactId: CURRENT_ARTIFACT_ID,
      rollbackSiteVersionId: ROLLBACK_VERSION_ID,
      rollbackArtifactId: ROLLBACK_ARTIFACT_ID,
      promoteAuditRef: null,
      promoteAuditRowId: PROMOTE_AUDIT_ROW_ID,
      idempotencyKey: "airship-simple-promote-rollback:test-key",
    },
  };
}

test("airship simple promote rollback route requires superadmin before running service", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipSimplePromoteRollbackRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    rollbackAirshipSimplePromoteToPreviousPointer: async () => {
      serviceCalls += 1;
      return output();
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(serviceCalls, 0);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_superadmin_required"), true);
  assert.equal(payload.mutationFlags.activePointerMayChange, false);
  assert.equal(payload.mutationFlags.providerCall, false);
});

test("airship simple promote rollback route accepts only narrow body fields", async () => {
  const inputs: unknown[] = [];
  const handlers = createAirshipSimplePromoteRollbackRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    rollbackAirshipSimplePromoteToPreviousPointer: async (input) => {
      inputs.push(input);
      return output();
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as AirshipSimplePromoteRollbackOutput & { mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.rolledBack, true);
  assert.equal(payload.auditRefs.source, "gnr8_runtime_version_audit");
  assert.equal(payload.mutationFlags.providerCall, false);
  assert.deepEqual(inputs, [
    {
      migrationId: MIGRATION_ID,
      currentSiteVersionId: CURRENT_VERSION_ID,
      currentArtifactId: CURRENT_ARTIFACT_ID,
      rollbackSiteVersionId: ROLLBACK_VERSION_ID,
      rollbackArtifactId: ROLLBACK_ARTIFACT_ID,
      promoteAuditRef: null,
      promoteAuditRowId: PROMOTE_AUDIT_ROW_ID,
      idempotencyKey: "airship-simple-promote-rollback:test-key",
      reason: "MVP recovery rollback",
      actorId: "superadmin-airship",
    },
  ]);
});

test("airship simple promote rollback route rejects invalid refs and forbidden overrides", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipSimplePromoteRollbackRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    rollbackAirshipSimplePromoteToPreviousPointer: async () => {
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
    siteId: RUNTIME_SITE_ID,
  })));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 400);
  assert.equal(serviceCalls, 0);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_migrationId_required"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:actorId"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:providerPayload"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:publishChain"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:dryRun"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:shadowPublish"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:rollback"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:sourceCapture"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:activePointer"), true);
  assert.equal(payload.diagnostics.includes("airship_simple_promote_rollback_forbidden_field:siteId"), true);
  assert.equal(payload.mutationFlags.activePointerMayChange, false);
});

test("airship simple promote rollback route reports service refusal without side paths", async () => {
  const handlers = createAirshipSimplePromoteRollbackRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    rollbackAirshipSimplePromoteToPreviousPointer: async () => {
      throw new Error("airship_simple_promote_rollback_current_active_pointer_mismatch");
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 409);
  assert.deepEqual(payload.diagnostics, ["airship_simple_promote_rollback_current_active_pointer_mismatch"]);
  assert.equal(payload.mutationFlags.providerCall, false);
});

test("airship simple promote rollback action surface has only rollback POST surface", () => {
  const routeSources = `${readFileSync(ROUTE_HANDLER_SOURCE, "utf8")}\n${readFileSync(ROUTE_SOURCE, "utf8")}`;
  const serviceSource = readFileSync(SERVICE_SOURCE, "utf8");
  const uiSource = readFileSync(UI_SOURCE, "utf8");
  const uiFetchUrls = Array.from(uiSource.matchAll(/fetch\(["']([^"']+)["']/g), (match) => match[1]).sort();

  assert.deepEqual(uiFetchUrls, ["/api/gnr8/admin/airship/single-site/rollback-simple-promote"]);
  assert.match(uiSource, /Admin-only destructive rollback/);
  assert.match(uiSource, /Rollback active pointer/);
  assert.doesNotMatch(uiSource, /publish-readiness|governed-dry-run|shadow-publish|source-capture|OpenAI|provider\/openai/i);
  assert.doesNotMatch(routeSources, /publishApprovedSiteVersion|archivePublishedVersionsExcept|source-capture|provider\/openai/i);
  assert.doesNotMatch(routeSources, /vercel|openprovider|registrar|dns-provider|stripe\.|new Stripe|ai_execution/i);
  assert.doesNotMatch(serviceSource, /publishApprovedSiteVersion|archivePublishedVersionsExcept|source-capture|provider\/openai/i);
  assert.doesNotMatch(serviceSource, /vercel|openprovider|registrar|dns-provider|stripe\.|new Stripe|ai_execution/i);
  assert.match(serviceSource, /switchActivePointer/);
  assert.match(serviceSource, /recordPublishActivationAudit/);
});
