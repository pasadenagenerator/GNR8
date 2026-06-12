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
import {
  EVIDENCE_CAPTURE_BASELINE_ARTIFACT_KIND,
  attachEvidenceCaptureBaselineArtifact,
  buildEvidenceCaptureBaselineArtifact,
  getLatestEvidenceCaptureBaselineArtifactForSiteVersion,
} from "./evidence-capture-baseline-artifact";
import {
  RECONSTRUCTION_CONFIDENCE_INPUTS,
  RECONSTRUCTION_INPUT_CONTRACT_VERSION,
  classifyReconstructionBlockers,
  evaluateReconstructionReadiness,
  getEvidenceFieldsByClassification,
  validateEvidenceFieldClassificationMatrix,
  validateReconstructionInputArtifact,
} from "./reconstruction-input-contract";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";

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

test("reconstruction input readiness is classified deterministically from evidence", () => {
  const artifact = completeArtifact();

  const assessment = evaluateReconstructionReadiness(artifact);

  assert.equal(assessment.level, "RECOMMENDED");
  assert.deepEqual(assessment.blockers, []);
  assert.equal(assessment.minimumEvidence.hasSourceUrl, true);
  assert.equal(assessment.minimumEvidence.hasRouteIdentity, true);
  assert.equal(assessment.minimumEvidence.hasRenderedDom, true);
  assert.equal(assessment.optionalEvidence.hasScreenshots, true);
  assert.equal(assessment.optionalEvidence.hasComputedStyles, true);
  assert.equal(assessment.optionalEvidence.hasLayoutEvidence, true);
  assert.equal(assessment.optionalEvidence.hasNetworkEvidence, true);
  assert.equal(assessment.optionalEvidence.hasMediaEvidence, true);
});

test("reconstruction blockers are explicit when required evidence is missing", () => {
  const artifact = completeArtifact();
  artifact.source.sourceUrl = "";
  artifact.route.sourceUrl = "";
  artifact.source.routePath = "";
  artifact.route.discoveredRoutePath = "";
  artifact.rendered.renderedDomRef = null;
  artifact.rendered.renderedHtmlHash = null;

  const blockers = classifyReconstructionBlockers(artifact);
  const assessment = evaluateReconstructionReadiness(artifact);

  assert.equal(assessment.level, "NOT_READY");
  assert.equal(blockers.some((blocker) => blocker.id === "missing_source_url"), true);
  assert.equal(blockers.some((blocker) => blocker.id === "missing_route_identity"), true);
  assert.equal(blockers.some((blocker) => blocker.id === "missing_rendered_dom"), true);
  assert.equal(blockers.every((blocker) => blocker.severity === "blocker"), true);
});

test("reconstruction input evidence classification matrix covers every audited field", () => {
  const matrixValidation = validateEvidenceFieldClassificationMatrix();

  assert.equal(matrixValidation.valid, true);
  assert.deepEqual(matrixValidation.missingFields, []);
  assert.deepEqual(matrixValidation.duplicateFields, []);
  assert.ok(getEvidenceFieldsByClassification("REQUIRED").includes("source.sourceUrl"));
  assert.ok(getEvidenceFieldsByClassification("REQUIRED").includes("rendered.renderedDomRef"));
  assert.ok(getEvidenceFieldsByClassification("OPTIONAL").includes("layout.layoutBoxRefs"));
  assert.ok(getEvidenceFieldsByClassification("UNSUPPORTED").includes("route.rawFilePath"));
  assert.ok(RECONSTRUCTION_CONFIDENCE_INPUTS.some((input) => input.kind === "layout_completeness"));
});

