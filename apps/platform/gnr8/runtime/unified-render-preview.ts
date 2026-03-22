import { buildDeterministicArtifactBundle } from "@/gnr8/runtime/artifact-builder";
import { normalizePagePath } from "@/gnr8/runtime/deterministic";
import { getSiteVersion } from "@/gnr8/runtime/runtime-store";

export async function renderSiteVersionPreview(input: { siteVersionId: string; path?: string }) {
  const siteVersion = await getSiteVersion(input.siteVersionId);
  if (!siteVersion) throw new Error("SiteVersion not found");

  const artifact = buildDeterministicArtifactBundle({
    siteVersion,
    renderMode: "PREVIEW",
  });

  const requestedPath = normalizePagePath(input.path ?? "/");
  const html = artifact.htmlByPath[requestedPath] ?? artifact.htmlByPath["/"];
  if (!html) throw new Error(`Preview path not found: ${requestedPath}`);

  return {
    siteId: siteVersion.siteId,
    siteVersionId: siteVersion.id,
    path: requestedPath,
    rendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    html,
  };
}
