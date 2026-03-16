import { NextRequest, NextResponse } from "next/server";

import { buildStrategicIntelligencePhaseTransitionEngineV1 } from "@/gnr8/ai/strategic-intelligence-phase-transition-engine";
import type { StrategicIntelligencePhaseTransitionEngineV1 } from "@/gnr8/ai/strategic-intelligence-phase-transition-engine";
import type { StrategicIntelligenceReadinessGateV1 } from "@/gnr8/ai/strategic-intelligence-readiness-gate";
import type { StrategicIntelligenceStabilityModelV1 } from "@/gnr8/ai/strategic-intelligence-stability-model";
import type { StrategicCoherenceEngineV1 } from "@/gnr8/ai/strategic-coherence-engine";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicStabilityEngineV1 } from "@/gnr8/ai/strategic-stability-engine";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";

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

    const strategicIntelligenceReadinessGate = parseOptionalObject<StrategicIntelligenceReadinessGateV1>(
      (body as any).strategicIntelligenceReadinessGate,
    );
    const strategicIntelligenceStabilityModel = parseOptionalObject<StrategicIntelligenceStabilityModelV1>(
      (body as any).strategicIntelligenceStabilityModel,
    );

    const strategicCoherenceEngine = parseOptionalObject<StrategicCoherenceEngineV1>((body as any).strategicCoherenceEngine);
    const strategicStabilityEngine = parseOptionalObject<StrategicStabilityEngineV1>((body as any).strategicStabilityEngine);
    const strategicDriftDetection = parseOptionalObject<StrategicDriftDetectionV1>((body as any).strategicDriftDetection);
    const strategicSelfAlignment = parseOptionalObject<StrategicSelfAlignmentV1>((body as any).strategicSelfAlignment);
    const strategicDirectionEngine = parseOptionalObject<StrategicDirectionEngineV1>((body as any).strategicDirectionEngine);
    const strategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).strategicEvolutionModel);
    const strategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).strategicLearningCore);

    const siteSemanticConsistency = parseOptionalObject<SiteSemanticConsistency>((body as any).siteSemanticConsistency);
    const unresolvedRatio = parseOptionalUnresolvedRatio(body);

    const previousStrategicIntelligenceState = parseOptionalObject<Record<string, unknown>>((body as any).previousStrategicIntelligenceState);
    const previousStrategicIntelligenceReadinessGate = parseOptionalObject<StrategicIntelligenceReadinessGateV1>(
      (body as any).previousStrategicIntelligenceReadinessGate,
    );
    const previousStrategicIntelligenceStabilityModel = parseOptionalObject<StrategicIntelligenceStabilityModelV1>(
      (body as any).previousStrategicIntelligenceStabilityModel,
    );
    const previousStrategicCoherenceEngine = parseOptionalObject<StrategicCoherenceEngineV1>((body as any).previousStrategicCoherenceEngine);
    const previousStrategicStabilityEngine = parseOptionalObject<StrategicStabilityEngineV1>((body as any).previousStrategicStabilityEngine);
    const previousStrategicDriftDetection = parseOptionalObject<StrategicDriftDetectionV1>((body as any).previousStrategicDriftDetection);

    const strategicIntelligencePhaseTransition: StrategicIntelligencePhaseTransitionEngineV1 =
      buildStrategicIntelligencePhaseTransitionEngineV1({
        strategicIntelligenceReadinessGate,
        strategicIntelligenceStabilityModel,
        strategicCoherenceEngine,
        strategicStabilityEngine,
        strategicDriftDetection,
        strategicSelfAlignment,
        strategicDirectionEngine,
        strategicEvolutionModel,
        strategicLearningCore,
        siteSemanticConsistency,
        unresolvedRatio,
        previousStrategicIntelligenceState,
        previousStrategicIntelligenceReadinessGate,
        previousStrategicIntelligenceStabilityModel,
        previousStrategicCoherenceEngine,
        previousStrategicStabilityEngine,
        previousStrategicDriftDetection,
      });

    return NextResponse.json({ strategicIntelligencePhaseTransition }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

