import assert from "node:assert/strict";
import test from "node:test";

import {
  CAPTURE_EXPANSION_CONFIDENCE_LEVELS,
  RUNTIME_MUTATION_TYPES,
  SECTION_BOUNDARY_REGION_TYPES,
  evaluateCaptureExpansionReadiness,
  type LayoutGeometryEvidence,
  type NavigationEvidence,
  type RuntimeMutationEvidence,
  type SectionBoundaryEvidence,
} from "./evidence-capture-layout-contract";

const box = {
  x: 0,
  y: 0,
  width: 1200,
  height: 320,
};

test("layout evidence creation", () => {
  const evidence: LayoutGeometryEvidence = {
    routePath: "/",
    viewportWidth: 1366,
    viewportHeight: 768,
    documentHeight: 2400,
    regions: [
      {
        regionId: "region-nav",
        tagName: "nav",
        role: "navigation",
        selector: "header nav",
        boundingBox: {
          x: 0,
          y: 0,
          width: 1366,
          height: 72,
        },
        childCount: 5,
      },
    ],
    capturedAt: "2026-06-15T10:00:00.000Z",
  };

  assert.equal(evidence.routePath, "/");
  assert.equal(evidence.regions[0]?.role, "navigation");
  assert.equal(evidence.regions[0]?.boundingBox.width, 1366);
});

test("section evidence creation", () => {
  const evidence: SectionBoundaryEvidence = {
    sectionId: "section-hero",
    routePath: "/",
    selector: "main > section.hero",
    boundingBox: box,
    regionType: "hero",
    confidenceLevel: "HIGH",
  };

  assert.equal(SECTION_BOUNDARY_REGION_TYPES.includes(evidence.regionType), true);
  assert.equal(CAPTURE_EXPANSION_CONFIDENCE_LEVELS.includes(evidence.confidenceLevel), true);
  assert.equal(evidence.boundingBox.height, 320);
});

test("navigation evidence creation", () => {
  const evidence: NavigationEvidence = {
    routePath: "/",
    navigationItems: [
      {
        label: "Work",
        href: "/work",
        position: 1,
        confidenceLevel: "HIGH",
      },
      {
        label: "Contact",
        href: "/contact",
        position: 2,
        confidenceLevel: "MEDIUM",
      },
    ],
    navigationCount: 2,
    sourceEvidenceRefs: ["layout-region-nav"],
  };

  assert.equal(evidence.navigationCount, evidence.navigationItems.length);
  assert.deepEqual(evidence.navigationItems.map((item) => item.href), ["/work", "/contact"]);
});

test("mutation evidence creation", () => {
  const evidence: RuntimeMutationEvidence = {
    routePath: "/",
    mutationDetected: true,
    mutationCount: 2,
    mutationTypes: ["dom_insert", "attribute_change"],
    observedSelectors: [".gallery", "header nav"],
  };

  assert.equal(RUNTIME_MUTATION_TYPES.includes(evidence.mutationTypes[0]!), true);
  assert.equal(evidence.mutationDetected, true);
  assert.equal(evidence.observedSelectors.length, 2);
});

test("readiness helper reports missing evidence", () => {
  assert.deepEqual(evaluateCaptureExpansionReadiness({}), {
    routeModel: "MISSING",
    navigationModel: "MISSING",
    sectionModel: "MISSING",
    evidenceTypesPresent: {
      routePaths: false,
      layoutGeometry: false,
      sectionBoundaries: false,
      navigation: false,
      runtimeMutation: false,
    },
  });
});

test("readiness helper treats route-only evidence as route ready", () => {
  const result = evaluateCaptureExpansionReadiness({
    routePaths: ["/", "/contact"],
  });

  assert.equal(result.routeModel, "READY");
  assert.equal(result.navigationModel, "MISSING");
  assert.equal(result.sectionModel, "MISSING");
});

test("readiness helper reports navigation partial from navigation-shaped layout", () => {
  const result = evaluateCaptureExpansionReadiness({
    layoutGeometryEvidence: [
      {
        routePath: "/",
        viewportWidth: 1366,
        viewportHeight: 768,
        documentHeight: 1800,
        regions: [
          {
            regionId: "header-nav",
            tagName: "nav",
            role: "navigation",
            selector: "header nav",
            boundingBox: { x: 0, y: 0, width: 1366, height: 72 },
            childCount: 4,
          },
        ],
        capturedAt: "2026-06-15T10:00:00.000Z",
      },
    ],
  });

  assert.equal(result.routeModel, "READY");
  assert.equal(result.navigationModel, "PARTIAL");
  assert.equal(result.sectionModel, "PARTIAL");
});

test("readiness helper reports ready for route, navigation, and section when evidence is present", () => {
  const result = evaluateCaptureExpansionReadiness({
    layoutGeometryEvidence: [
      {
        routePath: "/",
        viewportWidth: 1366,
        viewportHeight: 768,
        documentHeight: 2400,
        regions: [
          {
            regionId: "hero-region",
            tagName: "section",
            role: null,
            selector: "main > section.hero",
            boundingBox: box,
            childCount: 3,
          },
        ],
        capturedAt: "2026-06-15T10:00:00.000Z",
      },
    ],
    sectionBoundaryEvidence: [
      {
        sectionId: "section-hero",
        routePath: "/",
        selector: "main > section.hero",
        boundingBox: box,
        regionType: "hero",
        confidenceLevel: "HIGH",
      },
    ],
    navigationEvidence: [
      {
        routePath: "/",
        navigationItems: [
          {
            label: "Home",
            href: "/",
            position: 0,
            confidenceLevel: "HIGH",
          },
        ],
        navigationCount: 1,
        sourceEvidenceRefs: ["header-nav"],
      },
    ],
    runtimeMutationEvidence: [
      {
        routePath: "/",
        mutationDetected: false,
        mutationCount: 0,
        mutationTypes: ["unknown"],
        observedSelectors: [],
      },
    ],
  });

  assert.equal(result.routeModel, "READY");
  assert.equal(result.navigationModel, "READY");
  assert.equal(result.sectionModel, "READY");
  assert.equal(result.evidenceTypesPresent.layoutGeometry, true);
  assert.equal(result.evidenceTypesPresent.sectionBoundaries, true);
  assert.equal(result.evidenceTypesPresent.navigation, true);
  assert.equal(result.evidenceTypesPresent.runtimeMutation, true);
});

test("readiness helper reports section ready when section boundary evidence exists without runtime mutation evidence", () => {
  const result = evaluateCaptureExpansionReadiness({
    layoutGeometryEvidence: [
      {
        routePath: "/",
        viewportWidth: 1366,
        viewportHeight: 768,
        documentHeight: 1800,
        regions: [
          {
            regionId: "hero-region",
            tagName: "section",
            role: null,
            selector: "main > section.hero",
            boundingBox: box,
            childCount: 3,
          },
        ],
        capturedAt: "2026-06-15T10:00:00.000Z",
      },
    ],
    sectionBoundaryEvidence: [
      {
        sectionId: "section-hero",
        routePath: "/",
        selector: "main > section.hero",
        boundingBox: box,
        regionType: "hero",
        confidenceLevel: "HIGH",
      },
    ],
  });

  assert.equal(result.routeModel, "READY");
  assert.equal(result.navigationModel, "MISSING");
  assert.equal(result.sectionModel, "READY");
  assert.equal(result.evidenceTypesPresent.runtimeMutation, false);
});
