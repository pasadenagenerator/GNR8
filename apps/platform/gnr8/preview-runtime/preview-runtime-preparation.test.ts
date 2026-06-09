import assert from "node:assert/strict";
import test from "node:test";

import { PREVIEW_RUNTIME_DIAGNOSTIC } from "@/gnr8/preview-runtime/preview-runtime-diagnostics";
import { selectPreviewRuntimeMode } from "@/gnr8/preview-runtime/preview-mode-selector";
import { preparePreviewRuntime } from "@/gnr8/preview-runtime/preview-runtime-preparation";
import { resolveSiteWorkspacePreview } from "@/gnr8/site/site-preview-contract";
import type { PreviewRuntimeSummary } from "@/gnr8/preview-runtime/preview-runtime-types";

function summaryFromSelection(input: {
  mode: PreviewRuntimeSummary["previewMode"];
  diagnostics: string[];
  renderedWithFallback?: boolean;
  matchedPageId?: string | null;
  resolvedContentCount?: number;
  unresolvedContentCount?: number;
  contentResolutionDegraded?: boolean;
  contentResolutionDiagnostics?: string[];
}): PreviewRuntimeSummary {
  return {
    previewMode: input.mode,
    rendererContractAvailable: input.mode !== "fallback_preview",
    finalSiteModelAvailable: input.mode !== "fallback_preview",
    familyRenderUsed: false,
    familyRenderFamilyId: null,
    familyRenderMode: "page_fallback",
    familyRenderFallbackToPage: true,
    familyRenderDiagnosticsCount: 0,
    familyRenderDiagnostics: [],
    renderedWithFallback: Boolean(input.renderedWithFallback),
    matchedPageId: input.matchedPageId ?? (input.mode === "fallback_preview" ? null : "page-home"),
    contentResolutionApplied: input.mode !== "fallback_preview",
    resolvedContentCount: input.resolvedContentCount ?? 0,
    unresolvedContentCount: input.unresolvedContentCount ?? 0,
    contentResolutionDegraded: Boolean(input.contentResolutionDegraded),
    contentResolutionDiagnostics: [...new Set(input.contentResolutionDiagnostics ?? [])].sort((a, b) => a.localeCompare(b)),
    previewDiagnostics: [...new Set([...input.diagnostics, PREVIEW_RUNTIME_DIAGNOSTIC.MODE_PERSISTED])].sort((a, b) => a.localeCompare(b)),
  };
}

test("full truth -> react_preview", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "react_preview");
});

test("partial truth -> react_preview_degraded", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: true,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "react_preview_degraded");
});

test("insufficient truth -> fallback_preview", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: false,
    rendererContractAvailable: false,
    rendererSucceeded: false,
    rendererMatchedPage: false,
    hasMeaningfulRenderableStructure: false,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "fallback_preview");
});

test("renderer contract unavailable -> fallback", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: false,
    rendererSucceeded: false,
    rendererMatchedPage: false,
    hasMeaningfulRenderableStructure: false,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "fallback_preview");
  assert.ok(selected.diagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_CONTRACT_UNAVAILABLE));
});

test("renderer runtime failure -> fallback with diagnostics", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: false,
    rendererMatchedPage: false,
    hasMeaningfulRenderableStructure: false,
    rendererUsedFallback: false,
    rendererRuntimeFailed: true,
  });
  assert.equal(selected.mode, "fallback_preview");
  assert.ok(selected.diagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.RENDERER_RUNTIME_FAILED));
});

test("rendered capture availability blocks fallback mode selection", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: false,
    rendererContractAvailable: false,
    rendererSucceeded: false,
    rendererMatchedPage: false,
    hasMeaningfulRenderableStructure: false,
    rendererUsedFallback: false,
    rendererRuntimeFailed: true,
    renderedCaptureAvailable: true,
  });
  assert.equal(selected.mode, "react_preview_degraded");
  assert.ok(selected.diagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.PREVIEW_MODE_FROM_RENDERED_CAPTURE));
});

