import { createHash } from "node:crypto";

import { stableStringify } from "@/gnr8/runtime/deterministic";

import { createAstroProductionCandidateId } from "./astro-production-candidate-record";

export const ASTRO_SUCCESSOR_PUBLICATION_VERSION = "gnr8-astro-successor-publication:v1" as const;

export type AstroSuccessorOperationIdentity = {
  successorSiteVersionId: string;
  successorCandidateOperationId: string;
  successorCandidateId: string;
  correlationId: string;
  idempotencyKey: string;
};

export function deriveAstroSuccessorOperationIdentity(input: {
  runtimeSiteId: string;
  sourceSiteVersionId: string;
  sourceCandidateId: string;
}): AstroSuccessorOperationIdentity {
  const seed = stableStringify({
    version: ASTRO_SUCCESSOR_PUBLICATION_VERSION,
    runtimeSiteId: input.runtimeSiteId,
    sourceSiteVersionId: input.sourceSiteVersionId,
    sourceCandidateId: input.sourceCandidateId,
  });
  const successorSiteVersionId = deterministicUuid(`${seed}:site-version`);
  const successorCandidateOperationId = deterministicUuid(`${seed}:candidate-operation`);
  return {
    successorSiteVersionId,
    successorCandidateOperationId,
    successorCandidateId: createAstroProductionCandidateId(successorCandidateOperationId),
    correlationId: `astro-successor:${successorSiteVersionId}`,
    idempotencyKey: `astro-successor:${successorCandidateOperationId}`,
  };
}

function deterministicUuid(seed: string): string {
  const bytes = createHash("sha256").update(seed, "utf8").digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
