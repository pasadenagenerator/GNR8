import { buildWebsiteDesignBrief } from "./website-design-brief-builder";
import {
  alignedDigitalBusinessTwinFixture,
  businessAlignmentFixture,
  WDB_TEST_CREATED_AT,
} from "./website-design-brief-test-fixtures";
import { buildWebsiteGenerationPackage } from "./website-generation-package-builder";
import type {
  ObservedEvidence,
  ObservedWebsiteModelArtifact,
} from "./observed-website-model-contract";
import type { WebsiteGenerationPackageArtifact } from "./website-generation-package-contract";

export const GCC_TEST_CREATED_AT = WDB_TEST_CREATED_AT;
export const GCC_TEST_SOURCE_PROPOSAL_ID = "generated-website-proposal:gcc-test";
export const GCC_TEST_SOURCE_PAYLOAD_ID = "provider-generation-payload:gcc-test";
export const GCC_TEST_OUTPUT_BUNDLE_ID = "manual-codex-output-bundle:gcc-test";
export const GCC_TEST_OPERATOR_ATTESTATION_ID = "operator-attestation:gcc-test";

export function generationContractComplianceSources(): {
  websiteGenerationPackage: WebsiteGenerationPackageArtifact;
  observedWebsiteModel: ObservedWebsiteModelArtifact;
} {
  const dbt = alignedDigitalBusinessTwinFixture();
  const wdb = buildWebsiteDesignBrief({
    alignedDigitalBusinessTwin: dbt,
    businessAlignment: businessAlignmentFixture(dbt.digitalBusinessTwinId),
    createdAt: GCC_TEST_CREATED_AT,
  });
  const websiteGenerationPackage = buildWebsiteGenerationPackage({
    websiteDesignBrief: wdb,
    createdAt: GCC_TEST_CREATED_AT,
  });
  return {
    websiteGenerationPackage,
    observedWebsiteModel: observedWebsiteModelFixture(websiteGenerationPackage),
  };
}

function sourceEvidence(): ObservedEvidence {
  return {
    observedEvidenceId: "observed_evidence:gcc-test-output-bundle",
    sourceKind: "output_bundle_metadata",
    refId: GCC_TEST_OUTPUT_BUNDLE_ID,
    description: "Observed output bundle metadata for Generation Contract Compliance tests.",
  };
}

function allContractText(
  wgp: WebsiteGenerationPackageArtifact,
  input: { omitAccessibility?: boolean; omitSeo?: boolean } = {},
): string {
  return [
    ...wgp.generationObjectives.map((item) => item.statement),
    ...wgp.messages.map((item) => item.statement),
    ...wgp.contentRequirements
      .filter((item) => !(input.omitAccessibility && item.requirementType === "accessibility"))
      .filter((item) => !(input.omitSeo && item.requirementType === "seo"))
      .map((item) => item.statement),
    ...wgp.constraints.map((item) => item.statement),
  ].join(" ");
}

