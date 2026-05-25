import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

export type RuntimeProviderDryRunJobPlan = {
  planId: string;
  handoffId: string;
  executionAllowed: false;
  executionBlocked: true;
  intentOnly: true;
  jobCount: number;
  jobs: {
    jobId: string;
    jobType: "provider_dns_upsert" | "provider_dns_delete" | "provider_domain_attach" | "provider_unknown";
    provider: string;
    environment: string;
    status: "planned" | "simulated";
    reason: string;
  }[];
  summary: string;
  diagnostics: string[];
  createdAt: string;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function toJobType(operationKind: string): RuntimeProviderDryRunJobPlan["jobs"][number]["jobType"] {
  if (operationKind === "upsert_dns_record") return "provider_dns_upsert";
  if (operationKind === "delete_dns_record") return "provider_dns_delete";
  if (operationKind === "attach_domain") return "provider_domain_attach";
  return "provider_unknown";
}

function buildSummary(jobCount: number): string {
  if (jobCount === 0) return "No deterministic jobs could be generated.";
  return `${jobCount} simulated provider jobs generated for readiness evidence.`;
}

function resolveCreatedAt(handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null | undefined): string {
  const updatedAt = sanitizeToken(handoffArtifact?.updatedAt);
  const createdAt = sanitizeToken(handoffArtifact?.createdAt);
  return updatedAt || createdAt || new Date(0).toISOString();
}

export function createRuntimeProviderDryRunJobPlan(input: {
  handoffId: string;
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null;
}): RuntimeProviderDryRunJobPlan {
  const handoffId = sanitizeToken(input.handoffId);
  const operationKind = sanitizeToken(input.handoffArtifact?.operationKind);
  const provider = sanitizeToken(input.handoffArtifact?.providerId) || "unknown_provider";
  const environment = sanitizeToken(input.handoffArtifact?.environment) || "unknown_environment";

  const jobs = input.handoffArtifact
    ? [
        {
          jobId: createRuntimeCorrelationKey({
            dryRunJobPlanHandoffId: handoffId,
            dryRunJobPlanOperationKind: operationKind,
            dryRunJobPlanProvider: provider,
            dryRunJobPlanEnvironment: environment,
            dryRunJobPlanIndex: "0",
          }),
          jobType: toJobType(operationKind),
          provider,
          environment,
          status: "simulated" as const,
          reason: `Deterministic simulation for operationKind=${operationKind || "unknown"}; execution remains disabled.`,
        },
      ]
    : [];

  const planId = createRuntimeCorrelationKey({
    dryRunJobPlanHandoffId: handoffId,
    dryRunJobPlanJobCount: String(jobs.length),
    dryRunJobPlanKinds: jobs.map((job) => job.jobType).join(","),
  });

  return {
    planId,
    handoffId,
    executionAllowed: false,
    executionBlocked: true,
    intentOnly: true,
    jobCount: jobs.length,
    jobs,
    summary: buildSummary(jobs.length),
    diagnostics: ["PROVIDER_DRYRUN_JOB_PLAN_CREATED", "PROVIDER_DRYRUN_JOBS_GENERATED", "PROVIDER_DRYRUN_INTENT_ONLY"],
    createdAt: resolveCreatedAt(input.handoffArtifact),
  };
}
