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
  ASTRO_OBJECT_CANDIDATE_RECORD_KIND,
  ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION,
} from "./astro-production-candidate-object-record";
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

test("object-backed v3 candidates retain generated-output provenance eligibility", () => {
  const fixture = buildFixture();
  const artifact = structuredClone(fixture.artifact);
  const candidateRecord = artifact.manifest.astroCandidateRecord as Record<string, unknown>;
  candidateRecord.schemaVersion = ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION;
  candidateRecord.recordKind = ASTRO_OBJECT_CANDIDATE_RECORD_KIND;
  artifact.bundleSha256 = bundleHash(artifact);

  assert.deepEqual(classifyGeneratedOutputProvenance({
    siteVersion: fixture.siteVersion,
    artifact,
  }), {
    kind: "supported_generated_output",
    candidateId: fixture.record.identity.candidateId,
    candidateContentSha256: fixture.record.candidate.contentSha256,
    candidateStorageSha256: fixture.record.storageSha256,
  });
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

test('declared HTTP navigation stays external, including legacy mislabeled manifests; undeclared and unsafe links remain blocked', () => {
  const href = 'http://partner.example/catalog';
  for (const kind of ['external_url', 'local_route'] as const) {
    const f = buildFixture(VALID_HTML.replace('</main>', `<a href="${href}">Partner</a></main>`));
    f.contentManifest = createGeneratedOutputContentManifest({sourceRef:f.contentManifest.sourceRef,scope:f.contentManifest.scope,requiredContent:f.contentManifest.requiredContent,requiredAssets:f.contentManifest.requiredAssets,
      requiredNavigation:[...f.contentManifest.requiredNavigation,{id:'partner',kind,target:href}]});
    const retained = JSON.stringify(f.contentManifest);
    assert.equal(evaluate(f).status, 'PASS', JSON.stringify(evaluate(f).blockerReasons));
    assert.equal(JSON.stringify(f.contentManifest), retained);
    f.contentManifest = createGeneratedOutputContentManifest({sourceRef:f.contentManifest.sourceRef,scope:f.contentManifest.scope,requiredContent:f.contentManifest.requiredContent,requiredAssets:f.contentManifest.requiredAssets,
      requiredNavigation:f.contentManifest.requiredNavigation.filter(item=>item.id!=='partner')});
    assertBlocked(evaluate(f), `navigation_target_unapproved:${href}`);
  }
  assert.throws(()=>buildFixture(VALID_HTML.replace('</main>', '<a href="javascript:alert(1)">Unsafe</a></main>')), /executable attributes/);
  for (const target of ['//partner.example/path','http://user:password@partner.example/']) {
    const f = buildFixture(VALID_HTML.replace('</main>', `<a href="${target}">Partner</a></main>`));
    f.contentManifest = createGeneratedOutputContentManifest({sourceRef:f.contentManifest.sourceRef,scope:f.contentManifest.scope,requiredContent:f.contentManifest.requiredContent,requiredAssets:f.contentManifest.requiredAssets,
      requiredNavigation:[...f.contentManifest.requiredNavigation,{id:'partner',kind:'external_url',target}]});
    assertBlocked(evaluate(f), `external_navigation_invalid:${target}`);
  }
});

test('native contact cannot activate while durable delivery is unconfigured',async()=>{
 const {siteVersion,artifact}=buildFixture()
 artifact.manifest.generatedOutputSourceWorkspace={acceptedFunctionalReductions:{kind:'retained-presentation-v1',contact:{recipient:'approved@example.com',recipientConfirmed:true}}}
 for(const publishStage of ['canary','production'] as const) await assert.rejects(enforceGeneratedOutputPublicationEligibility({siteVersion,artifact,publishStage}), (error:unknown)=>error instanceof GeneratedOutputPublicationBlockedError && error.blockerCodes.includes('native_contact_delivery_unconfigured'))
})

test('owned image anchors require capture scope, exact required asset and matching fingerprint', () => {
  const path = '/api/gnr8/runtime/preview-assets/runtime-source-capture/77777777-7777-4777-8777-777777777777/photos/image.jpg';
  const f = buildFixture(VALID_HTML.replace('</main>',`<a href="${path}">Photo</a></main>`));
  f.artifact.manifest.generatedOutputBuildEvidence = f.buildEvidence;
  f.artifact.assetFingerprintMap[path] = 'e'.repeat(64);
  f.contentManifest = createGeneratedOutputContentManifest({...f.contentManifest,requiredAssets:[...f.contentManifest.requiredAssets,{path,sha256:'e'.repeat(64)}]});
  const blockedNavigation = () => evaluate(f).blockerReasons.some(x=>x.code===`navigation_target_unapproved:${path}`);
  assert.equal(blockedNavigation(),false);
  f.artifact.assetFingerprintMap[path] = 'f'.repeat(64);
  assert.equal(blockedNavigation(),true);
  f.artifact.assetFingerprintMap[path] = 'e'.repeat(64);
  f.artifact.manifest.generatedOutputBuildEvidence = {...f.buildEvidence,sourceCapture:{...f.buildEvidence.sourceCapture,runtimeSiteId:'other'}};
  assert.equal(blockedNavigation(),true);
});

test('public preparation rejects an isolated resource candidate before creating a version',async()=>{
  const {prepareRetainedAstroPublicArtifact}=await import('./astro-public-preparation');
  const f=buildFixture();
  const record=structuredClone(f.record) as typeof f.record & {candidate:{exportedFiles?:unknown[]}};
  record.candidate.exportedFiles=[];
  let writes=0;
  await assert.rejects(prepareRetainedAstroPublicArtifact({
    sourceSiteVersionId:f.siteVersion.id,sourceArtifactId:f.artifact.id,
    expectedSourceArtifactSha256:f.artifact.bundleSha256,
    expectedSourceCandidateId:f.record.identity.candidateId,host:'retained.example.com',actor:'owner',
  },{
    composition:(()=>({runtimeStore:{readContext:async()=>({siteVersion:f.siteVersion,artifact:f.artifact})},
      ownershipResolver:{resolve:async()=>OWNERSHIP},candidateRepository:{read:async()=>record}})) as never,
    readModel:(async()=>({candidateId:f.record.identity.candidateId,decision:{technical:{status:'PASS'}}})) as never,
    store:{createSiteVersionFromMigration:async()=>{writes++;throw Error('unexpected write');}} as never,
    lifecycle:{} as never,
  }),/public_preparation_resource_candidate_unsupported/);
  assert.equal(writes,0);
});

test('explicit retained public derivative passes technical policy but still requires fresh review; lineage drift blocks it', async () => {
  const {buildSuccessorBoundAstroCandidate} = await import('./astro-successor-publication-service');
  const {buildAstroCandidateRuntimeArtifact} = await import('./astro-candidate-promotion-service');
  const {rebindBuildEvidenceToCandidate} = await import('./generated-output-evidence');
  const {PUBLIC_PREPARATION_PRODUCER,PUBLIC_PREPARATION_VERSION,PUBLIC_CONTACT_UPDATE_VERSION,publicPreparationWorkspace} = await import('./astro-public-preparation-contract');
  const f = buildFixture();
  f.artifact.manifest.generatedOutputBuildEvidence=f.buildEvidence;
  f.artifact.manifest.generatedOutputContentManifest=f.contentManifest;
  f.artifact.bundleSha256=bundleHash(f.artifact);
  const versionId='99999999-9999-4999-8999-999999999999';
  const candidateId='astro_candidate_aaaaaaaaaaaa4aaa8aaaaaaaaaaaaaaa';
  const ownership={...OWNERSHIP,siteVersionId:versionId};
  const candidate=buildSuccessorBoundAstroCandidate({source:f.record,successorSiteVersionId:versionId,successorCandidateId:candidateId,createdAt:f.siteVersion.createdAt});
  const record=createAstroProductionCandidateRecord({candidate,ownership,storedAt:f.siteVersion.createdAt,registration:{...f.record.registration,producerKind:PUBLIC_PREPARATION_PRODUCER,producerRef:f.record.identity.candidateId}});
  const buildEvidence=rebindBuildEvidenceToCandidate({sourceEvidence:f.buildEvidence,successorRecord:record});
  const {version: _version, manifestSha256: _hash, ...contentInput}=f.contentManifest;
  const contentManifest=createGeneratedOutputContentManifest({...contentInput,scope:{...f.contentManifest.scope,allowedPublishStages:['production']}});
  const siteVersion={...f.siteVersion,id:versionId,state:'READY_FOR_REVIEW' as const};
  const artifact=buildAstroCandidateRuntimeArtifact({siteVersion,artifact:{...f.artifact,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',siteVersionId:versionId},record,ownership,input:{actorUserId:'preparer',siteVersionId:versionId,candidateId,expectedContentSha256:record.candidate.contentSha256,expectedStorageSha256:record.storageSha256,idempotencyKey:'prepare',generatedOutputEvidence:{buildEvidence,contentManifest}}});
  artifact.manifest.publicPreparation={version:PUBLIC_PREPARATION_VERSION,host:'test.example.com',expectedActivePointer:null,sourceSiteVersionId:f.siteVersion.id,sourceArtifactId:f.artifact.id,sourceArtifactSha256:f.artifact.bundleSha256,sourceCandidateId:f.record.identity.candidateId,sourceCandidateContentSha256:f.record.candidate.contentSha256,sourceTechnicalEvidenceSha256:evaluate(f).evidenceSha256};
  artifact.publishStage='production';artifact.shadowRestricted=false;
  artifact.bundleSha256=bundleHash(artifact);
  const check=()=>evaluateGeneratedOutputTechnicalEligibility({siteVersion,artifact,authoritativeOwnership:ownership,candidateRecord:record,buildEvidence,contentManifest,sourceCaptureSiteVersion:f.sourceCaptureSiteVersion,sourceCaptureArtifact:f.sourceCaptureArtifact,publicSourceArtifact:f.artifact});
  assert.equal(check().status,'PASS',JSON.stringify(check().blockerReasons));
  assert.equal(evaluateGeneratedOutputPublicationDecision({technical:check(),review:null}).activation,'BLOCKED');
  f.artifact.manifest.publicPreparation={...artifact.manifest.publicPreparation as object,sourceSiteVersionId:'previous',sourceArtifactId:'previous-artifact'};
  f.artifact.publishStage='production'; f.artifact.shadowRestricted=false;
  f.artifact.manifest.generatedOutputSourceWorkspace={acceptedFunctionalReductions:{kind:'retained-presentation-v1',scope:'generation-action',acceptedByActor:'original-owner',contact:{recipient:'before@example.com',recipientConfirmed:true},search:'remove'}};
  f.artifact.bundleSha256=bundleHash(f.artifact);
  const preparation: import('./astro-public-preparation-contract').PublicPreparation={...artifact.manifest.publicPreparation as import('./astro-public-preparation-contract').PublicPreparation,
    version:PUBLIC_CONTACT_UPDATE_VERSION,sourceArtifactSha256:f.artifact.bundleSha256,
    expectedActivePointer:{siteVersionId:f.siteVersion.id,artifactId:f.artifact.id},
    contactRecipientChange:{from:'before@example.com',to:'after@example.com',requestedByActor:'operator'}};
  artifact.manifest.publicPreparation=preparation;
  artifact.manifest.generatedOutputSourceWorkspace=publicPreparationWorkspace(f.artifact.manifest.generatedOutputSourceWorkspace,preparation);
  artifact.bundleSha256=bundleHash(artifact);
  assert.equal(check().status,'PASS',JSON.stringify(check().blockerReasons));
  assert.equal(evaluateGeneratedOutputPublicationDecision({technical:check(),review:null}).activation,'BLOCKED');
  const workspace=artifact.manifest.generatedOutputSourceWorkspace as typeof f.artifact.manifest.generatedOutputSourceWorkspace;
  const changed=structuredClone(workspace) as {acceptedFunctionalReductions:{contact:{recipient:string},search:string}};
  changed.acceptedFunctionalReductions.search='keep'; artifact.manifest.generatedOutputSourceWorkspace=changed;
  artifact.bundleSha256=bundleHash(artifact);
  assertBlocked(check(),'public_preparation_lineage_invalid');
  artifact.manifest.generatedOutputSourceWorkspace=workspace;
  preparation.expectedActivePointer!.artifactId='other'; artifact.bundleSha256=bundleHash(artifact);
  assertBlocked(check(),'public_preparation_lineage_invalid');
  preparation.expectedActivePointer!.artifactId=f.artifact.id;
  preparation.contactRecipientChange!.to='bad\r\nBcc: injected@example.com'; artifact.bundleSha256=bundleHash(artifact);
  assertBlocked(check(),'public_preparation_lineage_invalid');
  preparation.contactRecipientChange!.to='after@example.com'; artifact.bundleSha256=bundleHash(artifact);
  f.artifact.htmlByPath['/']+='changed';
  assertBlocked(check(),'public_preparation_lineage_invalid');
});

test('Settings publisher supplies evidence to the real guard and stops before activation on missing review or evidence failure', async () => {
  const {createEvidenceBoundRuntimePublisher} = await import('./generated-output-publication-composition');
  const f=buildFixture();
  const technical=evaluate(f);
  const review=createGeneratedOutputReviewRecord({reviewId:'settings-review',decision:'APPROVED',policyVersion:technical.policyVersion,
    artifactId:f.artifact.id,artifactBundleSha256:f.artifact.bundleSha256,candidateId:f.record.identity.candidateId,
    candidateContentSha256:f.record.candidate.contentSha256,contentManifestSha256:f.contentManifest.manifestSha256,
    technicalEvaluationSha256:technical.evidenceSha256,reviewerActorId:'reviewer',reviewedAt:'2026-10-19T12:00:00.000Z'});
  for(const mode of ['approved','missing_review','evidence_failure'] as const) {
    let activations=0, resolverCalls=0;
    const publish=createEvidenceBoundRuntimePublisher({
      createResolver:()=>async selection=>{
        resolverCalls++;
        assert.equal(selection.artifact.bundleSha256,f.artifact.bundleSha256);
        if(mode==='evidence_failure')throw new Error('store unavailable');
        return evaluateGeneratedOutputPublicationDecision({technical,review:mode==='approved'?review:null});
      },
      publish:async input=>{
        assert.equal(input.siteVersionId,f.siteVersion.id);
        await enforceGeneratedOutputPublicationEligibility({siteVersion:f.siteVersion,artifact:f.artifact,publishStage:'shadow',resolver:input.generatedOutputPublicationDecisionResolver});
        activations++;
        return {} as never;
      },
    });
    const result=()=>publish({siteVersionId:f.siteVersion.id,actor:'operator',stage:'shadow'});
    if(mode==='approved')await result();
    else await assert.rejects(result,GeneratedOutputPublicationBlockedError);
    assert.equal(resolverCalls,1);
    assert.equal(activations,mode==='approved'?1:0);
  }
});

test('owner UI prepares, resumes, reviews and publishes the exact retained artifact through real services', async (t) => {
  const envKeys=['VERCEL_ENV','GNR8_CONTACT_FROM','RESEND_API_KEY','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET',
    'GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED','GNR8_STACKI_GITHUB_ENABLED','GNR8_STACKI_GITHUB_SITE_IDS'] as const;
  const oldEnv=Object.fromEntries(envKeys.map(key=>[key,process.env[key]]));
  t.after(()=>{for(const key of envKeys) {if(oldEnv[key]===undefined) delete process.env[key];else process.env[key]=oldEnv[key];}});
  Object.assign(process.env,{VERCEL_ENV:'production',GNR8_CONTACT_FROM:'GNR8 <forms@notify.pasadenagenerator.com>',RESEND_API_KEY:'local-test-only',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:1',SUPABASE_SERVICE_ROLE_KEY:'local-test-only',GNR8_ASTRO_CANDIDATE_OBJECT_BUCKET:'local-private',
    GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED:'0',GNR8_STACKI_GITHUB_ENABLED:'0',GNR8_STACKI_GITHUB_SITE_IDS:'[]'});
  const gitObjects=new Map<string,Buffer>();
  t.mock.method(globalThis,'fetch',async (input:RequestInfo|URL,init?:RequestInit)=>{
    const request=new Request(input,init),url=new URL(request.url);
    if(url.pathname==='/storage/v1/bucket/local-private')
      return Response.json({id:'local-private',name:'local-private',public:false});
    const prefix='/storage/v1/object/local-private/';
    if(url.pathname.startsWith(prefix)){
      const body=gitObjects.get(decodeURIComponent(url.pathname.slice(prefix.length)));
      return body?new Response(new Uint8Array(body),{headers:{'content-type':'application/octet-stream'}}):new Response('missing',{status:404});
    }
    assert.equal(request.url,'http://127.0.0.1:1/rest/v1/rpc/gnr8_contact_delivery_readiness');
    return Response.json('gnr8-native-contact-delivery:v1');
  });
  const { prepareRetainedAstroPublicArtifact: prepareOperation } = await import('./astro-public-preparation');
  const { readGeneratedOutputReviewModel, approveGeneratedOutputReview, createEvidenceBoundRuntimePublisher } = await import('./generated-output-publication-composition');
  const { createPublicOutputService } = await import('./public-output-service');
  const { createPublicOutputRouteHandlers } = await import('./public-output-route-handlers');
  const { publishApprovedSiteVersion } = await import('../runtime/publish-activation-orchestrator');
  const { ensureRuntimeTables, recoverPreparedPublicSiteToUnpublished } = await import('../runtime/runtime-store');
  await ensureRuntimeTables({dbClient: {query: async () => ({rows:[]})} as never});
  const { transitionSiteVersionState } = await import('../runtime/version-lifecycle-enforcer');
  const { renderAstroProductionCandidatePreview } = await import('./astro-production-candidate-preview-composition');
  const f = buildFixture();
  Object.assign(f.artifact.manifest,{generatedOutputBuildEvidence:f.buildEvidence,generatedOutputContentManifest:f.contentManifest});
  f.artifact.manifest.generatedOutputSourceWorkspace = { acceptedFunctionalReductions: {kind:'retained-presentation-v1', contact:{recipient:'before@example.com',recipientConfirmed:true}, search:'remove', map:'address-link', tracking:'remove-bundle'} };
  f.artifact.bundleSha256 = bundleHash(f.artifact);
  const versions = new Map([[f.siteVersion.id,f.siteVersion],[f.sourceCaptureSiteVersion.id,f.sourceCaptureSiteVersion]]);
  const artifacts = new Map([[f.artifact.siteVersionId,f.artifact],[f.sourceCaptureArtifact.siteVersionId,f.sourceCaptureArtifact]]);
  let gitHydrate:((artifact:RuntimeArtifact)=>Promise<RuntimeArtifact>)|undefined;
  const records = new Map([[f.record.identity.candidateId,f.record]]);
  const audits: {siteVersionId:string;actor:string;details:Record<string,unknown>;timestamp:string;to_state:string}[] = [];
  let pointer: {active_site_version_id:string;active_artifact_id:string}|null = null;
  let domainReady = false, failBindOnce = true;
  const snake = (value:object) => Object.fromEntries(Object.entries(value).map(([k,v])=>[k.replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`),v]));
  const db = {async query(raw:string,args:unknown[]=[]) {
    const sql=raw.trim().replace(/\s+/g,' '), version=versions.get(String(args[0]));
    const rows=(values:unknown[])=>({rows:values,rowCount:values.length});
    if (['begin','commit','rollback'].includes(sql)) return rows([]);
    if(sql.startsWith('with preview_site as'))return rows(pointer?[{
      site_id:SITE_ID,ownership_site_id:OWNERSHIP.ownershipSiteId,site_resolution:'domain_match',
      source_url:'https://retained.example.com',source_host:'retained.example.com',
      host_binding_id:null,host_binding_kind:null,host_binding_status:null,
      domain:'retained.example.com',domain_binding_id:'domain',domain_binding_status:'ACTIVE',
      legacy_domain_site_version_id:null,active_site_version_id:pointer.active_site_version_id,
      artifact_id:pointer.active_artifact_id,
    }]:[]);
    if(sql.startsWith('select')&&sql.includes('from public.gnr8_runtime_site_versions')) return rows(version?[snake(version)]:[]);
    if(sql.startsWith('select')&&sql.includes('from public.gnr8_runtime_page_versions')) return rows((version?.pages??[]).map(snake));
    if(sql.startsWith('select')&&sql.includes('from public.gnr8_runtime_artifacts')) {
      const a=sql.includes('where site_version_id')?artifacts.get(String(args[0])):[...artifacts.values()].find(a=>a.id===args[0]);return rows(a?[snake(a)]:[]);
    }
    if(sql.startsWith('select')&&sql.includes('from public.gnr8_runtime_active_pointers')) return rows(pointer?[pointer]:[]);
    if(sql.startsWith('delete from public.gnr8_runtime_active_pointers')) {pointer=null;domainReady=false;return rows([]);}
    if(sql.startsWith('select id from public.gnr8_runtime_domain_host_bindings')) return rows(domainReady?[{id:'domain'}]:[]);
    if(sql.startsWith('select id from public.gnr8_runtime_sites')) return rows([{id:SITE_ID}]);
    if(sql.startsWith('update public.gnr8_runtime_domain_host_bindings')) return rows([{id:'domain'}]);
    if(sql.startsWith('update public.gnr8_runtime_site_versions set state')) {version!.state=args[1] as never;return rows([snake(version!)]);}
    if(sql.startsWith('update public.gnr8_runtime_site_versions set artifact_id')) return rows([snake(version!)]);
    if(sql.startsWith('update public.gnr8_runtime_artifacts')) {const a=[...artifacts.values()].find(a=>a.id===args[0])!;assert.equal(args[4],a.bundleSha256);return rows([snake(a)]);}
    if(sql.startsWith('insert into public.gnr8_runtime_version_audit')) {if(sql.includes('select id,state,state')) return rows([]);audits.unshift({siteVersionId:String(args[0]),actor:String(args[3]),details:JSON.parse(String(args[5])),timestamp:new Date().toISOString(),to_state:String(args[2])});return rows([]);}
    if(sql.startsWith('insert into public.gnr8_runtime_active_pointers')) {pointer={active_site_version_id:String(args[1]),active_artifact_id:String(args[2])};return rows([]);}
    throw new Error(`Unexpected local query: ${sql.slice(0,120)}`);
  }};
  const c = {
    runtimeStore:{async readContext(id:string){const siteVersion=versions.get(id);const stored=siteVersion?.artifactId?artifacts.get(id):null;
      return siteVersion?{siteVersion,artifact:stored&&gitHydrate?await gitHydrate(stored):stored,
        activePointerReferencesArtifact:pointer?.active_site_version_id===id && pointer?.active_artifact_id===siteVersion.artifactId,previewBindingCount:0}:null;}},
    ownershipResolver:{async resolve({siteVersionId}:{siteVersionId:string}){return {...OWNERSHIP,siteVersionId};}},
    candidateRepository:{
      async read({candidateId}:{candidateId:string}){const record=records.get(candidateId);if(!record)throw new Error('missing candidate');return record;},
      async create(input:Omit<Parameters<typeof createAstroProductionCandidateRecord>[0], "ownership"> & {trustedScope: typeof OWNERSHIP}){
        const record=records.get(input.candidate.id)??createAstroProductionCandidateRecord({...input,ownership:input.trustedScope,storedAt:f.siteVersion.createdAt});records.set(record.identity.candidateId,record);return {record};
      },
    },
    client:{from(table:string){let versionId='';const q={select(){return q;},eq(key:string,value:string){if(key==='site_version_id')versionId=value;return q;},order(){return q;},async limit(){return {data:audits.filter(a=>a.to_state==='APPROVED' && a.siteVersionId===versionId),error:null};},async maybeSingle(){if(table==='gnr8_runtime_artifacts')return {data:artifacts.has(versionId)?{id:artifacts.get(versionId)!.id}:null,error:null};assert.equal(table,'gnr8_runtime_active_pointers');return {data:pointer,error:null};}};return q;}},
  } as unknown as ReturnType<typeof import('./generated-output-publication-composition').createGeneratedOutputComposition>;
  const read=(id:string)=>readGeneratedOutputReviewModel(id,c);
  const transition:typeof transitionSiteVersionState=input=>transitionSiteVersionState({...input,dbClient:db as never});
  // Extend the existing public-output proof at its storage/build boundaries:
  // an exact saved source revision must become the source of public preparation.
  const { prepareStackiCandidate } = await import('../stacki/stacki-candidate-preparation');
  const { createStackiRecord } = await import('../stacki/stacki-draft-contract');
  const { selectStackiCandidateSource } = await import('../stacki/stacki-candidate-source');
  const { computeAstroInternalPreviewCandidateContentSha256 } = await import('./astro-static-site-internal-preview-bridge');
  const draftScope={agencyId:OWNERSHIP.agencyId,clientId:OWNERSHIP.organizationId,siteId:OWNERSHIP.ownershipSiteId,siteVersionId:f.siteVersion.id};
  const baseline=[{path:'package.json',contents:'{}'},{path:'astro.config.mjs',contents:'export default {}'},
    {path:'src/pages/index.astro',contents:VALID_HTML}].map(file=>({...file,base64:Buffer.from(file.contents).toString('base64')}));
  const draft=createStackiRecord(draftScope,'99999999-9999-4999-8999-999999999999',{expectedRevision:2,files:baseline.map(file=>({path:file.path,base64:Buffer.from(file.contents.replace('Ready to help','Edited in Stacki')).toString('base64')}))});
  Object.assign(f.artifact.manifest.generatedOutputSourceWorkspace as object,{files:baseline.map(file=>({path:file.path,contents:file.contents,role:'source',bytes:Buffer.byteLength(file.contents),sha256:sha256Hex(file.contents)})),assetEvidence:[]});
  f.artifact.bundleSha256=bundleHash(f.artifact);
  let buildCalls=0;
  let loseStackiBind=true;
  const savedInput={selection:{scope:draftScope,revision:draft.revision,sha256:draft.sha256},sourceArtifactId:f.artifact.id,sourceArtifactSha256:f.artifact.bundleSha256,actor:'99999999-9999-4999-8999-999999999999'};
  const stackiDependencies:NonNullable<Parameters<typeof prepareStackiCandidate>[1]>={
    composition:()=>c,readModel:read,lifecycle:{transitionSiteVersionState:transition},
    readDraft:async(scope,revision)=>{assert.deepEqual(scope,draftScope);assert.equal(revision,3);return draft;},
    loadSource:async()=>baseline,loadCaptureSource:async()=>({htmlByPath:{'/':VALID_HTML},stylesheetCssByPath:{},ownedStylesheetEvidence:[]}),
    createProducer:input=>{
      const selected=selectStackiCandidateSource(input),inputId=`stacki:${draftScope.siteVersionId}:3:${draft.sha256}`;
      let receipt:import('./chs-astro-candidate-producer').ChsAstroBuildReceipt|null=null;
      return {selected,inputId,producer:{kind:'stacki_saved_source_build_export_bridge',version:'v1',supports:()=>true,
        readBuildReceipt:()=>receipt,
        async produce(input){
          buildCalls++;
          assert.equal(input.candidateCreatedAt,'2026-10-22T07:24:13.141Z');
          const candidate=createSyntheticAstroInternalPreviewCandidate({candidateId:input.candidateId,siteId:input.ownership.runtimeSiteId,siteVersionId:input.ownership.siteVersionId,
            html:selected.files.find(file=>file.path.endsWith('.astro'))!.body.toString(),createdAt:input.candidateCreatedAt});
          candidate.manifest.provenance.sourceSnapshotSha256=selected.sourceSnapshot.aggregateSha256;
          candidate.contentSha256=computeAstroInternalPreviewCandidateContentSha256(candidate);
          candidate.manifest.provenance.convertedArtifactSha256=candidate.contentSha256;
          receipt={proofVersion:'gnr8-astro-build-export-proof:v1',candidateId:candidate.id,buildCompletedAt:f.siteVersion.createdAt,
            toolVersions:f.buildEvidence.toolVersions,generatedSourceSha256:selected.sourceSnapshot.aggregateSha256,exportSha256:candidate.manifest.provenance.exportSha256,
            outputPaths:['/'],exportFiles:[],execution:{installationCompleted:true,buildCompleted:true,sourceUnchanged:true,cleanupCompleted:true,workspaceRemoved:true,cleanupErrorCount:0},receiptSha256:'a'.repeat(64)};
          return candidate;
        },
      }};
    },
    store:{
      getArtifactById:async id=>[...artifacts.values()].find(a=>a.id===id)??null,
      getRawImportedSiteArtifact:async()=>({}) as never,getRawTemplateSiteAsset:async()=>null,
      async createSiteVersionFromMigration(input){const id=input.siteVersionId!;if(!versions.has(id))versions.set(id,{...structuredClone(f.siteVersion),id,state:'DRAFT',artifactId:null,versionNo:2,createdAt:'2026-10-22T07:24:13.141978+00:00'});return {siteId:SITE_ID,siteVersionId:id,versionNo:2};},
      linkRuntimeSiteVersionOwnershipIfAllowed:async()=>undefined as never,
      async createArtifact(input){if(!artifacts.has(input.siteVersionId))artifacts.set(input.siteVersionId,{...input,id:input.siteVersionId,createdAt:f.siteVersion.createdAt});return {artifactId:artifacts.get(input.siteVersionId)!.id};},
      async bindArtifactToVersion(input){if(loseStackiBind){loseStackiBind=false;throw new Error('simulated Stacki write response loss');}versions.get(input.siteVersionId)!.artifactId=input.artifactId;return undefined as never;},
    },
  };
  await assert.rejects(prepareStackiCandidate(savedInput,{...stackiDependencies,readModel:async id=>{
    const model=await read(id);
    return {...model,decision:{...model.decision,technical:{...model.decision.technical,status:'BLOCKED',
      blockerReasons:[{code:'local_route_unsupported:http://private.example/path',message:'not logged'}]}}};
  }}),/^Error: stacki_candidate_source_not_supported:local_route_unsupported$/);
  assert.equal(buildCalls,0);
  await assert.rejects(prepareStackiCandidate(savedInput,stackiDependencies),/simulated Stacki write response loss/);
  const edited=await prepareStackiCandidate(savedInput,stackiDependencies);
  assert.equal(edited.model.stackiRevision?.sha256,draft.sha256);
  assert.equal(edited.model.decision.review.status,'MISSING');assert.equal(pointer,null);
  assert.equal((await prepareStackiCandidate(savedInput,stackiDependencies)).model.artifactId,edited.model.artifactId);
  assert.equal(buildCalls,1);
  await assert.rejects(prepareStackiCandidate({...savedInput,selection:{...savedInput.selection,sha256:'0'.repeat(64)}},stackiDependencies));
  await assert.rejects(prepareStackiCandidate({...savedInput,selection:{...savedInput.selection,scope:{...draftScope,siteId:'ffffffff-ffff-4fff-8fff-ffffffffffff'}}},stackiDependencies),/ownership_mismatch/);
  let sourceReviewReuseChecks = 0;
  const prepare:typeof prepareOperation=(input, overrides)=>prepareOperation(input,{
    composition:()=>c,readModel:async id=>{
      if (id === input.sourceSiteVersionId && overrides?.readModel) sourceReviewReuseChecks++;
      return (overrides?.readModel ?? read)(id);
    },prepareGeneratedGit:overrides?.prepareGeneratedGit,
    lifecycle:{transitionSiteVersionState:transition},store:{
      async createSiteVersionFromMigration(input){const id=input.siteVersionId!;if(!versions.has(id))versions.set(id,{...structuredClone(f.siteVersion),id,state:'DRAFT',artifactId:null,versionNo:2,createdAt:'2026-10-22T07:24:13.141978+00:00'});return {siteId:SITE_ID,siteVersionId:id,versionNo:2};},
      linkRuntimeSiteVersionOwnershipIfAllowed:async()=>undefined as never,
      async createArtifact(input){if(!artifacts.has(input.siteVersionId)){
        const columns=input.manifest.generatedGitArchive
          ? (await import('../site/generated-artifact-git-cache')).generatedArtifactReferenceColumns(input) : input;
        artifacts.set(input.siteVersionId,{...input,...columns,id:input.id ?? input.siteVersionId,createdAt:f.siteVersion.createdAt});
      }return {artifactId:artifacts.get(input.siteVersionId)!.id};},
      async bindArtifactToVersion(input){if(failBindOnce){failBindOnce=false;throw new Error('simulated connection loss after artifact write');}versions.get(input.siteVersionId)!.artifactId=input.artifactId;return undefined as never;},
    },
  });
  const authorize=async(scope:{siteId:string})=>{if(scope.siteId!==OWNERSHIP.ownershipSiteId)throw new Error('404|PUBLIC_OUTPUT_NOT_FOUND');return {userId:'owner'} as never;};
  const service=createPublicOutputService({authorizeSite:authorize,authorizeVersion:async(scope,id)=>{await authorize(scope);if(!versions.has(id))throw new Error('404|PUBLIC_OUTPUT_NOT_FOUND');return {userId:'owner'} as never;},read,prepare,
    approve:input=>approveGeneratedOutputReview(input,{readModel:read,composition:()=>c,transition}),
    publish:createEvidenceBoundRuntimePublisher({requireExactSelection:true,createResolver:()=>async selection=>(await read(selection.siteVersion.id)).decision,publish:input=>publishApprovedSiteVersion({...input,dbClient:db as never})}),
  },input=>recoverPreparedPublicSiteToUnpublished({siteId:SITE_ID,siteVersionId:input.siteVersionId,artifactId:input.artifactId,
    expectedBundleSha256:input.artifactBundleSha256,actor:input.actor,dbClient:db as never}));
  const { createAstroProductionCandidatePreviewRouteHandlers } = await import('@/app/api/gnr8/admin/astro-candidates/[siteVersionId]/[candidateId]/preview/astro-candidate-preview-route-handlers');
  const handlers=createPublicOutputRouteHandlers({service,list:async()=>[],preview:options=>createAstroProductionCandidatePreviewRouteHandlers({...options,loadPreviewDependencies:async()=>({
    resolveOwnership:async({siteVersionId})=>({...OWNERSHIP,siteVersionId}),readCandidate:async({candidateId})=>records.get(candidateId)!,renderCandidate:renderAstroProductionCandidatePreview,
  })})});
  const context={params:Promise.resolve({clientId:OWNERSHIP.organizationId,siteId:OWNERSHIP.ownershipSiteId})};
  const url=`https://platform.example/api/public-output?agencyId=${OWNERSHIP.agencyId}`;
  const send=(body:object,ctx=context)=>handlers.POST(new Request(url,{method:'POST',headers:{origin:'https://platform.example','content-type':'application/json'},body:JSON.stringify(body)}),ctx);
  const source={siteVersionId:edited.model.siteVersionId,artifactId:edited.model.artifactId,artifactBundleSha256:edited.model.artifactBundleSha256};
  const preparation={...source,action:'prepare',host:'retained.example.com'};
  assert.equal((await send(preparation)).status,409);
  const [response, concurrent]=await Promise.all([send(preparation),send(preparation)]);assert.equal(response.status,200,await response.clone().text());assert.equal(concurrent.status,200,await concurrent.clone().text());
  const target=(await response.json()).data;
  assert.equal(sourceReviewReuseChecks,3,'each request reuses only its own exact source review');
  const selection={siteVersionId:String(target.siteVersionId),artifactId:String(target.artifactId),artifactBundleSha256:String(target.artifactBundleSha256)};
  const retry=(await(await send(preparation)).json()).data;
  assert.deepEqual([retry.siteVersionId,retry.artifactId,retry.artifactBundleSha256],Object.values(selection));
  assert.equal(versions.size,4);assert.equal(records.size,3);assert.equal(artifacts.size,4);
  const readback=await handlers.GET(new Request(`${url}&${new URLSearchParams(selection)}`),context);assert.equal((await readback.json()).data.artifactId,selection.artifactId);
  const preview=await handlers.preview(new Request(`${url}&${new URLSearchParams(selection)}&path=%2F`),context);
  assert.equal(preview.status,200);assert.ok((await preview.text()).includes('Edited in Stacki'));
  assert.ok(preview.headers.get('content-security-policy')?.includes("form-action 'none'"));
  assert.equal((await handlers.preview(new Request(`${url}&${new URLSearchParams({...selection,artifactBundleSha256:'0'.repeat(64)})}`),context)).status,409);
  const action={...selection,host:preparation.host};
  assert.equal((await send({...action,action:'publish'})).status,409);assert.equal(pointer,null);
  assert.equal((await send({...action,action:'approve',confirmation:'approve-exact-generated-output-artifact',technicalEvaluationSha256:'0'.repeat(64)})).status,409);
  assert.equal((await send({...action,artifactBundleSha256:'0'.repeat(64),action:'publish'})).status,409);
  assert.equal((await send({...action,action:'publish'},{params:Promise.resolve({clientId:OWNERSHIP.organizationId,siteId:'ffffffff-ffff-4fff-8fff-ffffffffffff'})})).status,404);
  const approval=await send({...action,action:'approve',confirmation:'approve-exact-generated-output-artifact',technicalEvaluationSha256:target.decision.technical.evidenceSha256});assert.equal(approval.status,200,await approval.clone().text());
  assert.equal((await send({...action,action:'publish'})).status,409);assert.equal(pointer,null);
  domainReady=true;
  const published=await send({...action,action:'publish'});assert.equal(published.status,200,await published.clone().text());
  assert.deepEqual(pointer,{active_site_version_id:selection.siteVersionId,active_artifact_id:selection.artifactId});
  assert.equal((await published.json()).data.artifactBundleSha256,selection.artifactBundleSha256);
  assert.equal((await send({...action,action:'publish'})).status,200);
  assert.equal((await send({...action,action:'withdraw'})).status,422);
  assert.equal((await send({...action,action:'withdraw',confirmation:'withdraw-exact-first-publication'})).status,200);
  assert.equal(pointer,null);
  assert.equal((await send({...action,action:'withdraw',confirmation:'withdraw-exact-first-publication'})).status,200);
  assert.equal((await send({...action,action:'publish'})).status,409);
  domainReady=true;
  assert.equal((await send({...action,action:'publish'})).status,200);
  const parent = structuredClone(artifacts.get(selection.siteVersionId)!);
  const oldPointer = structuredClone(pointer);
  const change = {...action, action:'change-recipient', recipient:'after@example.com', confirmation:'confirm-contact-recipient'};
  assert.equal((await send({...change,confirmation:undefined})).status,422);
  const same=(await(await send({...change,recipient:'before@example.com'})).json()).data;
  assert.equal(same.artifactId,parent.id); assert.equal(versions.size,4);
  const [changeResponse, changeRetry]=await Promise.all([send(change),send(change)]);
  assert.equal(changeResponse.status,200,await changeResponse.clone().text()); assert.equal(changeRetry.status,200,await changeRetry.clone().text());
  const successor=(await changeResponse.json()).data;
  assert.equal((await changeRetry.json()).data.artifactId,successor.artifactId);
  assert.equal(versions.size,5); assert.equal(artifacts.size,5);
  const successorArtifact=artifacts.get(successor.siteVersionId)!;
  assert.deepEqual(successorArtifact.htmlByPath,parent.htmlByPath);
  assert.equal(successorArtifact.compiledTokenStyles,parent.compiledTokenStyles);
  assert.deepEqual(successorArtifact.assetFingerprintMap,parent.assetFingerprintMap);
  const expectedWorkspace=structuredClone(parent.manifest.generatedOutputSourceWorkspace) as {acceptedFunctionalReductions:{contact:{recipient:string}}};
  expectedWorkspace.acceptedFunctionalReductions.contact.recipient='after@example.com';
  assert.deepEqual(successorArtifact.manifest.generatedOutputSourceWorkspace,expectedWorkspace);
  assert.equal(successor.decision.review.status,'MISSING'); assert.equal(successor.contactRecipient,'after@example.com');
  assert.deepEqual(pointer,oldPointer); assert.deepEqual(artifacts.get(selection.siteVersionId),parent);
  const nextAction={siteVersionId:successor.siteVersionId,artifactId:successor.artifactId,artifactBundleSha256:successor.artifactBundleSha256,host:action.host};
  assert.equal((await send({...nextAction,action:'publish'})).status,409); assert.deepEqual(pointer,oldPointer);
  assert.equal((await send({...nextAction,action:'approve',confirmation:'approve-exact-generated-output-artifact',technicalEvaluationSha256:successor.decision.technical.evidenceSha256})).status,200);
  domainReady=false;
  assert.equal((await send({...nextAction,action:'publish'})).status,409); assert.deepEqual(pointer,oldPointer);
  domainReady=true;
  const finalPublish=await send({...nextAction,action:'publish'}); assert.equal(finalPublish.status,200,await finalPublish.clone().text());
  assert.deepEqual(pointer,{active_site_version_id:successor.siteVersionId,active_artifact_id:successor.artifactId});
  assert.equal((await send(change)).status,409); // A stale parent cannot start or resume a replacement.
  assert.equal((await send(change,{params:Promise.resolve({clientId:OWNERSHIP.organizationId,siteId:'ffffffff-ffff-4fff-8fff-ffffffffffff'})})).status,404);
  await assert.rejects(prepare({sourceSiteVersionId:parent.siteVersionId,sourceArtifactId:parent.id,expectedSourceArtifactSha256:parent.bundleSha256,expectedSourceCandidateId:target.candidateId,host:action.host,actor:'owner',contactRecipientChange:{from:'before@example.com',to:'after@example.com'}}),/pointer_baseline_changed/);
  assert.equal(versions.size,5); assert.deepEqual(artifacts.get(selection.siteVersionId),parent);

  const {generatedArtifactGitPackage,writeGeneratedArtifactGitArchive}=await import('../site/generated-artifact-git-archive');
  const {GeneratedArtifactGitCache}=await import('../site/generated-artifact-git-cache');
  const cache=new GeneratedArtifactGitCache({storage:{getBucket:async()=>({data:{public:false},error:null}),from:()=>({
    upload:async(key:string,body:Buffer)=>{gitObjects.set(key,Buffer.from(body));return {error:null};},
    download:async(key:string)=>{const body=gitObjects.get(key);return {data:body?new Blob([new Uint8Array(body)]):null,error:body?null:Error('missing')};},
  })}} as never,'local-private');
  gitHydrate=async stored=>{
    const ref=stored.manifest.generatedGitArchive as import('../site/generated-artifact-git-cache').GeneratedGitRef|undefined;
    if(!ref)return stored;
    const loaded=await cache.hydrate(ref,stored.siteVersionId);
    return {...stored,...loaded,manifest:await cache.restoreManifest(ref,stored.siteVersionId,stored.manifest)};
  };
  let verifiedGitPackages=0;
  const third=await prepare({sourceSiteVersionId:successor.siteVersionId,sourceArtifactId:successor.artifactId,
    expectedSourceArtifactSha256:successor.artifactBundleSha256,expectedSourceCandidateId:successor.candidateId,
    host:action.host,actor:'owner',contactRecipientChange:{from:'after@example.com',to:'third@example.com'}},
  {prepareGeneratedGit:async(artifact,owner)=>{
    const scope={agencyId:owner.agencyId,clientId:owner.organizationId,siteId:owner.ownershipSiteId};
    const gitInput={scope,runtimeSiteId:owner.runtimeSiteId,siteVersionId:owner.siteVersionId,
      htmlByPath:artifact.htmlByPath,compiledTokenStyles:artifact.compiledTokenStyles,manifest:artifact.manifest,
      target:{owner:'local',ownerId:1,repository:'proof',repositoryId:1,token:'local'}};
    const pkg=generatedArtifactGitPackage(gitInput),parent='a'.repeat(40),commit='b'.repeat(40);
    const ref=await writeGeneratedArtifactGitArchive(gitInput,{repository:async()=>({defaultBranch:'main',parent}),
      push:async()=>({commit,tree:'c'.repeat(40)}),
      read:async()=>({commit,parent,parentCount:1,files:new Map(pkg.gitFiles.map(file=>[file.path,file.body]))})} as never);
    await cache.prepare(ref,owner.siteVersionId,artifact);
    verifiedGitPackages++;
    return ref;
  }});
  assert.ok(verifiedGitPackages>=1);
  const thirdArtifact=artifacts.get(third.siteVersionId)!;
  const gitRef=thirdArtifact.manifest.generatedGitArchive as import('../site/generated-artifact-git-cache').GeneratedGitRef;
  assert.ok(gitRef);
  const restored=await gitHydrate(thirdArtifact);
  assert.deepEqual(await cache.hydrate(gitRef,third.siteVersionId),{
    htmlByPath:restored.htmlByPath,compiledTokenStyles:restored.compiledTokenStyles});
  assert.equal(thirdArtifact.bundleSha256,bundleHash(restored));
  const selectedAction={siteVersionId:third.siteVersionId,artifactId:third.artifactId,
    artifactBundleSha256:third.artifactBundleSha256,host:action.host};
  const selectedApproval=await send({...selectedAction,action:'approve',
    confirmation:'approve-exact-generated-output-artifact',
    technicalEvaluationSha256:third.decision.technical.evidenceSha256});
  assert.equal(selectedApproval.status,200,await selectedApproval.clone().text());
  domainReady=true;
  const selectedPublish=await send({...selectedAction,action:'publish'});
  assert.equal(selectedPublish.status,200,await selectedPublish.clone().text());
  assert.deepEqual(pointer,{active_site_version_id:third.siteVersionId,active_artifact_id:third.artifactId});
  const {resolveActiveArtifactForHostAndPathWithDiagnostics}=await import('../runtime/runtime-store');
  const publicPage=await resolveActiveArtifactForHostAndPathWithDiagnostics({
    host:action.host,path:'/',dbClient:db as never,
  });
  assert.equal(publicPage.outcome,'artifact_hit');
  if(publicPage.outcome==='artifact_hit'){
    assert.equal(publicPage.artifactId,third.artifactId);
    assert.equal(publicPage.html,restored.htmlByPath['/']);
    assert.equal(publicPage.artifact.compiledTokenStyles,restored.compiledTokenStyles);
  }
  const {renderPublicPathResponse,__setPublicRuntimeRenderDependenciesForTest,
    __setPublicRuntimeUsageDependenciesForTest}=await import('@/src/public-site/public-runtime-render');
  const restorePublicRender=__setPublicRuntimeRenderDependenciesForTest({
    resolveRawTemplateSiteForDomainAndPath:async()=>({outcome:'raw_template_miss',reasonCode:'domain_not_found'}) as never,
    resolveActiveArtifactForHostAndPathWithDiagnostics:input=>resolveActiveArtifactForHostAndPathWithDiagnostics({...input,dbClient:db as never}),
  });
  const restorePublicUsage=__setPublicRuntimeUsageDependenciesForTest({
    persistRuntimeUsageEvent:async()=>({status:'written'}) as never,
  });
  try{
    const publicResponse=await renderPublicPathResponse({host:action.host,path:'/'});
    assert.equal(publicResponse.status,200);
    assert.match(publicResponse.headers.get('content-type')??'',/text\/html/);
    assert.match(await publicResponse.text(),/Edited in Stacki/);
    const homepageSha=gitRef.routes.find(route=>route.route==='/')?.sha256;
    assert.ok(homepageSha);
    const homepageKey=[...gitObjects.keys()].find(key=>key.endsWith(`/${homepageSha}`));
    assert.ok(homepageKey);
    gitObjects.delete(homepageKey);
    await assert.rejects(renderPublicPathResponse({host:action.host,path:'/'}),/GENERATED_ARTIFACT_CACHE_INTEGRITY_FAILED/);
    gitObjects.set(homepageKey,Buffer.from(restored.htmlByPath['/']));
  }finally{restorePublicUsage();restorePublicRender();}
  Object.assign(process.env,{GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED:'1',GNR8_STACKI_GITHUB_ENABLED:'1',
    GNR8_STACKI_GITHUB_SITE_IDS:JSON.stringify([OWNERSHIP.ownershipSiteId])});
  const artifactCount=artifacts.size;
  await assert.rejects(prepare({sourceSiteVersionId:third.siteVersionId,sourceArtifactId:third.artifactId,
    expectedSourceArtifactSha256:third.artifactBundleSha256,expectedSourceCandidateId:third.candidateId,
    host:action.host,actor:'owner',contactRecipientChange:{from:'third@example.com',to:'fourth@example.com'}},
  {prepareGeneratedGit:async()=>null}),/public_preparation_git_archive_required/);
  assert.equal(artifacts.size,artifactCount);

});

// Opt-in replay through Worker -> shared service -> real preparation/producer.
// Only storage/action I/O uses local substitutes; installation/build are real.
test('assembled Worker builds the selected saved revision through the real service', {
  skip: process.env.GNR8_STACKI_WORKER_LOCAL_PROOF !== '1',
}, async (t) => {
  const {runSiteAstroGenerationJob,resolveBundledPnpmCliPath}=await import('../../../worker/gnr8/site/inngest/site-astro-generation-job');
  const {runSourceBackedAstroGeneration}=await import('../../../worker/gnr8/output-adapters/source-backed-astro-generation-service');
  const {createStackiRecord}=await import('../stacki/stacki-draft-contract');
  const {createStackiCandidateProducer}=await import('../stacki/stacki-candidate-producer');
  const {runAstroBuildExportProof}=await import('./astro-static-site-build-export-proof');
  const {readGeneratedOutputReviewModel}=await import('./generated-output-publication-composition');
  const {writeFile}=await import('node:fs/promises');
  const {fileURLToPath}=await import('node:url');
  const pnpmCli=resolveBundledPnpmCliPath(fileURLToPath(new URL('../../../worker/',import.meta.url)));
  assert(pnpmCli,'The assembled Worker must have its own installed pnpm');
  const previousPnpmCli=process.env.GNR8_PNPM_CLI_PATH;
  process.env.GNR8_PNPM_CLI_PATH=pnpmCli;
  t.after(()=>{if(previousPnpmCli===undefined)delete process.env.GNR8_PNPM_CLI_PATH;else process.env.GNR8_PNPM_CLI_PATH=previousPnpmCli;});
  const f=buildFixture();
  // Reuse the minimal local fixture with explicit local-only design tokens.
  const {version: _manifestVersion,manifestSha256: _manifestSha,...manifestInput}=f.contentManifest;
  f.contentManifest=createGeneratedOutputContentManifest({...manifestInput,requiredAssets:[]});
  f.buildEvidence=buildEvidenceFrom(f.record,{siteVersion:f.sourceCaptureSiteVersion,artifact:f.sourceCaptureArtifact},f.contentManifest);
  const scope={agencyId:OWNERSHIP.agencyId,clientId:OWNERSHIP.organizationId,siteId:OWNERSHIP.ownershipSiteId,siteVersionId:VERSION_ID};
  const baseline=[{path:'package.json',contents:JSON.stringify({name:'gnr8-worker-local-proof',type:'module',scripts:{build:'astro build'},dependencies:{astro:'7.4.4'},engines:{node:'26.13.0'}})},
    {path:'astro.config.mjs',contents:'export default { output: "static" };'},
    {path:'public/styles/global.css',contents:'body { color: #0d8f35; font-size: 20px; font-weight: 400; max-width: 1100px; }'},
    {path:'src/pages/index.astro',contents:VALID_HTML.replace('<body>','<head><link rel="stylesheet" href="/styles/global.css"></head><body>')}].map(({path,contents})=>({path,base64:Buffer.from(contents).toString('base64')}));
  const draft=createStackiRecord(scope,'99999999-9999-4999-8999-999999999999',{expectedRevision:2,files:baseline.map(file=>({...file,base64:Buffer.from(Buffer.from(file.base64,'base64').toString().replace('Ready to help','Selected revision three')).toString('base64')}))});
  const newer=createStackiRecord(scope,draft.actorUserId,{expectedRevision:3,files:draft.files.map(file=>({...file,base64:Buffer.from(Buffer.from(file.base64,'base64').toString().replace('Selected revision three','NEWER MUST NOT BUILD')).toString('base64')}))});
  Object.assign(f.artifact.manifest,{generatedOutputBuildEvidence:f.buildEvidence,generatedOutputContentManifest:f.contentManifest,
    generatedOutputSourceWorkspace:{files:baseline.map(file=>({path:file.path,contents:Buffer.from(file.base64,'base64').toString(),role:'source',bytes:Buffer.from(file.base64,'base64').length,sha256:sha256Hex(Buffer.from(file.base64,'base64'))})),assetEvidence:[]}});
  f.artifact.bundleSha256=bundleHash(f.artifact);
  const versions=new Map([[VERSION_ID,f.siteVersion],[f.sourceCaptureSiteVersion.id,f.sourceCaptureSiteVersion]]);
  const artifacts=new Map([[VERSION_ID,f.artifact],[f.sourceCaptureSiteVersion.id,f.sourceCaptureArtifact]]);
  const records=new Map([[CANDIDATE_ID,f.record]]);
  const draftReads:number[]=[];let buildCount=0;let buildEvidence:unknown;const actions:unknown[]=[];
  const c={runtimeStore:{async readContext(id:string){const siteVersion=versions.get(id);return siteVersion?{siteVersion,artifact:siteVersion.artifactId?artifacts.get(id):null,activePointerReferencesArtifact:false,previewBindingCount:0}:null;}},
    ownershipResolver:{async resolve({siteVersionId}:{siteVersionId:string}){return {...OWNERSHIP,siteVersionId};}},
    candidateRepository:{async read({candidateId}:{candidateId:string}){return records.get(candidateId)!;},async create(input:any){const record=createAstroProductionCandidateRecord({...input,ownership:input.trustedScope,storedAt:f.siteVersion.createdAt});records.set(record.identity.candidateId,record);return {record};}},
    client:{from(table:string){assert.equal(table,'gnr8_runtime_version_audit');const q={select(){return q;},eq(){return q;},order(){return q;},async limit(){return {data:[],error:null};}};return q;}},
  } as unknown as ReturnType<typeof import('./generated-output-publication-composition').createGeneratedOutputComposition>;
  const deps:NonNullable<Parameters<typeof runSourceBackedAstroGeneration>[1]>={
    completeAction:async input=>{actions.push(input);return undefined as never;},failAction:async()=>undefined as never,
    stacki:{composition:()=>c,readModel:readGeneratedOutputReviewModel,
      lifecycle:{transitionSiteVersionState:async input=>{versions.get(input.siteVersionId)!.state=input.nextState;return undefined as never;}},
      readDraft:async(s,revision)=>{assert.deepEqual(s,scope);draftReads.push(revision);return revision===3?draft:newer;},
      loadSource:async()=>baseline,loadCaptureSource:async()=>({htmlByPath:{'/':VALID_HTML},stylesheetCssByPath:{},ownedStylesheetEvidence:[]}),
      createProducer:(input,options)=>createStackiCandidateProducer(input,{...options,runBuildExport:async args=>{
        buildCount++;
        const result=await runAstroBuildExportProof(args);
        buildEvidence=result;
        return result;
      }}),
      store:{getArtifactById:async id=>[...artifacts.values()].find(a=>a.id===id)??null,getRawImportedSiteArtifact:async()=>({}) as never,getRawTemplateSiteAsset:async()=>null,
        async createSiteVersionFromMigration(input){const id=input.siteVersionId!;versions.set(id,{...structuredClone(f.siteVersion),id,state:'DRAFT',artifactId:null,versionNo:2});return {siteId:SITE_ID,siteVersionId:id,versionNo:2};},
        linkRuntimeSiteVersionOwnershipIfAllowed:async()=>undefined as never,
        async createArtifact(input){artifacts.set(input.siteVersionId,{...input,id:input.id!,createdAt:f.siteVersion.createdAt});return {artifactId:input.id!};},
        async bindArtifactToVersion(input){versions.get(input.siteVersionId)!.artifactId=input.artifactId;return undefined as never;},
      },
    },
  };
  const payload={actionId:'local-worker-saved-revision',requestedAt:'2026-11-01T00:00:00.000Z',ownershipSiteId:scope.siteId,runtimeSiteId:SITE_ID,sourceSiteVersionId:VERSION_ID,sourceArtifactId:f.artifact.id,actor:draft.actorUserId,strategy:'stacki_saved_revision',stackiRevision:{scope,revision:3,sha256:draft.sha256},stackiSourceArtifactSha256:f.artifact.bundleSha256};
  const run=(eventData:unknown)=>runSiteAstroGenerationJob({eventData,runGeneration:p=>runSourceBackedAstroGeneration(p,deps)});
  await assert.rejects(run({...payload,stackiRevision:{...payload.stackiRevision,sha256:'0'.repeat(64)}}));
  await assert.rejects(run({...payload,stackiSourceArtifactSha256:'0'.repeat(64)}),/source_stale/);
  await assert.rejects(run({...payload,stackiRevision:{...payload.stackiRevision,scope:{...scope,agencyId:'ffffffff-ffff-4fff-8fff-ffffffffffff'}}}),/ownership_mismatch/);
  await assert.rejects(run({...payload,sourceSiteVersionId:'ffffffff-ffff-4fff-8fff-ffffffffffff'}),/Invalid site Astro/);
  assert.equal(buildCount,0);
  const result=await run(payload);
  assert.equal(buildCount,1);assert(draftReads.every(r=>r===3));assert.equal(actions.length,1);
  const record=records.get(result.candidateId)!;
  assert.match(record.candidate.htmlByPath['/'],/Selected revision three/);
  assert.doesNotMatch(record.candidate.htmlByPath['/'],/NEWER MUST NOT BUILD|Ready to help/);
  const artifact=artifacts.get(result.generationSiteVersionId)!;
  assert.equal((artifact.manifest.generatedOutputSourceWorkspace as any).stackiRevision.sha256,draft.sha256);
  const restored=(artifact.manifest.generatedOutputSourceWorkspace as {files:Array<{path:string;sha256:string}>}).files;
  for(const file of draft.files)assert.equal(restored.find(f=>f.path===file.path)?.sha256,sha256Hex(Buffer.from(file.base64,'base64')),`preserved ${file.path}`);
  assert.equal(versions.get(result.generationSiteVersionId)!.state,'READY_FOR_REVIEW');
  if(process.env.GNR8_WORKER_PROOF_EVIDENCE)await writeFile(process.env.GNR8_WORKER_PROOF_EVIDENCE,JSON.stringify({result,selectedRevision:3,selectedSha256:draft.sha256,newerRevision:newer.revision,newerSha256:newer.sha256,draftReads,buildCount,buildEvidence,negativeCases:4,actions,hosted:false},null,2));
});
