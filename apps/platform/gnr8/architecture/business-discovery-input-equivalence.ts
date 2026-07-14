import type { BusinessDiscoveryBuilderInput } from "./business-discovery-builder";
import type { SourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-contract";

export type BusinessDiscoveryInputEquivalenceStatus = "YES" | "PARTIAL" | "NO";

export type BusinessDiscoveryDependencyCategory =
  | "import"
  | "semantic_import"
  | "evidence_capture"
  | "candidate_discovery"
  | "candidate_review"
  | "reconstruction"
  | "structure_plan"
  | "runtime_metadata"
  | "diagnostics"
  | "limitations";

export type BusinessDiscoveryDependencyMatrixRow = {
  dependencyId: string;
  category: BusinessDiscoveryDependencyCategory;
  dependency: string;
  currentBusinessDiscoveryUse: string;
  alreadyProjected: BusinessDiscoveryInputEquivalenceStatus;
  strength: "equivalent" | "weaker" | "stronger" | "not_projected";
  reason: string;
  requiredSourceArtifact: string;
  missingProjection: string | null;
  futureClassifier: string | null;
  humanConfirmationRequirement: string | null;
  obsoleteAfterMigration: string | null;
};

export type WebsiteUnderstandingCoverageCategory =
  | "Identity"
  | "Routes"
  | "Pages"
  | "Navigation"
  | "Sections"
  | "Body content"
  | "Messages"
  | "CTA"
  | "Assets"
  | "Logo candidates"
  | "Color signals"
  | "Typography signals"
  | "Trust candidates"
  | "Offering candidates"
  | "Audience candidates"
  | "Goals"
  | "Geography"
  | "Languages"
  | "Technical signals"
  | "SEO"
  | "Diagnostics"
  | "Limitations"
  | "Readiness"
  | "Lineage"
  | "Confidence";

export type WebsiteUnderstandingCoverageReportRow = {
  category: WebsiteUnderstandingCoverageCategory;
  status: BusinessDiscoveryInputEquivalenceStatus;
  projectedCount: number;
  reason: string;
};

export type WebsiteUnderstandingCoverageReport = {
  coveragePercent: number;
  coveredCategoryCount: number;
  partialCategoryCount: number;
  missingCategoryCount: number;
  categories: WebsiteUnderstandingCoverageReportRow[];
};

export type BusinessDiscoveryInputEquivalenceResult = {
  coveragePercent: number;
  matrix: BusinessDiscoveryDependencyMatrixRow[];
  coverageReport: WebsiteUnderstandingCoverageReport;
  covered: BusinessDiscoveryDependencyMatrixRow[];
  partiallyCovered: BusinessDiscoveryDependencyMatrixRow[];
  missing: BusinessDiscoveryDependencyMatrixRow[];
  unexpected: string[];
  duplicate: string[];
  conflicting: string[];
  obsoleteRuntimeAssemblies: string[];
  migrationBlockers: string[];
  recommendedMigrationOrder: string[];
};

type DependencySpec = Omit<BusinessDiscoveryDependencyMatrixRow, "alreadyProjected" | "strength" | "reason" | "missingProjection"> & {
  coverage: (projection: SourceWebsiteUnderstandingProjection, existing: BusinessDiscoveryBuilderInput) => Pick<BusinessDiscoveryDependencyMatrixRow, "alreadyProjected" | "strength" | "reason" | "missingProjection">;
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) => left.localeCompare(right));
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function sourceUrl(input: BusinessDiscoveryBuilderInput): string | null {
  return text(input.sourceUrl) ??
    asArray(input.evidenceCaptureBaseline).map((baseline) => text(baseline.sourceUrl) ?? text(baseline.finalUrl)).find(Boolean) ??
    text(input.importProvenanceSummary?.multiPageDiscovery?.manifest?.seedUrl);
}

function existingRoutePaths(input: BusinessDiscoveryBuilderInput): string[] {
  const baselines = asArray(input.evidenceCaptureBaseline);
  return uniqueSorted([
    ...baselines.map((baseline) => baseline.routePath),
    ...(input.layoutGeometryEvidence ?? []).map((item) => item.routePath),
    ...(input.sectionBoundaryEvidence ?? []).map((item) => item.routePath),
    ...(input.navigationEvidence ?? []).map((item) => item.routePath),
    ...baselines.flatMap((baseline) => baseline.captureExpansionEvidence.layoutGeometryEvidence.map((item) => item.routePath)),
    ...baselines.flatMap((baseline) => baseline.captureExpansionEvidence.sectionBoundaryEvidence.map((item) => item.routePath)),
    ...baselines.flatMap((baseline) => baseline.captureExpansionEvidence.navigationEvidence.map((item) => item.routePath)),
    ...(input.importProvenanceSummary?.multiPageDiscovery?.manifest?.routeCandidates ?? []),
    ...(input.importProvenanceSummary?.multiPageDiscovery?.manifest?.discoveredPages ?? []).map((item) => item.normalizedRoutePath ?? ""),
    ...(input.importProvenanceSummary?.multiPageDiscovery?.rawArtifactAssembly?.routeMap ?? []).map((item) => item.routePath),
    ...(input.candidateDiscoveryResult?.candidates ?? []).map((item) => item.routePath ?? ""),
  ]);
}

