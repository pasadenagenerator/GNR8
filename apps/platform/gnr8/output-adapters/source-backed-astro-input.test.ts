import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { computeLocalPathCandidate } from "@/gnr8/validation/runtime/url-single-page-import";

import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeArtifact } from "@/gnr8/runtime/types";

import {
  createSourceBackedAstroGenerationInput,
  loadSourceBackedAstroGenerationSource,
  loadSourceBackedAstroHtmlByPath,
  SourceBackedAstroUnsupportedError,
} from "./source-backed-astro-input";

const SHA = "a".repeat(64);

function fixture(overrides: { aboutHtml?: string; rootHtml?: string } = {}) {
  const version = {
    id: "11111111-1111-4111-8111-111111111111",
    siteId: "runtime-site",
    versionNo: 1,
    state: "DRAFT",
    source: "migration",
    actor: "test",
    createdAt: "2026-10-02T10:00:00.000Z",
    rendererCompatibilityVersion: "test",
    artifactId: "22222222-2222-4222-8222-222222222222",
    importProvenanceSummary: {
      multiPageDiscovery: {
        rawArtifactAssembly: {
          enabled: true,
          routeMap: [
            {
              routePath: "/about",
              sourceUrl: "https://example.com/about",
              finalUrl: "https://example.com/about",
              rawFilePath: "pages/about/index.html",
              bodySha256: SHA,
              byteSize: 1,
              status: "assembled",
            },
          ],
        },
      },
    } as CanonicalSiteVersionSnapshot["importProvenanceSummary"],
    pages: [
      page("/", "Home"),
      page("/about", "About"),
    ],
  } as CanonicalSiteVersionSnapshot;
  const artifact = {
    id: version.artifactId!,
    siteId: version.siteId,
    siteVersionId: version.id,
    rendererCompatibilityVersion: "test",
    htmlByPath: {
      "/": overrides.rootHtml ?? '<!doctype html><html><head><title>Home</title></head><body><nav><a href="/about">About</a></nav><img src="/uploads/logo.png"><h1>Home</h1></body></html>',
      "/about": overrides.aboutHtml ?? '<!doctype html><html><head><title>About</title></head><body><nav><a href="/">Home</a></nav><img src="../../uploads/about.png"><h1>About</h1></body></html>',
    },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: {},
    publishStage: "shadow",
    shadowRestricted: true,
    artifactGovernance: {},
    bundleSha256: SHA,
    createdAt: "2026-10-02T10:00:00.000Z",
  } as unknown as RuntimeArtifact;
  const rawArtifact = {
    id: "33333333-3333-4333-8333-333333333333",
    artifactType: "raw_imported_site",
    siteId: version.siteId,
    siteVersionId: version.id,
    entryHtmlPath: "index.html",
    assetBasePath: "",
    fileMap: {
      "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 1, sha256: SHA },
      "uploads/logo.png": { path: "uploads/logo.png", mediaType: "image/png", sizeBytes: 10, sha256: SHA },
      "uploads/about.png": { path: "uploads/about.png", mediaType: "image/png", sizeBytes: 10, sha256: SHA },
      "pages/about/index.html": { path: "pages/about/index.html", mediaType: "text/html", sizeBytes: 1, sha256: SHA },
    },
    metadata: {
      sourceUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      htmlByteLength: 1,
      multiPage: { enabled: true, pageCount: 2, routeMapRef: "importProvenanceSummary.multiPageDiscovery.rawArtifactAssembly" },
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: 1, externalFallbackAssetCount: 0 },
    },
    createdAt: "2026-10-02T10:00:00.000Z",
  } as RawImportedSiteArtifact;
  return { version, artifact, rawArtifact };
}

function page(path: string, title: string): CanonicalSiteVersionSnapshot["pages"][number] {
  return {
    id: `page-version-${path}`,
    siteVersionId: "11111111-1111-4111-8111-111111111111",
    pageId: `page-${path}`,
    path,
    title,
    structureModel: { sections: [] },
    contentModel: { sectionProps: {} },
    styleTokens: {},
    assetGraph: [],
    semanticSignals: [],
    source: "migration",
    actor: "test",
    createdAt: "2026-10-02T10:00:00.000Z",
  };
}

test("normal source input preserves captured routes, navigation, owned asset identity, and exact Astro source files", () => {
  const input = fixture();
  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  assert.deepEqual(generated.outputPaths, ["/", "/about"]);
  assert.equal(generated.contentManifest.scope.kind, "static_site");
  assert.deepEqual(generated.contentManifest.requiredNavigation.map((item) => item.target).sort(), ["/", "/about"]);
  const assetUrl = `/api/gnr8/runtime/preview-assets/${input.rawArtifact.siteId}/${input.rawArtifact.siteVersionId}/uploads/logo.png`;
  assert.equal(generated.ownedAssetFingerprints[assetUrl], SHA);
  assert.ok(generated.contentManifest.requiredAssets.some((asset) => asset.path === assetUrl));
  assert.deepEqual(generated.sourceManifest.assetEvidence.find((asset) => asset.path === assetUrl), {
    path: assetUrl,
    mediaType: "image/png",
    sizeBytes: 10,
    sha256: SHA,
  });
  assert.equal(generated.sourceManifest.files.some((file) => file.path === "public/styles/global.css"), false);
  assert.ok(generated.sourceManifest.files.some((file) => file.path === "src/pages/about/index.astro" && file.contents.includes("<h1>About</h1>")));
  assert.ok(generated.sourceManifest.files.some((file) => file.path === "src/pages/about/index.astro" && file.contents.includes("/uploads/about.png")));
});

