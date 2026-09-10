import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getActivePointerForSite, getArtifactById, getSiteVersion } from "@/gnr8/runtime/runtime-store";
import type { RuntimeArtifact, CanonicalSiteVersionSnapshot } from "@/gnr8/runtime/types";
import { getSuperadminPool } from "@/src/superadmin/db";

import type { SingleSitePgClient } from "./single-site-state-writer-repository";
import type { AirshipDraftCandidatePreviewRef } from "./airship-single-site-draft-candidate-service";
import type { AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";

export const AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_REVIEW_SERVICE_VERSION = "airship-5-internal-preview-candidate-review:v1" as const;

export type AirshipInternalPreviewReviewDecision = "approved_for_publish_readiness";

export type AirshipInternalPreviewCandidateReviewRecord = {
  id: string;
  migrationId: string;
  draftId: string;
  draftVersion: number;
  candidateSiteVersionId: string;
  candidateRuntimeArtifactId: string;
  reviewDecision: AirshipInternalPreviewReviewDecision;
  reviewStatus: "approved";
  publishReadinessReady: true;
  reviewerActorId: string;
  reviewerActorType: "human" | "system";
  reviewerActorRole: "platform_superadmin" | "internal_operator";
  reviewedAt: string;
  limitationsNotes: string;
  nextStep: "publish-readiness evaluation, not publish";
  activePointerSiteVersionId: string | null;
  activePointerArtifactId: string | null;
  activePointerChanged: false;
  runtimeVersionStateMutated: false;
  liveSiteMutated: false;
  published: false;
  serviceVersion: typeof AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_REVIEW_SERVICE_VERSION;
  idempotencyKey: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ApproveAirshipInternalPreviewCandidateInput = {
  migrationId: string;
  draft: AirshipSingleSiteDraftRecord;
  candidate: AirshipDraftCandidatePreviewRef;
  reviewerActorId: string;
  decision?: AirshipInternalPreviewReviewDecision | null;
  limitationsNotes?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type ApproveAirshipInternalPreviewCandidateOutput = {
  status: "created" | "reused";
  review: AirshipInternalPreviewCandidateReviewRecord;
  mutationFlags: {
    reviewRecordMutation: boolean;
    runtimeVersionMutation: false;
    previewArtifactMutation: false;
    liveSiteMutation: false;
    activePointerMutation: false;
    publishes: false;
    dryRun: false;
    shadowPublish: false;
    rollback: false;
    sourceCapture: false;
    providerCall: false;
  };
};

type ActivePointerSnapshot = { siteVersionId: string; artifactId: string } | null;

export type AirshipInternalPreviewCandidateReviewRepository = {
  createOrReuseReview(input: {
    migrationId: string;
    draftId: string;
    draftVersion: number;
    candidateSiteVersionId: string;
    candidateRuntimeArtifactId: string;
    reviewDecision: AirshipInternalPreviewReviewDecision;
    reviewerActorId: string;
    limitationsNotes: string;
    activePointer: ActivePointerSnapshot;
    correlationId: string;
    idempotencyKey: string;
    metadata: Record<string, unknown>;
  }): Promise<{ status: "created" | "reused"; review: AirshipInternalPreviewCandidateReviewRecord }>;
  readLatestReview(input: {
    migrationId: string;
    draftId?: string | null;
    draftVersion?: number | null;
    candidateSiteVersionId?: string | null;
    candidateRuntimeArtifactId?: string | null;
  }): Promise<AirshipInternalPreviewCandidateReviewRecord | null>;
};

export type AirshipInternalPreviewCandidateReviewDependencies = {
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  repository: AirshipInternalPreviewCandidateReviewRepository;
};

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNSAFE_TEXT = /secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key/i;

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`${field}_required`);
  return normalized;
}

function uuid(field: string, value: unknown): string {
  const normalized = required(field, value);
  if (!UUIDISH.test(normalized)) throw new Error(`${field}_invalid`);
  return normalized;
}

function safeNotes(value: unknown): string {
  const normalized = text(value) ?? "Approved for publish-readiness evaluation only. Internal preview only; not live, not published, active pointer unchanged.";
  const clipped = normalized.slice(0, 2000);
  return UNSAFE_TEXT.test(clipped) ? "Review notes redacted by Airship safety filter." : clipped;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function airshipInternalPreviewCandidateReviewIdempotencyKey(input: {
  migrationId: string;
  draftId: string;
  draftVersion: number;
  candidateSiteVersionId: string;
  candidateRuntimeArtifactId: string;
  reviewDecision: AirshipInternalPreviewReviewDecision;
}): string {
  return `airship-preview-review:${sha256(input)}`;
}

function rowText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === undefined || value === null) return null;
  return String(value);
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function rowToReview(row: Record<string, unknown>): AirshipInternalPreviewCandidateReviewRecord {
  return {
    id: required("id", rowText(row, "id")),
    migrationId: required("migrationId", rowText(row, "migration_id")),
    draftId: required("draftId", rowText(row, "draft_id")),
    draftVersion: Number(row.draft_version) || 1,
    candidateSiteVersionId: required("candidateSiteVersionId", rowText(row, "candidate_site_version_id")),
    candidateRuntimeArtifactId: required("candidateRuntimeArtifactId", rowText(row, "candidate_runtime_artifact_id")),
    reviewDecision: "approved_for_publish_readiness",
    reviewStatus: "approved",
    publishReadinessReady: true,
    reviewerActorId: required("reviewerActorId", rowText(row, "reviewer_actor_id")),
    reviewerActorType: rowText(row, "reviewer_actor_type") === "system" ? "system" : "human",
    reviewerActorRole: rowText(row, "reviewer_actor_role") === "internal_operator" ? "internal_operator" : "platform_superadmin",
    reviewedAt: required("reviewedAt", rowText(row, "reviewed_at")),
    limitationsNotes: rowText(row, "limitations_notes") ?? "",
    nextStep: "publish-readiness evaluation, not publish",
    activePointerSiteVersionId: rowText(row, "active_pointer_site_version_id"),
    activePointerArtifactId: rowText(row, "active_pointer_artifact_id"),
    activePointerChanged: false,
    runtimeVersionStateMutated: false,
    liveSiteMutated: false,
    published: false,
    serviceVersion: AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_REVIEW_SERVICE_VERSION,
    idempotencyKey: required("idempotencyKey", rowText(row, "idempotency_key")),
    correlationId: required("correlationId", rowText(row, "correlation_id")),
    metadata: jsonObject(row.metadata_json),
    createdAt: required("createdAt", rowText(row, "created_at")),
    updatedAt: required("updatedAt", rowText(row, "updated_at")),
  };
}

type QueryResult<T> = { rows: T[] };
type PoolLike = { connect(): Promise<SingleSitePgClient & { release?: () => void }> };

export class PostgresAirshipInternalPreviewCandidateReviewRepository implements AirshipInternalPreviewCandidateReviewRepository {
  constructor(private readonly pool?: PoolLike) {}

  async createOrReuseReview(input: Parameters<AirshipInternalPreviewCandidateReviewRepository["createOrReuseReview"]>[0]): Promise<{ status: "created" | "reused"; review: AirshipInternalPreviewCandidateReviewRecord }> {
    const client = await (this.pool ?? getSuperadminPool()).connect();
    try {
      const values = [
        input.migrationId,
        input.draftId,
        input.draftVersion,
        input.candidateSiteVersionId,
        input.candidateRuntimeArtifactId,
        input.reviewDecision,
        input.reviewerActorId,
        input.limitationsNotes,
        input.activePointer?.siteVersionId ?? null,
        input.activePointer?.artifactId ?? null,
        AIRSHIP_INTERNAL_PREVIEW_CANDIDATE_REVIEW_SERVICE_VERSION,
        input.idempotencyKey,
        input.correlationId,
        JSON.stringify(input.metadata),
      ];
      const inserted = await client.query(
        `
        insert into public.gnr8_airship_internal_preview_candidate_reviews (
          migration_id,
          draft_id,
          draft_version,
          candidate_site_version_id,
          candidate_runtime_artifact_id,
          review_decision,
          reviewer_actor_id,
          limitations_notes,
          active_pointer_site_version_id,
          active_pointer_artifact_id,
          service_version,
          idempotency_key,
          correlation_id,
          metadata_json
        )
        values ($1::uuid, $2::uuid, $3::integer, $4::uuid, $5::uuid, $6, $7, $8, $9::uuid, $10::uuid, $11, $12, $13, $14::jsonb)
        on conflict (migration_id, draft_id, draft_version, candidate_site_version_id, candidate_runtime_artifact_id, review_decision) do nothing
        returning *, reviewed_at::text as reviewed_at, created_at::text as created_at, updated_at::text as updated_at
        `,
        values,
      ) as QueryResult<Record<string, unknown>>;
      if (inserted.rows[0]) return { status: "created", review: rowToReview(inserted.rows[0]) };

      const reused = await client.query(
        `
        select *, reviewed_at::text as reviewed_at, created_at::text as created_at, updated_at::text as updated_at
        from public.gnr8_airship_internal_preview_candidate_reviews
        where migration_id = $1::uuid
          and draft_id = $2::uuid
          and draft_version = $3::integer
          and candidate_site_version_id = $4::uuid
          and candidate_runtime_artifact_id = $5::uuid
          and review_decision = $6
        limit 1
        `,
        values.slice(0, 6),
      ) as QueryResult<Record<string, unknown>>;
      if (!reused.rows[0]) throw new Error("airship_internal_preview_review_reuse_failed");
      return { status: "reused", review: rowToReview(reused.rows[0]) };
    } finally {
      client.release?.();
    }
  }

  async readLatestReview(input: Parameters<AirshipInternalPreviewCandidateReviewRepository["readLatestReview"]>[0]): Promise<AirshipInternalPreviewCandidateReviewRecord | null> {
    const client = await (this.pool ?? getSuperadminPool()).connect();
    try {
      const result = await client.query(
        `
        select *, reviewed_at::text as reviewed_at, created_at::text as created_at, updated_at::text as updated_at
        from public.gnr8_airship_internal_preview_candidate_reviews r
        where migration_id = $1::uuid
          and ($2::uuid is null or draft_id = $2::uuid)
          and ($3::integer is null or draft_version = $3::integer)
          and ($4::uuid is null or candidate_site_version_id = $4::uuid)
          and ($5::uuid is null or candidate_runtime_artifact_id = $5::uuid)
        order by r.reviewed_at desc, r.created_at desc
        limit 1
        `,
        [
          input.migrationId,
          text(input.draftId),
          input.draftVersion ?? null,
          text(input.candidateSiteVersionId),
          text(input.candidateRuntimeArtifactId),
        ],
      ) as QueryResult<Record<string, unknown>>;
      return result.rows[0] ? rowToReview(result.rows[0]) : null;
    } finally {
      client.release?.();
    }
  }
}

function assertCandidateMatchesDraft(input: {
  migrationId: string;
  draft: AirshipSingleSiteDraftRecord;
  candidate: AirshipDraftCandidatePreviewRef;
}) {
  if (input.draft.migrationId !== input.migrationId) throw new Error("airship_review_draft_migration_mismatch");
  if (input.candidate.draftId !== input.draft.id) throw new Error("airship_review_candidate_draft_mismatch");
  if (input.candidate.draftVersion !== input.draft.version) throw new Error("airship_review_candidate_draft_version_stale");
}

function assertCandidateRuntimeSafe(input: {
  candidateVersion: CanonicalSiteVersionSnapshot;
  candidateArtifact: RuntimeArtifact;
  activePointer: ActivePointerSnapshot;
}) {
  if (input.candidateVersion.state === "PUBLISHED") throw new Error("airship_review_candidate_must_not_be_published");
  if (input.candidateArtifact.publishStage === "production") throw new Error("airship_review_candidate_artifact_must_not_be_production");
  if (input.candidateArtifact.siteVersionId !== input.candidateVersion.id) throw new Error("airship_review_candidate_artifact_mismatch");
  if (input.activePointer?.siteVersionId === input.candidateVersion.id || input.activePointer?.artifactId === input.candidateArtifact.id) {
    throw new Error("airship_review_candidate_is_live_active_pointer");
  }
}

export async function approveAirshipInternalPreviewCandidateForPublishReadiness(
  input: ApproveAirshipInternalPreviewCandidateInput,
  dependencies: Partial<AirshipInternalPreviewCandidateReviewDependencies> = {},
): Promise<ApproveAirshipInternalPreviewCandidateOutput> {
  const deps: AirshipInternalPreviewCandidateReviewDependencies = {
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    repository: dependencies.repository ?? new PostgresAirshipInternalPreviewCandidateReviewRepository(),
  };
  const migrationId = uuid("migrationId", input.migrationId);
  const reviewerActorId = required("reviewerActorId", input.reviewerActorId);
  const reviewDecision = input.decision ?? "approved_for_publish_readiness";
  if (reviewDecision !== "approved_for_publish_readiness") throw new Error("airship_review_decision_invalid");
  assertCandidateMatchesDraft({ migrationId, draft: input.draft, candidate: input.candidate });

  const candidateSiteVersionId = uuid("candidateSiteVersionId", input.candidate.siteVersionId);
  const candidateRuntimeArtifactId = uuid("candidateRuntimeArtifactId", input.candidate.runtimeArtifactId);
  const candidateVersion = await deps.getSiteVersion(candidateSiteVersionId);
  if (!candidateVersion) throw new Error("airship_review_candidate_version_not_found");
  const candidateArtifact = await deps.getArtifactById(candidateRuntimeArtifactId);
  if (!candidateArtifact) throw new Error("airship_review_candidate_artifact_not_found");
  const activePointer = await deps.getActivePointerForSite(candidateVersion.siteId);
  assertCandidateRuntimeSafe({ candidateVersion, candidateArtifact, activePointer });

  const idempotencyKey = text(input.idempotencyKey) ?? airshipInternalPreviewCandidateReviewIdempotencyKey({
    migrationId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    candidateSiteVersionId,
    candidateRuntimeArtifactId,
    reviewDecision,
  });
  const correlationId = text(input.correlationId) ?? `airship-preview-review:${migrationId}:${randomUUID()}`;
  const result = await deps.repository.createOrReuseReview({
    migrationId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    candidateSiteVersionId,
    candidateRuntimeArtifactId,
    reviewDecision,
    reviewerActorId,
    limitationsNotes: safeNotes(input.limitationsNotes),
    activePointer,
    correlationId,
    idempotencyKey,
    metadata: {
      internalPreviewOnly: true,
      notLive: true,
      notPublished: true,
      activePointerUnchanged: true,
      nextStep: "publish-readiness evaluation, not publish",
      reviewedCandidateRoute: input.candidate.route,
      candidateStatusLabel: input.candidate.statusLabel,
    },
  });

  return {
    status: result.status,
    review: result.review,
    mutationFlags: {
      reviewRecordMutation: result.status === "created",
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

export async function readLatestAirshipInternalPreviewCandidateReview(input: {
  migrationId: string;
  draftId?: string | null;
  draftVersion?: number | null;
  candidateSiteVersionId?: string | null;
  candidateRuntimeArtifactId?: string | null;
}, repository: AirshipInternalPreviewCandidateReviewRepository = new PostgresAirshipInternalPreviewCandidateReviewRepository()): Promise<AirshipInternalPreviewCandidateReviewRecord | null> {
  const migrationId = text(input.migrationId);
  if (!migrationId) return null;
  return repository.readLatestReview({
    migrationId,
    draftId: input.draftId ?? null,
    draftVersion: input.draftVersion ?? null,
    candidateSiteVersionId: input.candidateSiteVersionId ?? null,
    candidateRuntimeArtifactId: input.candidateRuntimeArtifactId ?? null,
  });
}
