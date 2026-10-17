import assert from "node:assert/strict";
import test from "node:test";
import { versionRawCssUrl } from "./raw-css-url-version";
import { rewriteRawTemplateCssForRuntime } from "./raw-template-runtime";

test("CSS revision is stable, preserves query/fragment and propagates to nested stylesheets only", () => {
  const prefix = "/api/gnr8/runtime/preview-assets/site/version/";
  const url = versionRawCssUrl(`${prefix}theme.css?ver=4#fragment`);
  assert.equal(url, `${prefix}theme.css?ver=4&gnr8css=2#fragment`);
  assert.equal(versionRawCssUrl(url), url);
  assert.equal(versionRawCssUrl(`${prefix}font.woff?v=4`), `${prefix}font.woff?v=4`);
  const input = { css: '@import "nested.css";a{background:url(image.png)}', siteId: "site", siteVersionId: "version", assetFilePath: "theme.css", fileMapPaths: new Set(["nested.css", "image.png"]) };
  assert.ok(rewriteRawTemplateCssForRuntime(input).includes('nested.css?gnr8css=2'));
  assert.ok(!rewriteRawTemplateCssForRuntime({ ...input, versionCssUrls: false }).includes('gnr8css'));
});
