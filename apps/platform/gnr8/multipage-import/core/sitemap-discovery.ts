import { diagnosticEntry, sortDiagnostics } from '../diagnostics/multipage-diagnostics'
import { normalizeInternalHref, normalizeMultipageHost, normalizeSeedUrl } from '../normalization/route-normalization'
import type {
  MultipageImportLimits,
  SitemapDiscoveryDiscoveredUrl,
  SitemapDiscoveryEvidence,
  SitemapDiscoverySkippedUrl,
  SitemapFetchResult,
} from '../types/contracts'

type SitemapFetch = (url: string) => Promise<SitemapFetchResult | null>

type SitemapQueueEntry = {
  url: string
  nestedDepth: number
}

const SITEMAP_PATHS = ['/sitemap.xml', '/sitemap_index.xml'] as const

function decodeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim()
}

function extractLocValues(xml: string): string[] {
  const values: string[] = []
  const locPattern = /<loc(?:\s[^>]*)?>([\s\S]*?)<\/loc>/gi
  let match: RegExpExecArray | null
  while ((match = locPattern.exec(xml)) !== null) {
    const value = decodeXmlText(String(match[1] ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1'))
    if (value) values.push(value)
  }
  return values
}

function sitemapKind(xml: string): 'index' | 'urlset' | 'unknown' {
  const sample = xml.slice(0, 4096).toLowerCase()
  if (/<\s*sitemapindex(?:\s|>)/i.test(sample)) return 'index'
  if (/<\s*urlset(?:\s|>)/i.test(sample)) return 'urlset'
  return 'unknown'
}

function normalizeSitemapFetchUrl(input: {
  href: string
  currentSitemapUrl: string
  canonicalHost: string
}): { url: string } | { skip: string } {
  try {
    const parsed = new URL(input.href, input.currentSitemapUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { skip: 'unsupported_scheme' }
    const host = normalizeMultipageHost(parsed.hostname)
    if (host !== input.canonicalHost) return { skip: 'external_host' }
    parsed.hostname = host
    parsed.hash = ''
    parsed.search = ''
    return { url: parsed.toString() }
  } catch {
    return { skip: 'invalid_url' }
  }
}

function skippedUrl(input: {
  originalUrl: string | null
  normalizedUrl?: string | null
  normalizedRoutePath?: string | null
  sourceSitemapUrl: string
  reason: string
}): SitemapDiscoverySkippedUrl {
  return {
    originalUrl: input.originalUrl,
    normalizedUrl: input.normalizedUrl ?? null,
    normalizedRoutePath: input.normalizedRoutePath ?? null,
    sourceSitemapUrl: input.sourceSitemapUrl,
    reason: input.reason,
  }
}

export async function discoverSitemapUrls(input: {
  seedUrl: string
  canonicalHost: string
  limits: MultipageImportLimits
  fetchSitemap?: SitemapFetch
}): Promise<SitemapDiscoveryEvidence> {
  const diagnostics: string[] = [diagnosticEntry('SITEMAP_DISCOVERY_STARTED', input.seedUrl)]
  const attempted = new Set<string>()
  const fetched = new Set<string>()
  const nested = new Set<string>()
  const discovered = new Map<string, SitemapDiscoveryDiscoveredUrl>()
  const skipped: SitemapDiscoverySkippedUrl[] = []
  let skippedUrlCount = 0
  const normalizedSeed = normalizeSeedUrl(input.seedUrl)
  const recordSkipped = (entry: SitemapDiscoverySkippedUrl): void => {
    skippedUrlCount += 1
    if (skipped.length < 50) skipped.push(entry)
  }

  const limitsApplied = {
    maxSitemaps: input.limits.maxSitemaps,
    maxUrlsFromSitemaps: input.limits.maxUrlsFromSitemaps,
    maxNestedSitemaps: input.limits.maxNestedSitemaps,
  }

  if (!normalizedSeed || !input.fetchSitemap) {
    diagnostics.push(diagnosticEntry('SITEMAP_DISCOVERY_NOT_FOUND', !normalizedSeed ? 'invalid_seed' : 'fetch_unavailable'))
    return {
      attemptedSitemapUrls: [],
      fetchedSitemapUrls: [],
      nestedSitemapCount: 0,
      urlCount: 0,
      skippedUrlCount: 0,
      discoveredUrls: [],
      skippedUrls: [],
      limitsApplied,
      diagnostics: sortDiagnostics(diagnostics),
    }
  }

  const queue: SitemapQueueEntry[] = SITEMAP_PATHS.map((pathname) => ({
    url: new URL(pathname, normalizedSeed.url).toString(),
    nestedDepth: 0,
  }))

  while (queue.length > 0) {
    const next = queue.shift()
    if (!next) continue
    if (attempted.has(next.url)) continue
    if (attempted.size >= input.limits.maxSitemaps) {
      diagnostics.push(diagnosticEntry('SITEMAP_LIMIT_REACHED', `maxSitemaps:${input.limits.maxSitemaps}`))
      break
    }

    attempted.add(next.url)

    let response: SitemapFetchResult | null = null
    try {
      response = await input.fetchSitemap(next.url)
    } catch {
      diagnostics.push(diagnosticEntry('SITEMAP_DISCOVERY_FAILED', next.url))
      continue
    }

    if (!response || !response.body.trim()) {
      diagnostics.push(diagnosticEntry('SITEMAP_DISCOVERY_NOT_FOUND', next.url))
      continue
    }

    const responseUrl = response.url || next.url
    fetched.add(responseUrl)
    const kind = sitemapKind(response.body)
    const locs = extractLocValues(response.body)
    if (kind === 'unknown' || locs.length === 0) {
      diagnostics.push(diagnosticEntry('SITEMAP_DISCOVERY_FAILED', `${responseUrl}:malformed`))
      continue
    }

    if (kind === 'index') {
      diagnostics.push(diagnosticEntry('SITEMAP_NESTED_DISCOVERY_STARTED', responseUrl))
      let acceptedNested = 0
      for (const loc of locs) {
        if (nested.size >= input.limits.maxNestedSitemaps) {
          diagnostics.push(diagnosticEntry('SITEMAP_LIMIT_REACHED', `maxNestedSitemaps:${input.limits.maxNestedSitemaps}`))
          break
        }
        const normalized = normalizeSitemapFetchUrl({
          href: loc,
          currentSitemapUrl: responseUrl,
          canonicalHost: input.canonicalHost,
        })
        if ('skip' in normalized) {
          recordSkipped(skippedUrl({ originalUrl: loc, sourceSitemapUrl: responseUrl, reason: normalized.skip }))
          diagnostics.push(diagnosticEntry('SITEMAP_URL_SKIPPED', `${normalized.skip}:${loc}`))
          continue
        }
        if (attempted.has(normalized.url) || nested.has(normalized.url)) continue
        nested.add(normalized.url)
        queue.push({ url: normalized.url, nestedDepth: next.nestedDepth + 1 })
        acceptedNested += 1
      }
      diagnostics.push(diagnosticEntry('SITEMAP_NESTED_DISCOVERY_SUCCEEDED', `${responseUrl}:${acceptedNested}`))
      continue
    }

    for (const loc of locs) {
      if (discovered.size >= input.limits.maxUrlsFromSitemaps) {
        diagnostics.push(diagnosticEntry('SITEMAP_LIMIT_REACHED', `maxUrlsFromSitemaps:${input.limits.maxUrlsFromSitemaps}`))
        recordSkipped(skippedUrl({ originalUrl: loc, sourceSitemapUrl: responseUrl, reason: 'url_limit' }))
        continue
      }

      const normalized = normalizeInternalHref({
        href: loc,
        currentPageUrl: responseUrl,
        canonicalHost: input.canonicalHost,
      })
      if ('skip' in normalized) {
        recordSkipped(skippedUrl({ originalUrl: loc, sourceSitemapUrl: responseUrl, reason: normalized.skip }))
        diagnostics.push(diagnosticEntry('SITEMAP_URL_SKIPPED', `${normalized.skip}:${loc}`))
        continue
      }
      if (discovered.has(normalized.normalized.path)) {
        recordSkipped(
          skippedUrl({
            originalUrl: loc,
            normalizedUrl: normalized.normalized.url,
            normalizedRoutePath: normalized.normalized.path,
            sourceSitemapUrl: responseUrl,
            reason: 'duplicate_route',
          }),
        )
        diagnostics.push(diagnosticEntry('SITEMAP_URL_SKIPPED', `duplicate_route:${normalized.normalized.path}`))
        continue
      }

      discovered.set(normalized.normalized.path, {
        originalUrl: loc,
        normalizedUrl: normalized.normalized.url,
        normalizedRoutePath: normalized.normalized.path,
        sourceSitemapUrl: responseUrl,
      })
      diagnostics.push(diagnosticEntry('SITEMAP_URL_DISCOVERED', normalized.normalized.path))
    }
  }

  if (fetched.size > 0) diagnostics.push(diagnosticEntry('SITEMAP_DISCOVERY_SUCCEEDED', `${discovered.size}`))
  else diagnostics.push(diagnosticEntry('SITEMAP_DISCOVERY_NOT_FOUND', 'no_sitemaps_fetched'))

  const discoveredUrls = [...discovered.values()].sort((a, b) => a.normalizedRoutePath.localeCompare(b.normalizedRoutePath))
  const skippedUrls = skipped.sort((a, b) =>
    `${a.reason}|${a.normalizedRoutePath ?? ''}|${a.originalUrl ?? ''}`.localeCompare(`${b.reason}|${b.normalizedRoutePath ?? ''}|${b.originalUrl ?? ''}`),
  )

  return {
    attemptedSitemapUrls: [...attempted].sort((a, b) => a.localeCompare(b)),
    fetchedSitemapUrls: [...fetched].sort((a, b) => a.localeCompare(b)),
    nestedSitemapCount: nested.size,
    urlCount: discoveredUrls.length,
    skippedUrlCount,
    discoveredUrls,
    skippedUrls,
    limitsApplied,
    diagnostics: sortDiagnostics(diagnostics),
  }
}
