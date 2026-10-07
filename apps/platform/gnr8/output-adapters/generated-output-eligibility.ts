import "server-only";

import { parse } from "parse5";
import type { DefaultTreeAdapterMap } from "parse5";

import {
  ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
  computeRuntimeArtifactBundleSha256,
  readAstroRuntimeArtifactPromotionEvidence,
} from "@/gnr8/runtime/astro-artifact-materialization";
import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import { runRenderIntegrityGate } from "@/gnr8/runtime/render-integrity-gate";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

import {
  ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID,
  ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND,
  ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
  validateAstroProductionCandidateRecord,
} from "./astro-production-candidate-record";
import { ASTRO_STATIC_EXPORT_MANIFEST_VERSION } from "./astro-static-site-build-export-proof";
import {
  ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
  ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
} from "./astro-static-site-internal-preview-bridge";
import { isGeneratedOutputRoutePath } from "./generated-output-route-path";

export const GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION =
  "gnr8-generated-output-eligibility:v1" as const;
export const GENERATED_OUTPUT_BUILD_EVIDENCE_VERSION =
  "gnr8-generated-output-build-evidence:v1" as const;
export const GENERATED_OUTPUT_CONTENT_MANIFEST_VERSION =
  "gnr8-generated-output-content-manifest:v1" as const;
export const GENERATED_OUTPUT_REVIEW_VERSION =
  "gnr8-generated-output-review:v1" as const;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const SUPPORTED_PRODUCERS = new Set([
  "chs_source_backed_astro_build_export_bridge:v1",
  "source_backed_astro_build_export_bridge:v1",
  "astro_successor_candidate_rebind:v1",
]);

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];

export type GeneratedOutputDeliveryScope = {
  kind: "homepage_only" | "static_site";
  outputPaths: string[];
  allowedPublishStages: Array<"shadow" | "canary" | "production">;
  unsupportedCapabilities: string[];
};

export type GeneratedOutputContentManifest = {
  version: typeof GENERATED_OUTPUT_CONTENT_MANIFEST_VERSION;
  sourceRef: string;
  scope: GeneratedOutputDeliveryScope;
  requiredContent: Array<{
    id: string;
    value: string;
    match: "text" | "html";
  }>;
  requiredNavigation: Array<{
    id: string;
    kind: "local_anchor" | "local_route" | "external_url" | "mailto" | "tel";
    target: string;
  }>;
  requiredAssets: Array<{ path: string; sha256: string }>;
  manifestSha256: string;
};

export type GeneratedOutputBuildEvidence = {
  version: typeof GENERATED_OUTPUT_BUILD_EVIDENCE_VERSION;
  establishedBy: "server_astro_build_export_pipeline";
  proofVersion: "gnr8-astro-build-export-proof:v1";
  candidateId: string;
  candidateContentSha256: string;
  candidateStorageSha256: string;
  producerKind: string;
  producerVersion: string;
  adapterId: typeof ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID;
  conversionVersion: typeof ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION;
  exportManifestVersion: typeof ASTRO_STATIC_EXPORT_MANIFEST_VERSION;
  rendererCompatibilityVersion: string;
  sourceCapture: {
    sourceUrl: string;
    snapshotId: string;
    snapshotRunId: string;
    capturedAt: string;
    runtimeSiteId: string;
    siteVersionId: string;
    artifactId: string;
    artifactBundleSha256: string;
    htmlSha256: string;
  };
  toolVersions: {
    node: string;
    pnpm: string;
    astro: string;
  };
  buildExecution: {
    receiptSha256: string;
    installationCompleted: true;
    buildCompleted: true;
    sourceUnchanged: true;
    cleanupCompleted: true;
    workspaceRemoved: true;
    cleanupErrorCount: 0;
  };
  submissionAttestation: {
    mode: "authenticated_preview_package" | "direct_server_execution";
    operationId: string;
    packageSha256: string;
    submittedByActorId: string;
    receivedAt: string;
  };
  buildCompletedAt: string;
  sourceSnapshotSha256: string;
  exportSha256: string;
  outputPaths: string[];
  assetFingerprintMapSha256: string;
  contentManifestSourceRef: string;
  derivedFromEvidenceSha256: string | null;
  evidenceSha256: string;
};

