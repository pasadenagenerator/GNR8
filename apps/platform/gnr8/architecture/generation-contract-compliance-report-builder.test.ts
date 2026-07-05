import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import {
  validateGenerationContractComplianceReport,
} from "./generation-contract-compliance-report-contract";
import { buildGenerationContractComplianceReport } from "./generation-contract-compliance-report-builder";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";

function compliantArtifact() {
  const { websiteGenerationPackage, observedWebsiteModel } = generationContractComplianceSources();
  return buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel,
    createdAt: GCC_TEST_CREATED_AT,
  });
}

test("builds deterministic human-readable report from persisted compliance only", () => {
  const compliance = compliantArtifact();
  const first = buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const second = buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.deepEqual(second, first);
  assert.equal(first.status, "ready");
  assert.equal(first.recommendation.recommendation, "proceed_to_approval");
  assert.equal(first.generationReadiness.status, "ready");
  assert.equal(first.overallCompliance.sourceComplianceStatus, "compliant");
  assert.equal(first.categoryResults.length, compliance.categoryResults.length);
  assert.equal(first.evidenceSummary.evidenceCount, compliance.evidence.length);
  assert.equal(first.lineage.sourceGenerationContractComplianceId, compliance.generationContractComplianceId);
  assert.equal(validateGenerationContractComplianceReport({
    artifact: first,
    sourceGenerationContractCompliance: compliance,
  }).valid, true);
  assert.equal(stableStringify(first).includes("businessApproval"), false);
  assert.equal(stableStringify(first).includes("publishingArtifact"), false);
  assert.equal(stableStringify(first).includes("providerCall"), false);
});

test("non-compliant source compliance produces regeneration readiness without recomputation", () => {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const compliance = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, {
      omitNavigation: true,
    }),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const report = buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.equal(compliance.status, "non_compliant");
  assert.equal(report.status, "blocked");
  assert.equal(report.recommendation.recommendation, "regenerate");
  assert.equal(report.generationReadiness.status, "requires_regeneration");
  assert.ok(report.deviations.length > 0);
  assert.ok(report.missingRequirements.some((item) => item.category === "navigation_obligations"));
  assert.ok(report.businessRisks.length > 0);
});

test("partial source compliance preserves limitations as insufficient evidence", () => {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const compliance = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, {
      omitAccessibility: true,
      omitSeo: true,
    }),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const report = buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.equal(compliance.status, "partial");
  assert.equal(report.status, "partial");
  assert.equal(report.recommendation.recommendation, "insufficient_evidence");
  assert.equal(report.generationReadiness.status, "ready_with_limitations");
  assert.ok(report.limitations.items.some((item) =>
    item.summary.includes("Accessibility expectation could not be confirmed")));
});

test("validator rejects approval and publishing fields", () => {
  const report = buildGenerationContractComplianceReport({
    generationContractCompliance: compliantArtifact(),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const validation = validateGenerationContractComplianceReport({
    ...report,
    businessApproval: { approved: true },
    publishingPermission: true,
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("businessApproval is forbidden")));
  assert.ok(validation.errors.some((error) => error.includes("publishingPermission is forbidden")));
});
