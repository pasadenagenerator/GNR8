import "server-only";

import {
  LAUNCH_READINESS_SOURCE_DIMENSIONS,
  type LaunchReadinessSourceDimension,
  type LaunchReadinessSourceDimensionPackage,
  type LaunchReadinessSourcePackage,
  type LaunchReadinessSourceRef,
} from "./launch-readiness-source-reader";
import { SingleSiteStateWriterError, SingleSiteTransitionError } from "./single-site-state-contracts";
import {
  LaunchReadinessWriterRepository,
  hashLaunchReadinessWriterValue,
  type LaunchReadinessActor,
  type LaunchReadinessBlockerSeverity,
  type LaunchReadinessDimensionRow,
  type LaunchReadinessEventAction,
  type LaunchReadinessFreshnessStatus,
  type LaunchReadinessRecordRow,
  type LaunchReadinessRecordStatus,
  type LaunchReadinessRefRow,
  type LaunchReadinessWriterRepositoryLike,
  type LaunchReadinessWriterTx,
} from "./launch-readiness-writer-repository";

export const LAUNCH_READINESS_SERVICE_VERSION = "mvp-39-launch-readiness-service:v1" as const;

export const LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS = {
  derivedFromSourceReader: true,
  mutatesSourceTruth: false,
  mutatesReadinessPersistence: true,
  createsAafRecords: false,
  createsDdomSnapshots: false,
  publishes: false,
  publishActivationApproved: false,
  publishActionBlocked: false,
  runtimeMutation: false,
  providerCalls: false,
} as const;

export const REQUIRED_LAUNCH_READINESS_DIMENSIONS = [
  "launch_approval",
  "content_approval",
  "client_approval",
  "improved_candidate",
  "publish_target",
  "domain_readiness",
  "billing_subscription",
  "hosting_entitlement",
  "rollback_readiness",
  "preview_smoke_qa",
] as const satisfies readonly LaunchReadinessSourceDimension[];

const NON_ENFORCING_DIMENSIONS = new Set<LaunchReadinessSourceDimension>(["limitations", "audit_timeline", "pasr_shadow_diagnostics"]);
const DIMENSION_ORDER = new Map<LaunchReadinessSourceDimension, number>(LAUNCH_READINESS_SOURCE_DIMENSIONS.map((dimension, index) => [dimension, index]));

export type RecordLaunchReadinessFromSourcesInput = {
  sourcePackage: LaunchReadinessSourcePackage;
  actor?: LaunchReadinessActor | null;
  correlationId?: string | null;
  causationId?: string | null;
  idempotencyKey?: string | null;
  requestId?: string | null;
  privacyLabel?: string | null;
  retentionClass?: string | null;
  metadataJson?: Record<string, unknown>;
};

export type MarkLaunchReadinessStatusInput = {
  readinessId: string;
  actor: LaunchReadinessActor;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  readinessSummaryJson?: Record<string, unknown>;
  limitationSummaryJson?: readonly unknown[];
  blockerSummaryJson?: readonly unknown[];
  reason?: string | null;
};

export type RecordLaunchReadinessCloseoutInput = {
  readinessId: string;
  actor: LaunchReadinessActor;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  finalEvidenceSummaryJson: Record<string, unknown>;
  finalLimitationsJson?: readonly unknown[];
  finalBlockersJson?: readonly unknown[];
  publishActivationHandoffRefsJson?: readonly LaunchReadinessCloseoutHandoffRef[];
  privacyLabel?: string | null;
  retentionClass?: string | null;
  metadataJson?: Record<string, unknown>;
};

export type LaunchReadinessCloseoutHandoffRef = {
  refRole?: string | null;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceType: string;
  sourceRecordId: string;
  sourceRef: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  metadata?: Record<string, unknown>;
};

export type LaunchReadinessOperationResult = {
  readiness: LaunchReadinessRecordRow;
  dimensions: LaunchReadinessDimensionRow[];
  refs: LaunchReadinessRefRow[];
  blockerCount: number;
  limitationCount: number;
  eventActions: LaunchReadinessEventAction[];
  idempotency: {
    key: string;
    reused: boolean;
    semanticFingerprint: string;
  };
  boundary: typeof LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS;
};

export type LaunchReadinessStatusOperationResult = {
  readiness: LaunchReadinessRecordRow;
  eventActions: LaunchReadinessEventAction[];
  boundary: typeof LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS;
};

