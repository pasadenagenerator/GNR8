import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";

import { buildWorkspaceOverviewModel, resolveImportedSnapshot } from "./model";

const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const MODEL_FILE = new URL("./model.ts", import.meta.url);

test("workspace overview page source: file exists", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.length > 0, true);
});

test("workspace overview source: uses imported runtime twin chain", async () => {
  const source = await readFile(MODEL_FILE, "utf8");
  assert.equal(source.includes("resolveImportedSnapshot"), true);
  assert.equal(source.includes("imported-url-site-"), true);
  assert.equal(source.includes("persisted_runtime_import_evidence"), true);
  assert.equal(source.includes("bundled_stable_import_snapshot"), true);
  assert.equal(source.includes("buildWebsiteDigitalTwin"), true);
  assert.equal(source.includes("InMemoryTwinStore"), true);
  assert.equal(source.includes("createTwinOverview"), true);
  assert.equal(source.includes("store.getTwinBySiteVersion"), true);
});

test("workspace overview model: twin overview and diagnostics render data from imported runtime evidence", async () => {
  const model = await buildWorkspaceOverviewModel();

  assert.equal(typeof model.sourceId === "string" || model.sourceId === null, true);
  if (model.sourceId === null) {
    assert.equal(model.overview.contentSummary, "No imported site available.");
    return;
  }

  assert.equal(
    model.sourceId.startsWith("imported-url-site-") || model.sourceKind === "bundled_stable_import_snapshot",
    true,
  );
  assert.equal(typeof model.overview.siteVersionId, "string");
  assert.equal(model.overview.siteVersionId.length > 0, true);
  assert.equal(typeof model.overview.contentSummary, "string");
  assert.equal(typeof model.overview.designSummary, "string");
  assert.equal(typeof model.overview.experienceSummary, "string");
  assert.equal(typeof model.overview.governanceSummary, "string");
  assert.equal(typeof model.overview.operationalSummary, "string");
  assert.equal(Array.isArray(model.observations), true);
  assert.equal(Array.isArray(model.insights), true);
  assert.equal(Array.isArray(model.recommendations), true);
  assert.equal(Array.isArray(model.optimizationOpportunities), true);
  assert.equal(Array.isArray(model.optimizationScores), true);
  assert.equal(Array.isArray(model.proposalCandidates), true);
  assert.equal(Array.isArray(model.approvalPreviews), true);
  assert.equal(Array.isArray(model.proposalApprovalRecords), true);
  assert.equal(Array.isArray(model.approvalStates), true);
  assert.equal(Array.isArray(model.approvalQueueItems), true);
  assert.equal(Array.isArray(model.executionPlanPreviews), true);
  assert.equal(Array.isArray(model.executionArtifactPreviews), true);
  assert.equal(Array.isArray(model.executionReadinessRecords), true);
  assert.equal(Array.isArray(model.executionPackagePreviews), true);
  assert.equal(Array.isArray(model.executionPackageReadinessRecords), true);
  assert.equal(Array.isArray(model.executionContractPreviews), true);
  assert.equal(Array.isArray(model.executionContractReadinessRecords), true);
  assert.equal(Array.isArray(model.executionBundlePreviews), true);
  assert.equal(Array.isArray(model.executionBundleReadinessRecords), true);
  assert.equal(Array.isArray(model.executionAuthorizationPreviews), true);
  assert.equal(Array.isArray(model.executionAuthorizationReadinessRecords), true);
  assert.equal(Array.isArray(model.executionAuthorizationPackageRecords), true);
  assert.equal(Array.isArray(model.executionIntentRecords), true);
  assert.equal(model.observations.length > 0 || model.sourceId === null, true);
  assert.equal(model.diagnostics.includes("TWIN_OVERVIEW_CREATED"), true);
  assert.equal(model.diagnostics.includes("TWIN_OBSERVATIONS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_OBSERVATIONS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_INSIGHTS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_INSIGHTS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_RECOMMENDATIONS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_RECOMMENDATIONS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_OPTIMIZATIONS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_OPTIMIZATIONS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_OPTIMIZATION_SCORING_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_OPTIMIZATION_SCORING_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_PROPOSAL_CANDIDATES_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_PROPOSAL_CANDIDATES_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_APPROVAL_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_APPROVAL_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_PROPOSAL_APPROVAL_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_PROPOSAL_APPROVAL_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_APPROVAL_STATE_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_APPROVAL_STATE_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_APPROVAL_QUEUE_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_APPROVAL_QUEUE_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_PLAN_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_PLAN_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_READINESS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_READINESS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_PACKAGE_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_PACKAGE_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_PACKAGE_READINESS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_PACKAGE_READINESS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_CONTRACT_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_CONTRACT_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_CONTRACT_READINESS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_CONTRACT_READINESS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_BUNDLE_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_BUNDLE_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_BUNDLE_READINESS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_BUNDLE_READINESS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_AUTHORIZATION_PREVIEW_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_AUTHORIZATION_PREVIEW_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_AUTHORIZATION_READINESS_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_AUTHORIZATION_READINESS_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_AUTHORIZATION_PACKAGE_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_AUTHORIZATION_PACKAGE_COMPLETED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_INTENT_STARTED"), model.sourceId !== null);
  assert.equal(model.diagnostics.includes("TWIN_EXECUTION_INTENT_COMPLETED"), model.sourceId !== null);
  assert.equal(
    model.diagnostics.indexOf("TWIN_EXECUTION_AUTHORIZATION_READINESS_STARTED") >
      model.diagnostics.indexOf("TWIN_EXECUTION_AUTHORIZATION_PREVIEW_COMPLETED"),
    model.sourceId !== null,
  );
  assert.equal(
    model.diagnostics.indexOf("TWIN_EXECUTION_AUTHORIZATION_PACKAGE_STARTED") >
      model.diagnostics.indexOf("TWIN_EXECUTION_AUTHORIZATION_READINESS_COMPLETED"),
    model.sourceId !== null,
  );
  assert.equal(
    model.diagnostics.indexOf("TWIN_EXECUTION_INTENT_STARTED") >
      model.diagnostics.indexOf("TWIN_EXECUTION_AUTHORIZATION_PACKAGE_COMPLETED"),
    model.sourceId !== null,
  );
  assert.equal(
    model.diagnostics.indexOf("TWIN_EXECUTION_PLAN_PREVIEW_STARTED") >
      model.diagnostics.indexOf("TWIN_EXECUTION_INTENT_COMPLETED"),
    model.sourceId !== null,
  );
  assert.equal(model.overview.contentSummary.includes("pages="), true);
  assert.equal(model.overview.contentSummary.includes("deterministic_content_read_model"), false);
  assert.equal(model.overview.designSummary.includes("assets="), true);
  assert.equal(model.overview.experienceSummary.includes("homepageDetected="), true);
  assert.equal(model.overview.governanceSummary.includes("readOnly=true"), true);
  assert.equal(model.overview.operationalSummary.includes("providerState=preview/runtime-only"), true);
});

