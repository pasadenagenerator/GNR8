/**
 * Phase 7F importer architecture boundary contract.
 *
 * This file intentionally contains lightweight type scaffolding and pure helper
 * functions only. It does not change import execution, preview rendering,
 * script policy, route limits, capture providers, storage, or AI behavior.
 */

export const IMPORTER_ARCHITECTURE_SPLIT_VERSION = "7F-2" as const;

export type CaptureProvider = "chrome_playwright" | "servo_research";

export type EvidenceCaptureStatus = "available" | "partial" | "unavailable" | "failed";

export type OriginalMirrorStatus =
  | "not_started"
  | "available"
  | "available_with_limitations"
  | "unavailable"
  | "failed";

export type ReconstructionStatus =
  | "not_started"
  | "candidate_available"
  | "needs_review"
  | "accepted"
  | "rejected"
  | "failed";

export type ImporterArchitectureLayer =
  | "evidence_capture"
  | "original_mirror"
  | "ai_reconstruction";

export type FidelityLimitationRecommendedNextLayer =
  | "original_mirror"
  | "ai_reconstruction"
  | "manual_review"
  | "unsupported";

export type FidelityLimitationSeverity = "info" | "warning" | "blocker";

export type KnownFidelityLimitationKind =
  | "builder_runtime_dependency"
  | "lazy_loading_dependency"
  | "third_party_widget"
  | "external_map"
  | "gallery_runtime"
  | "form_runtime"
  | "font_loading"
  | "accessibility_overlay"
  | "cookie_banner_runtime"
  | "chat_support_runtime"
  | "blocked_resource"
  | "failed_resource"
  | "rendered_dom_missing"
  | "screenshot_missing"
  | "post_render_dom_mutation"
  | "duplicate_runtime_insertion"
  | "unknown_runtime_behavior";

export type KnownFidelityLimitation = {
  type: KnownFidelityLimitationKind;
  affectedLayer: ImporterArchitectureLayer;
  severity: FidelityLimitationSeverity;
  explanation: string;
  evidenceRefIds: string[];
  recommendedNextLayer: FidelityLimitationRecommendedNextLayer;
};

export type EvidenceArtifactRef = {
  id: string;
  uri: string | null;
  mediaType: string | null;
  sha256: string | null;
  byteLength: number | null;
};

export type EvidenceViewport = {
  width: number;
  height: number;
  deviceScaleFactor: number | null;
  isMobile: boolean;
};

export type SourceIdentityEvidence = {
  sourceUrl: string;
  finalUrl: string | null;
  routePath: string;
  canonicalUrl: string | null;
  captureProvider: CaptureProvider;
  capturedAt: string;
  captureRunId: string;
};

export type RedirectChainEntry = {
  fromUrl: string;
  toUrl: string;
  statusCode: number | null;
};

export type RawInputEvidence = {
  rawHtmlRef: EvidenceArtifactRef | null;
  responseHeaders: Record<string, string>;
  statusCode: number | null;
  redirectChain: RedirectChainEntry[];
};

export type ScreenshotEvidenceRef = EvidenceArtifactRef & {
  viewport: EvidenceViewport;
  fullPage: boolean;
};

export type RenderStatus = "not_started" | "available" | "partial" | "failed" | "unavailable";

export type RenderedBrowserEvidence = {
  renderedDomRef: EvidenceArtifactRef | null;
  renderedHtmlHash: string | null;
  screenshotRefs: ScreenshotEvidenceRef[];
  viewport: EvidenceViewport;
  fullPageScreenshotRef: EvidenceArtifactRef | null;
  domNodeCount: number | null;
  renderStatus: RenderStatus;
  renderFailureReason: string | null;
};

export type DesignTokenCandidate = {
  tokenType: "color" | "font" | "spacing" | "radius" | "shadow" | "motion" | "unknown";
  name: string | null;
  value: string;
  confidence: number;
  evidenceRefIds: string[];
};

export type FontDetectedEvidence = {
  family: string;
  source: "css" | "computed_style" | "browser" | "unknown";
  weight: string | null;
  style: string | null;
  evidenceRefIds: string[];
};

export type FontSourceEvidence = {
  family: string | null;
  url: string;
  format: string | null;
  loaded: boolean;
  evidenceRefIds: string[];
};