test("normalizes rendered navigation with the same targets used by governance evidence", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title></head><body>
      <a href="/about">About</a>
      <a href="https://example.com/about/">Absolute About</a>
      <a href="https://outside.test/article">External article</a>
      <a href="#">Legacy toggle</a>
      <a href="#o-nas">Missing section</a>
      <a href="#details">Details</a><section id="details">Detail text</section>
      <img src="/uploads/logo.png">
    </body></html>`,
  });

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  const targets = new Set(generated.contentManifest.requiredNavigation.map((item) => item.target));

  assert.match(rootSource, /href="\/about"/);
  assert.match(rootSource, /href="https:\/\/outside\.test\/article"/);
  assert.match(rootSource, /href="#details"/);
  assert.doesNotMatch(rootSource, /href="#(?:o-nas)?"/);
  assert.match(rootSource, /data-gnr8-disabled-local-anchor="#o-nas"/);
  assert.doesNotMatch(rootSource, /<a\b[^>]*href="\/api\/gnr8\/runtime\/preview-assets\//);
  assert.match(rootSource, /src="\/api\/gnr8\/runtime\/preview-assets\/runtime-site\/11111111-1111-4111-8111-111111111111\/uploads\/logo\.png"/);
  assert.deepEqual([...targets].sort(), ["#details", "/", "/about", "https://outside.test/article"]);
});

test("materializes a script-free mobile fallback only for the recognized captured navigation contract", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title></head><body>
      <nav id="primary" class="module nav" data-settings="vertical=false,direction=left,push=true" tabindex="-1">
        <ul class="navContainer"><li><a href="/about">About</a></li></ul>
      </nav>
      <nav id="secondary"><ul class="navContainer"><li><a href="/about">Secondary</a></li></ul></nav>
    </body></html>`,
  });

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";

  assert.match(rootSource, /<nav id="primary"[^>]*data-gnr8-static-mobile-navigation=""/);
  assert.match(rootSource, /<nav id="primary"[^>]*tabindex="0"/);
  assert.match(rootSource, /<nav id="primary"[^>]*aria-label="Navigation menu"/);
  assert.match(rootSource, /nav\[data-gnr8-static-mobile-navigation\]:focus-within > ul\.navContainer \{ right: 0 !important; left: auto !important; \}/);
  assert.match(rootSource, /focus-visible \{ outline: 2px solid currentColor; outline-offset: 4px; \}/);
  assert.doesNotMatch(rootSource, /<nav id="secondary"[^>]*data-gnr8-static-mobile-navigation/);
});

test("fails explicitly when generated HTML references an owned asset without persisted byte evidence", () => {
  const input = fixture();
  delete input.rawArtifact.fileMap["uploads/logo.png"];
  assert.throws(
    () => createSourceBackedAstroGenerationInput({
      siteVersion: input.version,
      artifact: input.artifact,
      rawArtifact: input.rawArtifact,
    }),
    (error) => error instanceof SourceBackedAstroUnsupportedError &&
      error.unsupportedCapabilities.some((item) => item.startsWith("source_asset_evidence_missing:")),
  );
});

