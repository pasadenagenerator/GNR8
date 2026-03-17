import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { importStaticSite } from "./import-static-site";

function fixtureDir(name: string): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, `../__fixtures__/${name}`);
}

function byRawRef(out: Awaited<ReturnType<typeof importStaticSite>>): Map<string, (typeof out)["assetRegistry"]["references"][number]> {
  return new Map(out.assetRegistry.references.map((r) => [r.rawRef, r]));
}

test("importStaticSite validates local and non-local asset references deterministically", async () => {
  const rootDir = fixtureDir("asset-validation-site");

  const out = await importStaticSite({
    rootDir,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: "index.html",
      assetsDirPath: "assets",
    },
  });

  assert.equal(out.contractVersion, "1.1.1");
  assert.equal(out.status, "ok");
  assert.deepEqual(out.importDiagnostics.summary, {
    infoCount: 0,
    warningCount: 2,
    errorCount: 3,
    fatalCount: 0,
  });

  const codes = out.importDiagnostics.issues.map((i) => i.code);
  assert.ok(codes.includes("missing_local_asset"));
  assert.ok(codes.includes("invalid_asset_reference"));
  assert.ok(codes.includes("unsupported_remote_asset"));
  assert.ok(codes.includes("unsupported_data_url_asset"));
  assert.ok(codes.includes("path_traversal_blocked"));

  const refs = byRawRef(out);

  assert.deepEqual(
    {
      referenceKind: refs.get("./assets/logo.svg")?.referenceKind,
      resolvedPath: refs.get("./assets/logo.svg")?.resolvedPath,
      existence: refs.get("./assets/logo.svg")?.existence,
      validationStatus: refs.get("./assets/logo.svg")?.validationStatus,
      assetKind: refs.get("./assets/logo.svg")?.assetKind,
    },
    {
      referenceKind: "relative_local",
      resolvedPath: "assets/logo.svg",
      existence: "exists",
      validationStatus: "ok",
      assetKind: "image",
    },
  );

  assert.deepEqual(
    {
      referenceKind: refs.get("./assets/missing.png")?.referenceKind,
      resolvedPath: refs.get("./assets/missing.png")?.resolvedPath,
      existence: refs.get("./assets/missing.png")?.existence,
      validationStatus: refs.get("./assets/missing.png")?.validationStatus,
    },
    {
      referenceKind: "relative_local",
      resolvedPath: "assets/missing.png",
      existence: "missing",
      validationStatus: "missing_local_asset",
    },
  );

  assert.deepEqual(
    {
      referenceKind: refs.get("https://example.com/remote.png")?.referenceKind,
      resolvedPath: refs.get("https://example.com/remote.png")?.resolvedPath,
      existence: refs.get("https://example.com/remote.png")?.existence,
      validationStatus: refs.get("https://example.com/remote.png")?.validationStatus,
    },
    {
      referenceKind: "absolute_url",
      resolvedPath: null,
      existence: "unknown",
      validationStatus: "unsupported_remote_asset",
    },
  );

  assert.deepEqual(
    {
      referenceKind: refs.get("data:image/png;base64,AAAA")?.referenceKind,
      resolvedPath: refs.get("data:image/png;base64,AAAA")?.resolvedPath,
      existence: refs.get("data:image/png;base64,AAAA")?.existence,
      validationStatus: refs.get("data:image/png;base64,AAAA")?.validationStatus,
    },
    {
      referenceKind: "data_url",
      resolvedPath: null,
      existence: "unknown",
      validationStatus: "unsupported_data_url_asset",
    },
  );

  assert.deepEqual(
    {
      referenceKind: refs.get("")?.referenceKind,
      resolvedPath: refs.get("")?.resolvedPath,
      existence: refs.get("")?.existence,
      validationStatus: refs.get("")?.validationStatus,
    },
    {
      referenceKind: "empty_invalid",
      resolvedPath: null,
      existence: "unknown",
      validationStatus: "invalid_asset_reference",
    },
  );

  assert.deepEqual(
    {
      referenceKind: refs.get("../traversal.js")?.referenceKind,
      resolvedPath: refs.get("../traversal.js")?.resolvedPath,
      existence: refs.get("../traversal.js")?.existence,
      validationStatus: refs.get("../traversal.js")?.validationStatus,
    },
    {
      referenceKind: "relative_local",
      resolvedPath: null,
      existence: "unknown",
      validationStatus: "path_traversal_blocked",
    },
  );

  assert.deepEqual(
    {
      tag: refs.get("/assets/styles.css")?.tag,
      assetKind: refs.get("/assets/styles.css")?.assetKind,
      referenceKind: refs.get("/assets/styles.css")?.referenceKind,
      resolvedPath: refs.get("/assets/styles.css")?.resolvedPath,
      existence: refs.get("/assets/styles.css")?.existence,
      validationStatus: refs.get("/assets/styles.css")?.validationStatus,
    },
    {
      tag: "link",
      assetKind: "stylesheet",
      referenceKind: "root_relative",
      resolvedPath: "assets/styles.css",
      existence: "exists",
      validationStatus: "ok",
    },
  );
});

test("importStaticSite handles edge-case local path forms deterministically", async () => {
  const rootDir = fixtureDir("asset-validation-edge");

  const out = await importStaticSite({
    rootDir,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: "index.html",
      assetsDirPath: "assets",
    },
  });

  assert.equal(out.contractVersion, "1.1.1");
  assert.equal(out.status, "ok");
  assert.ok(out.importDiagnostics.issues.some((i) => i.code === "invalid_asset_reference"));

  const refs = byRawRef(out);

  assert.deepEqual(
    {
      rawRef: refs.get("assets\\\\logo.svg")?.rawRef,
      resolvedPath: refs.get("assets\\\\logo.svg")?.resolvedPath,
      existence: refs.get("assets\\\\logo.svg")?.existence,
      validationStatus: refs.get("assets\\\\logo.svg")?.validationStatus,
    },
    {
      rawRef: "assets\\\\logo.svg",
      resolvedPath: "assets/logo.svg",
      existence: "exists",
      validationStatus: "ok",
    },
  );

  assert.deepEqual(
    {
      rawRef: refs.get("  ./assets/app.js  ")?.rawRef,
      resolvedPath: refs.get("  ./assets/app.js  ")?.resolvedPath,
      existence: refs.get("  ./assets/app.js  ")?.existence,
      validationStatus: refs.get("  ./assets/app.js  ")?.validationStatus,
    },
    {
      rawRef: "  ./assets/app.js  ",
      resolvedPath: "assets/app.js",
      existence: "exists",
      validationStatus: "ok",
    },
  );

  assert.deepEqual(
    {
      rawRef: refs.get("assets/styles.css?ver=1")?.rawRef,
      referenceKind: refs.get("assets/styles.css?ver=1")?.referenceKind,
      resolvedPath: refs.get("assets/styles.css?ver=1")?.resolvedPath,
      existence: refs.get("assets/styles.css?ver=1")?.existence,
      validationStatus: refs.get("assets/styles.css?ver=1")?.validationStatus,
    },
    {
      rawRef: "assets/styles.css?ver=1",
      referenceKind: "relative_local",
      resolvedPath: null,
      existence: "unknown",
      validationStatus: "invalid_asset_reference",
    },
  );
});
