import assert from "node:assert/strict";
import test from "node:test";

import type { CanonicalImportBundle } from "../architecture/canonical-import-models";
import type { NormalizedDesignResult } from "../design-adapter";
import type { JsonValue } from "../import/import-contract";
import { stableStringify } from "../migration/runtime/diagnostics";
import { mergeCanonicalWithDesign } from "./core/merge-engine";

function baseCanonicalBundle(): CanonicalImportBundle {
  return {
    kind: "canonical_import_bundle_v1",
    version: "1.0.0",
    provenance: {
      importRunId: "import-run-1",
      sourceUrl: "https://example.com",
      sourceFingerprint: "source-fingerprint-1",
      capturedAtIso: "2026-04-14T00:00:00.000Z",
      modelVersion: "1.0.0",
    },
    evidence: [],
    structure: {
      siteId: "site-1",
      locale: "en",
      defaultPageId: "page-home",
      pages: [
        {
          id: "page-home",
          path: "/",
          title: "Home",
          purpose: "home",
          routeNodeId: "route-home",
          sectionIds: ["sec-hero", "sec-services"],
          globalRegionIds: ["region-header", "region-footer"],
          seoContentIds: ["content-seo-title", "content-seo-description"],
        },
      ],
      routeTree: [
        {
          id: "route-home",
          path: "/",
          pageId: "page-home",
          parentRouteId: null,
          titleHint: "Home",
          order: 0,
          status: "resolved",
        },
      ],
      sections: [
        {
          id: "sec-hero",
          pageId: "page-home",
          role: "hero",
          order: 0,
          domSignature: "hero",
          contentBindingIds: ["bind-hero-heading", "bind-hero-body", "bind-hero-cta-label", "bind-hero-cta-url"],
          sharedPatternId: null,
          evidenceRefs: [],
          confidence: "high",
        },
        {
          id: "sec-services",
          pageId: "page-home",
          role: "services",
          order: 1,
          domSignature: "services",
          contentBindingIds: ["bind-services-heading"],
          sharedPatternId: "pattern-service-cards",
          evidenceRefs: [],
          confidence: "high",
        },
      ],
      globalRegions: [
        {
          id: "region-header",
          type: "header",
          label: "Header",
          navigationTreeId: "nav-global",
          sectionIds: [],
          evidenceRefs: [],
        },
        {
          id: "region-footer",
          type: "footer",
          label: "Footer",
          navigationTreeId: null,
          sectionIds: [],
          evidenceRefs: [],
        },
      ],
      navigationTrees: [
        {
          id: "nav-global",
          scope: "global",
          ownerId: "site-1",
          items: [
            {
              id: "nav-item-home",
              labelContentId: "content-nav-home",
              href: "/",
              targetRouteId: "route-home",
              order: 0,
              isExternal: false,
            },
          ],
        },
      ],
      sharedPatterns: [
        {
          id: "pattern-service-cards",
          patternKind: "card_grid",
          signature: "service-cards-signature",
          sectionIds: ["sec-services"],
          reusable: true,
          confidence: "high",
        },
      ],
    },
    content: {
      records: [
        {
          id: "content-hero-heading",
          type: "heading",
          scope: "section",
          ownerId: "sec-hero",
          locale: "en",
          value: "Build Better Websites",
          required: true,
          editable: true,
          validation: { maxLength: 120, pattern: null, format: "none" },
          evidenceRefs: [],
        },
        {
          id: "content-hero-body",
          type: "rich_text",
          scope: "section",
          ownerId: "sec-hero",
          locale: "en",
          value: "Deterministic architecture-first migration and redesign.",
          required: true,
          editable: true,
          validation: { maxLength: null, pattern: null, format: "none" },
          evidenceRefs: [],
        },
        {
          id: "content-hero-cta-label",
          type: "cta_label",
          scope: "section",
          ownerId: "sec-hero",
          locale: "en",
          value: "Book a demo",
          required: true,
          editable: true,
          validation: { maxLength: 48, pattern: null, format: "none" },
          evidenceRefs: [],
        },
        {
          id: "content-hero-cta-url",
          type: "cta_url",
          scope: "section",
          ownerId: "sec-hero",
          locale: "en",
          value: "/contact",
          required: true,
          editable: true,
          validation: { maxLength: null, pattern: null, format: "url" },
          evidenceRefs: [],
        },
        {
          id: "content-services-heading",
          type: "heading",
          scope: "section",
          ownerId: "sec-services",
          locale: "en",
          value: "Services",
          required: true,
          editable: true,
          validation: { maxLength: 80, pattern: null, format: "none" },
          evidenceRefs: [],
        },
        {
          id: "content-seo-title",
          type: "seo_title",
          scope: "page",
          ownerId: "page-home",
          locale: "en",
          value: "Home | Example",
          required: false,
          editable: true,
          validation: { maxLength: 160, pattern: null, format: "none" },
          evidenceRefs: [],
        },
        {
          id: "content-seo-description",
          type: "seo_description",
          scope: "page",
          ownerId: "page-home",
          locale: "en",
          value: "A deterministic site.",
          required: false,
          editable: true,
          validation: { maxLength: 300, pattern: null, format: "none" },
          evidenceRefs: [],
        },
        {
          id: "content-nav-home",
          type: "nav_label",
          scope: "global",
          ownerId: "nav-global",
          locale: "en",
          value: "Home",
          required: true,
          editable: true,
          validation: { maxLength: 30, pattern: null, format: "none" },
          evidenceRefs: [],
        },
      ],
      bindings: [
        {
          id: "bind-hero-heading",
          contentId: "content-hero-heading",
          targetKind: "section",
          targetId: "sec-hero",
          fieldKey: "heading",
          order: 0,
        },
        {
          id: "bind-hero-body",
          contentId: "content-hero-body",
          targetKind: "section",
          targetId: "sec-hero",
          fieldKey: "body",
          order: 1,
        },
        {
          id: "bind-hero-cta-label",
          contentId: "content-hero-cta-label",
          targetKind: "section",
          targetId: "sec-hero",
          fieldKey: "cta.label",
          order: 2,
        },
        {
          id: "bind-hero-cta-url",
          contentId: "content-hero-cta-url",
          targetKind: "section",
          targetId: "sec-hero",
          fieldKey: "cta.href",
          order: 3,
        },
        {
          id: "bind-services-heading",
          contentId: "content-services-heading",
          targetKind: "section",
          targetId: "sec-services",
          fieldKey: "heading",
          order: 0,
        },
      ],
      reusableGroups: [],
    },
    style: {
      colorTokens: [
        {
          id: "color-primary",
          name: "Primary",
          valueHex8: "#112233ff",
          semanticRole: "accent",
          origin: "observed",
          confidence: 0.9,
          evidenceRefs: [],
        },
      ],
      typographyTokens: [
        {
          id: "type-body",
          role: "body",
          family: "Inter",
          weight: 400,
          sizePx: 16,
          lineHeight: 1.5,
          letterSpacing: 0,
          origin: "observed",
          confidence: 0.9,
          evidenceRefs: [],
        },
      ],
      spacingTokens: [
        {
          id: "space-md",
          name: "md",
          px: 16,
          origin: "observed",
          confidence: 0.9,
          evidenceRefs: [],
        },
      ],
      surfaceProfile: {
        radiusScalePx: [2, 4, 8],
        borderStyle: "subtle",
        shadowStyle: "soft",
        evidenceRefs: [],
      },
      componentProfile: {
        buttons: {
          variants: ["solid"],
          cornerStyle: "rounded",
          prominence: "medium",
        },
        inputs: {
          border: "thin",
          cornerStyle: "rounded",
        },
        media: {
          treatment: "framed",
          saturationHint: "balanced",
        },
        sectionTone: "corporate",
      },
      gradients: [
        {
          id: "grad-main",
          cssValue: "linear-gradient(180deg,#fff,#f7f7f7)",
          origin: "observed",
          evidenceRefs: [],
        },
      ],
      brandAssets: [],
    },
    diagnostics: [],
  };
}