test("preparePreviewRuntime treats partial rendered evidence as rendered-capture available", () => {
  const prepared = preparePreviewRuntime({
    siteVersion: {
      id: "sv-partial-rendered",
      siteId: "site-partial-rendered",
      versionNo: 1,
      state: "DRAFT",
      source: "migration",
      actor: "test",
      createdAt: "2026-04-16T00:00:00.000Z",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      artifactId: null,
      importProvenanceSummary: {
        kind: "runtime_import_provenance_summary_v1",
        sourceMode: "rendered_dom",
        importFidelityStatus: "degraded_import",
        renderedCaptureStatus: "partial",
        renderedDomQuality: "weak",
        screenshotCount: 1,
        computedStyleSampleCount: 1,
        renderedCapture: {
          used: true,
          status: "partial",
          quality: "weak",
          domLength: 140,
          nodeCount: 5,
          styleSampleCount: 1,
          styleCoverage: 0.1,
          screenshots: {
            viewport: true,
            fullPage: false,
          },
          execution: {
            runtimeKind: "nodejs",
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            environmentStatus: "supported",
            failureCategory: "none",
            failureCode: null,
            browserLaunch: "succeeded",
            navigation: "succeeded",
            dom: "captured",
            screenshot: "captured",
            styleSampling: "captured",
          },
        },
        importDiagnosticCodes: [],
        captureEvidence: {
          selectedSourceHtmlPath: "/tmp/snapshot/rendered/dom.html",
          responseHtmlPath: "/tmp/snapshot/response-html.raw.html",
          entryHtmlPath: "/tmp/snapshot/index.html",
          renderedCaptureManifestPath: "/tmp/snapshot/rendered-capture.json",
          acquisitionEvidencePath: "/tmp/snapshot/acquisition-evidence.json",
          renderedDomPath: "/tmp/snapshot/rendered/dom.html",
          computedStylesPath: "/tmp/snapshot/rendered/computed-styles.json",
          renderedViewportScreenshotPath: "/tmp/snapshot/rendered/screenshots/viewport.png",
          renderedFullpageScreenshotPath: null,
          screenshotPaths: ["/tmp/snapshot/rendered/screenshots/viewport.png"],
        },
        styleSignals: null,
      },
      pages: [],
    },
    routePath: "/",
  } as any);

  assert.equal(prepared.mode, "react_preview_degraded");
  assert.ok(prepared.summary.previewDiagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.PREVIEW_MODE_FROM_RENDERED_CAPTURE));
});

test("renderer generic fallback counts as degraded React preview, not total fallback", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: true,
    rendererRuntimeFailed: false,
  });
  assert.equal(selected.mode, "react_preview_degraded");
});

test("persisted preview summary reflects chosen mode", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  });
  const summary = summaryFromSelection({
    mode: selected.mode,
    diagnostics: selected.diagnostics,
    renderedWithFallback: false,
    matchedPageId: "page-home",
  });

  assert.equal(summary.previewMode, "react_preview");
  assert.ok(summary.previewDiagnostics.includes(PREVIEW_RUNTIME_DIAGNOSTIC.MODE_PERSISTED));
});

test("read-model/shell selection prefers latest truthful preview mode", () => {
  const selected = selectPreviewRuntimeMode({
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: true,
    rendererRuntimeFailed: false,
  });
  const summary = summaryFromSelection({
    mode: selected.mode,
    diagnostics: selected.diagnostics,
    renderedWithFallback: true,
    matchedPageId: "page-home",
  });
  const resolved = resolveSiteWorkspacePreview({
    siteVersionId: "site-version-1",
    transformedPreviewAvailable: true,
    debugPreviewAvailable: true,
    importCaptured: true,
    previewRuntimeSummary: summary,
  });

  assert.equal(resolved.previewMode, "react_preview_degraded");
  assert.equal(resolved.previewRuntimeSummary?.previewMode, "react_preview_degraded");
});

