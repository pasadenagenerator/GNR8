import { createHash } from "node:crypto";

import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";

import { createAstroProductionCandidateId, isCanonicalUuid } from "./astro-production-candidate-record";
import { deriveAstroSuccessorOperationIdentity } from "./astro-successor-operation-identity";
import {
  isAstroInternalPreviewCandidate,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";
import type { ChsAstroBuildReceipt } from "./chs-astro-candidate-producer";
import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";

export const MVP28_OPERATION_ID = "01c10f4b-ee63-4359-9a0d-039132cf7e35" as const;
export const MVP28_PACKAGE_SCHEMA_VERSION = "gnr8-mvp28-chs-package:v1" as const;
export const MVP28_PACKAGE_MAX_BYTES = 2_000_000;
export const MVP28_SOURCE_URL = "https://www.chs.si/" as const;
export const MVP28_EXPECTED_BASELINE_POINTER = {
  siteVersionId: "b88a3eae-7c24-56f9-ace4-3ad0dff2ed90",
  artifactId: "d8969fd3-cdda-4ad7-a658-20f335f9890f",
} as const;

export const MVP28_REQUIRED_CAPTURE_TEXT = [
  "The team that helps you change your IT to fit into every season and technology wave.",
  "VMware pricing change just became your opportunity",
  "Vendor-Neutral yet vendor supported advice",
  "sales@chs.si",
  "Parmova ulica 51, Ljubljana",
  "Slovenia",
  "© 2026 CHS d.o.o. - All rights reserved",
] as const;

const PACKAGE_KEYS = new Set(["schemaVersion", "operationId", "sourceUrl", "capture", "build", "packageSha256"]);
const CAPTURE_KEYS = new Set([
  "snapshotVersion", "snapshotId", "snapshotRunId", "requestId", "capturedAt", "sourceMode",
  "fidelityStatus", "renderedCaptureStatus", "renderedDomQuality", "renderedDomLength",
  "renderedNodeCount", "computedStyleSampleCount", "viewportScreenshotCaptured",
  "fullPageScreenshotCaptured", "diagnosticCodes", "rawHtml", "rawHtmlSha256",
]);
const BUILD_KEYS = new Set(["candidate", "receipt"]);
const RECEIPT_KEYS = new Set([
  "proofVersion", "candidateId", "buildCompletedAt", "toolVersions", "generatedSourceSha256",
  "exportSha256", "outputPaths", "exportFiles", "execution", "receiptSha256",
]);
const TOOL_VERSION_KEYS = new Set(["node", "pnpm", "astro"]);
const EXPORT_FILE_KEYS = new Set(["path", "bytes", "sha256"]);
const EXECUTION_KEYS = new Set([
  "installationCompleted", "buildCompleted", "sourceUnchanged", "cleanupCompleted",
  "workspaceRemoved", "cleanupErrorCount",
]);

export type Mvp28OperationIdentity = ReturnType<typeof deriveMvp28OperationIdentity>;

export type Mvp28ChsPackage = {
  schemaVersion: typeof MVP28_PACKAGE_SCHEMA_VERSION;
  operationId: typeof MVP28_OPERATION_ID;
  sourceUrl: typeof MVP28_SOURCE_URL;
  capture: {
    snapshotVersion: string;
    snapshotId: string;
    snapshotRunId: string;
    requestId: string;
    capturedAt: string;
    sourceMode: "rendered_dom" | "raw_html_fallback";
    fidelityStatus: string;
    renderedCaptureStatus: string;
    renderedDomQuality: "strong" | "weak" | "unusable";
    renderedDomLength: number;
    renderedNodeCount: number;
    computedStyleSampleCount: number;
    viewportScreenshotCaptured: boolean;
    fullPageScreenshotCaptured: boolean;
    diagnosticCodes: string[];
    rawHtml: string;
    rawHtmlSha256: string;
  };
  build: {
    candidate: AstroInternalPreviewCandidate;
    receipt: ChsAstroBuildReceipt;
  };
  packageSha256: string;
};

export function deriveMvp28OperationIdentity(operationId: string = MVP28_OPERATION_ID) {
  if (operationId !== MVP28_OPERATION_ID) throw new Error("mvp28_operation_id_invalid");
  const seed = stableStringify({ version: "gnr8-platform-mvp28:v1", operationId, sourceUrl: MVP28_SOURCE_URL });
  const generationSiteVersionId = deterministicUuid(`${seed}:generation-version`);
  const registrationOperationId = deterministicUuid(`${seed}:registration`);
  const successor = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    sourceSiteVersionId: generationSiteVersionId,
    sourceCandidateId: createAstroProductionCandidateId(registrationOperationId),
  });
  return {
    operationId,
    captureRuntimeSiteId: `test_runtime_e2e_capture_chs_${sha256Hex(seed).slice(0, 16)}`,
    captureSiteVersionId: deterministicUuid(`${seed}:capture-version`),
    captureRequestId: `mvp28-chs-${operationId}`,
    generationSiteVersionId,
    registrationOperationId,
    generationCandidateId: createAstroProductionCandidateId(registrationOperationId),
    producerInputId: `chs:fresh-capture:${operationId}`,
    successorSiteVersionId: successor.successorSiteVersionId,
    successorCandidateId: successor.successorCandidateId,
  };
}

