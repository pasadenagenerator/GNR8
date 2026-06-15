import assert from "node:assert/strict";
import test from "node:test";

import {
  FIRST_LIMITED_DRY_RUN_OUTPUT_STATUSES,
  createEmptyFirstLimitedDryRunOutput,
  validateFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutput,
  type LimitedDryRunNavigationModel,
  type LimitedDryRunRouteModel,
  type LimitedDryRunSectionModel,
} from "./first-limited-dry-run-contract";
import { createReconstructionCandidateReviewPackage } from "./reconstruction-candidate-review-contract";
import {
  createReconstructionDryRunPackage,
  type ReconstructionDryRunPackage,
} from "./reconstruction-dry-run-contract";
import { createReconstructionPackageFromReview } from "./reconstruction-package-contract";

const routeScope = {
  scopeType: "single_route" as const,
  routes: ["/"],
};

function readyDryRunPackage(): ReconstructionDryRunPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-first-limited",
    discoveryPackageId: "candidate-discovery-package-first-limited",
    planningPackageId: "planning-package-first-limited",
    siteVersionId: "site-version-first-limited",
    routeScope,
    readinessLevel: "HIGH_CONFIDENCE",
    reviewStatus: "approved",
    candidateReviews: [
      {
        candidateId: "candidate-home-hero",
        candidateType: "hero",
        sourceRoute: "/",
        reviewDecision: "approved",
        confidenceLevel: "HIGH",
        limitations: [],
        evidenceRefs: ["layout-geometry-ref", "section-boundary-ref", "navigation-ref"],
        reviewerNotes: ["Candidate has enough evidence for first limited output contracts."],
      },
    ],
    reviewedAt: "2026-06-15T10:00:00.000Z",
  });

  const reconstructionPackage = createReconstructionPackageFromReview(reviewPackage, {
    reconstructionPackageId: "reconstruction-package-first-limited",
    createdAt: "2026-06-15T10:05:00.000Z",
  });

  return createReconstructionDryRunPackage(reconstructionPackage, {
    dryRunId: "dry-run-package-first-limited",
    createdAt: "2026-06-15T10:10:00.000Z",
  });
}

const routeModel: LimitedDryRunRouteModel = {
  routePath: "/",
  sourceUrl: "https://example.test/",
  sectionRefs: ["section-home-hero"],
  navigationRefs: ["navigation-primary"],
  limitationRefs: [],
  confidenceLevel: "HIGH",
};

const navigationModel: LimitedDryRunNavigationModel = {
  navigationId: "navigation-primary",
  routePath: "/",
  items: [
    {
      label: "Home",
      href: "/",
      position: 0,
      confidenceLevel: "HIGH",
      sourceEvidenceRefs: ["navigation-ref"],
    },
  ],
  confidenceLevel: "HIGH",
  sourceEvidenceRefs: ["navigation-ref"],
  limitationRefs: [],
};

const sectionModel: LimitedDryRunSectionModel = {
  sectionId: "section-home-hero",
  routePath: "/",
  regionType: "hero",
  selector: "main > section:nth-of-type(1)",
  boundingBox: {
    x: 0,
    y: 80,
    width: 1280,
    height: 640,
  },
  confidenceLevel: "HIGH",
  sourceEvidenceRefs: ["section-boundary-ref", "layout-geometry-ref"],
  limitationRefs: [],
};

