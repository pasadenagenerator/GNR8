import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createFirstLimitedDryRunRouteHandlers } from "@/app/api/gnr8/admin/first-limited-dry-run/first-limited-dry-run-route-handlers";
import type { EvidenceCaptureBaselineArtifactRecord } from "@/gnr8/architecture/evidence-capture-baseline-artifact";
import type {
  LayoutGeometryEvidence,
  NavigationEvidence,
  SectionBoundaryEvidence,
} from "@/gnr8/architecture/evidence-capture-layout-contract";
import type { FirstLimitedDryRunOutput } from "@/gnr8/architecture/first-limited-dry-run-contract";
import {
  loadLatestFirstLimitedDryRunOutput,
  persistFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutputProvenanceSummary,
} from "@/gnr8/architecture/first-limited-dry-run-output-persistence";
import { loadLatestFirstLimitedDryRunSurfaceProjection } from "@/gnr8/architecture/first-limited-dry-run-surface-projection";
import { createReconstructionCandidateReviewPackage } from "@/gnr8/architecture/reconstruction-candidate-review-contract";
import {
  createReconstructionDryRunPackage,
  type ReconstructionDryRunPackage,
} from "@/gnr8/architecture/reconstruction-dry-run-contract";
import { createReconstructionPackageFromReview } from "@/gnr8/architecture/reconstruction-package-contract";
import type { RuntimeStoreDbClient } from "@/gnr8/runtime/runtime-store";
import type {
  CanonicalSiteVersionSnapshot,
  RuntimeImportProvenanceSummary,
} from "@/gnr8/runtime/types";

const SITE_VERSION_ID = "site-version-first-limited-admin-verification";
const DRY_RUN_ID = "dry-run-first-limited-admin-verification";
const fakeDbClient = {} as RuntimeStoreDbClient;
const PAGE_FILE = new URL(
  "../../../../gnr8/admin/first-limited-dry-run/[siteVersionId]/page.tsx",
  import.meta.url,
);

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

function navigationEvidence(label = "Home"): NavigationEvidence {
  return {
    routePath: "/",
    navigationItems: [
      {
        label,
        href: "/",
        position: 0,
        confidenceLevel: "HIGH",
      },
    ],
    navigationCount: 1,
    sourceEvidenceRefs: ["navigation-ref"],
  };
}

function dryRunPackage(): ReconstructionDryRunPackage {
  const reviewPackage = createReconstructionCandidateReviewPackage({
    reviewPackageId: "candidate-review-package-admin-verification",
    discoveryPackageId: "candidate-discovery-package-admin-verification",
    planningPackageId: "planning-package-admin-verification",
    siteVersionId: SITE_VERSION_ID,
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
      reconstructionPackageId: "reconstruction-package-admin-verification",
      createdAt: "2026-06-15T10:05:00.000Z",
    }),
    {
      dryRunId: DRY_RUN_ID,
      createdAt: "2026-06-15T10:10:00.000Z",
    },
  );
}

