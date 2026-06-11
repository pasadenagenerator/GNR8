import assert from "node:assert/strict";
import test from "node:test";

import {
  type EvidenceArtifactRef,
  type EvidenceCaptureArtifact,
  type NetworkRequestEvidence,
  classifyEvidenceCaptureLimitations,
  createEmptyEvidenceCaptureArtifact,
  isEvidenceCaptureReconstructionReady,
  summarizeEvidenceCaptureArtifact,
} from "./importer-architecture-split-contract";

function ref(id: string, mediaType = "application/json"): EvidenceArtifactRef {
  return {
    id,
    uri: `artifact://${id}`,
    mediaType,
    sha256: `${id}-hash`,
    byteLength: 128,
  };
}

function completeArtifact(): EvidenceCaptureArtifact {
  const artifact = createEmptyEvidenceCaptureArtifact({
    sourceUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    routePath: "/",
    captureRunId: "capture-run-1",
    capturedAt: "2026-06-11T10:00:00.000Z",
  });

  artifact.status = "available";
  artifact.route.captureStatus = "available";
  artifact.rawInputs.rawHtmlRef = ref("raw-html", "text/html");
  artifact.rawInputs.statusCode = 200;
  artifact.rendered.renderStatus = "available";
  artifact.rendered.renderedDomRef = ref("rendered-dom", "text/html");
  artifact.rendered.renderedHtmlHash = "rendered-html-hash";
  artifact.rendered.domNodeCount = 42;
  artifact.rendered.fullPageScreenshotRef = ref("full-page-screenshot", "image/png");
  artifact.rendered.screenshotRefs.push({
    ...ref("viewport-screenshot", "image/png"),
    viewport: artifact.rendered.viewport,
    fullPage: false,
  });
  artifact.computedStyle.computedStyleSampleRefs.push(ref("computed-style-samples"));
  artifact.computedStyle.fontsDetected.push({
    family: "Inter",
    source: "computed_style",
    weight: "400",
    style: "normal",
    evidenceRefIds: ["computed-style-samples"],
  });
  artifact.computedStyle.fontSourcesLoaded.push({
    family: "Inter",
    url: "https://example.com/inter.woff2",
    format: "woff2",
    loaded: true,
    evidenceRefIds: ["font-inter"],
  });
  artifact.layout.layoutBoxRefs.push({
    ...ref("layout-boxes"),
    selectorHint: "main",
    roleHint: "main_content",
  });
  artifact.network.requestInventory.push({
    id: "request-document",
    url: "https://example.com/",
    method: "GET",
    resourceType: "document",
    classification: "document",
    initiator: null,
  });
  artifact.network.responseInventory.push({
    requestId: "request-document",
    url: "https://example.com/",
    statusCode: 200,
    headers: { "content-type": "text/html" },
    mimeType: "text/html",
    byteLength: 2048,
    fromCache: false,
  });
  artifact.scriptRuntime.domMutationSummary = {
    mutationCount: 0,
    addedNodeCount: 0,
    removedNodeCount: 0,
    attributeMutationCount: 0,
    textMutationCount: 0,
    observationWindowMs: 1000,
  };
  artifact.media.imageInventory.push({
    id: "hero-image",
    src: "https://example.com/hero.jpg",
    srcset: null,
    lazyRefs: [],
    alt: "Hero",
    renderedWidth: 1200,
    renderedHeight: 600,
    evidenceRefIds: ["hero-image"],
  });

  return artifact;
}

test("complete evidence artifact is reconstruction-ready", () => {
  const artifact = completeArtifact();

  assert.equal(isEvidenceCaptureReconstructionReady(artifact), true);
  assert.equal(summarizeEvidenceCaptureArtifact(artifact).isReconstructionReady, true);
});

test("missing rendered DOM is not reconstruction-ready", () => {
  const artifact = completeArtifact();
  artifact.rendered.renderedDomRef = null;
  artifact.rendered.renderedHtmlHash = null;

  const limitations = classifyEvidenceCaptureLimitations(artifact);

  assert.equal(isEvidenceCaptureReconstructionReady(artifact), false);
  assert.equal(limitations.some((limitation) => limitation.type === "rendered_dom_missing"), true);
  assert.equal(
    limitations.find((limitation) => limitation.type === "rendered_dom_missing")?.severity,
    "blocker",
  );
});

