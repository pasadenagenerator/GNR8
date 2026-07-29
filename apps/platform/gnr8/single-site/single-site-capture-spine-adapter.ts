import "server-only";

import {
  SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES,
  type SingleSiteEvidenceItemCategory,
  type SingleSiteEvidenceItemStatus,
  type SingleSiteJsonObject,
  type SingleSiteMigrationRefRole,
  type SingleSiteMigrationState,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
  type SingleSiteSourceEvidenceCompletenessStatus,
  type SingleSiteSourceEvidenceRefRole,
  SingleSiteTransitionError,
} from "./single-site-state-contracts";
import { SourceEvidenceReviewService } from "./source-evidence-review-service";
import { SingleSiteStateTransitionService, type SingleSiteTransitionRefInput } from "./single-site-state-transition-service";
import {
  SingleSiteStateWriterRepository,
  type CreateSingleSiteMigrationInput,
  type SingleSiteActorInput,
  type SingleSiteMigrationRow,
  type SingleSiteSourceEvidenceReviewRow,
  type SingleSiteStateWriterTx,
} from "./single-site-state-writer-repository";

export type SingleSiteCaptureSpineEvidenceRefInput = {
  category: SingleSiteEvidenceItemCategory;
  sourceEvidenceRefRole: SingleSiteSourceEvidenceRefRole;
  migrationRefRole?: SingleSiteMigrationRefRole | null;
  refType: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  contentHash?: string | null;
  payloadHash?: string | null;
  mediaType?: string | null;
  capturedAt?: string | null;
  freshUntil?: string | null;
  status?: SingleSiteEvidenceItemStatus | null;
  requiredForClone?: boolean | null;
  blocksCloneGeneration?: boolean | null;
  acceptedLimitation?: boolean | null;
  findingSummary?: string | null;
  limitationJson?: SingleSiteJsonObject;
  warningsJson?: unknown[];
  metadataJson?: SingleSiteJsonObject;
};

export type SingleSiteCaptureSpineInput = {
  outcome: "completed" | "failed";
  tenantId: string;
  clientId: string;
  siteId?: string | null;
  ownershipSiteId?: string | null;
  runtimeSiteId?: string | null;
  siteVersionId?: string | null;
  runtimeSiteVersionId?: string | null;
  sourceUrl: string;
  canonicalSourceUrl?: string | null;
  intendedLaunchDomain?: string | null;
  validationSiteNumber?: number | null;
  migrationId?: string | null;
  migrationIdempotencyKey?: string | null;
  idempotencyKey: string;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  actor: SingleSiteActorInput;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  captureRunId?: string | null;
  renderJobId?: string | null;
  sourceEvidencePackageKey?: string | null;
  sourceWatermark?: string | null;
  sourceHash?: string | null;
  payloadHash?: string | null;
  captureStartedAt?: string | null;
  captureCompletedAt?: string | null;
  evidenceCapturedAt?: string | null;
  freshUntil?: string | null;
  evidenceRefs?: readonly SingleSiteCaptureSpineEvidenceRefInput[];
  limitations?: unknown[];
  missingEvidence?: unknown[];
  warnings?: unknown[];
  blockers?: unknown[];
  diagnosticsJson?: SingleSiteJsonObject;
  metadataJson?: SingleSiteJsonObject;
  failureReason?: string | null;
};

export type SingleSiteCaptureSpineResult = {
  migrationId: string;
  reviewId: string | null;
  outcomeState: SingleSiteMigrationState;
  reviewReadyForReview: boolean;
  completenessStatus: SingleSiteSourceEvidenceCompletenessStatus | null;
  reusedMigration: boolean;
};

type WriterDependency = Pick<
  SingleSiteStateWriterRepository,
  "withTransaction" | "createMigration" | "getMigrationById" | "getMigrationByIdempotencyKey" | "getSourceEvidenceReviewByIdempotencyKey"
>;
type TransitionDependency = Pick<SingleSiteStateTransitionService, "transition">;
type ReviewDependency = Pick<SourceEvidenceReviewService, "createReview" | "recordRef" | "addEvidenceItem" | "markReadyForReview">;

export type SingleSiteCaptureSpineAdapterDependencies = {
  writer?: WriterDependency;
  transitionService?: TransitionDependency;
  sourceEvidenceReviewService?: ReviewDependency;
};

