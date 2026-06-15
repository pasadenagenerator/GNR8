import assert from "node:assert/strict";
import test from "node:test";

import type { LayoutGeometryEvidence, LayoutGeometryRegion } from "./evidence-capture-layout-contract";
import { createSectionBoundaryEvidence } from "./section-boundary-capture";

function region(input: Partial<LayoutGeometryRegion> & { selector: string; tagName: string; y?: number; height?: number }): LayoutGeometryRegion {
  return {
    regionId: input.regionId ?? `region-${input.tagName}`,
    tagName: input.tagName,
    role: input.role ?? null,
    selector: input.selector,
    boundingBox: input.boundingBox ?? { x: 0, y: input.y ?? 0, width: 1200, height: input.height ?? 360 },
    childCount: input.childCount ?? 1,
  };
}

function geometry(regions: LayoutGeometryRegion[]): LayoutGeometryEvidence {
  return {
    routePath: "/",
    viewportWidth: 1200,
    viewportHeight: 800,
    documentHeight: 2400,
    regions,
    capturedAt: "2026-06-15T10:00:00.000Z",
  };
}

function classify(renderedHtml: string, item: LayoutGeometryRegion) {
  return createSectionBoundaryEvidence({
    renderedHtml,
    layoutGeometryEvidence: [geometry([item])],
  })[0]!;
}

test("classifies a near-top large H1 section as hero", () => {
  const evidence = classify(
    "<!doctype html><html><body><main><section><h1>Launch faster</h1><a class=\"primary btn\" href=\"/start\">Start</a></section></main></body></html>",
    region({
      tagName: "section",
      selector: "body > main:nth-of-type(1) > section:nth-of-type(1)",
      y: 96,
      height: 420,
    }),
  );

  assert.equal(evidence.regionType, "hero");
  assert.equal(evidence.confidenceLevel, "HIGH");
});

test("classifies nav elements and menu roles as navigation", () => {
  const evidence = classify(
    "<!doctype html><html><body><header><nav><a href=\"/work\">Work</a></nav></header></body></html>",
    region({
      tagName: "nav",
      role: "navigation",
      selector: "body > header:nth-of-type(1) > nav:nth-of-type(1)",
      height: 72,
    }),
  );

  assert.equal(evidence.regionType, "navigation");
  assert.equal(evidence.confidenceLevel, "HIGH");
});

test("classifies footer elements as footer", () => {
  const evidence = classify(
    "<!doctype html><html><body><footer><p>Copyright</p></footer></body></html>",
    region({
      tagName: "footer",
      selector: "body > footer:nth-of-type(1)",
      y: 2100,
      height: 180,
    }),
  );

  assert.equal(evidence.regionType, "footer");
});

test("classifies regions containing a form as form", () => {
  const evidence = classify(
    "<!doctype html><html><body><main><section><form action=\"/contact\"><input name=\"email\"></form></section></main></body></html>",
    region({
      tagName: "section",
      selector: "body > main:nth-of-type(1) > section:nth-of-type(1)",
      y: 700,
    }),
  );

  assert.equal(evidence.regionType, "form");
});

test("classifies repeated image sections as gallery", () => {
  const evidence = classify(
    "<!doctype html><html><body><main><section><img src=\"/1.jpg\"><img src=\"/2.jpg\"><img src=\"/3.jpg\"></section></main></body></html>",
    region({
      tagName: "section",
      selector: "body > main:nth-of-type(1) > section:nth-of-type(1)",
      y: 900,
    }),
  );

  assert.equal(evidence.regionType, "gallery");
});

test("classifies map iframe containers as map", () => {
  const evidence = classify(
    "<!doctype html><html><body><main><section class=\"map-container\"><iframe src=\"https://www.google.com/maps/embed?pb=abc\"></iframe></section></main></body></html>",
    region({
      tagName: "section",
      selector: "body > main:nth-of-type(1) > section:nth-of-type(1)",
      y: 1200,
    }),
  );

  assert.equal(evidence.regionType, "map");
});

test("classifies unrecognized structural regions as unknown fallback", () => {
  const evidence = classify(
    "<!doctype html><html><body><header><span></span></header></body></html>",
    region({
      tagName: "header",
      selector: "body > header:nth-of-type(1)",
      height: 80,
      childCount: 0,
    }),
  );

  assert.equal(evidence.regionType, "unknown");
  assert.equal(evidence.confidenceLevel, "LOW");
});