export type LaunchReadinessCloseoutOperationResult = {
  readiness: LaunchReadinessRecordRow;
  closeoutId: string;
  refs: LaunchReadinessRefRow[];
  eventActions: LaunchReadinessEventAction[];
  boundary: typeof LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS;
};

type Envelope = {
  actor: LaunchReadinessActor;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: string | null;
  retentionClass?: string | null;
  metadataJson?: Record<string, unknown>;
};

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new SingleSiteStateWriterError(`missing required launch readiness service field: ${field}`);
  return normalized;
}

function uniqueSorted(values: readonly (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.map(text).filter((value): value is string => Boolean(value)))).sort((left, right) => left.localeCompare(right));
}

function packageActor(sourcePackage: LaunchReadinessSourcePackage): LaunchReadinessActor {
  return {
    actorType: sourcePackage.readTrace.actorType as LaunchReadinessActor["actorType"],
    actorId: sourcePackage.readTrace.actorId,
    actorRole: sourcePackage.readTrace.actorRole,
  };
}

function sourcePackageEnvelope(input: RecordLaunchReadinessFromSourcesInput): Envelope {
  return {
    actor: input.actor ?? packageActor(input.sourcePackage),
    correlationId: requiredText("correlationId", input.correlationId ?? input.sourcePackage.readTrace.correlationId),
    causationId: input.causationId ?? input.sourcePackage.readTrace.causationId,
    idempotencyKey: requiredText("idempotencyKey", input.idempotencyKey ?? `launch-readiness-writer:${input.sourcePackage.readTrace.idempotencyKey}`),
    requestId: input.requestId ?? input.sourcePackage.readTrace.requestId,
    privacyLabel: input.privacyLabel,
    retentionClass: input.retentionClass,
    metadataJson: input.metadataJson,
  };
}

function isRequiredDimension(dimension: LaunchReadinessSourceDimensionPackage): boolean {
  if (NON_ENFORCING_DIMENSIONS.has(dimension.dimension)) return false;
  if (dimension.dimension === "client_approval" && dimension.requiredForLaunchReadiness === false) return false;
  return dimension.requiredForLaunchReadiness || (REQUIRED_LAUNCH_READINESS_DIMENSIONS as readonly string[]).includes(dimension.dimension);
}

function isReadFailure(sourcePackage: LaunchReadinessSourcePackage): boolean {
  return (
    sourcePackage.diagnostics.failClosed === true ||
    sourcePackage.blockerSummaries.includes("launch_readiness_source_reader_failed_closed") ||
    sourcePackage.dimensions.launch_approval.blockers.includes("launch_readiness_source_reader_failed_closed")
  );
}

function mappedReadinessStatus(sourcePackage: LaunchReadinessSourcePackage): LaunchReadinessRecordStatus {
  if (isReadFailure(sourcePackage)) return "blocked";
  const required = Object.values(sourcePackage.dimensions).filter(isRequiredDimension);
  if (required.some((dimension) => ["blocked", "missing", "unknown"].includes(dimension.status))) return "blocked";
  if (required.some((dimension) => dimension.status === "stale" || dimension.freshnessStatus === "stale")) return "stale";
  if (required.some((dimension) => dimension.status === "ready_with_limitations") || sourcePackage.limitations.length > 0) return "ready_with_limitations";
  return "ready";
}

function mappedFreshnessStatus(sourcePackage: LaunchReadinessSourcePackage, readinessStatus: LaunchReadinessRecordStatus): LaunchReadinessFreshnessStatus {
  if (readinessStatus === "stale") return "stale";
  if (sourcePackage.freshnessStatus === "missing") return "missing";
  if (sourcePackage.freshnessStatus === "stale") return "stale";
  if (sourcePackage.freshnessStatus === "unknown") return "unknown";
  return "fresh";
}

function statusEventAction(status: LaunchReadinessRecordStatus): LaunchReadinessEventAction {
  if (status === "ready") return "readiness_marked_ready";
  if (status === "ready_with_limitations") return "readiness_marked_ready_with_limitations";
  if (status === "stale") return "readiness_marked_stale";
  if (status === "superseded") return "readiness_superseded";
  if (status === "cancelled") return "readiness_cancelled";
  return "readiness_blocked";
}

