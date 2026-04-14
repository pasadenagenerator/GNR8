import assert from "node:assert/strict";
import test from "node:test";

import type { FinalSiteModel } from "@/gnr8/merge-engine";
import type { JsonValue } from "@/gnr8/import/import-contract";
import type { ReactRenderBoundValue, ReactRenderSiteModel } from "@/gnr8/renderer-contract";
import { stableStringify } from "@/gnr8/runtime/deterministic";
import { resolveReactRenderSiteContent } from "@/gnr8/content-resolution";

function boundSlot(input: {
  slotKey: string;
  valueType: ReactRenderBoundValue["valueType"];
  contentId: string;
  fallbackValue?: unknown;
}): ReactRenderBoundValue {
  return {
    kind: "bound_content",
    valueType: input.valueType,
    slotPath: `cmp-1.${input.slotKey}`,
    slotKey: input.slotKey,
    contentId: input.contentId,
    bindingId: `bind-${input.slotKey}`,
    confidence: 1,
    fallbackValue: input.fallbackValue ?? null,
  };
}

function buildModel(input: {
  renderKind: string;
  slots: Record<string, ReactRenderBoundValue>;
  resolvedSlotValues: Record<string, unknown>;
}): { finalSiteModel: FinalSiteModel; siteModel: ReactRenderSiteModel } {
  const contentBindings = Object.keys(input.slots)
    .sort((a, b) => a.localeCompare(b))
    .map((slotKey) => ({
      id: `bind-${slotKey}`,
      componentId: "cmp-1",
      sectionId: "sec-1",
      slotPath: `cmp-1.${slotKey}`,
      contentId: input.slots[slotKey]!.contentId ?? `content-${slotKey}`,
      confidence: 1,
      source: "canonical_binding" as const,
    }));

  const resolvedContentById = Object.fromEntries(
    contentBindings
      .map((binding) => [binding.contentId, input.resolvedSlotValues[binding.slotPath.replace("cmp-1.", "")]])
      .filter((entry): entry is [string, unknown] => entry[1] != null),
  );

  const finalSiteModel: FinalSiteModel = {
    site: {
      id: "site-1",
      locale: "en",
      defaultPageId: "page-1",
      routes: [{ id: "route-1", path: "/", pageId: "page-1", parentRouteId: null, titleHint: "Home", order: 0, status: "resolved" }],
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
        designPagesCount: 0,
        designWarningsCount: 0,
      },
    },
    pages: [
      {
        id: "page-1",
        path: "/",
        role: "home",
        title: "Home",
        routeNodeId: "route-1",
        seo: { titleContentIds: [], descriptionContentIds: [] },
        sections: [
          {
            id: "sec-1",
            pageId: "page-1",
            semanticRole: "content",
            layoutRole: "stack",
            order: 0,
            components: [
              {
                id: "cmp-1",
                sectionId: "sec-1",
                kind: "generic",
                mappedType: "generic",
                variant: "default",
                order: 0,
                slots: Object.keys(input.slots)
                  .sort((a, b) => a.localeCompare(b))
                  .map((slotKey) => ({ key: slotKey, valueType: input.slots[slotKey]!.valueType, sourceHint: "runtime" })),
                tokenRefs: [],
                fallback: {
                  wrappedAsGeneric: input.renderKind === "render.generic",
                  reason: input.renderKind === "render.generic" ? "generic" : null,
                  rawMetadata: {
                    resolvedSlotValues: input.resolvedSlotValues,
                    resolvedContentById,
                  },
                },
                provenance: { source: "merged", sourceId: "cmp-1", rationale: "test", confidence: 1 },
              },
            ],
            contentBindings,
            styleRefs: {
              colorTokenIds: [],
              typographyTokenIds: [],
              spacingTokenIds: [],
              gradientIds: [],
            },
            provenance: { source: "merged", sourceId: "sec-1", rationale: "test", confidence: 1 },
          },
        ],
        globalRegionIds: [],
        provenance: { source: "merged", sourceId: "page-1", rationale: "test", confidence: 1 },
      },
    ],
    globalRegions: [],
    tokens: {
      colors: [],
      typography: [],
      spacing: [],
      surface: { radiusScalePx: [0], borderStyle: "none", shadowStyle: "flat", provenance: [] },
      componentProfile: {
        buttons: { variants: ["solid"], cornerStyle: "rounded", prominence: "medium" },
        inputs: { border: "thin", cornerStyle: "rounded" },
        media: { treatment: "edge_to_edge", saturationHint: "balanced" },
        sectionTone: "corporate",
        provenance: [],
      },
      gradients: [],
    },
    reusableComponents: [],
    diagnostics: [],
    conflicts: [],
  };

  const siteModel: ReactRenderSiteModel = {
    site: {
      siteId: "site-1",
      locale: "en",
      defaultPageId: "page-1",
      routes: [{ routeId: "route-1", path: "/", pageId: "page-1", parentRouteId: null, order: 0, status: "resolved" }],
    },
    pages: [
      {
        pageId: "page-1",
        routePath: "/",
        pageRole: "home",
        seo: { titleContentIds: [], descriptionContentIds: [] },
        sections: [
          {
            sectionId: "sec-1",
            semanticRole: "content",
            layoutKind: "stack",
            themeRefs: [],
            components: [{ componentId: "cmp-1", renderKind: input.renderKind, props: {}, slots: input.slots, themeRefs: [] }],
          },
        ],
      },
    ],
    globalRegions: [],
    theme: { tokenGroups: {}, semanticTokens: {} },
    diagnostics: [],
  };

  return { finalSiteModel, siteModel };
}