function baseDesignResult(): NormalizedDesignResult {
  return {
    pages: [
      {
        id: "design-home",
        path: "/",
        sections: [
          {
            id: "design-hero",
            role: "hero",
            layoutType: "split_media",
            components: [
              {
                id: "cmp-hero",
                sectionId: "design-hero",
                type: "hero",
                variant: "split",
                props: {
                  heading: "Build Better Websites",
                  body: "Deterministic architecture-first migration and redesign.",
                  ctaLabel: "Book a demo",
                  ctaHref: "/contact",
                },
                confidence: 0.92,
              },
            ],
            warnings: [],
            confidence: 0.9,
          },
          {
            id: "design-services",
            role: "services",
            layoutType: "grid",
            components: [
              {
                id: "cmp-services-heading",
                sectionId: "design-services",
                type: "section_heading",
                variant: "default",
                props: {
                  heading: "Services",
                },
                confidence: 0.85,
              },
            ],
            warnings: [],
            confidence: 0.85,
          },
        ],
        warnings: [],
        confidence: 0.9,
      },
    ],
    globalDesign: {
      tone: "modern",
      density: "balanced",
      notes: ["design normalized"],
    },
    tokens: [],
    components: [],
    warnings: [],
  };
}

test("import page + design page successful merge", () => {
  const result = mergeCanonicalWithDesign({
    canonical: baseCanonicalBundle(),
    design: baseDesignResult(),
  });

  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0].path, "/");
  assert.equal(result.pages[0].sections.length, 2);
  assert.equal(result.pages[0].sections[0].semanticRole, "hero");
  assert.equal(result.pages[0].sections[0].components[0].kind, "hero");
  assert.equal(result.conflicts.some((conflict) => conflict.type === "missing_design_page"), false);
});

