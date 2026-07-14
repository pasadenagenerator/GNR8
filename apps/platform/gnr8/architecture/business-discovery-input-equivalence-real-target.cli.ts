import type { BusinessDiscoveryBuilderInput } from "./business-discovery-builder";
import { loadLatestBusinessDiscoveryArtifact } from "./business-discovery-persistence";
import { validateBusinessDiscoveryInputEquivalence } from "./business-discovery-input-equivalence";
import { loadSourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-loader";
import { getSiteVersion } from "../runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";

type StoredArtifact = Record<string, unknown>;

const TARGETS = [
  { label: "ODV", siteVersionId: "09dce7ea-d860-4f60-a1eb-26c3335b302e" },
  { label: "ViroiDoc", siteVersionId: "e26b0754-988b-45b9-9e24-8e213179b6cf" },
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

async function validateTarget(target: (typeof TARGETS)[number]) {
  const siteVersion = await getSiteVersion(target.siteVersionId);
  const businessDiscovery = await loadLatestBusinessDiscoveryArtifact({ siteVersionId: target.siteVersionId });
  const projectionResult = await loadSourceWebsiteUnderstandingProjection({
    siteVersionId: target.siteVersionId,
    dryRunId: businessDiscovery?.dryRunId,
    options: { generatedAt: "2026-07-14T00:00:00.000Z" },
  });
  if (!siteVersion || !businessDiscovery || !projectionResult.projection) {
    return {
      target: target.label,
      siteVersionId: target.siteVersionId,
      status: "blocked",
      missing: {
        siteVersion: !siteVersion,
        businessDiscovery: !businessDiscovery,
        projection: !projectionResult.projection,
      },
      diagnostics: projectionResult.diagnostics,
    };
  }
  const existingInput = businessDiscoveryInputFromSummary({
    siteVersionId: target.siteVersionId,
    sourceSiteId: siteVersion.siteId,
    summary: siteVersion.importProvenanceSummary,
    dryRunId: businessDiscovery.dryRunId,
    sourceUrl: businessDiscovery.sourceUrl,
    createdAt: businessDiscovery.createdAt,
  });
  const equivalence = validateBusinessDiscoveryInputEquivalence(projectionResult.projection, existingInput);
  return {
    target: target.label,
    siteVersionId: target.siteVersionId,
    businessDiscoveryArtifactId: businessDiscovery.artifactId,
    businessDiscoveryStatus: businessDiscovery.status,
    projectionId: projectionResult.projection.projectionId,
    projectionStatus: projectionResult.status,
    projectionValidation: projectionResult.validation.valid ? "valid" : "invalid",
    coveragePercent: equivalence.coveragePercent,
    coverageReportPercent: equivalence.coverageReport.coveragePercent,
    coveredInputs: equivalence.covered.map((row) => row.dependencyId),
    partialInputs: equivalence.partiallyCovered.map((row) => ({ dependencyId: row.dependencyId, missingProjection: row.missingProjection })),
    missingInputs: equivalence.missing.map((row) => ({ dependencyId: row.dependencyId, missingProjection: row.missingProjection })),
    conflicting: equivalence.conflicting,
    duplicate: equivalence.duplicate,
    duplicateLogic: equivalence.obsoleteRuntimeAssemblies,
    migrationBlockers: equivalence.migrationBlockers,
    recommendedMigrationOrder: equivalence.recommendedMigrationOrder,
  };
}

async function main() {
  const results = [];
  for (const target of TARGETS) {
    results.push(await validateTarget(target));
  }
  console.log(JSON.stringify({ generatedAt: "2026-07-14T00:00:00.000Z", results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
