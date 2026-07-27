import "server-only";

import {
  DdomReadinessSnapshotIdempotencyConflictError,
  DdomReadinessSnapshotValidationError,
  DdomReadinessSnapshotWriter,
  type DdomActorType,
  type DdomPrivacyLabel,
  type DdomReadinessSnapshotWriterResult,
  type DdomRetentionClass,
} from "./ddom-readiness-snapshot-writer";
import {
  DdomReadinessStoredStateReadError,
  DdomReadinessStoredStateRepository,
  type DdomReadinessStoredStateRepositoryInput,
  type DdomReadinessStoredStateRepositoryLike,
  type DdomReadinessStoredStateRequestScope,
} from "./ddom-readiness-stored-state-repository";
import {
  DdomReadinessStoredStateMapperError,
  mapDdomReadinessStoredStateToSnapshotInput,
  type DdomPasrImplicationSummary,
} from "./ddom-readiness-stored-state-mapper";

export type DdomReadinessManualSnapshotCallerInput = {
  actorType: Extract<DdomActorType, "human" | "system">;
  actorId: string;
  actorDisplayLabel?: string | null;
  tenantId: string;
  clientId?: string | null;
  agencyId?: string | null;
  ownershipSiteId?: string | null;
  siteId: string;
  siteVersionId?: string | null;
  domainBindingId?: string | null;
  hostBindingId?: string | null;
  intendedDomain?: string | null;
  internalHost?: string | null;
  environment?: string | null;
  stage?: string | null;
  requestScope: DdomReadinessStoredStateRequestScope;
  reason?: string | null;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey?: string | null;
  privacyLabel?: DdomPrivacyLabel | null;
  retentionClass?: DdomRetentionClass | null;
  domainExceptionApprovalRequestId?: string | null;
  domainExceptionApprovalDecisionId?: string | null;
  domainExceptionEvidencePackageId?: string | null;
  manualCompletionEvidencePackageId?: string | null;
  auditEventId?: string | null;
  readinessTtlHours?: number | null;
};

export type DdomReadinessManualSnapshotCallerOutput = {
  snapshotId: string;
  readinessStatus: string;
  freshnessStatus: string;
  sourceWatermark: string;
  sourceRefsCount: number;
  warningsCount: number;
  blockersCount: number;
  limitationsCount: number;
  reusedExisting: boolean;
  pasrImplication: DdomPasrImplicationSummary;
  noPublishNoProviderConfirmation: true;
};

export type DdomReadinessManualSnapshotWriterLike = {
  createDdomReadinessSnapshot(input: Parameters<DdomReadinessSnapshotWriter["createDdomReadinessSnapshot"]>[0]): Promise<DdomReadinessSnapshotWriterResult>;
};

export class DdomReadinessManualSnapshotCallerError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "DdomReadinessManualSnapshotCallerError";
  }
}

export class DdomReadinessManualSnapshotValidationError extends DdomReadinessManualSnapshotCallerError {
  constructor(message: string) {
    super(message);
    this.name = "DdomReadinessManualSnapshotValidationError";
  }
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new DdomReadinessManualSnapshotValidationError(`${field} is required`);
  return normalized;
}