test("workspace overview model: proposal candidates are present and remain read-only/non-executable", async () => {
  const model = await buildWorkspaceOverviewModel();
  const flat = JSON.stringify(model);
  assert.equal(Array.isArray(model.optimizationScores), true);
  assert.equal(flat.includes("optimizationScores"), true);
  assert.equal(Array.isArray(model.recommendations), true);
  assert.equal(Array.isArray(model.optimizationOpportunities), true);
  assert.equal(Array.isArray(model.proposalCandidates), true);
  assert.equal(model.recommendations.some((entry) => entry.title === "Maintain Read-Only Validation Mode"), model.sourceId !== null);
  assert.equal(model.optimizationOpportunities.some((entry) => entry.title === "Validation Stability Preservation"), model.sourceId !== null);
  assert.equal(model.optimizationScores.length, model.optimizationOpportunities.length);
  assert.equal(model.proposalCandidates.length <= 3, true);
  assert.equal(model.proposalCandidates.every((entry) => entry.status === "proposal_candidate"), true);
  assert.equal(model.proposalCandidates.every((entry) => entry.executionState === "blocked"), true);
  assert.equal(model.approvalPreviews.length, model.proposalCandidates.length);
  assert.equal(model.approvalPreviews.every((entry) => entry.currentState === "proposal_candidate"), true);
  assert.equal(
    model.approvalPreviews.every((entry) =>
      JSON.stringify(entry.futureStates) ===
      JSON.stringify(["proposal_candidate", "approval_review", "approved", "execution_plan", "execution_blocked"]),
    ),
    true,
  );
  assert.equal(model.approvalPreviews.every((entry) => entry.requiredApprovals === 1), true);
  assert.equal(model.approvalPreviews.every((entry) => entry.executionPermission === false), true);
  assert.equal(model.approvalPreviews.every((entry) => entry.mutationPermission === false), true);
  assert.equal(model.approvalPreviews.every((entry) => entry.publishingPermission === false), true);
  assert.equal(model.approvalPreviews.every((entry) => entry.providerPermission === false), true);
  assert.equal(model.approvalPreviews.every((entry) => entry.governanceState === "preview_non_executable"), true);
  assert.equal(model.proposalApprovalRecords.length, model.proposalCandidates.length);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.approvalStatus === "approval_required"), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.decision === "not_requested"), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.requiredApprovals === 1), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.receivedApprovals === 0), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.approvalComplete === false), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.proposalApprovalRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    model.proposalApprovalRecords.every((entry) => entry.governanceState === "approval_required_preview_only"),
    true,
  );
  assert.equal(model.approvalStates.length, model.proposalApprovalRecords.length);
  assert.equal(model.approvalStates.every((entry) => entry.approvalState === "pending_review"), true);
  assert.equal(model.approvalStates.every((entry) => entry.requiredApprovals === 1), true);
  assert.equal(model.approvalStates.every((entry) => entry.receivedApprovals === 0), true);
  assert.equal(model.approvalStates.every((entry) => entry.approvalComplete === false), true);
  assert.equal(model.approvalStates.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.approvalStates.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.approvalStates.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.approvalStates.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(model.approvalStates.every((entry) => entry.governanceState === "approval_state_preview_only"), true);
  assert.equal(model.approvalQueueItems.length, model.approvalStates.length);
  assert.deepEqual(
    [...model.approvalQueueItems].sort((a, b) => b.optimizationScore - a.optimizationScore || a.proposalId.localeCompare(b.proposalId)),
    model.approvalQueueItems,
  );
  assert.deepEqual(
    model.approvalQueueItems.map((entry) => entry.queueRank),
    model.approvalQueueItems.map((_, index) => index + 1),
  );
  assert.equal(
    model.approvalQueueItems.every((entry) => ["high", "medium", "low"].includes(entry.queuePriority)),
    true,
  );
  assert.equal(
    model.approvalQueueItems.every((entry) =>
      entry.optimizationScore >= 350
        ? entry.queuePriority === "high"
        : entry.optimizationScore >= 300
          ? entry.queuePriority === "medium"
          : entry.queuePriority === "low",
    ),
    true,
  );
  assert.equal(model.approvalQueueItems.every((entry) => entry.approvalState === "pending_review"), true);
  assert.equal(model.approvalQueueItems.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.approvalQueueItems.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.approvalQueueItems.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.approvalQueueItems.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(model.approvalQueueItems.every((entry) => entry.governanceState === "approval_queue_preview_only"), true);
  assert.equal(model.executionPlanPreviews.length, model.approvalPreviews.length);
  assert.equal(model.executionPlanPreviews.every((entry) => entry.executionState === "preview_only"), true);
  assert.equal(model.executionPlanPreviews.every((entry) => entry.executionBlocked === true), true);
  assert.equal(model.executionPlanPreviews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(model.executionPlanPreviews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.executionPlanPreviews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionPlanPreviews.every((entry) => entry.governanceState === "preview_non_executable"), true);
  assert.equal(model.executionArtifactPreviews.length, model.executionPlanPreviews.length);
  assert.equal(model.executionArtifactPreviews.every((entry) => entry.executionState === "preview_only"), true);
  assert.equal(model.executionArtifactPreviews.every((entry) => entry.mutationBlocked === true), true);
  assert.equal(model.executionArtifactPreviews.every((entry) => entry.governanceState === "preview_non_executable"), true);
  assert.equal(model.executionReadinessRecords.length, model.approvalQueueItems.length);
  assert.equal(model.executionReadinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionReadinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionReadinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.executionReadinessRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    model.executionReadinessRecords.every((entry) => entry.governanceState === "execution_readiness_preview_only"),
    true,
  );
  assert.equal(model.executionPackagePreviews.length, model.executionReadinessRecords.length);
  assert.equal(model.executionPackagePreviews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionPackagePreviews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionPackagePreviews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.executionPackagePreviews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    model.executionPackagePreviews.every((entry) => entry.governanceState === "execution_package_preview_only"),
    true,
  );
  assert.equal(model.executionPackageReadinessRecords.length, model.executionPackagePreviews.length);
  assert.equal(model.executionPackageReadinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionPackageReadinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionPackageReadinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.executionPackageReadinessRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    model.executionPackageReadinessRecords.every(
      (entry) => entry.governanceState === "execution_package_readiness_preview_only",
    ),
    true,
  );
  assert.equal(model.executionContractPreviews.length, model.executionPackageReadinessRecords.length);
  assert.equal(model.executionContractPreviews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionContractPreviews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionContractPreviews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.executionContractPreviews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    model.executionContractPreviews.every((entry) => entry.governanceState === "execution_contract_preview_only"),
    true,
  );
  assert.equal(model.executionContractReadinessRecords.length, model.executionContractPreviews.length);
  assert.equal(model.executionContractReadinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionContractReadinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionContractReadinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(
    model.executionContractReadinessRecords.every((entry) => entry.providerExecutionAllowed === false),
    true,
  );
  assert.equal(
    model.executionContractReadinessRecords.every(
      (entry) => entry.governanceState === "execution_contract_readiness_preview_only",
    ),
    true,
  );
  assert.equal(model.executionBundlePreviews.length, model.executionContractReadinessRecords.length);
  assert.equal(model.executionBundlePreviews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionBundlePreviews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionBundlePreviews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.executionBundlePreviews.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    model.executionBundlePreviews.every((entry) => entry.governanceState === "execution_bundle_preview_only"),
    true,
  );
  assert.equal(model.executionBundleReadinessRecords.length, model.executionBundlePreviews.length);
  assert.equal(model.executionBundleReadinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionBundleReadinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionBundleReadinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(
    model.executionBundleReadinessRecords.every((entry) => entry.providerExecutionAllowed === false),
    true,
  );
  assert.equal(
    model.executionBundleReadinessRecords.every(
      (entry) => entry.governanceState === "execution_bundle_readiness_preview_only",
    ),
    true,
  );
  assert.equal(model.executionAuthorizationPreviews.length, model.executionBundleReadinessRecords.length);
  assert.equal(model.executionAuthorizationPreviews.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionAuthorizationPreviews.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionAuthorizationPreviews.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(
    model.executionAuthorizationPreviews.every((entry) => entry.providerExecutionAllowed === false),
    true,
  );
  assert.equal(
    model.executionAuthorizationPreviews.every(
      (entry) => entry.governanceState === "execution_authorization_preview_only",
    ),
    true,
  );
  assert.equal(model.executionAuthorizationReadinessRecords.length, model.executionAuthorizationPreviews.length);
  assert.equal(model.executionAuthorizationReadinessRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionAuthorizationReadinessRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionAuthorizationReadinessRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(
    model.executionAuthorizationReadinessRecords.every((entry) => entry.providerExecutionAllowed === false),
    true,
  );
  assert.equal(
    model.executionAuthorizationReadinessRecords.every(
      (entry) => entry.governanceState === "execution_authorization_readiness_preview_only",
    ),
    true,
  );
  assert.equal(model.executionAuthorizationPackageRecords.length, model.executionAuthorizationReadinessRecords.length);
  assert.equal(model.executionAuthorizationPackageRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionAuthorizationPackageRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionAuthorizationPackageRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(
    model.executionAuthorizationPackageRecords.every((entry) => entry.providerExecutionAllowed === false),
    true,
  );
  assert.equal(
    model.executionAuthorizationPackageRecords.every(
      (entry) => entry.governanceState === "execution_authorization_package_preview_only",
    ),
    true,
  );
  assert.equal(model.executionIntentRecords.length, model.executionAuthorizationPackageRecords.length);
  assert.equal(model.executionIntentRecords.every((entry) => entry.executionAllowed === false), true);
  assert.equal(model.executionIntentRecords.every((entry) => entry.mutationAllowed === false), true);
  assert.equal(model.executionIntentRecords.every((entry) => entry.publishingAllowed === false), true);
  assert.equal(model.executionIntentRecords.every((entry) => entry.providerExecutionAllowed === false), true);
  assert.equal(
    model.executionIntentRecords.every((entry) => entry.governanceState === "execution_intent_preview_only"),
    true,
  );
  const readinessByTitle = new Map(model.executionReadinessRecords.map((entry) => [entry.proposalTitle, entry]));
  const packagePreviewByTitle = new Map(model.executionPackagePreviews.map((entry) => [entry.proposalTitle, entry]));
  const packageReadinessByTitle = new Map(
    model.executionPackageReadinessRecords.map((entry) => [entry.proposalTitle, entry]),
  );
  const contractPreviewByTitle = new Map(
    model.executionContractPreviews.map((entry) => [entry.proposalTitle, entry]),
  );
  const contractReadinessByTitle = new Map(
    model.executionContractReadinessRecords.map((entry) => [entry.proposalTitle, entry]),
  );
  const bundlePreviewByTitle = new Map(
    model.executionBundlePreviews.map((entry) => [entry.proposalTitle, entry]),
  );
  const bundleReadinessByTitle = new Map(
    model.executionBundleReadinessRecords.map((entry) => [entry.proposalTitle, entry]),
  );
  const authorizationPreviewByTitle = new Map(
    model.executionAuthorizationPreviews.map((entry) => [entry.proposalTitle, entry]),
  );
  const authorizationReadinessByTitle = new Map(
    model.executionAuthorizationReadinessRecords.map((entry) => [entry.proposalTitle, entry]),
  );
  const authorizationPackageByTitle = new Map(
    model.executionAuthorizationPackageRecords.map((entry) => [entry.proposalTitle, entry]),
  );
  const executionIntentByTitle = new Map(model.executionIntentRecords.map((entry) => [entry.proposalTitle, entry]));
  const conversionReadiness = readinessByTitle.get("Improve Homepage Conversion Flow");
  if (conversionReadiness) {
    assert.equal(conversionReadiness.readinessState, "partially_ready");
    assert.equal(conversionReadiness.readinessScore, 60);
    assert.equal(conversionReadiness.requirementsMet.includes("execution_plan_available"), true);
    assert.equal(conversionReadiness.requirementsMissing.includes("conversion_baseline"), true);
    const packagePreview = packagePreviewByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(packagePreview?.packageState, "preview_ready");
    assert.equal(packagePreview?.readinessState, conversionReadiness.readinessState);
    assert.equal(packagePreview?.readinessScore, conversionReadiness.readinessScore);
    assert.deepEqual(packagePreview?.includedPlans, [
      "analyze_homepage_conversion_flow",
      "identify_primary_conversion_path",
      "prepare_conversion_improvement_plan",
    ]);
    assert.deepEqual(packagePreview?.includedArtifacts, ["conversion_review_document", "conversion_improvement_plan"]);
    const packageReadiness = packageReadinessByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(packageReadiness?.readinessState, "incomplete");
    assert.equal(packageReadiness?.readinessScore, 70);
    assert.deepEqual(packageReadiness?.requirementsMet, [
      "execution_package_present",
      "planning_artifacts_present",
      "homepage_detected",
    ]);
    assert.deepEqual(packageReadiness?.requirementsMissing, ["conversion_baseline", "design_evidence"]);
    const contractPreview = contractPreviewByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(contractPreview?.contractPreviewState, "contract_preview_incomplete");
    assert.equal(contractPreview?.readinessState, packageReadiness?.readinessState);
    assert.equal(contractPreview?.readinessScore, packageReadiness?.readinessScore);
    assert.equal(contractPreview?.contractType, "conversion_execution_contract");
    assert.deepEqual(contractPreview?.contractScope, ["homepage", "primary_conversion_path"]);
    assert.deepEqual(contractPreview?.requiredInputs, ["conversion_baseline", "design_evidence"]);
    assert.deepEqual(contractPreview?.blockedReasons, [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ]);
    const contractReadiness = contractReadinessByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(contractReadiness?.contractPreviewId, contractPreview?.contractPreviewId);
    assert.equal(contractReadiness?.readinessState, "not_ready");
    assert.equal(contractReadiness?.readinessScore, 70);
    assert.deepEqual(contractReadiness?.requirementsMet, [
      "contract_preview_present",
      "contract_scope_defined",
      "execution_package_available",
    ]);
    assert.deepEqual(contractReadiness?.requirementsMissing, ["conversion_baseline", "design_evidence"]);
    const bundlePreview = bundlePreviewByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(bundlePreview?.bundleId, "execution_bundle_preview_proposal_candidate_conversion_flow");
    assert.equal(bundlePreview?.bundleState, "bundle_incomplete");
    assert.equal(bundlePreview?.readinessState, contractReadiness?.readinessState);
    assert.equal(bundlePreview?.readinessScore, contractReadiness?.readinessScore);
    assert.deepEqual(bundlePreview?.includedComponents, [
      "proposal",
      "approval",
      "queue",
      "execution_package",
      "execution_contract",
    ]);
    assert.deepEqual(bundlePreview?.missingComponents, ["conversion_baseline", "design_evidence"]);
    const bundleReadiness = bundleReadinessByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(bundleReadiness?.readinessState, "incomplete");
    assert.equal(bundleReadiness?.readinessScore, 80);
    assert.deepEqual(bundleReadiness?.requirementsMet, [
      "execution_bundle_present",
      "contract_bundle_present",
      "artifact_bundle_present",
    ]);
    assert.deepEqual(bundleReadiness?.requirementsMissing, ["conversion_baseline", "design_evidence"]);
    const authorizationPreview = authorizationPreviewByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(authorizationPreview?.authorizationPreviewState, "authorization_preview_incomplete");
    assert.equal(authorizationPreview?.readinessState, bundleReadiness?.readinessState);
    assert.equal(authorizationPreview?.readinessScore, bundleReadiness?.readinessScore);
    assert.equal(authorizationPreview?.authorizationType, "conversion_authorization");
    assert.deepEqual(authorizationPreview?.requiredAuthorizations, [
      "operator_review",
      "conversion_baseline_review",
      "design_review",
    ]);
    assert.deepEqual(authorizationPreview?.blockedReasons, [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ]);
    const authorizationReadiness = authorizationReadinessByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(authorizationReadiness?.readinessState, "not_ready");
    assert.equal(authorizationReadiness?.readinessScore, 85);
    assert.deepEqual(authorizationReadiness?.requirementsMet, [
      "authorization_preview_present",
      "authorization_scope_defined",
    ]);
    assert.deepEqual(authorizationReadiness?.requirementsMissing, ["conversion_baseline", "design_evidence"]);
    const authorizationPackage = authorizationPackageByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(authorizationPackage?.packageState, "package_incomplete");
    assert.equal(authorizationPackage?.readinessState, authorizationReadiness?.readinessState);
    assert.equal(authorizationPackage?.readinessScore, authorizationReadiness?.readinessScore);
    assert.equal(authorizationPackage?.authorizationType, authorizationPreview?.authorizationType);
    assert.deepEqual(authorizationPackage?.includedComponents, [
      "authorization_preview",
      "authorization_readiness",
    ]);
    assert.deepEqual(authorizationPackage?.missingComponents, ["conversion_baseline", "design_evidence"]);
    const executionIntent = executionIntentByTitle.get("Improve Homepage Conversion Flow");
    assert.equal(executionIntent?.intentState, "intent_blocked");
    assert.equal(executionIntent?.readinessState, authorizationPackage?.readinessState);
    assert.equal(executionIntent?.readinessScore, authorizationPackage?.readinessScore);
    assert.equal(executionIntent?.intentType, "conversion_improvement_intent");
    assert.deepEqual(executionIntent?.intendedActions, [
      "review_conversion_path",
      "prepare_homepage_conversion_changes",
    ]);
    assert.deepEqual(executionIntent?.blockedReasons, [
      "missing_conversion_baseline",
      "missing_design_evidence",
      "governance_execution_blocked",
    ]);
  }
  const messagingReadiness = readinessByTitle.get("Improve Homepage Quality and Messaging");
  if (messagingReadiness) {
    assert.equal(messagingReadiness.readinessState, "ready_for_future_planning");
    assert.equal(messagingReadiness.readinessScore, 80);
    assert.equal(messagingReadiness.requirementsMet.includes("artifact_preview_available"), true);
    assert.equal(messagingReadiness.requirementsMissing.includes("design_evidence"), true);
    const packagePreview = packagePreviewByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(packagePreview?.packageState, "preview_ready");
    assert.equal(packagePreview?.readinessState, messagingReadiness.readinessState);
    assert.equal(packagePreview?.readinessScore, messagingReadiness.readinessScore);
    assert.deepEqual(packagePreview?.includedPlans, [
      "analyze_homepage_content",
      "identify_messaging_improvements",
      "prepare_content_improvement_plan",
    ]);
    assert.deepEqual(packagePreview?.includedArtifacts, ["messaging_review_document", "content_improvement_plan"]);
    const packageReadiness = packageReadinessByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(packageReadiness?.readinessState, "nearly_ready");
    assert.equal(packageReadiness?.readinessScore, 90);
    assert.deepEqual(packageReadiness?.requirementsMet, [
      "execution_package_present",
      "planning_artifacts_present",
      "messaging_surface_identified",
      "homepage_detected",
    ]);
    assert.deepEqual(packageReadiness?.requirementsMissing, ["design_evidence"]);
    const contractPreview = contractPreviewByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(contractPreview?.contractPreviewState, "contract_preview_ready");
    assert.equal(contractPreview?.readinessState, packageReadiness?.readinessState);
    assert.equal(contractPreview?.readinessScore, packageReadiness?.readinessScore);
    assert.equal(contractPreview?.contractType, "content_execution_contract");
    assert.deepEqual(contractPreview?.contractScope, ["homepage_hero", "homepage_messaging"]);
    assert.deepEqual(contractPreview?.requiredInputs, ["design_evidence"]);
    assert.deepEqual(contractPreview?.blockedReasons, ["missing_design_evidence", "governance_execution_blocked"]);
    const contractReadiness = contractReadinessByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(contractReadiness?.contractPreviewId, contractPreview?.contractPreviewId);
    assert.equal(contractReadiness?.readinessState, "nearly_ready");
    assert.equal(contractReadiness?.readinessScore, 90);
    assert.deepEqual(contractReadiness?.requirementsMet, [
      "contract_preview_present",
      "contract_scope_defined",
      "content_plan_available",
      "execution_package_available",
    ]);
    assert.deepEqual(contractReadiness?.requirementsMissing, ["design_evidence"]);
    const bundlePreview = bundlePreviewByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(bundlePreview?.bundleState, "bundle_ready");
    assert.equal(bundlePreview?.readinessState, contractReadiness?.readinessState);
    assert.equal(bundlePreview?.readinessScore, contractReadiness?.readinessScore);
    assert.deepEqual(bundlePreview?.includedComponents, [
      "proposal",
      "approval",
      "queue",
      "execution_package",
      "execution_contract",
    ]);
    assert.deepEqual(bundlePreview?.missingComponents, ["design_evidence"]);
    const bundleReadiness = bundleReadinessByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(bundleReadiness?.readinessState, "nearly_ready");
    assert.equal(bundleReadiness?.readinessScore, 95);
    assert.deepEqual(bundleReadiness?.requirementsMet, [
      "execution_bundle_present",
      "contract_bundle_present",
      "artifact_bundle_present",
      "messaging_surface_identified",
    ]);
    assert.deepEqual(bundleReadiness?.requirementsMissing, ["design_evidence"]);
    const authorizationPreview = authorizationPreviewByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(authorizationPreview?.authorizationPreviewState, "authorization_preview_ready");
    assert.equal(authorizationPreview?.readinessState, bundleReadiness?.readinessState);
    assert.equal(authorizationPreview?.readinessScore, bundleReadiness?.readinessScore);
    assert.equal(authorizationPreview?.authorizationType, "content_authorization");
    assert.deepEqual(authorizationPreview?.requiredAuthorizations, ["operator_review", "design_review"]);
    assert.deepEqual(authorizationPreview?.blockedReasons, [
      "missing_design_evidence",
      "governance_execution_blocked",
    ]);
    const authorizationReadiness = authorizationReadinessByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(authorizationReadiness?.readinessState, "nearly_ready");
    assert.equal(authorizationReadiness?.readinessScore, 95);
    assert.deepEqual(authorizationReadiness?.requirementsMet, [
      "authorization_preview_present",
      "authorization_scope_defined",
      "authorization_package_available",
    ]);
    assert.deepEqual(authorizationReadiness?.requirementsMissing, ["design_evidence"]);
    const authorizationPackage = authorizationPackageByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(authorizationPackage?.packageState, "package_ready");
    assert.equal(authorizationPackage?.readinessState, authorizationReadiness?.readinessState);
    assert.equal(authorizationPackage?.readinessScore, authorizationReadiness?.readinessScore);
    assert.equal(authorizationPackage?.authorizationType, authorizationPreview?.authorizationType);
    assert.deepEqual(authorizationPackage?.includedComponents, [
      "authorization_preview",
      "authorization_readiness",
      "authorization_requirements",
    ]);
    assert.deepEqual(authorizationPackage?.missingComponents, ["design_evidence"]);
    const executionIntent = executionIntentByTitle.get("Improve Homepage Quality and Messaging");
    assert.equal(executionIntent?.intentState, "intent_ready_preview");
    assert.equal(executionIntent?.readinessState, authorizationPackage?.readinessState);
    assert.equal(executionIntent?.readinessScore, authorizationPackage?.readinessScore);
    assert.equal(executionIntent?.intentType, "content_improvement_intent");
    assert.deepEqual(executionIntent?.intendedActions, [
      "review_homepage_messaging",
      "prepare_homepage_copy_improvements",
    ]);
    assert.deepEqual(executionIntent?.blockedReasons, [
      "missing_design_evidence",
      "governance_execution_blocked",
    ]);
  }
  const validationReadiness = readinessByTitle.get("Maintain Read-Only Validation Mode");
  assert.equal(validationReadiness != null, model.sourceId !== null);
  if (validationReadiness) {
    assert.equal(validationReadiness.readinessState, "ready_for_future_planning");
    assert.equal(validationReadiness.readinessScore, 100);
    assert.deepEqual(validationReadiness.requirementsMissing, []);
    const packagePreview = packagePreviewByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(packagePreview?.packageState, "preview_ready");
    assert.equal(packagePreview?.readinessState, validationReadiness.readinessState);
    assert.equal(packagePreview?.readinessScore, validationReadiness.readinessScore);
    assert.deepEqual(packagePreview?.includedPlans, ["maintain_read_only_runtime", "continue_validation_observation"]);
    assert.deepEqual(packagePreview?.includedArtifacts, ["validation_status_report"]);
    const packageReadiness = packageReadinessByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(packageReadiness?.readinessState, "ready");
    assert.equal(packageReadiness?.readinessScore, 100);
    assert.deepEqual(packageReadiness?.requirementsMet, [
      "execution_package_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ]);
    assert.deepEqual(packageReadiness?.requirementsMissing, []);
    const contractPreview = contractPreviewByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(contractPreview?.contractPreviewState, "contract_preview_ready");
    assert.equal(contractPreview?.readinessState, packageReadiness?.readinessState);
    assert.equal(contractPreview?.readinessScore, packageReadiness?.readinessScore);
    assert.equal(contractPreview?.contractType, "governance_validation_contract");
    assert.deepEqual(contractPreview?.contractScope, ["runtime_governance"]);
    assert.deepEqual(contractPreview?.requiredInputs, []);
    assert.deepEqual(contractPreview?.blockedReasons, ["governance_execution_blocked"]);
    const contractReadiness = contractReadinessByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(contractReadiness?.contractPreviewId, contractPreview?.contractPreviewId);
    assert.equal(contractReadiness?.readinessState, "ready");
    assert.equal(contractReadiness?.readinessScore, 100);
    assert.deepEqual(contractReadiness?.requirementsMet, [
      "contract_preview_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ]);
    assert.deepEqual(contractReadiness?.requirementsMissing, []);
    const bundlePreview = bundlePreviewByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(bundlePreview?.bundleState, "bundle_ready");
    assert.equal(bundlePreview?.readinessState, contractReadiness?.readinessState);
    assert.equal(bundlePreview?.readinessScore, contractReadiness?.readinessScore);
    assert.deepEqual(bundlePreview?.includedComponents, [
      "proposal",
      "approval",
      "queue",
      "execution_package",
      "execution_contract",
    ]);
    assert.deepEqual(bundlePreview?.missingComponents, []);
    const bundleReadiness = bundleReadinessByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(bundleReadiness?.readinessState, "ready");
    assert.equal(bundleReadiness?.readinessScore, 100);
    assert.deepEqual(bundleReadiness?.requirementsMet, [
      "execution_bundle_present",
      "governance_bundle_present",
      "validation_runtime_active",
    ]);
    assert.deepEqual(bundleReadiness?.requirementsMissing, []);
    const authorizationPreview = authorizationPreviewByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(authorizationPreview?.authorizationPreviewState, "authorization_preview_ready");
    assert.equal(authorizationPreview?.readinessState, bundleReadiness?.readinessState);
    assert.equal(authorizationPreview?.readinessScore, bundleReadiness?.readinessScore);
    assert.equal(authorizationPreview?.authorizationType, "governance_validation_authorization");
    assert.deepEqual(authorizationPreview?.requiredAuthorizations, ["operator_review"]);
    assert.deepEqual(authorizationPreview?.blockedReasons, ["governance_execution_blocked"]);
    const authorizationReadiness = authorizationReadinessByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(authorizationReadiness?.readinessState, "ready");
    assert.equal(authorizationReadiness?.readinessScore, 100);
    assert.deepEqual(authorizationReadiness?.requirementsMet, [
      "authorization_preview_present",
      "governance_boundary_present",
      "validation_runtime_active",
    ]);
    assert.deepEqual(authorizationReadiness?.requirementsMissing, []);
    const authorizationPackage = authorizationPackageByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(authorizationPackage?.packageState, "package_ready");
    assert.equal(authorizationPackage?.readinessState, authorizationReadiness?.readinessState);
    assert.equal(authorizationPackage?.readinessScore, authorizationReadiness?.readinessScore);
    assert.equal(authorizationPackage?.authorizationType, authorizationPreview?.authorizationType);
    assert.deepEqual(authorizationPackage?.includedComponents, [
      "authorization_preview",
      "authorization_readiness",
      "authorization_requirements",
    ]);
    assert.deepEqual(authorizationPackage?.missingComponents, []);
    const executionIntent = executionIntentByTitle.get("Maintain Read-Only Validation Mode");
    assert.equal(executionIntent?.intentState, "intent_ready_preview");
    assert.equal(executionIntent?.readinessState, authorizationPackage?.readinessState);
    assert.equal(executionIntent?.readinessScore, authorizationPackage?.readinessScore);
    assert.equal(executionIntent?.intentType, "governance_validation_intent");
    assert.deepEqual(executionIntent?.intendedActions, [
      "maintain_read_only_runtime",
      "continue_governance_validation",
    ]);
    assert.deepEqual(executionIntent?.blockedReasons, ["governance_execution_blocked"]);
  }
  assert.equal(
    model.proposalCandidates.every((entry) =>
      ["read_only", "non_executable", "no_content_mutation", "no_design_mutation", "no_publish", "no_provider_execution"].every(
        (boundary) => entry.boundaries.includes(boundary),
      ),
    ),
    true,
  );
  assert.equal(flat.includes("aiOutput"), false);
});

test("workspace overview model: observations include read-only runtime validation", async () => {
  const model = await buildWorkspaceOverviewModel();
  if (model.sourceId === null) {
    assert.deepEqual(model.observations, []);
    assert.deepEqual(model.insights, []);
    assert.deepEqual(model.recommendations, []);
    assert.deepEqual(model.optimizationOpportunities, []);
    assert.deepEqual(model.optimizationScores, []);
    assert.deepEqual(model.proposalCandidates, []);
    assert.deepEqual(model.approvalPreviews, []);
    assert.deepEqual(model.proposalApprovalRecords, []);
    assert.deepEqual(model.approvalStates, []);
    assert.deepEqual(model.approvalQueueItems, []);
    assert.deepEqual(model.executionPlanPreviews, []);
    assert.deepEqual(model.executionArtifactPreviews, []);
    assert.deepEqual(model.executionReadinessRecords, []);
    assert.deepEqual(model.executionPackagePreviews, []);
    assert.deepEqual(model.executionPackageReadinessRecords, []);
    assert.deepEqual(model.executionContractPreviews, []);
    assert.deepEqual(model.executionContractReadinessRecords, []);
    assert.deepEqual(model.executionBundlePreviews, []);
    assert.deepEqual(model.executionBundleReadinessRecords, []);
    assert.deepEqual(model.executionAuthorizationPreviews, []);
    assert.deepEqual(model.executionAuthorizationReadinessRecords, []);
    assert.deepEqual(model.executionAuthorizationPackageRecords, []);
    assert.deepEqual(model.executionIntentRecords, []);
    return;
  }
  assert.equal(model.observations.some((entry) => entry.title === "Read-Only Runtime Validation"), true);
  assert.equal(model.insights.some((entry) => entry.title === "Governance Boundary Enforced"), true);
  assert.equal(model.recommendations.some((entry) => entry.title === "Maintain Read-Only Validation Mode"), true);
  assert.equal(model.optimizationOpportunities.some((entry) => entry.title === "Validation Stability Preservation"), true);
  assert.equal(model.optimizationScores.some((entry) => entry.opportunityId === "opt_validation_stability_preservation"), true);
  assert.equal(model.proposalCandidates.some((entry) => entry.title === "Maintain Read-Only Validation Mode"), true);
});

test("workspace overview model: optimization ranking order is deterministic", async () => {
  const model = await buildWorkspaceOverviewModel();
  if (model.sourceId === null) {
    assert.deepEqual(model.optimizationScores, []);
    return;
  }
  assert.equal(model.optimizationScores.length, model.optimizationOpportunities.length);
  assert.deepEqual(
    [...model.optimizationScores].sort((a, b) => b.totalScore - a.totalScore || a.opportunityId.localeCompare(b.opportunityId)),
    model.optimizationScores,
  );
  assert.deepEqual(
    model.optimizationScores.map((entry) => entry.rank),
    model.optimizationScores.map((_, index) => index + 1),
  );
});

test("workspace overview page source: renders required sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("Website OS Planning Console"), true);
  assert.equal(source.includes("Operator Workspace Console · Read-only Runtime Preview"), true);
  assert.equal(source.includes("Workspace Snapshot"), true);

  assert.equal(source.includes("Planning State"), true);
  assert.equal(source.includes("Scope"), true);
  assert.equal(source.includes("Workspace Version"), true);
  assert.equal(source.includes("Snapshot Updated"), true);

  assert.equal(source.includes("Content"), true);
  assert.equal(source.includes("Design"), true);
  assert.equal(source.includes("Experience"), true);
  assert.equal(source.includes("Governance"), true);
  assert.equal(source.includes("Operations"), true);
  assert.equal(source.includes("Planning Candidates"), true);
  assert.equal(source.includes("Governance Review Preview"), true);
  assert.equal(source.includes("Approval Records"), true);
  assert.equal(source.includes("Approval States"), true);
  assert.equal(source.includes("Approval Queue"), true);
  assert.equal(source.includes("Execution Readiness"), true);
  assert.equal(source.includes("Execution Package Preview"), true);
  assert.equal(source.includes("Execution Package Readiness"), true);
  assert.equal(source.includes("Execution Contract Preview"), true);
  assert.equal(source.includes("Execution Contract Readiness"), true);
  assert.equal(source.includes("Execution Bundle Preview"), true);
  assert.equal(source.includes("Execution Bundle Readiness"), true);
  assert.equal(source.includes("Execution Authorization Preview"), true);
  assert.equal(source.includes("Execution Authorization Readiness"), true);
  assert.equal(source.includes("Execution Authorization Package"), true);
  assert.equal(source.includes("Execution Intent"), true);
  assert.equal(source.includes("Execution Plan Preview"), true);
  assert.equal(source.includes("Execution Artifact Preview"), true);
  assert.equal(source.includes("preview.proposalTitle"), true);
  assert.equal(source.includes("preview.currentState"), true);
  assert.equal(source.includes("preview.requiredApprovals"), true);
  assert.equal(source.includes("preview.governanceState"), true);
  assert.equal(source.includes("Permissions"), true);
  assert.equal(source.includes("preview.executionPermission"), true);
  assert.equal(source.includes("preview.mutationPermission"), true);
  assert.equal(source.includes("preview.publishingPermission"), true);
  assert.equal(source.includes("preview.providerPermission"), true);
  assert.equal(source.includes("record.proposalTitle"), true);
  assert.equal(source.includes("record.approvalStatus"), true);
  assert.equal(source.includes("record.decision"), true);
  assert.equal(source.includes("record.requiredApprovals"), true);
  assert.equal(source.includes("record.receivedApprovals"), true);
  assert.equal(source.includes("record.approvalComplete"), true);
  assert.equal(source.includes("record.executionAllowed"), true);
  assert.equal(source.includes("record.mutationAllowed"), true);
  assert.equal(source.includes("record.publishingAllowed"), true);
  assert.equal(source.includes("record.providerExecutionAllowed"), true);
  assert.equal(source.includes("record.governanceState"), true);
  assert.equal(source.includes("record.summary"), true);
  assert.equal(source.includes("record.approvalState"), true);
  assert.equal(source.includes("queueItem.proposalTitle"), true);
  assert.equal(source.includes("queueItem.queueRank"), true);
  assert.equal(source.includes("queueItem.queuePriority"), true);
  assert.equal(source.includes("queueItem.optimizationScore"), true);
  assert.equal(source.includes("queueItem.approvalState"), true);
  assert.equal(source.includes("queueItem.executionAllowed"), true);
  assert.equal(source.includes("queueItem.mutationAllowed"), true);
  assert.equal(source.includes("queueItem.publishingAllowed"), true);
  assert.equal(source.includes("queueItem.providerExecutionAllowed"), true);
  assert.equal(source.includes("queueItem.governanceState"), true);
  assert.equal(source.includes("queueItem.summary"), true);
  assert.equal(source.includes("model.executionReadinessRecords.map"), true);
  assert.equal(source.includes("record.readinessId"), true);
  assert.equal(source.includes("record.readinessState"), true);
  assert.equal(source.includes("record.readinessScore"), true);
  assert.equal(source.includes("record.requirementsMet.map"), true);
  assert.equal(source.includes("record.requirementsMissing.map"), true);
  assert.equal(source.includes("Requirements Met"), true);
  assert.equal(source.includes("Requirements Missing"), true);
  assert.equal(source.includes("model.executionPackagePreviews.map"), true);
  assert.equal(source.includes("preview.packageId"), true);
  assert.equal(source.includes("preview.packageState"), true);
  assert.equal(source.includes("preview.readinessState"), true);
  assert.equal(source.includes("preview.readinessScore"), true);
  assert.equal(source.includes("preview.includedPlans.map"), true);
  assert.equal(source.includes("preview.includedArtifacts.map"), true);
  assert.equal(source.includes("Included Plans"), true);
  assert.equal(source.includes("Included Artifacts"), true);
  assert.equal(source.includes("model.executionPackageReadinessRecords.map"), true);
  assert.equal(source.includes("readinessRecord.packageId"), true);
  assert.equal(source.includes("readinessRecord.proposalTitle"), true);
  assert.equal(source.includes("readinessRecord.readinessState"), true);
  assert.equal(source.includes("readinessRecord.readinessScore"), true);
  assert.equal(source.includes("readinessRecord.requirementsMet.map"), true);
  assert.equal(source.includes("readinessRecord.requirementsMissing.map"), true);
  assert.equal(source.includes("readinessRecord.executionAllowed"), true);
  assert.equal(source.includes("readinessRecord.mutationAllowed"), true);
  assert.equal(source.includes("readinessRecord.publishingAllowed"), true);
  assert.equal(source.includes("readinessRecord.providerExecutionAllowed"), true);
  assert.equal(source.includes("readinessRecord.governanceState"), true);
  assert.equal(source.includes("readinessRecord.summary"), true);
  assert.equal(source.includes("model.executionBundlePreviews.map"), true);
  assert.equal(source.includes("bundlePreview.bundleId"), true);
  assert.equal(source.includes("bundlePreview.proposalTitle"), true);
  assert.equal(source.includes("bundlePreview.bundleState"), true);
  assert.equal(source.includes("bundlePreview.readinessState"), true);
  assert.equal(source.includes("bundlePreview.readinessScore"), true);
  assert.equal(source.includes("bundlePreview.includedComponents.map"), true);
  assert.equal(source.includes("bundlePreview.missingComponents.map"), true);
  assert.equal(source.includes("bundlePreview.executionAllowed"), true);
  assert.equal(source.includes("bundlePreview.mutationAllowed"), true);
  assert.equal(source.includes("bundlePreview.publishingAllowed"), true);
  assert.equal(source.includes("bundlePreview.providerExecutionAllowed"), true);
  assert.equal(source.includes("bundlePreview.governanceState"), true);
  assert.equal(source.includes("bundlePreview.summary"), true);
  assert.equal(source.includes("Included Components"), true);
  assert.equal(source.includes("Missing Components"), true);
  assert.equal(source.includes("model.executionBundleReadinessRecords.map"), true);
  assert.equal(source.includes("readinessRecord.proposalId"), true);
  assert.equal(source.includes("readinessRecord.proposalTitle"), true);
  assert.equal(source.includes("readinessRecord.readinessState"), true);
  assert.equal(source.includes("readinessRecord.readinessScore"), true);
  assert.equal(source.includes("readinessRecord.requirementsMet.map"), true);
  assert.equal(source.includes("readinessRecord.requirementsMissing.map"), true);
  assert.equal(source.includes("readinessRecord.executionAllowed"), true);
  assert.equal(source.includes("readinessRecord.mutationAllowed"), true);
  assert.equal(source.includes("readinessRecord.publishingAllowed"), true);
  assert.equal(source.includes("readinessRecord.providerExecutionAllowed"), true);
  assert.equal(source.includes("readinessRecord.governanceState"), true);
  assert.equal(source.includes("readinessRecord.summary"), true);
  assert.equal(source.includes("model.executionAuthorizationPreviews.map"), true);
  assert.equal(source.includes("authorizationPreview.proposalId"), true);
  assert.equal(source.includes("authorizationPreview.proposalTitle"), true);
  assert.equal(source.includes("authorizationPreview.authorizationPreviewState"), true);
  assert.equal(source.includes("authorizationPreview.readinessState"), true);
  assert.equal(source.includes("authorizationPreview.readinessScore"), true);
  assert.equal(source.includes("authorizationPreview.authorizationType"), true);
  assert.equal(source.includes("authorizationPreview.requiredAuthorizations.map"), true);
  assert.equal(source.includes("authorizationPreview.blockedReasons.map"), true);
  assert.equal(source.includes("authorizationPreview.executionAllowed"), true);
  assert.equal(source.includes("authorizationPreview.mutationAllowed"), true);
  assert.equal(source.includes("authorizationPreview.publishingAllowed"), true);
  assert.equal(source.includes("authorizationPreview.providerExecutionAllowed"), true);
  assert.equal(source.includes("authorizationPreview.governanceState"), true);
  assert.equal(source.includes("authorizationPreview.summary"), true);
  assert.equal(source.includes("Required Authorizations"), true);
  assert.equal(source.includes("model.executionAuthorizationReadinessRecords.map"), true);
  assert.equal(source.includes("authorizationReadiness.proposalId"), true);
  assert.equal(source.includes("authorizationReadiness.proposalTitle"), true);
  assert.equal(source.includes("authorizationReadiness.readinessState"), true);
  assert.equal(source.includes("authorizationReadiness.readinessScore"), true);
  assert.equal(source.includes("authorizationReadiness.requirementsMet.map"), true);
  assert.equal(source.includes("authorizationReadiness.requirementsMissing.map"), true);
  assert.equal(source.includes("authorizationReadiness.executionAllowed"), true);
  assert.equal(source.includes("authorizationReadiness.mutationAllowed"), true);
  assert.equal(source.includes("authorizationReadiness.publishingAllowed"), true);
  assert.equal(source.includes("authorizationReadiness.providerExecutionAllowed"), true);
  assert.equal(source.includes("authorizationReadiness.governanceState"), true);
  assert.equal(source.includes("authorizationReadiness.summary"), true);
  assert.equal(source.includes("model.executionAuthorizationPackageRecords.map"), true);
  assert.equal(source.includes("authorizationPackage.proposalId"), true);
  assert.equal(source.includes("authorizationPackage.proposalTitle"), true);
  assert.equal(source.includes("authorizationPackage.packageState"), true);
  assert.equal(source.includes("authorizationPackage.readinessState"), true);
  assert.equal(source.includes("authorizationPackage.readinessScore"), true);
  assert.equal(source.includes("authorizationPackage.authorizationType"), true);
  assert.equal(source.includes("authorizationPackage.includedComponents.map"), true);
  assert.equal(source.includes("authorizationPackage.missingComponents.map"), true);
  assert.equal(source.includes("authorizationPackage.executionAllowed"), true);
  assert.equal(source.includes("authorizationPackage.mutationAllowed"), true);
  assert.equal(source.includes("authorizationPackage.publishingAllowed"), true);
  assert.equal(source.includes("authorizationPackage.providerExecutionAllowed"), true);
  assert.equal(source.includes("authorizationPackage.governanceState"), true);
  assert.equal(source.includes("authorizationPackage.summary"), true);
  assert.equal(source.includes("model.executionIntentRecords.map"), true);
  assert.equal(source.includes("intentRecord.proposalId"), true);
  assert.equal(source.includes("intentRecord.proposalTitle"), true);
  assert.equal(source.includes("intentRecord.intentState"), true);
  assert.equal(source.includes("intentRecord.readinessState"), true);
  assert.equal(source.includes("intentRecord.readinessScore"), true);
  assert.equal(source.includes("intentRecord.intentType"), true);
  assert.equal(source.includes("intentRecord.intendedActions.map"), true);
  assert.equal(source.includes("intentRecord.blockedReasons.map"), true);
  assert.equal(source.includes("intentRecord.executionAllowed"), true);
  assert.equal(source.includes("intentRecord.mutationAllowed"), true);
  assert.equal(source.includes("intentRecord.publishingAllowed"), true);
  assert.equal(source.includes("intentRecord.providerExecutionAllowed"), true);
  assert.equal(source.includes("intentRecord.governanceState"), true);
  assert.equal(source.includes("intentRecord.summary"), true);
  assert.equal(source.includes("Intended Actions"), true);
  assert.equal(source.includes("model.executionContractPreviews.map"), true);
  assert.equal(source.includes("contractPreview.contractPreviewId"), true);
  assert.equal(source.includes("contractPreview.proposalTitle"), true);
  assert.equal(source.includes("contractPreview.contractPreviewState"), true);
  assert.equal(source.includes("contractPreview.readinessState"), true);
  assert.equal(source.includes("contractPreview.readinessScore"), true);
  assert.equal(source.includes("contractPreview.contractType"), true);
  assert.equal(source.includes("contractPreview.contractScope.map"), true);
  assert.equal(source.includes("contractPreview.requiredInputs.map"), true);
  assert.equal(source.includes("contractPreview.blockedReasons.map"), true);
  assert.equal(source.includes("contractPreview.executionAllowed"), true);
  assert.equal(source.includes("contractPreview.mutationAllowed"), true);
  assert.equal(source.includes("contractPreview.publishingAllowed"), true);
  assert.equal(source.includes("contractPreview.providerExecutionAllowed"), true);
  assert.equal(source.includes("contractPreview.governanceState"), true);
  assert.equal(source.includes("contractPreview.summary"), true);
  assert.equal(source.includes("Contract Scope"), true);
  assert.equal(source.includes("Required Inputs"), true);
  assert.equal(source.includes("Blocked Reasons"), true);
  assert.equal(source.includes("model.executionContractReadinessRecords.map"), true);
  assert.equal(source.includes("readinessRecord.contractPreviewId"), true);
  assert.equal(source.includes("readinessRecord.proposalTitle"), true);
  assert.equal(source.includes("readinessRecord.readinessState"), true);
  assert.equal(source.includes("readinessRecord.readinessScore"), true);
  assert.equal(source.includes("readinessRecord.requirementsMet.map"), true);
  assert.equal(source.includes("readinessRecord.requirementsMissing.map"), true);
  assert.equal(source.includes("readinessRecord.executionAllowed"), true);
  assert.equal(source.includes("readinessRecord.mutationAllowed"), true);
  assert.equal(source.includes("readinessRecord.publishingAllowed"), true);
  assert.equal(source.includes("readinessRecord.providerExecutionAllowed"), true);
  assert.equal(source.includes("readinessRecord.governanceState"), true);
  assert.equal(source.includes("readinessRecord.summary"), true);
  assert.equal(source.includes("Governance"), true);
  assert.equal(source.includes("Governance State Path"), true);
  assert.equal(source.includes("proposal_candidate"), true);
  assert.equal(source.includes("approval_review"), true);
  assert.equal(source.includes("execution_plan"), true);
  assert.equal(source.includes("execution_blocked"), true);
  assert.equal(source.includes("Summary"), true);
  assert.equal(source.includes("preview.executionState"), true);
  assert.equal(source.includes("preview.governanceState"), true);
  assert.equal(source.includes("Execution Gates"), true);
  assert.equal(source.includes("preview.executionBlocked"), true);
  assert.equal(source.includes("preview.providerExecutionAllowed"), true);
  assert.equal(source.includes("preview.publishingAllowed"), true);
  assert.equal(source.includes("preview.mutationAllowed"), true);
  assert.equal(source.includes("Planned Actions"), true);
  assert.equal(source.includes("preview.plannedActions.map"), true);
  assert.equal(source.includes("plannedAction"), true);
  assert.equal(source.includes("preview.summary"), true);
  assert.equal(source.includes("preview.artifactType"), true);
  assert.equal(source.includes("preview.affectedAreas.map"), true);
  assert.equal(source.includes("preview.plannedOutputs.map"), true);
  assert.equal(source.includes("Affected Areas"), true);
  assert.equal(source.includes("Planned Outputs"), true);
  assert.equal(source.includes("proposal.title"), true);
  assert.equal(source.includes("proposal.status"), true);
  assert.equal(source.includes("proposal.executionState"), true);
  assert.equal(source.includes("proposal.priority"), true);
  assert.equal(source.includes("proposal.optimizationRank"), true);
  assert.equal(source.includes("proposal.optimizationScore"), true);
  assert.equal(source.includes("proposal.expectedImpact"), true);
  assert.equal(source.includes("proposal.expectedEffort"), true);
  assert.equal(source.includes("proposal.risk"), true);
  assert.equal(source.includes("proposal.summary"), true);
  assert.equal(source.includes("proposal.reason"), true);
  assert.equal(source.includes("Summary:"), true);
  assert.equal(source.includes("Reason:"), true);
  assert.equal(source.includes("Opportunity Ranking"), true);
  assert.equal(source.includes("score.rank"), true);
  assert.equal(source.includes("score.totalScore"), true);
  assert.equal(source.includes("impact / effort / confidence:"), true);

  assert.equal(source.includes("Operator Navigation Surfaces"), true);
  assert.equal(source.includes("Provider Governance Snapshot"), true);
  assert.equal(source.includes("Runtime Evidence & Diagnostics"), true);
  assert.equal(source.includes("Observations"), true);
  assert.equal(source.includes("observation.severity"), true);
  assert.equal(source.includes("observation.title"), true);
  assert.equal(source.includes("observation.summary"), true);
  assert.equal(source.includes("Insights"), true);
  assert.equal(source.includes("insight.severity"), true);
  assert.equal(source.includes("insight.title"), true);
  assert.equal(source.includes("insight.summary"), true);
  assert.equal(source.includes("Supporting observations:"), true);
  assert.equal(source.includes("Recommendations"), true);
  assert.equal(source.includes("recommendation.priority"), true);
  assert.equal(source.includes("recommendation.title"), true);
  assert.equal(source.includes("recommendation.summary"), true);
  assert.equal(source.includes("Supporting insights:"), true);
  assert.equal(source.includes("Optimization Opportunities"), true);
  assert.equal(source.includes("opportunity.priority"), true);
  assert.equal(source.includes("opportunity.impact"), true);
  assert.equal(source.includes("opportunity.effort"), true);
  assert.equal(source.includes("opportunity.title"), true);
  assert.equal(source.includes("opportunity.summary"), true);
  assert.equal(source.includes("Supporting recommendations:"), true);
  assert.equal(source.includes("Diagnostics"), true);
  assert.equal(source.includes("<details>"), true);
  assert.equal(source.includes("<summary"), true);
  assert.equal(source.includes("<details open"), false);
  assert.equal(source.includes("evidenceQualityScore="), false);
  assert.equal(source.includes("Diagnostics List"), true);
  assert.equal(source.includes("Import Source Diagnostics"), true);
  assert.equal(source.includes("Persisted Evidence Diagnostics"), true);
  assert.equal(source.includes("Branch Diagnostics"), true);
  assert.equal(source.includes("selectedSource"), true);
  assert.equal(source.includes("stableArtifactPath"), true);
  assert.equal(source.includes("importedUrlSnapshotDirectory"), true);
  assert.equal(source.includes("importedUrlSnapshotCount"), true);
  assert.equal(source.includes("fallbackReason"), true);
  assert.equal(source.includes("persistedEvidenceChecked"), true);
  assert.equal(source.includes("persistedEvidenceAvailable"), true);
  assert.equal(source.includes("persistedEvidenceSelected"), true);
  assert.equal(source.includes("persistedEvidenceReason"), true);
  assert.equal(source.includes("persistedEvidenceSiteVersionId"), true);
  assert.equal(source.includes("persistedEvidenceImportId"), true);
  assert.equal(source.includes("persistedEvidenceShapeStatus"), true);
  assert.equal(source.includes("persistedEvidenceMissingFields"), true);
  assert.equal(source.includes("persistedEvidenceAvailableFields"), true);
  assert.equal(source.includes("persistedEvidenceSourceKind"), true);

  assert.equal(source.includes("Provider Governance State"), true);
  assert.equal(source.includes("Execution Layer: Blocked"), true);
  assert.equal(source.includes("Governance State: Preview / non-executable"), true);

  assert.equal(source.includes("Read-only Planning Console Preview"), true);
  assert.equal(source.includes("No editing available."), true);
  assert.equal(source.includes("No AI actions available."), true);
  assert.equal(source.includes("No publishing available."), true);
});

test("workspace overview page source: contains no action controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("<button"), false);
  assert.equal(source.includes("<form"), false);
  assert.equal(source.includes("<input"), false);
  assert.equal(source.includes("<textarea"), false);
  assert.equal(source.includes("<select"), false);
  assert.equal(source.includes("Approve"), false);
  assert.equal(source.includes("Reject"), false);
  assert.equal(source.includes("Authorize"), false);
  assert.equal(source.includes("Request Approval"), false);
  assert.equal(source.includes("Execute"), false);
  assert.equal(source.includes("execution button"), false);
  assert.equal(source.includes("Publish"), false);
  assert.equal(source.includes("publish button"), false);
  assert.equal(source.includes("provider actions"), false);
  assert.equal(source.includes("Provider Actions"), false);
  assert.equal(source.includes("provider controls"), false);
  assert.equal(source.includes("provider action"), false);
  assert.equal(source.includes("AI action button"), false);
  assert.equal(source.includes("approve button"), false);
  assert.equal(source.includes("reject button"), false);
  assert.equal(source.includes("request approval button"), false);
  assert.equal(source.includes("Generate"), false);
  assert.equal(source.includes("generate button"), false);
  assert.equal(source.includes("AI control"), false);
  assert.equal(source.includes("optimization engine"), false);
  assert.equal(source.includes("proposal engine"), false);
});

test("workspace overview page source: proposal candidates are prioritized over advanced runtime analysis", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const proposalCandidatesIndex = source.indexOf("Planning Candidates");
  const observationsIndex = source.indexOf("Observations");
  const advancedAnalysisIndex = source.indexOf("Runtime Evidence & Diagnostics");
  assert.equal(proposalCandidatesIndex > -1, true);
  assert.equal(observationsIndex > -1, true);
  assert.equal(advancedAnalysisIndex > -1, true);
  assert.equal(proposalCandidatesIndex < observationsIndex, true);
  assert.equal(proposalCandidatesIndex < advancedAnalysisIndex, true);
});

test("workspace overview page source: planning sections render in runtime order", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  const planningCandidatesIndex = source.indexOf("Planning Candidates");
  const governancePreviewIndex = source.indexOf("Governance Review Preview");
  const approvalRecordsIndex = source.indexOf("Approval Records");
  const approvalStatesIndex = source.indexOf("Approval States");
  const approvalQueueIndex = source.indexOf("Approval Queue");
  const executionReadinessIndex = source.indexOf("Execution Readiness");
  const executionPackageIndex = source.indexOf("Execution Package Preview");
  const executionPackageReadinessIndex = source.indexOf("Execution Package Readiness");
  const executionContractPreviewIndex = source.indexOf("Execution Contract Preview");
  const executionContractReadinessIndex = source.indexOf("Execution Contract Readiness");
  const executionBundleIndex = source.indexOf("Execution Bundle Preview");
  const executionBundleReadinessIndex = source.indexOf("Execution Bundle Readiness");
  const executionAuthorizationPreviewIndex = source.indexOf("Execution Authorization Preview");
  const executionAuthorizationReadinessIndex = source.indexOf("Execution Authorization Readiness");
  const executionAuthorizationPackageIndex = source.indexOf("Execution Authorization Package");
  const executionIntentIndex = source.indexOf("Execution Intent");
  const executionPlanIndex = source.indexOf("Execution Plan Preview");
  const executionArtifactIndex = source.indexOf("Execution Artifact Preview");
  const opportunityRankingIndex = source.indexOf("Opportunity Ranking");

  assert.equal(planningCandidatesIndex > -1, true);
  assert.equal(governancePreviewIndex > planningCandidatesIndex, true);
  assert.equal(approvalRecordsIndex > governancePreviewIndex, true);
  assert.equal(approvalStatesIndex > approvalRecordsIndex, true);
  assert.equal(approvalQueueIndex > approvalStatesIndex, true);
  assert.equal(executionReadinessIndex > approvalQueueIndex, true);
  assert.equal(executionPackageIndex > executionReadinessIndex, true);
  assert.equal(executionPackageReadinessIndex > executionPackageIndex, true);
  assert.equal(executionContractPreviewIndex > executionPackageReadinessIndex, true);
  assert.equal(executionContractReadinessIndex > executionContractPreviewIndex, true);
  assert.equal(executionBundleIndex > executionContractReadinessIndex, true);
  assert.equal(executionBundleReadinessIndex > executionBundleIndex, true);
  assert.equal(executionAuthorizationPreviewIndex > executionBundleReadinessIndex, true);
  assert.equal(executionAuthorizationReadinessIndex > executionAuthorizationPreviewIndex, true);
  assert.equal(executionAuthorizationPackageIndex > executionAuthorizationReadinessIndex, true);
  assert.equal(executionIntentIndex > executionAuthorizationPackageIndex, true);
  assert.equal(executionPlanIndex > executionIntentIndex, true);
  assert.equal(executionArtifactIndex > executionPlanIndex, true);
  assert.equal(opportunityRankingIndex > executionArtifactIndex, true);
});

test("workspace overview page source: validation surfaces navigation links render", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Operator Navigation Surfaces"), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview"'), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview-real"'), true);
  assert.equal(source.includes('href="/gnr8/admin/providers"'), true);
});

test("workspace overview page source: contains no edit publish or ai action controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("No editing available."), true);
  assert.equal(source.includes("No AI actions available."), true);
  assert.equal(source.includes("No publishing available."), true);
  assert.equal(source.includes("Publish"), false);
  assert.equal(source.includes("Edit"), false);
});

test("workspace overview source resolution: uses stable validation artifact when available", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-stable-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const betaRunsRoot = path.join(root, "beta-runs");
  const stableSnapshotId = "imported-url-site-stable1234567890";
  const latestSnapshotId = "imported-url-site-latest1234567890";
  await mkdir(path.join(snapshotsRoot, stableSnapshotId), { recursive: true });
  await mkdir(path.join(snapshotsRoot, latestSnapshotId), { recursive: true });
  await writeFile(path.join(snapshotsRoot, stableSnapshotId, "index.html"), "<html><title>stable</title></html>", "utf8");
  await writeFile(path.join(snapshotsRoot, latestSnapshotId, "index.html"), "<html><title>latest</title></html>", "utf8");
  await mkdir(path.join(betaRunsRoot, "run-1"), { recursive: true });
  await writeFile(
    path.join(betaRunsRoot, "run-1", "beta-migration-summary.json"),
    JSON.stringify({
      previewStatus: "passed",
      simulationStatus: "executed",
      snapshotKey: stableSnapshotId,
    }),
    "utf8",
  );

  const selected = await resolveImportedSnapshot({
    snapshotsRootDirAbs: snapshotsRoot,
    betaRunsRootDirAbs: betaRunsRoot,
  });
  assert.notEqual(selected, null);
  assert.equal(selected?.snapshotId, stableSnapshotId);
  assert.equal(selected?.source, "stable_validation_artifact");
});

test("workspace overview source resolution: selects persisted runtime import evidence first when available", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-persisted-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const persistedSnapshotId = "imported-url-site-persisted1234567890";
  const persistedSnapshotRoot = path.join(snapshotsRoot, persistedSnapshotId);
  const latestSnapshotId = "imported-url-site-latest1234567890";
  await mkdir(persistedSnapshotRoot, { recursive: true });
  await mkdir(path.join(snapshotsRoot, latestSnapshotId), { recursive: true });
  await writeFile(path.join(snapshotsRoot, latestSnapshotId, "index.html"), "<html><title>latest</title></html>", "utf8");

  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    persistedRuntimeEvidenceCandidates: [
      {
        siteVersionId: "11111111-1111-4111-8111-111111111111",
        snapshotId: persistedSnapshotId,
        snapshotRootDirAbs: persistedSnapshotRoot,
        importId: "run-valid-001",
        updatedAt: new Date().toISOString(),
        sourceEvidenceSummary: {
          pageCount: 1,
          sectionCount: 1,
          assetCount: 0,
          detectedTitle: "persisted",
          detectedHomepagePath: "/index.html",
        },
      },
    ],
  });
  assert.equal(model.sourceId, persistedSnapshotId);
  assert.equal(model.sourceKind, "persisted_runtime_import_evidence");
  assert.equal(model.importSourceDiagnostics.selectedSource, "persisted_runtime_import_evidence");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceChecked, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailable, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSelected, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceReason, "persisted_runtime_evidence_selected");
  assert.equal(model.importSourceDiagnostics.fallbackReason, "none");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSiteVersionId, "11111111-1111-4111-8111-111111111111");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceImportId, "run-valid-001");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceShapeStatus, "valid");
  assert.deepEqual(model.importSourceDiagnostics.persistedEvidenceMissingFields, []);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailableFields.includes("siteVersionId"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailableFields.includes("pageCount"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSourceKind, null);
  assert.equal(model.overview.operationalSummary.includes("providerState=persisted/runtime-import-evidence"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_STARTED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED"), false);
});

test("workspace overview source resolution: adapter derives persisted summary from runtime_import_provenance_summary_v1", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-persisted-adapter-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const persistedSnapshotId = "imported-url-site-runtime-evidence1234567890";
  const persistedSnapshotRoot = path.join(snapshotsRoot, persistedSnapshotId);
  await mkdir(persistedSnapshotRoot, { recursive: true });

  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    persistedRuntimeEvidenceCandidates: [
      {
        siteVersionId: "33333333-3333-4333-8333-333333333333",
        snapshotId: persistedSnapshotId,
        snapshotRootDirAbs: persistedSnapshotRoot,
        importId: null,
        updatedAt: new Date().toISOString(),
        importProvenanceSummary: {
          kind: "runtime_import_provenance_summary_v1",
          executionIdentity: {
            importId: "run-adapter-001",
            siteVersionId: "33333333-3333-4333-8333-333333333333",
          },
          siteTree: {
            summary: {
              pageCount: 4,
              detectedHomepagePath: "/home",
            },
            tree: {
              id: "home",
              children: [{ id: "about" }, { id: "contact" }],
            },
          },
          semanticImport: {
            title: "Adapter Title",
            sections: [{ id: "hero" }, { id: "features" }, { id: "faq" }],
            assets: [{ path: "/logo.svg" }, { path: "/hero.jpg" }],
            navigation: [{ href: "/home" }],
          },
          multipageImport: {
            summary: {
              pageCount: 6,
              detectedHomepagePath: "/landing",
            },
            tree: {
              id: "landing",
              children: [{ id: "pricing" }],
            },
          },
          renderedCapture: {
            screenshots: [{ path: "home.png" }, { path: "about.png" }],
          },
        } as any,
      },
    ],
  });

  assert.equal(model.sourceKind, "persisted_runtime_import_evidence");
  assert.equal(model.importSourceDiagnostics.selectedSource, "persisted_runtime_import_evidence");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSelected, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceReason, "persisted_runtime_evidence_selected");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceShapeStatus, "valid");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceImportId, "run-adapter-001");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSiteVersionId, "33333333-3333-4333-8333-333333333333");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSourceKind, "runtime_import_provenance_summary_v1");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.present, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.type, "object");
  assert.equal(
    model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.keys.includes("detectedHomepagePath"),
    false,
  );
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.keys.includes("summary"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.keys.includes("tree"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.semanticImport.present, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.semanticImport.type, "object");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.multipageImport.present, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.renderedCapture.present, true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_STARTED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED"), true);
  assert.equal(
    model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_BRANCH_DIAGNOSTICS_CREATED"),
    true,
  );
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED"), false);
  assert.equal(model.overview.contentSummary.includes("pages=4"), true);
  assert.equal(model.overview.contentSummary.includes("sections=3"), true);
  assert.equal(model.overview.designSummary.includes("assets=2"), true);
  assert.equal(model.overview.experienceSummary.includes("homepageDetected="), true);
});

