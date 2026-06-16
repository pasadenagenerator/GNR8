import assert from "node:assert/strict";
import test from "node:test";

import { createFirstLimitedDryRunRouteHandlers } from "@/app/api/gnr8/admin/first-limited-dry-run/first-limited-dry-run-route-handlers";
import type { EvidenceCaptureBaselineArtifactRecord } from "@/gnr8/architecture/evidence-capture-baseline-artifact";
import type {
  LayoutGeometryEvidence,
  NavigationEvidence,
  SectionBoundaryEvidence,
} from "@/gnr8/architecture/evidence-capture-layout-contract";
import { buildFirstLimitedDryRunOutput } from "@/gnr8/architecture/first-limited-dry-run-builder";
import type { FirstLimitedDryRunOutput } from "@/gnr8/architecture/first-limited-dry-run-contract";
import {
  createReconstructionCandidateReviewPackage,
} from "@/gnr8/architecture/reconstruction-candidate-review-contract";
import {
  createReconstructionDryRunPackage,
  type ReconstructionDryRunPackage,
} from "@/gnr8/architecture/reconstruction-dry-run-contract";
import { createReconstructionPackageFromReview } from "@/gnr8/architecture/reconstruction-package-contract";
import type { RuntimeStoreDbClient } from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

const SITE_VERSION_ID = "site-version-first-limited-route";
const DRY_RUN_ID = "dry-run-first-limited-route";
const fakeDbClient = {} as RuntimeStoreDbClient;

const routeScope = {
  scopeType: "single_route" as const,
  routes: ["/"],
};

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
      boundingBox: { x: 0, y: 80, width: 1280, height: 640 },
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
  boundingBox: { x: 0, y: 80, width: 1280, height: 640 },
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

function dryRunPackage(input: { dryRunId?: string; siteVersionId?: string } = {}): ReconstructionDryRunPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-route",
    discoveryPackageId: "candidate-discovery-package-route",
    planningPackageId: "planning-package-route",
    siteVersionId: input.siteVersionId ?? SITE_VERSION_ID,
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
        reviewerNotes: [],
      },
    ],
    reviewedAt: "2026-06-15T10:00:00.000Z",
  });

  return createReconstructionDryRunPackage(
    createReconstructionPackageFromReview(reviewPackage, {
      reconstructionPackageId: "reconstruction-package-route",
      createdAt: "2026-06-15T10:05:00.000Z",
    }),
    {
      dryRunId: input.dryRunId ?? DRY_RUN_ID,
      createdAt: "2026-06-15T10:10:00.000Z",
    },
  );
}

function baseline(): EvidenceCaptureBaselineArtifactRecord {
  return {
    kind: "evidence_capture_baseline",
    routePath: "/",
    sourceUrl: "https://example.test/",
    captureExpansionEvidence: {
      layoutGeometryEvidence: [layoutGeometryEvidence],
      sectionBoundaryEvidence: [sectionBoundaryEvidence],
      navigationEvidence: [navigationEvidence],
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function siteVersion(summary: RuntimeImportProvenanceSummary | null): CanonicalSiteVersionSnapshot {
  return {
    id: SITE_VERSION_ID,
    siteId: "site-first-limited-route",
    versionNo: 1,
    state: "READY",
    source: "IMPORT",
    actor: "test",
    createdAt: "2026-06-15T10:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: null,
    importProvenanceSummary: summary,
    pages: [],
  } as CanonicalSiteVersionSnapshot;
}

function summaryWith(input: {
  includeBaseline?: boolean;
  includeDryRunPackage?: boolean;
} = {}): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    ...(input.includeBaseline === false ? {} : { evidenceCaptureBaselineArtifact: baseline() }),
    ...(input.includeDryRunPackage === false
      ? {}
      : { reconstructionDryRunPackages: [dryRunPackage()] }),
  } as RuntimeImportProvenanceSummary;
}

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/first-limited-dry-run", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function memoryRoute(input: {
  summary?: RuntimeImportProvenanceSummary | null;
  requireSuperadminUserId?: () => Promise<string>;
  buildOutput?: typeof buildFirstLimitedDryRunOutput;
} = {}) {
  let currentSummary = input.summary ?? summaryWith();
  let persistCalls = 0;

  const handlers = createFirstLimitedDryRunRouteHandlers({
    requireSuperadminUserId: input.requireSuperadminUserId ?? (async () => "superadmin_1"),
    withSuperadminClient: async (fn) => fn(fakeDbClient),
    getSiteVersion: async (siteVersionId) =>
      siteVersionId === SITE_VERSION_ID ? siteVersion(currentSummary) : null,
    setSiteVersionImportProvenanceSummary: async ({ importProvenanceSummary }) => {
      persistCalls += 1;
      currentSummary = importProvenanceSummary;
      return { affectedRows: 1 };
    },
    ...(input.buildOutput ? { buildFirstLimitedDryRunOutput: input.buildOutput } : {}),
  });

  return {
    handlers,
    get summary() {
      return currentSummary;
    },
    get persistCalls() {
      return persistCalls;
    },
  };
}

