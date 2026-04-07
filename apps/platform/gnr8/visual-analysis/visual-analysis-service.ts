import type { VisualAnalysisInterpreterProvider } from "./visual-analysis-ai-hook";
import type {
  VisualAnalysisDiagnostic,
  VisualAnalysisDiagnosticCode,
  VisualAnalysisModel,
  VisualConfidence,
  VisualPageMetricHint,
  VisualPageObservation,
  VisualScreenshotInput,
  VisualSectionBoundingHint,
  VisualSectionObservation,
  VisualStyleFamily,
} from "./visual-analysis-model";
import { VISUAL_ANALYSIS_MODEL_VERSION } from "./visual-analysis-model";

type CreateVisualAnalysisOptions = {
  interpreterProvider?: VisualAnalysisInterpreterProvider | null;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function toConfidence(score: number): VisualConfidence {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

function diagnostic(
  code: VisualAnalysisDiagnosticCode,
  severity: VisualAnalysisDiagnostic["severity"],
  message: string,
  pageId: string | null = null,
  sectionId: string | null = null,
): VisualAnalysisDiagnostic {
  return { code, severity, message, pageId, sectionId };
}

function dominantStyleFor(metric: VisualPageMetricHint, confidence: VisualConfidence): VisualStyleFamily {
  const imageDominant = metric.imageAreaRatio - metric.textAreaRatio >= 0.14;
  const textDominant = metric.textAreaRatio - metric.imageAreaRatio >= 0.14;
  if (imageDominant && metric.sectionRepetitionScore >= 0.65) return "visual_gallery";
  if (metric.aboveFoldPrimaryCtaContrast >= 0.62 && metric.heroTopViewportCoverage >= 0.25) return "cta_focused";
  if (textDominant && metric.whitespaceRatio >= 0.2) return "editorial_readable";
  if (metric.heroTopViewportCoverage >= 0.32 && Math.abs(metric.imageAreaRatio - metric.textAreaRatio) <= 0.18) return "service_split_layout";
  if (confidence === "low") return "unknown";
  return "corporate_balanced";
}

function pageObservationFromMetric(metric: VisualPageMetricHint): VisualPageObservation {
  const heroProminence = metric.heroTopViewportCoverage >= 0.52 ? "high" : metric.heroTopViewportCoverage >= 0.28 ? "medium" : "low";

  const fillRatio = clamp01(metric.imageAreaRatio + metric.textAreaRatio);
  const visualDensity = fillRatio >= 0.86 || metric.whitespaceRatio < 0.12 ? "high" : fillRatio >= 0.62 ? "medium" : "low";
  const spacingRhythm = metric.whitespaceRatio < 0.14 ? "tight" : metric.whitespaceRatio >= 0.32 ? "airy" : "balanced";
  const readabilityTendency =
    visualDensity === "high" ? "dense" : spacingRhythm === "airy" && metric.textAreaRatio <= 0.55 ? "calm" : "balanced";
  const balanceDelta = metric.imageAreaRatio - metric.textAreaRatio;
  const imageTextBalance = balanceDelta >= 0.12 ? "image_dominant" : balanceDelta <= -0.12 ? "text_dominant" : "balanced";
  const ctaProminence =
    metric.aboveFoldPrimaryCtaContrast >= 0.68 ? "high" : metric.aboveFoldPrimaryCtaContrast >= 0.42 ? "medium" : "low";

  const confidenceScore =
    (0.25 * clamp01(metric.heroTopViewportCoverage) +
      0.2 * clamp01(metric.imageAreaRatio + metric.textAreaRatio) +
      0.2 * clamp01(metric.aboveFoldPrimaryCtaContrast) +
      0.2 * clamp01(metric.whitespaceRatio) +
      0.15 * clamp01(1 - Math.abs(metric.footerHeightRatio - 0.16))) /
    1;
  const confidence = toConfidence(confidenceScore);

  return {
    pageId: metric.pageId,
    dominantVisualStyleFamily: dominantStyleFor(metric, confidence),
    heroProminence,
    visualDensity,
    spacingRhythm,
    readabilityTendency,
    imageTextBalance,
    ctaProminence,
    confidence,
    rationale: [
      `heroTopViewportCoverage=${metric.heroTopViewportCoverage.toFixed(2)}`,
      `imageAreaRatio=${metric.imageAreaRatio.toFixed(2)}`,
      `textAreaRatio=${metric.textAreaRatio.toFixed(2)}`,
      `whitespaceRatio=${metric.whitespaceRatio.toFixed(2)}`,
      `ctaContrast=${metric.aboveFoldPrimaryCtaContrast.toFixed(2)}`,
      `sectionRepetitionScore=${metric.sectionRepetitionScore.toFixed(2)}`,
    ],
  };
}

function sectionObservationFromHint(hint: VisualSectionBoundingHint, pageMetric: VisualPageMetricHint | null): VisualSectionObservation {
  const prominence = hint.heightRatio >= 0.3 ? "high" : hint.heightRatio >= 0.14 ? "medium" : "low";
  let observationType: VisualSectionObservation["observationType"] = "balanced_content";
  if (hint.ctaWeight >= 0.55 && hint.visualDistinctiveness >= 0.5) observationType = "standout_cta_band";
  else if (hint.mediaWeight >= 0.58) observationType = "media_forward_section";
  else if (hint.textWeight >= 0.72 && hint.heightRatio <= 0.2) observationType = "compressed_text_block";
  else if ((pageMetric?.sectionRepetitionScore ?? 0) >= 0.66 && hint.mediaWeight >= 0.35 && hint.textWeight >= 0.2) observationType = "repeated_card_grid";

  const confidenceScore =
    0.35 * clamp01(hint.heightRatio) +
    0.3 * clamp01(hint.visualDistinctiveness) +
    0.2 * clamp01(Math.max(hint.mediaWeight, hint.textWeight, hint.ctaWeight)) +
    0.15 * clamp01(1 - Math.min(1, Math.abs(hint.topRatio - 0.35)));
  const confidence = toConfidence(confidenceScore);

  return {
    pageId: hint.pageId,
    sectionId: hint.sectionId,
    ordinalIndex: hint.ordinalIndex,
    prominence,
    observationType,
    confidence,
    rationale: [
      `topRatio=${hint.topRatio.toFixed(2)}`,
      `heightRatio=${hint.heightRatio.toFixed(2)}`,
      `textWeight=${hint.textWeight.toFixed(2)}`,
      `mediaWeight=${hint.mediaWeight.toFixed(2)}`,
      `ctaWeight=${hint.ctaWeight.toFixed(2)}`,
      `visualDistinctiveness=${hint.visualDistinctiveness.toFixed(2)}`,
    ],
  };
}

function unavailableModel(reason: string): VisualAnalysisModel {
  return {
    kind: "visual_analysis_model_v1",
    version: VISUAL_ANALYSIS_MODEL_VERSION,
    status: "unavailable",
    source: { inputKind: "none", screenshotCount: 0, hasSectionHints: false, hasAlignmentHints: false },
    pageObservations: {
      dominantVisualStyleFamily: "unknown",
      heroProminence: "medium",
      visualDensity: "medium",
      spacingRhythm: "balanced",
      readabilityTendency: "balanced",
      imageTextBalance: "balanced",
      ctaProminence: "medium",
    },
    pageObservationsByPage: [],
    sectionObservations: [],
    confidence: "low",
    rationale: [reason],
    diagnostics: [diagnostic("VISUAL_ANALYSIS_UNAVAILABLE", "info", reason)],
  };
}

export function createVisualAnalysisModel(
  input: VisualScreenshotInput | null | undefined,
  options?: CreateVisualAnalysisOptions,
): VisualAnalysisModel {
  if (!input) {
    return unavailableModel("Screenshot-assisted visual analysis skipped because no visual input was provided.");
  }

  const diagnostics: VisualAnalysisDiagnostic[] = [];
  if (input.screenshots.length === 0) {
    diagnostics.push(diagnostic("VISUAL_ANALYSIS_SCREENSHOT_MISSING", "warning", "Visual input was provided but contains no screenshot references."));
  }

  const metrics = input.pageMetrics ?? [];
  if (metrics.length === 0) {
    diagnostics.push(diagnostic("VISUAL_ANALYSIS_PAGE_METRICS_MISSING", "warning", "Visual input has no page-level metric hints; confidence downgraded."));
  }

  const pageObservationsByPage = metrics.map((metric) => pageObservationFromMetric(metric));
  const metricByPage = new Map(metrics.map((m) => [m.pageId, m]));

  const sectionObservations = (input.sectionBoundingHints ?? []).map((hint) =>
    sectionObservationFromHint(hint, metricByPage.get(hint.pageId) ?? null),
  );

  if ((input.sectionBoundingHints ?? []).length > 0 && (input.semanticAlignmentHints ?? []).length > 0) {
    for (const alignment of input.semanticAlignmentHints ?? []) {
      const expected = new Set(alignment.expectedSectionIds);
      if (expected.size === 0) continue;
      const observedIds = new Set(
        (input.sectionBoundingHints ?? []).filter((s) => s.pageId === alignment.pageId).map((s) => s.sectionId),
      );
      let matched = 0;
      for (const id of expected) {
        if (observedIds.has(id)) matched++;
      }
      const ratio = matched / expected.size;
      if (ratio < 0.5) {
        diagnostics.push(
          diagnostic(
            "VISUAL_ANALYSIS_SECTION_ALIGNMENT_WEAK",
            "warning",
            `Section alignment is weak for page '${alignment.pageId}' (${matched}/${expected.size} matched).`,
            alignment.pageId,
          ),
        );
      }
    }
  }

  const aggregateObservation = pageObservationsByPage[0] ?? {
    pageId: "unknown",
    dominantVisualStyleFamily: "unknown" as VisualStyleFamily,
    heroProminence: "medium" as const,
    visualDensity: "medium" as const,
    spacingRhythm: "balanced" as const,
    readabilityTendency: "balanced" as const,
    imageTextBalance: "balanced" as const,
    ctaProminence: "medium" as const,
    confidence: "low" as VisualConfidence,
    rationale: ["No page metrics were available; defaults retained."],
  };

  const confidenceComponents: number[] = [];
  confidenceComponents.push(input.screenshots.length > 0 ? 0.35 : 0.05);
  confidenceComponents.push(metrics.length > 0 ? 0.35 : 0.05);
  confidenceComponents.push(sectionObservations.length > 0 ? 0.2 : 0.08);
  confidenceComponents.push(diagnostics.some((d) => d.code === "VISUAL_ANALYSIS_SECTION_ALIGNMENT_WEAK") ? 0.05 : 0.15);
  const confidenceScore = confidenceComponents.reduce((sum, value) => sum + value, 0);
  const confidence = toConfidence(confidenceScore);

  if (confidence === "low") {
    diagnostics.push(
      diagnostic(
        "VISUAL_ANALYSIS_LOW_CONFIDENCE",
        "info",
        "Screenshot-assisted visual analysis completed with low confidence; deterministic structure should remain primary.",
      ),
    );
  }

  if (options?.interpreterProvider?.interpretVisualInput) {
    try {
      const interpreted = options.interpreterProvider.interpretVisualInput(input);
      if (interpreted?.styleFamilyHint && confidence !== "low") {
        aggregateObservation.dominantVisualStyleFamily = interpreted.styleFamilyHint;
      }
    } catch {
      diagnostics.push(
        diagnostic(
          "VISUAL_ANALYSIS_LOW_CONFIDENCE",
          "info",
          "Optional visual interpreter hook failed; deterministic visual heuristics were retained.",
        ),
      );
    }
  }

  return {
    kind: "visual_analysis_model_v1",
    version: VISUAL_ANALYSIS_MODEL_VERSION,
    status: input.screenshots.length > 0 ? "available" : "unavailable",
    source: {
      inputKind: input.kind,
      screenshotCount: input.screenshots.length,
      hasSectionHints: (input.sectionBoundingHints ?? []).length > 0,
      hasAlignmentHints: (input.semanticAlignmentHints ?? []).length > 0,
    },
    pageObservations: {
      dominantVisualStyleFamily: aggregateObservation.dominantVisualStyleFamily,
      heroProminence: aggregateObservation.heroProminence,
      visualDensity: aggregateObservation.visualDensity,
      spacingRhythm: aggregateObservation.spacingRhythm,
      readabilityTendency: aggregateObservation.readabilityTendency,
      imageTextBalance: aggregateObservation.imageTextBalance,
      ctaProminence: aggregateObservation.ctaProminence,
    },
    pageObservationsByPage,
    sectionObservations,
    confidence,
    rationale: [
      ...aggregateObservation.rationale,
      `screenshots=${input.screenshots.length}`,
      `pageMetrics=${metrics.length}`,
      `sectionHints=${(input.sectionBoundingHints ?? []).length}`,
    ],
    diagnostics,
  };
}
