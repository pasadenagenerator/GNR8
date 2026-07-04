import assert from "node:assert/strict";
import test from "node:test";

import { buildCodexTaskProviderPayload } from "./codex-task-provider-payload-builder";
import {
  PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION,
  validateProviderGenerationPayload,
  type ProviderGenerationPayload,
} from "./provider-generation-payload-contract";
import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";

const SOURCE_WGP_ARTIFACT_ID = "website_generation_package_test_artifact_1";

function payload(): ProviderGenerationPayload {
  const dbt = alignedDigitalBusinessTwinFixture();
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: WDB_TEST_CREATED_AT,
  });
  const wgp = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: WDB_TEST_CREATED_AT,
  });
  return buildCodexTaskProviderPayload({
    websiteGenerationPackage: wgp,
    sourceWebsiteGenerationPackageArtifactId: SOURCE_WGP_ARTIFACT_ID,
    createdAt: WDB_TEST_CREATED_AT,
  });
}

test("valid Provider Generation Payload contract preserves source WGP references and envelope sections", () => {
  const value = payload();
  const validation = validateProviderGenerationPayload(value);

  assert.equal(validation.valid, true);
  assert.equal(value.contractVersion, PROVIDER_GENERATION_PAYLOAD_CONTRACT_VERSION);
  assert.equal(value.status, "valid");
  assert.equal(value.providerType, "codex");
  assert.equal(value.payloadKind, "codex_task");
  assert.equal(value.sourceWebsiteGenerationPackageArtifactId, SOURCE_WGP_ARTIFACT_ID);
  assert.equal(value.lineage.sourceWebsiteGenerationPackageId, value.sourceWebsiteGenerationPackageId);
  assert.equal(value.lineage.sourceWebsiteGenerationPackageArtifactId, SOURCE_WGP_ARTIFACT_ID);
  assert.equal(value.codexTaskEnvelope.expectedOutputShape.outputKind, "implementation_proposal_only");
  assert.ok(value.codexTaskEnvelope.requiredWebsiteOutcomes.generationObjectives.length > 0);
  assert.ok(value.codexTaskEnvelope.navigationPageSectionRequirements.pageContracts.length > 0);
  assert.ok(value.codexTaskEnvelope.contentRequirements.length > 0);
  assert.ok(value.codexTaskEnvelope.validationExpectations.length > 0);
});

test("provider type, payload kind, and lineage must match the payload", () => {
  const value = payload();
  const wrongProvider = { ...value, providerType: "openai" } as unknown as ProviderGenerationPayload;
  const wrongKind = { ...value, payloadKind: "codex_task_payload" } as unknown as ProviderGenerationPayload;
  const wrongLineage = {
    ...value,
    lineage: {
      ...value.lineage,
      sourceWebsiteGenerationPackageArtifactId: "other-artifact",
    },
  };

  assert.ok(validateProviderGenerationPayload(wrongProvider).errors.includes("providerType must be codex"));
  assert.ok(validateProviderGenerationPayload(wrongKind).errors.includes("payloadKind must be codex_task"));
  assert.ok(validateProviderGenerationPayload(wrongLineage).errors
    .includes("lineage.sourceWebsiteGenerationPackageArtifactId must match sourceWebsiteGenerationPackageArtifactId"));
});

test("required envelope sections, preserved constraints, and validation expectations are validated", () => {
  const value = payload();
  const missingEnvelopeSection = {
    ...value,
    codexTaskEnvelope: {
      ...value.codexTaskEnvelope,
      sourcePackageSummary: null,
    },
  } as unknown as ProviderGenerationPayload;
  const missingConstraints = {
    ...value,
    preservedConstraints: [],
  };
  const missingExpectations = {
    ...value,
    validationExpectations: value.validationExpectations.slice(1),
  };

  assert.ok(validateProviderGenerationPayload(missingEnvelopeSection).errors
    .includes("codexTaskEnvelope.sourcePackageSummary must be an object"));
  assert.ok(validateProviderGenerationPayload(missingConstraints).errors
    .includes("preservedConstraints must preserve all source WGP constraints"));
  assert.ok(validateProviderGenerationPayload(missingExpectations).errors
    .includes("validationExpectations must preserve all source WGP validation expectations"));
});

test("forbidden downstream fields and generated output fields are rejected recursively", () => {
  const value = payload();
  const forbidden = {
    ...value,
    codexTaskEnvelope: {
      ...value.codexTaskEnvelope,
      providerResult: {
        generatedWebsite: "<html>nope</html>",
      },
    },
  } as unknown as ProviderGenerationPayload;
  const generatedOutput = {
    ...value,
    serializedWebsiteGenerationPackage: {
      ...value.serializedWebsiteGenerationPackage,
      generatedHtml: "<main>nope</main>",
    },
  } as unknown as ProviderGenerationPayload;

  assert.ok(validateProviderGenerationPayload(forbidden).errors.some((error) =>
    error.includes("providerResult is forbidden")));
  assert.ok(validateProviderGenerationPayload(forbidden).errors.some((error) =>
    error.includes("generatedWebsite is forbidden")));
  assert.ok(validateProviderGenerationPayload(generatedOutput).errors.some((error) =>
    error.includes("generatedHtml is forbidden")));
});

test("safety classification forbids execution, publishing, deployment, DNS, and production mutations", () => {
  const value = payload();
  assert.equal(value.safetyClassification.providerExecutionAllowed, false);
  assert.equal(value.safetyClassification.aiExecutionAllowed, false);
  assert.equal(value.safetyClassification.generatedWebsiteAllowed, false);
  assert.equal(value.safetyClassification.publishingAllowed, false);
  assert.equal(value.safetyClassification.deploymentAllowed, false);
  assert.equal(value.safetyClassification.dnsMutationAllowed, false);
  assert.equal(value.safetyClassification.productionMutationAllowed, false);
  assert.equal(validateProviderGenerationPayload({
    ...value,
    safetyClassification: {
      ...value.safetyClassification,
      deploymentAllowed: true,
    },
  }).errors.includes("safetyClassification.deploymentAllowed must be false"), true);
});