export type ColorCandidateEvidence = {
  value: string;
  usageCount: number;
  roles: string[];
  evidenceRefIds: string[];
};

export type SpacingCandidateEvidence = {
  value: string;
  property: "margin" | "padding" | "gap" | "position" | "size" | "unknown";
  usageCount: number;
  evidenceRefIds: string[];
};

export type ComputedStyleEvidence = {
  computedStyleSampleRefs: EvidenceArtifactRef[];
  designTokenCandidates: DesignTokenCandidate[];
  fontsDetected: FontDetectedEvidence[];
  fontSourcesLoaded: FontSourceEvidence[];
  missingFontSources: FontSourceEvidence[];
  colorCandidates: ColorCandidateEvidence[];
  spacingCandidates: SpacingCandidateEvidence[];
};

export type LayoutBoxEvidenceRef = EvidenceArtifactRef & {
  selectorHint: string | null;
  roleHint: string | null;
};

export type LayoutRegionEvidence = {
  id: string;
  selectorHint: string | null;
  roleHint: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  evidenceRefIds: string[];
};

export type StickyFixedElementEvidence = LayoutRegionEvidence & {
  position: "sticky" | "fixed";
  zIndex: string | null;
};

export type RouteLevelStructuralHint = {
  hint:
    | "header"
    | "footer"
    | "nav"
    | "hero"
    | "main_content"
    | "sidebar"
    | "repeated_card_grid"
    | "form"
    | "gallery"
    | "map"
    | "unknown";
  selectorHint: string | null;
  confidence: number;
  evidenceRefIds: string[];
};

export type LayoutEvidence = {
  layoutBoxRefs: LayoutBoxEvidenceRef[];
  viewportBreakpoints: EvidenceViewport[];
  aboveFoldRegions: LayoutRegionEvidence[];
  repeatedRegions: LayoutRegionEvidence[];
  stickyFixedElements: StickyFixedElementEvidence[];
  routeLevelStructuralHints: RouteLevelStructuralHint[];
};

export type NetworkAssetClassification =
  | "stylesheet"
  | "script"
  | "image"
  | "font"
  | "iframe_embed"
  | "video"
  | "api_json"
  | "analytics_tracking"
  | "widget_runtime"
  | "document"
  | "other";

export type NetworkRequestEvidence = {
  id: string;
  url: string;
  method: string;
  resourceType: string | null;
  classification: NetworkAssetClassification;
  initiator: string | null;
};

export type NetworkResponseEvidence = {
  requestId: string;
  url: string;
  statusCode: number | null;
  headers: Record<string, string>;
  mimeType: string | null;
  byteLength: number | null;
  fromCache: boolean;
};

export type FailedNetworkRequestEvidence = NetworkRequestEvidence & {
  failureText: string;
};

export type BlockedNetworkRequestEvidence = NetworkRequestEvidence & {
  blockedReason: string;
};

export type NetworkEvidence = {
  requestInventory: NetworkRequestEvidence[];
  responseInventory: NetworkResponseEvidence[];
  failedRequests: FailedNetworkRequestEvidence[];
  blockedRequests: BlockedNetworkRequestEvidence[];
  assetClassifications: NetworkAssetClassification[];
};

export type ScriptInventoryEvidence = {
  id: string;
  src: string | null;
  classification: "first_party" | "third_party" | "analytics_tracking" | "widget_runtime" | "unknown";
  async: boolean;
  defer: boolean;
  evidenceRefIds: string[];
};

export type InlineScriptSignature = {
  id: string;
  sha256: string;
  byteLength: number;
  signatureHint: string | null;
};

export type ConsoleMessageEvidence = {
  level: "error" | "warning";
  text: string;
  sourceUrl: string | null;
  lineNumber: number | null;
};

export type DomMutationSummaryEvidence = {
  mutationCount: number;
  addedNodeCount: number;
  removedNodeCount: number;
  attributeMutationCount: number;
  textMutationCount: number;
  observationWindowMs: number | null;
};

export type PostRenderAddedNodeEvidence = {
  selectorHint: string | null;
  nodeName: string;
  textPreview: string | null;
  evidenceRefIds: string[];
};

export type DuplicateInsertionSignal = {
  selectorHint: string | null;
  count: number;
  evidenceRefIds: string[];
};

