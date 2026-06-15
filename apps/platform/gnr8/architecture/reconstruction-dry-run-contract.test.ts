import assert from "node:assert/strict";
import test from "node:test";

import {
  RECONSTRUCTION_DRY_RUN_BOUNDARY,
  RECONSTRUCTION_DRY_RUN_MAY_RULES,
  RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES,
  RECONSTRUCTION_DRY_RUN_STATUSES,
  RECONSTRUCTION_GENERATED_OUTPUT_TYPES,
  RECONSTRUCTION_SIMULATION_PLAN_STATUSES,
  RECONSTRUCTION_SIMULATION_STEP_TYPES,
  RECONSTRUCTION_SIMULATION_STATUSES,
  createReconstructionDryRunPackage,
  createReconstructionSimulationPlan,
  evaluateDryRunEligibility,
  validateReconstructionDryRunPackage,
  validateReconstructionSimulationPlan,
  type ReconstructionGeneratedOutput,
} from "./reconstruction-dry-run-contract";
import {
  createReconstructionPackageFromReview,
  type ReconstructionPackage,
} from "./reconstruction-package-contract";
import {
  createReconstructionCandidateReviewPackage,
  type ReconstructionCandidateReviewItem,
} from "./reconstruction-candidate-review-contract";

const routeScope = {
  scopeType: "single_route" as const,
  routes: ["/"],
};

const approvedHeroReview: ReconstructionCandidateReviewItem = {
  candidateId: "candidate-home-hero",
  candidateType: "hero",
  sourceRoute: "/",
  reviewDecision: "approved",
  confidenceLevel: "HIGH",
  limitations: [],
  evidenceRefs: ["rendered-dom-ref", "screenshot-ref"],
  reviewerNotes: ["Candidate has enough evidence for future dry-run boundary planning."],
};

function readyReconstructionPackage(): ReconstructionPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-dry-run-ready",
    discoveryPackageId: "candidate-discovery-package-dry-run-ready",
    planningPackageId: "planning-package-dry-run-ready",
    siteVersionId: "site-version-dry-run-ready",
    routeScope,
    readinessLevel: "HIGH_CONFIDENCE",
    reviewStatus: "approved",
    candidateReviews: [approvedHeroReview],
    reviewedAt: "2026-06-15T10:00:00.000Z",
  });

  return createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-dry-run-ready",
    createdAt: "2026-06-15T10:05:00.000Z",
  });
}

function notReadyReconstructionPackage(): ReconstructionPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-dry-run-not-ready",
    discoveryPackageId: "candidate-discovery-package-dry-run-not-ready",
    planningPackageId: "planning-package-dry-run-not-ready",
    siteVersionId: "site-version-dry-run-not-ready",
    routeScope,
    readinessLevel: "MINIMUM_READY",
    reviewStatus: "rejected",
    candidateReviews: [
      {
        ...approvedHeroReview,
        reviewDecision: "rejected",
      },
    ],
    reviewedAt: "2026-06-15T10:10:00.000Z",
  });

  return createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-dry-run-not-ready",
  });
}

function needsMoreEvidenceReconstructionPackage(): ReconstructionPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-dry-run-needs-evidence",
    discoveryPackageId: "candidate-discovery-package-dry-run-needs-evidence",
    planningPackageId: "planning-package-dry-run-needs-evidence",
    siteVersionId: "site-version-dry-run-needs-evidence",
    routeScope,
    readinessLevel: "MINIMUM_READY",
    reviewStatus: "needs_more_evidence",
    candidateReviews: [
      {
        ...approvedHeroReview,
        reviewDecision: "needs_more_evidence",
        limitations: ["Missing interaction evidence for dry-run planning."],
      },
    ],
  });

  return createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-dry-run-needs-evidence",
  });
}

test("ready package creates planned dry-run package", () => {
  const reconstructionPackage = readyReconstructionPackage();

  const dryRunPackage = createReconstructionDryRunPackage(reconstructionPackage, {
    dryRunId: "dry-run-package-1",
    createdAt: "2026-06-15T10:15:00.000Z",
  });

  assert.equal(dryRunPackage.kind, "reconstruction_dry_run_package_v1");
  assert.equal(dryRunPackage.contractVersion, "8A-1");
  assert.equal(dryRunPackage.dryRunId, "dry-run-package-1");
  assert.equal(
    dryRunPackage.reconstructionPackageId,
    reconstructionPackage.reconstructionPackageId,
  );
  assert.equal(dryRunPackage.siteVersionId, reconstructionPackage.siteVersionId);
  assert.deepEqual(dryRunPackage.routeScope, reconstructionPackage.routeScope);
  assert.equal(dryRunPackage.packageStatus, reconstructionPackage.packageStatus);
  assert.equal(dryRunPackage.status, "planned");
  assert.equal(dryRunPackage.simulationStatus, "pending");
  assert.deepEqual(dryRunPackage.simulationArtifacts, []);
  assert.deepEqual(dryRunPackage.generatedOutputs, []);
  assert.deepEqual(dryRunPackage.blockers, []);
  assert.equal(dryRunPackage.boundary.outputApprovalState, "informational_only");
  assert.equal(dryRunPackage.boundary.futureApprovalRequired, true);
  assert.equal(dryRunPackage.createdAt, "2026-06-15T10:15:00.000Z");
});

