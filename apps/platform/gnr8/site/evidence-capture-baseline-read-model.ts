import { getSiteVersion } from "@/gnr8/runtime/runtime-store";
import type { RuntimeStoreDbOptions } from "@/gnr8/runtime/runtime-store";
import {
  getLatestEvidenceCaptureBaselineArtifactForSiteVersion,
  type EvidenceCaptureBaselineArtifactRecord,
} from "@/gnr8/architecture/evidence-capture-baseline-artifact";
import {
  classifyEvidenceCaptureLimitations,
  isEvidenceCaptureReconstructionReady,
  type FidelityLimitationSeverity,
  type KnownFidelityLimitation,
} from "@/gnr8/architecture/importer-architecture-split-contract";
import {
  normalizeEvidenceCaptureToReconstructionInput,
} from "@/gnr8/architecture/reconstruction-input-normalizer";
import {
  evaluateEvidenceCaptureReconstructionReadiness,
  summarizeReadinessEvaluation,
  type EvidenceCaptureReadinessOptionalEvidence,
  type EvidenceCaptureReadinessRequiredField,
} from "@/gnr8/architecture/reconstruction-readiness-evaluation";
import type {
  ReconstructionBlocker,
  ReconstructionConfidenceInputDefinition,
  ReconstructionReadinessLevel,
} from "@/gnr8/architecture/reconstruction-input-contract";

export type OriginalMirrorFidelityBadge = "HIGH" | "MEDIUM" | "LOW";
export type OriginalMirrorReconstructionReadiness = "READY" | "PARTIAL" | "NOT_READY";
export type OriginalMirrorLimitationCategory =
  | "Capture"
  | "Styles"
  | "Layout"
  | "Runtime"
  | "Assets"
  | "Maps / Widgets";

export type OriginalMirrorFidelitySummary = {
  captureStatus: EvidenceCaptureBaselineArtifactRecord["captureStatus"] | "missing";
  coverageStatus: EvidenceCaptureBaselineArtifactRecord["coverageStatus"] | "missing";
  supportedEvidenceCount: number;
  partialEvidenceCount: number;
  missingEvidenceCount: number;
  supportedPercentage: number;
  partialPercentage: number;
  missingPercentage: number;
};

export type EvidenceCaptureBaselineGeometrySummary = {
  geometryCaptured: boolean;
  regionCount: number;
  viewport: {
    width: number | null;
    height: number | null;
  };
};

export type EvidenceCaptureBaselineSectionSummary = {
  sectionEvidenceCaptured: boolean;
  sectionCount: number;
  sectionTypesPresent: string[];
};

export type EvidenceCaptureBaselineNavigationSummary = {
  navigationCaptured: boolean;
  navigationItemCount: number;
  navigationRoutesDiscovered: number;
};

export type OriginalMirrorKnownLimitation = {
  id: string;
  category: OriginalMirrorLimitationCategory;
  severity: FidelityLimitationSeverity;
  title: string;
  description: string;
};

export type OriginalMirrorRouteLimitation = {
  routePath: string;
  limitations: OriginalMirrorKnownLimitation[];
};

export type OriginalMirrorFidelityProjection = {
  artifactAvailable: boolean;
  artifactKind: EvidenceCaptureBaselineArtifactRecord["kind"] | null;
  summary: OriginalMirrorFidelitySummary;
  badge: OriginalMirrorFidelityBadge;
  reconstructionReadiness: OriginalMirrorReconstructionReadiness;
  limitationsByCategory: Array<{
    category: OriginalMirrorLimitationCategory;
    limitations: OriginalMirrorKnownLimitation[];
  }>;
  routeLimitations: OriginalMirrorRouteLimitation[];
  diagnostics: string[];
};

export type ReconstructionReadinessProjectionBlocker = ReconstructionBlocker | {
  id: "missing_evidence_capture_baseline";
  title: string;
  description: string;
  severity: "blocker";
  remediationHint: string;
};

