import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeArtifact, CanonicalSiteVersionSnapshot } from "../runtime/types";
import {
  approveAirshipCandidateLifecycle,
  type AirshipCandidateLifecycleApprovalDependencies,
} from "./airship-candidate-lifecycle-approval-service";
import type { AirshipInternalPreviewCandidateReviewRecord } from "./airship-single-site-draft-candidate-review-service";
import type { AirshipPublishReadinessRecord, AirshipPublishReadinessRepository } from "./airship-single-site-publish-readiness-service";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const READINESS_ID = "3fdcde40-e178-40b5-83e1-217d600315ef";
const REVIEW_ID = "4bcca499-468b-40ff-b124-9cee88061263";
const CANDIDATE_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";
const SITE_ID = "site-chs";

function input(overrides: Record<string, unknown> = {}) {
  return {
    migrationId: MIGRATION_ID,
    readinessPackageId: READINESS_ID,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    artifactId: ARTIFACT_ID,
    idempotencyKey: "airship-candidate-lifecycle:test-key",
    reason: "MVP recovery test",
    actorId: "superadmin-airship",
    ...overrides,
  };
}

function readiness(overrides: Partial<AirshipPublishReadinessRecord> = {}): AirshipPublishReadinessRecord {
  return {
    id: READINESS_ID,
    migrationId: MIGRATION_ID,
    reviewRecordId: REVIEW_ID,
    readinessStatus: "complete",
    nextStep: "governed dry-run later, not publish",
    siteClientSourceLabels: {
      tenantId: "tenant-chs",
      clientId: "client-chs",
      siteId: SITE_ID,
      sourceUrl: "https://www.chs.si/",
      liveUrl: "https://www.chs.si/",
      importedSiteLabel: "chs.si",
    },
    reviewedCandidateSiteVersionId: CANDIDATE_VERSION_ID,
    reviewedArtifactId: ARTIFACT_ID,
    draftId: DRAFT_ID,
    draftVersion: 44,
    reviewStatus: "approved",
    reviewDecision: "approved_for_publish_readiness",
    reviewedAt: "2026-09-10T12:18:00.750Z",
    currentLiveActivePointerBefore: { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID },
    currentLiveActivePointerAfter: { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID },
    sourceEvidenceSummary: { status: "source_supported", detail: "Ready.", evidenceItems: [] },
    savedDraftFieldSummary: [],
    internalPreviewUrl: `/api/gnr8/admin/single-site-studio/versions/${CANDIDATE_VERSION_ID}/preview?mode=transformed`,
    limitationsWarnings: ["Reviewed Airship readiness package."],
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
    metadata: {},
    createdAt: "2026-09-10T12:20:00.000Z",
    updatedAt: "2026-09-10T12:20:00.000Z",
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
    candidateRuntimeArtifactId: ARTIFACT_ID,
    reviewDecision: "approved_for_publish_readiness",
    reviewStatus: "approved",
    publishReadinessReady: true,
    reviewerActorId: "superadmin-reviewer",
    reviewerActorType: "human",
    reviewerActorRole: "platform_superadmin",
    reviewedAt: "2026-09-10T12:18:00.750Z",
    limitationsNotes: "Approved.",
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
    metadata: {},
    createdAt: "2026-09-10T12:19:00.000Z",
    updatedAt: "2026-09-10T12:19:00.000Z",
    ...overrides,
  };
}

function candidateVersion(state: CanonicalSiteVersionSnapshot["state"] = "DRAFT"): CanonicalSiteVersionSnapshot {
  return {
    id: CANDIDATE_VERSION_ID,
    siteId: SITE_ID,
    versionNo: 12,
    state,
    source: "manual",
    actor: "superadmin-test",
    createdAt: "2026-09-10T00:06:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: ARTIFACT_ID,
    importProvenanceSummary: null,
    pages: [],
  };
}

function artifact(overrides: Partial<RuntimeArtifact> = {}): RuntimeArtifact {
  return {
    id: ARTIFACT_ID,
    siteId: SITE_ID,
    siteVersionId: CANDIDATE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    bundleSha256: "0f1bb26bfcd6ea21d79fa2839842ae2be9f292d4b2b7abd504d7a2d34d6010fe",
    htmlByPath: { "/": "<html><body>CHS</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: {},
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["APPROVED"],
      pageRolloutPolicyState: ["APPROVED"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["ALLOW"], production: ["ALLOW"] },
      siteGateState: "APPROVED",
      siteRolloutPolicyState: "APPROVED",
      siteEnforcementState: { shadow: "ALLOW", canary: "ALLOW", production: "ALLOW" },
      publishStage: "shadow",
    },
    createdAt: "2026-09-10T00:07:00.000Z",
    ...overrides,
  };
}

class MemoryReadinessRepository implements AirshipPublishReadinessRepository {
  constructor(private readonly record: AirshipPublishReadinessRecord | null = readiness()) {}

  async createOrReuseReadiness(): Promise<never> {
    throw new Error("not used by lifecycle approval tests");
  }

  async readLatestReadiness(): Promise<AirshipPublishReadinessRecord | null> {
    return this.record;
  }

  async readReadinessById(readinessPackageId: string): Promise<AirshipPublishReadinessRecord | null> {
    return this.record?.id === readinessPackageId ? this.record : null;
  }
}

