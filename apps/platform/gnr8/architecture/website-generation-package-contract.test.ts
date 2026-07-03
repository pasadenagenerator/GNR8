import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import {
  WEBSITE_GENERATION_VALIDATION_AREAS,
  validateWebsiteGenerationPackage,
  type WebsiteGenerationPackageArtifact,
} from "./website-generation-package-contract";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";

function artifact(): WebsiteGenerationPackageArtifact {
  const dbt = alignedDigitalBusinessTwinFixture();
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  return buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: WDB_TEST_CREATED_AT,
  });
}

test("valid Website Generation Package contract includes required sections and validation expectations", () => {
  const value = artifact();
  const validation = validateWebsiteGenerationPackage(value);

  assert.equal(validation.valid, true);
  assert.equal(value.contractVersion, "MVP-1F");
  assert.equal(value.status, "valid");
  assert.ok(value.businessContext.statement.length > 0);
  assert.ok(value.generationObjectives.length > 0);
  assert.ok(value.audience.length > 0);
  assert.ok(value.messages.length > 0);
  assert.ok(value.navigationContract.requiredDestinations.length > 0);
  assert.ok(value.pageContracts.length > 0);
  assert.ok(value.sectionContracts.length > 0);
  assert.ok(value.contentRequirements.length > 0);
  assert.ok(value.constraints.length > 0);
  assert.deepEqual(
    value.validationContract.expectations.map((expectation) => expectation.area),
    [...WEBSITE_GENERATION_VALIDATION_AREAS],
  );
});

test("lineage must match the source Website Design Brief", () => {
  const value = artifact();
  const wrongLineage = {
    ...value,
    lineage: {
      ...value.lineage,
      sourceWebsiteDesignBriefId: "other-wdb",
    },
  };
  const wrongSiteVersion = {
    ...value,
    lineage: {
      ...value.lineage,
      siteVersionId: "other-site-version",
    },
  };

  assert.ok(validateWebsiteGenerationPackage(wrongLineage).errors
    .includes("lineage.sourceWebsiteDesignBriefId must match sourceWebsiteDesignBriefId"));
  assert.ok(validateWebsiteGenerationPackage(wrongSiteVersion).errors
    .includes("lineage.siteVersionId must match siteVersionId"));
});

test("IDs must be unique within package arrays", () => {
  const value = artifact();
  const duplicateObjective = {
    ...value,
    generationObjectives: [
      value.generationObjectives[0]!,
      value.generationObjectives[0]!,
    ],
  };
  const duplicateExpectation = {
    ...value,
    validationContract: {
      ...value.validationContract,
      expectations: [
        value.validationContract.expectations[0]!,
        value.validationContract.expectations[0]!,
        ...value.validationContract.expectations.slice(2),
      ],
    },
  };

  assert.ok(validateWebsiteGenerationPackage(duplicateObjective).errors.some((error) =>
    error.includes("generationObjectives[1] id must be unique")));
  assert.ok(validateWebsiteGenerationPackage(duplicateExpectation).errors.some((error) =>
    error.includes("expectationId must be unique")));
});

test("forbidden downstream fields and implementation instructions are rejected recursively", () => {
  const value = artifact();
  const forbiddenField = {
    ...value,
    contentRequirements: [{
      ...value.contentRequirements[0]!,
      providerPayload: { openAiPrompt: "make a site" },
    }, ...value.contentRequirements.slice(1)],
  } as unknown as WebsiteGenerationPackageArtifact;
  const implementationInstruction = {
    ...value,
    contentRequirements: [{
      ...value.contentRequirements[0]!,
      statement: "Use React components to build the website.",
    }, ...value.contentRequirements.slice(1)],
  } as WebsiteGenerationPackageArtifact;

  assert.ok(validateWebsiteGenerationPackage(forbiddenField).errors.some((error) =>
    error.includes("providerPayload is forbidden")));
  assert.ok(validateWebsiteGenerationPackage(forbiddenField).errors.some((error) =>
    error.includes("openAiPrompt is forbidden")));
  assert.ok(validateWebsiteGenerationPackage(implementationInstruction).errors.some((error) =>
    error.includes("must describe generation contract intent, not implementation instructions")));
});

test("source validation requires matching Website Design Brief source", () => {
  const dbt = alignedDigitalBusinessTwinFixture();
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const value = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: WDB_TEST_CREATED_AT,
  });
  const validation = validateWebsiteGenerationPackage({
    artifact: { ...value, sourceWebsiteDesignBriefId: "other-wdb" },
    sourceWebsiteDesignBrief: wdb,
  });

  assert.ok(validation.errors.includes("sourceWebsiteDesignBrief.websiteDesignBriefId must match sourceWebsiteDesignBriefId"));
});
