import "server-only";

import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import {
  computeAstroProductionCandidateRegistrationIntentSha256,
  measureAstroProductionCandidateRecordBytes,
  registrationIntentFromRecord,
  serializeAstroProductionCandidateContentEnvelope,
  serializeAstroProductionCandidateRecord,
  serializeAstroProductionCandidateRegistrationIntent,
  serializeAstroProductionCandidateUnsignedRecord,
  validateAstroProductionCandidateRecord,
  AstroProductionCandidateValidationError,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
} from "./astro-production-candidate-record";
import {
  AstroProductionCandidateRepositoryError,
  serializeAstroProductionCandidateAccessAction,
  validateAstroProductionCandidateAccessEvent,
  validateAstroProductionCandidateAccessState,
  validateAstroProductionCandidateMetadata,
  validateAstroProductionCandidateRegistrationEvent,
  type AstroProductionCandidateAccessAction,
  type AstroProductionCandidateGateway,
  type AstroProductionCandidateGatewayAccessOutcome,
  type AstroProductionCandidateGatewayCreateInput,
  type AstroProductionCandidateGatewayCreateOutcome,
  type AstroProductionCandidateGatewayReadOutcome,
  type AstroProductionCandidateListCursor,
  type AstroProductionCandidateMetadata,
} from "./astro-production-candidate-repository";

export const ASTRO_CANDIDATE_REGISTRATION_RPC = "gnr8_register_astro_candidate" as const;
export const ASTRO_CANDIDATE_SCOPED_READ_RPC = "gnr8_read_astro_candidate_for_scope" as const;
export const ASTRO_CANDIDATE_METADATA_LIST_RPC = "gnr8_list_astro_candidate_metadata" as const;
export const ASTRO_CANDIDATE_ACCESS_CHANGE_RPC = "gnr8_set_astro_candidate_access" as const;

export type AstroCandidateRpcResult = {
  data: unknown;
  error: unknown;
};

export type AstroCandidateRpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<AstroCandidateRpcResult>;
};

export type AstroCandidateRpcClientFactory = () => AstroCandidateRpcClient | null;

const defaultClientFactory: AstroCandidateRpcClientFactory = () => (
  getSupabaseServiceRoleClient() as unknown as AstroCandidateRpcClient | null
);

/**
 * Server-only PostgREST/RPC adapter. It is a persistence boundary, not an
 * authentication or authorization service. In particular, access changes must
 * still be composed behind the repository's authenticated preconditions.
 */
export class SupabaseAstroProductionCandidateGateway implements AstroProductionCandidateGateway {
  constructor(private readonly getClient: AstroCandidateRpcClientFactory = defaultClientFactory) {}

  async atomicCreate(
    input: AstroProductionCandidateGatewayCreateInput,
  ): Promise<AstroProductionCandidateGatewayCreateOutcome> {
    const record = validateInputRecord(input.proposedRecord);
    const expectedBytes = measureAstroProductionCandidateRecordBytes(record);
    const expectedIntentSha256 = computeAstroProductionCandidateRegistrationIntentSha256(
      registrationIntentFromRecord(record),
    );
    if (input.payloadSizeBytes !== expectedBytes || input.registrationIntentSha256 !== expectedIntentSha256) {
      throw corruptResponse("Candidate registration input does not match its canonical bytes or intent hash.");
    }

    const result = await this.rpc(ASTRO_CANDIDATE_REGISTRATION_RPC, {
      p_record_canonical_text: serializeAstroProductionCandidateRecord(record),
      p_unsigned_record_canonical_text: serializeAstroProductionCandidateUnsignedRecord(record),
      p_registration_intent_canonical_text: serializeAstroProductionCandidateRegistrationIntent(record),
      p_content_envelope_canonical_text: serializeAstroProductionCandidateContentEnvelope(record),
      p_registration_intent_sha256: expectedIntentSha256,
      p_payload_size_bytes: expectedBytes,
    });
    if (result.status === "unavailable") return result;
    return parseCreateResponse(result.data, expectedIntentSha256);
  }

  async readForScope(input: {
    candidateId: string;
    trustedScope: AstroProductionCandidateOwnership;
  }): Promise<AstroProductionCandidateGatewayReadOutcome> {
    const result = await this.rpc(ASTRO_CANDIDATE_SCOPED_READ_RPC, {
      p_candidate_id: input.candidateId,
      p_runtime_site_id: input.trustedScope.runtimeSiteId,
      p_site_version_id: input.trustedScope.siteVersionId,
      p_ownership_site_id: input.trustedScope.ownershipSiteId,
      p_organization_id: input.trustedScope.organizationId,
      p_agency_id: input.trustedScope.agencyId,
    });
    if (result.status === "unavailable") return result;
    return parseReadResponse(result.data, input.candidateId, input.trustedScope);
  }

