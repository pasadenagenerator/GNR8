import assert from "node:assert/strict";
import test from "node:test";

import {
  CANDIDATE_DISCOVERY_FORBIDDEN_FIELDS,
  validateCandidateDiscoveryResult,
} from "./candidate-discovery-contract";
import { buildCandidateDiscoveryResult } from "./candidate-discovery-builder";
import type { FirstLimitedDryRunOutput } from "./first-limited-dry-run-contract";

function validOutput(): FirstLimitedDryRunOutput {
  return {
    outputId: "output:home west",
    dryRunId: "dry-run-1",
    reconstructionPackageId: "package-1",
    siteVersionId: "site-version-1",
    routeScope: { scopeType: "single_route", routes: ["/home west"] },
    outputStatus: "valid",
    routeModels: [{
      routePath: "/home west",
      sourceUrl: "https://example.test/home-west",
      sectionRefs: ["hero:one", "story"],
      navigationRefs: ["main:desktop"],
      limitationRefs: [],
      confidenceLevel: "HIGH",
    }],
    navigationModels: [{
      navigationId: "main:desktop",
      routePath: "/home west",
      items: [{
        label: "Home",
        href: "/home west",
        position: 0,
        confidenceLevel: "HIGH",
        sourceEvidenceRefs: ["evidence:navigation:/home west:item:0"],
      }],
      confidenceLevel: "HIGH",
      sourceEvidenceRefs: [
        "evidence:navigation:/home west",
        "evidence:navigation:/home west:item:0",
      ],
      limitationRefs: ["warning-navigation"],
    }],
    sectionModels: [{
      sectionId: "hero:one",
      routePath: "/home west",
      regionType: "hero",
      selector: "main > section:first-child",
      boundingBox: { x: 0, y: 80, width: 1200, height: 600 },
      confidenceLevel: "HIGH",
      sourceEvidenceRefs: [
        "evidence:layout-geometry:/home west:region:hero",
        "evidence:section-boundary:/home west:hero:one",
      ],
      limitationRefs: [],
    }, {
      sectionId: "story",
      routePath: "/home west",
      regionType: "content",
      selector: "main > section:nth-child(2)",
      boundingBox: { x: 0, y: 680, width: 1200, height: 500 },
      confidenceLevel: "MEDIUM",
      sourceEvidenceRefs: [
        "evidence:layout-geometry:/home west:region:story",
        "evidence:section-boundary:/home west:story",
      ],
      limitationRefs: [],
    }],
    limitations: [{
      limitationId: "warning-navigation",
      severity: "warning",
      sourceRef: "warning-navigation",
      message: "Navigation evidence has a known limitation.",
    }, {
      limitationId: "result-only-note",
      severity: "note",
      sourceRef: null,
      message: "Result-level context remains observable.",
    }],
    evidenceRefs: [
      "evidence:capture-baseline",
      "evidence:route:/home west",
      "evidence:navigation:/home west",
      "evidence:navigation:/home west:item:0",
      "evidence:layout-geometry:/home west:region:hero",
      "evidence:section-boundary:/home west:hero:one",
      "evidence:layout-geometry:/home west:region:story",
      "evidence:section-boundary:/home west:story",
    ],
    createdAt: "2026-06-18T10:00:00.000Z",
  };
}

function build(output = validOutput()) {
  return buildCandidateDiscoveryResult("site-version-1", "dry-run-1", output);
}

test("builds route, navigation, and generic section candidates", () => {
  const result = build();

  assert.equal(result.candidateCount, 4);
  assert.deepEqual(result.candidateTypesPresent, ["route", "navigation", "section"]);
  assert.deepEqual(result.candidates.map((candidate) => candidate.candidateType), [
    "route",
    "navigation",
    "section",
    "section",
  ]);
  assert.equal(result.candidates[0]?.routePath, "/home west");
  assert.equal(result.candidates[1]?.sourceDryRunRefs[1]?.sourceKind, "limited_dry_run_navigation_model");
  assert.equal(result.candidates[2]?.candidateType, "section");
  assert.equal(result.candidates[2]?.diagnostics[0], "SECTION_CANDIDATE_MAPPED:regionType=hero");
});