export type GeneratedOutputReviewRecord = {
  version: typeof GENERATED_OUTPUT_REVIEW_VERSION;
  reviewId: string;
  decision: "APPROVED" | "REJECTED";
  policyVersion: typeof GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION;
  artifactId: string;
  artifactBundleSha256: string;
  candidateId: string;
  candidateContentSha256: string;
  contentManifestSha256: string;
  technicalEvaluationSha256: string;
  reviewerActorId: string;
  reviewedAt: string;
  reviewSha256: string;
};

export type GeneratedOutputBlocker = {
  code: string;
  message: string;
};

export type GeneratedOutputTechnicalEligibility = {
  policyVersion: typeof GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION;
  status: "PASS" | "BLOCKED";
  artifactId: string;
  artifactBundleSha256: string;
  candidateId: string | null;
  candidateContentSha256: string | null;
  contentManifestSha256: string;
  scope: GeneratedOutputDeliveryScope;
  blockerReasons: GeneratedOutputBlocker[];
  evidenceSha256: string;
};

export type GeneratedOutputPublicationDecision = {
  policyVersion: typeof GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION;
  technical: GeneratedOutputTechnicalEligibility;
  review: {
    status: "APPROVED" | "MISSING" | "REJECTED" | "STALE";
    reviewId: string | null;
    blockerReasons: GeneratedOutputBlocker[];
  };
  targetReadiness: "NOT_EVALUATED";
  activation: "BLOCKED" | "READY_FOR_TARGET_READINESS";
  blockerReasons: GeneratedOutputBlocker[];
};

export function createGeneratedOutputContentManifest(
  input: Omit<GeneratedOutputContentManifest, "version" | "manifestSha256">,
): GeneratedOutputContentManifest {
  const unsigned = {
    version: GENERATED_OUTPUT_CONTENT_MANIFEST_VERSION,
    ...structuredClone(input),
  };
  return {
    ...unsigned,
    manifestSha256: sha256Hex(stableStringify(unsigned)),
  };
}

export function createGeneratedOutputBuildEvidence(
  input: Omit<GeneratedOutputBuildEvidence, "version" | "evidenceSha256">,
): GeneratedOutputBuildEvidence {
  const unsigned = {
    version: GENERATED_OUTPUT_BUILD_EVIDENCE_VERSION,
    ...structuredClone(input),
  };
  return {
    ...unsigned,
    evidenceSha256: sha256Hex(stableStringify(unsigned)),
  };
}

export function createGeneratedOutputReviewRecord(
  input: Omit<GeneratedOutputReviewRecord, "version" | "reviewSha256">,
): GeneratedOutputReviewRecord {
  const unsigned = {
    version: GENERATED_OUTPUT_REVIEW_VERSION,
    ...structuredClone(input),
  };
  return {
    ...unsigned,
    reviewSha256: sha256Hex(stableStringify(unsigned)),
  };
}