test("repeated identical input yields identical preview mode/diagnostics", () => {
  const input = {
    finalSiteModelAvailable: true,
    rendererContractAvailable: true,
    rendererSucceeded: true,
    rendererMatchedPage: true,
    hasMeaningfulRenderableStructure: true,
    rendererUsedFallback: false,
    rendererRuntimeFailed: false,
  } as const;
  const first = selectPreviewRuntimeMode(input);
  const second = selectPreviewRuntimeMode(input);

  assert.equal(first.mode, second.mode);
  assert.deepEqual(first.diagnostics, second.diagnostics);
});

test("preview/runtime summary records deterministic content-resolution counts", () => {
  const prepared = preparePreviewRuntime({
    siteVersion: {
      id: "sv-1",
      siteId: "site-1",
      versionNo: 1,
      state: "DRAFT",
      source: "migration",
      actor: "test",
      createdAt: "2026-04-14T00:00:00.000Z",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      artifactId: null,
      pages: [
        {
          id: "pv-1",
          siteVersionId: "sv-1",
          pageId: "page-home",
          path: "/",
          title: "Home",
          structureModel: {
            sections: [{ id: "sec-hero", type: "hero", order: 0 }],
          },
          contentModel: {
            sectionProps: {
              "sec-hero": {
                heading: "Preview Heading",
                body: "Preview Body",
                ctaLabel: "Get Started",
                ctaHref: "https://example.com/start",
              },
            },
          },
          styleTokens: {},
          assetGraph: [],
          semanticSignals: [],
          source: "migration",
          actor: "test",
          createdAt: "2026-04-14T00:00:00.000Z",
        },
      ],
    },
    routePath: "/",
  });

  assert.equal(prepared.summary.contentResolutionApplied, true);
  assert.equal(prepared.summary.resolvedContentCount > 0, true);
  assert.equal(prepared.summary.unresolvedContentCount >= 0, true);
  assert.equal(Array.isArray(prepared.summary.contentResolutionDiagnostics), true);
});

