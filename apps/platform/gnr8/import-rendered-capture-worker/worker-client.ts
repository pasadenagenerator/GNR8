import type {
  RenderedCaptureWorkerRequest,
  RenderedCaptureWorkerResponse,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";
import { RENDERED_CAPTURE_WORKER_CONTRACT_VERSION } from "@/gnr8/import-rendered-capture-worker/worker-contract";

export type RenderedCaptureWorkerClient = {
  execute(request: RenderedCaptureWorkerRequest): Promise<RenderedCaptureWorkerResponse>;
};

export function createUnavailableRenderedCaptureWorkerClient(input?: {
  reason?:
    | "worker_not_configured"
    | "worker_unreachable"
    | "worker_timeout"
    | "worker_disabled";
}): RenderedCaptureWorkerClient {
  const reason = input?.reason ?? "worker_not_configured";

  return {
    async execute(request: RenderedCaptureWorkerRequest): Promise<RenderedCaptureWorkerResponse> {
      return {
        kind: "rendered_capture_worker_response_v1",
        contractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
        requestId: request.requestId,
        status: "unsupported",
        environment: {
          runtimeKind: "unknown",
          environmentSupported: false,
          browserPackageAvailable: false,
          browserBinaryAvailable: false,
          supportDecision: "unknown",
        },
        artifacts: [],
        computedStyleSamples: [],
        diagnostics: [
          {
            code: "RENDERED_CAPTURE_UNAVAILABLE",
            severity: "warning",
            message: "Rendered capture worker unavailable; importer should use fallback path",
            details: { reason },
          },
        ],
        qualitySummary: {
          renderedDomQuality: "unusable",
          domLength: 0,
          meaningfulNodeCount: 0,
          screenshotCount: 0,
          computedStyleSampleCount: 0,
        },
        failure: {
          failureClass: "environment_unsupported",
          failureCode: "WORKER_UNAVAILABLE",
          retryable: reason === "worker_unreachable" || reason === "worker_timeout",
          message: "Rendered capture worker unavailable",
        },
        timings: {
          queueLatencyMs: null,
          executionMs: null,
          totalMs: null,
        },
      };
    },
  };
}

