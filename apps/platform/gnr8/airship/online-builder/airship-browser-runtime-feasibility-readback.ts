export const AIRSHIP_BROWSER_RUNTIME_FEASIBILITY_GATE_STATUS =
  "airship_adapter_browser_runtime_feasibility_gate_recorded" as const;

export type AirshipBrowserRuntimeFeasibilityVerdict =
  | "viable"
  | "partially_viable_but_not_recommended"
  | "not_viable_for_production"
  | "unknown_requires_external_webcontainer_commercial_proof";

export type AirshipBrowserRuntimeCandidate =
  | "stackblitz_webcontainers"
  | "pure_browser_wasm_opfs"
  | "service_worker_proxy"
  | "github_codespaces_style"
  | "cloudflare_workers_only";

export type AirshipBrowserRuntimeCandidateStatus =
  | "viable"
  | "partially_viable"
  | "not_viable"
  | "disallowed_by_goal"
  | "unknown_requires_external_proof";

export type AirshipBrowserRuntimeArchitectureRecommendation =
  | "browser_only"
  | "cloudflare_containers"
  | "vps_airship_builder_worker"
  | "hybrid_local_companion";

export type AirshipBrowserRuntimeRequirementStatus =
  | "proven"
  | "partially_proven"
  | "likely"
  | "unknown"
  | "not_viable";

export type AirshipBrowserRuntimeRiskLevel = "low" | "medium" | "high" | "critical";

export type AirshipBrowserRuntimeCandidateReadback = {
  candidate: AirshipBrowserRuntimeCandidate;
  status: AirshipBrowserRuntimeCandidateStatus;
  summary: string;
};

export type AirshipBrowserRuntimeRequirementReadback = {
  requirement: string;
  localProofStatus: AirshipBrowserRuntimeRequirementStatus;
  browserOnlyStatus: AirshipBrowserRuntimeRequirementStatus;
  risk: AirshipBrowserRuntimeRiskLevel;
  blockerOrWorkaround: string;
};

export type AirshipBrowserRuntimeFeasibilityReadback = {
  status: typeof AIRSHIP_BROWSER_RUNTIME_FEASIBILITY_GATE_STATUS;
  verdict: AirshipBrowserRuntimeFeasibilityVerdict;
  browserOnlyViable: boolean;
  recommendedArchitecture: AirshipBrowserRuntimeArchitectureRecommendation;
  realBrowserProofRun: boolean;
  remainsUntested: string[];
  keyBlockers: string[];
  candidates: AirshipBrowserRuntimeCandidateReadback[];
  requirements: AirshipBrowserRuntimeRequirementReadback[];
  nextTaskProposal: string;
};

export const AIRSHIP_BROWSER_RUNTIME_FEASIBILITY_READBACK: AirshipBrowserRuntimeFeasibilityReadback = {
  status: AIRSHIP_BROWSER_RUNTIME_FEASIBILITY_GATE_STATUS,
  verdict: "not_viable_for_production",
  browserOnlyViable: false,
  recommendedArchitecture: "vps_airship_builder_worker",
  realBrowserProofRun: false,
  remainsUntested: [
    "@airshiplabs/cli install/import inside StackBlitz WebContainers",
    "Airship sidecar/proxy execution inside WebContainers",
    "WebContainer target server plus Airship editor URL concurrency",
    "WebContainer diff export into GNR8 mapping shape",
    "cross-origin isolation behavior in deployed GNR8 app",
    "WebContainer commercial embedding constraints",
  ],
  keyBlockers: [
    "real Airship is a Node CLI and sidecar process, not a browser library",
    "browser APIs do not provide general child processes, package managers, local ports, and Git-backed source workspaces",
    "provider and agent credentials must not live in browser-side code",
    "Cloudflare Workers-only exposes non-functional child_process stubs and lacks net.Server support",
  ],
  candidates: [
    {
      candidate: "stackblitz_webcontainers",
      status: "unknown_requires_external_proof",
      summary: "Closest browser-family fit, but real Airship compatibility and commercial embedding remain unproven.",
    },
    {
      candidate: "pure_browser_wasm_opfs",
      status: "not_viable",
      summary: "Useful for custom static transforms, not enough for real Airship CLI/process semantics.",
    },
    {
      candidate: "service_worker_proxy",
      status: "not_viable",
      summary: "Can proxy requests but cannot replace a Node CLI sidecar, child processes, ports, or source diff capture.",
    },
    {
      candidate: "github_codespaces_style",
      status: "disallowed_by_goal",
      summary: "Technically likely because it is a cloud dev container, but that violates the browser-only/no-runtime goal.",
    },
    {
      candidate: "cloudflare_workers_only",
      status: "not_viable",
      summary: "Workers are suitable as gateway/control code, not as the long-running Airship runtime.",
    },
  ],
  requirements: [
    {
      requirement: "Airship CLI sidecar",
      localProofStatus: "proven",
      browserOnlyStatus: "unknown",
      risk: "critical",
      blockerOrWorkaround: "Run the real CLI in a VPS or container worker.",
    },
    {
      requirement: "source workspace persistence",
      localProofStatus: "proven",
      browserOnlyStatus: "partially_proven",
      risk: "high",
      blockerOrWorkaround: "Use a worker-owned source workspace with Git baseline.",
    },
    {
      requirement: "secrets/provider safety",
      localProofStatus: "partially_proven",
      browserOnlyStatus: "not_viable",
      risk: "critical",
      blockerOrWorkaround: "Keep agent/provider credentials server-side.",
    },
  ],
  nextTaskProposal: "GNR8 - AIRSHIP ADAPTER 23 - VPS AIRSHIP BUILDER WORKER MINIMAL PROVISIONING PLAN",
};
