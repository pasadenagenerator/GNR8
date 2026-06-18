import assert from "node:assert/strict";
import test from "node:test";

import {
  CANDIDATE_DISCOVERY_FORBIDDEN_FIELDS,
  validateCandidateDiscoveryResult,
} from "./candidate-discovery-contract";
import { buildCandidateDiscoveryResult } from "./candidate-discovery-builder";
import type {
  FirstLimitedDryRunOutput,
  LimitedDryRunSectionModel,
} from "./first-limited-dry-run-contract";

const SITE_VERSION_ID = "fixture-site-version";
const DRY_RUN_ID = "fixture-dry-run";

function section(
  sectionId: string,
  position: number,
  limitationRefs: string[] = [],
): LimitedDryRunSectionModel {
  return {
    sectionId,
    routePath: "/",
    regionType: position === 0 ? "hero" : "content",
    selector: `main > section:nth-child(${position + 1})`,
    boundingBox: { x: 0, y: position * 500, width: 1280, height: 500 },
    confidenceLevel: "HIGH",
    sourceEvidenceRefs: [
      `evidence:layout-geometry:/:region:${sectionId}`,
      `evidence:section-boundary:/:${sectionId}`,
    ],
    limitationRefs,
  };
}

function fixture(
  fixtureName: string,
  sectionIds: string[],
  navigationItemCount: number,
): FirstLimitedDryRunOutput {
  const sectionModels = sectionIds.map((sectionId, index) => section(sectionId, index));
  const navigationItems = Array.from({ length: navigationItemCount }, (_, position) => ({
    label: `Item ${position + 1}`,
    href: position === 0 ? "/" : `/page-${position + 1}`,
    position,
    confidenceLevel: "HIGH" as const,
    sourceEvidenceRefs: [`evidence:navigation:/:item:${position}`],
  }));

  return {
    outputId: `fixture:${fixtureName}`,
    dryRunId: DRY_RUN_ID,
    reconstructionPackageId: `fixture-package:${fixtureName}`,
    siteVersionId: SITE_VERSION_ID,
    routeScope: { scopeType: "single_route", routes: ["/"] },
    outputStatus: "valid",
    routeModels: [{
      routePath: "/",
      sourceUrl: `https://${fixtureName}.example.test/`,
      sectionRefs: sectionIds,
      navigationRefs: ["primary"],
      limitationRefs: [],
      confidenceLevel: "HIGH",
    }],
    navigationModels: [{
      navigationId: "primary",
      routePath: "/",
      items: navigationItems,
      confidenceLevel: "HIGH",
      sourceEvidenceRefs: [
        "evidence:navigation:/",
        ...navigationItems.flatMap((item) => item.sourceEvidenceRefs),
      ],
      limitationRefs: [],
    }],
    sectionModels,
    limitations: [],
    evidenceRefs: [
      "evidence:capture-baseline",
      "evidence:route:/",
      "evidence:navigation:/",
      ...navigationItems.flatMap((item) => item.sourceEvidenceRefs),
      ...sectionModels.flatMap((model) => model.sourceEvidenceRefs),
    ],
    createdAt: "2026-06-18T12:00:00.000Z",
  };
}

function build(output: FirstLimitedDryRunOutput) {
  return buildCandidateDiscoveryResult(SITE_VERSION_ID, DRY_RUN_ID, output);
}

function blockerCount(result: ReturnType<typeof build>): number {
  return result.limitations.filter((limitation) => limitation.severity === "blocker").length;
}

function assertStable(output: FirstLimitedDryRunOutput, expectedIds: string[]): void {
  const first = build(output);
  const second = build(structuredClone(output));
  assert.deepEqual(first, second);
  assert.deepEqual(first.candidates.map((candidate) => candidate.candidateId), expectedIds);
}

test("ODV-shaped fixture produces one route, one navigation, and two sections", () => {
  const output = fixture("odv-cvijanovic", ["hero", "services"], 6);
  const result = build(output);

  assert.equal(result.candidateCount, 4);
  assert.deepEqual(result.candidateTypesPresent, ["route", "navigation", "section"]);
  assert.equal(result.candidates.filter((candidate) => candidate.candidateType === "section").length, 2);
  assert.equal(blockerCount(result), 0);
  assert.equal(validateCandidateDiscoveryResult(result).valid, true);
  assertStable(output, [
    "candidate:route:/",
    "candidate:navigation:primary",
    "candidate:section:/:hero",
    "candidate:section:/:services",
  ]);
});

