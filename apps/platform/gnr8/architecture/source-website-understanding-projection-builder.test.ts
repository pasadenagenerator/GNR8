import assert from "node:assert/strict";
import test from "node:test";

import type { RawImportedSiteArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import type { CandidateReviewPackage } from "./candidate-review-contract";
import type { FirstLimitedDryRunOutput } from "./first-limited-dry-run-contract";
import type { StructurePlan } from "./structure-plan-contract";
import {
  buildSourceWebsiteUnderstandingProjection,
  validateSourceWebsiteUnderstandingProjection,
  type SourceWebsiteUnderstandingBuilderInput,
} from "./source-website-understanding-projection-builder";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";
const DRY_RUN_ID = "dry-run-odv";
const GENERATED_AT = "2026-07-14T00:00:00.000Z";

function rawImportedSiteArtifact(): RawImportedSiteArtifact {
  return {
    id: "raw-import-odv",
    artifactType: "raw_imported_site",
    siteId: "odv-site",
    siteVersionId: SITE_VERSION_ID,
    entryHtmlPath: "index.html",
    assetBasePath: "assets",
    createdAt: "2026-07-13T00:00:00.000Z",
    metadata: {
      sourceUrl: "https://www.odv.example/",
      finalUrl: "https://www.odv.example/",
      htmlByteLength: 42000,
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: 4, externalFallbackAssetCount: 0 },
    },
    fileMap: {
      "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 42000, sha256: "html-sha" },
      "uploads/Tabla40x20cm_51.png": { path: "uploads/Tabla40x20cm_51.png", mediaType: "image/png", sizeBytes: 1200, sha256: "logo-sha" },
      "fonts/Nationale-Regular.woff2": { path: "fonts/Nationale-Regular.woff2", mediaType: "font/woff2", sizeBytes: 900, sha256: "nationale-sha" },
      "fonts/fontello.woff2": { path: "fonts/fontello.woff2", mediaType: "font/woff2", sizeBytes: 700, sha256: "fontello-sha" },
      "assets/site.css": { path: "assets/site.css", mediaType: "text/css", sizeBytes: 6400, sha256: "css-sha" },
    },
  };
}