test("empty first limited dry-run output creation carries IDs and route scope", () => {
  const dryRunPackage = readyDryRunPackage();

  const output = createEmptyFirstLimitedDryRunOutput(dryRunPackage);

  assert.deepEqual(output, {
    outputId: "dry-run-package-first-limited:first-limited-output",
    dryRunId: dryRunPackage.dryRunId,
    reconstructionPackageId: dryRunPackage.reconstructionPackageId,
    siteVersionId: dryRunPackage.siteVersionId,
    routeScope: dryRunPackage.routeScope,
    outputStatus: "planned",
    routeModels: [],
    navigationModels: [],
    sectionModels: [],
    limitations: dryRunPackage.limitations,
    evidenceRefs: [],
    createdAt: "2026-06-15T10:10:00.000Z",
  });
  assert.deepEqual(validateFirstLimitedDryRunOutput(output), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("allowed output statuses are limited and non-execution statuses", () => {
  assert.deepEqual(FIRST_LIMITED_DRY_RUN_OUTPUT_STATUSES, [
    "planned",
    "valid",
    "invalid",
    "blocked",
  ]);

  for (const outputStatus of FIRST_LIMITED_DRY_RUN_OUTPUT_STATUSES) {
    const result = validateFirstLimitedDryRunOutput({
      ...createEmptyFirstLimitedDryRunOutput(readyDryRunPackage()),
      outputStatus,
    });
    assert.equal(result.valid, true);
  }

  const executedResult = validateFirstLimitedDryRunOutput({
    ...createEmptyFirstLimitedDryRunOutput(readyDryRunPackage()),
    outputStatus: "completed",
  });

  assert.equal(executedResult.valid, false);
  assert.equal(
    executedResult.errors.includes(
      "outputStatus must not be executed, completed, complete, or published",
    ),
    true,
  );
});

test("route model shape validates", () => {
  const output: FirstLimitedDryRunOutput = {
    ...createEmptyFirstLimitedDryRunOutput(readyDryRunPackage()),
    outputStatus: "valid",
    routeModels: [routeModel],
  };

  assert.deepEqual(validateFirstLimitedDryRunOutput(output), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("navigation model shape validates", () => {
  const output: FirstLimitedDryRunOutput = {
    ...createEmptyFirstLimitedDryRunOutput(readyDryRunPackage()),
    outputStatus: "valid",
    navigationModels: [navigationModel],
  };

  assert.deepEqual(validateFirstLimitedDryRunOutput(output), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("section model shape validates", () => {
  const output: FirstLimitedDryRunOutput = {
    ...createEmptyFirstLimitedDryRunOutput(readyDryRunPackage()),
    outputStatus: "valid",
    sectionModels: [sectionModel],
  };

  assert.deepEqual(validateFirstLimitedDryRunOutput(output), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("forbidden output guard rejects block content design token react cms and publishing payloads", () => {
  const output = {
    ...createEmptyFirstLimitedDryRunOutput(readyDryRunPackage()),
    blockModels: [],
    contentModels: [],
    designTokenModels: [],
    reactOutput: {},
    cmsBindings: [],
    publishingArtifacts: [],
  };

  const result = validateFirstLimitedDryRunOutput(output);

  assert.equal(result.valid, false);
  assert.equal(
    result.errors.includes("blockModels is forbidden in first limited dry-run output"),
    true,
  );
  assert.equal(
    result.errors.includes("contentModels is forbidden in first limited dry-run output"),
    true,
  );
  assert.equal(
    result.errors.includes("designTokenModels is forbidden in first limited dry-run output"),
    true,
  );
  assert.equal(
    result.errors.includes("reactOutput is forbidden in first limited dry-run output"),
    true,
  );
  assert.equal(
    result.errors.includes("cmsBindings is forbidden in first limited dry-run output"),
    true,
  );
  assert.equal(
    result.errors.includes("publishingArtifacts is forbidden in first limited dry-run output"),
    true,
  );
});

test("empty builder creates no generated forbidden outputs", () => {
  const output = createEmptyFirstLimitedDryRunOutput(readyDryRunPackage());

  assert.equal("generatedOutputs" in output, false);
  assert.equal("blockModels" in output, false);
  assert.equal("contentModels" in output, false);
  assert.equal("designTokenModels" in output, false);
  assert.equal("reactOutput" in output, false);
  assert.equal("cmsBindings" in output, false);
  assert.equal("publishingArtifacts" in output, false);
  assert.deepEqual(output.routeModels, []);
  assert.deepEqual(output.navigationModels, []);
  assert.deepEqual(output.sectionModels, []);
});

test("first limited dry-run output shape is deterministic", () => {
  const dryRunPackage = readyDryRunPackage();

  const firstOutput = createEmptyFirstLimitedDryRunOutput(dryRunPackage);
  const secondOutput = createEmptyFirstLimitedDryRunOutput(dryRunPackage);

  assert.deepEqual(firstOutput, secondOutput);
  assert.deepEqual(Object.keys(firstOutput), [
    "outputId",
    "dryRunId",
    "reconstructionPackageId",
    "siteVersionId",
    "routeScope",
    "outputStatus",
    "routeModels",
    "navigationModels",
    "sectionModels",
    "limitations",
    "evidenceRefs",
    "createdAt",
  ]);
});