export function evaluateGeneratedOutputTechnicalEligibility(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact;
  authoritativeOwnership: AstroProductionCandidateOwnership;
  candidateRecord: unknown;
  buildEvidence: unknown;
  contentManifest: GeneratedOutputContentManifest;
  sourceCaptureSiteVersion: CanonicalSiteVersionSnapshot | null;
  sourceCaptureArtifact: RuntimeArtifact | null;
}): GeneratedOutputTechnicalEligibility {
  const blockers: GeneratedOutputBlocker[] = [];
  const block = (code: string, message: string): void => {
    if (!blockers.some((item) => item.code === code)) blockers.push({ code, message });
  };
  const { artifact, contentManifest } = input;
  let record: AstroProductionCandidateRecord | null = null;

  if (!isValidContentManifest(contentManifest)) {
    block("content_manifest_invalid", "Trusted source/content manifest integrity is invalid.");
  }
  try {
    record = validateAstroProductionCandidateRecord(input.candidateRecord);
  } catch {
    block("generated_candidate_record_invalid", "Retained generated candidate record is missing, corrupt, or unsupported.");
  }

  const promotion = readAstroRuntimeArtifactPromotionEvidence(artifact.manifest);
  if (!promotion) {
    block("generated_provenance_missing", "Supported retained Astro promotion provenance is missing.");
  }
  if (computeArtifactBundleSha256(artifact) !== artifact.bundleSha256) {
    block("artifact_bundle_hash_mismatch", "Runtime artifact bundle hash does not match retained bytes.");
  }
  if (
    artifact.siteId !== input.authoritativeOwnership.runtimeSiteId ||
    artifact.siteVersionId !== input.authoritativeOwnership.siteVersionId ||
    input.siteVersion.id !== input.authoritativeOwnership.siteVersionId ||
    input.siteVersion.siteId !== input.authoritativeOwnership.runtimeSiteId
  ) {
    block("ownership_mismatch", "Artifact, site version, and authoritative ownership are not the same exact scope.");
  }

  if (record) {
    if (!sameOwnership(record.identity, input.authoritativeOwnership)) {
      block("ownership_mismatch", "Candidate ownership does not match authoritative ownership.");
    }
    if (!sameArtifactBytes(record, artifact)) {
      block("candidate_artifact_bytes_mismatch", "Runtime artifact bytes do not match the retained candidate.");
    }
    if (
      !promotion ||
      promotion.version !== ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION ||
      promotion.candidateId !== record.identity.candidateId ||
      promotion.candidateContentSha256 !== record.candidate.contentSha256 ||
      promotion.candidateStorageSha256 !== record.storageSha256 ||
      promotion.sourceSnapshotSha256 !== record.candidate.manifest.provenance.sourceSnapshotSha256 ||
      promotion.exportSha256 !== record.candidate.manifest.provenance.exportSha256 ||
      promotion.convertedArtifactSha256 !== record.candidate.contentSha256 ||
      promotion.htmlTransformation !== "none"
    ) {
      block("generated_provenance_lineage_mismatch", "Promotion provenance is not bound to the exact retained candidate.");
    }
  }

  const buildEvidence = validateBuildEvidence(input.buildEvidence);
  if (!buildEvidence) {
    block("build_evidence_missing_or_invalid", "Retained server-established build/export evidence is missing or invalid.");
  } else if (record) {
    const producer = `${buildEvidence.producerKind}:${buildEvidence.producerVersion}`;
    if (!SUPPORTED_PRODUCERS.has(producer)) {
      block("generated_producer_unsupported", "Generated producer kind/version is unsupported by policy.");
    }
    if (
      buildEvidence.candidateId !== record.identity.candidateId ||
      buildEvidence.candidateContentSha256 !== record.candidate.contentSha256 ||
      buildEvidence.candidateStorageSha256 !== record.storageSha256 ||
      buildEvidence.producerKind !== record.registration.producerKind ||
      buildEvidence.producerVersion !== record.registration.producerVersion ||
      buildEvidence.adapterId !== record.candidate.manifest.adapterId ||
      buildEvidence.conversionVersion !== record.candidate.manifest.conversionVersion ||
      buildEvidence.exportManifestVersion !== record.candidate.manifest.provenance.exportManifestVersion ||
      buildEvidence.rendererCompatibilityVersion !== record.candidate.rendererCompatibilityVersion ||
      buildEvidence.sourceSnapshotSha256 !== record.candidate.manifest.provenance.sourceSnapshotSha256 ||
      buildEvidence.exportSha256 !== record.candidate.manifest.provenance.exportSha256 ||
      buildEvidence.assetFingerprintMapSha256 !== sha256Hex(stableStringify(record.candidate.assetFingerprintMap)) ||
      buildEvidence.contentManifestSourceRef !== contentManifest.sourceRef
    ) {
      block("build_evidence_lineage_mismatch", "Build/export evidence is not bound to the exact candidate and supported adapters.");
    }
  }
  if (buildEvidence) {
    evaluateSourceCaptureBinding({
      buildEvidence,
      sourceCaptureSiteVersion: input.sourceCaptureSiteVersion,
      sourceCaptureArtifact: input.sourceCaptureArtifact,
      block,
    });
  }

  const expectedPaths = contentManifest.scope.outputPaths;
  const artifactPaths = Object.keys(artifact.htmlByPath).sort();
  if (stableStringify(artifactPaths) !== stableStringify(expectedPaths)) {
    block("unsupported_output_routes", "Generated output contains missing or unsupported routes for the declared scope.");
  }

  const integrity = runRenderIntegrityGate({
    siteVersion: input.siteVersion,
    htmlByPath: artifact.htmlByPath,
    assetFingerprintMap: artifact.assetFingerprintMap,
  });
  if (!integrity.ok) {
    for (const issue of integrity.issues) {
      block(`render_integrity:${issue.code.toLowerCase()}`, issue.message);
    }
  }

  evaluateHtmlAgainstManifest({ htmlByPath: artifact.htmlByPath, artifact, manifest: contentManifest, block });

  const candidateId = record?.identity.candidateId ?? promotion?.candidateId ?? null;
  const candidateContentSha256 = record?.candidate.contentSha256 ?? promotion?.candidateContentSha256 ?? null;
  const basis = {
    policyVersion: GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION,
    status: blockers.length === 0 ? "PASS" as const : "BLOCKED" as const,
    artifactId: artifact.id,
    artifactBundleSha256: artifact.bundleSha256,
    candidateId,
    candidateContentSha256,
    contentManifestSha256: contentManifest.manifestSha256,
    scope: structuredClone(contentManifest.scope),
    blockerReasons: [...blockers].sort((a, b) => a.code.localeCompare(b.code)),
  };
  return { ...basis, evidenceSha256: sha256Hex(stableStringify(basis)) };
}

