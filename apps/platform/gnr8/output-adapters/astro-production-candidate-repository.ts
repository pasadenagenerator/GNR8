import {
  ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES,
  ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND,
  ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
  AstroProductionCandidateValidationError,
  computeAstroProductionCandidateRegistrationIntentSha256,
  createAstroProductionCandidateRecord,
  isAstroProductionCandidateId,
  measureAstroProductionCandidateRecordBytes,
  registrationIntentFromRecord,
  validateAstroProductionCandidateIdentity,
  validateAstroProductionCandidateRecord,
  type AstroProductionCandidateIdentity,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
  type AstroProductionCandidateRegistrationContext,
} from "./astro-production-candidate-record";
import type { AstroInternalPreviewCandidate } from "./astro-static-site-internal-preview-bridge";
import { stableStringify } from "../runtime/deterministic";

const LIST_LIMIT_MAX = 100;
const TEXT_MAX_CHARACTERS = 512;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type AstroProductionCandidateAccessState = {
  candidateId: string;
  state: "enabled" | "disabled";
  reasonCode: string;
  changedByActorId: string;
  changedAt: string;
  version: number;
};

export type AstroProductionCandidateAccessEvent = {
  candidateId: string;
  eventIndex: number;
  action: "registered" | "enabled" | "disabled";
  actorId: string;
  reasonCode: string;
  idempotencyKey: string;
  correlationId: string;
  occurredAt: string;
};

export type AstroProductionCandidateMetadata = {
  candidateId: string;
  runtimeSiteId: string;
  siteVersionId: string;
  ownershipSiteId: string;
  organizationId: string;
  agencyId: string;
  schemaVersion: typeof ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION;
  recordKind: typeof ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND;
  adapterId: "astro-static-site";
  conversionVersion: "gnr8-astro-internal-preview-conversion:v1";
  exportManifestVersion: "gnr8-astro-static-export:v1";
  rendererCompatibilityVersion: "gnr8-renderer-v1";
  candidateCreatedAt: string;
  storedAt: string;
  producerKind: string;
  producerVersion: string;
  producerRef: string;
  contentSha256: string;
  storageSha256: string;
  payloadSizeBytes: number;
  access: AstroProductionCandidateAccessState;
};

export type AstroProductionCandidateListCursor = {
  storedAt: string;
  candidateId: string;
};

export type AstroProductionCandidateDisableAction = {
  action: "disable";
  candidateId: string;
  expectedVersion: number;
  actorId: string;
  reasonCode: string;
  idempotencyKey: string;
  correlationId: string;
  occurredAt: string;
};

export type AstroProductionCandidateReenableAction = {
  action: "re_enable";
  candidateId: string;
  expectedVersion: number;
  actorId: string;
  reasonCode: string;
  idempotencyKey: string;
  correlationId: string;
  occurredAt: string;
  superadminAuthorization: {
    policy: "existing_superadmin";
    actorUserId: string;
  };
  renewedIntegrityValidation: {
    validatedAt: string;
    contentSha256: string;
    storageSha256: string;
  };
};

export type AstroProductionCandidateAccessAction =
  | AstroProductionCandidateDisableAction
  | AstroProductionCandidateReenableAction;

export type AstroProductionCandidateGatewayCreateInput = {
  proposedRecord: AstroProductionCandidateRecord;
  registrationIntentSha256: string;
  payloadSizeBytes: number;
};

export type AstroProductionCandidateGatewayCreateOutcome =
  | {
      status: "created" | "idempotent";
      record: AstroProductionCandidateRecord;
      access: AstroProductionCandidateAccessState;
      registrationEvent: AstroProductionCandidateAccessEvent;
    }
  | { status: "conflicting_write" | "ownership_mismatch" | "unavailable" };

export type AstroProductionCandidateGatewayReadOutcome =
  | {
      status: "found";
      record: AstroProductionCandidateRecord;
      access: AstroProductionCandidateAccessState;
      registrationEventPresent: boolean;
    }
  | { status: "missing" | "disabled" | "ownership_mismatch" | "unavailable" };

