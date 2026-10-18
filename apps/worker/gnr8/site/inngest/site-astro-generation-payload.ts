import { parseAcceptedFunctionalReductions, type SiteAstroGenerationRequestedPayload } from '@gnr8/runtime-contracts'

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
  } as SiteAstroGenerationRequestedPayload
}
