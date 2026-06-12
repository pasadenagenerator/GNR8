/**
 * Phase 7F-5 reconstruction input boundary contract.
 *
 * This file defines the maximum evidence handoff allowed from Evidence Capture
 * into future reconstruction systems. It is intentionally implementation-
 * neutral and contains pure contract helpers only. It does not execute
 * reconstruction, call AI systems, generate blocks, change capture behavior,
 * alter preview behavior, or mutate persistence.
 */

import type {
  ComputedStyleEvidence,
  EvidenceArtifactRef,
  EvidenceCaptureArtifact,
  KnownFidelityLimitation,
  LayoutEvidence,
  MediaEvidence,
  NetworkEvidence,
  RawInputEvidence,
  RenderedBrowserEvidence,
  RouteCaptureEvidence,
  ScriptRuntimeEvidence,
  SourceIdentityEvidence,
  WidgetEvidence,
} from "./importer-architecture-split-contract";

export const RECONSTRUCTION_INPUT_CONTRACT_VERSION = "7F-5" as const;

export type EvidenceFieldClassification = "REQUIRED" | "OPTIONAL" | "UNSUPPORTED";

export type ReconstructionReadinessLevel =
  | "NOT_READY"
  | "MINIMUM_READY"
  | "RECOMMENDED"
  | "HIGH_CONFIDENCE";

export type ReconstructionBlockerSeverity = "warning" | "blocker";

export type ReconstructionBlockerId =
  | "capture_unavailable"
  | "capture_failed"
  | "missing_source_url"
  | "missing_route_identity"
  | "missing_rendered_dom"
  | "render_failed"
  | "blocker_fidelity_limitation";

export type ReconstructionBlocker = {
  id: ReconstructionBlockerId;
  title: string;
  description: string;
  severity: ReconstructionBlockerSeverity;
  remediationHint: string;
};

export type EvidenceFieldClassificationEntry = {
  evidenceField: EvidenceCaptureFieldPath;
  classification: EvidenceFieldClassification;
  reason: string;
};

export type ReconstructionReadinessAssessment = {
  level: ReconstructionReadinessLevel;
  blockers: ReconstructionBlocker[];
  minimumEvidence: {
    hasSourceUrl: boolean;
    hasRouteIdentity: boolean;
    hasSuccessfulCaptureStatus: boolean;
    hasRenderedDom: boolean;
    hasRenderedHtmlHash: boolean;
    hasSuccessfulRenderStatus: boolean;
    hasNoBlockingLimitations: boolean;
  };
  optionalEvidence: {
    hasScreenshots: boolean;
    hasComputedStyles: boolean;
    hasLayoutEvidence: boolean;
    hasNetworkEvidence: boolean;
    hasMediaEvidence: boolean;
    hasWidgetEvidence: boolean;
    hasRuntimeObservation: boolean;
    hasNormalizedFidelityLimitations: boolean;
  };
};

export type ReconstructionConfidenceSignalKind =
  | "dom_completeness"
  | "asset_completeness"
  | "font_completeness"
  | "layout_completeness"
  | "widget_completeness"
  | "media_completeness"
  | "network_completeness"
  | "runtime_stability"
  | "visual_reference_completeness"
  | "fidelity_limitation_completeness";

export type ReconstructionConfidenceInputDefinition = {
  kind: ReconstructionConfidenceSignalKind;
  evidenceFields: readonly EvidenceCaptureFieldPath[];
  description: string;
  requiredFor: readonly ReconstructionReadinessLevel[];
};

