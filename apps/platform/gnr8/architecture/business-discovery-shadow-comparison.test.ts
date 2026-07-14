import assert from "node:assert/strict";
import test from "node:test";

import { compareBusinessDiscoveryShadow } from "./business-discovery-shadow-comparison";
import type { BusinessDiscoveryArtifact } from "./business-discovery-contract";

const CREATED_AT = "2026-07-14T00:00:00.000Z";

function artifact(input: Partial<BusinessDiscoveryArtifact> = {}): BusinessDiscoveryArtifact {
  const finding = {
    findingId: "finding:source",
    domain: "digital_presence" as const,
    kind: "source_site_observed",
    summary: "A source website was imported.",
    evidenceRefs: [{ refId: "source-url:https://example.test", sourceKind: "source_url" as const }],
    confidence: { level: "HIGH" as const, reasons: ["source_url_observed"] },
    limitations: [],
    diagnostics: ["DIGITAL_PRESENCE_SOURCE_URL_OBSERVED"],
  };
  const limitation = {
    limitationId: "limitation:upstream",
    severity: "warning" as const,
    code: "UPSTREAM_EVIDENCE_LIMITATION",
    message: "missing_computed_styles",
    evidenceRefs: [{ refId: "evidence:capture-baseline:/", sourceKind: "evidence_capture_baseline" as const, routePath: "/" }],
  };
  return {
    businessDiscoveryId: "business-discovery:site-version:dry-run",
    status: "partial",
    siteVersionId: "site-version",
    dryRunId: "dry-run",
    sourceSiteId: "source-site",
    sourceUrl: "https://example.test/",
    createdAt: CREATED_AT,
    contractVersion: "MVP-1A",
    lineage: {
      siteVersionId: "site-version",
      dryRunId: "dry-run",
      sourceSiteId: "source-site",
      sourceUrl: "https://example.test/",
      evidenceRefs: [{ refId: "site-version:site-version", sourceKind: "site_version" }],
      upstreamArtifactRefs: [],
    },
    domainSummaries: [{
      domain: "digital_presence",
      status: "observed",
      summary: "1 website-derived finding observed for digital_presence.",
      findingIds: [finding.findingId],
      evidenceRefs: finding.evidenceRefs,
      confidence: { level: "HIGH", reasons: ["domain_findings_observed"] },
      limitations: [],
      diagnostics: ["DOMAIN_FINDING_COUNT:1"],
    }],
    findings: [finding],
    confidence: { level: "LOW", reasons: ["limited_website_derived_findings"] },
    limitations: [limitation],
    diagnostics: ["BUSINESS_DISCOVERY_ARTIFACT_VALID"],
    ...input,
  };
}

test("comparison classifies equivalent artifacts as ready", () => {
  const result = compareBusinessDiscoveryShadow({ current: artifact(), shadow: artifact() });

  assert.equal(result.status, "ready_for_optional_runtime_integration");
  assert.equal(result.summary.differenceCount, 0);
});

test("comparison allows deterministic finding-id normalization with identical meaning", () => {
  const shadow = artifact({
    findings: [{ ...artifact().findings[0], findingId: "finding:normalized" }],
    domainSummaries: [{ ...artifact().domainSummaries[0], findingIds: ["finding:normalized"] }],
  });
  const result = compareBusinessDiscoveryShadow({ current: artifact(), shadow });

  assert.equal(result.status, "ready_with_expected_differences");
  assert.equal(result.differences.some((item) => item.classification === "expected_projection_normalization"), true);
});

test("comparison blocks missing current findings and lost evidence refs", () => {
  const missingFinding = compareBusinessDiscoveryShadow({ current: artifact(), shadow: artifact({ findings: [], domainSummaries: [] }) });
  const lostEvidence = compareBusinessDiscoveryShadow({
    current: artifact(),
    shadow: artifact({ findings: [{ ...artifact().findings[0], evidenceRefs: [] }] }),
  });

  assert.equal(missingFinding.status, "blocked");
  assert.equal(missingFinding.differences.some((item) => item.classification === "missing"), true);
  assert.equal(lostEvidence.status, "blocked");
  assert.equal(lostEvidence.differences.some((item) => item.message.includes("lost at least one current evidence reference")), true);
});

test("comparison detects improvements, invented findings, lost limitations, and confidence inflation", () => {
  const strongerLineage = compareBusinessDiscoveryShadow({
    current: artifact(),
    shadow: artifact({
      findings: [{
        ...artifact().findings[0],
        evidenceRefs: [
          ...artifact().findings[0].evidenceRefs,
          { refId: "route:/", sourceKind: "route" as const, routePath: "/" },
        ],
      }],
    }),
  });
  const invented = compareBusinessDiscoveryShadow({
    current: artifact(),
    shadow: artifact({
      findings: [
        ...artifact().findings,
        { ...artifact().findings[0], findingId: "finding:invented", kind: "offering_candidate_observed", summary: "Invented offering.", domain: "offerings" },
      ],
    }),
  });
  const lostLimitation = compareBusinessDiscoveryShadow({ current: artifact(), shadow: artifact({ limitations: [] }) });
  const inflatedConfidence = compareBusinessDiscoveryShadow({
    current: artifact({ findings: [{ ...artifact().findings[0], confidence: { level: "LOW", reasons: ["low"] } }] }),
    shadow: artifact({ findings: [{ ...artifact().findings[0], confidence: { level: "MEDIUM", reasons: ["inflated"] } }] }),
  });

  assert.equal(strongerLineage.differences.some((item) => item.classification === "improvement"), true);
  assert.equal(invented.status, "blocked");
  assert.equal(invented.differences.some((item) => item.classification === "unexpected"), true);
  assert.equal(lostLimitation.status, "blocked");
  assert.equal(lostLimitation.differences.some((item) => item.path.startsWith("limitations.")), true);
  assert.equal(inflatedConfidence.status, "blocked");
  assert.equal(inflatedConfidence.differences.some((item) => item.message.includes("without stronger evidence")), true);
});