test("ViroiDoc-shaped fixture preserves 18 limitations and caps applicable warnings", () => {
  const output = fixture("viroidoc", ["hero", "research", "contact"], 29);
  output.limitations = Array.from({ length: 18 }, (_, index) => ({
    limitationId: `viroidoc-limitation-${index + 1}`,
    severity: index < 2 ? "warning" as const : "note" as const,
    sourceRef: index === 0
      ? "evidence:navigation:/"
      : index === 1
        ? "evidence:section-boundary:/:research"
        : null,
    message: `Representative ViroiDoc limitation ${index + 1}.`,
  }));

  const result = build(output);
  const navigation = result.candidates.find((candidate) => candidate.candidateType === "navigation");
  const research = result.candidates.find((candidate) => candidate.candidateId === "candidate:section:/:research");

  assert.equal(result.candidateCount, 5);
  assert.equal(result.limitations.length, 18);
  assert.equal(navigation?.limitations[0]?.limitationId, "viroidoc-limitation-1");
  assert.equal(research?.limitations[0]?.limitationId, "viroidoc-limitation-2");
  assert.equal(navigation?.confidence.level, "MEDIUM");
  assert.equal(research?.confidence.level, "MEDIUM");
  assert.equal(blockerCount(result), 0);
  assert.equal(validateCandidateDiscoveryResult(result).valid, true);
  assertStable(output, [
    "candidate:route:/",
    "candidate:navigation:primary",
    "candidate:section:/:hero",
    "candidate:section:/:research",
    "candidate:section:/:contact",
  ]);
});

test("broad navigation remains one candidate and retains its dry-run model reference", () => {
  const output = fixture("broad-navigation", ["hero", "content", "footer"], 29);
  const result = build(output);
  const navigation = result.candidates.filter((candidate) => candidate.candidateType === "navigation");

  assert.equal(navigation.length, 1);
  assert.equal(result.candidateCount, 5);
  assert.equal(navigation[0]?.diagnostics.includes("NAVIGATION_CANDIDATE_MAPPED:items=29"), true);
  assert.equal(navigation[0]?.sourceDryRunRefs.some((ref) =>
    ref.sourceKind === "limited_dry_run_navigation_model"), true);
  assert.equal(output.navigationModels[0]?.items.length, 29);
  assert.equal(validateCandidateDiscoveryResult(result).valid, true);
});

test("duplicate section identity is omitted deterministically with one diagnostic blocker", () => {
  const output = fixture("duplicate-section", ["hero", "content"], 6);
  output.sectionModels.push(structuredClone(output.sectionModels[1]!));
  const first = build(output);
  const second = build(structuredClone(output));
  const duplicate = first.limitations.filter((limitation) =>
    limitation.code === "DUPLICATE_CANDIDATE_IDENTITY");

  assert.deepEqual(first, second);
  assert.equal(first.candidates.some((candidate) => candidate.candidateId === "candidate:section:/:content"), false);
  assert.equal(duplicate.length, 1);
  assert.equal(duplicate[0]?.severity, "blocker");
  assert.match(duplicate[0]?.message ?? "", /Duplicate section candidate identity/);
  assert.equal(validateCandidateDiscoveryResult(first).valid, true);
});

test("missing required evidence refs produces a valid blocked empty result without generated fields", () => {
  const output = fixture("missing-evidence", ["hero", "content"], 6);
  output.evidenceRefs = [];
  const result = build(output);
  const serialized = JSON.stringify(result);

  assert.equal(result.candidateCount, 0);
  assert.deepEqual(result.candidateTypesPresent, []);
  assert.deepEqual(result.candidates, []);
  assert.equal(blockerCount(result), 4);
  assert.equal(result.limitations.every((limitation) =>
    limitation.code === "UNRESOLVED_REQUIRED_EVIDENCE"), true);
  assert.equal(validateCandidateDiscoveryResult(result).valid, true);
  for (const field of CANDIDATE_DISCOVERY_FORBIDDEN_FIELDS) {
    assert.equal(serialized.includes(`\"${field}\"`), false, field);
  }
});