function blockerCategory(dimension: LaunchReadinessSourceDimension): string {
  if (dimension === "launch_approval") return "launch_approval";
  if (dimension === "content_approval") return "content_approval";
  if (dimension === "client_approval") return "client_approval";
  if (["domain_readiness", "dns_operator_evidence", "vercel_custom_domain_ssl"].includes(dimension)) return "domain_dns";
  if (dimension === "billing_subscription") return "billing_subscription";
  if (dimension === "hosting_entitlement") return "hosting_entitlement";
  if (dimension === "stripe_payment") return "stripe_payment";
  if (dimension === "publish_target") return "publish_target";
  if (dimension === "rollback_readiness") return "rollback";
  if (dimension === "preview_smoke_qa") return "smoke_qa";
  if (dimension === "improved_candidate") return "runtime_candidate";
  if (dimension === "limitations") return "limitation";
  return "evidence";
}

function blockerSeverity(dimension: LaunchReadinessSourceDimensionPackage): LaunchReadinessBlockerSeverity {
  if (isRequiredDimension(dimension) && ["blocked", "missing", "stale", "unknown"].includes(dimension.status)) return "p0_blocker";
  if (dimension.status === "ready_with_limitations") return "p2_minor";
  return "p1_major";
}

function sourceRefSummary(ref: LaunchReadinessSourceRef): Record<string, unknown> {
  return {
    sourceSystem: ref.sourceSystem,
    sourceTable: ref.sourceTable,
    sourceType: ref.sourceType,
    sourceRecordId: ref.sourceRecordId,
    sourceRef: ref.sourceRef,
    sourceVersion: ref.sourceVersion,
    sourceWatermark: ref.sourceWatermark,
    freshUntil: ref.freshUntil,
    evidenceOnly: ref.evidenceOnly,
    metadata: ref.metadata ?? {},
  };
}

function semanticFingerprint(sourcePackage: LaunchReadinessSourcePackage, status: LaunchReadinessRecordStatus): string {
  const payload = {
    serviceVersion: LAUNCH_READINESS_SERVICE_VERSION,
    identity: sourcePackage.identity,
    status,
    freshnessStatus: sourcePackage.freshnessStatus,
    sourceWatermark: sourcePackage.semanticSourceWatermark,
    dimensions: Object.fromEntries(
      LAUNCH_READINESS_SOURCE_DIMENSIONS.map((dimension) => {
        const item = sourcePackage.dimensions[dimension];
        return [
          dimension,
          {
            status: item.status,
            freshnessStatus: item.freshnessStatus,
            sourceRefs: item.sourceRefs.map(sourceRefSummary),
            sourceWatermarks: item.sourceWatermarks,
            semanticSourceWatermark: item.semanticSourceWatermark,
            freshUntil: item.freshUntil,
            blockers: item.blockers,
            limitations: item.limitations,
            requiredForLaunchReadiness: isRequiredDimension(item),
            requiredForPublishActivation: item.requiredForPublishActivation,
          },
        ];
      }),
    ),
    blockerSummaries: sourcePackage.blockerSummaries,
    limitations: sourcePackage.limitations,
    missingSourceTruth: sourcePackage.missingSourceTruth,
    staleSourceTruth: sourcePackage.staleSourceTruth,
    unsupportedSourceTruth: sourcePackage.unsupportedSourceTruth,
  };
  return `sha256:${hashLaunchReadinessWriterValue(payload)}`;
}

function dimensionSourceWatermark(dimension: LaunchReadinessSourceDimensionPackage): string | null {
  return text(dimension.semanticSourceWatermark) ?? uniqueSorted(dimension.sourceWatermarks)[0] ?? null;
}

