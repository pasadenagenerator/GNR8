import assert from "node:assert/strict";
import test from "node:test";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import {
  ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
  computeRuntimeArtifactBundleSha256,
} from "@/gnr8/runtime/astro-artifact-materialization";
import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import {
  createAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
} from "./astro-production-candidate-record";
import {
  createGeneratedOutputBuildEvidence,
  createGeneratedOutputContentManifest,
  createGeneratedOutputReviewRecord,
  evaluateGeneratedOutputPublicationDecision,
  evaluateGeneratedOutputTechnicalEligibility,
  type GeneratedOutputBuildEvidence,
  type GeneratedOutputContentManifest,
} from "./generated-output-eligibility";
import {
  GeneratedOutputPublicationBlockedError,
  classifyGeneratedOutputProvenance,
  enforceGeneratedOutputPublicationEligibility,
} from "./generated-output-publication-guard";

const SITE_ID = "runtime-generated-output";
const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_ID = "astro_candidate_22222222222242228222222222222222";
const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: SITE_ID,
  siteVersionId: VERSION_ID,
  ownershipSiteId: "33333333-3333-4333-8333-333333333333",
  organizationId: "44444444-4444-4444-8444-444444444444",
  agencyId: "55555555-5555-4555-8555-555555555555",
};
const VALID_HTML = "<!doctype html><html><body><main><h1>Trusted homepage</h1><a href=\"#contact\">Contact</a><section id=\"contact\"><p>Ready to help</p></section></main></body></html>";

test("valid generated output passes technical policy and an exact explicit review unlocks only target-readiness evaluation", async () => {
  const fixture = buildFixture();
  const technical = evaluate(fixture);
  assert.equal(technical.status, "PASS", JSON.stringify(technical.blockerReasons));
  assert.deepEqual(technical.blockerReasons, []);

  const review = createGeneratedOutputReviewRecord({
    reviewId: "review-generated-1",
    decision: "APPROVED",
    policyVersion: technical.policyVersion,
    artifactId: technical.artifactId,
    artifactBundleSha256: technical.artifactBundleSha256,
    candidateId: technical.candidateId!,
    candidateContentSha256: technical.candidateContentSha256!,
    contentManifestSha256: technical.contentManifestSha256,
    technicalEvaluationSha256: technical.evidenceSha256,
    reviewerActorId: "reviewer-1",
    reviewedAt: "2026-10-01T08:00:00.000Z",
  });
  const decision = evaluateGeneratedOutputPublicationDecision({ technical, review });
  assert.equal(decision.review.status, "APPROVED");
  assert.equal(decision.activation, "READY_FOR_TARGET_READINESS");
  assert.equal(decision.targetReadiness, "NOT_EVALUATED");

  const resolved = await enforceGeneratedOutputPublicationEligibility({
    siteVersion: fixture.siteVersion,
    artifact: fixture.artifact,
    publishStage: "shadow",
    resolver: async () => decision,
  });
  assert.equal(resolved?.technical.evidenceSha256, technical.evidenceSha256);
});

test("technical policy blocks missing build evidence, ownership drift, corrupt hashes, missing content/assets, broken anchors, unsafe HTML, and unsupported routes", () => {
  const missingBuild = buildFixture();
  assertBlocked(evaluate({ ...missingBuild, buildEvidence: null }), "build_evidence_missing_or_invalid");

  const wrongOwnership = buildFixture();
  assertBlocked(evaluate({ ...wrongOwnership, ownership: { ...OWNERSHIP, agencyId: "66666666-6666-4666-8666-666666666666" } }), "ownership_mismatch");

  const corrupt = buildFixture();
  corrupt.artifact.bundleSha256 = "0".repeat(64);
  assertBlocked(evaluate(corrupt), "artifact_bundle_hash_mismatch");

  const missingContent = buildFixture();
  missingContent.contentManifest = manifest({ requiredText: "Not present" });
  assertBlocked(evaluate(missingContent), "required_content_missing:trusted_heading");

  const missingAsset = buildFixture();
  missingAsset.contentManifest = manifest({ requiredAssetSha256: "0".repeat(64) });
  assertBlocked(evaluate(missingAsset), "required_asset_missing:styles/global.css");

  const brokenAnchor = buildFixture(VALID_HTML.replace('id="contact"', 'id="other"'));
  assertBlocked(evaluate(brokenAnchor), "local_anchor_broken:#contact");

  const unsafe = buildFixture();
  unsafe.artifact.htmlByPath["/"] = unsafe.artifact.htmlByPath["/"].replace("</body>", "<script>alert(1)</script></body>");
  unsafe.artifact.bundleSha256 = bundleHash(unsafe.artifact);
  assertBlocked(evaluate(unsafe), "candidate_artifact_bytes_mismatch");

  const unsupportedRoute = buildFixture();
  unsupportedRoute.artifact.htmlByPath["/child"] = unsupportedRoute.artifact.htmlByPath["/"];
  unsupportedRoute.artifact.bundleSha256 = bundleHash(unsupportedRoute.artifact);
  assertBlocked(evaluate(unsupportedRoute), "unsupported_output_routes");
});