function provenanceSummary(): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    sourceMode: "rendered_dom",
    captureMode: "rendered_browser",
    importFidelityStatus: "high_fidelity_import",
    renderedCaptureStatus: "available",
    renderedDomQuality: "strong",
    screenshotCount: 1,
    computedStyleSampleCount: 12,
    renderedCapture: {
      used: true,
      status: "available",
      quality: "strong",
      domLength: 20000,
      nodeCount: 180,
      styleSampleCount: 12,
      styleCoverage: 0.8,
      screenshots: { viewport: true, fullPage: true },
      execution: {
        runtimeKind: "nodejs",
        environmentSupported: true,
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: "supported",
        failureCategory: "none",
        failureCode: null,
        browserLaunch: "succeeded",
        navigation: "succeeded",
        dom: "captured",
        screenshot: "captured",
        styleSampling: "captured",
      },
    },
    importDiagnosticCodes: [],
    captureEvidence: {
      selectedSourceHtmlPath: "index.html",
      responseHtmlPath: "index.html",
      entryHtmlPath: "index.html",
      renderedCaptureManifestPath: "capture.json",
      acquisitionEvidencePath: "acquisition.json",
      renderedDomPath: "rendered.html",
      computedStylesPath: "styles.json",
      renderedViewportScreenshotPath: "viewport.png",
      renderedFullpageScreenshotPath: "fullpage.png",
      screenshotPaths: ["fullpage.png"],
    },
    styleSignals: {
      kind: "style_signal_model_v2",
      version: "2.0.0",
      sourceMode: "computed_style",
      provenance: {
        sourceMode: "computed_style",
        computedStyle: { used: true, sampleCount: 12, coverage: 0.8 },
        fallbackUsed: false,
        diagnostics: [],
      },
      colors: {
        backgroundTone: "light",
        primaryAccent: "#b8874f",
        secondaryAccent: "#17324d",
        neutralPalette: ["#f7f3ed"],
        ctaColorHint: "#b8874f",
      },
      typography: {
        headingFontFamily: "Nationale",
        bodyFontFamily: "Nationale",
        headingCategory: "sans",
        bodyCategory: "sans",
        scaleHint: "balanced",
        weightContrastHint: "medium",
      },
      spacing: { rhythm: "balanced", sectionSpacingHint: "balanced", layoutDensity: "balanced" },
      surfaces: { radiusHint: "sharp", shadowHint: "flat" },
      cta: { prominence: "medium", styleHint: "solid_button" },
      visualToneHint: "corporate",
      diagnostics: [],
    },
    semanticImport: {
      sourceMode: "raw_html_only",
      captureMode: "rendered_browser",
      title: "ODV Example",
      language: "sl",
      navigation: [
        { label: "Storitve", href: "/storitve" },
        { label: "Kontakt", href: "/kontakt" },
      ],
      hero: {
        title: "Odvetniska pisarna",
        subtitle: "Pravno svetovanje za podjetja in posameznike",
        cta: { label: "Kontaktirajte nas", url: "/kontakt" },
        image: { src: "uploads/Tabla40x20cm_51.png", alt: "Logo" },
        confidence: 0.8,
        diagnostics: [],
      },
      sections: [
        {
          id: "hero",
          type: "hero",
          title: "Odvetniska pisarna",
          intro: "Pravno svetovanje za podjetja in posameznike",
          items: [],
          images: [{ src: "uploads/Tabla40x20cm_51.png", alt: "Logo", role: "logo" }],
          ctas: [{ label: "Kontaktirajte nas", url: "/kontakt" }],
          forms: [],
          confidence: 0.8,
          diagnostics: [],
        },
      ],
      assets: {
        images: [{ src: "uploads/Tabla40x20cm_51.png", alt: "Logo", role: "logo", sectionId: "hero" }],
        groupedByRole: { logo: ["uploads/Tabla40x20cm_51.png"], hero_image: [], gallery_image: [], service_image: [], testimonial_avatar: [], content_image: [], icon: [], unknown: [] },
        knownAssets: [],
      },
      diagnostics: [],
    },
    evidenceCaptureBaselineArtifact: null,
    firstLimitedDryRunOutputArtifacts: [],
    latestFirstLimitedDryRunOutputArtifact: null,
  } as RuntimeImportProvenanceSummary;
}

function candidateDiscovery(): CandidateDiscoveryResult {
  return {
    discoveryId: "discovery-odv",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: GENERATED_AT,
    candidateCount: 3,
    candidateTypesPresent: ["route", "navigation", "section"],
    candidates: [
      {
        candidateId: "candidate-route-home",
        candidateType: "route",
        candidateStatus: "valid",
        routePath: "/",
        confidence: { level: "HIGH", reasons: ["route model exists"] },
        sourceEvidenceRefs: [{ refId: "evidence:route:/", sourceKind: "evidence_capture_baseline", routePath: "/" }],
        sourceDryRunRefs: [{ refId: "dry-run-route:/", sourceKind: "limited_dry_run_route_model", routePath: "/" }],
        limitations: [],
        diagnostics: [],
      },
      {
        candidateId: "candidate-nav-primary",
        candidateType: "navigation",
        candidateStatus: "valid",
        routePath: "/",
        confidence: { level: "MEDIUM", reasons: ["navigation model exists"] },
        sourceEvidenceRefs: [{ refId: "evidence:navigation:/", sourceKind: "navigation_evidence", routePath: "/" }],
        sourceDryRunRefs: [{ refId: "dry-run-navigation:/", sourceKind: "limited_dry_run_navigation_model", routePath: "/" }],
        limitations: [],
        diagnostics: [],
      },
      {
        candidateId: "candidate-section-hero",
        candidateType: "section",
        candidateStatus: "valid",
        routePath: "/",
        confidence: { level: "MEDIUM", reasons: ["section model exists"] },
        sourceEvidenceRefs: [{ refId: "evidence:section:/hero", sourceKind: "section_boundary", routePath: "/" }],
        sourceDryRunRefs: [{ refId: "dry-run-section:/hero", sourceKind: "limited_dry_run_section_model", routePath: "/" }],
        limitations: [],
        diagnostics: [],
      },
    ],
    limitations: [],
    diagnostics: [],
  };
}

