import {
  computeAstroProductionCandidateRegistrationIntentSha256,
  createAstroProductionCandidateId,
  createAstroProductionCandidateRecord,
  measureAstroProductionCandidateRecordBytes,
  registrationIntentFromRecord,
  serializeAstroProductionCandidateRecord,
  type AstroProductionCandidateRecord,
} from "../../../gnr8/output-adapters/astro-production-candidate-record";
import { createSyntheticAstroInternalPreviewCandidate } from "../../../gnr8/output-adapters/astro-internal-preview-candidate-test-fixture";
import { stableStringify } from "../../../gnr8/runtime/deterministic";

export type TypeScriptRoundTripCase = {
  record: AstroProductionCandidateRecord;
  recordText: string;
  unsignedRecordText: string;
  registrationIntentText: string;
  contentEnvelopeText: string;
  registrationIntentSha256: string;
  payloadSizeBytes: number;
};

export function createTypeScriptRoundTripCases(): {
  created: TypeScriptRoundTripCase;
  retry: TypeScriptRoundTripCase;
} {
  const candidateId = createAstroProductionCandidateId("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  const candidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId,
    siteId: "runtime-site-mvp12-test",
    siteVersionId: "22222222-2222-4222-8222-222222222222",
    html: "<!doctype html><html><head><style>:root{--label:'ž'}</style></head><body><p>TypeScript → PostgreSQL → TypeScript</p></body></html>",
    createdAt: "2026-09-28T09:30:00.000Z",
  });
  const registration = {
    registeredByActorId: "actor:mvp13-typescript-roundtrip",
    producerKind: "internal_astro_build_export_bridge",
    producerVersion: "gnr8-internal-astro-build-export-bridge:v1",
    producerRef: "synthetic:mvp13-typescript-roundtrip",
    idempotencyKey: "idem:mvp13:typescript-roundtrip",
    correlationId: "correlation:mvp13:typescript-roundtrip",
  };
  const ownership = {
    runtimeSiteId: "runtime-site-mvp12-test",
    siteVersionId: "22222222-2222-4222-8222-222222222222",
    ownershipSiteId: "33333333-3333-4333-8333-333333333333",
    organizationId: "44444444-4444-4444-8444-444444444444",
    agencyId: "55555555-5555-4555-8555-555555555555",
  };
  const makeCase = (storedAt: string): TypeScriptRoundTripCase => {
    const record = createAstroProductionCandidateRecord({ candidate, ownership, registration, storedAt });
    const { storageSha256: _storageSha256, ...unsignedRecord } = record;
    const registrationIntent = registrationIntentFromRecord(record);
    const contentEnvelope = {
      conversionVersion: candidate.manifest.conversionVersion,
      adapterId: candidate.manifest.adapterId,
      ownership: { siteId: candidate.siteId, siteVersionId: candidate.siteVersionId },
      rendererCompatibilityVersion: candidate.rendererCompatibilityVersion,
      htmlByPath: candidate.htmlByPath,
      compiledTokenStyles: candidate.compiledTokenStyles,
      assetFingerprintMap: candidate.assetFingerprintMap,
      sourceSnapshotSha256: candidate.manifest.provenance.sourceSnapshotSha256,
      exportSha256: candidate.manifest.provenance.exportSha256,
    };
    return {
      record,
      recordText: serializeAstroProductionCandidateRecord(record),
      unsignedRecordText: stableStringify(unsignedRecord),
      registrationIntentText: stableStringify(registrationIntent),
      contentEnvelopeText: stableStringify(contentEnvelope),
      registrationIntentSha256: computeAstroProductionCandidateRegistrationIntentSha256(registrationIntent),
      payloadSizeBytes: measureAstroProductionCandidateRecordBytes(record),
    };
  };
  return {
    created: makeCase("2026-09-28T10:30:00.000Z"),
    retry: makeCase("2030-01-01T00:00:00.000Z"),
  };
}
