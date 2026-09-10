import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipSingleSiteDraftCandidateReviewRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/draft-candidate-review/airship-single-site-draft-candidate-review-route-handlers";
import type { ApproveAirshipInternalPreviewCandidateOutput } from "@/gnr8/single-site/airship-single-site-draft-candidate-review-service";
import type { AirshipDraftCandidatePreviewRef } from "@/gnr8/single-site/airship-single-site-draft-candidate-service";
import type { AirshipSingleSiteDraftRecord } from "@/gnr8/single-site/airship-single-site-draft-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/draft-candidate-review/airship-single-site-draft-candidate-review-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/draft-candidate-review/route.ts");

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const CANDIDATE_ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/draft-candidate-review", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function draftRecord(): AirshipSingleSiteDraftRecord {
  return {
    id: DRAFT_ID,
    migrationId: MIGRATION_ID,
    tenantId: "tenant-synthetic",
    clientId: "client-synthetic",
    siteId: "site-synthetic",
    agencyId: null,
    sourceUrl: "https://example-imported.test/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: null,
      originalCloneRuntimeArtifactId: null,
      improvedCandidateSiteVersionId: LIVE_VERSION_ID,
      improvedCandidateRuntimeArtifactId: LIVE_ARTIFACT_ID,
    },
    draftEdits: [],
    draftStatus: "accepted",
    version: 44,
    semanticWatermark: "airship-single-site-editor-draft:route-review",
    metadata: { liveBoundary: "not_applied_to_live_site" },
    createdByActorId: "superadmin-route",
    updatedByActorId: "superadmin-route",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:05:00.000Z",
  };
}

function candidatePreview(overrides: Partial<AirshipDraftCandidatePreviewRef> = {}): AirshipDraftCandidatePreviewRef {
  return {
    label: "New Airship draft candidate preview",
    siteVersionId: CANDIDATE_VERSION_ID,
    runtimeArtifactId: CANDIDATE_ARTIFACT_ID,
    route: `/api/gnr8/admin/single-site-studio/versions/${CANDIDATE_VERSION_ID}/preview?mode=transformed`,
    mode: "transformed",
    available: true,
    unavailableReason: null,
    authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
    statusLabel: "Not live, internal preview only",
    sourceLiveSiteVersionId: LIVE_VERSION_ID,
    sourceLiveRuntimeArtifactId: LIVE_ARTIFACT_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    styleSettings: {
      heroTopPadding: 96,
      heroBottomPadding: 104,
      backgroundTint: "#eef6ff",
      ctaColor: "#1d4ed8",
    },
    appliedEdits: [],
    skippedEdits: [],
    ...overrides,
  };
}

function reviewOutput(status: "created" | "reused" = "created"): ApproveAirshipInternalPreviewCandidateOutput {
  return {
    status,
    review: {
      id: "33333333-3333-4333-8333-333333333333",
      migrationId: MIGRATION_ID,
      draftId: DRAFT_ID,
      draftVersion: 44,
      candidateSiteVersionId: CANDIDATE_VERSION_ID,
      candidateRuntimeArtifactId: CANDIDATE_ARTIFACT_ID,
      reviewDecision: "approved_for_publish_readiness",
      reviewStatus: "approved",
      publishReadinessReady: true,
      reviewerActorId: "superadmin-reviewer",
      reviewerActorType: "human",
      reviewerActorRole: "platform_superadmin",
      reviewedAt: "2026-09-10T00:08:00.000Z",
      limitationsNotes: "Internal preview only; not live, not published; active pointer unchanged.",
      nextStep: "publish-readiness evaluation, not publish",
      activePointerSiteVersionId: LIVE_VERSION_ID,
      activePointerArtifactId: LIVE_ARTIFACT_ID,
      activePointerChanged: false,
      runtimeVersionStateMutated: false,
      liveSiteMutated: false,
      published: false,
      serviceVersion: "airship-5-internal-preview-candidate-review:v1",
      idempotencyKey: "review-key",
      correlationId: "review-correlation",
      metadata: { internalPreviewOnly: true },
      createdAt: "2026-09-10T00:08:00.000Z",
      updatedAt: "2026-09-10T00:08:00.000Z",
    },
    mutationFlags: {
      reviewRecordMutation: status === "created",
      runtimeVersionMutation: false,
      previewArtifactMutation: false,
      liveSiteMutation: false,
      activePointerMutation: false,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      providerCall: false,
    },
  };
}

test("airship preview review POST requires superadmin before reading draft or candidate", async () => {
  let readDraftCalls = 0;
  let readCandidateCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateReviewRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    service: {
      async readCurrentDraft() {
        readDraftCalls += 1;
        return draftRecord();
      },
    },
    async readLatestAirshipSingleSiteDraftCandidatePreview() {
      readCandidateCalls += 1;
      return candidatePreview();
    },
  });

  const response = await handlers.POST(request({
    actionMode: "approve_internal_preview_for_publish_readiness",
    migrationId: MIGRATION_ID,
  }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(readDraftCalls, 0);
  assert.equal(readCandidateCalls, 0);
  assert.equal(body.diagnostics.includes("airship_preview_review_superadmin_required"), true);
  assert.equal(body.mutationFlags.activePointerMutation, false);
});