const CAPTURE_SUCCESS_ORDER: SingleSiteMigrationState[] = [
  "site_candidate_created",
  "source_capture_started",
  "source_capture_completed",
  "source_evidence_review_required",
];

function trimText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function requiredText(field: string, value: unknown): string {
  const text = trimText(value);
  if (!text) throw new SingleSiteTransitionError(`${field} is required`);
  return text;
}

function envelope(input: SingleSiteCaptureSpineInput, suffix: string): {
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
} {
  return {
    actor: input.actor,
    correlationId: input.correlationId,
    causationId: input.causationId,
    idempotencyKey: `${input.idempotencyKey}:${suffix}`,
    requestId: input.requestId,
    privacyLabel: input.privacyLabel,
    retentionClass: input.retentionClass,
    metadataJson: input.metadataJson,
  };
}

function sourceWatermark(input: SingleSiteCaptureSpineInput): string {
  return (
    trimText(input.sourceWatermark) ??
    trimText(input.sourceHash) ??
    trimText(input.payloadHash) ??
    trimText(input.captureRunId) ??
    trimText(input.renderJobId) ??
    requiredText("sourceUrl", input.sourceUrl)
  );
}

function sourceEvidencePackageKey(input: SingleSiteCaptureSpineInput): string {
  return trimText(input.sourceEvidencePackageKey) ?? `source-capture:${sourceWatermark(input)}`;
}

function capturedAt(input: SingleSiteCaptureSpineInput): string {
  return (
    trimText(input.evidenceCapturedAt) ??
    trimText(input.captureCompletedAt) ??
    trimText(input.captureStartedAt) ??
    new Date().toISOString()
  );
}

function migrationCaptureRefs(input: SingleSiteCaptureSpineInput): SingleSiteJsonObject {
  return {
    captureRunId: trimText(input.captureRunId),
    renderJobId: trimText(input.renderJobId),
    sourceEvidencePackageKey: sourceEvidencePackageKey(input),
    sourceUrl: requiredText("sourceUrl", input.sourceUrl),
    sourceWatermark: sourceWatermark(input),
  };
}

function evidenceRefIdempotencyKey(root: string, ref: SingleSiteCaptureSpineEvidenceRefInput, index: number): string {
  return `${root}:evidence-ref:${ref.sourceEvidenceRefRole}:${ref.sourceRecordId}:${index + 1}`;
}

function requiredCategory(category: SingleSiteEvidenceItemCategory): boolean {
  return SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES.includes(category as (typeof SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES)[number]);
}

function categoryStatus(refs: readonly SingleSiteCaptureSpineEvidenceRefInput[], category: SingleSiteEvidenceItemCategory): SingleSiteEvidenceItemStatus {
  const categoryRefs = refs.filter((ref) => ref.category === category);
  if (categoryRefs.length === 0) return "missing";
  if (categoryRefs.some((ref) => ref.status === "degraded" || ref.status === "present_with_warnings")) return "present_with_warnings";
  return "present";
}

function itemSummary(category: SingleSiteEvidenceItemCategory, status: SingleSiteEvidenceItemStatus): string {
  if (status === "missing") return `No ${category} evidence was available from capture.`;
  if (status === "present_with_warnings") return `${category} evidence was captured with warnings or degraded quality.`;
  return `${category} evidence was captured.`;
}

function missingEvidence(input: SingleSiteCaptureSpineInput, refs: readonly SingleSiteCaptureSpineEvidenceRefInput[]): unknown[] {
  const existing = [...(input.missingEvidence ?? [])];
  const presentCategories = new Set(refs.map((ref) => ref.category));
  for (const category of SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES) {
    if (!presentCategories.has(category)) existing.push({ category, reason: "capture_artifact_not_available" });
  }
  return existing;
}

function completenessStatus(input: SingleSiteCaptureSpineInput, refs: readonly SingleSiteCaptureSpineEvidenceRefInput[]): SingleSiteSourceEvidenceCompletenessStatus {
  const missing = missingEvidence(input, refs);
  if (missing.length > 0) return "degraded";
  if ((input.warnings ?? []).length > 0 || refs.some((ref) => ref.status === "present_with_warnings" || ref.status === "degraded")) {
    return "complete_with_warnings";
  }
  return "complete";
}

function minimumEvidenceExists(refs: readonly SingleSiteCaptureSpineEvidenceRefInput[]): boolean {
  const categories = new Set(refs.map((ref) => ref.category));
  return categories.has("source_url") && categories.has("page") && (categories.has("dom") || categories.has("text") || categories.has("screenshot"));
}

