import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import type { MixedWaveExecutionDesign, MixedWaveExecutionStructuralActionClass } from "@/gnr8/ai/mixed-wave-execution-design";
import type { StrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import type { StrategicSemanticPlan, StrategicSemanticPlanStep } from "@/gnr8/ai/strategic-semantic-planning";
import type { Gnr8Page } from "@/gnr8/types/page";

export type MixedWavePreviewDesignEligibility = "not-eligible" | "partially-eligible" | "future-eligible";
export type MixedWavePreviewDesignStatus = "blocked" | "review-needed" | "preview-ready";

export type MixedWavePreviewDesignWavePreview = {
  waveId: string;
  label: string;
  purpose: string;

  mixedEligibility: MixedWavePreviewDesignEligibility;
  previewStatus: MixedWavePreviewDesignStatus;

  structuralActionClasses: string[];
  semanticActionClasses: string[];

  supportedStructuralClasses: string[];
  blockedStructuralClasses: string[];
  supportedSemanticClasses: string[];

  expectedStructuralEffects: string[];
  expectedSemanticEffects: string[];

  targetPages: string[];
  executableTargetPages: string[];
  blockedTargetPages: string[];
  deferredTargetPages: string[];

  rationale: string[];
};

export type MixedWavePreviewDesign = {
  previewMode: "design-only";
  executionModel: "phase-separated";

  wavePreviews: MixedWavePreviewDesignWavePreview[];

  blockedWaveIds: string[];
  partiallyEligibleWaveIds: string[];
  futureEligibleWaveIds: string[];

  summary: string;
  notes: string[];
};

const STRUCTURAL_ORDER: Array<Exclude<MixedWaveExecutionStructuralActionClass, "content-improvement">> = [
  "cleanup",
  "merge",
  "normalize",
  "reorder",
  "add-section",
  "replace-section",
  "redesign",
];

const SEMANTIC_EFFECT_ORDER = ["hero", "cta", "faq", "pricing", "featureGrid"] as const;

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

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function structuralClassOrderKey(actionClass: string): number {
  const idx = STRUCTURAL_ORDER.indexOf(actionClass as any);
  return idx === -1 ? 999 : idx;
}

function sortStructuralClasses(values: string[]): string[] {
  return uniqStable(values).sort((a, b) => structuralClassOrderKey(a) - structuralClassOrderKey(b));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractSuggestionStrings(review: ReturnType<typeof buildMigrationReviewSummary>): string[] {
  const suggestions: string[] = [];
  const a = Array.isArray(review.suggestedActions) ? review.suggestedActions : [];
  const b = Array.isArray(review.optimizationSuggestions) ? review.optimizationSuggestions : [];
  suggestions.push(...a, ...b);
  return suggestions
    .filter((s) => typeof s === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

function detectStructuralActionClassesForReview(
  review: ReturnType<typeof buildMigrationReviewSummary>,
): Array<Exclude<MixedWaveExecutionStructuralActionClass, "content-improvement">> {
  const present = new Set<Exclude<MixedWaveExecutionStructuralActionClass, "content-improvement">>();

  const duplicates = Array.isArray(review.duplicateDetails) ? review.duplicateDetails : [];
  if (duplicates.some((d) => d?.similarity === "exact-duplicate")) present.add("cleanup");
  if (duplicates.some((d) => d?.mergeEligible)) present.add("merge");

  const suggestions = extractSuggestionStrings(review);
  for (const raw of suggestions) {
    const s = raw.trim();
    if (!s) continue;

    if (/^remove duplicate\b/i.test(s) || /^remove exact duplicate\b/i.test(s)) present.add("cleanup");
    if (/^merge\b/i.test(s)) present.add("merge");
    if (/^add\b/i.test(s) || /^introduce\b/i.test(s)) present.add("add-section");
    if (/^replace\b/i.test(s)) present.add("replace-section");
    if (/^move\b/i.test(s) || /^fix layout\b/i.test(s) || /^normalize\b/i.test(s)) present.add("normalize");
  }

  const layout = review.layoutIssues;
  if (layout && Object.values(layout).some(Boolean)) present.add("normalize");

  const redesignPlan = review.redesignPlan;
  if (redesignPlan && (redesignPlan.strategy === "full-rebuild" || redesignPlan.priority === "high")) {
    present.add("redesign");
  }

  if (redesignPlan && Array.isArray(redesignPlan.structuralChanges)) {
    if (redesignPlan.structuralChanges.some((c) => /^reorder\b/i.test(String(c ?? "").trim()))) {
      present.add("reorder");
    }
    if (redesignPlan.structuralChanges.some((c) => /^replace\b/i.test(String(c ?? "").trim()))) {
      present.add("replace-section");
    }
    if (redesignPlan.structuralChanges.some((c) => /^reconstruct\b/i.test(String(c ?? "").trim()))) {
      present.add("redesign");
    }
  }

  return sortStructuralClasses(Array.from(present)) as any;
}

function hasStructuralWorkForSteps(steps: StrategicSemanticPlanStep[]): boolean {
  return steps.some((s) => s.type === "site-coverage" || s.type === "site-consistency" || s.type === "automation-readiness");
}

function hasSemanticWorkForSteps(steps: StrategicSemanticPlanStep[]): boolean {
  return steps.some((s) => s.type === "page-semantic-improvement" || s.type === "site-consistency" || s.type === "automation-readiness");
}

function buildExpectedStructuralEffects(structuralActionClasses: string[]): string[] {
  const present = new Set(structuralActionClasses);
  const effects: string[] = [];

  if (present.has("cleanup")) effects.push("Duplicate sections may be cleaned up.");
  if (present.has("merge")) effects.push("Supported duplicate sections may be merged.");
  if (present.has("normalize")) effects.push("Section layout may be normalized.");
  if (present.has("reorder")) effects.push("Section reordering would require a later mixed phase.");
  if (present.has("add-section")) effects.push("Section insertion would require a later mixed phase.");
  if (present.has("replace-section")) effects.push("Section replacement would require a later mixed phase.");
  if (present.has("redesign")) effects.push("Redesign actions remain advisory only.");

  return effects.slice(0, 6);
}

function semanticEffectKindForSuggestion(suggestion: string): (typeof SEMANTIC_EFFECT_ORDER)[number] | null {
  const s = String(suggestion ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "improve hero clarity") return "hero";
  if (s === "improve cta clarity") return "cta";
  if (s === "normalize faq content") return "faq";
  if (s === "complete pricing content") return "pricing";
  if (s === "complete feature grid content") return "featureGrid";
  return null;
}

function buildExpectedSemanticEffects(input: {
  hasSemanticWork: boolean;
  resolvedTargetPages: Array<{ slug: string; page: Gnr8Page }>;
}): string[] {
  if (!input.hasSemanticWork) return [];

  const kinds = new Set<(typeof SEMANTIC_EFFECT_ORDER)[number]>();
  for (const p of input.resolvedTargetPages) {
    const review = buildMigrationReviewSummary(p.page);
    const suggestions = Array.isArray(review.semanticOptimizationSuggestions) ? review.semanticOptimizationSuggestions : [];
    for (const s of suggestions) {
      const kind = semanticEffectKindForSuggestion(s);
      if (kind) kinds.add(kind);
    }
  }

  const effectsByKind: Record<(typeof SEMANTIC_EFFECT_ORDER)[number], string> = {
    hero: "Hero messaging may be improved.",
    cta: "CTA clarity may be improved.",
    faq: "FAQ content may be normalized.",
    pricing: "Pricing content may be completed.",
    featureGrid: "Feature-grid content may be completed.",
  };

  const effects: string[] = [];
  for (const kind of SEMANTIC_EFFECT_ORDER) {
    if (!kinds.has(kind)) continue;
    effects.push(effectsByKind[kind]);
  }
  return effects.slice(0, 5);
}

function findClassDesign(
  mixedWaveExecutionDesign: MixedWaveExecutionDesign,
  actionClass: string,
): MixedWaveExecutionDesign["structuralActionClasses"][number] | null {
  const classes = Array.isArray(mixedWaveExecutionDesign?.structuralActionClasses) ? mixedWaveExecutionDesign.structuralActionClasses : [];
  return classes.find((c) => c?.actionClass === actionClass) ?? null;
}

function getSupportedStructuralClasses(input: {
  mixedWaveExecutionDesign: MixedWaveExecutionDesign;
  structuralActionClasses: string[];
}): string[] {
  const out: string[] = [];
  for (const c of sortStructuralClasses(input.structuralActionClasses)) {
    const d = findClassDesign(input.mixedWaveExecutionDesign, c);
    if (d?.allowedInMixedWaves) out.push(c);
  }
  return out;
}

function getBlockedStructuralClasses(input: {
  mixedWaveExecutionDesign: MixedWaveExecutionDesign;
  structuralActionClasses: string[];
}): string[] {
  const out: string[] = [];
  for (const c of sortStructuralClasses(input.structuralActionClasses)) {
    const d = findClassDesign(input.mixedWaveExecutionDesign, c);
    if (!d) continue;
    const notAllowed = d.allowedInMixedWaves === false;
    const notInConservativePhase = d.rolloutPhase !== "future-phase-1";
    if (notAllowed || notInConservativePhase) out.push(c);
  }
  return uniqStable(out);
}

function splitWaveTargetPages(input: {
  targetPages: string[];
  resolvedBySlug: Map<string, Gnr8Page>;
  unresolvedPages: Set<string>;
  hasSemanticWork: boolean;
  waveStructuralActionClasses: string[];
  mixedWaveExecutionDesign: MixedWaveExecutionDesign;
}): {
  executableTargetPages: string[];
  blockedTargetPages: string[];
  deferredTargetPages: string[];
} {
  const executable: string[] = [];
  const blocked: string[] = [];
  const deferred: string[] = [];

  const laterPhaseStructuralClasses = new Set<string>();
  const disallowedStructuralClasses = new Set<string>();

  for (const c of sortStructuralClasses(input.waveStructuralActionClasses)) {
    const d = findClassDesign(input.mixedWaveExecutionDesign, c);
    if (!d) continue;
    if (d.allowedInMixedWaves === false || d.rolloutPhase === "never") disallowedStructuralClasses.add(c);
    else if (d.rolloutPhase !== "future-phase-1") laterPhaseStructuralClasses.add(c);
  }

  for (const slugRaw of input.targetPages) {
    const slug = normalizeSlug(slugRaw);
    if (!slug) continue;

    if (input.unresolvedPages.has(slug) || !input.resolvedBySlug.has(slug)) {
      blocked.push(slug);
      continue;
    }

    const page = input.resolvedBySlug.get(slug)!;
    const review = buildMigrationReviewSummary(page);

    if (input.hasSemanticWork && review.semanticAutomationReadiness?.label === "not-ready") {
      blocked.push(slug);
      continue;
    }

    const pageStructural = detectStructuralActionClassesForReview(review).filter((c) => input.waveStructuralActionClasses.includes(c));
    const hasDisallowedStructural = pageStructural.some((c) => disallowedStructuralClasses.has(c));
    if (hasDisallowedStructural) {
      if (input.hasSemanticWork) deferred.push(slug);
      else blocked.push(slug);
      continue;
    }

    const hasLaterPhaseStructural = pageStructural.some((c) => laterPhaseStructuralClasses.has(c));
    if (hasLaterPhaseStructural) {
      deferred.push(slug);
      continue;
    }

    executable.push(slug);
  }

  return {
    executableTargetPages: uniqStable(executable),
    blockedTargetPages: uniqStable(blocked),
    deferredTargetPages: uniqStable(deferred),
  };
}

function classifyMixedWaveEligibility(input: {
  readinessLabel: MixedWaveExecutionDesign["readinessLabel"];
  supportedStructuralClasses: string[];
  supportedSemanticClasses: string[];
  structuralActionClasses: string[];
  blockedStructuralClasses: string[];
  blockedTargetPages: string[];
  deferredTargetPages: string[];
  executableTargetPages: string[];
}): MixedWavePreviewDesignEligibility {
  const readinessOk = input.readinessLabel === "semantic-only" || input.readinessLabel === "mixed-design-ready";
  if (!readinessOk) return "not-eligible";

  const anySupported = input.supportedStructuralClasses.length > 0 || input.supportedSemanticClasses.length > 0;
  if (!anySupported) return "not-eligible";

  const hasOnlyBlockedStructural =
    input.structuralActionClasses.length > 0 &&
    input.blockedStructuralClasses.length === input.structuralActionClasses.length &&
    input.supportedSemanticClasses.length === 0;
  if (hasOnlyBlockedStructural) return "not-eligible";

  const cleanTargets = input.blockedTargetPages.length === 0 && input.deferredTargetPages.length === 0 && input.executableTargetPages.length > 0;
  const cleanClasses = input.blockedStructuralClasses.length === 0;
  if (cleanTargets && cleanClasses) return "future-eligible";

  return "partially-eligible";
}

function toPreviewStatus(eligibility: MixedWavePreviewDesignEligibility): MixedWavePreviewDesignStatus {
  if (eligibility === "future-eligible") return "preview-ready";
  if (eligibility === "partially-eligible") return "review-needed";
  return "blocked";
}

function buildRationale(input: {
  eligibility: MixedWavePreviewDesignEligibility;
  hasLaterPhaseStructural: boolean;
  hasBlockedStructural: boolean;
  hasBlockedTargets: boolean;
  hasDeferredTargets: boolean;
}): string[] {
  const rationale: string[] = [];

  if (input.eligibility === "future-eligible") {
    rationale.push("This wave includes classes already suitable for early mixed-wave phases.");
    rationale.push("This wave is preview-ready only under phase-separated rollout.");
  } else if (input.eligibility === "partially-eligible") {
    if (input.hasLaterPhaseStructural) rationale.push("This wave mixes early-phase and later-phase structural classes.");
    if (input.hasBlockedStructural) rationale.push("This wave includes structural classes that remain blocked under the current design.");
    rationale.push("This wave is preview-ready only under phase-separated rollout.");
  } else {
    if (input.hasBlockedStructural) rationale.push("This wave remains blocked because redesign is advisory only.");
    if (input.hasBlockedTargets) rationale.push("Some target pages remain blocked by readiness constraints.");
    else rationale.push("This wave is not eligible under the current mixed-wave design constraints.");
  }

  if (input.hasDeferredTargets && rationale.length < 4) {
    rationale.push("Some target pages should be deferred to a later phase under conservative rollout.");
  }
  if (input.hasBlockedTargets && input.eligibility !== "not-eligible" && rationale.length < 4) {
    rationale.push("Some target pages remain blocked by readiness constraints.");
  }

  return rationale.slice(0, 4);
}

function buildSummary(input: {
  blocked: number;
  partial: number;
  future: number;
  executionModel: MixedWavePreviewDesign["executionModel"];
}): string {
  if (input.future === 0 && input.partial === 0 && input.blocked > 0) {
    return "Mixed-wave preview remains blocked under the current design constraints.";
  }
  if (input.future > 0) {
    return "Mixed-wave preview shows future-eligible phases under conservative rollout design.";
  }
  if (input.partial > 0) {
    return "Mixed-wave preview indicates phased mixed eligibility with review-required boundaries.";
  }
  return `Mixed-wave preview design is available under ${input.executionModel} rollout.`;
}

function buildNotes(input: {
  unresolvedPages: string[];
  executionModel: MixedWavePreviewDesign["executionModel"];
  anyBlockedStructuralClasses: boolean;
  mixedWaveExecutionDesign: MixedWaveExecutionDesign;
}): string[] {
  const notes: string[] = [];
  notes.push("Mixed-wave preview design only; no changes are applied.");
  notes.push(`Execution model: ${input.executionModel}.`);

  if (input.unresolvedPages.length > 0) {
    notes.push(`Unresolved pages: ${input.unresolvedPages.length}.`);
  }

  if (input.anyBlockedStructuralClasses) {
    notes.push("Some structural classes are blocked or deferred by conservative phases.");
  }

  if (input.mixedWaveExecutionDesign.readinessLabel === "semantic-only") {
    notes.push("Runtime remains semantic-only; mixed structural execution is not enabled.");
  }

  return notes.slice(0, 5);
}

export function buildMixedWavePreviewDesign(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  waveId?: string;
  strategicExecutionOrchestration: StrategicExecutionOrchestration;
  strategicSemanticPlan: StrategicSemanticPlan;
  mixedWaveExecutionDesign: MixedWaveExecutionDesign;
}): { mixedWavePreviewDesign: MixedWavePreviewDesign } {
  const requestedWaveId = String(input.waveId ?? "").trim();
  const wavesRaw = Array.isArray(input.strategicExecutionOrchestration?.waves) ? input.strategicExecutionOrchestration.waves : [];

  const waves =
    requestedWaveId.length > 0 ? wavesRaw.filter((w) => w?.id === requestedWaveId) : wavesRaw.slice();

  const resolvedBySlug = new Map<string, Gnr8Page>();
  for (const p of Array.isArray(input.resolvedPages) ? input.resolvedPages : []) {
    const slug = normalizeSlug(p.slug);
    if (!slug) continue;
    if (!p.page) continue;
    resolvedBySlug.set(slug, { ...p.page, slug });
  }
  const unresolvedSet = new Set((Array.isArray(input.unresolvedPages) ? input.unresolvedPages : []).map(normalizeSlug).filter(Boolean));

  const steps = Array.isArray(input.strategicSemanticPlan?.steps) ? input.strategicSemanticPlan.steps : [];
  const stepsById = new Map<string, StrategicSemanticPlanStep>();
  for (const s of steps) {
    if (!s?.id) continue;
    stepsById.set(s.id, s);
  }

  const wavePreviews: MixedWavePreviewDesignWavePreview[] = [];

  for (const w of waves) {
    const waveId = String(w?.id ?? "").trim();
    if (!waveId) continue;

    const waveSteps = uniqStable(Array.isArray(w.stepIds) ? w.stepIds : [])
      .map((id) => stepsById.get(id))
      .filter((s): s is StrategicSemanticPlanStep => !!s);

    const hasStructuralWork = hasStructuralWorkForSteps(waveSteps);
    const hasSemanticWork = hasSemanticWorkForSteps(waveSteps);

    const targetPages = uniqStable(Array.isArray(w.targetPages) ? w.targetPages : []).map(normalizeSlug).filter(Boolean);
    const resolvedTargetPages = targetPages
      .map((slug) => (resolvedBySlug.has(slug) ? ({ slug, page: resolvedBySlug.get(slug)! } as const) : null))
      .filter((p): p is { slug: string; page: Gnr8Page } => !!p);

    const structuralActionClasses = hasStructuralWork
      ? sortStructuralClasses(
          resolvedTargetPages.flatMap((p) => detectStructuralActionClassesForReview(buildMigrationReviewSummary(p.page))),
        )
      : [];

    const semanticActionClasses = hasSemanticWork ? (["content-improvement"] as const) : [];

    const supportedStructuralClasses = getSupportedStructuralClasses({
      mixedWaveExecutionDesign: input.mixedWaveExecutionDesign,
      structuralActionClasses,
    });

    const blockedStructuralClasses = getBlockedStructuralClasses({
      mixedWaveExecutionDesign: input.mixedWaveExecutionDesign,
      structuralActionClasses,
    });

    const supportedSemanticClasses = semanticActionClasses.length > 0 ? ["content-improvement"] : [];

    const { executableTargetPages, blockedTargetPages, deferredTargetPages } = splitWaveTargetPages({
      targetPages,
      resolvedBySlug,
      unresolvedPages: unresolvedSet,
      hasSemanticWork,
      waveStructuralActionClasses: structuralActionClasses,
      mixedWaveExecutionDesign: input.mixedWaveExecutionDesign,
    });

    const eligibility = classifyMixedWaveEligibility({
      readinessLabel: input.mixedWaveExecutionDesign.readinessLabel,
      supportedStructuralClasses,
      supportedSemanticClasses,
      structuralActionClasses,
      blockedStructuralClasses,
      blockedTargetPages,
      deferredTargetPages,
      executableTargetPages,
    });

    const previewStatus = toPreviewStatus(eligibility);

    const expectedStructuralEffects = buildExpectedStructuralEffects(structuralActionClasses);
    const expectedSemanticEffects = buildExpectedSemanticEffects({ hasSemanticWork, resolvedTargetPages });

    const hasLaterPhaseStructural = structuralActionClasses.some((c) => {
      const d = findClassDesign(input.mixedWaveExecutionDesign, c);
      return !!d && d.allowedInMixedWaves && d.rolloutPhase !== "future-phase-1";
    });

    const rationale = buildRationale({
      eligibility,
      hasLaterPhaseStructural,
      hasBlockedStructural: blockedStructuralClasses.length > 0,
      hasBlockedTargets: blockedTargetPages.length > 0,
      hasDeferredTargets: deferredTargetPages.length > 0,
    });

    wavePreviews.push({
      waveId,
      label: String(w?.label ?? ""),
      purpose: String(w?.purpose ?? ""),
      mixedEligibility: eligibility,
      previewStatus,
      structuralActionClasses,
      semanticActionClasses: semanticActionClasses.slice(),
      supportedStructuralClasses,
      blockedStructuralClasses,
      supportedSemanticClasses,
      expectedStructuralEffects,
      expectedSemanticEffects,
      targetPages,
      executableTargetPages,
      blockedTargetPages,
      deferredTargetPages,
      rationale,
    });
  }

  const noSuchWaveNote =
    requestedWaveId.length > 0 && wavesRaw.some((w) => w?.id === requestedWaveId) === false
      ? [`Requested waveId not found: ${requestedWaveId}.`]
      : [];

  const blockedWaveIds = wavePreviews.filter((w) => w.mixedEligibility === "not-eligible").map((w) => w.waveId);
  const partiallyEligibleWaveIds = wavePreviews.filter((w) => w.mixedEligibility === "partially-eligible").map((w) => w.waveId);
  const futureEligibleWaveIds = wavePreviews.filter((w) => w.mixedEligibility === "future-eligible").map((w) => w.waveId);

  const summary = buildSummary({
    blocked: blockedWaveIds.length,
    partial: partiallyEligibleWaveIds.length,
    future: futureEligibleWaveIds.length,
    executionModel: "phase-separated",
  });

  const anyBlockedStructuralClasses = wavePreviews.some((w) => w.blockedStructuralClasses.length > 0);

  const notes = uniqStable([
    ...noSuchWaveNote,
    ...buildNotes({
      unresolvedPages: Array.isArray(input.unresolvedPages) ? input.unresolvedPages : [],
      executionModel: "phase-separated",
      anyBlockedStructuralClasses,
      mixedWaveExecutionDesign: input.mixedWaveExecutionDesign,
    }),
  ]).slice(0, 5);

  return {
    mixedWavePreviewDesign: {
      previewMode: "design-only",
      executionModel: "phase-separated",
      wavePreviews,
      blockedWaveIds,
      partiallyEligibleWaveIds,
      futureEligibleWaveIds,
      summary,
      notes,
    },
  };
}

