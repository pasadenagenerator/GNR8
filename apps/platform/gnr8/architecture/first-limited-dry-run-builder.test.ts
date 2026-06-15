import assert from "node:assert/strict";
import test from "node:test";

import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type {
  LayoutGeometryEvidence,
  NavigationEvidence,
  SectionBoundaryEvidence,
} from "./evidence-capture-layout-contract";
import { buildFirstLimitedDryRunOutput } from "./first-limited-dry-run-builder";
import {
  validateFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutput,
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
    reviewPackageId: "candidate-review-package-builder",
    discoveryPackageId: "candidate-discovery-package-builder",
    planningPackageId: "planning-package-builder",
    siteVersionId: "site-version-builder",
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
    reconstructionPackageId: "reconstruction-package-builder",
    createdAt: "2026-06-15T10:05:00.000Z",
  });

  const dryRunPackage = createReconstructionDryRunPackage(reconstructionPackage, {
    dryRunId: "dry-run-package-builder",
    createdAt: "2026-06-15T10:10:00.000Z",
  });

  return {
    ...dryRunPackage,
    limitations: [
      ...dryRunPackage.limitations,
      {
        limitationId: "existing-dry-run-limitation",
        severity: "warning",
        sourceRef: "candidate-home-hero",
        message: "Existing dry-run limitation must be preserved.",
      },
    ],
  };
}

const layoutGeometryEvidence: LayoutGeometryEvidence = {
  routePath: "/",
  viewportWidth: 1280,
  viewportHeight: 800,
  documentHeight: 1600,
  regions: [
    {
      regionId: "region-home-hero",
      tagName: "section",
      role: null,
      selector: "main > section:nth-of-type(1)",
      boundingBox: {
        x: 0,
        y: 80,
        width: 1280,
        height: 640,
      },
      childCount: 3,
    },
  ],
  capturedAt: "2026-06-15T10:09:00.000Z",
};

const sectionBoundaryEvidence: SectionBoundaryEvidence = {
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
};

const navigationEvidence: NavigationEvidence = {
  routePath: "/",
  navigationItems: [
    {
      label: "Home",
      href: "/",
      position: 0,
      confidenceLevel: "HIGH",
    },
  ],
  navigationCount: 1,
  sourceEvidenceRefs: ["navigation-ref"],
};

