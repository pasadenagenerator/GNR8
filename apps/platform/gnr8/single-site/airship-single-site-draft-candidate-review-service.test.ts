import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeArtifact, CanonicalSiteVersionSnapshot } from "../runtime/types";
import {
  AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_REVIEW_SERVICE_VERSION,
  approveAirshipInternalPreviewCandidateForPublishReadiness,
  type AirshipInternalPreviewCandidateReviewRecord,
  type AirshipInternalPreviewCandidateReviewRepository,
} from "./airship-single-site-draft-candidate-review-service";
import type { AirshipDraftCandidatePreviewRef } from "./airship-single-site-draft-candidate-service";
import type { AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const CANDIDATE_ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";

function draft(overrides: Partial<AirshipSingleSiteDraftRecord> = {}): AirshipSingleSiteDraftRecord {
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
    draftEdits: [
      {
        id: "airship-example-home-hero-headline",
        fieldKey: "headline",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Existing source headline.",
        proposedTextContent: "Synthetic imported-site headline",
        reasonForChange: "Source-supported operator edit.",
        status: "accepted",
        previewImpact: "Internal preview only.",
      },
    ],
    draftStatus: "accepted",
    version: 44,
    semanticWatermark: "airship-single-site-editor-draft:synthetic",
    metadata: { liveBoundary: "not_applied_to_live_site" },
    createdByActorId: "superadmin-test",
    updatedByActorId: "superadmin-test",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:05:00.000Z",
    ...overrides,
  };
}

