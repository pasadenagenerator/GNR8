import type { SiteSemanticConsistency } from "@/gnr8/ai/site-semantic-consistency";
import type { SiteSemanticIntelligence } from "@/gnr8/ai/site-semantic-intelligence";
import type { StrategicSemanticExecutionReadiness } from "@/gnr8/ai/strategic-semantic-execution-readiness";
import type { StrategicSemanticPlan, StrategicSemanticPlanStep } from "@/gnr8/ai/strategic-semantic-planning";

export type StrategicExecutionOrchestrationMode = "blocked" | "phased" | "guided";
export type StrategicExecutionRolloutStrategy =
  | "stabilize-first"
  | "semantic-first"
  | "consistency-first"
  | "automation-prep";

export type StrategicExecutionWaveReadiness = "blocked" | "review-needed" | "ready";

export type StrategicExecutionOrchestrationWave = {
  id: string;
  label: string;
  purpose: string;
  readiness: StrategicExecutionWaveReadiness;
  stepIds: string[];
  targetPages: string[];
  rationale: string[];
};

export type StrategicExecutionOrchestration = {
  orchestrationMode: StrategicExecutionOrchestrationMode;
  rolloutStrategy: StrategicExecutionRolloutStrategy;

  waves: StrategicExecutionOrchestrationWave[];

  deferredStepIds: string[];
  blockedStepIds: string[];

  executionCandidates: string[];
  reviewRequiredPages: string[];

  summary: string;
  notes: string[];
};

type WaveKind = "stabilization" | "semantic-improvement" | "consistency-normalization" | "automation-preparation";

type WaveSpec = {
  kind: WaveKind;
  id: string;
  label: string;
  purpose: string;
  rationale: string[];
};

const WAVE_SPECS: Record<WaveKind, WaveSpec> = {
  stabilization: {
    kind: "stabilization",
    id: "wave-stabilization",
    label: "Wave 1 — Stabilization",
    purpose: "stabilization",
    rationale: ["Coverage-related semantic gaps should be addressed before broader execution."],
  },
  "semantic-improvement": {
    kind: "semantic-improvement",
    id: "wave-semantic-improvement",
    label: "Wave 2 — Semantic Improvement",
    purpose: "semantic improvement",
    rationale: ["Grouped semantic page improvements are suitable for phased execution."],
  },
  "consistency-normalization": {
    kind: "consistency-normalization",
    id: "wave-consistency-normalization",
    label: "Wave 3 — Consistency Normalization",
    purpose: "consistency normalization",
    rationale: ["Cross-page consistency should be normalized after core page improvements."],
  },
  "automation-preparation": {
    kind: "automation-preparation",
    id: "wave-automation-preparation",
    label: "Wave 4 — Automation Preparation",
    purpose: "automation preparation",
    rationale: ["Automation-readiness work should follow semantic stabilization."],
  },
};

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

function getOrchestrationMode(readiness: StrategicSemanticExecutionReadiness): StrategicExecutionOrchestrationMode {
  const readinessLabel = readiness?.label ?? "not-ready";
  const executionMode = readiness?.executionMode ?? "blocked";

  if (readinessLabel === "not-ready" || executionMode === "blocked") return "blocked";
  if (readinessLabel === "execution-ready" && executionMode === "full") return "guided";
  return "phased";
}

function getRolloutStrategy(plan: StrategicSemanticPlan): StrategicExecutionRolloutStrategy {
  const planMode = plan?.planMode ?? "stabilize";
  const focusArea = plan?.focusArea ?? "semantic-content";

  if (planMode === "stabilize" || focusArea === "structure") return "stabilize-first";
  if (focusArea === "automation-readiness" || planMode === "prepare-automation") return "automation-prep";
  if (focusArea === "consistency") return "consistency-first";
  return "semantic-first";
}

function waveKindForStep(step: StrategicSemanticPlanStep): WaveKind {
  switch (step.type) {
    case "site-coverage":
      return "stabilization";
    case "page-semantic-improvement":
      return "semantic-improvement";
    case "site-consistency":
      return "consistency-normalization";
    case "automation-readiness":
      return "automation-preparation";
    default:
      return "semantic-improvement";
  }
}

