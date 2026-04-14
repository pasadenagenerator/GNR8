import assert from "node:assert/strict";
import test from "node:test";

import type { FinalSiteModel } from "../merge-engine";
import type { JsonValue } from "../import/import-contract";
import { stableStringify } from "../migration/runtime/diagnostics";
import { createReactRendererContract } from "./core/renderer-contract";

function baseFinalSiteModel(): FinalSiteModel {
  return {
    site: {
      id: "site-1",
      locale: "en",
      defaultPageId: "page-home",
      routes: [
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
      navigation: [],
      provenance: {
        importRunId: "run-1",
        sourceFingerprint: "fp-1",
        capturedAtIso: "2026-04-14T00:00:00.000Z",
        mergeModes: {
          structureMode: "hybrid",
          styleMode: "hybrid",
          contentMode: "preserve_import",
          unknownComponentPolicy: "wrap_as_generic",
        },
        designPagesCount: 1,
        designWarningsCount: 0,
      },
    },
    pages: [
      {
        id: "page-home",
        path: "/",
        role: "home",
        title: "Home",
        routeNodeId: "route-home",
        seo: {
          titleContentIds: ["seo-title"],
          descriptionContentIds: ["seo-description"],
        },
        sections: [
          {
            id: "sec-hero",
            pageId: "page-home",
            semanticRole: "hero",
            layoutRole: "split_media",
            order: 0,
            components: [
              {
                id: "cmp-hero",
                sectionId: "sec-hero",
                kind: "hero",
                mappedType: "hero",
                variant: "split",
                order: 0,
                slots: [
                  { key: "heading", valueType: "text", sourceHint: "headline" },
                  { key: "body", valueType: "rich_text", sourceHint: "description" },
                  { key: "cta.label", valueType: "text", sourceHint: "button label" },
                  { key: "cta.href", valueType: "url", sourceHint: "button url" },
                  { key: "image", valueType: "image", sourceHint: "hero image" },
                ],
                tokenRefs: ["colors.color-primary"],
                fallback: {
                  wrappedAsGeneric: false,
                  reason: null,
                  rawMetadata: null,
                },
                provenance: {
                  source: "merged",
                  sourceId: "cmp-hero",
                  rationale: "Merged hero component",
                  confidence: 0.95,
                },
              },
            ],
            contentBindings: [
              {
                id: "bind-heading",
                componentId: "cmp-hero",
                sectionId: "sec-hero",
                slotPath: "cmp-hero.heading",
                contentId: "content-hero-heading",
                confidence: 0.9,
                source: "canonical_binding",
              },
              {
                id: "bind-body",
                componentId: "cmp-hero",
                sectionId: "sec-hero",
                slotPath: "cmp-hero.body",
                contentId: "content-hero-body",
                confidence: 0.9,
                source: "canonical_binding",
              },
              {
                id: "bind-cta-label",
                componentId: "cmp-hero",
                sectionId: "sec-hero",
                slotPath: "cmp-hero.cta.label",
                contentId: "content-hero-cta-label",
                confidence: 0.9,
                source: "canonical_binding",
              },
              {
                id: "bind-cta-href",
                componentId: "cmp-hero",
                sectionId: "sec-hero",
                slotPath: "cmp-hero.cta.href",
                contentId: "content-hero-cta-url",
                confidence: 0.9,
                source: "canonical_binding",
              },
              {
                id: "bind-image",
                componentId: "cmp-hero",
                sectionId: "sec-hero",
                slotPath: "cmp-hero.image",
                contentId: "content-hero-image",
                confidence: 0.9,
                source: "canonical_binding",
              },
            ],
            styleRefs: {
              colorTokenIds: ["color-primary"],
              typographyTokenIds: ["type-body"],
              spacingTokenIds: ["space-md"],
              gradientIds: ["grad-main"],
            },
            provenance: {
              source: "merged",
              sourceId: "sec-hero",
              rationale: "Merged section",
              confidence: 0.95,
            },
          },
        ],
        globalRegionIds: ["region-footer"],
        provenance: {
          source: "merged",
          sourceId: "page-home",
          rationale: "Merged page",
          confidence: 0.95,
        },
      },
    ],
    globalRegions: [
      {
        id: "region-footer",
        type: "footer",
        label: "Footer",
        navigationTreeId: null,
        sectionIds: [],
        pageIds: ["page-home"],
        provenance: {
          source: "import",
          sourceId: "region-footer",
          rationale: "Imported footer region",
          confidence: 1,
        },
      },
    ],
    tokens: {
      colors: [
        {
          id: "color-primary",
          name: "Primary",
          semanticRole: "accent",
          valueHex8: "#112233ff",
          provenance: [
            {
              source: "merged",
              sourceId: "color-primary",
              rationale: "Color merged",
              confidence: 0.9,
            },
          ],
        },
      ],
      typography: [
        {
          id: "type-body",
          role: "body",
          family: "Inter",
          weight: 400,
          sizePx: 16,
          lineHeight: 1.5,
          letterSpacing: 0,
          provenance: [
            {
              source: "merged",
              sourceId: "type-body",
              rationale: "Typography merged",
              confidence: 0.9,
            },
          ],
        },
      ],
      spacing: [
        {
          id: "space-md",
          name: "md",
          px: 16,
          provenance: [
            {
              source: "merged",
              sourceId: "space-md",
              rationale: "Spacing merged",
              confidence: 0.9,
            },
          ],
        },
      ],
      surface: {
        radiusScalePx: [2, 4, 8],
        borderStyle: "subtle",
        shadowStyle: "soft",
        provenance: [
          {
            source: "merged",
            sourceId: "surface",
            rationale: "Surface merged",
            confidence: 0.9,
          },
        ],
      },
      componentProfile: {
        buttons: { variants: ["solid"], cornerStyle: "rounded", prominence: "medium" },
        inputs: { border: "thin", cornerStyle: "rounded" },
        media: { treatment: "framed", saturationHint: "balanced" },
        sectionTone: "corporate",
        provenance: [
          {
            source: "merged",
            sourceId: "component-profile",
            rationale: "Component profile merged",
            confidence: 0.9,
          },
        ],
      },
      gradients: [
        {
          id: "grad-main",
          cssValue: "linear-gradient(180deg,#fff,#f7f7f7)",
          provenance: [
            {
              source: "merged",
              sourceId: "grad-main",
              rationale: "Gradient merged",
              confidence: 0.9,
            },
          ],
        },
      ],
    },
    reusableComponents: [],
    diagnostics: [],
    conflicts: [],
  };
}

test("final page transforms into render page", () => {
  const result = createReactRendererContract({ site: baseFinalSiteModel() });

  assert.equal(result.pages.length, 1);
  assert.equal(result.pages[0]!.pageId, "page-home");
  assert.equal(result.pages[0]!.routePath, "/");
  assert.equal(result.pages[0]!.sections.length, 1);
});

test("section ordering preserved deterministically", () => {
  const site = baseFinalSiteModel();
  site.pages[0]!.sections = [
    { ...site.pages[0]!.sections[0]!, id: "sec-b", order: 10 },
    { ...site.pages[0]!.sections[0]!, id: "sec-a", order: 1 },
  ];

  const result = createReactRendererContract({ site });
  assert.deepEqual(
    result.pages[0]!.sections.map((section) => section.sectionId),
    ["sec-a", "sec-b"],
  );
});

test("component kind maps to render kind", () => {
  const result = createReactRendererContract({ site: baseFinalSiteModel() });
  assert.equal(result.pages[0]!.sections[0]!.components[0]!.renderKind, "render.hero");
});

test("unknown component falls back safely", () => {
  const site = baseFinalSiteModel();
  const unknown = {
    ...site.pages[0]!.sections[0]!.components[0]!,
    id: "cmp-unknown",
    kind: "mystery_widget" as unknown as FinalSiteModel["pages"][number]["sections"][number]["components"][number]["kind"],
    mappedType: "",
  };
  site.pages[0]!.sections[0]!.components = [unknown];
  site.pages[0]!.sections[0]!.contentBindings = [];

  const result = createReactRendererContract({ site });
  const component = result.pages[0]!.sections[0]!.components[0]!;

  assert.equal(component.renderKind, "render.generic");
  assert.equal(component.fallback?.safeRenderable, true);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "RENDER_COMPONENT_KIND_UNKNOWN"));
});