export function evaluateGeneratedOutputPublicationDecision(input: {
  technical: GeneratedOutputTechnicalEligibility;
  review: GeneratedOutputReviewRecord | null;
}): GeneratedOutputPublicationDecision {
  const reviewBlockers: GeneratedOutputBlocker[] = [];
  let reviewStatus: GeneratedOutputPublicationDecision["review"]["status"] = "MISSING";
  if (!input.review) {
    reviewBlockers.push({ code: "generated_output_review_missing", message: "An explicit artifact-bound review is required." });
  } else if (!isValidReviewRecord(input.review)) {
    reviewStatus = "STALE";
    reviewBlockers.push({ code: "generated_output_review_invalid", message: "Generated-output review integrity is invalid." });
  } else if (input.review.decision === "REJECTED") {
    reviewStatus = "REJECTED";
    reviewBlockers.push({ code: "generated_output_review_rejected", message: "Generated output review rejected this artifact." });
  } else if (!reviewMatchesTechnical(input.review, input.technical)) {
    reviewStatus = "STALE";
    reviewBlockers.push({ code: "generated_output_review_stale", message: "Review does not match the exact artifact, content, evaluation, and policy version." });
  } else {
    reviewStatus = "APPROVED";
  }
  const blockers = [...input.technical.blockerReasons, ...reviewBlockers];
  return {
    policyVersion: GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION,
    technical: structuredClone(input.technical),
    review: {
      status: reviewStatus,
      reviewId: input.review?.reviewId ?? null,
      blockerReasons: reviewBlockers,
    },
    targetReadiness: "NOT_EVALUATED",
    activation: blockers.length === 0 ? "READY_FOR_TARGET_READINESS" : "BLOCKED",
    blockerReasons: blockers,
  };
}