function existingNavigationLabels(input: BusinessDiscoveryBuilderInput): string[] {
  const baselines = asArray(input.evidenceCaptureBaseline);
  return uniqueSorted([
    ...(input.navigationEvidence ?? []).flatMap((item) => item.navigationItems.map((nav) => nav.label)),
    ...baselines.flatMap((baseline) => baseline.captureExpansionEvidence.navigationEvidence.flatMap((item) => item.navigationItems.map((nav) => nav.label))),
  ].map((value) => value.trim()));
}

function existingSectionTypes(input: BusinessDiscoveryBuilderInput): string[] {
  const baselines = asArray(input.evidenceCaptureBaseline);
  return uniqueSorted([
    ...(input.sectionBoundaryEvidence ?? []).map((item) => item.regionType),
    ...baselines.flatMap((baseline) => baseline.captureExpansionEvidence.sectionBoundaryEvidence.map((item) => item.regionType)),
  ]);
}

function existingAssetCount(input: BusinessDiscoveryBuilderInput): number {
  return asArray(input.evidenceCaptureBaseline)
    .map((baseline) => baseline.summaries.assetInventory.persistedAssetCount)
    .filter((count): count is number => typeof count === "number" && Number.isFinite(count))
    .reduce((sum, count) => sum + count, 0);
}

function existingLimitationCount(input: BusinessDiscoveryBuilderInput): number {
  return asArray(input.evidenceCaptureBaseline)
    .reduce((sum, baseline) => sum + baseline.limitations.length + baseline.fidelityLimitations.length, 0);
}

function expectedEvidenceLimitations(input: BusinessDiscoveryBuilderInput): string[] {
  return uniqueSorted(asArray(input.evidenceCaptureBaseline).flatMap((baseline) => [
    ...baseline.limitations.map((message) => `UPSTREAM_EVIDENCE_LIMITATION\u0000${message}`),
    ...baseline.fidelityLimitations.map((item) => `UPSTREAM_FIDELITY_LIMITATION\u0000${item.explanation}\u0000${item.type}\u0000${item.affectedLayer}\u0000${item.recommendedNextLayer}`),
  ]));
}

function projectedEvidenceLimitations(projection: SourceWebsiteUnderstandingProjection): string[] {
  return uniqueSorted(projection.limitations.flatMap((item) => {
    if (item.code === "UPSTREAM_EVIDENCE_LIMITATION") return [`${item.code}\u0000${item.message}`];
    if (item.code === "UPSTREAM_FIDELITY_LIMITATION") {
      const diagnostics = item.diagnostics ?? [];
      return [`${item.code}\u0000${item.message}\u0000${item.originalCode ?? diagnostics[0] ?? ""}\u0000${diagnostics[1] ?? ""}\u0000${diagnostics[2] ?? ""}`];
    }
    return [];
  }));
}

function allIncluded<T>(expected: T[], projected: T[]): boolean {
  const set = new Set(projected);
  return expected.every((item) => set.has(item));
}

function statusFromExpected(input: {
  expected: string[];
  projected: string[];
  emptyReason: string;
  coveredReason: string;
  partialReason: string;
  missingProjection: string;
}): Pick<BusinessDiscoveryDependencyMatrixRow, "alreadyProjected" | "strength" | "reason" | "missingProjection"> {
  if (input.expected.length === 0) {
    return {
      alreadyProjected: input.projected.length > 0 ? "YES" : "PARTIAL",
      strength: input.projected.length > 0 ? "stronger" : "equivalent",
      reason: input.projected.length > 0 ? "Website Understanding projects this concept even though the current Business Discovery input did not require it for this target." : input.emptyReason,
      missingProjection: null,
    };
  }
  if (allIncluded(input.expected, input.projected)) {
    return { alreadyProjected: "YES", strength: "equivalent", reason: input.coveredReason, missingProjection: null };
  }
  if (input.projected.length > 0) {
    return { alreadyProjected: "PARTIAL", strength: "weaker", reason: input.partialReason, missingProjection: input.missingProjection };
  }
  return { alreadyProjected: "NO", strength: "not_projected", reason: input.partialReason, missingProjection: input.missingProjection };
}