test("content binding resolves into props", () => {
  const result = createReactRendererContract({ site: baseFinalSiteModel() });
  const component = result.pages[0]!.sections[0]!.components[0]!;
  const heading = component.slots?.heading as { kind: string; contentId: string | null };

  assert.equal(heading.kind, "bound_content");
  assert.equal(heading.contentId, "content-hero-heading");

  const ctas = component.props.ctas as Array<{ label: { contentId: string | null }; href: { contentId: string | null } }>;
  assert.equal(ctas.length, 1);
  assert.equal(ctas[0]!.label.contentId, "content-hero-cta-label");
  assert.equal(ctas[0]!.href.contentId, "content-hero-cta-url");
});

test("missing binding emits diagnostic and fallback", () => {
  const site = baseFinalSiteModel();
  site.pages[0]!.sections[0]!.contentBindings = [];

  const result = createReactRendererContract({
    site,
    options: { fallbackMode: "safe" },
  });

  const heading = result.pages[0]!.sections[0]!.components[0]!.slots?.heading as {
    kind: string;
    contentId: string | null;
    fallbackValue: unknown;
  };

  assert.equal(heading.kind, "fallback");
  assert.equal(heading.contentId, null);
  assert.equal(typeof heading.fallbackValue, "string");
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "RENDER_CONTENT_BINDING_MISSING"));
});

test("theme tokens resolve deterministically", () => {
  const site = baseFinalSiteModel();
  site.tokens.colors = [
    {
      ...site.tokens.colors[0]!,
      id: "color-z",
      semanticRole: "accent",
    },
    {
      ...site.tokens.colors[0]!,
      id: "color-a",
      semanticRole: "accent",
    },
  ];

  const result = createReactRendererContract({ site });
  assert.deepEqual(Object.keys(result.theme.tokenGroups.colors.tokens), ["color-a", "color-z"]);
  assert.equal(result.theme.semanticTokens.accent, "color-a");
});

test("renderer contract transformation is deterministic across repeated runs", () => {
  const site = baseFinalSiteModel();
  const run1 = createReactRendererContract({ site });
  const run2 = createReactRendererContract({ site });

  assert.equal(stableStringify(run1 as unknown as JsonValue), stableStringify(run2 as unknown as JsonValue));
});