export type ReconstructionInputArtifact = {
  kind: "reconstruction_input_artifact_v1";
  contractVersion: typeof RECONSTRUCTION_INPUT_CONTRACT_VERSION;
  source: Pick<
    SourceIdentityEvidence,
    "sourceUrl" | "finalUrl" | "routePath" | "canonicalUrl" | "capturedAt"
  > & {
    route: Pick<
      RouteCaptureEvidence,
      "discoveredRoutePath" | "sourceUrl" | "finalUrl" | "navigationSource" | "captureStatus"
    >;
  };
  requiredEvidence: {
    status: EvidenceCaptureArtifact["status"];
    renderedDomRef: RenderedBrowserEvidence["renderedDomRef"];
    renderedHtmlHash: RenderedBrowserEvidence["renderedHtmlHash"];
    renderStatus: RenderedBrowserEvidence["renderStatus"];
    routeCaptureStatus: RouteCaptureEvidence["captureStatus"];
  };
  optionalEvidence: {
    rawHtmlRef: RawInputEvidence["rawHtmlRef"];
    screenshots: RenderedBrowserEvidence["screenshotRefs"];
    fullPageScreenshotRef: EvidenceArtifactRef | null;
    computedStyle: ComputedStyleEvidence;
    layout: LayoutEvidence;
    network: NetworkEvidence;
    scriptRuntime: ScriptRuntimeEvidence;
    media: MediaEvidence;
    widgets: WidgetEvidence;
    fidelityLimitations: KnownFidelityLimitation[];
  };
  readiness: ReconstructionReadinessAssessment;
  confidenceInputs: readonly ReconstructionConfidenceInputDefinition[];
  unsupportedEvidenceFields: EvidenceCaptureFieldPath[];
};

export type ReconstructionCandidateSectionKind =
  | "navigation"
  | "hero"
  | "content_region"
  | "card_collection"
  | "blog_listing"
  | "gallery"
  | "form"
  | "map"
  | "footer"
  | "design_tokens"
  | "unknown";

export type ReconstructionCandidateSection = {
  id: string;
  kind: ReconstructionCandidateSectionKind;
  sourceEvidenceRefIds: string[];
  confidenceInputKinds: ReconstructionConfidenceSignalKind[];
  notes: string[];
};

export type ReconstructionCandidateArtifact = {
  kind: "reconstruction_candidate_artifact_v1";
  contractVersion: typeof RECONSTRUCTION_INPUT_CONTRACT_VERSION;
  sourceReconstructionInputId: string | null;
  readinessAtCreation: ReconstructionReadinessLevel;
  sections: ReconstructionCandidateSection[];
  designTokens: {
    sourceEvidenceRefIds: string[];
    colorTokenIds: string[];
    typographyTokenIds: string[];
    spacingTokenIds: string[];
    radiusTokenIds: string[];
    shadowTokenIds: string[];
  };
  limitations: KnownFidelityLimitation[];
  generation: {
    executed: false;
    implementation: null;
    vendor: null;
    model: null;
  };
};

export const EXPECTED_EVIDENCE_CAPTURE_FIELDS = [
  "kind",
  "architectureVersion",
  "status",
  "source.sourceUrl",
  "source.finalUrl",
  "source.routePath",
  "source.canonicalUrl",
  "source.captureProvider",
  "source.capturedAt",
  "source.captureRunId",
  "rawInputs.rawHtmlRef",
  "rawInputs.responseHeaders",
  "rawInputs.statusCode",
  "rawInputs.redirectChain",
  "rendered.renderedDomRef",
  "rendered.renderedHtmlHash",
  "rendered.screenshotRefs",
  "rendered.viewport",
  "rendered.fullPageScreenshotRef",
  "rendered.domNodeCount",
  "rendered.renderStatus",
  "rendered.renderFailureReason",
  "computedStyle.computedStyleSampleRefs",
  "computedStyle.designTokenCandidates",
  "computedStyle.fontsDetected",
  "computedStyle.fontSourcesLoaded",
  "computedStyle.missingFontSources",
  "computedStyle.colorCandidates",
  "computedStyle.spacingCandidates",
  "layout.layoutBoxRefs",
  "layout.viewportBreakpoints",
  "layout.aboveFoldRegions",
  "layout.repeatedRegions",
  "layout.stickyFixedElements",
  "layout.routeLevelStructuralHints",
  "network.requestInventory",
  "network.responseInventory",
  "network.failedRequests",
  "network.blockedRequests",
  "network.assetClassifications",
  "scriptRuntime.scriptInventory",
  "scriptRuntime.inlineScriptSignatures",
  "scriptRuntime.consoleErrorsWarnings",
  "scriptRuntime.domMutationSummary",
  "scriptRuntime.postRenderAddedNodes",
  "scriptRuntime.duplicateInsertionSignals",
  "scriptRuntime.lazyloadRuntimeDependencySignals",
  "media.imageInventory",
  "media.missingImages",
  "media.backgroundImageRefs",
  "media.videoMediaRefs",
  "widgets.maps",
  "widgets.galleriesSlidersLightboxes",
  "widgets.forms",
  "widgets.accessibilityWidgets",
  "widgets.cookieBanners",
  "widgets.chatSupportWidgets",
  "route.discoveredRoutePath",
  "route.sourceUrl",
  "route.finalUrl",
  "route.routePriority",
  "route.navigationSource",
  "route.rawFilePath",
  "route.captureStatus",
  "route.knownFidelityLimitations",
  "fidelityLimitations",
] as const;

