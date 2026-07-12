import assert from "node:assert/strict";
import test from "node:test";

import { loadGenerationBusinessFoundationProjection } from "./generation-business-foundation-projection";
import type { RawImportedSiteArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";

function confidence(level: "LOW" | "MEDIUM" | "HIGH" = "HIGH") {
  return { level, reasons: [`fixture_${level.toLowerCase()}_confidence`] };
}

function knowledge(input: {
  id: string;
  domain: string;
  statement: string;
  kind?: string;
  level?: "LOW" | "MEDIUM" | "HIGH";
  evidenceCount?: number;
  limitations?: string[];
}) {
  return {
    knowledgeItemId: input.id,
    domain: input.domain,
    status: "observed",
    kind: input.kind ?? "aligned_business_knowledge",
    statement: input.statement,
    sourceFindingIds: [`finding:${input.domain}`],
    evidenceRefs: Array.from({ length: input.evidenceCount ?? 1 }, (_, index) => ({
      refId: `evidence:${input.id}:${index}`,
      sourceKind: "fixture",
    })),
    confidence: confidence(input.level ?? "HIGH"),
    limitations: input.limitations ?? [],
    diagnostics: [],
  };
}

function missing(domain: string) {
  return {
    missingKnowledgeId: `missing:${domain}`,
    domain,
    reason: `Missing confirmed ${domain} knowledge.`,
    sourceLimitationIds: [`limitation:${domain}`],
    diagnostics: [],
  };
}

function record(input: {
  kind: string;
  artifactId: string;
  canonicalKey: string;
  canonicalId: string;
  status?: string;
  persistedAt?: string;
  artifact?: Record<string, unknown>;
}) {
  return {
    kind: input.kind,
    artifactKind: input.kind,
    artifactVersion: 1,
    artifactId: input.artifactId,
    [input.canonicalKey]: input.canonicalId,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: "dry-run-business-foundation",
    status: input.status ?? "valid",
    persistedAt: input.persistedAt ?? "2026-07-11T08:00:00.000Z",
    artifact: {
      [input.canonicalKey]: input.canonicalId,
      siteVersionId: SITE_VERSION_ID,
      dryRunId: "dry-run-business-foundation",
      status: input.status ?? "valid",
      confidence: confidence("HIGH"),
      limitations: [],
      diagnostics: [],
      ...(input.artifact ?? {}),
    },
  };
}

function rawImportedArtifact(): RawImportedSiteArtifact {
  return {
    id: "raw_imported_site_foundation",
    artifactType: "raw_imported_site",
    siteId: "ODV",
    siteVersionId: SITE_VERSION_ID,
    entryHtmlPath: "index.html",
    assetBasePath: ".",
    fileMap: {
      "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 1000, sha256: "html" },
      "uploads/odv-logo.png": { path: "uploads/odv-logo.png", mediaType: "image/png", sizeBytes: 12000, sha256: "logo" },
      "uploads/studio-photo.jpg": { path: "uploads/studio-photo.jpg", mediaType: "image/jpeg", sizeBytes: 42000, sha256: "photo" },
      "assets/site-icon.svg": { path: "assets/site-icon.svg", mediaType: "image/svg+xml", sizeBytes: 900, sha256: "icon" },
      "fonts/brand.woff2": { path: "fonts/brand.woff2", mediaType: "font/woff2", sizeBytes: 8000, sha256: "font" },
      "assets/app.bin": { path: "assets/app.bin", mediaType: "application/octet-stream", sizeBytes: 1, sha256: "unknown" },
    },
    metadata: {
      sourceUrl: "https://odv.example/",
      finalUrl: "https://odv.example/",
      htmlByteLength: 1000,
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: 5, externalFallbackAssetCount: 0 },
    },
    createdAt: "2026-07-11T08:30:00.000Z",
  };
}

