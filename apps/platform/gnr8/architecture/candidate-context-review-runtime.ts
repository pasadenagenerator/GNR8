import { buildCandidateContextProjection, type CandidateContextProjection } from "./candidate-context-projection";
import { loadCandidateDiscoveryResultById } from "./candidate-discovery-persistence";
import { loadLatestFirstLimitedDryRunOutput } from "./first-limited-dry-run-output-persistence";
import { loadLatestEvidenceCaptureBaselineArtifactForSiteVersion } from "../site/evidence-capture-baseline-read-model";

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