export function observedWebsiteModelFixture(
  wgp: WebsiteGenerationPackageArtifact,
  input: {
    omitNavigation?: boolean;
    omitMessages?: boolean;
    omitSections?: boolean;
    omitAssets?: boolean;
    omitAccessibility?: boolean;
    omitSeo?: boolean;
    constraintViolation?: boolean;
    status?: ObservedWebsiteModelArtifact["status"];
  } = {},
): ObservedWebsiteModelArtifact {
  const evidence = sourceEvidence();
  const evidenceRefIds = [evidence.observedEvidenceId];
  const pageSummary = wgp.pageContracts.map((page) => `${page.title} ${page.intent}`).join(" ");
  const sectionSummary = wgp.sectionContracts.map((section) => `${section.role} ${section.intent}`).join(" ");
  const accessibilitySummary = wgp.contentRequirements
    .filter((requirement) => requirement.requirementType === "accessibility")
    .map((requirement) => requirement.statement)
    .join(" ");
  const seoSummary = wgp.contentRequirements
    .filter((requirement) => requirement.requirementType === "seo")
    .map((requirement) => requirement.statement)
    .join(" ");
  const readinessStatus = input.status ?? "observable";
  return {
    observedWebsiteModelId: `observed-website-model:gcc-test:${wgp.websiteGenerationPackageId}`,
    status: readinessStatus,
    siteVersionId: wgp.siteVersionId,
    dryRunId: wgp.dryRunId,
    sourceGeneratedWebsiteProposalId: GCC_TEST_SOURCE_PROPOSAL_ID,
    sourceProviderGenerationPayloadId: GCC_TEST_SOURCE_PAYLOAD_ID,
    sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
    createdAt: GCC_TEST_CREATED_AT,
    contractVersion: "MVP-1K-3",
    lineage: {
      siteVersionId: wgp.siteVersionId,
      dryRunId: wgp.dryRunId,
      sourceGeneratedWebsiteProposalId: GCC_TEST_SOURCE_PROPOSAL_ID,
      sourceGeneratedWebsiteProposalStatus: "quarantined",
      sourceGeneratedWebsiteProposalContractVersion: "MVP-1K-1",
      sourceProviderGenerationPayloadId: GCC_TEST_SOURCE_PAYLOAD_ID,
      sourceWebsiteGenerationPackageId: wgp.websiteGenerationPackageId,
      outputBundleId: GCC_TEST_OUTPUT_BUNDLE_ID,
      operatorAttestationId: GCC_TEST_OPERATOR_ATTESTATION_ID,
      observedAt: GCC_TEST_CREATED_AT,
      upstreamArtifactRefs: [evidence],
    },
    pages: wgp.pageContracts.map((page, index) => ({
      observedPageId: `observed_page:gcc-test:${index}`,
      routePath: index === 0 ? "/" : `/page-${index}`,
      title: `${page.title} ${page.intent}`,
      source: "route_metadata",
      evidenceRefIds,
      limitations: [],
      diagnostics: ["GCC_TEST_PAGE"],
    })),
    navigation: input.omitNavigation ? [] : wgp.navigationContract.requiredDestinations.map((destination, index) => ({
      observedNavigationId: `observed_navigation:gcc-test:${index}`,
      label: `${destination.label} ${destination.intent}`,
      href: index === 0 ? "/" : `/page-${index}`,
      source: "navigation_metadata",
      evidenceRefIds,
      limitations: [],
      diagnostics: ["GCC_TEST_NAVIGATION"],
    })),
    sections: input.omitSections ? [] : [{
      observedSectionId: "observed_section:gcc-test:contract",
      routePath: "/",
      sectionType: "contract",
      label: "Contract sections",
      contentSummary: `${sectionSummary} ${input.omitAccessibility ? "" : accessibilitySummary} ${input.omitSeo ? "" : seoSummary}`,
      source: "section_metadata",
      evidenceRefIds,
      limitations: [],
      diagnostics: ["GCC_TEST_SECTION"],
    }],
    messages: input.omitMessages ? [] : [{
      observedMessageId: "observed_message:gcc-test:contract",
      routePath: "/",
      messageKind: "declared_content",
      textSummary: allContractText(wgp, input),
      source: "message_metadata",
      evidenceRefIds,
      limitations: [],
      diagnostics: ["GCC_TEST_MESSAGE"],
    }],
    assets: input.omitAssets ? [] : [{
      observedAssetId: "observed_asset:gcc-test:asset",
      path: "public/observable-website-assets-output-files-present.png",
      assetKind: "image",
      contentType: "image/png",
      source: "asset_metadata",
      evidenceRefIds,
      limitations: [],
      diagnostics: ["GCC_TEST_ASSET"],
    }],
    constraints: wgp.constraints.map((constraint, index) => ({
      observedConstraintId: `observed_constraint:gcc-test:${index}`,
      statement: input.constraintViolation && index === 0
        ? `violated ${constraint.statement}`
        : constraint.statement,
      source: "limitation",
      evidenceRefIds,
      limitations: [],
      diagnostics: ["GCC_TEST_CONSTRAINT"],
    })),
    technicalSignals: [{
      observedTechnicalSignalId: "observed_technical_signal:gcc-test:observable",
      signalType: "observable",
      value: `${input.omitAccessibility ? "" : accessibilitySummary} ${input.omitSeo ? "" : seoSummary}`,
      source: "technical_metadata",
      evidenceRefIds,
      limitations: [],
      diagnostics: ["GCC_TEST_TECHNICAL_SIGNAL"],
    }],
    evidence: [evidence],
    readiness: {
      status: readinessStatus === "invalid" || readinessStatus === "stale" ? "not_observable" : readinessStatus,
      observable: readinessStatus === "observable" || readinessStatus === "partially_observable",
      pageInventoryObserved: true,
      fileInventoryObserved: !input.omitAssets,
      navigationObserved: !input.omitNavigation,
      sectionMetadataObserved: !input.omitSections,
      messageMetadataObserved: !input.omitMessages,
      assetMetadataObserved: !input.omitAssets,
      technicalSignalsObserved: true,
      blockers: readinessStatus === "blocked" ? ["GCC_TEST_BLOCKED"] : [],
      diagnostics: ["GCC_TEST_READINESS"],
    },
    limitations: [
      ...(input.omitNavigation ? [{
        observedLimitationId: "observed_limitation:gcc-test:navigation",
        severity: "info" as const,
        message: "Declared navigation metadata was not available for observation.",
        source: "limitation" as const,
      }] : []),
      ...(input.omitMessages ? [{
        observedLimitationId: "observed_limitation:gcc-test:messages",
        severity: "info" as const,
        message: "Declared messages or note summaries were not available for observation.",
        source: "limitation" as const,
      }] : []),
    ],
    diagnostics: ["GCC_TEST_OBSERVED_WEBSITE_MODEL"],
  };
}
