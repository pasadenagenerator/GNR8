import "server-only";

import { isDeepStrictEqual } from "node:util";

import type {
  AstroProductionCandidateOwnership,
  AstroProductionCandidateRegistrationContext,
} from "./astro-production-candidate-record";
import type { AstroProductionCandidateCreateResult } from "./astro-production-candidate-repository";
import type { AstroInternalPreviewCandidate } from "./astro-static-site-internal-preview-bridge";

export type AstroSyntheticProducerSelection = {
  kind: string;
  version: string;
};

export type AstroSyntheticProducerInput = {
  fixtureId: string;
};

export type RegisterSyntheticAstroCandidateInput = {
  /** Server-owned operation UUID; it is not a producer-supplied candidate ID. */
  operationId: string;
  siteVersionId: string;
  producer: AstroSyntheticProducerSelection;
  syntheticInput: AstroSyntheticProducerInput;
};

export type AstroSyntheticCandidateProducer = {
  kind: string;
  version: string;
  supports(input: AstroSyntheticProducerInput): boolean;
  produce(input: {
    candidateId: string;
    candidateCreatedAt: string;
    ownership: AstroProductionCandidateOwnership;
    syntheticInput: AstroSyntheticProducerInput;
  }): Promise<AstroInternalPreviewCandidate>;
};

export type AstroCandidateRegistrationRetryContext = {
  operationId: string;
  actorUserId: string;
  siteVersionId: string;
  producerKind: string;
  producerVersion: string;
  syntheticInput: AstroSyntheticProducerInput;
  ownership: AstroProductionCandidateOwnership;
  candidateId: string;
  candidateCreatedAt: string;
  registration: AstroProductionCandidateRegistrationContext;
  validatedCandidate: AstroInternalPreviewCandidate | null;
};

export interface AstroCandidateRegistrationRetryContextStore {
  load(operationId: string): Promise<AstroCandidateRegistrationRetryContext | null>;
  claim(context: AstroCandidateRegistrationRetryContext): Promise<AstroCandidateRegistrationRetryContext>;
  preserveValidatedCandidate(input: {
    operationId: string;
    candidate: AstroInternalPreviewCandidate;
  }): Promise<AstroCandidateRegistrationRetryContext>;
}

export class InMemoryAstroCandidateRegistrationRetryContextStore
implements AstroCandidateRegistrationRetryContextStore {
  private readonly contexts = new Map<string, AstroCandidateRegistrationRetryContext>();

  async load(operationId: string): Promise<AstroCandidateRegistrationRetryContext | null> {
    const context = this.contexts.get(operationId);
    return context ? structuredClone(context) : null;
  }

  async claim(context: AstroCandidateRegistrationRetryContext): Promise<AstroCandidateRegistrationRetryContext> {
    const existing = this.contexts.get(context.operationId);
    if (existing) return structuredClone(existing);
    const preserved = structuredClone(context);
    this.contexts.set(context.operationId, preserved);
    return structuredClone(preserved);
  }

  async preserveValidatedCandidate(input: {
    operationId: string;
    candidate: AstroInternalPreviewCandidate;
  }): Promise<AstroCandidateRegistrationRetryContext> {
    const context = this.contexts.get(input.operationId);
    if (!context) throw new Error("astro_registration_retry_context_missing");
    if (context.validatedCandidate && !isDeepStrictEqual(context.validatedCandidate, input.candidate)) {
      throw new Error("astro_registration_retry_candidate_conflict");
    }
    const updated = { ...context, validatedCandidate: structuredClone(input.candidate) };
    this.contexts.set(input.operationId, updated);
    return structuredClone(updated);
  }
}

export type AstroProductionCandidateRegistrationServiceDependencies = {
  authenticateSuperadmin(): Promise<string>;
  resolveOwnership(input: {
    siteVersionId: string;
    expectedRuntimeSiteId?: string;
  }): Promise<AstroProductionCandidateOwnership>;
  producer: AstroSyntheticCandidateProducer;
  repository: {
    create(input: {
      candidate: AstroInternalPreviewCandidate;
      trustedScope: AstroProductionCandidateOwnership;
      registration: AstroProductionCandidateRegistrationContext;
    }): Promise<AstroProductionCandidateCreateResult>;
  };
  retryContexts: AstroCandidateRegistrationRetryContextStore;
  now(): Date;
};

export type AstroProductionCandidateRegistrationResult = {
  status: "created" | "idempotent";
  operationId: string;
  correlationId: string;
  candidate: {
    candidateId: string;
    siteVersionId: string;
    storedAt: string;
    contentSha256: string;
    storageSha256: string;
  };
};

export type AstroProductionCandidateRegistrationErrorCode =
  | "authentication_failed"
  | "invalid_request"
  | "unsupported_producer"
  | "operation_context_conflict"
  | "ownership_rejected"
  | "ownership_changed"
  | "candidate_invalid"
  | "record_too_large"
  | "conflicting_write"
  | "ambiguous_write"
  | "unconfigured";

export class AstroProductionCandidateRegistrationError extends Error {
  readonly code: AstroProductionCandidateRegistrationErrorCode;
  readonly correlationId: string | null;
  readonly retryable: boolean;

  constructor(input: {
    code: AstroProductionCandidateRegistrationErrorCode;
    message: string;
    correlationId?: string | null;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(input.message, input.cause === undefined ? undefined : { cause: input.cause });
    this.name = "AstroProductionCandidateRegistrationError";
    this.code = input.code;
    this.correlationId = input.correlationId ?? null;
    this.retryable = input.retryable ?? false;
  }
}