  async listMetadata(input: {
    trustedScope: AstroProductionCandidateOwnership;
    cursor: AstroProductionCandidateListCursor | null;
    limit: number;
  }): Promise<{ items: AstroProductionCandidateMetadata[]; hasMore: boolean }> {
    const result = await this.rpc(ASTRO_CANDIDATE_METADATA_LIST_RPC, {
      p_runtime_site_id: input.trustedScope.runtimeSiteId,
      p_site_version_id: input.trustedScope.siteVersionId,
      p_ownership_site_id: input.trustedScope.ownershipSiteId,
      p_organization_id: input.trustedScope.organizationId,
      p_agency_id: input.trustedScope.agencyId,
      p_cursor_stored_at: input.cursor?.storedAt ?? null,
      p_cursor_candidate_id: input.cursor?.candidateId ?? null,
      p_limit: input.limit,
    });
    if (result.status === "unavailable") {
      throw unavailable("Candidate metadata RPC is unavailable.");
    }
    return parseListResponse(result.data, input);
  }

  async atomicSetAccess(
    action: AstroProductionCandidateAccessAction,
  ): Promise<AstroProductionCandidateGatewayAccessOutcome> {
    const result = await this.rpc(ASTRO_CANDIDATE_ACCESS_CHANGE_RPC, {
      p_action_canonical_text: serializeAstroProductionCandidateAccessAction(action),
    });
    if (result.status === "unavailable") return result;
    return parseAccessResponse(result.data, action);
  }

  private async rpc(
    name: string,
    args: Record<string, unknown>,
  ): Promise<{ status: "ok"; data: unknown } | { status: "unavailable" }> {
    try {
      const client = this.getClient();
      if (!client) return { status: "unavailable" };
      const result = await client.rpc(name, args);
      if (!isRecord(result) || result.error != null) return { status: "unavailable" };
      return { status: "ok", data: result.data };
    } catch {
      return { status: "unavailable" };
    }
  }
}

function parseCreateResponse(
  value: unknown,
  expectedIntentSha256: string,
): AstroProductionCandidateGatewayCreateOutcome {
  const response = requireRecord(value, "Candidate registration RPC returned an invalid response.");
  if (response.status === "conflicting_write" || response.status === "ownership_mismatch") {
    requireExactKeys(response, ["status"]);
    return { status: response.status };
  }
  if (response.status !== "created" && response.status !== "idempotent") {
    throw corruptResponse("Candidate registration RPC returned an unknown status.");
  }
  requireExactKeys(response, ["status", "record", "access", "registrationEvent"]);
  const record = validateResponseRecord(response.record);
  const returnedIntentSha256 = computeAstroProductionCandidateRegistrationIntentSha256(
    registrationIntentFromRecord(record),
  );
  if (returnedIntentSha256 !== expectedIntentSha256) {
    throw corruptResponse("Candidate registration RPC returned a different immutable intent.");
  }
  const access = validateAccessState(response.access, record.identity.candidateId);
  const registrationEvent = validateRegistrationEvent(response.registrationEvent, record);
  return { status: response.status, record, access, registrationEvent };
}

function parseReadResponse(
  value: unknown,
  candidateId: string,
  trustedScope: AstroProductionCandidateOwnership,
): AstroProductionCandidateGatewayReadOutcome {
  const response = requireRecord(value, "Candidate read RPC returned an invalid response.");
  if (["missing", "disabled", "ownership_mismatch"].includes(String(response.status))) {
    requireExactKeys(response, ["status"]);
    return { status: response.status as "missing" | "disabled" | "ownership_mismatch" };
  }
  if (response.status !== "found") throw corruptResponse("Candidate read RPC returned an unknown status.");
  requireExactKeys(response, ["status", "record", "access", "registrationEventPresent"]);
  const record = validateResponseRecord(response.record);
  if (
    record.identity.candidateId !== candidateId ||
    !sameOwnership(record.identity, trustedScope)
  ) {
    throw corruptResponse("Candidate read RPC returned a record outside the requested authoritative scope.");
  }
  const access = validateAccessState(response.access, candidateId);
  if (access.state !== "enabled" || response.registrationEventPresent !== true) {
    throw corruptResponse("Candidate read RPC returned inconsistent access or registration state.");
  }
  return {
    status: "found",
    record,
    access,
    registrationEventPresent: response.registrationEventPresent,
  };
}

function parseListResponse(
  value: unknown,
  input: {
    trustedScope: AstroProductionCandidateOwnership;
    cursor: AstroProductionCandidateListCursor | null;
    limit: number;
  },
): { items: AstroProductionCandidateMetadata[]; hasMore: boolean } {
  const response = requireRecord(value, "Candidate metadata RPC returned an invalid response.");
  requireExactKeys(response, ["items", "hasMore"]);
  if (!Array.isArray(response.items) || typeof response.hasMore !== "boolean" || response.items.length > input.limit) {
    throw corruptResponse("Candidate metadata RPC returned an invalid page.");
  }
  const items = response.items.map((item) => validateMetadata(item, input.trustedScope));
  if (response.hasMore && items.length === 0) {
    throw corruptResponse("Candidate metadata RPC returned an empty continuation page.");
  }
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (input.cursor && !isAfterCursor(item, input.cursor)) {
      throw corruptResponse("Candidate metadata RPC violated its stable cursor boundary.");
    }
    if (index > 0 && compareMetadata(items[index - 1], item) >= 0) {
      throw corruptResponse("Candidate metadata RPC returned unstable ordering.");
    }
  }
  return { items, hasMore: response.hasMore };
}

