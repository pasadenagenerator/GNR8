import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessDiscoveryFromSiteEvidence } from "./business-discovery-builder";
import {
  BUSINESS_ALIGNMENT_CORRECTION_TYPES,
  BUSINESS_ALIGNMENT_DOMAINS,
  BUSINESS_ALIGNMENT_STATUSES,
  validateBusinessAlignment,
  type BusinessAlignmentArtifact,
  type BusinessAlignmentCorrection,
  type BusinessAlignmentDecision,
} from "./business-alignment-contract";
import { applyBusinessAlignment } from "./business-alignment-runtime";
import { buildBusinessUnderstandingReportFromDigitalBusinessTwin } from "./business-understanding-report-builder";
import type { BusinessUnderstandingReportArtifact } from "./business-understanding-report-contract";
import { buildDigitalBusinessTwinFromBusinessDiscovery } from "./digital-business-twin-builder";
import type { DigitalBusinessTwinArtifact } from "./digital-business-twin-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";

const SITE_VERSION_ID = "site-version-business-alignment-contract";
const DRY_RUN_ID = "dry-run-business-alignment-contract";
const CREATED_AT = "2026-07-03T09:00:00.000Z";

function baseline(): EvidenceCaptureBaselineArtifactRecord {
  return {
    routePath: "/",
    sourceUrl: "https://www.example.test/",
    finalUrl: "https://www.example.test/",
    limitations: [],
    fidelityLimitations: [],
    captureExpansionEvidence: {
      layoutGeometryEvidence: [],
      sectionBoundaryEvidence: [{
        sectionId: "section-home-hero",
        routePath: "/",
        regionType: "hero",
        selector: "main > section:nth-of-type(1)",
        boundingBox: { x: 0, y: 80, width: 1280, height: 520 },
        confidenceLevel: "HIGH",
      }],
      navigationEvidence: [{
        routePath: "/",
        navigationItems: [
          { label: "Home", href: "/", position: 0, confidenceLevel: "HIGH" },
          { label: "Services", href: "/services", position: 1, confidenceLevel: "HIGH" },
        ],
        navigationCount: 2,
        sourceEvidenceRefs: ["navigation-ref"],
      }],
    },
    summaries: {
      assetInventory: { persistedAssetCount: 1 },
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function sources(): {
  dbt: DigitalBusinessTwinArtifact;
  bur: BusinessUnderstandingReportArtifact;
} {
  const discovery = buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: CREATED_AT,
    evidenceCaptureBaseline: baseline(),
  });
  const dbt = buildDigitalBusinessTwinFromBusinessDiscovery({
    sourceBusinessDiscoveryArtifactId: "business-discovery-artifact-contract",
    businessDiscoveryArtifact: discovery,
    createdAt: CREATED_AT,
  });
  const bur = buildBusinessUnderstandingReportFromDigitalBusinessTwin({
    sourceDigitalBusinessTwinArtifactId: "digital-business-twin-artifact-contract",
    digitalBusinessTwinArtifact: dbt,
    createdAt: CREATED_AT,
  });
  return { dbt, bur };
}

function correction(input: Partial<BusinessAlignmentCorrection> & Pick<BusinessAlignmentCorrection, "correctionId" | "domain" | "type">): BusinessAlignmentCorrection {
  return {
    evidenceRefs: [{
      refId: `owner-note:${input.correctionId}`,
      sourceKind: "business_alignment_correction",
    }],
    limitations: [],
    diagnostics: ["BUSINESS_ALIGNMENT_CONTRACT_TEST_FIXTURE"],
    ...input,
  };
}

function decision(correctionIds: string[]): BusinessAlignmentDecision {
  return {
    decisionId: "business-alignment-decision-contract",
    status: "applied",
    correctionIds,
    summary: "Business owner applied explicit corrections.",
    decidedAt: CREATED_AT,
    diagnostics: ["BUSINESS_ALIGNMENT_DECISION_CONTRACT_TEST_FIXTURE"],
  };
}

function artifact(): {
  value: BusinessAlignmentArtifact;
  dbt: DigitalBusinessTwinArtifact;
  bur: BusinessUnderstandingReportArtifact;
} {
  const { dbt, bur } = sources();
  const target = dbt.knowledgeItems[0];
  assert.ok(target, "expected fixture knowledge item");
  const confirm = correction({
    correctionId: "confirm-contract",
    domain: target.domain,
    type: "confirm",
    targetKnowledgeItemId: target.knowledgeItemId,
  });
  const result = applyBusinessAlignment({
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
    decisions: [decision([confirm.correctionId])],
    corrections: [confirm],
    createdAt: CREATED_AT,
  });
  return { value: result.businessAlignmentArtifact, dbt, bur };
}

test("Business Alignment contract exposes the MVP statuses, domains, and correction types", () => {
  assert.deepEqual([...BUSINESS_ALIGNMENT_STATUSES], [
    "draft",
    "reviewed",
    "applied",
    "blocked",
    "invalid",
    "stale",
  ]);
  assert.deepEqual([...BUSINESS_ALIGNMENT_DOMAINS], [
    "business_identity",
    "offerings",
    "audience",
    "brand",
    "digital_presence",
    "goals",
    "trust",
    "content",
    "constraints",
  ]);
  assert.deepEqual([...BUSINESS_ALIGNMENT_CORRECTION_TYPES], [
    "confirm",
    "correct",
    "remove",
    "add_missing",
    "unresolved",
  ]);
});

test("valid Business Alignment artifact validates against source DBT and BUR lineage", () => {
  const { value, dbt, bur } = artifact();
  const validation = validateBusinessAlignment({
    artifact: value,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
  });

  assert.deepEqual(validation, { valid: true, errors: [], warnings: [] });
  assert.equal(value.sourceDigitalBusinessTwinId, dbt.digitalBusinessTwinId);
  assert.equal(value.sourceBusinessUnderstandingReportId, bur.businessUnderstandingReportId);
  assert.equal(value.lineage.outputDigitalBusinessTwinId.length > 0, true);
});

test("duplicate corrections are rejected", () => {
  const { value } = artifact();
  const duplicate = {
    ...value,
    corrections: [
      value.corrections[0],
      { ...value.corrections[0], correctionId: "duplicate-id" },
    ],
  };
  const validation = validateBusinessAlignment(duplicate);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("duplicates another correction")));
});

test("forbidden downstream fields are rejected recursively", () => {
  const { value } = artifact();
  const forbidden = {
    ...value,
    diagnostics: [
      ...value.diagnostics,
      "safe-string-generatedHtml-is-not-a-field",
    ],
    nested: {
      websiteGenerationPackage: {
        generatedReact: "function App() { return null; }",
      },
    },
  } as unknown as BusinessAlignmentArtifact;
  const validation = validateBusinessAlignment(forbidden);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((error) => error.includes("nested.websiteGenerationPackage is forbidden")));
  assert.ok(validation.errors.some((error) => error.includes("nested.websiteGenerationPackage.generatedReact is forbidden")));
});

test("source DBT and BUR mismatches are rejected", () => {
  const { value, dbt, bur } = artifact();
  const mismatched = {
    ...value,
    sourceDigitalBusinessTwinId: "other-dbt",
    lineage: {
      ...value.lineage,
      sourceDigitalBusinessTwinId: "other-dbt",
    },
  };
  const validation = validateBusinessAlignment({
    artifact: mismatched,
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("sourceDigitalBusinessTwin.digitalBusinessTwinId must match sourceDigitalBusinessTwinId"));
  assert.ok(validation.errors.includes("sourceBusinessUnderstandingReport lineage must reference sourceDigitalBusinessTwinId"));
});
