import assert from "node:assert/strict";
import test from "node:test";

import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";

import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import { deriveAstroSuccessorOperationIdentity } from "./astro-successor-publication-service";
import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";
import {
  createMvp28ChsPackage,
  deriveMvp28OperationIdentity,
  MVP28_OPERATION_ID,
  MVP28_REQUIRED_CAPTURE_TEXT,
  validateMvp28ChsPackage,
} from "./mvp28-chs-package-contract";

test("MVP 28 package validates a fixed operation, CHS scope, provenance, and build execution receipt", () => {
  const value = validPackage();
  const validated = validateMvp28ChsPackage(value);
  assert.equal(validated.operationId, MVP28_OPERATION_ID);
  assert.equal(validated.build.candidate.siteId, CHS_ASTRO_EVALUATION.runtimeSiteId);
  assert.equal(validated.build.receipt.execution.buildCompleted, true);
});

test("MVP 28 readback and publication derive the same persisted version-5 successor identity", () => {
  const operation = deriveMvp28OperationIdentity(MVP28_OPERATION_ID);
  const publication = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    sourceSiteVersionId: operation.generationSiteVersionId,
    sourceCandidateId: operation.generationCandidateId,
  });

  assert.equal(operation.successorSiteVersionId, "8ac51260-8180-5f64-ae5e-4f7259c971ab");
  assert.equal(publication.successorSiteVersionId, operation.successorSiteVersionId);
  assert.equal(publication.successorCandidateId, operation.successorCandidateId);
});

test("MVP 28 package rejects caller control fields, traversal, false build claims, and alternate scope", async (t) => {
  await t.test("SQL or approval field", () => {
    const value = { ...validPackage(), sql: "select 1", approval: true };
    assert.throws(() => validateMvp28ChsPackage(value), /mvp28_package_invalid/);
  });
  await t.test("export traversal", () => {
    const value = validPackage();
    value.build.receipt.exportFiles[0]!.path = "../secret";
    rehashReceiptAndPackage(value);
    assert.throws(() => validateMvp28ChsPackage(value), /mvp28_build_receipt_invalid/);
  });
  await t.test("incomplete build", () => {
    const value = validPackage();
    (value.build.receipt.execution as { buildCompleted: boolean }).buildCompleted = false;
    rehashReceiptAndPackage(value);
    assert.throws(() => validateMvp28ChsPackage(value), /mvp28_build_receipt_invalid/);
  });
  await t.test("alternate target", () => {
    const operation = deriveMvp28OperationIdentity();
    const value = validPackage(createSyntheticAstroInternalPreviewCandidate({
      candidateId: operation.generationCandidateId,
      siteId: "another-runtime-site",
      siteVersionId: operation.generationSiteVersionId,
    }));
    assert.throws(() => validateMvp28ChsPackage(value), /mvp28_candidate_scope_invalid/);
  });
});

function validPackage(candidateOverride?: ReturnType<typeof createSyntheticAstroInternalPreviewCandidate>) {
  const operation = deriveMvp28OperationIdentity();
  const candidate = candidateOverride ?? createSyntheticAstroInternalPreviewCandidate({
    candidateId: operation.generationCandidateId,
    siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: operation.generationSiteVersionId,
    createdAt: "2026-10-01T12:01:00.000Z",
  });
  const unsignedReceipt = {
    proofVersion: "gnr8-astro-build-export-proof:v1" as const,
    candidateId: candidate.id,
    buildCompletedAt: "2026-10-01T12:02:00.000Z",
    toolVersions: { node: "v22.20.0", pnpm: "10.17.1", astro: "5.14.1" },
    generatedSourceSha256: candidate.manifest.provenance.sourceSnapshotSha256,
    exportSha256: candidate.manifest.provenance.exportSha256,
    outputPaths: ["/"] as ["/"],
    exportFiles: [{ path: "index.html", bytes: 100, sha256: "e".repeat(64) }],
    execution: {
      installationCompleted: true as const, buildCompleted: true as const, sourceUnchanged: true as const,
      cleanupCompleted: true as const, workspaceRemoved: true as const, cleanupErrorCount: 0 as const,
    },
  };
  const rawHtml = `<html><body>${MVP28_REQUIRED_CAPTURE_TEXT.join(" | ")}</body></html>`;
  return createMvp28ChsPackage({
    capture: {
      snapshotVersion: "v1", snapshotId: "snapshot-1", snapshotRunId: "run-1",
      requestId: operation.captureRequestId, capturedAt: "2026-10-01T12:00:00.000Z",
      sourceMode: "raw_html_fallback", fidelityStatus: "degraded_import", renderedCaptureStatus: "failed",
      renderedDomQuality: "unusable", renderedDomLength: 0, renderedNodeCount: 0,
      computedStyleSampleCount: 0, viewportScreenshotCaptured: false, fullPageScreenshotCaptured: false,
      diagnosticCodes: [], rawHtml, rawHtmlSha256: sha256Hex(rawHtml),
    },
    build: {
      candidate,
      receipt: { ...unsignedReceipt, receiptSha256: sha256Hex(stableStringify(unsignedReceipt)) },
    },
  });
}

function rehashReceiptAndPackage(value: ReturnType<typeof validPackage>) {
  const { receiptSha256: _receiptHash, ...unsignedReceipt } = value.build.receipt;
  value.build.receipt.receiptSha256 = sha256Hex(stableStringify(unsignedReceipt));
  const { packageSha256: _packageHash, ...unsignedPackage } = value;
  value.packageSha256 = sha256Hex(stableStringify(unsignedPackage));
}
