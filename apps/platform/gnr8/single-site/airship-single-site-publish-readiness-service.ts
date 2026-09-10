import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getActivePointerForSite, getArtifactById, getSiteVersion } from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";
import { getSuperadminPool } from "@/src/superadmin/db";

import type { AirshipDraftCandidatePreviewRef } from "./airship-single-site-draft-candidate-service";
import type { AirshipInternalPreviewCandidateReviewRecord } from "./airship-single-site-draft-candidate-review-service";
import type { AirshipSingleSiteDraftEdit, AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";
import type { SingleSitePgClient } from "./single-site-state-writer-repository";

export const AIRSHIP_PUBLISH_READINESS_SERVICE_VERSION = "airship-6-publish-readiness-package:v1" as const;

export type AirshipPublishReadinessRecord = {
  id: string;
  migrationId: string;
  reviewRecordId: string;
  readinessStatus: "complete";
  nextStep: "governed dry-run later, not publish";
  siteClientSourceLabels: {
    tenantId: string | null;
    clientId: string | null;
    siteId: string | null;
    sourceUrl: string;
    liveUrl: string | null;
    importedSiteLabel: string | null;
  };
  reviewedCandidateSiteVersionId: string;
  reviewedArtifactId: string;
  draftId: string;
  draftVersion: number;
  reviewStatus: "approved";
  reviewDecision: "approved_for_publish_readiness";
  reviewedAt: string;
  currentLiveActivePointerBefore: { siteVersionId: string | null; artifactId: string | null };
  currentLiveActivePointerAfter: { siteVersionId: string | null; artifactId: string | null };
  sourceEvidenceSummary: {
    status: string;
    detail: string;
    evidenceItems: Array<{ label: string; status: string; detail: string }>;
  };
  savedDraftFieldSummary: Array<{
    id: string;
    fieldKey: string | null;
    targetSectionPage: string;
    status: string;
    currentTextContentSummary: string;
    proposedTextContent: string;
  }>;
  internalPreviewUrl: string;
  limitationsWarnings: string[];
  noPublishConfirmation: {
    internalPreviewOnly: true;
    notLive: true;
    notPublished: true;
    candidateRuntimeState: "DRAFT";
    activePointerChanged: false;
    runtimeVersionStateMutated: false;
    liveSiteMutated: false;
    publishes: false;
    dryRun: false;
    shadowPublish: false;
    rollback: false;
    sourceCapture: false;
    providerCall: false;
  };
  serviceVersion: typeof AIRSHIP_PUBLISH_READINESS_SERVICE_VERSION;
  idempotencyKey: string;
  correlationId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type PrepareAirshipPublishReadinessInput = {
  migrationId: string;
  draft: AirshipSingleSiteDraftRecord;
  candidate: AirshipDraftCandidatePreviewRef;
  review: AirshipInternalPreviewCandidateReviewRecord | null;
  actorId: string;
  sourceEvidenceSummary?: AirshipPublishReadinessRecord["sourceEvidenceSummary"] | null;
  importedSiteLabel?: string | null;
  liveUrl?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type PrepareAirshipPublishReadinessOutput = {
  status: "created" | "reused";
  readiness: AirshipPublishReadinessRecord;
  mutationFlags: AirshipPublishReadinessRecord["noPublishConfirmation"] & {
    readinessRecordMutation: boolean;
  };
};

type ActivePointerSnapshot = { siteVersionId: string; artifactId: string } | null;

export type AirshipPublishReadinessRepository = {
  createOrReuseReadiness(input: {
    migrationId: string;
    reviewRecordId: string;
    reviewedCandidateSiteVersionId: string;
    reviewedArtifactId: string;
    draftId: string;
    draftVersion: number;
    reviewStatus: "approved";
    reviewDecision: "approved_for_publish_readiness";
    reviewedAt: string;
    siteClientSourceLabels: AirshipPublishReadinessRecord["siteClientSourceLabels"];
    currentLiveActivePointerBefore: ActivePointerSnapshot;
    currentLiveActivePointerAfter: ActivePointerSnapshot;
    sourceEvidenceSummary: AirshipPublishReadinessRecord["sourceEvidenceSummary"];
    savedDraftFieldSummary: AirshipPublishReadinessRecord["savedDraftFieldSummary"];
    internalPreviewUrl: string;
    limitationsWarnings: string[];
    noPublishConfirmation: AirshipPublishReadinessRecord["noPublishConfirmation"];
    serviceVersion: typeof AIRSHIP_PUBLISH_READINESS_SERVICE_VERSION;
    idempotencyKey: string;
    correlationId: string;
    metadata: Record<string, unknown>;
  }): Promise<{ status: "created" | "reused"; readiness: AirshipPublishReadinessRecord }>;
  readLatestReadiness(input: {
    migrationId: string;
    reviewRecordId?: string | null;
    candidateSiteVersionId?: string | null;
    artifactId?: string | null;
    draftId?: string | null;
    draftVersion?: number | null;
  }): Promise<AirshipPublishReadinessRecord | null>;
};

export type AirshipPublishReadinessDependencies = {
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  repository: AirshipPublishReadinessRepository;
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

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value as Record<string, unknown>)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

export function airshipPublishReadinessIdempotencyKey(input: {
  migrationId: string;
  reviewRecordId: string;
  candidateSiteVersionId: string;
  artifactId: string;
  draftId: string;
  draftVersion: number;
}): string {
  return `airship-publish-readiness:${sha256(input)}`;
}

function safeString(value: unknown, fallback = "unavailable"): string {
  const normalized = text(value) ?? fallback;
  const clipped = normalized.slice(0, 2000);
  return UNSAFE_TEXT.test(clipped) ? "redacted by Airship safety filter" : clipped;
}

function safeWarnings(review: AirshipInternalPreviewCandidateReviewRecord): string[] {
  return [
    safeString(review.limitationsNotes, "No limitations recorded on the approved Airship review."),
    "Internal preview only; not live; not published; active pointer unchanged.",
    "This readiness package makes a governed dry-run the next step; it does not publish.",
  ];
}

function sourceEvidenceSummary(input: PrepareAirshipPublishReadinessInput): AirshipPublishReadinessRecord["sourceEvidenceSummary"] {
  const supplied = input.sourceEvidenceSummary;
  if (supplied) {
    return {
      status: safeString(supplied.status, "source_supported"),
      detail: safeString(supplied.detail, `Saved Airship draft source evidence is available for ${input.draft.sourceUrl}.`),
      evidenceItems: supplied.evidenceItems.map((item) => ({
        label: safeString(item.label, "Evidence"),
        status: safeString(item.status, "available"),
        detail: safeString(item.detail, "Evidence detail unavailable."),
      })),
    };
  }
  return {
    status: "draft_source_summary",
    detail: `Saved Airship draft evidence is carried from ${input.draft.sourceUrl}.`,
    evidenceItems: input.draft.draftEdits.map((edit) => ({
      label: edit.targetSectionPage,
      status: edit.status,
      detail: edit.currentTextContentSummary,
    })),
  };
}

function draftFieldSummary(draftEdits: AirshipSingleSiteDraftEdit[]): AirshipPublishReadinessRecord["savedDraftFieldSummary"] {
  return draftEdits.map((edit) => ({
    id: safeString(edit.id),
    fieldKey: text(edit.fieldKey) ?? null,
    targetSectionPage: safeString(edit.targetSectionPage),
    status: safeString(edit.status),
    currentTextContentSummary: safeString(edit.currentTextContentSummary),
    proposedTextContent: safeString(edit.proposedTextContent),
  }));
}

function samePointer(left: ActivePointerSnapshot, right: ActivePointerSnapshot): boolean {
  return (left?.siteVersionId ?? null) === (right?.siteVersionId ?? null) && (left?.artifactId ?? null) === (right?.artifactId ?? null);
}

function rowText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === undefined || value === null) return null;
  return String(value);
}

function pointerFromRow(row: Record<string, unknown>, siteKey: string, artifactKey: string): { siteVersionId: string | null; artifactId: string | null } {
  return {
    siteVersionId: rowText(row, siteKey),
    artifactId: rowText(row, artifactKey),
  };
}

function rowToReadiness(row: Record<string, unknown>): AirshipPublishReadinessRecord {
  const confirmation = jsonObject(row.no_publish_confirmation_json) as AirshipPublishReadinessRecord["noPublishConfirmation"];
  return {
    id: required("id", rowText(row, "id")),
    migrationId: required("migrationId", rowText(row, "migration_id")),
    reviewRecordId: required("reviewRecordId", rowText(row, "review_record_id")),
    readinessStatus: "complete",
    nextStep: "governed dry-run later, not publish",
    siteClientSourceLabels: jsonObject(row.site_client_source_labels_json) as AirshipPublishReadinessRecord["siteClientSourceLabels"],
    reviewedCandidateSiteVersionId: required("reviewedCandidateSiteVersionId", rowText(row, "reviewed_candidate_site_version_id")),
    reviewedArtifactId: required("reviewedArtifactId", rowText(row, "reviewed_artifact_id")),
    draftId: required("draftId", rowText(row, "draft_id")),
    draftVersion: Number(row.draft_version) || 1,
    reviewStatus: "approved",
    reviewDecision: "approved_for_publish_readiness",
    reviewedAt: required("reviewedAt", rowText(row, "reviewed_at")),
    currentLiveActivePointerBefore: pointerFromRow(row, "active_pointer_before_site_version_id", "active_pointer_before_artifact_id"),
    currentLiveActivePointerAfter: pointerFromRow(row, "active_pointer_after_site_version_id", "active_pointer_after_artifact_id"),
    sourceEvidenceSummary: jsonObject(row.source_evidence_summary_json) as AirshipPublishReadinessRecord["sourceEvidenceSummary"],
    savedDraftFieldSummary: jsonArray(row.saved_draft_field_summary_json) as AirshipPublishReadinessRecord["savedDraftFieldSummary"],
    internalPreviewUrl: required("internalPreviewUrl", rowText(row, "internal_preview_url")),
    limitationsWarnings: jsonArray(row.limitations_warnings_json).map((item) => safeString(item)),
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
    serviceVersion: AIRSHIP_PUBLISH_READINESS_SERVICE_VERSION,
    idempotencyKey: required("idempotencyKey", rowText(row, "idempotency_key")),
    correlationId: required("correlationId", rowText(row, "correlation_id")),
    metadata: jsonObject(row.metadata_json),
    createdAt: required("createdAt", rowText(row, "created_at")),
    updatedAt: required("updatedAt", rowText(row, "updated_at")),
  };
}

type QueryResult<T> = { rows: T[] };
type PoolLike = { connect(): Promise<SingleSitePgClient & { release?: () => void }> };

export class PostgresAirshipPublishReadinessRepository implements AirshipPublishReadinessRepository {
  constructor(private readonly pool?: PoolLike) {}

  async createOrReuseReadiness(input: Parameters<AirshipPublishReadinessRepository["createOrReuseReadiness"]>[0]): Promise<{ status: "created" | "reused"; readiness: AirshipPublishReadinessRecord }> {
    const client = await (this.pool ?? getSuperadminPool()).connect();
    try {
      const values = [
        input.migrationId,
        input.reviewRecordId,
        input.reviewedCandidateSiteVersionId,
        input.reviewedArtifactId,
        input.draftId,
        input.draftVersion,
        input.reviewStatus,
        input.reviewDecision,
        input.reviewedAt,
        JSON.stringify(input.siteClientSourceLabels),
        input.currentLiveActivePointerBefore?.siteVersionId ?? null,
        input.currentLiveActivePointerBefore?.artifactId ?? null,
        input.currentLiveActivePointerAfter?.siteVersionId ?? null,
        input.currentLiveActivePointerAfter?.artifactId ?? null,
        JSON.stringify(input.sourceEvidenceSummary),
        JSON.stringify(input.savedDraftFieldSummary),
        input.internalPreviewUrl,
        JSON.stringify(input.limitationsWarnings),
        JSON.stringify(input.noPublishConfirmation),
        input.serviceVersion,
        input.idempotencyKey,
        input.correlationId,
        JSON.stringify(input.metadata),
      ];
      const inserted = await client.query(
        `
        insert into public.gnr8_airship_publish_readiness_packages (
          migration_id,
          review_record_id,
          reviewed_candidate_site_version_id,
          reviewed_artifact_id,
          draft_id,
          draft_version,
          review_status,
          review_decision,
          reviewed_at,
          site_client_source_labels_json,
          active_pointer_before_site_version_id,
          active_pointer_before_artifact_id,
          active_pointer_after_site_version_id,
          active_pointer_after_artifact_id,
          source_evidence_summary_json,
          saved_draft_field_summary_json,
          internal_preview_url,
          limitations_warnings_json,
          no_publish_confirmation_json,
          service_version,
          idempotency_key,
          correlation_id,
          metadata_json
        )
        values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6::integer, $7, $8, $9::timestamptz, $10::jsonb, $11::uuid, $12::uuid, $13::uuid, $14::uuid, $15::jsonb, $16::jsonb, $17, $18::jsonb, $19::jsonb, $20, $21, $22, $23::jsonb)
        on conflict (migration_id, review_record_id, reviewed_candidate_site_version_id, reviewed_artifact_id, draft_id, draft_version) do nothing
        returning *, reviewed_at::text as reviewed_at, created_at::text as created_at, updated_at::text as updated_at
        `,
        values,
      ) as QueryResult<Record<string, unknown>>;
      if (inserted.rows[0]) return { status: "created", readiness: rowToReadiness(inserted.rows[0]) };

      const reused = await client.query(
        `
        select *, reviewed_at::text as reviewed_at, created_at::text as created_at, updated_at::text as updated_at
        from public.gnr8_airship_publish_readiness_packages
        where migration_id = $1::uuid
          and review_record_id = $2::uuid
          and reviewed_candidate_site_version_id = $3::uuid
          and reviewed_artifact_id = $4::uuid
          and draft_id = $5::uuid
          and draft_version = $6::integer
        limit 1
        `,
        values.slice(0, 6),
      ) as QueryResult<Record<string, unknown>>;
      if (!reused.rows[0]) throw new Error("airship_publish_readiness_reuse_failed");
      return { status: "reused", readiness: rowToReadiness(reused.rows[0]) };
    } finally {
      client.release?.();
    }
  }

  async readLatestReadiness(input: Parameters<AirshipPublishReadinessRepository["readLatestReadiness"]>[0]): Promise<AirshipPublishReadinessRecord | null> {
    const client = await (this.pool ?? getSuperadminPool()).connect();
    try {
      const result = await client.query(
        `
        select *, reviewed_at::text as reviewed_at, created_at::text as created_at, updated_at::text as updated_at
        from public.gnr8_airship_publish_readiness_packages p
        where migration_id = $1::uuid
          and ($2::uuid is null or review_record_id = $2::uuid)
          and ($3::uuid is null or reviewed_candidate_site_version_id = $3::uuid)
          and ($4::uuid is null or reviewed_artifact_id = $4::uuid)
          and ($5::uuid is null or draft_id = $5::uuid)
          and ($6::integer is null or draft_version = $6::integer)
        order by p.created_at desc
        limit 1
        `,
        [
          input.migrationId,
          text(input.reviewRecordId),
          text(input.candidateSiteVersionId),
          text(input.artifactId),
          text(input.draftId),
          input.draftVersion ?? null,
        ],
      ) as QueryResult<Record<string, unknown>>;
      return result.rows[0] ? rowToReadiness(result.rows[0]) : null;
    } finally {
      client.release?.();
    }
  }
}

function assertApprovedReview(input: {
  migrationId: string;
  draft: AirshipSingleSiteDraftRecord;
  candidate: AirshipDraftCandidatePreviewRef;
  review: AirshipInternalPreviewCandidateReviewRecord | null;
}) {
  const { review } = input;
  if (!review) throw new Error("airship_publish_readiness_approved_review_required");
  if (review.reviewStatus !== "approved" || review.reviewDecision !== "approved_for_publish_readiness" || review.publishReadinessReady !== true) {
    throw new Error("airship_publish_readiness_review_not_approved");
  }
  if (review.migrationId !== input.migrationId) throw new Error("airship_publish_readiness_review_migration_mismatch");
  if (review.draftId !== input.draft.id || review.draftVersion !== input.draft.version) throw new Error("airship_publish_readiness_review_draft_mismatch");
  if (review.candidateSiteVersionId !== input.candidate.siteVersionId || review.candidateRuntimeArtifactId !== input.candidate.runtimeArtifactId) {
    throw new Error("airship_publish_readiness_review_candidate_mismatch");
  }
}

function assertCandidateMatchesDraft(input: {
  migrationId: string;
  draft: AirshipSingleSiteDraftRecord;
  candidate: AirshipDraftCandidatePreviewRef;
}) {
  if (input.draft.migrationId !== input.migrationId) throw new Error("airship_publish_readiness_draft_migration_mismatch");
  if (input.candidate.draftId !== input.draft.id) throw new Error("airship_publish_readiness_candidate_draft_mismatch");
  if (input.candidate.draftVersion !== input.draft.version) throw new Error("airship_publish_readiness_candidate_draft_version_stale");
}

function assertCandidateRuntimeSafe(input: {
  candidateVersion: CanonicalSiteVersionSnapshot;
  candidateArtifact: RuntimeArtifact;
  activePointer: ActivePointerSnapshot;
}) {
  if (input.candidateVersion.state !== "DRAFT") throw new Error("airship_publish_readiness_candidate_must_remain_draft");
  if (input.candidateArtifact.publishStage === "production") throw new Error("airship_publish_readiness_artifact_must_not_be_production");
  if (input.candidateArtifact.siteVersionId !== input.candidateVersion.id) throw new Error("airship_publish_readiness_candidate_artifact_mismatch");
  if (input.activePointer?.siteVersionId === input.candidateVersion.id || input.activePointer?.artifactId === input.candidateArtifact.id) {
    throw new Error("airship_publish_readiness_candidate_is_live_active_pointer");
  }
}

export async function prepareAirshipPublishReadiness(
  input: PrepareAirshipPublishReadinessInput,
  dependencies: Partial<AirshipPublishReadinessDependencies> = {},
): Promise<PrepareAirshipPublishReadinessOutput> {
  const deps: AirshipPublishReadinessDependencies = {
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    repository: dependencies.repository ?? new PostgresAirshipPublishReadinessRepository(),
  };
  const migrationId = uuid("migrationId", input.migrationId);
  const actorId = required("actorId", input.actorId);
  assertCandidateMatchesDraft({ migrationId, draft: input.draft, candidate: input.candidate });
  assertApprovedReview({ migrationId, draft: input.draft, candidate: input.candidate, review: input.review });

  const review = input.review;
  if (!review) throw new Error("airship_publish_readiness_approved_review_required");
  const candidateSiteVersionId = uuid("candidateSiteVersionId", input.candidate.siteVersionId);
  const candidateRuntimeArtifactId = uuid("candidateRuntimeArtifactId", input.candidate.runtimeArtifactId);
  const candidateVersion = await deps.getSiteVersion(candidateSiteVersionId);
  if (!candidateVersion) throw new Error("airship_publish_readiness_candidate_version_not_found");
  const candidateArtifact = await deps.getArtifactById(candidateRuntimeArtifactId);
  if (!candidateArtifact) throw new Error("airship_publish_readiness_candidate_artifact_not_found");
  const activePointer = await deps.getActivePointerForSite(candidateVersion.siteId);
  assertCandidateRuntimeSafe({ candidateVersion, candidateArtifact, activePointer });

  const reviewedPointer = review.activePointerSiteVersionId && review.activePointerArtifactId
    ? { siteVersionId: review.activePointerSiteVersionId, artifactId: review.activePointerArtifactId }
    : null;
  if (!samePointer(reviewedPointer, activePointer)) throw new Error("airship_publish_readiness_review_active_pointer_stale");

  const idempotencyKey = text(input.idempotencyKey) ?? airshipPublishReadinessIdempotencyKey({
    migrationId,
    reviewRecordId: review.id,
    candidateSiteVersionId,
    artifactId: candidateRuntimeArtifactId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
  });
  const correlationId = text(input.correlationId) ?? `airship-publish-readiness:${migrationId}:${randomUUID()}`;
  const confirmation: AirshipPublishReadinessRecord["noPublishConfirmation"] = {
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
  };
  const result = await deps.repository.createOrReuseReadiness({
    migrationId,
    reviewRecordId: review.id,
    reviewedCandidateSiteVersionId: candidateSiteVersionId,
    reviewedArtifactId: candidateRuntimeArtifactId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    reviewStatus: "approved",
    reviewDecision: "approved_for_publish_readiness",
    reviewedAt: review.reviewedAt,
    siteClientSourceLabels: {
      tenantId: input.draft.tenantId,
      clientId: input.draft.clientId,
      siteId: input.draft.siteId,
      sourceUrl: input.draft.sourceUrl,
      liveUrl: text(input.liveUrl),
      importedSiteLabel: text(input.importedSiteLabel),
    },
    currentLiveActivePointerBefore: activePointer,
    currentLiveActivePointerAfter: activePointer,
    sourceEvidenceSummary: sourceEvidenceSummary(input),
    savedDraftFieldSummary: draftFieldSummary(input.draft.draftEdits),
    internalPreviewUrl: input.candidate.route,
    limitationsWarnings: safeWarnings(review),
    noPublishConfirmation: confirmation,
    serviceVersion: AIRSHIP_PUBLISH_READINESS_SERVICE_VERSION,
    idempotencyKey,
    correlationId,
    metadata: {
      actorId,
      internalPreviewOnly: true,
      notLive: true,
      notPublished: true,
      activePointerUnchanged: true,
      nextStep: "governed dry-run later, not publish",
      candidateStatusLabel: input.candidate.statusLabel,
    },
  });

  return {
    status: result.status,
    readiness: result.readiness,
    mutationFlags: {
      readinessRecordMutation: result.status === "created",
      ...confirmation,
    },
  };
}

export async function readLatestAirshipPublishReadiness(input: {
  migrationId: string;
  reviewRecordId?: string | null;
  candidateSiteVersionId?: string | null;
  artifactId?: string | null;
  draftId?: string | null;
  draftVersion?: number | null;
}, repository: AirshipPublishReadinessRepository = new PostgresAirshipPublishReadinessRepository()): Promise<AirshipPublishReadinessRecord | null> {
  const migrationId = text(input.migrationId);
  if (!migrationId) return null;
  return repository.readLatestReadiness({
    migrationId,
    reviewRecordId: input.reviewRecordId ?? null,
    candidateSiteVersionId: input.candidateSiteVersionId ?? null,
    artifactId: input.artifactId ?? null,
    draftId: input.draftId ?? null,
    draftVersion: input.draftVersion ?? null,
  });
}
