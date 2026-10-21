import "server-only";
import { requirePublicOutputVersion } from "../output-adapters/public-output-access";
import { SupabaseAstroCandidateRuntimeArtifactStore } from "../output-adapters/astro-candidate-runtime-artifact-store";
import { validateGeneratedOutputBuildEvidence, validateGeneratedOutputContentManifest } from "../output-adapters/generated-output-eligibility";
import { readVerifiedRetainedAsset } from "../../app/api/gnr8/runtime/preview-assets/[siteId]/[siteVersionId]/[...assetPath]/protected-preview-asset";
import { getSupabaseServiceRoleClient } from "../../src/supabase/service-role-server";
import { prepareStackiSourceProject } from "./stacki-source-project";
import { StackiDraftError, type StackiDraftScope } from "./stacki-draft-contract";

/** Caller already authorized the selected version. Reuses stateless GNR8 reads. */
export async function loadConfiguredStackiSource(scope: StackiDraftScope) {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new StackiDraftError(503, "STACKI_SOURCE_UNAVAILABLE");
  const runtime = new SupabaseAstroCandidateRuntimeArtifactStore(client);
  const selected = await runtime.readContext(scope.siteVersionId);
  if (!selected?.artifact || selected.siteVersion.id !== scope.siteVersionId ||
      selected.artifact.siteVersionId !== scope.siteVersionId ||
      selected.artifact.id !== selected.siteVersion.artifactId ||
      selected.artifact.siteId !== selected.siteVersion.siteId) invalid();
  let build;
  try { build = validateGeneratedOutputBuildEvidence(selected.artifact.manifest.generatedOutputBuildEvidence); }
  catch { invalid(); }
  const content = validateGeneratedOutputContentManifest(selected.artifact.manifest.generatedOutputContentManifest);
  if (!build || !content || content.sourceRef !== build.contentManifestSourceRef ||
      build.sourceCapture.runtimeSiteId !== selected.siteVersion.siteId) invalid();
  const capture = build.sourceCapture;
  // Provenance is not authorization: independently check the original capture.
  await requirePublicOutputVersion(scope, capture.siteVersionId);
  const source = await runtime.readContext(capture.siteVersionId);
  if (!source?.artifact || source.siteVersion.id !== capture.siteVersionId ||
      source.siteVersion.siteId !== selected.siteVersion.siteId || source.artifact.siteId !== selected.siteVersion.siteId ||
      source.siteVersion.artifactId !== capture.artifactId || source.artifact.id !== capture.artifactId ||
      source.artifact.siteVersionId !== capture.siteVersionId ||
      source.artifact.bundleSha256 !== capture.artifactBundleSha256) invalid();
  const project = await prepareStackiSourceProject({
    workspace: selected.artifact.manifest.generatedOutputSourceWorkspace,
    binding: { runtimeSiteId: selected.siteVersion.siteId, sourceSiteVersionId: capture.siteVersionId,
      sourceArtifactId: capture.artifactId, sourceSnapshotSha256: build.sourceSnapshotSha256,
      requiredAssets: content.requiredAssets },
    readVerifiedAsset: async (asset, path, allowedPaths) => {
      const response = await readVerifiedRetainedAsset({
        siteId: selected.siteVersion.siteId, siteVersionId: capture.siteVersionId,
        path, expectedSha256: asset.sha256, allowedPaths,
      }, client);
      if (!response.ok) throw new StackiDraftError(503, "STACKI_SOURCE_ASSET_UNAVAILABLE");
      return new Uint8Array(await response.arrayBuffer());
    },
  });
  return project.files;
}
function invalid(): never { throw new StackiDraftError(422, "STACKI_SOURCE_PROJECT_UNAVAILABLE"); }
