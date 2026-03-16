import { buildStrategicAdaptationRuntimeBridgeV1 } from "@/gnr8/ai/strategic-adaptation-runtime-bridge";

function assert(condition: unknown, label: string) {
  if (!condition) throw new Error(`Assertion failed: ${label}`);
}

// Scenario A — fully missing inputs should default conservatively
{
  const out = buildStrategicAdaptationRuntimeBridgeV1({});
  assert(out.bridgeLabel === "disconnected", "Scenario A: bridgeLabel=disconnected");
  assert(out.runtimeBridgePosture === "hold-runtime", "Scenario A: posture=hold-runtime");
  assert(out.runtimeScopeGuidance === "preview-only", "Scenario A: scope=preview-only");
  assert(out.runtimeTempoGuidance === "slow", "Scenario A: tempo=slow");
  assert(Array.isArray(out.runtimeGuardrailSignals), "Scenario A: guardrailSignals array");
  assert(Array.isArray(out.runtimeExpansionSignals), "Scenario A: expansionSignals array");
  assert(Array.isArray(out.runtimeCautionSignals), "Scenario A: cautionSignals array");
  assert(Array.isArray(out.runtimeBridgeRecommendations), "Scenario A: recommendations array");
  assert(out.notes.some((n) => n.includes("interpretive only") && n.includes("does not alter runtime behavior")), "Scenario A: interpretive note");
}

// Scenario B — runtime-ready alignment should reach expand posture and accelerated tempo
{
  const out = buildStrategicAdaptationRuntimeBridgeV1({
    adaptiveStrategyRecommendations: {
      recommendationScore: 90,
      recommendationLabel: "prepare-scale",
      strategicPriorityDirection: "semantic",
      strategicRecommendations: [],
      strategicWarnings: [],
      strategicOpportunities: [],
      strategicFocusAreas: [],
      summary: "",
      notes: [],
    },
    strategicAdaptationOrchestrator: {
      adaptationScore: 85,
      adaptationLabel: "orchestrating",
      adaptationPhase: "autonomy-preparation",
      adaptationDirection: "prepare-autonomy-evolution",
      adaptationTempo: "accelerated",
      orchestrationSignals: [],
      coordinationRisks: [],
      nextBestActions: [],
      alignmentSummary: "",
      notes: [],
    },
    adaptiveStrategicPolicy: {
      policyScore: 85,
      policyLabel: "expansion-ready",
      adaptivePosture: "accelerated-adaptation",
      strategicOperatingMode: "evolutionary",
      evolutionDirection: "systemic-acceleration",
      adaptiveConstraints: [],
      adaptiveSignals: [],
      adaptiveRisks: [],
      adaptiveOpportunities: [],
      summary: "",
      notes: [],
    },
    adaptiveStrategicFeedback: {
      feedbackScore: 85,
      feedbackLabel: "self-optimizing",
      strategicFeedbackPosture: "autonomous-ready",
      adaptiveCorrections: [],
      optimizationSignals: [],
      strategicRisks: [],
      strategicMomentumSignals: [],
      trajectory: "stabilizing",
      summary: "",
      notes: [],
    },
    strategicEvolutionModel: {
      evolutionScore: 90,
      evolutionLabel: "accelerating",
      evolutionTrajectory: "ascending",
      phaseReadiness: "automation-candidate",
      evolutionPressure: {
        unresolvedPressure: "low",
        learningPressure: "low",
        consistencyPressure: "low",
        executionPressure: "low",
      },
      signals: [],
      risks: [],
      opportunities: [],
      summary: "",
      notes: [],
    },
    strategicExecutionRuntimeDecision: {
      executionDecision: "semantic-execution",
      executionMode: "full",
      selectedExecutor: "semantic-wave-executor",
      confidence: 90,
      riskLevel: "low",
      reasons: [],
      nextActions: [],
      notes: [],
    },
    adaptiveSchedulingSignals: {
      signalsVersion: "v1",
      cooldownSignals: { cooldownStrictness: "relax", cooldownTighteningSafe: true, cooldownRelaxationSafe: true },
      previewSignals: { previewDependencyLevel: "low", previewRelaxationSafe: true, previewFirstShouldPersist: false },
      pilotSignals: { pilotScopePressure: "expand", pilotExpansionSafe: true, pilotContractionRecommended: false },
      schedulerAdaptationSignals: { safeToReduceCooldown: true, safeToExpandApplyScheduling: true, shouldRemainConservative: false },
      adaptationHealthScore: 90,
      adaptationHealthLabel: "ready",
      summary: "",
      notes: [],
    },
    siteSemanticConsistency: {
      consistencyScore: 95,
      consistencyLabel: "high",
      consistencyDimensions: { heroConsistency: "high", ctaConsistency: "high", faqConsistency: "high", pricingConsistency: "high" },
      inconsistentPages: [],
      consistencyGaps: [],
      consistencySummary: { heroPatternCount: 1, ctaPatternCount: 1, faqPatternCount: 1, pricingPatternCount: 1 },
      recommendations: [],
      summary: "",
      notes: [],
    },
    unresolvedRatio: 0.1,
  });

  assert(out.bridgeLabel === "runtime-ready", "Scenario B: bridgeLabel=runtime-ready");
  assert(out.runtimeBridgePosture === "expand-runtime", "Scenario B: posture=expand-runtime");
  assert(out.runtimeScopeGuidance === "semantic-preferred", "Scenario B: scope=semantic-preferred");
  assert(out.runtimeTempoGuidance === "accelerated", "Scenario B: tempo=accelerated");
  assert(out.bridgeScore >= 75, "Scenario B: bridgeScore>=75");
}

