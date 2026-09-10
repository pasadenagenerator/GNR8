import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeArtifact, CanonicalSiteVersionSnapshot } from "../runtime/types";
import type { AirshipDraftCandidatePreviewRef } from "./airship-single-site-draft-candidate-service";
import type { AirshipInternalPreviewCandidateReviewRecord } from "./airship-single-site-draft-candidate-review-service";
import {
  AIRSHIP_PUBLISH_READINESS_SERVICE_VERSION,
  prepareAirshipPublishReadiness,
  type AirshipPublishReadinessRecord,
  type AirshipPublishReadinessRepository,
} from "./airship-single-site-publish-readiness-service";
import type { AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const REVIEW_ID = "33333333-3333-4333-8333-333333333333";
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
      {
        id: "airship-example-home-hero-subheading",
        fieldKey: "subheading",
        targetSectionPage: "Homepage / hero subheading",
        currentTextContentSummary: "Existing source subheading.",
        proposedTextContent: "Synthetic imported-site subheading.",
        reasonForChange: "Source-supported operator edit.",
        status: "edited",
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

function review(overrides: Partial<AirshipInternalPreviewCandidateReviewRecord> = {}): AirshipInternalPreviewCandidateReviewRecord {
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
    limitationsNotes: "Approved Airship internal preview candidate; active pointer unchanged.",
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

class MemoryReadinessRepository implements AirshipPublishReadinessRepository {
  readonly records = new Map<string, AirshipPublishReadinessRecord>();

  async createOrReuseReadiness(input: Parameters<AirshipPublishReadinessRepository["createOrReuseReadiness"]>[0]) {
    const key = [
      input.migrationId,
      input.reviewRecordId,
      input.reviewedCandidateSiteVersionId,
      input.reviewedArtifactId,
      input.draftId,
      input.draftVersion,
    ].join(":");
    const existing = this.records.get(key);
    if (existing) return { status: "reused" as const, readiness: existing };
    const readiness: AirshipPublishReadinessRecord = {
      id: "44444444-4444-4444-8444-444444444444",
      migrationId: input.migrationId,
      reviewRecordId: input.reviewRecordId,
      readinessStatus: "complete",
      nextStep: "governed dry-run later, not publish",
      siteClientSourceLabels: input.siteClientSourceLabels,
      reviewedCandidateSiteVersionId: input.reviewedCandidateSiteVersionId,
      reviewedArtifactId: input.reviewedArtifactId,
      draftId: input.draftId,
      draftVersion: input.draftVersion,
      reviewStatus: input.reviewStatus,
      reviewDecision: input.reviewDecision,
      reviewedAt: input.reviewedAt,
      currentLiveActivePointerBefore: {
        siteVersionId: input.currentLiveActivePointerBefore?.siteVersionId ?? null,
        artifactId: input.currentLiveActivePointerBefore?.artifactId ?? null,
      },
      currentLiveActivePointerAfter: {
        siteVersionId: input.currentLiveActivePointerAfter?.siteVersionId ?? null,
        artifactId: input.currentLiveActivePointerAfter?.artifactId ?? null,
      },
      sourceEvidenceSummary: input.sourceEvidenceSummary,
      savedDraftFieldSummary: input.savedDraftFieldSummary,
      internalPreviewUrl: input.internalPreviewUrl,
      limitationsWarnings: input.limitationsWarnings,
      noPublishConfirmation: input.noPublishConfirmation,
      serviceVersion: AIRSHIP_PUBLISH_READINESS_SERVICE_VERSION,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      metadata: input.metadata,
      createdAt: "2026-09-10T12:20:00.000Z",
      updatedAt: "2026-09-10T12:20:00.000Z",
    };
    this.records.set(key, readiness);
    return { status: "created" as const, readiness };
  }

  async readLatestReadiness() {
    return Array.from(this.records.values())[0] ?? null;
  }
}

function deps(overrides: {
  version?: CanonicalSiteVersionSnapshot;
  artifact?: RuntimeArtifact;
  activePointer?: { siteVersionId: string; artifactId: string } | null;
  repository?: MemoryReadinessRepository;
} = {}) {
  const repository = overrides.repository ?? new MemoryReadinessRepository();
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

test("airship publish-readiness builder creates then reuses an idempotent readiness record", async () => {
  const repository = new MemoryReadinessRepository();
  const first = await prepareAirshipPublishReadiness(
    {
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      review: review(),
      actorId: "superadmin-readiness",
      importedSiteLabel: "example imported site",
      liveUrl: "https://example-imported.test/",
      sourceEvidenceSummary: {
        status: "source_supported",
        detail: "2 source evidence item(s) available for example imported site.",
        evidenceItems: [{ label: "Hero headline", status: "present", detail: "Existing source headline." }],
      },
    },
    deps({ repository }),
  );
  const second = await prepareAirshipPublishReadiness(
    {
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      review: review(),
      actorId: "superadmin-readiness",
    },
    deps({ repository }),
  );

  assert.equal(first.status, "created");
  assert.equal(second.status, "reused");
  assert.equal(repository.records.size, 1);
  assert.equal(first.readiness.readinessStatus, "complete");
  assert.equal(first.readiness.nextStep, "governed dry-run later, not publish");
  assert.equal(first.readiness.reviewRecordId, REVIEW_ID);
  assert.equal(first.readiness.reviewedCandidateSiteVersionId, CANDIDATE_VERSION_ID);
  assert.equal(first.readiness.reviewedArtifactId, CANDIDATE_ARTIFACT_ID);
  assert.equal(first.readiness.draftId, DRAFT_ID);
  assert.equal(first.readiness.draftVersion, 44);
  assert.equal(first.readiness.currentLiveActivePointerBefore.siteVersionId, LIVE_VERSION_ID);
  assert.equal(first.readiness.currentLiveActivePointerAfter.siteVersionId, LIVE_VERSION_ID);
  assert.equal(first.readiness.noPublishConfirmation.publishes, false);
  assert.equal(first.readiness.noPublishConfirmation.dryRun, false);
  assert.equal(first.readiness.noPublishConfirmation.shadowPublish, false);
  assert.equal(first.readiness.noPublishConfirmation.rollback, false);
  assert.equal(first.readiness.noPublishConfirmation.sourceCapture, false);
  assert.equal(first.readiness.noPublishConfirmation.providerCall, false);
  assert.equal(first.mutationFlags.readinessRecordMutation, true);
  assert.equal(first.mutationFlags.activePointerChanged, false);
  assert.equal(second.mutationFlags.readinessRecordMutation, false);
});

test("airship publish-readiness builder refuses missing, unapproved, and stale reviews", async () => {
  await assert.rejects(
    () => prepareAirshipPublishReadiness({
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      review: null,
      actorId: "superadmin-readiness",
    }, deps()),
    /airship_publish_readiness_approved_review_required/,
  );
  await assert.rejects(
    () => prepareAirshipPublishReadiness({
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      review: review({ publishReadinessReady: false as true }),
      actorId: "superadmin-readiness",
    }, deps()),
    /airship_publish_readiness_review_not_approved/,
  );
  await assert.rejects(
    () => prepareAirshipPublishReadiness({
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      review: review(),
      actorId: "superadmin-readiness",
    }, deps({ activePointer: { siteVersionId: "11111111-1111-4111-8111-111111111111", artifactId: LIVE_ARTIFACT_ID } })),
    /airship_publish_readiness_review_active_pointer_stale/,
  );
});

test("airship publish-readiness builder refuses candidate artifact draft mismatch", async () => {
  await assert.rejects(
    () => prepareAirshipPublishReadiness({
      migrationId: MIGRATION_ID,
      draft: draft({ version: 45 }),
      candidate: candidate({ draftVersion: 44 }),
      review: review(),
      actorId: "superadmin-readiness",
    }, deps()),
    /airship_publish_readiness_candidate_draft_version_stale/,
  );
  await assert.rejects(
    () => prepareAirshipPublishReadiness({
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate({ runtimeArtifactId: "22222222-2222-4222-8222-222222222222" }),
      review: review(),
      actorId: "superadmin-readiness",
    }, deps()),
    /airship_publish_readiness_review_candidate_mismatch/,
  );
  await assert.rejects(
    () => prepareAirshipPublishReadiness({
      migrationId: MIGRATION_ID,
      draft: draft(),
      candidate: candidate(),
      review: review(),
      actorId: "superadmin-readiness",
    }, deps({ artifact: artifact("production") })),
    /airship_publish_readiness_artifact_must_not_be_production/,
  );
});

test("airship publish-readiness builder guards invalid migration id and generic imported-site fixtures", async () => {
  await assert.rejects(
    () => prepareAirshipPublishReadiness({
      migrationId: "not-a-uuid",
      draft: draft(),
      candidate: candidate(),
      review: review(),
      actorId: "superadmin-readiness",
    }, deps()),
    /migrationId_invalid/,
  );

  const result = await prepareAirshipPublishReadiness(
    {
      migrationId: MIGRATION_ID,
      draft: draft({ sourceUrl: "https://luna.example/" }),
      candidate: candidate(),
      review: review(),
      actorId: "superadmin-readiness",
      importedSiteLabel: "luna.example",
      liveUrl: "https://luna.example/",
    },
    deps(),
  );
  const serialized = JSON.stringify(result);

  assert.equal(result.readiness.siteClientSourceLabels.sourceUrl, "https://luna.example/");
  assert.equal(serialized.includes("chs.si"), false);
  assert.equal(serialized.includes("Maver"), false);
  assert.equal(result.mutationFlags.liveSiteMutated, false);
  assert.equal(result.mutationFlags.runtimeVersionStateMutated, false);
});

test("airship publish-readiness builder does not modify active pointer or publish state", async () => {
  const resolved = deps();
  const result = await prepareAirshipPublishReadiness({
    migrationId: MIGRATION_ID,
    draft: draft(),
    candidate: candidate(),
    review: review(),
    actorId: "superadmin-readiness",
  }, resolved);

  assert.deepEqual(resolved.calls, ["getSiteVersion", "getArtifactById", "getActivePointerForSite"]);
  assert.equal(result.readiness.noPublishConfirmation.candidateRuntimeState, "DRAFT");
  assert.equal(result.readiness.currentLiveActivePointerBefore.siteVersionId, LIVE_VERSION_ID);
  assert.equal(result.readiness.currentLiveActivePointerAfter.siteVersionId, LIVE_VERSION_ID);
  assert.equal(result.mutationFlags.publishes, false);
  assert.equal(result.mutationFlags.activePointerChanged, false);
});