export type EvidenceCaptureFieldPath = (typeof EXPECTED_EVIDENCE_CAPTURE_FIELDS)[number];

export const EVIDENCE_FIELD_CLASSIFICATION_MATRIX = [
  { evidenceField: "kind", classification: "UNSUPPORTED", reason: "Artifact discriminator is contract metadata, not reconstruction evidence." },
  { evidenceField: "architectureVersion", classification: "UNSUPPORTED", reason: "Architecture version is provenance metadata and must not influence reconstructed output." },
  { evidenceField: "status", classification: "REQUIRED", reason: "Capture status gates whether any captured evidence is trustworthy enough to hand off." },
  { evidenceField: "source.sourceUrl", classification: "REQUIRED", reason: "The original source URL anchors route identity, attribution, and remediation." },
  { evidenceField: "source.finalUrl", classification: "OPTIONAL", reason: "Final URL improves redirect understanding but source URL plus route identity can start reconstruction." },
  { evidenceField: "source.routePath", classification: "REQUIRED", reason: "A stable route identity is required before route-level reconstruction may begin." },
  { evidenceField: "source.canonicalUrl", classification: "OPTIONAL", reason: "Canonical URL improves route deduplication but is not required for a single route candidate." },
  { evidenceField: "source.captureProvider", classification: "UNSUPPORTED", reason: "Provider identity may diagnose capture but must not shape reconstructed content or layout." },
  { evidenceField: "source.capturedAt", classification: "OPTIONAL", reason: "Timestamp is useful provenance for stale evidence review, not content generation." },
  { evidenceField: "source.captureRunId", classification: "UNSUPPORTED", reason: "Run identity is operational metadata and must not be reconstruction evidence." },
  { evidenceField: "rawInputs.rawHtmlRef", classification: "OPTIONAL", reason: "Raw HTML can recover source text and asset references, but rendered DOM is the reconstruction baseline." },
  { evidenceField: "rawInputs.responseHeaders", classification: "UNSUPPORTED", reason: "HTTP headers may contain operational/security metadata and must not be used as page evidence." },
  { evidenceField: "rawInputs.statusCode", classification: "OPTIONAL", reason: "HTTP status helps diagnose capture quality but is not enough to reconstruct structure." },
  { evidenceField: "rawInputs.redirectChain", classification: "OPTIONAL", reason: "Redirect evidence improves route provenance and canonicalization." },
  { evidenceField: "rendered.renderedDomRef", classification: "REQUIRED", reason: "Browser-observed DOM is the minimum structural substrate for reconstruction." },
  { evidenceField: "rendered.renderedHtmlHash", classification: "REQUIRED", reason: "Rendered HTML hash anchors integrity of the DOM evidence being reconstructed." },
  { evidenceField: "rendered.screenshotRefs", classification: "OPTIONAL", reason: "Screenshots improve visual fidelity and review but are not the minimum structural input." },
  { evidenceField: "rendered.viewport", classification: "OPTIONAL", reason: "Viewport context improves interpretation of screenshots and layout samples." },
  { evidenceField: "rendered.fullPageScreenshotRef", classification: "OPTIONAL", reason: "Full-page screenshots improve visual completeness and section ordering confidence." },
  { evidenceField: "rendered.domNodeCount", classification: "OPTIONAL", reason: "Node count helps detect incomplete DOM capture but is not independently reconstructive." },
  { evidenceField: "rendered.renderStatus", classification: "REQUIRED", reason: "Render status gates whether rendered DOM evidence can be consumed." },
  { evidenceField: "rendered.renderFailureReason", classification: "OPTIONAL", reason: "Failure reason guides remediation when readiness is blocked." },
  { evidenceField: "computedStyle.computedStyleSampleRefs", classification: "OPTIONAL", reason: "Computed styles improve visual fidelity but are not required for minimum structure." },
  { evidenceField: "computedStyle.designTokenCandidates", classification: "OPTIONAL", reason: "Token candidates improve design translation but future reconstruction must validate them." },
  { evidenceField: "computedStyle.fontsDetected", classification: "OPTIONAL", reason: "Detected fonts improve typography fidelity." },
  { evidenceField: "computedStyle.fontSourcesLoaded", classification: "OPTIONAL", reason: "Loaded font sources improve confidence that typography evidence is complete." },
  { evidenceField: "computedStyle.missingFontSources", classification: "OPTIONAL", reason: "Missing fonts are quality signals and may lower confidence without blocking minimum readiness." },
  { evidenceField: "computedStyle.colorCandidates", classification: "OPTIONAL", reason: "Color candidates improve visual reconstruction and token extraction." },
  { evidenceField: "computedStyle.spacingCandidates", classification: "OPTIONAL", reason: "Spacing candidates improve layout fidelity and rhythm inference." },
  { evidenceField: "layout.layoutBoxRefs", classification: "OPTIONAL", reason: "Bounding boxes are high-value layout evidence but not required for experimental reconstruction." },
  { evidenceField: "layout.viewportBreakpoints", classification: "OPTIONAL", reason: "Breakpoint evidence improves responsive confidence." },
  { evidenceField: "layout.aboveFoldRegions", classification: "OPTIONAL", reason: "Above-fold regions improve hero and primary content placement." },
  { evidenceField: "layout.repeatedRegions", classification: "OPTIONAL", reason: "Repeated regions improve card/list/gallery reconstruction confidence." },
  { evidenceField: "layout.stickyFixedElements", classification: "OPTIONAL", reason: "Sticky and fixed elements improve navigation and overlay fidelity." },
  { evidenceField: "layout.routeLevelStructuralHints", classification: "OPTIONAL", reason: "Structural hints improve section boundary confidence." },
  { evidenceField: "network.requestInventory", classification: "OPTIONAL", reason: "Request inventory improves asset and widget dependency understanding." },
  { evidenceField: "network.responseInventory", classification: "OPTIONAL", reason: "Response inventory improves asset availability and MIME confidence." },
  { evidenceField: "network.failedRequests", classification: "OPTIONAL", reason: "Failed requests identify missing dependencies and confidence risks." },
  { evidenceField: "network.blockedRequests", classification: "OPTIONAL", reason: "Blocked requests identify capture limitations and third-party gaps." },
  { evidenceField: "network.assetClassifications", classification: "OPTIONAL", reason: "Asset classifications improve evidence grouping and completeness checks." },
  { evidenceField: "scriptRuntime.scriptInventory", classification: "OPTIONAL", reason: "Script inventory identifies runtime dependencies without allowing script execution in reconstruction." },
  { evidenceField: "scriptRuntime.inlineScriptSignatures", classification: "UNSUPPORTED", reason: "Inline script hashes are policy/security evidence and must not become reconstruction content." },
  { evidenceField: "scriptRuntime.consoleErrorsWarnings", classification: "OPTIONAL", reason: "Console evidence can explain incomplete capture and confidence loss." },
  { evidenceField: "scriptRuntime.domMutationSummary", classification: "OPTIONAL", reason: "Mutation summary identifies runtime instability without replaying runtime behavior." },
  { evidenceField: "scriptRuntime.postRenderAddedNodes", classification: "OPTIONAL", reason: "Post-render node evidence helps detect late content and duplicate insertions." },
  { evidenceField: "scriptRuntime.duplicateInsertionSignals", classification: "OPTIONAL", reason: "Duplicate insertion signals warn against over-reconstructing repeated runtime content." },
  { evidenceField: "scriptRuntime.lazyloadRuntimeDependencySignals", classification: "OPTIONAL", reason: "Lazy-load signals explain missing media or late sections." },
  { evidenceField: "media.imageInventory", classification: "OPTIONAL", reason: "Image inventory improves media fidelity and asset completeness." },
  { evidenceField: "media.missingImages", classification: "OPTIONAL", reason: "Missing image evidence lowers confidence and guides capture remediation." },
  { evidenceField: "media.backgroundImageRefs", classification: "OPTIONAL", reason: "Background image refs improve visual and hero fidelity." },
  { evidenceField: "media.videoMediaRefs", classification: "OPTIONAL", reason: "Video refs identify media sections and embeds." },
  { evidenceField: "widgets.maps", classification: "OPTIONAL", reason: "Map evidence can inform a reconstruction substitute without replaying the source widget." },
  { evidenceField: "widgets.galleriesSlidersLightboxes", classification: "OPTIONAL", reason: "Gallery evidence improves media collection reconstruction." },
  { evidenceField: "widgets.forms", classification: "OPTIONAL", reason: "Form evidence improves form section reconstruction and review." },
  { evidenceField: "widgets.accessibilityWidgets", classification: "OPTIONAL", reason: "Accessibility widget evidence explains overlays but should remain reviewable evidence." },
  { evidenceField: "widgets.cookieBanners", classification: "OPTIONAL", reason: "Cookie banner evidence helps distinguish compliance overlays from core page content." },
  { evidenceField: "widgets.chatSupportWidgets", classification: "OPTIONAL", reason: "Chat widget evidence helps distinguish support overlays from core page content." },
  { evidenceField: "route.discoveredRoutePath", classification: "REQUIRED", reason: "Per-route discovered identity is required when source routePath is absent or ambiguous." },
  { evidenceField: "route.sourceUrl", classification: "REQUIRED", reason: "Per-route source URL anchors route evidence and remediation." },
  { evidenceField: "route.finalUrl", classification: "OPTIONAL", reason: "Per-route final URL improves redirect and alias handling." },
  { evidenceField: "route.routePriority", classification: "UNSUPPORTED", reason: "Crawl priority is acquisition metadata and must not shape reconstructed output." },
  { evidenceField: "route.navigationSource", classification: "OPTIONAL", reason: "Navigation source improves route provenance and confidence." },
  { evidenceField: "route.rawFilePath", classification: "UNSUPPORTED", reason: "Local raw file paths are storage implementation details." },
  { evidenceField: "route.captureStatus", classification: "REQUIRED", reason: "Per-route capture status gates route-level reconstruction readiness." },
  { evidenceField: "route.knownFidelityLimitations", classification: "OPTIONAL", reason: "Normalized route limitations guide readiness, remediation, and confidence." },
  { evidenceField: "fidelityLimitations", classification: "OPTIONAL", reason: "Normalized artifact limitations guide readiness, remediation, and confidence." },
] as const satisfies readonly EvidenceFieldClassificationEntry[];

