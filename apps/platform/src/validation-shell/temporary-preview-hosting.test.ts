import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createImportManifest } from "../../gnr8/import/import-manifest";
import { importStaticSite } from "../../gnr8/import/runtime/import-static-site";
import { runLinearMigrationPhase1ApproveExecute } from "../../gnr8/migration/runtime/run-linear-migration-phase1-approve-execute";
import { GET as getPreviewByOutput } from "../../app/validation/previews/by-output/[previewKey]/[[...previewPath]]/route";
import { runBetaExportOperatorFlow } from "./beta-export-operator";

async function rmIfExists(absPath: string | null | undefined): Promise<void> {
  if (!absPath) return;
  await fs.rm(absPath, { recursive: true, force: true });
}

async function withEnv(entries: Record<string, string | undefined>, fn: () => Promise<void>): Promise<void> {
  const previous = new Map<string, string | undefined>();
  for (const [k, v] of Object.entries(entries)) {
    previous.set(k, process.env[k]);
    if (typeof v === "string") process.env[k] = v;
    else delete process.env[k];
  }

  try {
    await fn();
  } finally {
    for (const [k, v] of previous.entries()) {
      if (typeof v === "string") process.env[k] = v;
      else delete process.env[k];
    }
  }
}

test("materialized runs surface structured preview URLs and storage metadata", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "materialize",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const outputRoot = response.result.executionResult.materialization.outputRootPath;
  const preview = response.result.executionResult.previewHosting;

  assert.equal(preview.available, true);
  assert.ok(["available", "available_local_fallback"].includes(preview.status));
  assert.ok(preview.previewKey);
  assert.ok(preview.previewRootUrl?.includes("/validation/previews/by-output/"));
  assert.ok(preview.previewEntryUrl?.endsWith("/index.html"));
  assert.equal(preview.previewStorageKind, "local_filesystem_bundle");
  assert.ok(preview.previewStorageKey?.includes(".gnr8-static-output"));

  await rmIfExists(outputRoot);
});

test("persistent preview metadata is emitted when persistent object storage is configured", async () => {
  const persistentRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-preview-persistent-meta-"));

  await withEnv(
    {
      GNR8_PREVIEW_PERSISTENT_FS_ROOT: persistentRoot,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    },
    async () => {
      const response = await runBetaExportOperatorFlow({
        fixtureId: "real-site-01",
        executionMode: "materialize",
      });

      assert.equal(response.ok, true);
      if (!response.ok) return;

      const preview = response.result.executionResult.previewHosting;
      assert.equal(preview.available, true);
      assert.equal(preview.status, "available");
      assert.equal(preview.previewStorageKind, "filesystem_object_storage");
      assert.ok(preview.previewStorageKey?.startsWith("phase1-materialized-previews/v1/"));
      assert.ok(preview.previewKey?.startsWith("pf1."));

      await rmIfExists(response.result.executionResult.materialization.outputRootPath);
    },
  );

  await rmIfExists(persistentRoot);
});

test("repeated materialized runs keep deterministic persistent preview storage mapping", async () => {
  const persistentRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-preview-persistent-deterministic-"));

  await withEnv(
    {
      GNR8_PREVIEW_PERSISTENT_FS_ROOT: persistentRoot,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    },
    async () => {
      const a = await runBetaExportOperatorFlow({ fixtureId: "real-site-01", executionMode: "materialize" });
      const b = await runBetaExportOperatorFlow({ fixtureId: "real-site-01", executionMode: "materialize" });

      assert.equal(a.ok, true);
      assert.equal(b.ok, true);
      if (!a.ok || !b.ok) return;

      assert.equal(a.result.executionResult.previewHosting.previewStorageKind, "filesystem_object_storage");
      assert.equal(a.result.executionResult.previewHosting.previewStorageKey, b.result.executionResult.previewHosting.previewStorageKey);
      assert.equal(a.result.executionResult.previewHosting.previewRootUrl, b.result.executionResult.previewHosting.previewRootUrl);
      assert.equal(a.result.executionResult.previewHosting.previewEntryUrl, b.result.executionResult.previewHosting.previewEntryUrl);

      await rmIfExists(a.result.executionResult.materialization.outputRootPath);
      await rmIfExists(b.result.executionResult.materialization.outputRootPath);
    },
  );

  await rmIfExists(persistentRoot);
});

test("preview route serves exported html and copied assets from persistent storage after local bundle removal", async () => {
  const persistentRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-preview-persistent-serve-"));

  await withEnv(
    {
      GNR8_PREVIEW_PERSISTENT_FS_ROOT: persistentRoot,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    },
    async () => {
      const response = await runBetaExportOperatorFlow({ fixtureId: "real-site-01", executionMode: "materialize" });
      assert.equal(response.ok, true);
      if (!response.ok) return;

      const result = response.result.executionResult;
      const previewKey = result.previewHosting.previewKey;
      assert.ok(previewKey);
      assert.equal(result.previewHosting.previewStorageKind, "filesystem_object_storage");

      await rmIfExists(result.materialization.outputRootPath);

      const htmlRes = await getPreviewByOutput(new Request("http://localhost/preview"), {
        params: Promise.resolve({ previewKey: previewKey!, previewPath: undefined }),
      });
      assert.equal(htmlRes.status, 200);
      const html = await htmlRes.text();
      assert.ok(html.includes("<html"));

      const copiedAsset = result.materialization.assetFiles.find((asset) => asset.writeStatus === "copied" && asset.outputPath);
      assert.ok(copiedAsset?.outputPath);
      const assetRes = await getPreviewByOutput(new Request("http://localhost/preview"), {
        params: Promise.resolve({ previewKey: previewKey!, previewPath: copiedAsset!.outputPath!.split("/") }),
      });
      assert.equal(assetRes.status, 200);
      const assetBytes = await assetRes.arrayBuffer();
      assert.ok(assetBytes.byteLength > 0);
    },
  );

  await rmIfExists(persistentRoot);
});

