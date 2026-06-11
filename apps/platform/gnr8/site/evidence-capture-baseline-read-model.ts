import { getSiteVersion } from "@/gnr8/runtime/runtime-store";
import type { RuntimeStoreDbOptions } from "@/gnr8/runtime/runtime-store";
import {
  getLatestEvidenceCaptureBaselineArtifactForSiteVersion,
  type EvidenceCaptureBaselineArtifactRecord,
} from "@/gnr8/architecture/evidence-capture-baseline-artifact";

export async function loadLatestEvidenceCaptureBaselineArtifactForSiteVersion(
  siteVersionId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<EvidenceCaptureBaselineArtifactRecord | null> {
  const siteVersion = await getSiteVersion(siteVersionId, options);
  return getLatestEvidenceCaptureBaselineArtifactForSiteVersion({ siteVersion });
}
