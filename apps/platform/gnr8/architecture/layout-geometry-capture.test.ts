import assert from "node:assert/strict";
import test from "node:test";

import {
  createLayoutGeometryEvidence,
  isMajorLayoutRegionTagName,
  normalizeLayoutGeometryBoundingBox,
} from "./layout-geometry-capture";

test("normalizes layout geometry bounding boxes deterministically", () => {
  assert.deepEqual(
    normalizeLayoutGeometryBoundingBox({
      x: -12.22222,
      y: Number.NaN,
      width: 100.12345,
      height: -4,
    }),
    {
      x: 0,
      y: 0,
      width: 100.123,
      height: 0,
    },
  );
});

test("captures only major structural layout regions", () => {
  const evidence = createLayoutGeometryEvidence({
    routePath: "/about",
    viewportWidth: 1366.8,
    viewportHeight: 768.2,
    documentHeight: 2200.9,
    capturedAt: "2026-06-15T10:00:00.000Z",
    regions: [
      {
        regionId: "",
        tagName: "BODY",
        role: null,
        selector: "body",
        boundingBox: { x: 0, y: 0, width: 1366.4, height: 2200.2 },
        childCount: 4,
      },
      {
        regionId: "",
        tagName: "header",
        role: "banner",
        selector: "body > header:nth-of-type(1)",
        boundingBox: { x: 0, y: 0, width: 1366, height: 80 },
        childCount: 2,
      },
      {
        regionId: "",
        tagName: "button",
        role: "button",
        selector: "button",
        boundingBox: { x: 24, y: 24, width: 100, height: 40 },
        childCount: 0,
      },
      {
        regionId: "",
        tagName: "img",
        role: null,
        selector: "img",
        boundingBox: { x: 0, y: 0, width: 240, height: 120 },
        childCount: 0,
      },
    ],
  });

  assert.equal(evidence.viewportWidth, 1366);
  assert.equal(evidence.viewportHeight, 768);
  assert.equal(evidence.documentHeight, 2200);
  assert.deepEqual(evidence.regions.map((region) => region.tagName), ["body", "header"]);
  assert.equal(evidence.regions.every((region) => region.regionId.startsWith("layout-region-")), true);
});

test("recognizes only 8A-6 major layout region tags", () => {
  assert.equal(isMajorLayoutRegionTagName("section"), true);
  assert.equal(isMajorLayoutRegionTagName("form"), false);
  assert.equal(isMajorLayoutRegionTagName("a"), false);
  assert.equal(isMajorLayoutRegionTagName("#text"), false);
});
