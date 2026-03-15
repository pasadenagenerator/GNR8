import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { MixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import type { OrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import type { SemiStrategicExecutionController } from "@/gnr8/ai/semi-strategic-execution-controller";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { StrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";

export type StrategicExecutionRuntimeDecision = {
  executionDecision: "blocked" | "preview-only" | "semantic-execution" | "structural-execution" | "mixed-execution";

  executionMode: "none" | "preview" | "pilot" | "guided" | "full";

  selectedExecutor: "semantic-wave-executor" | "structural-wave-executor" | "mixed-wave-executor" | null;

  confidence: number;
  riskLevel: "low" | "medium" | "high";

  reasons: string[];
  nextActions: string[];
  notes: string[];
};

export type StrategicExecutionRuntimeRouterInput = {
  semiStrategicExecutionController: SemiStrategicExecutionController;
  strategicWaveExecutionController: StrategicWaveExecutionController;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  orchestrationPreview: OrchestrationPreview;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  unresolvedRatio: number;
};

function clamp0to100(score: number): number {
  if (Number.isNaN(score)) return 0;
  if (score < 0) return 0;
  if (score > 100) return 100;
  return Math.round(score);
}

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

const EARLY_STRUCTURAL_CLASS_SET = new Set<string>(["cleanup", "merge", "normalize"]);

function uniqStable(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

function collectStructuralActionClasses(design: MixedWavePreviewDesign): string[] {
  const previews = Array.isArray(design?.wavePreviews) ? design.wavePreviews : [];
  const classes: string[] = [];
  for (const w of previews) {
    const waveClasses = Array.isArray(w?.structuralActionClasses) ? w.structuralActionClasses : [];
    for (const c of waveClasses) classes.push(String(c ?? "").trim());
  }
  return uniqStable(classes).filter(Boolean);
}

function mixedPreviewRequiresNoStructuralClasses(mixedWavePreviewDesign: MixedWavePreviewDesign): boolean {
  return collectStructuralActionClasses(mixedWavePreviewDesign).length === 0;
}

function mixedPreviewHasEarlyStructuralClassesOnly(mixedWavePreviewDesign: MixedWavePreviewDesign): boolean {
  const classes = collectStructuralActionClasses(mixedWavePreviewDesign);
  if (classes.length === 0) return false;
  return classes.every((c) => EARLY_STRUCTURAL_CLASS_SET.has(c));
}

function resolveSemanticExecutionMode(input: {
  autonomyStage: AutonomousExecutionPolicy["autonomyStage"];
  pilotSemanticAllowed: boolean;
}): StrategicExecutionRuntimeDecision["executionMode"] {
  if (input.autonomyStage === "future-autonomy") return "full";
  if (input.autonomyStage === "guided-autonomy") return "guided";
  if (input.pilotSemanticAllowed) return "pilot";
  return "preview";
}

function resolveStructuralExecutionMode(input: {
  pilotStructuralAllowed: boolean;
}): StrategicExecutionRuntimeDecision["executionMode"] {
  return input.pilotStructuralAllowed ? "pilot" : "preview";
}

function resolveMixedExecutionMode(input: {
  autonomyStage: AutonomousExecutionPolicy["autonomyStage"];
}): StrategicExecutionRuntimeDecision["executionMode"] {
  if (input.autonomyStage === "future-autonomy") return "full";
  if (input.autonomyStage === "guided-autonomy") return "guided";
  return "preview";
}

function computeConfidence(input: {
  readinessScore: number;
  executionDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  semanticHealthScore: number;
  blockedWaveCount: number;
}): number {
  let score = typeof input.readinessScore === "number" ? input.readinessScore : 0;

  if (input.executionDecision !== "blocked") score += 10;
  if (input.consistencyLabel === "high") score += 10;
  if (input.consistencyLabel === "low") score -= 15;
  if (input.semanticHealthScore < 50) score -= 10;
  if (input.blockedWaveCount > 0) score -= 10;

  return clamp0to100(score);
}

function computeRiskLevel(input: {
  executionDecision: StrategicExecutionRuntimeDecision["executionDecision"];
  readinessLabel: StrategicSemanticExecutionReadiness["label"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  semanticHealthScore: number;
}): StrategicExecutionRuntimeDecision["riskLevel"] {
  if (input.executionDecision === "blocked" || input.semanticHealthScore < 40 || input.consistencyLabel === "low") return "high";
  if (
    input.executionDecision === "mixed-execution" &&
    input.readinessLabel === "execution-ready" &&
    input.consistencyLabel === "high"
  ) {
    return "low";
  }
  return "medium";
}

export function decideStrategicExecutionRuntime(input: StrategicExecutionRuntimeRouterInput): StrategicExecutionRuntimeDecision {
  const semiStrategic = input.semiStrategicExecutionController;
  const strategicController = input.strategicWaveExecutionController;
  const autonomy = input.autonomousExecutionPolicy;
  const readiness = input.strategicSemanticExecutionReadiness;
  const orchestrationPreview = input.orchestrationPreview;
  const mixedWavePreviewDesign = input.mixedWavePreviewDesign;
  const intelligence = input.siteSemanticIntelligence;
  const consistency = input.siteSemanticConsistency;

  const readinessLabel = readiness?.label ?? "not-ready";
  const readinessScore = readiness?.score ?? 0;
  const consistencyLabel = consistency?.consistencyLabel ?? "low";
  const semanticHealthScore = intelligence?.semanticHealthScore ?? 0;
  const blockedWaveCount = Array.isArray(orchestrationPreview?.blockedWaveIds) ? orchestrationPreview.blockedWaveIds.length : 0;

  const unresolvedRatio = typeof input.unresolvedRatio === "number" ? input.unresolvedRatio : 0;

  const executionScope = semiStrategic?.executionScope ?? "none";
  const executionPosture = semiStrategic?.executionPosture ?? "blocked";
  const autonomyStage = autonomy?.autonomyStage ?? "manual-only";
  const semanticAutoAllowed = autonomy?.allowedScopes?.semanticAutoAllowed === true;
  const structuralAutoAllowed = autonomy?.allowedScopes?.structuralAutoAllowed === true;
  const pilotExecutionAllowed = autonomy?.allowedScopes?.pilotExecutionAllowed === true;

  const pilotSemanticAllowed = pilotExecutionAllowed;
  const pilotStructuralAllowed = pilotExecutionAllowed;

  const previewStatus = orchestrationPreview?.overallPreviewStatus ?? "blocked";
  const pilotCandidatesPresent = (orchestrationPreview?.pilotCandidateWaveIds ?? []).length > 0;

  const noStructuralClassesRequired = mixedPreviewRequiresNoStructuralClasses(mixedWavePreviewDesign);
  const earlyStructuralClassesOnly = mixedPreviewHasEarlyStructuralClassesOnly(mixedWavePreviewDesign);

  const mixedPreviewMode = (mixedWavePreviewDesign as unknown as { previewMode?: string } | null)?.previewMode ?? "design-only";

  const reasons: string[] = [];
  const nextActions: string[] = [];
  const notes: string[] = [];

  notes.push("Strategic execution runtime router only; no waves were executed.");

  const blockedBySemiStrategic = executionPosture === "blocked";
  const blockedByStrategicController = (strategicController?.executionDecision ?? "blocked") === "blocked";
  const blockedByOrchestrationPreview = previewStatus === "blocked";
  const blockedByReadiness = readinessLabel === "not-ready";
  const blockedByUnresolvedRatio = unresolvedRatio > 0.5;

  const previewOnlyByGovernancePosture = executionPosture === "guided-execution";
  const previewOnlyByAutonomyStage = autonomyStage === "manual-only";
  const previewOnlyByPreviewStatus = previewStatus === "review-needed";

  let executionDecision: StrategicExecutionRuntimeDecision["executionDecision"] = "preview-only";
  let executionMode: StrategicExecutionRuntimeDecision["executionMode"] = "preview";
  let selectedExecutor: StrategicExecutionRuntimeDecision["selectedExecutor"] = null;

  if (blockedBySemiStrategic || blockedByStrategicController || blockedByOrchestrationPreview || blockedByReadiness || blockedByUnresolvedRatio) {
    executionDecision = "blocked";
    executionMode = "none";
    selectedExecutor = null;

    if (blockedBySemiStrategic) addUniqueLimited(reasons, "Execution blocked by semi-strategic governance posture.", 6);
    if (blockedByStrategicController) addUniqueLimited(reasons, "Execution blocked by strategic execution controller.", 6);
    if (blockedByOrchestrationPreview) addUniqueLimited(reasons, "Execution blocked by orchestration preview.", 6);
    if (blockedByReadiness) addUniqueLimited(reasons, "Execution blocked due to low semantic readiness.", 6);
    if (blockedByUnresolvedRatio) addUniqueLimited(reasons, "Execution blocked due to high unresolved page ratio.", 6);

    if (blockedByReadiness || semanticHealthScore < 50) addUniqueLimited(nextActions, "Resolve semantic bottlenecks.", 6);
    if (blockedByUnresolvedRatio) addUniqueLimited(nextActions, "Resolve unresolved pages.", 6);
    if (previewStatus === "blocked") addUniqueLimited(nextActions, "Run orchestration preview.", 6);
    if (consistencyLabel !== "high") addUniqueLimited(nextActions, "Stabilize structural consistency.", 6);
  } else if (previewOnlyByGovernancePosture || previewOnlyByAutonomyStage || previewOnlyByPreviewStatus) {
    executionDecision = "preview-only";
    executionMode = "preview";
    selectedExecutor = null;

    if (previewOnlyByGovernancePosture) addUniqueLimited(reasons, "Preview required due to governance posture.", 6);
    if (previewOnlyByAutonomyStage) addUniqueLimited(reasons, "Preview required: autonomy policy is manual-only.", 6);
    if (previewOnlyByPreviewStatus) addUniqueLimited(reasons, "Preview required: orchestration preview indicates review-needed.", 6);

    if (previewOnlyByPreviewStatus) addUniqueLimited(nextActions, "Run orchestration preview.", 6);
    addUniqueLimited(nextActions, "Request mixed-wave approval.", 6);
  } else {
    const semanticExecutionEligible =
      executionScope === "semantic-only" &&
      (semanticAutoAllowed || pilotSemanticAllowed) &&
      pilotCandidatesPresent &&
      noStructuralClassesRequired;

    const structuralExecutionEligible =
      executionScope === "structural-phase-1" &&
      earlyStructuralClassesOnly &&
      structuralAutoAllowed === false &&
      pilotStructuralAllowed;

    const mixedExecutionEligible =
      executionScope === "mixed-phase-1" &&
      mixedPreviewMode !== "design-only" &&
      (autonomyStage === "guided-autonomy" || autonomyStage === "future-autonomy");

    if (semanticExecutionEligible) {
      executionDecision = "semantic-execution";
      selectedExecutor = "semantic-wave-executor";
      executionMode = resolveSemanticExecutionMode({ autonomyStage, pilotSemanticAllowed });

      addUniqueLimited(reasons, "Semantic execution selected: executionScope is semantic-only.", 6);
      if (semanticAutoAllowed) addUniqueLimited(reasons, "Semantic execution allowed under autonomy policy.", 6);
      if (!semanticAutoAllowed && pilotSemanticAllowed) addUniqueLimited(reasons, "Semantic execution allowed under pilot autonomy.", 6);
      if (pilotCandidatesPresent) addUniqueLimited(reasons, "Pilot candidates present in orchestration preview.", 6);
      if (noStructuralClassesRequired) addUniqueLimited(reasons, "Mixed preview indicates no structural classes required.", 6);

      addUniqueLimited(nextActions, "Run orchestration preview.", 6);
    } else if (structuralExecutionEligible) {
      executionDecision = "structural-execution";
      selectedExecutor = "structural-wave-executor";
      executionMode = resolveStructuralExecutionMode({ pilotStructuralAllowed });

      addUniqueLimited(reasons, "Structural execution selected: executionScope is structural-phase-1.", 6);
      if (earlyStructuralClassesOnly) addUniqueLimited(reasons, "Mixed preview design shows early structural classes only.", 6);
      addUniqueLimited(reasons, "Structural autonomy is disabled; pilot execution is allowed.", 6);

      addUniqueLimited(nextActions, "Run orchestration preview.", 6);
      addUniqueLimited(nextActions, "Stabilize structural consistency.", 6);
    } else if (mixedExecutionEligible) {
      executionDecision = "mixed-execution";
      selectedExecutor = "mixed-wave-executor";
      executionMode = resolveMixedExecutionMode({ autonomyStage });

      addUniqueLimited(reasons, "Mixed execution selected: executionScope is mixed-phase-1.", 6);
      addUniqueLimited(reasons, "Mixed execution enabled by autonomy stage.", 6);
      addUniqueLimited(reasons, "Mixed preview design indicates executable preview mode.", 6);
      if (consistencyLabel === "high") addUniqueLimited(reasons, "Mixed execution enabled by high consistency.", 6);

      addUniqueLimited(nextActions, "Run orchestration preview.", 6);
      addUniqueLimited(nextActions, "Request mixed-wave approval.", 6);
    } else {
      executionDecision = "preview-only";
      executionMode = "preview";
      selectedExecutor = null;

      addUniqueLimited(reasons, "No eligible execution path matched; defaulting to preview-only.", 6);
      addUniqueLimited(nextActions, "Run orchestration preview.", 6);
    }
  }

  const confidence = computeConfidence({
    readinessScore,
    executionDecision,
    consistencyLabel,
    semanticHealthScore,
    blockedWaveCount,
  });

  const riskLevel = computeRiskLevel({
    executionDecision,
    readinessLabel,
    consistencyLabel,
    semanticHealthScore,
  });

  addUniqueLimited(notes, `Decision=${executionDecision}; Mode=${executionMode}; Executor=${selectedExecutor ?? "none"}.`, 5);
  addUniqueLimited(notes, `UnresolvedRatio=${Math.round(unresolvedRatio * 100)}%.`, 5);
  addUniqueLimited(notes, `Confidence=${confidence}; Risk=${riskLevel}.`, 5);

  return {
    executionDecision,
    executionMode,
    selectedExecutor,
    confidence,
    riskLevel,
    reasons: reasons.slice(0, 6),
    nextActions: nextActions.slice(0, 6),
    notes: notes.slice(0, 5),
  };
}

