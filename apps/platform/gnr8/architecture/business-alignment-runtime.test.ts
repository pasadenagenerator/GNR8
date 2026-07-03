import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessDiscoveryFromSiteEvidence } from "./business-discovery-builder";
import type { BusinessAlignmentCorrection, BusinessAlignmentDecision } from "./business-alignment-contract";
import { applyBusinessAlignment } from "./business-alignment-runtime";
import { buildBusinessUnderstandingReportFromDigitalBusinessTwin } from "./business-understanding-report-builder";
import type { BusinessUnderstandingReportArtifact } from "./business-understanding-report-contract";
import { buildDigitalBusinessTwinFromBusinessDiscovery } from "./digital-business-twin-builder";
import type { DigitalBusinessTwinArtifact, DigitalBusinessTwinKnowledgeItem } from "./digital-business-twin-contract";
import { validateDigitalBusinessTwinArtifact } from "./digital-business-twin-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";

const SITE_VERSION_ID = "site-version-business-alignment-runtime";
const DRY_RUN_ID = "dry-run-business-alignment-runtime";
const CREATED_AT = "2026-07-03T08:00:00.000Z";
const SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID = "business-discovery-artifact-business-alignment-runtime";
const SOURCE_DIGITAL_BUSINESS_TWIN_ARTIFACT_ID = "digital-business-twin-artifact-business-alignment-runtime";

function baseline(): EvidenceCaptureBaselineArtifactRecord {
  return {
    routePath: "/",
    sourceUrl: "https://www.example.test/",
    finalUrl: "https://www.example.test/",
    limitations: ["partial_asset_inventory"],
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
          { label: "Contact", href: "/contact", position: 2, confidenceLevel: "HIGH" },
        ],
        navigationCount: 3,
        sourceEvidenceRefs: ["navigation-ref"],
      }],
    },
    summaries: {
      assetInventory: { persistedAssetCount: 2 },
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function artifacts(): {
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
    sourceBusinessDiscoveryArtifactId: SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID,
    businessDiscoveryArtifact: discovery,
    createdAt: CREATED_AT,
  });
  const bur = buildBusinessUnderstandingReportFromDigitalBusinessTwin({
    sourceDigitalBusinessTwinArtifactId: SOURCE_DIGITAL_BUSINESS_TWIN_ARTIFACT_ID,
    digitalBusinessTwinArtifact: dbt,
    createdAt: CREATED_AT,
  });
  return { dbt, bur };
}

function decision(correctionIds: string[]): BusinessAlignmentDecision {
  return {
    decisionId: `business-alignment-decision:${correctionIds.join("-")}`,
    status: "applied",
    correctionIds,
    summary: "Business owner reviewed and applied explicit DBT corrections.",
    decidedAt: CREATED_AT,
    diagnostics: ["BUSINESS_ALIGNMENT_DECISION_TEST_FIXTURE"],
  };
}

function evidenceRef(correctionId: string) {
  return {
    refId: `business-owner-note:${correctionId}`,
    sourceKind: "business_alignment_correction",
    description: `Business owner correction ${correctionId}.`,
  };
}

function firstKnowledge(dbt: DigitalBusinessTwinArtifact): DigitalBusinessTwinKnowledgeItem {
  const item = dbt.knowledgeItems[0];
  assert.ok(item, "expected fixture DBT to contain at least one knowledge item");
  return item;
}

function correction(input: Partial<BusinessAlignmentCorrection> & Pick<BusinessAlignmentCorrection, "correctionId" | "domain" | "type">): BusinessAlignmentCorrection {
  return {
    evidenceRefs: [evidenceRef(input.correctionId)],
    limitations: [],
    diagnostics: ["BUSINESS_ALIGNMENT_CORRECTION_TEST_FIXTURE"],
    ...input,
  };
}

test("confirmation produces a DBT revision without editing the source report", () => {
  const { dbt, bur } = artifacts();
  const sourceReportBefore = JSON.stringify(bur);
  const item = firstKnowledge(dbt);
  const confirm = correction({
    correctionId: "confirm-identity",
    domain: item.domain,
    type: "confirm",
    targetKnowledgeItemId: item.knowledgeItemId,
    confidence: { level: "HIGH", reasons: ["business_owner_confirmed"] },
  });

  const result = applyBusinessAlignment({
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
    decisions: [decision([confirm.correctionId])],
    corrections: [confirm],
    createdAt: CREATED_AT,
  });

  assert.equal(result.businessAlignmentArtifact.status, "applied");
  assert.notEqual(result.digitalBusinessTwinRevision.digitalBusinessTwinId, dbt.digitalBusinessTwinId);
  assert.equal(JSON.stringify(bur), sourceReportBefore);
  assert.equal(dbt.knowledgeItems.find((candidate) => candidate.knowledgeItemId === item.knowledgeItemId)?.statement, item.statement);
  assert.ok(result.digitalBusinessTwinRevision.knowledgeItems
    .find((candidate) => candidate.knowledgeItemId === item.knowledgeItemId)
    ?.confidence.reasons.includes("business_alignment_confirmed"));
  assert.ok(validateDigitalBusinessTwinArtifact(result.digitalBusinessTwinRevision).valid);
});