export type LazyloadRuntimeDependencySignal = {
  dependencyType: "lazy_image" | "intersection_observer" | "scroll_trigger" | "hydration" | "unknown";
  selectorHint: string | null;
  evidenceRefIds: string[];
};

export type ScriptRuntimeEvidence = {
  scriptInventory: ScriptInventoryEvidence[];
  inlineScriptSignatures: InlineScriptSignature[];
  consoleErrorsWarnings: ConsoleMessageEvidence[];
  domMutationSummary: DomMutationSummaryEvidence | null;
  postRenderAddedNodes: PostRenderAddedNodeEvidence[];
  duplicateInsertionSignals: DuplicateInsertionSignal[];
  lazyloadRuntimeDependencySignals: LazyloadRuntimeDependencySignal[];
};

export type ImageInventoryEvidence = {
  id: string;
  src: string | null;
  srcset: string | null;
  lazyRefs: string[];
  alt: string | null;
  renderedWidth: number | null;
  renderedHeight: number | null;
  evidenceRefIds: string[];
};

export type MissingImageEvidence = {
  src: string | null;
  selectorHint: string | null;
  failureReason: string | null;
  evidenceRefIds: string[];
};

export type BackgroundImageEvidence = {
  selectorHint: string | null;
  url: string;
  renderedWidth: number | null;
  renderedHeight: number | null;
  evidenceRefIds: string[];
};

export type VideoMediaEvidence = {
  id: string;
  src: string | null;
  poster: string | null;
  providerHint: string | null;
  evidenceRefIds: string[];
};

export type MediaEvidence = {
  imageInventory: ImageInventoryEvidence[];
  missingImages: MissingImageEvidence[];
  backgroundImageRefs: BackgroundImageEvidence[];
  videoMediaRefs: VideoMediaEvidence[];
};

export type MapWidgetProvider =
  | "google_maps"
  | "openstreetmap"
  | "leaflet"
  | "mapbox"
  | "openlayers"
  | "mono_osmap";

export type MapWidgetEvidence = {
  provider: MapWidgetProvider;
  selectorHint: string | null;
  iframeSrc: string | null;
  scriptRefs: string[];
  evidenceRefIds: string[];
};

export type WidgetEvidenceItem = {
  id: string;
  selectorHint: string | null;
  providerHint: string | null;
  evidenceRefIds: string[];
};

export type FormWidgetEvidence = WidgetEvidenceItem & {
  action: string | null;
  method: string | null;
  fieldCount: number;
};

export type WidgetEvidence = {
  maps: MapWidgetEvidence[];
  galleriesSlidersLightboxes: WidgetEvidenceItem[];
  forms: FormWidgetEvidence[];
  accessibilityWidgets: WidgetEvidenceItem[];
  cookieBanners: WidgetEvidenceItem[];
  chatSupportWidgets: WidgetEvidenceItem[];
};

export type RouteCaptureEvidence = {
  discoveredRoutePath: string;
  sourceUrl: string;
  finalUrl: string | null;
  routePriority: number;
  navigationSource: "seed" | "link" | "sitemap" | "redirect" | "manual" | "unknown";
  rawFilePath: string | null;
  captureStatus: EvidenceCaptureStatus;
  knownFidelityLimitations: KnownFidelityLimitation[];
};

export type EvidenceCaptureArtifact = {
  kind: "evidence_capture_artifact_v1";
  architectureVersion: typeof IMPORTER_ARCHITECTURE_SPLIT_VERSION;
  status: EvidenceCaptureStatus;
  source: SourceIdentityEvidence;
  rawInputs: RawInputEvidence;
  rendered: RenderedBrowserEvidence;
  computedStyle: ComputedStyleEvidence;
  layout: LayoutEvidence;
  network: NetworkEvidence;
  scriptRuntime: ScriptRuntimeEvidence;
  media: MediaEvidence;
  widgets: WidgetEvidence;
  route: RouteCaptureEvidence;
  fidelityLimitations: KnownFidelityLimitation[];
};