function candidateReview(): CandidateReviewPackage {
  const approved = {
    reviewEventId: "review-route-home",
    candidateDiscoveryArtifactId: "candidate-discovery-artifact",
    candidateId: "candidate-route-home",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewerRef: "tester",
    decision: "approved" as const,
    decidedAt: GENERATED_AT,
    supersedesReviewEventId: null,
    diagnostics: [],
  };
  const rejected = {
    reviewEventId: "review-section-hero",
    candidateDiscoveryArtifactId: "candidate-discovery-artifact",
    candidateId: "candidate-section-hero",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewerRef: "tester",
    decision: "rejected" as const,
    decidedAt: GENERATED_AT,
    supersedesReviewEventId: null,
    diagnostics: [],
  };
  return {
    reviewPackageId: "review-package-odv",
    candidateDiscoveryArtifactId: "candidate-discovery-artifact",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    reviewEvents: [approved, rejected],
    latestDecisions: [approved, rejected],
    reviewedCandidateCount: 2,
    approvedCount: 1,
    rejectedCount: 1,
    deferredCount: 0,
    diagnostics: [],
    createdAt: GENERATED_AT,
  };
}

function firstLimitedDryRunOutput(): FirstLimitedDryRunOutput {
  return {
    outputId: "dry-run-output-odv",
    dryRunId: DRY_RUN_ID,
    reconstructionPackageId: "reconstruction-package-odv",
    siteVersionId: SITE_VERSION_ID,
    routeScope: { scopeType: "single_route", routes: ["/"] },
    outputStatus: "valid",
    routeModels: [{ routePath: "/", sourceUrl: "https://www.odv.example/", sectionRefs: ["section:hero"], navigationRefs: ["navigation:primary"], limitationRefs: [], confidenceLevel: "HIGH" }],
    navigationModels: [{ navigationId: "primary", routePath: "/", items: [{ label: "Storitve", href: "/storitve", position: 0, confidenceLevel: "HIGH", sourceEvidenceRefs: ["nav:storitve"] }], confidenceLevel: "HIGH", sourceEvidenceRefs: ["nav:primary"], limitationRefs: [] }],
    sectionModels: [{ sectionId: "hero", routePath: "/", regionType: "hero", selector: "main > section", boundingBox: { x: 0, y: 0, width: 1200, height: 500 }, confidenceLevel: "HIGH", sourceEvidenceRefs: ["section:hero"], limitationRefs: [] }],
    limitations: [],
    evidenceRefs: ["dry-run-output-odv"],
    createdAt: GENERATED_AT,
  };
}

function structurePlan(): StructurePlan {
  return {
    structurePlanId: "structure-plan-odv",
    structurePlanStatus: "valid",
    reconstructionPackageArtifactId: "reconstruction-artifact",
    candidateReviewPackageArtifactId: "review-artifact",
    candidateDiscoveryArtifactId: "candidate-discovery-artifact",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    contractVersion: "8F-1",
    createdAt: GENERATED_AT,
    lineage: {
      reconstructionPackageArtifactId: "reconstruction-artifact",
      reconstructionPackageId: "reconstruction-package-odv",
      reconstructionPackageStatus: "valid",
      reconstructionPackageContractVersion: "8E-1",
      candidateReviewPackageArtifactId: "review-artifact",
      candidateDiscoveryArtifactId: "candidate-discovery-artifact",
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      includedCandidateRefs: [],
    },
    plannedRoutes: [],
    plannedNavigation: [],
    plannedSections: [{ plannedSectionId: "planned-hero", plannedRouteId: "planned-home", sectionOrder: 0, sourceCandidateIds: ["candidate-section-hero"], assignmentIds: [], diagnostics: [] }],
    assignments: [],
    limitations: [],
    diagnostics: [],
  };
}