export const RECONSTRUCTION_CONFIDENCE_INPUTS = [
  {
    kind: "dom_completeness",
    evidenceFields: ["rendered.renderedDomRef", "rendered.renderedHtmlHash", "rendered.domNodeCount"],
    description: "Completeness and integrity of the browser-observed DOM.",
    requiredFor: ["MINIMUM_READY", "RECOMMENDED", "HIGH_CONFIDENCE"],
  },
  {
    kind: "asset_completeness",
    evidenceFields: ["network.requestInventory", "network.responseInventory", "network.failedRequests", "network.blockedRequests"],
    description: "Whether required source assets were observed, fetched, failed, or blocked.",
    requiredFor: ["RECOMMENDED", "HIGH_CONFIDENCE"],
  },
  {
    kind: "font_completeness",
    evidenceFields: ["computedStyle.fontsDetected", "computedStyle.fontSourcesLoaded", "computedStyle.missingFontSources"],
    description: "Whether typography evidence includes detected and loaded font sources.",
    requiredFor: ["HIGH_CONFIDENCE"],
  },
  {
    kind: "layout_completeness",
    evidenceFields: ["layout.layoutBoxRefs", "layout.aboveFoldRegions", "layout.repeatedRegions", "layout.viewportBreakpoints"],
    description: "Whether geometry evidence is sufficient for responsive structural reconstruction.",
    requiredFor: ["RECOMMENDED", "HIGH_CONFIDENCE"],
  },
  {
    kind: "widget_completeness",
    evidenceFields: ["widgets.maps", "widgets.galleriesSlidersLightboxes", "widgets.forms", "widgets.cookieBanners", "widgets.chatSupportWidgets"],
    description: "Whether non-static widgets are inventoried as evidence instead of replayed.",
    requiredFor: ["HIGH_CONFIDENCE"],
  },
  {
    kind: "media_completeness",
    evidenceFields: ["media.imageInventory", "media.missingImages", "media.backgroundImageRefs", "media.videoMediaRefs"],
    description: "Whether visible media and missing media are both represented.",
    requiredFor: ["RECOMMENDED", "HIGH_CONFIDENCE"],
  },
  {
    kind: "network_completeness",
    evidenceFields: ["network.requestInventory", "network.responseInventory", "network.assetClassifications"],
    description: "Whether browser-level network inventory can explain dependencies.",
    requiredFor: ["RECOMMENDED", "HIGH_CONFIDENCE"],
  },
  {
    kind: "runtime_stability",
    evidenceFields: ["scriptRuntime.domMutationSummary", "scriptRuntime.postRenderAddedNodes", "scriptRuntime.duplicateInsertionSignals"],
    description: "Whether post-render runtime behavior appears stable enough for deterministic reconstruction.",
    requiredFor: ["HIGH_CONFIDENCE"],
  },
  {
    kind: "visual_reference_completeness",
    evidenceFields: ["rendered.screenshotRefs", "rendered.fullPageScreenshotRef", "rendered.viewport"],
    description: "Whether screenshots and viewport context are sufficient for visual review.",
    requiredFor: ["RECOMMENDED", "HIGH_CONFIDENCE"],
  },
  {
    kind: "fidelity_limitation_completeness",
    evidenceFields: ["route.knownFidelityLimitations", "fidelityLimitations"],
    description: "Whether limitations are normalized enough to gate reconstruction deterministically.",
    requiredFor: ["MINIMUM_READY", "RECOMMENDED", "HIGH_CONFIDENCE"],
  },
] as const satisfies readonly ReconstructionConfidenceInputDefinition[];

