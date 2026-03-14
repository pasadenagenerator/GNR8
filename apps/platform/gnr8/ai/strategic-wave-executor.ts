import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { buildSemanticExecutionResultHints } from "@/gnr8/ai/semantic-execution-result-hints";
import { buildSemanticImpactSummary, type SemanticImpactSummary } from "@/gnr8/ai/semantic-impact-summary";
import type { StrategicExecutionOrchestrationWave } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildStrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import type { StrategicSemanticPlanStep } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { transformSemanticContentV1 } from "@/gnr8/ai/semantic-content-transformer";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";

const SUPPORTED_SEMANTIC_PROMPTS = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
] as const;

type SupportedSemanticPrompt = (typeof SUPPORTED_SEMANTIC_PROMPTS)[number];

export type StrategicWaveExecutionMode = "preview" | "applied";

export type StrategicWaveExecutionResult = {
  waveId: string;
  mode: StrategicWaveExecutionMode;

  executable: boolean;
  executionScope: "semantic-only";

  targetedPages: string[];
  executablePages: string[];
  blockedPages: string[];
  skippedPages: string[];

  appliedPageResults: Array<{
    slug: string;
    appliedSuggestions: string[];
    skippedSuggestions: string[];
    semanticExecutionResultHints: string[];
    semanticImpactSummary: SemanticImpactSummary;
  }>;

  blockedReasons: string[];
  summary: string;
  notes: string[];
};

