import type { OrchestrationPreview } from "@/gnr8/ai/orchestration-preview";
import type { StrategicExecutionRuntimeDecision } from "@/gnr8/ai/strategic-execution-runtime-router";

export type AutonomousRuntimeOutcome = "blocked" | "preview-only" | "idempotent-skip" | "executed";

export type RuntimeExecutionGuards = {
  routerDecision: StrategicExecutionRuntimeDecision;
  eligibleForExecution: boolean;
  executionPath: "semantic" | "structural" | "mixed" | "none";
  guardReason?: string;
};

export type RuntimeExecutionFingerprint = {
  executionPath: string;
  waveId: string | null;
  targetedPages: string[];
};

function addUniqueLimited(out: string[], value: string, limit: number): void {
  if (out.length >= limit) return;
  const v = String(value ?? "").trim();
  if (!v) return;
  if (out.includes(v)) return;
  out.push(v);
}

function uniq(values: string[]): string[] {
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

function sortStable(values: string[]): string[] {
  return [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function normalizeSlug(slug: string): string {
  const s = String(slug ?? "").trim();
  if (!s) return "";
  if (s === "/") return "/";
  return s.startsWith("/") ? s : `/${s}`;
}

export function buildRuntimeExecutionGuards(routerDecision: StrategicExecutionRuntimeDecision): RuntimeExecutionGuards {
  const executor = routerDecision?.selectedExecutor ?? null;
  const executionPath: RuntimeExecutionGuards["executionPath"] =
    executor === "semantic-wave-executor"
      ? "semantic"
      : executor === "structural-wave-executor"
        ? "structural"
        : executor === "mixed-wave-executor"
          ? "mixed"
          : "none";

  const blocked = routerDecision?.executionDecision === "blocked";
  const previewOnly = routerDecision?.executionDecision === "preview-only";
  const mode = routerDecision?.executionMode ?? "none";
  const postureEligible = mode === "pilot" || mode === "guided" || mode === "full";
  const hasExecutor = !!executor;

  let eligibleForExecution = true;
  const reasons: string[] = [];

  if (blocked) {
    eligibleForExecution = false;
    addUniqueLimited(reasons, "Router decision blocked execution.", 3);
  }
  if (previewOnly) {
    eligibleForExecution = false;
    addUniqueLimited(reasons, "Preview-only runtime decision.", 3);
  }
  if (!hasExecutor) {
    eligibleForExecution = false;
    addUniqueLimited(reasons, "No executor selected.", 3);
  }
  if (!postureEligible) {
    eligibleForExecution = false;
    addUniqueLimited(reasons, "Execution posture is not eligible.", 3);
  }

  return {
    routerDecision,
    eligibleForExecution,
    executionPath,
    guardReason: reasons.length > 0 ? reasons.join(" ") : undefined,
  };
}

export function resolveWaveTargetPages(input: {
  orchestrationPreview: OrchestrationPreview;
  waveId: string | null;
}): string[] {
  const previews = Array.isArray(input.orchestrationPreview?.wavePreviews) ? input.orchestrationPreview.wavePreviews : [];
  const waveId = String(input.waveId ?? "").trim();
  if (!waveId) return [];

  const match = previews.find((w) => String(w?.waveId ?? "").trim() === waveId) ?? null;
  const pages = Array.isArray(match?.targetPages) ? match.targetPages : [];
  const normalized = pages.map((p) => normalizeSlug(String(p ?? ""))).filter(Boolean);
  return sortStable(uniq(normalized));
}

export function buildRuntimeExecutionFingerprint(input: {
  selectedExecutor: StrategicExecutionRuntimeDecision["selectedExecutor"];
  waveId: string | null;
  targetedPages: string[];
}): RuntimeExecutionFingerprint {
  const executionPath =
    input.selectedExecutor === "semantic-wave-executor"
      ? "semantic"
      : input.selectedExecutor === "structural-wave-executor"
        ? "structural"
        : input.selectedExecutor === "mixed-wave-executor"
          ? "mixed"
          : "none";

  const waveId = typeof input.waveId === "string" ? String(input.waveId).trim() : "";
  const targetedPages = sortStable(uniq((Array.isArray(input.targetedPages) ? input.targetedPages : []).map((p) => normalizeSlug(String(p ?? ""))).filter(Boolean)));

  return {
    executionPath,
    waveId: waveId || null,
    targetedPages,
  };
}

export function fingerprintsEqual(a: RuntimeExecutionFingerprint | undefined, b: RuntimeExecutionFingerprint | undefined): boolean {
  if (!a || !b) return false;
  if (String(a.executionPath ?? "") !== String(b.executionPath ?? "")) return false;
  if (String(a.waveId ?? "") !== String(b.waveId ?? "")) return false;
  const ap = Array.isArray(a.targetedPages) ? a.targetedPages : [];
  const bp = Array.isArray(b.targetedPages) ? b.targetedPages : [];
  if (ap.length !== bp.length) return false;
  for (let i = 0; i < ap.length; i += 1) {
    if (String(ap[i] ?? "") !== String(bp[i] ?? "")) return false;
  }
  return true;
}