export type EvidenceCaptureSummary = {
  sourceUrl: string;
  finalUrl: string | null;
  routePath: string;
  captureProvider: CaptureProvider;
  status: EvidenceCaptureStatus;
  isReconstructionReady: boolean;
  counts: {
    screenshots: number;
    computedStyleSamples: number;
    layoutBoxes: number;
    networkRequests: number;
    failedRequests: number;
    blockedRequests: number;
    assetClassifications: number;
    scripts: number;
    images: number;
    missingImages: number;
    mapWidgets: number;
    forms: number;
    fidelityLimitations: number;
    blockingLimitations: number;
  };
};

export type OriginalMirrorArtifact = {
  kind: "original_mirror_artifact_v1";
  architectureVersion: typeof IMPORTER_ARCHITECTURE_SPLIT_VERSION;
  label: "Original Mirror Preview";
  status: OriginalMirrorStatus;
  readOnly: true;
  semantic: false;
  aiReconstructed: false;
  sourceRefsPreservedWhereSafe: boolean;
  evidenceCaptureArtifactIds: string[];
  limitations: KnownFidelityLimitation[];
};

export type ReconstructionArtifact = {
  kind: "reconstruction_artifact_v1";
  architectureVersion: typeof IMPORTER_ARCHITECTURE_SPLIT_VERSION;
  label: "GNR8 Reconstruction Preview";
  status: ReconstructionStatus;
  source: "evidence_capture";
  originalMirrorArtifactId: string | null;
  evidenceCaptureArtifactIds: string[];
  reconstructionCandidateId: string | null;
  produces: {
    gnr8ReactBlockModel: boolean;
    editableContentModel: boolean;
    designTokens: boolean;
    structuredRouteModel: boolean;
    cmsBindings: boolean;
  };
  limitations: KnownFidelityLimitation[];
};

const EMPTY_VIEWPORT: EvidenceViewport = {
  width: 1440,
  height: 900,
  deviceScaleFactor: null,
  isMobile: false,
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(normalizeText(value));
}

function uniqueAssetClassifications(network: NetworkEvidence): NetworkAssetClassification[] {
  const values = new Set<NetworkAssetClassification>();
  for (const request of [
    ...network.requestInventory,
    ...network.failedRequests,
    ...network.blockedRequests,
  ]) {
    values.add(request.classification);
  }
  return Array.from(values);
}

export function classifyCaptureLimitation(input: {
  type: KnownFidelityLimitationKind;
  affectedLayer: ImporterArchitectureLayer;
  severity: FidelityLimitationSeverity;
  explanation: string;
  evidenceRefIds?: string[];
  recommendedNextLayer: FidelityLimitationRecommendedNextLayer;
}): KnownFidelityLimitation {
  return {
    type: input.type,
    affectedLayer: input.affectedLayer,
    severity: input.severity,
    explanation: normalizeText(input.explanation),
    evidenceRefIds: input.evidenceRefIds ?? [],
    recommendedNextLayer: input.recommendedNextLayer,
  };
}

export function createEmptyEvidenceCaptureArtifact(input: {
  sourceUrl: string;
  routePath: string;
  captureRunId: string;
  capturedAt: string;
  finalUrl?: string | null;
  canonicalUrl?: string | null;
  captureProvider?: CaptureProvider;
  viewport?: EvidenceViewport;
}): EvidenceCaptureArtifact {
  const sourceUrl = normalizeText(input.sourceUrl);
  const routePath = normalizeText(input.routePath) || "/";
  const finalUrl = normalizeText(input.finalUrl) || null;
  const viewport = input.viewport ?? EMPTY_VIEWPORT;

  return {
    kind: "evidence_capture_artifact_v1",
    architectureVersion: IMPORTER_ARCHITECTURE_SPLIT_VERSION,
    status: "unavailable",
    source: {
      sourceUrl,
      finalUrl,
      routePath,
      canonicalUrl: normalizeText(input.canonicalUrl) || null,
      captureProvider: input.captureProvider ?? "chrome_playwright",
      capturedAt: normalizeText(input.capturedAt),
      captureRunId: normalizeText(input.captureRunId),
    },
    rawInputs: {
      rawHtmlRef: null,
      responseHeaders: {},
      statusCode: null,
      redirectChain: [],
    },
    rendered: {
      renderedDomRef: null,
      renderedHtmlHash: null,
      screenshotRefs: [],
      viewport,
      fullPageScreenshotRef: null,
      domNodeCount: null,
      renderStatus: "not_started",
      renderFailureReason: null,
    },
    computedStyle: {
      computedStyleSampleRefs: [],
      designTokenCandidates: [],
      fontsDetected: [],
      fontSourcesLoaded: [],
      missingFontSources: [],
      colorCandidates: [],
      spacingCandidates: [],
    },
    layout: {
      layoutBoxRefs: [],
      viewportBreakpoints: [viewport],
      aboveFoldRegions: [],
      repeatedRegions: [],
      stickyFixedElements: [],
      routeLevelStructuralHints: [],
    },
    network: {
      requestInventory: [],
      responseInventory: [],
      failedRequests: [],
      blockedRequests: [],
      assetClassifications: [],
    },
    scriptRuntime: {
      scriptInventory: [],
      inlineScriptSignatures: [],
      consoleErrorsWarnings: [],
      domMutationSummary: null,
      postRenderAddedNodes: [],
      duplicateInsertionSignals: [],
      lazyloadRuntimeDependencySignals: [],
    },
    media: {
      imageInventory: [],
      missingImages: [],
      backgroundImageRefs: [],
      videoMediaRefs: [],
    },
    widgets: {
      maps: [],
      galleriesSlidersLightboxes: [],
      forms: [],
      accessibilityWidgets: [],
      cookieBanners: [],
      chatSupportWidgets: [],
    },
    route: {
      discoveredRoutePath: routePath,
      sourceUrl,
      finalUrl,
      routePriority: 0,
      navigationSource: "unknown",
      rawFilePath: null,
      captureStatus: "unavailable",
      knownFidelityLimitations: [],
    },
    fidelityLimitations: [],
  };
}