function refRoleFor(dimension: LaunchReadinessSourceDimension, ref: LaunchReadinessSourceRef): string {
  const role = typeof ref.metadata?.refRole === "string" ? ref.metadata.refRole : "";
  if (dimension === "launch_approval") return "launch_approval_decision";
  if (dimension === "content_approval") return "content_approval_decision";
  if (dimension === "client_approval") return "client_approval_decision";
  if (ref.sourceType === "improved_runtime_artifact") return "improved_runtime_artifact";
  if (dimension === "improved_candidate") return "improved_candidate_site_version";
  if (dimension === "publish_target") return "publish_target";
  if (ref.sourceType === "ddom_readiness_snapshot") return "ddom_readiness_snapshot";
  if (role === "manual_completion_evidence") return "domain_operator_evidence";
  if (role === "dns_instruction_snapshot") return "dns_instruction";
  if (role === "vercel_snapshot") return "vercel_domain_state";
  if (role === "ssl_state") return "ssl_state";
  if (dimension === "dns_operator_evidence") return role === "dns_instruction_snapshot" ? "dns_instruction" : "domain_operator_evidence";
  if (dimension === "vercel_custom_domain_ssl") return role === "ssl_state" ? "ssl_state" : "vercel_domain_state";
  if (dimension === "billing_subscription") return "billing_subscription";
  if (dimension === "hosting_entitlement") return "hosting_entitlement";
  if (role === "stripe_customer") return "stripe_customer";
  if (dimension === "stripe_payment") return "stripe_subscription";
  if (dimension === "rollback_readiness") return "rollback_readiness";
  if (dimension === "preview_smoke_qa") return "preview_smoke_qa";
  if (dimension === "limitations") return "limitation";
  if (dimension === "pasr_shadow_diagnostics") return "pasr_shadow_result";
  return "audit_event";
}

function visibleSourceRefs(sourcePackage: LaunchReadinessSourcePackage): Array<{ dimension: LaunchReadinessSourceDimension; ref: LaunchReadinessSourceRef }> {
  return LAUNCH_READINESS_SOURCE_DIMENSIONS.flatMap((dimension) =>
    sourcePackage.dimensions[dimension].sourceRefs.map((ref) => ({
      dimension,
      ref,
    })),
  ).sort((left, right) => {
    const dimensionSort = (DIMENSION_ORDER.get(left.dimension) ?? 0) - (DIMENSION_ORDER.get(right.dimension) ?? 0);
    return dimensionSort || left.ref.sourceRef.localeCompare(right.ref.sourceRef);
  });
}

function readinessSummary(sourcePackage: LaunchReadinessSourcePackage, status: LaunchReadinessRecordStatus): Record<string, unknown> {
  return {
    status,
    sourceOverallStatus: sourcePackage.overallSourceStatus,
    freshnessStatus: sourcePackage.freshnessStatus,
    requiredDimensions: REQUIRED_LAUNCH_READINESS_DIMENSIONS,
    missingSourceTruth: sourcePackage.missingSourceTruth,
    staleSourceTruth: sourcePackage.staleSourceTruth,
    unsupportedSourceTruth: sourcePackage.unsupportedSourceTruth,
    recommendedNextAction: sourcePackage.recommendedNextAction,
    readFailure: isReadFailure(sourcePackage),
    boundary: LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS,
  };
}

function blockerSummaries(sourcePackage: LaunchReadinessSourcePackage): Array<Record<string, unknown>> {
  return LAUNCH_READINESS_SOURCE_DIMENSIONS.flatMap((dimension) => {
    const item = sourcePackage.dimensions[dimension];
    if (!isRequiredDimension(item)) return [];
    if (!["blocked", "missing", "stale", "unknown"].includes(item.status) && item.freshnessStatus !== "stale") return [];
    const descriptions = item.blockers.length > 0 ? item.blockers : [`${dimension}_${item.status}`];
    return descriptions.map((description) => ({
      dimension,
      description,
      status: item.status,
      freshnessStatus: item.freshnessStatus,
      severity: blockerSeverity(item),
      category: blockerCategory(dimension),
    }));
  });
}

function limitationSummaries(sourcePackage: LaunchReadinessSourcePackage): Array<Record<string, unknown>> {
  return uniqueSorted(sourcePackage.limitations).map((limitation) => ({
    limitation,
    accepted: true,
    source: "launch_readiness_source_package",
  }));
}

function closeoutFingerprint(input: RecordLaunchReadinessCloseoutInput, readiness: LaunchReadinessRecordRow): string {
  return `sha256:${hashLaunchReadinessWriterValue({
    serviceVersion: LAUNCH_READINESS_SERVICE_VERSION,
    readinessId: input.readinessId,
    readinessStatus: readiness.status,
    finalEvidenceSummaryJson: input.finalEvidenceSummaryJson,
    finalLimitationsJson: input.finalLimitationsJson ?? [],
    finalBlockersJson: input.finalBlockersJson ?? [],
    publishActivationHandoffRefsJson: input.publishActivationHandoffRefsJson ?? [],
  })}`;
}

export class LaunchReadinessService {
  constructor(private readonly repository: LaunchReadinessWriterRepositoryLike = new LaunchReadinessWriterRepository()) {}