test("airship preview review POST rejects missing and invalid migration ids", async () => {
  let approveCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateReviewRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-reviewer",
    service: {
      async readCurrentDraft() {
        return draftRecord();
      },
    },
    async readLatestAirshipSingleSiteDraftCandidatePreview() {
      return candidatePreview();
    },
    async approveAirshipInternalPreviewCandidateForPublishReadiness() {
      approveCalls += 1;
      return reviewOutput();
    },
  });

  const missing = await handlers.POST(request({ actionMode: "approve_internal_preview_for_publish_readiness" }));
  const invalid = await handlers.POST(request({ actionMode: "approve_internal_preview_for_publish_readiness", migrationId: "not-a-uuid" }));
  const missingBody = await missing.json() as { diagnostics: string[] };
  const invalidBody = await invalid.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(missing.status, 400);
  assert.equal(invalid.status, 400);
  assert.equal(missingBody.diagnostics.includes("airship_preview_review_migration_id_required"), true);
  assert.equal(invalidBody.diagnostics.includes("airship_preview_review_migration_id_invalid"), true);
  assert.equal(invalidBody.mutationFlags.reviewRecordMutation, false);
  assert.equal(approveCalls, 0);
});

test("airship preview review POST approves latest candidate and is idempotent", async () => {
  let approveCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateReviewRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-reviewer",
    service: {
      async readCurrentDraft(migrationId) {
        assert.equal(migrationId, MIGRATION_ID);
        return draftRecord();
      },
    },
    async readLatestAirshipSingleSiteDraftCandidatePreview(input) {
      assert.equal(input.migrationId, MIGRATION_ID);
      assert.equal(input.draftId, DRAFT_ID);
      return candidatePreview();
    },
    async approveAirshipInternalPreviewCandidateForPublishReadiness(input) {
      approveCalls += 1;
      assert.equal(input.reviewerActorId, "superadmin-reviewer");
      assert.equal(input.draft.id, DRAFT_ID);
      assert.equal(input.candidate.siteVersionId, CANDIDATE_VERSION_ID);
      return reviewOutput(approveCalls === 1 ? "created" : "reused");
    },
  });

  const payload = {
    actionMode: "approve_internal_preview_for_publish_readiness",
    migrationId: MIGRATION_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateRuntimeArtifactId: CANDIDATE_ARTIFACT_ID,
  };
  const first = await handlers.POST(request(payload));
  const second = await handlers.POST(request(payload));
  const firstBody = await first.json() as { ok: boolean; review: Record<string, unknown>; mutationFlags: Record<string, boolean> };
  const secondBody = await second.json() as { idempotency: { reused: boolean }; mutationFlags: Record<string, boolean> };

  assert.equal(first.status, 201);
  assert.equal(firstBody.ok, true);
  assert.equal(firstBody.review.reviewDecision, "approved_for_publish_readiness");
  assert.equal(firstBody.review.nextStep, "publish-readiness evaluation, not publish");
  assert.equal(firstBody.mutationFlags.liveSiteMutation, false);
  assert.equal(firstBody.mutationFlags.activePointerMutation, false);
  assert.equal(firstBody.mutationFlags.publishes, false);
  assert.equal(second.status, 200);
  assert.equal(secondBody.idempotency.reused, true);
  assert.equal(secondBody.mutationFlags.reviewRecordMutation, false);
});

test("airship preview review POST refuses stale requested candidate/draft refs", async () => {
  let approveCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateReviewRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-reviewer",
    service: {
      async readCurrentDraft() {
        return draftRecord();
      },
    },
    async readLatestAirshipSingleSiteDraftCandidatePreview() {
      return candidatePreview();
    },
    async approveAirshipInternalPreviewCandidateForPublishReadiness() {
      approveCalls += 1;
      return reviewOutput();
    },
  });

  const response = await handlers.POST(request({
    actionMode: "approve_internal_preview_for_publish_readiness",
    migrationId: MIGRATION_ID,
    draftId: DRAFT_ID,
    draftVersion: 43,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateRuntimeArtifactId: CANDIDATE_ARTIFACT_ID,
  }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 409);
  assert.equal(body.diagnostics.includes("airship_preview_review_draft_version_mismatch"), true);
  assert.equal(body.mutationFlags.reviewRecordMutation, false);
  assert.equal(approveCalls, 0);
});

test("airship preview review route source stays review-only and non-publish", () => {
  const source = [
    readFileSync(ROUTE_HANDLER_SOURCE, "utf8"),
    readFileSync(ROUTE_SOURCE, "utf8"),
  ].join("\n");

  assert.equal(source.includes("requireSuperadminUserId"), true);
  assert.equal(source.includes("approve_internal_preview_for_publish_readiness"), true);
  assert.equal(source.includes("providerCall: false"), true);
  assert.equal(source.includes("activePointerMutation: false"), true);
  assert.equal(source.includes("publishes: false"), true);
  assert.equal(source.includes("sourceCapture: false"), true);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|switchActivePointer|gnr8_runtime_active_pointers|source-capture|provider\/domains|openai/i);
});
