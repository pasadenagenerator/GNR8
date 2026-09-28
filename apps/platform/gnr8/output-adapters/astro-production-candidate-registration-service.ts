import "server-only";

import { isDeepStrictEqual } from "node:util";

import {
  AstroProductionCandidateValidationError,
  createAstroProductionCandidateId,
  createAstroProductionCandidateRecord,
  isCanonicalUuid,
  validateAstroProductionCandidateIdentity,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";
import {
  AstroProductionCandidateRepositoryError,
  type AstroProductionCandidateCreateResult,
} from "./astro-production-candidate-repository";
import type { AstroInternalPreviewCandidate } from "./astro-static-site-internal-preview-bridge";
import {
  AstroProductionCandidateRegistrationError,
  InMemoryAstroCandidateRegistrationRetryContextStore,
  type AstroCandidateRegistrationRetryContext,
  type AstroCandidateRegistrationRetryContextStore,
  type AstroProductionCandidateRegistrationErrorCode,
  type AstroProductionCandidateRegistrationResult,
  type AstroProductionCandidateRegistrationServiceDependencies,
  type RegisterSyntheticAstroCandidateInput,
} from "./astro-production-candidate-registration-contract";

export {
  AstroProductionCandidateRegistrationError,
  InMemoryAstroCandidateRegistrationRetryContextStore,
} from "./astro-production-candidate-registration-contract";
export type {
  AstroCandidateRegistrationRetryContext,
  AstroCandidateRegistrationRetryContextStore,
  AstroProductionCandidateRegistrationErrorCode,
  AstroProductionCandidateRegistrationResult,
  AstroProductionCandidateRegistrationServiceDependencies,
  AstroSyntheticCandidateProducer,
  AstroSyntheticProducerInput,
  AstroSyntheticProducerSelection,
  RegisterSyntheticAstroCandidateInput,
} from "./astro-production-candidate-registration-contract";

const TEXT_MAX_CHARACTERS = 512;

const unconfigured = async (): Promise<never> => {
  throw registrationError("unconfigured", "Astro candidate registration is not configured.");
};

export function createAstroProductionCandidateRegistrationService(
  dependencies: Partial<AstroProductionCandidateRegistrationServiceDependencies> = {},
) {
  const resolved: AstroProductionCandidateRegistrationServiceDependencies = {
    authenticateSuperadmin: dependencies.authenticateSuperadmin ?? unconfigured,
    resolveOwnership: dependencies.resolveOwnership ?? unconfigured,
    producer: dependencies.producer ?? {
      kind: "unconfigured",
      version: "unconfigured",
      supports: () => false,
      produce: unconfigured,
    },
    repository: dependencies.repository ?? { create: unconfigured },
    retryContexts: dependencies.retryContexts ?? new InMemoryAstroCandidateRegistrationRetryContextStore(),
    now: dependencies.now ?? (() => new Date()),
  };

  return async function registerSyntheticAstroCandidate(
    input: RegisterSyntheticAstroCandidateInput,
  ): Promise<AstroProductionCandidateRegistrationResult> {
    let actorUserId: string;
    try {
      actorUserId = normalizeText(await resolved.authenticateSuperadmin()) ?? "";
    } catch (error) {
      if (error instanceof AstroProductionCandidateRegistrationError) throw error;
      throw registrationError(
        "authentication_failed",
        "Astro candidate registration authentication failed.",
        null,
        false,
        error,
      );
    }
    if (!actorUserId) {
      throw registrationError("authentication_failed", "Astro candidate registration authentication failed.");
    }

    const request = normalizeRequest(input);
    if (!request) {
      throw registrationError("invalid_request", "Astro candidate registration request is invalid.");
    }
    const correlationId = correlationIdFor(request.operationId);

    let context = await loadRetryContext(resolved.retryContexts, request.operationId, correlationId);
    if (context) {
      assertSameOperationIntent(context, request, actorUserId, correlationId);
    }
    if (
      request.producer.kind !== resolved.producer.kind ||
      request.producer.version !== resolved.producer.version ||
      !resolved.producer.supports(request.syntheticInput)
    ) {
      throw registrationError(
        "unsupported_producer",
        "Astro candidate producer selection is unsupported.",
        correlationId,
      );
    }

    const initialOwnership = await resolveOwnership(
      resolved,
      request.siteVersionId,
      context?.ownership.runtimeSiteId,
      correlationId,
    );

    if (!context) {
      const candidateCreatedAt = toIsoTimestamp(resolved.now(), correlationId);
      const candidateId = createAstroProductionCandidateId(request.operationId);
      const proposedContext: AstroCandidateRegistrationRetryContext = {
        operationId: request.operationId,
        actorUserId,
        siteVersionId: request.siteVersionId,
        producerKind: resolved.producer.kind,
        producerVersion: resolved.producer.version,
        syntheticInput: structuredClone(request.syntheticInput),
        ownership: structuredClone(initialOwnership),
        candidateId,
        candidateCreatedAt,
        registration: {
          registeredByActorId: actorUserId,
          producerKind: resolved.producer.kind,
          producerVersion: resolved.producer.version,
          producerRef: producerRefFor(request.operationId),
          idempotencyKey: idempotencyKeyFor(request.operationId),
          correlationId,
        },
        validatedCandidate: null,
      };
      context = await claimRetryContext(resolved.retryContexts, proposedContext, correlationId);
      assertSameOperationIntent(context, request, actorUserId, correlationId);
    }

    if (!sameOwnership(context.ownership, initialOwnership)) {
      throw registrationError(
        "ownership_changed",
        "Authoritative ownership changed during Astro candidate registration.",
        correlationId,
      );
    }

    if (!context.validatedCandidate) {
      let candidate: AstroInternalPreviewCandidate;
      try {
        candidate = await resolved.producer.produce({
          candidateId: context.candidateId,
          candidateCreatedAt: context.candidateCreatedAt,
          ownership: structuredClone(context.ownership),
          syntheticInput: structuredClone(context.syntheticInput),
        });
      } catch (error) {
        if (error instanceof AstroProductionCandidateRegistrationError) throw error;
        throw registrationError(
          "candidate_invalid",
          "Synthetic Astro candidate production failed.",
          correlationId,
          false,
          error,
        );
      }
      validateCandidateBeforeWrite(candidate, context, correlationId);
      context = await preserveCandidate(resolved.retryContexts, context.operationId, candidate, correlationId);
    } else {
      validateCandidateBeforeWrite(context.validatedCandidate, context, correlationId);
    }
    const validatedCandidate = context.validatedCandidate;
    if (!validatedCandidate) {
      throw registrationError(
        "operation_context_conflict",
        "Astro registration retry context lost its validated candidate.",
        correlationId,
      );
    }

    const finalOwnership = await resolveOwnership(
      resolved,
      context.siteVersionId,
      context.ownership.runtimeSiteId,
      correlationId,
    );
    if (!sameOwnership(context.ownership, finalOwnership)) {
      throw registrationError(
        "ownership_changed",
        "Authoritative ownership changed during Astro candidate registration.",
        correlationId,
      );
    }

    let created: AstroProductionCandidateCreateResult;
    try {
      created = await resolved.repository.create({
        candidate: structuredClone(validatedCandidate),
        trustedScope: structuredClone(finalOwnership),
        registration: structuredClone(context.registration),
      });
    } catch (error) {
      throw mapRepositoryError(error, correlationId);
    }

    return {
      status: created.status,
      operationId: context.operationId,
      correlationId,
      candidate: {
        candidateId: created.record.identity.candidateId,
        siteVersionId: created.record.identity.siteVersionId,
        storedAt: created.record.registration.storedAt,
        contentSha256: created.record.candidate.contentSha256,
        storageSha256: created.record.storageSha256,
      },
    };
  };
}

function normalizeRequest(input: RegisterSyntheticAstroCandidateInput): RegisterSyntheticAstroCandidateInput | null {
  if (!input || typeof input !== "object") return null;
  if (!isCanonicalUuid(input.operationId) || !isCanonicalUuid(input.siteVersionId)) return null;
  const producerKind = normalizeText(input.producer?.kind);
  const producerVersion = normalizeText(input.producer?.version);
  const fixtureId = normalizeText(input.syntheticInput?.fixtureId);
  if (!producerKind || !producerVersion || !fixtureId) return null;
  return {
    operationId: input.operationId,
    siteVersionId: input.siteVersionId,
    producer: { kind: producerKind, version: producerVersion },
    syntheticInput: { fixtureId },
  };
}

function validateCandidateBeforeWrite(
  candidate: AstroInternalPreviewCandidate,
  context: AstroCandidateRegistrationRetryContext,
  correlationId: string,
): void {
  try {
    createAstroProductionCandidateRecord({
      candidate,
      ownership: context.ownership,
      registration: context.registration,
      storedAt: context.candidateCreatedAt,
    });
  } catch (error) {
    if (error instanceof AstroProductionCandidateValidationError) {
      throw registrationError(
        error.code === "record_too_large" ? "record_too_large" : "candidate_invalid",
        error.code === "record_too_large"
          ? "Synthetic Astro candidate exceeds the registration size limit."
          : "Synthetic Astro candidate failed registration validation.",
        correlationId,
        false,
        error,
      );
    }
    throw registrationError(
      "candidate_invalid",
      "Synthetic Astro candidate failed registration validation.",
      correlationId,
      false,
      error,
    );
  }
  if (
    candidate.id !== context.candidateId ||
    candidate.siteVersionId !== context.siteVersionId ||
    candidate.createdAt !== context.candidateCreatedAt
  ) {
    throw registrationError(
      "candidate_invalid",
      "Synthetic Astro candidate identity does not match its immutable operation context.",
      correlationId,
    );
  }
}

async function resolveOwnership(
  dependencies: AstroProductionCandidateRegistrationServiceDependencies,
  siteVersionId: string,
  expectedRuntimeSiteId: string | undefined,
  correlationId: string,
): Promise<AstroProductionCandidateOwnership> {
  try {
    const ownership = await dependencies.resolveOwnership({ siteVersionId, expectedRuntimeSiteId });
    const validated = validateAstroProductionCandidateIdentity({
      candidateId: "astro_candidate_00000000000040008000000000000000",
      ...ownership,
    });
    if (
      validated.siteVersionId !== siteVersionId ||
      (expectedRuntimeSiteId !== undefined && validated.runtimeSiteId !== expectedRuntimeSiteId)
    ) {
      throw new Error("authoritative_ownership_identity_mismatch");
    }
    const { candidateId: _candidateId, ...trustedOwnership } = validated;
    return trustedOwnership;
  } catch (error) {
    throw registrationError(
      "ownership_rejected",
      "Authoritative Astro candidate ownership could not be established.",
      correlationId,
      false,
      error,
    );
  }
}

async function loadRetryContext(
  store: AstroCandidateRegistrationRetryContextStore,
  operationId: string,
  correlationId: string,
): Promise<AstroCandidateRegistrationRetryContext | null> {
  try {
    return await store.load(operationId);
  } catch (error) {
    throw registrationError("unconfigured", "Astro registration retry context is unavailable.", correlationId, false, error);
  }
}

async function claimRetryContext(
  store: AstroCandidateRegistrationRetryContextStore,
  context: AstroCandidateRegistrationRetryContext,
  correlationId: string,
): Promise<AstroCandidateRegistrationRetryContext> {
  try {
    return await store.claim(context);
  } catch (error) {
    throw registrationError("unconfigured", "Astro registration retry context is unavailable.", correlationId, false, error);
  }
}

async function preserveCandidate(
  store: AstroCandidateRegistrationRetryContextStore,
  operationId: string,
  candidate: AstroInternalPreviewCandidate,
  correlationId: string,
): Promise<AstroCandidateRegistrationRetryContext> {
  try {
    return await store.preserveValidatedCandidate({ operationId, candidate });
  } catch (error) {
    throw registrationError(
      "operation_context_conflict",
      "Astro registration operation context conflicts with preserved retry state.",
      correlationId,
      false,
      error,
    );
  }
}

function assertSameOperationIntent(
  context: AstroCandidateRegistrationRetryContext,
  request: RegisterSyntheticAstroCandidateInput,
  actorUserId: string,
  correlationId: string,
): void {
  if (
    context.operationId !== request.operationId ||
    context.actorUserId !== actorUserId ||
    context.siteVersionId !== request.siteVersionId ||
    context.producerKind !== request.producer.kind ||
    context.producerVersion !== request.producer.version ||
    !isDeepStrictEqual(context.syntheticInput, request.syntheticInput)
  ) {
    throw registrationError(
      "operation_context_conflict",
      "Astro registration operation identity was reused with changed intent.",
      correlationId,
    );
  }
}

function mapRepositoryError(error: unknown, correlationId: string): AstroProductionCandidateRegistrationError {
  if (error instanceof AstroProductionCandidateRepositoryError) {
    if (error.code === "conflicting_write") {
      return registrationError(
        "conflicting_write",
        "Immutable Astro candidate registration conflicts with an existing operation.",
        correlationId,
      );
    }
    if (error.code === "record_too_large") {
      return registrationError(
        "record_too_large",
        "Synthetic Astro candidate exceeds the registration size limit.",
        correlationId,
      );
    }
    if (error.code === "unavailable") {
      return registrationError(
        "ambiguous_write",
        "Astro candidate registration outcome is uncertain; retry the preserved operation.",
        correlationId,
        true,
        error,
      );
    }
    if (error.code === "ownership_mismatch") {
      return registrationError(
        "ownership_rejected",
        "Authoritative ownership rejected Astro candidate registration.",
        correlationId,
      );
    }
    return registrationError(
      "candidate_invalid",
      "Astro candidate registration was rejected.",
      correlationId,
      false,
      error,
    );
  }
  return registrationError(
    "ambiguous_write",
    "Astro candidate registration outcome is uncertain; retry the preserved operation.",
    correlationId,
    true,
    error,
  );
}

function sameOwnership(
  left: AstroProductionCandidateOwnership,
  right: AstroProductionCandidateOwnership,
): boolean {
  return isDeepStrictEqual(left, right);
}

function toIsoTimestamp(value: Date, correlationId: string): string {
  try {
    const timestamp = value.toISOString();
    if (Number.isNaN(Date.parse(timestamp))) throw new Error("invalid_timestamp");
    return timestamp;
  } catch {
    throw registrationError("unconfigured", "Astro registration clock is unavailable.", correlationId);
  }
}

function correlationIdFor(operationId: string): string {
  return `astro-registration:${operationId}`;
}

function idempotencyKeyFor(operationId: string): string {
  return `astro-registration:${operationId}`;
}

function producerRefFor(operationId: string): string {
  return `internal-synthetic-astro:${operationId}`;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 &&
    normalized.length <= TEXT_MAX_CHARACTERS &&
    !normalized.includes("\0")
    ? normalized
    : null;
}

function registrationError(
  code: AstroProductionCandidateRegistrationErrorCode,
  message: string,
  correlationId: string | null = null,
  retryable = false,
  cause?: unknown,
): AstroProductionCandidateRegistrationError {
  return new AstroProductionCandidateRegistrationError({ code, message, correlationId, retryable, cause });
}
