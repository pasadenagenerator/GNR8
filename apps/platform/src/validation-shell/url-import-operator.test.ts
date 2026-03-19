import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { JsonValue } from "../../gnr8/import/import-contract";
import { stableStringify } from "../../gnr8/migration/runtime/diagnostics";
import { importPublicSinglePageUrlToSnapshot } from "../../gnr8/validation/runtime/url-single-page-import";

import { runBetaExportOperatorFlow } from "./beta-export-operator";
import { runUrlImportOperatorFlow, urlImportOperatorResponseStableJson } from "./url-import-operator";

type MockResponseDef = {
  status: number;
  headers?: Record<string, string>;
  body: string | Uint8Array;
};

function mockFetchFromTable(table: Record<string, MockResponseDef>): (input: string | URL | Request) => Promise<Response> {
  return async (input) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input instanceof Request ? input.url : String(input);

    const hit = table[url];
    if (!hit) {
      throw new Error(`unexpected_fetch_url:${url}`);
    }

    const body: BodyInit = typeof hit.body === "string" ? hit.body : Buffer.from(hit.body);
    return new Response(body, {
      status: hit.status,
      headers: hit.headers,
    });
  };
}

function fileSha256(absPath: string): string {
  const bytes = fs.readFileSync(absPath);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function listFilesRecursively(absRoot: string): string[] {
  const out: string[] = [];
  const stack = [absRoot];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const abs = path.resolve(current, entry.name);
      if (entry.isDirectory()) stack.push(abs);
      else if (entry.isFile()) out.push(abs);
    }
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function withEnv(input: { key: string; value?: string }, fn: () => Promise<void>): Promise<void> {
  const previous = process.env[input.key];
  if (typeof input.value === "string") process.env[input.key] = input.value;
  else delete process.env[input.key];
  return fn().finally(() => {
    if (typeof previous === "string") process.env[input.key] = previous;
    else delete process.env[input.key];
  });
}

test("url import snapshot generation remains deterministic for identical URL + response set", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-determinism-"));

  const sourceUrl = "https://Example.com/landing?b=2&a=1#section";
  const fetchImpl = mockFetchFromTable({
    "https://example.com/landing?b=2&a=1": {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: [
        "<!doctype html>",
        "<html><head>",
        "<link rel=\"stylesheet\" href=\"/styles/site.css\">",
        "</head><body>",
        "<img data-src=\"images/logo.png\" srcset=\"images/logo.png 1x, //example.com/images/logo@2x.png 2x\">",
        "<script src=\"//cdn.example.net/app.js\"></script>",
        "</body></html>",
      ].join(""),
    },
    "https://example.com/styles/site.css": {
      status: 200,
      headers: { "content-type": "text/css" },
      body: "body { color: #111; background-image:url('../images/bg.jpg'); }",
    },
    "https://example.com/images/logo.png": {
      status: 200,
      headers: { "content-type": "image/png" },
      body: new Uint8Array([137, 80, 78, 71]),
    },
    "https://example.com/images/logo@2x.png": {
      status: 200,
      headers: { "content-type": "image/png" },
      body: new Uint8Array([137, 80, 78, 71, 1]),
    },
    "https://example.com/images/bg.jpg": {
      status: 200,
      headers: { "content-type": "image/jpeg" },
      body: new Uint8Array([255, 216, 255, 224]),
    },
    "https://cdn.example.net/app.js": {
      status: 200,
      headers: { "content-type": "application/javascript" },
      body: "console.log('ok')",
    },
  });

  const a = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl,
  });

  const b = await importPublicSinglePageUrlToSnapshot({
    sourceUrl,
    snapshotRootDirAbs: tmp,
    fetchImpl,
  });

  assert.equal(a.snapshotId, b.snapshotId);
  assert.equal(a.normalizedUrl, "https://example.com/landing?b=2&a=1");

  const filesA = listFilesRecursively(a.snapshotRootDirAbs)
    .map((abs) => ({ rel: path.relative(a.snapshotRootDirAbs, abs).replaceAll(path.sep, "/"), sha: fileSha256(abs) }))
    .sort((x, y) => x.rel.localeCompare(y.rel));

  const filesB = listFilesRecursively(b.snapshotRootDirAbs)
    .map((abs) => ({ rel: path.relative(b.snapshotRootDirAbs, abs).replaceAll(path.sep, "/"), sha: fileSha256(abs) }))
    .sort((x, y) => x.rel.localeCompare(y.rel));

  assert.equal(stableStringify(filesA as unknown as JsonValue), stableStringify(filesB as unknown as JsonValue));
  assert.equal(stableStringify(a.fetchManifest as unknown as JsonValue), stableStringify(b.fetchManifest as unknown as JsonValue));
  assert.equal(stableStringify(a.importDiagnostics as unknown as JsonValue), stableStringify(b.importDiagnostics as unknown as JsonValue));
});

