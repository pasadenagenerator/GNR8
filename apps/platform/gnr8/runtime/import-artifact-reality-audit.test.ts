import assert from "node:assert/strict";
import test from "node:test";

import { buildImportArtifactRealityAuditReport } from "@/gnr8/runtime/import-artifact-reality-audit";

function report(sourceHtml: string, rawArtifactHtml: string, browserDomHtml?: string) {
  return buildImportArtifactRealityAuditReport({
    routePath: "/",
    sourceUrl: "https://example.com/",
    rawFilePath: "index.html",
    sourceHtml,
    rawArtifactHtml,
    browserDomHtml,
  });
}

test("import artifact reality audit detects missing Google Font source when CSS declaration remains", () => {
  const source = `<!doctype html><html><head>
    <title>ViroiDoc</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dongle:wght@400;700&display=swap">
    <style>h1,button{font-family:"Dongle",sans-serif}</style>
  </head><body><h1>ViroiDoc</h1></body></html>`;
  const artifact = `<!doctype html><html><head>
    <title>ViroiDoc</title>
    <style>h1,button{font-family:"Dongle",sans-serif}</style>
  </head><body><h1>ViroiDoc</h1></body></html>`;

  const audit = report(source, artifact);

  assert.deepEqual(audit.missingFontSourcesInArtifact, ["https://fonts.googleapis.com/css2?family=Dongle:wght@400;700&display=swap"]);
  assert.equal(audit.dongleEvidence.sourceHasDongleDeclaration, true);
  assert.equal(audit.dongleEvidence.artifactHasDongleDeclaration, true);
  assert.equal(audit.dongleEvidence.artifactKeepsDongleDeclarationWithoutSource, true);
  assert.match(audit.importLossStageRecommendation, /font_source/);
});

test("import artifact reality audit detects missing map iframe and script", () => {
  const source = `<!doctype html><html><head>
    <script src="https://maps.googleapis.com/maps/api/js?key=abc"></script>
  </head><body>
    <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4"></iframe>
  </body></html>`;
  const artifact = `<!doctype html><html><head></head><body><main>Contact us</main></body></html>`;

  const audit = report(source, artifact);

  assert.deepEqual(audit.missingScriptsInArtifact, ["https://maps.googleapis.com/maps/api/js?key=abc"]);
  assert.deepEqual(audit.missingIframesInArtifact, ["https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4"]);
  assert.equal(audit.missingMapRefsInArtifact.includes("https://maps.googleapis.com/maps/api/js?key=abc"), true);
  assert.equal(audit.missingMapRefsInArtifact.includes("https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4"), true);
  assert.equal(audit.mapEvidence.embeddedMapInSourceHtml, true);
  assert.equal(audit.mapEvidence.rawHtmlCapturable, true);
});

test("import artifact reality audit classifies JS-generated map as not raw-HTML capturable", () => {
  const source = `<!doctype html><html><body><section id="map"></section><script>window.renderMapLater=true</script></body></html>`;
  const browserDom = `<!doctype html><html><body><section id="map">
    <iframe src="https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4"></iframe>
  </section></body></html>`;

  const audit = report(source, source, browserDom);

  assert.equal(audit.mapEvidence.sourceMapRefs.length, 0);
  assert.equal(audit.mapEvidence.browserDomMapRefs.length > 0, true);
  assert.equal(audit.mapEvidence.jsGeneratedMapLikely, true);
  assert.equal(audit.mapEvidence.rawHtmlCapturable, false);
  assert.match(audit.importLossStageRecommendation, /raw_html_capture_limit/);
});

test("import artifact reality audit detects missing gallery and form scripts", () => {
  const source = `<!doctype html><html><head>
    <script src="/assets/lightbox-gallery.js"></script>
    <script src="/assets/contact-form.js"></script>
  </head><body>
    <form action="/contact" method="post"><input name="email"></form>
    <div id="oneclickgallery"></div>
  </body></html>`;
  const artifact = `<!doctype html><html><head></head><body><main>Imported copy</main></body></html>`;

  const audit = report(source, artifact);

  assert.deepEqual(audit.missingScriptsInArtifact, ["/assets/contact-form.js", "/assets/lightbox-gallery.js"]);
  assert.equal(audit.missingGalleryRefsInArtifact.includes("/assets/lightbox-gallery.js"), true);
  assert.equal(audit.missingFormRefsInArtifact.includes("/assets/contact-form.js"), true);
  assert.equal(audit.formEvidence.formRefsMissingInArtifact, true);
  assert.equal(audit.galleryEvidence.galleryRefsMissingInArtifact, true);
});

test("import artifact reality audit reports no false losses for unchanged source and artifact", () => {
  const html = `<!doctype html><html class="root"><head>
    <title>Stable</title>
    <link rel="stylesheet" href="/assets/site.css">
    <script src="/assets/site.js"></script>
  </head><body class="page">
    <img src="/assets/hero.jpg" srcset="/assets/hero@2x.jpg 2x" data-src="/assets/lazy.jpg">
  </body></html>`;

  const audit = report(html, html);

  assert.equal(audit.htmlChanged, false);
  assert.deepEqual(audit.missingStylesheetsInArtifact, []);
  assert.deepEqual(audit.missingScriptsInArtifact, []);
  assert.deepEqual(audit.missingImagesInArtifact, []);
  assert.deepEqual(audit.missingIframesInArtifact, []);
  assert.deepEqual(audit.missingFontSourcesInArtifact, []);
  assert.deepEqual(audit.missingMapRefsInArtifact, []);
  assert.deepEqual(audit.missingFormRefsInArtifact, []);
  assert.deepEqual(audit.missingGalleryRefsInArtifact, []);
  assert.match(audit.importLossStageRecommendation, /no_import_ref_loss_detected/);
});
