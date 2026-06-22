import assert from "node:assert/strict";
import test from "node:test";

import type { Candidate, CandidateDiscoveryResult } from "./candidate-discovery-contract";
import {
  buildCandidateContextProjection,
  validateCandidateContextProjection,
  type CandidateContextProjectionInput,
} from "./candidate-context-projection";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type { FirstLimitedDryRunOutput } from "./first-limited-dry-run-contract";

const routePath = "/";
const outputId = "limited-output-1";

function candidate(type: Candidate["candidateType"]): Candidate {
  const identity = type === "route" ? "candidate:route:/" : type === "navigation" ? "candidate:navigation:nav%3A%2F" : "candidate:section:/:section-hero";
  const evidence = type === "route"
    ? [{ refId: "evidence:route:/", sourceKind: "evidence_capture_baseline" as const, routePath }]
    : type === "navigation"
      ? [
          { refId: "evidence:navigation:/", sourceKind: "navigation_evidence" as const, routePath },
          { refId: "evidence:layout-geometry:/:region:nav-main", sourceKind: "layout_geometry" as const, routePath },
        ]
      : [
          { refId: "evidence:section-boundary:/:section-hero", sourceKind: "section_boundary" as const, routePath },
          { refId: "evidence:layout-geometry:/:region:hero-main", sourceKind: "layout_geometry" as const, routePath },
        ];
  const modelRef = type === "route" ? `dry-run-route:${outputId}:/` :
    type === "navigation" ? `dry-run-navigation:${outputId}:nav%3A%2F` :
      `dry-run-section:${outputId}:/:section-hero`;
  return {
    candidateId: identity,
    candidateType: type,
    candidateStatus: "discovered",
    confidence: { level: "HIGH", reasons: ["source-model-confidence"] },
    sourceEvidenceRefs: evidence,
    sourceDryRunRefs: [
      { refId: `dry-run-output:${outputId}`, sourceKind: "limited_dry_run_output" },
      { refId: modelRef, sourceKind: `limited_dry_run_${type}_model`, routePath },
    ],
    limitations: [{ limitationId: "known-1", severity: "warning", code: "KNOWN_LIMITATION", message: "Known evidence limitation." }],
    diagnostics: [],
    routePath,
  };
}

function discovery(selected: Candidate): CandidateDiscoveryResult {
  return {
    discoveryId: "candidate-discovery-1",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    createdAt: "2026-06-22T10:00:00.000Z",
    candidateCount: 1,
    candidateTypesPresent: [selected.candidateType],
    candidates: [selected],
    limitations: [],
    diagnostics: [],
  };
}

function output(): FirstLimitedDryRunOutput {
  return {
    outputId,
    dryRunId: "dry-run-1",
    reconstructionPackageId: "package-1",
    siteVersionId: "site-version-1",
    routeScope: { scopeType: "single_route", routes: [routePath] },
    outputStatus: "valid",
    routeModels: [{
      routePath,
      sourceUrl: "https://example.test/",
      sectionRefs: ["section-hero"],
      navigationRefs: ["nav:/"],
      limitationRefs: [],
      confidenceLevel: "HIGH",
    }],
    navigationModels: [{
      navigationId: "nav:/",
      routePath,
      items: [
        { label: "Home", href: "/", position: 0, confidenceLevel: "HIGH", sourceEvidenceRefs: [] },
        { label: "About", href: "/about", position: 1, confidenceLevel: "HIGH", sourceEvidenceRefs: [] },
      ],
      confidenceLevel: "HIGH",
      sourceEvidenceRefs: ["evidence:layout-geometry:/:region:nav-main"],
      limitationRefs: [],
    }],
    sectionModels: [{
      sectionId: "section-hero",
      routePath,
      regionType: "hero",
      selector: "main > section",
      boundingBox: { x: 0, y: 120, width: 1200, height: 500 },
      confidenceLevel: "HIGH",
      sourceEvidenceRefs: [
        "evidence:section-boundary:/:section-hero",
        "evidence:layout-geometry:/:region:hero-main",
      ],
      limitationRefs: [],
    }],
    limitations: [],
    evidenceRefs: ["evidence:route:/", "evidence:layout-geometry:/"],
    createdAt: "2026-06-22T09:00:00.000Z",
  };
}

function baseline(): EvidenceCaptureBaselineArtifactRecord {
  return {
    kind: "evidence_capture_baseline",
    siteVersionId: "site-version-1",
    routePath,
    captureRunId: "capture-1",
    sourceUrl: "https://example.test/",
    evidence: {
      source: { routePath, captureRunId: "capture-1" },
      rendered: {
        fullPageScreenshotRef: { id: "fullpage_screenshot", uri: "/artifacts/fullpage.png", mediaType: "image/png" },
        viewport: { width: 1200, height: 800, deviceScaleFactor: 1, isMobile: false },
      },
    },
    captureExpansionEvidence: {
      layoutGeometryEvidence: [{
        routePath,
        viewportWidth: 1200,
        viewportHeight: 800,
        documentHeight: 2400,
        capturedAt: "2026-06-22T08:00:00.000Z",
        regions: [
          { regionId: "nav-main", tagName: "nav", role: "navigation", selector: "nav", boundingBox: { x: 0, y: 0, width: 1200, height: 100 }, childCount: 2 },
          { regionId: "hero-main", tagName: "section", role: null, selector: "main > section", boundingBox: { x: 0, y: 120, width: 1200, height: 500 }, childCount: 3 },
        ],
      }],
      sectionBoundaryEvidence: [{
        sectionId: "section-hero",
        routePath,
        selector: "main > section",
        boundingBox: { x: 0, y: 120, width: 1200, height: 500 },
        regionType: "hero",
        confidenceLevel: "HIGH",
      }],
      navigationEvidence: [],
    },
  } as unknown as EvidenceCaptureBaselineArtifactRecord;
}