function hasText(value: string | null | undefined): boolean {
  return Boolean(String(value ?? "").trim());
}

function isSuccessfulEvidenceStatus(status: EvidenceCaptureArtifact["status"]): boolean {
  return status === "available" || status === "partial";
}

function isSuccessfulRenderStatus(status: RenderedBrowserEvidence["renderStatus"]): boolean {
  return status === "available" || status === "partial";
}

export function getEvidenceFieldsByClassification(
  classification: EvidenceFieldClassification,
): EvidenceCaptureFieldPath[] {
  return EVIDENCE_FIELD_CLASSIFICATION_MATRIX
    .filter((entry) => entry.classification === classification)
    .map((entry) => entry.evidenceField);
}

export function validateEvidenceFieldClassificationMatrix(): {
  valid: boolean;
  missingFields: EvidenceCaptureFieldPath[];
  duplicateFields: EvidenceCaptureFieldPath[];
} {
  const seen = new Set<EvidenceCaptureFieldPath>();
  const duplicateFields = new Set<EvidenceCaptureFieldPath>();

  for (const entry of EVIDENCE_FIELD_CLASSIFICATION_MATRIX) {
    if (seen.has(entry.evidenceField)) {
      duplicateFields.add(entry.evidenceField);
    }
    seen.add(entry.evidenceField);
  }

  const missingFields = EXPECTED_EVIDENCE_CAPTURE_FIELDS.filter((field) => !seen.has(field));

  return {
    valid: missingFields.length === 0 && duplicateFields.size === 0,
    missingFields,
    duplicateFields: Array.from(duplicateFields),
  };
}

