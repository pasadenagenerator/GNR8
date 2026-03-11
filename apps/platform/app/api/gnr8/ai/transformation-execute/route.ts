import { NextRequest, NextResponse } from "next/server";

import { buildMigrationReviewSummary } from "@/gnr8/ai/migration-review-logic";
import { executeTransformationSteps } from "@/gnr8/ai/transformation-executor";
import { buildTransformationPlan } from "@/gnr8/ai/transformation-planner";
import { getPageBySlug } from "@/gnr8/core/page-storage";

export const runtime = "nodejs";

type ExecuteBody = {
  slug?: unknown;
  approvedStepIds?: unknown;
  safeBatch?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") return null;
    out.push(v);
  }
  return out;
}

async function reloadPublishedPageOrNull(slug: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const page = await getPageBySlug(slug);
    if (page) return page;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = body as ExecuteBody;
    const slugRaw = typeof parsed.slug === "string" ? parsed.slug : "";
    const slug = slugRaw.trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const safeBatchRaw = "safeBatch" in parsed ? parsed.safeBatch : undefined;
    const safeBatch = safeBatchRaw === undefined ? false : safeBatchRaw === true;
    if (safeBatchRaw !== undefined && typeof safeBatchRaw !== "boolean") {
      return NextResponse.json({ error: "safeBatch must be a boolean" }, { status: 400 });
    }

    const approvedStepIdsRaw = "approvedStepIds" in parsed ? parsed.approvedStepIds : undefined;
    const approvedStepIds =
      approvedStepIdsRaw === undefined ? undefined : parseStringArray(approvedStepIdsRaw);
    if (approvedStepIdsRaw !== undefined && !approvedStepIds) {
      return NextResponse.json({ error: "approvedStepIds must be an array of strings" }, { status: 400 });
    }

    const hasExplicitApproved = (approvedStepIds?.length ?? 0) > 0;
    if (!hasExplicitApproved && safeBatch !== true) {
      return NextResponse.json(
        { error: "Either approvedStepIds (non-empty) or safeBatch=true is required" },
        { status: 400 },
      );
    }

    const page = await reloadPublishedPageOrNull(slug);
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    const reviewBefore = buildMigrationReviewSummary(page);
    const transformationPlanBefore = buildTransformationPlan({ page, review: reviewBefore });

    const steps = Array.isArray(transformationPlanBefore.steps) ? transformationPlanBefore.steps : [];
    const safeStepIds = safeBatch ? steps.filter((s) => s?.safe === true).map((s) => s.id) : [];
    const selectedStepIds = [
      ...(approvedStepIds ?? []),
      ...safeStepIds,
    ];

    if (selectedStepIds.length === 0) {
      const finalPage = await reloadPublishedPageOrNull(page.slug);
      if (!finalPage) {
        return NextResponse.json({ error: "Failed to reload published page" }, { status: 500 });
      }

      return NextResponse.json(
        {
          success: true,
          page: finalPage,
          transformationPlanBefore,
          transformationPlanAfter: transformationPlanBefore,
          reviewBefore,
          reviewAfter: reviewBefore,
          appliedSteps: [],
          skippedSteps: [],
          notes: ["No safe transformation steps were available."],
        },
        { status: 200 },
      );
    }

    const execution = await executeTransformationSteps({
      page,
      review: reviewBefore,
      transformationPlan: transformationPlanBefore,
      selectedStepIds,
      selection: {
        safeBatch,
        explicitlyApprovedStepIds: approvedStepIds ?? [],
      },
    });

    const finalPage = await reloadPublishedPageOrNull(execution.page.slug);
    if (!finalPage) {
      return NextResponse.json({ error: "Failed to reload published page" }, { status: 500 });
    }

    const reviewAfter = buildMigrationReviewSummary(finalPage);
    const transformationPlanAfter = buildTransformationPlan({ page: finalPage, review: reviewAfter });

    return NextResponse.json(
      {
        success: true,
        page: finalPage,
        transformationPlanBefore,
        transformationPlanAfter,
        reviewBefore,
        reviewAfter,
        appliedSteps: execution.appliedSteps,
        skippedSteps: execution.skippedSteps,
        notes: execution.notes,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
