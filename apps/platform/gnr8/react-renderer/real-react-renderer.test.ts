import assert from "node:assert/strict";
import test from "node:test";

import type { ReactNode } from "react";

import type { ReactRenderSiteModel } from "@/gnr8/renderer-contract";
import { renderRealReactSite } from "@/gnr8/react-renderer";

type NormalizedNode =
  | string
  | number
  | boolean
  | null
  | {
      type: string;
      props: Record<string, string | number | boolean | null>;
      children: NormalizedNode[];
    };

function isElementLike(value: unknown): value is { type: unknown; props: Record<string, unknown> } {
  return typeof value === "object" && value !== null && "type" in value && "props" in value;
}

function normalizeType(type: unknown): string {
  if (typeof type === "string") return type;
  if (typeof type === "function" && type.name) return type.name;
  if (typeof type === "symbol") return String(type);
  return "unknown";
}

function normalizeNode(node: ReactNode): NormalizedNode[] {
  if (node === null || node === undefined || typeof node === "bigint") return [];
  if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
    return [node];
  }

  if (Array.isArray(node)) {
    return node.flatMap((entry) => normalizeNode(entry));
  }

  if (!isElementLike(node)) {
    return [];
  }

  const props = node.props ?? {};
  const childNodes = normalizeNode((props.children as ReactNode) ?? null);

  const normalizedProps = Object.keys(props)
    .filter((key) => key !== "children")
    .sort((a, b) => (a === b ? 0 : a < b ? -1 : 1))
    .reduce<Record<string, string | number | boolean | null>>((acc, key) => {
      const value = props[key];
      if (value === null) {
        acc[key] = null;
      } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        acc[key] = value;
      }
      return acc;
    }, {});

  return [
    {
      type: normalizeType(node.type),
      props: normalizedProps,
      children: childNodes,
    },
  ];
}

function flattenText(nodes: NormalizedNode[]): string {
  return nodes
    .map((node) => {
      if (typeof node === "string" || typeof node === "number" || typeof node === "boolean") {
        return String(node);
      }

      if (!node) return "";
      return flattenText(node.children);
    })
    .join(" ");
}

function baseSiteModel(): ReactRenderSiteModel {
  return {
    site: {
      siteId: "site-1",
      locale: "en",
      defaultPageId: "page-home",
      routes: [
        {
          routeId: "route-home",
          path: "/",
          pageId: "page-home",
          parentRouteId: null,
          order: 0,
          status: "resolved",
        },
        {
          routeId: "route-about",
          path: "/about",
          pageId: "page-about",
          parentRouteId: null,
          order: 1,
          status: "resolved",
        },
      ],
    },
    pages: [
      {
        pageId: "page-home",
        routePath: "/",
        pageRole: "home",
        seo: {
          titleContentIds: [],
          descriptionContentIds: [],
        },
        sections: [
          {
            sectionId: "sec-a",
            semanticRole: "hero",
            layoutKind: "hero",
            themeRefs: ["tokens.colors.color-primary"],
            components: [
              {
                componentId: "cmp-hero",
                renderKind: "render.hero",
                props: {},
                slots: {
                  heading: {
                    kind: "bound_content",
                    valueType: "text",
                    slotPath: "cmp-hero.heading",
                    slotKey: "heading",
                    contentId: "content-hero-heading",
                    bindingId: "bind-hero-heading",
                    confidence: 0.9,
                    fallbackValue: "[hero heading]",
                  },
                  body: {
                    kind: "bound_content",
                    valueType: "rich_text",
                    slotPath: "cmp-hero.body",
                    slotKey: "body",
                    contentId: "content-hero-body",
                    bindingId: "bind-hero-body",
                    confidence: 0.9,
                    fallbackValue: "[hero body]",
                  },
                },
                themeRefs: [],
              },
            ],
          },
        ],
      },
      {
        pageId: "page-about",
        routePath: "/about",
        pageRole: "about",
        seo: {
          titleContentIds: [],
          descriptionContentIds: [],
        },
        sections: [],
      },
    ],
    globalRegions: [
      {
        regionId: "region-header",
        type: "header",
        label: "Header",
        navigationTreeId: null,
        sectionIds: [],
        pageIds: [],
      },
    ],
    theme: {
      tokenGroups: {
        colors: {
          tokens: {
            "color-primary": "#112233ff",
          },
        },
        spacing: {
          tokens: {
            "space-md": 16,
          },
        },
        typography: {
          tokens: {
            "type-body": {
              family: "Inter",
              weight: 400,
              sizePx: 16,
              lineHeight: 1.5,
              letterSpacing: 0,
            },
          },
        },
        gradients: {
          tokens: {
            "grad-main": "linear-gradient(180deg,#fff,#f7f7f7)",
          },
        },
        surface: {
          tokens: {
            radiusScalePx: [2, 4, 8],
            borderStyle: "subtle",
            shadowStyle: "soft",
          },
        },
      },
      semanticTokens: {
        accent: "color-primary",
      },
      componentThemes: {
        section: {
          tone: "corporate",
        },
      },
    },
    diagnostics: [],
  };
}

