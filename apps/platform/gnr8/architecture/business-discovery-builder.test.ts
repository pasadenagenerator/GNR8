import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBusinessDiscoveryFromSiteEvidence,
} from "./business-discovery-builder";
import {
  validateBusinessDiscoveryArtifact,
} from "./business-discovery-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type {
  NavigationEvidence,
  SectionBoundaryEvidence,
} from "./evidence-capture-layout-contract";

const SITE_VERSION_ID = "site-version-business-discovery-builder";
const DRY_RUN_ID = "dry-run-business-discovery-builder";
const CREATED_AT = "2026-07-01T08:00:00.000Z";

const navigationEvidence: NavigationEvidence = {
  routePath: "/",
  navigationItems: [
    { label: "Home", href: "/", position: 0, confidenceLevel: "HIGH" },
    { label: "Services", href: "/services", position: 1, confidenceLevel: "HIGH" },
    { label: "About", href: "/about", position: 2, confidenceLevel: "MEDIUM" },
    { label: "Contact", href: "/contact", position: 3, confidenceLevel: "HIGH" },
  ],
  navigationCount: 4,
  sourceEvidenceRefs: ["navigation-ref"],
};

const sectionEvidence: SectionBoundaryEvidence = {
  sectionId: "section-home-hero",
  routePath: "/",
  regionType: "hero",
  selector: "main > section:nth-of-type(1)",
  boundingBox: { x: 0, y: 80, width: 1280, height: 520 },
  confidenceLevel: "HIGH",
};

function baseline(input: {
  navigation?: NavigationEvidence[];
  sections?: SectionBoundaryEvidence[];
  limitations?: string[];
  persistedAssetCount?: number | null;
} = {}): EvidenceCaptureBaselineArtifactRecord {
  return {
    routePath: "/",
    sourceUrl: "https://www.example.test/",
    finalUrl: "https://www.example.test/",
    limitations: input.limitations ?? ["rendered_capture_unavailable"],
    fidelityLimitations: [],
    captureExpansionEvidence: {
      layoutGeometryEvidence: [],
      sectionBoundaryEvidence: input.sections ?? [sectionEvidence],
      navigationEvidence: input.navigation ?? [navigationEvidence],
    },
    summaries: {
      assetInventory: {
        persistedAssetCount: input.persistedAssetCount ?? 3,
      },
    },
  } as EvidenceCaptureBaselineArtifactRecord;
}

function buildReady() {
  return buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    sourceSiteId: "site_123",
    createdAt: CREATED_AT,
    evidenceCaptureBaseline: baseline(),
  });
}

test("builds deterministic Business Discovery findings from imported website evidence", () => {
  const first = buildReady();
  const second = buildReady();

  assert.deepEqual(second, first);
  assert.equal(validateBusinessDiscoveryArtifact(first).valid, true);
  assert.equal(first.status, "partial");
  assert.equal(first.businessDiscoveryId, `business-discovery:${SITE_VERSION_ID}:${DRY_RUN_ID}`);
  assert.equal(first.sourceUrl, "https://www.example.test/");
  assert.equal(first.sourceSiteId, "site_123");
  assert.equal(first.findings.some((finding) => finding.kind === "company_identity_observed"), true);
  assert.equal(first.findings.some((finding) => finding.kind === "primary_navigation_observed"), true);
  assert.equal(first.findings.some((finding) => finding.kind === "offering_candidate_observed"), true);
  assert.equal(first.findings.some((finding) => finding.kind === "contact_path_observed"), true);
  assert.equal(first.findings.some((finding) => finding.kind === "trust_signal_observed"), true);
  assert.equal(first.findings.some((finding) => finding.kind === "content_theme_observed"), true);
  assert.equal(first.findings.some((finding) => finding.kind === "asset_signal_observed"), true);
});

test("implements only website-derived MVP Business Discovery domains", () => {
  const artifact = buildReady();
  assert.deepEqual(artifact.domainSummaries.map((summary) => summary.domain), [
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
  assert.equal(artifact.findings.some((finding) => finding.domain === ("crm" as never)), false);
  assert.equal(artifact.findings.some((finding) => finding.domain === ("commerce" as never)), false);
});

test("missing evidence creates limitations instead of guessed findings", () => {
  const artifact = buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: CREATED_AT,
  });

  assert.equal(artifact.status, "blocked");
  assert.equal(artifact.findings.length, 0);
  assert.equal(artifact.limitations.some((item) => item.code === "WEBSITE_EVIDENCE_MISSING"), true);
  assert.equal(artifact.findings.some((finding) => finding.domain === "audience"), false);
  assert.equal(artifact.limitations.some((item) =>
    item.code === "DOMAIN_SIGNAL_MISSING" &&
    item.message.includes("audience")), true);
  assert.equal(validateBusinessDiscoveryArtifact(artifact).valid, true);
});

test("upstream limitations flow into constraints and top-level safety behavior", () => {
  const artifact = buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: CREATED_AT,
    evidenceCaptureBaseline: baseline({
      limitations: ["missing_computed_styles", "partial_asset_inventory"],
    }),
  });

  const constraints = artifact.domainSummaries.find((summary) => summary.domain === "constraints");
  assert.equal(constraints?.findingIds.length, 1);
  assert.equal(artifact.findings.some((finding) => finding.kind === "evidence_constraint_observed"), true);
  assert.equal(artifact.limitations.some((item) => item.message === "missing_computed_styles"), true);
  assert.equal(artifact.limitations.some((item) => item.message === "partial_asset_inventory"), true);
});

test("candidate discovery context is optional and remains evidence-only", () => {
  const artifact = buildBusinessDiscoveryFromSiteEvidence({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    createdAt: CREATED_AT,
    evidenceCaptureBaseline: baseline(),
    candidateDiscoveryArtifactId: "candidate-discovery-artifact-1",
    candidateDiscoveryResult: {
      discoveryId: "candidate-discovery:dry-run",
      siteVersionId: SITE_VERSION_ID,
      dryRunId: DRY_RUN_ID,
      createdAt: CREATED_AT,
      candidateCount: 1,
      candidateTypesPresent: ["route"],
      candidates: [],
      limitations: [],
      diagnostics: [],
    },
  });

  assert.equal(artifact.findings.some((finding) =>
    finding.kind === "candidate_discovery_context_observed"), true);
  assert.equal("generatedContent" in artifact, false);
  assert.equal("aiOutput" in artifact, false);
});