function baseline(input: { navigationLabel?: string } = {}): EvidenceCaptureBaselineArtifactRecord {
  return {
    kind: "evidence_capture_baseline",
    routePath: "/",
    sourceUrl: "https://example.test/",
    captureExpansionEvidence: {
      layoutGeometryEvidence: [layoutGeometryEvidence],
      sectionBoundaryEvidence: [sectionBoundaryEvidence],
      navigationEvidence: [navigationEvidence(input.navigationLabel)],
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function provenanceSummary(input: { navigationLabel?: string } = {}): RuntimeImportProvenanceSummary {
  return {
    kind: "runtime_import_provenance_summary_v1",
    evidenceCaptureBaselineArtifact: baseline(input),
    reconstructionDryRunPackages: [dryRunPackage()],
  } as RuntimeImportProvenanceSummary;
}

function siteVersion(summary: RuntimeImportProvenanceSummary | null): CanonicalSiteVersionSnapshot {
  return {
    id: SITE_VERSION_ID,
    siteId: "site-first-limited-admin-verification",
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

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/first-limited-dry-run", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function verificationHarness(input: {
  summary?: RuntimeImportProvenanceSummary;
  requireSuperadminUserId?: () => Promise<string>;
} = {}) {
  let currentSummary = input.summary ?? provenanceSummary();
  let persistCalls = 0;
  let persistenceCounter = 0;

  const getSiteVersion = async (siteVersionId: string) =>
    siteVersionId === SITE_VERSION_ID ? siteVersion(currentSummary) : null;

  const setSiteVersionImportProvenanceSummary = async (setInput: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => {
    assert.equal(setInput.siteVersionId, SITE_VERSION_ID);
    persistCalls += 1;
    currentSummary = setInput.importProvenanceSummary;
    return { affectedRows: 1 };
  };

  const handlers = createFirstLimitedDryRunRouteHandlers({
    requireSuperadminUserId: input.requireSuperadminUserId ?? (async () => "superadmin_1"),
    withSuperadminClient: async (fn) => fn(fakeDbClient),
    getSiteVersion,
    setSiteVersionImportProvenanceSummary,
    persistFirstLimitedDryRunOutput: async (persistInput) => {
      persistenceCounter += 1;
      return persistFirstLimitedDryRunOutput({
        ...persistInput,
        options: {
          ...persistInput.options,
          persistedAt: `2026-06-16T08:${String(persistenceCounter).padStart(2, "0")}:00.000Z`,
        },
      });
    },
  });

  return {
    handlers,
    loadLatestOutput: () =>
      loadLatestFirstLimitedDryRunOutput({
        siteVersionId: SITE_VERSION_ID,
        dryRunId: DRY_RUN_ID,
        options: { getSiteVersion },
      }),
    loadProjection: () =>
      loadLatestFirstLimitedDryRunSurfaceProjection({
        siteVersionId: SITE_VERSION_ID,
        dryRunId: DRY_RUN_ID,
        options: { getSiteVersion },
      }),
    replaceEvidence(input: { navigationLabel: string }) {
      const previous = currentSummary as FirstLimitedDryRunOutputProvenanceSummary;
      currentSummary = {
        ...previous,
        evidenceCaptureBaselineArtifact: baseline(input),
      } as RuntimeImportProvenanceSummary;
    },
    get artifactCount() {
      const summary = currentSummary as FirstLimitedDryRunOutputProvenanceSummary;
      return summary.firstLimitedDryRunOutputArtifacts?.length ?? 0;
    },
    get persistCalls() {
      return persistCalls;
    },
  };
}

function assertNoForbiddenOutputFields(output: FirstLimitedDryRunOutput): void {
  const serialized = JSON.stringify(output);
  for (const forbidden of [
    "blockModel",
    "contentModel",
    "designTokenModel",
    "reactOutput",
    "cmsBindings",
    "publishingArtifact",
    "generatedOutputs",
  ]) {
    assert.equal(serialized.includes(`"${forbidden}"`), false, `unexpected output field ${forbidden}`);
  }
}

test("first limited dry-run admin flow creates persisted output and projects read-only surface", async () => {
  const harness = verificationHarness();

  const response = await harness.handlers.POST(
    request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }),
  );
  const body = (await response.json()) as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.artifactKind, "first_limited_dry_run_output");
  assert.equal(body.idempotencyResult, "created");
  assert.equal(body.routeModelCount, 1);
  assert.equal(body.navigationModelCount, 1);
  assert.equal(body.sectionModelCount, 1);
  assert.equal("routeModels" in body, false);
  assert.equal("navigationModels" in body, false);
  assert.equal("sectionModels" in body, false);
  assert.equal("output" in body, false);
  assert.equal(harness.artifactCount, 1);

  const output = await harness.loadLatestOutput();
  assert.ok(output);
  assert.equal(output.routeModels.length, 1);
  assert.equal(output.navigationModels.length, 1);
  assert.equal(output.sectionModels.length, 1);
  assertNoForbiddenOutputFields(output);

  const projection = await harness.loadProjection();
  assert.equal(projection.artifactStatus, "present");
  assert.equal(projection.validationStatus, "valid");
  assert.equal(projection.routeModelCount, 1);
  assert.equal(projection.navigationModelCount, 1);
  assert.equal(projection.sectionModelCount, 1);
  assert.equal(projection.routeModels[0]?.routePath, "/");
  assert.equal(projection.navigationModels[0]?.items[0]?.label, "Home");
  assert.equal(projection.sectionModels[0]?.sectionId, "section-home-hero");

  const pageSource = await readFile(PAGE_FILE, "utf8");
  for (const label of [
    "First Limited Dry Run",
    "Overview",
    "route model count",
    "navigation model count",
    "section model count",
    "Route Models",
    "Navigation Models",
    "Section Models",
    "Limitations",
  ]) {
    assert.equal(pageSource.includes(label), true, `missing read-only page label ${label}`);
  }
});

test("first limited dry-run admin flow reuses equivalent output and appends changed evidence output", async () => {
  const harness = verificationHarness();

  const first = await harness.handlers.POST(
    request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }),
  );
  const firstBody = (await first.json()) as { artifactRef: string; idempotencyResult: string };
  const second = await harness.handlers.POST(
    request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }),
  );
  const secondBody = (await second.json()) as { artifactRef: string; idempotencyResult: string };

  assert.equal(firstBody.idempotencyResult, "created");
  assert.equal(second.status, 200);
  assert.equal(secondBody.idempotencyResult, "reused");
  assert.equal(secondBody.artifactRef, firstBody.artifactRef);
  assert.equal(harness.artifactCount, 1);
  assert.equal(harness.persistCalls, 1);

  harness.replaceEvidence({ navigationLabel: "Start" });
  const changed = await harness.handlers.POST(
    request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }),
  );
  const changedBody = (await changed.json()) as {
    artifactRef: string;
    idempotencyResult: string;
    navigationModelCount: number;
  };

  assert.equal(changed.status, 200);
  assert.equal(changedBody.idempotencyResult, "created");
  assert.notEqual(changedBody.artifactRef, firstBody.artifactRef);
  assert.equal(changedBody.navigationModelCount, 1);
  assert.equal(harness.artifactCount, 2);
  assert.equal(harness.persistCalls, 2);
  assert.equal((await harness.loadProjection()).navigationModels[0]?.items[0]?.label, "Start");
});

