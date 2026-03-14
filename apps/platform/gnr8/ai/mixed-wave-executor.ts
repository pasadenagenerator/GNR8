import type { Gnr8Page } from "@/gnr8/types/page";

import { cleanupExactDuplicateSections } from "@/gnr8/ai/layout-agent";
import { normalizeSectionLayout } from "@/gnr8/ai/layout-normalizer";
import { buildMigrationReviewSummary, type MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { buildMixedWaveExecutionDesign } from "@/gnr8/ai/mixed-wave-execution-design";
import type { MixedWavePreviewDesignWavePreview } from "@/gnr8/ai/mixed-wave-preview-design";
import { buildMixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import { buildSemanticExecutionResultHints } from "@/gnr8/ai/semantic-execution-result-hints";
import { buildSemanticImpactSummary, type SemanticImpactSummary } from "@/gnr8/ai/semantic-impact-summary";
import { transformSemanticContentV1 } from "@/gnr8/ai/semantic-content-transformer";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan, type StrategicSemanticPlanStep } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import { buildTransformationDiffSummary, type TransformationDiffSummary } from "@/gnr8/ai/transformation-diff-summary";
import { getPageTransformationSignature } from "@/gnr8/ai/content-layout-transformer";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";

const PHASE_1_STRUCTURAL_ORDER = ["cleanup", "merge", "normalize"] as const;
type Phase1StructuralAction = (typeof PHASE_1_STRUCTURAL_ORDER)[number];

const SUPPORTED_SEMANTIC_PROMPTS = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
] as const;

type SupportedSemanticPrompt = (typeof SUPPORTED_SEMANTIC_PROMPTS)[number];

export type MixedWaveExecutionMode = "preview" | "applied";

export type MixedWaveExecutionResult = {
  waveId: string;
  mode: MixedWaveExecutionMode;

  executable: boolean;
  executionModel: "phase-separated";
  executionScope: "mixed-conservative";

  targetedPages: string[];
  executablePages: string[];
  blockedPages: string[];
  skippedPages: string[];

  appliedPageResults: Array<{
    slug: string;

    appliedStructuralActions: string[];
    skippedStructuralActions: string[];

    appliedSemanticSuggestions: string[];
    skippedSemanticSuggestions: string[];

    diffSummary: TransformationDiffSummary;
    semanticExecutionResultHints: string[];
    semanticImpactSummary: SemanticImpactSummary;
  }>;

  blockedReasons: string[];
  summary: string;
  notes: string[];
};

type MixedWaveExecuteInput = {
  pages: Array<
    | { slug: string }
    | {
        slug: string;
        page: Gnr8Page;
      }
  >;
  waveId: string;
  apply?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isGnr8Page(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (!Array.isArray(value.sections)) return false;
  if (typeof value.title !== "undefined" && typeof value.title !== "string") return false;
  return true;
}

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
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

const SUPPORTED_PROMPT_SET = new Set<string>(SUPPORTED_SEMANTIC_PROMPTS);
const PROMPT_ORDER = new Map<string, number>(SUPPORTED_SEMANTIC_PROMPTS.map((p, idx) => [p, idx]));

function isSupportedPrompt(prompt: string): prompt is SupportedSemanticPrompt {
  return SUPPORTED_PROMPT_SET.has(prompt);
}

function sortPromptsStable(prompts: string[]): SupportedSemanticPrompt[] {
  const filtered = prompts.map((p) => String(p ?? "").trim()).filter((p) => isSupportedPrompt(p));
  const unique = uniqStable(filtered);
  unique.sort((a, b) => (PROMPT_ORDER.get(a) ?? 999) - (PROMPT_ORDER.get(b) ?? 999));
  return unique as SupportedSemanticPrompt[];
}

async function reloadPublishedPageOrNull(slug: string): Promise<Gnr8Page | null> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loaded = await getPageBySlug(slug).catch(() => null);
    if (loaded) return loaded;
  }
  return null;
}