test("reconstruction input contract validation rejects consumable fields in unsupported list", () => {
  const artifact = completeArtifact();
  const readiness = evaluateReconstructionReadiness(artifact);
  const unsupportedEvidenceFields = getEvidenceFieldsByClassification("UNSUPPORTED");

  const validInput = validateReconstructionInputArtifact({
    kind: "reconstruction_input_artifact_v1",
    contractVersion: RECONSTRUCTION_INPUT_CONTRACT_VERSION,
    source: {
      sourceUrl: artifact.source.sourceUrl,
      finalUrl: artifact.source.finalUrl,
      routePath: artifact.source.routePath,
      canonicalUrl: artifact.source.canonicalUrl,
      capturedAt: artifact.source.capturedAt,
      route: {
        discoveredRoutePath: artifact.route.discoveredRoutePath,
        sourceUrl: artifact.route.sourceUrl,
        finalUrl: artifact.route.finalUrl,
        navigationSource: artifact.route.navigationSource,
        captureStatus: artifact.route.captureStatus,
      },
    },
    requiredEvidence: {
      status: artifact.status,
      renderedDomRef: artifact.rendered.renderedDomRef,
      renderedHtmlHash: artifact.rendered.renderedHtmlHash,
      renderStatus: artifact.rendered.renderStatus,
      routeCaptureStatus: artifact.route.captureStatus,
    },
    optionalEvidence: {
      rawHtmlRef: artifact.rawInputs.rawHtmlRef,
      screenshots: artifact.rendered.screenshotRefs,
      fullPageScreenshotRef: artifact.rendered.fullPageScreenshotRef,
      computedStyle: artifact.computedStyle,
      layout: artifact.layout,
      network: artifact.network,
      scriptRuntime: artifact.scriptRuntime,
      media: artifact.media,
      widgets: artifact.widgets,
      fidelityLimitations: artifact.fidelityLimitations,
    },
    readiness,
    confidenceInputs: [...RECONSTRUCTION_CONFIDENCE_INPUTS],
    unsupportedEvidenceFields,
  });

  const invalidInput = validateReconstructionInputArtifact({
    kind: "reconstruction_input_artifact_v1",
    contractVersion: RECONSTRUCTION_INPUT_CONTRACT_VERSION,
    source: {
      sourceUrl: artifact.source.sourceUrl,
      finalUrl: artifact.source.finalUrl,
      routePath: artifact.source.routePath,
      canonicalUrl: artifact.source.canonicalUrl,
      capturedAt: artifact.source.capturedAt,
      route: {
        discoveredRoutePath: artifact.route.discoveredRoutePath,
        sourceUrl: artifact.route.sourceUrl,
        finalUrl: artifact.route.finalUrl,
        navigationSource: artifact.route.navigationSource,
        captureStatus: artifact.route.captureStatus,
      },
    },
    requiredEvidence: {
      status: artifact.status,
      renderedDomRef: artifact.rendered.renderedDomRef,
      renderedHtmlHash: artifact.rendered.renderedHtmlHash,
      renderStatus: artifact.rendered.renderStatus,
      routeCaptureStatus: artifact.route.captureStatus,
    },
    optionalEvidence: {
      rawHtmlRef: artifact.rawInputs.rawHtmlRef,
      screenshots: artifact.rendered.screenshotRefs,
      fullPageScreenshotRef: artifact.rendered.fullPageScreenshotRef,
      computedStyle: artifact.computedStyle,
      layout: artifact.layout,
      network: artifact.network,
      scriptRuntime: artifact.scriptRuntime,
      media: artifact.media,
      widgets: artifact.widgets,
      fidelityLimitations: artifact.fidelityLimitations,
    },
    readiness,
    confidenceInputs: [...RECONSTRUCTION_CONFIDENCE_INPUTS],
    unsupportedEvidenceFields: [...unsupportedEvidenceFields, "layout.layoutBoxRefs"],
  });

  assert.equal(validInput.valid, true);
  assert.deepEqual(validInput.errors, []);
  assert.equal(invalidInput.valid, false);
  assert.equal(
    invalidInput.errors.includes(
      "Unsupported evidence field list includes a consumable field: layout.layoutBoxRefs.",
    ),
    true,
  );
});