test("not-ready package creates blocked dry-run package with blockers", () => {
  const reconstructionPackage = notReadyReconstructionPackage();

  const dryRunPackage = createReconstructionDryRunPackage(reconstructionPackage, {
    dryRunId: "dry-run-package-blocked",
  });

  assert.equal(dryRunPackage.status, "blocked");
  assert.equal(dryRunPackage.simulationStatus, "unavailable");
  assert.equal(dryRunPackage.generatedOutputs.length, 0);
  assert.equal(dryRunPackage.simulationArtifacts.length, 0);
  assert.equal(dryRunPackage.blockers.length > 0, true);
  assert.equal(
    dryRunPackage.blockers.some((blocker) =>
      blocker.message.includes("executionReadiness is not_ready"),
    ),
    true,
  );
});

test("blocked package includes blockers explaining why", () => {
  const blockedPackage: ReconstructionPackage = {
    ...readyReconstructionPackage(),
    packageStatus: "blocked",
    executionReadiness: "not_ready",
  };

  const dryRunPackage = createReconstructionDryRunPackage(blockedPackage);

  assert.equal(dryRunPackage.status, "blocked");
  assert.equal(
    dryRunPackage.blockers.some((blocker) => blocker.blockerId.endsWith(":package-blocked")),
    true,
  );
  assert.equal(
    dryRunPackage.blockers.some((blocker) => blocker.blockerId.endsWith(":execution-not-ready")),
    true,
  );
});

test("planned package validates successfully", () => {
  const dryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage());

  const result = validateReconstructionDryRunPackage(dryRunPackage);

  assert.deepEqual(result, {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("builder never creates generated outputs", () => {
  const readyDryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage());
  const blockedDryRunPackage = createReconstructionDryRunPackage(notReadyReconstructionPackage());

  assert.deepEqual(readyDryRunPackage.generatedOutputs, []);
  assert.deepEqual(blockedDryRunPackage.generatedOutputs, []);
});

test("builder never marks simulation complete or package simulated", () => {
  const readyDryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage());
  const blockedDryRunPackage = createReconstructionDryRunPackage(notReadyReconstructionPackage());

  assert.notEqual(readyDryRunPackage.status, "simulated");
  assert.notEqual(blockedDryRunPackage.status, "simulated");
  assert.notEqual(readyDryRunPackage.simulationStatus, "complete");
  assert.notEqual(blockedDryRunPackage.simulationStatus, "complete");
});

test("validation catches malformed package", () => {
  const malformedPackage = {
    ...createReconstructionDryRunPackage(readyReconstructionPackage()),
    dryRunId: "",
    reconstructionPackageId: "",
    siteVersionId: "",
    routeScope: null,
    status: "planned",
    simulationStatus: "complete",
    generatedOutputs: [
      {
        outputId: "should-not-exist",
        outputType: "route_model",
        sourceCandidateId: "candidate-home-hero",
        sourceRoute: "/",
        evidenceRefs: [],
        description: "Malformed generated output.",
        generationState: "simulation_placeholder",
      },
    ],
  };

  const result = validateReconstructionDryRunPackage(malformedPackage);

  assert.equal(result.valid, false);
  assert.equal(result.errors.includes("dryRunId is required"), true);
  assert.equal(result.errors.includes("reconstructionPackageId is required"), true);
  assert.equal(result.errors.includes("siteVersionId is required"), true);
  assert.equal(result.errors.includes("routeScope is required"), true);
  assert.equal(
    result.errors.includes("builder-created dry-run packages must not mark simulation complete"),
    true,
  );
  assert.equal(
    result.errors.includes("generatedOutputs must be empty at dry-run package creation time"),
    true,
  );
  assert.equal(
    result.errors.includes("planned dry-run packages must not have generated outputs"),
    true,
  );
});

test("dry run status constants are stable", () => {
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_STATUSES, [
    "not_started",
    "planned",
    "simulation_ready",
    "simulated",
    "blocked",
  ]);
  assert.deepEqual(RECONSTRUCTION_SIMULATION_STATUSES, [
    "unavailable",
    "pending",
    "complete",
    "failed",
  ]);
});