export function classifyEvidenceCaptureLimitations(
  artifact: EvidenceCaptureArtifact,
): KnownFidelityLimitation[] {
  const limitations = [...artifact.fidelityLimitations, ...artifact.route.knownFidelityLimitations];

  if (!artifact.rendered.renderedDomRef || !hasText(artifact.rendered.renderedHtmlHash)) {
    limitations.push(
      classifyCaptureLimitation({
        type: "rendered_dom_missing",
        affectedLayer: "evidence_capture",
        severity: "blocker",
        explanation: "Rendered DOM evidence is missing, so reconstruction cannot reliably infer browser-observed structure.",
        recommendedNextLayer: "manual_review",
      }),
    );
  }

  if (artifact.rendered.screenshotRefs.length === 0 && !artifact.rendered.fullPageScreenshotRef) {
    limitations.push(
      classifyCaptureLimitation({
        type: "screenshot_missing",
        affectedLayer: "evidence_capture",
        severity: "warning",
        explanation: "Screenshot evidence is missing, reducing visual fidelity confidence for reconstruction.",
        recommendedNextLayer: "ai_reconstruction",
      }),
    );
  }

  if (artifact.computedStyle.missingFontSources.length > 0) {
    limitations.push(
      classifyCaptureLimitation({
        type: "font_loading",
        affectedLayer: "ai_reconstruction",
        severity: "warning",
        explanation: "One or more detected font sources did not load during capture.",
        evidenceRefIds: artifact.computedStyle.missingFontSources.flatMap((font) => font.evidenceRefIds),
        recommendedNextLayer: "ai_reconstruction",
      }),
    );
  }

  if (artifact.widgets.maps.length > 0) {
    limitations.push(
      classifyCaptureLimitation({
        type: "external_map",
        affectedLayer: "original_mirror",
        severity: "warning",
        explanation: "Map widgets are captured as browser evidence and may require a mirror or explicit reconstruction substitute.",
        evidenceRefIds: artifact.widgets.maps.flatMap((map) => map.evidenceRefIds),
        recommendedNextLayer: "original_mirror",
      }),
    );
  }

  for (const request of artifact.network.failedRequests) {
    limitations.push(
      classifyCaptureLimitation({
        type: "failed_resource",
        affectedLayer: "evidence_capture",
        severity: request.classification === "analytics_tracking" ? "info" : "warning",
        explanation: `Network request failed during capture: ${request.url}`,
        evidenceRefIds: [request.id],
        recommendedNextLayer:
          request.classification === "analytics_tracking" ? "ai_reconstruction" : "manual_review",
      }),
    );
  }

  for (const request of artifact.network.blockedRequests) {
    limitations.push(
      classifyCaptureLimitation({
        type: "blocked_resource",
        affectedLayer: "evidence_capture",
        severity: request.classification === "analytics_tracking" ? "info" : "warning",
        explanation: `Network request was blocked during capture: ${request.url}`,
        evidenceRefIds: [request.id],
        recommendedNextLayer:
          request.classification === "analytics_tracking" ? "ai_reconstruction" : "manual_review",
      }),
    );
  }

  if (artifact.scriptRuntime.postRenderAddedNodes.length > 0) {
    limitations.push(
      classifyCaptureLimitation({
        type: "post_render_dom_mutation",
        affectedLayer: "ai_reconstruction",
        severity: "warning",
        explanation: "Runtime scripts added DOM nodes after initial render stabilization.",
        evidenceRefIds: artifact.scriptRuntime.postRenderAddedNodes.flatMap((node) => node.evidenceRefIds),
        recommendedNextLayer: "ai_reconstruction",
      }),
    );
  }

  if (artifact.scriptRuntime.duplicateInsertionSignals.length > 0) {
    limitations.push(
      classifyCaptureLimitation({
        type: "duplicate_runtime_insertion",
        affectedLayer: "ai_reconstruction",
        severity: "warning",
        explanation: "Runtime evidence indicates repeated insertion of similar DOM nodes.",
        evidenceRefIds: artifact.scriptRuntime.duplicateInsertionSignals.flatMap((signal) => signal.evidenceRefIds),
        recommendedNextLayer: "ai_reconstruction",
      }),
    );
  }

  if (artifact.scriptRuntime.lazyloadRuntimeDependencySignals.length > 0) {
    limitations.push(
      classifyCaptureLimitation({
        type: "lazy_loading_dependency",
        affectedLayer: "ai_reconstruction",
        severity: "warning",
        explanation: "Lazyload or hydration behavior was detected during browser capture.",
        evidenceRefIds: artifact.scriptRuntime.lazyloadRuntimeDependencySignals.flatMap(
          (signal) => signal.evidenceRefIds,
        ),
        recommendedNextLayer: "ai_reconstruction",
      }),
    );
  }

  return limitations;
}