function input(type: Candidate["candidateType"]): CandidateContextProjectionInput {
  const selected = candidate(type);
  return {
    siteVersionId: "site-version-1",
    candidate: selected,
    candidateDiscoveryResult: discovery(selected),
    evidenceCaptureBaseline: baseline(),
    firstLimitedDryRunOutput: output(),
  };
}

test("route is ready with a full-page screenshot and no highlight", () => {
  const projection = buildCandidateContextProjection(input("route"));
  assert.equal(projection.state, "ready");
  assert.equal(projection.screenshot?.artifactPath, "/artifacts/fullpage.png");
  assert.equal(projection.highlight, null);
  assert.equal(projection.evidenceSummary.route?.navigationCount, 1);
});

test("navigation is ready with screenshot and exact highlight", () => {
  const projection = buildCandidateContextProjection(input("navigation"));
  assert.equal(projection.state, "ready");
  assert.equal(projection.highlight?.kind, "navigation");
  assert.deepEqual(projection.evidenceSummary.navigation, { itemCount: 2, orderedLabels: ["Home", "About"] });
});

test("section is ready with screenshot and exact highlight", () => {
  const projection = buildCandidateContextProjection(input("section"));
  assert.equal(projection.state, "ready");
  assert.equal(projection.highlight?.kind, "section");
  assert.equal(projection.evidenceSummary.section?.structuralLabel, "Hero section");
});

test("navigation is incomplete when geometry is missing", () => {
  const fixture = input("navigation");
  (fixture.evidenceCaptureBaseline as EvidenceCaptureBaselineArtifactRecord).captureExpansionEvidence.layoutGeometryEvidence = [];
  const projection = buildCandidateContextProjection(fixture);
  assert.equal(projection.state, "incomplete");
  assert.equal(projection.highlight, null);
  assert.equal(projection.diagnostics.at(-1)?.code, "GEOMETRY_MISSING");
});

test("section is incomplete when geometry is ambiguous", () => {
  const fixture = input("section");
  const record = fixture.evidenceCaptureBaseline as EvidenceCaptureBaselineArtifactRecord;
  record.captureExpansionEvidence.sectionBoundaryEvidence.push({
    ...record.captureExpansionEvidence.sectionBoundaryEvidence[0],
    sectionId: "section-other",
  });
  fixture.candidate.sourceEvidenceRefs.push({
    refId: "evidence:section-boundary:/:section-other",
    sourceKind: "section_boundary",
    routePath,
  });
  const projection = buildCandidateContextProjection(fixture);
  assert.equal(projection.state, "incomplete");
  assert.equal(projection.diagnostics.at(-1)?.code, "HIGHLIGHT_MAPPING_AMBIGUOUS");
});

test("projection is unavailable when screenshot is missing", () => {
  const fixture = input("route");
  (fixture.evidenceCaptureBaseline as EvidenceCaptureBaselineArtifactRecord).evidence.rendered.fullPageScreenshotRef = null;
  const projection = buildCandidateContextProjection(fixture);
  assert.equal(projection.state, "unavailable");
  assert.equal(projection.screenshot, null);
  assert.equal(projection.diagnostics.at(-1)?.code, "SCREENSHOT_MISSING");
});

test("invalid capture lineage is unavailable", () => {
  const fixture = input("route");
  (fixture.evidenceCaptureBaseline as EvidenceCaptureBaselineArtifactRecord).evidence.source.captureRunId = "other-capture";
  const projection = buildCandidateContextProjection(fixture);
  assert.equal(projection.state, "unavailable");
  assert.equal(projection.screenshot, null);
  assert.match(projection.diagnostics.map((item) => item.code).join(" "), /ROUTE_MISMATCH|LINEAGE_INVALID/);
});

test("forbidden fields are rejected recursively", () => {
  for (const field of [
    "reactOutput", "generatedOutputs", "generatedBlocks", "generatedContent", "designTokens",
    "publishingArtifacts", "reconstructionArtifacts", "executionArtifacts",
  ]) {
    const projection = buildCandidateContextProjection(input("route")) as unknown as Record<string, unknown>;
    projection.diagnostics = [{ nested: { [field]: true } }];
    const validation = validateCandidateContextProjection(projection);
    assert.equal(validation.valid, false, field);
    assert.match(validation.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});

test("validation passes for a ready projection", () => {
  assert.deepEqual(validateCandidateContextProjection(buildCandidateContextProjection(input("section"))), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("validation fails for an inconsistent ready projection", () => {
  const projection = buildCandidateContextProjection(input("navigation"));
  projection.highlight = null;
  const validation = validateCandidateContextProjection(projection);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /ready navigation projection requires highlight/);
});