test("missing or stale review blocks publication even when technical checks pass", async () => {
  const fixture = buildFixture();
  const technical = evaluate(fixture);
  const missing = evaluateGeneratedOutputPublicationDecision({ technical, review: null });
  assert.equal(missing.technical.status, "PASS", JSON.stringify(missing.technical.blockerReasons));
  assert.equal(missing.review.status, "MISSING");
  assert.equal(missing.activation, "BLOCKED");

  const staleReview = createGeneratedOutputReviewRecord({
    reviewId: "review-stale",
    decision: "APPROVED",
    policyVersion: technical.policyVersion,
    artifactId: technical.artifactId,
    artifactBundleSha256: "f".repeat(64),
    candidateId: technical.candidateId!,
    candidateContentSha256: technical.candidateContentSha256!,
    contentManifestSha256: technical.contentManifestSha256,
    technicalEvaluationSha256: technical.evidenceSha256,
    reviewerActorId: "reviewer-1",
    reviewedAt: "2026-10-01T08:00:00.000Z",
  });
  const stale = evaluateGeneratedOutputPublicationDecision({ technical, review: staleReview });
  assert.equal(stale.review.status, "STALE");
  await assert.rejects(
    enforceGeneratedOutputPublicationEligibility({
      siteVersion: fixture.siteVersion,
      artifact: fixture.artifact,
      publishStage: "shadow",
      resolver: async () => stale,
    }),
    (error: unknown) => error instanceof GeneratedOutputPublicationBlockedError &&
      error.blockerCodes.includes("generated_output_review_stale"),
  );
});

test("dispatch preserves imported-site governance and fails closed for caller labels or mixed generated provenance", async () => {
  const fixture = buildFixture();
  const importedArtifact = structuredClone(fixture.artifact);
  importedArtifact.manifest = { paths: ["/"], artifactSource: "deterministic_runtime" };
  importedArtifact.bundleSha256 = bundleHash(importedArtifact);
  const importedVersion = { ...fixture.siteVersion, importProvenanceSummary: null };
  assert.deepEqual(classifyGeneratedOutputProvenance({ siteVersion: importedVersion, artifact: importedArtifact }), {
    kind: "source_migration",
  });
  assert.equal(await enforceGeneratedOutputPublicationEligibility({
    siteVersion: importedVersion,
    artifact: importedArtifact,
    publishStage: "production",
  }), null);

  const forged = structuredClone(importedArtifact);
  forged.manifest.adapterId = "astro-static-site";
  const mixedVersion = {
    ...fixture.siteVersion,
    importProvenanceSummary: { kind: "astro_generated_content_successor_v1" } as never,
  };
  const classification = classifyGeneratedOutputProvenance({ siteVersion: mixedVersion, artifact: forged });
  assert.equal(classification.kind, "unknown_or_mixed_provenance");
  await assert.rejects(
    enforceGeneratedOutputPublicationEligibility({
      siteVersion: mixedVersion,
      artifact: forged,
      publishStage: "shadow",
    }),
    GeneratedOutputPublicationBlockedError,
  );
});

function evaluate(fixture: Omit<ReturnType<typeof buildFixture>, "buildEvidence"> & {
  ownership?: AstroProductionCandidateOwnership;
  buildEvidence?: GeneratedOutputBuildEvidence | null;
}) {
  return evaluateGeneratedOutputTechnicalEligibility({
    siteVersion: fixture.siteVersion,
    artifact: fixture.artifact,
    authoritativeOwnership: fixture.ownership ?? OWNERSHIP,
    candidateRecord: fixture.record,
    buildEvidence: fixture.buildEvidence,
    contentManifest: fixture.contentManifest,
    sourceCaptureSiteVersion: fixture.sourceCaptureSiteVersion,
    sourceCaptureArtifact: fixture.sourceCaptureArtifact,
  });
}

function buildFixture(html = VALID_HTML) {
  const candidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId: CANDIDATE_ID,
    siteId: SITE_ID,
    siteVersionId: VERSION_ID,
    html,
  });
  const record = createAstroProductionCandidateRecord({
    candidate,
    ownership: OWNERSHIP,
    registration: {
      registeredByActorId: "actor-generated",
      producerKind: "chs_source_backed_astro_build_export_bridge",
      producerVersion: "v1",
      producerRef: "source-ref",
      idempotencyKey: "generated-idempotency",
      correlationId: "generated-correlation",
    },
    storedAt: "2026-10-01T07:00:00.000Z",
  });
  const artifact = artifactFrom(record);
  const sourceCapture = sourceCaptureFixture();
  const contentManifest = manifest();
  return {
    record,
    artifact,
    siteVersion: siteVersionFrom(record),
    buildEvidence: buildEvidenceFrom(record, sourceCapture, contentManifest),
    contentManifest,
    sourceCaptureSiteVersion: sourceCapture.siteVersion,
    sourceCaptureArtifact: sourceCapture.artifact,
  };
}