export type AstroProductionCandidateGatewayAccessOutcome =
  | {
      status: "updated" | "idempotent";
      access: AstroProductionCandidateAccessState;
      event: AstroProductionCandidateAccessEvent;
    }
  | {
      status:
        | "missing"
        | "version_conflict"
        | "conflicting_write"
        | "integrity_validation_failed"
        | "unavailable";
    };

export interface AstroProductionCandidateGateway {
  atomicCreate(
    input: AstroProductionCandidateGatewayCreateInput,
  ): Promise<AstroProductionCandidateGatewayCreateOutcome>;
  readForScope(input: {
    candidateId: string;
    trustedScope: AstroProductionCandidateOwnership;
  }): Promise<AstroProductionCandidateGatewayReadOutcome>;
  listMetadata(input: {
    trustedScope: AstroProductionCandidateOwnership;
    cursor: AstroProductionCandidateListCursor | null;
    limit: number;
  }): Promise<{ items: AstroProductionCandidateMetadata[]; hasMore: boolean }>;
  atomicSetAccess(action: AstroProductionCandidateAccessAction): Promise<AstroProductionCandidateGatewayAccessOutcome>;
}

export type AstroProductionCandidateCreateResult = {
  status: "created" | "idempotent";
  record: AstroProductionCandidateRecord;
  access: AstroProductionCandidateAccessState;
};

export type AstroProductionCandidateListResult = {
  items: AstroProductionCandidateMetadata[];
  nextCursor: AstroProductionCandidateListCursor | null;
};

export type AstroProductionCandidateRepositoryErrorCode =
  | "identity_invalid"
  | "missing"
  | "disabled"
  | "conflicting_write"
  | "unsupported_version"
  | "corrupt"
  | "ownership_mismatch"
  | "record_too_large"
  | "access_version_conflict"
  | "reenable_prerequisite_failed"
  | "unavailable";

export class AstroProductionCandidateRepositoryError extends Error {
  readonly code: AstroProductionCandidateRepositoryErrorCode;

  constructor(code: AstroProductionCandidateRepositoryErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AstroProductionCandidateRepositoryError";
    this.code = code;
  }
}

export class GatewayBackedAstroProductionCandidateRepository {
  private readonly gateway: AstroProductionCandidateGateway;
  private readonly now: () => Date;
  private readonly maxRecordBytes: number;

  constructor(input: {
    gateway: AstroProductionCandidateGateway;
    now?: () => Date;
    maxRecordBytes?: number;
  }) {
    this.gateway = input.gateway;
    this.now = input.now ?? (() => new Date());
    this.maxRecordBytes = input.maxRecordBytes ?? ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES;
  }

  async create(input: {
    candidate: AstroInternalPreviewCandidate;
    trustedScope: AstroProductionCandidateOwnership;
    registration: AstroProductionCandidateRegistrationContext;
  }): Promise<AstroProductionCandidateCreateResult> {
    let proposedRecord: AstroProductionCandidateRecord;
    try {
      proposedRecord = createAstroProductionCandidateRecord({
        candidate: input.candidate,
        ownership: input.trustedScope,
        registration: input.registration,
        storedAt: toIsoTimestamp(this.now()),
      });
      proposedRecord = validateAstroProductionCandidateRecord(proposedRecord, {
        maxBytes: this.maxRecordBytes,
      });
    } catch (error) {
      throw mapValidationError(error);
    }
    const registrationIntentSha256 = computeAstroProductionCandidateRegistrationIntentSha256(
      registrationIntentFromRecord(proposedRecord),
    );
    const outcome = await this.gateway.atomicCreate({
      proposedRecord,
      registrationIntentSha256,
      payloadSizeBytes: measureAstroProductionCandidateRecordBytes(proposedRecord),
    });
    if (outcome.status === "conflicting_write") {
      throw repositoryError("conflicting_write", "Immutable candidate registration conflicts with an existing write.");
    }
    if (outcome.status === "ownership_mismatch") {
      throw repositoryError("ownership_mismatch", "Authoritative candidate ownership was rejected.");
    }
    if (outcome.status === "unavailable") {
      throw repositoryError("unavailable", "Candidate registration gateway is unavailable.");
    }
    if (outcome.status !== "created" && outcome.status !== "idempotent") {
      throw repositoryError("unavailable", "Candidate registration gateway returned an unknown outcome.");
    }
    const record = this.validateGatewayRecord(outcome.record);
    const returnedIntentSha256 = computeAstroProductionCandidateRegistrationIntentSha256(
      registrationIntentFromRecord(record),
    );
    if (returnedIntentSha256 !== registrationIntentSha256) {
      throw repositoryError("corrupt", "Candidate gateway returned a different immutable registration intent.");
    }
    const access = validateAstroProductionCandidateAccessState(outcome.access, record.identity.candidateId);
    validateAstroProductionCandidateRegistrationEvent(outcome.registrationEvent, record);
    return { status: outcome.status, record, access };
  }