function baselineProvenance(overrides: Partial<RuntimeImportProvenanceSummary> = {}): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    executionIdentity: {
      snapshotId: "snapshot-1",
      snapshotRunId: "capture-run-1",
      snapshotStableRootDirAbs: "/tmp/snapshot-stable",
      snapshotRunRootDirAbs: "/tmp/snapshot-run",
      requestId: "request-1",
    },
    captureMode: "raw_html_only",
    sourceMode: "raw_html_fallback",
    importFidelityStatus: "capture_failed",
    renderedCaptureStatus: "failed",
    renderedDomQuality: "unusable",
    screenshotCount: 0,
    computedStyleSampleCount: 0,
    renderedCapture: {
      used: false,
      status: "failed",
      quality: "unusable",
      domLength: 0,
      nodeCount: 0,
      styleSampleCount: 0,
      styleCoverage: 0,
      screenshots: { viewport: false, fullPage: false },
      execution: {
        runtimeKind: "nodejs",
        environmentSupported: true,
        browserPackageAvailable: true,
        browserBinaryAvailable: false,
        environmentStatus: "supported",
        failureCategory: "environment",
        failureCode: "CAPTURE_WORKER_UNAVAILABLE",
        browserLaunch: "failed",
        navigation: "not_attempted",
        dom: "empty_or_failed",
        screenshot: "none",
        styleSampling: "not_attempted",
      },
    },
    importDiagnosticCodes: ["CAPTURE_WORKER_UNAVAILABLE", "RENDERED_CAPTURE_FAILED_FALLBACK_USED"],
    captureEvidence: {
      selectedSourceHtmlPath: "/tmp/snapshot-run/index.html",
      responseHtmlPath: "/tmp/snapshot-run/response.html",
      entryHtmlPath: "/tmp/snapshot-run/index.html",
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: "/tmp/snapshot-run/acquisition-evidence.json",
      renderedDomPath: null,
      computedStylesPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    captureJob: null,
    workerHealth: null,
    styleSignals: null,
    semanticImport: null,
    multipageImport: null,
    multiPageDiscovery: {
      summary: {
        enabled: true,
        discoveredPageCount: 2,
        skippedLinkCount: 1,
        routeCandidateCount: 3,
        manifestRef: "importProvenanceSummary.multiPageDiscovery.manifest",
        diagnostics: ["MULTIPAGE_DISCOVERY_LIMITED"],
      },
      manifest: null,
    },
    siteTree: null,
    templateFamilies: null,
    ...overrides,
  } as RuntimeImportProvenanceSummary;
}

test("baseline evidence artifact is built from existing capture evidence only", () => {
  const artifact = buildEvidenceCaptureBaselineArtifact({
    siteVersionId: "11111111-1111-4111-8111-111111111111",
    sourceUrl: "https://example.com/",
    finalUrl: "https://example.com/",
    routePath: "/",
    importProvenanceSummary: baselineProvenance(),
    rawImportArtifact: {
      artifactId: "raw-artifact-1",
      entryHtmlPath: "index.html",
      fileMap: {
        "index.html": {
          path: "index.html",
          mediaType: "text/html",
          sizeBytes: 2048,
          sha256: "raw-html-sha",
        },
      },
      metadata: {
        sourceUrl: "https://example.com/",
        finalUrl: "https://example.com/",
        htmlByteLength: 2048,
        diagnostics: { codes: ["RAW_IMPORT_ARTIFACT_PERSIST_COMPLETED"] },
        assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 2 },
      },
    },
  });

  assert.equal(artifact.kind, EVIDENCE_CAPTURE_BASELINE_ARTIFACT_KIND);
  assert.equal(artifact.architectureVersion, "7F-2");
  assert.equal(artifact.artifactStatus, "baseline_partial");
  assert.equal(artifact.reconstructionGrade, false);
  assert.equal(artifact.captureRunId, "capture-run-1");
  assert.equal(artifact.sourceUrl, "https://example.com/");
  assert.equal(artifact.finalUrl, "https://example.com/");
  assert.equal(artifact.routePath, "/");
  assert.equal(artifact.captureProvider, "chrome_playwright");
  assert.equal(artifact.captureStatus, "partial");
  assert.equal(artifact.coverageStatus, "baseline_partial_not_reconstruction_grade");
  assert.equal(artifact.persistedRefs.rawHtmlRef?.sha256, "raw-html-sha");
  assert.equal(artifact.persistedRefs.rawImportArtifactId, "raw-artifact-1");
  assert.equal(artifact.summaries.assetInventory.persistedAssetCount, 1);
  assert.equal(artifact.summaries.assetInventory.externalFallbackAssetCount, 2);
  assert.equal(artifact.summaries.routeDiscovery.enabled, true);
  assert.equal(artifact.summaries.routeDiscovery.routeCandidateCount, 3);
});

