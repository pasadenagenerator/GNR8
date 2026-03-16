import type { Gnr8Page } from "@/gnr8/types/page";
import { getPageBySlug } from "@/gnr8/core/page-storage";
import { buildAutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import { decideStrategicExecutionRuntime, type StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";
import { buildMixedWaveExecutionDesign } from "@/gnr8/ai/mixed-wave-execution-design";
import { buildMixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import { buildOrchestrationPreview, type OrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import { buildSemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import { buildSiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import { buildSiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import { buildStrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import { buildStrategicSemanticExecutionReadiness, type StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import { buildStrategicSemanticPlan } from "@/gnr8/ai/strategic-semantic-planning";
import { buildStrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import { buildStrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";
import type { AutonomousExecutionRuntimeLedgerV1 } from "@/gnr8/ai/autonomous-execution-ledger";
import { buildRuntimeExecutionFingerprint, resolveWaveTargetPages, type RuntimeExecutionFingerprint } from "@/gnr8/ai/autonomous-execution-runtime-guards";

export type ExecutionReplayStatus = "match" | "drift-detected" | "invalid-ledger" | "unreplayable";

export type ExecutionReplayResultV1 = {
  replayStatus: ExecutionReplayStatus;
  replayConfidence: number;
  replayDecision: {
    executionMode: string;
    selectedExecutor: string | null;
    waveId: string | null;
  };
  driftSignals: string[];
  deterministicSignals: string[];
  replayNotes: string[];
};

export type ExecutionReplayEngineInputV1 = {
  pages: Array<{ slug: string } | Gnr8Page | { slug: string; page?: Gnr8Page }>;
  ledger: AutonomousExecutionRuntimeLedgerV1;
  waveId?: string;
};

export type ExecutionReplayEngineOutputV1 = {
  resolvedPages: string[];
  unresolvedPages: string[];
  executionReplay: ExecutionReplayResultV1;
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

function clamp0to100(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function stablePageHash(page: Gnr8Page): string {
  const payload = JSON.stringify({
    id: String(page.id ?? ""),
    slug: normalizeSlug(String(page.slug ?? "")),
    title: typeof page.title === "string" ? page.title : null,
    sections: Array.isArray(page.sections) ? page.sections : [],
  });
  return String(fnv1a32(payload));
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

function ledgerMissingFields(ledger: AutonomousExecutionRuntimeLedgerV1 | null | undefined): string[] {
  const missing: string[] = [];
  if (!ledger) {
    missing.push("ledger");
    return missing;
  }
  if (ledger.ledgerVersion !== "v1") missing.push("ledgerVersion");
  if (!ledger.routing) missing.push("routing");
  if (!ledger.snapshot) missing.push("snapshot");

  const routing = (ledger as any).routing;
  if (!routing || typeof routing !== "object") {
    missing.push("routing.executionMode", "routing.selectedExecutor", "routing.runtimeDecision");
  } else {
    if (typeof routing.executionMode !== "string") missing.push("routing.executionMode");
    if (!(routing.selectedExecutor === null || typeof routing.selectedExecutor === "string")) missing.push("routing.selectedExecutor");
    if (typeof routing.runtimeDecision !== "string") missing.push("routing.runtimeDecision");
  }

  const snapshot = (ledger as any).snapshot;
  if (!snapshot || typeof snapshot !== "object") {
    missing.push("snapshot.waveId", "snapshot.orchestrationMode", "snapshot.autonomyStage", "snapshot.executionScope");
  } else {
    const waveId = (snapshot as any).waveId;
    if (!(waveId === null || typeof waveId === "string")) missing.push("snapshot.waveId");
    if (typeof snapshot.orchestrationMode !== "string") missing.push("snapshot.orchestrationMode");
    if (typeof snapshot.autonomyStage !== "string") missing.push("snapshot.autonomyStage");
    if (typeof snapshot.executionScope !== "string") missing.push("snapshot.executionScope");
  }

  return missing;
}

function fingerprintInconsistent(ledger: AutonomousExecutionRuntimeLedgerV1): boolean {
  const current = ledger.fingerprint?.current ?? null;
  if (!current) return false;
  if (!isRecord(current)) return true;
  if (typeof (current as any).executionPath !== "string") return true;
  if (!Array.isArray((current as any).targetedPages) || !(current as any).targetedPages.every((p: unknown) => typeof p === "string")) return true;
  const waveId = (current as any).waveId;
  if (waveId !== null && typeof waveId !== "string") return true;

  const expected = buildRuntimeExecutionFingerprint({
    selectedExecutor: ledger.routing?.selectedExecutor ?? null,
    waveId: ledger.snapshot?.waveId ?? null,
    targetedPages: (current as any).targetedPages ?? [],
  });

  if (String(expected.executionPath ?? "") !== String((current as any).executionPath ?? "")) return true;
  if (String(expected.waveId ?? "") !== String((current as any).waveId ?? "")) return true;
  return false;
}

function replayConfidenceScore(input: {
  unresolvedRatio: number;
  missingLedgerFields: number;
  driftSignals: number;
  orchestrationMismatch: boolean;
  readinessMismatch: boolean;
}): number {
  let score = 100;
  score -= Math.max(0, Math.min(1, input.unresolvedRatio)) * 30;
  if (input.missingLedgerFields > 0) score -= 25;
  score -= Math.min(60, Math.max(0, input.driftSignals) * 20);
  if (input.orchestrationMismatch) score -= 15;
  if (input.readinessMismatch) score -= 15;
  return clamp0to100(score);
}

function buildEmptyResult(status: ExecutionReplayStatus, notesExtra: string[] = []): ExecutionReplayResultV1 {
  const replayNotes: string[] = ["Execution replay is a deterministic simulation; no execution occurred."];
  for (const n of notesExtra) addUniqueLimited(replayNotes, n, 5);

  return {
    replayStatus: status,
    replayConfidence: status === "match" ? 100 : 0,
    replayDecision: { executionMode: "none", selectedExecutor: null, waveId: null },
    driftSignals: [],
    deterministicSignals: [],
    replayNotes: replayNotes.slice(0, 5),
  };
}

export async function runExecutionReplayEngineV1(input: ExecutionReplayEngineInputV1): Promise<ExecutionReplayEngineOutputV1> {
  const pagesRaw = Array.isArray(input?.pages) ? input.pages : [];

  const normalizedSlugs: string[] = [];
  const originalPagesBySlug = new Map<string, Gnr8Page>();
  for (const item of pagesRaw) {
    if (!item) continue;

    if (isGnr8Page(item)) {
      const slug = normalizeSlug(item.slug);
      if (!slug) continue;
      normalizedSlugs.push(slug);
      originalPagesBySlug.set(slug, { ...item, slug });
      continue;
    }

    if (!isRecord(item)) continue;
    const slug = normalizeSlug(typeof (item as any).slug === "string" ? (item as any).slug : "");
    if (!slug) continue;
    normalizedSlugs.push(slug);

    const pageCandidate = "page" in item ? (item as any).page : undefined;
    if (isGnr8Page(pageCandidate)) {
      originalPagesBySlug.set(slug, { ...pageCandidate, slug });
    }
  }

  const ledger = input?.ledger;
  const missingFields = ledgerMissingFields(ledger);
  const ledgerInvalid = missingFields.length > 0 || (ledger ? fingerprintInconsistent(ledger) : true);

  if (normalizedSlugs.length === 0) {
    const executionReplay = buildEmptyResult(ledgerInvalid ? "invalid-ledger" : "unreplayable", [
      "No pages were provided for replay.",
      ledgerInvalid ? "Ledger missing required fields; replay comparison incomplete." : "",
    ]);
    executionReplay.replayConfidence = replayConfidenceScore({
      unresolvedRatio: 1,
      missingLedgerFields: missingFields.length,
      driftSignals: 0,
      orchestrationMismatch: false,
      readinessMismatch: false,
    });
    return { resolvedPages: [], unresolvedPages: [], executionReplay };
  }

  const uniqueSlugs: string[] = [];
  const seen = new Set<string>();
  for (const raw of normalizedSlugs) {
    const slug = normalizeSlug(raw);
    if (!slug) continue;
    if (seen.has(slug)) continue;
    seen.add(slug);
    uniqueSlugs.push(slug);
  }

  const currentPagesBySlug = new Map<string, Gnr8Page>();
  const unresolvedPages: string[] = [];
  for (const slug of uniqueSlugs) {
    const loaded = await getPageBySlug(slug).catch(() => null);
    if (!loaded) {
      const fallback = originalPagesBySlug.get(slug) ?? null;
      if (!fallback) unresolvedPages.push(slug);
      continue;
    }
    currentPagesBySlug.set(slug, { ...loaded, slug });
  }

  const resolvedPages: string[] = [];
  const replayPages: Array<{ slug: string; page?: Gnr8Page }> = [];
  const pageChangeSignals: string[] = [];
  const fallbackSignals: string[] = [];

  for (const slug of uniqueSlugs) {
    const current = currentPagesBySlug.get(slug) ?? null;
    const original = originalPagesBySlug.get(slug) ?? null;

    if (current) {
      resolvedPages.push(slug);
      replayPages.push({ slug, page: current });
      if (original && stablePageHash(original) !== stablePageHash(current)) {
        addUniqueLimited(pageChangeSignals, `Page content differs from current storage: ${slug}.`, 3);
      }
      continue;
    }

    if (original) {
      resolvedPages.push(slug);
      replayPages.push({ slug, page: original });
      addUniqueLimited(fallbackSignals, `Page missing from storage; replay used provided snapshot: ${slug}.`, 3);
      continue;
    }

    replayPages.push({ slug });
  }

  const unresolvedRatio = uniqueSlugs.length > 0 ? unresolvedPages.length / uniqueSlugs.length : 0;

  let strategicExecutionRuntimeDecision: StrategicExecutionRuntimeDecision | null = null;
  let orchestrationPreview: OrchestrationPreview | null = null;
  let strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness | null = null;
  let replayOrchestrationMode = "unknown";
  let replayAutonomyStage = "unknown";
  let replayExecutionScope = "none";

  try {
    const resolvedForBuilders: Array<{ slug: string; page: Gnr8Page }> = [];
    for (const p of replayPages) {
      if (p.page) resolvedForBuilders.push({ slug: p.slug, page: { ...p.page, slug: p.slug } });
    }

    const siteSemanticIntelligence = buildSiteSemanticIntelligence({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
    });

    const siteSemanticConsistency = buildSiteSemanticConsistency({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
    });

    const strategicSemanticReasoning = buildStrategicSemanticReasoning({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
    });

    const strategicSemanticPlan = buildStrategicSemanticPlan({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticReasoning,
    });

    strategicSemanticExecutionReadiness = buildStrategicSemanticExecutionReadiness({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
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

    replayOrchestrationMode = String(strategicExecutionOrchestration?.orchestrationMode ?? "blocked");

    const previewBuilt = buildOrchestrationPreview({
      strategicExecutionOrchestration,
      unresolvedPages,
    });

    orchestrationPreview = previewBuilt?.orchestrationPreview ?? null;

    const { mixedWaveExecutionDesign } = buildMixedWaveExecutionDesign({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
      strategicSemanticExecutionReadiness,
      strategicSemanticReasoning,
    });

    const { mixedWavePreviewDesign } = buildMixedWavePreviewDesign({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
      strategicExecutionOrchestration,
      strategicSemanticPlan,
      mixedWaveExecutionDesign,
    });

    const { strategicWaveExecutionController } = buildStrategicWaveExecutionController({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      strategicSemanticReasoning,
      strategicSemanticExecutionReadiness,
      strategicExecutionOrchestration,
      orchestrationPreview: orchestrationPreview!,
      mixedWavePreviewDesign,
    });

    const { autonomousExecutionPolicy } = buildAutonomousExecutionPolicy({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
      strategicWaveExecutionController,
      strategicSemanticExecutionReadiness,
      orchestrationPreview: orchestrationPreview!,
      mixedWavePreviewDesign,
      strategicSemanticReasoning,
      siteSemanticIntelligence,
      siteSemanticConsistency,
    });

    replayAutonomyStage = String(autonomousExecutionPolicy?.autonomyStage ?? "manual-only");

    const { semiStrategicExecutionController } = buildSemiStrategicExecutionController({
      pages: replayPages,
      resolvedPages: resolvedForBuilders,
      unresolvedPages,
      strategicWaveExecutionController,
      autonomousExecutionPolicy,
      strategicExecutionOrchestration,
      orchestrationPreview: orchestrationPreview!,
      strategicSemanticExecutionReadiness,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      mixedWavePreviewDesign,
    });

    replayExecutionScope = String(semiStrategicExecutionController?.executionScope ?? "none");

    strategicExecutionRuntimeDecision = decideStrategicExecutionRuntime({
      semiStrategicExecutionController,
      strategicWaveExecutionController,
      autonomousExecutionPolicy,
      strategicSemanticExecutionReadiness,
      orchestrationPreview: orchestrationPreview!,
      mixedWavePreviewDesign,
      siteSemanticIntelligence,
      siteSemanticConsistency,
      unresolvedRatio,
    });
  } catch (error) {
    const executionReplay = buildEmptyResult(ledgerInvalid ? "invalid-ledger" : "unreplayable", [
      "Runtime decision pipeline failed to replay under current state.",
      error instanceof Error ? error.message : "Unknown replay error.",
      ledgerInvalid ? "Ledger missing required fields; replay comparison incomplete." : "",
    ]);
    executionReplay.replayConfidence = replayConfidenceScore({
      unresolvedRatio,
      missingLedgerFields: missingFields.length,
      driftSignals: 0,
      orchestrationMismatch: false,
      readinessMismatch: false,
    });
    return { resolvedPages, unresolvedPages, executionReplay };
  }

  const requestedWaveId = typeof input?.waveId === "string" ? String(input.waveId).trim() : "";

  const selectedExecutor = strategicExecutionRuntimeDecision?.selectedExecutor ?? null;
  const inferredWaveId = requestedWaveId ? requestedWaveId : selectedExecutor ? inferWaveIdFromExistingOutputs({ orchestrationPreview: orchestrationPreview! }) : null;

  const replayWaveId = inferredWaveId ? String(inferredWaveId).trim() || null : null;

  const replayDecision = {
    executionMode: String(strategicExecutionRuntimeDecision?.executionMode ?? "none"),
    selectedExecutor: selectedExecutor ? String(selectedExecutor) : null,
    waveId: replayWaveId,
  };

  const driftSignals: string[] = [];
  const deterministicSignals: string[] = [];
  const replayNotes: string[] = ["Execution replay is a deterministic simulation; no execution occurred."];

  for (const note of pageChangeSignals) addUniqueLimited(replayNotes, note, 5);
  for (const note of fallbackSignals) addUniqueLimited(replayNotes, note, 5);
  if (unresolvedPages.length > 0) addUniqueLimited(replayNotes, "Unresolved pages present; replay used partial context.", 5);
  if (ledgerInvalid) addUniqueLimited(replayNotes, "Ledger missing required fields; replay comparison incomplete.", 5);

  const ledgerWaveId = ledger?.snapshot?.waveId ?? null;
  const ledgerExecutionMode = ledger?.routing?.executionMode ?? "none";
  const ledgerSelectedExecutor = ledger?.routing?.selectedExecutor ?? null;
  const ledgerOrchestrationMode = ledger?.snapshot?.orchestrationMode ?? "unknown";
  const ledgerAutonomyStage = ledger?.snapshot?.autonomyStage ?? "unknown";

  const executionModeMatch = String(replayDecision.executionMode) === String(ledgerExecutionMode);
  const selectedExecutorMatch = String(replayDecision.selectedExecutor ?? "") === String(ledgerSelectedExecutor ?? "");
  const waveIdMatch = String(replayDecision.waveId ?? "") === String(ledgerWaveId ?? "");
  const orchestrationModeMatch = String(replayOrchestrationMode) === String(ledgerOrchestrationMode);
  const autonomyStageMatch = String(replayAutonomyStage) === String(ledgerAutonomyStage);

  if (executionModeMatch) addUniqueLimited(deterministicSignals, "Execution mode matches recorded ledger.", 5);
  if (selectedExecutorMatch) addUniqueLimited(deterministicSignals, "Selected executor matches recorded ledger.", 5);
  if (waveIdMatch) addUniqueLimited(deterministicSignals, "WaveId matches recorded ledger.", 5);
  if (orchestrationModeMatch) addUniqueLimited(deterministicSignals, "Orchestration mode matches recorded ledger.", 5);
  if (autonomyStageMatch) addUniqueLimited(deterministicSignals, "Autonomy stage matches recorded ledger.", 5);

  if (!executionModeMatch) addUniqueLimited(driftSignals, "Execution mode drift detected.", 6);
  if (!selectedExecutorMatch) addUniqueLimited(driftSignals, "Selected executor differs from recorded ledger.", 6);
  if (!waveIdMatch) addUniqueLimited(driftSignals, "Wave orchestration state changed.", 6);
  if (!orchestrationModeMatch) addUniqueLimited(driftSignals, "Wave orchestration state changed.", 6);
  if (!autonomyStageMatch) addUniqueLimited(driftSignals, "Autonomy stage differs.", 6);

  const readinessMismatch =
    (strategicSemanticExecutionReadiness?.label ?? "not-ready") === "not-ready" &&
    String(ledger?.routing?.runtimeDecision ?? "") !== "blocked" &&
    String(strategicExecutionRuntimeDecision?.executionDecision ?? "") === "blocked";
  if (readinessMismatch) addUniqueLimited(driftSignals, "Strategic readiness no longer satisfies execution criteria.", 6);

  const driftDetected =
    !executionModeMatch || !selectedExecutorMatch || !waveIdMatch || !orchestrationModeMatch || !autonomyStageMatch;

  const unreplayable = unresolvedRatio > 0.5 || !orchestrationPreview;
  if (unreplayable) {
    addUniqueLimited(replayNotes, "Replay deemed unreplayable under current state.", 5);
  } else if (driftDetected) {
    addUniqueLimited(replayNotes, "Drift detected between replay decision and recorded ledger.", 5);
  }

  const orchestrationMismatch = !orchestrationModeMatch;

  const replayConfidence = replayConfidenceScore({
    unresolvedRatio,
    missingLedgerFields: missingFields.length,
    driftSignals: driftSignals.length,
    orchestrationMismatch,
    readinessMismatch,
  });

  const replayStatus: ExecutionReplayStatus = ledgerInvalid
    ? "invalid-ledger"
    : unreplayable
      ? "unreplayable"
      : driftDetected
        ? "drift-detected"
        : "match";

  // Capture extra comparison detail without impacting drift definition.
  const ledgerExecutionScope = ledger?.snapshot?.executionScope ?? "none";
  if (String(replayExecutionScope) !== String(ledgerExecutionScope)) {
    addUniqueLimited(replayNotes, "Execution scope differs from recorded ledger.", 5);
  }

  // Fingerprint-derived orchestration mismatch (informational only).
  const recordedFingerprint = ledger?.fingerprint?.current ?? null;
  if (!ledgerInvalid && orchestrationPreview && replayWaveId && recordedFingerprint) {
    const targetedPages = resolveWaveTargetPages({ orchestrationPreview, waveId: replayWaveId });
    const expected = buildRuntimeExecutionFingerprint({
      selectedExecutor,
      waveId: replayWaveId,
      targetedPages,
    });
    const mismatch =
      String(expected.executionPath ?? "") !== String((recordedFingerprint as RuntimeExecutionFingerprint).executionPath ?? "") ||
      String(expected.waveId ?? "") !== String((recordedFingerprint as RuntimeExecutionFingerprint).waveId ?? "");
    if (mismatch) addUniqueLimited(replayNotes, "Recorded fingerprint does not align with replayed orchestration inputs.", 5);
  }

  const executionReplay: ExecutionReplayResultV1 = {
    replayStatus,
    replayConfidence,
    replayDecision,
    driftSignals: driftSignals.slice(0, 6),
    deterministicSignals: deterministicSignals.slice(0, 5),
    replayNotes: replayNotes.slice(0, 5),
  };

  return { resolvedPages, unresolvedPages, executionReplay };
}
