import type {
  StrategicExecutionOrchestration,
  StrategicExecutionOrchestrationMode,
  StrategicExecutionOrchestrationWave,
  StrategicExecutionWaveReadiness,
} from "@/gnr8/ai/strategic-execution-orchestrator";

export type OrchestrationPreviewOverallStatus = "blocked" | "review-needed" | "pilot-ready" | "guided-ready";
export type OrchestrationPreviewWaveStatus = "blocked" | "review-needed" | "ready";

export type OrchestrationPreviewWave = {
  waveId: string;
  label: string;
  purpose: string;

  status: OrchestrationPreviewWaveStatus;
  expectedOutcome: string;
  blockedReason: string | null;
  reviewRisk: string | null;
  pilotCandidate: boolean;

  targetPages: string[];
  stepIds: string[];

  rationale: string[];
};

export type OrchestrationPreview = {
  overallPreviewStatus: OrchestrationPreviewOverallStatus;

  wavePreviews: OrchestrationPreviewWave[];

  firstRecommendedWaveId: string | null;
  pilotCandidateWaveIds: string[];
  blockedWaveIds: string[];

  summary: string;
  notes: string[];
};

function normalizePurpose(purpose: string): string {
  return String(purpose ?? "").trim().toLowerCase();
}

function purposeKind(purpose: string): "stabilization" | "semantic-improvement" | "consistency" | "automation-preparation" | "unknown" {
  const p = normalizePurpose(purpose);
  if (p === "stabilization") return "stabilization";
  if (p === "semantic improvement") return "semantic-improvement";
  if (p === "consistency normalization") return "consistency";
  if (p === "automation preparation") return "automation-preparation";
  return "unknown";
}

function mapWaveStatus(readiness: StrategicExecutionWaveReadiness): OrchestrationPreviewWaveStatus {
  if (readiness === "ready") return "ready";
  if (readiness === "review-needed") return "review-needed";
  return "blocked";
}

function getOverallPreviewStatus(input: {
  orchestrationMode: StrategicExecutionOrchestrationMode;
  wavePreviews: Array<{ status: OrchestrationPreviewWaveStatus }>;
}): OrchestrationPreviewOverallStatus {
  if (input.orchestrationMode === "blocked") return "blocked";
  if (input.orchestrationMode === "guided") return "guided-ready";

  const hasReady = input.wavePreviews.some((w) => w.status === "ready");
  return hasReady ? "pilot-ready" : "review-needed";
}

function getExpectedOutcomeForWave(wave: StrategicExecutionOrchestrationWave): string {
  switch (purposeKind(wave.purpose)) {
    case "stabilization":
      return "Reduce structural and semantic instability before broader rollout.";
    case "semantic-improvement":
      return "Improve grouped semantic quality across target pages.";
    case "consistency":
      return "Reduce cross-page semantic inconsistency.";
    case "automation-preparation":
      return "Prepare remaining pages for safer semantic automation.";
    default:
      return "Advance rollout readiness before broader rollout.";
  }
}

function getBlockedReasonForWave(wave: StrategicExecutionOrchestrationWave, status: OrchestrationPreviewWaveStatus): string | null {
  if (status !== "blocked") return null;
  switch (purposeKind(wave.purpose)) {
    case "stabilization":
      return "This wave is blocked because the site is not yet ready for strategic execution.";
    case "semantic-improvement":
      return "This wave is blocked because semantic readiness is too low across target pages.";
    case "consistency":
      return "This wave is blocked because consistency work still requires review before rollout.";
    case "automation-preparation":
      return "This wave is blocked because earlier readiness conditions are not yet satisfied.";
    default:
      return "This wave is blocked because readiness conditions are not yet satisfied.";
  }
}

function getReviewRiskForWave(wave: StrategicExecutionOrchestrationWave, status: OrchestrationPreviewWaveStatus): string | null {
  if (status !== "review-needed") return null;
  switch (purposeKind(wave.purpose)) {
    case "stabilization":
      return "This wave still needs human review because site stabilization is incomplete.";
    case "semantic-improvement":
      return "This wave still needs human review because some target pages are not execution-ready.";
    case "consistency":
      return "This wave still needs human review because cross-page consistency is not yet stable.";
    case "automation-preparation":
      return "This wave still needs human review because readiness is uneven across pages.";
    default:
      return "This wave still needs human review before rollout.";
  }
}

function getFirstRecommendedWaveId(wavePreviews: OrchestrationPreviewWave[]): string | null {
  const first = wavePreviews.find((w) => w.status === "ready");
  return first ? first.waveId : null;
}

function isPilotCandidateWave(input: {
  wave: StrategicExecutionOrchestrationWave;
  wavePreviewStatus: OrchestrationPreviewWaveStatus;
  firstRecommendedWaveId: string | null;
  readyWaveCount: number;
  orchestrationMode: StrategicExecutionOrchestrationMode;
}): boolean {
  if (input.wavePreviewStatus !== "ready") return false;
  if (!Array.isArray(input.wave.targetPages) || input.wave.targetPages.length === 0) return false;

  const kind = purposeKind(input.wave.purpose);
  if (kind === "automation-preparation") return false;

  const isFirstReadyWave =
    !!input.firstRecommendedWaveId &&
    input.wave.id === input.firstRecommendedWaveId &&
    (input.orchestrationMode === "phased" || input.orchestrationMode === "guided");

  if (kind === "stabilization") return isFirstReadyWave && input.readyWaveCount === 1;
  if (kind === "semantic-improvement") return true;
  return isFirstReadyWave;
}