test("baseline coverage metadata and limitations are persisted without fabricated unsupported fields", () => {
  const artifact = buildEvidenceCaptureBaselineArtifact({
    sourceUrl: "https://example.com/",
    importProvenanceSummary: baselineProvenance(),
  });

  assert.deepEqual(artifact.coverage, {
    supportedNowCount: 16,
    partialCount: 33,
    missingCount: 17,
    supportedNowPercent: 24.2,
    partialPercent: 50.0,
    missingPercent: 25.8,
    coverageSource: "phase_7f_2_5_inventory_audit",
  });
  assert.ok(artifact.fieldAvailability.supportedNow.includes("sourceUrl"));
  assert.ok(artifact.fieldAvailability.partial.includes("assetInventorySummary"));
  assert.ok(artifact.fieldAvailability.missingUnavailable.includes("layoutBoxExtraction"));
  assert.equal(artifact.evidence.layout.layoutBoxRefs.length, 0);
  assert.equal(artifact.evidence.scriptRuntime.domMutationSummary, null);
  assert.equal(artifact.evidence.computedStyle.fontSourcesLoaded.length, 0);
  assert.ok(artifact.limitations.includes("rendered_capture_unavailable"));
  assert.ok(artifact.limitations.includes("raw_html_fallback_used"));
  assert.ok(artifact.limitations.includes("missing_computed_styles"));
  assert.ok(artifact.limitations.includes("missing_layout_boxes"));
  assert.ok(artifact.limitations.includes("missing_mutation_evidence"));
  assert.ok(artifact.limitations.includes("missing_widget_runtime_evidence"));
  assert.ok(artifact.limitations.includes("missing_font_source_evidence"));
  assert.ok(artifact.limitations.includes("partial_asset_inventory"));
  assert.ok(artifact.limitations.includes("partial_network_evidence"));
});

test("latest baseline artifact can be read back from a site version provenance summary", () => {
  const summary = attachEvidenceCaptureBaselineArtifact({
    siteVersionId: "11111111-1111-4111-8111-111111111111",
    sourceUrl: "https://example.com/",
    importProvenanceSummary: baselineProvenance(),
  });

  const readBack = getLatestEvidenceCaptureBaselineArtifactForSiteVersion({
    siteVersion: { importProvenanceSummary: summary },
  });

  assert.equal(readBack?.kind, "evidence_capture_baseline");
  assert.equal(readBack?.siteVersionId, "11111111-1111-4111-8111-111111111111");
  assert.equal(readBack?.coverage.coverageSource, "phase_7f_2_5_inventory_audit");
});

test("baseline artifact remains capture evidence and does not require mirror or reconstruction behavior", () => {
  const artifact = buildEvidenceCaptureBaselineArtifact({
    sourceUrl: "https://example.com/",
    importProvenanceSummary: baselineProvenance(),
  });

  assert.equal(artifact.evidence.kind, "evidence_capture_artifact_v1");
  assert.equal("originalMirrorArtifactId" in artifact, false);
  assert.equal("reconstructionCandidateId" in artifact, false);
  assert.equal(artifact.reconstructionGrade, false);
});
