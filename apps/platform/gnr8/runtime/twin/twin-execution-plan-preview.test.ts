import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { generateTwinApprovalPreviews } from "@/gnr8/runtime/twin/twin-approval-preview";
import { generateTwinInsights } from "@/gnr8/runtime/twin/twin-insights";
import { generateTwinObservations } from "@/gnr8/runtime/twin/twin-observations";
import { scoreOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimization-scoring";
import { generateTwinOptimizationOpportunities } from "@/gnr8/runtime/twin/twin-optimizations";
import { generateTwinProposalCandidates } from "@/gnr8/runtime/twin/twin-proposal-candidates";
import { generateTwinRecommendations } from "@/gnr8/runtime/twin/twin-recommendations";
import {
  generateTwinExecutionPlanPreviews,
  TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS,
} from "@/gnr8/runtime/twin/twin-execution-plan-preview";

function buildApprovalPreviews() {
  const twin = buildWebsiteDigitalTwin({
    siteId: "site_execution_plan_preview",
    siteVersionId: "sv_execution_plan_preview",
    workspaceId: "ws_execution_plan_preview",
    environmentScope: "preview",
    sourceImportId: "import_execution_plan_preview",
    sourceModels: ["import_manifest", "raw_dom_snapshot"],
    sourceEvidenceSummary: {
      pageCount: 2,
      sectionCount: 5,
      assetCount: 0,
      detectedTitle: "Execution Plan Preview Site",
      detectedHomepagePath: "/",
      providerStateSummary: "preview/runtime-only",
    },
    nowIso: "2026-06-01T00:00:00.000Z",
  });

  const recommendations = generateTwinRecommendations(generateTwinInsights(generateTwinObservations(twin)));
  const opportunities = generateTwinOptimizationOpportunities(recommendations);
  const scores = scoreOptimizationOpportunities(opportunities);
  const proposals = generateTwinProposalCandidates({ opportunities, scores, limit: 4 });
  return generateTwinApprovalPreviews(proposals);
}

test("twin execution plan preview: deterministic generation", () => {
  const approvalPreviews = buildApprovalPreviews();
  const first = generateTwinExecutionPlanPreviews(approvalPreviews);
  const second = generateTwinExecutionPlanPreviews(approvalPreviews);
  assert.deepEqual(first, second);
});

test("twin execution plan preview: action mapping and summary mapping are deterministic", () => {
  const approvalPreviews = buildApprovalPreviews();
  const previews = generateTwinExecutionPlanPreviews(approvalPreviews);
  const byTitle = new Map(previews.map((entry) => [entry.proposalTitle, entry]));

  assert.deepEqual(byTitle.get("Improve Homepage Conversion Flow")?.plannedActions, [
    "analyze_homepage_conversion_flow",
    "identify_primary_conversion_path",
    "prepare_conversion_improvement_plan",
  ]);
  assert.equal(
    byTitle.get("Improve Homepage Conversion Flow")?.summary,
    "If approved in the future, Website OS would prepare a conversion-focused improvement plan before any execution.",
  );

  assert.deepEqual(byTitle.get("Improve Homepage Quality and Messaging")?.plannedActions, [
    "analyze_homepage_content",
    "identify_messaging_improvements",
    "prepare_content_improvement_plan",
  ]);
  assert.equal(
    byTitle.get("Improve Homepage Quality and Messaging")?.summary,
    "If approved in the future, Website OS would prepare a content and messaging improvement plan before any execution.",
  );

  assert.deepEqual(byTitle.get("Maintain Read-Only Validation Mode")?.plannedActions, [
    "maintain_read_only_runtime",
    "continue_validation_observation",
  ]);
  assert.equal(
    byTitle.get("Maintain Read-Only Validation Mode")?.summary,
    "Website OS would continue validation-mode observation without enabling mutation workflows.",
  );
});

test("twin execution plan preview: governance is blocked and non-executable", () => {
  const approvalPreviews = buildApprovalPreviews();
  const previews = generateTwinExecutionPlanPreviews(approvalPreviews);
  assert.equal(previews.every((entry) => entry.executionState === "preview_only"), true);
  assert.equal(previews.every((entry) => entry.executionBlocked === true), true);
  assert.equal(previews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(previews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(previews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(previews.every((entry) => entry.governanceState === "preview_non_executable"), true);
});

test("twin execution plan preview: fallback mappings are deterministic", () => {
  const previews = generateTwinExecutionPlanPreviews([
    {
      previewId: "approval_preview_custom",
      proposalId: "proposal_candidate_custom",
      proposalTitle: "Custom Proposal",
      currentState: "proposal_candidate",
      futureStates: ["proposal_candidate", "approval_review", "approved", "execution_plan", "execution_blocked"],
      requiredApprovals: 1,
      executionPermission: false,
      mutationPermission: false,
      publishingPermission: false,
      providerPermission: false,
      governanceState: "preview_non_executable",
      summary: "custom",
    },
  ]);

  assert.deepEqual(previews[0]?.plannedActions, ["future_execution_plan_required"]);
  assert.equal(previews[0]?.summary, "Future execution planning would be required before any execution.");
});

test("twin execution plan preview: diagnostics constants are stable", () => {
  assert.equal(TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.STARTED, "TWIN_EXECUTION_PLAN_PREVIEW_STARTED");
  assert.equal(TWIN_EXECUTION_PLAN_PREVIEW_DIAGNOSTICS.COMPLETED, "TWIN_EXECUTION_PLAN_PREVIEW_COMPLETED");
});
