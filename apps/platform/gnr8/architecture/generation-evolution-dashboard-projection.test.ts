import assert from "node:assert/strict";
import test from "node:test";

import { loadGenerationEvolutionDashboardProjection } from "./generation-evolution-dashboard-projection";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";
const DRY_RUN_ID = "odv-generation-cycle";

function complianceRecord(input: {
  artifactId: string;
  complianceId: string;
  observedId: string;
  status: "partial" | "compliant" | "non_compliant";
  categoryStatuses: string[];
}) {
  return {
    kind: "generation_contract_compliance",
    artifactId: input.artifactId,
    generationContractComplianceId: input.complianceId,
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    sourceObservedWebsiteModelId: input.observedId,
    status: input.status,
    evidenceCount: 7,
    limitationCount: input.status === "partial" ? 2 : 0,
    persistedAt: input.artifactId,
    artifact: {
      generationContractComplianceId: input.complianceId,
      status: input.status,
      sourceObservedWebsiteModelId: input.observedId,
      categoryResults: input.categoryStatuses.map((status, index) => ({ category: `category_${index}`, status })),
      evidence: Array.from({ length: 7 }, (_, index) => ({ complianceEvidenceId: `evidence_${index}` })),
      limitations: input.status === "partial" ? ["limitation-a", "limitation-b"] : [],
    },
  };
}

function baseSummary(): RuntimeImportProvenanceSummary {
  const proposal1 = {
    kind: "generated_website_proposal",
    artifactId: "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3",
    generatedWebsiteProposalId: "proposal-1",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    sourceProviderGenerationPayloadId: "payload-1",
    sourceProviderGenerationPayloadArtifactId: "provider_generation_payload_0738b677c762f830c235dae425a8ec1c",
    outputBundleId: "ODV_GENERATED_PROPOSAL_001",
    status: "compliance_ready",
    limitationCount: 1,
    createdAt: "2026-07-07T10:00:00.000Z",
    persistedAt: "2026-07-07T10:01:00.000Z",
  };
  const proposal2 = {
    kind: "generated_website_proposal",
    artifactId: "generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e",
    generatedWebsiteProposalId: "proposal-2",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    sourceProviderGenerationPayloadId: "payload-2",
    sourceProviderGenerationPayloadArtifactId: "provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7",
    outputBundleId: "ODV_GENERATED_PROPOSAL_002",
    status: "compliance_ready",
    limitationCount: 0,
    createdAt: "2026-07-10T10:00:00.000Z",
    persistedAt: "2026-07-10T10:01:00.000Z",
  };

  return {
    kind: "runtime_import_provenance_summary_v1",
    businessDiscoveryArtifacts: [{ artifactId: "business_discovery_7b37413651d79de0d109e31690a34b62", businessDiscoveryId: "bd", status: "ready", persistedAt: "1" }],
    digitalBusinessTwinArtifacts: [{ artifactId: "digital_business_twin_2614a690e29e87a201658f3de4f72983", digitalBusinessTwinId: "dbt", status: "ready", persistedAt: "1" }],
    businessUnderstandingReportArtifacts: [{ artifactId: "business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad", businessUnderstandingReportId: "bur", status: "ready", persistedAt: "1" }],
    businessAlignmentArtifacts: [{ artifactId: "business_alignment_18c0a6958048bf8985044e4781e788a8", businessAlignmentId: "ba", status: "ready", persistedAt: "1" }],
    websiteDesignBriefArtifacts: [{ artifactId: "website_design_brief_ff19a711c948d28fdd58bdea521c4f59", websiteDesignBriefId: "wdb", status: "ready", persistedAt: "1" }],
    websiteGenerationPackageArtifacts: [{ artifactId: "website_generation_package_c2c555025f186178f27c44c7cd272d4d", websiteGenerationPackageId: "wgp", status: "ready", persistedAt: "1" }],
    providerGenerationPayloadArtifacts: [
      { artifactId: "provider_generation_payload_0738b677c762f830c235dae425a8ec1c", providerGenerationPayloadId: "payload-1", status: "ready", persistedAt: "1" },
      { artifactId: "provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7", providerGenerationPayloadId: "payload-2", status: "ready", persistedAt: "2" },
    ],
    generatedWebsiteProposalArtifacts: [proposal1, proposal2],
    observedWebsiteModelArtifacts: [
      {
        artifactId: "observed_website_model_35499a9cb91a15740910532d451a739a",
        observedWebsiteModelId: "observed-1",
        sourceGeneratedWebsiteProposalId: "proposal-1",
        sourceGeneratedWebsiteProposalArtifactId: proposal1.artifactId,
        status: "observable",
        persistedAt: "1",
      },
      {
        artifactId: "observed_website_model_0d5e829f546745b1433557978c875626",
        observedWebsiteModelId: "observed-2",
        sourceGeneratedWebsiteProposalId: "proposal-2",
        sourceGeneratedWebsiteProposalArtifactId: proposal2.artifactId,
        status: "observable",
        persistedAt: "2",
      },
    ],
    generationContractComplianceArtifacts: [
      complianceRecord({
        artifactId: "generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7",
        complianceId: "compliance-1",
        observedId: "observed-1",
        status: "partial",
        categoryStatuses: ["compliant", "partial", "non_compliant"],
      }),
      complianceRecord({
        artifactId: "generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b",
        complianceId: "compliance-2",
        observedId: "observed-2",
        status: "compliant",
        categoryStatuses: ["compliant", "compliant", "partial"],
      }),
    ],
    generationContractComplianceReportArtifacts: [
      {
        artifactId: "generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de",
        generationContractComplianceReportId: "report-1",
        sourceGenerationContractComplianceId: "compliance-1",
        status: "ready",
        persistedAt: "1",
      },
    ],
    generationImprovementPlanArtifacts: [
      {
        artifactId: "generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694",
        generationImprovementPlanId: "plan-1",
        sourceGenerationContractComplianceId: "compliance-1",
        status: "ready",
        persistedAt: "1",
      },
    ],
    generationEvolutionAnalysisArtifacts: [
      {
        artifactId: "generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253",
        generationEvolutionAnalysisId: "evolution-1",
        siteVersionId: SITE_VERSION_ID,
        dryRunId: DRY_RUN_ID,
        status: "improved",
        overallAssessment: "meaningful_improvement",
        recommendedNextAction: "create_compliance_report_v2",
        persistedAt: "1",
        artifact: {
          generationEvolutionAnalysisId: "evolution-1",
          status: "improved",
          previousIteration: { iteration: 1, complianceArtifactId: "generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7" },
          currentIteration: { iteration: 2, complianceArtifactId: "generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b" },
          categoryEvolution: [
            { category: "message_coverage", transition: "newly_compliant" },
            { category: "asset_presence", transition: "improved" },
          ],
          unresolvedAreas: ["seo_expectations_observable"],
          regressions: [],
          limitations: ["manual inspection still required"],
          overallAssessment: "meaningful_improvement",
          recommendedNextAction: "create_compliance_report_v2",
          confidence: { level: "HIGH" },
        },
      },
    ],
  } as RuntimeImportProvenanceSummary;
}