  async recordLaunchReadinessFromSources(input: RecordLaunchReadinessFromSourcesInput): Promise<LaunchReadinessOperationResult> {
    const sourcePackage = input.sourcePackage;
    const envelope = sourcePackageEnvelope(input);
    const status = mappedReadinessStatus(sourcePackage);
    const freshnessStatus = mappedFreshnessStatus(sourcePackage, status);
    const fingerprint = semanticFingerprint(sourcePackage, status);
    const blockers = blockerSummaries(sourcePackage);
    const limitations = limitationSummaries(sourcePackage);

    return this.repository.withTransaction(async (tx) => {
      const created = await this.repository.createOrReuseReadinessRecord(tx, {
        ...envelope,
        tenantId: sourcePackage.identity.tenantId,
        clientId: sourcePackage.identity.clientId,
        siteId: sourcePackage.identity.siteId,
        migrationId: sourcePackage.identity.migrationId,
        launchApprovalRef: sourcePackage.identity.launchApprovalDecisionRef,
        launchApprovalSourceWatermark: sourcePackage.dimensions.launch_approval.semanticSourceWatermark,
        improvedCandidateSiteVersionRef: sourcePackage.identity.improvedCandidateSiteVersionRef,
        improvedRuntimeArtifactRef: sourcePackage.identity.improvedRuntimeArtifactRef,
        status,
        freshnessStatus,
        semanticSourceWatermark: fingerprint,
        readinessSummaryJson: readinessSummary(sourcePackage, status),
        limitationSummaryJson: limitations,
        blockerSummaryJson: blockers,
        metadataJson: {
          ...(envelope.metadataJson ?? {}),
          serviceVersion: LAUNCH_READINESS_SERVICE_VERSION,
          sourceReaderVersion: sourcePackage.readTrace.readerVersion,
          sourcePackageSemanticWatermark: sourcePackage.semanticSourceWatermark,
          semanticFingerprint: fingerprint,
          boundary: LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS,
        },
      });

      const eventActions: LaunchReadinessEventAction[] = [];
      let eventIndex = await this.repository.nextEventIndex(tx, created.row.id);
      const emit = async (
        eventAction: LaunchReadinessEventAction,
        eventKey: string,
        detailsJson: Record<string, unknown>,
        options: { dimensionId?: string | null; blockerId?: string | null; fromStatus?: LaunchReadinessRecordStatus | null; toStatus?: LaunchReadinessRecordStatus | null; sourceWatermark?: string | null; semanticWatermark?: string | null } = {},
      ) => {
        await this.repository.createOrReuseEvent(tx, {
          ...envelope,
          readinessId: created.row.id,
          dimensionId: options.dimensionId,
          blockerId: options.blockerId,
          eventIndex,
          eventAction,
          fromStatus: options.fromStatus,
          toStatus: options.toStatus,
          detailsJson,
          sourceWatermark: options.sourceWatermark,
          semanticWatermark: options.semanticWatermark ?? fingerprint,
          idempotencyKey: `${envelope.idempotencyKey}:event:${eventKey}`,
          metadataJson: { serviceVersion: LAUNCH_READINESS_SERVICE_VERSION },
        });
        eventIndex += 1;
        eventActions.push(eventAction);
      };

      await emit("readiness_created", "readiness_created", { status, freshnessStatus }, { toStatus: status, semanticWatermark: fingerprint });
      await emit("evidence_collection_started", "evidence_collection_started", { sourcePackageWatermark: sourcePackage.semanticSourceWatermark }, { toStatus: status });

      const dimensions: LaunchReadinessDimensionRow[] = [];
      const dimensionByName = new Map<LaunchReadinessSourceDimension, LaunchReadinessDimensionRow>();
      for (const dimensionName of LAUNCH_READINESS_SOURCE_DIMENSIONS) {
        const dimension = sourcePackage.dimensions[dimensionName];
        const dimensionResult = await this.repository.createOrReuseDimension(tx, {
          ...envelope,
          readinessId: created.row.id,
          dimension: dimension.dimension,
          dimensionStatus: dimension.status,
          sourceRefsJson: dimension.sourceRefs.map(sourceRefSummary),
          sourceWatermark: dimensionSourceWatermark(dimension),
          freshnessStatus: dimension.freshnessStatus,
          sourceCapturedAt: dimension.sourceCapturedAt,
          freshUntil: dimension.freshUntil,
          blockerRefsJson: dimension.blockers,
          limitationsJson: dimension.limitations,
          diagnosticsJson: {
            ...dimension.diagnostics,
            requiredByMvp39: isRequiredDimension(dimension),
            pasrNonEnforcing: dimension.dimension === "pasr_shadow_diagnostics",
          },
          requiredForLaunchReadiness: isRequiredDimension(dimension),
          requiredForPublishActivation: dimension.requiredForPublishActivation && !NON_ENFORCING_DIMENSIONS.has(dimension.dimension),
          idempotencyKey: `${envelope.idempotencyKey}:dimension:${dimension.dimension}`,
          metadataJson: {
            serviceVersion: LAUNCH_READINESS_SERVICE_VERSION,
            semanticSourceWatermark: dimension.semanticSourceWatermark,
          },
        });
        dimensions.push(dimensionResult.row);
        dimensionByName.set(dimensionName, dimensionResult.row);
        await emit(
          "dimension_recorded",
          `dimension_recorded:${dimension.dimension}`,
          { dimension: dimension.dimension, status: dimension.status, freshnessStatus: dimension.freshnessStatus },
          { dimensionId: dimensionResult.row.id, toStatus: status, sourceWatermark: dimensionSourceWatermark(dimension), semanticWatermark: dimension.semanticSourceWatermark },
        );
      }

      const refs: LaunchReadinessRefRow[] = [];
      for (const [index, item] of visibleSourceRefs(sourcePackage).entries()) {
        const dimension = dimensionByName.get(item.dimension);
        const refResult = await this.repository.createOrReuseRef(tx, {
          readinessId: created.row.id,
          dimensionId: dimension?.id ?? null,
          refRole: refRoleFor(item.dimension, item.ref),
          sourceSystem: item.ref.sourceSystem,
          sourceTable: item.ref.sourceTable,
          sourceType: item.ref.sourceType,
          sourceRecordId: item.ref.sourceRecordId,
          sourceRef: item.ref.sourceRef,
          sourceVersion: item.ref.sourceVersion,
          sourceWatermark: item.ref.sourceWatermark,
          metadataJson: {
            ...(item.ref.metadata ?? {}),
            capturedAt: item.ref.capturedAt,
            freshUntil: item.ref.freshUntil,
            evidenceOnly: item.ref.evidenceOnly,
            dimension: item.dimension,
          },
          idempotencyKey: `${envelope.idempotencyKey}:ref:${index + 1}:${hashLaunchReadinessWriterValue(sourceRefSummary(item.ref))}`,
        });
        refs.push(refResult.row);
        await emit(
          "dimension_ref_recorded",
          `dimension_ref_recorded:${index + 1}`,
          { dimension: item.dimension, sourceRef: item.ref.sourceRef, refRole: refRoleFor(item.dimension, item.ref) },
          { dimensionId: dimension?.id ?? null, toStatus: status, sourceWatermark: item.ref.sourceWatermark },
        );
      }

      for (const [index, blocker] of blockers.entries()) {
        const dimensionName = blocker.dimension as LaunchReadinessSourceDimension;
        const dimension = dimensionByName.get(dimensionName);
        const blockerResult = await this.repository.createOrReuseBlocker(tx, {
          ...envelope,
          readinessId: created.row.id,
          dimensionId: dimension?.id ?? null,
          severity: blocker.severity as LaunchReadinessBlockerSeverity,
          category: String(blocker.category),
          status: "open",
          description: String(blocker.description),
          sourceRefsJson: sourcePackage.dimensions[dimensionName].sourceRefs.map(sourceRefSummary),
          idempotencyKey: `${envelope.idempotencyKey}:blocker:${index + 1}:${hashLaunchReadinessWriterValue(blocker)}`,
          metadataJson: { serviceVersion: LAUNCH_READINESS_SERVICE_VERSION, dimension: dimensionName },
        });
        await emit(
          "blocker_opened",
          `blocker_opened:${index + 1}`,
          { blocker, dimension: dimensionName },
          { dimensionId: dimension?.id ?? null, blockerId: blockerResult.row.id, toStatus: status },
        );
      }

      for (const [index, limitation] of limitations.entries()) {
        const dimension = dimensionByName.get("limitations");
        const blockerResult = await this.repository.createOrReuseBlocker(tx, {
          ...envelope,
          readinessId: created.row.id,
          dimensionId: dimension?.id ?? null,
          severity: "p3_note",
          category: "limitation",
          status: "accepted_limitation",
          description: String(limitation.limitation),
          sourceRefsJson: [],
          resolutionRefsJson: [{ acceptedFrom: "launch_readiness_source_package" }],
          idempotencyKey: `${envelope.idempotencyKey}:limitation:${index + 1}:${hashLaunchReadinessWriterValue(limitation)}`,
          metadataJson: { serviceVersion: LAUNCH_READINESS_SERVICE_VERSION },
        });
        await emit(
          "limitation_accepted",
          `limitation_accepted:${index + 1}`,
          { limitation },
          { dimensionId: dimension?.id ?? null, blockerId: blockerResult.row.id, toStatus: status },
        );
      }

      await emit(statusEventAction(status), `readiness_status:${status}`, { status, blockerCount: blockers.length, limitationCount: limitations.length }, { toStatus: status });

      return {
        readiness: created.row,
        dimensions,
        refs,
        blockerCount: blockers.length,
        limitationCount: limitations.length,
        eventActions,
        idempotency: {
          key: envelope.idempotencyKey,
          reused: created.reusedExisting,
          semanticFingerprint: fingerprint,
        },
        boundary: LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS,
      };
    });
  }

