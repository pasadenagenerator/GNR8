import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import { validateGenerationContractCompliance } from "./generation-contract-compliance-contract";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";

test("builds compliant deterministic comparison with evidence-backed findings", () => {
  const { websiteGenerationPackage, observedWebsiteModel } = generationContractComplianceSources();
  const first = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const second = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.deepEqual(second, first);
  assert.equal(first.status, "compliant");
  assert.equal(validateGenerationContractCompliance({
    artifact: first,
    sourceWebsiteGenerationPackage: websiteGenerationPackage,
    sourceObservedWebsiteModel: observedWebsiteModel,
  }).valid, true);
  assert.ok(first.findings.length > 0);
  assert.equal(first.findings.every((finding) => finding.evidenceIds.length > 0), true);
  assert.equal(first.deviations.length, 0);
  assert.equal(stableStringify(first).includes("businessApproval"), false);
  assert.equal(stableStringify(first).includes("publishingArtifact"), false);
});

test("records partial comparison when observable metadata is missing", () => {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const observedWebsiteModel = observedWebsiteModelFixture(websiteGenerationPackage, {
    omitAccessibility: true,
    omitSeo: true,
  });
  const artifact = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.equal(artifact.status, "partial");
  assert.ok(artifact.categoryResults.some((result) =>
    result.category === "accessibility_expectations_observable" &&
    result.status === "partial"));
  assert.ok(artifact.limitations.some((limitation) =>
    limitation.message.includes("Accessibility expectation could not be confirmed")));
});

test("missing navigation creates observable deviation and limitation", () => {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const observedWebsiteModel = observedWebsiteModelFixture(websiteGenerationPackage, {
    omitNavigation: true,
  });
  const artifact = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.equal(artifact.status, "non_compliant");
  assert.ok(artifact.categoryResults.some((result) =>
    result.category === "navigation_obligations" &&
    result.status === "non_compliant"));
  assert.ok(artifact.deviations.some((deviation) =>
    deviation.category === "navigation_obligations"));
});

test("missing required message creates deviation without inventing compliance", () => {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const observedWebsiteModel = observedWebsiteModelFixture(websiteGenerationPackage, {
    omitMessages: true,
  });
  const artifact = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.equal(artifact.status, "non_compliant");
  assert.ok(artifact.categoryResults.some((result) =>
    result.category === "message_coverage" &&
    result.status === "non_compliant"));
  assert.ok(artifact.limitations.some((limitation) =>
    limitation.message.includes("Required message was not observable")));
});

test("preserved and violated constraints are represented deterministically", () => {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const preserved = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const violated = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, {
      constraintViolation: true,
    }),
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.ok(preserved.categoryResults.some((result) =>
    result.category === "constraints_preserved" &&
    result.status === "compliant"));
  assert.equal(violated.status, "non_compliant");
  assert.ok(violated.deviations.some((deviation) =>
    deviation.category === "constraints_preserved" &&
    deviation.description.includes("contradicts required constraint")));
});