test("url import operator runs imported snapshot through pipeline and materialize mode", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-materialize-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://pilot.example.com/",
      executionMode: "materialize",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: mockFetchFromTable({
        "https://pilot.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            "<link rel=\"stylesheet\" href=\"/assets/styles.css\">",
            "</head><body>",
            "<main><h1>Pilot</h1></main>",
            "<img src=\"/assets/logo.svg\">",
            "</body></html>",
          ].join(""),
        },
        "https://pilot.example.com/assets/styles.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "main{padding:12px}",
        },
        "https://pilot.example.com/assets/logo.svg": {
          status: 200,
          headers: { "content-type": "image/svg+xml" },
          body: "<svg xmlns='http://www.w3.org/2000/svg'></svg>",
        },
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  assert.equal(response.sourceKind, "imported_url_snapshot");
  assert.equal(response.summary.importStatus, "success");
  assert.equal(response.summary.pipelineStatus, "success");
  assert.equal(response.executionMode, "materialize");
  assert.equal(response.result.executionResult.executionMode, "materialize");
  assert.equal(response.result.executionResult.materialization.outputRootPath, outputRootDir);
  assert.ok(response.result.executionResult.status === "executed" || response.result.executionResult.status === "executed_with_warnings");
});

test("url import hardens image/style assets and filters non-visual script/jsonld noise from exported markup", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-fidelity-noise-"));
  const outputRootDir = path.resolve(tmp, "bundle-out");

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://fidelity.example.com/",
      executionMode: "materialize",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      outputRootDir,
      fetchImpl: mockFetchFromTable({
        "https://fidelity.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            "<link rel=\"stylesheet\" href=\"/assets/site.css\">",
            "</head><body>",
            "<div id=\"hero\">",
            "<script type=\"application/ld+json\">{\"@context\":\"https://schema.org\",\"name\":\"Leak\"}</script>",
            "<script>window.dataLayer = window.dataLayer || []; gtag('config', 'G-LEAK');</script>",
            "<noscript>Google Tag Manager (noscript)</noscript>",
            "<img data-src=\"/assets/lazy-hero.jpg\" srcset=\"/assets/hero-1x.jpg 1x, //fidelity.example.com/assets/hero-2x.jpg 2x\" alt=\"Hero\">",
            "</div>",
            "</body></html>",
          ].join(""),
        },
        "https://fidelity.example.com/assets/site.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: ".hero{background-image:url('../img/bg.jpg')}",
        },
        "https://fidelity.example.com/assets/lazy-hero.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 0]),
        },
        "https://fidelity.example.com/assets/hero-1x.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 1]),
        },
        "https://fidelity.example.com/assets/hero-2x.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 2]),
        },
        "https://fidelity.example.com/assets/img/bg.jpg": {
          status: 200,
          headers: { "content-type": "image/jpeg" },
          body: new Uint8Array([255, 216, 255, 224, 3]),
        },
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  const snapshotHtml = fs.readFileSync(response.snapshot.entryHtmlPathAbs, "utf8");
  assert.ok(snapshotHtml.includes('src="/assets/image/'));
  assert.ok(snapshotHtml.includes('srcset="/assets/image/'));

  const snapshotStylesheetAbs = listFilesRecursively(response.snapshot.snapshotRootDirAbs).find((abs) =>
    abs.replaceAll(path.sep, "/").includes("/assets/stylesheet/"),
  );
  assert.ok(snapshotStylesheetAbs);
  const snapshotStylesheet = fs.readFileSync(snapshotStylesheetAbs!, "utf8");
  assert.ok(snapshotStylesheet.includes("../style_asset/"));

  const fetchManifestAttributes = response.snapshot.fetchManifest.map((entry) => entry.attribute);
  assert.ok(fetchManifestAttributes.includes("data-src"));
  assert.ok(fetchManifestAttributes.includes("srcset"));

  const exportedIndexAbs = path.resolve(outputRootDir, "index.html");
  const exportedHtml = fs.readFileSync(exportedIndexAbs, "utf8");
  assert.ok(!exportedHtml.includes("schema.org"));
  assert.ok(!exportedHtml.includes("window.dataLayer"));
  assert.ok(!exportedHtml.includes("gtag("));
  assert.ok(!exportedHtml.includes("Google Tag Manager (noscript)"));
});

