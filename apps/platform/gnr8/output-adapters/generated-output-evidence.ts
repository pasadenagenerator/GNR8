import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";

import type { AstroProductionCandidateRecord } from "./astro-production-candidate-record";
import type { ChsAstroBuildReceipt } from "./chs-astro-candidate-producer";
import {
  createGeneratedOutputBuildEvidence,
  validateGeneratedOutputBuildEvidence,
  type GeneratedOutputBuildEvidence,
  type GeneratedOutputContentManifest,
} from "./generated-output-eligibility";

export const GENERATED_OUTPUT_BUILD_EVIDENCE_MANIFEST_KEY = "generatedOutputBuildEvidence" as const;
export const GENERATED_OUTPUT_CONTENT_MANIFEST_KEY = "generatedOutputContentManifest" as const;
export const GENERATED_OUTPUT_SOURCE_WORKSPACE_KEY = "generatedOutputSourceWorkspace" as const;

export type GeneratedOutputSourceCaptureBinding = GeneratedOutputBuildEvidence["sourceCapture"];

export function createBuildEvidenceForCandidate(input: {
  record: AstroProductionCandidateRecord;
  receipt: ChsAstroBuildReceipt;
  sourceCapture: GeneratedOutputSourceCaptureBinding;
  contentManifest: GeneratedOutputContentManifest;
  submissionAttestation: GeneratedOutputBuildEvidence["submissionAttestation"];
}): GeneratedOutputBuildEvidence {
  const { record, receipt } = input;
  if (
    receipt.candidateId !== record.identity.candidateId ||
    receipt.generatedSourceSha256 !== record.candidate.manifest.provenance.sourceSnapshotSha256 ||
    receipt.exportSha256 !== record.candidate.manifest.provenance.exportSha256
  ) {
    throw new Error("generated_output_build_receipt_lineage_mismatch");
  }
  return createGeneratedOutputBuildEvidence({
    establishedBy: "server_astro_build_export_pipeline",
    proofVersion: receipt.proofVersion,
    candidateId: record.identity.candidateId,
    candidateContentSha256: record.candidate.contentSha256,
    candidateStorageSha256: record.storageSha256,
    producerKind: record.registration.producerKind,
    producerVersion: record.registration.producerVersion,
    adapterId: record.candidate.manifest.adapterId,
    conversionVersion: record.candidate.manifest.conversionVersion,
    exportManifestVersion: record.candidate.manifest.provenance.exportManifestVersion,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    sourceCapture: structuredClone(input.sourceCapture),
    toolVersions: structuredClone(receipt.toolVersions),
    buildExecution: {
      receiptSha256: receipt.receiptSha256,
      ...structuredClone(receipt.execution),
    },
    submissionAttestation: structuredClone(input.submissionAttestation),
    buildCompletedAt: receipt.buildCompletedAt,
    sourceSnapshotSha256: receipt.generatedSourceSha256,
    exportSha256: receipt.exportSha256,
    outputPaths: [...receipt.outputPaths],
    assetFingerprintMapSha256: sha256Hex(stableStringify(record.candidate.assetFingerprintMap)),
    contentManifestSourceRef: input.contentManifest.sourceRef,
    derivedFromEvidenceSha256: null,
  });
}

export function rebindBuildEvidenceToCandidate(input: {
  sourceEvidence: GeneratedOutputBuildEvidence;
  successorRecord: AstroProductionCandidateRecord;
}): GeneratedOutputBuildEvidence {
  const source = validateGeneratedOutputBuildEvidence(input.sourceEvidence);
  if (!source) throw new Error("generated_output_source_build_evidence_invalid");
  const record = input.successorRecord;
  if (
    record.candidate.manifest.provenance.sourceSnapshotSha256 !== source.sourceSnapshotSha256 ||
    record.candidate.manifest.provenance.exportSha256 !== source.exportSha256
  ) {
    throw new Error("generated_output_successor_build_lineage_mismatch");
  }
  return createGeneratedOutputBuildEvidence({
    establishedBy: source.establishedBy,
    proofVersion: source.proofVersion,
    candidateId: record.identity.candidateId,
    candidateContentSha256: record.candidate.contentSha256,
    candidateStorageSha256: record.storageSha256,
    producerKind: record.registration.producerKind,
    producerVersion: record.registration.producerVersion,
    adapterId: record.candidate.manifest.adapterId,
    conversionVersion: record.candidate.manifest.conversionVersion,
    exportManifestVersion: record.candidate.manifest.provenance.exportManifestVersion,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    sourceCapture: structuredClone(source.sourceCapture),
    toolVersions: structuredClone(source.toolVersions),
    buildExecution: structuredClone(source.buildExecution),
    submissionAttestation: structuredClone(source.submissionAttestation),
    buildCompletedAt: source.buildCompletedAt,
    sourceSnapshotSha256: source.sourceSnapshotSha256,
    exportSha256: source.exportSha256,
    outputPaths: [...source.outputPaths],
    assetFingerprintMapSha256: sha256Hex(stableStringify(record.candidate.assetFingerprintMap)),
    contentManifestSourceRef: source.contentManifestSourceRef,
    derivedFromEvidenceSha256: source.evidenceSha256,
  });
}

export function readGeneratedOutputBuildEvidence(manifest: Record<string, unknown>): GeneratedOutputBuildEvidence | null {
  return validateGeneratedOutputBuildEvidence(manifest[GENERATED_OUTPUT_BUILD_EVIDENCE_MANIFEST_KEY]);
}

export function readGeneratedOutputContentManifest(manifest: Record<string, unknown>): GeneratedOutputContentManifest | null {
  const value = manifest[GENERATED_OUTPUT_CONTENT_MANIFEST_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return structuredClone(value as GeneratedOutputContentManifest);
}

export function generatedOutputEvidenceManifestFields(input: {
  buildEvidence: GeneratedOutputBuildEvidence;
  contentManifest: GeneratedOutputContentManifest;
  sourceWorkspace?: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    [GENERATED_OUTPUT_BUILD_EVIDENCE_MANIFEST_KEY]: structuredClone(input.buildEvidence),
    [GENERATED_OUTPUT_CONTENT_MANIFEST_KEY]: structuredClone(input.contentManifest),
    ...(input.sourceWorkspace
      ? { [GENERATED_OUTPUT_SOURCE_WORKSPACE_KEY]: structuredClone(input.sourceWorkspace) }
      : {}),
  };
}