  async read(input: {
    candidateId: string;
    trustedScope: AstroProductionCandidateOwnership;
  }): Promise<AstroProductionCandidateRecord> {
    const expected = validateSelection(input.candidateId, input.trustedScope);
    const outcome = await this.gateway.readForScope({
      candidateId: expected.candidateId,
      trustedScope: ownershipFromIdentity(expected),
    });
    if (outcome.status === "missing") throw repositoryError("missing", "Candidate record is unavailable.");
    if (outcome.status === "disabled") throw repositoryError("disabled", "Candidate access is disabled.");
    if (outcome.status === "ownership_mismatch") {
      throw repositoryError("ownership_mismatch", "Candidate ownership does not match the trusted scope.");
    }
    if (outcome.status === "unavailable") throw repositoryError("unavailable", "Candidate read gateway is unavailable.");
    if (outcome.status !== "found") {
      throw repositoryError("unavailable", "Candidate read gateway returned an unknown outcome.");
    }
    const record = this.validateGatewayRecord(outcome.record);
    if (!sameIdentity(record.identity, expected)) {
      throw repositoryError("ownership_mismatch", "Candidate ownership does not match the trusted scope.");
    }
    validateAstroProductionCandidateAccessState(outcome.access, expected.candidateId);
    if (!outcome.registrationEventPresent) {
      throw repositoryError("corrupt", "Candidate atomic registration state is incomplete.");
    }
    return record;
  }

  async list(input: {
    trustedScope: AstroProductionCandidateOwnership;
    cursor?: AstroProductionCandidateListCursor | null;
    limit: number;
  }): Promise<AstroProductionCandidateListResult> {
    const trustedScope = ownershipFromIdentity(validateSelection(
      "astro_candidate_00000000000040008000000000000000",
      input.trustedScope,
    ));
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > LIST_LIMIT_MAX) {
      throw repositoryError("identity_invalid", `Candidate list limit must be between 1 and ${LIST_LIMIT_MAX}.`);
    }
    const cursor = input.cursor == null ? null : validateCursor(input.cursor);
    let page: { items: AstroProductionCandidateMetadata[]; hasMore: boolean };
    try {
      page = await this.gateway.listMetadata({ trustedScope, cursor, limit: input.limit });
    } catch (error) {
      throw repositoryError("unavailable", "Candidate metadata gateway is unavailable.", error);
    }
    if (!page || !Array.isArray(page.items) || page.items.length > input.limit || typeof page.hasMore !== "boolean") {
      throw repositoryError("corrupt", "Candidate metadata gateway returned an invalid page.");
    }
    const items = page.items.map((row) => validateAstroProductionCandidateMetadata(row, trustedScope));
    const last = items.at(-1);
    return {
      items,
      nextCursor: page.hasMore && last ? { storedAt: last.storedAt, candidateId: last.candidateId } : null,
    };
  }

  async setAccess(action: AstroProductionCandidateAccessAction): Promise<{
    status: "updated" | "idempotent";
    access: AstroProductionCandidateAccessState;
    event: AstroProductionCandidateAccessEvent;
  }> {
    const validated = validateAstroProductionCandidateAccessAction(action);
    const outcome = await this.gateway.atomicSetAccess(validated);
    if (outcome.status === "missing") throw repositoryError("missing", "Candidate record is unavailable.");
    if (outcome.status === "version_conflict") {
      throw repositoryError("access_version_conflict", "Candidate access version does not match.");
    }
    if (outcome.status === "conflicting_write") {
      throw repositoryError("conflicting_write", "Candidate access idempotency key conflicts with an existing action.");
    }
    if (outcome.status === "integrity_validation_failed") {
      throw repositoryError(
        "reenable_prerequisite_failed",
        "Candidate re-enable requires renewed matching integrity validation.",
      );
    }
    if (outcome.status === "unavailable") {
      throw repositoryError("unavailable", "Candidate access gateway is unavailable.");
    }
    if (outcome.status !== "updated" && outcome.status !== "idempotent") {
      throw repositoryError("unavailable", "Candidate access gateway returned an unknown outcome.");
    }
    const access = validateAstroProductionCandidateAccessState(outcome.access, validated.candidateId);
    const event = validateAstroProductionCandidateAccessEvent(outcome.event, validated.candidateId);
    return { status: outcome.status, access, event };
  }

  private validateGatewayRecord(record: AstroProductionCandidateRecord): AstroProductionCandidateRecord {
    try {
      return validateAstroProductionCandidateRecord(record, { maxBytes: this.maxRecordBytes });
    } catch (error) {
      throw mapValidationError(error);
    }
  }
}