test("missing persistent preview bundles fail gracefully with structured not-found payload", async () => {
  const persistentRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-preview-persistent-missing-root-"));

  await withEnv(
    {
      GNR8_PREVIEW_PERSISTENT_FS_ROOT: persistentRoot,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      NEXT_PUBLIC_SUPABASE_URL: undefined,
    },
    async () => {
      const response = await runBetaExportOperatorFlow({ fixtureId: "real-site-01", executionMode: "materialize" });
      assert.equal(response.ok, true);
      if (!response.ok) return;

      const result = response.result.executionResult;
      const previewKey = result.previewHosting.previewKey;
      const storageKey = result.previewHosting.previewStorageKey;
      assert.ok(previewKey);
      assert.ok(storageKey);

      await rmIfExists(path.resolve(persistentRoot, storageKey!));
      await rmIfExists(result.materialization.outputRootPath);

      const notFound = await getPreviewByOutput(new Request("http://localhost/preview"), {
        params: Promise.resolve({ previewKey: previewKey!, previewPath: undefined }),
      });
      assert.equal(notFound.status, 404);
      const body = (await notFound.json()) as { kind: string; code: string };
      assert.equal(body.kind, "temporary_preview_not_found_v1");
      assert.equal(body.code, "MISSING_BUNDLE_ROOT");
    },
  );

  await rmIfExists(persistentRoot);
});

test("missing exported files fail gracefully with structured not-found payload", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "materialize",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const result = response.result.executionResult;
  const previewKey = result.previewHosting.previewKey;
  assert.ok(previewKey);

  const notFound = await getPreviewByOutput(new Request("http://localhost/preview"), {
    params: Promise.resolve({ previewKey: previewKey!, previewPath: ["missing-preview-file.html"] }),
  });
  assert.equal(notFound.status, 404);
  const body = (await notFound.json()) as { kind: string; code: string };
  assert.equal(body.kind, "temporary_preview_not_found_v1");
  assert.equal(body.code, "MISSING_EXPORTED_FILE");

  await rmIfExists(result.materialization.outputRootPath);
});

test("warning-mode fixture exports remain previewable when materialized", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-03",
    executionMode: "materialize",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  assert.equal(response.result.approvalPackage.eligibility.status, "approvable_with_warnings");
  assert.equal(response.result.executionResult.previewHosting.available, true);
  assert.ok(["available", "available_local_fallback"].includes(response.result.executionResult.previewHosting.status));
  assert.ok(response.result.executionResult.previewHosting.previewEntryUrl);

  const previewKey = response.result.executionResult.previewHosting.previewKey;
  assert.ok(previewKey);
  const htmlRes = await getPreviewByOutput(new Request("http://localhost/preview"), {
    params: Promise.resolve({ previewKey: previewKey!, previewPath: undefined }),
  });
  assert.equal(htmlRes.status, 200);

  await rmIfExists(response.result.executionResult.materialization.outputRootPath);
});

test("simulation runs remain structured and unavailable for preview", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "simulation",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const preview = response.result.executionResult.previewHosting;
  assert.equal(preview.available, false);
  assert.equal(preview.status, "not_available_simulation_mode");
  assert.equal(preview.previewStorageKind, "none");
  assert.equal(preview.previewStorageKey, null);
});

test("blocked materialize runs remain structured and unavailable for preview", async () => {
  const rootDir = path.resolve(process.cwd(), "apps/platform/gnr8/import/__fixtures__/simple-site");
  const importOutput = await importStaticSite({
    rootDir,
    requestId: "preview-blocked-materialize",
    source: { kind: "single-entry-html", entryHtmlPath: "missing.html", assetsDirPath: "assets" },
  });

  const outputRootDir = path.resolve(await fs.mkdtemp(path.join(os.tmpdir(), "gnr8-preview-blocked-materialize-")), "bundle");
  const result = await runLinearMigrationPhase1ApproveExecute(
    { importOutput, importManifest: createImportManifest(importOutput) },
    { executionMode: "materialize", importRootDir: rootDir, outputRootDir },
  );

  assert.equal(result.executionResult.status, "blocked");
  assert.equal(result.executionResult.previewHosting.available, false);
  assert.equal(result.executionResult.previewHosting.status, "not_available_materialization_not_ready");
  assert.equal(result.executionResult.previewHosting.previewStorageKind, "none");
  assert.equal(result.executionResult.previewHosting.previewStorageKey, null);

  await rmIfExists(outputRootDir);
});
