import assert from "node:assert/strict";
import test from "node:test";

import {
  type EvidenceArtifactRef,
  type EvidenceCaptureArtifact,
  classifyCaptureLimitation,
  createEmptyEvidenceCaptureArtifact,
} from "./importer-architecture-split-contract";
import {
  compareBaselineAndEnrichedReadiness,
  evaluateEvidenceCaptureReconstructionReadiness,
  summarizeReadinessEvaluation,
} from "./reconstruction-readiness-evaluation";

function ref(id: string, mediaType = "text/html"): EvidenceArtifactRef {
  return {
    id,
    uri: `artifact://${id}`,
    mediaType,
    sha256: `${id}-sha256`,
    byteLength: 128,
  };
}

function baselineArtifact(mutate?: (artifact: EvidenceCaptureArtifact) => void): EvidenceCaptureArtifact {
  const artifact = createEmptyEvidenceCaptureArtifact({
    sourceUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    routePath: "/",
    captureRunId: "capture-run-1",
    capturedAt: "2026-06-12T00:00:00.000Z",
  });

  artifact.status = "partial";
  artifact.route.captureStatus = "partial";
  artifact.rendered.renderStatus = "available";
  artifact.rendered.renderedDomRef = ref("rendered-dom");
  artifact.rendered.renderedHtmlHash = "sha256:rendered-html";
  artifact.source.routeIdentity = "example.com/";
  artifact.route.routeIdentity = "example.com/";

  mutate?.(artifact);

  return artifact;
}

test("CASE 1 Baseline missing rendered DOM is NOT_READY", () => {
  const artifact = baselineArtifact((input) => {
    input.rendered.renderedDomRef = null;
    input.rendered.renderedHtmlHash = null;
  });
  const evaluation = evaluateEvidenceCaptureReconstructionReadiness(artifact);

  assert.equal(evaluation.readinessLevel, "NOT_READY");
  assert.ok(evaluation.blockers.some((blocker) => blocker.id === "missing_rendered_dom"));
  assert.ok(evaluation.requiredFieldsMissing.includes("renderedDomRef"));
  assert.ok(evaluation.requiredFieldsMissing.includes("renderedHtmlHash"));
});

test("CASE 2 Enriched rendered DOM, hash, and route identity reaches MINIMUM_READY", () => {
  const artifact = baselineArtifact((input) => {
    input.source.routePath = "";
    input.source.routeIdentity = "";
    input.route.discoveredRoutePath = "";
    input.route.routeIdentity = "";
    input.rendered.renderedDomRef = null;
    input.rendered.renderedHtmlHash = null;
  });
  const evaluation = evaluateEvidenceCaptureReconstructionReadiness(artifact, {
    routeIdentity: "example.com/",
    renderedDomRef: ref("enriched-rendered-dom"),
    renderedHtmlHash: "sha256:enriched-rendered-html",
  });

  assert.equal(evaluation.readinessLevel, "MINIMUM_READY");
  assert.deepEqual(evaluation.blockers, []);
  assert.deepEqual(evaluation.requiredFieldsMissing, []);
});

test("CASE 3 Optional fonts and widgets do not overcome missing DOM", () => {
  const artifact = baselineArtifact((input) => {
    input.rendered.renderedDomRef = null;
    input.rendered.renderedHtmlHash = null;
  });
  const evaluation = evaluateEvidenceCaptureReconstructionReadiness(artifact, {
    computedStyle: {
      fontsDetected: [
        {
          family: "Inter",
          source: "css",
          providerClassification: "google_fonts",
          weight: null,
          style: null,
          evidenceRefIds: ["font-1"],
        },
      ],
    },
    widgets: {
      forms: [
        {
          id: "form-1",
          selectorHint: "form",
          providerHint: "native_form",
          action: "/contact",
          method: "post",
          fieldCount: 2,
          evidenceRefIds: ["form-1"],
        },
      ],
    },
  });

  assert.equal(evaluation.readinessLevel, "NOT_READY");
  assert.ok(evaluation.optionalEvidencePresent.includes("fonts"));
  assert.ok(evaluation.optionalEvidencePresent.includes("widgets"));
  assert.ok(evaluation.blockers.some((blocker) => blocker.id === "missing_rendered_dom"));
});