function stateReached(currentState: SingleSiteMigrationState, targetState: SingleSiteMigrationState): boolean {
  const currentIndex = CAPTURE_SUCCESS_ORDER.indexOf(currentState);
  const targetIndex = CAPTURE_SUCCESS_ORDER.indexOf(targetState);
  return currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex;
}

function transitionRefs(input: SingleSiteCaptureSpineInput): SingleSiteTransitionRefInput[] {
  const refs: SingleSiteTransitionRefInput[] = [];
  if (trimText(input.captureRunId)) {
    refs.push({
      refRole: "capture_run",
      refType: "capture_run",
      sourceRecordId: trimText(input.captureRunId)!,
      sourceWatermark: sourceWatermark(input),
      payloadHash: trimText(input.payloadHash),
      capturedAt: trimText(input.captureCompletedAt),
      idempotencyKey: `${input.idempotencyKey}:migration-ref:capture-run`,
      metadataJson: { sourceEvidencePackageKey: sourceEvidencePackageKey(input) },
    });
  }
  if (trimText(input.renderJobId)) {
    refs.push({
      refRole: "render_job",
      refType: "render_job",
      sourceRecordId: trimText(input.renderJobId)!,
      sourceWatermark: sourceWatermark(input),
      payloadHash: trimText(input.payloadHash),
      capturedAt: trimText(input.captureCompletedAt),
      idempotencyKey: `${input.idempotencyKey}:migration-ref:render-job`,
    });
  }
  refs.push({
    refRole: "source_evidence_package",
    refType: "source_evidence_package",
    sourceRecordId: sourceEvidencePackageKey(input),
    sourceWatermark: sourceWatermark(input),
    payloadHash: trimText(input.payloadHash),
    capturedAt: trimText(input.captureCompletedAt),
    idempotencyKey: `${input.idempotencyKey}:migration-ref:source-evidence-package`,
  });
  return refs;
}

export class SingleSiteCaptureSpineAdapter {
  private readonly writer: WriterDependency;
  private readonly transitionService: TransitionDependency;
  private readonly sourceEvidenceReviewService: ReviewDependency;

  constructor(dependencies: SingleSiteCaptureSpineAdapterDependencies = {}) {
    this.writer = dependencies.writer ?? new SingleSiteStateWriterRepository();
    this.transitionService = dependencies.transitionService ?? new SingleSiteStateTransitionService(this.writer as SingleSiteStateWriterRepository);
    this.sourceEvidenceReviewService =
      dependencies.sourceEvidenceReviewService ?? new SourceEvidenceReviewService(this.writer as SingleSiteStateWriterRepository);
  }

