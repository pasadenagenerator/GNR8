import { extractAllAnchorLinks, extractAllImgSrc, textFromHtml } from "@/gnr8/importer/html-utils";
import type { LayoutSignals } from "@/gnr8/migration/layout-graph/layout-node-types";

export type StructuralConfidenceComponents = {
  domIntegrity: number;
  signalStrength: number;
  semanticAgreement: number;
  boundaryClarity: number;
  densityCoherence: number;
};

export type StructuralConfidenceResult = {
  score: number;
  components: StructuralConfidenceComponents;
  anomalies: string[];
};

export type StructuralConfidenceLayoutBlockPlan = {
  blockHtml: string;
  blockOrdinal: number;
  group: {
    intent: string;
    domIndexStart: number;
    domIndexEnd: number;
    confidence?: number;
    sourceNodeTypes?: string[];
  };
  layoutHint: {
    type: string;
    depth: number;
  } | null;
};

export type StructuralConfidenceLayoutNodeSignals = {
  primary: LayoutSignals | null;
  neighbors?: LayoutSignals[];
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Number(clamp01(value).toFixed(3));
}

function intentForType(type: string): string {
  switch (type) {
    case "header":
    case "nav":
      return "header_nav";
    case "hero":
      return "hero";
    case "section":
      return "body";
    case "gallery":
      return "gallery_media";
    case "form":
      return "form_contact";
    case "footer":
    case "legal":
      return "footer_legal";
    default:
      return "unknown";
  }
}

function hasToken(html: string, pattern: RegExp): boolean {
  return pattern.test(html.toLowerCase());
}

function normalizedDensityBand(value: number, lower: number, upper: number): number {
  if (value < lower) return clamp01(value / Math.max(1, lower));
  if (value > upper) return clamp01(1 - (value - upper) / Math.max(1, upper));
  return 1;
}

function scoreDomIntegrity(input: {
  domSpan: number;
  hintDepth: number;
  sourceTypeCount: number;
  intent: string;
  anomalies: Set<string>;
}): number {
  let score = 0.62;

  if (input.domSpan <= 24) score += 0.16;
  else if (input.domSpan <= 42) score += 0.1;
  else score += 0.04;

  if (input.hintDepth >= 4) {
    score -= 0.24;
    input.anomalies.add("deep_fragmentation");
  } else if (input.hintDepth === 3) {
    score -= 0.1;
  }

  if (input.sourceTypeCount >= 3) {
    score -= 0.16;
    input.anomalies.add("mixed_source_node_types");
  } else if (input.sourceTypeCount === 2) {
    score -= 0.08;
  }

  if (input.intent === "unknown") {
    score -= 0.24;
    input.anomalies.add("unknown_structural_intent");
  }

  return round3(score);
}

function scoreSignalStrength(input: {
  html: string;
  intent: string;
  signals: LayoutSignals;
  anomalies: Set<string>;
}): number {
  const textLength = textFromHtml(input.html).length;
  const imageCount = extractAllImgSrc(input.html).length;
  const linkCount = extractAllAnchorLinks(input.html, 120).length;

  const headingScore = input.signals.headingPresence ? 1 : 0.35;
  const textBand = normalizedDensityBand(input.signals.textDensity, 18, 190);
  const sectionBreak = clamp01(input.signals.sectionBreakConfidence);
  const imageCluster = input.intent === "gallery_media" ? clamp01(input.signals.visualClusterConfidence) : clamp01(input.signals.visualClusterConfidence * 0.85);

  let landmarkScore = 0.55;
  const hasNavTag = /<nav\b/i.test(input.html);
  const hasFooterTag = /<footer\b/i.test(input.html);
  const hasForm = /<form\b|<input\b|<textarea\b|<select\b/i.test(input.html);

  if (input.intent === "header_nav") {
    landmarkScore = (hasNavTag ? 0.7 : 0.45) + (linkCount >= 4 ? 0.25 : 0);
    if (textLength > 1100 && !hasNavTag) input.anomalies.add("nav_landmark_weak");
  }

  if (input.intent === "footer_legal") {
    const hasLegalWords = hasToken(input.html, /\b(privacy|terms|legal|gdpr|cookies?|copyright)\b/);
    landmarkScore = (hasFooterTag ? 0.65 : 0.4) + (hasLegalWords ? 0.3 : 0);
    if (!hasFooterTag && !hasLegalWords) input.anomalies.add("footer_landmark_weak");
  }

  if (input.intent === "gallery_media") {
    landmarkScore = imageCount >= 3 ? 0.9 : imageCount >= 2 ? 0.65 : 0.35;
  }

  if (input.intent === "form_contact") {
    landmarkScore = hasForm ? 0.9 : 0.3;
    if (!hasForm) input.anomalies.add("form_signal_missing");
  }

  const score =
    headingScore * 0.2 +
    textBand * 0.2 +
    sectionBreak * 0.2 +
    imageCluster * 0.15 +
    clamp01(landmarkScore) * 0.25;

  return round3(score);
}