function builderInput(): SourceWebsiteUnderstandingBuilderInput {
  return {
    siteVersionId: SITE_VERSION_ID,
    sourceSiteId: "odv-site",
    generatedAt: GENERATED_AT,
    siteVersionCreatedAt: GENERATED_AT,
    rawImportedSiteArtifact: rawImportedSiteArtifact(),
    provenanceSummary: provenanceSummary(),
    firstLimitedDryRunOutput: firstLimitedDryRunOutput(),
    candidateDiscoveryArtifact: {
      kind: "candidate_discovery_result",
      artifactKind: "candidate_discovery_result",
      artifactVersion: 1,
      artifactId: "candidate-discovery-artifact",
      discoveryId: "discovery-odv",
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      createdAt: GENERATED_AT,
      persistedAt: GENERATED_AT,
      result: candidateDiscovery(),
      validation: { valid: true, errors: [], warnings: [] },
      validationStatus: "valid",
    },
    candidateDiscoveryResult: candidateDiscovery(),
    candidateReviewArtifact: {
      kind: "candidate_review_package",
      artifactKind: "candidate_review_package",
      artifactVersion: 1,
      artifactId: "review-artifact",
      reviewPackageId: "review-package-odv",
      candidateDiscoveryArtifactId: "candidate-discovery-artifact",
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      createdAt: GENERATED_AT,
      persistedAt: GENERATED_AT,
      package: candidateReview(),
      validation: { valid: true, errors: [], warnings: [] },
      validationStatus: "valid",
    },
    candidateReviewPackage: candidateReview(),
    structurePlanArtifact: {
      kind: "structure_plan",
      artifactKind: "structure_plan",
      artifactVersion: 1,
      artifactId: "structure-artifact",
      structurePlanId: "structure-plan-odv",
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      status: "valid",
      createdAt: GENERATED_AT,
      persistedAt: GENERATED_AT,
      plan: structurePlan(),
      validation: { valid: true, errors: [], warnings: [] },
    },
    structurePlan: structurePlan(),
  };
}

test("builder creates deterministic projection identity and rebuild equality", () => {
  const first = buildSourceWebsiteUnderstandingProjection(builderInput());
  const second = buildSourceWebsiteUnderstandingProjection(builderInput());
  const validation = validateSourceWebsiteUnderstandingProjection(first);

  assert.equal(first.projectionId, second.projectionId);
  assert.deepEqual(first, second);
  assert.deepEqual(validation.errors, []);
});

test("builder exposes source, routes, navigation, sections, and fail-closed readiness", () => {
  const projection = buildSourceWebsiteUnderstandingProjection(builderInput());

  assert.equal(projection.sourceSiteId, "odv-site");
  assert.equal(projection.sourceIdentity.sourceSiteId, "odv-site");
  assert.equal(projection.lineage.sourceSiteId, "odv-site");
  assert.equal(projection.sourceIdentity.sourceUrl, "https://www.odv.example/");
  assert.equal(projection.routes.some((route) => route.routePath === "/" && route.state === "reviewed"), true);
  assert.equal(projection.navigation.some((item) => item.label === "Storitve"), true);
  assert.equal(projection.sections.some((section) => section.plannedOnly && section.state === "unavailable"), true);
  assert.equal(projection.readiness.status, "ready_for_business_discovery");
  assert.equal(projection.readiness.conservativeBusinessDiscoveryCanProceed, true);
});

test("builder fails closed when sourceSiteId is missing", () => {
  const input = builderInput();
  input.sourceSiteId = null;
  const projection = buildSourceWebsiteUnderstandingProjection(input);
  const validation = validateSourceWebsiteUnderstandingProjection(projection);

  assert.equal(projection.sourceSiteId, null);
  assert.equal(projection.readiness.status, "blocked");
  assert.equal(projection.readiness.conservativeBusinessDiscoveryCanProceed, false);
  assert.equal(projection.limitations.some((item) => item.code === "SOURCE_SITE_ID_MISSING" && item.severity === "blocking"), true);
  assert.deepEqual(validation.errors, []);
});

