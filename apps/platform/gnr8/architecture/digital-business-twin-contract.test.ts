import assert from "node:assert/strict";
import test from "node:test";

import {
  DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
  DIGITAL_BUSINESS_TWIN_DOMAINS,
  validateDigitalBusinessTwinArtifact,
  type DigitalBusinessTwinArtifact,
} from "./digital-business-twin-contract";

function validArtifact(input: Partial<DigitalBusinessTwinArtifact> = {}): DigitalBusinessTwinArtifact {
  const evidenceRef = {
    refId: "business-discovery:source-url",
    sourceKind: "source_url",
  };
  const knowledgeItem = {
    knowledgeItemId: "dbt-knowledge:business_identity:abc123",
    domain: "business_identity" as const,
    status: "observed" as const,
    kind: "company_identity_observed",
    statement: "Imported website host example.test is observed as a business identity signal.",
    sourceFindingIds: ["business-discovery:business_identity:company_identity_observed:example"],
    evidenceRefs: [evidenceRef],
    confidence: { level: "LOW" as const, reasons: ["business_discovery_finding"] },
    limitations: [],
    diagnostics: ["DBT_KNOWLEDGE_FROM_BUSINESS_DISCOVERY_FINDING"],
  };
  const missingKnowledge = DIGITAL_BUSINESS_TWIN_DOMAINS
    .filter((domain) => domain !== "business_identity")
    .map((domain) => ({
      missingKnowledgeId: `dbt-missing:${domain}`,
      domain,
      reason: `Business Discovery did not provide deterministic knowledge for ${domain}.`,
      sourceBusinessDiscoveryDomainStatus: "partial",
      sourceLimitationIds: [],
      diagnostics: ["BUSINESS_DISCOVERY_DOMAIN_MISSING"],
    }));
  return {
    digitalBusinessTwinId: "digital-business-twin:site-version-1:dry-run-1:business-discovery-artifact-1",
    status: "partial",
    siteVersionId: "site-version-1",
    dryRunId: "dry-run-1",
    sourceBusinessDiscoveryArtifactId: "business-discovery-artifact-1",
    createdAt: "2026-07-02T08:00:00.000Z",
    contractVersion: DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
    lineage: {
      siteVersionId: "site-version-1",
      dryRunId: "dry-run-1",
      sourceBusinessDiscoveryArtifactId: "business-discovery-artifact-1",
      sourceBusinessDiscoveryId: "business-discovery:site-version-1:dry-run-1",
      sourceBusinessDiscoveryStatus: "partial",
      sourceBusinessDiscoveryContractVersion: "MVP-1A",
      evidenceRefs: [evidenceRef],
      upstreamArtifactRefs: [{ refId: "business-discovery-artifact-1", sourceKind: "business_discovery" }],
    },
    domains: DIGITAL_BUSINESS_TWIN_DOMAINS.map((domain) => {
      const isIdentity = domain === "business_identity";
      return {
        domain,
        status: isIdentity ? "observed" as const : "partial" as const,
        summary: isIdentity
          ? "One Business Discovery knowledge item currently informs business_identity."
          : `No current Business Discovery knowledge is available for ${domain}.`,
        knowledgeItemIds: isIdentity ? [knowledgeItem.knowledgeItemId] : [],
        missingKnowledgeIds: isIdentity ? [] : [`dbt-missing:${domain}`],
        confidence: { level: "LOW" as const, reasons: ["business_discovery_domain_summary"] },
        diagnostics: ["DBT_DOMAIN_STATUS:partial"],
      };
    }),
    knowledgeItems: [knowledgeItem],
    confidence: { level: "LOW", reasons: ["missing_business_knowledge"] },
    missingKnowledge,
    limitations: [],
    diagnostics: ["DIGITAL_BUSINESS_TWIN_ARTIFACT_VALID"],
    ...input,
  };
}

test("valid Digital Business Twin artifact passes", () => {
  assert.deepEqual(validateDigitalBusinessTwinArtifact(validArtifact()), {
    valid: true,
    errors: [],
    warnings: [],
  });
});

test("allowed DBT statuses are contract-valid", () => {
  for (const status of ["observed", "partial", "aligned", "confirmed", "invalid", "blocked", "stale"] as const) {
    const artifact = validArtifact({ status });
    assert.equal(validateDigitalBusinessTwinArtifact(artifact).valid, true, status);
  }
});

test("invalid status, duplicate knowledge item IDs, and unknown domains are rejected", () => {
  const invalidStatus = validArtifact({ status: "valid" as never });
  assert.match(validateDigitalBusinessTwinArtifact(invalidStatus).errors.join("\n"), /status/);

  const duplicate = validArtifact();
  duplicate.knowledgeItems = [duplicate.knowledgeItems[0], { ...duplicate.knowledgeItems[0] }];
  assert.match(validateDigitalBusinessTwinArtifact(duplicate).errors.join("\n"), /knowledgeItemId must be unique/);

  const unknownDomain = validArtifact();
  unknownDomain.knowledgeItems[0].domain = "crm" as never;
  assert.match(validateDigitalBusinessTwinArtifact(unknownDomain).errors.join("\n"), /not an allowed Digital Business Twin domain/);
});

test("missing knowledge must cover domains with no knowledge items", () => {
  const artifact = validArtifact();
  artifact.missingKnowledge = artifact.missingKnowledge.filter((item) => item.domain !== "audience");
  artifact.domains.find((domain) => domain.domain === "audience")!.missingKnowledgeIds = [];

  const validation = validateDigitalBusinessTwinArtifact(artifact);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /missingKnowledge must include audience/);
});

test("forbidden downstream fields are rejected recursively", () => {
  for (const field of [
    "businessUnderstandingReport",
    "businessAlignment",
    "websiteDesignBrief",
    "websiteGenerationPackage",
    "providerPayload",
    "prompt",
    "aiOutput",
    "generatedContent",
    "generatedHtml",
    "generatedReact",
    "publishingArtifact",
    "deploymentArtifact",
    "executionArtifact",
  ]) {
    const artifact = validArtifact() as unknown as Record<string, unknown>;
    artifact.diagnostics = [{ [field]: "forbidden" }];
    const validation = validateDigitalBusinessTwinArtifact(artifact);
    assert.equal(validation.valid, false, field);
    assert.match(validation.errors.join("\n"), new RegExp(`${field} is forbidden`));
  }
});
