import type { BusinessDiscoveryBuilderInput } from "./business-discovery-builder";
import type { BusinessDiscoveryArtifact, BusinessDiscoveryLimitation } from "./business-discovery-contract";
import { loadBusinessDiscoveryArtifactById } from "./business-discovery-persistence";
import { validateBusinessDiscoveryInputEquivalence } from "./business-discovery-input-equivalence";
import { compareBusinessDiscoveryShadow } from "./business-discovery-shadow-comparison";
import { buildShadowBusinessDiscoveryFromWebsiteUnderstanding } from "./business-discovery-website-understanding-adapter";
import { loadSourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-loader";
import { getSiteVersion } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";

type StoredArtifact = Record<string, unknown>;

const TARGETS = [
  {
    label: "ODV",
    siteVersionId: "09dce7ea-d860-4f60-a1eb-26c3335b302e",
    currentBusinessDiscoveryArtifactId: "business_discovery_7b37413651d79de0d109e31690a34b62",
  },
  {
    label: "ViroiDoc",
    siteVersionId: "e26b0754-988b-45b9-9e24-8e213179b6cf",
    currentBusinessDiscoveryArtifactId: "business_discovery_360fa099cbcede288c2d0e04f2ec7986",
  },
] as const;

function isRecord(value: unknown): value is StoredArtifact {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function artifacts(summary: RuntimeImportProvenanceSummary | null | undefined, collectionKey: string, latestKey: string): StoredArtifact[] {
  const record = summary as Record<string, unknown> | null | undefined;
  const values: unknown[] = [];
  if (Array.isArray(record?.[collectionKey])) values.push(...record[collectionKey]);
  if (record?.[latestKey] !== undefined) values.push(record[latestKey]);
  return values.filter(isRecord);
}

function latestArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  collectionKey: string;
  latestKey: string;
  kind: string;
  dryRunId?: string | null;
}): StoredArtifact | null {
  return artifacts(input.summary, input.collectionKey, input.latestKey)
    .filter((artifact) =>
      (artifact.kind === input.kind || artifact.artifactKind === input.kind) &&
      artifact.siteVersionId === input.siteVersionId &&
      (!input.dryRunId || artifact.dryRunId === input.dryRunId))
    .sort((left, right) =>
      String(left.persistedAt ?? left.createdAt ?? "").localeCompare(String(right.persistedAt ?? right.createdAt ?? "")) ||
      String(left.artifactId ?? "").localeCompare(String(right.artifactId ?? "")))
    .at(-1) ?? null;
}

function businessDiscoveryInputFromSummary(input: {
  siteVersionId: string;
  sourceSiteId: string | null | undefined;
  summary: RuntimeImportProvenanceSummary | null | undefined;
  dryRunId: string;
  sourceUrl?: string | null;
  createdAt?: string | null;
}): BusinessDiscoveryBuilderInput {
  const candidateArtifact = latestArtifact({
    summary: input.summary,
    siteVersionId: input.siteVersionId,
    collectionKey: "candidateDiscoveryResultArtifacts",
    latestKey: "latestCandidateDiscoveryResultArtifact",
    kind: "candidate_discovery_result",
    dryRunId: input.dryRunId,
  });
  return {
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    sourceSiteId: input.sourceSiteId,
    sourceUrl: input.sourceUrl,
    createdAt: input.createdAt,
    importProvenanceSummary: input.summary ?? null,
    evidenceCaptureBaseline: input.summary?.evidenceCaptureBaselineArtifact ?? null,
    candidateDiscoveryArtifactId: typeof candidateArtifact?.artifactId === "string" ? candidateArtifact.artifactId : null,
    candidateDiscoveryResult: isRecord(candidateArtifact?.result) ? candidateArtifact.result as never : null,
  };
}

function refKey(ref: { sourceKind: string; refId: string; routePath?: string }): string {
  return `${ref.sourceKind}:${ref.refId}:${ref.routePath ?? ""}`;
}

function findingKindSet(artifact: BusinessDiscoveryArtifact): string[] {
  return [...new Set(artifact.findings.map((finding) => finding.kind))].sort((left, right) => left.localeCompare(right));
}

