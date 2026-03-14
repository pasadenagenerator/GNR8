import type { MixedWavePreviewDesign } from "@/gnr8/ai/mixed-wave-preview-design";
import type { OrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { StrategicSemanticReasoning } from "@/gnr8/ai/strategic-semantic-reasoning";
import type { StrategicWaveExecutionController } from "@/gnr8/ai/strategic-wave-execution-controller";
import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { Gnr8Page } from "@/gnr8/types/page";

export type AutonomousExecutionAutonomyStage = "manual-only" | "pilot-assist" | "guided-autonomy" | "future-autonomy";

export type AutonomousExecutionAutonomyDecision = "blocked" | "approval-required" | "pilot-allowed" | "autonomy-allowed";

export type AutonomousExecutionPolicyAllowedScopes = {
  semanticAutoAllowed: boolean;
  structuralAutoAllowed: boolean;
  mixedAutoAllowed: boolean;
  pilotExecutionAllowed: boolean;
  guidedExecutionAllowed: boolean;
};

export type AutonomousExecutionPolicy = {
  autonomyStage: AutonomousExecutionAutonomyStage;
  autonomyDecision: AutonomousExecutionAutonomyDecision;

  allowedScopes: AutonomousExecutionPolicyAllowedScopes;

  policyConstraints: string[];
  policySignals: string[];
  policyRisks: string[];
  recommendedAutonomyProgression: string[];
  summary: string;
  notes: string[];
};

function addUniqueLimited(list: string[], value: string, limit: number): void {
  if (list.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (list.includes(v)) return;
  list.push(v);
}

function computeMixedWaveSignals(input: {
  waveId?: string;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
}): {
  mixedWaveInScope: boolean;
  mixedStructuralBlockersPresent: boolean;
} {
  const requestedWaveId = String(input.waveId ?? "").trim();
  const allPreviews = Array.isArray(input.mixedWavePreviewDesign?.wavePreviews)
    ? input.mixedWavePreviewDesign.wavePreviews
    : [];
  const previews =
    requestedWaveId.length > 0 ? allPreviews.filter((w) => w?.waveId === requestedWaveId) : allPreviews;

  const mixedWaveInScope = previews.some((w) => (w?.structuralActionClasses?.length ?? 0) > 0);
  const mixedStructuralBlockersPresent = mixedWaveInScope
    ? previews.some((w) => {
        const blocked = Array.isArray(w?.blockedStructuralClasses) ? w.blockedStructuralClasses : [];
        const blockedTargets = Array.isArray(w?.blockedTargetPages) ? w.blockedTargetPages : [];
        const deferredTargets = Array.isArray(w?.deferredTargetPages) ? w.deferredTargetPages : [];
        return blocked.length > 0 || blockedTargets.length > 0 || deferredTargets.length > 0;
      })
    : false;

  return { mixedWaveInScope, mixedStructuralBlockersPresent };
}

function autonomyDecisionForStage(stage: AutonomousExecutionAutonomyStage): AutonomousExecutionAutonomyDecision {
  if (stage === "manual-only") return "blocked";
  if (stage === "pilot-assist") return "pilot-allowed";
  if (stage === "guided-autonomy") return "approval-required";
  return "autonomy-allowed";
}

function summaryForDecision(decision: AutonomousExecutionAutonomyDecision): string {
  if (decision === "blocked") {
    return "Autonomous execution is blocked under the current strategic conditions.";
  }
  if (decision === "approval-required") {
    return "Autonomous execution is not allowed yet; guided execution still requires human approval.";
  }
  if (decision === "pilot-allowed") {
    return "Autonomous execution is limited to pilot-scoped rollout under supervision.";
  }
  return "Autonomous semantic execution is allowed under the current strategic conditions.";
}

export function buildAutonomousExecutionPolicy(input: {
  pages: Array<{ slug: string } | { slug: string; page: Gnr8Page }>;
  resolvedPages: Array<{ slug: string; page: Gnr8Page }>;
  unresolvedPages: string[];
  waveId?: string;
  strategicWaveExecutionController: StrategicWaveExecutionController;
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
  orchestrationPreview: OrchestrationPreview;
  mixedWavePreviewDesign: MixedWavePreviewDesign;
  strategicSemanticReasoning: StrategicSemanticReasoning;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
}): { autonomousExecutionPolicy: AutonomousExecutionPolicy } {
  const controller = input.strategicWaveExecutionController;
  const readiness = input.strategicSemanticExecutionReadiness;
  const consistency = input.siteSemanticConsistency;
  const intelligence = input.siteSemanticIntelligence;

  const controllerDecision = controller?.executionDecision ?? "blocked";
  const readinessLabel = readiness?.label ?? "not-ready";
  const overallPreviewStatus = input.orchestrationPreview?.overallPreviewStatus ?? "blocked";
  const consistencyLabel = consistency?.consistencyLabel ?? "low";
  const semanticHealthLabel = intelligence?.semanticHealthLabel ?? "low";

  const manualOnly =
    controllerDecision === "blocked" || readinessLabel === "not-ready" || overallPreviewStatus === "blocked";

  const futureAutonomy =
    controllerDecision === "execution-allowed" &&
    readinessLabel === "execution-ready" &&
    consistencyLabel === "high" &&
    semanticHealthLabel === "high";

  const guidedAutonomy =
    !manualOnly &&
    !futureAutonomy &&
    (controllerDecision === "approval-required" || controller?.recommendedExecutionMode === "guided");

  const pilotAssist =
    !manualOnly && !futureAutonomy && !guidedAutonomy && (controllerDecision === "pilot-only" || readinessLabel === "phase-ready");

  const autonomyStage: AutonomousExecutionAutonomyStage = manualOnly
    ? "manual-only"
    : futureAutonomy
      ? "future-autonomy"
      : guidedAutonomy
        ? "guided-autonomy"
        : pilotAssist
          ? "pilot-assist"
          : "guided-autonomy";

  const autonomyDecision = autonomyDecisionForStage(autonomyStage);

  const allowedScopes: AutonomousExecutionPolicyAllowedScopes = {
    semanticAutoAllowed: autonomyStage === "future-autonomy",
    structuralAutoAllowed: false,
    mixedAutoAllowed: false,
    pilotExecutionAllowed: autonomyStage !== "manual-only",
    guidedExecutionAllowed: autonomyStage === "guided-autonomy" || autonomyStage === "future-autonomy",
  };

  const unresolvedCount = Array.isArray(input.unresolvedPages) ? input.unresolvedPages.length : 0;
  const totalInputs = Array.isArray(input.pages) ? input.pages.length : 0;
  const unresolvedRatio = totalInputs > 0 ? unresolvedCount / totalInputs : unresolvedCount > 0 ? 1 : 0;

  const resolvedCount = Array.isArray(input.resolvedPages) ? input.resolvedPages.length : 0;
  const bottleneckPages = Array.isArray(intelligence?.semanticBottleneckPages) ? intelligence.semanticBottleneckPages : [];
  const bottleneckRatio = resolvedCount > 0 ? bottleneckPages.length / resolvedCount : 0;

  const mixedSignals = computeMixedWaveSignals({
    waveId: input.waveId,
    mixedWavePreviewDesign: input.mixedWavePreviewDesign,
  });

  const policyConstraints: string[] = [];
  if (autonomyDecision === "approval-required") {
    addUniqueLimited(policyConstraints, "Human approval remains required before execution.", 6);
  }
  addUniqueLimited(policyConstraints, "Structural autonomy is disabled in the current policy stage.", 6);
  addUniqueLimited(policyConstraints, "Mixed-wave autonomy is disabled in the current policy stage.", 6);
  if (autonomyDecision === "pilot-allowed") {
    addUniqueLimited(policyConstraints, "Execution must remain pilot-scoped.", 6);
  }
  if (consistencyLabel !== "high") {
    addUniqueLimited(policyConstraints, "Cross-page consistency must improve before autonomy expands.", 6);
  }
  if (unresolvedCount > 0) {
    addUniqueLimited(policyConstraints, "Unresolved pages prevent broader autonomy.", 6);
  }

  const policySignals: string[] = [];
  if (controllerDecision === "execution-allowed") {
    addUniqueLimited(policySignals, "Strategic execution controller allows execution.", 6);
  }
  if (readinessLabel === "execution-ready" || input.strategicSemanticReasoning?.strategicReadiness?.label === "high") {
    addUniqueLimited(policySignals, "Strategic readiness is high.", 6);
  }
  if (semanticHealthLabel === "high") {
    addUniqueLimited(policySignals, "Semantic baseline is strong.", 6);
  }
  if (consistencyLabel === "high") {
    addUniqueLimited(policySignals, "Cross-page consistency is high.", 6);
  }
  if (overallPreviewStatus === "pilot-ready" || overallPreviewStatus === "guided-ready") {
    addUniqueLimited(policySignals, "Pilot execution is considered safe.", 6);
  }
  if (intelligence?.semanticAutomationReadiness?.label === "automation-candidate") {
    addUniqueLimited(policySignals, "Automation-candidate conditions are present.", 6);
  }

  const policyRisks: string[] = [];
  if (consistencyLabel !== "high") {
    addUniqueLimited(policyRisks, "Cross-page consistency remains a governance risk.", 6);
  }
  if (unresolvedRatio > 0) {
    addUniqueLimited(policyRisks, "Unresolved pages reduce confidence in autonomous rollout.", 6);
  }
  if (bottleneckRatio > 0.2) {
    addUniqueLimited(policyRisks, "Semantic bottlenecks still require supervision.", 6);
  }
  if (mixedSignals.mixedWaveInScope) {
    addUniqueLimited(policyRisks, "Mixed-wave structural classes remain too risky for autonomy.", 6);
  }
  if (controllerDecision === "approval-required" || autonomyDecision === "approval-required") {
    addUniqueLimited(policyRisks, "Current execution mode still depends on approval.", 6);
  }
  if (semanticHealthLabel !== "high") {
    addUniqueLimited(policyRisks, "Semantic health is not yet high enough for autonomy.", 6);
  }

  const recommendedAutonomyProgression: string[] = [];
  if (autonomyStage === "manual-only") {
    addUniqueLimited(recommendedAutonomyProgression, "Keep execution manual until semantic readiness improves.", 6);
  }
  if (autonomyStage === "pilot-assist" || autonomyStage === "guided-autonomy") {
    addUniqueLimited(recommendedAutonomyProgression, "Use pilot execution before expanding autonomy.", 6);
  }
  if (consistencyLabel !== "high") {
    addUniqueLimited(recommendedAutonomyProgression, "Expand guided execution only after consistency improves.", 6);
  }
  addUniqueLimited(recommendedAutonomyProgression, "Restrict autonomy to semantic-only execution.", 6);
  addUniqueLimited(recommendedAutonomyProgression, "Do not enable mixed-wave autonomy yet.", 6);
  if (unresolvedCount > 0) {
    addUniqueLimited(recommendedAutonomyProgression, "Resolve unresolved pages before broadening autonomy.", 6);
  }

  const notes: string[] = [];
  notes.push("Autonomous execution policy only; no waves were executed.");
  if (unresolvedCount > 0) addUniqueLimited(notes, "Unresolved pages are present.", 5);
  addUniqueLimited(notes, "Structural autonomy remains disabled in v1 policy.", 5);
  addUniqueLimited(notes, "Mixed-wave autonomy remains disabled in v1 policy.", 5);
  if (autonomyStage === "pilot-assist") addUniqueLimited(notes, "Policy stage is pilot-assist; execution remains pilot-scoped.", 5);
  if (autonomyStage === "future-autonomy") {
    addUniqueLimited(notes, "Future autonomy remains constrained to semantic-only automatic scope.", 5);
  }

  return {
    autonomousExecutionPolicy: {
      autonomyStage,
      autonomyDecision,
      allowedScopes,
      policyConstraints,
      policySignals,
      policyRisks,
      recommendedAutonomyProgression,
      summary: summaryForDecision(autonomyDecision),
      notes: notes.slice(0, 5),
    },
  };
}