  async recordCapture(input: SingleSiteCaptureSpineInput): Promise<SingleSiteCaptureSpineResult> {
    const migration = await this.resolveMigration(input);
    await this.transitionIfNeeded(migration.id, "source_capture_started", input, "capture-started", []);

    if (input.outcome === "failed") {
      const failed = await this.transitionIfNeeded(migration.id, "source_capture_failed", input, "capture-failed", transitionRefs(input), {
        reason: trimText(input.failureReason) ?? "capture_failed",
      });
      return {
        migrationId: migration.id,
        reviewId: null,
        outcomeState: failed ?? "source_capture_failed",
        reviewReadyForReview: false,
        completenessStatus: null,
        reusedMigration: migration.reusedExisting,
      };
    }

    await this.transitionIfNeeded(migration.id, "source_capture_completed", input, "capture-completed", transitionRefs(input));

    const refs = input.evidenceRefs ?? [];
    const existingReview = await this.findExistingReview(input);
    const review = existingReview
      ? { review: existingReview, reusedExisting: true }
      : await this.sourceEvidenceReviewService.createReview({
          migrationId: migration.id,
          tenantId: input.tenantId,
          clientId: input.clientId,
          siteId: input.siteId,
          ownershipSiteId: input.ownershipSiteId,
          runtimeSiteId: input.runtimeSiteId,
          siteVersionId: input.siteVersionId,
          sourceUrl: input.sourceUrl,
          canonicalSourceUrl: input.canonicalSourceUrl,
          captureRunId: trimText(input.captureRunId),
          renderJobId: trimText(input.renderJobId),
          sourceEvidencePackageKey: sourceEvidencePackageKey(input),
          sourceWatermark: sourceWatermark(input),
          sourceHash: trimText(input.sourceHash),
          captureStartedAt: trimText(input.captureStartedAt),
          captureCompletedAt: trimText(input.captureCompletedAt),
          evidenceCapturedAt: capturedAt(input),
          freshUntil: trimText(input.freshUntil),
          completenessStatus: completenessStatus(input, refs),
          reviewLimitationsJson: input.limitations ?? [],
          missingEvidenceJson: missingEvidence(input, refs),
          warningsJson: input.warnings ?? [],
          blockersJson: input.blockers ?? [],
          diagnosticsJson: input.diagnosticsJson,
          ...envelope(input, "source-evidence-review"),
        });

    for (const [index, ref] of refs.entries()) {
      await this.sourceEvidenceReviewService.recordRef({
        reviewId: review.review.id,
        migrationId: migration.id,
        refRole: ref.sourceEvidenceRefRole,
        refType: ref.refType,
        sourceSystem: ref.sourceSystem,
        sourceTable: ref.sourceTable,
        sourceRecordId: ref.sourceRecordId,
        sourceVersion: ref.sourceVersion,
        sourceWatermark: ref.sourceWatermark ?? input.sourceWatermark,
        contentHash: ref.contentHash,
        mediaType: ref.mediaType,
        capturedAt: ref.capturedAt ?? input.captureCompletedAt,
        freshUntil: ref.freshUntil ?? input.freshUntil,
        ...envelope(input, `source-evidence-ref:${ref.sourceEvidenceRefRole}:${index + 1}`),
        idempotencyKey: evidenceRefIdempotencyKey(input.idempotencyKey, ref, index),
        metadataJson: ref.metadataJson ?? input.metadataJson,
      });
    }

    const categories = new Set<SingleSiteEvidenceItemCategory>([
      ...SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES,
      ...refs.map((ref) => ref.category),
      ...((input.limitations ?? []).length > 0 ? (["limitation"] as SingleSiteEvidenceItemCategory[]) : []),
      ...(missingEvidence(input, refs).length > 0 ? (["missing_evidence"] as SingleSiteEvidenceItemCategory[]) : []),
    ]);

    for (const category of categories) {
      const status =
        category === "limitation" ? "present_with_warnings" : category === "missing_evidence" ? "present" : categoryStatus(refs, category);
      await this.sourceEvidenceReviewService.addEvidenceItem({
        reviewId: review.review.id,
        migrationId: migration.id,
        evidenceCategory: category,
        status,
        requiredForClone: requiredCategory(category),
        blocksCloneGeneration: requiredCategory(category) && ["missing", "degraded", "unverified"].includes(status),
        acceptedLimitation: false,
        findingSummary: itemSummary(category, status),
        refIdsJson: refs
          .filter((ref) => ref.category === category)
          .map((ref) => ({ role: ref.sourceEvidenceRefRole, sourceRecordId: ref.sourceRecordId })),
        limitationJson: category === "limitation" ? { limitations: input.limitations ?? [] } : undefined,
        warningsJson: refs.filter((ref) => ref.category === category).flatMap((ref) => ref.warningsJson ?? []),
        blockerJson: requiredCategory(category) && status === "missing" ? { category, reason: "capture_artifact_not_available" } : undefined,
        ...envelope(input, `source-evidence-item:${category}`),
      });
    }

    const readyForReview = minimumEvidenceExists(refs);
    if (readyForReview) {
      await this.sourceEvidenceReviewService.markReadyForReview({
        reviewId: review.review.id,
        limitationsJson: input.limitations ?? [],
        missingEvidenceJson: missingEvidence(input, refs),
        warningsJson: input.warnings ?? [],
        blockersJson: input.blockers ?? [],
        diagnosticsJson: input.diagnosticsJson,
        detailsJson: { minimumEvidenceExists: true },
        ...envelope(input, "source-evidence-ready"),
      });
      await this.transitionIfNeeded(migration.id, "source_evidence_review_required", input, "source-evidence-review-required", [
        {
          refRole: "source_evidence_review",
          refType: "source_evidence_review",
          sourceRecordId: review.review.id,
          sourceWatermark: sourceWatermark(input),
          idempotencyKey: `${input.idempotencyKey}:migration-ref:source-evidence-review`,
        },
      ], { reviewId: review.review.id });
    }

    return {
      migrationId: migration.id,
      reviewId: review.review.id,
      outcomeState: readyForReview ? "source_evidence_review_required" : "source_capture_completed",
      reviewReadyForReview: readyForReview,
      completenessStatus: review.review.completeness_status,
      reusedMigration: migration.reusedExisting || review.reusedExisting,
    };
  }

