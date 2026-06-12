/**
 * Phase 7F-7 minimum evidence handoff normalization.
 *
 * This module is a pure boundary adapter from persisted Evidence Capture
 * baseline artifacts into the Phase 7F-5 Reconstruction Input contract.
 * It does not capture new evidence, inspect page structure, render previews,
 * mutate persistence, or execute reconstruction.
 */

import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type {
  EvidenceCaptureArtifact,
  KnownFidelityLimitation,
} from "./importer-architecture-split-contract";
import {
  RECONSTRUCTION_CONFIDENCE_INPUTS,
  RECONSTRUCTION_INPUT_CONTRACT_VERSION,
  type ReconstructionBlocker,
  type ReconstructionInputArtifact,
  type ReconstructionReadinessAssessment,
  type ReconstructionReadinessLevel,
  classifyReconstructionBlockers,
  evaluateReconstructionReadiness as evaluatePhase75ReconstructionReadiness,
  getEvidenceFieldsByClassification,
} from "./reconstruction-input-contract";

export type ReconstructionInputRequiredField =
  | "sourceUrl"
  | "routeIdentity"
  | "captureStatus"
  | "renderStatus"
  | "renderedDomRef"
  | "renderedHtmlHash"
  | "routeCaptureStatus";

export type ReconstructionInputOptionalEvidence =
  | "rawHtmlRef"
  | "screenshots"
  | "fullPageScreenshotRef"
  | "computedStyle"
  | "layout"
  | "network"
  | "scriptRuntime"
  | "media"
  | "widgets"
  | "fidelityLimitations";

export type ReconstructionInputSummary = {
  readiness: ReconstructionReadinessLevel;
  blockerCount: number;
  blockers: ReconstructionBlocker[];
  requiredFieldsPresent: ReconstructionInputRequiredField[];
  requiredFieldsMissing: ReconstructionInputRequiredField[];
  optionalEvidenceAvailable: ReconstructionInputOptionalEvidence[];
  optionalEvidenceMissing: ReconstructionInputOptionalEvidence[];
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(String(value ?? "").trim());
}

function hasRef(value: { uri: string | null } | null | undefined): boolean {
  return Boolean(value && hasText(value.uri));
}

function allFidelityLimitations(artifact: EvidenceCaptureArtifact): KnownFidelityLimitation[] {
  return [
    ...artifact.route.knownFidelityLimitations,
    ...artifact.fidelityLimitations,
  ];
}

function requiredFieldPresence(
  artifact: ReconstructionInputArtifact,
): Record<ReconstructionInputRequiredField, boolean> {
  return {
    sourceUrl: hasText(artifact.source.sourceUrl) || hasText(artifact.source.route.sourceUrl),
    routeIdentity: hasText(artifact.source.routePath) || hasText(artifact.source.route.discoveredRoutePath),
    captureStatus: artifact.requiredEvidence.status === "available" || artifact.requiredEvidence.status === "partial",
    renderStatus: artifact.requiredEvidence.renderStatus === "available" || artifact.requiredEvidence.renderStatus === "partial",
    renderedDomRef: hasRef(artifact.requiredEvidence.renderedDomRef),
    renderedHtmlHash: hasText(artifact.requiredEvidence.renderedHtmlHash),
    routeCaptureStatus:
      artifact.requiredEvidence.routeCaptureStatus === "available" ||
      artifact.requiredEvidence.routeCaptureStatus === "partial",
  };
}

