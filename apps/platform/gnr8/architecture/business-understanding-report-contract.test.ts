import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION,
  BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES,
  validateBusinessUnderstandingReportArtifact,
  type BusinessUnderstandingReportArtifact,
} from "./business-understanding-report-contract";

function validArtifact(input: Partial<BusinessUnderstandingReportArtifact> = {}): BusinessUnderstandingReportArtifact {
  const evidenceRef = {
    refId: "dbt:evidence:source-url",
    sourceKind: "source_url",
  };
  const section = (type: BusinessUnderstandingReportArtifact["sections"][number]["type"]) => ({
    sectionId: `bur-section:${type}`,
    type,
    title: type,
    status: "partial" as const,
    content: [`Human-readable content for ${type}.`],
    knowledgeItemIds: type === "business_overview" ? ["dbt-knowledge:business_identity:abc"] : [],
    missingKnowledgeIds: type === "missing_knowledge" ? ["dbt-missing:audience"] : [],
    evidenceRefs: type === "business_overview" ? [evidenceRef] : [],
    confidence: { level: "LOW" as const, reasons: ["test_fixture"] },
    limitations: [],
    diagnostics: [`BUR_SECTION_TYPE:${type}`],
  });
  return {
    businessUnderstandingReportId: "business-understanding-report:site-version-1:dry-run-1:dbt-artifact-1",
    status: "partial",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    sourceDigitalBusinessTwinArtifactId: "dbt-artifact-1",
    createdAt: "2026-07-02T08:00:00.000Z",
    contractVersion: BUSINESS_UNDERSTANDING_REPORT_CONTRACT_VERSION,
    lineage: {
      siteVersionId: "site-version-1",
      dryRunId: "dry-run-1",
      sourceDigitalBusinessTwinArtifactId: "dbt-artifact-1",
      sourceDigitalBusinessTwinId: "digital-business-twin:site-version-1:dry-run-1",
      sourceDigitalBusinessTwinStatus: "partial",
      sourceDigitalBusinessTwinContractVersion: "MVP-1B",
      sourceBusinessDiscoveryArtifactId: "business-discovery-artifact-1",
      evidenceRefs: [evidenceRef],
      upstreamArtifactRefs: [{ refId: "dbt-artifact-1", sourceKind: "digital_business_twin" }],
    },
    sections: BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES.map(section),
    recommendations: [{
      recommendationId: "bur-recommendation:resolve_missing_audience:abc",
      type: "resolve_missing_audience",
      title: "Resolve missing audience knowledge",
      rationale: "Clarify who the business primarily serves before downstream planning begins.",
      sourceSectionIds: ["bur-section:missing_knowledge", "bur-section:recommendations"],
      missingKnowledgeIds: ["dbt-missing:audience"],
      confidence: { level: "LOW", reasons: ["business_oriented_report_recommendation"] },
      diagnostics: ["BUR_RECOMMENDATION_TYPE:resolve_missing_audience"],
    }],
    confidence: { level: "LOW", reasons: ["missing_business_knowledge"] },
    limitations: [],
    diagnostics: ["BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_VALID"],
    ...input,
  };
}

test("valid Business Understanding Report artifact passes", () => {
  assert.deepEqual(validateBusinessUnderstandingReportArtifact(validArtifact()), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("allowed Business Understanding Report statuses are contract-valid", () => {
  for (const status of ["draft", "partial", "valid", "invalid", "blocked", "stale"] as const) {
    const artifact = validArtifact({ status });
    assert.equal(validateBusinessUnderstandingReportArtifact(artifact).valid, true, status);
  }
});

test("invalid status, duplicate section IDs, and unknown section types are rejected", () => {
  const invalidStatus = validArtifact({ status: "observed" as never });
  assert.match(validateBusinessUnderstandingReportArtifact(invalidStatus).errors.join("\n"), /status/);

  const duplicate = validArtifact();
  duplicate.sections = [duplicate.sections[0], { ...duplicate.sections[0] }, ...duplicate.sections.slice(1)];
  assert.match(validateBusinessUnderstandingReportArtifact(duplicate).errors.join("\n"), /sectionId must be unique/);

  const unknownType = validArtifact();
  unknownType.sections[0].type = "strategy" as never;
  assert.match(validateBusinessUnderstandingReportArtifact(unknownType).errors.join("\n"), /not an allowed Business Understanding Report section type/);
});

test("all MVP report sections are required", () => {
  const artifact = validArtifact();
  artifact.sections = artifact.sections.filter((section) => section.type !== "evidence_summary");

  const validation = validateBusinessUnderstandingReportArtifact(artifact);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /sections must include evidence_summary/);
});

test("recommendations must remain business-oriented", () => {
  const artifact = validArtifact();
  artifact.recommendations[0].type = "build_react_components" as never;
  artifact.recommendations[0].rationale = "Build components for the page.";

  const validation = validateBusinessUnderstandingReportArtifact(artifact);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /business-oriented recommendation type/);
  assert.match(validation.errors.join("\n"), /must not prescribe components/);
});

test("forbidden downstream fields are rejected recursively", () => {
  for (const field of [
    "businessAlignment",
    "websiteDesignBrief",
    "websiteGenerationPackage",
    "providerPayload",
    "prompt",
    "aiOutput",
    "generatedContent",
    "generatedHtml",
    "generatedReact",
    "generatedComponents",
    "generatedBlocks",
    "publishingArtifact",
    "deploymentArtifact",
    "executionArtifact",
  ]) {
    const artifact = validArtifact() as unknown as Record<string, unknown>;
    artifact.diagnostics = [{ [field]: "forbidden" }];
    const validation = validateBusinessUnderstandingReportArtifact(artifact);
    assert.equal(validation.valid, false, field);
    assert.match(validation.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});