/**
 * Test-only/in-memory model of the future database RPC boundary. Each mutation is
 * decided in one synchronous gateway operation so repository code never claims
 * concurrency safety through a read-then-write sequence.
 */
export class InMemoryAstroProductionCandidateGateway implements AstroProductionCandidateGateway {
  private readonly rowsByCandidateId = new Map<string, StoredRow>();
  private readonly candidateIdByIdempotencyKey = new Map<string, string>();
  private readonly accessIntentByIdempotencyKey = new Map<string, { candidateId: string; serialized: string; event: AstroProductionCandidateAccessEvent }>();

  async atomicCreate(
    input: AstroProductionCandidateGatewayCreateInput,
  ): Promise<AstroProductionCandidateGatewayCreateOutcome> {
    const candidateId = input.proposedRecord.identity.candidateId;
    const idempotencyKey = input.proposedRecord.registration.idempotencyKey;
    const keyedCandidateId = this.candidateIdByIdempotencyKey.get(idempotencyKey);
    const existing = this.rowsByCandidateId.get(candidateId);
    if (keyedCandidateId !== undefined && keyedCandidateId !== candidateId) return { status: "conflicting_write" };
    if (existing) {
      if (
        existing.registrationIntentSha256 === input.registrationIntentSha256 &&
        existing.record.registration.idempotencyKey === idempotencyKey
      ) {
        return cloneCreateOutcome("idempotent", existing);
      }
      return { status: "conflicting_write" };
    }
    if (keyedCandidateId !== undefined) return { status: "conflicting_write" };
    const record = structuredClone(input.proposedRecord);
    const access: AstroProductionCandidateAccessState = {
      candidateId,
      state: "enabled",
      reasonCode: "candidate_registered",
      changedByActorId: record.registration.registeredByActorId,
      changedAt: record.registration.storedAt,
      version: 1,
    };
    const registrationEvent: AstroProductionCandidateAccessEvent = {
      candidateId,
      eventIndex: 1,
      action: "registered",
      actorId: record.registration.registeredByActorId,
      reasonCode: "candidate_registered",
      idempotencyKey,
      correlationId: record.registration.correlationId,
      occurredAt: record.registration.storedAt,
    };
    const row: StoredRow = {
      record,
      payloadSizeBytes: input.payloadSizeBytes,
      registrationIntentSha256: input.registrationIntentSha256,
      access,
      events: [registrationEvent],
    };
    this.rowsByCandidateId.set(candidateId, row);
    this.candidateIdByIdempotencyKey.set(idempotencyKey, candidateId);
    return cloneCreateOutcome("created", row);
  }

