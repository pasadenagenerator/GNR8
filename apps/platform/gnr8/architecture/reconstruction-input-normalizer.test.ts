import assert from "node:assert/strict";
import test from "node:test";

import {
  EVIDENCE_CAPTURE_BASELINE_ARTIFACT_KIND,
  EVIDENCE_CAPTURE_BASELINE_COVERAGE_SOURCE,
  type EvidenceCaptureBaselineArtifactRecord,
} from "./evidence-capture-baseline-artifact";
import {
  IMPORTER_ARCHITECTURE_SPLIT_VERSION,
  type EvidenceArtifactRef,
  classifyCaptureLimitation,
  createEmptyEvidenceCaptureArtifact,
} from "./importer-architecture-split-contract";
import { validateReconstructionInputArtifact } from "./reconstruction-input-contract";
import {
  evaluateReconstructionReadiness,
  normalizeEvidenceCaptureToReconstructionInput,
  projectReconstructionBlockers,
  summarizeReconstructionInput,
} from "./reconstruction-input-normalizer";

function ref(id: string, mediaType = "application/json"): EvidenceArtifactRef {
  return {
    id,
    uri: `artifact://${id}`,
    mediaType,
    sha256: `${id}-sha256`,
    byteLength: 128,
  };
}

function baselineArtifact(
  mutate?: (artifact: EvidenceCaptureBaselineArtifactRecord) => void,
): EvidenceCaptureBaselineArtifactRecord {
  const evidence = createEmptyEvidenceCaptureArtifact({
    sourceUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    routePath: "/",
    captureRunId: "capture-run-1",
    capturedAt: "2026-06-11T10:00:00.000Z",
  });

  evidence.status = "partial";
  evidence.route.captureStatus = "partial";
  evidence.rendered.renderStatus = "available";
  evidence.rendered.renderedDomRef = ref("rendered-dom", "text/html");
  evidence.rendered.renderedHtmlHash = "rendered-html-hash";

  const artifact: EvidenceCaptureBaselineArtifactRecord = {
    kind: EVIDENCE_CAPTURE_BASELINE_ARTIFACT_KIND,
    architectureVersion: IMPORTER_ARCHITECTURE_SPLIT_VERSION,
    artifactVersion: 1,
    artifactStatus: "baseline_partial",
    reconstructionGrade: false,
    captureRunId: "capture-run-1",
    siteVersionId: "site-version-1",
    sourceUrl: evidence.source.sourceUrl,
    finalUrl: evidence.source.finalUrl,
    routePath: evidence.source.routePath,
    captureProvider: evidence.source.captureProvider,
    captureStatus: evidence.status,
    coverageStatus: "baseline_partial_not_reconstruction_grade",
    coverage: {
      supportedNowCount: 16,
      partialCount: 33,
      missingCount: 17,
      supportedNowPercent: 24.2,
      partialPercent: 50.0,
      missingPercent: 25.8,
      coverageSource: EVIDENCE_CAPTURE_BASELINE_COVERAGE_SOURCE,
    },
    fieldAvailability: {
      supportedNow: [],
      partial: [],
      missingUnavailable: [],
    },
    evidence,
    persistedRefs: {
      rawHtmlRef: null,
      renderedDomRef: evidence.rendered.renderedDomRef,
      computedStyleRef: null,
      screenshotRefs: [],
      acquisitionEvidenceRef: null,
      renderedCaptureManifestRef: null,
      rawImportArtifactId: null,
    },
    summaries: {
      sourceMode: "rendered_dom",
      importFidelityStatus: "degraded_import",
      renderedCaptureStatus: "available",
      renderedDomQuality: "strong",
      renderedDomNodeCount: null,
      renderedDomLength: null,
      screenshotCount: 0,
      computedStyleSampleCount: 0,
      assetInventory: {
        persistedAssetCount: null,
        externalFallbackAssetCount: null,
        fileCount: null,
      },
      routeDiscovery: {
        enabled: false,
        discoveredPageCount: null,
        routeCandidateCount: null,
        skippedLinkCount: null,
        diagnostics: [],
      },
      diagnostics: [],
      captureFallbackStatus: {
        rawHtmlFallbackUsed: false,
        reason: null,
      },
    },
    limitations: [],
    fidelityLimitations: [],
  };

  mutate?.(artifact);
  artifact.sourceUrl = artifact.evidence.source.sourceUrl;
  artifact.finalUrl = artifact.evidence.source.finalUrl;
  artifact.routePath = artifact.evidence.source.routePath;
  artifact.captureStatus = artifact.evidence.status;
  artifact.persistedRefs.renderedDomRef = artifact.evidence.rendered.renderedDomRef;
  artifact.fidelityLimitations = artifact.evidence.fidelityLimitations;

  return artifact;
}

