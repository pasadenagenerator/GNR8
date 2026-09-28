import assert from "node:assert/strict";
import test from "node:test";

import {
  ASTRO_PRODUCTION_CANDIDATE_LIFETIME,
  ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES,
  ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
  ASTRO_PRODUCTION_CANDIDATE_STORAGE,
  AstroProductionCandidateValidationError,
  computeAstroProductionCandidateStorageSha256,
  createAstroProductionCandidateId,
  createAstroProductionCandidateRecord,
  deserializeAstroProductionCandidateRecord,
  measureAstroProductionCandidateRecordBytes,
  serializeAstroProductionCandidateRecord,
  validateAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
} from "./astro-production-candidate-record";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import { ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION } from "./astro-internal-preview-candidate-repository";

const CANDIDATE_ID = createAstroProductionCandidateId("11111111-1111-4111-8111-111111111111");
const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: "runtime-site-production-contract",
  siteVersionId: "22222222-2222-4222-8222-222222222222",
  ownershipSiteId: "33333333-3333-4333-8333-333333333333",
  organizationId: "44444444-4444-4444-8444-444444444444",
  agencyId: "55555555-5555-4555-8555-555555555555",
};

test("production candidate IDs use a canonical server-generated UUID identity", () => {
  assert.equal(CANDIDATE_ID, "astro_candidate_11111111111141118111111111111111");
  assert.match(createAstroProductionCandidateId(), /^astro_candidate_[0-9a-f]{32}$/);
  for (const malformed of [
    "11111111111141118111111111111111",
    "11111111-1111-4111-7111-111111111111",
    "11111111-1111-4111-8111-11111111111Z",
    "11111111-1111-4111-8111-111111111111 ",
  ]) {
    assert.throws(() => createAstroProductionCandidateId(malformed), validationError("identity_invalid"));
  }
});

test("v2 record round-trips through canonical UTF-8 serialization with deterministic hashes", () => {
  const record = productionRecord();
  const serialized = serializeAstroProductionCandidateRecord(record);
  const roundTrip = deserializeAstroProductionCandidateRecord(Buffer.from(serialized, "utf8"));

  assert.deepEqual(roundTrip, record);
  assert.equal(serializeAstroProductionCandidateRecord(roundTrip), serialized);
  assert.equal(measureAstroProductionCandidateRecordBytes(record), Buffer.byteLength(serialized, "utf8"));
  assert.equal(record.candidate.manifest.lifecycle.storage, ASTRO_PRODUCTION_CANDIDATE_STORAGE);
  assert.equal(record.candidate.manifest.lifecycle.lifetime, ASTRO_PRODUCTION_CANDIDATE_LIFETIME);
  assert.equal(record.candidate.manifest.lifecycle.durableRegistration, true);
  assert.match(record.storageSha256, /^[0-9a-f]{64}$/);
  assert.equal(
    record.storageSha256,
    computeAstroProductionCandidateStorageSha256(unsigned(record)),
  );
});

test("explicit allowlists fail closed for every production compatibility discriminator", () => {
  const cases: Array<(value: Record<string, any>) => void> = [
    (value) => { value.schemaVersion = "gnr8-astro-persisted-preview-candidate:v999"; },
    (value) => { value.recordKind = "future_candidate_record"; },
    (value) => { value.candidate.kind = "future_candidate"; },
    (value) => { value.candidate.manifest.sourceKind = "future_candidate"; },
    (value) => { value.candidate.manifest.adapterId = "future-adapter"; },
    (value) => { value.candidate.manifest.conversionVersion = "future-conversion"; },
    (value) => { value.candidate.manifest.provenance.exportManifestVersion = "future-export"; },
    (value) => { value.candidate.rendererCompatibilityVersion = "future-renderer"; },
    (value) => { value.candidate.manifest.assetHandling.mode = "future-assets"; },
    (value) => { value.candidate.manifest.lifecycle.storage = "future-storage"; },
    (value) => { value.candidate.manifest.lifecycle.lifetime = "future-lifetime"; },
    (value) => { value.candidate.manifest.lifecycle.durableRegistration = false; },
  ];
  for (const mutate of cases) {
    const value = structuredClone(productionRecord()) as unknown as Record<string, any>;
    mutate(value);
    assert.throws(() => validateAstroProductionCandidateRecord(value), validationError("unsupported_version"));
  }
});

