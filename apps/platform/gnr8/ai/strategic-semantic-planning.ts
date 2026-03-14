import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";

const ALLOWED_SUGGESTIONS = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
] as const;

type AllowedSuggestion = (typeof ALLOWED_SUGGESTIONS)[number];

export type StrategicSemanticPlanPriority = "low" | "medium" | "high";
export type StrategicSemanticPlanMode = "stabilize" | "improve" | "standardize" | "prepare-automation";

export type StrategicSemanticPlanFocusArea =
  | "structure"
  | "semantic-content"
  | "consistency"
  | "automation-readiness";

export type StrategicSemanticPlanStepType =
  | "site-coverage"
  | "site-consistency"
  | "page-semantic-improvement"
  | "automation-readiness";

export type StrategicSemanticPlanStep = {
  id: string;
  type: StrategicSemanticPlanStepType;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  targetPages: string[];
  targetSuggestions: AllowedSuggestion[];
  rationale: string[];
};

export type StrategicSemanticPlan = {
  planPriority: StrategicSemanticPlanPriority;
  planMode: StrategicSemanticPlanMode;
  focusArea: StrategicSemanticPlanFocusArea;
  steps: StrategicSemanticPlanStep[];
  summary: string;
  notes: string[];
};

type PageReview = ReturnType<typeof buildMigrationReviewSummary>;

function isAllowedSuggestion(value: string): value is AllowedSuggestion {
  return (ALLOWED_SUGGESTIONS as readonly string[]).includes(value);
}