function deps(overrides: {
  readinessRecord?: AirshipPublishReadinessRecord | null;
  reviewRecord?: AirshipInternalPreviewCandidateReviewRecord | null;
  version?: CanonicalSiteVersionSnapshot | null;
  artifactRecord?: RuntimeArtifact | null;
  activePointer?: { siteVersionId: string; artifactId: string } | null;
  events?: string[];
} = {}): AirshipCandidateLifecycleApprovalDependencies & { events: string[] } {
  const events = overrides.events ?? [];
  return {
    events,
    readinessRepository: new MemoryReadinessRepository(overrides.readinessRecord === undefined ? readiness() : overrides.readinessRecord),
    reviewRepository: {
      async createOrReuseReview(): Promise<never> {
        throw new Error("not used by lifecycle approval tests");
      },
      async readLatestReview() {
        events.push("read_review");
        return overrides.reviewRecord === undefined ? review() : overrides.reviewRecord;
      },
    },
    async getSiteVersion() {
      events.push("get_site_version");
      return overrides.version === undefined ? candidateVersion() : overrides.version;
    },
    async getArtifactById() {
      events.push("get_artifact");
      return overrides.artifactRecord === undefined ? artifact() : overrides.artifactRecord;
    },
    async getActivePointerForSite() {
      events.push("get_active_pointer");
      return overrides.activePointer === undefined ? { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID } : overrides.activePointer;
    },
    async transitionSiteVersionState(input) {
      events.push(`transition:${input.nextState}:${String(input.details?.auditMarker ?? "")}`);
      return { previousState: input.nextState === "READY_FOR_REVIEW" ? "DRAFT" : "READY_FOR_REVIEW", nextState: input.nextState };
    },
  };
}

test("candidate lifecycle approval rejects missing readiness package before mutation", async () => {
  const fakeDeps = deps({ readinessRecord: null });

  await assert.rejects(
    () => approveAirshipCandidateLifecycle(input(), fakeDeps),
    /airship_candidate_lifecycle_readiness_package_missing/,
  );
  assert.deepEqual(fakeDeps.events, []);
});

test("candidate lifecycle approval rejects missing and non-approved review", async () => {
  await assert.rejects(
    () => approveAirshipCandidateLifecycle(input(), deps({ reviewRecord: null })),
    /airship_candidate_lifecycle_approved_review_missing/,
  );

  await assert.rejects(
    () =>
      approveAirshipCandidateLifecycle(
        input(),
        deps({
          reviewRecord: {
            ...review(),
            reviewStatus: "pending" as AirshipInternalPreviewCandidateReviewRecord["reviewStatus"],
            publishReadinessReady: false as true,
          },
        }),
      ),
    /airship_candidate_lifecycle_review_not_approved/,
  );
});

test("candidate lifecycle approval rejects mismatched candidate and artifact refs", async () => {
  await assert.rejects(
    () => approveAirshipCandidateLifecycle(input(), deps({ readinessRecord: readiness({ reviewedArtifactId: "11111111-1111-4111-8111-111111111111" }) })),
    /airship_candidate_lifecycle_readiness_artifact_mismatch/,
  );

  await assert.rejects(
    () => approveAirshipCandidateLifecycle(input(), deps({ reviewRecord: review({ candidateSiteVersionId: "22222222-2222-4222-8222-222222222222" }) })),
    /airship_candidate_lifecycle_review_candidate_mismatch/,
  );
});

test("candidate lifecycle approval rejects already-live pointer mutation attempt", async () => {
  const fakeDeps = deps({
    activePointer: { siteVersionId: CANDIDATE_VERSION_ID, artifactId: ARTIFACT_ID },
  });

  await assert.rejects(
    () => approveAirshipCandidateLifecycle(input(), fakeDeps),
    /airship_candidate_lifecycle_candidate_already_live_pointer/,
  );
  assert.equal(fakeDeps.events.some((event) => event.startsWith("transition:")), false);
});

test("candidate lifecycle approval updates lifecycle state only after checks pass and records audit metadata", async () => {
  const fakeDeps = deps();
  const result = await approveAirshipCandidateLifecycle(input(), fakeDeps);

  assert.equal(result.outcome, "approved");
  assert.equal(result.previousState, "DRAFT");
  assert.equal(result.newState, "APPROVED");
  assert.equal(result.activePointerChanged, false);
  assert.equal(result.artifactStageUnchanged, true);
  assert.equal(result.auditRefs.source, "gnr8_runtime_version_audit");
  assert.equal(result.auditRefs.transitionAuditMarkers.length, 2);
  assert.match(result.auditRefs.transitionAuditMarkers[0], /^airship-candidate-lifecycle:draft_to_ready_for_review:/);
  assert.match(result.auditRefs.transitionAuditMarkers[1], /^airship-candidate-lifecycle:ready_for_review_to_approved:/);
  assert.equal(fakeDeps.events.indexOf("get_active_pointer") < fakeDeps.events.findIndex((event) => event.startsWith("transition:")), true);
  assert.deepEqual(fakeDeps.events.filter((event) => event.startsWith("transition:")).map((event) => event.split(":")[1]), ["READY_FOR_REVIEW", "APPROVED"]);
  assert.equal(fakeDeps.events.includes("switch_active_pointer"), false);
});

test("candidate lifecycle approval moves ready-for-review candidate directly to approved", async () => {
  const fakeDeps = deps({ version: candidateVersion("READY_FOR_REVIEW") });
  const result = await approveAirshipCandidateLifecycle(input(), fakeDeps);

  assert.equal(result.previousState, "READY_FOR_REVIEW");
  assert.equal(result.newState, "APPROVED");
  assert.deepEqual(fakeDeps.events.filter((event) => event.startsWith("transition:")).map((event) => event.split(":")[1]), ["APPROVED"]);
});