export function classifyReconstructionBlockers(
  artifact: EvidenceCaptureArtifact,
): ReconstructionBlocker[] {
  const blockers: ReconstructionBlocker[] = [];
  const hasRouteIdentity =
    hasText(artifact.source.routePath) || hasText(artifact.route.discoveredRoutePath);

  if (artifact.status === "failed") {
    blockers.push({
      id: "capture_failed",
      title: "Capture failed",
      description: "The evidence artifact reports a failed capture status.",
      severity: "blocker",
      remediationHint: "Retry or expand Evidence Capture until the route has available or partial evidence.",
    });
  } else if (!isSuccessfulEvidenceStatus(artifact.status)) {
    blockers.push({
      id: "capture_unavailable",
      title: "Capture unavailable",
      description: "The evidence artifact is not available for reconstruction.",
      severity: "blocker",
      remediationHint: "Persist a route-level EvidenceCaptureArtifact with available or partial status.",
    });
  }

  if (!hasText(artifact.source.sourceUrl) && !hasText(artifact.route.sourceUrl)) {
    blockers.push({
      id: "missing_source_url",
      title: "Missing source URL",
      description: "Reconstruction requires a source URL for attribution and remediation.",
      severity: "blocker",
      remediationHint: "Normalize source.sourceUrl and route.sourceUrl into the evidence artifact.",
    });
  }

  if (!hasRouteIdentity) {
    blockers.push({
      id: "missing_route_identity",
      title: "Missing route identity",
      description: "Reconstruction requires a route path or discovered route path.",
      severity: "blocker",
      remediationHint: "Normalize source.routePath or route.discoveredRoutePath before handoff.",
    });
  }

  if (
    artifact.route.captureStatus === "failed" ||
    artifact.rendered.renderStatus === "failed"
  ) {
    blockers.push({
      id: "render_failed",
      title: "Rendered capture failed",
      description: "The route or rendered browser evidence reports a failed render/capture state.",
      severity: "blocker",
      remediationHint: "Resolve capture failure before reconstruction handoff.",
    });
  }

  if (!isSuccessfulRenderStatus(artifact.rendered.renderStatus)) {
    blockers.push({
      id: "missing_rendered_dom",
      title: "Rendered DOM unavailable",
      description: "Rendered browser evidence is unavailable or has not started.",
      severity: "blocker",
      remediationHint: "Capture and persist browser-observed DOM evidence with an available or partial render status.",
    });
  } else if (!artifact.rendered.renderedDomRef || !hasText(artifact.rendered.renderedHtmlHash)) {
    blockers.push({
      id: "missing_rendered_dom",
      title: "Missing rendered DOM",
      description: "Rendered DOM ref and rendered HTML hash are required minimum reconstruction inputs.",
      severity: "blocker",
      remediationHint: "Persist rendered.renderedDomRef and rendered.renderedHtmlHash from Evidence Capture.",
    });
  }

  const blockingLimitations = [
    ...artifact.route.knownFidelityLimitations,
    ...artifact.fidelityLimitations,
  ].filter((limitation) => limitation.severity === "blocker");

  if (blockingLimitations.length > 0) {
    blockers.push({
      id: "blocker_fidelity_limitation",
      title: "Blocking fidelity limitation",
      description: "One or more normalized fidelity limitations explicitly block reconstruction.",
      severity: "blocker",
      remediationHint: "Resolve blocker fidelity limitations or route the page to manual review.",
    });
  }

  return blockers;
}

