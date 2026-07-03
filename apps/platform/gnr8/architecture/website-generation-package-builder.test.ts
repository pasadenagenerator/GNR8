import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import type { WebsiteDesignBriefArtifact } from "./website-design-brief-contract";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import {
  WEBSITE_GENERATION_VALIDATION_AREAS,
  validateWebsiteGenerationPackage,
} from "./website-generation-package-contract";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";

function websiteDesignBrief(input: {
  missingAudience?: boolean;
  confidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
  limitations?: string[];
  status?: WebsiteDesignBriefArtifact["status"];
} = {}): WebsiteDesignBriefArtifact {
  const dbt = alignedDigitalBusinessTwinFixture({
    missingDomains: input.missingAudience ? ["audience"] : [],
    confidenceLevel: input.confidenceLevel,
    limitations: input.limitations,
  });
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  return {
    ...wdb,
    ...(input.status ? { status: input.status } : {}),
  };
}

test("builder deterministically projects a Website Design Brief into a valid Website Generation Package", () => {
  const wdb = websiteDesignBrief();
  const first = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const second = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.deepEqual(first, second);
  assert.equal(first.status, "valid");
  assert.equal(validateWebsiteGenerationPackage({
    artifact: first,
    sourceWebsiteDesignBrief: wdb,
  }).valid, true);
  assert.equal(first.sourceWebsiteDesignBriefId, wdb.websiteDesignBriefId);
  assert.equal(first.lineage.sourceDigitalBusinessTwinId, wdb.sourceDigitalBusinessTwinId);
  assert.equal(first.lineage.sourceBusinessAlignmentId, wdb.sourceBusinessAlignmentId);
});

test("builder maps WDB objectives, audience, messages, and content requirements into generation obligations", () => {
  const artifact = buildWebsiteGenerationPackage({
    websiteDesignBrief: websiteDesignBrief(),
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.ok(artifact.generationObjectives.some((objective) =>
    objective.sourceKnowledgeItemIds.includes("dbt-knowledge:goals") &&
    objective.acceptanceIntent.includes("Website Design Brief objective")));
  assert.ok(artifact.audience.some((audience) =>
    audience.sourceKnowledgeItemIds.includes("dbt-knowledge:audience") &&
    audience.experienceRequirement.includes("recognize relevance")));
  assert.ok(artifact.messages.some((message) =>
    message.sourceKnowledgeItemIds.includes("dbt-knowledge:trust") &&
    message.role === "trust"));
  assert.ok(artifact.contentRequirements.some((requirement) =>
    requirement.requirementType === "information" &&
    requirement.sourceKnowledgeItemIds.includes("dbt-knowledge:offerings")));
});

test("builder turns WDB journey into navigation, page, and section contracts", () => {
  const artifact = buildWebsiteGenerationPackage({
    websiteDesignBrief: websiteDesignBrief(),
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.equal(artifact.navigationContract.requiredDestinations.length, 4);
  assert.deepEqual(
    artifact.pageContracts.map((page) => page.pageRole),
    ["entry", "offer", "trust", "action"],
  );
  assert.ok(artifact.sectionContracts.every((section) =>
    artifact.pageContracts.some((page) => page.pageContractId === section.pageContractId)));
  assert.ok(artifact.pageContracts.some((page) =>
    page.requiredSectionContractIds.length > 0));
});

test("builder creates validation expectations for all required compliance-review areas", () => {
  const artifact = buildWebsiteGenerationPackage({
    websiteDesignBrief: websiteDesignBrief(),
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.deepEqual(
    artifact.validationContract.expectations.map((expectation) => expectation.area),
    [...WEBSITE_GENERATION_VALIDATION_AREAS],
  );
  assert.ok(artifact.validationContract.expectations.some((expectation) =>
    expectation.area === "constraint_preservation" &&
    expectation.requiredEvidence.some((evidence) => evidence.includes("missing knowledge"))));
});

test("builder propagates missing knowledge, confidence, and limitations without inventing facts", () => {
  const wdb = websiteDesignBrief({
    missingAudience: true,
    confidenceLevel: "MEDIUM",
    limitations: ["owner audience confirmation missing"],
  });
  const artifact = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.equal(artifact.status, "partial");
  assert.equal(artifact.confidence.level, "MEDIUM");
  assert.ok(artifact.confidence.reasons.includes("website_generation_package_projected_from_website_design_brief"));
  assert.ok(artifact.limitations.includes("owner audience confirmation missing"));
  assert.ok(artifact.audience.some((audience) =>
    audience.sourceMissingKnowledgeIds.includes("dbt-missing:audience") &&
    audience.experienceRequirement.includes("avoid inventing audience facts")));
  assert.ok(artifact.constraints.some((constraint) =>
    constraint.sourceMissingKnowledgeIds.includes("dbt-missing:audience") &&
    constraint.preservationExpectation.includes("must not resolve missing knowledge by invention")));
});

test("builder never emits provider payloads, prompts, generated websites, or implementation fields", () => {
  const artifact = buildWebsiteGenerationPackage({
    websiteDesignBrief: websiteDesignBrief(),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const serialized = stableStringify(artifact);

  for (const forbidden of [
    "providerPayload",
    "openAiPrompt",
    "claudePrompt",
    "geminiPrompt",
    "aiOutput",
    "generatedWebsite",
    "generatedContent",
    "generatedHtml",
    "generatedReact",
    "generatedComponents",
    "generatedBlocks",
    "deploymentArtifact",
    "publishingArtifact",
    "executionArtifact",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("blocked source WDB produces blocked package", () => {
  const artifact = buildWebsiteGenerationPackage({
    websiteDesignBrief: websiteDesignBrief({ status: "blocked" }),
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.equal(artifact.status, "blocked");
  assert.ok(artifact.limitations.includes("SOURCE_WDB_STATUS_NOT_VALID:blocked"));
});