type StrategicWaveExecuteInput = {
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

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function uniqStable(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const value = typeof v === "string" ? v.trim() : "";
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function bySlug(a: string, b: string): number {
  return a.localeCompare(b);
}

function isGnr8Page(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (!Array.isArray(value.sections)) return false;
  if (typeof value.title !== "undefined" && typeof value.title !== "string") return false;
  return true;
}

function normalizePurpose(purpose: string): string {
  return String(purpose ?? "")
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
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

function getApplicableSemanticSuggestionsForPage(input: {
  page: Gnr8Page;
  targetedSuggestions: SupportedSemanticPrompt[];
}): {
  readinessLabel: string;
  currentSuggestionSet: Set<string>;
  applicable: SupportedSemanticPrompt[];
  stale: SupportedSemanticPrompt[];
  currentScore: number;
} {
  const review = buildMigrationReviewSummary(input.page);
  const readinessLabel = review.semanticAutomationReadiness?.label ?? "not-ready";
  const currentSuggestions = Array.isArray(review.semanticOptimizationSuggestions)
    ? review.semanticOptimizationSuggestions
    : [];
  const currentSuggestionSet = new Set(currentSuggestions);

  const applicable: SupportedSemanticPrompt[] = [];
  const stale: SupportedSemanticPrompt[] = [];
  for (const suggestion of input.targetedSuggestions) {
    if (currentSuggestionSet.has(suggestion)) applicable.push(suggestion);
    else stale.push(suggestion);
  }

  const scoreRaw = review.semanticConfidence?.score;
  const currentScore = typeof scoreRaw === "number" ? scoreRaw : 0;

  return { readinessLabel, currentSuggestionSet, applicable, stale, currentScore };
}

function buildWaveEligibility(input: {
  waveId: string;
  wave: StrategicExecutionOrchestrationWave | null;
  waveSteps: StrategicSemanticPlanStep[];
}): { executable: true; targetedSuggestions: SupportedSemanticPrompt[] } | { executable: false; blockedReasons: string[] } {
  const blockedReasons: string[] = [];

  if (!input.wave) {
    blockedReasons.push("Wave not found.");
    return { executable: false, blockedReasons };
  }

  if (input.wave.readiness !== "ready") {
    blockedReasons.push("Wave is not execution-ready.");
  }

  const purpose = normalizePurpose(input.wave.purpose);
  if (purpose !== "semantic improvement") {
    blockedReasons.push("Only semantic improvement waves are executable in v1.");
  }

  const steps = Array.isArray(input.waveSteps) ? input.waveSteps : [];
  if (steps.length === 0) blockedReasons.push("Wave has no executable steps.");

  const nonSemantic = steps.filter((s) => s.type !== "page-semantic-improvement").length;
  if (nonSemantic > 0) blockedReasons.push("Only page-semantic-improvement steps are executable in v1.");

  const allSuggestions = steps.flatMap((s) => s.targetSuggestions ?? []).map((s) => String(s ?? "").trim());
  const supportedSuggestions = sortPromptsStable(allSuggestions);
  const unsupportedSuggestions = uniqStable(allSuggestions.filter((s) => s && !isSupportedPrompt(s)));
  if (unsupportedSuggestions.length > 0) blockedReasons.push("Wave contains unsupported semantic prompts in v1.");
  if (supportedSuggestions.length === 0) blockedReasons.push("Wave contains no supported semantic suggestions.");

  const deduped = uniqStable(blockedReasons).slice(0, 8);
  if (deduped.length > 0) return { executable: false, blockedReasons: deduped };

  return { executable: true, targetedSuggestions: supportedSuggestions };
}

function buildSummary(input: {
  mode: StrategicWaveExecutionMode;
  executable: boolean;
  executablePagesCount: number;
  appliedPagesCount: number;
  blockedPagesCount: number;
}): string {
  if (!input.executable) return "Strategic wave is not executable in v1.";

  if (input.mode === "preview") return "Strategic wave is ready for semantic-only preview.";

  // applied mode
  if (input.appliedPagesCount <= 0) {
    return "Strategic wave could not be executed because no eligible semantic targets remained.";
  }

  if (input.blockedPagesCount > 0) {
    return "Strategic wave executed semantic improvements on eligible pages (partial execution).";
  }
  return "Strategic wave executed semantic improvements on eligible pages.";
}

function buildNotes(input: {
  mode: StrategicWaveExecutionMode;
  unresolvedCount: number;
  blockedPagesCount: number;
  skippedPagesCount: number;
}): string[] {
  const notes: string[] = [];
  notes.push("Strategic wave execution only; structural changes are not applied in v1.");

  if (input.mode === "preview") notes.push("Preview only; no pages were mutated.");

  if (input.unresolvedCount > 0) notes.push(`Unresolved pages: ${input.unresolvedCount}.`);
  if (input.blockedPagesCount > 0) notes.push(`Blocked pages: ${input.blockedPagesCount}.`);
  if (input.skippedPagesCount > 0) notes.push(`Skipped pages: ${input.skippedPagesCount}.`);

  return notes.slice(0, 6);
}

async function executeSemanticWaveOnPage(input: {
  slug: string;
  suggestions: SupportedSemanticPrompt[];
  pageBefore?: Gnr8Page;
}): Promise<{
  pageBefore: Gnr8Page;
  pageAfter: Gnr8Page;
  appliedSuggestions: SupportedSemanticPrompt[];
  skippedSuggestions: SupportedSemanticPrompt[];
}> {
  const pageBefore = input.pageBefore ?? (await reloadPublishedPageOrNull(input.slug));
  if (!pageBefore) {
    throw new Error(`Page not found: ${input.slug}`);
  }

  let working = pageBefore;
  const applied: SupportedSemanticPrompt[] = [];
  const skipped: SupportedSemanticPrompt[] = [];

  for (const suggestion of input.suggestions) {
    const semantic = transformSemanticContentV1({ page: working, actionPrompt: suggestion });
    if (!semantic) {
      skipped.push(suggestion);
      continue;
    }
    if (!semantic.changed) {
      skipped.push(suggestion);
      continue;
    }
    working = semantic.page;
    applied.push(suggestion);
  }

  if (applied.length > 0) {
    await savePage(input.slug, working);
    await publishPage(input.slug);
  }

  const pageAfter = applied.length > 0 ? (await reloadPublishedPageOrNull(input.slug)) : pageBefore;
  if (!pageAfter) {
    throw new Error(`Failed to reload published page: ${input.slug}`);
  }

  return {
    pageBefore,
    pageAfter,
    appliedSuggestions: applied,
    skippedSuggestions: skipped,
  };
}

export async function executeStrategicWaveExecutionV1(raw: StrategicWaveExecuteInput): Promise<{
  strategicWaveExecution: StrategicWaveExecutionResult;
}> {
  const waveId = String(raw?.waveId ?? "").trim();
  const apply = raw?.apply === true;

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
  const stepIdSet = new Set<string>(wave?.stepIds ?? []);
  const waveSteps = (strategicSemanticPlan.steps ?? []).filter((s) => stepIdSet.has(s.id));

  const eligibility = buildWaveEligibility({ waveId, wave, waveSteps });
  const executable = eligibility.executable === true;

  const targetedPages = uniqStable((wave?.targetPages ?? []).map(normalizeSlug)).sort(bySlug);
  const targetedSuggestions = eligibility.executable === true ? eligibility.targetedSuggestions : [];

  const pageBySlug = new Map<string, Gnr8Page>();
  for (const p of resolvedPages) pageBySlug.set(p.slug, p.page);

  const blockedPages: string[] = [];
  const skippedPages: string[] = [];
  const executablePages: string[] = [];
  const appliedPageResults: StrategicWaveExecutionResult["appliedPageResults"] = [];

  const pagesInOrder = targetedPages.slice().sort(bySlug);

  const shouldApply = apply === true && executable === true;
  const mode: StrategicWaveExecutionMode = shouldApply ? "applied" : "preview";

  for (const slug of pagesInOrder) {
    const basePage = pageBySlug.get(slug);
    if (!basePage) {
      blockedPages.push(slug);
      continue;
    }

    if (!shouldApply) {
      const { readinessLabel, applicable, stale, currentScore } = getApplicableSemanticSuggestionsForPage({
        page: basePage,
        targetedSuggestions,
      });

      const notReady = readinessLabel === "not-ready";
      if (!executable || notReady) {
        blockedPages.push(slug);
      } else if (applicable.length === 0) {
        skippedPages.push(slug);
      } else {
        executablePages.push(slug);
      }

      appliedPageResults.push({
        slug,
        appliedSuggestions: applicable,
        skippedSuggestions: stale,
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(currentScore, "Preview only; no semantic impact computed."),
      });
      continue;
    }

    const currentPage = await reloadPublishedPageOrNull(slug);
    if (!currentPage) {
      blockedPages.push(slug);
      appliedPageResults.push({
        slug,
        appliedSuggestions: [],
        skippedSuggestions: [],
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(0, "Not applied; page could not be resolved."),
      });
      continue;
    }

    const {
      readinessLabel: readinessLabelNow,
      applicable: applicableNow,
      stale: staleNow,
      currentScore: currentScoreNow,
    } = getApplicableSemanticSuggestionsForPage({
      page: currentPage,
      targetedSuggestions,
    });

    const notReadyNow = readinessLabelNow === "not-ready";
    if (!executable || notReadyNow) {
      blockedPages.push(slug);
    } else if (applicableNow.length === 0) {
      skippedPages.push(slug);
    } else {
      executablePages.push(slug);
    }

    if (notReadyNow || applicableNow.length === 0) {
      appliedPageResults.push({
        slug,
        appliedSuggestions: [],
        skippedSuggestions: [...applicableNow, ...staleNow],
        semanticExecutionResultHints: [],
        semanticImpactSummary: buildNeutralImpactSummary(
          currentScoreNow,
          notReadyNow ? "Not applied; page is not ready for semantic automation." : "Not applied; no applicable semantic targets remained.",
        ),
      });
      continue;
    }

    const { pageBefore, pageAfter, appliedSuggestions, skippedSuggestions } = await executeSemanticWaveOnPage({
      slug,
      suggestions: applicableNow,
      pageBefore: currentPage,
    });

    const reviewBefore = buildMigrationReviewSummary(pageBefore);
    const reviewAfter = buildMigrationReviewSummary(pageAfter);

    appliedPageResults.push({
      slug,
      appliedSuggestions,
      skippedSuggestions: uniqStable([...skippedSuggestions, ...staleNow]),
      semanticExecutionResultHints:
        appliedSuggestions.length > 0
          ? buildSemanticExecutionResultHints({ pageBefore, pageAfter })
          : [],
      semanticImpactSummary:
        appliedSuggestions.length > 0
          ? buildSemanticImpactSummary({ reviewBefore, reviewAfter })
          : buildNeutralImpactSummary(
              typeof reviewBefore.semanticConfidence?.score === "number" ? reviewBefore.semanticConfidence.score : 0,
              "No semantic changes were applied.",
            ),
    });
  }

  const blockedReasons: string[] = [];
  if (eligibility.executable === false) blockedReasons.push(...eligibility.blockedReasons);
  if (unresolvedPages.length > 0) blockedReasons.push("Unresolved pages cannot be executed.");
  if (blockedPages.some((slug) => !!slug && unresolvedPages.includes(slug))) blockedReasons.push("Page could not be resolved.");
  if (blockedPages.length > 0) blockedReasons.push("Some pages are blocked for semantic execution.");
  const blockedReasonsFinal = uniqStable(blockedReasons).slice(0, 8);

  const appliedPagesCount = appliedPageResults.filter((r) => (r.appliedSuggestions?.length ?? 0) > 0).length;
  const summary = buildSummary({
    mode,
    executable,
    executablePagesCount: executablePages.length,
    appliedPagesCount: mode === "applied" ? appliedPagesCount : 0,
    blockedPagesCount: blockedPages.length,
  });

  const notes = buildNotes({
    mode,
    unresolvedCount: unresolvedPages.length,
    blockedPagesCount: blockedPages.length,
    skippedPagesCount: skippedPages.length,
  });

  return {
    strategicWaveExecution: {
      waveId,
      mode,
      executable,
      executionScope: "semantic-only",
      targetedPages,
      executablePages: uniqStable(executablePages).sort(bySlug),
      blockedPages: uniqStable(blockedPages).sort(bySlug),
      skippedPages: uniqStable(skippedPages).sort(bySlug),
      appliedPageResults,
      blockedReasons: blockedReasonsFinal,
      summary,
      notes,
    },
  };
}
