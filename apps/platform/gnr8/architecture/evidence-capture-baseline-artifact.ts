import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import {
  IMPORTER_ARCHITECTURE_SPLIT_VERSION,
  type CaptureProvider,
  type EvidenceArtifactRef,
  type EvidenceCaptureArtifact,
  type EvidenceCaptureStatus,
  type EvidenceViewport,
  type KnownFidelityLimitation,
  classifyCaptureLimitation,
  createEmptyEvidenceCaptureArtifact,
} from "./importer-architecture-split-contract";

export const EVIDENCE_CAPTURE_BASELINE_ARTIFACT_KIND = "evidence_capture_baseline" as const;
export const EVIDENCE_CAPTURE_BASELINE_COVERAGE_SOURCE = "phase_7f_2_5_inventory_audit" as const;

export type EvidenceCaptureBaselineCoverage = {
  supportedNowCount: 16;
  partialCount: 33;
  missingCount: 17;
  supportedNowPercent: 24.2;
  partialPercent: 50.0;
  missingPercent: 25.8;
  coverageSource: typeof EVIDENCE_CAPTURE_BASELINE_COVERAGE_SOURCE;
};

export type EvidenceCaptureBaselineFieldAvailability = {
  supportedNow: string[];
  partial: string[];
  missingUnavailable: string[];
};

export type EvidenceCaptureBaselineArtifactRecord = {
  kind: typeof EVIDENCE_CAPTURE_BASELINE_ARTIFACT_KIND;
  architectureVersion: typeof IMPORTER_ARCHITECTURE_SPLIT_VERSION;
  artifactVersion: 1;
  artifactStatus: "baseline_partial";
  reconstructionGrade: false;
  captureRunId: string;
  siteVersionId: string | null;
  sourceUrl: string;
  finalUrl: string | null;
  routePath: string;
  captureProvider: CaptureProvider;
  captureStatus: EvidenceCaptureStatus;
  coverageStatus: "baseline_partial_not_reconstruction_grade";
  coverage: EvidenceCaptureBaselineCoverage;
  fieldAvailability: EvidenceCaptureBaselineFieldAvailability;
  evidence: EvidenceCaptureArtifact;
  persistedRefs: {
    rawHtmlRef: EvidenceArtifactRef | null;
    renderedDomRef: EvidenceArtifactRef | null;
    computedStyleRef: EvidenceArtifactRef | null;
    screenshotRefs: EvidenceArtifactRef[];
    acquisitionEvidenceRef: EvidenceArtifactRef | null;
    renderedCaptureManifestRef: EvidenceArtifactRef | null;
    rawImportArtifactId: string | null;
  };
  summaries: {
    sourceMode: RuntimeImportProvenanceSummary["sourceMode"];
    importFidelityStatus: RuntimeImportProvenanceSummary["importFidelityStatus"];
    renderedCaptureStatus: RuntimeImportProvenanceSummary["renderedCaptureStatus"];
    renderedDomQuality: RuntimeImportProvenanceSummary["renderedDomQuality"];
    renderedDomNodeCount: number | null;
    renderedDomLength: number | null;
    screenshotCount: number;
    computedStyleSampleCount: number;
    assetInventory: {
      persistedAssetCount: number | null;
      externalFallbackAssetCount: number | null;
      fileCount: number | null;
    };
    routeDiscovery: {
      enabled: boolean;
      discoveredPageCount: number | null;
      routeCandidateCount: number | null;
      skippedLinkCount: number | null;
      diagnostics: string[];
    };
    diagnostics: string[];
    captureFallbackStatus: {
      rawHtmlFallbackUsed: boolean;
      reason: string | null;
    };
  };
  limitations: string[];
  fidelityLimitations: KnownFidelityLimitation[];
};

const BASELINE_COVERAGE: EvidenceCaptureBaselineCoverage = {
  supportedNowCount: 16,
  partialCount: 33,
  missingCount: 17,
  supportedNowPercent: 24.2,
  partialPercent: 50.0,
  missingPercent: 25.8,
  coverageSource: EVIDENCE_CAPTURE_BASELINE_COVERAGE_SOURCE,
};

