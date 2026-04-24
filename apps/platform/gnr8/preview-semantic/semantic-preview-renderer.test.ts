import assert from "node:assert/strict";
import test from "node:test";

import {
  renderSemanticPreview,
  SEMANTIC_PREVIEW_DIAGNOSTIC,
  shouldUseSemanticFallbackPreview,
} from "@/gnr8/preview-semantic/semantic-preview-renderer";
import type { SemanticImportResult } from "@/gnr8/import-semantic/semantic-import-engine";

function fixtureSemanticImport(): SemanticImportResult {
  return {
    sourceMode: "raw_html_only",
    captureMode: "raw_html_only",
    title: "Acme Services",
    language: "en",
    navigation: [{ label: "Home", href: "/" }],
    hero: {
      title: "Fast local services",
      subtitle: "Semantic preview hero subtitle",
      cta: { label: "Book now", url: "/contact" },
      image: { src: "/assets/hero.jpg", alt: "Hero image" },
      confidence: 1,
      diagnostics: [],
    },
    sections: [
      {
        id: "services",
        type: "services",
        title: "Services",
        intro: "What we do",
        items: [
          { title: "Repairs", description: "On-site repairs" },
          { title: "Installations", description: "Clean installations" },
        ],
        images: [],
        ctas: [],
        forms: [],
        confidence: 1,
        diagnostics: [],
      },
      {
        id: "gallery",
        type: "gallery",
        title: "Gallery",
        intro: null,
        items: [],
        images: [{ src: "/assets/gallery-1.jpg", alt: "Gallery image" }],
        ctas: [],
        forms: [],
        confidence: 1,
        diagnostics: [],
      },
    ],
    assets: {
      images: [
        { src: "/assets/hero.jpg", alt: "Hero image", role: "hero_image", sectionId: "hero" },
        { src: "/assets/gallery-1.jpg", alt: "Gallery image", role: "gallery_image", sectionId: "gallery" },
      ],
      groupedByRole: {
        logo: [],
        hero_image: ["/assets/hero.jpg"],
        gallery_image: ["/assets/gallery-1.jpg"],
        service_image: [],
        testimonial_avatar: [],
        content_image: [],
        icon: [],
        unknown: [],
      },
      knownAssets: [
        { path: "/assets/hero.jpg", mediaType: "image/jpeg" },
        { path: "/assets/gallery-1.jpg", mediaType: "image/jpeg" },
      ],
    },
    diagnostics: [],
  };
}

test("semantic preview renders hero and CTA content", () => {
  const result = renderSemanticPreview({
    siteId: "site-1",
    runtimeSiteId: "site-1",
    runtimeSiteVersionId: "sv-1",
    path: "/",
    semanticImport: fixtureSemanticImport(),
  });

  assert.equal(result.previewMode, "semantic_fallback_preview");
  assert.equal(result.html.includes("Fast local services"), true);
  assert.equal(result.html.includes("Book now"), true);
  assert.equal(result.ctaCount > 0, true);
});

test("semantic preview renders services cards", () => {
  const result = renderSemanticPreview({
    siteId: "site-2",
    runtimeSiteId: "site-2",
    runtimeSiteVersionId: "sv-2",
    path: "/",
    semanticImport: fixtureSemanticImport(),
  });

  assert.equal(result.html.includes("Repairs"), true);
  assert.equal(result.html.includes("Installations"), true);
});

test("semantic preview renders gallery images", () => {
  const result = renderSemanticPreview({
    siteId: "site-3",
    runtimeSiteId: "site-3",
    runtimeSiteVersionId: "sv-3",
    path: "/",
    semanticImport: fixtureSemanticImport(),
  });

  assert.equal(result.html.includes("/assets/gallery-1.jpg"), true);
  assert.equal(result.imageCount > 0, true);
});

test("semantic preview handles missing images gracefully", () => {
  const semanticImport = fixtureSemanticImport();
  if (semanticImport.hero?.image) semanticImport.hero.image.src = "javascript:alert(1)";
  semanticImport.sections[1]!.images = [{ src: "data:image/png;base64,AAAA", alt: "Missing image" }];
  semanticImport.assets.knownAssets = [];

  const result = renderSemanticPreview({
    siteId: "site-4",
    runtimeSiteId: "site-4",
    runtimeSiteVersionId: "sv-4",
    path: "/",
    semanticImport,
  });

  assert.equal(result.html.includes("Hero image unavailable"), true);
  assert.equal(result.diagnostics.includes(SEMANTIC_PREVIEW_DIAGNOSTIC.IMAGE_UNRESOLVED), true);
});

test("semantic fallback selector requires raw_html_only with semantic data and no rendered capture", () => {
  const semanticImport = fixtureSemanticImport();
  assert.equal(
    shouldUseSemanticFallbackPreview({
      captureMode: "raw_html_only",
      renderedCaptureUsed: false,
      semanticImport,
    }),
    true,
  );
  assert.equal(
    shouldUseSemanticFallbackPreview({
      captureMode: "raw_html_only",
      renderedCaptureUsed: true,
      semanticImport,
    }),
    false,
  );
});
