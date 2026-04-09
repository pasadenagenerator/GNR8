import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type {
  RenderedCaptureDiagnostic,
  RenderedCaptureResult,
} from "@/gnr8/import-rendered-capture/rendered-capture-contract";
import type {
  RenderedCaptureWorkerArtifactRef,
  RenderedCaptureWorkerResponse,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";

function sha256Hex(value: string | Uint8Array): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseDataUri(uri: string): { mediaType: string; bytes: Buffer } | null {
  const match = uri.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (!match) return null;
  const mediaType = normalizeText(match[1]) || "application/octet-stream";
  const base64 = normalizeText(match[2]);
  if (!base64) return null;
  try {
    return {
      mediaType,
      bytes: Buffer.from(base64, "base64"),
    };
  } catch {
    return null;
  }
}

function decodeInlineArtifactBytes(artifact: RenderedCaptureWorkerArtifactRef): Buffer | null {
  const uri = normalizeText(artifact.uri);
  if (!uri) return null;
  if (artifact.storage === "inline") {
    const parsed = parseDataUri(uri);
    return parsed?.bytes ?? null;
  }
  return null;
}

function makeAdapterDiagnostic(input: {
  code: RenderedCaptureDiagnostic["code"];
  message: string;
  severity?: RenderedCaptureDiagnostic["severity"];
  details?: Record<string, unknown>;
}): RenderedCaptureDiagnostic {
  return {
    code: input.code,
    message: input.message,
    severity: input.severity ?? "warning",
    details: input.details,
  };
}

export function mapWorkerResponseToRenderedCaptureResult(input: {
  response: RenderedCaptureWorkerResponse;
  snapshotRootDirAbs: string;
  sourceUrl: string;
}): RenderedCaptureResult {
  const workerDirAbs = path.resolve(input.snapshotRootDirAbs, "rendered-capture-worker");
  const screenshotDirAbs = path.resolve(workerDirAbs, "screenshots");
  fs.mkdirSync(screenshotDirAbs, { recursive: true });

  const diagnostics: RenderedCaptureDiagnostic[] = [...input.response.diagnostics];
  const artifacts = [...input.response.artifacts];

  const domArtifact = artifacts.find((artifact) => artifact.artifactType === "rendered_dom_html");
  const styleArtifact = artifacts.find((artifact) => artifact.artifactType === "computed_style_samples_json");
  const viewportArtifact = artifacts.find(
    (artifact) => artifact.artifactType === "screenshot_png" && artifact.captureType === "desktop_viewport",
  );
  const fullpageArtifact = artifacts.find(
    (artifact) => artifact.artifactType === "screenshot_png" && artifact.captureType === "desktop_fullpage",
  );

  const documents: RenderedCaptureResult["documents"] = [];
  if (domArtifact) {
    const bytes = decodeInlineArtifactBytes(domArtifact);
    if (!bytes) {
      diagnostics.push(
        makeAdapterDiagnostic({
          code: "CAPTURE_WORKER_RESPONSE_INVALID",
          message: "Rendered capture worker DOM artifact could not be decoded",
          details: { artifactType: domArtifact.artifactType, storage: domArtifact.storage },
        }),
      );
    } else {
      const html = bytes.toString("utf8");
      if (html.trim().length > 0) {
        const htmlPathAbs = path.resolve(workerDirAbs, "rendered-dom.html");
        fs.writeFileSync(htmlPathAbs, html, "utf8");
        documents.push({
          kind: "rendered_document_snapshot_v1",
          sourceUrl: input.sourceUrl,
          htmlPathAbs,
          htmlSha256: normalizeText(domArtifact.sha256) || sha256Hex(html),
          readinessState: input.response.status === "partial" ? "timeout_partial" : "dom_stable",
        });
      }
    }
  }

  if (styleArtifact) {
    const bytes = decodeInlineArtifactBytes(styleArtifact);
    if (!bytes) {
      diagnostics.push(
        makeAdapterDiagnostic({
          code: "CAPTURE_WORKER_RESPONSE_INVALID",
          message: "Rendered capture worker computed-style artifact could not be decoded",
          details: { artifactType: styleArtifact.artifactType, storage: styleArtifact.storage },
        }),
      );
    } else {
      const stylePathAbs = path.resolve(workerDirAbs, "computed-style-samples.json");
      fs.writeFileSync(stylePathAbs, bytes);
    }
  }

  const screenshots: RenderedCaptureResult["screenshots"] = [];
  const screenshotArtifacts = [viewportArtifact, fullpageArtifact].filter((entry): entry is RenderedCaptureWorkerArtifactRef => Boolean(entry));
  for (const artifact of screenshotArtifacts) {
    const bytes = decodeInlineArtifactBytes(artifact);
    if (!bytes) {
      diagnostics.push(
        makeAdapterDiagnostic({
          code: "CAPTURE_WORKER_RESPONSE_INVALID",
          message: "Rendered capture worker screenshot artifact could not be decoded",
          details: { captureType: artifact.captureType, storage: artifact.storage },
        }),
      );
      continue;
    }

    const captureType = artifact.captureType === "desktop_fullpage" ? "desktop_fullpage" : "desktop_viewport";
    const filePathAbs = path.resolve(screenshotDirAbs, captureType === "desktop_fullpage" ? "desktop-fullpage.png" : "desktop-viewport.png");
    fs.writeFileSync(filePathAbs, bytes);
    screenshots.push({
      kind: "rendered_screenshot_artifact_v1",
      screenshotId: normalizeText(artifact.sha256).slice(0, 16) || sha256Hex(bytes).slice(0, 16),
      captureType,
      filePathAbs,
      width: 0,
      height: 0,
      fullPage: captureType === "desktop_fullpage",
    });
  }

  const computedStyleSamples = Array.isArray(input.response.computedStyleSamples) ? input.response.computedStyleSamples : [];

  const mappedStatus: RenderedCaptureResult["status"] =
    input.response.status === "unsupported"
      ? "unavailable"
      : input.response.status === "failed"
        ? "failed"
        : input.response.status === "partial"
          ? "partial"
          : "available";

  const sourceMode: RenderedCaptureResult["sourceMode"] = documents.length > 0 ? "rendered_dom" : "raw_html";

  return {
    kind: "rendered_capture_result_v1",
    version: "1.0.0",
    status: mappedStatus,
    sourceMode,
    documents,
    screenshots,
    computedStyleSamples,
    renderedObservedAssetUrls: [],
    diagnostics,
  };
}
