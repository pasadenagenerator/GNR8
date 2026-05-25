import { deterministicId, stableStringify } from "@/gnr8/runtime/deterministic";

export type RuntimeProviderExecutionSafetyManifest = {
  manifestId: string;
  executionAllowed: false;
  executionBlocked: true;
  overallStatus: "execution_impossible" | "execution_boundary_active";
  summary: string;
  barriers: {
    barrierId: string;
    category: "governance" | "worker" | "queue" | "provider" | "execution" | "security";
    status: "active";
    reason: string;
  }[];
  diagnostics: string[];
};

type RuntimeProviderExecutionSafetyManifestInput = {
  handoffId: string;
  correlationKey?: string | null;
};

const EXECUTION_SAFETY_BARRIERS: RuntimeProviderExecutionSafetyManifest["barriers"] = [
  {
    barrierId: "governance_boundary_active",
    category: "governance",
    status: "active",
    reason: "Governance remains advisory only.",
  },
  {
    barrierId: "worker_dispatch_disabled",
    category: "worker",
    status: "active",
    reason: "Worker dispatch path not implemented.",
  },
  {
    barrierId: "queue_allocation_disabled",
    category: "queue",
    status: "active",
    reason: "No execution queue allocation exists.",
  },
  {
    barrierId: "provider_execution_disabled",
    category: "provider",
    status: "active",
    reason: "Provider execution path disabled.",
  },
  {
    barrierId: "secret_resolution_disabled",
    category: "security",
    status: "active",
    reason: "Credential resolution disabled.",
  },
  {
    barrierId: "runtime_execution_boundary_active",
    category: "execution",
    status: "active",
    reason: "Control-plane simulation-only mode enabled.",
  },
];

export function createRuntimeProviderExecutionSafetyManifest(
  input: RuntimeProviderExecutionSafetyManifestInput,
): RuntimeProviderExecutionSafetyManifest {
  const handoffId = String(input.handoffId ?? "").trim() || "missing_handoff_id";
  const correlationKey = String(input.correlationKey ?? "").trim() || "missing_correlation_key";
  const manifestId = deterministicId(
    "provider_execution_safety_manifest",
    stableStringify({
      handoffId,
      correlationKey,
      barriers: EXECUTION_SAFETY_BARRIERS.map((barrier) => barrier.barrierId),
    }),
  );

  const barriers = EXECUTION_SAFETY_BARRIERS.map((barrier) => ({ ...barrier }));
  const overallStatus: RuntimeProviderExecutionSafetyManifest["overallStatus"] =
    barriers.length > 0 ? "execution_impossible" : "execution_boundary_active";

  return {
    manifestId,
    executionAllowed: false,
    executionBlocked: true,
    overallStatus,
    summary:
      "Provider execution is impossible in this runtime: active governance, worker, queue, provider, security, and execution boundaries enforce simulation-only behavior.",
    barriers,
    diagnostics: ["EXECUTION_SAFETY_MANIFEST_CREATED", "EXECUTION_SAFETY_BOUNDARY_PROVEN"],
  };
}