test("first limited dry-run route rejects unauthorized request", async () => {
  const route = memoryRoute({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });

  const response = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const body = (await response.json()) as { ok: boolean; error: string };

  assert.equal(response.status, 403);
  assert.equal(body.ok, false);
  assert.equal(body.error, "SUPERADMIN_REQUIRED");
  assert.equal(route.persistCalls, 0);
});

test("first limited dry-run route rejects missing IDs", async () => {
  const route = memoryRoute();

  const response = await route.handlers.POST(request({}));
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.deepEqual(body.diagnostics, ["SITE_VERSION_ID_REQUIRED", "DRY_RUN_ID_REQUIRED"]);
  assert.equal(route.persistCalls, 0);
});

test("first limited dry-run route rejects routeScope and force overrides", async () => {
  const route = memoryRoute();

  const response = await route.handlers.POST(
    request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID, routeScope: routeScope, force: true }),
  );
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.deepEqual(body.diagnostics, ["FORBIDDEN_REQUEST_FIELD:force", "FORBIDDEN_REQUEST_FIELD:routeScope"]);
  assert.equal(route.persistCalls, 0);
});

test("first limited dry-run route rejects missing baseline", async () => {
  const route = memoryRoute({ summary: summaryWith({ includeBaseline: false }) });

  const response = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const body = (await response.json()) as { error: string };

  assert.equal(response.status, 409);
  assert.equal(body.error, "EVIDENCE_CAPTURE_BASELINE_MISSING");
  assert.equal(route.persistCalls, 0);
});

test("first limited dry-run route rejects missing dry-run package", async () => {
  const route = memoryRoute({ summary: summaryWith({ includeDryRunPackage: false }) });

  const response = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const body = (await response.json()) as { error: string };

  assert.equal(response.status, 404);
  assert.equal(body.error, "RECONSTRUCTION_DRY_RUN_PACKAGE_NOT_FOUND");
  assert.equal(route.persistCalls, 0);
});

test("first limited dry-run route builds and persists valid output", async () => {
  const route = memoryRoute();

  const response = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const body = (await response.json()) as {
    ok: boolean;
    artifactKind: string;
    artifactRef: string;
    outputStatus: string;
    validation: { valid: boolean };
    routeModelCount: number;
    navigationModelCount: number;
    sectionModelCount: number;
    limitationsCount: number;
    blockerLimitationsCount: number;
    idempotencyResult: string;
  };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.artifactKind, "first_limited_dry_run_output");
  assert.equal(body.artifactRef.startsWith("first_limited_dry_run_output_"), true);
  assert.equal(body.outputStatus, "valid");
  assert.equal(body.validation.valid, true);
  assert.equal(body.routeModelCount, 1);
  assert.equal(body.navigationModelCount, 1);
  assert.equal(body.sectionModelCount, 1);
  assert.equal(body.limitationsCount, 0);
  assert.equal(body.blockerLimitationsCount, 0);
  assert.equal(body.idempotencyResult, "created");
  assert.equal(route.persistCalls, 1);
});

test("first limited dry-run route reuses equivalent latest artifact", async () => {
  const route = memoryRoute();

  const firstResponse = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const firstBody = (await firstResponse.json()) as { artifactRef: string; idempotencyResult: string };
  const secondResponse = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const secondBody = (await secondResponse.json()) as { artifactRef: string; idempotencyResult: string };

  assert.equal(firstBody.idempotencyResult, "created");
  assert.equal(secondResponse.status, 200);
  assert.equal(secondBody.idempotencyResult, "reused");
  assert.equal(secondBody.artifactRef, firstBody.artifactRef);
  assert.equal(route.persistCalls, 1);
});

test("first limited dry-run route does not persist invalid builder output", async () => {
  const route = memoryRoute({
    buildOutput: (packageInput, builderInput) =>
      ({
        ...buildFirstLimitedDryRunOutput(packageInput, builderInput),
        reactOutput: { component: "ForbiddenGeneratedReact" },
      }) as FirstLimitedDryRunOutput,
  });

  const response = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const body = (await response.json()) as { error: string; diagnostics: string[] };

  assert.equal(response.status, 422);
  assert.equal(body.error, "FIRST_LIMITED_DRY_RUN_OUTPUT_INVALID");
  assert.equal(
    body.diagnostics.includes("reactOutput is forbidden in first limited dry-run output"),
    true,
  );
  assert.equal(route.persistCalls, 0);
});

test("first limited dry-run route response contains metadata only", async () => {
  const route = memoryRoute();

  const response = await route.handlers.POST(request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }));
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal("routeModels" in body, false);
  assert.equal("navigationModels" in body, false);
  assert.equal("sectionModels" in body, false);
  assert.equal("limitations" in body, false);
  assert.equal("output" in body, false);
  assert.equal("generatedOutputs" in body, false);
});

test("first limited dry-run route rejects forbidden generated output request fields", async () => {
  const route = memoryRoute();

  const response = await route.handlers.POST(
    request({
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      generatedOutputs: [{ outputType: "react" }],
      reactOutput: { component: "Forbidden" },
    }),
  );
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.deepEqual(body.diagnostics, [
    "FORBIDDEN_REQUEST_FIELD:generatedOutputs",
    "FORBIDDEN_REQUEST_FIELD:reactOutput",
  ]);
  assert.equal(route.persistCalls, 0);
});