function buildSummary(input: {
  overallPreviewStatus: OrchestrationPreviewOverallStatus;
  hasBlockedWaves: boolean;
}): string {
  const base =
    input.overallPreviewStatus === "blocked"
      ? "Strategic rollout is blocked and requires further stabilization."
      : input.overallPreviewStatus === "review-needed"
        ? "Strategic rollout requires review before execution can begin."
        : input.overallPreviewStatus === "pilot-ready"
          ? "Strategic rollout is ready for a limited pilot wave."
          : "Strategic rollout is ready for guided multi-wave execution.";

  if (input.overallPreviewStatus === "blocked") return base;
  if (!input.hasBlockedWaves) return base;

  if (input.overallPreviewStatus === "pilot-ready") {
    return "Strategic rollout is ready for a limited pilot wave, but some waves are blocked.";
  }
  if (input.overallPreviewStatus === "guided-ready") {
    return "Strategic rollout is ready for guided multi-wave execution, but some waves are blocked.";
  }
  return "Strategic rollout requires review before execution can begin; some waves are blocked.";
}

function buildNotes(input: {
  unresolvedPages: string[];
  orchestrationMode: StrategicExecutionOrchestrationMode;
  blockedWaveIds: string[];
  pilotCandidateWaveIds: string[];
}): string[] {
  const notes: string[] = [];
  notes.push("Orchestration preview only; no changes are applied.");

  if (input.unresolvedPages.length > 0) {
    notes.push(`Unresolved pages: ${input.unresolvedPages.length}.`);
  }

  if (input.blockedWaveIds.length > 0) {
    notes.push(`Blocked waves: ${input.blockedWaveIds.length}.`);
  }

  if (input.pilotCandidateWaveIds.length > 0) {
    notes.push(`Pilot candidates: ${input.pilotCandidateWaveIds.length}.`);
  }

  if (input.orchestrationMode === "phased") {
    notes.push("Phased rollout: execute wave-by-wave with review gates.");
  } else if (input.orchestrationMode === "guided") {
    notes.push("Guided rollout: execute by wave readiness with human oversight.");
  }

  return notes.slice(0, 5);
}

export function buildOrchestrationPreview(input: {
  strategicExecutionOrchestration: StrategicExecutionOrchestration;
  unresolvedPages: string[];
}): { orchestrationPreview: OrchestrationPreview } {
  const orchestration = input.strategicExecutionOrchestration;
  const waves = Array.isArray(orchestration?.waves) ? orchestration.waves : [];

  const baseWavePreviews: OrchestrationPreviewWave[] = waves.map((wave) => {
    const status = mapWaveStatus(wave.readiness);
    return {
      waveId: wave.id,
      label: wave.label,
      purpose: wave.purpose,
      status,
      expectedOutcome: getExpectedOutcomeForWave(wave),
      blockedReason: getBlockedReasonForWave(wave, status),
      reviewRisk: getReviewRiskForWave(wave, status),
      pilotCandidate: false,
      targetPages: Array.isArray(wave.targetPages) ? wave.targetPages : [],
      stepIds: Array.isArray(wave.stepIds) ? wave.stepIds : [],
      rationale: Array.isArray(wave.rationale) ? wave.rationale : [],
    };
  });

  const overallPreviewStatus = getOverallPreviewStatus({
    orchestrationMode: orchestration.orchestrationMode,
    wavePreviews: baseWavePreviews,
  });

  const firstRecommendedWaveId = getFirstRecommendedWaveId(baseWavePreviews);
  const readyWaveCount = baseWavePreviews.filter((w) => w.status === "ready").length;

  const wavePreviews: OrchestrationPreviewWave[] = baseWavePreviews.map((preview) => {
    const wave = waves.find((w) => w.id === preview.waveId);
    if (!wave) return preview;

    return {
      ...preview,
      pilotCandidate: isPilotCandidateWave({
        wave,
        wavePreviewStatus: preview.status,
        firstRecommendedWaveId,
        readyWaveCount,
        orchestrationMode: orchestration.orchestrationMode,
      }),
    };
  });

  const pilotCandidateWaveIds = wavePreviews.filter((w) => w.pilotCandidate).map((w) => w.waveId);
  const blockedWaveIds = wavePreviews.filter((w) => w.status === "blocked").map((w) => w.waveId);

  const summary = buildSummary({
    overallPreviewStatus,
    hasBlockedWaves: blockedWaveIds.length > 0,
  });

  const notes = buildNotes({
    unresolvedPages: Array.isArray(input.unresolvedPages) ? input.unresolvedPages : [],
    orchestrationMode: orchestration.orchestrationMode,
    blockedWaveIds,
    pilotCandidateWaveIds,
  });

  return {
    orchestrationPreview: {
      overallPreviewStatus,
      wavePreviews,
      firstRecommendedWaveId,
      pilotCandidateWaveIds,
      blockedWaveIds,
      summary,
      notes,
    },
  };
}

