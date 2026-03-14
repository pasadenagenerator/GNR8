import type { MixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import type { OrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import type { StrategicExecutionOrchestration } from "@/gnr8/ai/strategic-execution-orchestrator";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { StrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { Gnr8Page } from "@/gnr8/types/page";

export type StrategicWaveExecutionDecision =
  | "blocked"
  | "pilot-only"
  | "approval-required"
  | "execution-allowed";

export type StrategicWaveExecutionRiskLevel = "low" | "medium" | "high";
export type StrategicWaveRecommendedExecutionMode = "none" | "pilot" | "guided" | "full";

export type StrategicWaveExecutionController = {
  executionDecision: StrategicWaveExecutionDecision;
  executionConfidence: number;
  executionRiskLevel: StrategicWaveExecutionRiskLevel;
  recommendedExecutionMode: StrategicWaveRecommendedExecutionMode;
  blockingReasons: string[];
  riskFactors: string[];
  safetySignals: string[];
  recommendedNextActions: string[];
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

const PHASE1_ONLY_STRUCTURAL_SET = new Set<string>(["reorder", "add-section", "replace-section"]);

function computeRatios(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  siteSemanticIntelligence: SiteSemanticIntelligence;
}): {
  unresolvedRatio: number;
  bottleneckRatio: number;
  lowConfidenceRatio: number;
  highConfidenceRatio: number;
} {
  const totalInputs = Array.isArray(input.pages) ? input.pages.length : 0;
  const resolvedCount = Array.isArray(input.resolvedPages) ? input.resolvedPages.length : 0;
  const unresolvedCount = Array.isArray(input.unresolvedPages) ? input.unresolvedPages.length : 0;

  const denominator = totalInputs > 0 ? totalInputs : resolvedCount + unresolvedCount;
  const unresolvedRatio = denominator > 0 ? unresolvedCount / denominator : 0;

  const bottlenecks = Array.isArray(input.siteSemanticIntelligence?.semanticBottleneckPages)
    ? input.siteSemanticIntelligence.semanticBottleneckPages
    : [];
  const bottleneckRatio = resolvedCount > 0 ? bottlenecks.length / resolvedCount : 0;

  const dist = input.siteSemanticIntelligence?.semanticDistribution;
  const lowConfidencePages = typeof dist?.lowConfidencePages === "number" ? dist.lowConfidencePages : 0;
  const highConfidencePages = typeof dist?.highConfidencePages === "number" ? dist.highConfidencePages : 0;
  const lowConfidenceRatio = resolvedCount > 0 ? lowConfidencePages / resolvedCount : 0;
  const highConfidenceRatio = resolvedCount > 0 ? highConfidencePages / resolvedCount : 0;

  return { unresolvedRatio, bottleneckRatio, lowConfidenceRatio, highConfidenceRatio };
}

function getMixedWaveSignals(input: {
  waveId?: string;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
}): {
  mixedWaveInScope: boolean;
  mixedRequiresFuturePhaseStructural: boolean;
  mixedStructuralBlockersPresent: boolean;
} {
  const requestedWaveId = String(input.waveId ?? "").trim();
  const allPreviews = Array.isArray(input.mixedWavePreviewDesign?.wavePreviews) ? input.mixedWavePreviewDesign.wavePreviews : [];

  const previews = requestedWaveId.length > 0 ? allPreviews.filter((w) => w?.waveId === requestedWaveId) : allPreviews;

  const mixedWaveInScope = previews.some((w) => (w?.structuralActionClasses?.length ?? 0) > 0);

  const mixedRequiresFuturePhaseStructural = mixedWaveInScope
    ? previews.some((w) => {
        const blocked = Array.isArray(w?.blockedStructuralClasses) ? w.blockedStructuralClasses : [];
        const deferredTargets = Array.isArray(w?.deferredTargetPages) ? w.deferredTargetPages : [];
        if (deferredTargets.length > 0) return true;
        return blocked.some((c) => PHASE1_ONLY_STRUCTURAL_SET.has(String(c ?? "").trim()));
      })
    : false;

  const mixedStructuralBlockersPresent = mixedWaveInScope
    ? previews.some((w) => {
        const blocked = Array.isArray(w?.blockedStructuralClasses) ? w.blockedStructuralClasses : [];
        const blockedTargets = Array.isArray(w?.blockedTargetPages) ? w.blockedTargetPages : [];
        const deferredTargets = Array.isArray(w?.deferredTargetPages) ? w.deferredTargetPages : [];
        return blocked.length > 0 || blockedTargets.length > 0 || deferredTargets.length > 0;
      })
    : false;

  return {
    mixedWaveInScope,
    mixedRequiresFuturePhaseStructural,
    mixedStructuralBlockersPresent,
  };
}

function summaryForDecision(decision: StrategicWaveExecutionDecision): string {
  if (decision === "blocked") return "Execution is blocked due to insufficient semantic readiness.";
  if (decision === "pilot-only") return "Execution should begin with a controlled pilot rollout.";
  if (decision === "approval-required") return "Execution requires human approval before proceeding.";
  return "Execution is safe to proceed under current strategic conditions.";
}

function recommendedExecutionModeForDecision(decision: StrategicWaveExecutionDecision): StrategicWaveRecommendedExecutionMode {
  if (decision === "blocked") return "none";
  if (decision === "pilot-only") return "pilot";
  if (decision === "approval-required") return "guided";
  return "full";
}

function riskLevelForDecision(input: {
  decision: StrategicWaveExecutionDecision;
  readinessLabel: StrategicSemanticExecutionReadiness["label"];
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  semanticHealthScore: number;
}): StrategicWaveExecutionRiskLevel {
  if (input.decision === "blocked" || input.readinessLabel === "not-ready" || input.semanticHealthScore < 40) return "high";
  if (input.decision === "execution-allowed" && input.readinessLabel === "execution-ready" && input.semanticHealthScore >= 70) return "low";
  if (input.decision === "pilot-only" || input.decision === "approval-required" || input.consistencyLabel !== "high") return "medium";
  return "medium";
}

function computeExecutionConfidence(input: {
  baseScore: number;
  consistencyLabel: SiteSemanticConsistency["consistencyLabel"];
  unresolvedRatio: number;
  hasAutomationCandidateSignal: boolean;
  decision: StrategicWaveExecutionDecision;
  orchestrationPreview: OrchestrationPreview;
  strategicExecutionOrchestration: StrategicExecutionOrchestration;
  semanticHealthScore: number;
}): number {
  let score = typeof input.baseScore === "number" ? input.baseScore : 0;

  if (input.consistencyLabel === "low") score -= 15;
  if (input.unresolvedRatio > 0.25) score -= 10;
  if (!input.hasAutomationCandidateSignal) score -= 10;

  if (input.decision === "pilot-only") score -= 5;

  const guidedMode =
    input.orchestrationPreview?.overallPreviewStatus === "guided-ready" ||
    input.strategicExecutionOrchestration?.orchestrationMode === "guided";
  if (guidedMode) score += 5;

  if (input.semanticHealthScore >= 80) score += 10;

  return clamp0to100(score);
}

export function buildStrategicWaveExecutionController(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  waveId?: string;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticReasoning: StrategicSemanticReasoning;
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  strategicExecutionOrchestration: StrategicExecutionOrchestration;
  orchestrationPreview: OrchestrationPreview;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
}): { strategicWaveExecutionController: StrategicWaveExecutionController } {
  const consistencyLabel = input.siteSemanticConsistency?.consistencyLabel ?? "low";
  const semanticHealthScore = input.siteSemanticIntelligence?.semanticHealthScore ?? 0;
  const readiness = input.strategicSemanticExecutionReadiness;
  const strategicReadinessScore = input.strategicSemanticReasoning?.strategicReadiness?.score ?? 0;

  const { unresolvedRatio, bottleneckRatio, lowConfidenceRatio, highConfidenceRatio } = computeRatios({
    pages: input.pages ?? [],
    resolvedPages: input.resolvedPages ?? [],
    unresolvedPages: input.unresolvedPages ?? [],
    siteSemanticIntelligence: input.siteSemanticIntelligence,
  });

  const hasAutomationCandidateSignal =
    (input.siteSemanticIntelligence?.semanticAutomationReadiness?.label ?? "not-ready") === "automation-candidate" ||
    (input.siteSemanticIntelligence?.semanticAutomationReadiness?.score ?? 0) >= 75;

  const mixedSignals = getMixedWaveSignals({
    waveId: input.waveId,
    mixedWavePreviewDesign: input.mixedWavePreviewDesign,
  });

  const blockedTriggers: string[] = [];
  const blockedByPreview = input.orchestrationPreview?.overallPreviewStatus === "blocked";
  const blockedByReadinessLabel = readiness?.label === "not-ready";
  const blockedByUnresolvedRatio = unresolvedRatio > 0.5;
  const blockedByStrategicReadiness = strategicReadinessScore < 30;

  if (blockedByPreview) blockedTriggers.push("preview");
  if (blockedByReadinessLabel) blockedTriggers.push("readiness-label");
  if (blockedByUnresolvedRatio) blockedTriggers.push("unresolved");
  if (blockedByStrategicReadiness) blockedTriggers.push("strategic-readiness");

  const isBlocked = blockedTriggers.length > 0;

  const pilotOnly =
    !isBlocked &&
    readiness?.label === "phase-ready" &&
    input.strategicExecutionOrchestration?.orchestrationMode === "phased" &&
    bottleneckRatio > 0.2 &&
    consistencyLabel === "medium";

  const approvalRequiredByRules =
    (!isBlocked &&
      !pilotOnly &&
      ((mixedSignals.mixedWaveInScope && input.mixedWavePreviewDesign?.previewMode === "design-only") ||
        (mixedSignals.mixedWaveInScope && mixedSignals.mixedRequiresFuturePhaseStructural) ||
        consistencyLabel !== "high")) ||
    false;

  const executionAllowed =
    !isBlocked &&
    !pilotOnly &&
    readiness?.label === "execution-ready" &&
    (input.orchestrationPreview?.overallPreviewStatus === "pilot-ready" ||
      input.orchestrationPreview?.overallPreviewStatus === "guided-ready") &&
    consistencyLabel === "high" &&
    semanticHealthScore >= 75;

  let executionDecision: StrategicWaveExecutionDecision = "approval-required";
  if (isBlocked) executionDecision = "blocked";
  else if (pilotOnly) executionDecision = "pilot-only";
  else if (approvalRequiredByRules) executionDecision = "approval-required";
  else if (executionAllowed) executionDecision = "execution-allowed";
  else executionDecision = "approval-required";

  const recommendedExecutionMode = recommendedExecutionModeForDecision(executionDecision);

  const blockingReasons: string[] = [];
  if (executionDecision === "blocked") {
    if (blockedByStrategicReadiness || blockedByReadinessLabel) addUniqueLimited(blockingReasons, "Strategic readiness too low.", 5);
    if (blockedByUnresolvedRatio) addUniqueLimited(blockingReasons, "Too many unresolved pages.", 5);
    if (blockedByPreview) addUniqueLimited(blockingReasons, "Wave preview indicates blocked execution.", 5);
    if (semanticHealthScore < 40) addUniqueLimited(blockingReasons, "Semantic baseline insufficient.", 5);
    if (consistencyLabel !== "high") addUniqueLimited(blockingReasons, "Consistency issues must be resolved first.", 5);
  }

  const riskFactors: string[] = [];
  if (bottleneckRatio > 0.2) {
    addUniqueLimited(riskFactors, `Semantic bottleneck pages are elevated (${Math.round(bottleneckRatio * 100)}%).`, 5);
  }
  if (lowConfidenceRatio > 0.25) {
    addUniqueLimited(riskFactors, `Low semantic confidence pages are elevated (${Math.round(lowConfidenceRatio * 100)}%).`, 5);
  }
  if (mixedSignals.mixedStructuralBlockersPresent) {
    addUniqueLimited(riskFactors, "Mixed wave includes structural blockers or deferred targets.", 5);
  }
  if (unresolvedRatio > 0) {
    addUniqueLimited(riskFactors, `Unresolved page ratio is ${Math.round(unresolvedRatio * 100)}%.`, 5);
  }

  const safetySignals: string[] = [];
  if (highConfidenceRatio >= 0.5) {
    addUniqueLimited(safetySignals, `High-confidence pages dominate (${Math.round(highConfidenceRatio * 100)}%).`, 5);
  }
  if (hasAutomationCandidateSignal) {
    addUniqueLimited(safetySignals, "Automation-candidate readiness is strong.", 5);
  }
  if (consistencyLabel === "high") {
    addUniqueLimited(safetySignals, "Cross-page semantic consistency is high.", 5);
  }
  if ((input.siteSemanticIntelligence?.semanticWeaknessClusters ?? []).length === 0) {
    addUniqueLimited(safetySignals, "Low follow-up suggestion pressure (no weakness clusters).", 5);
  }
  if (strategicReadinessScore >= 80) {
    addUniqueLimited(safetySignals, "High strategic readiness.", 5);
  }

  const recommendedNextActions: string[] = [];
  if (executionDecision === "blocked") {
    addUniqueLimited(recommendedNextActions, "Run semantic stabilization waves first.", 5);
  }
  if (unresolvedRatio > 0) {
    addUniqueLimited(recommendedNextActions, "Resolve unresolved pages before execution.", 5);
  }
  if (consistencyLabel !== "high") {
    addUniqueLimited(recommendedNextActions, "Improve cross-page consistency.", 5);
  }
  if (executionDecision === "pilot-only") {
    addUniqueLimited(recommendedNextActions, "Execute pilot wave before full rollout.", 5);
  }
  if (!hasAutomationCandidateSignal) {
    addUniqueLimited(recommendedNextActions, "Increase semantic automation readiness.", 5);
  }

  const executionConfidence = computeExecutionConfidence({
    baseScore: readiness?.score ?? 0,
    consistencyLabel,
    unresolvedRatio,
    hasAutomationCandidateSignal,
    decision: executionDecision,
    orchestrationPreview: input.orchestrationPreview,
    strategicExecutionOrchestration: input.strategicExecutionOrchestration,
    semanticHealthScore,
  });

  const executionRiskLevel = riskLevelForDecision({
    decision: executionDecision,
    readinessLabel: readiness?.label ?? "not-ready",
    consistencyLabel,
    semanticHealthScore,
  });

  const notes: string[] = [];
  notes.push("Strategic execution controller only; no waves were executed.");

  if ((input.unresolvedPages?.length ?? 0) > 0) addUniqueLimited(notes, "Unresolved pages are present.", 5);
  if (executionDecision === "pilot-only") addUniqueLimited(notes, "Pilot execution is recommended by deterministic rules.", 5);
  if (consistencyLabel !== "high") addUniqueLimited(notes, "Consistency is not high.", 5);
  if (mixedSignals.mixedRequiresFuturePhaseStructural) {
    addUniqueLimited(notes, "Mixed execution requires future phases for some structural classes.", 5);
  }

  return {
    strategicWaveExecutionController: {
      executionDecision,
      executionConfidence,
      executionRiskLevel,
      recommendedExecutionMode,
      blockingReasons,
      riskFactors,
      safetySignals,
      recommendedNextActions,
      summary: summaryForDecision(executionDecision),
      notes: notes.slice(0, 5),
    },
  };
}

