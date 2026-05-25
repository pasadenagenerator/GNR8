import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";

export type RuntimeProviderWorkerEnvelopePreview = {
  previewId: string;
  executionAllowed: false;
  executionBlocked: true;
  intentOnly: true;
  handoffId: string;
  correlationKey: string;
  summary: string;
  envelope: {
    queueTarget: string;
    workerTarget: string;
    payload: {
      payloadVersion: "v1";
      handoffId: string;
      providerId: string;
      operationKind: string;
      environment: string;
      siteId: string;
      siteVersionId: string;
      correlationKey: string;
      executionIntent: "control_plane_simulation_only";
      executionBlocked: true;
      executionAllowed: false;
    };
    diagnostics: string[];
  };
  diagnostics: string[];
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

export function createRuntimeProviderWorkerEnvelopePreview(input: {
  handoffId: string;
  handoffArtifact: RuntimeProviderExecutionHandoffArtifactRecord | null;
}): RuntimeProviderWorkerEnvelopePreview {
  const handoffId = sanitizeToken(input.handoffId) || "missing_handoff_id";
  const artifactCorrelationKey = sanitizeToken(input.handoffArtifact?.correlationKey);
  const correlationKey = artifactCorrelationKey || createRuntimeCorrelationKey({ workerEnvelopePreviewHandoffId: handoffId });
  const providerId = sanitizeToken(input.handoffArtifact?.providerId) || "unknown_provider";
  const operationKind = sanitizeToken(input.handoffArtifact?.operationKind) || "unknown_operation_kind";
  const environment = sanitizeToken(input.handoffArtifact?.environment) || "unknown_environment";
  const siteId = sanitizeToken(input.handoffArtifact?.siteId) || "unknown_site";
  const siteVersionId = sanitizeToken(input.handoffArtifact?.siteVersionId) || "unknown_site_version";
  const previewId = createRuntimeCorrelationKey({
    workerEnvelopePreviewHandoffId: handoffId,
    workerEnvelopePreviewCorrelationKey: correlationKey,
  });

  return {
    previewId,
    executionAllowed: false,
    executionBlocked: true,
    intentOnly: true,
    handoffId,
    correlationKey,
    summary: "Deterministic provider worker envelope preview generated; execution remains disabled.",
    envelope: {
      queueTarget: "provider-control-plane",
      workerTarget: "provider-execution-worker",
      payload: {
        payloadVersion: "v1",
        handoffId,
        providerId,
        operationKind,
        environment,
        siteId,
        siteVersionId,
        correlationKey,
        executionIntent: "control_plane_simulation_only",
        executionBlocked: true,
        executionAllowed: false,
      },
      diagnostics: ["PROVIDER_WORKER_ENVELOPE_PREVIEW_CREATED"],
    },
    diagnostics: ["PROVIDER_WORKER_ENVELOPE_PREVIEW_INTENT_ONLY"],
  };
}