test("generated output type constants are stable and represent shape only", () => {
  assert.deepEqual(RECONSTRUCTION_GENERATED_OUTPUT_TYPES, [
    "route_model",
    "section_model",
    "block_model",
    "content_model",
    "design_token_model",
    "navigation_model",
    "unknown",
  ]);

  const placeholderOutput: ReconstructionGeneratedOutput = {
    outputId: "simulated-output-shape-1",
    outputType: "route_model",
    sourceCandidateId: "candidate-home-hero",
    sourceRoute: "/",
    evidenceRefs: ["rendered-dom-ref"],
    description: "Future simulated route model output shape.",
    generationState: "simulation_placeholder",
  };

  assert.equal(placeholderOutput.outputType, "route_model");
  assert.equal(placeholderOutput.generationState, "simulation_placeholder");
});

test("validation allows no generated outputs at creation time", () => {
  const dryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage());

  const result = validateReconstructionDryRunPackage({
    ...dryRunPackage,
    generatedOutputs: [],
  });

  assert.equal(result.valid, true);
});

test("eligibility helper maps ready_for_dry_run to eligible", () => {
  const result = evaluateDryRunEligibility(readyReconstructionPackage());

  assert.deepEqual(result, {
    eligibility: "eligible",
    eligible: true,
    reason: "ready_for_dry_run",
    reconstructionPackageId: "reconstruction-package-dry-run-ready",
  });
});

test("eligibility helper maps not_ready to not eligible", () => {
  const result = evaluateDryRunEligibility(notReadyReconstructionPackage());

  assert.equal(result.eligibility, "not_eligible");
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "not_ready");
});

test("eligibility helper maps needs_more_evidence to not eligible", () => {
  const result = evaluateDryRunEligibility(needsMoreEvidenceReconstructionPackage());

  assert.equal(result.eligibility, "not_eligible");
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "needs_more_evidence");
});

test("eligibility helper maps blocked package status to not eligible", () => {
  const blockedPackage: ReconstructionPackage = {
    ...readyReconstructionPackage(),
    packageStatus: "blocked",
    executionReadiness: "not_ready",
  };

  const result = evaluateDryRunEligibility(blockedPackage);

  assert.equal(result.eligibility, "not_eligible");
  assert.equal(result.eligible, false);
  assert.equal(result.reason, "blocked");
});

test("dry run boundary rules are explicit and approval-gated", () => {
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_MAY_RULES, [
    "read_reconstruction_package",
    "read_evidence_capture_artifacts",
    "read_reconstruction_candidates",
    "read_review_decisions",
    "produce_simulation_artifacts",
  ]);
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES, [
    "publish",
    "modify_source_site",
    "modify_production_content",
    "execute_migrations",
    "create_live_websites",
    "modify_domains",
    "modify_dns",
    "write_runtime_content",
  ]);
  assert.deepEqual(RECONSTRUCTION_DRY_RUN_BOUNDARY, {
    may: [...RECONSTRUCTION_DRY_RUN_MAY_RULES],
    mustNot: [...RECONSTRUCTION_DRY_RUN_MUST_NOT_RULES],
    outputApprovalState: "informational_only",
    futureApprovalRequired: true,
  });
});

