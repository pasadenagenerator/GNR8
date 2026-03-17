import { NextRequest, NextResponse } from "next/server";

import { buildStrategicPhaseEvolutionMapV1 } from "@/gnr8/ai/strategic-phase-evolution-map";
import type { StrategicPhaseEvolutionMapV1 } from "@/gnr8/ai/strategic-phase-evolution-map";
import type { StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicIntelligencePhaseTransitionEngineV1 } from "@/gnr8/ai/strategic-intelligence-phase-transition-engine";
import type { StrategicIntelligenceReadinessGateV1 } from "@/gnr8/ai/strategic-intelligence-readiness-gate";
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const strategicIntelligencePhaseTransition = parseOptionalObject<StrategicIntelligencePhaseTransitionEngineV1>(
      (body as any).strategicIntelligencePhaseTransition,
    );
    const strategicIntelligenceReadinessGate = parseOptionalObject<StrategicIntelligenceReadinessGateV1>(
      (body as any).strategicIntelligenceReadinessGate,
    );
    const strategicIntelligenceStabilityModel = parseOptionalObject<StrategicIntelligenceStabilityModelV1>(
      (body as any).strategicIntelligenceStabilityModel,
    );
    const strategicCoherenceEngine = parseOptionalObject<StrategicCoherenceEngineV1>((body as any).strategicCoherenceEngine);
    const strategicStabilityEngine = parseOptionalObject<StrategicStabilityEngineV1>((body as any).strategicStabilityEngine);
    const strategicSelfAlignment = parseOptionalObject<StrategicSelfAlignmentV1>((body as any).strategicSelfAlignment);
    const strategicDirectionEngine = parseOptionalObject<StrategicDirectionEngineV1>((body as any).strategicDirectionEngine);
    const strategicRuntimeAdaptationPolicy = parseOptionalObject<StrategicRuntimeAdaptationPolicyV1>((body as any).strategicRuntimeAdaptationPolicy);
    const strategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).strategicEvolutionModel);
    const strategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).strategicLearningCore);

    const previousStrategicPhaseEvolutionMap = parseOptionalObject<StrategicPhaseEvolutionMapV1>((body as any).previousStrategicPhaseEvolutionMap);

    const strategicPhaseEvolutionMap = buildStrategicPhaseEvolutionMapV1({
      strategicIntelligencePhaseTransition,
      strategicIntelligenceReadinessGate,
      strategicIntelligenceStabilityModel,
      strategicCoherenceEngine,
      strategicStabilityEngine,
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy,
      strategicEvolutionModel,
      strategicLearningCore,
      previousStrategicPhaseEvolutionMap,
    });

    return NextResponse.json({ strategicPhaseEvolutionMap }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

