import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { sha256Hex } from "@/gnr8/runtime/deterministic";
import { importPublicSinglePageUrlToSnapshot } from "@/gnr8/validation/runtime/url-single-page-import";

import { createChsSourceBackedAstroCandidateProducer } from "./chs-astro-candidate-producer";
import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";
import { chsAstroSourceContent } from "./chs-astro-source-content";
import {
  createMvp28ChsPackage,
  deriveMvp28OperationIdentity,
  MVP28_OPERATION_ID,
  MVP28_PACKAGE_MAX_BYTES,
  MVP28_SOURCE_URL,
  validateMvp28ChsPackage,
  type Mvp28ChsPackage,
} from "./mvp28-chs-package-contract";

const outputPath = process.env.GNR8_MVP28_PACKAGE_PATH?.trim() || "/private/tmp/gnr8-mvp28-package.json";
if (!path.isAbsolute(outputPath) || !outputPath.startsWith("/private/tmp/")) {
  throw new Error("GNR8_MVP28_PACKAGE_PATH_INVALID");
}

const operation = deriveMvp28OperationIdentity(MVP28_OPERATION_ID);
const snapshotRoot = `/private/tmp/gnr8-mvp28-capture-${MVP28_OPERATION_ID}`;
const capture = process.env.GNR8_MVP28_REUSE_RETAINED_CAPTURE === "1"
  ? await loadRetainedCapture(snapshotRoot)
  : await captureFresh(snapshotRoot);
const producer = createChsSourceBackedAstroCandidateProducer({
  content: chsAstroSourceContent(),
  inputId: operation.producerInputId,
});
const candidate = await producer.produce({
  candidateId: operation.generationCandidateId,
  candidateCreatedAt: capture.capturedAt,
  ownership: {
    runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: operation.generationSiteVersionId,
    ownershipSiteId: CHS_ASTRO_EVALUATION.ownership.siteId,
    organizationId: CHS_ASTRO_EVALUATION.ownership.organizationId,
    agencyId: CHS_ASTRO_EVALUATION.ownership.agencyId,
  },
  syntheticInput: { fixtureId: operation.producerInputId },
});
const receipt = producer.readBuildReceipt(candidate.id);
if (!receipt) throw new Error("GNR8_MVP28_BUILD_RECEIPT_MISSING");

const prepared = createMvp28ChsPackage({
  capture,
  build: { candidate, receipt },
});
validateMvp28ChsPackage(prepared);
const serialized = `${JSON.stringify(prepared)}\n`;
const byteLength = Buffer.byteLength(serialized, "utf8");
if (byteLength > MVP28_PACKAGE_MAX_BYTES) {
  throw new Error(`GNR8_MVP28_PACKAGE_TOO_LARGE:${byteLength}:${MVP28_PACKAGE_MAX_BYTES}`);
}
await fs.writeFile(outputPath, serialized, { encoding: "utf8", mode: 0o600 });
process.stdout.write(`${JSON.stringify({
  operationId: MVP28_OPERATION_ID,
  outputPath,
  byteLength,
  packageSha256: prepared.packageSha256,
  snapshotId: prepared.capture.snapshotId,
  snapshotRunId: prepared.capture.snapshotRunId,
  capturedAt: prepared.capture.capturedAt,
  candidateId: prepared.build.candidate.id,
  candidateContentSha256: prepared.build.candidate.contentSha256,
  buildReceiptSha256: prepared.build.receipt.receiptSha256,
}, null, 2)}\n`);

async function captureFresh(snapshotRootDirAbs: string): Promise<Mvp28ChsPackage["capture"]> {
  const snapshot = await importPublicSinglePageUrlToSnapshot({
    sourceUrl: MVP28_SOURCE_URL,
    snapshotRootDirAbs,
    requestId: operation.captureRequestId,
    siteId: operation.captureRuntimeSiteId,
    siteVersionId: operation.captureSiteVersionId,
  });
  const intake = snapshot.importIntake;
  if (!intake?.ok || !intake.rawHtmlAvailable || intake.htmlByteLength <= 0) {
    throw new Error(`GNR8_MVP28_CAPTURE_FAILED:${intake?.reasonCode ?? "unknown"}`);
  }
  const rawHtml = await fs.readFile(snapshot.entryHtmlPathAbs, "utf8");
  return {
    snapshotVersion: snapshot.snapshotVersion,
    snapshotId: snapshot.snapshotId,
    snapshotRunId: snapshot.snapshotRunId,
    requestId: operation.captureRequestId,
    capturedAt: new Date(snapshot.renderedCaptureReliability.job?.completedAt ??
      snapshot.renderedCaptureReliability.job?.startedAt ?? Date.now()).toISOString(),
    sourceMode: snapshot.sourceMode,
    fidelityStatus: snapshot.sourceSelection.fidelityStatus,
    renderedCaptureStatus: snapshot.renderedCapture.status === "unavailable" ? "failed" : snapshot.renderedCapture.status,
    renderedDomQuality: snapshot.sourceSelection.renderedDomQuality.quality,
    renderedDomLength: snapshot.sourceMode === "rendered_dom" ? rawHtml.length : 0,
    renderedNodeCount: snapshot.sourceSelection.renderedDomQuality.meaningfulNodeCount,
    computedStyleSampleCount: snapshot.renderedCapture.computedStyleSamples.length,
    viewportScreenshotCaptured: snapshot.renderedCapture.screenshots.some((item) => item.captureType === "desktop_viewport"),
    fullPageScreenshotCaptured: snapshot.renderedCapture.screenshots.some((item) => item.captureType === "desktop_fullpage"),
    diagnosticCodes: snapshot.importDiagnostics.issues.map((issue) => issue.code),
    rawHtml,
    rawHtmlSha256: sha256Hex(rawHtml),
  };
}