test("import-only page preserved", () => {
  const canonical = baseCanonicalBundle();
  canonical.structure.pages.push({
    id: "page-about",
    path: "/about",
    title: "About",
    purpose: "about",
    routeNodeId: "route-about",
    sectionIds: [],
    globalRegionIds: ["region-header", "region-footer"],
    seoContentIds: [],
  });
  canonical.structure.routeTree.push({
    id: "route-about",
    path: "/about",
    pageId: "page-about",
    parentRouteId: null,
    titleHint: "About",
    order: 1,
    status: "resolved",
  });

  const result = mergeCanonicalWithDesign({
    canonical,
    design: baseDesignResult(),
  });

  assert.equal(result.pages.some((page) => page.id === "page-about"), true);
  assert.equal(
    result.conflicts.some((conflict) => conflict.type === "missing_design_page" && conflict.resolution === "used_import"),
    true,
  );
});

test("design-only page diagnosed", () => {
  const design = baseDesignResult();
  design.pages.push({
    id: "design-only",
    path: "/new-page",
    sections: [],
    warnings: [],
    confidence: 0.55,
  });

  const result = mergeCanonicalWithDesign({
    canonical: baseCanonicalBundle(),
    design,
    options: { structureMode: "hybrid" },
  });

  assert.equal(result.pages.some((page) => page.path === "/new-page"), false);
  assert.equal(
    result.conflicts.some((conflict) => conflict.type === "missing_import_page" && conflict.resolution === "skipped"),
    true,
  );
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "MERGE_DESIGN_PAGE_SKIPPED"), true);
});

test("section role reconciliation uses semantic role matching", () => {
  const design = baseDesignResult();
  design.pages[0].sections = [
    {
      id: "design-services-first",
      role: "services",
      layoutType: "grid",
      components: [],
      warnings: [],
      confidence: 0.8,
    },
    {
      id: "design-hero-second",
      role: "hero",
      layoutType: "stack",
      components: [],
      warnings: [],
      confidence: 0.8,
    },
  ];

  const result = mergeCanonicalWithDesign({
    canonical: baseCanonicalBundle(),
    design,
  });

  const heroSection = result.pages[0].sections.find((section) => section.id === "sec-hero");
  const servicesSection = result.pages[0].sections.find((section) => section.id === "sec-services");

  assert.ok(heroSection);
  assert.ok(servicesSection);
  assert.equal(heroSection?.semanticRole, "hero");
  assert.equal(servicesSection?.semanticRole, "services");
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "MERGE_SECTION_MATCHED"), true);
});

test("unknown component fallback wraps generic and records diagnostics", () => {
  const design = baseDesignResult();
  design.pages[0].sections[0].components = [
    {
      id: "cmp-unknown",
      sectionId: "design-hero",
      type: "weird_super_widget",
      variant: "v1",
      props: { text: "Hello" },
      confidence: 0.8,
    },
  ];

  const result = mergeCanonicalWithDesign({
    canonical: baseCanonicalBundle(),
    design,
    options: {
      unknownComponentPolicy: "wrap_as_generic",
    },
  });

  const section = result.pages[0].sections.find((entry) => entry.id === "sec-hero");
  assert.ok(section);
  assert.equal(section?.components[0].kind, "generic");
  assert.equal(result.conflicts.some((conflict) => conflict.type === "component_unmapped"), true);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "MERGE_COMPONENT_UNMAPPED_WRAPPED"), true);
});

test("token drift diagnostic produced for major color delta", () => {
  const design = baseDesignResult();
  design.tokens = [
    {
      tokenType: "color",
      tokenId: "color-primary",
      value: "#fefefe00",
      source: "vendor",
      confidence: 0.9,
    },
  ];

  const result = mergeCanonicalWithDesign({
    canonical: baseCanonicalBundle(),
    design,
    options: { styleMode: "prefer_design" },
  });

  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "MERGE_TOKEN_DRIFT_HIGH"), true);
  assert.equal(result.conflicts.some((conflict) => conflict.type === "token_conflict"), true);
});

test("content binding generation maps component slots to canonical records", () => {
  const result = mergeCanonicalWithDesign({
    canonical: baseCanonicalBundle(),
    design: baseDesignResult(),
  });

  const hero = result.pages[0].sections.find((section) => section.id === "sec-hero");
  assert.ok(hero);

  const paths = hero!.contentBindings.map((binding) => binding.slotPath).sort();
  assert.equal(paths.includes("cmp-hero.heading"), true);
  assert.equal(paths.includes("cmp-hero.body"), true);
  assert.equal(paths.includes("cmp-hero.ctaHref"), true);
  assert.equal(hero!.contentBindings.some((binding) => binding.contentId === "content-hero-heading"), true);
});

test("deterministic repeated-run behavior", () => {
  const canonical = baseCanonicalBundle();
  const design = baseDesignResult();

  const run1 = mergeCanonicalWithDesign({ canonical, design });
  const run2 = mergeCanonicalWithDesign({ canonical, design });

  assert.equal(stableStringify(run1 as unknown as JsonValue), stableStringify(run2 as unknown as JsonValue));
});