function classifyWaveReadiness(input: {
  orchestrationMode: StrategicExecutionOrchestrationMode;
  waveKind: WaveKind;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticPlan: StrategicSemanticPlan;
}): StrategicExecutionWaveReadiness {
  if (input.orchestrationMode === "blocked") return "blocked";

  if (input.orchestrationMode === "phased") {
    if (input.waveKind === "semantic-improvement") return "ready";
    return "review-needed";
  }

  // guided mode
  if (input.waveKind === "consistency-normalization") {
    return input.siteSemanticConsistency.consistencyLabel === "high" ? "ready" : "review-needed";
  }
  if (input.waveKind === "automation-preparation") {
    return input.siteSemanticIntelligence.semanticAutomationReadiness.label === "automation-candidate" ? "ready" : "review-needed";
  }
  if (input.waveKind === "stabilization") {
    const planMode = input.strategicSemanticPlan.planMode;
    return planMode === "stabilize" ? "review-needed" : "ready";
  }
  return "ready";
}

function buildWaves(input: {
  orchestrationMode: StrategicExecutionOrchestrationMode;
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticPlan: StrategicSemanticPlan;
}): StrategicExecutionOrchestrationWave[] {
  const steps = Array.isArray(input.strategicSemanticPlan.steps) ? input.strategicSemanticPlan.steps : [];

  const stepsByKind: Record<WaveKind, StrategicSemanticPlanStep[]> = {
    stabilization: [],
    "semantic-improvement": [],
    "consistency-normalization": [],
    "automation-preparation": [],
  };

  for (const step of steps) {
    const kind = waveKindForStep(step);
    stepsByKind[kind].push(step);
  }

  const order: WaveKind[] = ["stabilization", "semantic-improvement", "consistency-normalization", "automation-preparation"];
  const waves: StrategicExecutionOrchestrationWave[] = [];

  for (const kind of order) {
    const assigned = stepsByKind[kind];
    if (!assigned || assigned.length === 0) continue;

    const spec = WAVE_SPECS[kind];
    const readiness = classifyWaveReadiness({
      orchestrationMode: input.orchestrationMode,
      waveKind: kind,
      siteSemanticIntelligence: input.siteSemanticIntelligence,
      siteSemanticConsistency: input.siteSemanticConsistency,
      strategicSemanticPlan: input.strategicSemanticPlan,
    });

    const stepIds = assigned.map((s) => s.id);
    const targetPages = uniqStable(assigned.flatMap((s) => s.targetPages ?? []));

    waves.push({
      id: spec.id,
      label: spec.label,
      purpose: spec.purpose,
      readiness,
      stepIds,
      targetPages,
      rationale: spec.rationale.slice(0, 3),
    });
  }

  return waves.slice(0, 4);
}

function collectExecutionCandidates(waves: StrategicExecutionOrchestrationWave[]): string[] {
  const slugs: string[] = [];
  for (const wave of waves) {
    if (wave.readiness !== "ready") continue;
    slugs.push(...(wave.targetPages ?? []));
  }
  return uniqStable(slugs);
}

function collectReviewRequiredPages(waves: StrategicExecutionOrchestrationWave[]): string[] {
  const slugs: string[] = [];
  for (const wave of waves) {
    if (wave.readiness === "ready") continue;
    slugs.push(...(wave.targetPages ?? []));
  }
  return uniqStable(slugs);
}

