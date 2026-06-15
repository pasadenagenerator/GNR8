import assert from "node:assert/strict";
import test from "node:test";

import type { LayoutGeometryEvidence, LayoutGeometryRegion, SectionBoundaryEvidence } from "./evidence-capture-layout-contract";
import { createNavigationEvidence } from "./navigation-capture";

function region(input: Partial<LayoutGeometryRegion> & { selector: string; tagName: string }): LayoutGeometryRegion {
  return {
    regionId: input.regionId ?? `layout-region-${input.tagName}`,
    tagName: input.tagName,
    role: input.role ?? null,
    selector: input.selector,
    boundingBox: input.boundingBox ?? { x: 0, y: 0, width: 1200, height: 80 },
    childCount: input.childCount ?? 1,
  };
}

function geometry(regions: LayoutGeometryRegion[]): LayoutGeometryEvidence {
  return {
    routePath: "/",
    viewportWidth: 1200,
    viewportHeight: 800,
    documentHeight: 1800,
    regions,
    capturedAt: "2026-06-15T10:00:00.000Z",
  };
}

function section(input: Partial<SectionBoundaryEvidence> & { selector: string }): SectionBoundaryEvidence {
  return {
    sectionId: input.sectionId ?? "section-navigation",
    routePath: input.routePath ?? "/",
    selector: input.selector,
    boundingBox: input.boundingBox ?? { x: 0, y: 0, width: 1200, height: 80 },
    regionType: input.regionType ?? "navigation",
    confidenceLevel: input.confidenceLevel ?? "HIGH",
  };
}

test("extracts HIGH confidence anchors inside nav elements", () => {
  const evidence = createNavigationEvidence({
    routePath: "/",
    renderedHtml: "<!doctype html><html><body><header><nav><a href=\"/work\">Work</a><a href=\"/contact\">Contact</a></nav></header></body></html>",
    layoutGeometryEvidence: [
      geometry([
        region({
          regionId: "layout-region-nav",
          tagName: "nav",
          role: "navigation",
          selector: "body > header:nth-of-type(1) > nav:nth-of-type(1)",
        }),
      ]),
    ],
    sectionBoundaryEvidence: [],
  })[0]!;

  assert.equal(evidence.navigationCount, 2);
  assert.deepEqual(evidence.navigationItems.map((item) => item.confidenceLevel), ["HIGH", "HIGH"]);
  assert.deepEqual(evidence.navigationItems.map((item) => item.href), ["/work", "/contact"]);
  assert.equal(evidence.sourceEvidenceRefs.includes("layout-region-nav"), true);
});

test("extracts HIGH confidence links from menu roles", () => {
  const evidence = createNavigationEvidence({
    routePath: "/",
    renderedHtml: "<!doctype html><html><body><div role=\"menu\"><a href=\"/pricing\">Pricing</a></div></body></html>",
    layoutGeometryEvidence: [],
    sectionBoundaryEvidence: [],
  })[0]!;

  assert.equal(evidence.navigationItems[0]?.label, "Pricing");
  assert.equal(evidence.navigationItems[0]?.confidenceLevel, "HIGH");
});

test("extracts HIGH confidence links from header navigation section evidence", () => {
  const evidence = createNavigationEvidence({
    routePath: "/",
    renderedHtml: "<!doctype html><html><body><header><a href=\"/about\">About</a><a href=\"/book\">Book</a></header></body></html>",
    layoutGeometryEvidence: [
      geometry([
        region({
          regionId: "layout-region-header",
          tagName: "header",
          selector: "body > header:nth-of-type(1)",
        }),
      ]),
    ],
    sectionBoundaryEvidence: [
      section({
        sectionId: "section-header-navigation",
        selector: "body > header:nth-of-type(1)",
      }),
    ],
  })[0]!;

  assert.deepEqual(evidence.navigationItems.map((item) => item.confidenceLevel), ["HIGH", "HIGH"]);
  assert.equal(evidence.sourceEvidenceRefs.includes("section-header-navigation"), true);
});

test("classifies repeated navigation-like links as MEDIUM and inferred containers as LOW", () => {
  const evidence = createNavigationEvidence({
    routePath: "/",
    renderedHtml: [
      "<!doctype html><html><body>",
      "<div class=\"quick-links\"><a href=\"/one\">One</a><a href=\"/two\">Two</a></div>",
      "<div class=\"mobile-menu\"><a href=\"/menu-only\">Menu Only</a></div>",
      "<main><a href=\"/article\">Article link</a></main>",
      "</body></html>",
    ].join(""),
    layoutGeometryEvidence: [],
    sectionBoundaryEvidence: [],
  })[0]!;

  assert.deepEqual(evidence.navigationItems.map((item) => [item.label, item.confidenceLevel]), [
    ["One", "MEDIUM"],
    ["Two", "MEDIUM"],
    ["Menu Only", "LOW"],
  ]);
  assert.equal(evidence.navigationItems.some((item) => item.href === "/article"), false);
});

test("dedupes repeated navigation items and keeps deterministic positions", () => {
  const evidence = createNavigationEvidence({
    routePath: "/",
    renderedHtml: [
      "<!doctype html><html><body>",
      "<nav><a href=\"/\">Home</a><a href=\"/work\">Work</a></nav>",
      "<footer><a href=\"/\">Home</a><a href=\"/privacy\">Privacy</a></footer>",
      "</body></html>",
    ].join(""),
    layoutGeometryEvidence: [],
    sectionBoundaryEvidence: [],
  })[0]!;

  assert.deepEqual(evidence.navigationItems.map((item) => [item.label, item.href, item.position]), [
    ["Home", "/", 1],
    ["Work", "/work", 2],
    ["Privacy", "/privacy", 3],
  ]);
});