test("rebases ancestor-scoped owned assets only when the current immutable artifact proves the path", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title></head><body>
      <img src="/api/gnr8/runtime/preview-assets/runtime-site/00000000-0000-4000-8000-000000000000/uploads/logo.png">
    </body></html>`,
  });
  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  const source = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  assert.match(source, new RegExp(`/preview-assets/runtime-site/${input.rawArtifact.siteVersionId}/uploads/logo\\.png`));
  assert.doesNotMatch(source, /00000000-0000-4000-8000-000000000000/);
});

test("does not rebase wrong-owner or unproven preview asset references", () => {
  for (const reference of [
    "/api/gnr8/runtime/preview-assets/other-site/00000000-0000-4000-8000-000000000000/uploads/logo.png",
    "/api/gnr8/runtime/preview-assets/runtime-site/00000000-0000-4000-8000-000000000000/uploads/missing.png",
  ]) {
    const input = fixture({
      rootHtml: `<!doctype html><html><head><title>Home</title></head><body><img src="${reference}"></body></html>`,
    });
    assert.throws(
      () => createSourceBackedAstroGenerationInput({
        siteVersion: input.version,
        artifact: input.artifact,
        rawArtifact: input.rawArtifact,
      }),
      (error) => error instanceof SourceBackedAstroUnsupportedError &&
        error.unsupportedCapabilities.includes(`source_asset_evidence_missing:${reference}`),
    );
  }
});

test("loads every captured route from the owned raw artifact when the runtime artifact contains only root", async () => {
  const input = fixture();
  input.artifact.htmlByPath = { "/": input.artifact.htmlByPath["/"] };
  const sourceBytes: Record<string, Buffer> = {
    "index.html": Buffer.from('<html><head><title>Home</title></head><body><a href="/about">About</a><h1>Home</h1></body></html>'),
    "pages/about/index.html": Buffer.from('<html><head><title>About</title></head><body><a href="/">Home</a><h1>About</h1></body></html>'),
  };
  const htmlByPath = await loadSourceBackedAstroHtmlByPath({
    siteVersion: input.version,
    rawArtifact: input.rawArtifact,
    getRawAsset: async ({ filePath }) => {
      const bytes = sourceBytes[filePath];
      const metadata = input.rawArtifact.fileMap[filePath];
      return bytes && metadata ? { mediaType: metadata.mediaType, sizeBytes: metadata.sizeBytes, sha256: metadata.sha256, bytes } : null;
    },
  });
  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
    htmlByPath,
  });

  assert.deepEqual(Object.keys(htmlByPath), ["/", "/about"]);
  assert.deepEqual(generated.outputPaths, ["/", "/about"]);
  assert.ok(generated.sourceManifest.files.some((file) => file.path === "src/pages/about/index.astro"));
});

test("fails explicitly when any required captured route bytes are unavailable", async () => {
  const input = fixture();
  await assert.rejects(
    () => loadSourceBackedAstroHtmlByPath({
      siteVersion: input.version,
      rawArtifact: input.rawArtifact,
      getRawAsset: async ({ filePath }) => filePath === "index.html"
        ? { mediaType: "text/html", sizeBytes: 1, sha256: SHA, bytes: Buffer.from("<html></html>") }
        : null,
    }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("source_route_asset_missing:/about"),
  );
});

test("loads and verifies retained stylesheet bytes for generation dependency evidence", async () => {
  const input = fixture();
  const stylesheetPath = "assets/stylesheet/site.css";
  const stylesheetBytes = Buffer.from(".hero{background-image:url('../../uploads/logo.png')}");
  const stylesheetSha256 = createHash("sha256").update(stylesheetBytes).digest("hex");
  input.rawArtifact.fileMap[stylesheetPath] = {
    path: stylesheetPath,
    mediaType: "text/css",
    sizeBytes: stylesheetBytes.byteLength,
    sha256: stylesheetSha256,
  };
  const sourceBytes: Record<string, Buffer> = {
    "index.html": Buffer.from(input.artifact.htmlByPath["/"]),
    "pages/about/index.html": Buffer.from(input.artifact.htmlByPath["/about"]),
    [stylesheetPath]: stylesheetBytes,
  };

  const source = await loadSourceBackedAstroGenerationSource({
    siteVersion: input.version,
    rawArtifact: input.rawArtifact,
    getRawAsset: async ({ filePath }) => {
      const bytes = sourceBytes[filePath];
      const metadata = input.rawArtifact.fileMap[filePath];
      return bytes && metadata ? { mediaType: metadata.mediaType, sizeBytes: metadata.sizeBytes, sha256: metadata.sha256, bytes } : null;
    },
  });

  assert.equal(source.stylesheetCssByPath[stylesheetPath], stylesheetBytes.toString("utf8"));
  assert.equal(source.ownedStylesheetEvidence[0]?.retainedSha256, stylesheetSha256);
  assert.match(source.ownedStylesheetEvidence[0]?.materializedBytes.toString("utf8") ?? "", /preview-assets\/runtime-site\/11111111-1111-4111-8111-111111111111\/uploads\/logo\.png/);
  assert.deepEqual(Object.keys(source.htmlByPath), ["/", "/about"]);
});

test("materializes audited unused vendor rules without changing retained stylesheet bytes", async () => {
  const input = fixture({
    rootHtml: '<!doctype html><html><head><title>Home</title></head><body><main class="hero"><h1>Home</h1></main></body></html>',
  });
  const stylesheetPath = "assets/stylesheet/vendor.css";
  const stylesheetUrl = "https://cdn.example.test/site/css/vendor.css";
  const unusedUrl = "https://cdn.example.test/site/css/images/layers.png";
  const retainedUnusedPath = "assets/stylesheet/images/marker-icon.png";
  const retainedUnusedUrl = "https://cdn.example.test/site/css/images/marker-icon.png";
  const stylesheetBytes = Buffer.from(
    ".leaflet-control-layers-toggle{background:url('./images/layers.png')}" +
      ".leaflet-default-icon-path{background-image:url('./images/marker-icon.png')}" +
      ".hero{background:url('../../uploads/logo.png')}",
  );
  input.rawArtifact.fileMap[stylesheetPath] = {
    path: stylesheetPath,
    mediaType: "text/css",
    sizeBytes: stylesheetBytes.byteLength,
    sha256: createHash("sha256").update(stylesheetBytes).digest("hex"),
  };
  const retainedUnusedBytes = Buffer.from([1, 2, 3, 4]);
  input.rawArtifact.fileMap[retainedUnusedPath] = {
    path: retainedUnusedPath,
    mediaType: "image/png",
    sizeBytes: retainedUnusedBytes.byteLength,
    sha256: createHash("sha256").update(retainedUnusedBytes).digest("hex"),
  };
  input.version.importProvenanceSummary = {
    ...input.version.importProvenanceSummary,
    derivedCapture: {
      kind: "dependency_complete_derived_capture_v1",
      parentSiteVersionId: "parent-version",
      parentArtifactId: "parent-artifact",
      parentRawArtifactId: "parent-raw",
      parentFilesSha256: SHA,
      derivedFilesSha256: SHA,
      dependencyUrls: [],
      unusedCssDependencies: [{
        stylesheetPath,
        resolvedUrl: unusedUrl,
        selectors: [".leaflet-control-layers-toggle"],
      }, {
        stylesheetPath,
        resolvedUrl: retainedUnusedUrl,
        selectors: [".leaflet-default-icon-path"],
      }],
      rewrites: [{ from: stylesheetUrl, to: `/${stylesheetPath}` }],
      rewrittenHtmlFiles: [],
    },
  } as CanonicalSiteVersionSnapshot["importProvenanceSummary"];
  const sourceBytes: Record<string, Buffer> = {
    "index.html": Buffer.from(input.artifact.htmlByPath["/"]),
    "pages/about/index.html": Buffer.from(input.artifact.htmlByPath["/about"]),
    [stylesheetPath]: stylesheetBytes,
    [retainedUnusedPath]: retainedUnusedBytes,
  };

  const source = await loadSourceBackedAstroGenerationSource({
    siteVersion: input.version,
    rawArtifact: input.rawArtifact,
    getRawAsset: async ({ filePath }) => {
      const bytes = sourceBytes[filePath];
      const metadata = input.rawArtifact.fileMap[filePath];
      return bytes && metadata ? { ...metadata, bytes } : null;
    },
  });

  assert.equal(source.stylesheetCssByPath[stylesheetPath], stylesheetBytes.toString("utf8"));
  const materialized = source.ownedStylesheetEvidence.find((entry) => entry.filePath === stylesheetPath)?.materializedBytes.toString("utf8") ?? "";
  assert.doesNotMatch(materialized, /leaflet-control-layers|leaflet-default-icon-path|layers\.png|marker-icon\.png/);
  assert.match(materialized, /\.hero/);
  assert.match(materialized, /preview-assets\/runtime-site\/11111111-1111-4111-8111-111111111111\/uploads\/logo\.png/);
});

test("materializes owned stylesheet imports with their own URL bases and media condition", async () => {
  const input = fixture();
  const parentPath = "assets/stylesheet/site.css";
  const childPath = "assets/stylesheet/fonts.css";
  const fontPath = "assets/style_asset/exact.woff2";
  const sourceBytes: Record<string, Buffer> = {
    "index.html": Buffer.from(input.artifact.htmlByPath["/"]),
    "pages/about/index.html": Buffer.from(input.artifact.htmlByPath["/about"]),
    [parentPath]: Buffer.from("@import url('./fonts.css') screen;.hero{color:#123}"),
    [childPath]: Buffer.from("@font-face{font-family:Exact;src:url('../style_asset/exact.woff2')}"),
    [fontPath]: Buffer.from([1, 2, 3, 4]),
  };
  for (const filePath of [parentPath, childPath, fontPath]) {
    const bytes = sourceBytes[filePath]!;
    input.rawArtifact.fileMap[filePath] = {
      path: filePath,
      mediaType: filePath.endsWith(".css") ? "text/css" : "font/woff2",
      sizeBytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  const source = await loadSourceBackedAstroGenerationSource({
    siteVersion: input.version,
    rawArtifact: input.rawArtifact,
    getRawAsset: async ({ filePath }) => {
      const bytes = sourceBytes[filePath];
      const metadata = input.rawArtifact.fileMap[filePath];
      return bytes && metadata ? { ...metadata, bytes } : null;
    },
  });
  const parent = source.ownedStylesheetEvidence.find((entry) => entry.filePath === parentPath);
  assert.ok(parent);
  const css = parent.materializedBytes.toString("utf8");
  assert.match(css, /^@media screen\{/);
  assert.match(css, /font-family:Exact/);
  assert.match(css, /preview-assets\/runtime-site\/11111111-1111-4111-8111-111111111111\/assets\/style_asset\/exact\.woff2/);
  assert.doesNotMatch(css, /@import/);
});

test("materializes a captured external stylesheet import only from its exact owned artifact path", async () => {
  const input = fixture();
  const parentPath = "assets/stylesheet/site.css";
  const externalUrl = "https://fonts.prod.extra-cdn.com/css?family=Roboto+Condensed:400,700&display=swap";
  const childPath = computeLocalPathCandidate({ resolvedUrl: externalUrl, assetKind: "stylesheet" });
  const sourceBytes: Record<string, Buffer> = {
    "index.html": Buffer.from(input.artifact.htmlByPath["/"]),
    "pages/about/index.html": Buffer.from(input.artifact.htmlByPath["/about"]),
    [parentPath]: Buffer.from(`@import url('${externalUrl}');.hero{color:#123}`),
    [childPath]: Buffer.from("@font-face{font-family:'Roboto Condensed';font-style:normal;font-weight:400 700;src:local('Roboto Condensed')}"),
  };
  for (const filePath of [parentPath, childPath]) {
    const bytes = sourceBytes[filePath]!;
    input.rawArtifact.fileMap[filePath] = {
      path: filePath,
      mediaType: "text/css",
      sizeBytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  const source = await loadSourceBackedAstroGenerationSource({
    siteVersion: input.version,
    rawArtifact: input.rawArtifact,
    getRawAsset: async ({ filePath }) => {
      const bytes = sourceBytes[filePath];
      const metadata = input.rawArtifact.fileMap[filePath];
      return bytes && metadata ? { ...metadata, bytes } : null;
    },
  });

  const css = source.ownedStylesheetEvidence.find((entry) => entry.filePath === parentPath)?.materializedBytes.toString("utf8") ?? "";
  assert.match(css, /font-family:'Roboto Condensed'/);
  assert.doesNotMatch(css, /@import|fonts\.prod\.extra-cdn\.com/);
});

test("uncaptured required routes and executable source behavior return explicit unsupported capability results", () => {
  const missingRoute = fixture({ rootHtml: '<html><head><title>Home</title></head><body><a href="/missing">Missing</a></body></html>' });
  assert.throws(
    () => createSourceBackedAstroGenerationInput({ siteVersion: missingRoute.version, artifact: missingRoute.artifact, rawArtifact: missingRoute.rawArtifact }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("uncaptured_required_route:/missing"),
  );
  const scripted = fixture({ aboutHtml: '<html><head><title>About</title></head><body><script>window.app = true</script></body></html>' });
  assert.throws(
    () => createSourceBackedAstroGenerationInput({ siteVersion: scripted.version, artifact: scripted.artifact, rawArtifact: scripted.rawArtifact }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("scripts"),
  );
});

test("preserves page-limit omissions as disclosed source links while other uncaptured routes still fail", () => {
  const input = fixture({
    rootHtml: '<html><head><title>Home</title></head><body><a href="/about">About</a><a href="/older-article">Older article</a></body></html>',
  });
  input.version.importProvenanceSummary!.multiPageDiscovery!.acquisition = {
    kind: "multi_page_html_acquisition_manifest_v1",
    seedUrl: "https://example.com/",
    normalizedSeedUrl: "https://example.com/",
    pages: [{
      originalHref: "https://example.com/older-article",
      normalizedUrl: "https://example.com/older-article",
      finalUrl: null,
      normalizedRoutePath: "/older-article",
      finalNormalizedRoutePath: null,
      depth: 1,
      status: "skipped",
      httpStatusCode: null,
      contentType: null,
      byteSize: 0,
      bodySha256: null,
      bodyPath: null,
      redirected: false,
      redirectCount: 0,
      diagnostics: ["MULTIPAGE_HTML_ACQUISITION_LIMIT_REACHED"],
      skippedReason: "acquisition_page_limit",
      failureReason: null,
    }],
    limitsApplied: { maxPages: 2, maxBytesPerPage: 1_000_000, requestTimeoutMs: 8_000 },
    summary: { fetchedPageCount: 2, failedPageCount: 0, skippedPageCount: 1 },
    diagnostics: ["MULTIPAGE_HTML_ACQUISITION_LIMIT_REACHED"],
    generatedAt: "2026-10-02T10:00:00.000Z",
  };

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });

  assert.ok(generated.contentManifest.requiredNavigation.some((item) =>
    item.kind === "external_url" && item.target === "https://example.com/older-article"));
  assert.deepEqual(generated.sourceManifest.captureScopeLimitations, [{
    kind: "acquisition-page-limit-external-link-v1",
    route: "/older-article",
    sourceUrl: "https://example.com/older-article",
  }]);
});

test("normalizes percent-encoding identity and keeps RSS as a source feed instead of an HTML route", async () => {
  const input = fixture({
    rootHtml: '<html><head><title>Home</title></head><body><a href="/b/trademark%C2%AE">Article</a><a href="/blog.rss">RSS</a></body></html>',
  });
  const encodedRoute = "/b/trademark%c2%ae";
  const normalizedEncodedRoute = "/b/trademark%C2%AE";
  const decodedRoute = "/b/trademark®";
  input.version.pages.push(page(decodedRoute, "Article"));
  input.rawArtifact.fileMap["pages/b/trademark/index.html"] = { path: "pages/b/trademark/index.html", mediaType: "text/html", sizeBytes: 1, sha256: SHA };
  input.version.importProvenanceSummary!.multiPageDiscovery!.rawArtifactAssembly!.routeMap.push({
    routePath: encodedRoute,
    sourceUrl: `https://example.com${encodedRoute}`,
    finalUrl: `https://example.com${encodedRoute}`,
    rawFilePath: "pages/b/trademark/index.html",
    bodySha256: SHA,
    byteSize: 1,
    status: "assembled",
  });

  const sourceBytes: Record<string, Buffer> = {
    "index.html": Buffer.from(input.artifact.htmlByPath["/"]),
    "pages/about/index.html": Buffer.from(input.artifact.htmlByPath["/about"]),
    "pages/b/trademark/index.html": Buffer.from('<html><head><title>Article</title></head><body><a href="/">Home</a></body></html>'),
  };
  const htmlByPath = await loadSourceBackedAstroHtmlByPath({
    siteVersion: input.version,
    rawArtifact: input.rawArtifact,
    getRawAsset: async ({ filePath }) => {
      const bytes = sourceBytes[filePath];
      const metadata = input.rawArtifact.fileMap[filePath];
      return bytes && metadata ? { mediaType: metadata.mediaType, sizeBytes: metadata.sizeBytes, sha256: metadata.sha256, bytes } : null;
    },
  });

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
    htmlByPath,
  });

  assert.ok(generated.contentManifest.requiredNavigation.some((item) => item.target === normalizedEncodedRoute && item.kind === "local_route"));
  assert.ok(generated.contentManifest.requiredNavigation.some((item) => item.target === "https://example.com/blog.rss" && item.kind === "external_url"));
  assert.ok(generated.sourceManifest.files.some((file) => file.path.includes("trademark®/index.astro")));
});

