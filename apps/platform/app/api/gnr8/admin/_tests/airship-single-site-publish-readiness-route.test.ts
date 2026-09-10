import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipSingleSitePublishReadinessRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/publish-readiness/airship-single-site-publish-readiness-route-handlers";
import type { AirshipDraftCandidatePreviewRef } from "@/gnr8/single-site/airship-single-site-draft-candidate-service";
import type { AirshipInternalPreviewCandidateReviewRecord } from "@/gnr8/single-site/airship-single-site-draft-candidate-review-service";
import type { PrepareAirshipPublishReadinessOutput } from "@/gnr8/single-site/airship-single-site-publish-readiness-service";
import type { AirshipSingleSiteDraftRecord } from "@/gnr8/single-site/airship-single-site-draft-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/publish-readiness/airship-single-site-publish-readiness-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/publish-readiness/route.ts");

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const REVIEW_ID = "33333333-3333-4333-8333-333333333333";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const CANDIDATE_ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/publish-readiness", {
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
    semanticWatermark: "airship-single-site-editor-draft:route-readiness",
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

function reviewRecord(overrides: Partial<AirshipInternalPreviewCandidateReviewRecord> = {}): AirshipInternalPreviewCandidateReviewRecord {
  return {
    id: REVIEW_ID,
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
    reviewedAt: "2026-09-10T12:18:00.750Z",
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
    createdAt: "2026-09-10T12:18:00.750Z",
    updatedAt: "2026-09-10T12:18:00.750Z",
    ...overrides,
  };
}

function readinessOutput(status: "created" | "reused" = "created"): PrepareAirshipPublishReadinessOutput {
  return {
    status,
    readiness: {
      id: "44444444-4444-4444-8444-444444444444",
      migrationId: MIGRATION_ID,
      reviewRecordId: REVIEW_ID,
      readinessStatus: "complete",
      nextStep: "governed dry-run later, not publish",
      siteClientSourceLabels: {
        tenantId: "tenant-synthetic",
        clientId: "client-synthetic",
        siteId: "site-synthetic",
        sourceUrl: "https://example-imported.test/",
        liveUrl: "https://example-imported.test/",
        importedSiteLabel: "example imported site",
      },
      reviewedCandidateSiteVersionId: CANDIDATE_VERSION_ID,
      reviewedArtifactId: CANDIDATE_ARTIFACT_ID,
      draftId: DRAFT_ID,
      draftVersion: 44,
      reviewStatus: "approved",
      reviewDecision: "approved_for_publish_readiness",
      reviewedAt: "2026-09-10T12:18:00.750Z",
      currentLiveActivePointerBefore: { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID },
      currentLiveActivePointerAfter: { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID },
      sourceEvidenceSummary: {
        status: "source_supported",
        detail: "1 source evidence item(s) available for example imported site.",
        evidenceItems: [{ label: "Hero headline", status: "present", detail: "Existing source headline." }],
      },
      savedDraftFieldSummary: [],
      internalPreviewUrl: `/api/gnr8/admin/single-site-studio/versions/${CANDIDATE_VERSION_ID}/preview?mode=transformed`,
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
      serviceVersion: "airship-6-publish-readiness-package:v1",
      idempotencyKey: "readiness-key",
      correlationId: "readiness-correlation",
      metadata: { internalPreviewOnly: true },
      createdAt: "2026-09-10T12:20:00.000Z",
      updatedAt: "2026-09-10T12:20:00.000Z",
    },
    mutationFlags: {
      readinessRecordMutation: status === "created",
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
  };
}

test("airship publish-readiness POST requires superadmin before reading records", async () => {
  let readDraftCalls = 0;
  const handlers = createAirshipSingleSitePublishReadinessRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    service: {
      async readCurrentDraft() {
        readDraftCalls += 1;
        return draftRecord();
      },
    },
  });

  const response = await handlers.POST(request({ actionMode: "prepare_publish_readiness", migrationId: MIGRATION_ID }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(readDraftCalls, 0);
  assert.equal(body.diagnostics.includes("airship_publish_readiness_superadmin_required"), true);
  assert.equal(body.mutationFlags.publishes, false);
});

test("airship publish-readiness POST rejects missing and invalid migration ids", async () => {
  let prepareCalls = 0;
  const handlers = createAirshipSingleSitePublishReadinessRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-readiness",
    service: {
      async readCurrentDraft() {
        return draftRecord();
      },
    },
    async prepareAirshipPublishReadiness() {
      prepareCalls += 1;
      return readinessOutput();
    },
  });

  const missing = await handlers.POST(request({ actionMode: "prepare_publish_readiness" }));
  const invalid = await handlers.POST(request({ actionMode: "prepare_publish_readiness", migrationId: "not-a-uuid" }));
  const missingBody = await missing.json() as { diagnostics: string[] };
  const invalidBody = await invalid.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(missing.status, 400);
  assert.equal(invalid.status, 400);
  assert.equal(missingBody.diagnostics.includes("airship_publish_readiness_migration_id_required"), true);
  assert.equal(invalidBody.diagnostics.includes("airship_publish_readiness_migration_id_invalid"), true);
  assert.equal(invalidBody.mutationFlags.readinessRecordMutation, false);
  assert.equal(prepareCalls, 0);
});

