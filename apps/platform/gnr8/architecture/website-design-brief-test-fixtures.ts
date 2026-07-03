import {
  BUSINESS_ALIGNMENT_CONTRACT_VERSION,
  type BusinessAlignmentArtifact,
} from "./business-alignment-contract";
import {
  DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
  DIGITAL_BUSINESS_TWIN_DOMAINS,
  type DigitalBusinessTwinArtifact,
  type DigitalBusinessTwinConfidence,
  type DigitalBusinessTwinDomain,
  type DigitalBusinessTwinEvidenceRef,
  type DigitalBusinessTwinKnowledgeItem,
  type DigitalBusinessTwinMissingKnowledge,
} from "./digital-business-twin-contract";

export const WDB_TEST_SITE_VERSION_ID = "site-version-website-design-brief";
export const WDB_TEST_DRY_RUN_ID = "dry-run-website-design-brief";
export const WDB_TEST_CREATED_AT = "2026-07-03T12:00:00.000Z";

const statements: Record<DigitalBusinessTwinDomain, string> = {
  business_identity: "Acme Studio is a specialist advisory business for practical home improvement decisions.",
  offerings: "Acme Studio offers renovation planning, supplier coordination, and decision support.",
  audience: "The primary audience is homeowners who need confidence before starting renovation work.",
  brand: "The brand should feel clear, calm, experienced, and practical.",
  digital_presence: "The current digital presence should help visitors understand the business and choose a contact path.",
  goals: "The business goal is to increase qualified consultation requests from homeowners.",
  trust: "Trust is supported by visible expertise, completed work examples, and clear contact information.",
  content: "Important content includes services, process, proof, frequently asked questions, and contact options.",
  constraints: "The experience should preserve uncertainty where service coverage or pricing is not confirmed.",
};

function evidenceRef(domain: DigitalBusinessTwinDomain): DigitalBusinessTwinEvidenceRef {
  return {
    refId: `evidence:${domain}`,
    sourceKind: "aligned_digital_business_twin_fixture",
    routePath: "/",
    description: `Fixture evidence for ${domain}.`,
  };
}

function confidence(level: DigitalBusinessTwinConfidence["level"] = "HIGH"): DigitalBusinessTwinConfidence {
  return {
    level,
    reasons: [`fixture_${level.toLowerCase()}_confidence`],
  };
}

function knowledgeItem(
  domain: DigitalBusinessTwinDomain,
  level: DigitalBusinessTwinConfidence["level"] = "HIGH",
): DigitalBusinessTwinKnowledgeItem {
  return {
    knowledgeItemId: `dbt-knowledge:${domain}`,
    domain,
    status: "observed",
    kind: "aligned_business_knowledge",
    statement: statements[domain],
    sourceFindingIds: [`finding:${domain}`],
    evidenceRefs: [evidenceRef(domain)],
    confidence: confidence(level),
    limitations: [],
    diagnostics: [`DBT_FIXTURE_KNOWLEDGE:${domain}`],
  };
}

function missingKnowledge(domain: DigitalBusinessTwinDomain): DigitalBusinessTwinMissingKnowledge {
  return {
    missingKnowledgeId: `dbt-missing:${domain}`,
    domain,
    reason: `Aligned Digital Business Twin is missing confirmed ${domain} knowledge.`,
    sourceLimitationIds: [`limitation:${domain}`],
    diagnostics: [`DBT_FIXTURE_MISSING:${domain}`],
  };
}