function findingEvidenceByKind(input: {
  current: BusinessDiscoveryArtifact;
  shadow: BusinessDiscoveryArtifact;
  kind: string;
}) {
  const currentFinding = input.current.findings.find((finding) => finding.kind === input.kind) ?? null;
  const shadowFinding = input.shadow.findings.find((finding) => finding.kind === input.kind) ?? null;
  const currentRefs = (currentFinding?.evidenceRefs ?? []).map(refKey).sort((left, right) => left.localeCompare(right));
  const shadowRefs = (shadowFinding?.evidenceRefs ?? []).map(refKey).sort((left, right) => left.localeCompare(right));
  return {
    kind: input.kind,
    currentFindingId: currentFinding?.findingId ?? null,
    shadowFindingId: shadowFinding?.findingId ?? null,
    currentRefs,
    shadowRefs,
    missingRefs: currentRefs.filter((ref) => !shadowRefs.includes(ref)),
    addedRefs: shadowRefs.filter((ref) => !currentRefs.includes(ref)),
    currentConfidence: currentFinding?.confidence.level ?? null,
    shadowConfidence: shadowFinding?.confidence.level ?? null,
  };
}

function findingCoverage(input: { current: BusinessDiscoveryArtifact; shadow: BusinessDiscoveryArtifact }) {
  const currentKinds = findingKindSet(input.current);
  const shadowKinds = findingKindSet(input.shadow);
  return {
    currentKinds,
    shadowKinds,
    missingKinds: currentKinds.filter((kind) => !shadowKinds.includes(kind)),
    addedKinds: shadowKinds.filter((kind) => !currentKinds.includes(kind)),
  };
}

function limitationKey(item: BusinessDiscoveryLimitation): string {
  return `${item.code}:${item.message}`;
}

function classifyAddedLimitation(item: BusinessDiscoveryLimitation): string {
  if (item.code === "UPSTREAM_FIDELITY_LIMITATION") return "verbatim_upstream_fidelity_preservation";
  if (item.code === "IMPORT_DIAGNOSTIC_OBSERVED") return "expected_projection_transparency";
  if ((item.evidenceRefs ?? []).length === 0) return "new_regression";
  return "source_traceable_added_limitation";
}

function limitationDelta(input: { current: BusinessDiscoveryArtifact; shadow: BusinessDiscoveryArtifact }) {
  const currentKeys = new Set(input.current.limitations.map(limitationKey));
  const shadowKeys = new Set(input.shadow.limitations.map(limitationKey));
  const added = input.shadow.limitations.filter((item) => !currentKeys.has(limitationKey(item)));
  const missing = input.current.limitations.filter((item) => !shadowKeys.has(limitationKey(item)));
  const duplicateKeys = input.shadow.limitations
    .map(limitationKey)
    .filter((key, index, keys) => keys.indexOf(key) !== index)
    .sort((left, right) => left.localeCompare(right));
  const addedClassifications = added.reduce<Record<string, number>>((counts, item) => {
    const classification = classifyAddedLimitation(item);
    counts[classification] = (counts[classification] ?? 0) + 1;
    return counts;
  }, {});
  return {
    currentCount: input.current.limitations.length,
    shadowCount: input.shadow.limitations.length,
    addedCount: added.length,
    missingCount: missing.length,
    duplicateSemanticLimitationCount: [...new Set(duplicateKeys)].length,
    addedClassifications,
    addedCodes: [...new Set(added.map((item) => item.code))].sort((left, right) => left.localeCompare(right)),
    missingCodes: [...new Set(missing.map((item) => item.code))].sort((left, right) => left.localeCompare(right)),
  };
}

