import { NextRequest, NextResponse } from "next/server";

import type { AdaptiveSchedulingSignalsV1 } from "@/gnr8/ai/adaptive-scheduling-signals";
import { buildAdaptiveStrategicPolicyV1 } from "@/gnr8/ai/adaptive-strategic-policy";
import type { ExecutionLearningSignalsV1 } from "@/gnr8/ai/execution-learning-signals";
import type { ExecutionMemoryV1 } from "@/gnr8/ai/execution-memory";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { StrategicEvolutionModelV1 } from "@/gnr8/ai/strategic-evolution-model";
import type { StrategicLearningCoreV1 } from "@/gnr8/ai/strategic-learning-core";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";

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

    const strategicEvolutionModel = parseOptionalObject<StrategicEvolutionModelV1>((body as any).strategicEvolutionModel);
    const strategicLearningCore = parseOptionalObject<StrategicLearningCoreV1>((body as any).strategicLearningCore);
    const adaptiveSchedulingSignals = parseOptionalObject<AdaptiveSchedulingSignalsV1>((body as any).adaptiveSchedulingSignals);
    const executionLearningSignals = parseOptionalObject<ExecutionLearningSignalsV1>((body as any).executionLearningSignals);
    const executionMemory = parseOptionalObject<ExecutionMemoryV1>((body as any).executionMemory);
    const strategicSemanticExecutionReadiness = parseOptionalObject<StrategicSemanticExecutionReadiness>(
      (body as any).strategicSemanticExecutionReadiness,
    );
    const siteSemanticConsistency = parseOptionalObject<SiteSemanticConsistency>((body as any).siteSemanticConsistency);
    const unresolvedRatio = parseOptionalUnresolvedRatio(body);

    const adaptiveStrategicPolicy = buildAdaptiveStrategicPolicyV1({
      strategicEvolutionModel,
      strategicLearningCore,
      adaptiveSchedulingSignals,
      executionLearningSignals,
      executionMemory,
      strategicSemanticExecutionReadiness,
      siteSemanticConsistency,
      unresolvedRatio,
    });

    return NextResponse.json({ adaptiveStrategicPolicy }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

