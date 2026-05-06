import { resolveImportedSiteName } from '@/gnr8/site/site-import-site-name'

type BuildSiteImportCreatePayloadInput = {
  userProvidedSiteName?: string | null
  sourceUrl: string
  documentTitle?: string | null
  clientId: string
  agencyId: string
}

export type SiteImportCreatePayload = {
  name: string
  sourceUrl: string
  clientId: string
  agencyId: string
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

export function buildSiteImportCreatePayload(input: BuildSiteImportCreatePayloadInput): SiteImportCreatePayload {
  const sourceUrl = normalizeText(input.sourceUrl)
  const clientId = normalizeText(input.clientId)
  const agencyId = normalizeText(input.agencyId)
  const resolved = resolveImportedSiteName({
    userProvidedName: input.userProvidedSiteName,
    sourceUrl,
    documentTitle: input.documentTitle,
  })
  const name = normalizeText(resolved.resolvedName) || 'Imported Site'

  return {
    name,
    sourceUrl,
    clientId,
    agencyId,
  }
}
