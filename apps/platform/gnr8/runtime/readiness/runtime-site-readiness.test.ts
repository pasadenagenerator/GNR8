import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeSiteReadinessReport } from "@/gnr8/runtime/readiness/runtime-site-readiness";
import type { RuntimeSiteResolutionBinding } from "@/gnr8/runtime/runtime-store";

function buildBinding(input?: Partial<RuntimeSiteResolutionBinding>): RuntimeSiteResolutionBinding {
  return {
    siteId: "site_1",
    canonicalSlug: "maver",
    activeSiteVersionId: "sv_active_1",
    latestImportedSiteVersionId: "sv_latest_1",
    publishedSiteVersionId: "sv_published_1",
    previewSiteVersionId: "sv_preview_1",
    candidateSiteVersions: [
      {
        siteVersionId: "sv_latest_1",
        versionNo: 1,
        state: "READY",
        createdAt: "2026-05-12T00:00:00.000Z",
        artifactId: "artifact_1",
      },
    ],
    ...input,
  };
}

test("runtime site readiness: ready", () => {
  const report = createRuntimeSiteReadinessReport(buildBinding());
  assert.equal(report.readinessStatus, "ready");
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.candidateCount, 1);
});

test("runtime site readiness: ready_with_warnings", () => {
  const report = createRuntimeSiteReadinessReport(
    buildBinding({
      activeSiteVersionId: null,
      publishedSiteVersionId: undefined,
    }),
  );
  assert.equal(report.readinessStatus, "ready_with_warnings");
  assert.deepEqual(report.warnings, ["missing_active_site_version_pointer", "missing_published_site_version"]);
  assert.deepEqual(report.blockers, []);
});

test("runtime site readiness: blocked when no candidates", () => {
  const report = createRuntimeSiteReadinessReport(
    buildBinding({
      candidateSiteVersions: [],
      latestImportedSiteVersionId: null,
    }),
  );
  assert.equal(report.readinessStatus, "blocked");
  assert.deepEqual(report.blockers, ["no_site_version_candidates", "missing_latest_imported_site_version"]);
});

test("runtime site readiness: blocked when latest imported is missing", () => {
  const report = createRuntimeSiteReadinessReport(
    buildBinding({
      latestImportedSiteVersionId: null,
    }),
  );
  assert.equal(report.readinessStatus, "blocked");
  assert.deepEqual(report.blockers, ["missing_latest_imported_site_version"]);
});

test("runtime site readiness: stable correlation key", () => {
  const a = createRuntimeSiteReadinessReport(
    buildBinding({
      publishedSiteVersionId: undefined,
      previewSiteVersionId: undefined,
      candidateSiteVersions: [
        {
          siteVersionId: "sv_latest_1",
          versionNo: 1,
          state: "READY",
          createdAt: "2026-05-12T00:00:00.000Z",
          artifactId: null,
        },
      ],
    }),
  );
  const b = createRuntimeSiteReadinessReport(
    buildBinding({
      publishedSiteVersionId: undefined,
      previewSiteVersionId: undefined,
      candidateSiteVersions: [
        {
          siteVersionId: "sv_latest_1",
          versionNo: 1,
          state: "READY",
          createdAt: "2026-05-12T00:00:00.000Z",
          artifactId: null,
        },
      ],
    }),
  );
  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});
