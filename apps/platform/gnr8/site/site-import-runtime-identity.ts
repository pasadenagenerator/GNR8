import crypto from 'node:crypto'

import { deterministicId } from '../runtime/deterministic'

function scopedUuid(value: string): string {
  const digest = crypto.createHash('sha256').update(value).digest()
  const bytes = Uint8Array.from(digest.subarray(0, 16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Buffer.from(bytes).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/** Known before intake so a private GitHub target can be bound to a new site. */
export function newScopedImportOwnershipSiteId(input: {agencyId: string; clientId: string; sourceUrl: string}): string {
  return scopedUuid(`ownership-site|${input.agencyId}|${input.clientId}|${input.sourceUrl}`)
}

export function buildScopedImportRuntimeIdentity(input: {
  sourceUrl: string
  clientId: string
  agencyId: string
  reuseLegacyRuntimeSiteId: boolean
  captureRevision?: 'github-complete-capture-v1' | `reviewed-import-v2:${string}`
}): { siteId: string; siteVersionId: string; correlationKey: string } {
  const siteId = input.reuseLegacyRuntimeSiteId
    ? deterministicId('site', `${input.sourceUrl}|/`)
    : deterministicId('site', `${input.agencyId}|${input.clientId}|${input.sourceUrl}|/`)
  const correlationKey = deterministicId('runtime-import-correlation',
    `${input.agencyId}|${input.clientId}|${input.sourceUrl}|${siteId}${input.captureRevision ? `|${input.captureRevision}` : ''}`)
  const siteVersionId = scopedUuid(`${correlationKey}|site-version`)
  return { siteId, siteVersionId, correlationKey }
}