const dependencySpecs: DependencySpec[] = [
  {
    dependencyId: "runtime.site_version_id",
    category: "runtime_metadata",
    dependency: "siteVersionId",
    currentBusinessDiscoveryUse: "Required artifact identity and lineage anchor.",
    requiredSourceArtifact: "runtime site version",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: "Business Discovery no longer needs to receive siteVersionId separately from scattered input.",
    coverage: (projection, existing) => ({
      alreadyProjected: projection.siteVersionId === existing.siteVersionId ? "YES" : "NO",
      strength: projection.siteVersionId === existing.siteVersionId ? "equivalent" : "not_projected",
      reason: projection.siteVersionId === existing.siteVersionId ? "Projection carries the exact siteVersionId." : "Projection siteVersionId does not match the existing input.",
      missingProjection: projection.siteVersionId === existing.siteVersionId ? null : "matching projection.siteVersionId",
    }),
  },
  {
    dependencyId: "runtime.dry_run_id",
    category: "runtime_metadata",
    dependency: "dryRunId",
    currentBusinessDiscoveryUse: "Required artifact identity and dry-run lineage.",
    requiredSourceArtifact: "first limited dry run or candidate lineage",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: "Business Discovery no longer needs a separate dryRunId parameter when the projection carries exact dry-run lineage.",
    coverage: (projection, existing) => ({
      alreadyProjected: projection.dryRunId === existing.dryRunId ? "YES" : projection.dryRunId ? "PARTIAL" : "NO",
      strength: projection.dryRunId === existing.dryRunId ? "equivalent" : projection.dryRunId ? "weaker" : "not_projected",
      reason: projection.dryRunId === existing.dryRunId ? "Projection carries the exact dryRunId." : "Projection dryRunId is missing or differs from the current Business Discovery input.",
      missingProjection: projection.dryRunId === existing.dryRunId ? null : "matching projection.dryRunId",
    }),
  },
  {
    dependencyId: "runtime.source_site_id",
    category: "runtime_metadata",
    dependency: "sourceSiteId",
    currentBusinessDiscoveryUse: "Optional copied source site identity on the artifact and lineage.",
    requiredSourceArtifact: "runtime site version",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: null,
    coverage: (projection, existing) => ({
      alreadyProjected: existing.sourceSiteId && projection.sourceSiteId === existing.sourceSiteId ? "YES" : existing.sourceSiteId ? "NO" : "PARTIAL",
      strength: existing.sourceSiteId && projection.sourceSiteId === existing.sourceSiteId ? "equivalent" : existing.sourceSiteId ? "not_projected" : "equivalent",
      reason: existing.sourceSiteId && projection.sourceSiteId === existing.sourceSiteId ? "Projection carries the exact persisted sourceSiteId from the runtime site-version boundary." : existing.sourceSiteId ? "Projection sourceSiteId is missing or differs from the current Business Discovery input." : "No sourceSiteId was required by this existing input.",
      missingProjection: existing.sourceSiteId && projection.sourceSiteId === existing.sourceSiteId ? null : existing.sourceSiteId ? "matching projection.sourceSiteId and sourceIdentity.sourceSiteId" : null,
    }),
  },
  {
    dependencyId: "import.source_url",
    category: "import",
    dependency: "source URL and hostname",
    currentBusinessDiscoveryUse: "Creates business_identity and digital_presence findings from observed host/source URL.",
    requiredSourceArtifact: "raw import metadata, evidence baseline, or import provenance seed URL",
    futureClassifier: null,
    humanConfirmationRequirement: "Host-derived identity remains a candidate, not legal business identity.",
    obsoleteAfterMigration: "Business Discovery sourceUrl fallback resolution becomes unnecessary.",
    coverage: (projection, existing) => {
      const expected = sourceUrl(existing);
      const projected = projection.sourceIdentity?.sourceUrl ?? null;
      return {
        alreadyProjected: expected && projected === expected ? "YES" : projected ? "PARTIAL" : "NO",
        strength: expected && projected === expected ? "equivalent" : projected ? "weaker" : "not_projected",
        reason: expected && projected === expected ? "Projection carries the exact imported source URL and hostname." : "Projection source URL is missing or differs from the existing resolved Business Discovery URL.",
        missingProjection: expected && projected === expected ? null : "matching sourceIdentity.sourceUrl and hostname",
      };
    },
  },
  {
    dependencyId: "import.route_inventory",
    category: "import",
    dependency: "route inventory",
    currentBusinessDiscoveryUse: "Creates route inventory digital_presence findings and route-based keyword findings.",
    requiredSourceArtifact: "import provenance route candidates, discovered pages, raw route map, evidence capture, or candidate discovery",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: "Business Discovery collectRoutePaths(...) aggregation becomes unnecessary.",
    coverage: (projection, existing) => statusFromExpected({
      expected: existingRoutePaths(existing),
      projected: projection.routes.map((route) => route.routePath),
      emptyReason: "No route inventory was present in the existing Business Discovery input.",
      coveredReason: "Projection routes cover the route inventory Business Discovery currently aggregates.",
      partialReason: "Projection routes do not cover every route path Business Discovery can currently aggregate.",
      missingProjection: "routes[].routePath coverage for every imported/evidence/candidate route",
    }),
  },
  {
    dependencyId: "semantic_import.navigation_labels",
    category: "semantic_import",
    dependency: "navigation labels and hrefs",
    currentBusinessDiscoveryUse: "Creates digital_presence plus offering/audience/trust/goal candidates from route and navigation wording.",
    requiredSourceArtifact: "navigation evidence or semantic import navigation",
    futureClassifier: null,
    humanConfirmationRequirement: "Keyword-derived business concepts remain candidates.",
    obsoleteAfterMigration: "Business Discovery collectNavigationSignals(...) assembly becomes unnecessary.",
    coverage: (projection, existing) => statusFromExpected({
      expected: existingNavigationLabels(existing),
      projected: projection.navigation.map((item) => item.label),
      emptyReason: "No navigation evidence was present in the existing Business Discovery input.",
      coveredReason: "Projection navigation covers the labels Business Discovery currently scans.",
      partialReason: "Projection navigation does not expose every label Business Discovery currently scans.",
      missingProjection: "navigation[].label coverage for every evidence navigation item",
    }),
  },
  {
    dependencyId: "evidence_capture.section_region_types",
    category: "evidence_capture",
    dependency: "section IDs and region types",
    currentBusinessDiscoveryUse: "Creates content_theme_observed findings from captured section region types.",
    requiredSourceArtifact: "Evidence Capture section boundary evidence or first limited dry-run section models",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: "Business Discovery section evidence assembly becomes unnecessary.",
    coverage: (projection, existing) => statusFromExpected({
      expected: existingSectionTypes(existing),
      projected: projection.sections.filter((section) => !section.plannedOnly).map((section) => section.semanticType ?? ""),
      emptyReason: "No section region evidence was present in the existing Business Discovery input.",
      coveredReason: "Projection sections cover the observed section semantic types Business Discovery currently summarizes.",
      partialReason: "Projection sections do not cover every section region type Business Discovery currently summarizes.",
      missingProjection: "sections[].semanticType for every observed section boundary regionType",
    }),
  },
  {
    dependencyId: "evidence_capture.asset_inventory_count",
    category: "evidence_capture",
    dependency: "persisted asset inventory count",
    currentBusinessDiscoveryUse: "Creates brand asset_signal_observed finding from persisted asset count.",
    requiredSourceArtifact: "Evidence Capture baseline asset inventory or raw imported artifact file map",
    futureClassifier: "Future logo/visual classifier can use the already projected asset records.",
    humanConfirmationRequirement: "Brand/logo meaning requires review before becoming canonical business truth.",
    obsoleteAfterMigration: "Business Discovery asset count aggregation becomes unnecessary.",
    coverage: (projection, existing) => {
      const expected = existingAssetCount(existing);
      const projected = projection.assets.length;
      if (expected === 0 && projected > 0) {
        return { alreadyProjected: "YES", strength: "stronger", reason: "Projection exposes concrete asset records, not just an asset count.", missingProjection: null };
      }
      if (expected > 0 && projected > 0) {
        return { alreadyProjected: "YES", strength: "stronger", reason: "Projection exposes concrete asset records while Business Discovery currently consumes only a count.", missingProjection: null };
      }
      return { alreadyProjected: expected === 0 ? "PARTIAL" : "NO", strength: expected === 0 ? "equivalent" : "not_projected", reason: "No projected asset records are available.", missingProjection: expected > 0 ? "assets[] from raw imported asset inventory" : null };
    },
  },
  {
    dependencyId: "limitations.upstream_evidence_limitations",
    category: "limitations",
    dependency: "upstream baseline and fidelity limitations",
    currentBusinessDiscoveryUse: "Copies evidence limitations into artifact limitations and constraints findings.",
    requiredSourceArtifact: "Evidence Capture baseline limitations and fidelity limitations",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: "Business Discovery evidenceLimitations(...) copying becomes unnecessary once projection limitations are complete.",
    coverage: (projection, existing) => {
      const expected = existingLimitationCount(existing);
      const expectedItems = expectedEvidenceLimitations(existing);
      const projectedItems = projectedEvidenceLimitations(projection);
      if (expected === 0) return { alreadyProjected: "YES", strength: projectedItems.length > 0 ? "stronger" : "equivalent", reason: "No upstream evidence limitations were required by the existing input.", missingProjection: null };
      if (allIncluded(expectedItems, projectedItems)) return { alreadyProjected: "YES", strength: "equivalent", reason: "Projection preserves every current baseline/fidelity limitation message and lineage diagnostic verbatim.", missingProjection: null };
      if (projectedItems.length > 0) return { alreadyProjected: "PARTIAL", strength: "weaker", reason: "Projection exposes some upstream limitations, but at least one current baseline/fidelity limitation is missing or changed.", missingProjection: "verbatim evidence baseline limitation and fidelity limitation projection" };
      return { alreadyProjected: "NO", strength: "not_projected", reason: "Existing Business Discovery input includes upstream limitations that are not visible in the projection.", missingProjection: "source limitations mapped from Evidence Capture baseline and fidelity limitations" };
    },
  },
  {
    dependencyId: "diagnostics.import_diagnostics",
    category: "diagnostics",
    dependency: "import diagnostic codes",
    currentBusinessDiscoveryUse: "Copies import diagnostic codes into note-level limitations.",
    requiredSourceArtifact: "runtime import provenance summary",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: "Business Discovery import diagnostic copying becomes unnecessary.",
    coverage: (projection, existing) => {
      const expected = existing.importProvenanceSummary?.importDiagnosticCodes ?? [];
      const projected = projection.diagnostics.map((item) => item.code);
      return statusFromExpected({
        expected,
        projected,
        emptyReason: "No import diagnostics were present in the existing input.",
        coveredReason: "Projection diagnostics include the import diagnostic codes Business Discovery currently copies.",
        partialReason: "Projection diagnostics do not expose every import diagnostic code Business Discovery currently copies.",
        missingProjection: "diagnostics[] entries for importProvenanceSummary.importDiagnosticCodes",
      });
    },
  },
  {
    dependencyId: "candidate_discovery.context",
    category: "candidate_discovery",
    dependency: "Candidate Discovery artifact ID, count, route paths, and diagnostics",
    currentBusinessDiscoveryUse: "Adds constraints finding and additional route candidates when Candidate Discovery is available.",
    requiredSourceArtifact: "candidate_discovery_result",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: "Business Discovery candidate_discovery_context_observed assembly becomes unnecessary.",
    coverage: (projection, existing) => {
      if (!existing.candidateDiscoveryResult && !existing.candidateDiscoveryArtifactId) {
        return { alreadyProjected: projection.candidateArtifactRefs.length > 0 ? "YES" : "PARTIAL", strength: projection.candidateArtifactRefs.length > 0 ? "stronger" : "equivalent", reason: "No Candidate Discovery context was required by this existing input.", missingProjection: null };
      }
      if (projection.candidateArtifactRefs.length > 0) return { alreadyProjected: "YES", strength: "equivalent", reason: "Projection carries Candidate Discovery artifact refs and candidate-derived source context.", missingProjection: null };
      return { alreadyProjected: "NO", strength: "not_projected", reason: "Existing Business Discovery input uses Candidate Discovery, but projection has no candidate artifact refs.", missingProjection: "candidateArtifactRefs and candidate-derived routes/navigation/sections" };
    },
  },
  {
    dependencyId: "candidate_review.context",
    category: "candidate_review",
    dependency: "Candidate Review decisions",
    currentBusinessDiscoveryUse: "Not consumed by current Business Discovery.",
    requiredSourceArtifact: "candidate_review_package",
    futureClassifier: null,
    humanConfirmationRequirement: "Human review remains governance evidence, not business truth.",
    obsoleteAfterMigration: null,
    coverage: (projection) => ({
      alreadyProjected: projection.reviewArtifactRefs.length > 0 ? "YES" : "PARTIAL",
      strength: projection.reviewArtifactRefs.length > 0 ? "stronger" : "equivalent",
      reason: projection.reviewArtifactRefs.length > 0 ? "Projection includes Candidate Review context that Business Discovery currently cannot see." : "No review context is projected for this target.",
      missingProjection: projection.reviewArtifactRefs.length > 0 ? null : "reviewArtifactRefs when Candidate Review exists",
    }),
  },
  {
    dependencyId: "reconstruction.context",
    category: "reconstruction",
    dependency: "Reconstruction Package lineage",
    currentBusinessDiscoveryUse: "Not consumed by current Business Discovery.",
    requiredSourceArtifact: "reconstruction_package",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: null,
    coverage: (projection) => ({
      alreadyProjected: projection.reconstructionArtifactRefs.length > 0 ? "YES" : "PARTIAL",
      strength: projection.reconstructionArtifactRefs.length > 0 ? "stronger" : "equivalent",
      reason: projection.reconstructionArtifactRefs.length > 0 ? "Projection includes Reconstruction context that Business Discovery currently cannot see." : "No reconstruction context is projected for this target.",
      missingProjection: projection.reconstructionArtifactRefs.length > 0 ? null : "reconstructionArtifactRefs when Reconstruction Package exists",
    }),
  },
  {
    dependencyId: "structure_plan.context",
    category: "structure_plan",
    dependency: "StructurePlan planning context",
    currentBusinessDiscoveryUse: "Not consumed by current Business Discovery.",
    requiredSourceArtifact: "structure_plan",
    futureClassifier: null,
    humanConfirmationRequirement: null,
    obsoleteAfterMigration: null,
    coverage: (projection) => ({
      alreadyProjected: projection.planningContextArtifactRefs.length > 0 ? "YES" : "PARTIAL",
      strength: projection.planningContextArtifactRefs.length > 0 ? "stronger" : "equivalent",
      reason: projection.planningContextArtifactRefs.length > 0 ? "Projection includes StructurePlan as planning context, separated from source truth." : "No StructurePlan context is projected for this target.",
      missingProjection: projection.planningContextArtifactRefs.length > 0 ? null : "planningContextArtifactRefs when StructurePlan exists",
    }),
  },
];