export function createMvp28ChsPackage(
  input: Omit<Mvp28ChsPackage, "schemaVersion" | "operationId" | "sourceUrl" | "packageSha256">,
): Mvp28ChsPackage {
  const unsigned = {
    schemaVersion: MVP28_PACKAGE_SCHEMA_VERSION,
    operationId: MVP28_OPERATION_ID,
    sourceUrl: MVP28_SOURCE_URL,
    capture: structuredClone(input.capture),
    build: structuredClone(input.build),
  };
  return { ...unsigned, packageSha256: sha256Hex(stableStringify(unsigned)) };
}

export function validateMvp28ChsPackage(value: unknown): Mvp28ChsPackage {
  if (!isRecord(value) || !hasOnlyKeys(value, PACKAGE_KEYS)) throw new Error("mvp28_package_invalid");
  const serializedBytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  if (serializedBytes > MVP28_PACKAGE_MAX_BYTES) throw new Error("mvp28_package_too_large");
  const packageValue = value as unknown as Mvp28ChsPackage;
  const operation = deriveMvp28OperationIdentity(packageValue.operationId);
  if (
    packageValue.schemaVersion !== MVP28_PACKAGE_SCHEMA_VERSION ||
    packageValue.sourceUrl !== MVP28_SOURCE_URL ||
    !isSha256(packageValue.packageSha256)
  ) throw new Error("mvp28_package_identity_invalid");
  const { packageSha256: _hash, ...unsigned } = packageValue;
  if (sha256Hex(stableStringify(unsigned)) !== packageValue.packageSha256) {
    throw new Error("mvp28_package_hash_mismatch");
  }

  const capture = packageValue.capture;
  if (
    !isRecord(capture) ||
    !hasOnlyKeys(capture, CAPTURE_KEYS) ||
    capture.requestId !== operation.captureRequestId ||
    !isBoundedText(capture.snapshotVersion, 128) ||
    !isBoundedText(capture.snapshotId, 256) ||
    !isBoundedText(capture.snapshotRunId, 256) ||
    !isIsoTimestamp(capture.capturedAt) ||
    !["rendered_dom", "raw_html_fallback"].includes(capture.sourceMode) ||
    !["high_fidelity_import", "degraded_import", "capture_failed"].includes(capture.fidelityStatus) ||
    !["available", "partial", "failed"].includes(capture.renderedCaptureStatus) ||
    !["strong", "weak", "unusable"].includes(capture.renderedDomQuality) ||
    !isBoundedNonNegativeInteger(capture.renderedDomLength) ||
    !isBoundedNonNegativeInteger(capture.renderedNodeCount) ||
    !isBoundedNonNegativeInteger(capture.computedStyleSampleCount) ||
    typeof capture.viewportScreenshotCaptured !== "boolean" ||
    typeof capture.fullPageScreenshotCaptured !== "boolean" ||
    !Array.isArray(capture.diagnosticCodes) ||
    capture.diagnosticCodes.length > 128 ||
    !capture.diagnosticCodes.every((code) => isBoundedText(code, 160)) ||
    typeof capture.rawHtml !== "string" ||
    Buffer.byteLength(capture.rawHtml, "utf8") > 1_000_000 ||
    !isSha256(capture.rawHtmlSha256) ||
    sha256Hex(capture.rawHtml) !== capture.rawHtmlSha256
  ) throw new Error("mvp28_capture_invalid");
  const normalizedRaw = normalizeText(capture.rawHtml);
  for (const required of MVP28_REQUIRED_CAPTURE_TEXT) {
    if (!normalizedRaw.includes(normalizeText(required))) throw new Error("mvp28_capture_required_content_missing");
  }

  if (!isRecord(packageValue.build) || !hasOnlyKeys(packageValue.build, BUILD_KEYS)) {
    throw new Error("mvp28_build_invalid");
  }
  const candidate = packageValue.build.candidate;
  const receipt = packageValue.build.receipt;
  if (!isAstroInternalPreviewCandidate(candidate)) throw new Error("mvp28_candidate_invalid");
  if (
    candidate.id !== operation.generationCandidateId ||
    candidate.siteId !== CHS_ASTRO_EVALUATION.runtimeSiteId ||
    candidate.siteVersionId !== operation.generationSiteVersionId
  ) throw new Error("mvp28_candidate_scope_invalid");
  validateReceipt(receipt, candidate);
  return structuredClone(packageValue);
}