function scoreSemanticAgreement(input: {
  html: string;
  intent: string;
  hintType: string;
  signals: LayoutSignals;
  anomalies: Set<string>;
}): number {
  const lower = input.html.toLowerCase();
  const textLength = textFromHtml(input.html).length;
  const imageCount = extractAllImgSrc(input.html).length;
  const linkCount = extractAllAnchorLinks(input.html, 120).length;

  const hasLegalWords = /\b(privacy|terms|legal|gdpr|cookies?|copyright|all rights reserved)\b/.test(lower);
  const hasLogoWords = /\b(logo|brand|partners?|sponsors?)\b/.test(lower);
  const hasGalleryWords = /\b(gallery|portfolio|carousel|slider|photos?)\b/.test(lower);

  let score = 0.78;

  if (intentForType(input.hintType) === input.intent) score += 0.12;

  if (input.intent === "hero") {
    if (hasLegalWords) {
      score -= 0.34;
      input.anomalies.add("hero_footer_text_mismatch");
    }
    if (linkCount >= 6 && input.signals.linkDensity >= 0.25) {
      score -= 0.24;
      input.anomalies.add("nav_collapse_in_hero");
    }
  }

  if (input.intent === "header_nav") {
    if (textLength >= 900 && linkCount <= 3) {
      score -= 0.3;
      input.anomalies.add("nav_body_content_mismatch");
    }
  }

  if (input.intent === "gallery_media") {
    const weakGallery = imageCount < 3 && !hasGalleryWords;
    const logoCluster = hasLogoWords && imageCount <= 3;
    if (weakGallery || logoCluster) {
      score -= 0.26;
      input.anomalies.add("gallery_logo_cluster_mismatch");
    }
  }

  if (input.intent === "footer_legal" && !hasLegalWords && !/<footer\b/i.test(input.html)) {
    score -= 0.24;
    input.anomalies.add("footer_semantic_weak");
  }

  if (input.intent === "form_contact" && !/<form\b/i.test(input.html) && !/\b(contact|reach out|get in touch)\b/.test(lower)) {
    score -= 0.24;
    input.anomalies.add("form_semantic_weak");
  }

  return round3(score);
}

function scoreBoundaryClarity(input: {
  html: string;
  signals: LayoutSignals;
  neighbors: LayoutSignals[];
  anomalies: Set<string>;
}): number {
  const lower = input.html.toLowerCase();
  const breakScore = clamp01(input.signals.sectionBreakConfidence);

  const classPatternScore = /\b(section|band|row|container|wrap|content|spacer|padding|margin|py-|my-|pt-|pb-|mt-|mb-|gap-)\b/.test(lower)
    ? 0.85
    : 0.45;

  const neighborBreaks = input.neighbors.map((n) => clamp01(n.sectionBreakConfidence));
  const rhythmScore =
    neighborBreaks.length === 0
      ? 0.6
      : clamp01(
          1 -
            neighborBreaks.reduce((sum, value) => sum + Math.abs(value - breakScore), 0) /
              Math.max(1, neighborBreaks.length),
        );

  if (breakScore < 0.45 && classPatternScore < 0.6) input.anomalies.add("weak_section_boundary");

  const score = breakScore * 0.5 + classPatternScore * 0.25 + rhythmScore * 0.25;
  return round3(score);
}