test("full minimum handoff normalizes to MINIMUM_READY", () => {
  const input = baselineArtifact();
  const normalized = normalizeEvidenceCaptureToReconstructionInput(input);
  const report = summarizeReconstructionInput(normalized);
  const validation = validateReconstructionInputArtifact(normalized);

  assert.equal(normalized.source.sourceUrl, "https://example.com/");
  assert.equal(normalized.source.routePath, "/");
  assert.equal(normalized.requiredEvidence.status, "partial");
  assert.equal(normalized.requiredEvidence.renderStatus, "available");
  assert.equal(normalized.requiredEvidence.renderedDomRef?.id, "rendered-dom");
  assert.equal(normalized.requiredEvidence.renderedHtmlHash, "rendered-html-hash");
  assert.equal(normalized.requiredEvidence.routeCaptureStatus, "partial");
  assert.equal(normalized.optionalEvidence.fidelityLimitations.length, 0);
  assert.equal(normalized.readiness.level, "MINIMUM_READY");
  assert.deepEqual(normalized.readiness.blockers, []);
  assert.deepEqual(report.requiredFieldsMissing, []);
  assert.equal(validation.valid, true);
});

test("missing source URL normalizes to NOT_READY with explicit blocker", () => {
  const input = baselineArtifact((artifact) => {
    artifact.evidence.source.sourceUrl = "";
    artifact.evidence.route.sourceUrl = "";
  });
  const normalized = normalizeEvidenceCaptureToReconstructionInput(input);
  const report = summarizeReconstructionInput(normalized);

  assert.equal(evaluateReconstructionReadiness(input).level, "NOT_READY");
  assert.equal(normalized.readiness.level, "NOT_READY");
  assert.ok(projectReconstructionBlockers(input).some((blocker) => blocker.id === "missing_source_url"));
  assert.ok(report.requiredFieldsMissing.includes("sourceUrl"));
});

test("missing rendered DOM ref normalizes to NOT_READY with explicit blocker", () => {
  const input = baselineArtifact((artifact) => {
    artifact.evidence.rendered.renderedDomRef = null;
  });
  const normalized = normalizeEvidenceCaptureToReconstructionInput(input);
  const report = summarizeReconstructionInput(normalized);

  assert.equal(normalized.readiness.level, "NOT_READY");
  assert.ok(normalized.readiness.blockers.some((blocker) => blocker.id === "missing_rendered_dom"));
  assert.ok(report.requiredFieldsMissing.includes("renderedDomRef"));
});

test("capture failed normalizes to NOT_READY with explicit blocker", () => {
  const input = baselineArtifact((artifact) => {
    artifact.evidence.status = "failed";
  });
  const normalized = normalizeEvidenceCaptureToReconstructionInput(input);

  assert.equal(normalized.readiness.level, "NOT_READY");
  assert.ok(normalized.readiness.blockers.some((blocker) => blocker.id === "capture_failed"));
});

test("blocker fidelity limitation normalizes to NOT_READY with explicit blocker", () => {
  const input = baselineArtifact((artifact) => {
    artifact.evidence.fidelityLimitations.push(
      classifyCaptureLimitation({
        type: "rendered_dom_missing",
        affectedLayer: "evidence_capture",
        severity: "blocker",
        explanation: "Persisted baseline limitation blocks reconstruction handoff.",
        evidenceRefIds: ["rendered-dom"],
        recommendedNextLayer: "manual_review",
      }),
    );
  });
  const normalized = normalizeEvidenceCaptureToReconstructionInput(input);

  assert.equal(normalized.readiness.level, "NOT_READY");
  assert.equal(normalized.optionalEvidence.fidelityLimitations.length, 1);
  assert.ok(normalized.readiness.blockers.some((blocker) => blocker.id === "blocker_fidelity_limitation"));
});

test("optional evidence absent leaves readiness unchanged", () => {
  const input = baselineArtifact((artifact) => {
    artifact.evidence.rawInputs.rawHtmlRef = null;
    artifact.evidence.rendered.screenshotRefs = [];
    artifact.evidence.rendered.fullPageScreenshotRef = null;
    artifact.evidence.computedStyle.computedStyleSampleRefs = [];
    artifact.evidence.layout.layoutBoxRefs = [];
    artifact.evidence.layout.aboveFoldRegions = [];
    artifact.evidence.layout.repeatedRegions = [];
    artifact.evidence.layout.stickyFixedElements = [];
    artifact.evidence.layout.routeLevelStructuralHints = [];
    artifact.evidence.network.requestInventory = [];
    artifact.evidence.network.responseInventory = [];
    artifact.evidence.media.imageInventory = [];
    artifact.evidence.widgets.forms = [];
  });
  const normalized = normalizeEvidenceCaptureToReconstructionInput(input);
  const report = summarizeReconstructionInput(normalized);

  assert.equal(normalized.readiness.level, "MINIMUM_READY");
  assert.ok(report.optionalEvidenceMissing.includes("rawHtmlRef"));
  assert.ok(report.optionalEvidenceMissing.includes("screenshots"));
  assert.ok(report.optionalEvidenceMissing.includes("fullPageScreenshotRef"));
  assert.ok(report.optionalEvidenceMissing.includes("network"));
  assert.ok(report.optionalEvidenceMissing.includes("media"));
});

test("normalization is deterministic for the same baseline input", () => {
  const input = baselineArtifact();

  assert.deepEqual(
    normalizeEvidenceCaptureToReconstructionInput(input),
    normalizeEvidenceCaptureToReconstructionInput(input),
  );
});
