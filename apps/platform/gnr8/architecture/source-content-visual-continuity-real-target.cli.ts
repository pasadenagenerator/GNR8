import { loadSourceContentVisualContinuityProjection } from "./source-content-visual-continuity-projection-loader";

const TARGETS = [
  { label: "ODV", siteVersionId: "09dce7ea-d860-4f60-a1eb-26c3335b302e" },
  { label: "ViroiDoc", siteVersionId: "e26b0754-988b-45b9-9e24-8e213179b6cf" },
] as const;

function policyCounts(policies: Array<{ proposedPolicy: string }>) {
  return policies.reduce<Record<string, number>>((counts, policy) => {
    counts[policy.proposedPolicy] = (counts[policy.proposedPolicy] ?? 0) + 1;
    return counts;
  }, {});
}

function assetCategoryCounts(assets: Array<{ assetCategory: string }>) {
  return assets.reduce<Record<string, number>>((counts, asset) => {
    counts[asset.assetCategory] = (counts[asset.assetCategory] ?? 0) + 1;
    return counts;
  }, {});
}

function blockTypeCount(blocks: Array<{ contentType: string }>, type: string) {
  return blocks.filter((block) => block.contentType === type).length;
}

function contaminationScan(value: unknown): string[] {
  const text = JSON.stringify(value);
  return [
    "digitalBusinessTwin",
    "businessUnderstandingReport",
    "businessAlignment",
    "websiteDesignBrief",
    "websiteGenerationPackage",
    "providerGenerationPayload",
    "generatedWebsiteProposal",
    "generatedProposalBundle",
    "observedWebsiteModel",
    "complianceReport",
    "improvementPlan",
    "evolutionAnalysis",
    "businessApproval",
    "publishingState",
  ].filter((token) => text.includes(token));
}

async function validateTarget(target: (typeof TARGETS)[number]) {
  const result = await loadSourceContentVisualContinuityProjection({
    siteVersionId: target.siteVersionId,
    options: { generatedAt: "2026-07-16T00:00:00.000Z" },
  });
  if (!result.projection) {
    return {
      target: target.label,
      siteVersionId: target.siteVersionId,
      status: result.status,
      validationValid: result.validation.valid,
      diagnostics: result.diagnostics,
    };
  }
  const rebuiltResult = await loadSourceContentVisualContinuityProjection({
    siteVersionId: target.siteVersionId,
    options: { generatedAt: "2030-01-01T00:00:00.000Z" },
  });
  const projection = result.projection;
  const deterministicRebuildEquality = rebuiltResult.projection?.projectionId === projection.projectionId;
  return {
    target: target.label,
    siteVersionId: target.siteVersionId,
    status: result.status,
    projectionId: projection.projectionId,
    sourceWebsiteUnderstandingProjectionId: projection.sourceWebsiteUnderstandingProjectionId,
    readiness: projection.readiness.status,
    confidence: projection.confidence.level,
    sourceIdentity: projection.sourceIdentity,
    counts: {
      contentBlocks: projection.contentBlocks.length,
      headings: blockTypeCount(projection.contentBlocks, "heading"),
      paragraphs: blockTypeCount(projection.contentBlocks, "paragraph"),
      ctas: blockTypeCount(projection.contentBlocks, "cta"),
      contactDetails: blockTypeCount(projection.contentBlocks, "contact_detail"),
      serviceOfferBlocks: blockTypeCount(projection.contentBlocks, "service_offer_text"),
      audienceLanguageBlocks: blockTypeCount(projection.contentBlocks, "audience_language"),
      trustBlocks: blockTypeCount(projection.contentBlocks, "trust_statement"),
      legalFooterBlocks: blockTypeCount(projection.contentBlocks, "legal_text") + blockTypeCount(projection.contentBlocks, "footer_text"),
      transformationPolicies: policyCounts(projection.contentTransformationCandidates),
      sourceAssets: projection.assetContinuity.length,
      assetCategories: assetCategoryCounts(projection.assetContinuity),
      logoCandidates: projection.visualIdentitySignals.logoCandidates.length,
      imageCandidates: projection.visualIdentitySignals.imageCandidates.length,
      typographyCandidates: projection.visualIdentitySignals.typographyCandidates.length,
      colorSignals: projection.visualIdentitySignals.colorSignals.length,
      screenshots: projection.sourceScreenshots.length,
      limitations: projection.limitations.length,
      diagnostics: projection.diagnostics.length,
    },
    notableSignals: {
      logoCandidateRefs: projection.visualIdentitySignals.logoCandidates.map((candidate) => candidate.sourceReference),
      nationale: projection.visualIdentitySignals.typographyCandidates
        .filter((candidate) => /nationale/i.test(candidate.family))
        .map((candidate) => ({ family: candidate.family, roleCandidate: candidate.roleCandidate, headingUsage: candidate.headingUsage, bodyUsage: candidate.bodyUsage, iconFontUsage: candidate.iconFontUsage })),
      fontello: projection.visualIdentitySignals.typographyCandidates
        .filter((candidate) => /fontello/i.test(candidate.family))
        .map((candidate) => ({ family: candidate.family, roleCandidate: candidate.roleCandidate, headingUsage: candidate.headingUsage, bodyUsage: candidate.bodyUsage, iconFontUsage: candidate.iconFontUsage })),
      layoutContinuity: {
        sections: projection.layoutContinuity.sectionSequence.length,
        heroPresence: projection.layoutContinuity.heroPresence,
        futureDesignIntentSeparated: projection.layoutContinuity.futureDesignIntentSeparated,
      },
      screenshotAvailability: projection.thumbnailReadiness,
      topConfirmationGaps: projection.readiness.blockers.slice(0, 8).map((blocker) => `${blocker.code}: ${blocker.message}`),
      licensingSourceGaps: projection.assetContinuity
        .filter((asset) => asset.reuseCandidate.licensingSourceStatus === "unresolved")
        .slice(0, 8)
        .map((asset) => asset.safeReference),
    },
    deterministicRebuildEquality,
    downstreamContamination: contaminationScan(projection),
    validationValid: result.validation.valid,
    validationErrors: result.validation.errors,
    validationWarnings: result.validation.warnings,
  };
}

async function main() {
  const results = [];
  for (const target of TARGETS) {
    results.push(await validateTarget(target));
  }
  console.log(JSON.stringify({ generatedAt: "2026-07-16T00:00:00.000Z", results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
