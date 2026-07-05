import assert from "node:assert/strict";
import test from "node:test";

import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import {
  GENERATION_CONTRACT_COMPLIANCE_STATUSES,
  validateGenerationContractCompliance,
} from "./generation-contract-compliance-contract";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
} from "./generation-contract-compliance-test-fixtures";

test("validates contract shape, source lineage, and allowed statuses", () => {
  const { websiteGenerationPackage, observedWebsiteModel } = generationContractComplianceSources();
  const artifact = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const validation = validateGenerationContractCompliance({
    artifact,
    sourceWebsiteGenerationPackage: websiteGenerationPackage,
    sourceObservedWebsiteModel: observedWebsiteModel,
  });

  assert.equal(validation.valid, true);
  assert.deepEqual([...GENERATION_CONTRACT_COMPLIANCE_STATUSES], [
    "incomplete",
    "partial",
    "compliant",
    "non_compliant",
    "blocked",
    "invalid",
    "stale",
  ]);
  assert.equal(artifact.sourceWebsiteGenerationPackageId, websiteGenerationPackage.websiteGenerationPackageId);
  assert.equal(artifact.sourceObservedWebsiteModelId, observedWebsiteModel.observedWebsiteModelId);
  assert.equal(artifact.lineage.sourceWebsiteGenerationPackageId, artifact.sourceWebsiteGenerationPackageId);
  assert.equal(artifact.lineage.sourceObservedWebsiteModelId, artifact.sourceObservedWebsiteModelId);
});

test("rejects recursive forbidden downstream fields", () => {
  const { websiteGenerationPackage, observedWebsiteModel } = generationContractComplianceSources();
  const artifact = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const validation = validateGenerationContractCompliance({
    ...artifact,
    diagnostics: [
      ...artifact.diagnostics,
      "keeps validation recursive",
    ],
    nested: {
      publishingArtifact: { deploy: true },
      businessApproval: { approved: true },
      runtimeMutation: { changed: true },
    },
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("nested.publishingArtifact is forbidden")));
  assert.ok(validation.errors.some((error) => error.includes("nested.businessApproval is forbidden")));
  assert.ok(validation.errors.some((error) => error.includes("nested.runtimeMutation is forbidden")));
});

test("requires observable evidence for every finding and unique finding IDs", () => {
  const { websiteGenerationPackage, observedWebsiteModel } = generationContractComplianceSources();
  const artifact = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const invalid = {
    ...artifact,
    findings: [
      { ...artifact.findings[0], evidenceIds: [] },
      { ...artifact.findings[0] },
    ],
  };
  const validation = validateGenerationContractCompliance(invalid);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("evidenceIds must contain observable evidence")));
  assert.ok(validation.errors.some((error) => error.includes("findingId must be unique")));
});