function baseSummary(input: {
  confidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
  missingAudience?: boolean;
  missingOfferings?: boolean;
  noEvidence?: boolean;
  limitationCount?: number;
} = {}): RuntimeImportProvenanceSummary {
  const sourceDbt = record({
    kind: "digital_business_twin",
    artifactId: "digital_business_twin_source",
    canonicalKey: "digitalBusinessTwinId",
    canonicalId: "dbt-source",
    status: "observed",
    persistedAt: "1",
    artifact: {
      digitalBusinessTwinId: "dbt-source",
      knowledgeItems: [knowledge({
        id: "source-identity",
        domain: "business_identity",
        statement: "ODV is a business represented by imported website evidence.",
      })],
      missingKnowledge: [],
      confidence: confidence("HIGH"),
    },
  });

  const missingKnowledge = [
    ...(input.missingAudience ? [missing("audience")] : []),
    ...(input.missingOfferings ? [missing("offerings")] : []),
  ];
  const alignedKnowledge = [
    knowledge({
      id: "identity",
      domain: "business_identity",
      statement: "ODV is a studio with an evidence-backed imported business identity.",
      level: input.confidenceLevel,
      evidenceCount: input.noEvidence ? 0 : 2,
    }),
    ...(!input.missingOfferings ? [knowledge({
      id: "offerings",
      domain: "offerings",
      statement: "ODV offers design services and website planning.",
      kind: "service_offering",
      level: input.confidenceLevel,
      evidenceCount: input.noEvidence ? 0 : 2,
    })] : []),
    ...(!input.missingAudience ? [knowledge({
      id: "audience",
      domain: "audience",
      statement: "The known audience is clients who need website clarity.",
      level: input.confidenceLevel,
      evidenceCount: input.noEvidence ? 0 : 1,
    })] : []),
    knowledge({ id: "goals", domain: "goals", statement: "The business goal is qualified inquiries.", evidenceCount: input.noEvidence ? 0 : 1 }),
    knowledge({ id: "brand", domain: "brand", statement: "The brand tone is calm and practical.", evidenceCount: input.noEvidence ? 0 : 1 }),
    knowledge({ id: "content", domain: "content", statement: "The website should explain services and proof.", evidenceCount: input.noEvidence ? 0 : 1 }),
    knowledge({ id: "trust", domain: "trust", statement: "Trust relies on examples and clear contact routes.", evidenceCount: input.noEvidence ? 0 : 1 }),
    knowledge({ id: "digital", domain: "digital_presence", statement: "The digital presence is the imported website.", evidenceCount: input.noEvidence ? 0 : 1 }),
    knowledge({ id: "constraints", domain: "constraints", statement: "Unknown facts must remain unresolved.", evidenceCount: input.noEvidence ? 0 : 1 }),
  ];

  const alignedDbt = record({
    kind: "digital_business_twin",
    artifactId: "digital_business_twin_aligned",
    canonicalKey: "digitalBusinessTwinId",
    canonicalId: "dbt-aligned",
    status: input.missingAudience || input.missingOfferings ? "partial" : "aligned",
    persistedAt: "2",
    artifact: {
      digitalBusinessTwinId: "dbt-aligned",
      knowledgeItems: alignedKnowledge,
      missingKnowledge,
      confidence: confidence(input.confidenceLevel ?? "HIGH"),
      limitations: Array.from({ length: input.limitationCount ?? 0 }, (_, index) => `limitation-${index}`),
    },
  });

  return {
    kind: "runtime_import_provenance_summary_v1",
    businessDiscoveryArtifacts: [record({
      kind: "business_discovery",
      artifactId: "business_discovery_foundation",
      canonicalKey: "businessDiscoveryId",
      canonicalId: "bd-1",
      status: "partial",
      artifact: { sourceSiteId: "ODV", confidence: confidence("HIGH") },
    })],
    digitalBusinessTwinArtifacts: [sourceDbt, alignedDbt],
    businessUnderstandingReportArtifacts: [record({
      kind: "business_understanding_report",
      artifactId: "business_understanding_report_foundation",
      canonicalKey: "businessUnderstandingReportId",
      canonicalId: "bur-1",
      artifact: { lineage: { sourceDigitalBusinessTwinId: "dbt-source" } },
    })],
    businessAlignmentArtifacts: [record({
      kind: "business_alignment",
      artifactId: "business_alignment_foundation",
      canonicalKey: "businessAlignmentId",
      canonicalId: "ba-1",
      status: "applied",
      artifact: { lineage: { outputDigitalBusinessTwinId: "dbt-aligned" } },
    })],
    websiteDesignBriefArtifacts: [record({
      kind: "website_design_brief",
      artifactId: "website_design_brief_foundation",
      canonicalKey: "websiteDesignBriefId",
      canonicalId: "wdb-1",
      status: input.missingAudience || input.missingOfferings ? "partial" : "valid",
    })],
    websiteGenerationPackageArtifacts: [record({
      kind: "website_generation_package",
      artifactId: "website_generation_package_foundation",
      canonicalKey: "websiteGenerationPackageId",
      canonicalId: "wgp-1",
      status: input.missingAudience || input.missingOfferings ? "partial" : "valid",
    })],
    generatedWebsiteProposalArtifacts: [
      record({
        kind: "generated_website_proposal",
        artifactId: "generated_proposal_1",
        canonicalKey: "generatedWebsiteProposalId",
        canonicalId: "proposal-1",
        status: "quarantined",
        persistedAt: "3",
        artifact: { createdAt: "2026-07-11T09:00:00.000Z" },
      }),
      record({
        kind: "generated_website_proposal",
        artifactId: "generated_proposal_2",
        canonicalKey: "generatedWebsiteProposalId",
        canonicalId: "proposal-2",
        status: "quarantined",
        persistedAt: "4",
        artifact: { createdAt: "2026-07-11T10:00:00.000Z" },
      }),
    ],
    observedWebsiteModelArtifacts: [
      record({
        kind: "observed_website_model",
        artifactId: "observed_1",
        canonicalKey: "observedWebsiteModelId",
        canonicalId: "observed-1",
        status: "observable",
        artifact: { sourceGeneratedWebsiteProposalId: "proposal-1" },
      }),
      record({
        kind: "observed_website_model",
        artifactId: "observed_2",
        canonicalKey: "observedWebsiteModelId",
        canonicalId: "observed-2",
        status: "observable",
        artifact: { sourceGeneratedWebsiteProposalId: "proposal-2" },
      }),
    ],
    generationContractComplianceArtifacts: [
      record({
        kind: "generation_contract_compliance",
        artifactId: "compliance_1",
        canonicalKey: "generationContractComplianceId",
        canonicalId: "gcc-1",
        status: "non_compliant",
        artifact: {
          sourceObservedWebsiteModelId: "observed-1",
          categoryResults: [
            { category: "business_identity", status: "compliant" },
            { category: "asset_presence", status: "non_compliant" },
          ],
        },
      }),
      record({
        kind: "generation_contract_compliance",
        artifactId: "compliance_2",
        canonicalKey: "generationContractComplianceId",
        canonicalId: "gcc-2",
        status: "non_compliant",
        artifact: {
          sourceObservedWebsiteModelId: "observed-2",
          categoryResults: [
            { category: "business_identity", status: "compliant" },
            { category: "asset_presence", status: "compliant" },
            { category: "audience", status: "non_compliant" },
          ],
        },
      }),
    ],
    generationEvolutionAnalysisArtifacts: [
      record({
        kind: "generation_evolution_analysis",
        artifactId: "evolution_1_to_2",
        canonicalKey: "generationEvolutionAnalysisId",
        canonicalId: "gea-1",
        status: "complete",
        artifact: {
          overallAssessment: "meaningful_improvement",
          previousIteration: { complianceArtifactId: "compliance_1" },
          currentIteration: { complianceArtifactId: "compliance_2" },
          categoryEvolution: [
            { category: "asset_presence", transition: "newly_compliant" },
          ],
          regressions: [],
          unresolvedAreas: ["audience"],
          limitations: ["audience remains unresolved"],
        },
      }),
    ],
    providerGenerationPayloadArtifacts: [record({
      kind: "provider_generation_payload",
      artifactId: "provider_generation_payload_out_of_scope",
      canonicalKey: "providerGenerationPayloadId",
      canonicalId: "payload-1",
    })],
  } as unknown as RuntimeImportProvenanceSummary;
}

