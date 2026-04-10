import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  FileBackedRenderedCaptureJobOrchestrator,
  type RenderedCaptureWorkerHealthTruth,
} from "@/gnr8/import-rendered-capture-worker/capture-job-orchestrator";
import type { RenderedCaptureWorkerClient } from "@/gnr8/import-rendered-capture-worker/worker-client";
import { createRenderedCaptureWorkerRequest } from "@/gnr8/import-rendered-capture-worker/worker-contract";

function makeRequest(requestId: string) {
  return createRenderedCaptureWorkerRequest({
    requestId,
    importId: "import-1",
    sourceUrl: "https://example.com/",
    viewport: { width: 1366, height: 768 },
    readinessPolicy: {
      navigationTimeoutMs: 20_000,
      networkQuietTimeoutMs: 4_000,
      domStabilizationWindowMs: 2_500,
      domStabilizationPollMs: 250,
      maxTotalCaptureMs: 30_000,
    },
    timeoutBudgetMs: 30_000,
  });
}

function availableWorkerClient(): RenderedCaptureWorkerClient {
  return {
    async execute(request) {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "available",
        environment: {
          runtimeKind: "nodejs",
          environmentSupported: true,
          browserPackageAvailable: true,
          browserBinaryAvailable: true,
          supportDecision: "supported",
        },
        artifacts: [
          {
            artifactType: "rendered_dom_html",
            captureType: null,
            storage: "inline",
            uri: "data:text/html;base64,PGh0bWw+PC9odG1sPg==",
            mediaType: "text/html",
            sha256: "abc",
            byteLength: 13,
          },
        ],
        computedStyleSamples: [],
        diagnostics: [],
        qualitySummary: {
          renderedDomQuality: "strong",
          domLength: 13,
          meaningfulNodeCount: 1,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: null,
        timings: {
          queueLatencyMs: null,
          executionMs: 30,
          totalMs: 30,
        },
      };
    },
  };
}

test("capture job lifecycle: queued -> running -> completed", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-capture-job-"));
  const orchestrator = new FileBackedRenderedCaptureJobOrchestrator({
    rootDirAbs: tmpDir,
  });

  const job = orchestrator.submitJob({
    jobId: "job-1",
    request: makeRequest("req-1"),
    timeoutBudgetMs: 10_000,
    maxAttempts: 2,
    correlation: {
      importId: "import-1",
      siteId: "site-1",
      snapshotId: "snapshot-1",
      sourceUrl: "https://example.com/",
    },
  });

  assert.equal(job.status, "queued");

  const result = await orchestrator.runJob({
    jobId: "job-1",
    workerClient: availableWorkerClient(),
    waitBudgetMs: 10_000,
  });

  assert.equal(result.job.status, "completed");
  assert.equal(result.job.attemptCount, 1);
  assert.equal(result.workerResponse.status, "available");
  assert.equal(result.health.reachable, true);
  assert.equal(result.health.queueHealthy, true);
});

test("capture job retries once for transient failure and then completes", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-capture-job-"));
  const orchestrator = new FileBackedRenderedCaptureJobOrchestrator({
    rootDirAbs: tmpDir,
  });

  orchestrator.submitJob({
    jobId: "job-transient",
    request: makeRequest("req-transient"),
    timeoutBudgetMs: 10_000,
    maxAttempts: 2,
    correlation: {
      importId: "import-1",
      siteId: "site-1",
      snapshotId: "snapshot-1",
      sourceUrl: "https://example.com/",
    },
  });

  let callCount = 0;
  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      callCount += 1;
      if (callCount === 1) {
        return {
          kind: "rendered_capture_worker_response_v1",
          contractVersion: "1.0.0",
          requestId: request.requestId,
          status: "failed",
          environment: {
            runtimeKind: "nodejs",
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            supportDecision: "supported",
          },
          artifacts: [],
          computedStyleSamples: [],
          diagnostics: [],
          qualitySummary: {
            renderedDomQuality: "unusable",
            domLength: 0,
            meaningfulNodeCount: 0,
            screenshotCount: 0,
            computedStyleSampleCount: 0,
          },
          failure: {
            failureClass: "navigation_failed",
            failureCode: "NAVIGATION_FAILED",
            retryable: true,
            message: "transient nav",
          },
          timings: {
            queueLatencyMs: null,
            executionMs: 10,
            totalMs: 10,
          },
        };
      }
      return availableWorkerClient().execute(request);
    },
  };

  const result = await orchestrator.runJob({
    jobId: "job-transient",
    workerClient,
    waitBudgetMs: 10_000,
  });

  assert.equal(callCount, 2);
  assert.equal(result.job.status, "completed");
  assert.equal(result.job.attemptCount, 2);
  assert.ok(result.workerResponse.diagnostics.some((entry) => entry.code === "CAPTURE_JOB_COMPLETED"));
});

