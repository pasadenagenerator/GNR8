import type {
  MigrationGateRecommendedAction,
  PageMigrationGateResult,
  PageMigrationGateState,
} from "@/gnr8/migration/quality-gates/page-quality-gate";

export type SiteMigrationGateState = "SITE_BROKEN" | "SITE_SHADOW_READY" | "SITE_CANARY_READY" | "SITE_PRODUCTION_READY";

export type SitePageMigrationGateRecord = {
  pageId: string;
  sourcePath: string;
  isRoot: boolean;
  state: PageMigrationGateState;
  score: number;
};

export type SiteMigrationGateInputPage = {
  pageId: string;
  sourcePath: string;
  isRoot?: boolean;
  gate: PageMigrationGateResult;
};

export type SiteMigrationGateResult = {
  state: SiteMigrationGateState;
  score: number;
  pageStates: SitePageMigrationGateRecord[];
  blockingPages: string[];
  summaryReasons: string[];
  recommendedAction: MigrationGateRecommendedAction;
};

function round3(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Number(Math.min(1, Math.max(0, value)).toFixed(3));
}

function uniqueSortedStrings(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function resolveRootPage(pages: SitePageMigrationGateRecord[]): SitePageMigrationGateRecord | null {
  const explicitRoot = pages
    .filter((page) => page.isRoot)
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId))[0];
  if (explicitRoot) return explicitRoot;

  const preferred = pages
    .slice()
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId))
    .find((page) => page.sourcePath === "/" || page.sourcePath === "index.html" || page.sourcePath === "/index.html");
  return preferred ?? pages[0] ?? null;
}

function isCanaryOrBetter(state: PageMigrationGateState): boolean {
  return state === "CANARY_CANDIDATE" || state === "PRODUCTION_CANDIDATE";
}

function recommendedActionFor(input: {
  state: SiteMigrationGateState;
  lowConfidenceCount: number;
}): MigrationGateRecommendedAction {
  if (input.state === "SITE_BROKEN") return "AI_REMEDIATION_RECOMMENDED";
  if (input.state === "SITE_SHADOW_READY") return input.lowConfidenceCount > 0 ? "REVIEW_REQUIRED" : "SHADOW_ONLY";
  if (input.state === "SITE_CANARY_READY") return "CANARY_ELIGIBLE";
  return "PRODUCTION_ELIGIBLE";
}

export function evaluateSiteMigrationGate(input: { pageResults: SiteMigrationGateInputPage[] }): SiteMigrationGateResult {
  const pageStates: SitePageMigrationGateRecord[] = (input.pageResults ?? [])
    .map((item) => ({
      pageId: item.pageId,
      sourcePath: item.sourcePath,
      isRoot: Boolean(item.isRoot),
      state: item.gate.state,
      score: round3(item.gate.score),
    }))
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId));

  if (pageStates.length === 0) {
    return {
      state: "SITE_BROKEN",
      score: 0,
      pageStates: [],
      blockingPages: [],
      summaryReasons: ["site_has_no_pages"],
      recommendedAction: "AI_REMEDIATION_RECOMMENDED",
    };
  }

  const rootPage = resolveRootPage(pageStates);
  if (!rootPage) {
    return {
      state: "SITE_BROKEN",
      score: 0,
      pageStates,
      blockingPages: [],
      summaryReasons: ["root_page_unresolvable"],
      recommendedAction: "AI_REMEDIATION_RECOMMENDED",
    };
  }

  const brokenPages = pageStates.filter((page) => page.state === "BROKEN");
  const lowConfidencePages = pageStates.filter((page) => page.state === "LOW_CONFIDENCE");
  const canaryOrBetterPages = pageStates.filter((page) => isCanaryOrBetter(page.state));
  const productionCandidatePages = pageStates.filter((page) => page.state === "PRODUCTION_CANDIDATE");

  const canaryOrBetterRatio = canaryOrBetterPages.length / pageStates.length;
  const productionRatio = productionCandidatePages.length / pageStates.length;
  const score = round3(pageStates.reduce((acc, page) => acc + page.score, 0) / pageStates.length);

  let state: SiteMigrationGateState = "SITE_SHADOW_READY";
  const summaryReasons: string[] = [];

  if (brokenPages.length > 0) {
    state = "SITE_BROKEN";
    summaryReasons.push("broken_pages_present");
  } else {
    const rootCanaryOrBetter = isCanaryOrBetter(rootPage.state);
    const canaryReady =
      rootCanaryOrBetter && lowConfidencePages.length === 0 && brokenPages.length === 0 && canaryOrBetterRatio >= 0.6;
    const productionReady =
      rootPage.state === "PRODUCTION_CANDIDATE" &&
      lowConfidencePages.length === 0 &&
      brokenPages.length === 0 &&
      canaryOrBetterRatio === 1 &&
      productionRatio >= 0.6;

    if (productionReady) {
      state = "SITE_PRODUCTION_READY";
      summaryReasons.push("root_page_is_production_candidate");
      summaryReasons.push("all_pages_canary_or_better");
      summaryReasons.push("production_candidate_ratio_meets_threshold");
    } else if (canaryReady) {
      state = "SITE_CANARY_READY";
      summaryReasons.push("root_page_is_canary_or_better");
      summaryReasons.push("site_canary_ratio_meets_threshold");
    } else {
      state = "SITE_SHADOW_READY";
      summaryReasons.push("site_requires_shadow_stage");
      if (!rootCanaryOrBetter) summaryReasons.push("root_page_not_canary_candidate");
      if (lowConfidencePages.length > 0) summaryReasons.push("low_confidence_pages_present");
    }
  }

  const blockingPages = uniqueSortedStrings(
    (state === "SITE_BROKEN" ? brokenPages : [...brokenPages, ...lowConfidencePages]).map((page) => page.pageId),
  );

  return {
    state,
    score,
    pageStates,
    blockingPages,
    summaryReasons: uniqueSortedStrings(summaryReasons),
    recommendedAction: recommendedActionFor({ state, lowConfidenceCount: lowConfidencePages.length }),
  };
}
