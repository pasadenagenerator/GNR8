/**
 * Phase 7F-9 reconstruction readiness re-evaluation.
 *
 * Pure evaluation helpers for comparing baseline Evidence Capture artifacts
 * against Phase 7F-8 enriched evidence. This module does not capture new
 * evidence, render previews, execute reconstruction, generate content, mutate
 * persistence, or change importer/provider behavior.
 */

import type {
  ComputedStyleEvidence,
  EvidenceArtifactRef,
  EvidenceCaptureArtifact,
  EvidenceCaptureStatus,
  KnownFidelityLimitation,
  LayoutEvidence,
  MediaEvidence,
  NetworkEvidence,
  RenderStatus,
  ScreenshotEvidenceRef,
  ScriptRuntimeEvidence,
  WidgetEvidence,
} from "./importer-architecture-split-contract";
import {
  type ReconstructionBlocker,
  type ReconstructionReadinessLevel,
  evaluateReconstructionReadiness,
} from "./reconstruction-input-contract";

export type EvidenceCaptureReadinessRequiredField =
  | "evidenceArtifactStatus"
  | "sourceUrl"
  | "routeIdentity"
  | "renderedDomRef"
  | "renderedHtmlHash"
  | "renderStatus"
  | "routeCaptureStatus"
  | "noBlockerFidelityLimitations";

export type EvidenceCaptureReadinessOptionalEvidence =
  | "rawHtmlRef"
  | "screenshots"
  | "fullPageScreenshotRef"
  | "computedStyles"
  | "fonts"
  | "layout"
  | "network"
  | "scriptRuntime"
  | "media"
  | "widgets"
  | "fidelityLimitations";

export type EvidenceCaptureReadinessEnrichment = {
  status?: EvidenceCaptureStatus;
  sourceUrl?: string | null;
  routePath?: string | null;
  routeIdentity?: string | null;
  renderedDomRef?: EvidenceArtifactRef | null;
  renderedHtmlHash?: string | null;
  renderStatus?: RenderStatus;
  routeCaptureStatus?: EvidenceCaptureStatus;
  rawHtmlRef?: EvidenceArtifactRef | null;
  screenshots?: ScreenshotEvidenceRef[];
  fullPageScreenshotRef?: EvidenceArtifactRef | null;
  computedStyle?: Partial<ComputedStyleEvidence>;
  layout?: Partial<LayoutEvidence>;
  network?: Partial<NetworkEvidence>;
  scriptRuntime?: Partial<ScriptRuntimeEvidence>;
  media?: Partial<MediaEvidence>;
  widgets?: Partial<WidgetEvidence>;
  fidelityLimitations?: KnownFidelityLimitation[];
  routeKnownFidelityLimitations?: KnownFidelityLimitation[];
};

export type EvidenceCaptureReconstructionReadinessEvaluation = {
  readinessLevel: ReconstructionReadinessLevel;
  blockers: ReconstructionBlocker[];
  requiredFieldsPresent: EvidenceCaptureReadinessRequiredField[];
  requiredFieldsMissing: EvidenceCaptureReadinessRequiredField[];
  optionalEvidencePresent: EvidenceCaptureReadinessOptionalEvidence[];
  optionalEvidenceMissing: EvidenceCaptureReadinessOptionalEvidence[];
  readinessExplanation: string;
};

export type EvidenceCaptureReconstructionReadinessComparison = {
  beforeReadiness: EvidenceCaptureReconstructionReadinessEvaluation;
  afterReadiness: EvidenceCaptureReconstructionReadinessEvaluation;
  blockersResolved: ReconstructionBlocker[];
  blockersRemaining: ReconstructionBlocker[];
  newOptionalEvidenceAvailable: EvidenceCaptureReadinessOptionalEvidence[];
  minimumReadyReached: boolean;
};

export type EvidenceCaptureReconstructionReadinessSummary = {
  kind: "evidence_capture_reconstruction_readiness_summary_v1";
  readinessLevel: ReconstructionReadinessLevel;
  minimumReadyReached: boolean;
  blockerCount: number;
  blockerIds: ReconstructionBlocker["id"][];
  requiredFieldsPresent: EvidenceCaptureReadinessRequiredField[];
  requiredFieldsMissing: EvidenceCaptureReadinessRequiredField[];
  optionalEvidencePresent: EvidenceCaptureReadinessOptionalEvidence[];
  optionalEvidenceMissing: EvidenceCaptureReadinessOptionalEvidence[];
  explanation: string;
};

