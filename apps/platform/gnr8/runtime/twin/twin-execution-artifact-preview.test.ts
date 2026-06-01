import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinApprovalPreviews } from "@/gnr8/runtime/twin/twin-approval-preview";
import { generateTwinExecutionPlanPreviews } from "@/gnr8/runtime/twin/twin-execution-plan-preview";
import {
  generateTwinExecutionArtifactPreviews,
  TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-artifact-preview";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { scoreOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimization-scoring";
import { generateTwinOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimizations";
import { generateTwinProposalCandidates } from "@/gnr8/runtime/twin/twin-proposal-candidates";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";

function buildExecutionPlanPreviews() {
  const twin = buildWebsiteDigitalTwin({
    siteId: "site_execution_artifact_preview",
    siteVersionId: "sv_execution_artifact_preview",
    workspaceId: "ws_execution_artifact_preview",
    environmentScope: "preview",
    sourceImportId: "import_execution_artifact_preview",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: 2,
      sectionCount: 5,
      assetCount: 0,
      detectedTitle: "Execution Artifact Preview Site",
      detectedHomepagePath: "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });

  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(twin)));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  const scores = scoreOptimizationOpportunities(opportunities);
  const proposals = generateTwinProposalCandidates({ opportunities, scores, limit: 4 });
  const approvalPreviews = generateTwinApprovalPreviews(proposals);
  return generateTwinExecutionPlanPreviews(approvalPreviews);
}

test("twin execution artifact preview: deterministic generation", () => {
  const executionPlanPreviews = buildExecutionPlanPreviews();
  const first = generateTwinExecutionArtifactPreviews(executionPlanPreviews);
  const second = generateTwinExecutionArtifactPreviews(executionPlanPreviews);
  assert.deepEqual(first, second);
});

test("twin execution artifact preview: mapping and summaries are deterministic", () => {
  const executionPlanPreviews = buildExecutionPlanPreviews();
  const previews = generateTwinExecutionArtifactPreviews(executionPlanPreviews);
  const byTitle = new Map(previews.map((entry) => [entry.proposalTitle, entry]));

  assert.equal(byTitle.get("Improve Homepage Conversion Flow")?.artifactType, "conversion_improvement_plan");
  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow")?.affectedAreas, ["homepage", "primary_conversion_path"]);
  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow")?.plannedOutputs, [
    "conversion_review_document",
    "conversion_improvement_plan",
  ]);
  assert.equal(
    byTitle.get("Improve Homepage Conversion Flow")?.summary,
    "Website OS would prepare conversion-focused planning artifacts before any future execution.",
  );

  assert.equal(byTitle.get("Improve Homepage Quality and Messaging")?.artifactType, "content_improvement_plan");
  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging")?.affectedAreas, [
    "homepage_hero",
    "homepage_messaging",
  ]);
  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging")?.plannedOutputs, [
    "messaging_review_document",
    "content_improvement_plan",
  ]);
  assert.equal(
    byTitle.get("Improve Homepage Quality and Messaging")?.summary,
    "Website OS would prepare content and messaging planning artifacts before any future execution.",
  );

  assert.equal(byTitle.get("Maintain Read-Only Validation Mode")?.artifactType, "validation_continuation_plan");
  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode")?.affectedAreas, ["runtime_governance"]);
  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode")?.plannedOutputs, ["validation_status_report"]);
  assert.equal(
    byTitle.get("Maintain Read-Only Validation Mode")?.summary,
    "Website OS would prepare validation reporting artifacts while maintaining read-only governance.",
  );
});

test("twin execution artifact preview: governance is blocked and non-executable", () => {
  const executionPlanPreviews = buildExecutionPlanPreviews();
  const previews = generateTwinExecutionArtifactPreviews(executionPlanPreviews);
  assert.equal(previews.every((entry) => entry.executionState === "preview_only"), true);
  assert.equal(previews.every((entry) => entry.mutationBlocked === true), true);
  assert.equal(previews.every((entry) => entry.governanceState === "preview_non_executable"), true);
});

test("twin execution artifact preview: fallback mappings are deterministic", () => {
  const previews = generateTwinExecutionArtifactPreviews([
    {
      planId: "execution_plan_preview_custom",
      proposalId: "proposal_candidate_custom",
      proposalTitle: "Custom Proposal",
      executionState: "preview_only",
      plannedActions: ["future_execution_plan_required"],
      executionBlocked: true,
      providerExecutionAllowed: false,
      publishingAllowed: false,
      mutationAllowed: false,
      governanceState: "preview_non_executable",
      summary: "custom",
    },
  ]);

  assert.equal(previews[0]?.artifactType, "future_execution_artifact");
  assert.deepEqual(previews[0]?.affectedAreas, ["unknown"]);
  assert.deepEqual(previews[0]?.plannedOutputs, ["future_artifact_definition"]);
  assert.equal(previews[0]?.summary, "Website OS would prepare future execution artifacts before execution planning.");
});

test("twin execution artifact preview: diagnostics constants are stable", () => {
  assert.equal(TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.STARTED, "TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED");
  assert.equal(TWIN_EXECUTION_ARTIFACT_PREVIEW_DIAGNOSTICS.COMPLETED, "TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED");
});