test("airship publish-readiness POST prepares latest reviewed candidate and is idempotent", async () => {
  let prepareCalls = 0;
  const handlers = createAirshipSingleSitePublishReadinessRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-readiness",
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
    async readLatestAirshipInternalPreviewCandidateReview(input) {
      assert.equal(input.migrationId, MIGRATION_ID);
      assert.equal(input.candidateSiteVersionId, CANDIDATE_VERSION_ID);
      return reviewRecord();
    },
    async getSingleSiteStudioReadonlyProjection() {
      return {
        summary: { site: "example imported site", liveSiteUrl: "https://example-imported.test/" },
        sourceEvidence: [{ label: "Hero headline", status: "present", detail: "Existing source headline." }],
      } as Awaited<ReturnType<typeof import("@/gnr8/single-site/single-site-studio-readonly-projection").getSingleSiteStudioReadonlyProjection>>;
    },
    async prepareAirshipPublishReadiness(input) {
      prepareCalls += 1;
      assert.equal(input.actorId, "superadmin-readiness");
      assert.equal(input.review?.id, REVIEW_ID);
      assert.equal(input.candidate.siteVersionId, CANDIDATE_VERSION_ID);
      return readinessOutput(prepareCalls === 1 ? "created" : "reused");
    },
  });

  const payload = {
    actionMode: "prepare_publish_readiness",
    migrationId: MIGRATION_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateRuntimeArtifactId: CANDIDATE_ARTIFACT_ID,
    reviewRecordId: REVIEW_ID,
  };
  const first = await handlers.POST(request(payload));
  const second = await handlers.POST(request(payload));
  const firstBody = await first.json() as { ok: boolean; readiness: Record<string, unknown>; mutationFlags: Record<string, boolean> };
  const secondBody = await second.json() as { idempotency: { reused: boolean }; mutationFlags: Record<string, boolean> };

  assert.equal(first.status, 201);
  assert.equal(firstBody.ok, true);
  assert.equal(firstBody.readiness.readinessStatus, "complete");
  assert.equal(firstBody.readiness.nextStep, "governed dry-run later, not publish");
  assert.equal(firstBody.mutationFlags.liveSiteMutated, false);
  assert.equal(firstBody.mutationFlags.activePointerChanged, false);
  assert.equal(firstBody.mutationFlags.publishes, false);
  assert.equal(second.status, 200);
  assert.equal(secondBody.idempotency.reused, true);
  assert.equal(secondBody.mutationFlags.readinessRecordMutation, false);
});

test("airship publish-readiness POST refuses stale requested review and forbidden controls", async () => {
  let prepareCalls = 0;
  const handlers = createAirshipSingleSitePublishReadinessRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-readiness",
    service: {
      async readCurrentDraft() {
        return draftRecord();
      },
    },
    async readLatestAirshipSingleSiteDraftCandidatePreview() {
      return candidatePreview();
    },
    async readLatestAirshipInternalPreviewCandidateReview() {
      return reviewRecord();
    },
    async prepareAirshipPublishReadiness() {
      prepareCalls += 1;
      return readinessOutput();
    },
  });

  const stale = await handlers.POST(request({
    actionMode: "prepare_publish_readiness",
    migrationId: MIGRATION_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateRuntimeArtifactId: CANDIDATE_ARTIFACT_ID,
    reviewRecordId: "55555555-5555-4555-8555-555555555555",
  }));
  const forbidden = await handlers.POST(request({
    actionMode: "prepare_publish_readiness",
    migrationId: MIGRATION_ID,
    publish: true,
  }));
  const staleBody = await stale.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };
  const forbiddenBody = await forbidden.json() as { diagnostics: string[] };

  assert.equal(stale.status, 409);
  assert.equal(staleBody.diagnostics.includes("airship_publish_readiness_review_record_mismatch"), true);
  assert.equal(staleBody.mutationFlags.sourceCapture, false);
  assert.equal(forbidden.status, 400);
  assert.equal(forbiddenBody.diagnostics.includes("airship_publish_readiness_forbidden_field:publish"), true);
  assert.equal(prepareCalls, 0);
});

test("airship publish-readiness route source stays readiness-only and non-publish", () => {
  const source = [
    readFileSync(ROUTE_HANDLER_SOURCE, "utf8"),
    readFileSync(ROUTE_SOURCE, "utf8"),
  ].join("\n");

  assert.equal(source.includes("requireSuperadminUserId"), true);
  assert.equal(source.includes("prepare_publish_readiness"), true);
  assert.equal(source.includes("providerCall: false"), true);
  assert.equal(source.includes("activePointerChanged: false"), true);
  assert.equal(source.includes("publishes: false"), true);
  assert.equal(source.includes("sourceCapture: false"), true);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|switchActivePointer|gnr8_runtime_active_pointers|source-capture|provider\/domains|openai/i);
});
