import { NextRequest, NextResponse } from "next/server";

import type { AutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import { buildAdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { ExecutionCycleSchedulerV1 } from "@/gnr8/ai/execution-cycle-scheduler";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { ExecutionReplayResultV1 } from "@/gnr8/ai/execution-replay-engine";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import type { Gnr8Page } from "@/gnr8/types/page";

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

function parseOptionalObject<T>(value: unknown): T | Record<string, unknown> | null {
  if (typeof value === "undefined" || value === null) return null;
  if (!isRecord(value)) return null;
  return value as T | Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const pagesRaw = body.pages;
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

      if (isGnr8Page(item)) {
        const slug = normalizeSlug(item.slug);
        if (!slug) return NextResponse.json({ error: `pages[${i}].slug is required` }, { status: 400 });
        normalizedInputPages.push({ slug, page: item });
        continue;
      }

      const slugRaw = typeof (item as any).slug === "string" ? String((item as any).slug) : "";
      const slug = normalizeSlug(slugRaw);
      if (!slug) {
        return NextResponse.json({ error: `pages[${i}].slug is required` }, { status: 400 });
      }

      const pageRaw = (item as any).page as unknown;
      if (typeof pageRaw !== "undefined" && !isRecord(pageRaw)) {
        return NextResponse.json({ error: `pages[${i}].page must be an object` }, { status: 400 });
      }

      normalizedInputPages.push({
        slug,
        page: isGnr8Page(pageRaw) ? (pageRaw as Gnr8Page) : undefined,
      });
    }

    const resolvedPages: Array<{ slug: string; page: Gnr8Page }> = [];
    const unresolvedPages: string[] = [];

    for (const p of normalizedInputPages) {
      if (p.page) {
        const normalizedInline: Gnr8Page = {
          ...p.page,
          slug: p.slug,
        };
        resolvedPages.push({ slug: p.slug, page: normalizedInline });
        continue;
      }

      const loaded = await getPageBySlug(p.slug).catch(() => null);
      if (!loaded) {
        unresolvedPages.push(p.slug);
        continue;
      }

      const normalizedLoaded: Gnr8Page = {
        ...loaded,
        slug: p.slug,
      };
      resolvedPages.push({ slug: p.slug, page: normalizedLoaded });
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

    const totalInputs = normalizedInputPages.length;
    const unresolvedRatio = totalInputs > 0 ? unresolvedPages.length / totalInputs : unresolvedPages.length > 0 ? 1 : 0;

    const runtimeLedger = parseOptionalObject<AutonomousExecutionRuntimeLedgerV1>((body as any).runtimeLedger);
    const executionReplay = parseOptionalObject<ExecutionReplayResultV1>((body as any).executionReplay);
    const executionCycleScheduler = parseOptionalObject<ExecutionCycleSchedulerV1>((body as any).executionCycleScheduler);
    const executionMemory = parseOptionalObject<ExecutionMemoryV1>((body as any).executionMemory);
    const executionLearningSignals = parseOptionalObject<ExecutionLearningSignalsV1>((body as any).executionLearningSignals);

    const adaptiveSchedulingSignals = buildAdaptiveSchedulingSignalsV1({
      runtimeLedger,
      executionReplay,
      executionCycleScheduler,
      executionMemory,
      executionLearningSignals,
      siteSemanticConsistency,
      unresolvedRatio,
    });

    return NextResponse.json(
      {
        resolvedPages,
        unresolvedPages,
        adaptiveSchedulingSignals,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