test("removes replaceable static-site bootstrap scripts and materializes lazy assets", () => {
  const input = fixture({
    rootHtml: `<html><head><title>Home</title><script src="/assets/jquery-modern.js"></script></head><body>
      <img data-src="/uploads/lazy.png">
      <script>navigator.serviceWorker.getRegistrations()</script>
      <script>window.ASSETSURL='https://assets.example.com'</script>
      <script src="/assets/nav.js"></script>
    </body></html>`,
  });
  input.rawArtifact.fileMap["uploads/lazy.png"] = { path: "uploads/lazy.png", mediaType: "image/png", sizeBytes: 10, sha256: SHA };

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  assert.doesNotMatch(rootSource, /<script\b/i);
  assert.match(rootSource, /src="\/api\/gnr8\/runtime\/preview-assets\/runtime-site\/11111111-1111-4111-8111-111111111111\/uploads\/lazy\.png"/);
});

test("allows static iframe embeds but keeps form-backed captcha behavior unsupported", () => {
  const staticEmbed = fixture({
    rootHtml: '<html><head><title>Home</title></head><body><iframe src="https://www.youtube.com/embed/example" title="Video"></iframe></body></html>',
  });
  assert.doesNotThrow(() => createSourceBackedAstroGenerationInput({
    siteVersion: staticEmbed.version,
    artifact: staticEmbed.artifact,
    rawArtifact: staticEmbed.rawArtifact,
  }));

  const captchaForm = fixture({
    rootHtml: '<html><head><title>Home</title></head><body><form method="post"><input name="h-captcha-response"><iframe src="https://newassets.hcaptcha.com/captcha/frame"></iframe></form><script src="https://js.hcaptcha.com/1/api.js"></script></body></html>',
  });
  assert.throws(
    () => createSourceBackedAstroGenerationInput({ siteVersion: captchaForm.version, artifact: captchaForm.artifact, rawArtifact: captchaForm.rawArtifact }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("forms") && !error.unsupportedCapabilities.includes("application_state"),
  );
});

test("applies explicitly accepted form reductions only to that generation and records disclosed limitations", () => {
  const input = fixture({
    rootHtml: `<html><head><title>Home</title>
      <style>@font-face{font-family:Example;src:url('/assets/font.woff2')}</style>
      <style>.h-captcha{display:table}.hcaptcha-badge{background-image:url('/assets/hcaptcha-badge.svg')}</style>
    </head><body>
      <a class="module button" href="mailto:stale@example.test" title="Contact us" data-track-action="email_link">Contact us</a>
      <a href="mailto:change@chs.si" data-track-action="email_link">Change</a>
      <form id="m3166" method="post"><input name="email"><iframe src="https://newassets.hcaptcha.com/captcha/frame"></iframe></form>
      <script src="/assets/form.js"></script><script src="https://js.hcaptcha.com/1/api.js"></script><script src="/assets/script/1a0efd5f7e4f-api.js"></script>
      <a href="/about">About</a>
    </body></html>`,
    aboutHtml: `<html><head><title>About</title></head><body>
      <form id="m0000" method="post"><input name="name"><textarea name="comment"></textarea></form>
      <script src="/assets/form.js"></script>
    </body></html>`,
  });

  assert.throws(
    () => createSourceBackedAstroGenerationInput({ siteVersion: input.version, artifact: input.artifact, rawArtifact: input.rawArtifact }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("forms"),
  );

  input.rawArtifact.fileMap["assets/font.woff2"] = { path: "assets/font.woff2", mediaType: "font/woff2", sizeBytes: 10, sha256: SHA };
  input.rawArtifact.fileMap["assets/hcaptcha-badge.svg"] = { path: "assets/hcaptcha-badge.svg", mediaType: "image/svg+xml", sizeBytes: 10, sha256: SHA };
  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
    acceptedFunctionalReductions: {
      kind: "legacy-forms-to-disclosed-links-v1",
      contactEmail: "sales@chs.si",
      commentLinks: "source-article",
    },
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  const aboutSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/about/index.astro")?.contents ?? "";

  assert.doesNotMatch(`${rootSource}\n${aboutSource}`, /<form\b|hcaptcha|form\.js/i);
  assert.match(rootSource, /href="mailto:sales@chs\.si"/);
  assert.doesNotMatch(rootSource, /href="mailto:stale@example\.test"/);
  assert.doesNotMatch(rootSource, /href="mailto:mailto@chs\.si"/);
  assert.match(rootSource, /href="mailto:change@chs\.si"/);
  assert.match(rootSource, /font\.woff2/);
  assert.ok(generated.contentManifest.requiredAssets.some((asset) => asset.path.endsWith("/assets/font.woff2")));
  assert.ok(!generated.contentManifest.requiredAssets.some((asset) => /hcaptcha/i.test(asset.path)));
  assert.match(rootSource, /does not provide the legacy contact form/);
  assert.match(aboutSource, /href="https:\/\/example\.com\/about"/);
  assert.match(aboutSource, /Open the original article to comment/);
  assert.ok(generated.contentManifest.requiredNavigation.some((item) => item.kind === "external_url" && item.target === "https://example.com/about"));
  assert.deepEqual(generated.sourceManifest.acceptedFunctionalReductions?.limitations, [
    "Legacy contact forms were replaced with disclosed mailto links to sales@chs.si.",
    "Legacy comment forms were replaced with disclosed links to the corresponding source articles; no generated-page comment submission is provided.",
  ]);
});

test("preserves route-specific stylesheet order and applies only explicitly accepted source-widget removals", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title>
      <link rel="stylesheet" href="https://example.com/assets/external-libs.css">
      <link rel="stylesheet" href="/assets/user-style.css">
      <link rel="stylesheet" href="https://js.hcaptcha.com/1/api.css">
      <style>.page-specific{background-image:url('/uploads/logo.png')}</style>
    </head><body class="cookie-open sticky-navigation">
      <div id="infobar" class="infobar-wrapper"><div class="infobar"><div class="cookie-row cookie-row-text">Consent</div></div></div>
      <header class="headerFixed"><nav class="module nav"><a href="/about">About</a></nav></header>
      <main><form id="m3166"><div class="h-captcha"></div></form><h1>Home</h1><svg viewBox="0 0 16 16"><use xlink:href="/assets/icons.svg#mark"></use></svg></main>
      <a href="/about">Privacy policy</a>
      <a href="#" data-req="scrollTop" class="scrollIcon hidden bottom_right">Top</a>
    </body></html>`,
  });
  input.rawArtifact.fileMap["assets/stylesheet/f625c4a163d0-external-libs.css"] = {
    path: "assets/stylesheet/f625c4a163d0-external-libs.css",
    mediaType: "text/css",
    sizeBytes: 20,
    sha256: SHA,
  };
  input.rawArtifact.fileMap["assets/user-style.css"] = {
    path: "assets/user-style.css",
    mediaType: "text/css",
    sizeBytes: 20,
    sha256: SHA,
  };
  input.rawArtifact.fileMap["assets/style_asset/icons.woff2"] = {
    path: "assets/style_asset/icons.woff2",
    mediaType: "font/woff2",
    sizeBytes: 20,
    sha256: SHA,
  };
  input.rawArtifact.fileMap["assets/icons.svg"] = {
    path: "assets/icons.svg",
    mediaType: "image/svg+xml",
    sizeBytes: 20,
    sha256: SHA,
  };

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
    stylesheetCssByPath: {
      "assets/stylesheet/f625c4a163d0-external-libs.css": "@font-face{font-family:Icons;src:url('../style_asset/icons.woff2')} .hero{background-image:url('../../uploads/logo.png')}",
      "assets/user-style.css": ".page{background-image:url('/uploads/about.png')}",
    },
    acceptedFunctionalReductions: {
      kind: "legacy-forms-to-disclosed-links-v1",
      contactEmail: "sales@chs.si",
      commentLinks: "source-article",
      sourceWidgetRemovals: ["cookie-consent", "form-captcha", "back-to-top"],
    },
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  const externalHref = `/api/gnr8/runtime/preview-assets/runtime-site/${input.version.id}/assets/stylesheet/f625c4a163d0-external-libs.css`;
  const userHref = `/api/gnr8/runtime/preview-assets/runtime-site/${input.version.id}/assets/user-style.css`;

  assert.ok(rootSource.indexOf(externalHref) < rootSource.indexOf(userHref));
  assert.match(rootSource, /<style is:global>\.page-specific/);
  assert.doesNotMatch(rootSource, /href="\/styles\/global\.css"/);
  assert.doesNotMatch(rootSource, /infobar-wrapper|cookie-row|scrollIcon|h-captcha|hcaptcha\.com/i);
  assert.match(rootSource, /class="sticky-navigation"/);
  assert.match(rootSource, /class="headerFixed"/);
  assert.match(rootSource, />Privacy policy<\/a>/);
  assert.match(rootSource, /href="mailto:sales@chs\.si"/);
  assert.match(rootSource, new RegExp(`xlink:href="/api/gnr8/runtime/preview-assets/runtime-site/${input.version.id}/assets/icons\\.svg#mark"`));
  assert.ok(generated.contentManifest.requiredAssets.some((asset) => asset.path.endsWith("/assets/style_asset/icons.woff2")));
  assert.ok(generated.contentManifest.requiredAssets.some((asset) => asset.path.endsWith("/assets/icons.svg")));
  assert.ok(generated.contentManifest.requiredAssets.some((asset) => asset.path.endsWith("/uploads/logo.png")));
  assert.ok(generated.contentManifest.requiredAssets.some((asset) => asset.path.endsWith("/uploads/about.png")));
  assert.deepEqual(generated.sourceManifest.acceptedFunctionalReductions?.sourceWidgetRemovals, [
    "cookie-consent",
    "form-captcha",
    "back-to-top",
  ]);
});

test("materializes retained script-assigned CSS before the target style without executing source JavaScript", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title>
      <link rel="stylesheet" href="/assets/external.css">
      <style id="style_site">#hero{border-style:solid}</style>
    </head><body><main id="hero">Home</main><script>
      var cb=function(){var l=document.createElement('link');l.rel='stylesheet';var h=document.getElementById('style_site');h.parentNode.insertBefore(l,h);l.href='/assets/user-style.css?capture=1';};
    </script></body></html>`,
  });
  input.rawArtifact.fileMap["assets/external.css"] = {
    path: "assets/external.css", mediaType: "text/css", sizeBytes: 20, sha256: SHA,
  };
  input.rawArtifact.fileMap["assets/user-style.css"] = {
    path: "assets/user-style.css", mediaType: "text/css", sizeBytes: 20, sha256: SHA,
  };

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
    stylesheetCssByPath: {
      "assets/external.css": "body{margin:0}",
      "assets/user-style.css": "*{border-width:0;border-color:transparent}",
    },
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  const externalHref = `/api/gnr8/runtime/preview-assets/runtime-site/${input.version.id}/assets/external.css`;
  const userHref = `/api/gnr8/runtime/preview-assets/runtime-site/${input.version.id}/assets/user-style.css?capture=1`;

  assert.ok(rootSource.indexOf(externalHref) < rootSource.indexOf(userHref));
  assert.ok(rootSource.indexOf(userHref) < rootSource.indexOf('id="style_site"'));
  assert.doesNotMatch(rootSource, /createElement\(['"]link|requestAnimationFrame|<script\b/i);
  assert.equal(rootSource.match(/user-style\.css/g)?.length, 1);
});

test("uses the exact derived-capture stylesheet mapping for a script-assigned source reference", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title><style id="style_site">#hero{display:block}</style></head><body>
      <main id="hero">Home</main><script>var l=document.createElement('link');l.rel='stylesheet';var h=document.getElementById('style_site');h.parentNode.insertBefore(l,h);l.href='/assets/user-style.css?capture=1';</script>
    </body></html>`,
  });
  const derivedPath = "assets/stylesheet/derived-user-style.css";
  input.rawArtifact.fileMap[derivedPath] = {
    path: derivedPath, mediaType: "text/css", sizeBytes: 20, sha256: SHA,
  };
  input.version.importProvenanceSummary = {
    ...input.version.importProvenanceSummary,
    derivedCapture: {
      kind: "dependency_complete_derived_capture_v1",
      parentSiteVersionId: "parent-version",
      parentArtifactId: "parent-artifact",
      parentRawArtifactId: "parent-raw-artifact",
      parentFilesSha256: SHA,
      derivedFilesSha256: SHA,
      dependencyUrls: ["https://example.com/assets/user-style.css?capture=1"],
      unusedCssDependencies: [],
      rewrites: [{
        from: "https://example.com/assets/user-style.css?capture=1",
        to: `/${derivedPath}`,
      }],
      rewrittenHtmlFiles: [],
    },
  };

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
    stylesheetCssByPath: { [derivedPath]: "*{border-width:0}" },
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";

  assert.match(rootSource, /assets\/stylesheet\/derived-user-style\.css/);
  assert.doesNotMatch(rootSource, /assets\/user-style\.css\?capture=1/);
});

test("normalizes a verified lazy image and noscript fallback pair for script-disabled preview", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title></head><body>
      <div class="imageModuleWrap">
        <img src="data:image/png;base64,placeholder" alt="CHS" style="position: static; width: 1px; height: 1px; opacity: 0">
        <noscript data-lazyload-src="/uploads/logo.png"><img id="m3921" class="module image" src="/uploads/logo.png" alt="CHS" width="800" height="200"></noscript>
      </div>
      <noscript><p>Meaningful fallback-only content</p></noscript>
    </body></html>`,
  });

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";

  assert.equal(rootSource.match(/id="m3921"/g)?.length, 1);
  assert.equal(rootSource.match(/src="[^\"]*uploads\/logo\.png"/g)?.length, 1);
  assert.doesNotMatch(rootSource, /placeholder|width:\s*1px|height:\s*1px|opacity:\s*0/);
  assert.match(rootSource, /<noscript><p>Meaningful fallback-only content<\/p><\/noscript>/);
});