  async readForScope(input: {
    candidateId: string;
    trustedScope: AstroProductionCandidateOwnership;
  }): Promise<AstroProductionCandidateGatewayReadOutcome> {
    const row = this.rowsByCandidateId.get(input.candidateId);
    if (!row) return { status: "missing" };
    if (!sameOwnership(row.record.identity, input.trustedScope)) return { status: "ownership_mismatch" };
    if (row.access.state === "disabled") return { status: "disabled" };
    return {
      status: "found",
      record: structuredClone(row.record),
      access: structuredClone(row.access),
      registrationEventPresent: row.events.some((event) => event.action === "registered"),
    };
  }

  async listMetadata(input: {
    trustedScope: AstroProductionCandidateOwnership;
    cursor: AstroProductionCandidateListCursor | null;
    limit: number;
  }): Promise<{ items: AstroProductionCandidateMetadata[]; hasMore: boolean }> {
    const matching = [...this.rowsByCandidateId.values()]
      .filter((row) => sameOwnership(row.record.identity, input.trustedScope))
      .map(metadataFromRow)
      .sort(compareMetadata)
      .filter((item) => !input.cursor || compareCursor(item, input.cursor) > 0)
    return {
      items: matching.slice(0, input.limit).map((item) => structuredClone(item)),
      hasMore: matching.length > input.limit,
    };
  }

  async atomicSetAccess(action: AstroProductionCandidateAccessAction): Promise<AstroProductionCandidateGatewayAccessOutcome> {
    const serializedAction = stableStringify(action);
    const previous = this.accessIntentByIdempotencyKey.get(action.idempotencyKey);
    if (previous) {
      if (previous.candidateId !== action.candidateId || previous.serialized !== serializedAction) {
        return { status: "conflicting_write" };
      }
      const row = this.rowsByCandidateId.get(action.candidateId);
      if (!row) return { status: "missing" };
      return { status: "idempotent", access: structuredClone(row.access), event: structuredClone(previous.event) };
    }
    const row = this.rowsByCandidateId.get(action.candidateId);
    if (!row) return { status: "missing" };
    if (row.access.version !== action.expectedVersion) return { status: "version_conflict" };
    if (action.action === "re_enable") {
      const validatedAt = Date.parse(action.renewedIntegrityValidation.validatedAt);
      const occurredAt = Date.parse(action.occurredAt);
      const disabledAt = Date.parse(row.access.changedAt);
      if (
        row.access.state !== "disabled" ||
        action.superadminAuthorization.actorUserId !== action.actorId ||
        action.renewedIntegrityValidation.contentSha256 !== row.record.candidate.contentSha256 ||
        action.renewedIntegrityValidation.storageSha256 !== row.record.storageSha256 ||
        validatedAt < disabledAt ||
        validatedAt > occurredAt
      ) {
        return { status: "integrity_validation_failed" };
      }
    }
    const actionName = action.action === "disable" ? "disabled" : "enabled";
    const occurredAt = action.occurredAt;
    row.access = {
      candidateId: action.candidateId,
      state: action.action === "disable" ? "disabled" : "enabled",
      reasonCode: action.reasonCode,
      changedByActorId: action.actorId,
      changedAt: occurredAt,
      version: row.access.version + 1,
    };
    const event: AstroProductionCandidateAccessEvent = {
      candidateId: action.candidateId,
      eventIndex: row.events.length + 1,
      action: actionName,
      actorId: action.actorId,
      reasonCode: action.reasonCode,
      idempotencyKey: action.idempotencyKey,
      correlationId: action.correlationId,
      occurredAt,
    };
    row.events.push(event);
    this.accessIntentByIdempotencyKey.set(action.idempotencyKey, {
      candidateId: action.candidateId,
      serialized: serializedAction,
      event: structuredClone(event),
    });
    return { status: "updated", access: structuredClone(row.access), event: structuredClone(event) };
  }
}

type StoredRow = {
  record: AstroProductionCandidateRecord;
  payloadSizeBytes: number;
  registrationIntentSha256: string;
  access: AstroProductionCandidateAccessState;
  events: AstroProductionCandidateAccessEvent[];
};

