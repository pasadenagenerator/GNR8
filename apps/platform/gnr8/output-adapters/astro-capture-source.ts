import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from '@/gnr8/runtime/types';
import type * as Store from '@/gnr8/runtime/runtime-store';

export async function resolveAstroCaptureSource(initiallySelectedVersion: CanonicalSiteVersionSnapshot, initiallySelectedArtifact: RuntimeArtifact, existingAdapter: string | null, deps: Pick<typeof Store, 'getSiteVersion' | 'getArtifactById' | 'getRawImportedSiteArtifact'>, savedGuideSiteVersionId?: string) {
  const { getSiteVersion, getArtifactById, getRawImportedSiteArtifact } = deps;
  const buildEvidence = initiallySelectedArtifact.manifest.generatedOutputBuildEvidence as
    | { sourceCapture?: { siteVersionId?: unknown; artifactId?: unknown } }
    | undefined
  const lineageVersionId = String(buildEvidence?.sourceCapture?.siteVersionId ?? '').trim()
  const lineageArtifactId = String(buildEvidence?.sourceCapture?.artifactId ?? '').trim()
  let sourceVersion = lineageVersionId ? await getSiteVersion(lineageVersionId) : initiallySelectedVersion
  let sourceArtifact = lineageArtifactId ? await getArtifactById(lineageArtifactId) : initiallySelectedArtifact
  let rawArtifact = sourceVersion ? await getRawImportedSiteArtifact(sourceVersion.id) : null

  // The build capture may include acquired dependencies. A Lumos proposal's
  // saved guide still belongs to its original capture, not that derivative.
  const workspace = record(initiallySelectedArtifact.manifest.generatedOutputSourceWorkspace)
  const brand = record(workspace?.lumosBrand)
  if (existingAdapter === 'astro-static-site' && brand?.format === 'gnr8-lumos-brand:v1') {
    if (typeof brand.siteVersionId !== 'string' || typeof brand.artifactId !== 'string')
      throw new Error('astro_generation_source_capture_lineage_missing')
    sourceVersion = await getSiteVersion(brand.siteVersionId)
    sourceArtifact = sourceVersion?.artifactId ? await getArtifactById(sourceVersion.artifactId) : null
    rawArtifact = sourceVersion ? await getRawImportedSiteArtifact(sourceVersion.id) : null
    if (!rawArtifact || rawArtifact.id !== brand.artifactId)
      throw new Error('astro_generation_source_capture_lineage_missing')
  }

  if (savedGuideSiteVersionId && existingAdapter !== 'astro-static-site' && initiallySelectedVersion.id !== savedGuideSiteVersionId) {
    let ancestor: CanonicalSiteVersionSnapshot | null = initiallySelectedVersion;
    const seen = new Set<string>();
    for (let depth = 0; depth < 12 && ancestor && ancestor.id !== savedGuideSiteVersionId; depth++) {
      if (seen.has(ancestor.id)) break;
      seen.add(ancestor.id);
      const parentId: unknown = record(ancestor.importProvenanceSummary?.derivedCapture)?.parentSiteVersionId;
      ancestor = typeof parentId === 'string' && parentId ? await getSiteVersion(parentId) : null;
    }
    if (ancestor?.id !== savedGuideSiteVersionId) throw new Error('409|LUMOS_SOURCE_CHANGED');
    sourceVersion = ancestor;
    sourceArtifact = ancestor.artifactId ? await getArtifactById(ancestor.artifactId) : null;
    rawArtifact = await getRawImportedSiteArtifact(ancestor.id);
  }

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
