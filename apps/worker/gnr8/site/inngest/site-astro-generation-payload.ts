import { parseAcceptedFunctionalReductions, parseRetainedFunctions, type SiteAstroGenerationRequestedPayload } from '@gnr8/runtime-contracts'
import { parseStackiScope } from '../../../../platform/gnr8/stacki/stacki-draft-contract'
import { parseStackiCandidateSelection } from '../../../../platform/gnr8/stacki/stacki-candidate-selection'
import { parseLumosBrandReference } from '../../../../platform/gnr8/brand/lumos-source-proposal'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function parseSiteAstroGenerationPayload(value: unknown): SiteAstroGenerationRequestedPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const actionId = normalizeText(record.actionId)
  const requestedAt = normalizeText(record.requestedAt)
  const ownershipSiteId = normalizeText(record.ownershipSiteId)
  const runtimeSiteId = normalizeText(record.runtimeSiteId)
  const sourceSiteVersionId = normalizeText(record.sourceSiteVersionId)
  const sourceArtifactId = normalizeText(record.sourceArtifactId)
  const actor = normalizeText(record.actor)
  const strategy = normalizeText(record.strategy)
  const requestedAdapterId = normalizeText(record.requestedAdapterId)
  if (!actionId || !requestedAt || !Number.isFinite(Date.parse(requestedAt)) || !ownershipSiteId || !runtimeSiteId || !sourceSiteVersionId || !sourceArtifactId || !actor) return null
  if (requestedAdapterId && requestedAdapterId !== 'astro-static-site' && requestedAdapterId !== 'html-static-artifact') return null
  const acceptedFunctionalReductions = record.acceptedFunctionalReductions === undefined
    ? undefined : parseAcceptedFunctionalReductions(record.acceptedFunctionalReductions)
  if (acceptedFunctionalReductions === null) return null
  let stackiBaseline: SiteAstroGenerationRequestedPayload['stackiBaseline']
  if (record.stackiBaseline !== undefined) {
    try { stackiBaseline = parseStackiScope(record.stackiBaseline) } catch { return null }
    if (record.stackiRevision !== undefined || acceptedFunctionalReductions ||
      stackiBaseline.siteId !== ownershipSiteId || stackiBaseline.siteVersionId !== sourceSiteVersionId ||
      strategy !== 'stacki_astro7_baseline' || requestedAdapterId !== 'astro-static-site' ||
      typeof record.stackiSourceArtifactSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.stackiSourceArtifactSha256)) return null
  }
  let stackiRevision: SiteAstroGenerationRequestedPayload['stackiRevision']
  if (record.stackiRevision !== undefined) {
    try { stackiRevision = parseStackiCandidateSelection(record.stackiRevision) } catch { return null }
    if (acceptedFunctionalReductions || stackiRevision.scope.siteId !== ownershipSiteId ||
      stackiRevision.scope.siteVersionId !== sourceSiteVersionId ||
      typeof record.stackiSourceArtifactSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(record.stackiSourceArtifactSha256)) return null
  } else if (!stackiBaseline && record.stackiSourceArtifactSha256 !== undefined) return null

  if (strategy === 'stacki_astro7_baseline' && !stackiBaseline) return null
  let lumosBrand: SiteAstroGenerationRequestedPayload['lumosBrand']
  if (record.lumosBrand !== undefined) {
    try { lumosBrand = parseLumosBrandReference(record.lumosBrand) } catch { return null }
    if (stackiBaseline || stackiRevision || requestedAdapterId !== 'astro-static-site' ||
      lumosBrand.siteVersionId !== sourceSiteVersionId) return null
  }
  const retainedFunctions=record.retainedFunctions===undefined?undefined:parseRetainedFunctions(record.retainedFunctions)
  if(retainedFunctions===null || (retainedFunctions && (!lumosBrand||acceptedFunctionalReductions)))return null

  return {
    actionId,
    requestedAt: new Date(requestedAt).toISOString(),
    ownershipSiteId,
    runtimeSiteId,
    sourceSiteVersionId,
    sourceArtifactId,
    actor,
    strategy,
    ...(requestedAdapterId ? { requestedAdapterId } : {}),
    ...(acceptedFunctionalReductions ? { acceptedFunctionalReductions } : {}),
    ...(lumosBrand ? { lumosBrand } : {}),
    ...(retainedFunctions ? {retainedFunctions} : {}),
    ...(stackiBaseline ? { stackiBaseline, stackiSourceArtifactSha256: record.stackiSourceArtifactSha256 } : {}),
    ...(stackiRevision ? { stackiRevision, stackiSourceArtifactSha256: record.stackiSourceArtifactSha256 } : {}),
  } as SiteAstroGenerationRequestedPayload
}
