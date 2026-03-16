import { NextRequest, NextResponse } from "next/server";

import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildAutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import { buildAutonomousExecutionRuntimeLedgerV1, type AutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import type { ExecutionReplayResultV1 } from "@/gnr8/ai/execution-replay-engine";
import { buildMixedWaveExecutionDesign } from "@/gnr8/ai/mixed-wave-execution-design";
import { buildMixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import { buildOrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import { buildSemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { decideStrategicExecutionRuntime } from "@/gnr8/ai/strategic-execution-runtime-router";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import { buildStrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";
import {
  buildRuntimeExecutionFingerprint,
  buildRuntimeExecutionGuards,
  fingerprintsEqual,
  resolveWaveTargetPages,
} from "@/gnr8/ai/autonomous-execution-runtime-guards";
import {
  buildExecutionCycleSchedulerEndpointOutputV1,
  type ExecutionCycleSchedulerDependenciesV1,
} from "@/gnr8/ai/execution-cycle-scheduler";

export const runtime = "nodejs";

type SchedulerInputPage = { slug: string; page?: Gnr8Page };

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

function inferWaveIdFromOrchestrationPreview(orchestrationPreview: any): string | null {
  const first = String(orchestrationPreview?.firstRecommendedWaveId ?? "").trim();
  if (first) return first;

  const candidates = Array.isArray(orchestrationPreview?.pilotCandidateWaveIds) ? orchestrationPreview.pilotCandidateWaveIds : [];
  for (const raw of candidates) {
    const id = String(raw ?? "").trim();
    if (id) return id;
  }

  return null;
}

async function buildSchedulerDependenciesV1(input: {
  pages: SchedulerInputPage[];
  waveId?: string;
  lastRuntimeLedger?: AutonomousExecutionRuntimeLedgerV1;
}): Promise<ExecutionCycleSchedulerDependenciesV1 & { unresolvedPages: string[]; resolvedPages: Array<{ slug: string; page: Gnr8Page }> }> {
  const normalizedInputPages = input.pages;

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

  const strategicExecutionOrchestration = buildStrategicExecutionOrchestration({
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticPlan,
    strategicSemanticExecutionReadiness,
  });

  const { orchestrationPreview } = buildOrchestrationPreview({
    strategicExecutionOrchestration,
    unresolvedPages,
  });

  const { mixedWaveExecutionDesign } = buildMixedWaveExecutionDesign({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    strategicSemanticExecutionReadiness,
    strategicSemanticReasoning,
  });

  const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    strategicExecutionOrchestration,
    strategicSemanticPlan,
    mixedWaveExecutionDesign,
  });

  const { strategicWaveExecutionController } = buildStrategicWaveExecutionController({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    strategicSemanticReasoning,
    strategicSemanticExecutionReadiness,
    strategicExecutionOrchestration,
    orchestrationPreview,
    mixedWavePreviewDesign,
    waveId: input.waveId,
  });

  const { autonomousExecutionPolicy } = buildAutonomousExecutionPolicy({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    waveId: input.waveId,
    strategicWaveExecutionController,
    strategicSemanticExecutionReadiness,
    orchestrationPreview,
    mixedWavePreviewDesign,
    strategicSemanticReasoning,
    siteSemanticIntelligence,
    siteSemanticConsistency,
  });

  const { semiStrategicExecutionController } = buildSemiStrategicExecutionController({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
    strategicWaveExecutionController,
    autonomousExecutionPolicy,
    strategicExecutionOrchestration,
    orchestrationPreview,
    strategicSemanticExecutionReadiness,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    mixedWavePreviewDesign,
  });

  const strategicExecutionRuntimeDecision = decideStrategicExecutionRuntime({
    semiStrategicExecutionController,
    strategicWaveExecutionController,
    autonomousExecutionPolicy,
    strategicSemanticExecutionReadiness,
    orchestrationPreview,
    mixedWavePreviewDesign,
    siteSemanticIntelligence,
    siteSemanticConsistency,
    unresolvedRatio,
  });

  const requestedWaveId = typeof input.waveId === "string" ? String(input.waveId).trim() : "";
  const inferredWaveId = requestedWaveId ? requestedWaveId : inferWaveIdFromOrchestrationPreview(orchestrationPreview);

  const executionSnapshot = {
    waveId: inferredWaveId || null,
    orchestrationMode: String(strategicExecutionOrchestration?.orchestrationMode ?? "blocked"),
    autonomyStage: String(autonomousExecutionPolicy?.autonomyStage ?? "manual-only"),
    executionScope: String(semiStrategicExecutionController?.executionScope ?? "none"),
  };

  const guards = buildRuntimeExecutionGuards(strategicExecutionRuntimeDecision);
  const targetedPages = resolveWaveTargetPages({ orchestrationPreview, waveId: inferredWaveId || null });
  const fingerprint = buildRuntimeExecutionFingerprint({
    selectedExecutor: strategicExecutionRuntimeDecision.selectedExecutor,
    waveId: inferredWaveId || null,
    targetedPages,
  });

  const previousFingerprint = input.lastRuntimeLedger?.fingerprint?.current ?? null;
  const idempotentSkip = fingerprintsEqual(fingerprint, previousFingerprint ?? undefined);

  const isBlocked = strategicExecutionRuntimeDecision.executionDecision === "blocked";
  const runtimeMode = isBlocked ? "blocked" : idempotentSkip ? "idempotent-skip" : "preview-only";

  const runtimeTimestamp = new Date().toISOString();

  const executionAttempt = {
    attempted: false,
    idempotentSkip,
    eligible: guards.eligibleForExecution && !!strategicExecutionRuntimeDecision.selectedExecutor && !!inferredWaveId,
    executionPath: guards.executionPath,
    reasoning: ["Scheduler observation only; no execution was requested."].slice(0, 5),
  };

  const autonomousExecutionRuntime = {
    mode: runtimeMode,
    selectedExecutor: isBlocked ? null : strategicExecutionRuntimeDecision.selectedExecutor,
    waveId: inferredWaveId || null,
    runtimeDecision: isBlocked ? "blocked" : strategicExecutionRuntimeDecision.executionDecision,
    executionMode: isBlocked ? "none" : strategicExecutionRuntimeDecision.executionMode,
    applied: false,
    executionAttempt,
    executionSnapshot,
    result: {
      kind: isBlocked ? "blocked" : "preview",
      payload: isBlocked
        ? { reasons: strategicExecutionRuntimeDecision.reasons ?? ["Execution blocked under the current execution decision."] }
        : { orchestrationPreview, strategicExecutionRuntimeDecision },
    },
    summary: isBlocked
      ? "Autonomous runtime is blocked under the current execution decision."
      : "Autonomous runtime returned a non-mutating preview result.",
    notes: ["Scheduler observation only; no execution occurred."].slice(0, 6),
  } as const;

  const runtimeLedger = buildAutonomousExecutionRuntimeLedgerV1({
    timestamp: runtimeTimestamp,
    applyRequested: false,
    waveId: inferredWaveId || null,
    resolvedPages: resolvedPages.length,
    unresolvedPages,
    runtimeDecision: autonomousExecutionRuntime.runtimeDecision,
    selectedExecutor: autonomousExecutionRuntime.selectedExecutor,
    executionMode: autonomousExecutionRuntime.executionMode,
    guardsEligible: guards.eligibleForExecution,
    guardsExecutionPath: guards.executionPath,
    guardReason: guards.guardReason ?? null,
    currentFingerprint: fingerprint ?? null,
    previousFingerprint: previousFingerprint ?? null,
    fingerprintMatched: idempotentSkip,
    snapshot: executionSnapshot,
    attempt: executionAttempt,
    outcomeMode: autonomousExecutionRuntime.mode,
    outcomeApplied: false,
    resultKind: autonomousExecutionRuntime.result.kind,
  });

  return {
    autonomousExecutionRuntime,
    runtimeLedger,
    strategicExecutionRuntimeDecision,
    autonomousExecutionPolicy,
    strategicWaveExecutionController,
    unresolvedRatio,
    unresolvedPages,
    resolvedPages,
  };
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

    const pages: SchedulerInputPage[] = [];
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
      pages.push({ slug, page: isGnr8Page(pageCandidate) ? ({ ...pageCandidate, slug } as Gnr8Page) : undefined });
    }

    const waveIdRaw = typeof (body as any).waveId === "string" ? String((body as any).waveId).trim() : "";

    const applyRaw = "apply" in (body as any) ? (body as any).apply : undefined;
    if (applyRaw !== undefined && typeof applyRaw !== "boolean") {
      return NextResponse.json({ error: "apply must be a boolean" }, { status: 400 });
    }

    const lastRuntimeLedgerRaw = "lastRuntimeLedger" in (body as any) ? (body as any).lastRuntimeLedger : undefined;
    if (lastRuntimeLedgerRaw !== undefined && lastRuntimeLedgerRaw !== null && !isRecord(lastRuntimeLedgerRaw)) {
      return NextResponse.json({ error: "lastRuntimeLedger must be an object" }, { status: 400 });
    }

    const lastReplayRaw = "lastReplay" in (body as any) ? (body as any).lastReplay : undefined;
    if (lastReplayRaw !== undefined && lastReplayRaw !== null && !isRecord(lastReplayRaw)) {
      return NextResponse.json({ error: "lastReplay must be an object" }, { status: 400 });
    }

    const deps = await buildSchedulerDependenciesV1({
      pages,
      waveId: waveIdRaw || undefined,
      lastRuntimeLedger: (isRecord(lastRuntimeLedgerRaw) ? (lastRuntimeLedgerRaw as AutonomousExecutionRuntimeLedgerV1) : undefined) ?? undefined,
    });

    const out = buildExecutionCycleSchedulerEndpointOutputV1({
      waveId: waveIdRaw || undefined,
      unresolvedRatio: deps.unresolvedRatio,
      autonomousExecutionRuntime: deps.autonomousExecutionRuntime,
      runtimeLedger: deps.runtimeLedger,
      strategicExecutionRuntimeDecision: deps.strategicExecutionRuntimeDecision,
      autonomousExecutionPolicy: deps.autonomousExecutionPolicy,
      strategicWaveExecutionController: deps.strategicWaveExecutionController,
      lastRuntimeLedger: isRecord(lastRuntimeLedgerRaw) ? (lastRuntimeLedgerRaw as AutonomousExecutionRuntimeLedgerV1) : undefined,
      lastReplay: isRecord(lastReplayRaw) ? (lastReplayRaw as ExecutionReplayResultV1) : undefined,
    });

    return NextResponse.json(
      {
        success: true,
        applyRequested: applyRaw === true,
        resolvedPages: deps.resolvedPages.length,
        unresolvedPages: deps.unresolvedPages,
        autonomousExecutionRuntime: deps.autonomousExecutionRuntime,
        runtimeLedger: deps.runtimeLedger,
        strategicExecutionRuntimeDecision: deps.strategicExecutionRuntimeDecision,
        autonomousExecutionPolicy: deps.autonomousExecutionPolicy,
        strategicWaveExecutionController: deps.strategicWaveExecutionController,
        ...out,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
