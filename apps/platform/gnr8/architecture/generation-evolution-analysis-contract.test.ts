import assert from "node:assert/strict";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import { buildGenerationContractCompliance } from "./generation-contract-compliance-builder";
import {
  GCC_TEST_CREATED_AT,
  generationContractComplianceSources,
  observedWebsiteModelFixture,
} from "./generation-contract-compliance-test-fixtures";
import { buildGenerationEvolutionAnalysis } from "./generation-evolution-analysis-builder";
import {
  validateGenerationEvolutionAnalysis,
  type GenerationEvolutionAnalysisArtifact,
} from "./generation-evolution-analysis-contract";

function compliance(input: Parameters<typeof observedWebsiteModelFixture>[1] = {}) {
  const { websiteGenerationPackage } = generationContractComplianceSources();
  return buildGenerationContractCompliance({
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage, input),
    createdAt: GCC_TEST_CREATED_AT,
  });
}

function analysis(): GenerationEvolutionAnalysisArtifact {
  return buildGenerationEvolutionAnalysis({
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
    previousCompliance: compliance({ omitNavigation: true }),
    currentCompliance: compliance(),
    generationImprovementPlanArtifactId: "generation_improvement_plan_test",
    createdAt: GCC_TEST_CREATED_AT,
  });
}

test("generation evolution analysis contract validates source-backed artifacts", () => {
  const previousCompliance = compliance({ omitNavigation: true });
  const currentCompliance = compliance();
  const artifact = buildGenerationEvolutionAnalysis({
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
    previousCompliance,
    currentCompliance,
    createdAt: GCC_TEST_CREATED_AT,
  });

  const validation = validateGenerationEvolutionAnalysis({
    artifact,
    previousCompliance,
    currentCompliance,
    previousComplianceArtifactId: "generation_contract_compliance_previous",
    currentComplianceArtifactId: "generation_contract_compliance_current",
  });

  assert.deepEqual(validation, { valid: true, errors: [], warnings: [] });
  assert.equal(artifact.contractVersion, "MVP-2.0-M");
  assert.equal(artifact.categoryEvolution.length, 10);
  assert.equal(artifact.metricDeltas.length, 8);
  assert.ok(artifact.diagnostics.includes("NO_COMPLIANCE_RECOMPUTATION"));
});

test("generation evolution analysis contract rejects forbidden downstream fields recursively", () => {
  const artifact = analysis() as GenerationEvolutionAnalysisArtifact & {
    nested?: { complianceReportV2?: { providerPayloadV3?: boolean } };
  };
  artifact.nested = { complianceReportV2: { providerPayloadV3: true } };

  const validation = validateGenerationEvolutionAnalysis(artifact);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("nested.complianceReportV2 is forbidden")));
  assert.ok(validation.errors.some((error) => error.includes("nested.complianceReportV2.providerPayloadV3 is forbidden")));
});

test("generation evolution analysis contract validates deterministic metric deltas", () => {
  const artifact = analysis();
  const mutated = JSON.parse(stableStringify(artifact)) as GenerationEvolutionAnalysisArtifact;
  const findingDelta = mutated.metricDeltas.find((delta) => delta.metric === "finding_count");
  assert.ok(findingDelta);
  findingDelta!.delta = 999;

  const validation = validateGenerationEvolutionAnalysis(mutated);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("metricDeltas") && error.includes("delta")));
});

test("generation evolution analysis contract rejects non-canonical category coverage", () => {
  const artifact = analysis();
  const mutated = JSON.parse(stableStringify(artifact)) as GenerationEvolutionAnalysisArtifact;
  mutated.categoryEvolution = mutated.categoryEvolution.filter((category) =>
    category.category !== "navigation_obligations");

  const validation = validateGenerationEvolutionAnalysis(mutated);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("categoryEvolution must include navigation_obligations"));
});