  async markLaunchReadinessReady(input: MarkLaunchReadinessStatusInput): Promise<LaunchReadinessStatusOperationResult> {
    return this.markStatus(input, "ready", "fresh", "readiness_marked_ready");
  }

  async markLaunchReadinessReadyWithLimitations(input: MarkLaunchReadinessStatusInput): Promise<LaunchReadinessStatusOperationResult> {
    return this.markStatus(input, "ready_with_limitations", "fresh", "readiness_marked_ready_with_limitations");
  }

  async markLaunchReadinessBlocked(input: MarkLaunchReadinessStatusInput): Promise<LaunchReadinessStatusOperationResult> {
    return this.markStatus(input, "blocked", "unknown", "readiness_blocked");
  }

  async markLaunchReadinessStale(input: MarkLaunchReadinessStatusInput): Promise<LaunchReadinessStatusOperationResult> {
    return this.markStatus(input, "stale", "stale", "readiness_marked_stale");
  }

  async recordLaunchReadinessCloseout(input: RecordLaunchReadinessCloseoutInput): Promise<LaunchReadinessCloseoutOperationResult> {
    const envelope: Envelope = {
      actor: input.actor,
      correlationId: input.correlationId,
      causationId: input.causationId,
      idempotencyKey: input.idempotencyKey,
      requestId: input.requestId,
      privacyLabel: input.privacyLabel,
      retentionClass: input.retentionClass,
      metadataJson: input.metadataJson,
    };

    return this.repository.withTransaction(async (tx) => {
      const readiness = await this.requireCloseoutReady(tx, input.readinessId);
      const fingerprint = closeoutFingerprint(input, readiness);
      const closeout = await this.repository.createOrReuseCloseout(tx, {
        ...envelope,
        readinessId: input.readinessId,
        finalStatus: readiness.status as "ready" | "ready_with_limitations",
        finalEvidenceSummaryJson: input.finalEvidenceSummaryJson,
        finalLimitationsJson: input.finalLimitationsJson ?? [],
        finalBlockersJson: input.finalBlockersJson ?? [],
        publishActivationHandoffRefsJson: input.publishActivationHandoffRefsJson ?? [],
        metadataJson: {
          ...(input.metadataJson ?? {}),
          serviceVersion: LAUNCH_READINESS_SERVICE_VERSION,
          semanticFingerprint: fingerprint,
          boundary: LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS,
        },
      });

      const refs: LaunchReadinessRefRow[] = [];
      for (const [index, ref] of (input.publishActivationHandoffRefsJson ?? []).entries()) {
        const refResult = await this.repository.createOrReuseRef(tx, {
          readinessId: input.readinessId,
          dimensionId: null,
          refRole: text(ref.refRole) ?? "audit_event",
          sourceSystem: text(ref.sourceSystem) ?? "gnr8",
          sourceTable: ref.sourceTable ?? null,
          sourceType: ref.sourceType,
          sourceRecordId: ref.sourceRecordId,
          sourceRef: ref.sourceRef,
          sourceVersion: ref.sourceVersion,
          sourceWatermark: ref.sourceWatermark,
          metadataJson: {
            ...(ref.metadata ?? {}),
            closeoutId: closeout.row.id,
            handoffOnly: true,
            publishActivationApprovalCreated: false,
          },
          idempotencyKey: `${input.idempotencyKey}:handoff_ref:${index + 1}:${hashLaunchReadinessWriterValue(ref)}`,
        });
        refs.push(refResult.row);
      }

      const eventIndex = await this.repository.nextEventIndex(tx, input.readinessId);
      await this.repository.createOrReuseEvent(tx, {
        ...envelope,
        readinessId: input.readinessId,
        eventIndex,
        eventAction: "closeout_recorded",
        fromStatus: readiness.status,
        toStatus: readiness.status,
        detailsJson: {
          closeoutId: closeout.row.id,
          publishActivationHandoffRefCount: refs.length,
          publishActivationApprovalCreated: false,
        },
        semanticWatermark: fingerprint,
        idempotencyKey: `${input.idempotencyKey}:event:closeout_recorded`,
        metadataJson: { serviceVersion: LAUNCH_READINESS_SERVICE_VERSION },
      });

      return {
        readiness,
        closeoutId: closeout.row.id,
        refs,
        eventActions: ["closeout_recorded"],
        boundary: LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS,
      };
    });
  }

