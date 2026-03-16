import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";

import { buildAdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import { buildExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import { buildExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import { buildStrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";

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

function normalizeOptionalRecord(body: Record<string, unknown>, keys: string[]): Record<string, unknown> | null {
  for (const k of keys) {
    const candidate = (body as any)[k] as unknown;
    if (isRecord(candidate)) return candidate as Record<string, unknown>;
  }
  return null;
}

function normalizeOptionalUnresolvedRatio(body: Record<string, unknown>): number | null {
  const raw = (body as any).unresolvedRatio as unknown;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
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

    const computedUnresolvedRatio = normalized.length > 0 ? unresolvedPages.length / normalized.length : 0;
    const unresolvedRatio = normalizeOptionalUnresolvedRatio(body) ?? computedUnresolvedRatio;

    const siteSemanticIntelligenceCandidate = normalizeOptionalRecord(body, ["siteSemanticIntelligence"]);
    const siteSemanticIntelligence =
      (siteSemanticIntelligenceCandidate as any) ??
      buildSiteSemanticIntelligence({
        pages: normalized,
        resolvedPages,
        unresolvedPages,
      });

    const siteSemanticConsistencyCandidate = normalizeOptionalRecord(body, ["siteSemanticConsistency"]);
    const siteSemanticConsistency =
      (siteSemanticConsistencyCandidate as any) ??
      buildSiteSemanticConsistency({
        pages: normalized,
        resolvedPages,
        unresolvedPages,
      });

    const strategicSemanticReasoningCandidate = normalizeOptionalRecord(body, ["strategicSemanticReasoning"]);
    const strategicSemanticReasoning =
      (strategicSemanticReasoningCandidate as any) ??
      buildStrategicSemanticReasoning({
        pages: normalized,
        resolvedPages,
        unresolvedPages,
        siteSemanticIntelligence,
        siteSemanticConsistency,
      });

    const strategicSemanticPlanCandidate = normalizeOptionalRecord(body, ["strategicSemanticPlan"]);
    const strategicSemanticPlan =
      (strategicSemanticPlanCandidate as any) ??
      buildStrategicSemanticPlan({
        pages: normalized,
        resolvedPages,
        unresolvedPages,
        siteSemanticIntelligence,
        siteSemanticConsistency,
        strategicSemanticReasoning,
      });

    const strategicSemanticExecutionReadinessCandidate = normalizeOptionalRecord(body, [
      "strategicSemanticExecutionReadiness",
      "strategicSemanticReadiness",
    ]);
    const strategicSemanticExecutionReadiness =
      (strategicSemanticExecutionReadinessCandidate as any) ??
      buildStrategicSemanticExecutionReadiness({
        pages: normalized,
        resolvedPages,
        unresolvedPages,
        siteSemanticIntelligence,
        siteSemanticConsistency,
        strategicSemanticReasoning,
        strategicSemanticPlan,
      });

    const runtimeLedgerCandidate = normalizeOptionalRecord(body, ["runtimeLedger"]);
    const executionReplayCandidate = normalizeOptionalRecord(body, ["executionReplay", "replay", "lastReplay"]);
    const schedulerCandidate = normalizeOptionalRecord(body, ["executionCycleScheduler", "scheduler"]);

    const executionMemoryCandidate = normalizeOptionalRecord(body, ["executionMemory"]);
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

    const executionLearningSignalsCandidate = normalizeOptionalRecord(body, ["executionLearningSignals"]);
    const executionLearningSignals =
      executionLearningSignalsCandidate ??
      buildExecutionLearningSignalsV1({
        runtimeLedger: runtimeLedgerCandidate,
        executionReplay: executionReplayCandidate,
        executionCycleScheduler: schedulerCandidate,
        executionMemory,

        strategicExecutionRuntimeDecision: normalizeOptionalRecord(body, ["strategicExecutionRuntimeDecision"]),
        autonomousExecutionPolicy: normalizeOptionalRecord(body, ["autonomousExecutionPolicy"]),
        strategicWaveExecutionController: normalizeOptionalRecord(body, ["strategicWaveExecutionController"]),
        semiStrategicExecutionController: normalizeOptionalRecord(body, ["semiStrategicExecutionController"]),
        mixedWavePreviewDesign: normalizeOptionalRecord(body, ["mixedWavePreviewDesign"]),

        siteSemanticIntelligence,
        siteSemanticConsistency,

        unresolvedRatio,
      });

    const adaptiveSchedulingSignalsCandidate = normalizeOptionalRecord(body, ["adaptiveSchedulingSignals"]);
    const adaptiveSchedulingSignals =
      adaptiveSchedulingSignalsCandidate ??
      buildAdaptiveSchedulingSignalsV1({
        runtimeLedger: runtimeLedgerCandidate,
        executionReplay: executionReplayCandidate,
        executionCycleScheduler: schedulerCandidate,
        executionMemory,
        executionLearningSignals,

        strategicExecutionRuntimeDecision: normalizeOptionalRecord(body, ["strategicExecutionRuntimeDecision"]),
        autonomousExecutionPolicy: normalizeOptionalRecord(body, ["autonomousExecutionPolicy"]),
        strategicWaveExecutionController: normalizeOptionalRecord(body, ["strategicWaveExecutionController"]),
        semiStrategicExecutionController: normalizeOptionalRecord(body, ["semiStrategicExecutionController"]),

        siteSemanticConsistency,

        unresolvedRatio,
      });

    const strategicLearningCoreCandidate = normalizeOptionalRecord(body, ["strategicLearningCore"]);
    const strategicLearningCore =
      (strategicLearningCoreCandidate as any) ??
      buildStrategicLearningCoreV1({
        executionLearningSignals,
        adaptiveSchedulingSignals,
        executionMemory,
        siteSemanticIntelligence,
        siteSemanticConsistency,
        strategicSemanticReasoning,
        strategicSemanticExecutionReadiness,
        strategicExecutionRuntimeDecision: normalizeOptionalRecord(body, ["strategicExecutionRuntimeDecision"]),
        autonomousExecutionPolicy: normalizeOptionalRecord(body, ["autonomousExecutionPolicy"]),
        semiStrategicExecutionController: normalizeOptionalRecord(body, ["semiStrategicExecutionController"]),
        unresolvedRatio,
      });

    const strategicEvolutionModel = buildStrategicEvolutionModelV1({
      strategicLearningCore,
      executionLearningSignals,
      adaptiveSchedulingSignals,
      strategicSemanticExecutionReadiness,
      executionMemory,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      unresolvedRatio,
    });

    return NextResponse.json({ strategicEvolutionModel }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