function buildNeutralImpactSummary(score: number, summary: string): SemanticImpactSummary {
  return {
    improved: false,
    summary,
    scoreBefore: score,
    scoreAfter: score,
    delta: 0,
    reducedWeaknesses: [],
    remainingWeaknesses: [],
  };
}

function buildPreviewDiffSummary(page: Gnr8Page, review: MigrationReviewSummary): TransformationDiffSummary {
  const sections = Array.isArray(page.sections) ? page.sections.length : 0;
  const structured = typeof review.structuredSections === "number" ? review.structuredSections : 0;
  const legacy = typeof review.legacySections === "number" ? review.legacySections : 0;
  const confidence = typeof review.confidenceScore === "number" ? review.confidenceScore : 0;

  return {
    changed: false,
    summary: "Preview only; no diffs were applied.",
    changes: [],
    metrics: {
      sectionsBefore: sections,
      sectionsAfter: sections,
      structuredBefore: structured,
      structuredAfter: structured,
      legacyBefore: legacy,
      legacyAfter: legacy,
      confidenceBefore: confidence,
      confidenceAfter: confidence,
    },
  };
}

function getApplicableStructuralActionsForPage(input: {
  page: Gnr8Page;
  targetedStructuralActions: Phase1StructuralAction[];
}): {
  workingPage: Gnr8Page;
  applicableActions: Phase1StructuralAction[];
  skippedActions: Phase1StructuralAction[];
} {
  const targetedSet = new Set<Phase1StructuralAction>(input.targetedStructuralActions);
  const applicable: Phase1StructuralAction[] = [];
  const skipped: Phase1StructuralAction[] = [];

  let working: Gnr8Page = input.page;
  let sig = getPageTransformationSignature(working);

  // cleanup
  if (targetedSet.has("cleanup")) {
    const review = buildMigrationReviewSummary(working);
    const after = cleanupExactDuplicateSections(working, review.duplicateDetails);
    const sigAfter = getPageTransformationSignature(after);
    if (sigAfter !== sig) {
      applicable.push("cleanup");
      working = after;
      sig = sigAfter;
    } else {
      skipped.push("cleanup");
    }
  }

  // merge
  if (targetedSet.has("merge")) {
    const review = buildMigrationReviewSummary(working);
    const merged = mergeSupportedDuplicateSections(working, review.duplicateDetails);
    const sigAfter = getPageTransformationSignature(merged.page);
    if (sigAfter !== sig) {
      applicable.push("merge");
      working = merged.page;
      sig = sigAfter;
    } else {
      skipped.push("merge");
    }
  }

  // normalize
  if (targetedSet.has("normalize")) {
    const normalized = normalizeSectionLayout(working);
    const sigAfter = getPageTransformationSignature(normalized.page);
    if (normalized.changed || sigAfter !== sig) {
      applicable.push("normalize");
      working = normalized.page;
      sig = sigAfter;
    } else {
      skipped.push("normalize");
    }
  }

  return { workingPage: working, applicableActions: applicable, skippedActions: skipped };
}

function getApplicableSemanticSuggestionsForPage(input: {
  page: Gnr8Page;
  targetedSuggestions: SupportedSemanticPrompt[];
}): {
  readinessLabel: string;
  applicableSuggestions: SupportedSemanticPrompt[];
  staleSuggestions: SupportedSemanticPrompt[];
  currentScore: number;
} {
  const review = buildMigrationReviewSummary(input.page);
  const readinessLabel = review.semanticAutomationReadiness?.label ?? "not-ready";
  const currentSuggestions = Array.isArray(review.semanticOptimizationSuggestions) ? review.semanticOptimizationSuggestions : [];
  const currentSuggestionSet = new Set(currentSuggestions);

  const applicable: SupportedSemanticPrompt[] = [];
  const stale: SupportedSemanticPrompt[] = [];

  for (const suggestion of input.targetedSuggestions) {
    if (readinessLabel === "not-ready") {
      stale.push(suggestion);
      continue;
    }
    if (currentSuggestionSet.has(suggestion)) applicable.push(suggestion);
    else stale.push(suggestion);
  }

  const scoreRaw = review.semanticConfidence?.score;
  const currentScore = typeof scoreRaw === "number" ? scoreRaw : 0;

  return { readinessLabel, applicableSuggestions: applicable, staleSuggestions: stale, currentScore };
}