const REQUIRED_FIELD_ORDER: EvidenceCaptureReadinessRequiredField[] = [
  "evidenceArtifactStatus",
  "sourceUrl",
  "routeIdentity",
  "renderedDomRef",
  "renderedHtmlHash",
  "renderStatus",
  "routeCaptureStatus",
  "noBlockerFidelityLimitations",
];

const OPTIONAL_EVIDENCE_ORDER: EvidenceCaptureReadinessOptionalEvidence[] = [
  "rawHtmlRef",
  "screenshots",
  "fullPageScreenshotRef",
  "computedStyles",
  "fonts",
  "layout",
  "network",
  "scriptRuntime",
  "media",
  "widgets",
  "fidelityLimitations",
];

function hasText(value: string | null | undefined): boolean {
  return Boolean(String(value ?? "").trim());
}

function hasRef(value: { uri: string | null } | null | undefined): boolean {
  return Boolean(value && hasText(value.uri));
}

function isSuccessfulCaptureStatus(status: EvidenceCaptureStatus): boolean {
  return status === "available" || status === "partial";
}

function isSuccessfulRenderStatus(status: RenderStatus): boolean {
  return status === "available" || status === "partial";
}

function splitOrderedPresence<T extends string>(
  order: readonly T[],
  presence: Record<T, boolean>,
): { present: T[]; missing: T[] } {
  return {
    present: order.filter((field) => presence[field]),
    missing: order.filter((field) => !presence[field]),
  };
}

function applyEnrichment(
  artifact: EvidenceCaptureArtifact,
  enrichment?: EvidenceCaptureReadinessEnrichment,
): EvidenceCaptureArtifact {
  const next = structuredClone(artifact) as EvidenceCaptureArtifact;

  if (!enrichment) return next;

  if (enrichment.status) next.status = enrichment.status;
  if (enrichment.sourceUrl !== undefined) {
    const sourceUrl = String(enrichment.sourceUrl ?? "").trim();
    next.source.sourceUrl = sourceUrl;
    next.route.sourceUrl = sourceUrl;
  }
  if (enrichment.routePath !== undefined) {
    const routePath = String(enrichment.routePath ?? "").trim();
    next.source.routePath = routePath;
    next.route.discoveredRoutePath = routePath;
  }
  if (enrichment.routeIdentity !== undefined) {
    const routeIdentity = String(enrichment.routeIdentity ?? "").trim();
    next.source.routeIdentity = routeIdentity;
    next.route.routeIdentity = routeIdentity;
    if (!hasText(next.source.routePath)) next.source.routePath = routeIdentity;
    if (!hasText(next.route.discoveredRoutePath)) next.route.discoveredRoutePath = routeIdentity;
  }
  if (enrichment.renderedDomRef !== undefined) next.rendered.renderedDomRef = enrichment.renderedDomRef;
  if (enrichment.renderedHtmlHash !== undefined) next.rendered.renderedHtmlHash = enrichment.renderedHtmlHash;
  if (enrichment.renderStatus) next.rendered.renderStatus = enrichment.renderStatus;
  if (enrichment.routeCaptureStatus) next.route.captureStatus = enrichment.routeCaptureStatus;
  if (enrichment.rawHtmlRef !== undefined) next.rawInputs.rawHtmlRef = enrichment.rawHtmlRef;
  if (enrichment.screenshots) next.rendered.screenshotRefs = enrichment.screenshots;
  if (enrichment.fullPageScreenshotRef !== undefined) {
    next.rendered.fullPageScreenshotRef = enrichment.fullPageScreenshotRef;
  }
  if (enrichment.computedStyle) next.computedStyle = { ...next.computedStyle, ...enrichment.computedStyle };
  if (enrichment.layout) next.layout = { ...next.layout, ...enrichment.layout };
  if (enrichment.network) next.network = { ...next.network, ...enrichment.network };
  if (enrichment.scriptRuntime) next.scriptRuntime = { ...next.scriptRuntime, ...enrichment.scriptRuntime };
  if (enrichment.media) next.media = { ...next.media, ...enrichment.media };
  if (enrichment.widgets) next.widgets = { ...next.widgets, ...enrichment.widgets };
  if (enrichment.fidelityLimitations) next.fidelityLimitations = enrichment.fidelityLimitations;
  if (enrichment.routeKnownFidelityLimitations) {
    next.route.knownFidelityLimitations = enrichment.routeKnownFidelityLimitations;
  }

  return next;
}