export const BUSINESS_DISCOVERY_OBSOLETE_RUNTIME_ASSEMBLIES = [
  "Business Discovery sourceUrl fallback resolution from sourceUrl, Evidence Capture baseline, and import provenance seed URL.",
  "Business Discovery route inventory aggregation across baselines, layout evidence, section evidence, navigation evidence, import provenance, raw route map, and Candidate Discovery.",
  "Business Discovery navigation signal assembly from Evidence Capture navigation items.",
  "Business Discovery section region aggregation from section boundary evidence.",
  "Business Discovery asset count aggregation from Evidence Capture baseline summaries.",
  "Business Discovery import diagnostic and upstream limitation copying once projection limitations are complete.",
  "Business Discovery Candidate Discovery context/count assembly once projection candidate refs are canonical.",
] as const;

function countStatus(count: number, reason: string): Pick<WebsiteUnderstandingCoverageReportRow, "status" | "projectedCount" | "reason"> {
  return {
    status: count > 0 ? "YES" : "NO",
    projectedCount: count,
    reason: count > 0 ? reason : "No projected signal is available.",
  };
}

export function createWebsiteUnderstandingCoverageReport(projection: SourceWebsiteUnderstandingProjection): WebsiteUnderstandingCoverageReport {
  const rows: WebsiteUnderstandingCoverageReportRow[] = [
    { category: "Identity", ...countStatus([projection.sourceIdentity?.sourceUrl, projection.sourceIdentity?.hostname, projection.siteVersionId].filter(Boolean).length, "Source identity and runtime identity are projected.") },
    { category: "Routes", ...countStatus(projection.routes.length, "Routes are projected.") },
    { category: "Pages", ...countStatus(projection.pages.length, "Pages are projected.") },
    { category: "Navigation", ...countStatus(projection.navigation.length, "Navigation entries are projected.") },
    { category: "Sections", ...countStatus(projection.sections.filter((item) => !item.plannedOnly).length, "Observed/source sections are projected.") },
    { category: "Body content", status: projection.content.some((item) => item.bodyTextAvailable) ? "PARTIAL" : "NO", projectedCount: projection.content.filter((item) => item.bodyTextAvailable).length, reason: projection.content.some((item) => item.bodyTextAvailable) ? "Body/source text availability is projected, but full business classification remains fail-closed." : "Body/source text availability is not projected." },
    { category: "Messages", ...countStatus(projection.content.reduce((sum, item) => sum + item.visibleMessages.length, 0), "Visible messages are projected.") },
    { category: "CTA", ...countStatus(projection.content.reduce((sum, item) => sum + item.ctaSignals.length, 0), "CTA signals are projected.") },
    { category: "Assets", ...countStatus(projection.assets.length, "Concrete imported assets are projected.") },
    { category: "Logo candidates", ...countStatus(projection.visualIdentitySignals.logoCandidates.length, "Logo candidates are projected as candidates only.") },
    { category: "Color signals", ...countStatus(projection.visualIdentitySignals.colorSignals.length, "Color signals are projected.") },
    { category: "Typography signals", ...countStatus(projection.visualIdentitySignals.typographySignals.length, "Typography signals are projected.") },
    { category: "Trust candidates", ...countStatus(projection.businessSignalCandidates.trust.length, "Trust candidates are projected.") },
    { category: "Offering candidates", ...countStatus(projection.businessSignalCandidates.offerings.length, "Offering candidates are projected.") },
    { category: "Audience candidates", ...countStatus(projection.businessSignalCandidates.audiences.length, "Audience candidates are projected.") },
    { category: "Goals", ...countStatus(projection.businessSignalCandidates.goals.length, "Goal candidates are projected.") },
    { category: "Geography", ...countStatus(projection.businessSignalCandidates.geography.length, "Geography signals are projected.") },
    { category: "Languages", ...countStatus(projection.businessSignalCandidates.languages.length + projection.sourceIdentity.languageSignals.length + projection.technicalSignals.languageMetadata.length, "Language signals are projected.") },
    { category: "Technical signals", ...countStatus([projection.technicalSignals.title, ...projection.technicalSignals.headingStructure, ...projection.technicalSignals.technologyHints].filter(Boolean).length, "Technical signals are projected.") },
    { category: "SEO", ...countStatus([projection.technicalSignals.canonicalUrl, ...projection.technicalSignals.robotsEvidence, ...projection.technicalSignals.sitemapEvidence, ...projection.technicalSignals.socialMetadata].filter(Boolean).length, "SEO-adjacent source signals are projected.") },
    { category: "Diagnostics", status: projection.diagnostics.length > 0 ? "YES" : "PARTIAL", projectedCount: projection.diagnostics.length, reason: projection.diagnostics.length > 0 ? "Diagnostics are projected." : "Diagnostics array is available but empty for this target." },
    { category: "Limitations", status: projection.limitations.length > 0 ? "YES" : "PARTIAL", projectedCount: projection.limitations.length, reason: projection.limitations.length > 0 ? "Limitations are projected." : "Limitations array is available but empty for this target." },
    { category: "Readiness", status: projection.readiness ? "YES" : "NO", projectedCount: projection.readiness?.dimensions?.length ?? 0, reason: projection.readiness ? "Readiness and dimensions are projected." : "Readiness is missing." },
    { category: "Lineage", status: projection.lineage ? "YES" : "NO", projectedCount: projection.lineage?.deterministicInputs?.artifactIds?.length ?? 0, reason: projection.lineage ? "Lineage and deterministic artifact IDs are projected." : "Lineage is missing." },
    { category: "Confidence", status: projection.confidence ? "YES" : "NO", projectedCount: projection.confidence?.reasons?.length ?? 0, reason: projection.confidence ? "Projection confidence is projected." : "Projection confidence is missing." },
  ];
  const coveredCategoryCount = rows.filter((row) => row.status === "YES").length;
  const partialCategoryCount = rows.filter((row) => row.status === "PARTIAL").length;
  const missingCategoryCount = rows.filter((row) => row.status === "NO").length;
  return {
    coveragePercent: Math.round(((coveredCategoryCount + partialCategoryCount * 0.5) / rows.length) * 100),
    coveredCategoryCount,
    partialCategoryCount,
    missingCategoryCount,
    categories: rows,
  };
}