test("non-fatal asset fetch issues remain visible and do not unnecessarily block", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-warnings-"));

  const response = await runUrlImportOperatorFlow(
    {
      sourceUrl: "https://warn.example.com/",
      executionMode: "simulation",
    },
    {
      snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
      fetchImpl: mockFetchFromTable({
        "https://warn.example.com/": {
          status: 200,
          headers: { "content-type": "text/html" },
          body: [
            "<!doctype html>",
            "<html><head>",
            "<link rel=\"stylesheet\" href=\"/ok.css\">",
            "</head><body>",
            "<img src=\"/missing.png\">",
            "</body></html>",
          ].join(""),
        },
        "https://warn.example.com/ok.css": {
          status: 200,
          headers: { "content-type": "text/css" },
          body: "body{font-family:sans-serif}",
        },
        "https://warn.example.com/missing.png": {
          status: 404,
          headers: { "content-type": "text/plain" },
          body: "not found",
        },
      }),
    },
  );

  assert.equal(response.ok, true);
  if (!response.ok) return;

  assert.equal(response.summary.importStatus, "success_with_warnings");
  assert.equal(response.summary.pipelineStatus, "success");
  assert.equal(response.summary.executionStatus === "executed" || response.summary.executionStatus === "executed_with_warnings", true);

  const snapshotWarningCodes = response.snapshot.importDiagnostics.issues.map((issue) => issue.code);
  assert.ok(snapshotWarningCodes.includes("ASSET_FETCH_NON_OK"));

  const importIssueCodes = response.result.importOutput.importDiagnostics.issues.map((issue) => issue.code);
  assert.ok(importIssueCodes.includes("missing_local_asset"));
});

test("existing fixture-based operator flow remains unchanged", async () => {
  const fixtureResponse = await runBetaExportOperatorFlow({
    fixtureId: "real-site-01",
    executionMode: "simulation",
  });

  assert.equal(fixtureResponse.ok, true);
  if (!fixtureResponse.ok) return;
  assert.equal(fixtureResponse.fixtureId, "real-site-01");

  const stable = urlImportOperatorResponseStableJson(
    await runUrlImportOperatorFlow(
      {
        sourceUrl: "https://minimal.example.com/",
        executionMode: "simulation",
      },
      {
        snapshotRootDirAbs: fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-url-import-min-")),
        fetchImpl: mockFetchFromTable({
          "https://minimal.example.com/": {
            status: 200,
            headers: { "content-type": "text/html" },
            body: "<!doctype html><html><body><h1>ok</h1></body></html>",
          },
        }),
      },
    ),
  );

  assert.equal(typeof stable, "string");
  assert.ok(stable.length > 10);
});

test("url import operator defaults to tmp snapshot root on Vercel runtime and works in simulation/materialize", async () => {
  await withEnv({ key: "VERCEL", value: "1" }, async () => {
    const sourceUrl = "https://vercel-mode.example.com/";
    const fetchImpl = mockFetchFromTable({
      [sourceUrl]: {
        status: 200,
        headers: { "content-type": "text/html" },
        body: "<!doctype html><html><body><h1>vercel mode</h1></body></html>",
      },
    });

    const simulation = await runUrlImportOperatorFlow(
      { sourceUrl, executionMode: "simulation" },
      {
        fetchImpl,
      },
    );
    assert.equal(simulation.ok, true);
    if (!simulation.ok) return;

    const expectedTmpPrefix = path.resolve(os.tmpdir(), "gnr8", "validation", "url-import-snapshots");
    assert.ok(simulation.snapshot.snapshotRootDirAbs.startsWith(expectedTmpPrefix));

    const materialize = await runUrlImportOperatorFlow(
      { sourceUrl, executionMode: "materialize" },
      {
        fetchImpl,
      },
    );
    assert.equal(materialize.ok, true);
    if (!materialize.ok) return;

    assert.ok(materialize.snapshot.snapshotRootDirAbs.startsWith(expectedTmpPrefix));
    assert.ok(
      materialize.result.executionResult.status === "executed" ||
        materialize.result.executionResult.status === "executed_with_warnings",
    );
  });
});