function buildSummary(input: {
  orchestrationMode: StrategicExecutionOrchestrationMode;
  rolloutStrategy: StrategicExecutionRolloutStrategy;
  waves: StrategicExecutionOrchestrationWave[];
}): string {
  const readyWaves = input.waves.filter((w) => w.readiness === "ready").length;
  const blockedWaves = input.waves.filter((w) => w.readiness === "blocked").length;
  const reviewWaves = input.waves.filter((w) => w.readiness === "review-needed").length;

  const pattern =
    blockedWaves > 0
      ? "blocked"
      : readyWaves > 0 && reviewWaves > 0
        ? "mixed"
        : readyWaves > 0
          ? "ready"
          : "review-needed";

  if (input.orchestrationMode === "blocked") {
    return "Strategic semantic execution is blocked; stabilization is required first.";
  }
  if (input.orchestrationMode === "phased") {
    return pattern === "ready"
      ? `Strategic semantic execution should proceed in phased waves (${input.rolloutStrategy}).`
      : `Strategic semantic execution should proceed in phased waves with review gates (${input.rolloutStrategy}).`;
  }

  return pattern === "ready"
    ? `Strategic semantic execution is ready for guided orchestration (${input.rolloutStrategy}).`
    : `Strategic semantic execution is ready for guided orchestration with targeted review gates (${input.rolloutStrategy}).`;
}

function buildNotes(input: {
  orchestrationMode: StrategicExecutionOrchestrationMode;
  rolloutStrategy: StrategicExecutionRolloutStrategy;
  unresolvedPages: string[];
  deferredStepIds: string[];
  blockedStepIds: string[];
}): string[] {
  const notes: string[] = [];
  notes.push("Strategic execution orchestration only; no changes are applied.");

  if (input.unresolvedPages.length > 0) {
    notes.push(`Unresolved pages: ${input.unresolvedPages.length}.`);
  }

  if (input.blockedStepIds.length > 0) {
    notes.push(`Blocked steps: ${input.blockedStepIds.length}.`);
  }

  if (input.orchestrationMode === "phased" && input.deferredStepIds.length > 0) {
    notes.push(`Phased rollout: deferred steps=${input.deferredStepIds.length}.`);
  } else if (input.orchestrationMode === "guided") {
    notes.push("Guided orchestration mode: execute by wave readiness.");
  }

  notes.push(`Rollout strategy: ${input.rolloutStrategy}.`);
  return notes.slice(0, 5);
}

export function buildStrategicExecutionOrchestration(input: {
  unresolvedPages: string[];
  siteSemanticIntelligence: SiteSemanticIntelligence;
  siteSemanticConsistency: SiteSemanticConsistency;
  strategicSemanticPlan: StrategicSemanticPlan;
  strategicSemanticExecutionReadiness: StrategicSemanticExecutionReadiness;
}): StrategicExecutionOrchestration {
  const orchestrationMode = getOrchestrationMode(input.strategicSemanticExecutionReadiness);
  const rolloutStrategy = getRolloutStrategy(input.strategicSemanticPlan);

  const waves = buildWaves({
    orchestrationMode,
    siteSemanticIntelligence: input.siteSemanticIntelligence,
    siteSemanticConsistency: input.siteSemanticConsistency,
    strategicSemanticPlan: input.strategicSemanticPlan,
  });

  const blockedStepIds: string[] = [];
  for (const wave of waves) {
    if (wave.readiness !== "blocked") continue;
    blockedStepIds.push(...(wave.stepIds ?? []));
  }

  let deferredStepIds: string[] = [];
  if (orchestrationMode === "phased") {
    const firstReadyIndex = waves.findIndex((w) => w.readiness === "ready");
    if (firstReadyIndex >= 0) {
      const deferred: string[] = [];
      for (let i = firstReadyIndex + 1; i < waves.length; i += 1) {
        deferred.push(...(waves[i]?.stepIds ?? []));
      }
      deferredStepIds = uniqStable(deferred).filter((id) => !blockedStepIds.includes(id));
    }
  }

  const executionCandidates = collectExecutionCandidates(waves);
  const reviewRequiredPages = collectReviewRequiredPages(waves);

  const summary = buildSummary({ orchestrationMode, rolloutStrategy, waves });
  const notes = buildNotes({
    orchestrationMode,
    rolloutStrategy,
    unresolvedPages: Array.isArray(input.unresolvedPages) ? input.unresolvedPages : [],
    deferredStepIds,
    blockedStepIds,
  });

  return {
    orchestrationMode,
    rolloutStrategy,
    waves,
    deferredStepIds,
    blockedStepIds,
    executionCandidates,
    reviewRequiredPages,
    summary,
    notes,
  };
}