async function project(summary = baseSummary(), rawArtifact: RawImportedSiteArtifact | null = rawImportedArtifact()) {
  return loadGenerationBusinessFoundationProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      getSiteVersion: async () => ({
        id: SITE_VERSION_ID,
        siteId: "ODV",
        versionNo: 1,
        state: "READY",
        createdAt: "2026-07-11T08:00:00.000Z",
        importProvenanceSummary: summary,
      }),
      getRawImportedSiteArtifact: async () => rawArtifact,
      getRawTemplateSiteAsset: async ({ filePath }) => {
        if (!rawArtifact?.fileMap[filePath]) return null;
        if (filePath === "assets/app.bin") return null;
        return {
          mediaType: rawArtifact.fileMap[filePath]!.mediaType,
          sizeBytes: rawArtifact.fileMap[filePath]!.sizeBytes,
          sha256: rawArtifact.fileMap[filePath]!.sha256,
        };
      },
      getPreviewBundleAvailability: async (iteration) => ({
        iteration: iteration as 1 | 2,
        proposalArtifactId: `generated_proposal_${iteration}`,
        outputBundleId: `ODV_GENERATED_PROPOSAL_00${iteration}`,
        bundleLabel: `ODV_GENERATED_PROPOSAL_00${iteration}`,
        bundleRoot: "/tmp/not-used",
        entryFile: "source/index.html",
        available: true,
        unavailableReason: null,
      }),
    },
  });
}