async function loadRetainedCapture(snapshotRootDirAbs: string): Promise<Mvp28ChsPackage["capture"]> {
  const stableRoot = await fs.realpath(path.join(snapshotRootDirAbs, `imported-url-site-${sha256Hex(MVP28_SOURCE_URL).slice(0, 16)}`));
  const latest = JSON.parse(await fs.readFile(path.join(stableRoot, "latest-run.json"), "utf8")) as Record<string, unknown>;
  const runRoot = await fs.realpath(String(latest.snapshotRunRootDirAbs ?? ""));
  if (!runRoot.startsWith(`${stableRoot}${path.sep}`) || latest.requestId !== operation.captureRequestId) {
    throw new Error("GNR8_MVP28_RETAINED_CAPTURE_IDENTITY_INVALID");
  }
  const fixture = JSON.parse(await fs.readFile(path.join(runRoot, "fixture.json"), "utf8")) as Record<string, unknown>;
  const rendered = JSON.parse(await fs.readFile(path.join(runRoot, "rendered-capture.json"), "utf8")) as Record<string, unknown>;
  const acquisition = JSON.parse(await fs.readFile(path.join(runRoot, "acquisition-evidence.json"), "utf8")) as {
    renderedCapture?: { job?: { completedAt?: string | null; startedAt?: string | null } | null };
    selectedSource?: {
      mode?: Mvp28ChsPackage["capture"]["sourceMode"];
      fidelityStatus?: string;
      renderedDomQuality?: { quality?: Mvp28ChsPackage["capture"]["renderedDomQuality"]; meaningfulNodeCount?: number };
    };
  };
  const diagnostics = JSON.parse(await fs.readFile(path.join(runRoot, "url-import-diagnostics.json"), "utf8")) as {
    issues?: Array<{ code?: string }>;
  };
  const rawHtml = await fs.readFile(path.join(runRoot, "index.html"), "utf8");
  const screenshotSummary = rendered.screenshotSummary as Record<string, unknown> | undefined;
  const qualityBreakdown = rendered.qualityBreakdown as Record<string, unknown> | undefined;
  const computedStyleSamples = Array.isArray(rendered.computedStyleSamples) ? rendered.computedStyleSamples : [];
  return {
    snapshotVersion: String(fixture.snapshotVersion ?? ""),
    snapshotId: String(latest.snapshotId ?? ""),
    snapshotRunId: String(latest.snapshotRunId ?? ""),
    requestId: operation.captureRequestId,
    capturedAt: new Date(acquisition.renderedCapture?.job?.completedAt ??
      acquisition.renderedCapture?.job?.startedAt ?? "").toISOString(),
    sourceMode: acquisition.selectedSource?.mode ?? "raw_html_fallback",
    fidelityStatus: String(acquisition.selectedSource?.fidelityStatus ?? ""),
    renderedCaptureStatus: rendered.status === "available" || rendered.status === "partial" ? rendered.status : "failed",
    renderedDomQuality: acquisition.selectedSource?.renderedDomQuality?.quality ?? "unusable",
    renderedDomLength: Number(qualityBreakdown?.domLength ?? 0),
    renderedNodeCount: Number(acquisition.selectedSource?.renderedDomQuality?.meaningfulNodeCount ?? 0),
    computedStyleSampleCount: computedStyleSamples.length,
    viewportScreenshotCaptured: screenshotSummary?.viewportCaptured === true,
    fullPageScreenshotCaptured: screenshotSummary?.fullPageCaptured === true,
    diagnosticCodes: (diagnostics.issues ?? []).map((item) => String(item.code ?? "")),
    rawHtml,
    rawHtmlSha256: sha256Hex(rawHtml),
  };
}