test("production validation rejects v1 proof records without upgrading them", () => {
  const candidate = proofCandidate();
  const v1 = {
    schemaVersion: ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION,
    recordKind: "astro_internal_preview_candidate_proof_record",
    identity: { candidateId: candidate.id, siteId: candidate.siteId, siteVersionId: candidate.siteVersionId },
    storedAt: "2026-09-28T09:00:00.000Z",
    candidate,
    storageSha256: "f".repeat(64),
  };
  assert.throws(() => validateAstroProductionCandidateRecord(v1), validationError("unsupported_version"));
  assert.equal(candidate.manifest.lifecycle.durableRegistration, false);

  const persistedProofCandidate = structuredClone(candidate);
  persistedProofCandidate.manifest.lifecycle = {
    storage: "isolated_local_filesystem",
    lifetime: "proof_retained_until_explicit_cleanup",
    durableRegistration: false,
  };
  assert.throws(
    () => createAstroProductionCandidateRecord({
      candidate: persistedProofCandidate,
      ownership: OWNERSHIP,
      registration: registration(),
      storedAt: "2026-09-28T10:00:00.000Z",
    }),
    validationError("unsupported_version"),
  );
});

test("deserialization rejects malformed JSON and invalid UTF-8", () => {
  assert.throws(() => deserializeAstroProductionCandidateRecord("{not-json"), validationError("corrupt"));
  assert.throws(
    () => deserializeAstroProductionCandidateRecord(Uint8Array.from([0x7b, 0xff, 0x7d])),
    validationError("corrupt"),
  );
});

