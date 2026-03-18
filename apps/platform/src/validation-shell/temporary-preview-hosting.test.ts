import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import { GET as getPreviewByOutput } from "../../app/validation/previews/by-output/[previewKey]/[[...previewPath]]/route";
import { runBetaExportOperatorFlow } from "./beta-export-operator";

async function rmIfExists(absPath: string | null | undefined): Promise<void> {
  if (!absPath) return;
  await fs.rm(absPath, { recursive: true, force: true });
}

test("materialized runs surface structured preview URLs", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "materialize",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const outputRoot = response.result.executionResult.materialization.outputRootPath;
  const preview = response.result.executionResult.previewHosting;

  assert.equal(preview.available, true);
  assert.equal(preview.status, "available");
  assert.ok(preview.previewKey);
  assert.ok(preview.previewRootUrl?.includes("/validation/previews/by-output/"));
  assert.ok(preview.previewEntryUrl?.endsWith("/index.html"));

  await rmIfExists(outputRoot);
});

test("repeated materialized runs keep deterministic preview URL mapping", async () => {
  const a = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "materialize",
  });
  const b = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "materialize",
  });

  assert.equal(a.ok, true);
  assert.equal(b.ok, true);
  if (!a.ok || !b.ok) return;

  assert.equal(a.result.executionResult.previewHosting.previewRootUrl, b.result.executionResult.previewHosting.previewRootUrl);
  assert.equal(a.result.executionResult.previewHosting.previewEntryUrl, b.result.executionResult.previewHosting.previewEntryUrl);

  await rmIfExists(a.result.executionResult.materialization.outputRootPath);
});

test("preview route serves exported html and copied assets", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "materialize",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const result = response.result.executionResult;
  const previewKey = result.previewHosting.previewKey;
  assert.ok(previewKey);

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

  await rmIfExists(result.materialization.outputRootPath);
});

test("missing preview bundles fail gracefully with structured not-found payload", async () => {
  const response = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "materialize",
  });

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const result = response.result.executionResult;
  const previewKey = result.previewHosting.previewKey;
  assert.ok(previewKey);

  await rmIfExists(result.materialization.outputRootPath);

  const notFound = await getPreviewByOutput(new Request("http://localhost/preview"), {
    params: Promise.resolve({ previewKey: previewKey!, previewPath: undefined }),
  });
  assert.equal(notFound.status, 404);
  const body = (await notFound.json()) as { kind: string; code: string };
  assert.equal(body.kind, "temporary_preview_not_found_v1");
  assert.equal(body.code, "MISSING_BUNDLE_ROOT");
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
  assert.equal(response.result.executionResult.previewHosting.status, "available");
  assert.ok(response.result.executionResult.previewHosting.previewEntryUrl);

  const previewKey = response.result.executionResult.previewHosting.previewKey;
  assert.ok(previewKey);
  const htmlRes = await getPreviewByOutput(new Request("http://localhost/preview"), {
    params: Promise.resolve({ previewKey: previewKey!, previewPath: undefined }),
  });
  assert.equal(htmlRes.status, 200);

  await rmIfExists(response.result.executionResult.materialization.outputRootPath);
});
