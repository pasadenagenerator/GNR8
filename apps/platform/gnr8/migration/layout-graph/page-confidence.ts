import type { Gnr8Section } from "@/gnr8/types/section";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Number(clamp01(value).toFixed(3));
}

type SectionConfidenceMeta = {
  id: string;
  intent: string;
  structuralConfidence: number;
  domIndexStart: number;
  domIndexEnd: number;
  layoutHintType: string;
  anomalies: string[];
};

function readSectionConfidenceMeta(section: Gnr8Section): SectionConfidenceMeta | null {
  const raw = section.props?.layoutStructural;
  if (!raw || typeof raw !== "object") return null;

  const node = raw as Record<string, unknown>;
  const intent = typeof node.intent === "string" ? node.intent : "unknown";
  const structuralConfidence = typeof node.structuralConfidence === "number" ? clamp01(node.structuralConfidence) : 0;
  const domIndexStart = typeof node.domIndexStart === "number" ? node.domIndexStart : 0;
  const domIndexEnd = typeof node.domIndexEnd === "number" ? node.domIndexEnd : domIndexStart;
  const layoutHintType = typeof node.layoutHintType === "string" ? node.layoutHintType : "unknown";
  const anomalies = Array.isArray(node.anomalies) ? node.anomalies.filter((v): v is string => typeof v === "string") : [];

  return {
    id: section.id,
    intent,
    structuralConfidence,
    domIndexStart,
    domIndexEnd,
    layoutHintType,
    anomalies,
  };
}

export function computePageStructuralConfidence(sections: Gnr8Section[]): {
  score: number;
  weakestSections: string[];
  anomalySummary: string[];
} {
  const metas = sections.map((section) => readSectionConfidenceMeta(section)).filter((meta): meta is SectionConfidenceMeta => meta !== null);

  if (metas.length === 0) {
    return {
      score: 0,
      weakestSections: [],
      anomalySummary: ["missing_structural_metadata"],
    };
  }

  const weighted = metas.reduce(
    (acc, meta) => {
      const span = Math.max(1, meta.domIndexEnd - meta.domIndexStart + 1);
      return {
        weightedSum: acc.weightedSum + meta.structuralConfidence * span,
        weightTotal: acc.weightTotal + span,
      };
    },
    { weightedSum: 0, weightTotal: 0 },
  );

  let score = weighted.weightTotal > 0 ? weighted.weightedSum / weighted.weightTotal : 0;

  const anomalySummary = new Set<string>();
  for (const meta of metas) {
    for (const anomaly of meta.anomalies) anomalySummary.add(anomaly);
  }

  const heroes = metas.filter((meta) => meta.intent === "hero");
  const heroMin = heroes.length > 0 ? Math.min(...heroes.map((meta) => meta.structuralConfidence)) : -1;
  if (heroMin >= 0 && heroMin < 0.4) {
    score -= 0.14;
    anomalySummary.add("hero_confidence_below_0_4");
  }

  const hasFooter = metas.some((meta) => meta.intent === "footer_legal");
  if (!hasFooter) {
    score -= 0.18;
    anomalySummary.add("footer_missing");
  }

  const hasNav = metas.some((meta) => meta.intent === "header_nav");
  const navInBody = metas.some(
    (meta) =>
      meta.intent === "body" &&
      (meta.layoutHintType === "nav" ||
        meta.anomalies.includes("nav_collapse_in_hero") ||
        meta.anomalies.includes("nav_body_content_mismatch")),
  );
  if (!hasNav && navInBody) {
    score -= 0.12;
    anomalySummary.add("nav_merged_into_body");
  }

  const hasGallery = metas.some((meta) => meta.intent === "gallery_media");
  const hasForm = metas.some((meta) => meta.intent === "form_contact");
  const collapseSignal = metas.some((meta) => meta.anomalies.includes("gallery_logo_cluster_mismatch") || meta.anomalies.includes("form_semantic_weak"));
  if ((!hasGallery || !hasForm) && collapseSignal) {
    score -= 0.1;
    anomalySummary.add("gallery_form_collapse");
  }

  const weakestSections = metas
    .slice()
    .sort((a, b) => a.structuralConfidence - b.structuralConfidence || a.domIndexStart - b.domIndexStart)
    .slice(0, 3)
    .map((meta) => meta.id);

  return {
    score: round3(score),
    weakestSections,
    anomalySummary: [...anomalySummary].sort(),
  };
}
