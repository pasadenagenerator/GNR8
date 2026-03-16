import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";

import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import { buildAdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import { buildAdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import { buildAdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import { buildExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import { buildExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import { buildStrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import { buildStrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
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

function normalizeInputPages(pagesRaw: unknown[]): InputPage[] {
  const pages: InputPage[] = [];
  for (let i = 0; i < pagesRaw.length; i += 1) {
    const item = pagesRaw[i] as unknown;

    if (isGnr8Page(item)) {
      const slug = normalizeSlug(item.slug) || `/__missing_slug_${i}__`;
      pages.push({ slug, page: { ...item, slug } });
      continue;
    }

    if (!isRecord(item)) {
      pages.push({ slug: `/__missing_slug_${i}__` });
      continue;
    }

    const pageCandidate = (item as any).page as unknown;
    const inlinePage = isGnr8Page(pageCandidate) ? ({ ...(pageCandidate as Gnr8Page) } as Gnr8Page) : null;

    const slugRaw =
      typeof (item as any).slug === "string"
        ? String((item as any).slug)
        : inlinePage && typeof inlinePage.slug === "string"
          ? String(inlinePage.slug)
          : "";
    const slug = normalizeSlug(slugRaw) || `/__missing_slug_${i}__`;

    pages.push({
      slug,
      page: inlinePage ? ({ ...inlinePage, slug } as Gnr8Page) : undefined,
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

function safeArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const normalized = normalizeInputPages(safeArray((body as any).pages));

    const resolvedPages: Array<{ slug: string; page: Gnr8Page }> = [];
    const unresolvedPages: string[] = [];

    for (const p of normalized) {
      if (p.page) {
        resolvedPages.push({ slug: p.slug, page: { ...p.page, slug: p.slug } });
        continue;
      }

      const loaded = p.slug ? await getPageBySlug(p.slug).catch(() => null) : null;
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
      ((strategicSemanticExecutionReadinessCandidate as any) as StrategicSemanticExecutionReadiness | Record<string, unknown> | null) ??
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
    const executionMemory: ExecutionMemoryV1 | Record<string, unknown> =
      (executionMemoryCandidate as any) ??
      buildExecutionMemoryV1({
        runtimeLedger: runtimeLedgerCandidate,
        executionReplay: executionReplayCandidate,
        scheduler: schedulerCandidate,
        unresolvedRatio,
        siteSemanticIntelligence,
        siteSemanticConsistency,
      });

    const executionLearningSignalsCandidate = normalizeOptionalRecord(body, ["executionLearningSignals"]);
    const executionLearningSignals: ExecutionLearningSignalsV1 | Record<string, unknown> =
      (executionLearningSignalsCandidate as any) ??
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
    const adaptiveSchedulingSignals: AdaptiveSchedulingSignalsV1 | Record<string, unknown> =
      (adaptiveSchedulingSignalsCandidate as any) ??
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
    const strategicLearningCore: StrategicLearningCoreV1 | Record<string, unknown> =
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

    const strategicEvolutionModelCandidate = normalizeOptionalRecord(body, ["strategicEvolutionModel"]);
    const strategicEvolutionModel: StrategicEvolutionModelV1 | Record<string, unknown> =
      (strategicEvolutionModelCandidate as any) ??
      buildStrategicEvolutionModelV1({
        strategicLearningCore,
        executionLearningSignals,
        adaptiveSchedulingSignals,
        strategicSemanticExecutionReadiness,
        executionMemory,
        siteSemanticIntelligence,
        siteSemanticConsistency,
        unresolvedRatio,
      });

    const adaptiveStrategicPolicyCandidate = normalizeOptionalRecord(body, ["adaptiveStrategicPolicy"]);
    const adaptiveStrategicPolicy: AdaptiveStrategicPolicyV1 | Record<string, unknown> =
      (adaptiveStrategicPolicyCandidate as any) ??
      buildAdaptiveStrategicPolicyV1({
        strategicEvolutionModel,
        strategicLearningCore,
        adaptiveSchedulingSignals,
        executionLearningSignals,
        executionMemory,
        strategicSemanticExecutionReadiness,
        siteSemanticConsistency,
        unresolvedRatio,
      });

    const adaptiveStrategicFeedback = buildAdaptiveStrategicFeedbackV1({
      strategicLearningCore,
      strategicEvolutionModel,
      adaptiveStrategicPolicy,
      executionLearningSignals,
      adaptiveSchedulingSignals,
      strategicSemanticExecutionReadiness,
      siteSemanticConsistency,
      unresolvedRatio,
    });

    return NextResponse.json(
      {
        resolvedPages,
        unresolvedPages,
        adaptiveStrategicFeedback,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