function optionalEvidencePresence(
  artifact: ReconstructionInputArtifact,
): Record<ReconstructionInputOptionalEvidence, boolean> {
  const { optionalEvidence } = artifact;

  return {
    rawHtmlRef: hasRef(optionalEvidence.rawHtmlRef),
    screenshots: optionalEvidence.screenshots.length > 0,
    fullPageScreenshotRef: hasRef(optionalEvidence.fullPageScreenshotRef),
    computedStyle:
      optionalEvidence.computedStyle.computedStyleSampleRefs.length > 0 ||
      optionalEvidence.computedStyle.designTokenCandidates.length > 0 ||
      optionalEvidence.computedStyle.fontsDetected.length > 0 ||
      optionalEvidence.computedStyle.fontSourcesLoaded.length > 0 ||
      optionalEvidence.computedStyle.missingFontSources.length > 0 ||
      optionalEvidence.computedStyle.colorCandidates.length > 0 ||
      optionalEvidence.computedStyle.spacingCandidates.length > 0,
    layout:
      optionalEvidence.layout.layoutBoxRefs.length > 0 ||
      optionalEvidence.layout.viewportBreakpoints.length > 0 ||
      optionalEvidence.layout.aboveFoldRegions.length > 0 ||
      optionalEvidence.layout.repeatedRegions.length > 0 ||
      optionalEvidence.layout.stickyFixedElements.length > 0 ||
      optionalEvidence.layout.routeLevelStructuralHints.length > 0,
    network:
      optionalEvidence.network.requestInventory.length > 0 ||
      optionalEvidence.network.responseInventory.length > 0 ||
      optionalEvidence.network.failedRequests.length > 0 ||
      optionalEvidence.network.blockedRequests.length > 0 ||
      optionalEvidence.network.assetClassifications.length > 0,
    scriptRuntime:
      optionalEvidence.scriptRuntime.scriptInventory.length > 0 ||
      optionalEvidence.scriptRuntime.inlineScriptSignatures.length > 0 ||
      optionalEvidence.scriptRuntime.consoleErrorsWarnings.length > 0 ||
      Boolean(optionalEvidence.scriptRuntime.domMutationSummary) ||
      optionalEvidence.scriptRuntime.postRenderAddedNodes.length > 0 ||
      optionalEvidence.scriptRuntime.duplicateInsertionSignals.length > 0 ||
      optionalEvidence.scriptRuntime.lazyloadRuntimeDependencySignals.length > 0,
    media:
      optionalEvidence.media.imageInventory.length > 0 ||
      optionalEvidence.media.missingImages.length > 0 ||
      optionalEvidence.media.backgroundImageRefs.length > 0 ||
      optionalEvidence.media.videoMediaRefs.length > 0,
    widgets:
      optionalEvidence.widgets.maps.length > 0 ||
      optionalEvidence.widgets.galleriesSlidersLightboxes.length > 0 ||
      optionalEvidence.widgets.forms.length > 0 ||
      optionalEvidence.widgets.accessibilityWidgets.length > 0 ||
      optionalEvidence.widgets.cookieBanners.length > 0 ||
      optionalEvidence.widgets.chatSupportWidgets.length > 0,
    fidelityLimitations: optionalEvidence.fidelityLimitations.length > 0,
  };
}

function splitPresence<T extends string>(presence: Record<T, boolean>): {
  present: T[];
  missing: T[];
} {
  const present: T[] = [];
  const missing: T[] = [];

  for (const [field, available] of Object.entries(presence) as [T, boolean][]) {
    if (available) {
      present.push(field);
    } else {
      missing.push(field);
    }
  }

  return { present, missing };
}

export function evaluateReconstructionReadiness(
  input: EvidenceCaptureBaselineArtifactRecord | EvidenceCaptureArtifact,
): ReconstructionReadinessAssessment {
  const artifact = "evidence" in input ? input.evidence : input;
  return evaluatePhase75ReconstructionReadiness(artifact);
}

export function normalizeEvidenceCaptureToReconstructionInput(
  baseline: EvidenceCaptureBaselineArtifactRecord,
): ReconstructionInputArtifact {
  const artifact = baseline.evidence;
  const readiness = evaluateReconstructionReadiness(baseline);

  return {
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
      fidelityLimitations: allFidelityLimitations(artifact),
    },
    readiness,
    confidenceInputs: [...RECONSTRUCTION_CONFIDENCE_INPUTS],
    unsupportedEvidenceFields: getEvidenceFieldsByClassification("UNSUPPORTED"),
  };
}

export function projectReconstructionBlockers(
  input: EvidenceCaptureBaselineArtifactRecord | EvidenceCaptureArtifact,
): ReconstructionBlocker[] {
  const artifact = "evidence" in input ? input.evidence : input;
  return classifyReconstructionBlockers(artifact);
}

export function summarizeReconstructionInput(
  artifact: ReconstructionInputArtifact,
): ReconstructionInputSummary {
  const required = splitPresence(requiredFieldPresence(artifact));
  const optional = splitPresence(optionalEvidencePresence(artifact));

  return {
    readiness: artifact.readiness.level,
    blockerCount: artifact.readiness.blockers.length,
    blockers: artifact.readiness.blockers,
    requiredFieldsPresent: required.present,
    requiredFieldsMissing: required.missing,
    optionalEvidenceAvailable: optional.present,
    optionalEvidenceMissing: optional.missing,
  };
}