async function project(summary = baseSummary()) {
  return loadGenerationEvolutionDashboardProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      getSiteVersion: async () => ({
        id: SITE_VERSION_ID,
        siteId: "odv",
        versionNo: 1,
        state: "READY",
        importProvenanceSummary: summary,
      }),
      getPreviewBundleAvailability: async (iteration) => ({
        iteration: iteration as 1 | 2,
        proposalArtifactId: iteration === 1
          ? "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3"
          : "generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e",
        outputBundleId: `ODV_GENERATED_PROPOSAL_00${iteration}`,
        bundleLabel: `ODV_GENERATED_PROPOSAL_00${iteration}`,
        bundleRoot: `/tmp/ODV_GENERATED_PROPOSAL_00${iteration}`,
        entryFile: "source/index.html",
        available: true,
        unavailableReason: null,
      }),
    },
  });
}

test("groups both iterations and recognizes shared Website Generation Package", async () => {
  const model = await project();

  assert.deepEqual(model.iterations.map((iteration) => iteration.iteration), [1, 2]);
  assert.equal(
    model.sharedBusinessArtifacts.find((artifact) => artifact.kind === "website_generation_package")?.artifactId,
    "website_generation_package_c2c555025f186178f27c44c7cd272d4d",
  );
});

test("projects Iteration 1 and Iteration 2 compliance summaries", async () => {
  const model = await project();

  assert.equal(model.iterations[0].compliance.status, "partial");
  assert.equal(model.iterations[0].compliance.compliantCategoryCount, 1);
  assert.equal(model.iterations[0].compliance.partialCategoryCount, 1);
  assert.equal(model.iterations[0].compliance.nonCompliantCategoryCount, 1);
  assert.equal(model.iterations[1].compliance.status, "compliant");
  assert.equal(model.iterations[1].compliance.compliantCategoryCount, 2);
});

test("projects Evolution Analysis without recomputation", async () => {
  const model = await project();

  assert.equal(model.evolution?.artifactId, "generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253");
  assert.equal(model.evolution?.meaningfulImprovement, true);
  assert.deepEqual(model.evolution?.newlyCompliantCategories, ["message_coverage"]);
  assert.deepEqual(model.evolution?.improvedCategories, ["asset_presence"]);
  assert.deepEqual(model.evolution?.unresolvedCategories, ["seo_expectations_observable"]);
  assert.equal(model.evolution?.noRegressions, true);
  assert.equal(model.attentionStates.includes("evolution_improved"), true);
});

test("reports missing artifact attention state", async () => {
  const summary = baseSummary() as RuntimeImportProvenanceSummary & Record<string, unknown>;
  summary.observedWebsiteModelArtifacts = [];

  const model = await project(summary);

  assert.equal(model.attentionStates.includes("missing_iteration_artifact"), true);
});

test("reports ambiguous lineage fail-closed state", async () => {
  const summary = baseSummary() as RuntimeImportProvenanceSummary & Record<string, unknown>;
  summary.observedWebsiteModelArtifacts = [
    {
      artifactId: "observed-a",
      observedWebsiteModelId: "observed-1",
      sourceGeneratedWebsiteProposalId: "proposal-1",
      sourceGeneratedWebsiteProposalArtifactId: "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3",
      status: "observable",
      persistedAt: "1",
    },
    {
      artifactId: "observed-b",
      observedWebsiteModelId: "observed-2",
      sourceGeneratedWebsiteProposalId: "proposal-1",
      sourceGeneratedWebsiteProposalArtifactId: "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3",
      status: "observable",
      persistedAt: "2",
    },
  ];

  const model = await project(summary);

  assert.equal(model.attentionStates.includes("lineage_ambiguity"), true);
  assert.equal(model.diagnostics.includes("LINEAGE_AMBIGUITY: proposal artifacts could not be assigned uniquely to iterations."), true);
});