export function evaluateReconstructionReadiness(
  artifact: EvidenceCaptureArtifact,
): ReconstructionReadinessAssessment {
  const blockers = classifyReconstructionBlockers(artifact);
  const hasScreenshots =
    artifact.rendered.screenshotRefs.length > 0 || Boolean(artifact.rendered.fullPageScreenshotRef);
  const hasComputedStyles =
    artifact.computedStyle.computedStyleSampleRefs.length > 0 ||
    artifact.computedStyle.designTokenCandidates.length > 0 ||
    artifact.computedStyle.colorCandidates.length > 0 ||
    artifact.computedStyle.fontsDetected.length > 0;
  const hasLayoutEvidence =
    artifact.layout.layoutBoxRefs.length > 0 ||
    artifact.layout.aboveFoldRegions.length > 0 ||
    artifact.layout.repeatedRegions.length > 0 ||
    artifact.layout.routeLevelStructuralHints.length > 0;
  const hasNetworkEvidence =
    artifact.network.requestInventory.length > 0 ||
    artifact.network.responseInventory.length > 0 ||
    artifact.network.failedRequests.length > 0 ||
    artifact.network.blockedRequests.length > 0;
  const hasMediaEvidence =
    artifact.media.imageInventory.length > 0 ||
    artifact.media.backgroundImageRefs.length > 0 ||
    artifact.media.videoMediaRefs.length > 0 ||
    artifact.media.missingImages.length > 0;
  const hasWidgetEvidence =
    artifact.widgets.maps.length > 0 ||
    artifact.widgets.galleriesSlidersLightboxes.length > 0 ||
    artifact.widgets.forms.length > 0 ||
    artifact.widgets.accessibilityWidgets.length > 0 ||
    artifact.widgets.cookieBanners.length > 0 ||
    artifact.widgets.chatSupportWidgets.length > 0;
  const hasRuntimeObservation =
    Boolean(artifact.scriptRuntime.domMutationSummary) ||
    artifact.scriptRuntime.consoleErrorsWarnings.length > 0 ||
    artifact.scriptRuntime.postRenderAddedNodes.length > 0 ||
    artifact.scriptRuntime.duplicateInsertionSignals.length > 0 ||
    artifact.scriptRuntime.lazyloadRuntimeDependencySignals.length > 0;
  const hasNormalizedFidelityLimitations =
    artifact.route.knownFidelityLimitations.length > 0 || artifact.fidelityLimitations.length > 0;

  const minimumEvidence = {
    hasSourceUrl: hasText(artifact.source.sourceUrl) || hasText(artifact.route.sourceUrl),
    hasRouteIdentity: hasText(artifact.source.routePath) || hasText(artifact.route.discoveredRoutePath),
    hasSuccessfulCaptureStatus: isSuccessfulEvidenceStatus(artifact.status),
    hasRenderedDom: Boolean(artifact.rendered.renderedDomRef),
    hasRenderedHtmlHash: hasText(artifact.rendered.renderedHtmlHash),
    hasSuccessfulRenderStatus: isSuccessfulRenderStatus(artifact.rendered.renderStatus),
    hasNoBlockingLimitations: blockers.every((blocker) => blocker.id !== "blocker_fidelity_limitation"),
  };

  const optionalEvidence = {
    hasScreenshots,
    hasComputedStyles,
    hasLayoutEvidence,
    hasNetworkEvidence,
    hasMediaEvidence,
    hasWidgetEvidence,
    hasRuntimeObservation,
    hasNormalizedFidelityLimitations,
  };

  let level: ReconstructionReadinessLevel = "NOT_READY";

  if (blockers.length === 0) {
    level = "MINIMUM_READY";

    const hasRecommendedEvidence =
      hasScreenshots && hasComputedStyles && hasLayoutEvidence && hasNetworkEvidence && hasMediaEvidence;

    if (hasRecommendedEvidence) {
      level = "RECOMMENDED";
    }

    const nonAnalyticsNetworkFailures = [
      ...artifact.network.failedRequests,
      ...artifact.network.blockedRequests,
    ].filter((request) => request.classification !== "analytics_tracking");
    const hasHighConfidenceEvidence =
      hasRecommendedEvidence &&
      Boolean(artifact.rendered.fullPageScreenshotRef) &&
      artifact.layout.viewportBreakpoints.length >= 2 &&
      artifact.layout.aboveFoldRegions.length > 0 &&
      artifact.network.responseInventory.length > 0 &&
      artifact.computedStyle.missingFontSources.length === 0 &&
      artifact.media.missingImages.length === 0 &&
      nonAnalyticsNetworkFailures.length === 0 &&
      (hasWidgetEvidence || artifact.layout.routeLevelStructuralHints.every((hint) => hint.hint !== "map" && hint.hint !== "form" && hint.hint !== "gallery"));

    if (hasHighConfidenceEvidence) {
      level = "HIGH_CONFIDENCE";
    }
  }

  return {
    level,
    blockers,
    minimumEvidence,
    optionalEvidence,
  };
}

export function validateReconstructionInputArtifact(input: ReconstructionInputArtifact): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const unsupported = new Set(getEvidenceFieldsByClassification("UNSUPPORTED"));

  if (input.kind !== "reconstruction_input_artifact_v1") {
    errors.push("Invalid reconstruction input artifact kind.");
  }

  if (input.contractVersion !== RECONSTRUCTION_INPUT_CONTRACT_VERSION) {
    errors.push("Invalid reconstruction input contract version.");
  }

  for (const field of input.unsupportedEvidenceFields) {
    if (!unsupported.has(field)) {
      errors.push(`Unsupported evidence field list includes a consumable field: ${field}.`);
    }
  }

  if (input.readiness.level !== "NOT_READY" && input.readiness.blockers.length > 0) {
    errors.push("Ready reconstruction input cannot contain blocking readiness blockers.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