function validateInput(input: DdomReadinessManualSnapshotCallerInput): DdomReadinessStoredStateRepositoryInput {
  const actorType = required("actorType", input.actorType);
  if (actorType !== "human" && actorType !== "system") {
    throw new DdomReadinessManualSnapshotValidationError("actorType must be human or system");
  }
  const tenantId = required("tenantId", input.tenantId);
  const siteId = required("siteId", input.siteId);
  required("actorId", input.actorId);
  required("correlationId", input.correlationId);
  if (input.requestScope !== "custom_domain" && input.requestScope !== "internal_host" && input.requestScope !== "no_custom_domain") {
    throw new DdomReadinessManualSnapshotValidationError("requestScope must be custom_domain, internal_host, or no_custom_domain");
  }
  if (input.requestScope === "custom_domain" && !text(input.domainBindingId) && !text(input.intendedDomain)) {
    throw new DdomReadinessManualSnapshotValidationError("custom_domain snapshots require domainBindingId or intendedDomain");
  }
  if (input.requestScope === "internal_host" && !text(input.hostBindingId) && !text(input.internalHost)) {
    throw new DdomReadinessManualSnapshotValidationError("internal_host snapshots require hostBindingId or internalHost");
  }

  return {
    tenantId,
    clientId: text(input.clientId),
    agencyId: text(input.agencyId),
    ownershipSiteId: text(input.ownershipSiteId),
    siteId,
    siteVersionId: text(input.siteVersionId),
    domainBindingId: text(input.domainBindingId),
    hostBindingId: text(input.hostBindingId),
    intendedDomain: text(input.intendedDomain),
    internalHost: text(input.internalHost),
    environment: text(input.environment) ?? "production",
    stage: text(input.stage) ?? "production",
    requestScope: input.requestScope,
    domainExceptionApprovalRequestId: text(input.domainExceptionApprovalRequestId),
    domainExceptionApprovalDecisionId: text(input.domainExceptionApprovalDecisionId),
    domainExceptionEvidencePackageId: text(input.domainExceptionEvidencePackageId),
    manualCompletionEvidencePackageId: text(input.manualCompletionEvidencePackageId),
    auditEventId: text(input.auditEventId),
    readinessTtlHours: input.readinessTtlHours ?? null,
  };
}

export class DdomReadinessManualSnapshotCaller {
  constructor(
    private readonly repository: DdomReadinessStoredStateRepositoryLike = new DdomReadinessStoredStateRepository(),
    private readonly writer: DdomReadinessManualSnapshotWriterLike = new DdomReadinessSnapshotWriter(),
  ) {}

  async createManualReadinessSnapshot(input: DdomReadinessManualSnapshotCallerInput): Promise<DdomReadinessManualSnapshotCallerOutput> {
    const repositoryInput = validateInput(input);
    try {
      const storedState = await this.repository.readDdomReadinessStoredState(repositoryInput);
      const mapped = mapDdomReadinessStoredStateToSnapshotInput({
        storedState,
        actorType: input.actorType,
        actorId: input.actorId,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.idempotencyKey,
        reason: input.reason,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
      });
      const result = await this.writer.createDdomReadinessSnapshot(mapped.writerInput);
      const snapshotJson = mapped.writerInput.snapshotJson as { limitations?: unknown };
      const limitations = Array.isArray(snapshotJson.limitations) ? snapshotJson.limitations : [];
      return {
        snapshotId: result.snapshotId,
        readinessStatus: mapped.writerInput.readinessState,
        freshnessStatus: mapped.writerInput.freshnessState,
        sourceWatermark: result.sourceWatermark,
        sourceRefsCount: mapped.writerInput.refs.length,
        warningsCount: mapped.writerInput.readinessWarnings.length,
        blockersCount: mapped.writerInput.readinessBlockers.length,
        limitationsCount: limitations.length,
        reusedExisting: result.reusedExisting,
        pasrImplication: mapped.pasrImplication,
        noPublishNoProviderConfirmation: true,
      };
    } catch (error) {
      if (
        error instanceof DdomReadinessManualSnapshotCallerError ||
        error instanceof DdomReadinessStoredStateReadError ||
        error instanceof DdomReadinessStoredStateMapperError ||
        error instanceof DdomReadinessSnapshotValidationError ||
        error instanceof DdomReadinessSnapshotIdempotencyConflictError
      ) {
        throw error;
      }
      throw new DdomReadinessManualSnapshotCallerError("ddom_manual_snapshot_caller_failed_closed", error);
    }
  }
}

export async function createManualDdomReadinessSnapshot(
  input: DdomReadinessManualSnapshotCallerInput,
  caller = new DdomReadinessManualSnapshotCaller(),
): Promise<DdomReadinessManualSnapshotCallerOutput> {
  return caller.createManualReadinessSnapshot(input);
}