function duplicateValues(label: string, values: string[]): string[] {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => `${label} duplicates ${value} (${count} occurrences)`);
}

function conflictingValues(projection: SourceWebsiteUnderstandingProjection, existing: BusinessDiscoveryBuilderInput): string[] {
  const conflicts: string[] = [];
  const expectedSourceUrl = sourceUrl(existing);
  if (expectedSourceUrl && projection.sourceIdentity.sourceUrl && expectedSourceUrl !== projection.sourceIdentity.sourceUrl) {
    conflicts.push(`source URL differs: Business Discovery input ${expectedSourceUrl}; Website Understanding ${projection.sourceIdentity.sourceUrl}`);
  }
  if (projection.siteVersionId !== existing.siteVersionId) {
    conflicts.push(`siteVersionId differs: Business Discovery input ${existing.siteVersionId}; Website Understanding ${projection.siteVersionId}`);
  }
  if (existing.sourceSiteId && projection.sourceSiteId && projection.sourceSiteId !== existing.sourceSiteId) {
    conflicts.push(`sourceSiteId differs: Business Discovery input ${existing.sourceSiteId}; Website Understanding ${projection.sourceSiteId}`);
  }
  if (projection.dryRunId && existing.dryRunId && projection.dryRunId !== existing.dryRunId) {
    conflicts.push(`dryRunId differs: Business Discovery input ${existing.dryRunId}; Website Understanding ${projection.dryRunId}`);
  }
  const missingRoutes = existingRoutePaths(existing).filter((routePath) => !projection.routes.some((route) => route.routePath === routePath));
  if (missingRoutes.length > 0) conflicts.push(`route inventory missing from projection: ${missingRoutes.join(", ")}`);
  return conflicts;
}

