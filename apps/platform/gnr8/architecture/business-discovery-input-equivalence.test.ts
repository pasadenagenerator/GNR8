import assert from "node:assert/strict";
import test from "node:test";

import type { BusinessDiscoveryBuilderInput } from "./business-discovery-builder";
import {
  createWebsiteUnderstandingCoverageReport,
  validateBusinessDiscoveryInputEquivalence,
} from "./business-discovery-input-equivalence";
import type { SourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-contract";

const GENERATED_AT = "2026-07-14T00:00:00.000Z";

function confidence(level: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM") {
  return { level, reasons: [`test_${level.toLowerCase()}_confidence`] };
}

function projection(input: {
  siteVersionId?: string;
  dryRunId?: string | null;
  sourceUrl?: string | null;
  routePaths?: string[];
  navigationLabels?: string[];
  sectionTypes?: string[];
  assetPaths?: string[];
  limitations?: string[];
  diagnostics?: string[];
  logoCount?: number;
  withReview?: boolean;
  withReconstruction?: boolean;
  withStructurePlan?: boolean;
} = {}): SourceWebsiteUnderstandingProjection {
  const siteVersionId = input.siteVersionId ?? "site-version-equivalence";
  const dryRunId = input.dryRunId === undefined ? "dry-run-equivalence" : input.dryRunId;
  const sourceUrl = input.sourceUrl === undefined ? "https://www.example.test/" : input.sourceUrl;
  const hostname = sourceUrl ? new URL(sourceUrl).hostname : null;
  const routePaths = input.routePaths ?? ["/"];
  const navigationLabels = input.navigationLabels ?? ["Services", "Contact"];
  const sectionTypes = input.sectionTypes ?? ["hero"];
  const assetPaths = input.assetPaths ?? ["uploads/logo.png", "fonts/body.woff2"];
  const language = {
    signalId: "language:en",
    language: "en",
    source: "semantic_import" as const,
    state: "structured" as const,
    confidence: confidence(),
    evidenceRefs: ["semantic-import:language"],
  };
  const sourceArtifactRefs = sourceUrl
    ? [{ kind: "raw_imported_site", artifactId: "raw-artifact", canonicalId: "raw-artifact", source: "raw_artifact" as const }]
    : [];
  const evidenceArtifactRefs = [{ kind: "semantic_import", artifactId: "semantic-artifact", source: "semantic_import" as const }];
  const candidateArtifactRefs = [{ kind: "candidate_discovery_result", artifactId: "candidate-artifact", canonicalId: "candidate-discovery", source: "candidate_discovery" as const }];
  const reviewArtifactRefs = input.withReview === false ? [] : [{ kind: "candidate_review_package", artifactId: "review-artifact", canonicalId: "review-package", source: "candidate_review" as const }];
  const reconstructionArtifactRefs = input.withReconstruction === false ? [] : [{ kind: "reconstruction_package", artifactId: "reconstruction-artifact", canonicalId: "reconstruction-package", source: "reconstruction_package" as const }];
  const planningContextArtifactRefs = input.withStructurePlan === false ? [] : [{ kind: "structure_plan", artifactId: "structure-artifact", canonicalId: "structure-plan", source: "structure_plan" as const }];
  const allRefs = [
    ...sourceArtifactRefs,
    ...evidenceArtifactRefs,
    ...candidateArtifactRefs,
    ...reviewArtifactRefs,
    ...reconstructionArtifactRefs,
    ...planningContextArtifactRefs,
  ];
  return {
    projectionId: "source_website_understanding_equivalence_fixture",
    contractVersion: "WU-2",
    generatedAt: GENERATED_AT,
    siteVersionId,
    dryRunId,
    connectorType: "rendered_browser",
    sourceIdentity: {
      siteVersionId,
      dryRunId,
      sourceUrl,
      finalUrl: sourceUrl,
      hostname,
      connectorType: "rendered_browser",
      importIdentity: "raw-artifact",
      importedAt: GENERATED_AT,
      captureCompletedAt: GENERATED_AT,
      sourceAvailability: sourceUrl ? "available" : "unavailable",
      languageSignals: [language],
      evidenceRefs: sourceUrl ? ["raw-imported-site:source-url"] : [],
    },
    sourceArtifactRefs,
    evidenceArtifactRefs,
    candidateArtifactRefs,
    reviewArtifactRefs,
    reconstructionArtifactRefs,
    planningContextArtifactRefs,
    pages: routePaths.map((routePath) => ({
      pageId: `page:${routePath}`,
      routePath,
      title: "Example",
      sourceUrl,
      availability: "available" as const,
      state: "structured" as const,
      confidence: confidence(),
      evidenceRefs: [`page:${routePath}`],
      limitations: [],
    })),
    routes: routePaths.map((routePath) => ({
      routeId: `route:${routePath}`,
      routePath,
      sourceUrl,
      title: null,
      purposeCandidate: null,
      state: "structured" as const,
      reviewState: "not_applicable" as const,
      confidence: confidence(),
      evidenceRefs: [`route:${routePath}`],
      limitations: [],
    })),
    navigation: navigationLabels.map((label, index) => ({
      navigationId: `navigation:${index}:${label}`,
      routePath: "/",
      label,
      href: `/${label.toLowerCase()}`,
      navigationKind: label === "Contact" ? "contact" as const : "primary" as const,
      state: "structured" as const,
      reviewState: "not_applicable" as const,
      confidence: confidence(),
      evidenceRefs: [`navigation:${label}`],
      sourceCandidateId: null,
    })),
    sections: sectionTypes.map((semanticType, index) => ({
      sectionId: `section:${index}:${semanticType}`,
      routePath: "/",
      order: index,
      heading: semanticType,
      semanticType,
      observedBoundary: true,
      plannedOnly: false,
      state: "structured" as const,
      reviewState: "not_applicable" as const,
      confidence: confidence(),
      evidenceRefs: [`section:${semanticType}`],
      sourceCandidateId: null,
      limitations: [],
    })),
    content: [{
      contentId: "content:/",
      routePath: "/",
      bodyTextAvailable: Boolean(sourceUrl),
      classificationStatus: sourceUrl ? "structured" as const : "missing" as const,
      headings: ["Services for customers"],
      contentThemes: sectionTypes,
      visibleMessages: sourceUrl ? ["Trusted service for customers"] : [],
      ctaSignals: sourceUrl ? ["Contact us"] : [],
      contactSignals: sourceUrl ? ["Contact us"] : [],
      forms: [],
      downloads: [],
      metadata: { title: "Example" },
      structuredDataAvailable: false,
      confidence: confidence(),
      evidenceRefs: sourceUrl ? ["semantic-import"] : [],
      limitations: [],
    }],
    assets: assetPaths.map((path) => ({
      assetId: `asset:${path}`,
      path,
      filename: path.split("/").pop() ?? path,
      mediaType: path.endsWith(".woff2") ? "font/woff2" : "image/png",
      sizeBytes: 100,
      sha256: path,
      assetKind: path.endsWith(".woff2") ? "font" as const : "image" as const,
      dimensions: null,
      usages: [],
      altText: path.includes("logo") ? "Logo" : null,
      repeatedUsageCount: 1,
      inventoryState: "observed" as const,
      evidenceState: "structured" as const,
      candidateMeaningState: path.includes("logo") ? "candidate" as const : "unavailable" as const,
      candidateMeaning: path.includes("logo") ? "logo_candidate" : null,
      reviewState: "not_applicable" as const,
      previewHref: null,
      confidence: confidence(),
      evidenceRefs: [`asset:${path}`],
      limitations: [],
    })),
    visualIdentitySignals: {
      logoCandidates: Array.from({ length: input.logoCount ?? 1 }).map((_, index) => ({
        candidateId: `logo:${index}`,
        assetPath: "uploads/logo.png",
        label: "Logo",
        state: "candidate" as const,
        confidence: confidence(),
        signals: ["alt text: Logo"],
        previewHref: null,
        evidenceRefs: ["asset:uploads/logo.png"],
        reviewState: "not_applicable" as const,
      })),
      colorSignals: [{ signalId: "color:primary", value: "#123456", label: "primary", source: "style_signal_model" as const, state: "structured" as const, confidence: confidence(), evidenceRefs: ["style:colors"] }],
      typographySignals: [{ signalId: "font:body", family: "Inter", role: "body" as const, source: "asset_inventory" as const, localAvailability: "available" as const, state: "observed" as const, confidence: confidence(), evidenceRefs: ["asset:fonts/body.woff2"] }],
      iconStyleSignals: [],
      imageStyleSignals: [],
      unresolvedSignals: [],
      limitations: [],
    },
    businessSignalCandidates: {
      offerings: [{ candidateId: "offering:services", label: "Services", state: "candidate" as const, confidence: confidence("LOW"), source: "navigation" as const, evidenceRefs: ["navigation:Services"], reviewState: "not_applicable" as const, conflicts: [], limitations: [] }],
      audiences: [{ candidateId: "audience:customers", label: "customers", state: "candidate" as const, confidence: confidence("LOW"), source: "heading" as const, evidenceRefs: ["semantic-import:heading"], reviewState: "not_applicable" as const, conflicts: [], limitations: [] }],
      trust: [{ candidateId: "trust:trusted", label: "Trusted service", state: "candidate" as const, confidence: confidence("LOW"), source: "semantic_import" as const, evidenceRefs: ["semantic-import:message"], reviewState: "not_applicable" as const, conflicts: [], limitations: [] }],
      goals: [],
      identity: [],
      differentiators: [],
      geography: [],
      languages: [language],
      unresolvedEvidence: [],
      limitations: [],
    },
    technicalSignals: {
      title: "Example",
      meta: {},
      canonicalUrl: sourceUrl,
      headingStructure: ["Services for customers"],
      structuredDataAvailable: false,
      robotsEvidence: ["robots:available"],
      sitemapEvidence: [],
      languageMetadata: [language],
      accessibilityObservations: [],
      externalScripts: [],
      technologyHints: [],
      widgets: [],
      socialMetadata: [],
      confidence: confidence(),
      evidenceRefs: ["semantic-import"],
    },
    readiness: {
      status: sourceUrl ? "ready_for_business_discovery" : "blocked",
      conservativeBusinessDiscoveryCanProceed: Boolean(sourceUrl),
      summary: sourceUrl ? "Ready fixture." : "Blocked fixture.",
      dimensions: [],
      blockers: [],
    },
    confidence: confidence(),
    limitations: (input.limitations ?? ["CANDIDATE_REVIEW_MISSING"]).map((code) => ({
      limitationId: `limitation:${code}`,
      severity: "warning" as const,
      code,
      message: code,
      sourceRefs: [],
    })),
    diagnostics: (input.diagnostics ?? []).map((code) => ({ code, message: code, sourceRefs: ["runtime-import-provenance"] })),
    lineage: {
      siteVersionId,
      dryRunId,
      contractVersion: "WU-2",
      sourceArtifactRefs,
      evidenceArtifactRefs,
      candidateArtifactRefs,
      reviewArtifactRefs,
      reconstructionArtifactRefs,
      planningContextArtifactRefs,
      deterministicInputs: {
        siteVersionId,
        dryRunId,
        contractVersion: "WU-2",
        artifactIds: allRefs.map((ref) => ref.artifactId ?? ref.canonicalId).filter((id): id is string => Boolean(id)).sort(),
      },
    },
  };
}

function existingInput(input: Partial<BusinessDiscoveryBuilderInput> = {}): BusinessDiscoveryBuilderInput {
  return {
    siteVersionId: input.siteVersionId ?? "site-version-equivalence",
    dryRunId: input.dryRunId ?? "dry-run-equivalence",
    sourceSiteId: input.sourceSiteId,
    sourceUrl: input.sourceUrl ?? "https://www.example.test/",
    createdAt: GENERATED_AT,
    evidenceCaptureBaseline: {
      routePath: "/",
      sourceUrl: input.sourceUrl ?? "https://www.example.test/",
      finalUrl: input.sourceUrl ?? "https://www.example.test/",
      limitations: [],
      fidelityLimitations: [],
      captureExpansionEvidence: {
        layoutGeometryEvidence: [],
        sectionBoundaryEvidence: [{ sectionId: "hero", routePath: "/", regionType: "hero", selector: "main", boundingBox: { x: 0, y: 0, width: 100, height: 100 }, confidenceLevel: "HIGH" }],
        navigationEvidence: [{ routePath: "/", navigationItems: [{ label: "Services", href: "/services", position: 0, confidenceLevel: "HIGH" }, { label: "Contact", href: "/contact", position: 1, confidenceLevel: "HIGH" }], navigationCount: 2, sourceEvidenceRefs: ["nav"] }],
      },
      summaries: { assetInventory: { persistedAssetCount: 2 } },
    } as never,
    candidateDiscoveryArtifactId: "candidate-artifact",
    candidateDiscoveryResult: {
      discoveryId: "candidate-discovery",
      siteVersionId: input.siteVersionId ?? "site-version-equivalence",
      dryRunId: input.dryRunId ?? "dry-run-equivalence",
      createdAt: GENERATED_AT,
      candidateCount: 1,
      candidateTypesPresent: ["route"],
      candidates: [{ candidateId: "candidate-route", candidateType: "route", candidateStatus: "valid", routePath: "/", confidence: { level: "HIGH", reasons: ["route"] }, sourceEvidenceRefs: [], sourceDryRunRefs: [], limitations: [], diagnostics: [] }],
      limitations: [],
      diagnostics: [],
    },
    ...input,
  };
}

test("dependency mapping reports current Business Discovery inputs deterministically", () => {
  const result = validateBusinessDiscoveryInputEquivalence(projection(), existingInput({ sourceSiteId: "source-site-1" }));

  assert.equal(result.matrix.length >= 14, true);
  assert.equal(result.matrix.find((row) => row.dependencyId === "import.source_url")?.alreadyProjected, "YES");
  assert.equal(result.matrix.find((row) => row.dependencyId === "runtime.source_site_id")?.alreadyProjected, "NO");
  assert.equal(result.matrix.find((row) => row.dependencyId === "evidence_capture.asset_inventory_count")?.strength, "stronger");
  assert.equal(result.obsoleteRuntimeAssemblies.some((item) => item.includes("route inventory aggregation")), true);
});

test("coverage report includes the required Website Understanding categories", () => {
  const report = createWebsiteUnderstandingCoverageReport(projection());

  assert.equal(report.categories.some((row) => row.category === "Identity" && row.status === "YES"), true);
  assert.equal(report.categories.some((row) => row.category === "Body content" && row.status === "PARTIAL"), true);
  assert.equal(report.categories.some((row) => row.category === "Logo candidates" && row.status === "YES"), true);
  assert.equal(report.categories.some((row) => row.category === "Goals" && row.status === "NO"), true);
  assert.equal(report.coveragePercent > 70, true);
});

test("equivalence validator detects missing dependencies fail-closed", () => {
  const result = validateBusinessDiscoveryInputEquivalence(
    projection({ sourceUrl: null, routePaths: [], navigationLabels: [], sectionTypes: [], assetPaths: [], logoCount: 0, withReview: false, withReconstruction: false, withStructurePlan: false }),
    existingInput(),
  );

  assert.equal(result.missing.some((row) => row.dependencyId === "import.source_url"), true);
  assert.equal(result.missing.some((row) => row.dependencyId === "import.route_inventory"), true);
  assert.equal(result.migrationBlockers.some((item) => item.includes("source URL")), true);
  assert.equal(result.coveragePercent < 70, true);
});

test("equivalence validator detects duplicate and conflicting projection signals", () => {
  const result = validateBusinessDiscoveryInputEquivalence(
    projection({
      sourceUrl: "https://different.example/",
      routePaths: ["/", "/"],
      navigationLabels: ["Services", "Services"],
      assetPaths: ["uploads/logo.png", "uploads/logo.png"],
      limitations: ["DUPLICATE_LIMITATION", "DUPLICATE_LIMITATION"],
    }),
    existingInput(),
  );

  assert.equal(result.conflicting.some((item) => item.includes("source URL differs")), true);
  assert.equal(result.duplicate.some((item) => item.includes("routePath duplicates /")), true);
  assert.equal(result.duplicate.some((item) => item.includes("asset path duplicates uploads/logo.png")), true);
  assert.equal(result.duplicate.some((item) => item.includes("limitation code duplicates DUPLICATE_LIMITATION")), true);
});

test("ODV-shaped fixture is migration-ready except documented projection gaps", () => {
  const result = validateBusinessDiscoveryInputEquivalence(
    projection({
      siteVersionId: "09dce7ea-d860-4f60-a1eb-26c3335b302e",
      dryRunId: "09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l",
      sourceUrl: "https://www.odv-cvijanovic.si/",
      navigationLabels: ["Storitve", "Kontakt"],
      sectionTypes: ["hero", "services"],
      assetPaths: ["uploads/Tabla40x20cm_51.png", "fonts/Nationale-Regular.woff2"],
    }),
    existingInput({
      siteVersionId: "09dce7ea-d860-4f60-a1eb-26c3335b302e",
      dryRunId: "09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l",
      sourceUrl: "https://www.odv-cvijanovic.si/",
    }),
  );

  assert.equal(result.coveragePercent >= 80, true);
  assert.equal(result.conflicting.length, 0);
  assert.equal(result.missing.some((row) => row.dependencyId === "import.source_url"), false);
});

test("ViroiDoc-shaped fixture exposes section weakness without inventing coverage", () => {
  const result = validateBusinessDiscoveryInputEquivalence(
    projection({
      siteVersionId: "e26b0754-988b-45b9-9e24-8e213179b6cf",
      dryRunId: "e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n",
      sourceUrl: "https://www.viroidoc.eu/",
      navigationLabels: ["Project", "People", "News"],
      sectionTypes: [],
      assetPaths: ["assets/site.css"],
      logoCount: 0,
    }),
    existingInput({
      siteVersionId: "e26b0754-988b-45b9-9e24-8e213179b6cf",
      dryRunId: "e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n",
      sourceUrl: "https://www.viroidoc.eu/",
    }),
  );

  assert.equal(result.matrix.find((row) => row.dependencyId === "evidence_capture.section_region_types")?.alreadyProjected, "NO");
  assert.equal(result.migrationBlockers.some((item) => item.includes("sections")), true);
});