test("workspace overview source resolution: first valid persisted candidate short-circuits later invalid candidates and fallback checks", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-persisted-short-circuit-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const validSnapshotId = "imported-url-site-persisted-valid-short-circuit";
  const validSnapshotRoot = path.join(snapshotsRoot, validSnapshotId);
  await mkdir(validSnapshotRoot, { recursive: true });

  const now = Date.now();
  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    persistedRuntimeEvidenceCandidates: [
      {
        siteVersionId: "66666666-6666-4666-8666-666666666666",
        snapshotId: validSnapshotId,
        snapshotRootDirAbs: validSnapshotRoot,
        importId: null,
        updatedAt: new Date(now).toISOString(),
        importProvenanceSummary: {
          kind: "runtime_import_provenance_summary_v1",
          executionIdentity: {
            importId: "run-short-circuit-valid-001",
            siteVersionId: "66666666-6666-4666-8666-666666666666",
          },
          siteTree: {
            summary: {
              pageCount: 2,
              detectedHomepagePath: "/",
            },
            tree: {
              id: "home",
              children: [{ id: "about" }],
            },
          },
          semanticImport: {
            title: "Short Circuit Valid",
            sections: [{ id: "hero" }],
            assets: [],
          },
        } as any,
      },
      {
        siteVersionId: "77777777-7777-4777-8777-777777777777",
        snapshotId: "imported-url-site-persisted-invalid-later",
        snapshotRootDirAbs: path.join(root, "missing-invalid-later"),
        importId: "run-short-circuit-invalid-001",
        updatedAt: new Date(now - 5000).toISOString(),
      },
    ],
  });

  assert.equal(model.sourceId, validSnapshotId);
  assert.equal(model.sourceKind, "persisted_runtime_import_evidence");
  assert.equal(model.importSourceDiagnostics.selectedSource, "persisted_runtime_import_evidence");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSelected, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceReason, "persisted_runtime_evidence_selected");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceShapeStatus, "valid");
  assert.equal(model.importSourceDiagnostics.fallbackReason, "none");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceImportId, "run-short-circuit-valid-001");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSiteVersionId, "66666666-6666-4666-8666-666666666666");

  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED"), true);

  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_INVALID"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED"), false);
});