export type ReconstructionReadinessProjection = {
  readinessLevel: ReconstructionReadinessLevel;
  readinessSummary: string;
  blockerCount: number;
  blockers: ReconstructionReadinessProjectionBlocker[];
  requiredEvidencePresent: EvidenceCaptureReadinessRequiredField[];
  requiredEvidenceMissing: EvidenceCaptureReadinessRequiredField[];
  optionalEvidencePresent: EvidenceCaptureReadinessOptionalEvidence[];
  optionalEvidenceMissing: EvidenceCaptureReadinessOptionalEvidence[];
  confidenceInputs: readonly ReconstructionConfidenceInputDefinition[];
  nextRecommendedCaptureExpansion: string[];
};

const LIMITATION_CATEGORY_ORDER: OriginalMirrorLimitationCategory[] = [
  "Capture",
  "Styles",
  "Layout",
  "Runtime",
  "Assets",
  "Maps / Widgets",
];

const EMPTY_SUMMARY: OriginalMirrorFidelitySummary = {
  captureStatus: "missing",
  coverageStatus: "missing",
  supportedEvidenceCount: 0,
  partialEvidenceCount: 0,
  missingEvidenceCount: 0,
  supportedPercentage: 0,
  partialPercentage: 0,
  missingPercentage: 100,
};

const NO_BASELINE_READINESS_SUMMARY = "No Evidence Capture baseline artifact is available.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function hasField(artifact: EvidenceCaptureBaselineArtifactRecord, fieldName: string): boolean {
  return (
    artifact.fieldAvailability.supportedNow.includes(fieldName) ||
    artifact.fieldAvailability.partial.includes(fieldName) ||
    artifact.fieldAvailability.missingUnavailable.includes(fieldName)
  );
}

function hasLimitationLabel(artifact: EvidenceCaptureBaselineArtifactRecord, label: string): boolean {
  return artifact.limitations.includes(label);
}

function knownLimitation(input: {
  id: string;
  category: OriginalMirrorLimitationCategory;
  severity: FidelityLimitationSeverity;
  title: string;
  description: string;
}): OriginalMirrorKnownLimitation {
  return input;
}

function limitationFromKnown(item: KnownFidelityLimitation): OriginalMirrorKnownLimitation {
  const titleByType: Record<KnownFidelityLimitation["type"], { category: OriginalMirrorLimitationCategory; title: string }> = {
    builder_runtime_dependency: { category: "Runtime", title: "Builder runtime dependency" },
    lazy_loading_dependency: { category: "Runtime", title: "Lazy loading runtime dependency" },
    third_party_widget: { category: "Maps / Widgets", title: "Third-party widget runtime evidence incomplete" },
    external_map: { category: "Maps / Widgets", title: "Map runtime evidence unavailable" },
    gallery_runtime: { category: "Maps / Widgets", title: "Gallery runtime evidence unavailable" },
    form_runtime: { category: "Maps / Widgets", title: "Form runtime evidence unavailable" },
    font_loading: { category: "Styles", title: "Font source evidence incomplete" },
    accessibility_overlay: { category: "Runtime", title: "Accessibility overlay runtime evidence unavailable" },
    cookie_banner_runtime: { category: "Runtime", title: "Cookie banner runtime evidence unavailable" },
    chat_support_runtime: { category: "Runtime", title: "Chat support runtime evidence unavailable" },
    blocked_resource: { category: "Assets", title: "Blocked external resource" },
    failed_resource: { category: "Assets", title: "Failed external resource" },
    rendered_dom_missing: { category: "Capture", title: "Rendered capture unavailable" },
    screenshot_missing: { category: "Capture", title: "Screenshot unavailable" },
    post_render_dom_mutation: { category: "Runtime", title: "Runtime mutation evidence unavailable" },
    duplicate_runtime_insertion: { category: "Runtime", title: "Duplicate runtime insertion evidence detected" },
    unknown_runtime_behavior: { category: "Runtime", title: "Runtime behavior unknown" },
  };
  const metadata = titleByType[item.type];
  return knownLimitation({
    id: item.type,
    category: metadata.category,
    severity: item.severity,
    title: metadata.title,
    description: item.explanation,
  });
}

