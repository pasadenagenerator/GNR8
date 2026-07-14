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
	          { refId: "source-url:https://www.example.test", sourceKind: "source_url" as const },
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

test("comparison distinguishes evidence ordering, supported supersets, unsupported additions, and conflicts", () => {
  const currentFinding = {
    ...artifact().findings[0],
    evidenceRefs: [
      { refId: "evidence:section-boundary:/:navigation", sourceKind: "section_boundary" as const, routePath: "/" },
      { refId: "evidence:section-boundary:/:footer", sourceKind: "section_boundary" as const, routePath: "/" },
    ],
  };
  const orderingOnly = compareBusinessDiscoveryShadow({
    current: artifact({ findings: [currentFinding] }),
    shadow: artifact({ findings: [{ ...currentFinding, evidenceRefs: currentFinding.evidenceRefs.slice().reverse() }] }),
  });
  const supportedSuperset = compareBusinessDiscoveryShadow({
    current: artifact({ findings: [currentFinding] }),
    shadow: artifact({
      findings: [{
        ...currentFinding,
        evidenceRefs: [
          ...currentFinding.evidenceRefs,
          { refId: "evidence:section-boundary:/:content", sourceKind: "section_boundary" as const, routePath: "/" },
        ],
      }],
    }),
  });
  const unsupportedAddition = compareBusinessDiscoveryShadow({
    current: artifact({ findings: [currentFinding] }),
    shadow: artifact({
      findings: [{
        ...currentFinding,
        evidenceRefs: [
          ...currentFinding.evidenceRefs,
          { refId: "evidence:route:/", sourceKind: "route" as const, routePath: "/" },
        ],
      }],
    }),
  });
  const conflicting = compareBusinessDiscoveryShadow({
    current: artifact({ findings: [currentFinding] }),
    shadow: artifact({
      findings: [{
        ...currentFinding,
        evidenceRefs: [
          currentFinding.evidenceRefs[0]!,
          { refId: "evidence:route:/", sourceKind: "route" as const, routePath: "/" },
        ],
      }],
    }),
  });

  assert.equal(orderingOnly.status, "ready_with_expected_differences");
  assert.equal(orderingOnly.differences.some((item) => item.classification === "ordering_only"), true);
  assert.equal(supportedSuperset.status, "ready_with_expected_differences");
  assert.equal(supportedSuperset.differences.some((item) => item.classification === "improvement"), true);
  assert.equal(unsupportedAddition.status, "blocked");
  assert.equal(unsupportedAddition.differences.some((item) => item.classification === "unsupported"), true);
  assert.equal(conflicting.status, "blocked");
  assert.equal(conflicting.differences.some((item) => item.classification === "conflicting"), true);
});

test("comparison accepts added traceable limitations and rejects duplicate semantic limitations", () => {
  const addedTraceable = {
    limitationId: "limitation:projection-transparency",
    severity: "warning" as const,
    code: "UPSTREAM_FIDELITY_LIMITATION",
    message: "Rendered DOM fidelity is partial.",
    evidenceRefs: [{ refId: "rendered-dom", sourceKind: "evidence_capture_baseline" as const, routePath: "/" }],
  };
  const accepted = compareBusinessDiscoveryShadow({
    current: artifact(),
    shadow: artifact({ limitations: [...artifact().limitations, addedTraceable] }),
  });
  const duplicate = compareBusinessDiscoveryShadow({
    current: artifact(),
    shadow: artifact({ limitations: [...artifact().limitations, artifact().limitations[0]!] }),
  });

  assert.equal(accepted.status, "ready_with_expected_differences");
  assert.equal(accepted.differences.some((item) => item.message.includes("source-traceable limitation")), true);
  assert.equal(duplicate.status, "blocked");
  assert.equal(duplicate.differences.some((item) => item.message.includes("duplicate semantic limitations")), true);
});