const FIELD_AVAILABILITY: EvidenceCaptureBaselineFieldAvailability = {
  supportedNow: [
    "architectureVersion",
    "captureRunId",
    "sourceUrl",
    "finalUrl",
    "routePath",
    "captureProvider",
    "captureStatus",
    "coverageStatus",
    "rawHtmlRef",
    "renderedDomRef",
    "screenshotRefs",
    "domNodeCount",
    "diagnostics",
    "sourceMode",
    "importFidelityStatus",
    "fidelityLimitations",
  ],
  partial: [
    "rawHtmlHash",
    "statusCode",
    "redirectChain",
    "renderedCaptureSummary",
    "computedStyleSamples",
    "assetInventorySummary",
    "routeDiscoveryEvidence",
    "networkEvidence",
    "fontEvidence",
    "mediaEvidence",
    "scriptRuntimeEvidence",
    "widgetEvidence",
    "layoutEvidence",
    "styleSignals",
    "semanticImportEvidence",
    "multipageImportEvidence",
    "siteTreeEvidence",
    "templateFamilyEvidence",
    "captureFallbackStatus",
    "workerHealth",
    "captureJob",
    "rawImportArtifactRef",
    "acquisitionEvidenceRef",
    "renderedCaptureManifestRef",
    "fullPageScreenshotRef",
    "viewportScreenshotRef",
    "htmlByteLength",
    "externalAssetFallbacks",
    "importDiagnosticCodes",
    "renderedDomQuality",
    "styleCoverage",
    "sourceSelection",
    "captureExecutionStatus",
  ],
  missingUnavailable: [
    "computedStyleExtraction",
    "layoutBoxExtraction",
    "domMutationTracking",
    "widgetRuntimeEvidence",
    "fontSourceEvidence",
    "fullNetworkTrace",
    "responseHeaderInventory",
    "redirectChainInventory",
    "browserConsoleInventory",
    "animationTimelineEvidence",
    "interactionStateEvidence",
    "responsiveBreakpointEvidence",
    "accessibilityTreeEvidence",
    "shadowDomEvidence",
    "canvasRasterEvidence",
    "videoFrameEvidence",
    "reconstructionGradeDesignModel",
  ],
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function optionalText(value: unknown): string | null {
  const normalized = text(value);
  return normalized || null;
}

function numberOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function refFromPath(input: { id: string; path: string | null | undefined; mediaType: string | null }): EvidenceArtifactRef | null {
  const uri = optionalText(input.path);
  if (!uri) return null;
  return {
    id: input.id,
    uri,
    mediaType: input.mediaType,
    sha256: null,
    byteLength: null,
  };
}

function limitation(type: Parameters<typeof classifyCaptureLimitation>[0]["type"], explanation: string): KnownFidelityLimitation {
  return classifyCaptureLimitation({
    type,
    affectedLayer: "evidence_capture",
    severity: "warning",
    explanation,
    recommendedNextLayer: "manual_review",
  });
}

function buildBaselineLimitations(summary: RuntimeImportProvenanceSummary): {
  labels: string[];
  fidelityLimitations: KnownFidelityLimitation[];
} {
  const labels = new Set<string>();
  const fidelityLimitations: KnownFidelityLimitation[] = [];
  const add = (label: string, item: KnownFidelityLimitation) => {
    labels.add(label);
    fidelityLimitations.push(item);
  };

  if (summary.renderedCapture.status === "failed" || !summary.captureEvidence.renderedDomPath) {
    add("rendered_capture_unavailable", limitation("rendered_dom_missing", "Rendered capture is unavailable in the current baseline evidence."));
  }
  if (summary.sourceMode === "raw_html_fallback") {
    labels.add("raw_html_fallback_used");
  }
  labels.add("missing_computed_styles");
  labels.add("missing_layout_boxes");
  labels.add("missing_mutation_evidence");
  labels.add("missing_widget_runtime_evidence");
  labels.add("missing_font_source_evidence");
  labels.add("partial_asset_inventory");
  labels.add("partial_network_evidence");

  return { labels: [...labels], fidelityLimitations };
}

export function buildEvidenceCaptureBaselineArtifact(input: {
  siteVersionId?: string | null;
  sourceUrl: string;
  finalUrl?: string | null;
  routePath?: string | null;
  captureRunId?: string | null;
  capturedAt?: string | null;
  captureProvider?: CaptureProvider;
  importProvenanceSummary: RuntimeImportProvenanceSummary;
  rawImportArtifact?: {
    artifactId?: string | null;
    fileMap?: Record<string, { path: string; mediaType: string; sizeBytes: number; sha256: string }>;
    entryHtmlPath?: string | null;
    metadata?: {
      sourceUrl?: string | null;
      finalUrl?: string | null;
      htmlByteLength?: number | null;
      diagnostics?: { codes?: string[] };
      assetSummary?: { persistedAssetCount?: number; externalFallbackAssetCount?: number };
    };
  } | null;
}): EvidenceCaptureBaselineArtifactRecord {
  const summary = input.importProvenanceSummary;
  const captureRunId =
    optionalText(input.captureRunId) ??
    optionalText(summary.executionIdentity?.snapshotRunId) ??
    optionalText(summary.executionIdentity?.snapshotId) ??
    "unknown_capture_run";
  const sourceUrl = optionalText(input.sourceUrl) ?? optionalText(input.rawImportArtifact?.metadata?.sourceUrl) ?? "";
  const finalUrl = optionalText(input.finalUrl) ?? optionalText(input.rawImportArtifact?.metadata?.finalUrl);
  const routePath = optionalText(input.routePath) ?? "/";
  const capturedAt = optionalText(input.capturedAt) ?? new Date(0).toISOString();
  const viewport: EvidenceViewport = { width: 1440, height: 900, deviceScaleFactor: null, isMobile: false };
  const artifact = createEmptyEvidenceCaptureArtifact({
    sourceUrl,
    finalUrl,
    routePath,
    captureRunId,
    capturedAt,
    captureProvider: input.captureProvider ?? "chrome_playwright",
    viewport,
  });

  const rawImportEntryPath = optionalText(input.rawImportArtifact?.entryHtmlPath);
  const rawImportEntryMeta = rawImportEntryPath ? input.rawImportArtifact?.fileMap?.[rawImportEntryPath] ?? null : null;
  const rawHtmlPathRef = refFromPath({
    id: "raw_html",
    path: summary.captureEvidence.responseHtmlPath ?? summary.captureEvidence.entryHtmlPath,
    mediaType: "text/html",
  });
  const rawHtmlRef = rawHtmlPathRef
    ? {
        ...rawHtmlPathRef,
        sha256: rawImportEntryMeta?.sha256 ?? rawHtmlPathRef.sha256,
        byteLength: rawImportEntryMeta?.sizeBytes ?? input.rawImportArtifact?.metadata?.htmlByteLength ?? rawHtmlPathRef.byteLength,
      }
    : rawImportEntryPath
      ? {
          id: "raw_html",
          uri: rawImportEntryPath,
          mediaType: rawImportEntryMeta?.mediaType ?? "text/html",
          sha256: rawImportEntryMeta?.sha256 ?? null,
          byteLength: rawImportEntryMeta?.sizeBytes ?? input.rawImportArtifact?.metadata?.htmlByteLength ?? null,
        }
      : null;
  const renderedDomRef = refFromPath({ id: "rendered_dom", path: summary.captureEvidence.renderedDomPath, mediaType: "text/html" });
  const computedStyleRef = refFromPath({ id: "computed_styles", path: summary.captureEvidence.computedStylesPath, mediaType: "application/json" });
  const screenshotRefs = summary.captureEvidence.screenshotPaths
    .map((shot, index) => refFromPath({ id: `screenshot_${index + 1}`, path: shot, mediaType: "image/png" }))
    .filter((ref): ref is EvidenceArtifactRef => ref !== null);

  artifact.status = summary.sourceMode === "rendered_dom" ? "partial" : rawHtmlRef ? "partial" : "unavailable";
  artifact.route.captureStatus = artifact.status;
  artifact.rawInputs.rawHtmlRef = rawHtmlRef;
  artifact.rendered.renderStatus =
    summary.renderedCapture.status === "available" || summary.renderedCapture.status === "partial"
      ? summary.renderedCapture.status
      : "failed";
  artifact.rendered.renderedDomRef = renderedDomRef;
  artifact.rendered.domNodeCount = numberOrNull(summary.renderedCapture.nodeCount);
  artifact.rendered.renderFailureReason = summary.renderedCapture.execution.failureCode;
  artifact.computedStyle.computedStyleSampleRefs = computedStyleRef ? [computedStyleRef] : [];
  artifact.rendered.screenshotRefs = screenshotRefs.map((ref) => ({ ...ref, viewport, fullPage: false }));
  artifact.rendered.fullPageScreenshotRef = refFromPath({
    id: "fullpage_screenshot",
    path: summary.captureEvidence.renderedFullpageScreenshotPath,
    mediaType: "image/png",
  });
  artifact.network.assetClassifications = [];
  artifact.route.rawFilePath = optionalText(input.rawImportArtifact?.entryHtmlPath);

  const { labels, fidelityLimitations } = buildBaselineLimitations(summary);
  artifact.fidelityLimitations = fidelityLimitations;

  return {
    kind: EVIDENCE_CAPTURE_BASELINE_ARTIFACT_KIND,
    architectureVersion: IMPORTER_ARCHITECTURE_SPLIT_VERSION,
    artifactVersion: 1,
    artifactStatus: "baseline_partial",
    reconstructionGrade: false,
    captureRunId,
    siteVersionId: optionalText(input.siteVersionId),
    sourceUrl,
    finalUrl,
    routePath,
    captureProvider: artifact.source.captureProvider,
    captureStatus: artifact.status,
    coverageStatus: "baseline_partial_not_reconstruction_grade",
    coverage: BASELINE_COVERAGE,
    fieldAvailability: FIELD_AVAILABILITY,
    evidence: artifact,
    persistedRefs: {
      rawHtmlRef,
      renderedDomRef,
      computedStyleRef,
      screenshotRefs,
      acquisitionEvidenceRef: refFromPath({
        id: "acquisition_evidence",
        path: summary.captureEvidence.acquisitionEvidencePath,
        mediaType: "application/json",
      }),
      renderedCaptureManifestRef: refFromPath({
        id: "rendered_capture_manifest",
        path: summary.captureEvidence.renderedCaptureManifestPath,
        mediaType: "application/json",
      }),
      rawImportArtifactId: optionalText(input.rawImportArtifact?.artifactId),
    },
    summaries: {
      sourceMode: summary.sourceMode,
      importFidelityStatus: summary.importFidelityStatus,
      renderedCaptureStatus: summary.renderedCaptureStatus,
      renderedDomQuality: summary.renderedDomQuality,
      renderedDomNodeCount: numberOrNull(summary.renderedCapture.nodeCount),
      renderedDomLength: numberOrNull(summary.renderedCapture.domLength),
      screenshotCount: summary.screenshotCount,
      computedStyleSampleCount: summary.computedStyleSampleCount,
      assetInventory: {
        persistedAssetCount: numberOrNull(input.rawImportArtifact?.metadata?.assetSummary?.persistedAssetCount),
        externalFallbackAssetCount: numberOrNull(input.rawImportArtifact?.metadata?.assetSummary?.externalFallbackAssetCount),
        fileCount: input.rawImportArtifact?.fileMap ? Object.keys(input.rawImportArtifact.fileMap).length : null,
      },
      routeDiscovery: {
        enabled: Boolean(summary.multiPageDiscovery?.summary.enabled),
        discoveredPageCount: numberOrNull(summary.multiPageDiscovery?.summary.discoveredPageCount),
        routeCandidateCount: numberOrNull(summary.multiPageDiscovery?.summary.routeCandidateCount),
        skippedLinkCount: numberOrNull(summary.multiPageDiscovery?.summary.skippedLinkCount),
        diagnostics: summary.multiPageDiscovery?.summary.diagnostics ?? [],
      },
      diagnostics: summary.importDiagnosticCodes,
      captureFallbackStatus: {
        rawHtmlFallbackUsed: summary.sourceMode === "raw_html_fallback",
        reason: summary.sourceMode === "raw_html_fallback" ? summary.renderedCapture.execution.failureCode ?? "rendered_capture_unusable" : null,
      },
    },
    limitations: labels,
    fidelityLimitations,
  };
}

export function attachEvidenceCaptureBaselineArtifact(input: {
  siteVersionId?: string | null;
  sourceUrl: string;
  finalUrl?: string | null;
  routePath?: string | null;
  captureRunId?: string | null;
  capturedAt?: string | null;
  importProvenanceSummary: RuntimeImportProvenanceSummary;
  rawImportArtifact?: Parameters<typeof buildEvidenceCaptureBaselineArtifact>[0]["rawImportArtifact"];
}): RuntimeImportProvenanceSummary {
  return {
    ...input.importProvenanceSummary,
    evidenceCaptureBaselineArtifact: buildEvidenceCaptureBaselineArtifact(input),
  };
}

export function getLatestEvidenceCaptureBaselineArtifactForSiteVersion(input: {
  siteVersion: { importProvenanceSummary?: RuntimeImportProvenanceSummary | null } | null;
}): EvidenceCaptureBaselineArtifactRecord | null {
  return input.siteVersion?.importProvenanceSummary?.evidenceCaptureBaselineArtifact ?? null;
}
