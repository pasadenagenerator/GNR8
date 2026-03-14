import type { Gnr8Page } from "@/gnr8/types/page";
import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { buildSemanticExecutionResultHints } from "@/gnr8/ai/semantic-execution-result-hints";
import { buildSemanticOptimizationSuggestions } from "@/gnr8/ai/semantic-optimization-suggestions";
import { calculateSemanticConfidence } from "@/gnr8/ai/semantic-confidence";
import { transformSemanticContentV1 } from "@/gnr8/ai/semantic-content-transformer";

const SUPPORTED_SEMANTIC_PROMPTS = [
  "Improve hero clarity",
  "Improve CTA clarity",
  "Normalize FAQ content",
  "Complete pricing content",
  "Complete feature grid content",
] as const;

type SupportedSemanticPrompt = (typeof SUPPORTED_SEMANTIC_PROMPTS)[number];

export type StrategicWavePagePreviewStatus = "would-execute" | "would-skip" | "blocked";

export type StrategicWavePagePreview = {
  slug: string;
  status: StrategicWavePagePreviewStatus;
  applicableSuggestions: string[];
  simulatedResultHints: string[];
  simulatedImpact: {
    improved: boolean;
    expectedDelta: number;
    expectedRemainingWeaknesses: string[];
  };
};

export type StrategicWaveExecutionPreviewSimulation = {
  waveId: string;
  mode: "preview";
  simulatedResults: StrategicWavePagePreview[];
  summary: string;
  notes: string[];
};

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

const SUPPORTED_PROMPT_SET = new Set<string>(SUPPORTED_SEMANTIC_PROMPTS);
function isSupportedPrompt(prompt: string): prompt is SupportedSemanticPrompt {
  return SUPPORTED_PROMPT_SET.has(prompt);
}

function deepClonePage(page: Gnr8Page): Gnr8Page {
  // Keep simulation mutation-free even if downstream code changes.
  // structuredClone is available in Node 18+; fallback remains deterministic.
  if (typeof structuredClone === "function") return structuredClone(page);
  return JSON.parse(JSON.stringify(page)) as Gnr8Page;
}

function collectApplicableSuggestions(input: {
  reviewSuggestions: string[];
  targetedSuggestions: string[];
}): SupportedSemanticPrompt[] {
  const currentSet = new Set(input.reviewSuggestions.map((s) => String(s ?? "").trim()).filter(Boolean));
  const targetedInOrder = input.targetedSuggestions.map((s) => String(s ?? "").trim()).filter((s) => isSupportedPrompt(s));

  const applicable: SupportedSemanticPrompt[] = [];
  for (const suggestion of targetedInOrder) {
    if (!currentSet.has(suggestion)) continue;
    applicable.push(suggestion);
  }
  return applicable;
}