function metadataFromRow(row: StoredRow): AstroProductionCandidateMetadata {
  const { record } = row;
  return {
    candidateId: record.identity.candidateId,
    runtimeSiteId: record.identity.runtimeSiteId,
    siteVersionId: record.identity.siteVersionId,
    ownershipSiteId: record.identity.ownershipSiteId,
    organizationId: record.identity.organizationId,
    agencyId: record.identity.agencyId,
    schemaVersion: record.schemaVersion,
    recordKind: record.recordKind,
    adapterId: record.candidate.manifest.adapterId,
    conversionVersion: record.candidate.manifest.conversionVersion,
    exportManifestVersion: record.candidate.manifest.provenance.exportManifestVersion,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion as "gnr8-renderer-v1",
    candidateCreatedAt: record.candidate.createdAt,
    storedAt: record.registration.storedAt,
    producerKind: record.registration.producerKind,
    producerVersion: record.registration.producerVersion,
    producerRef: record.registration.producerRef,
    contentSha256: record.candidate.contentSha256,
    storageSha256: record.storageSha256,
    payloadSizeBytes: row.payloadSizeBytes,
    access: structuredClone(row.access),
  };
}

export function validateAstroProductionCandidateMetadata(
  value: unknown,
  trustedScope: AstroProductionCandidateOwnership,
): AstroProductionCandidateMetadata {
  if (!hasExactKeys(value, [
    "candidateId",
    "runtimeSiteId",
    "siteVersionId",
    "ownershipSiteId",
    "organizationId",
    "agencyId",
    "schemaVersion",
    "recordKind",
    "adapterId",
    "conversionVersion",
    "exportManifestVersion",
    "rendererCompatibilityVersion",
    "candidateCreatedAt",
    "storedAt",
    "producerKind",
    "producerVersion",
    "producerRef",
    "contentSha256",
    "storageSha256",
    "payloadSizeBytes",
    "access",
  ])) {
    throw repositoryError("corrupt", "Candidate metadata list exposed an invalid payload shape.");
  }
  let identity: AstroProductionCandidateIdentity;
  try {
    identity = validateAstroProductionCandidateIdentity({
      candidateId: value.candidateId,
      runtimeSiteId: value.runtimeSiteId,
      siteVersionId: value.siteVersionId,
      ownershipSiteId: value.ownershipSiteId,
      organizationId: value.organizationId,
      agencyId: value.agencyId,
    }, "corrupt");
  } catch (error) {
    throw mapValidationError(error);
  }
  if (!sameOwnership(identity, trustedScope)) {
    throw repositoryError("ownership_mismatch", "Candidate metadata does not match the trusted scope.");
  }
  if (
    value.schemaVersion !== ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION ||
    value.recordKind !== ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND ||
    value.adapterId !== "astro-static-site" ||
    value.conversionVersion !== "gnr8-astro-internal-preview-conversion:v1" ||
    value.exportManifestVersion !== "gnr8-astro-static-export:v1" ||
    value.rendererCompatibilityVersion !== "gnr8-renderer-v1"
  ) {
    throw repositoryError("unsupported_version", "Candidate metadata contains an unsupported version.");
  }
  if (
    !isIsoTimestamp(value.candidateCreatedAt) ||
    !isIsoTimestamp(value.storedAt) ||
    !isText(value.producerKind) ||
    !isText(value.producerVersion) ||
    !isText(value.producerRef) ||
    !isSha256(value.contentSha256) ||
    !isSha256(value.storageSha256) ||
    !isSafeIntegerBetween(value.payloadSizeBytes, 1, ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES)
  ) {
    throw repositoryError("corrupt", "Candidate metadata failed structural validation.");
  }
  validateAstroProductionCandidateAccessState(value.access, identity.candidateId);
  return structuredClone(value as unknown as AstroProductionCandidateMetadata);
}

function validateSelection(
  candidateId: string,
  trustedScope: AstroProductionCandidateOwnership,
): AstroProductionCandidateIdentity {
  try {
    return validateAstroProductionCandidateIdentity({ candidateId, ...trustedScope });
  } catch (error) {
    throw mapValidationError(error);
  }
}

