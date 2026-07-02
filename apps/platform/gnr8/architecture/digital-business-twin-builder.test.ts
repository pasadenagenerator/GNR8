import assert from "node:assert/strict";
import test from "node:test";

import { buildBusinessDiscoveryFromSiteEvidence } from "./business-discovery-builder";
import type { BusinessDiscoveryArtifact } from "./business-discovery-contract";
import { buildDigitalBusinessTwinFromBusinessDiscovery } from "./digital-business-twin-builder";
import { validateDigitalBusinessTwinArtifact } from "./digital-business-twin-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";

const SITE_VERSION_ID = "site-version-dbt-builder";
const DRY_RUN_ID = "dry-run-dbt-builder";
const CREATED_AT = "2026-07-02T08:00:00.000Z";
const SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID = "business-discovery-artifact-dbt-builder";

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

function discovery(input: {
  withEvidence?: boolean;
  status?: BusinessDiscoveryArtifact["status"];
  removeDomain?: BusinessDiscoveryArtifact["domainSummaries"][number]["domain"];
} = {}): BusinessDiscoveryArtifact {
  const artifact = buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: CREATED_AT,
    evidenceCaptureBaseline: input.withEvidence === false ? undefined : baseline(),
  });
  if (input.removeDomain) {
    return {
      ...artifact,
      findings: artifact.findings.filter((finding) => finding.domain !== input.removeDomain),
      domainSummaries: artifact.domainSummaries.map((summary) =>
        summary.domain === input.removeDomain
          ? {
              ...summary,
              status: "partial",
              summary: `No website-derived finding was observed for ${input.removeDomain}.`,
              findingIds: [],
              evidenceRefs: [],
              confidence: { level: "LOW", reasons: ["domain_signal_missing"] },
              limitations: [],
              diagnostics: ["DOMAIN_FINDING_COUNT:0"],
            }
          : summary),
      ...(input.status ? { status: input.status } : {}),
    };
  }
  return {
    ...artifact,
    ...(input.status ? { status: input.status } : {}),
  };
}

function build(input: Parameters<typeof discovery>[0] = {}) {
  return buildDigitalBusinessTwinFromBusinessDiscovery({
    sourceBusinessDiscoveryArtifactId: SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID,
    businessDiscoveryArtifact: discovery(input),
    createdAt: CREATED_AT,
  });
}

test("builds deterministic partial DBT knowledge from Business Discovery", () => {
  const first = build();
  const second = build();

  assert.deepEqual(second, first);
  assert.equal(validateDigitalBusinessTwinArtifact(first).valid, true);
  assert.equal(first.status, "partial");
  assert.equal(first.contractVersion, "MVP-1B");
  assert.equal(first.lineage.sourceBusinessDiscoveryArtifactId, SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID);
  assert.equal(first.knowledgeItems.length > 0, true);
  assert.equal(first.knowledgeItems.every((item) => item.sourceFindingIds.length === 1), true);
  assert.equal(first.knowledgeItems.some((item) => item.kind === "company_identity_observed"), true);
  assert.equal(first.knowledgeItems.some((item) => item.kind === "offering_candidate_observed"), true);
  assert.equal(first.diagnostics.includes("DIGITAL_BUSINESS_TWIN_ARTIFACT_VALID"), true);
});

test("includes only MVP DBT domains", () => {
  const artifact = build();
  assert.deepEqual(artifact.domains.map((domain) => domain.domain), [
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
});

test("missing Business Discovery domains become missingKnowledge", () => {
  const artifact = build({ removeDomain: "audience" });

  assert.equal(artifact.knowledgeItems.some((item) => item.domain === "audience"), false);
  assert.equal(artifact.missingKnowledge.some((item) => item.domain === "audience"), true);
  assert.deepEqual(artifact.domains.find((domain) => domain.domain === "audience")?.missingKnowledgeIds, ["dbt-missing:audience"]);
});

test("blocked Business Discovery produces blocked fail-closed DBT", () => {
  const artifact = build({ withEvidence: false });

  assert.equal(artifact.status, "blocked");
  assert.equal(artifact.knowledgeItems.length, 0);
  assert.equal(artifact.missingKnowledge.length, 9);
  assert.equal(validateDigitalBusinessTwinArtifact(artifact).valid, true);
});

test("invalid and stale Business Discovery produce fail-closed DBT statuses", () => {
  const invalid = build({ status: "invalid" });
  assert.equal(invalid.status, "invalid");
  assert.equal(invalid.knowledgeItems.length, 0);
  assert.equal(validateDigitalBusinessTwinArtifact(invalid).valid, true);

  const stale = build({ status: "stale" });
  assert.equal(stale.status, "stale");
  assert.equal(stale.knowledgeItems.length, 0);
  assert.equal(validateDigitalBusinessTwinArtifact(stale).valid, true);
});

test("knowledge item IDs are deterministic and stable across finding order", () => {
  const source = discovery();
  const reversed = {
    ...source,
    findings: [...source.findings].reverse(),
  };
  const first = buildDigitalBusinessTwinFromBusinessDiscovery({
    sourceBusinessDiscoveryArtifactId: SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID,
    businessDiscoveryArtifact: source,
    createdAt: CREATED_AT,
  });
  const second = buildDigitalBusinessTwinFromBusinessDiscovery({
    sourceBusinessDiscoveryArtifactId: SOURCE_BUSINESS_DISCOVERY_ARTIFACT_ID,
    businessDiscoveryArtifact: reversed,
    createdAt: CREATED_AT,
  });

  assert.deepEqual(
    second.knowledgeItems.map((item) => item.knowledgeItemId),
    first.knowledgeItems.map((item) => item.knowledgeItemId),
  );
});