test("workspace overview model fallback: no imported site available when no snapshots exist", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-empty-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const betaRunsRoot = path.join(root, "beta-runs");
  await mkdir(snapshotsRoot, { recursive: true });
  await mkdir(betaRunsRoot, { recursive: true });

  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    betaRunsRootDirAbs: betaRunsRoot,
    bundledSnapshotFixture: null,
  });
  assert.equal(model.sourceId, null);
  assert.equal(model.overview.contentSummary, "No imported site available.");
  assert.equal(model.overview.designSummary, "No imported site available.");
  assert.equal(model.overview.experienceSummary, "No imported site available.");
  assert.equal(model.overview.governanceSummary, "No imported site available.");
  assert.equal(model.overview.operationalSummary, "No imported site available.");
  assert.equal(model.importSourceDiagnostics.selectedSource, "none");
  assert.equal(model.importSourceDiagnostics.importedUrlSnapshotCount, 0);
  assert.equal(model.importSourceDiagnostics.fallbackReason !== null, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceChecked, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailable, false);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSelected, false);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceReason, "persisted_runtime_evidence_unavailable");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSiteVersionId, null);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceImportId, null);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceShapeStatus, "unavailable");
  assert.deepEqual(model.importSourceDiagnostics.persistedEvidenceMissingFields, []);
  assert.deepEqual(model.importSourceDiagnostics.persistedEvidenceAvailableFields, []);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSourceKind, null);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.present, false);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.type, "null");
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_IMPORT_SOURCE_SEARCH_STARTED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_UNAVAILABLE"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_INVALID"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_0"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_SELECTED_SOURCE_NONE"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_FALLBACK_MODEL_CREATED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_NO_IMPORTED_SITE_AVAILABLE"), true);
});