function addUniqueLimitations(
  target: OriginalMirrorKnownLimitation[],
  items: OriginalMirrorKnownLimitation[],
): OriginalMirrorKnownLimitation[] {
  const byId = new Map<string, OriginalMirrorKnownLimitation>();
  for (const item of [...target, ...items]) {
    const existing = byId.get(item.id);
    if (!existing || existing.severity !== "blocker") byId.set(item.id, item);
  }
  return [...byId.values()].sort((left, right) => {
    const categoryDelta = LIMITATION_CATEGORY_ORDER.indexOf(left.category) - LIMITATION_CATEGORY_ORDER.indexOf(right.category);
    if (categoryDelta !== 0) return categoryDelta;
    return left.id.localeCompare(right.id);
  });
}

function buildKnownLimitations(artifact: EvidenceCaptureBaselineArtifactRecord): OriginalMirrorKnownLimitation[] {
  const limitations: OriginalMirrorKnownLimitation[] = [];
  const geometryCaptured = artifact.summaries.layoutGeometry?.geometryCaptured === true;
  const add = (item: OriginalMirrorKnownLimitation, condition: boolean) => {
    if (condition) limitations.push(item);
  };

  add(
    knownLimitation({
      id: "rendered_capture_unavailable",
      category: "Capture",
      severity: "blocker",
      title: "Rendered capture unavailable",
      description: "Rendered browser DOM evidence is not available in the Evidence Capture Baseline for this Original Mirror.",
    }),
    hasLimitationLabel(artifact, "rendered_capture_unavailable") ||
      artifact.captureStatus === "failed" ||
      artifact.captureStatus === "unavailable" ||
      !artifact.persistedRefs.renderedDomRef,
  );
  add(
    knownLimitation({
      id: "raw_html_fallback_used",
      category: "Capture",
      severity: "warning",
      title: "Raw HTML fallback used",
      description: "Original Mirror evidence was derived from raw imported HTML after rendered capture could not provide usable browser evidence.",
    }),
    hasLimitationLabel(artifact, "raw_html_fallback_used") || artifact.summaries.captureFallbackStatus.rawHtmlFallbackUsed,
  );
  add(
    knownLimitation({
      id: "screenshot_unavailable",
      category: "Capture",
      severity: "warning",
      title: "Screenshot unavailable",
      description: "Screenshot evidence is missing, so visual fidelity cannot be confirmed from persisted capture evidence.",
    }),
    artifact.summaries.screenshotCount === 0 || artifact.persistedRefs.screenshotRefs.length === 0,
  );
  add(
    knownLimitation({
      id: "computed_styles_unavailable",
      category: "Styles",
      severity: "warning",
      title: "Computed styles unavailable",
      description: "Computed style extraction is unavailable or incomplete in the Evidence Capture Baseline.",
    }),
    hasField(artifact, "computedStyleExtraction") || !artifact.persistedRefs.computedStyleRef || artifact.summaries.computedStyleSampleCount === 0,
  );
  add(
    knownLimitation({
      id: "design_tokens_unavailable",
      category: "Styles",
      severity: "warning",
      title: "Design tokens unavailable",
      description: "No normalized design token candidates are available from the persisted baseline evidence.",
    }),
    artifact.evidence.computedStyle.designTokenCandidates.length === 0 || hasField(artifact, "reconstructionGradeDesignModel"),
  );
  add(
    knownLimitation({
      id: "font_source_evidence_incomplete",
      category: "Styles",
      severity: "warning",
      title: "Font source evidence incomplete",
      description: "Font source evidence is missing or partial, so exact original typography loading cannot be guaranteed.",
    }),
    hasLimitationLabel(artifact, "missing_font_source_evidence") || hasField(artifact, "fontSourceEvidence"),
  );
  add(
    knownLimitation({
      id: "layout_boxes_unavailable",
      category: "Layout",
      severity: "warning",
      title: "Layout boxes unavailable",
      description: "Browser layout box extraction is unavailable in the persisted baseline evidence.",
    }),
    !geometryCaptured &&
      (hasLimitationLabel(artifact, "missing_layout_boxes") || hasField(artifact, "layoutBoxExtraction") || artifact.evidence.layout.layoutBoxRefs.length === 0),
  );
  add(
    knownLimitation({
      id: "layout_regions_unavailable",
      category: "Layout",
      severity: "warning",
      title: "Layout regions unavailable",
      description: "Above-fold, repeated-region, and route-level layout region evidence is not available for this baseline.",
    }),
    !geometryCaptured &&
      (hasField(artifact, "layoutEvidence") ||
        (artifact.evidence.layout.aboveFoldRegions.length === 0 &&
          artifact.evidence.layout.repeatedRegions.length === 0 &&
          artifact.evidence.layout.routeLevelStructuralHints.length === 0)),
  );
  add(
    knownLimitation({
      id: "sticky_element_evidence_unavailable",
      category: "Layout",
      severity: "warning",
      title: "Sticky element evidence unavailable",
      description: "Sticky and fixed element evidence is not available in the persisted layout baseline.",
    }),
    artifact.evidence.layout.stickyFixedElements.length === 0,
  );
  add(
    knownLimitation({
      id: "mutation_evidence_unavailable",
      category: "Runtime",
      severity: "warning",
      title: "Runtime mutation evidence unavailable",
      description: "DOM mutation tracking is unavailable, so post-render changes cannot be explained from persisted evidence.",
    }),
    hasLimitationLabel(artifact, "missing_mutation_evidence") || hasField(artifact, "domMutationTracking") || artifact.evidence.scriptRuntime.domMutationSummary == null,
  );
  add(
    knownLimitation({
      id: "widget_runtime_evidence_unavailable",
      category: "Runtime",
      severity: "warning",
      title: "Widget runtime evidence unavailable",
      description: "Widget runtime behavior is unavailable or incomplete in the Evidence Capture Baseline.",
    }),
    hasLimitationLabel(artifact, "missing_widget_runtime_evidence") || hasField(artifact, "widgetRuntimeEvidence"),
  );
  add(
    knownLimitation({
      id: "runtime_behavior_unknown",
      category: "Runtime",
      severity: "warning",
      title: "Runtime behavior unknown",
      description: "The baseline does not include full runtime behavior evidence such as console, interaction, animation, or hydration traces.",
    }),
    hasField(artifact, "browserConsoleInventory") || hasField(artifact, "interactionStateEvidence") || hasField(artifact, "animationTimelineEvidence"),
  );
  add(
    knownLimitation({
      id: "partial_asset_inventory",
      category: "Assets",
      severity: "warning",
      title: "Partial asset inventory",
      description: "The asset inventory is partial; persisted assets may not cover every resource referenced by the original site.",
    }),
    hasLimitationLabel(artifact, "partial_asset_inventory") || hasField(artifact, "assetInventorySummary"),
  );
  add(
    knownLimitation({
      id: "partial_network_inventory",
      category: "Assets",
      severity: "warning",
      title: "Partial network inventory",
      description: "The network inventory is partial; full request/response evidence is not available in the baseline.",
    }),
    hasLimitationLabel(artifact, "partial_network_evidence") || hasField(artifact, "fullNetworkTrace") || hasField(artifact, "networkEvidence"),
  );
  add(
    knownLimitation({
      id: "unresolved_external_resources",
      category: "Assets",
      severity: "warning",
      title: "Unresolved external resources",
      description: "External resource fallbacks are present or unresolved resource evidence is partial.",
    }),
    Number(artifact.summaries.assetInventory.externalFallbackAssetCount ?? 0) > 0 ||
      hasField(artifact, "externalAssetFallbacks") ||
      artifact.evidence.network.failedRequests.length > 0 ||
      artifact.evidence.network.blockedRequests.length > 0,
  );
  add(
    knownLimitation({
      id: "map_runtime_evidence_unavailable",
      category: "Maps / Widgets",
      severity: "warning",
      title: "Map runtime evidence unavailable",
      description: "No persisted map runtime evidence is available to confirm original map behavior.",
    }),
    hasField(artifact, "widgetEvidence") || hasLimitationLabel(artifact, "missing_widget_runtime_evidence"),
  );
  add(
    knownLimitation({
      id: "gallery_runtime_evidence_unavailable",
      category: "Maps / Widgets",
      severity: "warning",
      title: "Gallery runtime evidence unavailable",
      description: "No persisted gallery or slider runtime evidence is available to confirm original interaction behavior.",
    }),
    hasField(artifact, "widgetEvidence") || hasLimitationLabel(artifact, "missing_widget_runtime_evidence"),
  );
  add(
    knownLimitation({
      id: "form_runtime_evidence_unavailable",
      category: "Maps / Widgets",
      severity: "warning",
      title: "Form runtime evidence unavailable",
      description: "No persisted form runtime evidence is available to confirm original form behavior.",
    }),
    hasField(artifact, "widgetEvidence") || hasLimitationLabel(artifact, "missing_widget_runtime_evidence"),
  );

  return addUniqueLimitations(limitations, [
    ...artifact.fidelityLimitations.map(limitationFromKnown),
    ...classifyEvidenceCaptureLimitations(artifact.evidence).map(limitationFromKnown),
  ]);
}