function artifactFrom(record: AstroProductionCandidateRecord): RuntimeArtifact {
  const promotion = {
    version: ASTRO_RUNTIME_ARTIFACT_MATERIALIZATION_VERSION,
    candidateId: record.identity.candidateId,
    candidateContentSha256: record.candidate.contentSha256,
    candidateStorageSha256: record.storageSha256,
    sourceSnapshotSha256: record.candidate.manifest.provenance.sourceSnapshotSha256,
    exportSha256: record.candidate.manifest.provenance.exportSha256,
    convertedArtifactSha256: record.candidate.contentSha256,
    promotionIdentitySha256: "f".repeat(64),
    actorUserId: "actor-generated",
    idempotencyKey: "promotion-idempotency",
    htmlTransformation: "none",
    governanceEvaluation: { status: "evaluated", decision: "ALLOW", blockerCodes: [] },
  };
  const manifest = {
    siteId: SITE_ID,
    siteVersionId: VERSION_ID,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    paths: ["/"],
    artifactSource: "astro_candidate_materialization",
    astroCandidateManifest: structuredClone(record.candidate.manifest),
    astroCandidateRecord: {
      schemaVersion: record.schemaVersion,
      recordKind: record.recordKind,
      identity: structuredClone(record.identity),
      registration: structuredClone(record.registration),
      storageSha256: record.storageSha256,
    },
    astroCandidatePromotion: promotion,
    publishStage: "shadow",
    shadowRestricted: false,
    enforcementDecision: "ALLOW",
  };
  const artifact: RuntimeArtifact = {
    id: "66666666-6666-4666-8666-666666666666",
    siteId: SITE_ID,
    siteVersionId: VERSION_ID,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    htmlByPath: structuredClone(record.candidate.htmlByPath),
    compiledTokenStyles: record.candidate.compiledTokenStyles,
    assetFingerprintMap: structuredClone(record.candidate.assetFingerprintMap),
    manifest,
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["legacy_retained_not_dispatched"],
      pageRolloutPolicyState: ["legacy_retained_not_dispatched"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["ALLOW"], production: ["DENY"] },
      siteGateState: "legacy_retained_not_dispatched",
      siteRolloutPolicyState: "legacy_retained_not_dispatched",
      siteEnforcementState: { shadow: "ALLOW", canary: "ALLOW", production: "DENY" },
      publishStage: "shadow",
    },
    bundleSha256: "",
    createdAt: "2026-10-01T07:05:00.000Z",
  };
  artifact.bundleSha256 = bundleHash(artifact);
  return artifact;
}

function siteVersionFrom(record: AstroProductionCandidateRecord): CanonicalSiteVersionSnapshot {
  const page = importHtmlToPage({ slug: "/", html: record.candidate.htmlByPath["/"] });
  return {
    id: VERSION_ID,
    siteId: SITE_ID,
    versionNo: 1,
    state: "APPROVED",
    source: "migration",
    actor: "actor-generated",
    createdAt: "2026-10-01T07:00:00.000Z",
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    artifactId: "66666666-6666-4666-8666-666666666666",
    importProvenanceSummary: { kind: "astro_generated_content_successor_v1" } as never,
    pages: [{
      id: "page-version-generated",
      siteVersionId: VERSION_ID,
      pageId: page.id,
      path: "/",
      title: page.title ?? null,
      structureModel: { sections: page.sections.map((section, order) => ({ id: section.id, type: section.type, order })) },
      contentModel: { sectionProps: Object.fromEntries(page.sections.map((section) => [section.id, section.props ?? {}])) },
      styleTokens: {},
      assetGraph: [{ path: "styles/global.css", mediaType: "text/css", required: true }],
      semanticSignals: [],
      migrationGovernance: page.migrationDiagnostics,
      source: "migration",
      actor: "actor-generated",
      createdAt: "2026-10-01T07:00:00.000Z",
    }],
  };
}

