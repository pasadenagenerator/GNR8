import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipPublishActivationChainRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/publish-activation-chain/airship-publish-activation-chain-route-handlers";
import type { AirshipPublishActivationChainRecord } from "@/gnr8/single-site/airship-publish-activation-chain-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/publish-activation-chain/airship-publish-activation-chain-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/publish-activation-chain/route.ts");
const UI_SOURCE = path.join(APP_ROOT, "gnr8/airship/single-site/airship-publish-readiness-action.tsx");

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const READINESS_ID = "3fdcde40-e178-40b5-83e1-217d600315ef";
const REVIEW_ID = "4bcca499-468b-40ff-b124-9cee88061263";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/publish-activation-chain", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function body(overrides: Record<string, unknown> = {}) {
  return {
    actionMode: "create_publish_activation_chain",
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

function chain(): AirshipPublishActivationChainRecord {
  return {
    serviceVersion: "airship-24-publish-activation-chain:v1",
    readinessPackageId: READINESS_ID,
    reviewRecordId: REVIEW_ID,
    candidateVersionId: CANDIDATE_VERSION_ID,
    artifactId: ARTIFACT_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    activationEvidencePackage: { id: "11111111-1111-4111-8111-111111111111", ref: "aaf:evidence_package:11111111-1111-4111-8111-111111111111", status: "created", sourceWatermark: "wm:evidence" },
    activationRequest: { id: "22222222-2222-4222-8222-222222222222", ref: "aaf:approval_request:22222222-2222-4222-8222-222222222222", status: "requested" },
    activationDecision: { id: "33333333-3333-4333-8333-333333333333", ref: "aaf:approval_decision:33333333-3333-4333-8333-333333333333", status: "granted_with_limitations" },
    gateAttempt: { id: "44444444-4444-4444-8444-444444444444", ref: "aaf:action_gate_attempt:44444444-4444-4444-8444-444444444444", status: "warning", gateResult: "allowed" },
    gateInputWatermark: `single-site-publish-activation-gate-input:${"a".repeat(64)}`,
    handoffWatermark: `single-site-publish-activation-gate-handoff:${"b".repeat(64)}`,
    evidenceSourceRefs: {
      readinessPackageRef: { role: "airship_readiness_package", sourceTable: "gnr8_airship_publish_readiness_packages", sourceRecordId: READINESS_ID, sourceRef: `gnr8:gnr8_airship_publish_readiness_packages:${READINESS_ID}`, sourceWatermark: "wm:readiness" },
      reviewRecordRef: { role: "airship_review_record", sourceTable: "gnr8_airship_internal_preview_candidate_reviews", sourceRecordId: REVIEW_ID, sourceRef: `gnr8:gnr8_airship_internal_preview_candidate_reviews:${REVIEW_ID}`, sourceWatermark: "wm:review" },
      candidateSourceRef: { role: "improved_candidate_site_version", sourceTable: "gnr8_runtime_site_versions", sourceRecordId: CANDIDATE_VERSION_ID, sourceRef: `gnr8:gnr8_runtime_site_versions:${CANDIDATE_VERSION_ID}`, sourceWatermark: "wm:candidate" },
      artifactSourceRef: { role: "improved_runtime_artifact", sourceTable: "gnr8_runtime_artifacts", sourceRecordId: ARTIFACT_ID, sourceRef: `gnr8:gnr8_runtime_artifacts:${ARTIFACT_ID}`, sourceWatermark: "wm:artifact" },
      draftSourceRef: { role: "airship_draft", sourceTable: "gnr8_airship_single_site_editor_drafts", sourceRecordId: DRAFT_ID, sourceRef: `gnr8:gnr8_airship_single_site_editor_drafts:${DRAFT_ID}`, sourceWatermark: "wm:draft" },
    },
    publishTargetRef: { role: "publish_target", sourceTable: "gnr8_publish_targets", sourceRecordId: "production", sourceRef: "gnr8:gnr8_publish_targets:production", sourceWatermark: "wm:production" },
    activePointerBefore: { siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f", artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254" },
    activePointerAfter: { siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f", artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254" },
    nextStep: "governed dry-run, not publish",
    idempotencyKey: "airship-publish-activation-chain:key",
    correlationId: "airship-publish-activation-chain:corr",
    createdAt: "2026-09-10T12:30:00.000Z",
    mutationFlags: {
      activationMetadataMutation: true,
      createsApprovalRequest: true,
      createsApprovalDecision: true,
      createsGateAttempt: true,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      activePointerChanged: false,
      runtimeMutation: false,
      liveSiteMutated: false,
      providerCall: false,
    },
  };
}

test("Airship activation-chain route requires superadmin before service work", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipPublishActivationChainRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    createAirshipPublishActivationChain: async () => {
      serviceCalls += 1;
      return { status: "created", chain: chain() };
    },
  });

  const response = await handlers.POST(request(body()));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(serviceCalls, 0);
  assert.equal(payload.diagnostics.includes("airship_publish_activation_chain_superadmin_required"), true);
  assert.equal(payload.mutationFlags.publishes, false);
  assert.equal(payload.mutationFlags.dryRun, false);
});

