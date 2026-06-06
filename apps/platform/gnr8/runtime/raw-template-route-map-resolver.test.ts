import assert from "node:assert/strict";
import test from "node:test";

import {
  RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC,
  normalizeRawTemplateRouteMapPath,
  resolveRawTemplateRouteMapFile,
} from "@/gnr8/runtime/raw-template-route-map-resolver";
import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

function fileMap(paths: string[]) {
  return Object.fromEntries(
    paths.map((path) => [path, { path, mediaType: "text/html", sizeBytes: 100, sha256: `sha-${path}` }]),
  );
}

function provenance(): RuntimeImportProvenanceSummary {
  return {
    multiPageDiscovery: {
      summary: {
        enabled: true,
        discoveredPageCount: 3,
        skippedLinkCount: 0,
        routeCandidateCount: 3,
        manifestRef: "importProvenanceSummary.multiPageDiscovery.manifest",
        diagnostics: [],
      },
      manifest: null,
      acquisition: null,
      rawArtifactAssembly: {
        kind: "multi_page_raw_artifact_assembly_manifest_v1",
        enabled: true,
        seedUrl: "https://example.com",
        normalizedSeedUrl: "https://example.com/",
        assembledPageCount: 3,
        excludedPageCount: 0,
        failedPageCount: 0,
        routeMap: [
          {
            routePath: "/about",
            sourceUrl: "https://example.com/about",
            finalUrl: "https://example.com/about",
            rawFilePath: "pages/about/index.html",
            bodySha256: "sha-about",
            byteSize: 100,
            status: "assembled",
          },
          {
            routePath: "/contact/",
            sourceUrl: "https://example.com/contact",
            finalUrl: "https://example.com/contact/",
            rawFilePath: "pages/contact/index.html",
            bodySha256: "sha-contact",
            byteSize: 100,
            status: "assembled",
          },
          {
            routePath: "/services/item",
            sourceUrl: "https://example.com/services/item",
            finalUrl: "https://example.com/services/item",
            rawFilePath: "pages/services/item/index.html",
            bodySha256: "sha-item",
            byteSize: 100,
            status: "assembled",
          },
        ],
        htmlPathMap: {
          "/about": "pages/about/index.html",
          "/contact": "pages/contact/index.html",
          "/services/item": "pages/services/item/index.html",
        },
        excludedPages: [],
        failedPages: [],
        manifestPath: null,
        diagnostics: [],
        generatedAt: "2026-06-06T00:00:00.000Z",
      },
    },
  } as unknown as RuntimeImportProvenanceSummary;
}

test("raw template route-map resolver selects root entry HTML", () => {
  const resolved = resolveRawTemplateRouteMapFile({
    siteVersionId: "sv-route",
    requestedPath: "/",
    entryHtmlPath: "index.html",
    fileMap: fileMap(["index.html", "pages/about/index.html"]),
    importProvenanceSummary: provenance(),
    routeMapServingEnabled: true,
  });

  assert.equal(resolved.outcome, "selected");
  assert.equal(resolved.diagnosticCode, RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_ROOT_SELECTED);
  assert.equal(resolved.rawFilePath, "index.html");
});

test("raw template route-map resolver selects child routes with trailing slash normalization", () => {
  for (const requestedPath of ["/about", "/about/", "/about/index.html"]) {
    const resolved = resolveRawTemplateRouteMapFile({
      siteVersionId: "sv-route",
      requestedPath,
      entryHtmlPath: "index.html",
      fileMap: fileMap(["index.html", "pages/about/index.html"]),
      importProvenanceSummary: provenance(),
      routeMapServingEnabled: true,
    });

    assert.equal(resolved.outcome, "selected");
    assert.equal(resolved.diagnosticCode, RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_SELECTED);
    assert.equal(resolved.routePath, "/about");
    assert.equal(resolved.rawFilePath, "pages/about/index.html");
    assert.equal(resolved.sourceUrl, "https://example.com/about");
  }
});

test("raw template route-map resolver selects nested route entries", () => {
  const resolved = resolveRawTemplateRouteMapFile({
    siteVersionId: "sv-route",
    requestedPath: "/services/item/",
    entryHtmlPath: "index.html",
    fileMap: fileMap(["index.html", "pages/services/item/index.html"]),
    importProvenanceSummary: provenance(),
    routeMapServingEnabled: true,
  });

  assert.equal(resolved.outcome, "selected");
  assert.equal(resolved.routePath, "/services/item");
  assert.equal(resolved.rawFilePath, "pages/services/item/index.html");
});

test("raw template route-map resolver returns miss without falling back to root", () => {
  const resolved = resolveRawTemplateRouteMapFile({
    siteVersionId: "sv-route",
    requestedPath: "/missing",
    entryHtmlPath: "index.html",
    fileMap: fileMap(["index.html", "pages/about/index.html"]),
    importProvenanceSummary: provenance(),
    routeMapServingEnabled: true,
  });

  assert.equal(resolved.outcome, "miss");
  assert.equal(resolved.diagnosticCode, RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_MISS);
  assert.equal(resolved.routePath, "/missing");
});

test("raw template route-map resolver reports missing assembled raw file", () => {
  const resolved = resolveRawTemplateRouteMapFile({
    siteVersionId: "sv-route",
    requestedPath: "/contact",
    entryHtmlPath: "index.html",
    fileMap: fileMap(["index.html"]),
    importProvenanceSummary: provenance(),
    routeMapServingEnabled: true,
  });

  assert.equal(resolved.outcome, "file_missing");
  assert.equal(resolved.diagnosticCode, RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_FILE_MISSING);
  assert.equal(resolved.rawFilePath, "pages/contact/index.html");
});

test("raw template route-map resolver stays disabled without explicit flag or evidence", () => {
  const withoutFlag = resolveRawTemplateRouteMapFile({
    siteVersionId: "sv-route",
    requestedPath: "/about",
    entryHtmlPath: "index.html",
    fileMap: fileMap(["index.html", "pages/about/index.html"]),
    importProvenanceSummary: provenance(),
    routeMapServingEnabled: false,
  });
  const withoutEvidence = resolveRawTemplateRouteMapFile({
    siteVersionId: "sv-route",
    requestedPath: "/about",
    entryHtmlPath: "index.html",
    fileMap: fileMap(["index.html", "pages/about/index.html"]),
    importProvenanceSummary: null,
    routeMapServingEnabled: true,
  });

  assert.equal(withoutFlag.outcome, "disabled");
  assert.equal(withoutFlag.diagnosticCode, RAW_TEMPLATE_ROUTE_MAP_DIAGNOSTIC.MULTIPAGE_ROUTE_MAP_DISABLED);
  assert.equal(withoutFlag.reasonCode, "explicit_option_disabled");
  assert.equal(withoutEvidence.outcome, "disabled");
  assert.equal(withoutEvidence.reasonCode, "route_map_missing");
});

test("raw template route path normalization handles root and index variants", () => {
  assert.equal(normalizeRawTemplateRouteMapPath("/"), "/");
  assert.equal(normalizeRawTemplateRouteMapPath("/index.html"), "/");
  assert.equal(normalizeRawTemplateRouteMapPath("about/index.html?ref=1#top"), "/about");
  assert.equal(normalizeRawTemplateRouteMapPath("//services//item//"), "/services/item");
});