test("planned dry run creates planned simulation plan", () => {
  const dryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage(), {
    dryRunId: "dry-run-package-simulation-plan",
    createdAt: "2026-06-15T10:20:00.000Z",
  });

  const simulationPlan = createReconstructionSimulationPlan(dryRunPackage, {
    simulationPlanId: "simulation-plan-1",
  });

  assert.equal(simulationPlan.simulationPlanId, "simulation-plan-1");
  assert.equal(simulationPlan.dryRunId, dryRunPackage.dryRunId);
  assert.equal(
    simulationPlan.reconstructionPackageId,
    dryRunPackage.reconstructionPackageId,
  );
  assert.equal(simulationPlan.siteVersionId, dryRunPackage.siteVersionId);
  assert.deepEqual(simulationPlan.routeScope, dryRunPackage.routeScope);
  assert.equal(simulationPlan.planStatus, "planned");
  assert.equal(simulationPlan.plannedSteps.length, RECONSTRUCTION_SIMULATION_STEP_TYPES.length);
  assert.equal(simulationPlan.requiredInputs.length > 0, true);
  assert.equal(simulationPlan.expectedOutputs.length, simulationPlan.plannedSteps.length);
  assert.deepEqual(simulationPlan.blockers, []);
  assert.equal(simulationPlan.createdAt, dryRunPackage.createdAt);
  assert.deepEqual(validateReconstructionSimulationPlan(simulationPlan), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("blocked dry run creates blocked simulation plan", () => {
  const dryRunPackage = createReconstructionDryRunPackage(notReadyReconstructionPackage(), {
    dryRunId: "dry-run-package-blocked-simulation-plan",
  });

  const simulationPlan = createReconstructionSimulationPlan(dryRunPackage);

  assert.equal(simulationPlan.planStatus, "blocked");
  assert.deepEqual(simulationPlan.plannedSteps, []);
  assert.deepEqual(simulationPlan.expectedOutputs, []);
  assert.equal(simulationPlan.blockers.length > 0, true);
  assert.deepEqual(simulationPlan.blockers, dryRunPackage.blockers);
  assert.deepEqual(validateReconstructionSimulationPlan(simulationPlan), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("planned simulation steps are deterministic", () => {
  const dryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage(), {
    dryRunId: "dry-run-package-deterministic-simulation-plan",
  });

  const firstPlan = createReconstructionSimulationPlan(dryRunPackage);
  const secondPlan = createReconstructionSimulationPlan(dryRunPackage);

  assert.deepEqual(firstPlan, secondPlan);
  assert.deepEqual(
    firstPlan.plannedSteps.map((step) => step.stepType),
    [
      "validate_package",
      "load_evidence",
      "map_candidates",
      "plan_route_model",
      "plan_section_model",
      "plan_block_model",
      "plan_content_model",
      "plan_design_tokens",
      "plan_navigation",
      "produce_simulation_summary",
    ],
  );
  assert.deepEqual(firstPlan.plannedSteps.map((step) => step.status), [
    "planned",
    "planned",
    "planned",
    "planned",
    "planned",
    "planned",
    "planned",
    "planned",
    "planned",
    "planned",
  ]);
});

test("simulation plan validation catches missing IDs", () => {
  const dryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage());
  const simulationPlan = createReconstructionSimulationPlan(dryRunPackage);

  const result = validateReconstructionSimulationPlan({
    ...simulationPlan,
    simulationPlanId: "",
    dryRunId: "",
    reconstructionPackageId: "",
    siteVersionId: "",
    routeScope: null,
  });

  assert.equal(result.valid, false);
  assert.equal(result.errors.includes("simulationPlanId is required"), true);
  assert.equal(result.errors.includes("dryRunId is required"), true);
  assert.equal(result.errors.includes("reconstructionPackageId is required"), true);
  assert.equal(result.errors.includes("siteVersionId is required"), true);
  assert.equal(result.errors.includes("routeScope is required"), true);
});

test("simulation plan validation catches blocked plan without blockers", () => {
  const dryRunPackage = createReconstructionDryRunPackage(notReadyReconstructionPackage());
  const simulationPlan = createReconstructionSimulationPlan(dryRunPackage);

  const result = validateReconstructionSimulationPlan({
    ...simulationPlan,
    blockers: [],
  });

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.includes("blocked simulation plans must include blockers"),
    true,
  );
});

test("simulation plan builder does not produce outputs or artifacts", () => {
  const dryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage());
  const simulationPlan = createReconstructionSimulationPlan(dryRunPackage);

  assert.equal("generatedOutputs" in simulationPlan, false);
  assert.equal("simulationArtifacts" in simulationPlan, false);
  assert.equal(
    simulationPlan.expectedOutputs.every(
      (expectedOutput) => expectedOutput.outputState === "planned_descriptor",
    ),
    true,
  );
});

test("simulation plan validation rejects executed states and generated output shapes", () => {
  const dryRunPackage = createReconstructionDryRunPackage(readyReconstructionPackage());
  const simulationPlan = createReconstructionSimulationPlan(dryRunPackage);

  const result = validateReconstructionSimulationPlan({
    ...simulationPlan,
    planStatus: "completed",
    plannedSteps: [
      {
        ...simulationPlan.plannedSteps[0],
        status: "running",
        expectedOutputs: [
          {
            ...simulationPlan.plannedSteps[0].expectedOutputs[0],
            outputState: "generated",
            generationState: "simulation_placeholder",
          },
        ],
      },
    ],
  });

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.includes(
      "planStatus must not be an executed, running, completed, or simulated state",
    ),
    true,
  );
  assert.equal(
    result.errors.includes(
      "plannedSteps[0].status must not be an executed, running, completed, or simulated state",
    ),
    true,
  );
  assert.equal(
    result.errors.includes(
      "plannedSteps[0].expectedOutputs[0].outputState must be planned_descriptor",
    ),
    true,
  );
  assert.equal(
    result.errors.includes(
      "plannedSteps[0].expectedOutputs[0] must not include generationState",
    ),
    true,
  );
});

test("simulation plan status constants are stable and planning-only", () => {
  assert.deepEqual(RECONSTRUCTION_SIMULATION_PLAN_STATUSES, [
    "not_started",
    "planned",
    "blocked",
  ]);
  assert.deepEqual(RECONSTRUCTION_SIMULATION_STEP_TYPES, [
    "validate_package",
    "load_evidence",
    "map_candidates",
    "plan_route_model",
    "plan_section_model",
    "plan_block_model",
    "plan_content_model",
    "plan_design_tokens",
    "plan_navigation",
    "produce_simulation_summary",
  ]);
});