function scoreDensityCoherence(input: {
  html: string;
  signals: LayoutSignals;
  anomalies: Set<string>;
}): number {
  const textLength = textFromHtml(input.html).length;
  const imageCount = extractAllImgSrc(input.html).length;
  const linkCount = extractAllAnchorLinks(input.html, 120).length;

  const textNorm = clamp01(textLength / 900);
  const imageNorm = clamp01(imageCount / 8);
  const linkNorm = clamp01(linkCount / 20);

  const activeModes = [textNorm, imageNorm, linkNorm].filter((value) => value >= 0.45).length;
  const mixedNoisePenalty = activeModes >= 3 ? 0.28 : activeModes === 2 ? 0.1 : 0;

  const signalDriftPenalty =
    Math.abs(clamp01(input.signals.imageDensity * 2.5) - imageNorm) * 0.16 +
    Math.abs(clamp01(input.signals.linkDensity * 2.2) - linkNorm) * 0.16;

  let score = 0.82 - mixedNoisePenalty - signalDriftPenalty;

  if (activeModes >= 3) input.anomalies.add("mixed_density_noise");
  if (signalDriftPenalty >= 0.15) input.anomalies.add("density_signal_drift");

  if (textNorm >= 0.5 && imageNorm <= 0.2 && linkNorm <= 0.25) score += 0.08;
  if (imageNorm >= 0.6 && textNorm <= 0.25 && linkNorm <= 0.25) score += 0.08;

  return round3(score);
}

export function computeStructuralConfidence(
  layoutBlockPlan: StructuralConfidenceLayoutBlockPlan,
  layoutNodeSignals: StructuralConfidenceLayoutNodeSignals,
): StructuralConfidenceResult {
  const anomalies = new Set<string>();
  const primarySignals = layoutNodeSignals.primary ?? {
    textDensity: 0,
    imageDensity: 0,
    linkDensity: 0,
    headingPresence: false,
    sectionBreakConfidence: 0,
    visualClusterConfidence: 0,
  };

  const domSpan = Math.max(1, layoutBlockPlan.group.domIndexEnd - layoutBlockPlan.group.domIndexStart + 1);
  const sourceTypeCount = Math.max(1, Array.isArray(layoutBlockPlan.group.sourceNodeTypes) ? new Set(layoutBlockPlan.group.sourceNodeTypes).size : 1);
  const hintDepth = layoutBlockPlan.layoutHint?.depth ?? 5;
  const neighbors = Array.isArray(layoutNodeSignals.neighbors) ? layoutNodeSignals.neighbors : [];

  const components: StructuralConfidenceComponents = {
    domIntegrity: scoreDomIntegrity({
      domSpan,
      hintDepth,
      sourceTypeCount,
      intent: layoutBlockPlan.group.intent,
      anomalies,
    }),
    signalStrength: scoreSignalStrength({
      html: layoutBlockPlan.blockHtml,
      intent: layoutBlockPlan.group.intent,
      signals: primarySignals,
      anomalies,
    }),
    semanticAgreement: scoreSemanticAgreement({
      html: layoutBlockPlan.blockHtml,
      intent: layoutBlockPlan.group.intent,
      hintType: layoutBlockPlan.layoutHint?.type ?? "unknown",
      signals: primarySignals,
      anomalies,
    }),
    boundaryClarity: scoreBoundaryClarity({
      html: layoutBlockPlan.blockHtml,
      signals: primarySignals,
      neighbors,
      anomalies,
    }),
    densityCoherence: scoreDensityCoherence({
      html: layoutBlockPlan.blockHtml,
      signals: primarySignals,
      anomalies,
    }),
  };

  let weighted =
    components.domIntegrity * 0.22 +
    components.signalStrength * 0.22 +
    components.semanticAgreement * 0.24 +
    components.boundaryClarity * 0.16 +
    components.densityCoherence * 0.16;

  if (anomalies.has("nav_collapse_in_hero")) weighted -= 0.28;
  if (anomalies.has("hero_footer_text_mismatch")) weighted -= 0.16;
  if (anomalies.has("nav_body_content_mismatch")) weighted -= 0.14;

  return {
    score: round3(weighted),
    components,
    anomalies: [...anomalies].sort(),
  };
}