test("loads only business foundation artifacts into the artifact explorer", async () => {
  const model = await project();

  assert.deepEqual(model.artifactExplorer.map((artifact) => artifact.label), [
    "Business Discovery",
    "Digital Business Twin",
    "Business Understanding Report",
    "Business Alignment",
    "Aligned Digital Business Twin",
    "Website Design Brief",
    "Website Generation Package",
  ]);
  assert.equal(model.artifactExplorer.some((artifact) => artifact.kind === "provider_generation_payload"), false);
  assert.equal(model.artifactExplorer.find((artifact) => artifact.label === "Aligned Digital Business Twin")?.artifactId, "digital_business_twin_aligned");
});

test("projects business summary, offerings, audience, and knowledge groups", async () => {
  const model = await project();

  assert.equal(model.summary.businessName, "ODV");
  assert.match(model.summary.businessIdentity ?? "", /imported business identity/);
  assert.equal(model.offerings.knownOfferings.length, 1);
  assert.equal(model.offerings.knownServices.length, 1);
  assert.equal(model.audience.knownAudience.length, 1);
  assert.deepEqual(model.knowledgeGroups.map((group) => group.label), [
    "Identity",
    "Offerings",
    "Goals",
    "Brand",
    "Content",
    "Trust",
    "Digital Presence",
    "Constraints",
  ]);
  assert.equal(model.knowledgeGroups.every((group) => typeof group.evidenceCount === "number"), true);
});

test("projects original website link, generated iteration links, and latest status", async () => {
  const model = await project();

  assert.equal(model.sourceWebsite.url, "https://odv.example/");
  assert.equal(model.sourceWebsite.hostname, "odv.example");
  assert.equal(model.hero.primaryLinks.evolutionHref, `/gnr8/admin/evolution/${SITE_VERSION_ID}`);
  assert.deepEqual(model.generatedIterations.map((iteration) => iteration.previewHref), [
    `/gnr8/admin/evolution/${SITE_VERSION_ID}/iterations/1/preview/`,
    `/gnr8/admin/evolution/${SITE_VERSION_ID}/iterations/2/preview/`,
  ]);
  assert.equal(model.generatedIterations.at(-1)?.isLatest, true);
  assert.match(model.generatedIterations.at(-1)?.resultSummary ?? "", /meaningful improvement/);
  assert.match(model.generatedIterations.at(-1)?.resultSummary ?? "", /newly compliant/);
  assert.match(model.generatedIterations.at(-1)?.resultSummary ?? "", /no regressions/);
  assert.equal(model.generatedIterations.at(-1)?.complianceState, "non_compliant");
});

test("projects business narrative and unresolved offering/audience states", async () => {
  const model = await project(baseSummary({ missingAudience: true, missingOfferings: true }));

  assert.match(model.narrative.headline, /imported business identity/);
  assert.equal(model.productAttentionSummary.offerings, "unresolved");
  assert.equal(model.productAttentionSummary.audience, "unresolved");
  assert.equal(model.productKnowledgeGaps.some((gap) => gap.summary === "GNR8 has not yet confirmed the service portfolio."), true);
  assert.equal(model.productKnowledgeGaps.some((gap) => gap.summary === "Target audience remains unresolved."), true);
});