function uniqStable(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function bySlug(a: string, b: string): number {
  return a.localeCompare(b);
}

function priorityRank(priority: "high" | "medium" | "low"): number {
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function areaRank(area: "hero" | "cta" | "faq" | "pricing" | "featureGrid" | "automation"): number {
  switch (area) {
    case "hero":
      return 1;
    case "cta":
      return 2;
    case "faq":
      return 3;
    case "pricing":
      return 4;
    case "featureGrid":
      return 5;
    case "automation":
      return 6;
    default:
      return 99;
  }
}

function stepSortKey(step: { priority: "high" | "medium" | "low"; __area: string; __slugKey: string }): string {
  const rank = String(10 - priorityRank(step.priority)).padStart(2, "0");
  const ar = String(areaRank(step.__area as any)).padStart(2, "0");
  return `${rank}-${ar}-${step.__slugKey}`;
}

function stepDedupeKey(step: StrategicSemanticPlanStep): string {
  return [
    step.type,
    step.title,
    step.description,
    step.priority,
    step.targetSuggestions.join("|"),
    step.targetPages.join("|"),
  ].join("::");
}

function getPlanMode(input: {
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticReasoning: StrategicSemanticReasoning;
}): StrategicSemanticPlanMode {
  const strategyType = input.strategicSemanticReasoning.semanticStrategyType;
  const health = input.siteSemanticIntelligence.semanticHealthLabel;
  const consistency = input.siteSemanticConsistency.consistencyLabel;
  const gaps = input.siteSemanticConsistency.consistencyGaps ?? [];
  const readiness = input.strategicSemanticReasoning.strategicReadiness.label;

  if (strategyType === "foundation-needed" || health === "low") return "stabilize";
  if (strategyType === "automation-phase" || readiness === "high") return "prepare-automation";
  if (strategyType === "structure-first") return "standardize";
  if ((consistency === "low" || consistency === "medium") && gaps.length > 0) return "standardize";
  if (strategyType === "content-first") return "improve";
  return "improve";
}

function getPlanPriority(input: {
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticReasoning: StrategicSemanticReasoning;
}): StrategicSemanticPlanPriority {
  const health = input.siteSemanticIntelligence.semanticHealthLabel;
  const consistency = input.siteSemanticConsistency.consistencyLabel;
  const bottlenecks = input.siteSemanticIntelligence.semanticBottleneckPages ?? [];
  const clusters = input.siteSemanticIntelligence.semanticWeaknessClusters ?? [];
  const readiness = input.strategicSemanticReasoning.strategicReadiness.label;

  if (health === "low") return "high";
  if (consistency === "low") return "high";
  if (bottlenecks.length >= 2) return "high";
  if (clusters.length >= 3) return "high";

  if (health === "medium") return "medium";
  if (readiness === "medium") return "medium";

  return "low";
}

function getFocusArea(reasoning: StrategicSemanticReasoning): StrategicSemanticPlanFocusArea {
  switch (reasoning.semanticExecutionPriority) {
    case "structural":
      return "structure";
    case "semantic":
      return "semantic-content";
    case "consistency":
      return "consistency";
    case "automation":
      return "automation-readiness";
    default:
      return "semantic-content";
  }
}

function buildSummary(input: {
  planPriority: StrategicSemanticPlanPriority;
  planMode: StrategicSemanticPlanMode;
  focusArea: StrategicSemanticPlanFocusArea;
}): string {
  const focus =
    input.focusArea === "structure"
      ? "structure"
      : input.focusArea === "semantic-content"
        ? "semantic content"
        : input.focusArea === "consistency"
          ? "consistency"
          : "automation readiness";

  const mode =
    input.planMode === "stabilize"
      ? "stabilizing weak site-wide semantic foundations"
      : input.planMode === "improve"
        ? "improving clustered semantic content weaknesses"
        : input.planMode === "standardize"
          ? "standardizing inconsistent semantic quality"
          : "preparing the site for semantic automation";

  return `Strategic semantic plan (${input.planPriority}) focuses on ${mode} with primary emphasis on ${focus}.`;
}

function buildNotes(input: {
  pagesInputCount: number;
  unresolvedPages: string[];
  planMode: StrategicSemanticPlanMode;
  focusArea: StrategicSemanticPlanFocusArea;
}): string[] {
  const notes: string[] = [];
  notes.push("Strategic semantic planning only; no changes are applied.");
  if (input.unresolvedPages.length > 0) {
    notes.push(`Unresolved pages: ${input.unresolvedPages.length}/${input.pagesInputCount}.`);
  }
  notes.push("Steps are grouped by shared semantic issues; per-page execution is out of scope.");
  if (input.planMode === "prepare-automation" || input.focusArea === "automation-readiness") {
    notes.push("Automation readiness step is governance-oriented; no automation is executed.");
  }
  return notes.slice(0, 5);
}

function hasSection(review: PageReview, sectionType: string): boolean {
  const counts = review.countsByType ?? {};
  return (counts[sectionType] ?? 0) > 0;
}

function coverageStepPriority(input: { coverage: number; threshold: number; missingCount: number }): "high" | "medium" | "low" {
  const deficit = input.threshold - input.coverage;
  if (deficit >= 25) return "high";
  if (deficit >= 10) return "medium";
  if (input.missingCount >= 3) return "medium";
  return "low";
}

function buildCoverageSteps(input: {
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  reviewsBySlug: Map<string, PageReview>;
  siteSemanticIntelligence: SiteSemanticIntelligence;
}): StrategicSemanticPlanStep[] {
  const coverage = input.siteSemanticIntelligence.semanticCoverage;
  const resolvedCount = input.resolvedPages.length;

  const areas: Array<{
    area: "hero" | "cta" | "faq" | "pricing" | "featureGrid";
    title: string;
    description: string;
    sectionType: string;
    threshold: number;
    coverageValue: number;
  }> = [
    {
      area: "hero",
      title: "Improve hero semantic coverage",
      description: "Ensure hero sections exist on key pages so site-wide messaging has a consistent entry point.",
      sectionType: "hero.split",
      threshold: 60,
      coverageValue: coverage.heroCoverage,
    },
    {
      area: "cta",
      title: "Improve CTA semantic coverage",
      description: "Ensure CTA sections exist on key pages so funnel progression is consistently expressed.",
      sectionType: "cta.simple",
      threshold: 60,
      coverageValue: coverage.ctaCoverage,
    },
    {
      area: "faq",
      title: "Improve FAQ semantic coverage",
      description: "Increase FAQ coverage to address objections consistently before deeper semantic automation.",
      sectionType: "faq.basic",
      threshold: 50,
      coverageValue: coverage.faqCoverage,
    },
    {
      area: "pricing",
      title: "Improve pricing semantic coverage",
      description: "Increase pricing coverage so decision-stage semantics are consistently present across the site.",
      sectionType: "pricing.basic",
      threshold: 50,
      coverageValue: coverage.pricingCoverage,
    },
    {
      area: "featureGrid",
      title: "Improve feature-grid semantic coverage",
      description: "Increase feature-grid coverage to standardize value framing across key pages.",
      sectionType: "feature.grid",
      threshold: 40,
      coverageValue: coverage.featureGridCoverage,
    },
  ];

  const out: Array<StrategicSemanticPlanStep & { __area: string; __slugKey: string }> = [];

  for (const a of areas) {
    if (a.coverageValue >= a.threshold) continue;

    const missingSlugs: string[] = [];
    for (const p of input.resolvedPages) {
      const review = input.reviewsBySlug.get(p.slug);
      if (!review) continue;
      if (!hasSection(review, a.sectionType)) missingSlugs.push(p.slug);
    }

    const targetPages = uniqStable(missingSlugs).sort(bySlug);
    const missingCount = targetPages.length;

    out.push({
      id: `site-coverage-${a.area}`,
      type: "site-coverage",
      title: a.title,
      description: a.description,
      priority: coverageStepPriority({ coverage: a.coverageValue, threshold: a.threshold, missingCount }),
      targetPages,
      targetSuggestions: [],
      rationale: [
        `Coverage is ${a.coverageValue}% (< ${a.threshold}%).`,
        resolvedCount > 0
          ? `${missingCount}/${resolvedCount} resolved pages are missing the supported section (${a.sectionType}).`
          : "No resolved pages; coverage assessment is based on 0 pages.",
      ],
      __area: a.area,
      __slugKey: targetPages.join("|"),
    });
  }

  out.sort((a, b) => stepSortKey(a).localeCompare(stepSortKey(b)));
  return out.map(({ __area: _a, __slugKey: _s, ...step }) => step);
}

function buildConsistencySteps(input: {
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  reviewsBySlug: Map<string, PageReview>;
  siteSemanticConsistency: SiteSemanticConsistency;
}): StrategicSemanticPlanStep[] {
  const label = input.siteSemanticConsistency.consistencyLabel;
  const gaps = input.siteSemanticConsistency.consistencyGaps ?? [];
  const dims = input.siteSemanticConsistency.consistencyDimensions;
  const inconsistentPages = (input.siteSemanticConsistency.inconsistentPages ?? []).slice().sort(bySlug);

  if (label === "high" && gaps.length === 0) return [];

  const dimsSpec: Array<{
    area: "hero" | "cta" | "faq" | "pricing";
    dimensionLabel: "low" | "medium" | "high";
    title: string;
    description: string;
    sectionType: string;
    suggestion: AllowedSuggestion;
  }> = [
    {
      area: "hero",
      dimensionLabel: dims.heroConsistency,
      title: "Standardize hero semantic quality",
      description: "Normalize hero clarity across pages to reduce cross-page variance in primary messaging.",
      sectionType: "hero.split",
      suggestion: "Improve hero clarity",
    },
    {
      area: "cta",
      dimensionLabel: dims.ctaConsistency,
      title: "Standardize CTA semantic quality",
      description: "Normalize CTA clarity across pages to reduce cross-page variance in funnel progression.",
      sectionType: "cta.simple",
      suggestion: "Improve CTA clarity",
    },
    {
      area: "faq",
      dimensionLabel: dims.faqConsistency,
      title: "Standardize FAQ completeness",
      description: "Normalize FAQ completeness across pages so objections handling is consistent site-wide.",
      sectionType: "faq.basic",
      suggestion: "Normalize FAQ content",
    },
    {
      area: "pricing",
      dimensionLabel: dims.pricingConsistency,
      title: "Standardize pricing messaging completeness",
      description: "Normalize pricing completeness across pages to reduce decision-stage messaging variance.",
      sectionType: "pricing.basic",
      suggestion: "Complete pricing content",
    },
  ];

  const resolvedSlugsWithSection = (sectionType: string): string[] => {
    const slugs: string[] = [];
    for (const p of input.resolvedPages) {
      const review = input.reviewsBySlug.get(p.slug);
      if (!review) continue;
      if (hasSection(review, sectionType)) slugs.push(p.slug);
    }
    return uniqStable(slugs).sort(bySlug);
  };

  const out: Array<StrategicSemanticPlanStep & { __area: string; __slugKey: string }> = [];

  for (const d of dimsSpec) {
    if (d.dimensionLabel === "high") continue;

    const candidates = inconsistentPages.filter((slug) => {
      const review = input.reviewsBySlug.get(slug);
      return !!review && hasSection(review, d.sectionType);
    });

    const fallbackAllWithSection = resolvedSlugsWithSection(d.sectionType);
    const targetPages = candidates.length > 0 ? candidates : fallbackAllWithSection;

    const stepPriority: "high" | "medium" | "low" =
      d.dimensionLabel === "low" ? "high" : d.dimensionLabel === "medium" ? "medium" : "low";

    const relevantGaps = gaps.filter((g) => g.toLowerCase().includes(d.area));
    const gapHint = relevantGaps.length > 0 ? relevantGaps[0] : undefined;

    out.push({
      id: `site-consistency-${d.area}`,
      type: "site-consistency",
      title: d.title,
      description: d.description,
      priority: stepPriority,
      targetPages,
      targetSuggestions: [d.suggestion],
      rationale: uniqStable(
        [
          `Site consistencyLabel="${label}" with ${d.area}Consistency="${d.dimensionLabel}".`,
          gapHint ? `Consistency gap: ${gapHint}` : "",
        ].filter(Boolean),
      ),
      __area: d.area,
      __slugKey: targetPages.join("|"),
    });
  }

  out.sort((a, b) => stepSortKey(a).localeCompare(stepSortKey(b)));
  return out.map(({ __area: _a, __slugKey: _s, ...step }) => step);
}

function buildPageSemanticImprovementSteps(input: {
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  reviewsBySlug: Map<string, PageReview>;
  siteSemanticIntelligence: SiteSemanticIntelligence;
}): StrategicSemanticPlanStep[] {
  const resolvedCount = input.resolvedPages.length;
  const weaknessClusters = new Set(input.siteSemanticIntelligence.semanticWeaknessClusters ?? []);

  const pagesBySuggestion = new Map<AllowedSuggestion, string[]>();
  for (const p of input.resolvedPages) {
    const review = input.reviewsBySlug.get(p.slug);
    const raw = review?.semanticOptimizationSuggestions ?? [];
    const suggestions = Array.isArray(raw) ? raw : [];
    for (const s of suggestions) {
      if (!isAllowedSuggestion(s)) continue;
      const list = pagesBySuggestion.get(s) ?? [];
      list.push(p.slug);
      pagesBySuggestion.set(s, list);
    }
  }

  const specs: Array<{
    suggestion: AllowedSuggestion;
    area: "hero" | "cta" | "faq" | "pricing" | "featureGrid";
    title: string;
    description: (count: number) => string;
  }> = [
    {
      suggestion: "Improve hero clarity",
      area: "hero",
      title: "Improve hero clarity on weak pages",
      description: (count) => `Grouped hero semantic improvements across ${count} page(s).`,
    },
    {
      suggestion: "Improve CTA clarity",
      area: "cta",
      title: "Improve CTA clarity on weak pages",
      description: (count) => `Grouped CTA semantic improvements across ${count} page(s).`,
    },
    {
      suggestion: "Normalize FAQ content",
      area: "faq",
      title: "Normalize FAQ content on inconsistent pages",
      description: (count) => `Grouped FAQ normalization across ${count} page(s).`,
    },
    {
      suggestion: "Complete pricing content",
      area: "pricing",
      title: "Complete pricing content on incomplete pages",
      description: (count) => `Grouped pricing completion across ${count} page(s).`,
    },
    {
      suggestion: "Complete feature grid content",
      area: "featureGrid",
      title: "Complete feature-grid content on weak pages",
      description: (count) => `Grouped feature-grid completion across ${count} page(s).`,
    },
  ];

  const out: Array<StrategicSemanticPlanStep & { __area: string; __slugKey: string }> = [];

  for (const spec of specs) {
    const pages = uniqStable(pagesBySuggestion.get(spec.suggestion) ?? []).sort(bySlug);
    if (pages.length === 0) continue;

    const count = pages.length;
    const stepPriority: "high" | "medium" | "low" = count >= 3 ? "high" : count === 2 ? "medium" : "low";

    const rationale: string[] = [];
    rationale.push(`"${spec.suggestion}" appears on ${count}/${resolvedCount} resolved pages.`);
    if (weaknessClusters.has(spec.suggestion)) {
      rationale.push(`Weakness cluster detected for "${spec.suggestion}".`);
    }

    out.push({
      id: `page-semantic-improvement-${spec.area}`,
      type: "page-semantic-improvement",
      title: spec.title,
      description: spec.description(count),
      priority: stepPriority,
      targetPages: pages,
      targetSuggestions: [spec.suggestion],
      rationale,
      __area: spec.area,
      __slugKey: pages.join("|"),
    });
  }

  out.sort((a, b) => stepSortKey(a).localeCompare(stepSortKey(b)));
  return out.map(({ __area: _a, __slugKey: _s, ...step }) => step);
}

function buildAutomationReadinessStep(input: {
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  reviewsBySlug: Map<string, PageReview>;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  strategicSemanticReasoning: StrategicSemanticReasoning;
  planMode: StrategicSemanticPlanMode;
}): StrategicSemanticPlanStep | null {
  const strategicReadiness = input.strategicSemanticReasoning.strategicReadiness.label;
  const readinessLabels: Array<string> = [];

  const notCandidate: string[] = [];
  for (const p of input.resolvedPages) {
    const review = input.reviewsBySlug.get(p.slug);
    const label = review?.semanticAutomationReadiness?.label ?? "not-ready";
    readinessLabels.push(label);
    if (label !== "automation-candidate") notCandidate.push(p.slug);
  }

  const allAutomationCandidate =
    input.resolvedPages.length > 0 && readinessLabels.length > 0 && readinessLabels.every((l) => l === "automation-candidate");

  const shouldGenerate =
    input.planMode === "prepare-automation" || (strategicReadiness !== "low" && !allAutomationCandidate);

  if (!shouldGenerate) return null;

  const bottlenecks = input.siteSemanticIntelligence.semanticBottleneckPages ?? [];
  const targetPages = uniqStable([...bottlenecks, ...notCandidate]).sort(bySlug);

  const anyNotReady = readinessLabels.some((l) => l === "not-ready");
  const anyReviewNeeded = readinessLabels.some((l) => l === "review-needed");
  const priority: "high" | "medium" | "low" = anyNotReady ? "high" : anyReviewNeeded ? "medium" : "low";

  return {
    id: "automation-readiness-governance",
    type: "automation-readiness",
    title: "Stabilize semantic quality before automation",
    description:
      "Address bottleneck pages and readiness gaps so future semantic automation can run against a stable, consistent baseline.",
    priority,
    targetPages,
    targetSuggestions: [],
    rationale: uniqStable([
      `Strategic readiness is "${strategicReadiness}".`,
      `Site automation readiness is "${input.siteSemanticIntelligence.semanticAutomationReadiness.label}".`,
      bottlenecks.length > 0 ? `Semantic bottleneck pages detected: ${bottlenecks.length}.` : "",
      allAutomationCandidate ? "All resolved pages are already automation-candidates." : "Automation readiness is not uniform across pages.",
    ].filter(Boolean)),
  };
}

function compactStrategicSemanticSteps(input: {
  coverageSteps: StrategicSemanticPlanStep[];
  consistencySteps: StrategicSemanticPlanStep[];
  improvementSteps: StrategicSemanticPlanStep[];
  automationStep: StrategicSemanticPlanStep | null;
  maxSteps: number;
}): StrategicSemanticPlanStep[] {
  const ordered = [
    ...input.coverageSteps,
    ...input.consistencySteps,
    ...input.improvementSteps,
  ];

  const deduped: StrategicSemanticPlanStep[] = [];
  const seen = new Set<string>();
  for (const step of ordered) {
    const key = stepDedupeKey(step);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(step);
  }

  const reserveAutomation = input.automationStep ? 1 : 0;
  const baseLimit = Math.max(0, input.maxSteps - reserveAutomation);
  const base = deduped.slice(0, baseLimit);

  if (input.automationStep) return [...base, input.automationStep].slice(0, input.maxSteps);
  return base.slice(0, input.maxSteps);
}

export function buildStrategicSemanticPlan(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticReasoning: StrategicSemanticReasoning;
}): StrategicSemanticPlan {
  const reviewsBySlug = new Map<string, PageReview>();
  for (const p of input.resolvedPages) {
    reviewsBySlug.set(p.slug, buildMigrationReviewSummary(p.page));
  }

  const planMode = getPlanMode({
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    strategicSemanticReasoning: input.strategicSemanticReasoning,
  });

  const planPriority = getPlanPriority({
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    strategicSemanticReasoning: input.strategicSemanticReasoning,
  });

  const focusArea = getFocusArea(input.strategicSemanticReasoning);

  const coverageSteps = buildCoverageSteps({
    resolvedPages: input.resolvedPages,
    reviewsBySlug,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
  });

  const consistencySteps = buildConsistencySteps({
    resolvedPages: input.resolvedPages,
    reviewsBySlug,
    siteSemanticConsistency: input.siteSemanticConsistency,
  });

  const improvementSteps = buildPageSemanticImprovementSteps({
    resolvedPages: input.resolvedPages,
    reviewsBySlug,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
  });

  const automationStep = buildAutomationReadinessStep({
    resolvedPages: input.resolvedPages,
    reviewsBySlug,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    strategicSemanticReasoning: input.strategicSemanticReasoning,
    planMode,
  });

  const steps = compactStrategicSemanticSteps({
    coverageSteps,
    consistencySteps,
    improvementSteps,
    automationStep,
    maxSteps: 8,
  });

  return {
    planPriority,
    planMode,
    focusArea,
    steps,
    summary: buildSummary({ planPriority, planMode, focusArea }),
    notes: buildNotes({
      pagesInputCount: input.pages.length,
      unresolvedPages: input.unresolvedPages,
      planMode,
      focusArea,
    }),
  };
}