test("canonical identities and duplicated runtime ownership are validated but do not assert authorization", () => {
  const candidate = proofCandidate();
  assert.throws(
    () => createAstroProductionCandidateRecord({
      candidate,
      ownership: { ...OWNERSHIP, siteVersionId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" },
      registration: registration(),
      storedAt: "2026-09-28T10:00:00.000Z",
    }),
    validationError("identity_invalid"),
  );
  assert.throws(
    () => createAstroProductionCandidateRecord({
      candidate,
      ownership: { ...OWNERSHIP, runtimeSiteId: "another-runtime-site" },
      registration: registration(),
      storedAt: "2026-09-28T10:00:00.000Z",
    }),
    validationError("ownership_mismatch"),
  );
  const malformed = structuredClone(productionRecord());
  malformed.identity.organizationId = "not-a-uuid";
  assert.throws(() => validateAstroProductionCandidateRecord(malformed), validationError("corrupt"));
});

test("deserialized payload validation preserves root-only, inline-CSS, script-free restrictions", () => {
  const restrictedHtml = [
    "<!doctype html><html><head><style>@import url('/other.css')</style></head><body></body></html>",
    "<!doctype html><html><head><style>body{background:url('/hero.png')}</style></head><body></body></html>",
    "<!doctype html><html><head><link rel=\"stylesheet\" href=\"/style.css\"></head><body></body></html>",
    "<!doctype html><html><head><style>body{color:black}</style></head><body><script>bad()</script></body></html>",
    "<!doctype html><html><head><style>body{color:black}</style></head><body><img src=\"/hero.png\"></body></html>",
    "<!doctype html><html><head><style>body{color:black}</style></head><body onclick=\"bad()\"></body></html>",
    "<!doctype html><html><head><style>body{color:black}</style></head><body><form></form></body></html>",
    "<!doctype html><html><head><style>body{color:black}</style></head><body><iframe src=\"https://example.com\"></iframe></body></html>",
  ];
  for (const html of restrictedHtml) {
    assert.throws(() => productionRecord({ html }), validationError("corrupt"));
  }

  const extraRoute = structuredClone(productionRecord()) as unknown as Record<string, any>;
  extraRoute.candidate.htmlByPath["/other"] = "<html></html>";
  assert.throws(() => validateAstroProductionCandidateRecord(extraRoute), validationError("corrupt"));
});

test("content and immutable-envelope tampering fail closed", () => {
  const htmlTamper = structuredClone(productionRecord());
  htmlTamper.candidate.htmlByPath["/"] = htmlTamper.candidate.htmlByPath["/"].replace("Production", "Tampered");
  assert.throws(() => validateAstroProductionCandidateRecord(htmlTamper), validationError("corrupt"));

  const envelopeTamper = structuredClone(productionRecord());
  envelopeTamper.registration.producerRef = "changed-producer-ref";
  assert.throws(() => validateAstroProductionCandidateRecord(envelopeTamper), validationError("corrupt"));
});

test("record size uses exact canonical UTF-8 bytes, including multibyte content", () => {
  const ascii = productionRecord({ html: supportedHtml("e") });
  const multibyte = productionRecord({ html: supportedHtml("é") });
  assert.equal(
    measureAstroProductionCandidateRecordBytes(multibyte) - measureAstroProductionCandidateRecordBytes(ascii),
    1,
  );
  assert.ok(serializeAstroProductionCandidateRecord(multibyte).length < measureAstroProductionCandidateRecordBytes(multibyte));
});

test("the 2 MiB canonical record boundary is inclusive and one byte over is rejected", () => {
  const empty = productionRecord({ html: supportedHtml("") });
  const paddingBytes = ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES - measureAstroProductionCandidateRecordBytes(empty);
  assert.ok(paddingBytes > 0);
  const exact = productionRecord({ html: supportedHtml("x".repeat(paddingBytes)) });
  assert.equal(measureAstroProductionCandidateRecordBytes(exact), ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES);
  assert.throws(
    () => productionRecord({ html: supportedHtml("x".repeat(paddingBytes + 1)) }),
    validationError("record_too_large"),
  );
});

test("the production record contains no runtime governance or default-binding assertions", () => {
  const serialized = serializeAstroProductionCandidateRecord(productionRecord());
  for (const prohibited of [
    "RuntimeArtifact",
    "artifactGovernance",
    "pageGateState",
    "siteGateState",
    "publishStage",
    "previewHostBinding",
    "activePointer",
    "defaultBinding",
  ]) {
    assert.equal(serialized.includes(prohibited), false);
  }
});

function productionRecord(input: { html?: string } = {}): AstroProductionCandidateRecord {
  return createAstroProductionCandidateRecord({
    candidate: proofCandidate(input.html),
    ownership: OWNERSHIP,
    registration: registration(),
    storedAt: "2026-09-28T10:00:00.000Z",
  });
}

function proofCandidate(html?: string) {
  return createSyntheticAstroInternalPreviewCandidate({
    candidateId: CANDIDATE_ID,
    siteId: OWNERSHIP.runtimeSiteId,
    siteVersionId: OWNERSHIP.siteVersionId,
    html: html ?? supportedHtml("Production candidate"),
    createdAt: "2026-09-28T09:00:00.000Z",
  });
}

function supportedHtml(content: string): string {
  return `<!doctype html><html><head><style>:root{--proof:#0f766e}</style></head><body><p>${content}</p></body></html>`;
}

function registration() {
  return {
    registeredByActorId: "actor:production-contract-test",
    producerKind: "internal_astro_build_export_bridge",
    producerVersion: "gnr8-internal-astro-build-export-bridge:v1",
    producerRef: "synthetic:mvp11",
    idempotencyKey: "idem:mvp11:one",
    correlationId: "correlation:mvp11:one",
  };
}

function unsigned(record: AstroProductionCandidateRecord): Omit<AstroProductionCandidateRecord, "storageSha256"> {
  const { storageSha256: _storageSha256, ...value } = record;
  return value;
}

function validationError(code: AstroProductionCandidateValidationError["code"]) {
  return (error: unknown): boolean => error instanceof AstroProductionCandidateValidationError && error.code === code;
}