export function isEvidenceCaptureReconstructionReady(artifact: EvidenceCaptureArtifact): boolean {
  if (artifact.status !== "available" && artifact.status !== "partial") return false;
  if (artifact.rendered.renderStatus !== "available" && artifact.rendered.renderStatus !== "partial") {
    return false;
  }
  if (!artifact.rendered.renderedDomRef || !hasText(artifact.rendered.renderedHtmlHash)) return false;
  if (!hasText(artifact.source.sourceUrl) || !hasText(artifact.source.routePath)) return false;

  return classifyEvidenceCaptureLimitations(artifact).every(
    (limitation) => limitation.severity !== "blocker",
  );
}

export function summarizeEvidenceCaptureArtifact(
  artifact: EvidenceCaptureArtifact,
): EvidenceCaptureSummary {
  const limitations = classifyEvidenceCaptureLimitations(artifact);
  const assetClassifications = uniqueAssetClassifications(artifact.network);

  return {
    sourceUrl: artifact.source.sourceUrl,
    finalUrl: artifact.source.finalUrl,
    routePath: artifact.source.routePath,
    captureProvider: artifact.source.captureProvider,
    status: artifact.status,
    isReconstructionReady: isEvidenceCaptureReconstructionReady(artifact),
    counts: {
      screenshots: artifact.rendered.screenshotRefs.length + (artifact.rendered.fullPageScreenshotRef ? 1 : 0),
      computedStyleSamples: artifact.computedStyle.computedStyleSampleRefs.length,
      layoutBoxes: artifact.layout.layoutBoxRefs.length,
      networkRequests: artifact.network.requestInventory.length,
      failedRequests: artifact.network.failedRequests.length,
      blockedRequests: artifact.network.blockedRequests.length,
      assetClassifications: assetClassifications.length,
      scripts: artifact.scriptRuntime.scriptInventory.length,
      images: artifact.media.imageInventory.length,
      missingImages: artifact.media.missingImages.length,
      mapWidgets: artifact.widgets.maps.length,
      forms: artifact.widgets.forms.length,
      fidelityLimitations: limitations.length,
      blockingLimitations: limitations.filter((limitation) => limitation.severity === "blocker").length,
    },
  };
}
