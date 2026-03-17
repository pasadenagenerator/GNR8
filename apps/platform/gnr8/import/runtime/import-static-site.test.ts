import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { importStaticSite } from "./import-static-site";

function fixtureDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../__fixtures__/simple-site");
}

test("importStaticSite imports single entry HTML deterministically", async () => {
  const rootDir = fixtureDir();

  const out = await importStaticSite({
    rootDir,
    requestId: "req-123",
    source: {
      kind: "single-entry-html",
      entryHtmlPath: "index.html",
      assetsDirPath: "assets",
    },
  });

  assert.equal(out.contractVersion, "1.1.1");
  assert.equal(out.status, "ok");
  assert.equal(out.documentMeta.execution.requestId, "req-123");
  assert.deepEqual(out.importDiagnostics.summary, {
    infoCount: 0,
    warningCount: 0,
    errorCount: 0,
    fatalCount: 0,
  });
  assert.equal(out.importDiagnostics.issues.length, 0);

  assert.equal(out.rawDomSnapshot.documents.length, 1);
  const doc = out.rawDomSnapshot.documents[0];
  assert.equal(doc.path, "index.html");
  assert.equal(doc.decoding.encoding, "utf-8");
  assert.equal(typeof doc.text, "string");
  assert.ok(doc.dom);
  assert.equal(typeof doc.dom.serializedDom, "string");
  assert.ok(doc.dom.serializedDom.includes("<html"));
  assert.ok(doc.dom.nodeCount > 0);
  assert.ok(Array.isArray(doc.dom.parseWarnings));

  assert.equal(out.assetRegistry.assetsDirPath, "assets");
  assert.equal(out.assetRegistry.files.length, 3);
  assert.deepEqual(
    out.assetRegistry.files.map((f) => f.path),
    ["assets/app.js", "assets/logo.svg", "assets/styles.css"],
  );

  assert.equal(out.assetRegistry.references.length, 3);
  assert.deepEqual(
    out.assetRegistry.references.map((r) => ({
      tag: r.tag,
      attribute: r.attribute,
      rawRef: r.rawRef,
      assetKind: r.assetKind,
      referenceKind: r.referenceKind,
      resolvedPath: r.resolvedPath,
      existence: r.existence,
      validationStatus: r.validationStatus,
    })),
    [
      {
        tag: "img",
        attribute: "src",
        rawRef: "./assets/logo.svg",
        assetKind: "image",
        referenceKind: "relative_local",
        resolvedPath: "assets/logo.svg",
        existence: "exists",
        validationStatus: "ok",
      },
      {
        tag: "link",
        attribute: "href",
        rawRef: "./assets/styles.css",
        assetKind: "stylesheet",
        referenceKind: "relative_local",
        resolvedPath: "assets/styles.css",
        existence: "exists",
        validationStatus: "ok",
      },
      {
        tag: "script",
        attribute: "src",
        rawRef: "./assets/app.js",
        assetKind: "script",
        referenceKind: "relative_local",
        resolvedPath: "assets/app.js",
        existence: "exists",
        validationStatus: "ok",
      },
    ],
  );
});

test("importStaticSite returns fatal diagnostic when entry is missing", async () => {
  const rootDir = fixtureDir();

  const out = await importStaticSite({
    rootDir,
    source: {
      kind: "single-entry-html",
      entryHtmlPath: "missing.html",
      assetsDirPath: "assets",
    },
  });

  assert.equal(out.contractVersion, "1.1.1");
  assert.equal(out.status, "failed");
  assert.ok(out.importDiagnostics.issues.some((i) => i.code === "ENTRY_HTML_MISSING" && i.severity === "fatal"));
});