async function validateTarget(target: (typeof TARGETS)[number]) {
  const siteVersion = await getSiteVersion(target.siteVersionId);
  const current = await loadBusinessDiscoveryArtifactById({
    siteVersionId: target.siteVersionId,
    artifactId: target.currentBusinessDiscoveryArtifactId,
  });
  const projectionResult = await loadSourceWebsiteUnderstandingProjection({
    siteVersionId: target.siteVersionId,
    dryRunId: current?.dryRunId,
    options: { generatedAt: "2026-07-14T00:00:00.000Z" },
  });
  if (!siteVersion || !current || !projectionResult.projection) {
    return {
      target: target.label,
      siteVersionId: target.siteVersionId,
      status: "blocked",
      missing: {
        siteVersion: !siteVersion,
        currentBusinessDiscovery: !current,
        projection: !projectionResult.projection,
      },
      diagnostics: projectionResult.diagnostics,
      noWrite: true,
    };
  }

  const existingInput = businessDiscoveryInputFromSummary({
    siteVersionId: target.siteVersionId,
    sourceSiteId: siteVersion.siteId,
    summary: siteVersion.importProvenanceSummary,
    dryRunId: current.dryRunId,
    sourceUrl: current.sourceUrl,
    createdAt: current.createdAt,
  });
  const equivalence = validateBusinessDiscoveryInputEquivalence(projectionResult.projection, existingInput);
  const firstShadow = buildShadowBusinessDiscoveryFromWebsiteUnderstanding(projectionResult.projection);
  const secondShadow = buildShadowBusinessDiscoveryFromWebsiteUnderstanding(projectionResult.projection);
  if (firstShadow.status !== "built" || secondShadow.status !== "built") {
    return {
      target: target.label,
      siteVersionId: target.siteVersionId,
      status: "blocked",
      projectionId: projectionResult.projection.projectionId,
      currentBusinessDiscoveryArtifactId: current.artifactId,
      shadow: firstShadow,
      dependencyCoverage: equivalence.coveragePercent,
      noWrite: true,
    };
  }
	  const comparison = compareBusinessDiscoveryShadow({
	    current: current.artifact,
	    shadow: firstShadow.artifact,
	  });
	  const coverage = findingCoverage({ current: current.artifact, shadow: firstShadow.artifact });
	  const contentThemeEvidence = findingEvidenceByKind({
	    current: current.artifact,
	    shadow: firstShadow.artifact,
	    kind: "content_theme_observed",
	  });
	  return {
    target: target.label,
    siteVersionId: target.siteVersionId,
    projectionId: projectionResult.projection.projectionId,
    currentBusinessDiscoveryArtifactId: current.artifactId,
    shadowBusinessDiscoveryArtifactId: firstShadow.shadowArtifactId,
    shadowContentIdentity: firstShadow.contentIdentity,
    dependencyCoverage: {
      percent: equivalence.coveragePercent,
      coveredInputs: equivalence.covered.map((row) => row.dependencyId),
      partialInputs: equivalence.partiallyCovered.map((row) => ({ dependencyId: row.dependencyId, missingProjection: row.missingProjection })),
      missingInputs: equivalence.missing.map((row) => ({ dependencyId: row.dependencyId, missingProjection: row.missingProjection })),
      conflicting: equivalence.conflicting,
      duplicate: equivalence.duplicate,
      migrationBlockers: equivalence.migrationBlockers,
    },
	    comparison: {
	      status: comparison.status,
	      summary: comparison.summary,
	      cutoverBlockers: comparison.cutoverBlockers,
	      conflicts: comparison.differences.filter((item) => item.classification === "conflicting"),
	      unexpectedDifferences: comparison.differences.filter((item) => item.classification === "unexpected" || item.classification === "unsupported"),
	      differences: comparison.differences.map((item) => ({
        path: item.path,
        classification: item.classification,
        message: item.message,
        blocker: item.blocker,
      })),
	    },
	    findingCoverage: coverage,
	    contentThemeEvidence,
	    limitationDelta: limitationDelta({ current: current.artifact, shadow: firstShadow.artifact }),
	    confidenceComparison: {
	      current: current.artifact.confidence,
	      shadow: firstShadow.artifact.confidence,
	    },
	    deterministicRebuildEquality: firstShadow.contentIdentity === secondShadow.contentIdentity &&
	      firstShadow.shadowArtifactId === secondShadow.shadowArtifactId,
	    noWrite: true,
  };
}

async function main() {
  const results = [];
  for (const target of TARGETS) {
    results.push(await validateTarget(target));
  }
  console.log(JSON.stringify({
    generatedAt: "2026-07-14T00:00:00.000Z",
	    mode: "read_only_shadow_validation",
	    wroteBusinessDiscovery: false,
	    wroteProjection: false,
	    wroteDownstreamArtifacts: false,
	    wroteRuntimeCutover: false,
	    results,
  }, null, 2));
  if (results.some((result) =>
    ("status" in result && result.status === "blocked") ||
    ("comparison" in result && result.comparison?.status === "blocked"))) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
