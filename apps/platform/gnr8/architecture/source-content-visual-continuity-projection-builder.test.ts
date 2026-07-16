import assert from "node:assert/strict";
import test from "node:test";

import type { SourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-contract";
import {
  buildSourceContentVisualContinuityProjection,
  validateSourceContentVisualContinuityProjection,
} from "./source-content-visual-continuity-projection-builder";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";
const GENERATED_AT = "2026-07-16T00:00:00.000Z";

function wuProjection(overrides: Partial<SourceWebsiteUnderstandingProjection> = {}): SourceWebsiteUnderstandingProjection {
  const artifactRef = { kind: "raw_imported_site", artifactId: "raw-import-odv", source: "raw_artifact" as const };
  const evidenceRef = { kind: "semantic_import", artifactId: "semantic-import-odv", source: "semantic_import" as const };
  return {
    projectionId: "source_website_understanding_fixture",
    contractVersion: "WU-2",
    generatedAt: GENERATED_AT,
    siteVersionId: SITE_VERSION_ID,
    sourceSiteId: "source-site-odv",
    dryRunId: "dry-run-odv",
    connectorType: "rendered_browser",
    sourceIdentity: {
      siteVersionId: SITE_VERSION_ID,
      sourceSiteId: "source-site-odv",
      dryRunId: "dry-run-odv",
      sourceUrl: "https://www.odv.example/",
      finalUrl: "https://www.odv.example/",
      hostname: "www.odv.example",
      connectorType: "rendered_browser",
      importIdentity: "raw-import-odv",
      importedAt: GENERATED_AT,
      captureCompletedAt: GENERATED_AT,
      sourceAvailability: "available",
      languageSignals: [{ signalId: "lang-sl", language: "sl", source: "semantic_import", state: "structured", confidence: { level: "MEDIUM", reasons: ["language metadata"] }, evidenceRefs: ["semantic-import:language"] }],
      evidenceRefs: ["raw-imported-site:source-url"],
    },
    sourceArtifactRefs: [artifactRef],
    evidenceArtifactRefs: [evidenceRef],
    candidateArtifactRefs: [{ kind: "candidate_discovery_result", artifactId: "candidate-discovery-artifact", source: "candidate_discovery" }],
    reviewArtifactRefs: [{ kind: "candidate_review_package", artifactId: "candidate-review-artifact", source: "candidate_review" }],
    reconstructionArtifactRefs: [],
    planningContextArtifactRefs: [],
    pages: [{ pageId: "page-home", routePath: "/", title: "ODV Example", sourceUrl: "https://www.odv.example/", availability: "available", state: "structured", confidence: { level: "MEDIUM", reasons: ["page"] }, evidenceRefs: ["page:/"], limitations: [] }],
    routes: [{ routeId: "route-home", routePath: "/", sourceUrl: "https://www.odv.example/", title: "ODV Example", purposeCandidate: null, state: "structured", reviewState: "not_applicable", confidence: { level: "HIGH", reasons: ["route"] }, evidenceRefs: ["route:/"], limitations: [] }],
    navigation: [
      { navigationId: "nav-services", routePath: "/", label: "Storitve", href: "/storitve", navigationKind: "primary", state: "structured", reviewState: "not_applicable", confidence: { level: "MEDIUM", reasons: ["nav"] }, evidenceRefs: ["semantic-import:navigation:Storitve"], sourceCandidateId: null },
      { navigationId: "nav-contact", routePath: "/", label: "Kontakt", href: "/kontakt", navigationKind: "contact", state: "structured", reviewState: "not_applicable", confidence: { level: "MEDIUM", reasons: ["nav"] }, evidenceRefs: ["semantic-import:navigation:Kontakt"], sourceCandidateId: null },
    ],
    sections: [
      { sectionId: "section-hero", sourceSectionId: "hero", routePath: "/", order: 0, heading: "Odvetniska pisarna", semanticType: "hero", regionType: "hero", observedBoundary: true, plannedOnly: false, state: "structured", reviewState: "not_applicable", confidence: { level: "HIGH", reasons: ["section"] }, evidenceRefs: ["semantic-import:section:hero"], sourceCandidateId: null, sourceArtifactRefs: [evidenceRef], limitations: [] },
      { sectionId: "section-planned", sourceSectionId: "planned-services", routePath: null, order: 1, heading: null, semanticType: "planning-context", regionType: null, observedBoundary: false, plannedOnly: true, state: "unavailable", reviewState: "not_applicable", confidence: { level: "LOW", reasons: ["plan only"] }, evidenceRefs: ["candidate-section"], sourceCandidateId: "candidate-section", sourceArtifactRefs: [], limitations: [] },
    ],
    content: [{
      contentId: "content-home",
      routePath: "/",
      bodyTextAvailable: true,
      classificationStatus: "structured",
      headings: ["Odvetniska pisarna"],
      contentThemes: ["hero"],
      visibleMessages: ["Pravno svetovanje za podjetja in posameznike", "Zaupanje in izkusnje"],
      ctaSignals: ["Kontaktirajte nas"],
      contactSignals: ["Kontaktirajte nas"],
      forms: [],
      downloads: [],
      metadata: { title: "ODV Example" },
      structuredDataAvailable: false,
      confidence: { level: "MEDIUM", reasons: ["semantic content"] },
      evidenceRefs: ["semantic-import"],
      limitations: [],
    }],
    assets: [
      { assetId: "asset-logo", path: "uploads/Tabla40x20cm_51.png", filename: "Tabla40x20cm_51.png", mediaType: "image/png", sizeBytes: 1200, sha256: "logo-sha", assetKind: "image", dimensions: { width: null, height: null }, usages: [{ routePath: "/", usageKind: "semantic_image", evidenceRefs: ["semantic-import:image:uploads/Tabla40x20cm_51.png"] }], altText: "Logo", repeatedUsageCount: 1, inventoryState: "observed", evidenceState: "structured", candidateMeaningState: "candidate", candidateMeaning: "logo_candidate", reviewState: "not_applicable", previewHref: "/api/gnr8/runtime/preview-assets/source-site-odv/09dce7ea-d860-4f60-a1eb-26c3335b302e/uploads%2FTabla40x20cm_51.png", confidence: { level: "MEDIUM", reasons: ["logo evidence"] }, evidenceRefs: ["raw-imported-site:file-map:uploads/Tabla40x20cm_51.png"], limitations: [] },
      { assetId: "asset-nationale", path: "fonts/Nationale-Regular.woff2", filename: "Nationale-Regular.woff2", mediaType: "font/woff2", sizeBytes: 900, sha256: "font-sha", assetKind: "font", dimensions: null, usages: [], altText: null, repeatedUsageCount: 1, inventoryState: "observed", evidenceState: "missing", candidateMeaningState: "candidate", candidateMeaning: "typography_asset", reviewState: "not_applicable", previewHref: null, confidence: { level: "MEDIUM", reasons: ["font evidence"] }, evidenceRefs: ["raw-imported-site:file-map:fonts/Nationale-Regular.woff2"], limitations: [] },
      { assetId: "asset-fontello", path: "fonts/fontello.woff2", filename: "fontello.woff2", mediaType: "font/woff2", sizeBytes: 700, sha256: "fontello-sha", assetKind: "font", dimensions: null, usages: [], altText: null, repeatedUsageCount: 1, inventoryState: "observed", evidenceState: "missing", candidateMeaningState: "candidate", candidateMeaning: "typography_asset", reviewState: "not_applicable", previewHref: null, confidence: { level: "MEDIUM", reasons: ["font evidence"] }, evidenceRefs: ["raw-imported-site:file-map:fonts/fontello.woff2"], limitations: [] },
    ],
    visualIdentitySignals: {
      logoCandidates: [{ candidateId: "logo-candidate", assetPath: "uploads/Tabla40x20cm_51.png", label: "Logo", state: "candidate", confidence: { level: "MEDIUM", reasons: ["logo"] }, signals: ["semantic image"], previewHref: "/preview/logo", evidenceRefs: ["semantic-import:image:uploads/Tabla40x20cm_51.png"], reviewState: "not_applicable" }],
      colorSignals: [{ signalId: "color-primary", value: "#b8874f", label: "primary accent", source: "style_signal_model", state: "structured", confidence: { level: "MEDIUM", reasons: ["style"] }, evidenceRefs: ["style-signals:colors"] }],
      typographySignals: [
        { signalId: "font-heading", family: "Nationale", role: "heading", source: "style_signal_model", localAvailability: "unknown", state: "structured", confidence: { level: "MEDIUM", reasons: ["heading font"] }, evidenceRefs: ["style-signals:typography:heading"] },
        { signalId: "font-body", family: "Nationale", role: "body", source: "style_signal_model", localAvailability: "unknown", state: "structured", confidence: { level: "MEDIUM", reasons: ["body font"] }, evidenceRefs: ["style-signals:typography:body"] },
        { signalId: "font-fontello", family: "fontello", role: "icon_font", source: "asset_inventory", localAvailability: "available", state: "observed", confidence: { level: "MEDIUM", reasons: ["icon font"] }, evidenceRefs: ["raw-imported-site:file-map:fonts/fontello.woff2"] },
      ],
      iconStyleSignals: [],
      imageStyleSignals: [],
      unresolvedSignals: [],
      limitations: [],
    },
    businessSignalCandidates: {
      offerings: [{ candidateId: "offering-services", label: "Storitve", state: "candidate", confidence: { level: "LOW", reasons: ["nav"] }, source: "navigation", evidenceRefs: ["semantic-import:navigation:Storitve"], reviewState: "not_applicable", conflicts: [], limitations: [] }],
      audiences: [{ candidateId: "audience-business", label: "podjetja in posameznike", state: "candidate", confidence: { level: "LOW", reasons: ["body"] }, source: "semantic_import", evidenceRefs: ["semantic-import"], reviewState: "not_applicable", conflicts: [], limitations: [] }],
      trust: [{ candidateId: "trust", label: "Zaupanje in izkusnje", state: "candidate", confidence: { level: "LOW", reasons: ["body"] }, source: "semantic_import", evidenceRefs: ["semantic-import"], reviewState: "not_applicable", conflicts: [], limitations: [] }],
      goals: [],
      identity: [],
      differentiators: [],
      geography: [],
      languages: [],
      unresolvedEvidence: [],
      limitations: [],
    },
    technicalSignals: { title: "ODV Example", meta: {}, canonicalUrl: null, headingStructure: ["Odvetniska pisarna"], structuredDataAvailable: false, robotsEvidence: [], sitemapEvidence: [], languageMetadata: [], accessibilityObservations: [], externalScripts: [], technologyHints: [], widgets: [], socialMetadata: [], confidence: { level: "MEDIUM", reasons: ["technical"] }, evidenceRefs: ["semantic-import"] },
    readiness: { status: "ready_for_business_discovery", conservativeBusinessDiscoveryCanProceed: true, summary: "ready", dimensions: [], blockers: [] },
    confidence: { level: "MEDIUM", reasons: ["ready"] },
    limitations: [],
    diagnostics: [],
    lineage: { siteVersionId: SITE_VERSION_ID, sourceSiteId: "source-site-odv", dryRunId: "dry-run-odv", contractVersion: "WU-2", sourceArtifactRefs: [artifactRef], evidenceArtifactRefs: [evidenceRef], candidateArtifactRefs: [], reviewArtifactRefs: [], reconstructionArtifactRefs: [], planningContextArtifactRefs: [], deterministicInputs: { siteVersionId: SITE_VERSION_ID, sourceSiteId: "source-site-odv", dryRunId: "dry-run-odv", contractVersion: "WU-2", artifactIds: ["raw-import-odv", "semantic-import-odv"] } },
    ...overrides,
  };
}

test("builder creates deterministic VCU projection with exact WU/source lineage", () => {
  const first = buildSourceContentVisualContinuityProjection({
    sourceWebsiteUnderstandingProjection: wuProjection(),
    generatedAt: GENERATED_AT,
    sourceScreenshots: [{ screenshotId: "screenshot-fullpage", completeness: "full_page", evidenceRefs: ["runtime-import:capture-evidence:fullpage.png"] }],
  });
  const second = buildSourceContentVisualContinuityProjection({
    sourceWebsiteUnderstandingProjection: wuProjection(),
    generatedAt: "2030-01-01T00:00:00.000Z",
    sourceScreenshots: [{ screenshotId: "screenshot-fullpage", completeness: "full_page", evidenceRefs: ["runtime-import:capture-evidence:fullpage.png"] }],
  });

  assert.equal(first.projectionId, second.projectionId);
  assert.equal(first.sourceWebsiteUnderstandingProjectionId, "source_website_understanding_fixture");
  assert.equal(first.lineage.sourceSiteId, "source-site-odv");
  assert.equal(first.sourceScreenshots.length, 1);
  assert.equal(first.thumbnailReadiness.originalSourceScreenshotAvailable, true);
  assert.deepEqual(validateSourceContentVisualContinuityProjection(first).errors, []);
});

test("builder projects conservative content policies without rewriting text", () => {
  const projection = buildSourceContentVisualContinuityProjection({ sourceWebsiteUnderstandingProjection: wuProjection(), generatedAt: GENERATED_AT });
  const titleBlock = projection.contentBlocks.find((block) => block.contentType === "title");
  const contactBlock = projection.contentBlocks.find((block) => block.contentType === "contact_detail");
  const audienceBlock = projection.contentBlocks.find((block) => block.contentType === "audience_language");
  const titlePolicy = projection.contentTransformationCandidates.find((candidate) => candidate.contentBlockId === titleBlock?.blockId);
  const contactPolicy = projection.contentTransformationCandidates.find((candidate) => candidate.contentBlockId === contactBlock?.blockId);
  const audiencePolicy = projection.contentTransformationCandidates.find((candidate) => candidate.contentBlockId === audienceBlock?.blockId);

  assert.equal(titleBlock?.originalText, "ODV Example");
  assert.equal(titlePolicy?.proposedPolicy, "PRESERVE_VERBATIM");
  assert.equal(contactPolicy?.proposedPolicy, "PRESERVE_VERBATIM");
  assert.equal(audiencePolicy?.proposedPolicy, "REQUIRE_CONFIRMATION");
  assert.equal(projection.contentTransformationCandidates.every((candidate) => candidate.limitations.includes("No text transformation has been performed by this projection.")), true);
});

test("builder preserves assets and keeps logo/font/color candidates non-canonical", () => {
  const projection = buildSourceContentVisualContinuityProjection({ sourceWebsiteUnderstandingProjection: wuProjection(), generatedAt: GENERATED_AT });
  const logo = projection.visualIdentitySignals.logoCandidates.find((candidate) => candidate.sourceReference.includes("Tabla40x20cm_51.png"));
  const nationale = projection.visualIdentitySignals.typographyCandidates.filter((candidate) => candidate.family === "Nationale");
  const fontello = projection.visualIdentitySignals.typographyCandidates.find((candidate) => candidate.family === "fontello");

  assert.ok(logo);
  assert.equal(logo?.continuityRecommendation, "licensing_unresolved");
  assert.equal(projection.assetContinuity.some((asset) => asset.safeReference.startsWith("/") || asset.safeReference.includes("..")), false);
  assert.equal(nationale.some((candidate) => candidate.headingUsage), true);
  assert.equal(nationale.some((candidate) => candidate.bodyUsage), true);
  assert.equal(fontello?.iconFontUsage, true);
  assert.equal(fontello?.headingUsage, false);
  assert.equal(projection.visualIdentitySignals.colorSignals[0]?.candidateRole, "primary_candidate");
  assert.equal(projection.readiness.readyForGenerationDelivery, false);
});

test("validator rejects downstream contamination and unsafe promotion", () => {
  const projection = buildSourceContentVisualContinuityProjection({
    sourceWebsiteUnderstandingProjection: wuProjection(),
    generatedAt: GENERATED_AT,
  }) as unknown as Record<string, unknown>;
  projection.websiteGenerationPackage = { artifactId: "wgp" };
  const validation = validateSourceContentVisualContinuityProjection(projection);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((error) => error.includes("websiteGenerationPackage is forbidden")), true);

  const unsafe = buildSourceContentVisualContinuityProjection({ sourceWebsiteUnderstandingProjection: wuProjection(), generatedAt: GENERATED_AT });
  unsafe.assetContinuity[0].safeReference = "../secret.png";
  assert.equal(validateSourceContentVisualContinuityProjection(unsafe).errors.some((error) => error.includes("unsafe path")), true);
});
