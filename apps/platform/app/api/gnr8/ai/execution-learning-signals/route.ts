import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import { buildExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";

export const runtime = "nodejs";

type InputPage = { slug: string; page?: Gnr8Page };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

function isGnr8Page(value: unknown): value is Gnr8Page {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.slug !== "string" || !value.slug.trim()) return false;
  if (!Array.isArray(value.sections)) return false;
  if (typeof value.title !== "undefined" && typeof value.title !== "string") return false;
  return true;
}

function normalizeInputPages(pagesRaw: unknown[]): InputPage[] | { error: string; status: number } {
  if (pagesRaw.length < 1) return { error: "At least 1 page is required", status: 400 };

  const pages: InputPage[] = [];
  for (let i = 0; i < pagesRaw.length; i += 1) {
    const item = pagesRaw[i] as unknown;

    if (isGnr8Page(item)) {
      const slug = normalizeSlug(item.slug);
      if (!slug) return { error: `pages[${i}].slug is required`, status: 400 };
      pages.push({ slug, page: { ...item, slug } });
      continue;
    }

    if (!isRecord(item)) {
      return { error: `Invalid pages[${i}] item`, status: 400 };
    }

    const slugRaw = typeof (item as any).slug === "string" ? (item as any).slug : "";
    const slug = normalizeSlug(slugRaw);
    if (!slug) return { error: `pages[${i}].slug is required`, status: 400 };

    const pageCandidate = (item as any).page as unknown;
    if (typeof (item as any).page !== "undefined" && !isRecord(pageCandidate)) {
      return { error: `pages[${i}].page must be an object`, status: 400 };
    }

    pages.push({
      slug,
      page: isGnr8Page(pageCandidate) ? ({ ...(pageCandidate as Gnr8Page), slug } as Gnr8Page) : undefined,
    });
  }

  return pages;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const pagesRaw = (body as any).pages as unknown;
    if (!Array.isArray(pagesRaw)) {
      return NextResponse.json({ error: "pages must be an array" }, { status: 400 });
    }

    const normalized = normalizeInputPages(pagesRaw);
    if (!Array.isArray(normalized)) {
      return NextResponse.json({ error: normalized.error }, { status: normalized.status });
    }

    const resolvedPages: Array<{ slug: string; page: Gnr8Page }> = [];
    const unresolvedPages: string[] = [];

    for (const p of normalized) {
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

    const unresolvedRatio = normalized.length > 0 ? unresolvedPages.length / normalized.length : 0;

    const siteSemanticIntelligence = buildSiteSemanticIntelligence({
      pages: normalized,
      resolvedPages,
      unresolvedPages,
    });

    const siteSemanticConsistency = buildSiteSemanticConsistency({
      pages: normalized,
      resolvedPages,
      unresolvedPages,
    });

    const runtimeLedgerCandidate = isRecord((body as any).runtimeLedger) ? ((body as any).runtimeLedger as Record<string, unknown>) : null;
    const executionReplayCandidate = isRecord((body as any).executionReplay)
      ? ((body as any).executionReplay as Record<string, unknown>)
      : isRecord((body as any).replay)
        ? ((body as any).replay as Record<string, unknown>)
        : isRecord((body as any).lastReplay)
          ? ((body as any).lastReplay as Record<string, unknown>)
          : null;

    const schedulerCandidate = isRecord((body as any).executionCycleScheduler)
      ? ((body as any).executionCycleScheduler as Record<string, unknown>)
      : isRecord((body as any).scheduler)
        ? ((body as any).scheduler as Record<string, unknown>)
        : null;

    const executionMemoryCandidate = isRecord((body as any).executionMemory) ? ((body as any).executionMemory as Record<string, unknown>) : null;
    const executionMemory =
      executionMemoryCandidate ??
      buildExecutionMemoryV1({
        runtimeLedger: runtimeLedgerCandidate,
        executionReplay: executionReplayCandidate,
        scheduler: schedulerCandidate,
        unresolvedRatio,
        siteSemanticIntelligence,
        siteSemanticConsistency,
      });

    const executionLearningSignals = buildExecutionLearningSignalsV1({
      runtimeLedger: runtimeLedgerCandidate,
      executionReplay: executionReplayCandidate,
      executionCycleScheduler: schedulerCandidate,
      executionMemory,

      strategicExecutionRuntimeDecision: isRecord((body as any).strategicExecutionRuntimeDecision)
        ? ((body as any).strategicExecutionRuntimeDecision as Record<string, unknown>)
        : null,
      autonomousExecutionPolicy: isRecord((body as any).autonomousExecutionPolicy) ? ((body as any).autonomousExecutionPolicy as Record<string, unknown>) : null,
      strategicWaveExecutionController: isRecord((body as any).strategicWaveExecutionController)
        ? ((body as any).strategicWaveExecutionController as Record<string, unknown>)
        : null,
      semiStrategicExecutionController: isRecord((body as any).semiStrategicExecutionController)
        ? ((body as any).semiStrategicExecutionController as Record<string, unknown>)
        : null,
      mixedWavePreviewDesign: isRecord((body as any).mixedWavePreviewDesign) ? ((body as any).mixedWavePreviewDesign as Record<string, unknown>) : null,

      siteSemanticIntelligence,
      siteSemanticConsistency,

      unresolvedRatio,
    });

    return NextResponse.json({ resolvedPages, unresolvedPages, executionLearningSignals }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