test("builder preserves Evidence Capture limitations verbatim and deduplicates deterministically", () => {
  const input = builderInput();
  input.evidenceCaptureBaseline = {
    kind: "evidence_capture_baseline",
    artifactVersion: 1,
    captureRunId: "capture-run-1",
    persistedRefs: { rawImportArtifactId: "raw-import-odv" },
    captureStatus: "completed",
    routePath: "/",
    sourceUrl: "https://www.odv.example/",
    finalUrl: "https://www.odv.example/",
    limitations: ["missing_computed_styles", "missing_computed_styles"],
    fidelityLimitations: [
      {
        type: "rendered_dom_partial",
        affectedLayer: "evidence_capture",
        severity: "warning",
        explanation: "Rendered DOM fidelity is partial.",
        recommendedNextLayer: "manual_review",
        evidenceRefIds: ["rendered-dom"],
      },
    ],
    captureExpansionEvidence: {
      layoutGeometryEvidence: [],
      sectionBoundaryEvidence: [],
      navigationEvidence: [],
    },
    summaries: { assetInventory: { persistedAssetCount: 4 } },
  } as never;

  const projection = buildSourceWebsiteUnderstandingProjection(input);
  const baselineLimitations = projection.limitations.filter((item) => item.code === "UPSTREAM_EVIDENCE_LIMITATION");
  const fidelityLimitations = projection.limitations.filter((item) => item.code === "UPSTREAM_FIDELITY_LIMITATION");

  assert.equal(baselineLimitations.length, 1);
  assert.equal(baselineLimitations[0]?.message, "missing_computed_styles");
  assert.equal(baselineLimitations[0]?.sourceArtifactRefs?.[0]?.artifactId, "capture-run-1");
  assert.equal(fidelityLimitations.length, 1);
  assert.equal(fidelityLimitations[0]?.message, "Rendered DOM fidelity is partial.");
  assert.equal(fidelityLimitations[0]?.originalCode, "rendered_dom_partial");
  assert.deepEqual(fidelityLimitations[0]?.diagnostics?.slice(0, 3), ["rendered_dom_partial", "evidence_capture", "manual_review"]);
  assert.equal(projection.projectionId, buildSourceWebsiteUnderstandingProjection(input).projectionId);
});

test("builder keeps reviewed rejected candidates visible and separate from source truth", () => {
  const projection = buildSourceWebsiteUnderstandingProjection(builderInput());
  const rejected = projection.sections.find((section) => section.sourceCandidateId === "candidate-section-hero" && !section.plannedOnly);

  assert.equal(rejected?.state, "rejected");
  assert.equal(rejected?.reviewState, "rejected");
  assert.equal(projection.businessSignalCandidates.offerings.every((item) => item.state !== "confirmed_source_fact"), true);
});

test("builder projects asset, logo, color, and typography signals from existing evidence only", () => {
  const projection = buildSourceWebsiteUnderstandingProjection(builderInput());

  assert.equal(projection.assets.some((asset) => asset.path === "uploads/Tabla40x20cm_51.png" && asset.candidateMeaning === "logo_candidate"), true);
  assert.equal(projection.visualIdentitySignals.logoCandidates.some((candidate) => candidate.assetPath === "uploads/Tabla40x20cm_51.png" && candidate.state === "candidate"), true);
  assert.equal(projection.visualIdentitySignals.colorSignals.some((signal) => signal.value === "#b8874f" && signal.state === "structured"), true);
  assert.equal(projection.visualIdentitySignals.typographySignals.some((signal) => signal.family.includes("Nationale") && signal.role === "local_font_file"), true);
  assert.equal(projection.visualIdentitySignals.typographySignals.some((signal) => signal.family.includes("fontello") && signal.role === "icon_font"), true);
});

test("builder marks missing classifiers without consuming downstream business truth", () => {
  const input = builderInput();
  input.provenanceSummary = {
    ...input.provenanceSummary,
    semanticImport: {
      ...input.provenanceSummary?.semanticImport,
      navigation: [],
      sections: [],
    },
  } as RuntimeImportProvenanceSummary;
  const projection = buildSourceWebsiteUnderstandingProjection(input);

  assert.equal(projection.businessSignalCandidates.unresolvedEvidence.some((gap) => gap.includes("offering evidence is not classified")), true);
  assert.equal(projection.limitations.some((item) => item.code === "OFFERING_CLASSIFIER_MISSING"), true);
  assert.equal(validateSourceWebsiteUnderstandingProjection({ ...projection, digitalBusinessTwin: {} }).valid, false);
});

test("builder returns partial projection when Candidate Discovery and Review are missing", () => {
  const input = builderInput();
  input.candidateDiscoveryArtifact = null;
  input.candidateDiscoveryResult = null;
  input.candidateReviewArtifact = null;
  input.candidateReviewPackage = null;

  const projection = buildSourceWebsiteUnderstandingProjection(input);

  assert.equal(projection.readiness.status, "ready_for_business_discovery");
  assert.equal(projection.limitations.some((item) => item.code === "CANDIDATE_DISCOVERY_MISSING"), true);
  assert.equal(projection.limitations.some((item) => item.code === "CANDIDATE_REVIEW_MISSING"), true);
});