function unexpectedProjectionConcepts(projection: SourceWebsiteUnderstandingProjection): string[] {
  const unexpected: string[] = [];
  if (projection.content.some((item) => item.visibleMessages.length > 0)) unexpected.push("visible body messages are projected although current Business Discovery does not consume body messages");
  if (projection.content.some((item) => item.ctaSignals.length > 0)) unexpected.push("CTA signals are projected although current Business Discovery does not consume CTA arrays");
  if (projection.visualIdentitySignals.logoCandidates.length > 0) unexpected.push("logo candidates are projected although current Business Discovery consumes only asset counts");
  if (projection.visualIdentitySignals.colorSignals.length > 0) unexpected.push("color signals are projected although current Business Discovery does not consume colors");
  if (projection.visualIdentitySignals.typographySignals.length > 0) unexpected.push("typography signals are projected although current Business Discovery does not consume typography");
  if (projection.reviewArtifactRefs.length > 0) unexpected.push("Candidate Review context is projected although current Business Discovery does not consume review decisions");
  if (projection.reconstructionArtifactRefs.length > 0) unexpected.push("Reconstruction context is projected although current Business Discovery does not consume reconstruction packages");
  if (projection.planningContextArtifactRefs.length > 0) unexpected.push("StructurePlan context is projected although current Business Discovery does not consume planning context");
  return unexpected;
}

