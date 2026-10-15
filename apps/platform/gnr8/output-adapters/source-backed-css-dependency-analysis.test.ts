import assert from "node:assert/strict";
import test from "node:test";

import {
  findProvablyUnusedCssDependencies,
  removeProvablyUnusedCssDependencyRules,
} from "./source-backed-css-dependency-analysis";

const STYLESHEET_URL = "https://cdn.example.test/site/css/external-libs.css";

test("records and removes only asset rules whose selectors cannot match retained HTML", () => {
  const css = [
    ".leaflet-control-layers-toggle{background-image:url('./images/layers.png')}",
    ".hero{background-image:url('./images/hero.webp')}",
    "@font-face{font-family:Exact;src:url('./fonts/exact.woff2') format('woff2')}",
  ].join("");
  const htmlDocuments = ['<!doctype html><html><body><section class="hero">Hero</section></body></html>'];
  const unused = findProvablyUnusedCssDependencies({ css, stylesheetUrl: STYLESHEET_URL, htmlDocuments });

  assert.deepEqual(unused, [{
    resolvedUrl: "https://cdn.example.test/site/css/images/layers.png",
    selectors: [".leaflet-control-layers-toggle"],
  }]);

  const pruned = removeProvablyUnusedCssDependencyRules({
    css,
    stylesheetUrl: STYLESHEET_URL,
    htmlDocuments,
    allowedUnusedUrls: new Set(unused.map((entry) => entry.resolvedUrl)),
  });
  assert.deepEqual(pruned.removedUrls, ["https://cdn.example.test/site/css/images/layers.png"]);
  assert.doesNotMatch(pruned.css, /leaflet-control-layers|layers\.png/);
  assert.match(pruned.css, /\.hero\{background-image:url\('\.\/images\/hero\.webp'\)\}/);
  assert.match(pruned.css, /font-family:Exact/);
});

test("does not classify a dependency as unused when any selector branch can match", () => {
  const css = ".missing,.hero{background:url('./images/shared.webp')}";
  assert.deepEqual(findProvablyUnusedCssDependencies({
    css,
    stylesheetUrl: STYLESHEET_URL,
    htmlDocuments: ['<main class="hero"></main>'],
  }), []);
});
