import { buildCandidateContextProjection, type CandidateContextProjection } from "./candidate-context-projection";
import { loadCandidateDiscoveryResultById } from "./candidate-discovery-persistence";
import { loadLatestFirstLimitedDryRunOutput } from "./first-limited-dry-run-output-persistence";
import { loadLatestEvidenceCaptureBaselineArtifactForSiteVersion } from "../site/evidence-capture-baseline-read-model";
import { getRawImportedSiteArtifact, getRawTemplateSiteAsset } from "../runtime/runtime-store";

export function resolveCandidateContextScreenshotArtifactPath(input: {
  artifactPath: string;
  persistedFilePaths: readonly string[];
}): string | null {
  const artifactPath = input.artifactPath.trim().replaceAll("\\", "/");
  if (!artifactPath) return null;
  const matches = input.persistedFilePaths
    .map((filePath) => filePath.trim().replaceAll("\\", "/").replace(/^\/+/, ""))
    .filter((filePath) => filePath && (artifactPath === filePath || artifactPath.endsWith(`/${filePath}`)));
  return matches.length === 1 ? matches[0] : null;
}

export async function loadCandidateContextScreenshotDataUriForReview(input: {
  siteVersionId: string;
  projection: CandidateContextProjection;
}): Promise<string | null> {
  const artifactPath = input.projection.screenshot?.artifactPath;
  if (!artifactPath) return null;
  const rawArtifact = await getRawImportedSiteArtifact(input.siteVersionId);
  if (!rawArtifact) return null;
  const filePath = resolveCandidateContextScreenshotArtifactPath({
    artifactPath,
    persistedFilePaths: Object.keys(rawArtifact.fileMap),
  });
  if (!filePath) return null;
  const asset = await getRawTemplateSiteAsset({
    siteVersionId: input.siteVersionId,
    artifactId: rawArtifact.id,
    filePath,
  });
  if (!asset || asset.mediaType !== "image/png") return null;
  return `data:${asset.mediaType};base64,${asset.bytes.toString("base64")}`;
}

export async function loadCandidateContextProjectionsForReview(input: {
  siteVersionId: string;
  candidateDiscoveryArtifactId: string;
  dryRunId: string;
}): Promise<Map<string, CandidateContextProjection>> {
  const [discoveryArtifact, evidenceCaptureBaseline, firstLimitedDryRunOutput] = await Promise.all([
    loadCandidateDiscoveryResultById({
      siteVersionId: input.siteVersionId,
      artifactId: input.candidateDiscoveryArtifactId,
    }),
    loadLatestEvidenceCaptureBaselineArtifactForSiteVersion(input.siteVersionId),
    loadLatestFirstLimitedDryRunOutput({
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
    }),
  ]);

  if (!discoveryArtifact) return new Map();

  return new Map(discoveryArtifact.result.candidates.map((candidate) => {
    const projection = buildCandidateContextProjection({
      siteVersionId: input.siteVersionId,
      candidate,
      candidateDiscoveryResult: discoveryArtifact.result,
      evidenceCaptureBaseline,
      firstLimitedDryRunOutput,
    });
    return [candidate.candidateId, projection];
  }));
}