function baseline(input: {
  sourceUrl?: string;
  layout?: LayoutGeometryEvidence[];
  sections?: SectionBoundaryEvidence[];
  navigation?: NavigationEvidence[];
} = {}): EvidenceCaptureBaselineArtifactRecord {
  return {
    routePath: "/",
    sourceUrl: input.sourceUrl ?? "https://example.test/",
    captureExpansionEvidence: {
      layoutGeometryEvidence: input.layout ?? [layoutGeometryEvidence],
      sectionBoundaryEvidence: input.sections ?? [sectionBoundaryEvidence],
      navigationEvidence: input.navigation ?? [navigationEvidence],
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function buildReadyOutput(): FirstLimitedDryRunOutput {
  return buildFirstLimitedDryRunOutput(readyDryRunPackage(), {
    evidenceCaptureBaseline: baseline(),
  });
}

test("builds route model from route scope", () => {
  const output = buildReadyOutput();

  assert.deepEqual(output.routeModels, [
    {
      routePath: "/",
      sourceUrl: "https://example.test/",
      sectionRefs: ["section-home-hero"],
      navigationRefs: ["nav:/"],
      limitationRefs: [],
      confidenceLevel: "HIGH",
    },
  ]);
});

test("builds navigation model from navigation evidence", () => {
  const output = buildReadyOutput();

  assert.deepEqual(output.navigationModels, [
    {
      navigationId: "nav:/",
      routePath: "/",
      items: [
        {
          label: "Home",
          href: "/",
          position: 0,
          confidenceLevel: "HIGH",
          sourceEvidenceRefs: ["evidence:navigation:/:item:0", "navigation-ref"],
        },
      ],
      confidenceLevel: "HIGH",
      sourceEvidenceRefs: [
        "evidence:navigation:/",
        "evidence:navigation:/:item:0",
        "navigation-ref",
      ],
      limitationRefs: [],
    },
  ]);
});

test("builds section model from section evidence without recomputing geometry", () => {
  const output = buildReadyOutput();

  assert.deepEqual(output.sectionModels, [
    {
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
      sourceEvidenceRefs: [
        "evidence:layout-geometry:/",
        "evidence:layout-geometry:/:region:region-home-hero",
        "evidence:section-boundary:/:section-home-hero",
      ],
      limitationRefs: [],
    },
  ]);
});

test("preserves evidence refs", () => {
  const output = buildReadyOutput();

  assert.equal(output.evidenceRefs.includes("evidence:capture-baseline"), true);
  assert.equal(output.evidenceRefs.includes("evidence:route:/"), true);
  assert.equal(output.evidenceRefs.includes("navigation-ref"), true);
  assert.equal(output.evidenceRefs.includes("evidence:navigation:/"), true);
  assert.equal(output.evidenceRefs.includes("evidence:section-boundary:/:section-home-hero"), true);
  assert.equal(output.evidenceRefs.includes("evidence:layout-geometry:/:region:region-home-hero"), true);
});

test("propagates limitations", () => {
  const output = buildReadyOutput();

  assert.equal(
    output.limitations.some((limitation) =>
      limitation.limitationId === "existing-dry-run-limitation" &&
      limitation.severity === "warning" &&
      limitation.sourceRef === "candidate-home-hero" &&
      limitation.message === "Existing dry-run limitation must be preserved.",
    ),
    true,
  );
});

test("missing navigation evidence creates limitation", () => {
  const output = buildFirstLimitedDryRunOutput(readyDryRunPackage(), {
    evidenceCaptureBaseline: baseline({ navigation: [] }),
  });

  assert.equal(output.outputStatus, "blocked");
  assert.equal(output.navigationModels.length, 0);
  assert.equal(
    output.limitations.some((limitation) =>
      limitation.limitationId ===
      "limited-dry-run:/:navigation:missing_navigation_evidence",
    ),
    true,
  );
  assert.deepEqual(output.routeModels[0]?.limitationRefs, [
    "limited-dry-run:/:navigation:missing_navigation_evidence",
  ]);
});

test("missing section evidence creates limitation", () => {
  const output = buildFirstLimitedDryRunOutput(readyDryRunPackage(), {
    evidenceCaptureBaseline: baseline({ sections: [] }),
  });

  assert.equal(output.outputStatus, "blocked");
  assert.equal(output.sectionModels.length, 0);
  assert.equal(
    output.limitations.some((limitation) =>
      limitation.limitationId === "limited-dry-run:/:section:missing_section_evidence",
    ),
    true,
  );
  assert.deepEqual(output.routeModels[0]?.limitationRefs, [
    "limited-dry-run:/:section:missing_section_evidence",
  ]);
});

test("route evidence mismatch creates limitation without inferred routes", () => {
  const output = buildFirstLimitedDryRunOutput(readyDryRunPackage(), {
    evidenceCaptureBaseline: baseline({
      sections: [
        sectionBoundaryEvidence,
        {
          ...sectionBoundaryEvidence,
          sectionId: "section-about-hero",
          routePath: "/about",
        },
      ],
    }),
  });

  assert.deepEqual(output.routeModels.map((model) => model.routePath), ["/"]);
  assert.equal(
    output.limitations.some((limitation) =>
      limitation.limitationId ===
      "limited-dry-run:/about:route:evidence_route_scope_mismatch",
    ),
    true,
  );
});

test("output validates", () => {
  const output = buildReadyOutput();

  assert.deepEqual(validateFirstLimitedDryRunOutput(output), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("forbidden outputs are not present", () => {
  const output = buildReadyOutput() as FirstLimitedDryRunOutput & Record<string, unknown>;

  assert.equal("generatedOutputs" in output, false);
  assert.equal("blockModels" in output, false);
  assert.equal("contentModels" in output, false);
  assert.equal("designTokenModels" in output, false);
  assert.equal("reactOutput" in output, false);
  assert.equal("cmsBindings" in output, false);
  assert.equal("publishingArtifacts" in output, false);
});

test("deterministic same input same output", () => {
  const dryRunPackage = readyDryRunPackage();
  const input = { evidenceCaptureBaseline: baseline() };

  const firstOutput = buildFirstLimitedDryRunOutput(dryRunPackage, input);
  const secondOutput = buildFirstLimitedDryRunOutput(dryRunPackage, input);

  assert.deepEqual(firstOutput, secondOutput);
});