test("family render mode is surfaced when deterministic family truth exists", () => {
  const prepared = preparePreviewRuntime({
    siteVersion: {
      id: "sv-2",
      siteId: "site-1",
      versionNo: 1,
      state: "DRAFT",
      source: "migration",
      actor: "test",
      createdAt: "2026-04-14T00:00:00.000Z",
      rendererCompatibilityVersion: "gnr8-renderer-v1",
      artifactId: null,
      importProvenanceSummary: {
        kind: "runtime_import_provenance_summary_v1",
        sourceMode: "raw_html_fallback",
        importFidelityStatus: "degraded_import",
        renderedCaptureStatus: "failed",
        renderedDomQuality: "weak",
        screenshotCount: 0,
        computedStyleSampleCount: 0,
        renderedCapture: {
          used: false,
          status: "failed",
          quality: "weak",
          domLength: 0,
          nodeCount: 0,
          styleSampleCount: 0,
          styleCoverage: 0,
          screenshots: { viewport: false, fullPage: false },
          execution: {
            runtimeKind: "unknown",
            environmentSupported: false,
            browserPackageAvailable: false,
            browserBinaryAvailable: false,
            environmentStatus: "unknown",
            failureCategory: "none",
            failureCode: null,
            browserLaunch: "not_attempted",
            navigation: "not_attempted",
            dom: "not_attempted",
            screenshot: "none",
            styleSampling: "not_attempted",
          },
        },
        importDiagnosticCodes: [],
        captureEvidence: {
          selectedSourceHtmlPath: null,
          responseHtmlPath: null,
          entryHtmlPath: null,
          renderedCaptureManifestPath: null,
          acquisitionEvidencePath: null,
          renderedDomPath: null,
          computedStylesPath: null,
          renderedViewportScreenshotPath: null,
          renderedFullpageScreenshotPath: null,
          screenshotPaths: [],
        },
        styleSignals: null,
        templateFamilies: {
          summary: {
            familyCount: 1,
            largestFamilySize: 2,
            orphanPageCount: 0,
            diagnostics: [],
          },
          families: {
            siteId: "site-1",
            families: [
              {
                familyId: "family_marketing_root",
                familyType: "marketing",
                pageIds: ["page-home", "page-about"],
                sharedLayout: {},
                sectionPattern: [],
                diagnostics: [],
              },
            ],
            pageMappings: [
              { pageId: "page-home", familyId: "family_marketing_root", assignmentReason: "root" },
              { pageId: "page-about", familyId: "family_marketing_root", assignmentReason: "root" },
            ],
            summary: {
              familyCount: 1,
              largestFamilySize: 2,
              orphanPageCount: 0,
            },
            diagnostics: [],
          },
        },
      },
      pages: [
        {
          id: "pv-1",
          siteVersionId: "sv-2",
          pageId: "page-home",
          path: "/",
          title: "Home",
          structureModel: {
            sections: [{ id: "sec-hero-home", type: "hero", order: 0 }],
          },
          contentModel: {
            sectionProps: {
              "sec-hero-home": { heading: "Home Heading" },
            },
          },
          styleTokens: {},
          assetGraph: [],
          semanticSignals: [],
          source: "migration",
          actor: "test",
          createdAt: "2026-04-14T00:00:00.000Z",
        },
        {
          id: "pv-2",
          siteVersionId: "sv-2",
          pageId: "page-about",
          path: "/about",
          title: "About",
          structureModel: {
            sections: [{ id: "sec-hero-about", type: "hero", order: 0 }],
          },
          contentModel: {
            sectionProps: {
              "sec-hero-about": { heading: "About Heading" },
            },
          },
          styleTokens: {},
          assetGraph: [],
          semanticSignals: [],
          source: "migration",
          actor: "test",
          createdAt: "2026-04-14T00:00:00.000Z",
        },
      ],
    },
    routePath: "/about",
  });

  assert.equal(prepared.summary.familyRenderMode !== "page_fallback", true);
  assert.equal(prepared.summary.familyRenderUsed, true);
  assert.equal(prepared.summary.familyRenderFamilyId, "family_marketing_root");
  assert.equal(prepared.summary.familyRenderDiagnosticsCount > 0, true);
  assert.equal(prepared.summary.familyRenderDiagnosticsCount, prepared.summary.familyRenderDiagnostics.length);
  assert.deepEqual(
    prepared.summary.familyRenderDiagnostics,
    [...prepared.summary.familyRenderDiagnostics].sort((a, b) => a.localeCompare(b)),
  );
  assert.deepEqual(
    prepared.summary.familyRenderDiagnostics,
    [...new Set(prepared.summary.familyRenderDiagnostics)].sort((a, b) => a.localeCompare(b)),
  );
});

function transformedPage(input: {
  siteVersionId: string;
  pageId: string;
  path: string;
  title: string;
  sections: Array<{ id: string; type: string; order: number; props: Record<string, unknown> }>;
  headingFontFamily?: string;
}) {
  return {
    id: `pv-${input.pageId}`,
    siteVersionId: input.siteVersionId,
    pageId: input.pageId,
    path: input.path,
    title: input.title,
    structureModel: {
      sections: input.sections.map((section) => ({
        id: section.id,
        type: section.type,
        order: section.order,
      })),
    },
    contentModel: {
      sectionProps: Object.fromEntries(input.sections.map((section) => [section.id, section.props])),
    },
    styleTokens: {
      ...(input.headingFontFamily
        ? {
            "typography.heading.fontFamily": input.headingFontFamily,
            "typography.body.fontFamily": "Inter",
            "typography.heading.source": "computed_style",
          }
        : {}),
    },
    assetGraph: [],
    semanticSignals: [],
    source: "migration",
    actor: "test",
    createdAt: "2026-06-09T00:00:00.000Z",
  } as any;
}

