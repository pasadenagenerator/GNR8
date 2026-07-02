import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessDiscoveryFromSiteEvidence } from "./business-discovery-builder";
import type { BusinessDiscoveryArtifact } from "./business-discovery-contract";
import { buildBusinessUnderstandingReportFromDigitalBusinessTwin } from "./business-understanding-report-builder";
import {
  BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES,
  validateBusinessUnderstandingReportArtifact,
} from "./business-understanding-report-contract";
import { buildDigitalBusinessTwinFromBusinessDiscovery } from "./digital-business-twin-builder";
import type { DigitalBusinessTwinArtifact } from "./digital-business-twin-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";

const SITE_VERSION_ID = "site-version-bur-builder";
const DRY_RUN_ID = "dry-run-bur-builder";
const CREATED_AT = "2026-07-02T08:00:00.000Z";
const SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID = "business-discovery-artifact-bur-builder";
const SOURCE_DIGITAL_BUSINESS_TWIN_ARTIFACT_ID = "digital-business-twin-artifact-bur-builder";

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
          { label: "About", href: "/about", position: 2, confidenceLevel: "MEDIUM" },
          { label: "Contact", href: "/contact", position: 3, confidenceLevel: "HIGH" },
        ],
        navigationCount: 4,
        sourceEvidenceRefs: ["navigation-ref"],
      }],
    },
    summaries: {
      assetInventory: { persistedAssetCount: 3 },
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function discovery(input: { withEvidence?: boolean } = {}): BusinessDiscoveryArtifact {
  return buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: CREATED_AT,
    evidenceCaptureBaseline: input.withEvidence === false ? undefined : baseline(),
  });
}

function dbt(input: {
  withEvidence?: boolean;
  status?: DigitalBusinessTwinArtifact["status"];
  clearMissingKnowledge?: boolean;
} = {}): DigitalBusinessTwinArtifact {
  const built = buildDigitalBusinessTwinFromBusinessDiscovery({
    sourceBusinessDiscoveryArtifactId: SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID,
    businessDiscoveryArtifact: discovery({ withEvidence: input.withEvidence }),
    createdAt: CREATED_AT,
  });
  if (!input.clearMissingKnowledge) {
    return {
      ...built,
      ...(input.status ? { status: input.status } : {}),
    };
  }
  const syntheticItems = built.missingKnowledge.map((missing) => ({
    knowledgeItemId: `dbt-knowledge:${missing.domain}:complete-test`,
    domain: missing.domain,
    status: "observed" as const,
    kind: `${missing.domain}_observed`,
    statement: `The Digital Business Twin has current business knowledge for ${missing.domain}.`,
    sourceFindingIds: [`business-discovery:${missing.domain}:complete-test`],
    evidenceRefs: built.lineage.evidenceRefs,
    confidence: { level: "MEDIUM" as const, reasons: ["complete_test_fixture"] },
    limitations: [],
    diagnostics: ["DBT_KNOWLEDGE_FROM_TEST_FIXTURE"],
  }));
  const knowledgeItems = [...built.knowledgeItems, ...syntheticItems]
    .sort((left, right) => left.knowledgeItemId.localeCompare(right.knowledgeItemId));
  return {
    ...built,
    ...(input.status ? { status: input.status } : {}),
    knowledgeItems,
    missingKnowledge: [],
    domains: built.domains.map((domain) => ({
      ...domain,
      status: "observed" as const,
      knowledgeItemIds: knowledgeItems
        .filter((item) => item.domain === domain.domain)
        .map((item) => item.knowledgeItemId)
        .sort(),
      missingKnowledgeIds: [],
      diagnostics: ["DBT_DOMAIN_STATUS:observed"],
    })),
  };
}

function build(input: Parameters<typeof dbt>[0] = {}) {
  return buildBusinessUnderstandingReportFromDigitalBusinessTwin({
    sourceDigitalBusinessTwinArtifactId: SOURCE_DIGITAL_BUSINESS_TWIN_ARTIFACT_ID,
    digitalBusinessTwinArtifact: dbt(input),
    createdAt: CREATED_AT,
  });
}

test("builds deterministic partial Business Understanding Report from DBT", () => {
  const first = build();
  const second = build();

  assert.deepEqual(second, first);
  assert.equal(validateBusinessUnderstandingReportArtifact(first).valid, true);
  assert.equal(first.status, "partial");
  assert.equal(first.contractVersion, "MVP-1C");
  assert.equal(first.lineage.sourceDigitalBusinessTwinArtifactId, SOURCE_DIGITAL_BUSINESS_TWIN_ARTIFACT_ID);
  assert.equal(first.lineage.sourceBusinessDiscoveryArtifactId, SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID);
  assert.equal(first.sections.length, 14);
  assert.equal(first.sections.some((section) => section.type === "business_overview" && section.content.length > 0), true);
  assert.equal(first.diagnostics.includes("BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_VALID"), true);
});

test("complete current DBT may produce valid Business Understanding Report", () => {
  const artifact = build({ status: "observed", clearMissingKnowledge: true });

  assert.equal(artifact.status, "valid");
  assert.equal(validateBusinessUnderstandingReportArtifact(artifact).valid, true);
});

test("includes the deterministic MVP report sections in contract order", () => {
  const artifact = build();

  assert.deepEqual(artifact.sections.map((section) => section.type), [...BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES]);
  assert.deepEqual(artifact.sections.map((section) => section.sectionId), BUSINESS_UNDERSTANDING_REPORT_SECTION_TYPES.map((type) => `bur-section:${type}`));
});

test("DBT missing knowledge becomes Missing Knowledge section", () => {
  const artifact = build();
  const section = artifact.sections.find((item) => item.type === "missing_knowledge");

  assert.ok(section);
  assert.equal(section.missingKnowledgeIds.length > 0, true);
  assert.equal(section.content.some((line) => line.includes("Business Discovery did not provide deterministic knowledge")), true);
  assert.equal(artifact.limitations.some((line) => line.includes("DOMAIN_SIGNAL_MISSING")), true);
});

test("blocked DBT produces blocked fail-closed BUR", () => {
  const artifact = build({ withEvidence: false });

  assert.equal(artifact.status, "blocked");
  assert.equal(artifact.recommendations.length, 0);
  assert.equal(artifact.sections.every((section) => section.status === "blocked" || section.type === "missing_knowledge"), true);
  assert.equal(validateBusinessUnderstandingReportArtifact(artifact).valid, true);
});

test("invalid and stale DBT produce fail-closed BUR statuses", () => {
  const invalid = build({ status: "invalid" });
  assert.equal(invalid.status, "invalid");
  assert.equal(validateBusinessUnderstandingReportArtifact(invalid).valid, true);

  const stale = build({ status: "stale" });
  assert.equal(stale.status, "stale");
  assert.equal(validateBusinessUnderstandingReportArtifact(stale).valid, true);
});

test("recommendations stay business-oriented", () => {
  const artifact = build();
  const serializedRecommendations = JSON.stringify(artifact.recommendations).toLowerCase();

  assert.equal(artifact.recommendations.length > 0, true);
  assert.equal(validateBusinessUnderstandingReportArtifact(artifact).valid, true);
  for (const forbidden of ["react", "html", "component", "layout", "prompt", "provider", "publishing"]) {
    assert.equal(serializedRecommendations.includes(forbidden), false, forbidden);
  }
});