function buildReadiness(input: {
  artifact: EvidenceCaptureBaselineArtifactRecord | null;
  limitations: OriginalMirrorKnownLimitation[];
}): OriginalMirrorReconstructionReadiness {
  if (!input.artifact) return "NOT_READY";
  if (!input.artifact.persistedRefs.renderedDomRef || input.artifact.evidence.rendered.renderStatus === "failed") return "NOT_READY";
  if (input.limitations.some((limitation) => limitation.severity === "blocker")) return "NOT_READY";
  if (isEvidenceCaptureReconstructionReady(input.artifact.evidence)) return "READY";
  if (input.limitations.some((limitation) => limitation.severity === "warning")) return "PARTIAL";
  return "READY";
}

function buildBadge(supportedPercentage: number): OriginalMirrorFidelityBadge {
  if (supportedPercentage >= 70) return "HIGH";
  if (supportedPercentage >= 40) return "MEDIUM";
  return "LOW";
}

function groupLimitations(limitations: OriginalMirrorKnownLimitation[]): OriginalMirrorFidelityProjection["limitationsByCategory"] {
  return LIMITATION_CATEGORY_ORDER
    .map((category) => ({
      category,
      limitations: limitations.filter((limitation) => limitation.category === category),
    }))
    .filter((group) => group.limitations.length > 0);
}