test("missing fonts create a fidelity limitation", () => {
  const artifact = completeArtifact();
  artifact.computedStyle.missingFontSources.push({
    family: "Brand Sans",
    url: "https://cdn.example.com/brand-sans.woff2",
    format: "woff2",
    loaded: false,
    evidenceRefIds: ["missing-brand-font"],
  });

  const limitations = classifyEvidenceCaptureLimitations(artifact);

  assert.equal(isEvidenceCaptureReconstructionReady(artifact), true);
  assert.deepEqual(
    limitations
      .filter((limitation) => limitation.type === "font_loading")
      .map((limitation) => ({
        affectedLayer: limitation.affectedLayer,
        severity: limitation.severity,
        recommendedNextLayer: limitation.recommendedNextLayer,
      })),
    [
      {
        affectedLayer: "ai_reconstruction",
        severity: "warning",
        recommendedNextLayer: "ai_reconstruction",
      },
    ],
  );
});

test("map widget evidence is preserved as widget evidence, not preview evidence", () => {
  const artifact = completeArtifact();
  artifact.widgets.maps.push({
    provider: "google_maps",
    selectorHint: "#map",
    iframeSrc: "https://www.google.com/maps/embed?pb=example",
    scriptRefs: ["https://maps.googleapis.com/maps/api/js"],
    evidenceRefIds: ["map-widget"],
  });
  artifact.layout.routeLevelStructuralHints.push({
    hint: "map",
    selectorHint: "#map",
    confidence: 0.95,
    evidenceRefIds: ["map-widget"],
  });

  const summary = summarizeEvidenceCaptureArtifact(artifact);

  assert.equal(artifact.widgets.maps[0]?.provider, "google_maps");
  assert.equal("preview" in artifact.widgets, false);
  assert.equal(summary.counts.mapWidgets, 1);
  assert.equal(
    classifyEvidenceCaptureLimitations(artifact).some((limitation) => limitation.type === "external_map"),
    true,
  );
});

test("analytics scripts do not count as required reconstruction blockers", () => {
  const artifact = completeArtifact();
  const analyticsRequest: NetworkRequestEvidence = {
    id: "request-analytics",
    url: "https://analytics.example.com/collect.js",
    method: "GET",
    resourceType: "script",
    classification: "analytics_tracking",
    initiator: "script",
  };
  artifact.network.requestInventory.push(analyticsRequest);
  artifact.network.failedRequests.push({
    ...analyticsRequest,
    failureText: "net::ERR_BLOCKED_BY_CLIENT",
  });
  artifact.scriptRuntime.scriptInventory.push({
    id: "script-analytics",
    src: analyticsRequest.url,
    classification: "analytics_tracking",
    async: true,
    defer: false,
    evidenceRefIds: ["request-analytics"],
  });

  const limitations = classifyEvidenceCaptureLimitations(artifact);

  assert.equal(isEvidenceCaptureReconstructionReady(artifact), true);
  assert.equal(
    limitations.some(
      (limitation) => limitation.type === "failed_resource" && limitation.severity === "blocker",
    ),
    false,
  );
  assert.equal(
    limitations.some(
      (limitation) => limitation.type === "failed_resource" && limitation.severity === "info",
    ),
    true,
  );
});

test("failed and blocked runtime assets are represented as evidence, not silently ignored", () => {
  const artifact = completeArtifact();
  const failedRuntimeRequest: NetworkRequestEvidence = {
    id: "request-widget-runtime",
    url: "https://widgets.example.com/runtime.js",
    method: "GET",
    resourceType: "script",
    classification: "widget_runtime",
    initiator: "script",
  };
  const blockedApiRequest: NetworkRequestEvidence = {
    id: "request-api",
    url: "https://example.com/api/gallery.json",
    method: "GET",
    resourceType: "xhr",
    classification: "api_json",
    initiator: "fetch",
  };
  artifact.network.failedRequests.push({
    ...failedRuntimeRequest,
    failureText: "net::ERR_CONNECTION_RESET",
  });
  artifact.network.blockedRequests.push({
    ...blockedApiRequest,
    blockedReason: "content-security-policy",
  });

  const summary = summarizeEvidenceCaptureArtifact(artifact);
  const limitations = classifyEvidenceCaptureLimitations(artifact);

  assert.equal(summary.counts.failedRequests, 1);
  assert.equal(summary.counts.blockedRequests, 1);
  assert.equal(summary.counts.assetClassifications, 3);
  assert.equal(limitations.some((limitation) => limitation.type === "failed_resource"), true);
  assert.equal(limitations.some((limitation) => limitation.type === "blocked_resource"), true);
});