  private async markStatus(
    input: MarkLaunchReadinessStatusInput,
    status: LaunchReadinessRecordStatus,
    freshnessStatus: LaunchReadinessFreshnessStatus,
    eventAction: LaunchReadinessEventAction,
  ): Promise<LaunchReadinessStatusOperationResult> {
    return this.repository.withTransaction(async (tx) => {
      const before = await this.repository.getReadinessById(tx, input.readinessId);
      if (!before) throw new SingleSiteStateWriterError(`launch readiness record ${input.readinessId} not found`);
      if (["ready", "ready_with_limitations"].includes(status)) {
        const openP0 = await this.repository.countOpenP0Blockers(tx, input.readinessId);
        if (openP0 > 0) throw new SingleSiteTransitionError("launch readiness ready status requires no open P0 blockers", [`open_p0_blockers:${openP0}`]);
      }
      const readiness = await this.repository.updateReadinessStatus(tx, {
        readinessId: input.readinessId,
        status,
        freshnessStatus,
        readinessSummaryJson: input.readinessSummaryJson,
        limitationSummaryJson: input.limitationSummaryJson,
        blockerSummaryJson: input.blockerSummaryJson,
      });
      const eventIndex = await this.repository.nextEventIndex(tx, input.readinessId);
      await this.repository.createOrReuseEvent(tx, {
        actor: input.actor,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: `${input.idempotencyKey}:event:${eventAction}`,
        requestId: input.requestId,
        readinessId: input.readinessId,
        eventIndex,
        eventAction,
        fromStatus: before.status,
        toStatus: status,
        detailsJson: { reason: input.reason ?? null, status, freshnessStatus },
        semanticWatermark: readiness.semantic_source_watermark,
        metadataJson: { serviceVersion: LAUNCH_READINESS_SERVICE_VERSION },
      });
      return { readiness, eventActions: [eventAction], boundary: LAUNCH_READINESS_SERVICE_BOUNDARY_FLAGS };
    });
  }

  private async requireCloseoutReady(tx: LaunchReadinessWriterTx, readinessId: string): Promise<LaunchReadinessRecordRow> {
    const readiness = await this.repository.getReadinessById(tx, readinessId);
    if (!readiness) throw new SingleSiteStateWriterError(`launch readiness record ${readinessId} not found`);
    if (!["ready", "ready_with_limitations"].includes(readiness.status)) {
      throw new SingleSiteTransitionError("launch readiness closeout requires ready or ready_with_limitations status", [`status:${readiness.status}`]);
    }
    const openP0 = await this.repository.countOpenP0Blockers(tx, readinessId);
    if (openP0 > 0) throw new SingleSiteTransitionError("launch readiness closeout requires no open P0 blockers", [`open_p0_blockers:${openP0}`]);
    return readiness;
  }
}

export async function recordLaunchReadinessFromSources(input: RecordLaunchReadinessFromSourcesInput): Promise<LaunchReadinessOperationResult> {
  return new LaunchReadinessService().recordLaunchReadinessFromSources(input);
}