function buildRouteLimitations(artifact: EvidenceCaptureBaselineArtifactRecord): OriginalMirrorRouteLimitation[] {
  const routePath = normalizeText(artifact.evidence.route.discoveredRoutePath) || normalizeText(artifact.routePath);
  if (!routePath || artifact.evidence.route.knownFidelityLimitations.length === 0) return [];
  return [
    {
      routePath,
      limitations: addUniqueLimitations([], artifact.evidence.route.knownFidelityLimitations.map(limitationFromKnown)),
    },
  ];
}

export function buildOriginalMirrorFidelityProjection(
  artifact: EvidenceCaptureBaselineArtifactRecord | null,
): OriginalMirrorFidelityProjection {
  if (!artifact) {
    return {
      artifactAvailable: false,
      artifactKind: null,
      summary: EMPTY_SUMMARY,
      badge: "LOW",
      reconstructionReadiness: "NOT_READY",
      limitationsByCategory: [],
      routeLimitations: [],
      diagnostics: ["EVIDENCE_CAPTURE_BASELINE_MISSING"],
    };
  }

  const summary: OriginalMirrorFidelitySummary = {
    captureStatus: artifact.captureStatus,
    coverageStatus: artifact.coverageStatus,
    supportedEvidenceCount: artifact.coverage.supportedNowCount,
    partialEvidenceCount: artifact.coverage.partialCount,
    missingEvidenceCount: artifact.coverage.missingCount,
    supportedPercentage: artifact.coverage.supportedNowPercent,
    partialPercentage: artifact.coverage.partialPercent,
    missingPercentage: artifact.coverage.missingPercent,
  };
  const limitations = buildKnownLimitations(artifact);

  return {
    artifactAvailable: true,
    artifactKind: artifact.kind,
    summary,
    badge: buildBadge(summary.supportedPercentage),
    reconstructionReadiness: buildReadiness({ artifact, limitations }),
    limitationsByCategory: groupLimitations(limitations),
    routeLimitations: buildRouteLimitations(artifact),
    diagnostics: ["ORIGINAL_MIRROR_FIDELITY_DERIVED_FROM_EVIDENCE_CAPTURE_BASELINE"],
  };
}