export function validateBusinessDiscoveryInputEquivalence(
  websiteUnderstandingProjection: SourceWebsiteUnderstandingProjection,
  existingBusinessDiscoveryInputs: BusinessDiscoveryBuilderInput,
): BusinessDiscoveryInputEquivalenceResult {
  const matrix = dependencySpecs.map((spec): BusinessDiscoveryDependencyMatrixRow => {
    const coverage = spec.coverage(websiteUnderstandingProjection, existingBusinessDiscoveryInputs);
    return { ...spec, ...coverage };
  });
  const covered = matrix.filter((row) => row.alreadyProjected === "YES");
  const partiallyCovered = matrix.filter((row) => row.alreadyProjected === "PARTIAL");
  const missing = matrix.filter((row) => row.alreadyProjected === "NO");
  const duplicate = [
    ...duplicateValues("routePath", websiteUnderstandingProjection.routes.map((route) => route.routePath)),
    ...duplicateValues("navigation label", websiteUnderstandingProjection.navigation.map((item) => `${item.routePath ?? ""}:${item.label}:${item.href ?? ""}`)),
    ...duplicateValues("asset path", websiteUnderstandingProjection.assets.map((asset) => asset.path)),
    ...duplicateValues("limitation", websiteUnderstandingProjection.limitations.map((item) => `${item.code}:${item.message}:${item.sourceRefs.join("|")}`)),
  ];
  const coverageReport = createWebsiteUnderstandingCoverageReport(websiteUnderstandingProjection);
  const migrationBlockers = [
    ...missing.map((row) => `${row.dependency}: ${row.missingProjection ?? row.reason}`),
    ...partiallyCovered
      .filter((row) => row.missingProjection)
      .map((row) => `${row.dependency}: ${row.missingProjection}`),
  ];
  return {
    coveragePercent: Math.round(((covered.length + partiallyCovered.length * 0.5) / matrix.length) * 100),
    matrix,
    coverageReport,
    covered,
    partiallyCovered,
    missing,
    unexpected: unexpectedProjectionConcepts(websiteUnderstandingProjection),
    duplicate,
    conflicting: conflictingValues(websiteUnderstandingProjection, existingBusinessDiscoveryInputs),
    obsoleteRuntimeAssemblies: [...BUSINESS_DISCOVERY_OBSOLETE_RUNTIME_ASSEMBLIES],
    migrationBlockers: uniqueSorted(migrationBlockers),
    recommendedMigrationOrder: [
      "Map Business Discovery source URL, siteVersionId, dryRunId, routes, navigation, sections, assets, diagnostics, and candidate refs from Website Understanding without changing domain interpretation.",
      "Add explicit projection of sourceSiteId and verbatim Evidence Capture baseline/fidelity limitations.",
      "Run Business Discovery in shadow mode from Website Understanding and compare artifacts against the existing builder.",
      "Switch Business Discovery to the projection boundary only after shadow output equivalence is deterministic on ODV and ViroiDoc.",
    ],
  };
}
