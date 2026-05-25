import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

export type RuntimeProviderExecutionJobPreview = {
  previewId: string;
  executionAllowed: false;
  executionBlocked: true;
  intentOnly: true;
  handoffId: string;
  correlationKey: string;
  summary: string;
  jobs: {
    jobId: string;
    jobType: string;
    provider: string;
    environment: string;
    simulatedStatus: "preview_only";
    queueTarget: string;
    workerTarget: string;
    payloadShape: {
      providerId: string;
      operationKind: string;
      siteId: string;
      siteVersionId: string;
      correlationKey: string;
    };
    diagnostics: string[];
  }[];
  diagnostics: string[];
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function toJobType(operationKind: string): string {
  if (operationKind === "upsert_dns_record") return "provider_dns_upsert";
  if (operationKind === "delete_dns_record") return "provider_dns_delete";
  if (operationKind === "attach_domain") return "provider_domain_attach";
  return "provider_unknown";
}

function buildSummary(jobCount: number): string {
  if (jobCount === 0) return "No deterministic execution jobs could be previewed.";
  return `${jobCount} execution job preview artifact(s) generated; execution remains disabled.`;
}

export function createRuntimeProviderExecutionJobPreview(input: {
  handoffId: string;
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null;
}): RuntimeProviderExecutionJobPreview {
  const handoffId = sanitizeToken(input.handoffId) || "missing_handoff_id";
  const artifactCorrelationKey = sanitizeToken(input.handoffArtifact?.correlationKey);
  const correlationKey = artifactCorrelationKey || createRuntimeCorrelationKey({ executionJobPreviewHandoffId: handoffId });
  const operationKind = sanitizeToken(input.handoffArtifact?.operationKind);
  const provider = sanitizeToken(input.handoffArtifact?.providerId) || "unknown_provider";
  const environment = sanitizeToken(input.handoffArtifact?.environment) || "unknown_environment";
  const jobType = toJobType(operationKind);

  const jobs = input.handoffArtifact
    ? [
        {
          jobId: createRuntimeCorrelationKey({
            executionJobPreviewHandoffId: handoffId,
            executionJobPreviewJobType: jobType,
            executionJobPreviewCorrelationKey: correlationKey,
          }),
          jobType,
          provider,
          environment,
          simulatedStatus: "preview_only" as const,
          queueTarget: "provider-control-plane",
          workerTarget: "provider-execution-worker",
          payloadShape: {
            providerId: provider,
            operationKind: operationKind || "unknown_operation_kind",
            siteId: sanitizeToken(input.handoffArtifact.siteId) || "unknown_site",
            siteVersionId: sanitizeToken(input.handoffArtifact.siteVersionId) || "unknown_site_version",
            correlationKey,
          },
          diagnostics: ["EXECUTION_JOB_PREVIEW_JOB_CREATED", "EXECUTION_JOB_PREVIEW_INTENT_ONLY"],
        },
      ]
    : [];

  const previewId = createRuntimeCorrelationKey({
    executionJobPreviewHandoffId: handoffId,
    executionJobPreviewCorrelationKey: correlationKey,
    executionJobPreviewJobCount: String(jobs.length),
  });

  return {
    previewId,
    executionAllowed: false,
    executionBlocked: true,
    intentOnly: true,
    handoffId,
    correlationKey,
    summary: buildSummary(jobs.length),
    jobs,
    diagnostics: ["EXECUTION_JOB_PREVIEW_CREATED", "EXECUTION_JOB_PREVIEW_INTENT_ONLY"],
  };
}
