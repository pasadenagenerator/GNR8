import fs from "node:fs";
import path from "node:path";

import type { RenderedCaptureDiagnostic } from "@/gnr8/import-rendered-capture/rendered-capture-contract";
import type { RenderedCaptureWorkerClient } from "@/gnr8/import-rendered-capture-worker/worker-client";
import {
  RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
  type RenderedCaptureWorkerArtifactRef,
  type RenderedCaptureWorkerFailureClass,
  type RenderedCaptureWorkerRequest,
  type RenderedCaptureWorkerResponse,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";

export type RenderedCaptureJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "completed_partial"
  | "failed_transient"
  | "failed_terminal"
  | "timed_out"
  | "cancelled";

export type RenderedCaptureJobFailureClass =
  | "transient"
  | "terminal"
  | "unsupported_environment"
  | "timeout"
  | "none";

export type RenderedCaptureWorkerHealthTruth = {
  enabled: boolean;
  reachable: boolean;
  browserAvailable: boolean;
  queueHealthy: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastFailureClass: RenderedCaptureWorkerFailureClass | "none";
  lastFailureCode: string | null;
};

export type RenderedCaptureJobAttemptRecord = {
  attemptNo: number;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "completed_partial" | "failed_transient" | "failed_terminal" | "timed_out";
  failureClass: RenderedCaptureWorkerFailureClass | null;
  failureCode: string | null;
  retryable: boolean | null;
};

export type RenderedCaptureJobRecord = {
  kind: "rendered_capture_job_v1";
  jobId: string;
  status: RenderedCaptureJobStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  timeoutBudgetMs: number;
  attemptCount: number;
  maxAttempts: number;
  failureClass: RenderedCaptureJobFailureClass;
  failureCode: string | null;
  resultSummary: {
    workerStatus: RenderedCaptureWorkerResponse["status"] | null;
    renderedDomArtifactAvailable: boolean;
    screenshotArtifactCount: number;
    computedStyleSampleCount: number;
  };
  correlation: {
    importId: string;
    siteId: string | null;
    snapshotId: string | null;
    sourceUrl: string;
  };
  requestPayload: RenderedCaptureWorkerRequest;
  workerDiagnostics: Array<{
    code: string;
    severity: string;
    message: string;
  }>;
  artifactRefs: Array<{
    artifactType: RenderedCaptureWorkerArtifactRef["artifactType"];
    captureType: RenderedCaptureWorkerArtifactRef["captureType"];
    storage: RenderedCaptureWorkerArtifactRef["storage"];
    uri: string | null;
    mediaType: string | null;
    sha256: string | null;
    byteLength: number | null;
  }>;
  attempts: RenderedCaptureJobAttemptRecord[];
};

export type RenderedCaptureJobRunResult = {
  job: RenderedCaptureJobRecord;
  workerResponse: RenderedCaptureWorkerResponse;
  health: RenderedCaptureWorkerHealthTruth;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function nowIso(nowFn: () => number): string {
  return new Date(nowFn()).toISOString();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

function ensureDir(absPath: string): void {
  fs.mkdirSync(absPath, { recursive: true });
}

function readJsonFile<T>(absPath: string): T | null {
  if (!fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf8")) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(absPath: string, value: unknown): void {
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, JSON.stringify(value, null, 2), "utf8");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error(`Timed out after ${timeoutMs}ms`), { name: "AbortError" }));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function toDiagnostic(input: {
  code: RenderedCaptureDiagnostic["code"];
  message: string;
  severity?: RenderedCaptureDiagnostic["severity"];
  details?: Record<string, unknown>;
}): RenderedCaptureDiagnostic {
  return {
    code: input.code,
    message: input.message,
    severity: input.severity ?? "info",
    details: input.details,
  };
}

function classifyJobStatusFromWorkerResponse(response: RenderedCaptureWorkerResponse): {
  status: RenderedCaptureJobStatus;
  failureClass: RenderedCaptureJobFailureClass;
} {
  if (response.status === "available") return { status: "completed", failureClass: "none" };
  if (response.status === "partial") return { status: "completed_partial", failureClass: "none" };

  if (response.failure?.retryable) {
    return { status: "failed_transient", failureClass: "transient" };
  }

  const failureClass = response.failure?.failureClass;
  if (response.status === "unsupported" || failureClass === "environment_unsupported") {
    return { status: "failed_terminal", failureClass: "unsupported_environment" };
  }

  return { status: "failed_terminal", failureClass: "terminal" };
}

function workerResponseFromJobState(input: {
  request: RenderedCaptureWorkerRequest;
  job: RenderedCaptureJobRecord;
  reason: "timed_out" | "failed_transient" | "failed_terminal";
  message: string;
  failureClass: RenderedCaptureWorkerFailureClass;
  failureCode: string;
}): RenderedCaptureWorkerResponse {
  const diagnostics: RenderedCaptureDiagnostic[] = [
    toDiagnostic({
      code: "CAPTURE_JOB_QUEUED",
      message: "Capture job queued",
      details: {
        jobId: input.job.jobId,
        status: input.job.status,
      },
    }),
    toDiagnostic({
      code: "CAPTURE_JOB_STARTED",
      message: "Capture job started",
      details: {
        jobId: input.job.jobId,
        attemptCount: input.job.attemptCount,
      },
    }),
  ];

  if (input.reason === "timed_out") {
    diagnostics.push(
      toDiagnostic({
        code: "CAPTURE_JOB_TIMED_OUT",
        severity: "warning",
        message: input.message,
        details: {
          jobId: input.job.jobId,
          timeoutBudgetMs: input.job.timeoutBudgetMs,
          attemptCount: input.job.attemptCount,
        },
      }),
      toDiagnostic({
        code: "RENDERED_CAPTURE_TIMEOUT",
        severity: "warning",
        message: "Rendered capture job timed out",
        details: {
          jobId: input.job.jobId,
        },
      }),
      toDiagnostic({
        code: "RENDERED_CAPTURE_UNAVAILABLE",
        severity: "warning",
        message: "Rendered capture unavailable after timeout",
        details: {
          jobId: input.job.jobId,
        },
      }),
    );
  } else if (input.reason === "failed_transient") {
    diagnostics.push(
      toDiagnostic({
        code: "CAPTURE_JOB_FAILED_TRANSIENT",
        severity: "warning",
        message: input.message,
        details: {
          jobId: input.job.jobId,
          attemptCount: input.job.attemptCount,
        },
      }),
      toDiagnostic({
        code: "RENDERED_CAPTURE_UNAVAILABLE",
        severity: "warning",
        message: "Rendered capture unavailable after transient failures",
        details: {
          jobId: input.job.jobId,
        },
      }),
    );
  } else {
    diagnostics.push(
      toDiagnostic({
        code: "CAPTURE_JOB_FAILED_TERMINAL",
        severity: "warning",
        message: input.message,
        details: {
          jobId: input.job.jobId,
          attemptCount: input.job.attemptCount,
          failureCode: input.failureCode,
        },
      }),
      toDiagnostic({
        code: "RENDERED_CAPTURE_UNAVAILABLE",
        severity: "warning",
        message: "Rendered capture unavailable due to terminal failure",
        details: {
          jobId: input.job.jobId,
        },
      }),
    );
  }

  return {
    kind: "rendered_capture_worker_response_v1",
    contractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
    requestId: input.request.requestId,
    status: input.reason === "failed_terminal" ? "unsupported" : "failed",
    environment: {
      runtimeKind: "unknown",
      environmentSupported: false,
      browserPackageAvailable: false,
      browserBinaryAvailable: false,
      supportDecision: "unknown",
    },
    artifacts: [],
    computedStyleSamples: [],
    diagnostics,
    qualitySummary: {
      renderedDomQuality: "unusable",
      domLength: 0,
      meaningfulNodeCount: 0,
      screenshotCount: 0,
      computedStyleSampleCount: 0,
    },
    failure: {
      failureClass: input.failureClass,
      failureCode: input.failureCode,
      retryable: input.reason !== "failed_terminal",
      message: input.message,
    },
    timings: {
      queueLatencyMs: null,
      executionMs: null,
      totalMs: null,
    },
  };
}

function defaultHealth(): RenderedCaptureWorkerHealthTruth {
  return {
    enabled: true,
    reachable: true,
    browserAvailable: false,
    queueHealthy: true,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastFailureClass: "none",
    lastFailureCode: null,
  };
}

export class FileBackedRenderedCaptureJobOrchestrator {
  private readonly rootDirAbs: string;

  private readonly jobsDirAbs: string;

  private readonly healthPathAbs: string;

  private readonly nowFn: () => number;

  constructor(input: { rootDirAbs: string; nowFn?: () => number }) {
    this.rootDirAbs = path.resolve(input.rootDirAbs);
    this.jobsDirAbs = path.resolve(this.rootDirAbs, "jobs");
    this.healthPathAbs = path.resolve(this.rootDirAbs, "worker-health.json");
    this.nowFn = input.nowFn ?? Date.now;
    ensureDir(this.jobsDirAbs);
  }

  getJobPath(jobId: string): string {
    return path.resolve(this.jobsDirAbs, `${jobId}.json`);
  }

  getHealthPath(): string {
    return this.healthPathAbs;
  }

  readHealth(): RenderedCaptureWorkerHealthTruth {
    return readJsonFile<RenderedCaptureWorkerHealthTruth>(this.healthPathAbs) ?? defaultHealth();
  }

  private writeHealth(health: RenderedCaptureWorkerHealthTruth): void {
    writeJsonFile(this.healthPathAbs, health);
  }

  submitJob(input: {
    jobId: string;
    request: RenderedCaptureWorkerRequest;
    timeoutBudgetMs: number;
    maxAttempts: number;
    correlation: {
      importId: string;
      siteId: string | null;
      snapshotId: string | null;
      sourceUrl: string;
    };
  }): RenderedCaptureJobRecord {
    const createdAt = nowIso(this.nowFn);
    const job: RenderedCaptureJobRecord = {
      kind: "rendered_capture_job_v1",
      jobId: normalizeText(input.jobId),
      status: "queued",
      createdAt,
      updatedAt: createdAt,
      startedAt: null,
      completedAt: null,
      timeoutBudgetMs: Math.max(1_000, Math.floor(input.timeoutBudgetMs)),
      attemptCount: 0,
      maxAttempts: Math.max(1, Math.floor(input.maxAttempts)),
      failureClass: "none",
      failureCode: null,
      resultSummary: {
        workerStatus: null,
        renderedDomArtifactAvailable: false,
        screenshotArtifactCount: 0,
        computedStyleSampleCount: 0,
      },
      correlation: input.correlation,
      requestPayload: input.request,
      workerDiagnostics: [],
      artifactRefs: [],
      attempts: [],
    };
    writeJsonFile(this.getJobPath(job.jobId), job);
    return job;
  }

  readJob(jobId: string): RenderedCaptureJobRecord | null {
    return readJsonFile<RenderedCaptureJobRecord>(this.getJobPath(jobId));
  }

  private writeJob(job: RenderedCaptureJobRecord): void {
    job.updatedAt = nowIso(this.nowFn);
    writeJsonFile(this.getJobPath(job.jobId), job);
  }

  async runJob(input: {
    jobId: string;
    workerClient: RenderedCaptureWorkerClient;
    waitBudgetMs: number;
    workerEnabled?: boolean;
  }): Promise<RenderedCaptureJobRunResult> {
    const job = this.readJob(input.jobId);
    if (!job) {
      throw new Error(`Capture job not found: ${input.jobId}`);
    }

    const runStartedAt = this.nowFn();
    let lastTransientFailureCode: string | null = null;

    job.status = "running";
    job.startedAt = job.startedAt ?? nowIso(this.nowFn);
    this.writeJob(job);

    for (let attemptNo = 1; attemptNo <= job.maxAttempts; attemptNo++) {
      const elapsed = this.nowFn() - runStartedAt;
      if (elapsed >= input.waitBudgetMs) {
        job.status = "timed_out";
        job.failureClass = "timeout";
        job.failureCode = "CAPTURE_JOB_TIMED_OUT";
        job.completedAt = nowIso(this.nowFn);
        this.writeJob(job);

        const health = {
          ...this.readHealth(),
          enabled: typeof input.workerEnabled === "boolean" ? input.workerEnabled : this.readHealth().enabled,
          reachable: false,
          queueHealthy: true,
          lastFailureAt: nowIso(this.nowFn),
          lastFailureClass: "timed_out" as const,
          lastFailureCode: "CAPTURE_JOB_TIMED_OUT",
        };
        this.writeHealth(health);

        return {
          job,
          workerResponse: workerResponseFromJobState({
            request: job.requestPayload,
            job,
            reason: "timed_out",
            message: "Capture job exceeded bounded wait budget and timed out",
            failureClass: "timed_out",
            failureCode: "CAPTURE_JOB_TIMED_OUT",
          }),
          health,
        };
      }

      const attemptStartedAt = nowIso(this.nowFn);
      const remainingBudgetMs = Math.max(1_000, Math.floor(Math.min(job.timeoutBudgetMs, input.waitBudgetMs - elapsed)));
      const attempt: RenderedCaptureJobAttemptRecord = {
        attemptNo,
        startedAt: attemptStartedAt,
        completedAt: null,
        status: "running",
        failureClass: null,
        failureCode: null,
        retryable: null,
      };
      job.attemptCount = attemptNo;
      job.attempts.push(attempt);
      this.writeJob(job);

      let response: RenderedCaptureWorkerResponse;
      try {
        response = await withTimeout(input.workerClient.execute(job.requestPayload), remainingBudgetMs);
      } catch (error) {
        const timedOut = normalizeText((error as { name?: unknown })?.name) === "AbortError";
        attempt.completedAt = nowIso(this.nowFn);
        if (timedOut) {
          attempt.status = "timed_out";
          attempt.failureClass = "timed_out";
          attempt.failureCode = "CAPTURE_JOB_TIMED_OUT";
          attempt.retryable = attemptNo < job.maxAttempts;
          job.failureCode = "CAPTURE_JOB_TIMED_OUT";
          lastTransientFailureCode = "CAPTURE_JOB_TIMED_OUT";
        } else {
          attempt.status = "failed_transient";
          attempt.failureClass = "internal_error";
          attempt.failureCode = "CAPTURE_JOB_WORKER_EXECUTE_THROW";
          attempt.retryable = attemptNo < job.maxAttempts;
          job.failureCode = "CAPTURE_JOB_WORKER_EXECUTE_THROW";
          lastTransientFailureCode = "CAPTURE_JOB_WORKER_EXECUTE_THROW";
        }

        if (attemptNo < job.maxAttempts) {
          job.status = "failed_transient";
          job.failureClass = "transient";
          job.workerDiagnostics.push({
            code: "CAPTURE_JOB_RETRIED",
            severity: "warning",
            message: `Capture job retry scheduled after attempt ${attemptNo}`,
          });
          this.writeJob(job);
          continue;
        }

        if (timedOut) {
          job.status = "timed_out";
          job.failureClass = "timeout";
          job.completedAt = nowIso(this.nowFn);
          this.writeJob(job);

          const health = {
            ...this.readHealth(),
            enabled: typeof input.workerEnabled === "boolean" ? input.workerEnabled : this.readHealth().enabled,
            reachable: false,
            queueHealthy: true,
            lastFailureAt: nowIso(this.nowFn),
            lastFailureClass: "timed_out" as const,
            lastFailureCode: "CAPTURE_JOB_TIMED_OUT",
          };
          this.writeHealth(health);

          return {
            job,
            workerResponse: workerResponseFromJobState({
              request: job.requestPayload,
              job,
              reason: "timed_out",
              message: "Capture job attempt timed out",
              failureClass: "timed_out",
              failureCode: "CAPTURE_JOB_TIMED_OUT",
            }),
            health,
          };
        }

        job.status = "failed_transient";
        job.failureClass = "transient";
        job.completedAt = nowIso(this.nowFn);
        this.writeJob(job);

        const health = {
          ...this.readHealth(),
          enabled: typeof input.workerEnabled === "boolean" ? input.workerEnabled : this.readHealth().enabled,
          reachable: false,
          queueHealthy: true,
          lastFailureAt: nowIso(this.nowFn),
          lastFailureClass: "internal_error" as const,
          lastFailureCode: "CAPTURE_JOB_WORKER_EXECUTE_THROW",
        };
        this.writeHealth(health);

        return {
          job,
          workerResponse: workerResponseFromJobState({
            request: job.requestPayload,
            job,
            reason: "failed_transient",
            message: `Capture job failed after retries: ${toErrorString(error)}`,
            failureClass: "internal_error",
            failureCode: "CAPTURE_JOB_WORKER_EXECUTE_THROW",
          }),
          health,
        };
      }

      const classified = classifyJobStatusFromWorkerResponse(response);
      attempt.completedAt = nowIso(this.nowFn);
      attempt.failureClass = response.failure?.failureClass ?? null;
      attempt.failureCode = response.failure?.failureCode ?? null;
      attempt.retryable = response.failure?.retryable ?? null;

      if (classified.status === "completed" || classified.status === "completed_partial") {
        attempt.status = classified.status;
        job.status = classified.status;
        job.failureClass = "none";
        job.failureCode = null;
        job.completedAt = nowIso(this.nowFn);
        job.resultSummary = {
          workerStatus: response.status,
          renderedDomArtifactAvailable: response.artifacts.some((artifact) => artifact.artifactType === "rendered_dom_html"),
          screenshotArtifactCount: response.artifacts.filter((artifact) => artifact.artifactType === "screenshot_png").length,
          computedStyleSampleCount: Array.isArray(response.computedStyleSamples) ? response.computedStyleSamples.length : 0,
        };
        job.artifactRefs = response.artifacts.map((artifact) => ({
          artifactType: artifact.artifactType,
          captureType: artifact.captureType,
          storage: artifact.storage,
          uri: artifact.uri,
          mediaType: artifact.mediaType,
          sha256: artifact.sha256,
          byteLength: artifact.byteLength,
        }));
        job.workerDiagnostics = (Array.isArray(response.diagnostics) ? response.diagnostics : []).map((diag) => ({
          code: normalizeText(diag.code),
          severity: normalizeText(diag.severity),
          message: normalizeText(diag.message),
        }));
        this.writeJob(job);

        const health = {
          ...this.readHealth(),
          enabled: typeof input.workerEnabled === "boolean" ? input.workerEnabled : this.readHealth().enabled,
          reachable: true,
          browserAvailable: Boolean(response.environment.browserPackageAvailable && response.environment.browserBinaryAvailable),
          queueHealthy: true,
          lastSuccessAt: nowIso(this.nowFn),
          lastFailureAt: null,
          lastFailureClass: "none" as const,
          lastFailureCode: null,
        };
        this.writeHealth(health);

        return {
          job,
          workerResponse: {
            ...response,
            diagnostics: [
              toDiagnostic({
                code: "CAPTURE_JOB_QUEUED",
                message: "Capture job queued",
                details: { jobId: job.jobId },
              }),
              toDiagnostic({
                code: "CAPTURE_JOB_STARTED",
                message: "Capture job started",
                details: { jobId: job.jobId, attemptNo },
              }),
              ...(attemptNo > 1
                ? [
                    toDiagnostic({
                      code: "CAPTURE_JOB_RETRIED",
                      message: "Capture job retried after transient failure",
                      details: { jobId: job.jobId, attemptNo, attemptCount: job.attemptCount },
                    }),
                  ]
                : []),
              toDiagnostic({
                code: classified.status === "completed" ? "CAPTURE_JOB_COMPLETED" : "CAPTURE_JOB_COMPLETED_PARTIAL",
                message: classified.status === "completed" ? "Capture job completed" : "Capture job completed partially",
                details: {
                  jobId: job.jobId,
                  attemptNo,
                  attemptCount: job.attemptCount,
                },
              }),
              ...(response.diagnostics ?? []),
            ],
          },
          health,
        };
      }

      if (classified.status === "failed_transient") {
        attempt.status = "failed_transient";
        lastTransientFailureCode = response.failure?.failureCode ?? "CAPTURE_JOB_FAILED_TRANSIENT";
        if (attemptNo < job.maxAttempts) {
          job.status = "failed_transient";
          job.failureClass = "transient";
          job.failureCode = lastTransientFailureCode;
          job.workerDiagnostics.push({
            code: "CAPTURE_JOB_RETRIED",
            severity: "warning",
            message: `Capture job retry scheduled after transient failure on attempt ${attemptNo}`,
          });
          this.writeJob(job);
          continue;
        }

        job.status = "failed_transient";
        job.failureClass = "transient";
        job.failureCode = lastTransientFailureCode;
        job.completedAt = nowIso(this.nowFn);
        this.writeJob(job);

        const health = {
          ...this.readHealth(),
          enabled: typeof input.workerEnabled === "boolean" ? input.workerEnabled : this.readHealth().enabled,
          reachable: false,
          browserAvailable: Boolean(response.environment.browserPackageAvailable && response.environment.browserBinaryAvailable),
          queueHealthy: true,
          lastFailureAt: nowIso(this.nowFn),
          lastFailureClass: response.failure?.failureClass ?? "internal_error",
          lastFailureCode: response.failure?.failureCode ?? "CAPTURE_JOB_FAILED_TRANSIENT",
        };
        this.writeHealth(health);

        return {
          job,
          workerResponse: {
            ...response,
            diagnostics: [
              toDiagnostic({
                code: "CAPTURE_JOB_QUEUED",
                message: "Capture job queued",
                details: { jobId: job.jobId },
              }),
              toDiagnostic({
                code: "CAPTURE_JOB_STARTED",
                message: "Capture job started",
                details: { jobId: job.jobId, attemptNo },
              }),
              ...(attemptNo > 1
                ? [
                    toDiagnostic({
                      code: "CAPTURE_JOB_RETRIED",
                      message: "Capture job retried after transient failure",
                      details: { jobId: job.jobId, attemptNo, attemptCount: job.attemptCount },
                    }),
                  ]
                : []),
              toDiagnostic({
                code: "CAPTURE_JOB_FAILED_TRANSIENT",
                severity: "warning",
                message: "Capture job failed with transient error",
                details: {
                  jobId: job.jobId,
                  attemptNo,
                  failureCode: response.failure?.failureCode ?? null,
                },
              }),
              ...(response.diagnostics ?? []),
            ],
          },
          health,
        };
      }

      attempt.status = "failed_terminal";
      job.status = "failed_terminal";
      job.failureClass = classified.failureClass;
      job.failureCode = response.failure?.failureCode ?? "CAPTURE_JOB_FAILED_TERMINAL";
      job.completedAt = nowIso(this.nowFn);
      this.writeJob(job);

      const health = {
        ...this.readHealth(),
        enabled: typeof input.workerEnabled === "boolean" ? input.workerEnabled : this.readHealth().enabled,
        reachable: response.status !== "unsupported",
        browserAvailable: Boolean(response.environment.browserPackageAvailable && response.environment.browserBinaryAvailable),
        queueHealthy: true,
        lastFailureAt: nowIso(this.nowFn),
        lastFailureClass: response.failure?.failureClass ?? "environment_unsupported",
        lastFailureCode: response.failure?.failureCode ?? "CAPTURE_JOB_FAILED_TERMINAL",
      };
      this.writeHealth(health);

      return {
        job,
        workerResponse: {
          ...response,
          diagnostics: [
            toDiagnostic({
              code: "CAPTURE_JOB_QUEUED",
              message: "Capture job queued",
              details: { jobId: job.jobId },
            }),
            toDiagnostic({
              code: "CAPTURE_JOB_STARTED",
              message: "Capture job started",
              details: { jobId: job.jobId, attemptNo },
            }),
            ...(attemptNo > 1
              ? [
                  toDiagnostic({
                    code: "CAPTURE_JOB_RETRIED",
                    message: "Capture job retried after transient failure",
                    details: { jobId: job.jobId, attemptNo, attemptCount: job.attemptCount },
                  }),
                ]
              : []),
            toDiagnostic({
              code: "CAPTURE_JOB_FAILED_TERMINAL",
              severity: "warning",
              message: "Capture job failed terminally",
              details: {
                jobId: job.jobId,
                attemptNo,
                failureCode: response.failure?.failureCode ?? null,
                failureClass: response.failure?.failureClass ?? null,
              },
            }),
            ...(response.diagnostics ?? []),
          ],
        },
        health,
      };
    }

    job.status = "failed_transient";
    job.failureClass = "transient";
    job.failureCode = lastTransientFailureCode ?? "CAPTURE_JOB_FAILED_TRANSIENT";
    job.completedAt = nowIso(this.nowFn);
    this.writeJob(job);

    const health = {
      ...this.readHealth(),
      enabled: typeof input.workerEnabled === "boolean" ? input.workerEnabled : this.readHealth().enabled,
      reachable: false,
      queueHealthy: true,
      lastFailureAt: nowIso(this.nowFn),
      lastFailureClass: "internal_error" as const,
      lastFailureCode: lastTransientFailureCode ?? "CAPTURE_JOB_FAILED_TRANSIENT",
    };
    this.writeHealth(health);

    return {
      job,
      workerResponse: workerResponseFromJobState({
        request: job.requestPayload,
        job,
        reason: "failed_transient",
        message: "Capture job failed after bounded transient retries",
        failureClass: "internal_error",
        failureCode: lastTransientFailureCode ?? "CAPTURE_JOB_FAILED_TRANSIENT",
      }),
      health,
    };
  }
}