export function buildEvidenceCaptureBaselineGeometrySummary(
  artifact: EvidenceCaptureBaselineArtifactRecord | null,
): EvidenceCaptureBaselineGeometrySummary {
  if (!artifact) {
    return {
      geometryCaptured: false,
      regionCount: 0,
      viewport: {
        width: null,
        height: null,
      },
    };
  }

  return {
    geometryCaptured: artifact.summaries.layoutGeometry?.geometryCaptured === true,
    regionCount: artifact.summaries.layoutGeometry?.regionCount ?? 0,
    viewport: {
      width: artifact.summaries.layoutGeometry?.viewportWidth ?? null,
      height: artifact.summaries.layoutGeometry?.viewportHeight ?? null,
    },
  };
}

export function buildEvidenceCaptureBaselineSectionSummary(
  artifact: EvidenceCaptureBaselineArtifactRecord | null,
): EvidenceCaptureBaselineSectionSummary {
  if (!artifact) {
    return {
      sectionEvidenceCaptured: false,
      sectionCount: 0,
      sectionTypesPresent: [],
    };
  }

  return {
    sectionEvidenceCaptured: artifact.summaries.sectionBoundary?.sectionEvidenceCaptured === true,
    sectionCount: artifact.summaries.sectionBoundary?.sectionCount ?? 0,
    sectionTypesPresent: artifact.summaries.sectionBoundary?.sectionTypesPresent ?? [],
  };
}

export function buildEvidenceCaptureBaselineNavigationSummary(
  artifact: EvidenceCaptureBaselineArtifactRecord | null,
): EvidenceCaptureBaselineNavigationSummary {
  if (!artifact) {
    return {
      navigationCaptured: false,
      navigationItemCount: 0,
      navigationRoutesDiscovered: 0,
    };
  }

  return {
    navigationCaptured: artifact.summaries.navigation?.navigationCaptured === true,
    navigationItemCount: artifact.summaries.navigation?.navigationItemCount ?? 0,
    navigationRoutesDiscovered: artifact.summaries.navigation?.navigationRoutesDiscovered ?? 0,
  };
}

function requiredEvidenceRecommendation(field: EvidenceCaptureReadinessRequiredField): string {
  const recommendations: Record<EvidenceCaptureReadinessRequiredField, string> = {
    evidenceArtifactStatus: "successful evidence capture status",
    sourceUrl: "source URL",
    routeIdentity: "route identity",
    renderedDomRef: "rendered DOM",
    renderedHtmlHash: "rendered HTML hash",
    renderStatus: "render status",
    routeCaptureStatus: "route capture status",
    noBlockerFidelityLimitations: "blocking fidelity limitation evidence",
  };
  return recommendations[field];
}

