import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildAutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import { decideStrategicExecutionRuntime, type StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import { buildMixedWaveExecutionDesign } from "@/gnr8/ai/mixed-wave-execution-design";
import { buildMixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import { executeMixedWaveExecutionV1 } from "@/gnr8/ai/mixed-wave-executor";
import { buildOrchestrationPreview, type OrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import { buildSemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildStrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import { executeStrategicWaveExecutionV1 } from "@/gnr8/ai/strategic-wave-executor";
import { buildStrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";
import { executeStrategicStructuralWaveExecutionV1 } from "@/gnr8/ai/structural-wave-executor";
import {
  buildRuntimeExecutionFingerprint,
  buildRuntimeExecutionGuards,
  fingerprintsEqual,
  resolveWaveTargetPages,
  type AutonomousRuntimeOutcome,
  type RuntimeExecutionFingerprint,
} from "@/gnr8/ai/autonomous-execution-runtime-guards";

export type AutonomousExecutionRuntimeLoopInputV1 = {
  pages: Array<
    | { slug: string }
    | {
        slug: string;
        page?: Gnr8Page;
      }
  >;
  waveId?: string;
  apply?: boolean;
  lastAttemptFingerprint?: RuntimeExecutionFingerprint;
};

export type AutonomousExecutionRuntimeResult = {
  kind:
    | "blocked"
    | "preview"
    | "semantic-wave-execution"
    | "structural-wave-execution"
    | "mixed-wave-execution";
  payload: unknown;
};

export type AutonomousExecutionAttemptState = {
  attempted: boolean;
  idempotentSkip: boolean;
  eligible: boolean;
  executionPath: string;
  reasoning: string[];
};

export type AutonomousExecutionSnapshotState = {
  waveId: string | null;
  orchestrationMode: string;
  autonomyStage: string;
  executionScope: string;
};

export type AutonomousExecutionRuntime = {
  mode: AutonomousRuntimeOutcome;
  selectedExecutor: "semantic-wave-executor" | "structural-wave-executor" | "mixed-wave-executor" | null;

  waveId: string | null;

  runtimeDecision:
    | "blocked"
    | "preview-only"
    | "semantic-execution"
    | "structural-execution"
    | "mixed-execution";

  executionMode: "none" | "preview" | "pilot" | "guided" | "full";

  applied: boolean;

  executionAttempt: AutonomousExecutionAttemptState;
  executionSnapshot: AutonomousExecutionSnapshotState;

  result: AutonomousExecutionRuntimeResult;

  summary: string;
  notes: string[];
};

export type AutonomousExecutionRuntimeLoopOutputV1 = {
  autonomousExecutionRuntime: AutonomousExecutionRuntime;
  resolvedPages: number;
  unresolvedPages: string[];
  strategicExecutionRuntimeDecision: StrategicExecutionRuntimeDecision;
};

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

function inferWaveIdFromExistingOutputs(input: { orchestrationPreview: OrchestrationPreview }): string | null {
  const first = String(input.orchestrationPreview?.firstRecommendedWaveId ?? "").trim();
  if (first) return first;

  const candidates = Array.isArray(input.orchestrationPreview?.pilotCandidateWaveIds)
    ? input.orchestrationPreview.pilotCandidateWaveIds
    : [];
  for (const raw of candidates) {
    const id = String(raw ?? "").trim();
    if (id) return id;
  }

  return null;
}

function summaryForRuntime(input: {
  mode: AutonomousRuntimeOutcome;
  selectedExecutor: AutonomousExecutionRuntime["selectedExecutor"];
  applied: boolean;
}): string {
  if (input.mode === "blocked") return "Autonomous runtime is blocked under the current execution decision.";
  if (input.mode === "preview-only") return "Autonomous runtime returned a non-mutating preview result.";
  if (input.mode === "idempotent-skip") return "Autonomous runtime skipped execution due to deterministic idempotency protection.";

  if (input.applied && input.selectedExecutor === "semantic-wave-executor") return "Autonomous runtime executed the semantic wave path.";
  if (input.applied && input.selectedExecutor === "structural-wave-executor") return "Autonomous runtime executed the structural wave path.";
  if (input.applied && input.selectedExecutor === "mixed-wave-executor") return "Autonomous runtime executed the mixed wave path.";

  return "Autonomous runtime returned a non-mutating preview result.";
}

function notesForRuntime(input: {
  mode: AutonomousRuntimeOutcome;
  runtimeDecision: AutonomousExecutionRuntime["runtimeDecision"];
  selectedExecutor: AutonomousExecutionRuntime["selectedExecutor"];
  applyRequested: boolean;
  waveId: string | null;
  waveIdWasInferred: boolean;
  guardReason?: string;
  idempotentSkip: boolean;
}): string[] {
  const notes: string[] = [];
  notes.push("Autonomous execution runtime loop only; routing and existing executors were used without changing their logic.");

  if (input.mode === "preview-only") notes.push("Execution remained in preview-only mode.");
  if (input.mode === "blocked") notes.push("Router decision blocked execution.");
  if (input.idempotentSkip) notes.push("Execution skipped due to deterministic idempotency fingerprint match.");
  if (input.guardReason) notes.push(input.guardReason);

  if (input.applyRequested && input.mode !== "executed" && input.runtimeDecision !== "blocked") {
    if (!input.waveId) notes.push("No safe wave was available for execution.");
  }

  if (input.waveIdWasInferred) notes.push("WaveId was inferred from existing controller outputs.");

  if (input.mode === "executed") {
    if (input.selectedExecutor === "semantic-wave-executor") notes.push("Existing semantic executor was used.");
    if (input.selectedExecutor === "structural-wave-executor") notes.push("Existing structural executor was used.");
    if (input.selectedExecutor === "mixed-wave-executor") notes.push("Existing mixed executor was used.");
  }

  return notes.slice(0, 6);
}

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function buildBlockedRuntimeResult(input: {
  strategicDecision: StrategicExecutionRuntimeDecision;
  executionSnapshot: AutonomousExecutionSnapshotState;
}): AutonomousExecutionRuntime {
  const reasons = Array.isArray(input.strategicDecision?.reasons) ? input.strategicDecision.reasons : [];
  const payload = { reasons: reasons.length > 0 ? reasons : ["Execution blocked under the current execution decision."] };

  const executionAttempt: AutonomousExecutionAttemptState = {
    attempted: false,
    idempotentSkip: false,
    eligible: false,
    executionPath: "none",
    reasoning: ["Execution blocked by router decision."],
  };

  const runtime: AutonomousExecutionRuntime = {
    mode: "blocked",
    selectedExecutor: null,
    waveId: null,
    runtimeDecision: "blocked",
    executionMode: "none",
    applied: false,
    executionAttempt,
    executionSnapshot: input.executionSnapshot,
    result: { kind: "blocked", payload },
    summary: summaryForRuntime({ mode: "blocked", selectedExecutor: null, applied: false }),
    notes: notesForRuntime({
      mode: "blocked",
      runtimeDecision: "blocked",
      selectedExecutor: null,
      applyRequested: false,
      waveId: null,
      waveIdWasInferred: false,
      guardReason: undefined,
      idempotentSkip: false,
    }),
  };

  return runtime;
}

export async function runAutonomousExecutionRuntimeLoopV1(raw: AutonomousExecutionRuntimeLoopInputV1): Promise<AutonomousExecutionRuntimeLoopOutputV1> {
  const applyRequested = raw?.apply === true;
  const requestedWaveId = typeof raw?.waveId === "string" ? String(raw.waveId).trim() : "";
  const lastAttemptFingerprint = raw?.lastAttemptFingerprint;

  const pagesRaw = Array.isArray(raw?.pages) ? raw.pages : [];
  const normalizedInputPages: Array<{ slug: string; page?: Gnr8Page }> = [];
  for (const item of pagesRaw) {
    if (!isRecord(item)) continue;
    const slug = normalizeSlug(typeof item.slug === "string" ? item.slug : "");
    if (!slug) continue;
    const page = "page" in item ? (item as any).page : undefined;
    normalizedInputPages.push({
      slug,
      page: isGnr8Page(page) ? (page as Gnr8Page) : undefined,
    });
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
  });

  const { autonomousExecutionPolicy } = buildAutonomousExecutionPolicy({
    pages: normalizedInputPages,
    resolvedPages,
    unresolvedPages,
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

  const executionSnapshot: AutonomousExecutionSnapshotState = {
    waveId: null,
    orchestrationMode: String(strategicExecutionOrchestration?.orchestrationMode ?? "blocked"),
    autonomyStage: String(autonomousExecutionPolicy?.autonomyStage ?? "manual-only"),
    executionScope: String(semiStrategicExecutionController?.executionScope ?? "none"),
  };

  if (strategicExecutionRuntimeDecision.executionDecision === "blocked") {
    return {
      autonomousExecutionRuntime: buildBlockedRuntimeResult({ strategicDecision: strategicExecutionRuntimeDecision, executionSnapshot }),
      resolvedPages: resolvedPages.length,
      unresolvedPages,
      strategicExecutionRuntimeDecision,
    };
  }

  const runtimeDecision = strategicExecutionRuntimeDecision.executionDecision;
  const selectedExecutor = strategicExecutionRuntimeDecision.selectedExecutor;

  const inferredWaveId = requestedWaveId
    ? requestedWaveId
    : selectedExecutor
      ? inferWaveIdFromExistingOutputs({ orchestrationPreview })
      : null;
  const waveIdWasInferred = !requestedWaveId && !!inferredWaveId;

  executionSnapshot.waveId = inferredWaveId ?? null;

  const guards = buildRuntimeExecutionGuards(strategicExecutionRuntimeDecision);
  const targetedPages = resolveWaveTargetPages({ orchestrationPreview, waveId: inferredWaveId ?? null });

  const fingerprint = buildRuntimeExecutionFingerprint({
    selectedExecutor,
    waveId: inferredWaveId ?? null,
    targetedPages,
  });

  const reasoning: string[] = [];
  if (applyRequested !== true) addUniqueLimited(reasoning, "Execution prevented because apply was not requested.", 5);
  if (!guards.eligibleForExecution) addUniqueLimited(reasoning, guards.guardReason ?? "Execution prevented by runtime guards.", 5);
  if (runtimeDecision === "preview-only" || strategicExecutionRuntimeDecision.executionMode === "preview") {
    addUniqueLimited(reasoning, "Execution blocked by preview-only posture.", 5);
  }
  if (!inferredWaveId) addUniqueLimited(reasoning, "Execution prevented due to missing waveId.", 5);

  const idempotentSkip = fingerprintsEqual(fingerprint, lastAttemptFingerprint);
  if (idempotentSkip) addUniqueLimited(reasoning, "Execution skipped due to idempotent fingerprint match.", 5);

  const previewOnlyPosture = runtimeDecision === "preview-only" || strategicExecutionRuntimeDecision.executionMode === "preview";
  const eligibleForExecution = guards.eligibleForExecution && !previewOnlyPosture && !!selectedExecutor && !!inferredWaveId;
  const canExecute = applyRequested === true && eligibleForExecution && !idempotentSkip;

  if (!canExecute) {
    const outcome: AutonomousRuntimeOutcome = idempotentSkip ? "idempotent-skip" : "preview-only";
    if (applyRequested === true && eligibleForExecution) {
      addUniqueLimited(reasoning, `Execution allowed under ${strategicExecutionRuntimeDecision.executionMode} mode.`, 5);
    }

    const executionAttempt: AutonomousExecutionAttemptState = {
      attempted: false,
      idempotentSkip,
      eligible: eligibleForExecution,
      executionPath: guards.executionPath,
      reasoning: reasoning.slice(0, 5),
    };

    const previewPayload: unknown = {
      orchestrationPreview,
      strategicExecutionRuntimeDecision,
    };

    const runtime: AutonomousExecutionRuntime = {
      mode: outcome,
      selectedExecutor,
      waveId: inferredWaveId ?? null,
      runtimeDecision,
      executionMode: strategicExecutionRuntimeDecision.executionMode,
      applied: false,
      executionAttempt,
      executionSnapshot,
      result: { kind: "preview", payload: previewPayload },
      summary: summaryForRuntime({ mode: outcome, selectedExecutor, applied: false }),
      notes: notesForRuntime({
        mode: outcome,
        runtimeDecision,
        selectedExecutor,
        applyRequested,
        waveId: inferredWaveId ?? null,
        waveIdWasInferred,
        guardReason: guards.guardReason,
        idempotentSkip,
      }),
    };

    return {
      autonomousExecutionRuntime: runtime,
      resolvedPages: resolvedPages.length,
      unresolvedPages,
      strategicExecutionRuntimeDecision,
    };
  }

  if (selectedExecutor === "semantic-wave-executor") {
    const executionAttempt: AutonomousExecutionAttemptState = {
      attempted: true,
      idempotentSkip: false,
      eligible: true,
      executionPath: guards.executionPath,
      reasoning: [`Execution allowed under ${strategicExecutionRuntimeDecision.executionMode} mode.`].slice(0, 5),
    };

    const payload = await executeStrategicWaveExecutionV1({
      pages: normalizedInputPages,
      waveId: inferredWaveId!,
      apply: true,
    });

    const runtime: AutonomousExecutionRuntime = {
      mode: "executed",
      selectedExecutor,
      waveId: inferredWaveId ?? null,
      runtimeDecision,
      executionMode: strategicExecutionRuntimeDecision.executionMode,
      applied: true,
      executionAttempt,
      executionSnapshot,
      result: { kind: "semantic-wave-execution", payload },
      summary: summaryForRuntime({ mode: "executed", selectedExecutor, applied: true }),
      notes: notesForRuntime({
        mode: "executed",
        runtimeDecision,
        selectedExecutor,
        applyRequested,
        waveId: inferredWaveId ?? null,
        waveIdWasInferred,
        guardReason: guards.guardReason,
        idempotentSkip: false,
      }),
    };

    return {
      autonomousExecutionRuntime: runtime,
      resolvedPages: resolvedPages.length,
      unresolvedPages,
      strategicExecutionRuntimeDecision,
    };
  }

  if (selectedExecutor === "structural-wave-executor") {
    const executionAttempt: AutonomousExecutionAttemptState = {
      attempted: true,
      idempotentSkip: false,
      eligible: true,
      executionPath: guards.executionPath,
      reasoning: [`Execution allowed under ${strategicExecutionRuntimeDecision.executionMode} mode.`].slice(0, 5),
    };

    const payload = await executeStrategicStructuralWaveExecutionV1({
      pages: normalizedInputPages,
      waveId: inferredWaveId!,
      apply: true,
    });

    const runtime: AutonomousExecutionRuntime = {
      mode: "executed",
      selectedExecutor,
      waveId: inferredWaveId ?? null,
      runtimeDecision,
      executionMode: strategicExecutionRuntimeDecision.executionMode,
      applied: true,
      executionAttempt,
      executionSnapshot,
      result: { kind: "structural-wave-execution", payload },
      summary: summaryForRuntime({ mode: "executed", selectedExecutor, applied: true }),
      notes: notesForRuntime({
        mode: "executed",
        runtimeDecision,
        selectedExecutor,
        applyRequested,
        waveId: inferredWaveId ?? null,
        waveIdWasInferred,
        guardReason: guards.guardReason,
        idempotentSkip: false,
      }),
    };

    return {
      autonomousExecutionRuntime: runtime,
      resolvedPages: resolvedPages.length,
      unresolvedPages,
      strategicExecutionRuntimeDecision,
    };
  }

  const executionAttempt: AutonomousExecutionAttemptState = {
    attempted: true,
    idempotentSkip: false,
    eligible: true,
    executionPath: guards.executionPath,
    reasoning: [`Execution allowed under ${strategicExecutionRuntimeDecision.executionMode} mode.`].slice(0, 5),
  };

  const payload = await executeMixedWaveExecutionV1({
    pages: normalizedInputPages,
    waveId: inferredWaveId!,
    apply: true,
  });

  const runtime: AutonomousExecutionRuntime = {
    mode: "executed",
    selectedExecutor: "mixed-wave-executor",
    waveId: inferredWaveId ?? null,
    runtimeDecision,
    executionMode: strategicExecutionRuntimeDecision.executionMode,
    applied: true,
    executionAttempt,
    executionSnapshot,
    result: { kind: "mixed-wave-execution", payload },
    summary: summaryForRuntime({ mode: "executed", selectedExecutor: "mixed-wave-executor", applied: true }),
    notes: notesForRuntime({
      mode: "executed",
      runtimeDecision,
      selectedExecutor: "mixed-wave-executor",
      applyRequested,
      waveId: inferredWaveId ?? null,
      waveIdWasInferred,
      guardReason: guards.guardReason,
      idempotentSkip: false,
    }),
  };

  return {
    autonomousExecutionRuntime: runtime,
    resolvedPages: resolvedPages.length,
    unresolvedPages,
    strategicExecutionRuntimeDecision,
  };
}
