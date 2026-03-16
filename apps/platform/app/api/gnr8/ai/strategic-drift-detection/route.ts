import { NextRequest, NextResponse } from "next/server";

import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import type { AdaptiveStrategicFeedbackV1 } from "@/gnr8/ai/adaptive-strategic-feedback";
import type { AdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { AdaptiveStrategyRecommendationsV1 } from "@/gnr8/ai/adaptive-strategy-recommendations";
import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicAdaptationOrchestratorV1 } from "@/gnr8/ai/strategic-adaptation-orchestrator";
import type { StrategicAdaptationRuntimeBridgeV1 } from "@/gnr8/ai/strategic-adaptation-runtime-bridge";
import type { StrategicDirectionEngineV1 } from "@/gnr8/ai/strategic-direction-engine";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicRuntimeAdaptationPolicyV1 } from "@/gnr8/ai/strategic-runtime-adaptation-policy";
import type { StrategicSelfAlignmentV1 } from "@/gnr8/ai/strategic-self-alignment";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";
import type { StrategicDriftDetectionV1 } from "@/gnr8/ai/strategic-drift-detection";

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

    const strategicSelfAlignment = parseOptionalObject<StrategicSelfAlignmentV1>((body as any).strategicSelfAlignment);
    const strategicDirectionEngine = parseOptionalObject<StrategicDirectionEngineV1>((body as any).strategicDirectionEngine);
    const strategicRuntimeAdaptationPolicy = parseOptionalObject<StrategicRuntimeAdaptationPolicyV1>((body as any).strategicRuntimeAdaptationPolicy);
    const strategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).strategicEvolutionModel);
    const strategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).strategicLearningCore);

    const strategicAdaptationRuntimeBridge = parseOptionalObject<StrategicAdaptationRuntimeBridgeV1>((body as any).strategicAdaptationRuntimeBridge);
    const adaptiveStrategyRecommendations = parseOptionalObject<AdaptiveStrategyRecommendationsV1>((body as any).adaptiveStrategyRecommendations);
    const strategicAdaptationOrchestrator = parseOptionalObject<StrategicAdaptationOrchestratorV1>((body as any).strategicAdaptationOrchestrator);
    const adaptiveStrategicPolicy = parseOptionalObject<AdaptiveStrategicPolicyV1>((body as any).adaptiveStrategicPolicy);
    const adaptiveStrategicFeedback = parseOptionalObject<AdaptiveStrategicFeedbackV1>((body as any).adaptiveStrategicFeedback);
    const adaptiveSchedulingSignals = parseOptionalObject<AdaptiveSchedulingSignalsV1>((body as any).adaptiveSchedulingSignals);
    const executionLearningSignals = parseOptionalObject<ExecutionLearningSignalsV1>((body as any).executionLearningSignals);
    const executionMemory = parseOptionalObject<ExecutionMemoryV1>((body as any).executionMemory);
    const strategicExecutionRuntimeDecision = parseOptionalObject<StrategicExecutionRuntimeDecision>((body as any).strategicExecutionRuntimeDecision);
    const autonomousExecutionPolicy = parseOptionalObject<AutonomousExecutionPolicy>((body as any).autonomousExecutionPolicy);
    const semiStrategicExecutionController = parseOptionalObject<SemiStrategicExecutionController>((body as any).semiStrategicExecutionController);

    const strategicSemanticExecutionReadiness = parseOptionalObject<StrategicSemanticExecutionReadiness>((body as any).strategicSemanticExecutionReadiness);
    const siteSemanticConsistency = parseOptionalObject<SiteSemanticConsistency>((body as any).siteSemanticConsistency);
    const siteSemanticIntelligence = parseOptionalObject<SiteSemanticIntelligence>((body as any).siteSemanticIntelligence);

    const previousStrategicSelfAlignment = parseOptionalObject<StrategicSelfAlignmentV1>((body as any).previousStrategicSelfAlignment);
    const previousStrategicDirectionEngine = parseOptionalObject<StrategicDirectionEngineV1>((body as any).previousStrategicDirectionEngine);
    const previousStrategicRuntimeAdaptationPolicy = parseOptionalObject<StrategicRuntimeAdaptationPolicyV1>((body as any).previousStrategicRuntimeAdaptationPolicy);
    const previousStrategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).previousStrategicEvolutionModel);
    const previousStrategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).previousStrategicLearningCore);

    const unresolvedRatio = parseOptionalUnresolvedRatio(body);

    const strategicDriftDetection: StrategicDriftDetectionV1 = buildStrategicDriftDetectionV1({
      strategicSelfAlignment,
      strategicDirectionEngine,
      strategicRuntimeAdaptationPolicy,
      strategicEvolutionModel,
      strategicLearningCore,
      strategicAdaptationRuntimeBridge,
      adaptiveStrategyRecommendations,
      strategicAdaptationOrchestrator,
      adaptiveStrategicPolicy,
      adaptiveStrategicFeedback,
      adaptiveSchedulingSignals,
      executionLearningSignals,
      executionMemory,
      strategicExecutionRuntimeDecision,
      autonomousExecutionPolicy,
      semiStrategicExecutionController,
      strategicSemanticExecutionReadiness,
      siteSemanticConsistency,
      siteSemanticIntelligence,
      unresolvedRatio,
      previousStrategicSelfAlignment,
      previousStrategicDirectionEngine,
      previousStrategicRuntimeAdaptationPolicy,
      previousStrategicEvolutionModel,
      previousStrategicLearningCore,
    });

    return NextResponse.json({ strategicDriftDetection }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