function viroidocLikeTransformedSiteVersion() {
  const siteVersionId = "sv-viroidoc-transformed";
  const homeIntro = {
    heading: "Advanced Research on Viroid Pathogenesis",
    body: "We investigate viroids, plant disease mechanisms, and host-pathogen interactions.",
  };
  const latestNews = {
    heading: "Latest News",
    items: [
      { title: "Paper accepted", body: "Research update" },
      { title: "Conference talk", body: "Lab update" },
    ],
  };
  return {
    id: siteVersionId,
    siteId: "site-viroidoc-transformed",
    versionNo: 1,
    state: "DRAFT",
    source: "migration",
    actor: "test",
    createdAt: "2026-06-09T00:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: null,
    importProvenanceSummary: {
      renderedCapture: { status: "available", nodeCount: 20, domLength: 2000 },
      screenshotCount: 1,
      multiPageDiscovery: {
        rawArtifactAssembly: {
          routeMap: [
            { routePath: "/", rawFilePath: "pages/root/index.html" },
            { routePath: "/news", rawFilePath: "pages/news/index.html" },
            { routePath: "/blog", rawFilePath: "pages/blog/index.html" },
            { routePath: "/project", rawFilePath: "pages/project/index.html" },
          ],
        },
      },
    },
    pages: [
      transformedPage({
        siteVersionId,
        pageId: "page-home",
        path: "/",
        title: "Home",
        headingFontFamily: "Source Serif 4",
        sections: [
          { id: "home-intro-a", type: "hero", order: 0, props: homeIntro },
          { id: "home-intro-b", type: "hero", order: 1, props: homeIntro },
          { id: "home-intro-c", type: "hero", order: 2, props: homeIntro },
          { id: "home-latest-news", type: "latest-news", order: 3, props: latestNews },
        ],
      }),
      transformedPage({
        siteVersionId,
        pageId: "page-news",
        path: "/news",
        title: "News",
        headingFontFamily: "Source Serif 4",
        sections: [
          { id: "news-home-intro-a", type: "hero", order: 0, props: homeIntro },
          { id: "news-home-intro-b", type: "hero", order: 1, props: homeIntro },
          { id: "news-listing", type: "news-listing", order: 2, props: { heading: "Full News Listing", items: latestNews.items } },
        ],
      }),
      transformedPage({
        siteVersionId,
        pageId: "page-blog",
        path: "/blog",
        title: "Blog",
        headingFontFamily: "Source Serif 4",
        sections: [
          { id: "blog-home-intro-a", type: "hero", order: 0, props: homeIntro },
          { id: "blog-home-intro-b", type: "hero", order: 1, props: homeIntro },
          { id: "blog-listing", type: "blog-listing", order: 2, props: { heading: "Blog Posts", items: latestNews.items } },
        ],
      }),
      transformedPage({
        siteVersionId,
        pageId: "page-project",
        path: "/project",
        title: "Project",
        headingFontFamily: "Source Serif 4",
        sections: [
          { id: "project-hero", type: "hero", order: 0, props: { heading: "Project", body: "Project page content only." } },
          { id: "project-body", type: "content", order: 1, props: { heading: "Research Goals", body: "Project-specific material." } },
        ],
      }),
    ],
  } as any;
}