test("projects visual identity, logo preview, colors, typography, asset summary, and fallback classification", async () => {
  const summary = baseSummary();
  summary.evidenceCaptureBaselineArtifact = {
    computedStyle: {
      colorCandidates: [{ value: "#123456", usageCount: 4, roles: ["text"], evidenceRefIds: ["color-1"] }],
      fontsDetected: [{ family: "Brand Sans", source: "css", weight: null, style: null, evidenceRefIds: ["font-1"] }],
    },
  } as never;
  const model = await project(summary);

  assert.equal(model.visualIdentity.status, "partially_detected");
  assert.equal(model.visualIdentity.logo.assetReference, "uploads/odv-logo.png");
  assert.equal(model.visualIdentity.logo.previewHref, `/api/gnr8/runtime/preview-assets/ODV/${SITE_VERSION_ID}/uploads/odv-logo.png`);
  assert.equal(model.visualIdentity.primaryColors[0]?.value, "#123456");
  assert.equal(model.visualIdentity.typography[0]?.family, "Brand Sans");
  assert.equal(model.importedAssets.logos, 1);
  assert.equal(model.importedAssets.images, 1);
  assert.equal(model.importedAssets.icons, 1);
  assert.equal(model.importedAssets.fonts, 1);
  assert.equal(model.importedAssets.otherFiles, 1);
  assert.equal(model.importedAssets.previews.some((asset) => asset.type === "unclassified"), false);
});

test("projects honest visual identity empty states without invented CGP data", async () => {
  const model = await project(baseSummary(), null);

  assert.equal(model.visualIdentity.logo.status, "unresolved");
  assert.deepEqual(model.visualIdentity.primaryColors, []);
  assert.deepEqual(model.visualIdentity.typography, []);
  assert.equal(model.importedAssets.total, 0);
  assert.equal(model.visualIdentity.limitations.includes("No canonical brand colors are currently persisted."), true);
  assert.equal(model.visualIdentity.limitations.includes("Typography was not captured as canonical brand knowledge."), true);
});

test("distinguishes known, unknown, and assumed knowledge without inventing assumptions", async () => {
  const model = await project(baseSummary({ missingAudience: true }));

  assert.equal(model.missingKnowledge.known.length > 0, true);
  assert.equal(model.missingKnowledge.unknown.some((item) => item.includes("audience")), true);
  assert.deepEqual(model.missingKnowledge.assumed, ["No persisted assumptions were found in the business foundation artifacts."]);
});

test("projects the business-to-generation transformation timeline", async () => {
  const model = await project();

  assert.deepEqual(model.transformationStory.map((step) => step.label), [
    "Business Discovery",
    "Digital Business Twin",
    "Business Understanding",
    "Business Alignment",
    "Website Design Brief",
    "Website Generation Package",
  ]);
  assert.equal(model.transformationStory.at(-1)?.artifactId, "website_generation_package_foundation");
});

test("projects business health from existing counts and package status", async () => {
  const model = await project(baseSummary({ limitationCount: 11 }));

  assert.equal(model.businessHealth.businessConfidence.level, "HIGH");
  assert.equal(model.businessHealth.knownKnowledgeCount, 9);
  assert.equal(model.businessHealth.missingKnowledgeCount, 0);
  assert.equal(model.businessHealth.limitationCount, 11);
  assert.equal(model.businessHealth.readinessForWebsiteGeneration, "valid");
  assert.equal(model.attentionStates.includes("large_limitation_count"), true);
});

test("reports read-only attention states for low confidence and missing knowledge", async () => {
  const model = await project(baseSummary({
    confidenceLevel: "LOW",
    missingAudience: true,
    missingOfferings: true,
    noEvidence: true,
  }));

  assert.equal(model.attentionStates.includes("low_confidence"), true);
  assert.equal(model.attentionStates.includes("missing_audience"), true);
  assert.equal(model.attentionStates.includes("missing_offerings"), true);
  assert.equal(model.attentionStates.includes("missing_evidence"), true);
  assert.equal(model.attentionStates.includes("business_partially_understood"), true);
});