test("capture job classifies timeout deterministically", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-capture-job-"));
  const orchestrator = new FileBackedRenderedCaptureJobOrchestrator({
    rootDirAbs: tmpDir,
  });

  orchestrator.submitJob({
    jobId: "job-timeout",
    request: makeRequest("req-timeout"),
    timeoutBudgetMs: 5_000,
    maxAttempts: 1,
    correlation: {
      importId: "import-1",
      siteId: "site-1",
      snapshotId: "snapshot-1",
      sourceUrl: "https://example.com/",
    },
  });

  const workerClient: RenderedCaptureWorkerClient = {
    async execute() {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      return availableWorkerClient().execute(makeRequest("unused"));
    },
  };

  const result = await orchestrator.runJob({
    jobId: "job-timeout",
    workerClient,
    waitBudgetMs: 1000,
  });

  assert.equal(result.job.status, "timed_out");
  assert.equal(result.job.failureClass, "timeout");
  assert.equal(result.workerResponse.failure?.failureClass, "timed_out");
  assert.ok(result.workerResponse.diagnostics.some((entry) => entry.code === "CAPTURE_JOB_TIMED_OUT"));
});

test("capture job classifies unsupported environment as terminal", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "gnr8-capture-job-"));
  const orchestrator = new FileBackedRenderedCaptureJobOrchestrator({
    rootDirAbs: tmpDir,
  });

  orchestrator.submitJob({
    jobId: "job-terminal",
    request: makeRequest("req-terminal"),
    timeoutBudgetMs: 10_000,
    maxAttempts: 2,
    correlation: {
      importId: "import-1",
      siteId: "site-1",
      snapshotId: "snapshot-1",
      sourceUrl: "https://example.com/",
    },
  });

  const workerClient: RenderedCaptureWorkerClient = {
    async execute(request) {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: "1.0.0",
        requestId: request.requestId,
        status: "unsupported",
        environment: {
          runtimeKind: "edge",
          environmentSupported: false,
          browserPackageAvailable: false,
          browserBinaryAvailable: false,
          supportDecision: "runtime_incompatible",
        },
        artifacts: [],
        computedStyleSamples: [],
        diagnostics: [],
        qualitySummary: {
          renderedDomQuality: "unusable",
          domLength: 0,
          meaningfulNodeCount: 0,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "environment_unsupported",
          failureCode: "ENVIRONMENT_UNSUPPORTED",
          retryable: false,
          message: "unsupported",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: 10,
          totalMs: 10,
        },
      };
    },
  };

  const result = await orchestrator.runJob({
    jobId: "job-terminal",
    workerClient,
    waitBudgetMs: 10_000,
  });

  assert.equal(result.job.status, "failed_terminal");
  assert.equal(result.job.failureClass, "unsupported_environment");
  assert.ok(result.workerResponse.diagnostics.some((entry) => entry.code === "CAPTURE_JOB_FAILED_TERMINAL"));

  const health = JSON.parse(fs.readFileSync(orchestrator.getHealthPath(), "utf8")) as RenderedCaptureWorkerHealthTruth;
  assert.equal(health.queueHealthy, true);
  assert.equal(health.browserAvailable, false);
  assert.equal(health.lastFailureCode, "ENVIRONMENT_UNSUPPORTED");
});