function resolvedSlot(result: ReturnType<typeof resolveReactRenderSiteContent>, key: string): ReactRenderBoundValue {
  return result.resolvedSite.pages[0]!.sections[0]!.components[0]!.slots?.[key] as ReactRenderBoundValue;
}

test("heading binding resolves real heading text", () => {
  const model = buildModel({
    renderKind: "render.heading",
    slots: { heading: boundSlot({ slotKey: "heading", valueType: "text", contentId: "content-heading" }) },
    resolvedSlotValues: { heading: "Real Heading" },
  });

  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  const heading = resolvedSlot(result, "heading");

  assert.equal((heading.resolvedValue as any).kind, "text");
  assert.equal((heading.resolvedValue as any).value, "Real Heading");
  assert.equal(heading.resolutionStatus, "resolved");
});

test("rich text binding resolves body content", () => {
  const model = buildModel({
    renderKind: "render.rich_text",
    slots: { body: boundSlot({ slotKey: "body", valueType: "rich_text", contentId: "content-body" }) },
    resolvedSlotValues: { body: "Real body paragraph." },
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  assert.equal((resolvedSlot(result, "body").resolvedValue as any).value, "Real body paragraph.");
});

test("CTA group resolves label + href", () => {
  const model = buildModel({
    renderKind: "render.cta_group",
    slots: {
      "cta.label": boundSlot({ slotKey: "cta.label", valueType: "text", contentId: "content-label" }),
      "cta.href": boundSlot({ slotKey: "cta.href", valueType: "url", contentId: "content-href" }),
    },
    resolvedSlotValues: { "cta.label": "Start now", "cta.href": "https://example.com/start" },
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  assert.equal((resolvedSlot(result, "cta.label").resolvedValue as any).value, "Start now");
  assert.equal((resolvedSlot(result, "cta.href").resolvedValue as any).value, "https://example.com/start");
});

test("image/media resolves src + alt", () => {
  const model = buildModel({
    renderKind: "render.image",
    slots: { image: boundSlot({ slotKey: "image", valueType: "image", contentId: "content-image" }) },
    resolvedSlotValues: { image: { src: "https://cdn.example.com/hero.jpg", alt: "Hero image" } },
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  const image = resolvedSlot(result, "image").resolvedValue as any;
  assert.equal(image.src, "https://cdn.example.com/hero.jpg");
  assert.equal(image.alt, "Hero image");
});

test("card grid resolves repeatable item array", () => {
  const model = buildModel({
    renderKind: "render.card_grid",
    slots: { items: boundSlot({ slotKey: "items", valueType: "list", contentId: "content-items" }) },
    resolvedSlotValues: {
      items: [
        { title: "Card A", body: "A body" },
        { title: "Card B", body: "B body" },
      ],
    },
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  const items = (resolvedSlot(result, "items").resolvedValue as any).items;
  assert.equal(items.length, 2);
  assert.equal(items[0]!.title.value, "Card A");
});

test("FAQ resolves question/answer items", () => {
  const model = buildModel({
    renderKind: "render.faq",
    slots: { items: boundSlot({ slotKey: "items", valueType: "list", contentId: "content-faq" }) },
    resolvedSlotValues: {
      items: [
        { question: "What is this?", answer: "A deterministic test." },
        { question: "How?", answer: "With explicit mapping." },
      ],
    },
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  const faq = (resolvedSlot(result, "items").resolvedValue as any).items;
  assert.equal(faq[0]!.question.value, "What is this?");
  assert.equal(faq[0]!.answer.value, "A deterministic test.");
});

test("partial content truth yields degraded resolution", () => {
  const model = buildModel({
    renderKind: "render.image",
    slots: { image: boundSlot({ slotKey: "image", valueType: "image", contentId: "content-image" }) },
    resolvedSlotValues: { image: { src: "https://cdn.example.com/partial.jpg" } },
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  assert.equal(resolvedSlot(result, "image").resolutionStatus, "degraded_resolved");
  assert.equal(result.contentResolutionDegraded, true);
});

test("missing binding yields deterministic unresolved fallback", () => {
  const model = buildModel({
    renderKind: "render.heading",
    slots: { heading: boundSlot({ slotKey: "heading", valueType: "text", contentId: "content-heading", fallbackValue: "[safe heading]" }) },
    resolvedSlotValues: {},
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: null, siteModel: model.siteModel });
  assert.equal(resolvedSlot(result, "heading").resolutionStatus, "unresolved_fallback");
  assert.equal((resolvedSlot(result, "heading").resolvedValue as any).value, "[safe heading]");
});

test("generic component resolves nested slots when possible", () => {
  const model = buildModel({
    renderKind: "render.generic",
    slots: { items: boundSlot({ slotKey: "items", valueType: "list", contentId: "content-nested" }) },
    resolvedSlotValues: {
      items: [
        { title: "Nested One", link: "https://example.com/one" },
        { title: "Nested Two", link: "https://example.com/two" },
      ],
    },
  });
  const result = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  const items = (resolvedSlot(result, "items").resolvedValue as any).items;
  assert.equal(items[1]!.link.value, "https://example.com/two");
});

test("repeated identical input yields identical resolved output", () => {
  const model = buildModel({
    renderKind: "render.hero",
    slots: {
      heading: boundSlot({ slotKey: "heading", valueType: "text", contentId: "content-heading" }),
      body: boundSlot({ slotKey: "body", valueType: "rich_text", contentId: "content-body" }),
    },
    resolvedSlotValues: { heading: "Stable", body: "Stable body" },
  });

  const a = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });
  const b = resolveReactRenderSiteContent({ finalSiteModel: model.finalSiteModel, siteModel: model.siteModel });

  assert.equal(stableStringify(a.resolvedSite as unknown as JsonValue), stableStringify(b.resolvedSite as unknown as JsonValue));
  assert.equal(stableStringify(a.diagnostics as unknown as JsonValue), stableStringify(b.diagnostics as unknown as JsonValue));
  assert.equal(a.resolvedContentCount, b.resolvedContentCount);
  assert.equal(a.unresolvedContentCount, b.unresolvedContentCount);
});
