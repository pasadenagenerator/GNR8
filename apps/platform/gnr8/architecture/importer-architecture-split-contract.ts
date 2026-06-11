/**
 * Phase 7F-1 importer architecture boundary contract.
 *
 * This file intentionally contains lightweight type scaffolding only. It does
 * not change import execution, preview rendering, script policy, or AI behavior.
 */

export const IMPORTER_ARCHITECTURE_SPLIT_VERSION = "7F-1" as const;

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

export type KnownFidelityLimitationKind =
  | "builder_runtime_dependency"
  | "lazy_loading_dependency"
  | "third_party_widget"
  | "external_map"
  | "gallery_runtime"
  | "form_runtime"
  | "font_loading"
  | "accessibility_overlay"
  | "blocked_resource"
  | "post_render_dom_mutation"
  | "unknown_runtime_behavior";

export type KnownFidelityLimitation = {
  kind: KnownFidelityLimitationKind;
  layer: ImporterArchitectureLayer;
  summary: string;
  evidenceRefIds: string[];
};

export type EvidenceCaptureArtifact = {
  kind: "evidence_capture_artifact_v1";
  architectureVersion: typeof IMPORTER_ARCHITECTURE_SPLIT_VERSION;
  status: EvidenceCaptureStatus;
  provider: CaptureProvider;
  routePath: string;
  sourceUrl: string;
  evidenceRefIds: string[];
  includes: {
    finalRenderedDom: boolean;
    rawSourceHtml: boolean;
    screenshots: boolean;
    computedStyles: boolean;
    networkRequests: boolean;
    loadedFonts: boolean;
    consoleErrors: boolean;
    layoutBoxes: boolean;
    imageInventory: boolean;
    stylesheetInventory: boolean;
    scriptInventory: boolean;
    iframeEmbedWidgetInventory: boolean;
    mapGalleryFormAccessibilityEvidence: boolean;
    routeLevelEvidence: boolean;
    postRenderDomMutationEvidence: boolean;
  };
  limitations: KnownFidelityLimitation[];
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