function render(routePath: string, siteModel: ReactRenderSiteModel = baseSiteModel()) {
  const output = renderRealReactSite({
    siteModel,
    routePath,
    options: {
      diagnosticsMode: "comments",
      fallbackMode: "safe",
      includeProvenance: true,
    },
  });

  const tree = normalizeNode(output.renderedSite);
  const serialized = JSON.stringify(tree);

  return {
    ...output,
    tree,
    serialized,
    text: flattenText(tree),
  };
}

test("route resolves correct page", () => {
  const { result, serialized, text } = render("/");

  assert.equal(result.matchedPageId, "page-home");
  assert.ok(serialized.includes('"data-gnr8-page-id":"page-home"'));
  assert.ok(!text.includes("Page not found"));
});

test("unknown route renders not-found fallback", () => {
  const { result, text } = render("/missing");

  assert.equal(result.matchedPageId, null);
  assert.ok(text.includes("Page not found"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "RUNTIME_ROUTE_NOT_FOUND"));
});

test("section order preserved", () => {
  const site = baseSiteModel();
  const page = site.pages.find((candidate) => candidate.pageId === "page-home");
  assert.ok(page);

  page.sections = [
    {
      ...page.sections[0]!,
      sectionId: "sec-b",
      components: [
        {
          componentId: "cmp-b",
          renderKind: "render.heading",
          props: {},
          slots: {
            heading: {
              kind: "fallback",
              valueType: "text",
              slotPath: "cmp-b.heading",
              slotKey: "heading",
              contentId: null,
              bindingId: null,
              confidence: null,
              fallbackValue: "Section B",
            },
          },
          themeRefs: [],
        },
      ],
    },
    {
      ...page.sections[0]!,
      sectionId: "sec-a",
      components: [
        {
          componentId: "cmp-a",
          renderKind: "render.heading",
          props: {},
          slots: {
            heading: {
              kind: "fallback",
              valueType: "text",
              slotPath: "cmp-a.heading",
              slotKey: "heading",
              contentId: null,
              bindingId: null,
              confidence: null,
              fallbackValue: "Section A",
            },
          },
          themeRefs: [],
        },
      ],
    },
  ];

  const { serialized } = render("/", site);
  const b = serialized.indexOf("sec-b");
  const a = serialized.indexOf("sec-a");

  assert.ok(b > -1);
  assert.ok(a > -1);
  assert.ok(b < a);
});

test("known render kind maps to real component", () => {
  const { serialized, text } = render("/");

  assert.ok(serialized.includes('"data-gnr8-render-kind":"render.hero"'));
  assert.ok(text.includes("content-hero-heading"));
});

test("unknown render kind renders generic fallback", () => {
  const site = baseSiteModel();
  const component = site.pages[0]!.sections[0]!.components[0]!;
  component.componentId = "cmp-unknown";
  component.renderKind = "render.unmapped";

  const { result, text } = render("/", site);

  assert.ok(text.includes("Generic component fallback"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "RUNTIME_COMPONENT_UNKNOWN_KIND"));
});

test("missing props still render safely with diagnostic", () => {
  const site = baseSiteModel();
  const component = site.pages[0]!.sections[0]!.components[0]!;
  component.slots = {};
  component.props = {};

  const { result, text } = render("/", site);

  assert.ok(text.includes("hero heading"));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === "RUNTIME_COMPONENT_PROP_MISSING"));
});

test("slots render deterministically", () => {
  const site = baseSiteModel();
  site.pages[0]!.sections[0]!.components[0] = {
    componentId: "cmp-generic",
    renderKind: "render.generic",
    props: {},
    slots: {
      items: [
        {
          kind: "bound_content",
          valueType: "text",
          slotPath: "cmp-generic.items.0",
          slotKey: "items.0",
          contentId: "content-a",
          bindingId: "bind-a",
          confidence: 0.9,
          fallbackValue: "A",
        },
        {
          kind: "fallback",
          valueType: "text",
          slotPath: "cmp-generic.items.1",
          slotKey: "items.1",
          contentId: null,
          bindingId: null,
          confidence: null,
          fallbackValue: "B",
        },
      ],
      nested: {
        alpha: {
          kind: "bound_content",
          valueType: "text",
          slotPath: "cmp-generic.nested.alpha",
          slotKey: "nested.alpha",
          contentId: "content-alpha",
          bindingId: "bind-alpha",
          confidence: 0.8,
          fallbackValue: "alpha",
        },
      },
    },
    themeRefs: [],
  };

  const { serialized, text } = render("/", site);

  assert.ok(text.includes("content-a"));
  assert.ok(text.includes("content-alpha"));
  assert.ok(serialized.includes('"data-gnr8-slot-key":"items"'));
  assert.ok(serialized.includes('"data-gnr8-slot-key":"nested"'));
});

test("theme variables resolve deterministically", () => {
  const { serialized } = render("/");

  assert.ok(serialized.includes("--gnr8-color-color-primary"));
  assert.ok(serialized.includes("--gnr8-space-space-md"));
  assert.ok(serialized.includes("--gnr8-semantic-accent"));
});

test("repeated runs produce deterministic output and diagnostics order", () => {
  const site = baseSiteModel();

  const first = render("/", site);
  const second = render("/", site);

  assert.equal(first.serialized, second.serialized);
  assert.deepEqual(
    first.result.diagnostics.map((diagnostic) => `${diagnostic.code}:${diagnostic.message}`),
    second.result.diagnostics.map((diagnostic) => `${diagnostic.code}:${diagnostic.message}`),
  );
});
