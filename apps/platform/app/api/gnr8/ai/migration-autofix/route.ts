import { NextRequest, NextResponse } from "next/server";

import {
  buildExactDuplicateCleanupNotes,
  cleanupExactDuplicateSections,
  runLayoutAgent,
  type LayoutAgentPlan,
} from "@/gnr8/ai/layout-agent";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import {
  buildMigrationReviewSummary,
  buildSuggestedActionsAndNotes,
} from "@/gnr8/ai/migration-review-logic";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isDuplicateCleanupSuggestion(action: string): boolean {
  return action.startsWith("Remove duplicate ");
}

function applyDuplicateCleanupPipeline(page: Gnr8Page): { page: Gnr8Page; notes: string[] } {
  const reviewBefore = buildMigrationReviewSummary(page);
  const exactNotes = buildExactDuplicateCleanupNotes(page, reviewBefore.duplicateDetails);
  const afterExact = cleanupExactDuplicateSections(page, reviewBefore.duplicateDetails);

  const reviewAfterExact = buildMigrationReviewSummary(afterExact);
  const mergeResult = mergeSupportedDuplicateSections(afterExact, reviewAfterExact.duplicateDetails);

  return { page: mergeResult.page, notes: [...exactNotes, ...mergeResult.notes] };
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

    const page = await getPageBySlug(slug);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const review = buildMigrationReviewSummary(page);
    const { suggestedActions, notes: reviewNotes } = buildSuggestedActionsAndNotes(review);

    const actionableActions = suggestedActions.filter((action) => !isDuplicateCleanupSuggestion(action));

    const cleanupOnlyAction = suggestedActions.find(isDuplicateCleanupSuggestion) ?? null;
    const chosenAction = actionableActions[0] ?? cleanupOnlyAction;

    if (!chosenAction) {
      const { page: cleanedPage, notes: cleanupNotes } = applyDuplicateCleanupPipeline(page);
      if (cleanedPage !== page) {
        await savePage(cleanedPage.slug, cleanedPage);
        await publishPage(cleanedPage.slug);

        const publishedPage = (await getPageBySlug(cleanedPage.slug)) ?? cleanedPage;

        return NextResponse.json(
          {
            success: true,
            chosenAction: "Duplicate cleanup",
            page: publishedPage,
            review,
            plan: { mode: "update", requestedSectionTypes: [], notes: cleanupNotes } satisfies LayoutAgentPlan & {
              mode: "update";
            },
            notes: ["Applied autofix action: Duplicate cleanup.", ...reviewNotes, ...cleanupNotes],
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          chosenAction: null,
          page,
          review,
          plan: null,
          notes: [...reviewNotes, "No autofix action available."],
        },
        { status: 200 },
      );
    }

    if (isDuplicateCleanupSuggestion(chosenAction)) {
      const { page: cleanedPage, notes: cleanupNotes } = applyDuplicateCleanupPipeline(page);

      await savePage(cleanedPage.slug, cleanedPage);
      await publishPage(cleanedPage.slug);

      const publishedPage = (await getPageBySlug(cleanedPage.slug)) ?? cleanedPage;

      return NextResponse.json(
        {
          success: true,
          chosenAction,
          page: publishedPage,
          review,
          plan: { mode: "update", requestedSectionTypes: [], notes: cleanupNotes } satisfies LayoutAgentPlan & {
            mode: "update";
          },
          notes: [`Applied autofix action: ${chosenAction}.`, ...reviewNotes, ...cleanupNotes],
        },
        { status: 200 },
      );
    }

    const result = runLayoutAgent({ prompt: chosenAction, page });

    const { page: cleanedPage, notes: cleanupNotes } = applyDuplicateCleanupPipeline(result.page);

    await savePage(cleanedPage.slug, cleanedPage);
    await publishPage(cleanedPage.slug);

    const publishedPage = (await getPageBySlug(cleanedPage.slug)) ?? cleanedPage;

    return NextResponse.json(
      {
        success: true,
        chosenAction,
        page: publishedPage,
        review,
        plan: { ...result.plan, mode: "update", notes: [...(result.plan.notes ?? []), ...cleanupNotes] },
        notes: [`Applied autofix action: ${chosenAction}.`, ...reviewNotes, ...cleanupNotes],
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
