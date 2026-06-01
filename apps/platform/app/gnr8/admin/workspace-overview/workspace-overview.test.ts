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
  assert.equal(model.diagnostics.includes("TWIN_OVERVIEW_CREATED"), true);
  assert.equal(model.overview.contentSummary.includes("pages="), true);
  assert.equal(model.overview.contentSummary.includes("deterministic_content_read_model"), false);
  assert.equal(model.overview.designSummary.includes("assets="), true);
  assert.equal(model.overview.experienceSummary.includes("homepageDetected="), true);
  assert.equal(model.overview.governanceSummary.includes("readOnly=true"), true);
  assert.equal(model.overview.operationalSummary.includes("providerState=preview/runtime-only"), true);
});

test("workspace overview model: no scoring recommendation or ai fields added", async () => {
  const model = await buildWorkspaceOverviewModel();
  const flat = JSON.stringify(model);
  assert.equal(flat.includes("scoring"), false);
  assert.equal(flat.includes("recommendations"), false);
  assert.equal(flat.includes("optimization"), false);
  assert.equal(flat.includes("aiOutput"), false);
});

test("workspace overview page source: renders required sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  assert.equal(source.includes("Website Workspace Overview"), true);
  assert.equal(source.includes("Website Operating System Runtime v0"), true);

  assert.equal(source.includes("Twin Status"), true);
  assert.equal(source.includes("Environment Scope"), true);
  assert.equal(source.includes("Site Version"), true);
  assert.equal(source.includes("Last Updated"), true);

  assert.equal(source.includes("Content"), true);
  assert.equal(source.includes("Design"), true);
  assert.equal(source.includes("Experience"), true);
  assert.equal(source.includes("Governance"), true);
  assert.equal(source.includes("Operations"), true);

  assert.equal(source.includes("Diagnostics"), true);
  assert.equal(source.includes("Import Source Diagnostics"), true);
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
  assert.equal(source.includes("persistedEvidenceBranchDiagnostics"), true);

  assert.equal(source.includes("Provider Governance Status"), true);
  assert.equal(source.includes("Execution Layer:"), true);
  assert.equal(source.includes("Blocked"), true);
  assert.equal(source.includes("Governance State:"), true);
  assert.equal(source.includes("Preview / non-executable"), true);

  assert.equal(source.includes("Read-only Workspace Runtime Preview"), true);
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
});

test("workspace overview page source: validation surfaces navigation links render", async () => {
  const source = await readFile(PAGE_FILE, "utf8");
  assert.equal(source.includes("Validation Surfaces"), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview"'), true);
  assert.equal(source.includes('href="/gnr8/admin/twin-preview-real"'), true);
  assert.equal(source.includes('href="/gnr8/admin/providers"'), true);
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
