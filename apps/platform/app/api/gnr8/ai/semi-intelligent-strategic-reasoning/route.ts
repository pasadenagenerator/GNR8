import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildSemiIntelligentStrategicReasoningV1 } from "@/gnr8/ai/semi-intelligent-strategic-reasoning";
import type { StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicIntelligencePhaseTransitionEngineV1 } from "@/gnr8/ai/strategic-intelligence-phase-transition-engine";
import type { StrategicIntelligenceReadinessGateV1 } from "@/gnr8/ai/strategic-intelligence-readiness-gate";
import type { StrategicIntelligenceStabilityModelV1 } from "@/gnr8/ai/strategic-intelligence-stability-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicPhaseEvolutionMapV1 } from "@/gnr8/ai/strategic-phase-evolution-map";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalObject<T>(value: unknown): T | Record<string, unknown> | null {
  if (typeof value === "undefined" || value === null) return null;
  if (!isRecord(value)) return null;
  return value as T | Record<string, unknown>;
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

      const page = typeof (item as any).page === "undefined" ? undefined : (item as any).page;
      normalizedInputPages.push({ slug, page: isGnr8Page(page) ? (page as Gnr8Page) : undefined });
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

    const strategicSemanticReasoning = buildStrategicSemanticReasoning({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
    });

    const strategicSemanticPlan = buildStrategicSemanticPlan({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticReasoning,
    });

    const strategicSemanticExecutionReadiness = buildStrategicSemanticExecutionReadiness({
      pages: normalizedInputPages,
      resolvedPages,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticReasoning,
      strategicSemanticPlan,
    });

    const strategicIntelligenceStabilityModel = parseOptionalObject<StrategicIntelligenceStabilityModelV1>((body as any).strategicIntelligenceStabilityModel);
    const strategicCoherenceEngine = parseOptionalObject<StrategicCoherenceEngineV1>((body as any).strategicCoherenceEngine);
    const strategicStabilityEngine = parseOptionalObject<StrategicStabilityEngineV1>((body as any).strategicStabilityEngine);
    const strategicSelfAlignment = parseOptionalObject<StrategicSelfAlignmentV1>((body as any).strategicSelfAlignment);
    const strategicDirectionEngine = parseOptionalObject<StrategicDirectionEngineV1>((body as any).strategicDirectionEngine);
    const strategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).strategicEvolutionModel);
    const strategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).strategicLearningCore);
    const strategicIntelligenceReadinessGate = parseOptionalObject<StrategicIntelligenceReadinessGateV1>((body as any).strategicIntelligenceReadinessGate);
    const strategicIntelligencePhaseTransitionEngine = parseOptionalObject<StrategicIntelligencePhaseTransitionEngineV1>(
      (body as any).strategicIntelligencePhaseTransitionEngine,
    );
    const strategicPhaseEvolutionMap = parseOptionalObject<StrategicPhaseEvolutionMapV1>((body as any).strategicPhaseEvolutionMap);
    const strategicDriftDetection = parseOptionalObject<StrategicDriftDetectionV1>((body as any).strategicDriftDetection);

    const previousStrategicIntelligenceStabilityModel = parseOptionalObject<StrategicIntelligenceStabilityModelV1>(
      (body as any).previousStrategicIntelligenceStabilityModel,
    );
    const previousStrategicCoherenceEngine = parseOptionalObject<StrategicCoherenceEngineV1>((body as any).previousStrategicCoherenceEngine);
    const previousStrategicStabilityEngine = parseOptionalObject<StrategicStabilityEngineV1>((body as any).previousStrategicStabilityEngine);
    const previousStrategicSelfAlignment = parseOptionalObject<StrategicSelfAlignmentV1>((body as any).previousStrategicSelfAlignment);
    const previousStrategicDirectionEngine = parseOptionalObject<StrategicDirectionEngineV1>((body as any).previousStrategicDirectionEngine);
    const previousStrategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).previousStrategicEvolutionModel);
    const previousStrategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).previousStrategicLearningCore);
    const previousStrategicDriftDetection = parseOptionalObject<StrategicDriftDetectionV1>((body as any).previousStrategicDriftDetection);
    const previousStrategicIntelligenceReadinessGate = parseOptionalObject<StrategicIntelligenceReadinessGateV1>(
      (body as any).previousStrategicIntelligenceReadinessGate,
    );
    const previousStrategicPhaseEvolutionMap = parseOptionalObject<StrategicPhaseEvolutionMapV1>((body as any).previousStrategicPhaseEvolutionMap);
    const previousStrategicIntelligenceState = parseOptionalObject<Record<string, unknown>>((body as any).previousStrategicIntelligenceState);

    const { semiStrategicReasoning } = buildSemiIntelligentStrategicReasoningV1({
      strategicIntelligenceStabilityModel,
      strategicCoherenceEngine,
      strategicStabilityEngine,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicIntelligenceReadinessGate,
      strategicIntelligencePhaseTransitionEngine,
      strategicPhaseEvolutionMap,
      strategicDriftDetection,
      unresolvedRatio,
      siteSemanticConsistency,
      siteSemanticIntelligence,
      strategicSemanticReasoning,
      strategicSemanticPlan,
      strategicSemanticExecutionReadiness,
      previousStrategicIntelligenceStabilityModel,
      previousStrategicCoherenceEngine,
      previousStrategicStabilityEngine,
      previousStrategicSelfAlignment,
      previousStrategicDirectionEngine,
      previousStrategicEvolutionModel,
      previousStrategicLearningCore,
      previousStrategicDriftDetection,
      previousStrategicIntelligenceReadinessGate,
      previousStrategicPhaseEvolutionMap,
      previousStrategicIntelligenceState: previousStrategicIntelligenceState as Record<string, unknown> | null,
    });

    return NextResponse.json({ resolvedPages, unresolvedPages, semiStrategicReasoning }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