function optionalEvidenceRecommendation(field: EvidenceCaptureReadinessOptionalEvidence): string {
  const recommendations: Record<EvidenceCaptureReadinessOptionalEvidence, string> = {
    rawHtmlRef: "raw HTML",
    screenshots: "screenshot evidence",
    fullPageScreenshotRef: "full-page screenshot",
    computedStyles: "computed style samples",
    fonts: "font inventory",
    layout: "layout boxes",
    network: "network inventory",
    scriptRuntime: "runtime mutation summary",
    media: "media inventory",
    widgets: "widget runtime evidence",
    fidelityLimitations: "normalized fidelity limitations",
  };
  return recommendations[field];
}

function buildNextRecommendedCaptureExpansion(input: {
  requiredEvidenceMissing: EvidenceCaptureReadinessRequiredField[];
  optionalEvidenceMissing: EvidenceCaptureReadinessOptionalEvidence[];
}): string[] {
  return [
    ...input.requiredEvidenceMissing.map(requiredEvidenceRecommendation),
    ...input.optionalEvidenceMissing.map(optionalEvidenceRecommendation),
  ].filter((value, index, values) => values.indexOf(value) === index);
}

export function buildReconstructionReadinessProjection(
  artifact: EvidenceCaptureBaselineArtifactRecord | null,
): ReconstructionReadinessProjection {
  if (!artifact) {
    return {
      readinessLevel: "NOT_READY",
      readinessSummary: NO_BASELINE_READINESS_SUMMARY,
      blockerCount: 1,
      blockers: [
        {
          id: "missing_evidence_capture_baseline",
          title: "Evidence Capture baseline missing",
          description: NO_BASELINE_READINESS_SUMMARY,
          severity: "blocker",
          remediationHint: "Capture and persist an Evidence Capture baseline before evaluating reconstruction readiness.",
        },
      ],
      requiredEvidencePresent: [],
      requiredEvidenceMissing: [],
      optionalEvidencePresent: [],
      optionalEvidenceMissing: [],
      confidenceInputs: [],
      nextRecommendedCaptureExpansion: ["Evidence Capture baseline artifact"],
    };
  }

  const normalizedInput = normalizeEvidenceCaptureToReconstructionInput(artifact);
  const evaluation = evaluateEvidenceCaptureReconstructionReadiness(artifact.evidence);
  const summary = summarizeReadinessEvaluation(evaluation);

  return {
    readinessLevel: summary.readinessLevel,
    readinessSummary: summary.explanation,
    blockerCount: summary.blockerCount,
    blockers: evaluation.blockers,
    requiredEvidencePresent: summary.requiredFieldsPresent,
    requiredEvidenceMissing: summary.requiredFieldsMissing,
    optionalEvidencePresent: summary.optionalEvidencePresent,
    optionalEvidenceMissing: summary.optionalEvidenceMissing,
    confidenceInputs: normalizedInput.confidenceInputs,
    nextRecommendedCaptureExpansion: buildNextRecommendedCaptureExpansion({
      requiredEvidenceMissing: summary.requiredFieldsMissing,
      optionalEvidenceMissing: summary.optionalEvidenceMissing,
    }),
  };
}

export function getEvidenceCaptureBaselineArtifactFromImportProvenanceSummary(value: unknown): EvidenceCaptureBaselineArtifactRecord | null {
  if (!isRecord(value)) return null;
  const artifact = value.evidenceCaptureBaselineArtifact;
  if (!isRecord(artifact)) return null;
  if (normalizeText(artifact.kind) !== "evidence_capture_baseline") return null;
  return artifact as EvidenceCaptureBaselineArtifactRecord;
}

export async function loadLatestEvidenceCaptureBaselineArtifactForSiteVersion(
  siteVersionId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<EvidenceCaptureBaselineArtifactRecord | null> {
  const siteVersion = await getSiteVersion(siteVersionId, options);
  return getLatestEvidenceCaptureBaselineArtifactForSiteVersion({ siteVersion });
}