test("resolves compact Evidence Capture refs used by persisted dry-run navigation models", () => {
  const output = validOutput();
  output.navigationModels[0]!.sourceEvidenceRefs.push(
    "layout-region-navigation",
    "section-boundary-home-hero",
  );
  output.evidenceRefs.push(
    "layout-region-navigation",
    "section-boundary-home-hero",
  );

  const result = build(output);

  assert.equal(result.candidateCount, 4);
  assert.deepEqual(result.candidates.map((candidate) => candidate.candidateType), [
    "route",
    "navigation",
    "section",
    "section",
  ]);
  assert.equal(result.limitations.some((limitation) =>
    limitation.code === "UNRESOLVED_REQUIRED_EVIDENCE"), false);
  assert.equal(validateCandidateDiscoveryResult(result).valid, true);
});

test("uses stable percent-escaped IDs and deterministic ordering", () => {
  const first = build();
  const second = build();

  assert.equal(first.discoveryId, "candidate-discovery:output%3Ahome%20west");
  assert.deepEqual(first.candidates.map((candidate) => candidate.candidateId), [
    "candidate:route:/home%20west",
    "candidate:navigation:main%3Adesktop",
    "candidate:section:/home%20west:hero%3Aone",
    "candidate:section:/home%20west:story",
  ]);
  assert.deepEqual(second, first);
});

test("caps HIGH confidence at MEDIUM for applicable warnings without raising source confidence", () => {
  const result = build();
  const navigation = result.candidates.find((candidate) => candidate.candidateType === "navigation");
  const mediumSection = result.candidates.find((candidate) => candidate.candidateId.endsWith(":story"));

  assert.equal(navigation?.confidence.level, "MEDIUM");
  assert.deepEqual(navigation?.confidence.reasons, [
    "source_model_confidence:HIGH",
    "required_evidence_refs_resolved",
    "applicable_warning_caps_confidence:MEDIUM",
  ]);
  assert.equal(mediumSection?.confidence.level, "MEDIUM");
  assert.equal(mediumSection?.confidence.reasons.includes("applicable_warning_caps_confidence:MEDIUM"), false);
});

test("preserves a lossless master limitation ledger and unchanged applicable subsets", () => {
  const result = build();
  const navigation = result.candidates.find((candidate) => candidate.candidateType === "navigation");

  assert.deepEqual(result.limitations.slice(0, 2), [{
    limitationId: "warning-navigation",
    severity: "warning",
    code: "SOURCE_DRY_RUN_LIMITATION",
    message: "Navigation evidence has a known limitation.",
    sourceRef: "warning-navigation",
  }, {
    limitationId: "result-only-note",
    severity: "note",
    code: "SOURCE_DRY_RUN_LIMITATION",
    message: "Result-level context remains observable.",
  }]);
  assert.deepEqual(navigation?.limitations, [result.limitations[0]]);
  assert.equal(result.candidates[0]?.limitations.length, 0);
});

test("omits every duplicate candidate identity and records a blocker", () => {
  const output = validOutput();
  output.navigationModels.push(structuredClone(output.navigationModels[0]!));
  output.routeModels[0]!.navigationRefs = ["main:desktop"];

  const result = build(output);
  assert.equal(result.candidates.some((candidate) => candidate.candidateType === "navigation"), false);
  assert.equal(result.limitations.some((limitation) =>
    limitation.code === "DUPLICATE_CANDIDATE_IDENTITY" && limitation.severity === "blocker"), true);
  assert.equal(result.limitations.filter((limitation) =>
    limitation.code === "DUPLICATE_CANDIDATE_IDENTITY").length, 1);
  assert.equal(validateCandidateDiscoveryResult(result).valid, true);
});

test("contains no forbidden generated, reconstruction, or publishing fields", () => {
  const serialized = JSON.stringify(build());
  for (const field of CANDIDATE_DISCOVERY_FORBIDDEN_FIELDS) {
    assert.equal(serialized.includes(`\"${field}\"`), false, field);
  }
});

test("valid builder output passes the Candidate Discovery contract", () => {
  assert.deepEqual(validateCandidateDiscoveryResult(build()), {
    valid: true,
    errors: [],
    warnings: [],
  });
});
