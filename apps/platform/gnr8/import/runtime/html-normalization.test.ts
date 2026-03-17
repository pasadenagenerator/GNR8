import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { importStaticSite } from "./import-static-site";

function withTempRoot<T>(fn: (rootDir: string) => Promise<T> | T): Promise<T> {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-html-norm-"));
  const run = async () => fn(rootDir);
  return run().finally(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });
}

async function importSingleHtml(rootDir: string, htmlText: string): Promise<Awaited<ReturnType<typeof importStaticSite>>> {
  fs.writeFileSync(path.join(rootDir, "index.html"), htmlText, "utf8");
  return importStaticSite({
    rootDir,
    source: { kind: "single-entry-html", entryHtmlPath: "index.html" },
  });
}

function snapshotShape(out: Awaited<ReturnType<typeof importStaticSite>>): {
  text: string;
  serializedDom: string;
  nodeCount: number;
  parseWarnings: unknown;
} {
  assert.equal(out.rawDomSnapshot.documents.length, 1);
  const doc = out.rawDomSnapshot.documents[0];
  assert.ok(doc.dom);
  return {
    text: doc.text,
    serializedDom: doc.dom.serializedDom,
    nodeCount: doc.dom.nodeCount,
    parseWarnings: doc.dom.parseWarnings,
  };
}

test("HTML normalization produces stable snapshots across BOM/newline variants", async () => {
  const base = "<!doctype html>\n<html>\n<head><title>x</title></head>\n<body>\n<p>hi</p>\n</body>\n</html>\n";

  await withTempRoot(async (rootDir) => {
    const baseline = await importSingleHtml(rootDir, base);
    assert.equal(baseline.contractVersion, "1.1.1");
    assert.equal(baseline.status, "ok");
    const baselineSnap = snapshotShape(baseline);
    assert.ok(!baselineSnap.text.includes("\r"));
    assert.ok(!baselineSnap.serializedDom.includes("\r"));

    const variants = [
      { label: "bom+lf", text: "\uFEFF" + base, expectCodes: ["HTML_BOM_REMOVED"] },
      { label: "crlf", text: base.replaceAll("\n", "\r\n"), expectCodes: ["HTML_NEWLINES_NORMALIZED"] },
      {
        label: "bom+crlf",
        text: "\uFEFF" + base.replaceAll("\n", "\r\n"),
        expectCodes: ["HTML_BOM_REMOVED", "HTML_NEWLINES_NORMALIZED"],
      },
      { label: "cr", text: base.replaceAll("\n", "\r"), expectCodes: ["HTML_NEWLINES_NORMALIZED"] },
    ];

    for (const v of variants) {
      const out = await importSingleHtml(rootDir, v.text);
      const snap = snapshotShape(out);
      assert.deepEqual(snap, baselineSnap, `variant ${v.label} should match baseline snapshot`);

      const codes = out.importDiagnostics.issues.map((i) => i.code);
      for (const c of v.expectCodes) assert.ok(codes.includes(c), `variant ${v.label} should include ${c}`);
    }
  });
});

test("Empty and whitespace-only HTML do not crash and produce explicit diagnostics", async () => {
  await withTempRoot(async (rootDir) => {
    const empty = await importSingleHtml(rootDir, "");
    assert.equal(empty.status, "ok");
    assert.ok(empty.importDiagnostics.issues.some((i) => i.code === "HTML_EMPTY"));

    const whitespace = await importSingleHtml(rootDir, " \t\r\n ");
    assert.equal(whitespace.status, "ok");
    const codes = whitespace.importDiagnostics.issues.map((i) => i.code);
    assert.ok(codes.includes("HTML_EMPTY"));
    assert.ok(codes.includes("HTML_NEWLINES_NORMALIZED"));
  });
});

test("Fragment-like HTML input produces stable snapshots across equivalent variants", async () => {
  const base = "<div>\nhello</div>\n";

  await withTempRoot(async (rootDir) => {
    const baseline = await importSingleHtml(rootDir, base);
    const baselineSnap = snapshotShape(baseline);
    assert.ok(baselineSnap.serializedDom.includes("<body>"));
    assert.ok(baselineSnap.serializedDom.includes("<div>"));

    const out = await importSingleHtml(rootDir, "\uFEFF" + base.replaceAll("\n", "\r\n"));
    const snap = snapshotShape(out);
    assert.deepEqual(snap, baselineSnap);
  });
});

