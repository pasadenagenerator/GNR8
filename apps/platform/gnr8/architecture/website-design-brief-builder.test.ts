import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import type { WebsiteDesignBriefSectionId } from "./website-design-brief-contract";
import { validateWebsiteDesignBrief } from "./website-design-brief-contract";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";

function section(
  artifact: ReturnType<typeof buildWebsiteDesignBrief>,
  sectionId: WebsiteDesignBriefSectionId,
) {
  const found = artifact.sections.find((candidate) => candidate.sectionId === sectionId);
  assert.ok(found, `expected ${sectionId} section`);
  return found;
}

test("builder deterministically projects an aligned DBT into a valid Website Design Brief", () => {
  const dbt = alignedDigitalBusinessTwinFixture();
  const alignment = businessAlignmentFixture(dbt.digitalBusinessTwinId);
  const first = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: alignment,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const second = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: alignment,
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.deepEqual(first, second);
  assert.equal(first.status, "valid");
  assert.equal(validateWebsiteDesignBrief({
    artifact: first,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessAlignment: alignment,
  }).valid, true);
  assert.equal(first.sourceDigitalBusinessTwinId, dbt.digitalBusinessTwinId);
  assert.equal(first.sourceBusinessAlignmentId, alignment.businessAlignmentId);
});

test("builder transforms business goals, audience, offerings, brand, trust, and digital presence into website intent", () => {
  const dbt = alignedDigitalBusinessTwinFixture();
  const artifact = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.ok(section(artifact, "website_objectives").items.some((item) =>
    item.itemType === "website_objective" &&
    item.sourceKnowledgeItemIds.includes("dbt-knowledge:goals") &&
    item.statement.includes("business goal")));
  assert.ok(section(artifact, "target_audience").items.some((item) =>
    item.itemType === "audience_experience" &&
    item.sourceKnowledgeItemIds.includes("dbt-knowledge:audience") &&
    item.experienceIntent.includes("recognize relevance")));
  assert.ok(section(artifact, "information_priorities").items.some((item) =>
    item.sourceKnowledgeItemIds.includes("dbt-knowledge:offerings")));
  assert.ok(section(artifact, "brand_expression").items.some((item) =>
    item.sourceKnowledgeItemIds.includes("dbt-knowledge:brand")));
  assert.ok(section(artifact, "trust_strategy").items.some((item) =>
    item.sourceKnowledgeItemIds.includes("dbt-knowledge:trust")));
  assert.ok(section(artifact, "recommendations").items.some((item) =>
    item.sourceKnowledgeItemIds.includes("dbt-knowledge:digital_presence") &&
    "statement" in item &&
    item.statement.includes("experience guidance")));
});

test("builder preserves missing knowledge, limitations, and confidence", () => {
  const dbt = alignedDigitalBusinessTwinFixture({
    missingDomains: ["audience"],
    confidenceLevel: "MEDIUM",
    limitations: ["owner audience confirmation missing"],
  });
  const artifact = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.equal(artifact.status, "partial");
  assert.equal(artifact.confidence.level, "MEDIUM");
  assert.ok(artifact.confidence.reasons.includes("website_design_brief_projected_from_aligned_dbt"));
  assert.ok(artifact.limitations.includes("owner audience confirmation missing"));
  assert.ok(section(artifact, "missing_knowledge").items.some((item) =>
    item.sourceMissingKnowledgeIds.includes("dbt-missing:audience") &&
    "statement" in item &&
    item.statement.includes("missing confirmed audience knowledge")));
  assert.ok(section(artifact, "recommendations").items.some((item) =>
    item.sourceMissingKnowledgeIds.includes("dbt-missing:audience") &&
    "statement" in item &&
    item.statement.includes("Resolve this business knowledge")));
});

test("builder never emits downstream implementation, provider, prompt, or generated website fields", () => {
  const dbt = alignedDigitalBusinessTwinFixture();
  const artifact = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const serialized = stableStringify(artifact);

  for (const forbidden of [
    "providerPayload",
    "prompt",
    "generatedWebsite",
    "generatedHTML",
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

test("blocked source DBT produces blocked brief without inventing missing business information", () => {
  const dbt = alignedDigitalBusinessTwinFixture({ status: "blocked", missingDomains: ["offerings"] });
  const artifact = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });

  assert.equal(artifact.status, "blocked");
  assert.ok(section(artifact, "missing_knowledge").items.some((item) =>
    item.sourceMissingKnowledgeIds.includes("dbt-missing:offerings")));
});
