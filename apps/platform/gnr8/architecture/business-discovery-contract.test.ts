import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSINESS_DISCOVERY_CONTRACT_VERSION,
  validateBusinessDiscoveryArtifact,
  type BusinessDiscoveryArtifact,
} from "./business-discovery-contract";

function validArtifact(input: Partial<BusinessDiscoveryArtifact> = {}): BusinessDiscoveryArtifact {
  const evidenceRef = {
    refId: "source-url:https%3A%2F%2Fexample.test%2F",
    sourceKind: "source_url" as const,
  };
  const finding = {
    findingId: "business-discovery:business_identity:company_identity_observed:example.test",
    domain: "business_identity" as const,
    kind: "company_identity_observed",
    summary: "Imported website host example.test is observed as the first business identity signal.",
    evidenceRefs: [evidenceRef],
    confidence: { level: "LOW" as const, reasons: ["source_url_observed"] },
    limitations: [],
    diagnostics: ["BUSINESS_IDENTITY_FROM_SOURCE_HOST"],
  };
  return {
    businessDiscoveryId: "business-discovery:site-version-1:dry-run-1",
    status: "partial",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    sourceUrl: "https://example.test/",
    createdAt: "2026-07-01T08:00:00.000Z",
    contractVersion: BUSINESS_DISCOVERY_CONTRACT_VERSION,
    lineage: {
      siteVersionId: "site-version-1",
      dryRunId: "dry-run-1",
      sourceUrl: "https://example.test/",
      evidenceRefs: [evidenceRef],
      upstreamArtifactRefs: [],
    },
    domainSummaries: [{
      domain: "business_identity",
      status: "observed",
      summary: "One business identity finding was observed.",
      findingIds: [finding.findingId],
      evidenceRefs: [evidenceRef],
      confidence: { level: "LOW", reasons: ["domain_findings_observed"] },
      limitations: [],
      diagnostics: ["DOMAIN_FINDING_COUNT:1"],
    }],
    findings: [finding],
    confidence: { level: "LOW", reasons: ["website_only_business_discovery"] },
    limitations: [],
    diagnostics: ["BUSINESS_DISCOVERY_ARTIFACT_VALID"],
    ...input,
  };
}

test("valid Business Discovery artifact passes", () => {
  assert.deepEqual(validateBusinessDiscoveryArtifact(validArtifact()), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("partial and blocked Business Discovery artifacts are valid contract states", () => {
  assert.equal(validateBusinessDiscoveryArtifact(validArtifact({ status: "partial" })).valid, true);
  assert.equal(validateBusinessDiscoveryArtifact(validArtifact({
    status: "blocked",
    findings: [],
    domainSummaries: [{
      domain: "business_identity",
      status: "partial",
      summary: "No website-derived finding was observed for business_identity.",
      findingIds: [],
      evidenceRefs: [],
      confidence: { level: "LOW", reasons: ["domain_signal_missing"] },
      limitations: [],
      diagnostics: ["DOMAIN_FINDING_COUNT:0"],
    }],
    limitations: [{
      limitationId: "business-discovery:website-evidence:WEBSITE_EVIDENCE_MISSING",
      severity: "blocker",
      code: "WEBSITE_EVIDENCE_MISSING",
      message: "Business Discovery requires imported website evidence beyond the siteVersionId.",
    }],
  })).valid, true);
});

test("invalid status, domain, duplicate finding IDs, and missing finding refs are rejected", () => {
  const invalidStatus = validArtifact({ status: "complete" as never });
  assert.match(validateBusinessDiscoveryArtifact(invalidStatus).errors.join("\n"), /status/);

  const invalidDomain = validArtifact();
  invalidDomain.findings[0].domain = "crm" as never;
  assert.match(validateBusinessDiscoveryArtifact(invalidDomain).errors.join("\n"), /domain/);

  const duplicate = validArtifact();
  duplicate.findings = [duplicate.findings[0], { ...duplicate.findings[0] }];
  assert.match(validateBusinessDiscoveryArtifact(duplicate).errors.join("\n"), /findingId must be unique/);

  const missingRefs = validArtifact();
  missingRefs.findings[0].evidenceRefs = [];
  assert.match(validateBusinessDiscoveryArtifact(missingRefs).errors.join("\n"), /evidenceRefs must contain at least one evidence ref/);
});

test("forbidden generated/provider/publishing fields are rejected recursively", () => {
  for (const field of [
    "generatedContent",
    "generatedHtml",
    "generatedReact",
    "generatedComponents",
    "generatedBlocks",
    "providerPayload",
    "prompt",
    "aiOutput",
    "websiteDesignBrief",
    "websiteGenerationPackage",
    "publishingArtifact",
    "deploymentArtifact",
    "executionArtifact",
  ]) {
    const artifact = validArtifact() as unknown as Record<string, unknown>;
    artifact.diagnostics = [{ [field]: "forbidden" }];
    const validation = validateBusinessDiscoveryArtifact(artifact);
    assert.equal(validation.valid, false, field);
    assert.match(validation.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});