export function alignedDigitalBusinessTwinFixture(input: {
  missingDomains?: DigitalBusinessTwinDomain[];
  confidenceLevel?: DigitalBusinessTwinConfidence["level"];
  limitations?: string[];
  status?: DigitalBusinessTwinArtifact["status"];
} = {}): DigitalBusinessTwinArtifact {
  const missingDomains = new Set(input.missingDomains ?? []);
  const knowledgeItems = DIGITAL_BUSINESS_TWIN_DOMAINS
    .filter((domain) => !missingDomains.has(domain))
    .map((domain) => knowledgeItem(domain, input.confidenceLevel ?? "HIGH"));
  const missing = DIGITAL_BUSINESS_TWIN_DOMAINS
    .filter((domain) => missingDomains.has(domain))
    .map(missingKnowledge);
  return {
    digitalBusinessTwinId: missingDomains.size > 0
      ? "digital-business-twin-aligned-with-missing"
      : "digital-business-twin-aligned",
    status: input.status ?? "aligned",
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    sourceBusinessDiscoveryArtifactId: "business-discovery-artifact-wdb-fixture",
    createdAt: WDB_TEST_CREATED_AT,
    contractVersion: DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
    lineage: {
      siteVersionId: WDB_TEST_SITE_VERSION_ID,
      dryRunId: WDB_TEST_DRY_RUN_ID,
      sourceBusinessDiscoveryArtifactId: "business-discovery-artifact-wdb-fixture",
      sourceBusinessDiscoveryId: "business-discovery-wdb-fixture",
      sourceBusinessDiscoveryStatus: "valid",
      sourceBusinessDiscoveryContractVersion: "MVP-1A",
      evidenceRefs: DIGITAL_BUSINESS_TWIN_DOMAINS.map(evidenceRef),
      upstreamArtifactRefs: [{
        refId: "business-discovery-artifact-wdb-fixture",
        sourceKind: "business_discovery",
      }],
    },
    domains: DIGITAL_BUSINESS_TWIN_DOMAINS.map((domain) => {
      const domainKnowledge = knowledgeItems.filter((item) => item.domain === domain);
      const domainMissing = missing.filter((item) => item.domain === domain);
      return {
        domain,
        status: domainMissing.length > 0 ? "partial" : "observed",
        summary: domainKnowledge[0]?.statement ?? domainMissing[0]?.reason ?? `No knowledge for ${domain}.`,
        knowledgeItemIds: domainKnowledge.map((item) => item.knowledgeItemId),
        missingKnowledgeIds: domainMissing.map((item) => item.missingKnowledgeId),
        confidence: confidence(input.confidenceLevel ?? "HIGH"),
        diagnostics: [`DBT_FIXTURE_DOMAIN:${domain}`],
      };
    }),
    knowledgeItems,
    confidence: confidence(input.confidenceLevel ?? "HIGH"),
    missingKnowledge: missing,
    limitations: input.limitations ?? [],
    diagnostics: ["DBT_FIXTURE_ALIGNED"],
  };
}

export function businessAlignmentFixture(
  outputDigitalBusinessTwinId = "digital-business-twin-aligned",
): BusinessAlignmentArtifact {
  return {
    businessAlignmentId: `business-alignment-for:${outputDigitalBusinessTwinId}`,
    status: "applied",
    siteVersionId: WDB_TEST_SITE_VERSION_ID,
    dryRunId: WDB_TEST_DRY_RUN_ID,
    sourceBusinessUnderstandingReportId: "business-understanding-report-wdb-fixture",
    sourceDigitalBusinessTwinId: "digital-business-twin-before-alignment",
    createdAt: WDB_TEST_CREATED_AT,
    contractVersion: BUSINESS_ALIGNMENT_CONTRACT_VERSION,
    lineage: {
      siteVersionId: WDB_TEST_SITE_VERSION_ID,
      dryRunId: WDB_TEST_DRY_RUN_ID,
      sourceBusinessUnderstandingReportId: "business-understanding-report-wdb-fixture",
      sourceBusinessUnderstandingReportStatus: "valid",
      sourceBusinessUnderstandingReportContractVersion: "MVP-1C",
      sourceDigitalBusinessTwinId: "digital-business-twin-before-alignment",
      sourceDigitalBusinessTwinStatus: "observed",
      sourceDigitalBusinessTwinContractVersion: DIGITAL_BUSINESS_TWIN_CONTRACT_VERSION,
      outputDigitalBusinessTwinId,
      evidenceRefs: [{
        refId: "business-alignment-evidence",
        sourceKind: "business_alignment",
      }],
      upstreamArtifactRefs: [{
        refId: "business-understanding-report-wdb-fixture",
        sourceKind: "business_understanding_report",
      }],
    },
    decisions: [],
    corrections: [],
    confidence: confidence("HIGH"),
    limitations: [],
    diagnostics: ["BUSINESS_ALIGNMENT_FIXTURE"],
  };
}