function getWavePreviewOrNull(input: {
  waveId: string;
  mixedWavePreviewDesign: { wavePreviews: MixedWavePreviewDesignWavePreview[] } | null;
}): MixedWavePreviewDesignWavePreview | null {
  const waveId = String(input.waveId ?? "").trim();
  if (!waveId) return null;
  const previews = Array.isArray(input.mixedWavePreviewDesign?.wavePreviews) ? input.mixedWavePreviewDesign!.wavePreviews : [];
  return previews.find((p) => p?.waveId === waveId) ?? null;
}

function buildWaveBlockedReasons(input: {
  waveExists: boolean;
  wavePreview: MixedWavePreviewDesignWavePreview | null;
  hasAllowedStructural: boolean;
  hasAllowedSemantic: boolean;
  hasAnyEligibleTargets: boolean;
}): { executable: true } | { executable: false; blockedReasons: string[] } {
  const blockedReasons: string[] = [];

  if (!input.waveExists) blockedReasons.push("Wave not found.");

  const previewStatus = input.wavePreview?.previewStatus ?? "blocked";
  if (previewStatus === "blocked") blockedReasons.push("Wave is not executable in conservative mixed v1.");

  if (!input.hasAllowedStructural && !input.hasAllowedSemantic) {
    blockedReasons.push("Only cleanup, merge, normalize, and supported semantic improvements are executable in mixed v1.");
  }

  if (!input.hasAnyEligibleTargets) {
    blockedReasons.push("No supported mixed actions remain for this wave.");
  }

  const deduped = uniqStable(blockedReasons).slice(0, 10);
  if (deduped.length > 0) return { executable: false, blockedReasons: deduped };
  return { executable: true };
}

function buildSummary(input: {
  mode: MixedWaveExecutionMode;
  executable: boolean;
  appliedPagesCount: number;
  blockedPagesCount: number;
  hadAnyStructuralApplied: boolean;
  hadAnySemanticApplied: boolean;
}): string {
  if (!input.executable) return "Mixed wave is not executable in conservative mixed v1.";
  if (input.mode === "preview") return "Mixed wave is ready for conservative preview.";

  if (input.appliedPagesCount <= 0) {
    return "Mixed wave could not be executed because no eligible mixed targets remained.";
  }

  const both = input.hadAnyStructuralApplied && input.hadAnySemanticApplied;
  const partial = input.blockedPagesCount > 0;

  if (both) return partial
    ? "Mixed wave executed conservative structural and semantic improvements on eligible pages (partial execution)."
    : "Mixed wave executed conservative structural and semantic improvements on eligible pages.";

  if (input.hadAnyStructuralApplied) return partial
    ? "Mixed wave executed conservative structural improvements on eligible pages (partial execution)."
    : "Mixed wave executed conservative structural improvements on eligible pages.";

  return partial
    ? "Mixed wave executed conservative semantic improvements on eligible pages (partial execution)."
    : "Mixed wave executed conservative semantic improvements on eligible pages.";
}

