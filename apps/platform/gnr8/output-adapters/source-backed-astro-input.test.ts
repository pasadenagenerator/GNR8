import assert from "node:assert/strict";
import test from "node:test";

import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RuntimeArtifact } from "@/gnr8/runtime/types";

import {
  createSourceBackedAstroGenerationInput,
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
  } as RuntimeArtifact;
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
  assert.ok(generated.sourceManifest.files.some((file) => file.path === "src/pages/about/index.astro" && file.contents.includes("<h1>About</h1>")));
  assert.ok(generated.sourceManifest.files.some((file) => file.path === "src/pages/about/index.astro" && file.contents.includes("/uploads/about.png")));
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

test("normalizes percent-encoding identity and keeps RSS as a source feed instead of an HTML route", () => {
  const input = fixture({
    rootHtml: '<html><head><title>Home</title></head><body><a href="/b/trademark%C2%AE">Article</a><a href="/blog.rss">RSS</a></body></html>',
  });
  const encodedRoute = "/b/trademark%c2%ae";
  input.version.pages.push(page(encodedRoute, "Article"));
  input.artifact.htmlByPath[encodedRoute] = '<html><head><title>Article</title></head><body><a href="/">Home</a></body></html>';
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

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
  });

  assert.ok(generated.contentManifest.requiredNavigation.some((item) => item.target === encodedRoute && item.kind === "local_route"));
  assert.ok(generated.contentManifest.requiredNavigation.some((item) => item.target === "https://example.com/blog.rss" && item.kind === "external_url"));
  assert.ok(generated.sourceManifest.files.some((file) => file.path.includes("trademark%c2%ae/index.astro")));
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
    rootHtml: `<html><head><title>Home</title></head><body>
      <form id="m3166" method="post"><input name="email"><iframe src="https://newassets.hcaptcha.com/captcha/frame"></iframe></form>
      <script src="/assets/form.js"></script><script src="https://js.hcaptcha.com/1/api.js"></script>
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

  const generated = createSourceBackedAstroGenerationInput({
    siteVersion: input.version,
    artifact: input.artifact,
    rawArtifact: input.rawArtifact,
    acceptedFunctionalReductions: {
      kind: "legacy-forms-to-disclosed-links-v1",
      contactEmail: "mailto@chs.si",
      commentLinks: "source-article",
    },
  });
  const rootSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/index.astro")?.contents ?? "";
  const aboutSource = generated.sourceManifest.files.find((file) => file.path === "src/pages/about/index.astro")?.contents ?? "";

  assert.doesNotMatch(`${rootSource}\n${aboutSource}`, /<form\b|hcaptcha|form\.js/i);
  assert.match(rootSource, /href="mailto:mailto@chs\.si"/);
  assert.match(rootSource, /does not provide the legacy contact form/);
  assert.match(aboutSource, /href="https:\/\/example\.com\/about"/);
  assert.match(aboutSource, /Open the original article to comment/);
  assert.ok(generated.contentManifest.requiredNavigation.some((item) => item.kind === "external_url" && item.target === "https://example.com/about"));
  assert.deepEqual(generated.sourceManifest.acceptedFunctionalReductions?.limitations, [
    "Legacy contact forms were replaced with disclosed mailto links to mailto@chs.si.",
    "Legacy comment forms were replaced with disclosed links to the corresponding source articles; no generated-page comment submission is provided.",
  ]);
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
        contactEmail: "mailto@chs.si",
        commentLinks: "source-article",
      },
    }),
    (error) => error instanceof SourceBackedAstroUnsupportedError && error.unsupportedCapabilities.includes("scripts"),
  );
});