function parseAccessResponse(
  value: unknown,
  action: AstroProductionCandidateAccessAction,
): AstroProductionCandidateGatewayAccessOutcome {
  const response = requireRecord(value, "Candidate access RPC returned an invalid response.");
  if (["missing", "version_conflict", "conflicting_write", "integrity_validation_failed"].includes(String(response.status))) {
    requireExactKeys(response, ["status"]);
    return {
      status: response.status as "missing" | "version_conflict" | "conflicting_write" | "integrity_validation_failed",
    };
  }
  if (response.status !== "updated" && response.status !== "idempotent") {
    throw corruptResponse("Candidate access RPC returned an unknown status.");
  }
  requireExactKeys(response, ["status", "access", "event"]);
  const access = validateAccessState(response.access, action.candidateId);
  const event = validateAccessEvent(response.event, action.candidateId);
  const expectedEventAction = action.action === "disable" ? "disabled" : "enabled";
  if (
    event.action !== expectedEventAction ||
    event.actorId !== action.actorId ||
    event.reasonCode !== action.reasonCode ||
    event.idempotencyKey !== action.idempotencyKey ||
    event.correlationId !== action.correlationId ||
    event.occurredAt !== action.occurredAt ||
    (response.status === "updated" && (
      access.version !== action.expectedVersion + 1 || event.eventIndex !== access.version
    ))
  ) {
    throw corruptResponse("Candidate access RPC returned inconsistent action evidence.");
  }
  return { status: response.status, access, event };
}

function validateInputRecord(value: AstroProductionCandidateRecord): AstroProductionCandidateRecord {
  try {
    return validateAstroProductionCandidateRecord(value);
  } catch (error) {
    throw mapRecordValidationError(error);
  }
}

function validateResponseRecord(value: unknown): AstroProductionCandidateRecord {
  try {
    return validateAstroProductionCandidateRecord(value);
  } catch (error) {
    throw mapRecordValidationError(error);
  }
}

function validateAccessState(value: unknown, candidateId: string) {
  if (!isRecord(value)) throw corruptResponse("Candidate RPC returned an invalid access state.");
  return validateAstroProductionCandidateAccessState(value, candidateId);
}

function validateAccessEvent(value: unknown, candidateId: string) {
  if (!isRecord(value)) throw corruptResponse("Candidate RPC returned an invalid access event.");
  return validateAstroProductionCandidateAccessEvent(value, candidateId);
}

function validateRegistrationEvent(value: unknown, record: AstroProductionCandidateRecord) {
  if (!isRecord(value)) throw corruptResponse("Candidate RPC returned an invalid registration event.");
  const event = validateAccessEvent(value, record.identity.candidateId);
  validateAstroProductionCandidateRegistrationEvent(event, record);
  return event;
}

function validateMetadata(value: unknown, scope: AstroProductionCandidateOwnership) {
  if (!isRecord(value)) throw corruptResponse("Candidate metadata RPC returned a non-object item.");
  return validateAstroProductionCandidateMetadata(value, scope);
}

function mapRecordValidationError(error: unknown): AstroProductionCandidateRepositoryError {
  if (error instanceof AstroProductionCandidateValidationError) {
    return new AstroProductionCandidateRepositoryError(
      error.code,
      "Candidate RPC record failed production validation.",
    );
  }
  return corruptResponse("Candidate RPC record failed production validation.");
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw corruptResponse(message);
  return value;
}

function requireExactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw corruptResponse("Candidate RPC returned an unexpected response shape.");
  }
}

function sameOwnership(left: AstroProductionCandidateOwnership, right: AstroProductionCandidateOwnership): boolean {
  return left.runtimeSiteId === right.runtimeSiteId &&
    left.siteVersionId === right.siteVersionId &&
    left.ownershipSiteId === right.ownershipSiteId &&
    left.organizationId === right.organizationId &&
    left.agencyId === right.agencyId;
}

function compareMetadata(left: AstroProductionCandidateMetadata, right: AstroProductionCandidateMetadata): number {
  return right.storedAt.localeCompare(left.storedAt) || left.candidateId.localeCompare(right.candidateId);
}

function isAfterCursor(item: AstroProductionCandidateMetadata, cursor: AstroProductionCandidateListCursor): boolean {
  return item.storedAt < cursor.storedAt ||
    (item.storedAt === cursor.storedAt && item.candidateId > cursor.candidateId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function corruptResponse(message: string): AstroProductionCandidateRepositoryError {
  return new AstroProductionCandidateRepositoryError("corrupt", message);
}

function unavailable(message: string): AstroProductionCandidateRepositoryError {
  return new AstroProductionCandidateRepositoryError("unavailable", message);
}