test("Viroidoc-like transformed home removes repeated intro blocks before latest news and preserves heading font evidence", () => {
  const prepared = preparePreviewRuntime({
    siteVersion: viroidocLikeTransformedSiteVersion(),
    routePath: "/",
  });
  const home = prepared.finalSiteModel?.pages.find((page) => page.path === "/");
  assert.deepEqual(home?.sections.map((section) => section.id), ["home-intro-a", "home-latest-news"]);

  const assembly = prepared.summary.transformedAssemblyDiagnostics;
  assert.equal(assembly?.selectedRoutePath, "/");
  assert.equal(assembly?.selectedSourceRawFile, "pages/root/index.html");
  assert.equal(assembly?.semanticSectionCount, 4);
  assert.equal(assembly?.transformedRouteSectionCountBeforeHydration, 2);
  assert.equal(assembly?.duplicateRemovalCount, 2);
  assert.equal(assembly?.clientHydrationMode, "idempotent");
  assert.equal(assembly?.listingDetection.detected, true);
  assert.equal(assembly?.listingDetection.sectionId, "home-latest-news");
  assert.deepEqual(assembly?.removedDuplicateSectionIds, ["home-intro-b", "home-intro-c"]);
  assert.equal(assembly?.repeatedSectionFingerprints[0]?.count, 3);
  assert.equal(assembly?.headingStyleSource.source, "computed_style");
  assert.equal(assembly?.headingStyleSource.headingFontFamily, "Source Serif 4");

  const typographyTokens = Object.values(prepared.reactRenderSiteModel?.theme.tokenGroups.typography.tokens ?? {});
  const headingToken = typographyTokens.find((token) => token.role === "heading");
  assert.equal(headingToken?.family, "Source Serif 4");
});

test("Viroidoc-like transformed news/blog remove repeated home intro blocks while project remains isolated", () => {
  const siteVersion = viroidocLikeTransformedSiteVersion();
  const newsPrepared = preparePreviewRuntime({ siteVersion, routePath: "/news" });
  const news = newsPrepared.finalSiteModel?.pages.find((page) => page.path === "/news");
  assert.deepEqual(news?.sections.map((section) => section.id), ["news-home-intro-a", "news-listing"]);
  assert.deepEqual(newsPrepared.summary.transformedAssemblyDiagnostics?.removedDuplicateSectionIds, ["news-home-intro-b"]);
  assert.equal(newsPrepared.summary.transformedAssemblyDiagnostics?.listingDetection.sectionId, "news-listing");

  const blogPrepared = preparePreviewRuntime({ siteVersion, routePath: "/blog" });
  const blog = blogPrepared.finalSiteModel?.pages.find((page) => page.path === "/blog");
  assert.deepEqual(blog?.sections.map((section) => section.id), ["blog-home-intro-a", "blog-listing"]);
  assert.deepEqual(blogPrepared.summary.transformedAssemblyDiagnostics?.removedDuplicateSectionIds, ["blog-home-intro-b"]);

  const projectPrepared = preparePreviewRuntime({ siteVersion, routePath: "/project" });
  const project = projectPrepared.finalSiteModel?.pages.find((page) => page.path === "/project");
  assert.deepEqual(project?.sections.map((section) => section.id), ["project-hero", "project-body"]);
  assert.equal(projectPrepared.summary.transformedAssemblyDiagnostics?.listingDetection.detected, false);
  assert.deepEqual(projectPrepared.summary.transformedAssemblyDiagnostics?.removedDuplicateSectionIds, []);
});

test("Viroidoc-like transformed preparation is idempotent across repeated route preparation", () => {
  const siteVersion = viroidocLikeTransformedSiteVersion();
  const first = preparePreviewRuntime({ siteVersion, routePath: "/news" });
  const second = preparePreviewRuntime({ siteVersion, routePath: "/news" });
  const firstNews = first.finalSiteModel?.pages.find((page) => page.path === "/news");
  const secondNews = second.finalSiteModel?.pages.find((page) => page.path === "/news");

  assert.deepEqual(firstNews?.sections.map((section) => section.id), ["news-home-intro-a", "news-listing"]);
  assert.deepEqual(secondNews?.sections.map((section) => section.id), ["news-home-intro-a", "news-listing"]);
  assert.equal(firstNews?.sections.length, secondNews?.sections.length);
  assert.deepEqual(first.summary.transformedAssemblyDiagnostics, second.summary.transformedAssemblyDiagnostics);
});