export function validateAstroProductionCandidateAccessState(
  value: unknown,
  candidateId: string,
): AstroProductionCandidateAccessState {
  if (
    !hasExactKeys(value, ["candidateId", "state", "reasonCode", "changedByActorId", "changedAt", "version"]) ||
    value.candidateId !== candidateId ||
    (value.state !== "enabled" && value.state !== "disabled") ||
    !isText(value.reasonCode) ||
    !isText(value.changedByActorId) ||
    !isIsoTimestamp(value.changedAt) ||
    !isSafeIntegerBetween(value.version, 1)
  ) {
    throw repositoryError("corrupt", "Candidate access state is invalid.");
  }
  return structuredClone(value as unknown as AstroProductionCandidateAccessState);
}

export function validateAstroProductionCandidateRegistrationEvent(
  value: unknown,
  record: AstroProductionCandidateRecord,
): void {
  const event = validateAstroProductionCandidateAccessEvent(value, record.identity.candidateId);
  if (
    event.action !== "registered" ||
    event.eventIndex !== 1 ||
    event.actorId !== record.registration.registeredByActorId ||
    event.reasonCode !== "candidate_registered" ||
    event.idempotencyKey !== record.registration.idempotencyKey ||
    event.correlationId !== record.registration.correlationId ||
    event.occurredAt !== record.registration.storedAt
  ) {
    throw repositoryError("corrupt", "Candidate atomic registration event is inconsistent.");
  }
}

export function validateAstroProductionCandidateAccessEvent(
  value: unknown,
  candidateId: string,
): AstroProductionCandidateAccessEvent {
  if (
    !hasExactKeys(value, [
      "candidateId",
      "eventIndex",
      "action",
      "actorId",
      "reasonCode",
      "idempotencyKey",
      "correlationId",
      "occurredAt",
    ]) ||
    value.candidateId !== candidateId ||
    !isSafeIntegerBetween(value.eventIndex, 1) ||
    (value.action !== "registered" && value.action !== "enabled" && value.action !== "disabled") ||
    !isText(value.actorId) ||
    !isText(value.reasonCode) ||
    !isText(value.idempotencyKey) ||
    !isText(value.correlationId) ||
    !isIsoTimestamp(value.occurredAt)
  ) {
    throw repositoryError("corrupt", "Candidate access event is invalid.");
  }
  return structuredClone(value as unknown as AstroProductionCandidateAccessEvent);
}

export function validateAstroProductionCandidateAccessAction(
  action: unknown,
): AstroProductionCandidateAccessAction {
  if (
    !isRecord(action) ||
    (action.action !== "disable" && action.action !== "re_enable") ||
    !isAstroProductionCandidateId(action.candidateId) ||
    !isSafeIntegerBetween(action.expectedVersion, 1) ||
    !isText(action.actorId) ||
    !isText(action.reasonCode) ||
    !isText(action.idempotencyKey) ||
    !isText(action.correlationId) ||
    !isIsoTimestamp(action.occurredAt)
  ) {
    throw repositoryError("identity_invalid", "Candidate access action is invalid.");
  }
  const expectedKeys = action.action === "disable"
    ? ["action", "candidateId", "expectedVersion", "actorId", "reasonCode", "idempotencyKey", "correlationId", "occurredAt"]
    : [
        "action",
        "candidateId",
        "expectedVersion",
        "actorId",
        "reasonCode",
        "idempotencyKey",
        "correlationId",
        "occurredAt",
        "superadminAuthorization",
        "renewedIntegrityValidation",
      ];
  if (!hasExactKeys(action, expectedKeys)) {
    throw repositoryError("identity_invalid", "Candidate access action is invalid.");
  }
  if (action.action === "re_enable") {
    if (
      !hasExactKeys(action.superadminAuthorization, ["policy", "actorUserId"]) ||
      !hasExactKeys(action.renewedIntegrityValidation, ["validatedAt", "contentSha256", "storageSha256"]) ||
      action.superadminAuthorization?.policy !== "existing_superadmin" ||
      action.superadminAuthorization.actorUserId !== action.actorId ||
      !isIsoTimestamp(action.renewedIntegrityValidation?.validatedAt) ||
      !isSha256(action.renewedIntegrityValidation?.contentSha256) ||
      !isSha256(action.renewedIntegrityValidation?.storageSha256)
    ) {
      throw repositoryError(
        "reenable_prerequisite_failed",
        "Candidate re-enable requires superadmin identity and renewed integrity evidence.",
      );
    }
  }
  return structuredClone(action as unknown as AstroProductionCandidateAccessAction);
}