function evaluateHtmlAgainstManifest(input: {
  htmlByPath: Record<string, string>;
  artifact: RuntimeArtifact;
  manifest: GeneratedOutputContentManifest;
  block(code: string, message: string): void;
}): void {
  const documents: Array<{ path: string; html: string; document: DefaultTreeAdapterMap["document"] }> = [];
  for (const [path, html] of Object.entries(input.htmlByPath)) {
    const parseErrors: string[] = [];
    try {
      const document = parse(html, { onParseError: (error) => parseErrors.push(error.code) }) as DefaultTreeAdapterMap["document"];
      if (parseErrors.length > 0) input.block(`html_parser_recovery_required:${path}`, `Generated HTML requires parser recovery: ${path}.`);
      documents.push({ path, html, document });
    } catch {
      input.block(`html_invalid:${path}`, `Generated HTML could not be parsed: ${path}.`);
    }
  }
  const elements = documents.flatMap((item) => allElements(item.document));
  const visibleText = normalizeText(documents.map((item) => textContent(item.document)).join(" "));
  const allHtml = documents.map((item) => item.html).join("\n");
  for (const required of input.manifest.requiredContent) {
    const found = required.match === "html"
      ? allHtml.includes(required.value)
      : visibleText.includes(normalizeText(required.value));
    if (!found) input.block(`required_content_missing:${required.id}`, `Required trusted content is missing: ${required.id}.`);
  }
  for (const required of input.manifest.requiredAssets) {
    if (input.artifact.assetFingerprintMap[required.path] !== required.sha256) {
      input.block(`required_asset_missing:${required.path}`, `Required asset fingerprint is missing or changed: ${required.path}.`);
    }
  }

  const allowedTargets = new Map(input.manifest.requiredNavigation.map((item) => [item.target, item.kind]));
  const hrefs = elements
    .filter((element) => element.tagName === "a")
    .map((element) => attribute(element, "href"))
    .filter((value): value is string => Boolean(value));
  for (const required of input.manifest.requiredNavigation) {
    if (!hrefs.includes(required.target)) {
      input.block(`required_navigation_missing:${required.id}`, `Required navigation target is missing: ${required.id}.`);
    }
  }
  const ids = new Set(elements.map((element) => attribute(element, "id")).filter((value): value is string => Boolean(value)));
  for (const href of hrefs) {
    const kind = allowedTargets.get(href);
    if (!kind) {
      input.block(`navigation_target_unapproved:${href}`, `Navigation target is outside the trusted manifest: ${href}.`);
      continue;
    }
    if (kind === "local_anchor" && (!href.startsWith("#") || !ids.has(href.slice(1)))) {
      input.block(`local_anchor_broken:${href}`, `Local anchor does not resolve in the generated homepage: ${href}.`);
    }
    if (kind === "local_route" && !input.manifest.scope.outputPaths.includes(href.split(/[?#]/, 1)[0] || "/")) {
      input.block(`local_route_unsupported:${href}`, `Local route is not included in the supported delivery scope: ${href}.`);
    }
    if (kind === "external_url" && !/^https:\/\//.test(href)) {
      input.block(`external_navigation_invalid:${href}`, `External navigation must be an explicit HTTPS URL: ${href}.`);
    }
    if (kind === "mailto" && !href.startsWith("mailto:")) input.block(`mailto_invalid:${href}`, "Mail link is invalid.");
    if (kind === "tel" && !href.startsWith("tel:")) input.block(`tel_invalid:${href}`, "Telephone link is invalid.");
  }
}

export function validateGeneratedOutputBuildEvidence(value: unknown): GeneratedOutputBuildEvidence | null {
  if (!isRecord(value)) return null;
  const evidence = value as unknown as GeneratedOutputBuildEvidence;
  const { evidenceSha256: _hash, ...unsigned } = evidence;
  if (
    evidence.version !== GENERATED_OUTPUT_BUILD_EVIDENCE_VERSION ||
    evidence.establishedBy !== "server_astro_build_export_pipeline" ||
    evidence.proofVersion !== "gnr8-astro-build-export-proof:v1" ||
    evidence.adapterId !== ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID ||
    evidence.conversionVersion !== ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION ||
    evidence.exportManifestVersion !== ASTRO_STATIC_EXPORT_MANIFEST_VERSION ||
    ![evidence.candidateId, evidence.producerKind, evidence.producerVersion,
      evidence.rendererCompatibilityVersion].every(isNonEmptyText) ||
    !Array.isArray(evidence.outputPaths) ||
    !validOutputPaths(evidence.outputPaths) ||
    !isValidSourceCaptureEvidence(evidence.sourceCapture) ||
    !isValidToolVersions(evidence.toolVersions) ||
    !isValidBuildExecution(evidence.buildExecution) ||
    !isValidSubmissionAttestation(evidence.submissionAttestation) ||
    !isIsoTimestamp(evidence.buildCompletedAt) ||
    !isNonEmptyText(evidence.contentManifestSourceRef) ||
    !(evidence.derivedFromEvidenceSha256 === null || isSha256(evidence.derivedFromEvidenceSha256)) ||
    ![evidence.candidateContentSha256, evidence.candidateStorageSha256, evidence.sourceSnapshotSha256,
      evidence.exportSha256, evidence.assetFingerprintMapSha256, evidence.evidenceSha256].every(isSha256) ||
    sha256Hex(stableStringify(unsigned)) !== evidence.evidenceSha256
  ) return null;
  return structuredClone(evidence);
}

const validateBuildEvidence = validateGeneratedOutputBuildEvidence;

function isValidContentManifest(manifest: GeneratedOutputContentManifest): boolean {
  if (manifest.version !== GENERATED_OUTPUT_CONTENT_MANIFEST_VERSION || !isSha256(manifest.manifestSha256)) return false;
  const { manifestSha256: _hash, ...unsigned } = manifest;
  return sha256Hex(stableStringify(unsigned)) === manifest.manifestSha256 &&
    isNonEmptyText(manifest.sourceRef) &&
    ["homepage_only", "static_site"].includes(manifest.scope.kind) &&
    validOutputPaths(manifest.scope.outputPaths) &&
    (manifest.scope.kind !== "homepage_only" || stableStringify(manifest.scope.outputPaths) === stableStringify(["/"])) &&
    manifest.scope.allowedPublishStages.length > 0 &&
    manifest.scope.allowedPublishStages.every((stage) => ["shadow", "canary", "production"].includes(stage)) &&
    manifest.scope.unsupportedCapabilities.every(isNonEmptyText) &&
    manifest.requiredContent.every((item) => isNonEmptyText(item.id) && isNonEmptyText(item.value) && ["text", "html"].includes(item.match)) &&
    manifest.requiredNavigation.every((item) => isNonEmptyText(item.id) && isNonEmptyText(item.target) &&
      ["local_anchor", "local_route", "external_url", "mailto", "tel"].includes(item.kind)) &&
    manifest.requiredAssets.every((item) => isNonEmptyText(item.path) && isSha256(item.sha256));
}

export function validateGeneratedOutputReviewRecord(value: unknown): GeneratedOutputReviewRecord | null {
  if (!isRecord(value)) return null;
  const review = value as unknown as GeneratedOutputReviewRecord;
  if (review.version !== GENERATED_OUTPUT_REVIEW_VERSION || !isSha256(review.reviewSha256)) return null;
  const { reviewSha256: _hash, ...unsigned } = review;
  const valid = sha256Hex(stableStringify(unsigned)) === review.reviewSha256 &&
    review.policyVersion === GENERATED_OUTPUT_ELIGIBILITY_POLICY_VERSION &&
    ["APPROVED", "REJECTED"].includes(review.decision) &&
    [review.reviewId, review.artifactId, review.candidateId, review.reviewerActorId].every(isNonEmptyText) &&
    [review.artifactBundleSha256, review.candidateContentSha256, review.contentManifestSha256,
      review.technicalEvaluationSha256].every(isSha256) &&
    isIsoTimestamp(review.reviewedAt);
  return valid ? structuredClone(review) : null;
}

function isValidReviewRecord(review: GeneratedOutputReviewRecord): boolean {
  return validateGeneratedOutputReviewRecord(review) !== null;
}

function reviewMatchesTechnical(review: GeneratedOutputReviewRecord, technical: GeneratedOutputTechnicalEligibility): boolean {
  return review.policyVersion === technical.policyVersion &&
    review.artifactId === technical.artifactId &&
    review.artifactBundleSha256 === technical.artifactBundleSha256 &&
    review.candidateId === technical.candidateId &&
    review.candidateContentSha256 === technical.candidateContentSha256 &&
    review.contentManifestSha256 === technical.contentManifestSha256 &&
    review.technicalEvaluationSha256 === technical.evidenceSha256;
}

function evaluateSourceCaptureBinding(input: {
  buildEvidence: GeneratedOutputBuildEvidence;
  sourceCaptureSiteVersion: CanonicalSiteVersionSnapshot | null;
  sourceCaptureArtifact: RuntimeArtifact | null;
  block(code: string, message: string): void;
}): void {
  const { sourceCapture } = input.buildEvidence;
  const version = input.sourceCaptureSiteVersion;
  const artifact = input.sourceCaptureArtifact;
  if (!version || !artifact) {
    input.block("source_capture_evidence_missing", "The exact retained source-capture runtime artifact is unavailable.");
    return;
  }
  if (
    version.id !== sourceCapture.siteVersionId ||
    version.siteId !== sourceCapture.runtimeSiteId ||
    version.artifactId !== sourceCapture.artifactId ||
    artifact.id !== sourceCapture.artifactId ||
    artifact.siteId !== sourceCapture.runtimeSiteId ||
    artifact.siteVersionId !== sourceCapture.siteVersionId
  ) {
    input.block("source_capture_lineage_mismatch", "Source-capture site, version, and artifact lineage do not match build evidence.");
  }
  if (
    artifact.bundleSha256 !== sourceCapture.artifactBundleSha256 ||
    computeArtifactBundleSha256(artifact) !== sourceCapture.artifactBundleSha256 ||
    sha256Hex(artifact.htmlByPath["/"] ?? "") !== sourceCapture.htmlSha256
  ) {
    input.block("source_capture_hash_mismatch", "Retained source-capture bytes do not match build evidence.");
  }
  const provenance = isRecord(version.importProvenanceSummary)
    ? version.importProvenanceSummary as Record<string, unknown>
    : null;
  const executionIdentity = isRecord(provenance?.executionIdentity)
    ? provenance.executionIdentity as Record<string, unknown>
    : null;
  if (
    executionIdentity?.snapshotId !== sourceCapture.snapshotId ||
    executionIdentity?.snapshotRunId !== sourceCapture.snapshotRunId
  ) {
    input.block("source_capture_identity_mismatch", "Retained capture snapshot identity does not match build evidence.");
  }
}

function isValidSourceCaptureEvidence(value: unknown): value is GeneratedOutputBuildEvidence["sourceCapture"] {
  if (!isRecord(value)) return false;
  return [
    value.sourceUrl,
    value.snapshotId,
    value.snapshotRunId,
    value.runtimeSiteId,
    value.siteVersionId,
    value.artifactId,
  ].every(isNonEmptyText) &&
    /^https:\/\//.test(String(value.sourceUrl)) &&
    isIsoTimestamp(value.capturedAt) &&
    isSha256(value.artifactBundleSha256) &&
    isSha256(value.htmlSha256);
}

function validOutputPaths(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value[0] === "/" &&
    new Set(value).size === value.length &&
    value.every(isGeneratedOutputRoutePath) &&
    [...value].sort((a, b) => a.localeCompare(b)).every((path, index) => path === value[index]);
}

function isValidToolVersions(value: unknown): value is GeneratedOutputBuildEvidence["toolVersions"] {
  return isRecord(value) && [value.node, value.pnpm, value.astro].every(isNonEmptyText);
}

function isValidBuildExecution(value: unknown): value is GeneratedOutputBuildEvidence["buildExecution"] {
  return isRecord(value) &&
    isSha256(value.receiptSha256) &&
    value.installationCompleted === true &&
    value.buildCompleted === true &&
    value.sourceUnchanged === true &&
    value.cleanupCompleted === true &&
    value.workspaceRemoved === true &&
    value.cleanupErrorCount === 0;
}

function isValidSubmissionAttestation(value: unknown): value is GeneratedOutputBuildEvidence["submissionAttestation"] {
  return isRecord(value) &&
    ["authenticated_preview_package", "direct_server_execution"].includes(String(value.mode)) &&
    isNonEmptyText(value.operationId) &&
    isSha256(value.packageSha256) &&
    isNonEmptyText(value.submittedByActorId) &&
    isIsoTimestamp(value.receivedAt);
}

function sameOwnership(
  identity: AstroProductionCandidateRecord["identity"],
  ownership: AstroProductionCandidateOwnership,
): boolean {
  return identity.runtimeSiteId === ownership.runtimeSiteId &&
    identity.siteVersionId === ownership.siteVersionId &&
    identity.ownershipSiteId === ownership.ownershipSiteId &&
    identity.organizationId === ownership.organizationId &&
    identity.agencyId === ownership.agencyId;
}

function sameArtifactBytes(record: AstroProductionCandidateRecord, artifact: RuntimeArtifact): boolean {
  return record.schemaVersion === ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION &&
    record.recordKind === ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND &&
    artifact.rendererCompatibilityVersion === record.candidate.rendererCompatibilityVersion &&
    stableStringify(artifact.htmlByPath) === stableStringify(record.candidate.htmlByPath) &&
    artifact.compiledTokenStyles === record.candidate.compiledTokenStyles &&
    stableStringify(artifact.assetFingerprintMap) === stableStringify(record.candidate.assetFingerprintMap);
}

function allElements(root: HtmlNode): HtmlElement[] {
  const output: HtmlElement[] = [];
  const walk = (node: HtmlNode): void => {
    if ("tagName" in node && Array.isArray((node as HtmlElement).attrs)) output.push(node as HtmlElement);
    for (const child of "childNodes" in node ? node.childNodes ?? [] : []) walk(child);
  };
  walk(root);
  return output;
}

function attribute(element: HtmlElement, name: string): string | null {
  return element.attrs.find((item) => item.name === name)?.value ?? null;
}

function textContent(node: HtmlNode): string {
  if ("value" in node && typeof node.value === "string") return node.value;
  return ("childNodes" in node ? node.childNodes ?? [] : []).map(textContent).join(" ");
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim() && !value.includes("\0");
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function computeArtifactBundleSha256(artifact: RuntimeArtifact): string {
  return computeRuntimeArtifactBundleSha256({
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
  });
}