test("workspace overview model: bundled stable snapshot is used when filesystem snapshots are unavailable", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-bundled-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const betaRunsRoot = path.join(root, "beta-runs");
  await mkdir(snapshotsRoot, { recursive: true });
  await mkdir(betaRunsRoot, { recursive: true });

  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    betaRunsRootDirAbs: betaRunsRoot,
  });

  assert.equal(model.sourceKind, "bundled_stable_import_snapshot");
  assert.equal(model.sourcePath, null);
  assert.equal(model.importSourceDiagnostics.selectedSource, "bundled_stable_import_snapshot");
  assert.equal(model.importSourceDiagnostics.fallbackReason, "none");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceChecked, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailable, false);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSelected, false);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceReason, "persisted_runtime_evidence_unavailable");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceShapeStatus, "unavailable");
  assert.deepEqual(model.importSourceDiagnostics.persistedEvidenceMissingFields, []);
  assert.deepEqual(model.importSourceDiagnostics.persistedEvidenceAvailableFields, []);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSourceKind, null);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED"), true);
  assert.equal(model.overview.contentSummary.includes("pages="), true);
  assert.equal(model.overview.designSummary.includes("assets="), true);
  assert.equal(model.overview.experienceSummary.includes("homepageDetected="), true);
  assert.equal(model.overview.operationalSummary.includes("providerState=preview/runtime-only"), true);
});

