import type { TransformationPlanStep } from "@/gnr8/ai/transformation-planner";

export type ExecutionCapabilityKind =
  | "add-section"
  | "replace-section"
  | "move-section"
  | "cleanup"
  | "merge"
  | "normalize"
  | "unsupported";

export interface ExecutionCapability {
  prompt: string;
  normalizedPrompt: string;
  kind: ExecutionCapabilityKind;
  safe: boolean;
  requiresApproval: boolean;
  supported: boolean;
  engine: "content-layout-transformer" | "layout-agent" | "structural-pipeline" | "none";
}

export function normalizeExecutionPrompt(prompt: string): string {
  const collapsed = String(prompt ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
  return collapsed.replace(/[.?!;:,]+$/, "").trim();
}

export const EXECUTION_CAPABILITY_MATRIX: ExecutionCapability[] = [
  // add-section (approval required)
  {
    prompt: "Add CTA below the hero",
    normalizedPrompt: normalizeExecutionPrompt("Add CTA below the hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add CTA below hero",
    normalizedPrompt: normalizeExecutionPrompt("Add CTA below hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add CTA under the hero",
    normalizedPrompt: normalizeExecutionPrompt("Add CTA under the hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add CTA under hero",
    normalizedPrompt: normalizeExecutionPrompt("Add CTA under hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add CTA after the hero",
    normalizedPrompt: normalizeExecutionPrompt("Add CTA after the hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add CTA after hero",
    normalizedPrompt: normalizeExecutionPrompt("Add CTA after hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add feature grid below the hero",
    normalizedPrompt: normalizeExecutionPrompt("Add feature grid below the hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add feature grid below hero",
    normalizedPrompt: normalizeExecutionPrompt("Add feature grid below hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add features below the hero",
    normalizedPrompt: normalizeExecutionPrompt("Add features below the hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add features below hero",
    normalizedPrompt: normalizeExecutionPrompt("Add features below hero"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add logo cloud above pricing",
    normalizedPrompt: normalizeExecutionPrompt("Add logo cloud above pricing"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add logo cloud above the pricing",
    normalizedPrompt: normalizeExecutionPrompt("Add logo cloud above the pricing"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add FAQ below pricing",
    normalizedPrompt: normalizeExecutionPrompt("Add FAQ below pricing"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add FAQ below the pricing",
    normalizedPrompt: normalizeExecutionPrompt("Add FAQ below the pricing"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add pricing section",
    normalizedPrompt: normalizeExecutionPrompt("Add pricing section"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add pricing",
    normalizedPrompt: normalizeExecutionPrompt("Add pricing"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add footer at the bottom",
    normalizedPrompt: normalizeExecutionPrompt("Add footer at the bottom"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add footer to the bottom",
    normalizedPrompt: normalizeExecutionPrompt("Add footer to the bottom"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add footer at bottom",
    normalizedPrompt: normalizeExecutionPrompt("Add footer at bottom"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Add footer to bottom",
    normalizedPrompt: normalizeExecutionPrompt("Add footer to bottom"),
    kind: "add-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },

  // replace-section (approval required)
  {
    prompt: "Replace legacy section with CTA",
    normalizedPrompt: normalizeExecutionPrompt("Replace legacy section with CTA"),
    kind: "replace-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Replace legacy section with FAQ",
    normalizedPrompt: normalizeExecutionPrompt("Replace legacy section with FAQ"),
    kind: "replace-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Replace legacy section with pricing",
    normalizedPrompt: normalizeExecutionPrompt("Replace legacy section with pricing"),
    kind: "replace-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },
  {
    prompt: "Replace legacy section with hero",
    normalizedPrompt: normalizeExecutionPrompt("Replace legacy section with hero"),
    kind: "replace-section",
    safe: false,
    requiresApproval: true,
    supported: true,
    engine: "content-layout-transformer",
  },

  // move-section (safe)
  {
    prompt: "Move footer to the bottom",
    normalizedPrompt: normalizeExecutionPrompt("Move footer to the bottom"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },
  {
    prompt: "Move navbar to the top",
    normalizedPrompt: normalizeExecutionPrompt("Move navbar to the top"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },
  {
    prompt: "Move CTA below FAQ",
    normalizedPrompt: normalizeExecutionPrompt("Move CTA below FAQ"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },
  {
    prompt: "Move CTA below pricing",
    normalizedPrompt: normalizeExecutionPrompt("Move CTA below pricing"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },
  {
    prompt: "Move hero near top",
    normalizedPrompt: normalizeExecutionPrompt("Move hero near top"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },
  {
    prompt: "Move CTA near the bottom",
    normalizedPrompt: normalizeExecutionPrompt("Move CTA near the bottom"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },
  {
    prompt: "Move legacy blocks below structured sections",
    normalizedPrompt: normalizeExecutionPrompt("Move legacy blocks below structured sections"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },
  {
    prompt: "Move legacy HTML blocks below structured sections",
    normalizedPrompt: normalizeExecutionPrompt("Move legacy HTML blocks below structured sections"),
    kind: "move-section",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "layout-agent",
  },

  // structural safe pipeline (safe)
  {
    prompt: "Remove exact duplicate sections",
    normalizedPrompt: normalizeExecutionPrompt("Remove exact duplicate sections"),
    kind: "cleanup",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "structural-pipeline",
  },
  {
    prompt: "Merge highly similar sections",
    normalizedPrompt: normalizeExecutionPrompt("Merge highly similar sections"),
    kind: "merge",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "structural-pipeline",
  },
  {
    prompt: "Normalize section layout",
    normalizedPrompt: normalizeExecutionPrompt("Normalize section layout"),
    kind: "normalize",
    safe: true,
    requiresApproval: false,
    supported: true,
    engine: "structural-pipeline",
  },
] satisfies ExecutionCapability[];

export function getExecutionCapability(prompt: string): ExecutionCapability | null {
  const normalized = normalizeExecutionPrompt(prompt);
  if (!normalized) return null;
  return EXECUTION_CAPABILITY_MATRIX.find((c) => c.normalizedPrompt === normalized) ?? null;
}

export function getExecutionCapabilityForPlanStep(step: Pick<TransformationPlanStep, "kind" | "actionPrompt">): ExecutionCapability | null {
  if (step.kind === "cleanup") return getExecutionCapability("Remove exact duplicate sections");
  if (step.kind === "merge") return getExecutionCapability("Merge highly similar sections");
  if (step.kind === "normalize") return getExecutionCapability("Normalize section layout");
  return getExecutionCapability(String(step.actionPrompt ?? ""));
}

export function isPromptSupported(prompt: string): boolean {
  const c = getExecutionCapability(prompt);
  return c?.supported === true;
}

export function isPromptSafe(prompt: string): boolean {
  const c = getExecutionCapability(prompt);
  return c?.supported === true && c.safe === true && c.requiresApproval === false;
}

export function getExecutionEngine(prompt: string): string | null {
  const c = getExecutionCapability(prompt);
  return c?.supported === true ? c.engine : null;
}

export function getCapabilityKind(prompt: string): ExecutionCapabilityKind | "unknown" {
  const c = getExecutionCapability(prompt);
  return c?.supported === true ? c.kind : "unknown";
}

export function groupCapabilitiesByKind(): Record<string, ExecutionCapability[]> {
  const out: Record<string, ExecutionCapability[]> = {};
  for (const c of EXECUTION_CAPABILITY_MATRIX) {
    const key = c.kind;
    out[key] ??= [];
    out[key].push(c);
  }
  return out;
}

export function listSafeCapabilities(): ExecutionCapability[] {
  return EXECUTION_CAPABILITY_MATRIX.filter((c) => c.supported === true && c.safe === true && c.requiresApproval === false);
}

export function listApprovalRequiredCapabilities(): ExecutionCapability[] {
  return EXECUTION_CAPABILITY_MATRIX.filter((c) => c.supported === true && c.requiresApproval === true);
}