test("correction changes only targeted DBT knowledge and preserves evidence", () => {
  const { dbt, bur } = artifacts();
  const item = firstKnowledge(dbt);
  const corrected = correction({
    correctionId: "correct-business-statement",
    domain: item.domain,
    type: "correct",
    targetKnowledgeItemId: item.knowledgeItemId,
    statement: "The business owner corrected this DBT knowledge statement.",
    confidence: { level: "HIGH", reasons: ["business_owner_correction"] },
  });

  const result = applyBusinessAlignment({
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
    decisions: [decision([corrected.correctionId])],
    corrections: [corrected],
    createdAt: CREATED_AT,
  });
  const revised = result.digitalBusinessTwinRevision.knowledgeItems
    .find((candidate) => candidate.knowledgeItemId === item.knowledgeItemId);

  assert.equal(revised?.statement, corrected.statement);
  assert.ok(revised?.evidenceRefs.some((ref) => ref.refId === item.evidenceRefs[0]?.refId));
  assert.ok(revised?.evidenceRefs.some((ref) => ref.refId === `business-owner-note:${corrected.correctionId}`));
  assert.ok(result.digitalBusinessTwinRevision.diagnostics.includes(`BUSINESS_ALIGNMENT_ID:${result.businessAlignmentArtifact.businessAlignmentId}`));
});

test("add_missing creates DBT knowledge and resolves the targeted missing knowledge record", () => {
  const { dbt, bur } = artifacts();
  const missing = dbt.missingKnowledge[0];
  assert.ok(missing, "expected fixture DBT to contain missing knowledge");
  const added = correction({
    correctionId: "add-missing-audience",
    domain: missing.domain,
    type: "add_missing",
    targetMissingKnowledgeId: missing.missingKnowledgeId,
    statement: "The primary audience is small business owners who need governed website modernization.",
    confidence: { level: "MEDIUM", reasons: ["business_owner_supplied_missing_knowledge"] },
  });

  const result = applyBusinessAlignment({
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
    decisions: [decision([added.correctionId])],
    corrections: [added],
    createdAt: CREATED_AT,
  });

  assert.ok(result.digitalBusinessTwinRevision.knowledgeItems.some((item) =>
    item.domain === missing.domain && item.statement === added.statement));
  assert.equal(
    result.digitalBusinessTwinRevision.missingKnowledge.some((item) => item.missingKnowledgeId === missing.missingKnowledgeId),
    false,
  );
});

test("remove deletes targeted DBT knowledge and records the resulting missing knowledge", () => {
  const { dbt, bur } = artifacts();
  const item = firstKnowledge(dbt);
  const removed = correction({
    correctionId: "remove-incorrect-knowledge",
    domain: item.domain,
    type: "remove",
    targetKnowledgeItemId: item.knowledgeItemId,
    reason: "The source website text is outdated for this business fact.",
  });

  const result = applyBusinessAlignment({
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
    decisions: [decision([removed.correctionId])],
    corrections: [removed],
    createdAt: CREATED_AT,
  });

  assert.equal(result.digitalBusinessTwinRevision.knowledgeItems.some((candidate) =>
    candidate.knowledgeItemId === item.knowledgeItemId), false);
  assert.ok(result.digitalBusinessTwinRevision.missingKnowledge.some((missing) =>
    missing.domain === item.domain && missing.reason.includes("removed prior DBT knowledge")));
});

test("unresolved correction keeps the alignment reviewed and propagates limitations", () => {
  const { dbt, bur } = artifacts();
  const unresolved = correction({
    correctionId: "unresolved-offering",
    domain: "offerings",
    type: "unresolved",
    reason: "The owner could not yet confirm the full service list.",
    limitations: ["owner_followup_required"],
  });

  const result = applyBusinessAlignment({
    sourceDigitalBusinessTwin: dbt,
    sourceBusinessUnderstandingReport: bur,
    decisions: [{ ...decision([unresolved.correctionId]), status: "reviewed" }],
    corrections: [unresolved],
    createdAt: CREATED_AT,
  });

  assert.equal(result.businessAlignmentArtifact.status, "reviewed");
  assert.equal(result.digitalBusinessTwinRevision.status, "partial");
  assert.ok(result.businessAlignmentArtifact.limitations.includes("owner_followup_required"));
  assert.ok(result.digitalBusinessTwinRevision.missingKnowledge.some((missing) =>
    missing.reason.includes("could not yet confirm")));
});