function validateReceipt(receipt: unknown, candidate: AstroInternalPreviewCandidate): asserts receipt is ChsAstroBuildReceipt {
  if (!isRecord(receipt) || !hasOnlyKeys(receipt, RECEIPT_KEYS)) throw new Error("mvp28_build_receipt_invalid");
  const typed = receipt as unknown as ChsAstroBuildReceipt;
  const { receiptSha256: _hash, ...unsigned } = typed;
  if (
    typed.proofVersion !== "gnr8-astro-build-export-proof:v1" ||
    typed.candidateId !== candidate.id ||
    !isIsoTimestamp(typed.buildCompletedAt) ||
    !isRecord(typed.toolVersions) ||
    !hasOnlyKeys(typed.toolVersions, TOOL_VERSION_KEYS) ||
    ![typed.toolVersions.node, typed.toolVersions.pnpm, typed.toolVersions.astro].every((item) => isBoundedText(item, 128)) ||
    typed.generatedSourceSha256 !== candidate.manifest.provenance.sourceSnapshotSha256 ||
    typed.exportSha256 !== candidate.manifest.provenance.exportSha256 ||
    stableStringify(typed.outputPaths) !== stableStringify(["/"]) ||
    !Array.isArray(typed.exportFiles) ||
    typed.exportFiles.length === 0 ||
    typed.exportFiles.length > 128 ||
    !typed.exportFiles.every((file) => isRecord(file) && hasOnlyKeys(file, EXPORT_FILE_KEYS) &&
      safeExportPath(file.path) && Number.isSafeInteger(file.bytes) && Number(file.bytes) > 0 && isSha256(file.sha256)) ||
    !isRecord(typed.execution) ||
    !hasOnlyKeys(typed.execution, EXECUTION_KEYS) ||
    typed.execution.installationCompleted !== true ||
    typed.execution.buildCompleted !== true ||
    typed.execution.sourceUnchanged !== true ||
    typed.execution.cleanupCompleted !== true ||
    typed.execution.workspaceRemoved !== true ||
    typed.execution.cleanupErrorCount !== 0 ||
    !isSha256(typed.receiptSha256) ||
    sha256Hex(stableStringify(unsigned)) !== typed.receiptSha256
  ) throw new Error("mvp28_build_receipt_invalid");
}

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(createHash("sha256").update(seed).digest().subarray(0, 16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  const value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  if (!isCanonicalUuid(value)) throw new Error("mvp28_operation_identity_invalid");
  return value;
}

function safeExportPath(value: unknown): boolean {
  return isBoundedText(value, 512) && !value.startsWith("/") && !value.includes("..") && !value.includes("\\");
}

function normalizeText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: ReadonlySet<string>): boolean {
  const keys = Object.keys(value);
  return keys.length === allowed.size && keys.every((key) => allowed.has(key));
}

function isBoundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max && value === value.trim() && !value.includes("\0");
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isBoundedNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 10_000_000;
}
