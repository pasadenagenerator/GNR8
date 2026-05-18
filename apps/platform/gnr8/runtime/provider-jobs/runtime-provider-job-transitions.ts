import type { RuntimeProviderJob, RuntimeProviderJobStatus } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";

const VALID_STATUS_TRANSITIONS = new Set<string>([
  "queued->running",
  "running->completed",
  "running->failed",
  "queued->blocked",
]);

export type RuntimeProviderJobTransitionReport = {
  status: "applied" | "rejected";
  previousStatus: RuntimeProviderJobStatus;
  requestedStatus: RuntimeProviderJobStatus;
  warnings: string[];
  blockers: string[];
  correlationKey: string;
};

export function canTransitionRuntimeProviderJobStatus(
  previousStatus: RuntimeProviderJobStatus,
  requestedStatus: RuntimeProviderJobStatus,
): boolean {
  return VALID_STATUS_TRANSITIONS.has(`${previousStatus}->${requestedStatus}`);
}

export function createRuntimeProviderJobTransitionReport(input: {
  job: RuntimeProviderJob;
  requestedStatus: RuntimeProviderJobStatus;
  status: "applied" | "rejected";
}): RuntimeProviderJobTransitionReport {
  const transition = `${input.job.status}->${input.requestedStatus}`;
  const rejected = input.status === "rejected";
  return {
    status: input.status,
    previousStatus: input.job.status,
    requestedStatus: input.requestedStatus,
    warnings: rejected ? [`invalid_status_transition:${transition}`] : [],
    blockers: rejected ? [`status_transition_not_allowed:${transition}`] : [],
    correlationKey: input.job.correlationKey,
  };
}

export function applyRuntimeProviderJobStatusTransition(input: {
  job: RuntimeProviderJob;
  requestedStatus: RuntimeProviderJobStatus;
  updatedAt: string;
}): { job: RuntimeProviderJob; report: RuntimeProviderJobTransitionReport } {
  const allowed = canTransitionRuntimeProviderJobStatus(input.job.status, input.requestedStatus);
  if (!allowed) {
    return {
      job: input.job,
      report: createRuntimeProviderJobTransitionReport({
        job: input.job,
        requestedStatus: input.requestedStatus,
        status: "rejected",
      }),
    };
  }

  return {
    job: {
      ...input.job,
      status: input.requestedStatus,
      updatedAt: input.updatedAt,
    },
    report: createRuntimeProviderJobTransitionReport({
      job: input.job,
      requestedStatus: input.requestedStatus,
      status: "applied",
    }),
  };
}