test("Airship activation-chain route creates or reuses one metadata-only chain", async () => {
  const inputs: unknown[] = [];
  const handlers = createAirshipPublishActivationChainRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    createAirshipPublishActivationChain: async (input) => {
      inputs.push(input);
      return { status: inputs.length === 1 ? "created" : "reused", chain: chain() };
    },
  });

  const first = await handlers.POST(request(body()));
  const second = await handlers.POST(request(body()));
  const firstPayload = await first.json() as { ok: boolean; chain: AirshipPublishActivationChainRecord; labels: string[]; mutationFlags: Record<string, boolean> };
  const secondPayload = await second.json() as { idempotency: { reused: boolean }; mutationFlags: Record<string, boolean> };

  assert.equal(first.status, 201);
  assert.equal(firstPayload.ok, true);
  assert.equal(firstPayload.chain.activationRequest.id, "22222222-2222-4222-8222-222222222222");
  assert.equal(firstPayload.chain.activationDecision.id, "33333333-3333-4333-8333-333333333333");
  assert.equal(firstPayload.chain.gateAttempt.id, "44444444-4444-4444-8444-444444444444");
  assert.notEqual(firstPayload.chain.activationRequest.id, READINESS_ID);
  assert.equal(firstPayload.labels.includes("No publish"), true);
  assert.equal(firstPayload.labels.includes("No dry-run"), true);
  assert.equal(firstPayload.mutationFlags.publishes, false);
  assert.equal(firstPayload.mutationFlags.shadowPublish, false);
  assert.equal(firstPayload.mutationFlags.activePointerChanged, false);
  assert.equal(second.status, 200);
  assert.equal(secondPayload.idempotency.reused, true);
  assert.equal(secondPayload.mutationFlags.dryRun, false);
  assert.equal(inputs.length, 2);
});

test("Airship activation-chain route rejects invalid refs and forbidden execution controls", async () => {
  let serviceCalls = 0;
  const handlers = createAirshipPublishActivationChainRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    createAirshipPublishActivationChain: async () => {
      serviceCalls += 1;
      return { status: "created", chain: chain() };
    },
  });

  const response = await handlers.POST(request(body({
    migrationId: "",
    publish: true,
    dryRun: true,
    shadowPublish: true,
    activePointer: "mutate",
  })));
  const payload = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 400);
  assert.equal(payload.diagnostics.includes("airship_publish_activation_chain_migrationId_required"), true);
  assert.equal(payload.diagnostics.includes("airship_publish_activation_chain_forbidden_field:publish"), true);
  assert.equal(payload.diagnostics.includes("airship_publish_activation_chain_forbidden_field:dryRun"), true);
  assert.equal(payload.diagnostics.includes("airship_publish_activation_chain_forbidden_field:shadowPublish"), true);
  assert.equal(payload.diagnostics.includes("airship_publish_activation_chain_forbidden_field:activePointer"), true);
  assert.equal(payload.mutationFlags.liveSiteMutated, false);
  assert.equal(serviceCalls, 0);
});

test("Airship activation-chain action surface exposes only metadata preparation", () => {
  const routeSources = `${readFileSync(ROUTE_HANDLER_SOURCE, "utf8")}\n${readFileSync(ROUTE_SOURCE, "utf8")}`;
  const uiSource = readFileSync(UI_SOURCE, "utf8");

  assert.match(uiSource, /Create publish activation chain/);
  assert.match(uiSource, /approval\/gate metadata only/);
  assert.match(uiSource, /no publish/);
  assert.match(uiSource, /no dry-run/);
  assert.match(uiSource, /no shadow-publish/);
  const uiFetchUrls = Array.from(uiSource.matchAll(/fetch\(["']([^"']+)["']/g), (match) => match[1]).sort();
  assert.deepEqual(uiFetchUrls, [
    "/api/gnr8/admin/airship/single-site/governed-dry-run",
    "/api/gnr8/admin/airship/single-site/publish-activation-chain",
    "/api/gnr8/admin/airship/single-site/publish-readiness",
  ]);
  assert.doesNotMatch(routeSources, /publishApprovedSiteVersion|switchActivePointer|archivePublishedVersionsExcept|runRollback|executeRollback|source-capture/i);
  assert.doesNotMatch(routeSources, /vercel|openprovider|registrar|dns-provider|stripe\.|new Stripe|ai_execution/i);
});