test("workspace overview model: persisted evidence invalid reason rendered and bundled fallback selected", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-persisted-invalid-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const betaRunsRoot = path.join(root, "beta-runs");
  await mkdir(snapshotsRoot, { recursive: true });
  await mkdir(betaRunsRoot, { recursive: true });

  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    betaRunsRootDirAbs: betaRunsRoot,
    persistedRuntimeEvidenceCandidates: [
      {
        siteVersionId: "22222222-2222-4222-8222-222222222222",
        snapshotId: "imported-url-site-missing-evidence",
        snapshotRootDirAbs: path.join(root, "missing-snapshot-root"),
        importId: "run-invalid-001",
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  assert.equal(model.sourceKind, "bundled_stable_import_snapshot");
  assert.equal(model.importSourceDiagnostics.selectedSource, "bundled_stable_import_snapshot");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceChecked, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailable, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSelected, false);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceReason, "persisted_runtime_evidence_invalid");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSiteVersionId, "22222222-2222-4222-8222-222222222222");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceImportId, "run-invalid-001");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceShapeStatus, "invalid");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceMissingFields.includes("pageCount"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceMissingFields.includes("sectionCount"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceMissingFields.includes("assetCount"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceMissingFields.includes("detectedTitle"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceMissingFields.includes("detectedHomepagePath"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailableFields.includes("siteVersionId"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceAvailableFields.includes("importId"), true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceSourceKind, null);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.present, false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_INVALID"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_FAILED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_CHECKED"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_INVALID"), true);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED"), false);
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED"), true);
  const flat = JSON.stringify(model);
  assert.equal(flat.includes("snapshotRootDirAbs"), false);
  assert.equal(flat.includes("importProvenanceSummary"), false);
  assert.equal(flat.includes("secret"), false);
  assert.equal(flat.includes("credential"), false);
});

test("workspace overview model: adapter failure falls back to bundled snapshot with safe branch diagnostics", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "workspace-overview-persisted-adapter-failure-"));
  const snapshotsRoot = path.join(root, "snapshots");
  const betaRunsRoot = path.join(root, "beta-runs");
  await mkdir(snapshotsRoot, { recursive: true });
  await mkdir(betaRunsRoot, { recursive: true });

  const model = await buildWorkspaceOverviewModel({
    snapshotsRootDirAbs: snapshotsRoot,
    betaRunsRootDirAbs: betaRunsRoot,
    persistedRuntimeEvidenceCandidates: [
      {
        siteVersionId: "44444444-4444-4444-8444-444444444444",
        snapshotId: "imported-url-site-adapter-failure",
        snapshotRootDirAbs: path.join(root, "missing-runtime-snapshot-root"),
        importId: null,
        updatedAt: new Date().toISOString(),
        importProvenanceSummary: {
          kind: "runtime_import_provenance_summary_v1",
          siteTree: ["secret-nested-value"],
          semanticImport: "credential-nested-value",
          multipageImport: null,
          captureEvidence: 5,
          renderedCapture: false,
        } as any,
      },
      {
        siteVersionId: "55555555-5555-4555-8555-555555555555",
        snapshotId: "imported-url-site-adapter-failure-2",
        snapshotRootDirAbs: path.join(root, "missing-runtime-snapshot-root-2"),
        importId: null,
        updatedAt: new Date(Date.now() - 5000).toISOString(),
        importProvenanceSummary: {
          kind: "runtime_import_provenance_summary_v1",
          siteTree: [],
          semanticImport: "",
          multipageImport: 0,
          captureEvidence: null,
          renderedCapture: true,
        } as any,
      },
    ],
  });

  assert.equal(model.sourceKind, "bundled_stable_import_snapshot");
  assert.equal(model.importSourceDiagnostics.selectedSource, "bundled_stable_import_snapshot");
  assert.equal(model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_FAILED"), true);
  assert.equal(
    model.diagnostics.includes("WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_BRANCH_DIAGNOSTICS_CREATED"),
    true,
  );
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.present, true);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.type, "array");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.itemCount, 0);
  assert.deepEqual(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.siteTree.keys, []);
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.semanticImport.type, "string");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.multipageImport.type, "number");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.captureEvidence.type, "null");
  assert.equal(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics.renderedCapture.type, "boolean");
  assert.equal(
    model.diagnostics.filter((entry) => entry === "WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_FAILED").length,
    1,
  );
  assert.equal(
    model.diagnostics.filter((entry) => entry === "WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_INVALID").length,
    1,
  );
  const flat = JSON.stringify(model);
  assert.equal(flat.includes("secret-nested-value"), false);
  assert.equal(flat.includes("credential-nested-value"), false);
});