function buildNotes(input: {
  mode: MixedWaveExecutionMode;
  unresolvedCount: number;
  blockedPagesCount: number;
  skippedPagesCount: number;
  hadLaterPhaseStructuralInWave: boolean;
}): string[] {
  const notes: string[] = [];
  notes.push("Mixed wave execution only; later-phase structural actions are not applied in v1.");
  notes.push("Execution model: phase-separated (structural phase first, semantic phase second).");

  if (input.mode === "preview") notes.push("Preview only; no pages were mutated.");
  if (input.hadLaterPhaseStructuralInWave) notes.push("This wave depends on later-phase structural classes; only the conservative subset may run in v1.");

  if (input.unresolvedCount > 0) notes.push(`Unresolved pages: ${input.unresolvedCount}.`);
  if (input.blockedPagesCount > 0) notes.push(`Blocked pages: ${input.blockedPagesCount}.`);
  if (input.skippedPagesCount > 0) notes.push(`Skipped pages: ${input.skippedPagesCount}.`);

  return notes.slice(0, 6);
}

export async function executeMixedWaveExecutionV1(raw: MixedWaveExecuteInput): Promise<{
  mixedWaveExecution: MixedWaveExecutionResult;
}> {
  const waveId = String(raw?.waveId ?? "").trim();
  const applyRequested = raw?.apply === true;

  const pagesRaw = Array.isArray(raw?.pages) ? raw.pages : [];
  const normalizedInputPages: Array<{ slug: string; page?: Gnr8Page }> = [];
  for (const item of pagesRaw) {
    const slug = normalizeSlug(isRecord(item) && typeof item.slug === "string" ? item.slug : "");
    if (!slug) continue;
    const page = isRecord(item) && "page" in item ? (item as any).page : undefined;
    normalizedInputPages.push({
      slug,
      page: isGnr8Page(page) ? (page as Gnr8Page) : undefined,
    });
  }

  const resolvedPages: Array<{ slug: string; page: Gnr8Page }> = [];
  const unresolvedPages: string[] = [];

  for (const p of normalizedInputPages) {
    if (p.page) {
      resolvedPages.push({ slug: p.slug, page: { ...p.page, slug: p.slug } });
      continue;
    }
    const loaded = await getPageBySlug(p.slug).catch(() => null);
    if (!loaded) {
      unresolvedPages.push(p.slug);
      continue;
    }
    resolvedPages.push({ slug: p.slug, page: { ...loaded, slug: p.slug } });
  }

  const siteSemanticIntelligence = buildSiteSemanticIntelligence({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
  });

  const siteSemanticConsistency = buildSiteSemanticConsistency({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
  });

  const strategicSemanticReasoning = buildStrategicSemanticReasoning({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
  });

  const strategicSemanticPlan = buildStrategicSemanticPlan({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
  });

  const strategicSemanticExecutionReadiness = buildStrategicSemanticExecutionReadiness({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
    strategicSemanticPlan,
  });

  const strategicExecutionOrchestration = buildStrategicExecutionOrchestration({
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticPlan,
    strategicSemanticExecutionReadiness,
  });

  const wave = strategicExecutionOrchestration.waves.find((w) => w.id === waveId) ?? null;

  const { mixedWaveExecutionDesign } = buildMixedWaveExecutionDesign({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    strategicSemanticExecutionReadiness,
    strategicSemanticReasoning,
  });

  const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    waveId,
    strategicExecutionOrchestration,
    strategicSemanticPlan,
    mixedWaveExecutionDesign,
  });

  const wavePreview = getWavePreviewOrNull({ waveId, mixedWavePreviewDesign });

  const targetedPages = uniqStable((wave?.targetPages ?? []).map(normalizeSlug)).sort(bySlug);
  const pageBySlug = new Map<string, Gnr8Page>();
  for (const p of resolvedPages) pageBySlug.set(p.slug, p.page);

  const steps = Array.isArray(strategicSemanticPlan.steps) ? strategicSemanticPlan.steps : [];
  const stepById = new Map<string, StrategicSemanticPlanStep>();
  for (const s of steps) stepById.set(s.id, s);

  const waveSteps = uniqStable(Array.isArray(wave?.stepIds) ? wave!.stepIds : [])
    .map((id) => stepById.get(id))
    .filter((s): s is StrategicSemanticPlanStep => !!s);

  const allTargetedSuggestions = waveSteps.flatMap((s) => s.targetSuggestions ?? []).map((s) => String(s ?? "").trim());
  const targetedSuggestions = sortPromptsStable(allTargetedSuggestions);

  const targetedStructuralActions: Phase1StructuralAction[] = (() => {
    const actionClasses = uniqStable(wavePreview?.structuralActionClasses ?? []);
    const blockedClasses = new Set<string>(wavePreview?.blockedStructuralClasses ?? []);
    return PHASE_1_STRUCTURAL_ORDER.filter((a) => actionClasses.includes(a) && !blockedClasses.has(a));
  })();

  const hasAllowedStructural = targetedStructuralActions.length > 0;
  const hasAllowedSemantic = targetedSuggestions.length > 0 && (wavePreview?.supportedSemanticClasses ?? []).includes("content-improvement");

  const blockedPages: string[] = [];
  const skippedPages: string[] = [];
  const executablePages: string[] = [];
  const appliedPageResults: MixedWaveExecutionResult["appliedPageResults"] = [];

  const pagesInOrder = targetedPages.slice().sort(bySlug);

  // Eligibility depends on actual remaining eligible targets, so compute per-page applicability first.
  let anyEligibleTargets = false;
  if (wave && wavePreview && wavePreview.previewStatus !== "blocked") {
    for (const slug of pagesInOrder) {
      const basePage = pageBySlug.get(slug);
      if (!basePage) continue;

      const structural = getApplicableStructuralActionsForPage({ page: basePage, targetedStructuralActions });
      const semantic = getApplicableSemanticSuggestionsForPage({ page: structural.workingPage, targetedSuggestions });
      const semanticReady = semantic.readinessLabel !== "not-ready";

      if (structural.applicableActions.length > 0) {
        anyEligibleTargets = true;
        break;
      }
      if (semanticReady && semantic.applicableSuggestions.length > 0) {
        anyEligibleTargets = true;
        break;
      }
    }
  }

  const eligibility = buildWaveBlockedReasons({
    waveExists: !!wave,
    wavePreview,
    hasAllowedStructural,
    hasAllowedSemantic,
    hasAnyEligibleTargets: anyEligibleTargets,
  });

  const executable = eligibility.executable === true;
  const shouldApply = applyRequested === true && executable === true;
  const mode: MixedWaveExecutionMode = shouldApply ? "applied" : "preview";

  const hadLaterPhaseStructuralInWave =
    (wavePreview?.blockedStructuralClasses ?? []).some((c) => c === "reorder" || c === "add-section" || c === "replace-section") ||
    (wavePreview?.structuralActionClasses ?? []).some((c) => c === "reorder" || c === "add-section" || c === "replace-section");

  for (const slug of pagesInOrder) {
    const basePage = pageBySlug.get(slug);

    if (!basePage) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: targetedStructuralActions.slice(),
        appliedSemanticSuggestions: [],
        skippedSemanticSuggestions: targetedSuggestions.slice(),
        diffSummary: {
          changed: false,
          summary: "Not applied; page could not be resolved.",
          changes: [],
          metrics: {
            sectionsBefore: 0,
            sectionsAfter: 0,
            structuredBefore: 0,
            structuredAfter: 0,
            legacyBefore: 0,
            legacyAfter: 0,
            confidenceBefore: 0,
            confidenceAfter: 0,
          },
        },
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(0, "Not applied; page could not be resolved."),
      });
      continue;
    }

    if (!executable) {
      const review = buildMigrationReviewSummary(basePage);
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: targetedStructuralActions.slice(),
        appliedSemanticSuggestions: [],
        skippedSemanticSuggestions: targetedSuggestions.slice(),
        diffSummary: buildPreviewDiffSummary(basePage, review),
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(
          typeof review.semanticConfidence?.score === "number" ? review.semanticConfidence.score : 0,
          "Not applied; wave is not executable in conservative mixed v1.",
        ),
      });
      continue;
    }

    if (!shouldApply) {
      const structural = getApplicableStructuralActionsForPage({ page: basePage, targetedStructuralActions });
      const semantic = getApplicableSemanticSuggestionsForPage({ page: structural.workingPage, targetedSuggestions });

      const semanticReady = semantic.readinessLabel !== "not-ready";
      const hasStructuralWork = structural.applicableActions.length > 0;
      const hasSemanticWork = semanticReady && semantic.applicableSuggestions.length > 0;

      if (hasStructuralWork || hasSemanticWork) executablePages.push(slug);
      else if (!hasStructuralWork && !hasSemanticWork && semantic.readinessLabel === "not-ready" && targetedSuggestions.length > 0) blockedPages.push(slug);
      else skippedPages.push(slug);

      const review = buildMigrationReviewSummary(basePage);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: structural.applicableActions,
        skippedStructuralActions: structural.skippedActions,
        appliedSemanticSuggestions: semanticReady ? semantic.applicableSuggestions : [],
        skippedSemanticSuggestions: semanticReady ? semantic.staleSuggestions : targetedSuggestions.slice(),
        diffSummary: buildPreviewDiffSummary(basePage, review),
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(semantic.currentScore, "Preview only; no semantic impact computed."),
      });
      continue;
    }

    const pageBefore = await reloadPublishedPageOrNull(slug);
    if (!pageBefore) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: [],
        skippedStructuralActions: targetedStructuralActions.slice(),
        appliedSemanticSuggestions: [],
        skippedSemanticSuggestions: targetedSuggestions.slice(),
        diffSummary: {
          changed: false,
          summary: "Not applied; page could not be resolved.",
          changes: [],
          metrics: {
            sectionsBefore: 0,
            sectionsAfter: 0,
            structuredBefore: 0,
            structuredAfter: 0,
            legacyBefore: 0,
            legacyAfter: 0,
            confidenceBefore: 0,
            confidenceAfter: 0,
          },
        },
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(0, "Not applied; page could not be resolved."),
      });
      continue;
    }

    const reviewBefore = buildMigrationReviewSummary(pageBefore);

    // Phase 1: structural (cleanup -> merge -> normalize), only for targeted phase-1 classes.
    const structural = getApplicableStructuralActionsForPage({ page: pageBefore, targetedStructuralActions });
    let working: Gnr8Page = structural.workingPage;

    // Phase 2: semantic (supported content-improvement prompts), only if readiness allows.
    const semanticNow = getApplicableSemanticSuggestionsForPage({ page: working, targetedSuggestions });
    const semanticReadyNow = semanticNow.readinessLabel !== "not-ready";

    const appliedSemantic: SupportedSemanticPrompt[] = [];
    const skippedSemantic: SupportedSemanticPrompt[] = [];

    if (!semanticReadyNow) {
      skippedSemantic.push(...targetedSuggestions);
    } else {
      const applicableSet = new Set<SupportedSemanticPrompt>(semanticNow.applicableSuggestions);
      for (const suggestion of SUPPORTED_SEMANTIC_PROMPTS) {
        if (!applicableSet.has(suggestion)) continue;
        const semantic = transformSemanticContentV1({ page: working, actionPrompt: suggestion });
        if (!semantic || !semantic.changed) {
          skippedSemantic.push(suggestion);
          continue;
        }
        working = semantic.page;
        appliedSemantic.push(suggestion);
      }

      for (const stale of semanticNow.staleSuggestions) {
        if (applicableSet.has(stale)) continue;
        skippedSemantic.push(stale);
      }
    }

    const signatureBefore = getPageTransformationSignature(pageBefore);
    const signatureAfter = getPageTransformationSignature(working);
    const pageChanged = signatureBefore !== signatureAfter;

    if (structural.applicableActions.length > 0 || (semanticReadyNow && semanticNow.applicableSuggestions.length > 0)) {
      executablePages.push(slug);
    } else if (!semanticReadyNow && targetedSuggestions.length > 0 && structural.applicableActions.length === 0) {
      blockedPages.push(slug);
    } else {
      skippedPages.push(slug);
    }

    if (pageChanged) {
      await savePage(slug, working);
      await publishPage(slug);
    }

    const pageAfter = pageChanged ? await reloadPublishedPageOrNull(slug) : pageBefore;
    if (!pageAfter) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedStructuralActions: structural.applicableActions,
        skippedStructuralActions: structural.skippedActions,
        appliedSemanticSuggestions: appliedSemantic,
        skippedSemanticSuggestions: uniqStable([...skippedSemantic]),
        diffSummary: buildTransformationDiffSummary({
          pageBefore,
          pageAfter: pageBefore,
          reviewBefore,
          reviewAfter: reviewBefore,
          appliedSteps: [...structural.applicableActions, ...appliedSemantic],
          skippedSteps: [...structural.skippedActions, ...skippedSemantic],
        }),
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(
          typeof reviewBefore.semanticConfidence?.score === "number" ? reviewBefore.semanticConfidence.score : 0,
          "Failed to reload published page after apply.",
        ),
      });
      continue;
    }

    const reviewAfter = buildMigrationReviewSummary(pageAfter);

    appliedPageResults.push({
      slug,
      appliedStructuralActions: structural.applicableActions,
      skippedStructuralActions: structural.skippedActions,
      appliedSemanticSuggestions: appliedSemantic,
      skippedSemanticSuggestions: uniqStable([...skippedSemantic]),
      diffSummary: buildTransformationDiffSummary({
        pageBefore,
        pageAfter,
        reviewBefore,
        reviewAfter,
        appliedSteps: [...structural.applicableActions, ...appliedSemantic],
        skippedSteps: [...structural.skippedActions, ...skippedSemantic],
      }),
      semanticExecutionResultHints: appliedSemantic.length > 0 ? buildSemanticExecutionResultHints({ pageBefore, pageAfter }) : [],
      semanticImpactSummary:
        appliedSemantic.length > 0
          ? buildSemanticImpactSummary({ reviewBefore, reviewAfter })
          : buildNeutralImpactSummary(
              typeof reviewBefore.semanticConfidence?.score === "number" ? reviewBefore.semanticConfidence.score : 0,
              appliedSemantic.length === 0 && pageChanged ? "No semantic changes were applied." : "No semantic changes were applied.",
            ),
    });
  }

  const blockedReasons = eligibility.executable === false ? eligibility.blockedReasons : [];

  const hadAnyStructuralApplied =
    appliedPageResults.some((r) => (r.appliedStructuralActions?.length ?? 0) > 0);
  const hadAnySemanticApplied =
    appliedPageResults.some((r) => (r.appliedSemanticSuggestions?.length ?? 0) > 0);

  const appliedPagesCount =
    mode === "applied" ? appliedPageResults.filter((r) => r.diffSummary?.changed === true).length : 0;

  const mixedWaveExecution: MixedWaveExecutionResult = {
    waveId,
    mode,
    executable,
    executionModel: "phase-separated",
    executionScope: "mixed-conservative",
    targetedPages,
    executablePages: uniqStable(executablePages).sort(bySlug),
    blockedPages: uniqStable(blockedPages).sort(bySlug),
    skippedPages: uniqStable(skippedPages).sort(bySlug),
    appliedPageResults,
    blockedReasons,
    summary: buildSummary({
      mode,
      executable,
      appliedPagesCount,
      blockedPagesCount: uniqStable(blockedPages).length,
      hadAnyStructuralApplied,
      hadAnySemanticApplied,
    }),
    notes: buildNotes({
      mode,
      unresolvedCount: unresolvedPages.length,
      blockedPagesCount: uniqStable(blockedPages).length,
      skippedPagesCount: uniqStable(skippedPages).length,
      hadLaterPhaseStructuralInWave,
    }),
  };

  return { mixedWaveExecution };
}