test("CASE 4 Blocker fidelity limitation remains a blocker", () => {
  const artifact = baselineArtifact((input) => {
    input.fidelityLimitations.push(
      classifyCaptureLimitation({
        type: "unknown_runtime_behavior",
        affectedLayer: "evidence_capture",
        severity: "blocker",
        explanation: "Runtime behavior is unresolved.",
        recommendedNextLayer: "manual_review",
      }),
    );
  });
  const evaluation = evaluateEvidenceCaptureReconstructionReadiness(artifact);

  assert.equal(evaluation.readinessLevel, "NOT_READY");
  assert.ok(evaluation.requiredFieldsMissing.includes("noBlockerFidelityLimitations"));
  assert.ok(evaluation.blockers.some((blocker) => blocker.id === "blocker_fidelity_limitation"));
});

test("CASE 5 Optional evidence improves summary but does not override blockers", () => {
  const artifact = baselineArtifact((input) => {
    input.rendered.renderedDomRef = null;
    input.rendered.renderedHtmlHash = null;
  });
  const evaluation = evaluateEvidenceCaptureReconstructionReadiness(artifact, {
    computedStyle: {
      fontSourcesLoaded: [
        {
          family: "Inter",
          url: "https://fonts.gstatic.com/inter.woff2",
          format: "woff2",
          loaded: true,
          providerClassification: "google_fonts",
          evidenceRefIds: ["font-source-1"],
        },
      ],
    },
    widgets: {
      maps: [
        {
          provider: "google_maps",
          selectorHint: "iframe",
          iframeSrc: "https://www.google.com/maps/embed?pb=abc",
          scriptRefs: [],
          evidenceRefIds: ["map-1"],
        },
      ],
    },
  });
  const summary = summarizeReadinessEvaluation(evaluation);

  assert.equal(summary.readinessLevel, "NOT_READY");
  assert.equal(summary.minimumReadyReached, false);
  assert.ok(summary.optionalEvidencePresent.includes("fonts"));
  assert.ok(summary.optionalEvidencePresent.includes("widgets"));
  assert.ok(summary.blockerIds.includes("missing_rendered_dom"));
});

test("CASE 6 Before/after comparison lists resolved blockers", () => {
  const artifact = baselineArtifact((input) => {
    input.rendered.renderedDomRef = null;
    input.rendered.renderedHtmlHash = null;
  });
  const comparison = compareBaselineAndEnrichedReadiness(artifact, {
    renderedDomRef: ref("enriched-rendered-dom"),
    renderedHtmlHash: "sha256:enriched-rendered-html",
  });

  assert.equal(comparison.beforeReadiness.readinessLevel, "NOT_READY");
  assert.equal(comparison.afterReadiness.readinessLevel, "MINIMUM_READY");
  assert.deepEqual(comparison.blockersResolved.map((blocker) => blocker.id), ["missing_rendered_dom"]);
  assert.deepEqual(comparison.blockersRemaining, []);
  assert.equal(comparison.minimumReadyReached, true);
});

test("CASE 7 Readiness output is deterministic", () => {
  const artifact = baselineArtifact((input) => {
    input.rawInputs.rawHtmlRef = ref("raw-html");
    input.rendered.screenshotRefs = [
      {
        ...ref("screenshot", "image/png"),
        viewport: input.rendered.viewport,
        fullPage: false,
      },
    ];
  });

  const left = summarizeReadinessEvaluation(evaluateEvidenceCaptureReconstructionReadiness(artifact));
  const right = summarizeReadinessEvaluation(evaluateEvidenceCaptureReconstructionReadiness(artifact));

  assert.deepEqual(left, right);
});
