import { NextRequest, NextResponse } from "next/server";

import { runLayoutAgent } from "@/gnr8/ai/layout-agent";
import {
  buildMigrationReviewSummary,
  buildSuggestedActionsAndNotes,
  type MigrationReviewSummary,
} from "@/gnr8/ai/migration-review-logic";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function clampMaxSteps(value: unknown): number {
  const raw = typeof value === "number" ? value : Number.NaN;
  const resolved = Number.isFinite(raw) ? Math.floor(raw) : 3;
  return Math.max(1, Math.min(10, resolved));
}

function sectionTypeSignature(page: Gnr8Page): string {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  return sections
    .map((s) => (typeof s?.type === "string" ? s.type : "unknown"))
    .join("|");
}

function isReviewBetter(next: MigrationReviewSummary, prev: MigrationReviewSummary): boolean {
  if (next.legacySections < prev.legacySections) return true;
  if (next.structuredSections > prev.structuredSections) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const slugRaw = typeof body.slug === "string" ? body.slug : "";
    const slug = slugRaw.trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const maxSteps = clampMaxSteps(body.maxSteps);

    const actionsApplied: string[] = [];
    const notes: string[] = [];

    let stepsRun = 0;
    let stoppedBecause: "no-actions" | "max-steps" | "no-progress" = "no-actions";

    let finalPage: Gnr8Page | null = null;
    let finalReview: MigrationReviewSummary | null = null;

    let previousAction: string | null = null;
    let previousStepReview: MigrationReviewSummary | null = null;

    while (stepsRun < maxSteps) {
      const page = await getPageBySlug(slug);
      if (!page) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }

      const review = buildMigrationReviewSummary(page);
      const { suggestedActions, notes: reviewNotes } = buildSuggestedActionsAndNotes(review);

      finalPage = page;
      finalReview = review;

      if (suggestedActions.length === 0) {
        stoppedBecause = "no-actions";
        notes.push(...reviewNotes);
        break;
      }

      const chosenAction = suggestedActions[0]!;

      if (previousAction === chosenAction && previousStepReview && !isReviewBetter(review, previousStepReview)) {
        stoppedBecause = "no-progress";
        notes.push("Stopping: same action repeated without migration review improvement.");
        break;
      }

      const signatureBefore = sectionTypeSignature(page);

      const result = runLayoutAgent({
        prompt: chosenAction,
        page,
      });

      await savePage(result.page.slug, result.page);
      await publishPage(result.page.slug);

      const publishedPage = (await getPageBySlug(result.page.slug)) ?? result.page;
      const signatureAfter = sectionTypeSignature(publishedPage);
      const reviewAfter = buildMigrationReviewSummary(publishedPage);

      stepsRun += 1;
      actionsApplied.push(chosenAction);

      finalPage = publishedPage;
      finalReview = reviewAfter;

      if (signatureAfter === signatureBefore) {
        stoppedBecause = "no-progress";
        notes.push("Stopping: section type signature did not change after applying an action.");
        break;
      }

      const { suggestedActions: suggestedAfter } = buildSuggestedActionsAndNotes(reviewAfter);
      if (!isReviewBetter(reviewAfter, review) && suggestedAfter[0] === chosenAction) {
        stoppedBecause = "no-progress";
        notes.push("Stopping: structured/legacy counts did not improve and action would likely repeat.");
        break;
      }

      previousAction = chosenAction;
      previousStepReview = review;

      if (stepsRun >= maxSteps) {
        stoppedBecause = "max-steps";
        break;
      }
    }

    if (!finalPage || !finalReview) {
      // Should be unreachable, but keep response deterministic.
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    if (stepsRun > 0) {
      notes.unshift(`Applied ${stepsRun} autofix step${stepsRun === 1 ? "" : "s"}.`);
    }

    if (stoppedBecause === "no-actions") {
      notes.push("Stopped because no suggested actions remained.");
    } else if (stoppedBecause === "max-steps") {
      notes.push("Stopped because maxSteps was reached.");
    } else {
      notes.push("Stopped because no meaningful progress was detected.");
    }

    const response: {
      success: true;
      slug: string;
      stepsRun: number;
      stoppedBecause: "no-actions" | "max-steps" | "no-progress";
      actionsApplied: string[];
      finalPage: Gnr8Page;
      finalReview: MigrationReviewSummary;
      notes: string[];
    } = {
      success: true,
      slug,
      stepsRun,
      stoppedBecause,
      actionsApplied,
      finalPage,
      finalReview,
      notes,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