function simulatePage(input: {
  slug: string;
  page: Gnr8Page | null;
  targetedSuggestions: string[];
}): StrategicWavePagePreview & { readinessLabel: string } {
  const normalizedSlug = normalizeSlug(input.slug);

  if (!input.page) {
    return {
      slug: normalizedSlug,
      status: "blocked",
      applicableSuggestions: [],
      simulatedResultHints: [],
      simulatedImpact: {
        improved: false,
        expectedDelta: 0,
        expectedRemainingWeaknesses: [],
      },
      readinessLabel: "not-ready",
    };
  }

  const pageBefore = deepClonePage({ ...input.page, slug: normalizedSlug });
  const review = buildMigrationReviewSummary(pageBefore);
  const readinessLabel = review.semanticAutomationReadiness?.label ?? "not-ready";
  const reviewSuggestions = Array.isArray(review.semanticOptimizationSuggestions) ? review.semanticOptimizationSuggestions : [];

  const applicable = collectApplicableSuggestions({
    reviewSuggestions,
    targetedSuggestions: input.targetedSuggestions,
  });

  const status: StrategicWavePagePreviewStatus =
    readinessLabel === "not-ready" ? "blocked" : applicable.length > 0 ? "would-execute" : "would-skip";

  const beforeConfidence = calculateSemanticConfidence(pageBefore);

  let simulatedWorking = deepClonePage(pageBefore);
  const hintAccumulator: string[] = [];

  if (status === "would-execute") {
    for (const suggestion of applicable) {
      const beforeStep = simulatedWorking;
      const semantic = transformSemanticContentV1({ page: simulatedWorking, actionPrompt: suggestion });
      const afterStep = semantic?.page ?? beforeStep;
      if (semantic?.changed) simulatedWorking = afterStep;

      // Use the same deterministic hints logic as execution (but without persisting changes).
      hintAccumulator.push(...buildSemanticExecutionResultHints({ pageBefore: beforeStep, pageAfter: afterStep }));
      if (hintAccumulator.length >= 12) break; // small cap before dedupe; final cap is applied later
    }
  }

  const afterConfidence = calculateSemanticConfidence(simulatedWorking);
  const expectedDelta = afterConfidence.score - beforeConfidence.score;

  const remainingWeaknesses = buildSemanticOptimizationSuggestions(simulatedWorking);

  return {
    slug: normalizedSlug,
    status,
    applicableSuggestions: applicable,
    simulatedResultHints: uniqStable(hintAccumulator).slice(0, 5),
    simulatedImpact: {
      improved: expectedDelta > 0,
      expectedDelta,
      expectedRemainingWeaknesses: remainingWeaknesses,
    },
    readinessLabel,
  };
}

export function buildStrategicWaveExecutionPreviewSimulation(input: {
  waveId: string;
  targetedPages: string[];
  targetedSuggestions: string[];
  pageBySlug: Map<string, Gnr8Page>;
}): StrategicWaveExecutionPreviewSimulation {
  const pages = (input.targetedPages ?? []).map(normalizeSlug).filter(Boolean);
  const uniquePages: string[] = [];
  const seen = new Set<string>();
  for (const slug of pages) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    uniquePages.push(slug);
  }

  const simulatedWithReadiness = uniquePages.map((slug) =>
    simulatePage({ slug, page: input.pageBySlug.get(slug) ?? null, targetedSuggestions: input.targetedSuggestions }),
  );

  const simulatedResults: StrategicWavePagePreview[] = simulatedWithReadiness.map(({ readinessLabel: _r, ...rest }) => rest);

  const blockedCount = simulatedResults.filter((r) => r.status === "blocked").length;
  const skippedCount = simulatedResults.filter((r) => r.status === "would-skip").length;
  const executeCount = simulatedResults.filter((r) => r.status === "would-execute").length;

  const summary =
    simulatedResults.length > 0 && blockedCount === simulatedResults.length
      ? "Semantic wave cannot execute due to readiness blockers."
      : executeCount > 0
        ? "Semantic wave would improve structured content across selected pages."
        : "No semantic improvements applicable for this wave.";

  const notes: string[] = [];
  notes.push("Strategic wave preview only; no changes are applied.");

  const extraNotes: string[] = [];
  if (blockedCount > 0) extraNotes.push("Blocked pages exist due to semantic automation readiness.");
  if (skippedCount > 0) extraNotes.push("Skipped pages exist with no supported semantic suggestions remaining.");
  if (executeCount > 0 && (blockedCount > 0 || skippedCount > 0)) extraNotes.push("Partial execution scenario across selected pages.");

  const readinessLabels = new Set(simulatedWithReadiness.map((r) => r.readinessLabel).filter(Boolean));
  if (readinessLabels.size > 1) extraNotes.push("Readiness variance exists across pages.");

  notes.push(...extraNotes.slice(0, 4));

  return {
    waveId: String(input.waveId ?? "").trim(),
    mode: "preview",
    simulatedResults,
    summary,
    notes,
  };
}

