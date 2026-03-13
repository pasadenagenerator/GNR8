import type { Gnr8Page } from "@/gnr8/types/page";

import type { SemanticConfidenceResult } from "./semantic-confidence";
import type { SemanticImpactSummary } from "./semantic-impact-summary";

export type SemanticAutomationReadinessLabel = "not-ready" | "review-needed" | "automation-candidate";

export type SemanticAutomationReadinessResult = {
  score: number;
  label: SemanticAutomationReadinessLabel;
  reasons: string[];
};

function clampScore(score: number): number {
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function labelForScore(score: number): SemanticAutomationReadinessLabel {
  if (score >= 75) return "automation-candidate";
  if (score >= 40) return "review-needed";
  return "not-ready";
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

function getStructuralSignals(page: Gnr8Page): { hasLegacy: boolean; structuredSections: number } {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  let hasLegacy = false;
  let structuredSections = 0;

  for (const section of sections) {
    const type = typeof section?.type === "string" ? section.type : "";
    if (type === "legacy.html") {
      hasLegacy = true;
    } else {
      structuredSections += 1;
    }
  }

  return { hasLegacy, structuredSections };
}

export function calculateSemanticAutomationReadiness(input: {
  page: Gnr8Page;
  semanticConfidence: SemanticConfidenceResult;
  semanticFollowUpSuggestions: string[];
  semanticImpactSummary?: SemanticImpactSummary;
}): SemanticAutomationReadinessResult {
  const baseScoreRaw = input.semanticConfidence?.score;
  const baseScore = typeof baseScoreRaw === "number" ? baseScoreRaw : 0;

  if (baseScore === 0) {
    return {
      score: 0,
      label: "not-ready",
      reasons: ["No structured semantic baseline available."],
    };
  }

  const reasonsStructural: string[] = [];
  const reasonsSemanticConfidence: string[] = [];
  const reasonsFollowUps: string[] = [];
  const reasonsImprovement: string[] = [];

  let score = baseScore;

  const structural = getStructuralSignals(input.page);
  if (structural.hasLegacy || structural.structuredSections < 2) {
    score -= 15;
    reasonsStructural.push("Structural instability affects semantic automation safety.");
  }

  if (input.semanticConfidence.label === "low") {
    score -= 25;
    reasonsSemanticConfidence.push("Semantic content is unstable.");
  } else if (input.semanticConfidence.label === "medium") {
    score -= 10;
    reasonsSemanticConfidence.push("Semantic content still evolving.");
  }

  const followUps = Array.isArray(input.semanticFollowUpSuggestions) ? input.semanticFollowUpSuggestions : [];
  if (followUps.length > 0) {
    const penalty = Math.min(followUps.length * 12, 36);
    score -= penalty;
    reasonsFollowUps.push("Semantic weaknesses still require manual improvement.");
  }

  if (input.semanticConfidence.label === "high" && followUps.length === 0) {
    score += 10;
    reasonsSemanticConfidence.push("Semantic structure is stable.");
  }

  const impact = input.semanticImpactSummary;
  if (impact) {
    if (impact.improved === true && typeof impact.delta === "number" && impact.delta >= 10) {
      score += 6;
      reasonsImprovement.push("Recent semantic improvements detected.");
    } else if (impact.improved === false && (impact.remainingWeaknesses?.length ?? 0) > 0) {
      score -= 6;
      reasonsImprovement.push("Recent semantic execution did not resolve weaknesses.");
    }
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    label: labelForScore(finalScore),
    reasons: uniqStable([
      ...reasonsStructural,
      ...reasonsSemanticConfidence,
      ...reasonsFollowUps,
      ...reasonsImprovement,
    ]).slice(0, 4),
  };
}