function requiredFieldPresence(
  artifact: EvidenceCaptureArtifact,
  blockers: ReconstructionBlocker[],
): Record<EvidenceCaptureReadinessRequiredField, boolean> {
  const hasRouteIdentity =
    hasText(artifact.source.routeIdentity) ||
    hasText(artifact.route.routeIdentity) ||
    hasText(artifact.source.routePath) ||
    hasText(artifact.route.discoveredRoutePath);

  return {
    evidenceArtifactStatus: isSuccessfulCaptureStatus(artifact.status),
    sourceUrl: hasText(artifact.source.sourceUrl) || hasText(artifact.route.sourceUrl),
    routeIdentity: hasRouteIdentity,
    renderedDomRef: hasRef(artifact.rendered.renderedDomRef),
    renderedHtmlHash: hasText(artifact.rendered.renderedHtmlHash),
    renderStatus: isSuccessfulRenderStatus(artifact.rendered.renderStatus),
    routeCaptureStatus: isSuccessfulCaptureStatus(artifact.route.captureStatus),
    noBlockerFidelityLimitations: blockers.every((blocker) => blocker.id !== "blocker_fidelity_limitation"),
  };
}

function optionalEvidencePresence(
  artifact: EvidenceCaptureArtifact,
): Record<EvidenceCaptureReadinessOptionalEvidence, boolean> {
  return {
    rawHtmlRef: hasRef(artifact.rawInputs.rawHtmlRef),
    screenshots: artifact.rendered.screenshotRefs.length > 0,
    fullPageScreenshotRef: hasRef(artifact.rendered.fullPageScreenshotRef),
    computedStyles:
      artifact.computedStyle.computedStyleSampleRefs.length > 0 ||
      artifact.computedStyle.designTokenCandidates.length > 0 ||
      artifact.computedStyle.colorCandidates.length > 0 ||
      artifact.computedStyle.spacingCandidates.length > 0,
    fonts:
      artifact.computedStyle.fontsDetected.length > 0 ||
      artifact.computedStyle.fontSourcesLoaded.length > 0 ||
      artifact.computedStyle.missingFontSources.length > 0,
    layout:
      artifact.layout.layoutBoxRefs.length > 0 ||
      artifact.layout.viewportBreakpoints.length > 0 ||
      artifact.layout.aboveFoldRegions.length > 0 ||
      artifact.layout.repeatedRegions.length > 0 ||
      artifact.layout.stickyFixedElements.length > 0 ||
      artifact.layout.routeLevelStructuralHints.length > 0,
    network:
      artifact.network.requestInventory.length > 0 ||
      artifact.network.responseInventory.length > 0 ||
      artifact.network.failedRequests.length > 0 ||
      artifact.network.blockedRequests.length > 0 ||
      artifact.network.assetClassifications.length > 0,
    scriptRuntime:
      artifact.scriptRuntime.scriptInventory.length > 0 ||
      artifact.scriptRuntime.consoleErrorsWarnings.length > 0 ||
      Boolean(artifact.scriptRuntime.domMutationSummary) ||
      artifact.scriptRuntime.postRenderAddedNodes.length > 0 ||
      artifact.scriptRuntime.duplicateInsertionSignals.length > 0 ||
      artifact.scriptRuntime.lazyloadRuntimeDependencySignals.length > 0,
    media:
      artifact.media.imageInventory.length > 0 ||
      artifact.media.missingImages.length > 0 ||
      artifact.media.backgroundImageRefs.length > 0 ||
      artifact.media.videoMediaRefs.length > 0,
    widgets:
      artifact.widgets.inventory.length > 0 ||
      artifact.widgets.maps.length > 0 ||
      artifact.widgets.galleriesSlidersLightboxes.length > 0 ||
      artifact.widgets.forms.length > 0 ||
      artifact.widgets.accessibilityWidgets.length > 0 ||
      artifact.widgets.cookieBanners.length > 0 ||
      artifact.widgets.chatSupportWidgets.length > 0,
    fidelityLimitations:
      artifact.route.knownFidelityLimitations.length > 0 ||
      artifact.fidelityLimitations.length > 0,
  };
}