test("normalizes an owned preview image and source-relative noscript fallback for the same retained file", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title></head><body>
      <a href="/">
        <img src="/api/gnr8/runtime/preview-assets/runtime-site/older-version/uploads/logo.png" id="m3921" class="module image" alt="CHS" width="400" height="100">
        <noscript data-lazyload-id="m3921" data-lazyload-class="module image" data-lazyload-alt="CHS"><img id="m3921" class="module image" src="/uploads/logo.png" alt="CHS" width="400" height="100"></noscript>
      </a>
    </body></html>`,
  });

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  const expectedSrc = `/api/gnr8/runtime/preview-assets/${input.rawArtifact.siteId}/${input.rawArtifact.siteVersionId}/uploads/logo.png`;

  assert.equal(rootSource.match(/id="m3921"/g)?.length, 1);
  assert.doesNotMatch(rootSource, /<noscript[^>]*>[\s\S]{0,500}id="m3921"/i);
  assert.match(rootSource, new RegExp(expectedSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("promotes data-lazyload-src and removes only lazy-runtime initial visibility residue", () => {
  const input = fixture({
    rootHtml: `<!doctype html><html><head><title>Home</title></head><body>
      <img id="identity" src="data:image/png;base64,placeholder" data-lazyload-src="/uploads/about.png" style="position: static; width: 1px; height: 1px; opacity: 0; border-radius: 600px">
    </body></html>`,
  });

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";

  assert.match(rootSource, /id="identity"[^>]*src="[^\"]*uploads\/about\.png"/);
  assert.match(rootSource, /style="position: static; border-radius: 600px;"/);
  assert.doesNotMatch(rootSource, /width:\s*1px|height:\s*1px|opacity:\s*0/);
});

test("rejects an unresolved required local stylesheet instead of silently dropping page CSS", () => {
  const input = fixture({
    rootHtml: '<!doctype html><html><head><title>Home</title><link rel="stylesheet" href="/assets/missing.css"></head><body><h1>Home</h1></body></html>',
  });

  assert.throws(
    () => createSourceBackedAstroGenerationInput({
      siteVersion: input.version,
      artifact: input.artifact,
      rawArtifact: input.rawArtifact,
    }),
    (error) => error instanceof SourceBackedAstroUnsupportedError &&
      error.unsupportedCapabilities.includes("source_stylesheet_evidence_missing:/:/assets/missing.css"),
  );
});

test("accepted form reductions do not remove unknown functional scripts", () => {
  const input = fixture({
    rootHtml: '<html><head><title>Home</title></head><body><form id="m3166"></form><script>window.checkout = startCheckout()</script></body></html>',
  });
  assert.throws(
    () => createSourceBackedAstroGenerationInput({
      siteVersion: input.version,
      artifact: input.artifact,
      rawArtifact: input.rawArtifact,
      acceptedFunctionalReductions: {
        kind: "legacy-forms-to-disclosed-links-v1",
        contactEmail: "sales@chs.si",
        commentLinks: "source-article",
      },
    }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("scripts"),
  );
});

test("does not remove a generic api.js without security evidence inside a replaced form", () => {
  const input = fixture({
    rootHtml: '<html><head><title>Home</title></head><body><form id="m3166"><input name="email"></form><script src="/assets/script/1a0efd5f7e4f-api.js"></script></body></html>',
  });
  assert.throws(
    () => createSourceBackedAstroGenerationInput({
      siteVersion: input.version,
      artifact: input.artifact,
      rawArtifact: input.rawArtifact,
      acceptedFunctionalReductions: {
        kind: "legacy-forms-to-disclosed-links-v1",
        contactEmail: "sales@chs.si",
        commentLinks: "source-article",
      },
    }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("scripts"),
  );
});
