import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import { buildGenerationContractComplianceReport } from "./generation-contract-compliance-report-builder";
import {
  validateGenerationImprovementPlan,
} from "./generation-improvement-plan-contract";
import { buildGenerationImprovementPlan } from "./generation-improvement-plan-builder";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";

function report(input: {
  omitNavigation?: boolean;
  omitAccessibility?: boolean;
  omitSeo?: boolean;
} = {}) {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  const compliance = buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, input),
    createdAt: GCC_TEST_CREATED_AT,
  });
  return buildGenerationContractComplianceReport({
    generationContractCompliance: compliance,
    createdAt: GCC_TEST_CREATED_AT,
  });
}

test("builds deterministic provider-neutral improvement plan from compliance report only", () => {
  const source = report({ omitNavigation: true });
  const first = buildGenerationImprovementPlan({
    generationContractComplianceReport: source,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const second = buildGenerationImprovementPlan({
    generationContractComplianceReport: source,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.deepEqual(second, first);
  assert.equal(first.status, "ready");
  assert.equal(first.sourceGenerationContractComplianceReportId, source.generationContractComplianceReportId);
  assert.equal(first.summary.recommendedNextAction, "regenerate");
  assert.equal(first.summary.estimatedRegenerationReadiness, "ready");
  assert.ok(first.summary.improvementCount > 0);
  assert.ok(first.summary.criticalCount > 0);
  assert.ok(first.summary.categorySummary.Navigation! > 0);
  assert.ok(first.actions.every((action) => action.originatingRequirementIds.length > 0));
  assert.ok(first.actions.every((action) => action.evidenceReferences.every((evidence) => evidence.source === "compliance_report")));
  assert.equal(validateGenerationImprovementPlan({
    artifact: first,
    sourceGenerationContractComplianceReport: source,
  }).valid, true);
});

test("partial evidence report collects more information without provider instructions", () => {
  const source = report({ omitAccessibility: true, omitSeo: true });
  const plan = buildGenerationImprovementPlan({
    generationContractComplianceReport: source,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.equal(source.recommendation.recommendation, "insufficient_evidence");
  assert.equal(plan.summary.recommendedNextAction, "collect_more_information");
  assert.equal(plan.summary.estimatedRegenerationReadiness, "needs_information");
  assert.ok(plan.summary.categorySummary.Accessibility! > 0);
  assert.ok(plan.summary.categorySummary.SEO! > 0);
  for (const action of plan.actions) {
    const text = stableStringify(action).toLowerCase();
    assert.equal(text.includes("providerprompt"), false);
    assert.equal(text.includes("provider payload"), false);
    assert.equal(text.includes("react"), false);
    assert.equal(text.includes("css"), false);
    assert.equal(text.includes("<html"), false);
  }
});

test("compliant report produces human review plan with no regeneration actions", () => {
  const source = report();
  const plan = buildGenerationImprovementPlan({
    generationContractComplianceReport: source,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.equal(source.status, "ready");
  assert.equal(source.recommendation.recommendation, "proceed_to_approval");
  assert.equal(plan.status, "ready");
  assert.equal(plan.summary.improvementCount, 0);
  assert.equal(plan.summary.recommendedNextAction, "human_review");
  assert.equal(plan.summary.estimatedRegenerationReadiness, "human_review_required");
});

test("validator rejects forbidden payload, approval, and implementation fields", () => {
  const plan = buildGenerationImprovementPlan({
    generationContractComplianceReport: report({ omitNavigation: true }),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const validation = validateGenerationImprovementPlan({
    ...plan,
    providerPayloadV2: { id: "not-allowed" },
    businessApproval: { approved: true },
    implementationInstructions: ["not-allowed"],
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("providerPayloadV2 is forbidden")));
  assert.ok(validation.errors.some((error) => error.includes("businessApproval is forbidden")));
  assert.ok(validation.errors.some((error) => error.includes("implementationInstructions is forbidden")));
});