test("first limited dry-run admin verification rejects unsafe access and keeps page source action-free", async () => {
  const unauthorized = verificationHarness({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });
  const unauthorizedResponse = await unauthorized.handlers.POST(
    request({ siteVersionId: SITE_VERSION_ID, dryRunId: DRY_RUN_ID }),
  );
  const unauthorizedBody = (await unauthorizedResponse.json()) as { ok: boolean; error: string };

  assert.equal(unauthorizedResponse.status, 403);
  assert.equal(unauthorizedBody.ok, false);
  assert.equal(unauthorizedBody.error, "SUPERADMIN_REQUIRED");
  assert.equal(unauthorized.persistCalls, 0);

  const forbidden = verificationHarness();
  const forbiddenResponse = await forbidden.handlers.POST(
    request({
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      force: true,
      routeScope,
      generatedOutputs: [{ outputType: "react" }],
      reactOutput: { component: "Forbidden" },
    }),
  );
  const forbiddenBody = (await forbiddenResponse.json()) as { diagnostics: string[] };

  assert.equal(forbiddenResponse.status, 400);
  assert.deepEqual(forbiddenBody.diagnostics, [
    "FORBIDDEN_REQUEST_FIELD:force",
    "FORBIDDEN_REQUEST_FIELD:generatedOutputs",
    "FORBIDDEN_REQUEST_FIELD:reactOutput",
    "FORBIDDEN_REQUEST_FIELD:routeScope",
  ]);
  assert.equal(forbidden.persistCalls, 0);

  const pageSource = await readFile(PAGE_FILE, "utf8");
  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(pageSource.includes(tag), false, `unexpected page control ${tag}`);
  }
  for (const phrase of [
    "Trigger",
    "trigger button",
    "Rebuild",
    "Approve",
    "Publish",
    "Edit",
    "AI action",
    "generatedOutputs",
    "reactOutput",
  ]) {
    assert.equal(pageSource.includes(phrase), false, `unexpected page action phrase ${phrase}`);
  }
});
