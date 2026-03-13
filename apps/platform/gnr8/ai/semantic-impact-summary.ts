import type { MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";

export type SemanticImpactSummary = {
  improved: boolean;
  summary: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  reducedWeaknesses: string[];
  remainingWeaknesses: string[];
};

function buildDeterministicSummary(input: {
  delta: number;
  reducedWeaknesses: string[];
  remainingWeaknesses: string[];
}): string {
  const delta = input.delta;
  if (delta > 0 && input.reducedWeaknesses.length > 0) {
    return "Semantic quality improved and some weaknesses were reduced.";
  }
  if (delta > 0) return "Semantic quality improved.";
  if (delta < 0) return "Semantic quality decreased.";
  if (input.remainingWeaknesses.length > 0) {
    return "Semantic quality did not improve; semantic weaknesses remain.";
  }
  return "Semantic quality is unchanged.";
}

export function buildSemanticImpactSummary(input: {
  reviewBefore: MigrationReviewSummary;
  reviewAfter: MigrationReviewSummary;
}): SemanticImpactSummary {
  const scoreBeforeRaw = input.reviewBefore.semanticConfidence?.score;
  const scoreAfterRaw = input.reviewAfter.semanticConfidence?.score;
  const scoreBefore = typeof scoreBeforeRaw === "number" ? scoreBeforeRaw : 0;
  const scoreAfter = typeof scoreAfterRaw === "number" ? scoreAfterRaw : 0;
  const delta = scoreAfter - scoreBefore;
  const improved = delta > 0;

  const beforeNotesRaw = input.reviewBefore.semanticConfidence?.notes;
  const afterNotesRaw = input.reviewAfter.semanticConfidence?.notes;
  const beforeNotes = Array.isArray(beforeNotesRaw) ? beforeNotesRaw : [];
  const afterNotes = Array.isArray(afterNotesRaw) ? afterNotesRaw : [];

  const reducedWeaknesses = beforeNotes.filter((note) => !afterNotes.includes(note));
  const remainingWeaknesses = afterNotes.slice();

  return {
    improved,
    summary: buildDeterministicSummary({ delta, reducedWeaknesses, remainingWeaknesses }),
    scoreBefore,
    scoreAfter,
    delta,
    reducedWeaknesses,
    remainingWeaknesses,
  };
}

