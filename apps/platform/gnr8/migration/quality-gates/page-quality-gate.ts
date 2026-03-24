import { CONFIDENCE_ACCEPTABLE, CONFIDENCE_BROKEN, CONFIDENCE_STRONG, CONFIDENCE_WEAK } from "@/gnr8/migration/layout-graph/structural-confidence-thresholds";

export type PageMigrationGateState =
  | "BROKEN"
  | "LOW_CONFIDENCE"
  | "SHADOW_READY"
  | "CANARY_CANDIDATE"
  | "PRODUCTION_CANDIDATE";

export type MigrationGateRecommendedAction =
  | "REVIEW_REQUIRED"
  | "SHADOW_ONLY"
  | "CANARY_ELIGIBLE"
  | "PRODUCTION_NOT_READY"
  | "PRODUCTION_ELIGIBLE"
  | "AI_REMEDIATION_RECOMMENDED";

export type PageGateIntent = "header_nav" | "hero" | "body" | "gallery_media" | "form_contact" | "footer_legal" | "unknown";

export type PageMigrationGateInput = {
  pageStructuralConfidence: number;
  weakSectionIds: string[];
  structuralAnomalies: string[];
  sectionIntents?: string[];
  sectionIntentConfidence?: Partial<Record<PageGateIntent, number>>;
};

export type PageMigrationGateResult = {
  state: PageMigrationGateState;
  score: number;
  reasons: string[];
  weakSectionIds: string[];
  anomalySummary: string[];
  recommendedAction: MigrationGateRecommendedAction;
};

const CORE_INTENTS: readonly PageGateIntent[] = ["header_nav", "hero", "footer_legal"];
const MAJOR_REGION_INTENTS: readonly PageGateIntent[] = ["header_nav", "hero", "body", "footer_legal"];

const SEVERE_ANOMALY_CODES = new Set<string>([
  "missing_structural_metadata",
  "nav_merged_into_body",
  "gallery_form_collapse",
]);

const MAJOR_ANOMALY_CODES = new Set<string>([
  "missing_structural_metadata",
  "nav_merged_into_body",
  "gallery_form_collapse",
  "footer_missing",
  "hero_confidence_below_0_4",
]);

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round3(value: number): number {
  return Number(clamp01(value).toFixed(3));
}

function isIntent(value: string): value is PageGateIntent {
  return (
    value === "header_nav" ||
    value === "hero" ||
    value === "body" ||
    value === "gallery_media" ||
    value === "form_contact" ||
    value === "footer_legal" ||
    value === "unknown"
  );
}

function normalizeIntents(intents: string[] | undefined): Set<PageGateIntent> {
  const out = new Set<PageGateIntent>();
  for (const intent of intents ?? []) {
    if (isIntent(intent)) out.add(intent);
  }
  return out;
}

function coreConfidenceMin(input: {
  intents: Set<PageGateIntent>;
  sectionIntentConfidence: Partial<Record<PageGateIntent, number>>;
}): number | null {
  const values: number[] = [];
  for (const intent of CORE_INTENTS) {
    if (!input.intents.has(intent)) continue;
    const value = input.sectionIntentConfidence[intent];
    if (typeof value === "number" && Number.isFinite(value)) values.push(clamp01(value));
  }
  if (values.length === 0) return null;
  return Math.min(...values);
}

function hasStableMajorRegionConfidence(input: {
  intents: Set<PageGateIntent>;
  sectionIntentConfidence: Partial<Record<PageGateIntent, number>>;
}): boolean {
  const values: number[] = [];
  for (const intent of MAJOR_REGION_INTENTS) {
    if (!input.intents.has(intent)) continue;
    const value = input.sectionIntentConfidence[intent];
    if (typeof value === "number" && Number.isFinite(value)) values.push(clamp01(value));
  }
  if (values.length < 3) return false;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min >= CONFIDENCE_STRONG && max - min <= 0.22;
}