function candidate(overrides: Partial<AirshipDraftCandidatePreviewRef> = {}): AirshipDraftCandidatePreviewRef {
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

function candidateVersion(state: CanonicalSiteVersionSnapshot["state"] = "DRAFT"): CanonicalSiteVersionSnapshot {
  return {
    id: CANDIDATE_VERSION_ID,
    siteId: "runtime-synthetic",
    versionNo: 12,
    state,
    source: "manual",
    actor: "superadmin-test:airship-draft-candidate",
    createdAt: "2026-09-10T00:06:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: CANDIDATE_ARTIFACT_ID,
    importProvenanceSummary: null,
    pages: [],
  };
}

function artifact(publishStage: RuntimeArtifact["publishStage"] = "shadow"): RuntimeArtifact {
  return {
    id: CANDIDATE_ARTIFACT_ID,
    siteId: "runtime-synthetic",
    siteVersionId: CANDIDATE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    bundleSha256: "bundle-synthetic",
    htmlByPath: { "/": "<html><body>Synthetic imported-site headline</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { sourceKind: "airship_single_site_draft_candidate" },
    publishStage,
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY"],
      pageRolloutPolicyState: ["AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY",
      siteRolloutPolicyState: "AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage,
    },
    createdAt: "2026-09-10T00:07:00.000Z",
  };
}

class MemoryReviewRepository implements AirshipInternalPreviewCandidateReviewRepository {
  readonly records = new Map<string, AirshipInternalPreviewCandidateReviewRecord>();

  async createOrReuseReview(input: Parameters<AirshipInternalPreviewCandidateReviewRepository["createOrReuseReview"]>[0]) {
    const key = [
      input.migrationId,
      input.draftId,
      input.draftVersion,
      input.candidateSiteVersionId,
      input.candidateRuntimeArtifactId,
      input.reviewDecision,
    ].join(":");
    const existing = this.records.get(key);
    if (existing) return { status: "reused" as const, review: existing };
    const review: AirshipInternalPreviewCandidateReviewRecord = {
      id: "33333333-3333-4333-8333-333333333333",
      migrationId: input.migrationId,
      draftId: input.draftId,
      draftVersion: input.draftVersion,
      candidateSiteVersionId: input.candidateSiteVersionId,
      candidateRuntimeArtifactId: input.candidateRuntimeArtifactId,
      reviewDecision: input.reviewDecision,
      reviewStatus: "approved",
      publishReadinessReady: true,
      reviewerActorId: input.reviewerActorId,
      reviewerActorType: "human",
      reviewerActorRole: "platform_superadmin",
      reviewedAt: "2026-09-10T00:08:00.000Z",
      limitationsNotes: input.limitationsNotes,
      nextStep: "publish-readiness evaluation, not publish",
      activePointerSiteVersionId: input.activePointer?.siteVersionId ?? null,
      activePointerArtifactId: input.activePointer?.artifactId ?? null,
      activePointerChanged: false,
      runtimeVersionStateMutated: false,
      liveSiteMutated: false,
      published: false,
      serviceVersion: AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_REVIEW_SERVICE_VERSION,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      metadata: input.metadata,
      createdAt: "2026-09-10T00:08:00.000Z",
      updatedAt: "2026-09-10T00:08:00.000Z",
    };
    this.records.set(key, review);
    return { status: "created" as const, review };
  }

  async readLatestReview() {
    return Array.from(this.records.values())[0] ?? null;
  }
}

function deps(overrides: {
  version?: CanonicalSiteVersionSnapshot;
  artifact?: RuntimeArtifact;
  activePointer?: { siteVersionId: string; artifactId: string } | null;
  repository?: MemoryReviewRepository;
} = {}) {
  const repository = overrides.repository ?? new MemoryReviewRepository();
  const calls: string[] = [];
  return {
    calls,
    repository,
    getSiteVersion: async () => {
      calls.push("getSiteVersion");
      return overrides.version ?? candidateVersion();
    },
    getArtifactById: async () => {
      calls.push("getArtifactById");
      return overrides.artifact ?? artifact();
    },
    getActivePointerForSite: async () => {
      calls.push("getActivePointerForSite");
      return overrides.activePointer === undefined
        ? { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID }
        : overrides.activePointer;
    },
  };
}

test("airship internal preview review creates then reuses an idempotent review record", async () => {
  const repository = new MemoryReviewRepository();
  const first = await approveAirshipInternalPreviewCandidateForPublishReadiness(
    {
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      reviewerActorId: "superadmin-reviewer",
    },
    deps({ repository }),
  );
  const second = await approveAirshipInternalPreviewCandidateForPublishReadiness(
    {
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      reviewerActorId: "superadmin-reviewer",
      limitationsNotes: "Different note should still reuse the same review identity.",
    },
    deps({ repository }),
  );

  assert.equal(first.status, "created");
  assert.equal(second.status, "reused");
  assert.equal(repository.records.size, 1);
  assert.equal(first.review.reviewDecision, "approved_for_publish_readiness");
  assert.equal(first.review.nextStep, "publish-readiness evaluation, not publish");
  assert.equal(first.review.activePointerSiteVersionId, LIVE_VERSION_ID);
  assert.equal(first.mutationFlags.runtimeVersionMutation, false);
  assert.equal(first.mutationFlags.activePointerMutation, false);
  assert.equal(first.mutationFlags.publishes, false);
});

test("airship internal preview review rejects stale draft/candidate mismatch", async () => {
  await assert.rejects(
    () => approveAirshipInternalPreviewCandidateForPublishReadiness(
      {
        migrationId: MIGRATION_ID,
        draft: draft({ version: 45 }),
        candidate: candidate({ draftVersion: 44 }),
        reviewerActorId: "superadmin-reviewer",
      },
      deps(),
    ),
    /airship_review_candidate_draft_version_stale/,
  );
});

test("airship internal preview review refuses live or production candidates", async () => {
  await assert.rejects(
    () => approveAirshipInternalPreviewCandidateForPublishReadiness(
      {
        migrationId: MIGRATION_ID,
        draft: draft(),
        candidate: candidate(),
        reviewerActorId: "superadmin-reviewer",
      },
      deps({ activePointer: { siteVersionId: CANDIDATE_VERSION_ID, artifactId: CANDIDATE_ARTIFACT_ID } }),
    ),
    /airship_review_candidate_is_live_active_pointer/,
  );
  await assert.rejects(
    () => approveAirshipInternalPreviewCandidateForPublishReadiness(
      {
        migrationId: MIGRATION_ID,
        draft: draft(),
        candidate: candidate(),
        reviewerActorId: "superadmin-reviewer",
      },
      deps({ artifact: artifact("production") }),
    ),
    /airship_review_candidate_artifact_must_not_be_production/,
  );
});

test("airship internal preview review works for a generic imported-site fixture without CHS leakage", async () => {
  const result = await approveAirshipInternalPreviewCandidateForPublishReadiness(
    {
      migrationId: MIGRATION_ID,
      draft: draft({ sourceUrl: "https://luna.example/" }),
      candidate: candidate(),
      reviewerActorId: "superadmin-reviewer",
      limitationsNotes: "Synthetic imported-site review; no brand-specific production mutation.",
    },
    deps(),
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.review.reviewStatus, "approved");
  assert.equal(serialized.includes("chs.si"), false);
  assert.equal(serialized.includes("Maver"), false);
  assert.equal(result.mutationFlags.liveSiteMutation, false);
  assert.equal(result.mutationFlags.previewArtifactMutation, false);
});
