import assert from "node:assert/strict";
import test from "node:test";

import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import type { FirstLimitedDryRunOutput } from "./first-limited-dry-run-contract";
import {
  FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND,
  type FirstLimitedDryRunOutputArtifactRecord,
  type FirstLimitedDryRunOutputProvenanceSummary,
} from "./first-limited-dry-run-output-persistence";
import {
  loadLatestFirstLimitedDryRunSurfaceProjection,
  projectFirstLimitedDryRunSurface,
} from "./first-limited-dry-run-surface-projection";

const SITE_VERSION_ID = "site-version-surface";
const DRY_RUN_ID = "dry-run-surface";

function validOutput(input: Partial<FirstLimitedDryRunOutput> = {}): FirstLimitedDryRunOutput {
  return {
    outputId: "output-surface",
    dryRunId: DRY_RUN_ID,
    reconstructionPackageId: "package-surface",
    siteVersionId: SITE_VERSION_ID,
    routeScope: {
      scopeType: "single_route",
      routes: ["/"],
    },
    outputStatus: "valid",
    routeModels: [
      {
        routePath: "/",
        sourceUrl: "https://example.test/",
        sectionRefs: ["section-home-hero"],
        navigationRefs: ["nav:/"],
        limitationRefs: ["limitation-warning"],
        confidenceLevel: "HIGH",
      },
    ],
    navigationModels: [
      {
        navigationId: "nav:/",
        routePath: "/",
        items: [
          {
            label: "Home",
            href: "/",
            position: 0,
            confidenceLevel: "HIGH",
            sourceEvidenceRefs: ["navigation-evidence-home"],
          },
        ],
        confidenceLevel: "HIGH",
        sourceEvidenceRefs: ["navigation-evidence-home"],
        limitationRefs: [],
      },
    ],
    sectionModels: [
      {
        sectionId: "section-home-hero",
        routePath: "/",
        regionType: "hero",
        selector: "main > section:nth-of-type(1)",
        boundingBox: {
          x: 0,
          y: 80,
          width: 1200,
          height: 520,
        },
        confidenceLevel: "HIGH",
        sourceEvidenceRefs: ["section-boundary-home-hero"],
        limitationRefs: ["limitation-warning"],
      },
    ],
    limitations: [
      {
        limitationId: "limitation-warning",
        severity: "warning",
        sourceRef: "section-home-hero",
        message: "Example limitation.",
      },
    ],
    evidenceRefs: ["navigation-evidence-home", "section-boundary-home-hero"],
    createdAt: "2026-06-16T08:00:00.000Z",
    ...input,
  };
}

function artifact(input: {
  output?: unknown;
  artifactId?: string;
  persistedAt?: string;
  validationValid?: boolean;
} = {}): FirstLimitedDryRunOutputArtifactRecord {
  const output = input.output ?? validOutput();
  const outputId = typeof output === "object" && output !== null && "outputId" in output
    ? String(output.outputId)
    : "output-surface";
  return {
    kind: FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: input.artifactId ?? "first_limited_dry_run_output_surface",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    outputId,
    outputCreatedAt: "2026-06-16T08:00:00.000Z",
    persistedAt: input.persistedAt ?? "2026-06-16T08:05:00.000Z",
    output: output as FirstLimitedDryRunOutput,
    validation: {
      valid: input.validationValid ?? true,
      errors: input.validationValid === false ? ["persisted invalid"] : [],
      warnings: [],
    },
    diagnostics: ["FIRST_LIMITED_DRY_RUN_OUTPUT_VALIDATION_PASSED"],
  };
}

test("surface projection parses persisted output safely", () => {
  const projection = projectFirstLimitedDryRunSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact(),
  });

  assert.equal(projection.artifactRef, "first_limited_dry_run_output_surface");
  assert.equal(projection.artifactKind, FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND);
  assert.equal(projection.dryRunId, DRY_RUN_ID);
  assert.equal(projection.siteVersionId, SITE_VERSION_ID);
  assert.equal(projection.outputStatus, "valid");
  assert.equal(projection.validationStatus, "valid");
  assert.equal(projection.routeModelCount, 1);
  assert.equal(projection.navigationModelCount, 1);
  assert.equal(projection.sectionModelCount, 1);
  assert.equal(projection.limitationsCount, 1);
  assert.equal(projection.blockerLimitationsCount, 0);
  assert.equal(projection.createdAt, "2026-06-16T08:00:00.000Z");
  assert.equal(projection.routeModels[0]?.routePath, "/");
});

test("surface projection represents invalid latest output without throwing", () => {
  const projection = projectFirstLimitedDryRunSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact({
      output: {
        outputId: "output-invalid",
        dryRunId: DRY_RUN_ID,
        siteVersionId: SITE_VERSION_ID,
        outputStatus: "published",
      },
      validationValid: false,
    }),
  });

  assert.equal(projection.artifactStatus, "invalid");
  assert.equal(projection.validationStatus, "invalid");
  assert.equal(projection.outputStatus, "unknown");
  assert.equal(projection.routeModelCount, 0);
  assert.equal(projection.diagnostics.some((entry) => entry.includes("outputStatus")), true);
});

test("surface projection marks blocked latest output", () => {
  const projection = projectFirstLimitedDryRunSurface({
    siteVersionId: SITE_VERSION_ID,
    artifact: artifact({
      output: validOutput({
        outputStatus: "blocked",
        limitations: [
          {
            limitationId: "limitation-blocker",
            severity: "blocker",
            sourceRef: "section-home-hero",
            message: "Blocker limitation.",
          },
        ],
      }),
    }),
  });

  assert.equal(projection.artifactStatus, "blocked");
  assert.equal(projection.blockerLimitationsCount, 1);
});

test("latest surface projection returns empty state when no output exists", async () => {
  const projection = await loadLatestFirstLimitedDryRunSurfaceProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      getSiteVersion: async () => ({
        importProvenanceSummary: {
          kind: "runtime_import_provenance_summary_v1",
        } as RuntimeImportProvenanceSummary,
      }),
    },
  });

  assert.equal(projection.artifactStatus, "missing");
  assert.equal(projection.validationStatus, "missing");
  assert.equal(projection.diagnostics.includes("FIRST_LIMITED_DRY_RUN_OUTPUT_MISSING"), true);
});

test("latest surface projection selects latest persisted artifact by timestamp", async () => {
  const older = artifact({
    artifactId: "first_limited_dry_run_output_older",
    persistedAt: "2026-06-16T08:00:00.000Z",
    output: validOutput({ outputId: "output-older" }),
  });
  const newer = artifact({
    artifactId: "first_limited_dry_run_output_newer",
    persistedAt: "2026-06-16T08:10:00.000Z",
    output: validOutput({ outputId: "output-newer" }),
  });
  const summary: FirstLimitedDryRunOutputProvenanceSummary = {
    kind: "runtime_import_provenance_summary_v1",
    firstLimitedDryRunOutputArtifacts: [older, newer],
    latestFirstLimitedDryRunOutputArtifact: older,
  } as FirstLimitedDryRunOutputProvenanceSummary;

  const projection = await loadLatestFirstLimitedDryRunSurfaceProjection({
    siteVersionId: SITE_VERSION_ID,
    options: {
      getSiteVersion: async () => ({ importProvenanceSummary: summary }),
    },
  });

  assert.equal(projection.artifactRef, "first_limited_dry_run_output_newer");
  assert.equal(projection.outputId, "output-newer");
});