function buildEvidenceFrom(
  record: AstroProductionCandidateRecord,
  sourceCapture: ReturnType<typeof sourceCaptureFixture>,
  contentManifest: GeneratedOutputContentManifest,
): GeneratedOutputBuildEvidence {
  return createGeneratedOutputBuildEvidence({
    establishedBy: "server_astro_build_export_pipeline",
    proofVersion: "gnr8-astro-build-export-proof:v1",
    candidateId: record.identity.candidateId,
    candidateContentSha256: record.candidate.contentSha256,
    candidateStorageSha256: record.storageSha256,
    producerKind: record.registration.producerKind,
    producerVersion: record.registration.producerVersion,
    adapterId: record.candidate.manifest.adapterId,
    conversionVersion: record.candidate.manifest.conversionVersion,
    exportManifestVersion: record.candidate.manifest.provenance.exportManifestVersion,
    rendererCompatibilityVersion: record.candidate.rendererCompatibilityVersion,
    sourceCapture: {
      sourceUrl: "https://www.chs.si/",
      snapshotId: "capture-snapshot-1",
      snapshotRunId: "capture-run-1",
      capturedAt: "2026-10-01T06:00:00.000Z",
      runtimeSiteId: sourceCapture.siteVersion.siteId,
      siteVersionId: sourceCapture.siteVersion.id,
      artifactId: sourceCapture.artifact.id,
      artifactBundleSha256: sourceCapture.artifact.bundleSha256,
      htmlSha256: sha256Hex(sourceCapture.artifact.htmlByPath["/"]),
    },
    toolVersions: { node: "22.22.0", pnpm: "10.17.1", astro: "5.14.1" },
    buildExecution: {
      receiptSha256: "9".repeat(64),
      installationCompleted: true,
      buildCompleted: true,
      sourceUnchanged: true,
      cleanupCompleted: true,
      workspaceRemoved: true,
      cleanupErrorCount: 0,
    },
    submissionAttestation: {
      mode: "authenticated_preview_package",
      operationId: "01c10f4b-ee63-4359-9a0d-039132cf7e35",
      packageSha256: "8".repeat(64),
      submittedByActorId: "reviewer-1",
      receivedAt: "2026-10-01T07:01:00.000Z",
    },
    buildCompletedAt: "2026-10-01T07:00:00.000Z",
    sourceSnapshotSha256: record.candidate.manifest.provenance.sourceSnapshotSha256,
    exportSha256: record.candidate.manifest.provenance.exportSha256,
    outputPaths: ["/"],
    assetFingerprintMapSha256: sha256Hex(stableStringify(record.candidate.assetFingerprintMap)),
    contentManifestSourceRef: contentManifest.sourceRef,
    derivedFromEvidenceSha256: null,
  });
}

function sourceCaptureFixture(): { siteVersion: CanonicalSiteVersionSnapshot; artifact: RuntimeArtifact } {
  const siteId = "runtime-source-capture";
  const siteVersionId = "77777777-7777-4777-8777-777777777777";
  const artifact: RuntimeArtifact = {
    id: "88888888-8888-4888-8888-888888888888",
    siteId,
    siteVersionId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<!doctype html><html><body>Captured CHS homepage</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { paths: ["/"], artifactSource: "source_capture" },
    publishStage: "shadow",
    shadowRestricted: true,
    artifactGovernance: {} as RuntimeArtifact["artifactGovernance"],
    bundleSha256: "",
    createdAt: "2026-10-01T06:00:00.000Z",
  };
  artifact.bundleSha256 = bundleHash(artifact);
  return {
    artifact,
    siteVersion: {
      id: siteVersionId,
      siteId,
      versionNo: 1,
      state: "DRAFT",
      source: "migration",
      actor: "capture-actor",
      createdAt: "2026-10-01T06:00:00.000Z",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      artifactId: artifact.id,
      importProvenanceSummary: {
        executionIdentity: { snapshotId: "capture-snapshot-1", snapshotRunId: "capture-run-1" },
      } as never,
      pages: [],
    },
  };
}

function manifest(input: { requiredText?: string; requiredAssetSha256?: string } = {}): GeneratedOutputContentManifest {
  return createGeneratedOutputContentManifest({
    sourceRef: "trusted-source-manifest-1",
    scope: {
      kind: "homepage_only",
      outputPaths: ["/"],
      allowedPublishStages: ["shadow"],
      unsupportedCapabilities: ["child_route_generation", "binary_asset_storage"],
    },
    requiredContent: [{ id: "trusted_heading", value: input.requiredText ?? "Trusted homepage", match: "text" }],
    requiredNavigation: [{ id: "contact", kind: "local_anchor", target: "#contact" }],
    requiredAssets: [{ path: "styles/global.css", sha256: input.requiredAssetSha256 ?? "d".repeat(64) }],
  });
}

function bundleHash(artifact: RuntimeArtifact): string {
  return computeRuntimeArtifactBundleSha256({
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles,
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
  });
}

function assertBlocked(result: ReturnType<typeof evaluateGeneratedOutputTechnicalEligibility>, code: string): void {
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.blockerReasons.some((item) => item.code === code), true, JSON.stringify(result.blockerReasons));
}