  private async resolveMigration(input: SingleSiteCaptureSpineInput): Promise<SingleSiteMigrationRow & { reusedExisting: boolean }> {
    const byId = trimText(input.migrationId);
    if (byId) {
      const migration = await this.writer.withTransaction((tx: SingleSiteStateWriterTx) => this.writer.getMigrationById(tx, byId));
      if (!migration) throw new SingleSiteTransitionError(`single-site migration ${byId} was not found`);
      return { ...migration, reusedExisting: true };
    }

    const byIdempotencyKey = trimText(input.migrationIdempotencyKey);
    if (byIdempotencyKey) {
      const migration = await this.writer.withTransaction((tx: SingleSiteStateWriterTx) =>
        this.writer.getMigrationByIdempotencyKey(tx, byIdempotencyKey),
      );
      if (migration) return { ...migration, reusedExisting: true };
    }

    const createInput: CreateSingleSiteMigrationInput = {
      tenantId: input.tenantId,
      clientId: input.clientId,
      siteId: input.siteId,
      ownershipSiteId: input.ownershipSiteId,
      runtimeSiteId: input.runtimeSiteId,
      siteVersionId: input.siteVersionId,
      runtimeSiteVersionId: input.runtimeSiteVersionId,
      sourceUrl: input.sourceUrl,
      canonicalSourceUrl: input.canonicalSourceUrl,
      intendedLaunchDomain: input.intendedLaunchDomain,
      sourceCaptureRefsJson: migrationCaptureRefs(input),
      limitationsJson: input.limitations,
      warningsJson: input.warnings,
      blockersJson: input.blockers,
      sourceWatermark: sourceWatermark(input),
      payloadHash: input.payloadHash,
      validationSiteNumber: input.validationSiteNumber,
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: byIdempotencyKey ?? `${input.idempotencyKey}:migration`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    };
    const created = await this.writer.withTransaction((tx: SingleSiteStateWriterTx) => this.writer.createMigration(tx, createInput));
    return { ...created.row, reusedExisting: created.reusedExisting };
  }

  private async findExistingReview(input: SingleSiteCaptureSpineInput): Promise<SingleSiteSourceEvidenceReviewRow | null> {
    return this.writer.withTransaction((tx: SingleSiteStateWriterTx) =>
      this.writer.getSourceEvidenceReviewByIdempotencyKey(tx, `${input.idempotencyKey}:source-evidence-review`),
    );
  }

  private async transitionIfNeeded(
    migrationId: string,
    toState: SingleSiteMigrationState,
    input: SingleSiteCaptureSpineInput,
    suffix: string,
    refs: NonNullable<Parameters<TransitionDependency["transition"]>[0]["refs"]>,
    options: { reason?: string | null; reviewId?: string | null } = {},
  ): Promise<SingleSiteMigrationState | null> {
    const migration = await this.writer.withTransaction((tx: SingleSiteStateWriterTx) => this.writer.getMigrationById(tx, migrationId));
    if (!migration) throw new SingleSiteTransitionError(`single-site migration ${migrationId} was not found`);
    if (migration.current_state === toState || (toState !== "source_capture_failed" && stateReached(migration.current_state, toState))) {
      return migration.current_state;
    }

    const result = await this.transitionService.transition({
      migrationId,
      toState,
      actor: input.actor,
      transitionKey: `capture_spine.${toState}`,
      transitionReason: options.reason ?? (input.outcome === "failed" ? trimText(input.failureReason) : null),
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: `${input.idempotencyKey}:transition:${suffix}`,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
      refs,
      sourceEvidenceReviewId: options.reviewId,
      sourceWatermark: sourceWatermark(input),
      payloadHash: input.payloadHash,
      afterRefJson: {
        captureRunId: trimText(input.captureRunId),
        renderJobId: trimText(input.renderJobId),
        sourceEvidencePackageKey: sourceEvidencePackageKey(input),
      },
    });
    return result.toState;
  }
}

export async function recordSingleSiteCaptureSpine(input: SingleSiteCaptureSpineInput): Promise<SingleSiteCaptureSpineResult> {
  return new SingleSiteCaptureSpineAdapter().recordCapture(input);
}
