import { NextRequest, NextResponse } from "next/server";

import { buildExactDuplicateCleanupNotes, cleanupExactDuplicateSections, runLayoutAgent } from "@/gnr8/ai/layout-agent";
import { normalizeSectionLayout } from "@/gnr8/ai/layout-normalizer";
import { buildOptimizationActionPlans } from "@/gnr8/ai/optimization-action-engine";
import { mergeSupportedDuplicateSections } from "@/gnr8/ai/section-merge";
import { buildMigrationReviewSummary, type MigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { getPageBySlug, publishPage, savePage } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function applySafeCleanupSmartMergeNormalizePipeline(page: Gnr8Page): { page: Gnr8Page; notes: string[] } {
  const reviewBefore = buildMigrationReviewSummary(page);
  const exactNotes = buildExactDuplicateCleanupNotes(page, reviewBefore.duplicateDetails);
  const afterExact = cleanupExactDuplicateSections(page, reviewBefore.duplicateDetails);

  const reviewAfterExact = buildMigrationReviewSummary(afterExact);
  const mergeResult = mergeSupportedDuplicateSections(afterExact, reviewAfterExact.duplicateDetails);

  const normalized = normalizeSectionLayout(mergeResult.page);

  return {
    page: normalized.changed ? normalized.page : mergeResult.page,
    notes: [...exactNotes, ...mergeResult.notes, ...normalized.notes],
  };
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

    const apply = body.apply === true;
    const safeAutoFix = body.safeAutoFix === true;

    const page = await getPageBySlug(slug);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const review = buildMigrationReviewSummary(page);
    const actionPlans = buildOptimizationActionPlans(review);

    if (!apply) {
      return NextResponse.json(
        {
          success: true,
          page,
          review,
          actionPlans,
        },
        { status: 200 },
      );
    }

    const appliedActions: string[] = [];
    const skippedActions: string[] = [];
    const notes: string[] = [];

    const plansToApply = safeAutoFix ? actionPlans.filter((p) => p.safe) : actionPlans.slice(0, 1);

    for (const plan of actionPlans) {
      const shouldApply = safeAutoFix ? plan.safe : plan === actionPlans[0];
      if (!shouldApply) skippedActions.push(plan.suggestion);
    }

    const reviewBefore: MigrationReviewSummary = review;

    if (plansToApply.length === 0) {
      const reviewAfter = buildMigrationReviewSummary(page);
      return NextResponse.json(
        {
          success: true,
          appliedActions,
          skippedActions,
          page,
          reviewBefore,
          reviewAfter,
          notes: ["No optimization actions were applied.", ...notes],
        },
        { status: 200 },
      );
    }

    const cleanup = applySafeCleanupSmartMergeNormalizePipeline(page);
    let workingPage: Gnr8Page = cleanup.page;
    notes.push(...cleanup.notes);

    for (const plan of plansToApply) {
      const result = runLayoutAgent({ prompt: plan.actionPrompt, page: workingPage });
      workingPage = result.page;
      notes.push(...(result.plan.notes ?? []));

      await savePage(workingPage.slug, workingPage);
      await publishPage(workingPage.slug);

      workingPage = (await getPageBySlug(workingPage.slug)) ?? workingPage;
      appliedActions.push(plan.suggestion);
    }

    const reviewAfter = buildMigrationReviewSummary(workingPage);

    return NextResponse.json(
      {
        success: true,
        appliedActions,
        skippedActions,
        page: workingPage,
        reviewBefore,
        reviewAfter,
        notes: [
          `Applied ${appliedActions.length} optimization action${appliedActions.length === 1 ? "" : "s"}.`,
          ...notes,
        ],
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

