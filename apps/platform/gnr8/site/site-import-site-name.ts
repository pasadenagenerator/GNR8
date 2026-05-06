export type SiteImportNameResolutionSource = 'user_provided' | 'url_hostname' | 'document_title' | 'deterministic_fallback'

export type ResolveImportedSiteNameInput = {
  userProvidedName?: string | null
  sourceUrl?: string | null
  documentTitle?: string | null
}

export type ResolveImportedSiteNameResult = {
  resolvedName: string
  source: SiteImportNameResolutionSource
}

const DEFAULT_IMPORTED_SITE_NAME = 'Imported Site'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function resolveHostnameLabel(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl)
    return normalizeText(parsed.hostname)
  } catch {
    return ''
  }
}

export function extractTitleFromHtmlDocument(rawHtml: string): string {
  const html = normalizeText(rawHtml)
  if (!html) return ''
  const match = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return ''
  return normalizeText(match[1]?.replace(/\s+/g, ' '))
}

export function resolveImportedSiteName(input: ResolveImportedSiteNameInput): ResolveImportedSiteNameResult {
  const userProvidedName = normalizeText(input.userProvidedName)
  if (userProvidedName) {
    return { resolvedName: userProvidedName, source: 'user_provided' }
  }

  const hostname = resolveHostnameLabel(normalizeText(input.sourceUrl))
  if (hostname) {
    return { resolvedName: hostname, source: 'url_hostname' }
  }

  const documentTitle = normalizeText(input.documentTitle)
  if (documentTitle) {
    return { resolvedName: documentTitle, source: 'document_title' }
  }

  return { resolvedName: DEFAULT_IMPORTED_SITE_NAME, source: 'deterministic_fallback' }
}