function explainReadiness(input: {
  readinessLevel: ReconstructionReadinessLevel;
  blockers: ReconstructionBlocker[];
  requiredFieldsMissing: EvidenceCaptureReadinessRequiredField[];
  optionalEvidencePresent: EvidenceCaptureReadinessOptionalEvidence[];
}): string {
  if (input.readinessLevel !== "NOT_READY") {
    return [
      `${input.readinessLevel} reached because minimum required evidence is present and no blocking fidelity limitation remains.`,
      `Optional evidence present: ${input.optionalEvidencePresent.length > 0 ? input.optionalEvidencePresent.join(", ") : "none"}.`,
    ].join(" ");
  }

  const blockerIds = input.blockers.map((blocker) => blocker.id).join(", ") || "none";
  const missing = input.requiredFieldsMissing.join(", ") || "none";
  return `NOT_READY because blockers remain: ${blockerIds}. Missing required fields: ${missing}.`;
}

export function evaluateEvidenceCaptureReconstructionReadiness(
  artifact: EvidenceCaptureArtifact,
  enrichedEvidence?: EvidenceCaptureReadinessEnrichment,
): EvidenceCaptureReconstructionReadinessEvaluation {
  const evaluatedArtifact = applyEnrichment(artifact, enrichedEvidence);
  const readiness = evaluateReconstructionReadiness(evaluatedArtifact);
  const required = splitOrderedPresence(
    REQUIRED_FIELD_ORDER,
    requiredFieldPresence(evaluatedArtifact, readiness.blockers),
  );
  const optional = splitOrderedPresence(
    OPTIONAL_EVIDENCE_ORDER,
    optionalEvidencePresence(evaluatedArtifact),
  );
  const evaluation = {
    readinessLevel: readiness.level,
    blockers: readiness.blockers,
    requiredFieldsPresent: required.present,
    requiredFieldsMissing: required.missing,
    optionalEvidencePresent: optional.present,
    optionalEvidenceMissing: optional.missing,
  };

  return {
    ...evaluation,
    readinessExplanation: explainReadiness(evaluation),
  };
}

export function compareBaselineAndEnrichedReadiness(
  artifact: EvidenceCaptureArtifact,
  enrichedEvidence: EvidenceCaptureReadinessEnrichment,
): EvidenceCaptureReconstructionReadinessComparison {
  const beforeReadiness = evaluateEvidenceCaptureReconstructionReadiness(artifact);
  const afterReadiness = evaluateEvidenceCaptureReconstructionReadiness(artifact, enrichedEvidence);
  const afterBlockerIds = new Set(afterReadiness.blockers.map((blocker) => blocker.id));
  const beforeOptional = new Set(beforeReadiness.optionalEvidencePresent);

  return {
    beforeReadiness,
    afterReadiness,
    blockersResolved: beforeReadiness.blockers.filter((blocker) => !afterBlockerIds.has(blocker.id)),
    blockersRemaining: afterReadiness.blockers,
    newOptionalEvidenceAvailable: OPTIONAL_EVIDENCE_ORDER.filter(
      (field) => afterReadiness.optionalEvidencePresent.includes(field) && !beforeOptional.has(field),
    ),
    minimumReadyReached: afterReadiness.readinessLevel !== "NOT_READY",
  };
}

export function summarizeReadinessEvaluation(
  evaluation:
    | EvidenceCaptureReconstructionReadinessEvaluation
    | EvidenceCaptureReconstructionReadinessComparison,
): EvidenceCaptureReconstructionReadinessSummary {
  const target = "afterReadiness" in evaluation ? evaluation.afterReadiness : evaluation;

  return {
    kind: "evidence_capture_reconstruction_readiness_summary_v1",
    readinessLevel: target.readinessLevel,
    minimumReadyReached: target.readinessLevel !== "NOT_READY",
    blockerCount: target.blockers.length,
    blockerIds: target.blockers.map((blocker) => blocker.id),
    requiredFieldsPresent: target.requiredFieldsPresent,
    requiredFieldsMissing: target.requiredFieldsMissing,
    optionalEvidencePresent: target.optionalEvidencePresent,
    optionalEvidenceMissing: target.optionalEvidenceMissing,
    explanation: target.readinessExplanation,
  };
}
