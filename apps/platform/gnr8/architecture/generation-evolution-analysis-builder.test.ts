import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import { buildGenerationContractComplianceReport } from "./generation-contract-compliance-report-builder";
import type { GenerationContractComplianceArtifact } from "./generation-contract-compliance-contract";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";
import { buildGenerationImprovementPlan } from "./generation-improvement-plan-builder";
import {
  buildGenerationEvolutionAnalysis,
  GenerationEvolutionAnalysisBuildValidationError,
} from "./generation-evolution-analysis-builder";

function compliance(input: Parameters<typeof observedWebsiteModelFixture>[1] = {}) {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  return buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, input),
    createdAt: GCC_TEST_CREATED_AT,
  });
}

function evolution(input: {
  previous?: GenerationContractComplianceArtifact;
  current?: GenerationContractComplianceArtifact;
  previousIteration?: number;
  currentIteration?: number;
} = {}) {
  return buildGenerationEvolutionAnalysis({
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
    previousCompliance: input.previous ?? compliance({ omitNavigation: true }),
    currentCompliance: input.current ?? compliance(),
    previousIteration: input.previousIteration,
    currentIteration: input.currentIteration,
    createdAt: GCC_TEST_CREATED_AT,
  });
}

test("builder derives meaningful improvement, newly compliant category, reduced deviations, and increased evidence", () => {
  const artifact = evolution({
    previous: compliance({
      omitNavigation: true,
      omitMessages: true,
      omitSections: true,
      omitAssets: true,
      omitAccessibility: true,
      omitSeo: true,
      constraintViolation: true,
    }),
    current: compliance(),
  });

  assert.equal(artifact.status, "improved");
  assert.equal(artifact.overallAssessment, "meaningful_improvement");
  assert.equal(artifact.recommendedNextAction, "create_compliance_report_v2");
  assert.equal(artifact.categoryEvolution.find((category) =>
    category.category === "navigation_obligations")?.transition, "newly_compliant");
  assert.ok(artifact.metricDeltas.find((delta) => delta.metric === "deviation_count")!.delta! < 0);
  assert.ok(artifact.metricDeltas.find((delta) => delta.metric === "evidence_record_count")!.delta! > 0);
});

test("builder records unchanged category without using counts as a business conclusion", () => {
  const artifact = evolution({
    previous: compliance(),
    current: compliance(),
  });

  assert.equal(artifact.status, "unchanged");
  assert.equal(artifact.overallAssessment, "no_demonstrated_improvement");
  assert.equal(artifact.unchangedAreas.length, 10);
  assert.ok(artifact.metricDeltas.every((delta) =>
    delta.diagnostics.some((diagnostic) => diagnostic.includes("METRIC_DELTA_IS_NOT_A_BUSINESS_CONCLUSION"))));
});

test("builder derives regression from stored category outcomes", () => {
  const artifact = evolution({
    previous: compliance(),
    current: compliance({ omitAssets: true }),
  });

  assert.equal(artifact.status, "regressed");
  assert.equal(artifact.overallAssessment, "regression");
  assert.equal(artifact.categoryEvolution.find((category) =>
    category.category === "asset_presence")?.transition, "newly_non_compliant");
  assert.ok(artifact.regressions.some((regression) => regression.category === "asset_presence"));
});

test("builder derives mixed result when categories both improve and regress", () => {
  const artifact = evolution({
    previous: compliance({ omitNavigation: true }),
    current: compliance({ omitMessages: true }),
  });

  assert.equal(artifact.status, "mixed");
  assert.equal(artifact.overallAssessment, "mixed_result");
  assert.equal(artifact.categoryEvolution.find((category) =>
    category.category === "navigation_obligations")?.transition, "newly_compliant");
  assert.equal(artifact.categoryEvolution.find((category) =>
    category.category === "message_coverage")?.transition, "newly_non_compliant");
});

test("builder rejects mismatched WGP sources fail-closed", () => {
  const previous = compliance();
  const current = compliance();
  const mismatched = {
    ...current,
    sourceWebsiteGenerationPackageId: "website_generation_package_other",
    lineage: {
      ...current.lineage,
      sourceWebsiteGenerationPackageId: "website_generation_package_other",
    },
  };

  assert.throws(() => evolution({ previous, current: mismatched }), (error: unknown) => {
    assert.ok(error instanceof GenerationEvolutionAnalysisBuildValidationError);
    assert.ok(error.validation.errors.includes("source compliance artifacts must share the same canonical WGP"));
    return true;
  });
});

test("builder rejects reversed iteration ordering", () => {
  assert.throws(() => evolution({ previousIteration: 2, currentIteration: 1 }), (error: unknown) => {
    assert.ok(error instanceof GenerationEvolutionAnalysisBuildValidationError);
    assert.ok(error.validation.errors.includes("previousIteration must be less than currentIteration"));
    return true;
  });
});

test("builder output is deterministic and does not mutate source artifacts", () => {
  const previous = compliance({ omitNavigation: true });
  const current = compliance();
  const previousBefore = stableStringify(previous);
  const currentBefore = stableStringify(current);
  const first = buildGenerationEvolutionAnalysis({
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
    previousCompliance: previous,
    currentCompliance: current,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const second = buildGenerationEvolutionAnalysis({
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
    previousCompliance: previous,
    currentCompliance: current,
    createdAt: GCC_TEST_CREATED_AT,
  });

  assert.deepEqual(second, first);
  assert.equal(stableStringify(previous), previousBefore);
  assert.equal(stableStringify(current), currentBefore);
});

test("builder maps Generation Improvement Plan actions to observed effectiveness", () => {
  const previous = compliance({ omitNavigation: true });
  const current = compliance();
  const report = buildGenerationContractComplianceReport({
    generationContractCompliance: previous,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const plan = buildGenerationImprovementPlan({
    generationContractComplianceReport: report,
    createdAt: GCC_TEST_CREATED_AT,
  });
  const artifact = buildGenerationEvolutionAnalysis({
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
    previousCompliance: previous,
    currentCompliance: current,
    generationImprovementPlan: plan,
    generationImprovementPlanArtifactId: "generation_improvement_plan_previous",
    createdAt: GCC_TEST_CREATED_AT,
  });

  const navigation = artifact.improvements.find((outcome) => outcome.category === "Navigation");
  assert.ok(navigation);
  assert.equal(navigation!.outcome, "observed_improvement");
  assert.equal(navigation!.relatedComplianceCategory, "navigation_obligations");
  assert.ok(navigation!.actionCount > 0);
});
