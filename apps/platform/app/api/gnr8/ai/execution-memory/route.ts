import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";

export const runtime = "nodejs";

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
    if (pagesRaw.length < 1) {
      return NextResponse.json({ error: "At least 1 page is required" }, { status: 400 });
    }

    const normalizedInputPages: Array<{ slug: string; page?: Gnr8Page }> = [];
    for (let i = 0; i < pagesRaw.length; i += 1) {
      const item = pagesRaw[i] as unknown;
      if (!isRecord(item)) {
        return NextResponse.json({ error: `Invalid pages[${i}] item` }, { status: 400 });
      }

      const slugRaw = typeof (item as any).slug === "string" ? (item as any).slug : "";
      const slug = normalizeSlug(slugRaw);
      if (!slug) {
        return NextResponse.json({ error: `pages[${i}].slug is required` }, { status: 400 });
      }

      if (typeof (item as any).page !== "undefined" && !isRecord((item as any).page)) {
        return NextResponse.json({ error: `pages[${i}].page must be an object` }, { status: 400 });
      }

      const pageCandidate = typeof (item as any).page === "undefined" ? undefined : (item as any).page;
      normalizedInputPages.push({
        slug,
        page: isGnr8Page(pageCandidate) ? ({ ...pageCandidate, slug } as Gnr8Page) : undefined,
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

    const unresolvedRatio = normalizedInputPages.length > 0 ? unresolvedPages.length / normalizedInputPages.length : 0;

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

    const executionMemory = buildExecutionMemoryV1({
      runtimeLedger: runtimeLedgerCandidate,
      executionReplay: executionReplayCandidate,
      scheduler: schedulerCandidate,
      unresolvedRatio,
      siteSemanticIntelligence,
      siteSemanticConsistency,
    });

    return NextResponse.json({ success: true, resolvedPages, unresolvedPages, executionMemory }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

