import type { AutonomousExecutionPolicy } from "@/gnr8/ai/autonomous-execution-policy";
import type { MixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import type { OrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import type { StrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";
import type { Gnr8Page } from "@/gnr8/types/page";

export type SemiStrategicExecutionPosture =
  | "blocked"
  | "pilot-mode"
  | "guided-execution"
  | "full-execution-ready";

export type SemiStrategicExecutionScope =
  | "none"
  | "semantic-only"
  | "structural-phase-1"
  | "mixed-phase-1"
  | "full-strategic";

export type SemiStrategicExecutionRiskLevel = "high" | "medium" | "low";

export type SemiStrategicExecutionController = {
  executionPosture: SemiStrategicExecutionPosture;
  executionScope: SemiStrategicExecutionScope;
  executionConfidence: number;
  executionRiskLevel: SemiStrategicExecutionRiskLevel;

  postureReasons: string[];
  executionSignals: string[];
  executionConstraints: string[];
  recommendedNextMoves: string[];

  summary: string;
  notes: string[];
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

function addFromList(out: string[], values: unknown, limit: number): void {
  if (!Array.isArray(values)) return;
  for (const v of values) {
    if (out.length >= limit) return;
    if (typeof v !== "string") continue;
    addUniqueLimited(out, v, limit);
  }
}

function computeUnresolvedRatio(input: { pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>; unresolvedPages: string[] }): number {
  const totalInputs = Array.isArray(input.pages) ? input.pages.length : 0;
  const unresolvedCount = Array.isArray(input.unresolvedPages) ? input.unresolvedPages.length : 0;
  if (totalInputs > 0) return unresolvedCount / totalInputs;
  return unresolvedCount > 0 ? 1 : 0;
}

function computeSemanticBottleneckRatio(input: {
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  siteSemanticIntelligence: SiteSemanticIntelligence;
}): number {
  const resolvedCount = Array.isArray(input.resolvedPages) ? input.resolvedPages.length : 0;
  const bottlenecks = Array.isArray(input.siteSemanticIntelligence?.semanticBottleneckPages)
    ? input.siteSemanticIntelligence.semanticBottleneckPages
    : [];
  return resolvedCount > 0 ? bottlenecks.length / resolvedCount : 0;
}

function determinePosture(input: {
  strategicWaveExecutionController: StrategicWaveExecutionController;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  strategicExecutionOrchestration: StrategicExecutionOrchestration;
  orchestrationPreview: OrchestrationPreview;
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  siteSemanticConsistency: SiteSemanticConsistency;
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
}): SemiStrategicExecutionPosture {
  const controllerDecision = input.strategicWaveExecutionController?.executionDecision ?? "blocked";
  const autonomyStage = input.autonomousExecutionPolicy?.autonomyStage ?? "manual-only";
  const previewStatus = input.orchestrationPreview?.overallPreviewStatus ?? "blocked";
  const readinessLabel = input.strategicSemanticExecutionReadiness?.label ?? "not-ready";
  const consistencyLabel = input.siteSemanticConsistency?.consistencyLabel ?? "low";

  const unresolvedRatio = computeUnresolvedRatio({ pages: input.pages, unresolvedPages: input.unresolvedPages });
  const semanticBottleneckRatio = computeSemanticBottleneckRatio({
    resolvedPages: input.resolvedPages,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
  });

  const isBlocked =
    controllerDecision === "blocked" ||
    autonomyStage === "manual-only" ||
    previewStatus === "blocked" ||
    readinessLabel === "not-ready" ||
    unresolvedRatio > 0.5;

  if (isBlocked) return "blocked";

  const isFullReady =
    controllerDecision === "execution-allowed" &&
    autonomyStage === "future-autonomy" &&
    (previewStatus === "pilot-ready" || previewStatus === "guided-ready") &&
    (input.siteSemanticIntelligence?.semanticHealthScore ?? 0) >= 75 &&
    consistencyLabel === "high";

  if (isFullReady) return "full-execution-ready";

  const mixedInScope = (input.mixedWavePreviewDesign?.wavePreviews ?? []).some(
    (w) => (w?.structuralActionClasses?.length ?? 0) > 0,
  );

  const isPilot =
    controllerDecision === "pilot-only" ||
    autonomyStage === "pilot-assist" ||
    (input.strategicExecutionOrchestration?.orchestrationMode ?? "blocked") === "phased" ||
    consistencyLabel === "medium" ||
    semanticBottleneckRatio > 0.2;

  if (isPilot) return "pilot-mode";

  const isGuided =
    controllerDecision === "approval-required" ||
    autonomyStage === "guided-autonomy" ||
    (mixedInScope && input.mixedWavePreviewDesign?.previewMode === "design-only") ||
    consistencyLabel !== "high";

  return isGuided ? "guided-execution" : "guided-execution";
}

function determineScope(input: {
  executionPosture: SemiStrategicExecutionPosture;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
}): SemiStrategicExecutionScope {
  if (input.executionPosture === "blocked") return "none";
  if (input.executionPosture === "full-execution-ready") return "full-strategic";

  const semanticAutoAllowed = input.autonomousExecutionPolicy?.allowedScopes?.semanticAutoAllowed === true;
  const mixedNotYetAllowed = input.autonomousExecutionPolicy?.allowedScopes?.mixedAutoAllowed !== true;

  const wavePreviews = Array.isArray(input.mixedWavePreviewDesign?.wavePreviews) ? input.mixedWavePreviewDesign.wavePreviews : [];
  const anySupportedStructural = wavePreviews.some((w) => (w?.supportedStructuralClasses?.length ?? 0) > 0);
  const noStructuralEligible = !anySupportedStructural;

  const anyMixedPreviewReady = wavePreviews.some((w) => w?.previewStatus === "preview-ready");

  if (semanticAutoAllowed && noStructuralEligible) return "semantic-only";
  if (anySupportedStructural && mixedNotYetAllowed) return "structural-phase-1";

  const stage = input.autonomousExecutionPolicy?.autonomyStage ?? "manual-only";
  const stageAtLeastGuided = stage === "guided-autonomy" || stage === "future-autonomy";
  if (anyMixedPreviewReady && stageAtLeastGuided) return "mixed-phase-1";

  return "none";
}

function computeExecutionConfidence(input: {
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  strategicExecutionOrchestration: StrategicExecutionOrchestration;
  siteSemanticConsistency: SiteSemanticConsistency;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
}): number {
  let score = typeof input.strategicSemanticExecutionReadiness?.score === "number"
    ? input.strategicSemanticExecutionReadiness.score
    : 0;

  if ((input.strategicExecutionOrchestration?.orchestrationMode ?? "blocked") === "phased") score -= 10;

  const consistencyLabel = input.siteSemanticConsistency?.consistencyLabel ?? "low";
  if (consistencyLabel === "medium") score -= 10;
  if (consistencyLabel === "low") score -= 15;

  const weaknessClusters = Array.isArray(input.siteSemanticIntelligence?.semanticWeaknessClusters)
    ? input.siteSemanticIntelligence.semanticWeaknessClusters
    : [];
  if (weaknessClusters.length > 0) score -= 10;

  const autonomyStage = input.autonomousExecutionPolicy?.autonomyStage ?? "manual-only";
  if (autonomyStage === "future-autonomy") score += 5;

  const semanticHealthLabel = input.siteSemanticIntelligence?.semanticHealthLabel ?? "low";
  if (semanticHealthLabel === "high") score += 5;

  return clamp0to100(score);
}

function determineRiskLevel(input: {
  executionPosture: SemiStrategicExecutionPosture;
  siteSemanticConsistency: SiteSemanticConsistency;
  siteSemanticIntelligence: SiteSemanticIntelligence;
}): SemiStrategicExecutionRiskLevel {
  const consistencyLabel = input.siteSemanticConsistency?.consistencyLabel ?? "low";
  const semanticHealthScore = input.siteSemanticIntelligence?.semanticHealthScore ?? 0;

  if (input.executionPosture === "blocked" || consistencyLabel === "low" || semanticHealthScore < 40) return "high";
  if (input.executionPosture === "full-execution-ready") return "low";
  return "medium";
}

function summaryForPosture(posture: SemiStrategicExecutionPosture): string {
  if (posture === "blocked") {
    return "Execution is currently blocked due to foundational readiness or governance constraints.";
  }
  if (posture === "pilot-mode") {
    return "Execution may proceed in controlled pilot mode with focused semantic improvements.";
  }
  if (posture === "guided-execution") {
    return "Execution requires structured approval and governance oversight.";
  }
  return "System is ready for autonomous strategic execution.";
}

export function buildSemiStrategicExecutionController(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];

  strategicWaveExecutionController: StrategicWaveExecutionController;
  autonomousExecutionPolicy: AutonomousExecutionPolicy;
  strategicExecutionOrchestration: StrategicExecutionOrchestration;
  orchestrationPreview: OrchestrationPreview;
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
}): { semiStrategicExecutionController: SemiStrategicExecutionController } {
  const unresolvedRatio = computeUnresolvedRatio({ pages: input.pages ?? [], unresolvedPages: input.unresolvedPages ?? [] });
  const semanticBottleneckRatio = computeSemanticBottleneckRatio({
    resolvedPages: input.resolvedPages ?? [],
    siteSemanticIntelligence: input.siteSemanticIntelligence,
  });

  const executionPosture = determinePosture({
    strategicWaveExecutionController: input.strategicWaveExecutionController,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    strategicExecutionOrchestration: input.strategicExecutionOrchestration,
    orchestrationPreview: input.orchestrationPreview,
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    siteSemanticConsistency: input.siteSemanticConsistency,
    pages: input.pages ?? [],
    unresolvedPages: input.unresolvedPages ?? [],
    resolvedPages: input.resolvedPages ?? [],
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    mixedWavePreviewDesign: input.mixedWavePreviewDesign,
  });

  const executionScope = determineScope({
    executionPosture,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
    mixedWavePreviewDesign: input.mixedWavePreviewDesign,
  });

  const executionConfidence = computeExecutionConfidence({
    strategicSemanticExecutionReadiness: input.strategicSemanticExecutionReadiness,
    strategicExecutionOrchestration: input.strategicExecutionOrchestration,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    autonomousExecutionPolicy: input.autonomousExecutionPolicy,
  });

  const executionRiskLevel = determineRiskLevel({
    executionPosture,
    siteSemanticConsistency: input.siteSemanticConsistency,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
  });

  const postureReasons: string[] = [];
  const executionSignals: string[] = [];
  const executionConstraints: string[] = [];
  const recommendedNextMoves: string[] = [];

  const controllerDecision = input.strategicWaveExecutionController?.executionDecision ?? "blocked";
  const autonomyStage = input.autonomousExecutionPolicy?.autonomyStage ?? "manual-only";
  const previewStatus = input.orchestrationPreview?.overallPreviewStatus ?? "blocked";
  const readinessLabel = input.strategicSemanticExecutionReadiness?.label ?? "not-ready";
  const consistencyLabel = input.siteSemanticConsistency?.consistencyLabel ?? "low";
  const semanticHealthScore = input.siteSemanticIntelligence?.semanticHealthScore ?? 0;
  const weaknessClusters = Array.isArray(input.siteSemanticIntelligence?.semanticWeaknessClusters)
    ? input.siteSemanticIntelligence.semanticWeaknessClusters
    : [];

  if (executionPosture === "blocked") {
    if (controllerDecision === "blocked") addUniqueLimited(postureReasons, "Strategic wave execution controller is blocked.", 6);
    if (autonomyStage === "manual-only") addUniqueLimited(postureReasons, "Autonomy policy is manual-only.", 6);
    if (previewStatus === "blocked") addUniqueLimited(postureReasons, "Orchestration preview status is blocked.", 6);
    if (readinessLabel === "not-ready") addUniqueLimited(postureReasons, "Strategic semantic execution readiness is not-ready.", 6);
    if (unresolvedRatio > 0.5) addUniqueLimited(postureReasons, "Unresolved page ratio exceeds 50%.", 6);
  } else if (executionPosture === "full-execution-ready") {
    addUniqueLimited(postureReasons, "Strategic wave execution controller allows execution.", 6);
    addUniqueLimited(postureReasons, "Autonomy policy stage is future-autonomy.", 6);
    addUniqueLimited(postureReasons, `Orchestration preview status is ${previewStatus}.`, 6);
    addUniqueLimited(postureReasons, `Semantic health score is ${semanticHealthScore}.`, 6);
    addUniqueLimited(postureReasons, "Cross-page semantic consistency is high.", 6);
  } else if (executionPosture === "pilot-mode") {
    if (controllerDecision === "pilot-only") addUniqueLimited(postureReasons, "Strategic wave execution controller is pilot-only.", 6);
    if (autonomyStage === "pilot-assist") addUniqueLimited(postureReasons, "Autonomy policy stage is pilot-assist.", 6);
    if ((input.strategicExecutionOrchestration?.orchestrationMode ?? "blocked") === "phased") {
      addUniqueLimited(postureReasons, "Orchestration is in phased mode.", 6);
    }
    if (consistencyLabel === "medium") addUniqueLimited(postureReasons, "Cross-page semantic consistency is medium.", 6);
    if (semanticBottleneckRatio > 0.2) {
      addUniqueLimited(postureReasons, "Semantic bottleneck ratio exceeds 20%.", 6);
    }
  } else {
    if (controllerDecision === "approval-required") addUniqueLimited(postureReasons, "Strategic wave execution requires approval.", 6);
    if (autonomyStage === "guided-autonomy") addUniqueLimited(postureReasons, "Autonomy policy stage is guided-autonomy.", 6);
    if (consistencyLabel !== "high") addUniqueLimited(postureReasons, "Cross-page semantic consistency is not high.", 6);
  }

  addUniqueLimited(executionSignals, `Controller decision: ${controllerDecision}.`, 6);
  addUniqueLimited(executionSignals, `Autonomy stage: ${autonomyStage}.`, 6);
  addUniqueLimited(executionSignals, `Orchestration preview: ${previewStatus}.`, 6);
  addUniqueLimited(executionSignals, `Readiness: ${readinessLabel} (${input.strategicSemanticExecutionReadiness?.score ?? 0}).`, 6);
  addUniqueLimited(executionSignals, `Consistency: ${consistencyLabel}.`, 6);
  addUniqueLimited(executionSignals, `Semantic health: ${semanticHealthScore}.`, 6);

  addFromList(executionConstraints, input.strategicWaveExecutionController?.blockingReasons, 6);
  addFromList(executionConstraints, input.autonomousExecutionPolicy?.policyConstraints, 6);
  addFromList(executionConstraints, input.strategicSemanticExecutionReadiness?.blockers, 6);
  addFromList(executionConstraints, input.orchestrationPreview?.notes, 6);
  if (executionConstraints.length < 6 && unresolvedRatio > 0) {
    addUniqueLimited(executionConstraints, `Unresolved page ratio is ${Math.round(unresolvedRatio * 100)}%.`, 6);
  }

  addFromList(recommendedNextMoves, input.strategicWaveExecutionController?.recommendedNextActions, 6);
  addFromList(recommendedNextMoves, input.autonomousExecutionPolicy?.recommendedAutonomyProgression, 6);

  const notes: string[] = [];
  notes.push("Semi-strategic execution controller only; no waves were executed.");
  if ((input.unresolvedPages?.length ?? 0) > 0) addUniqueLimited(notes, "Unresolved pages exist.", 5);
  if (executionScope === "structural-phase-1") addUniqueLimited(notes, "Mixed execution is restricted in this posture.", 5);
  if (autonomyStage !== "future-autonomy") addUniqueLimited(notes, "Autonomy stage is limited.", 5);
  if ((input.strategicExecutionOrchestration?.orchestrationMode ?? "blocked") === "phased") {
    addUniqueLimited(notes, "Orchestration is phased.", 5);
  }
  if (weaknessClusters.length > 0) addUniqueLimited(notes, "Semantic weakness clusters are present.", 5);

  return {
    semiStrategicExecutionController: {
      executionPosture,
      executionScope,
      executionConfidence,
      executionRiskLevel,
      postureReasons: postureReasons.slice(0, 6),
      executionSignals: executionSignals.slice(0, 6),
      executionConstraints: executionConstraints.slice(0, 6),
      recommendedNextMoves: recommendedNextMoves.slice(0, 6),
      summary: summaryForPosture(executionPosture),
      notes: notes.slice(0, 5),
    },
  };
}
