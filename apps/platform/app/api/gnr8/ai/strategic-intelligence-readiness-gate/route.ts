import { NextRequest, NextResponse } from "next/server";

import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import { buildStrategicIntelligenceReadinessGateV1 } from "@/gnr8/ai/strategic-intelligence-readiness-gate";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicIntelligenceStabilityModelV1 } from "@/gnr8/ai/strategic-intelligence-stability-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseOptionalObject<T>(value: unknown): T | Record<string, unknown> | null {
  if (typeof value === "undefined" || value === null) return null;
  if (!isRecord(value)) return null;
  return value as T | Record<string, unknown>;
}

function parseOptionalUnresolvedRatio(body: Record<string, unknown>): number | undefined {
  const raw = (body as any).unresolvedRatio as unknown;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return undefined;
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

    const strategicIntelligenceStabilityModel = parseOptionalObject<StrategicIntelligenceStabilityModelV1>(
      (body as any).strategicIntelligenceStabilityModel,
    );
    const strategicCoherenceEngine = parseOptionalObject<StrategicCoherenceEngineV1>((body as any).strategicCoherenceEngine);
    const strategicStabilityEngine = parseOptionalObject<StrategicStabilityEngineV1>((body as any).strategicStabilityEngine);
    const strategicSelfAlignment = parseOptionalObject<StrategicSelfAlignmentV1>((body as any).strategicSelfAlignment);
    const strategicDirectionEngine = parseOptionalObject<StrategicDirectionEngineV1>((body as any).strategicDirectionEngine);
    const strategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).strategicEvolutionModel);
    const strategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).strategicLearningCore);
    const strategicDriftDetection = parseOptionalObject<StrategicDriftDetectionV1>((body as any).strategicDriftDetection);
    const adaptiveStrategicPolicy = parseOptionalObject<AdaptiveStrategicPolicyV1>((body as any).adaptiveStrategicPolicy);
    const strategicRuntimeAdaptationPolicy = parseOptionalObject<StrategicRuntimeAdaptationPolicyV1>(
      (body as any).strategicRuntimeAdaptationPolicy,
    );

    const siteSemanticConsistency = parseOptionalObject<SiteSemanticConsistency>((body as any).siteSemanticConsistency);
    const unresolvedRatio = parseOptionalUnresolvedRatio(body);

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
    const previousAdaptiveStrategicPolicy = parseOptionalObject<AdaptiveStrategicPolicyV1>((body as any).previousAdaptiveStrategicPolicy);
    const previousStrategicRuntimeAdaptationPolicy = parseOptionalObject<StrategicRuntimeAdaptationPolicyV1>(
      (body as any).previousStrategicRuntimeAdaptationPolicy,
    );

    const strategicIntelligenceReadinessGate = buildStrategicIntelligenceReadinessGateV1({
      strategicIntelligenceStabilityModel,
      strategicCoherenceEngine,
      strategicStabilityEngine,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicDriftDetection,
      adaptiveStrategicPolicy,
      strategicRuntimeAdaptationPolicy,
      unresolvedRatio,
      siteSemanticConsistency,
      previousStrategicIntelligenceStabilityModel,
      previousStrategicCoherenceEngine,
      previousStrategicStabilityEngine,
      previousStrategicSelfAlignment,
      previousStrategicDirectionEngine,
      previousStrategicEvolutionModel,
      previousStrategicLearningCore,
      previousStrategicDriftDetection,
      previousAdaptiveStrategicPolicy,
      previousStrategicRuntimeAdaptationPolicy,
    });

    return NextResponse.json({ strategicIntelligenceReadinessGate }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

