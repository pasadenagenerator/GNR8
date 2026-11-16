import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { hashedImportAssetPath, retainedStylesheetSourceUrl } from "./retained-css-dependency-path";
import { rewriteRawTemplateCssForRuntime } from "@/src/public-site/raw-template-runtime";

test("stored CSS recovery requires an intact unambiguous manifest mapping", () => {
  const entry = { localPath: "assets/stylesheet/theme.css", assetKind: "stylesheet", fetchStatus: "fetched", resolvedUrl: "https://example.com/cache/theme.css" };
  const bytes = Buffer.from(JSON.stringify([entry]));
  const input = { bytes, expectedSizeBytes: bytes.length, expectedSha256: createHash("sha256").update(bytes).digest("hex"), stylesheetPath: entry.localPath };
  assert.equal(retainedStylesheetSourceUrl(input), entry.resolvedUrl);
  assert.equal(retainedStylesheetSourceUrl({ ...input, expectedSha256: "wrong" }), null);
  assert.equal(retainedStylesheetSourceUrl({ ...input, expectedSizeBytes: 0 }), null);
  assert.equal(retainedStylesheetSourceUrl({ ...input, stylesheetPath: "other.css" }), null);
  const ambiguous = Buffer.from(JSON.stringify([entry, { ...entry, resolvedUrl: "https://other.example/theme.css" }]));
  assert.equal(retainedStylesheetSourceUrl({ ...input, bytes: ambiguous, expectedSizeBytes: ambiguous.length, expectedSha256: createHash("sha256").update(ambiguous).digest("hex") }), null);
});

test("stored CSS recovery reproduces the importer transform and preserves ownership and suffixes", () => {
  const assetFilePath = "assets/stylesheet/theme.css";
  const stylesheetSourceUrl = "https://example.com/cache/compiled/theme.css";
  const owned = "assets/style_asset/0123456789ab-icons.woff";
  const mistakenUrl = "https://example.com/cache/style_asset/0123456789ab-icons.woff";
  const corrupted = hashedImportAssetPath(mistakenUrl, "style_asset", "0123456789ab-icons.woff");
  const css = `@font-face{src:url('../style_asset/${corrupted.split('/').pop()}?#font')} .a{background:url('../../cache/style_asset/0123456789ab-icons.woff')} .b{background:url(../style_asset/000000000000-0123456789ab-icons.woff)} .c{background:url(https://unrelated.example/${corrupted})}`;
  const input = { css, siteId: "site_1", siteVersionId: "sv_1", assetFilePath, stylesheetSourceUrl, fileMapPaths: new Set([owned]) };
  const output = rewriteRawTemplateCssForRuntime(input);
  assert.ok(output.includes(`/preview-assets/site_1/sv_1/${owned}?#font`));
  assert.ok(output.includes(`.a{background:url('/api/gnr8/runtime/preview-assets/site_1/sv_1/${owned}')}`));
  assert.ok(output.includes("000000000000-0123456789ab-icons.woff"));
  assert.ok(output.includes(`https://unrelated.example/${corrupted}`));
  assert.equal(rewriteRawTemplateCssForRuntime({ ...input, css: output }), output);
  assert.equal(rewriteRawTemplateCssForRuntime({ ...input, fileMapPaths: new Set() }), css);
  assert.equal(rewriteRawTemplateCssForRuntime({ ...input, stylesheetSourceUrl: null }), css);
  const alreadyOwned = rewriteRawTemplateCssForRuntime({ ...input, fileMapPaths: new Set([owned, corrupted]) });
  assert.ok(alreadyOwned.includes(`/preview-assets/site_1/sv_1/${corrupted}?#font`));
});
