import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import {
  createAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";
import {
  ASTRO_SUCCESSOR_PRODUCER_KIND,
  ASTRO_SUCCESSOR_PRODUCER_VERSION,
  buildSuccessorBoundAstroCandidate,
  deriveAstroSuccessorOperationIdentity,
} from "./astro-successor-publication-service";

const SOURCE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_CANDIDATE_ID = "astro_candidate_22222222222242228222222222222222";
const RUNTIME_SITE_ID = "runtime-site-astro-successor";
const SOURCE_OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: RUNTIME_SITE_ID,
  siteVersionId: SOURCE_VERSION_ID,
  ownershipSiteId: "33333333-3333-4333-8333-333333333333",
  organizationId: "44444444-4444-4444-8444-444444444444",
  agencyId: "55555555-5555-4555-8555-555555555555",
};

test("derives stable canonical successor identities from immutable source lineage", () => {
  const first = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: RUNTIME_SITE_ID,
    sourceSiteVersionId: SOURCE_VERSION_ID,
    sourceCandidateId: SOURCE_CANDIDATE_ID,
  });
  const repeat = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: RUNTIME_SITE_ID,
    sourceSiteVersionId: SOURCE_VERSION_ID,
    sourceCandidateId: SOURCE_CANDIDATE_ID,
  });

  assert.deepEqual(repeat, first);
  assert.match(first.successorSiteVersionId, /^[0-9a-f-]{36}$/);
  assert.match(first.successorCandidateOperationId, /^[0-9a-f-]{36}$/);
  assert.match(first.successorCandidateId, /^astro_candidate_[0-9a-f]{32}$/);
  assert.notEqual(first.successorSiteVersionId, SOURCE_VERSION_ID);
});

test("rebinds ownership while preserving source Astro HTML, CSS, assets, and provenance", () => {
  const sourceCandidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId: SOURCE_CANDIDATE_ID,
    siteId: RUNTIME_SITE_ID,
    siteVersionId: SOURCE_VERSION_ID,
  });
  const sourceRecord = createAstroProductionCandidateRecord({
    candidate: sourceCandidate,
    ownership: SOURCE_OWNERSHIP,
    registration: {
      registeredByActorId: "actor-source",
      producerKind: "source-producer",
      producerVersion: "v1",
      producerRef: "source-ref",
      idempotencyKey: "source-idempotency",
      correlationId: "source-correlation",
    },
    storedAt: "2026-09-29T10:00:00.000Z",
  });
  const identity = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: RUNTIME_SITE_ID,
    sourceSiteVersionId: SOURCE_VERSION_ID,
    sourceCandidateId: SOURCE_CANDIDATE_ID,
  });
  const candidate = buildSuccessorBoundAstroCandidate({
    source: sourceRecord,
    successorSiteVersionId: identity.successorSiteVersionId,
    successorCandidateId: identity.successorCandidateId,
    createdAt: "2026-09-30T10:00:00.123456+00:00",
  });

  assert.deepEqual(candidate.htmlByPath, sourceRecord.candidate.htmlByPath);
  assert.equal(candidate.compiledTokenStyles, sourceRecord.candidate.compiledTokenStyles);
  assert.deepEqual(candidate.assetFingerprintMap, sourceRecord.candidate.assetFingerprintMap);
  assert.deepEqual(candidate.manifest.provenance, {
    ...sourceRecord.candidate.manifest.provenance,
    convertedArtifactSha256: candidate.contentSha256,
  });
  assert.equal(candidate.siteVersionId, identity.successorSiteVersionId);
  assert.equal(candidate.createdAt, "2026-09-30T10:00:00.123Z");
  assert.equal(candidate.manifest.ownership.siteVersionId, identity.successorSiteVersionId);
  assert.notEqual(candidate.contentSha256, sourceRecord.candidate.contentSha256);

  const successorRecord = createAstroProductionCandidateRecord({
    candidate,
    ownership: { ...SOURCE_OWNERSHIP, siteVersionId: identity.successorSiteVersionId },
    registration: {
      registeredByActorId: "actor-successor",
      producerKind: ASTRO_SUCCESSOR_PRODUCER_KIND,
      producerVersion: ASTRO_SUCCESSOR_PRODUCER_VERSION,
      producerRef: SOURCE_CANDIDATE_ID,
      idempotencyKey: identity.idempotencyKey,
      correlationId: identity.correlationId,
    },
    storedAt: "2026-09-30T10:01:00.000Z",
  });
  assert.equal(successorRecord.registration.producerRef, SOURCE_CANDIDATE_ID);
  assert.equal(successorRecord.candidate.manifest.lifecycle.storage, "supabase_postgres");
});
