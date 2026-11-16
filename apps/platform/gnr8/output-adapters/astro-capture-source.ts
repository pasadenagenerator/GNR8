import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from '@/gnr8/runtime/types';
import type * as Store from '@/gnr8/runtime/runtime-store';

export async function resolveAstroCaptureSource(initiallySelectedVersion: CanonicalSiteVersionSnapshot, initiallySelectedArtifact: RuntimeArtifact, existingAdapter: string | null, deps: Pick<typeof Store, 'getSiteVersion' | 'getArtifactById' | 'getRawImportedSiteArtifact'>) {
  const { getSiteVersion, getArtifactById, getRawImportedSiteArtifact } = deps;
  const buildEvidence = initiallySelectedArtifact.manifest.generatedOutputBuildEvidence as
    | { sourceCapture?: { siteVersionId?: unknown; artifactId?: unknown } }
    | undefined
  const lineageVersionId = String(buildEvidence?.sourceCapture?.siteVersionId ?? '').trim()
  const lineageArtifactId = String(buildEvidence?.sourceCapture?.artifactId ?? '').trim()
  let sourceVersion = lineageVersionId ? await getSiteVersion(lineageVersionId) : initiallySelectedVersion
  let sourceArtifact = lineageArtifactId ? await getArtifactById(lineageArtifactId) : initiallySelectedArtifact
  let rawArtifact = sourceVersion ? await getRawImportedSiteArtifact(sourceVersion.id) : null

  if (sourceVersion && sourceArtifact && !rawArtifact && !existingAdapter) {
    const captureLineage = resolveCurrentCaptureLineageRef(sourceVersion.importProvenanceSummary)
    const capturedVersion = captureLineage ? await getSiteVersion(captureLineage.siteVersionId) : null
    const capturedArtifact = capturedVersion?.artifactId
      ? await getArtifactById(capturedVersion.artifactId)
      : null
    const capturedRawArtifact = capturedVersion
      ? await getRawImportedSiteArtifact(capturedVersion.id)
      : null
    if (
      !captureLineage ||
      !capturedVersion ||
      capturedVersion.siteId !== initiallySelectedVersion.siteId ||
      !capturedArtifact ||
      capturedArtifact.siteVersionId !== capturedVersion.id ||
      !capturedRawArtifact ||
      capturedRawArtifact.id !== captureLineage.rawArtifactId
    ) {
      throw new Error('astro_generation_source_capture_lineage_missing')
    }
    sourceVersion = capturedVersion
    sourceArtifact = capturedArtifact
    rawArtifact = capturedRawArtifact
  }
  if (!sourceVersion || !sourceArtifact || sourceVersion.artifactId !== sourceArtifact.id) {
    throw new Error('Astro regeneration source lineage is incomplete.')
  }
  if (!rawArtifact) throw new Error('astro_generation_source_artifact_missing')
  if (sourceVersion.siteId !== initiallySelectedVersion.siteId || sourceArtifact.siteVersionId !== sourceVersion.id || rawArtifact.siteVersionId !== sourceVersion.id || rawArtifact.siteId !== sourceVersion.siteId) throw new Error('astro_generation_source_capture_lineage_missing');
  return { sourceVersion, sourceArtifact, rawArtifact };
}

export function astroSourceTarget(source: { sourceVersion: CanonicalSiteVersionSnapshot; sourceArtifact: RuntimeArtifact }) {
  return `${source.sourceVersion.id}:${source.sourceArtifact.id}:${source.sourceArtifact.bundleSha256}`;
}
export function resolveCurrentCaptureLineageRef(value: unknown): { siteVersionId: string; rawArtifactId: string } | null {
  const provenance = record(value)
  const validation = record(provenance?.currentMultiPagePreviewValidation)
  const sourceIdentity = record(validation?.sourceIdentity)
  const siteVersionId = String(sourceIdentity?.siteVersionId ?? '').trim()
  const rawArtifactId = String(sourceIdentity?.rawArtifactId ?? '').trim()
  return siteVersionId && rawArtifactId ? { siteVersionId, rawArtifactId } : null
}

function record(v: unknown): Record<string, unknown> | null { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; }