function recommendedActionFor(input: {
  state: PageMigrationGateState;
  score: number;
  severeAnomalies: string[];
}): MigrationGateRecommendedAction {
  if (input.state === "BROKEN") return "AI_REMEDIATION_RECOMMENDED";
  if (input.state === "LOW_CONFIDENCE") {
    if (input.score < CONFIDENCE_WEAK || input.severeAnomalies.length > 0) return "AI_REMEDIATION_RECOMMENDED";
    return "REVIEW_REQUIRED";
  }
  if (input.state === "SHADOW_READY") return "SHADOW_ONLY";
  if (input.state === "CANARY_CANDIDATE") return "CANARY_ELIGIBLE";
  return "PRODUCTION_ELIGIBLE";
}

export function evaluatePageMigrationGate(input: PageMigrationGateInput): PageMigrationGateResult {
  const score = round3(input.pageStructuralConfidence);
  const anomalySummary = [...new Set((input.structuralAnomalies ?? []).filter((v): v is string => typeof v === "string"))].sort();
  const weakSectionIds = [...new Set((input.weakSectionIds ?? []).filter((v): v is string => typeof v === "string"))].sort();

  const sectionIntentConfidence = input.sectionIntentConfidence ?? {};
  const intents = normalizeIntents(input.sectionIntents);
  const missingCore = CORE_INTENTS.filter((intent) => !intents.has(intent));
  const severeAnomalies = anomalySummary.filter((code) => SEVERE_ANOMALY_CODES.has(code));
  const majorAnomalies = anomalySummary.filter((code) => MAJOR_ANOMALY_CODES.has(code));

  const reasons: string[] = [];
  let state: PageMigrationGateState = "SHADOW_READY";

  const coreMin = coreConfidenceMin({ intents, sectionIntentConfidence });
  const hasCore = missingCore.length === 0;
  const weakCoreConfidence = coreMin !== null && coreMin < CONFIDENCE_ACCEPTABLE;

  if (score < CONFIDENCE_BROKEN) {
    state = "BROKEN";
    reasons.push("score_below_broken_threshold");
  } else if (anomalySummary.includes("missing_structural_metadata")) {
    state = "BROKEN";
    reasons.push("missing_structural_metadata");
  } else if (missingCore.length >= 2) {
    state = "BROKEN";
    reasons.push("multiple_core_regions_missing");
  } else if (score < CONFIDENCE_ACCEPTABLE) {
    state = "LOW_CONFIDENCE";
    reasons.push("score_below_acceptable_threshold");
  } else if (weakCoreConfidence) {
    state = "LOW_CONFIDENCE";
    reasons.push("core_region_confidence_below_acceptable");
  } else if (severeAnomalies.length > 0) {
    state = "LOW_CONFIDENCE";
    reasons.push("severe_structural_anomalies_detected");
  } else {
    state = "SHADOW_READY";
    reasons.push("score_meets_shadow_threshold");

    const canaryEligible =
      score >= CONFIDENCE_STRONG &&
      hasCore &&
      majorAnomalies.length === 0 &&
      (coreMin === null || coreMin >= CONFIDENCE_ACCEPTABLE);

    if (canaryEligible) {
      state = "CANARY_CANDIDATE";
      reasons.push("strong_confidence_and_core_structure_present");

      const productionEligible =
        score >= 0.9 &&
        anomalySummary.length === 0 &&
        weakSectionIds.length === 0 &&
        (coreMin ?? 0) >= CONFIDENCE_STRONG &&
        hasStableMajorRegionConfidence({ intents, sectionIntentConfidence });

      if (productionEligible) {
        state = "PRODUCTION_CANDIDATE";
        reasons.push("very_strong_stable_structure");
      }
    } else {
      reasons.push("canary_prerequisites_not_met");
    }
  }

  if (!hasCore) reasons.push(`missing_core_regions:${missingCore.join(",")}`);
  if (majorAnomalies.length > 0) reasons.push(`major_anomalies:${majorAnomalies.join(",")}`);

  return {
    state,
    score,
    reasons,
    weakSectionIds,
    anomalySummary,
    recommendedAction: recommendedActionFor({ state, score, severeAnomalies }),
  };
}