export function serializeAstroProductionCandidateAccessAction(
  action: AstroProductionCandidateAccessAction,
): string {
  return stableStringify(validateAstroProductionCandidateAccessAction(action));
}

function validateCursor(value: AstroProductionCandidateListCursor): AstroProductionCandidateListCursor {
  if (!isIsoTimestamp(value.storedAt) || !isAstroProductionCandidateId(value.candidateId)) {
    throw repositoryError("identity_invalid", "Candidate list cursor is invalid.");
  }
  return { storedAt: value.storedAt, candidateId: value.candidateId };
}

function compareMetadata(left: AstroProductionCandidateMetadata, right: AstroProductionCandidateMetadata): number {
  return right.storedAt.localeCompare(left.storedAt) || left.candidateId.localeCompare(right.candidateId);
}

function compareCursor(item: AstroProductionCandidateMetadata, cursor: AstroProductionCandidateListCursor): number {
  if (item.storedAt !== cursor.storedAt) return item.storedAt < cursor.storedAt ? 1 : -1;
  return item.candidateId.localeCompare(cursor.candidateId);
}

function sameIdentity(left: AstroProductionCandidateIdentity, right: AstroProductionCandidateIdentity): boolean {
  return left.candidateId === right.candidateId && sameOwnership(left, right);
}

function sameOwnership(
  left: AstroProductionCandidateOwnership,
  right: AstroProductionCandidateOwnership,
): boolean {
  return left.runtimeSiteId === right.runtimeSiteId &&
    left.siteVersionId === right.siteVersionId &&
    left.ownershipSiteId === right.ownershipSiteId &&
    left.organizationId === right.organizationId &&
    left.agencyId === right.agencyId;
}

function ownershipFromIdentity(identity: AstroProductionCandidateIdentity): AstroProductionCandidateOwnership {
  return {
    runtimeSiteId: identity.runtimeSiteId,
    siteVersionId: identity.siteVersionId,
    ownershipSiteId: identity.ownershipSiteId,
    organizationId: identity.organizationId,
    agencyId: identity.agencyId,
  };
}

function cloneCreateOutcome(
  status: "created" | "idempotent",
  row: StoredRow,
): Extract<AstroProductionCandidateGatewayCreateOutcome, { status: "created" | "idempotent" }> {
  const registrationEvent = row.events.find((event) => event.action === "registered");
  if (!registrationEvent) throw new Error("in_memory_gateway_registration_event_missing");
  return {
    status,
    record: structuredClone(row.record),
    access: structuredClone(row.access),
    registrationEvent: structuredClone(registrationEvent),
  };
}

function toIsoTimestamp(value: Date): string {
  try {
    const timestamp = value.toISOString();
    if (!isIsoTimestamp(timestamp)) throw new Error("invalid_timestamp");
    return timestamp;
  } catch (error) {
    throw repositoryError("corrupt", "Repository clock returned an invalid timestamp.", error);
  }
}

function mapValidationError(error: unknown): AstroProductionCandidateRepositoryError {
  if (error instanceof AstroProductionCandidateRepositoryError) return error;
  if (error instanceof AstroProductionCandidateValidationError) {
    return repositoryError(error.code, error.message, error);
  }
  return repositoryError("corrupt", "Candidate validation failed.", error);
}

function repositoryError(
  code: AstroProductionCandidateRepositoryErrorCode,
  message: string,
  cause?: unknown,
): AstroProductionCandidateRepositoryError {
  return new AstroProductionCandidateRepositoryError(code, message, cause === undefined ? undefined : { cause });
}

function isText(value: unknown): value is string {
  return typeof value === "string" &&
    value.length > 0 &&
    value.length <= TEXT_MAX_CHARACTERS &&
    value === value.trim() &&
    !value.includes("\0");
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isSafeIntegerBetween(value: unknown, minimum: number, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
