import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

import { discoverMultipageImportTree, type MultipageImportLimits } from '@/gnr8/multipage-import'
import { normalizeMultipageHost } from '@/gnr8/multipage-import/normalization/route-normalization'

export type SiteImportAnalysis = {
  sourceUrl: string
  baseLanguage: string
  languages: string[]
  routes: Array<{ path: string; title: string | null; role: string; language: string }>
  blogPostCount: number
  formsOnEntryPage: number
  unsupportedFeatures: string[]
  features: { cookies: boolean; backToTop: boolean; accessibility: boolean; search: boolean; map: boolean; video: boolean; analytics: boolean }
  notes: string[]
}

const limits: Partial<MultipageImportLimits> = {
  maxRoutes: 180, maxDepth: 3, maxLinksPerPage: 300, maxTemplateLinksPerRoute: 30,
  maxSitemaps: 5, maxUrlsFromSitemaps: 180, maxNestedSitemaps: 5,
}

function publicHostname(hostname: string): boolean {
  const name = hostname.toLowerCase()
  if (!name || name === 'localhost' || name.endsWith('.localhost') || name.endsWith('.local') || name.endsWith('.internal')) return false
  if (isIP(name)) return false
  return true
}

function publicAddress(address: string): boolean {
  if (address.includes(':')) {
    const value = address.toLowerCase()
    if (value.startsWith('::ffff:')) return publicAddress(value.slice('::ffff:'.length))
    return value !== '::1' && value !== '::' && !value.startsWith('fc') && !value.startsWith('fd') && !value.startsWith('fe8') && !value.startsWith('fe9') && !value.startsWith('fea') && !value.startsWith('feb')
  }
  const octets = address.split('.').map(Number)
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = octets
  return a !== 0 && a !== 10 && a !== 127 && a < 224 && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && b === 168) && !(a === 100 && b >= 64 && b <= 127)
}

async function readBounded(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.byteLength
      if (size > maxBytes) throw new Error('Analysis response is too large.')
      chunks.push(next.value)
    }
  } finally {
    await reader.cancel().catch(() => undefined)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

async function fetchPublicText(rawUrl: string, sourceHost: string, maxBytes: number): Promise<{ url: string; body: string; contentType: string | null } | null> {
  try {
    let url = new URL(rawUrl)
    for (let redirect = 0; redirect < 3; redirect += 1) {
      if (!['http:', 'https:'].includes(url.protocol) || !publicHostname(url.hostname) || normalizeMultipageHost(url.hostname) !== sourceHost) return null
      const addresses = await lookup(url.hostname, { all: true })
      if (addresses.length === 0 || addresses.some((entry) => !publicAddress(entry.address))) return null
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12_000) })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) return null
        url = new URL(location, url)
        continue
      }
      if (!response.ok) return null
      return { url: url.toString(), body: await readBounded(response, maxBytes), contentType: response.headers.get('content-type') }
    }
    return null
  } catch { return null }
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim() || null
}

export function summarizeSiteImportAnalysis(sourceUrl: string, html: string, routes: Array<{ path: string; title: string | null; role: string }>): SiteImportAnalysis {
  const baseLanguage = attribute(html.match(/<html\b[^>]*>/i)?.[0] ?? '', 'lang')?.toLowerCase().split('-')[0] || 'und'
  const alternatePrefixes = new Map<string, string>()
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (attribute(tag, 'rel')?.toLowerCase() !== 'alternate') continue
    const language = attribute(tag, 'hreflang')?.toLowerCase().split('-')[0]
    const href = attribute(tag, 'href')
    if (!language || !href || language === 'x') continue
    try {
      const path = new URL(href, sourceUrl).pathname
      const first = path.split('/').filter(Boolean)[0]
      if (first && first.toLowerCase() === language) alternatePrefixes.set(first.toLowerCase(), language)
    } catch { /* Ignore malformed alternate links. */ }
  }
  const analyzedRoutes = routes.map((route) => {
    const prefix = route.path.split('/').filter(Boolean)[0]?.toLowerCase() ?? ''
    return { ...route, language: alternatePrefixes.get(prefix) ?? baseLanguage }
  })
  const markup = html.toLowerCase()
  const tags = html.match(/<form\b[^>]*>/gi) ?? []
  const features = {
    cookies: /cookie(consent|banner|notice|settings)|cookie[-_ ]?(consent|banner|notice)|onetrust|cookiebot/i.test(markup),
    backToTop: /back[-_ ]?to[-_ ]?top|scroll[-_ ]?to[-_ ]?top|to[-_ ]?top/i.test(markup),
    accessibility: /accessibility[-_ ]?(widget|toolbar|menu)|userway|accessibe|yaccessibility/i.test(markup),
    search: /<input\b[^>]*(?:type=["']?search|name=["']?(?:s|q|query|search)["'\s>])|role=["']search|<form\b[^>]*search/i.test(markup),
    map: /google\.[^"' ]*\/maps|openstreetmap\.org|<iframe\b[^>]*map/i.test(markup),
    video: /<video\b|youtube(?:-nocookie)?\.com\/embed|player\.vimeo\.com/i.test(markup),
    analytics: /google-analytics\.com|googletagmanager\.com|connect\.facebook\.net|hotjar\.com|clarity\.ms|matomo\.|plausible\.io\/js|\bgtag\s*\(|\bga\s*\(/i.test(markup),
  }
  const unsupportedFeatures = [
    ...(/(?:checkout|cart|add-to-cart|stripe\.com|paypal\.com)/i.test(markup) ? ['Commerce or checkout'] : []),
    ...(/(?:login|sign[ -]?in|authenticate|password)/i.test(markup) ? ['Account or sign-in'] : []),
    ...(/(?:recaptcha|hcaptcha|turnstile)/i.test(markup) ? ['Form CAPTCHA'] : []),
  ]
  return {
    sourceUrl, baseLanguage,
    languages: [...new Set([baseLanguage, ...alternatePrefixes.values()])],
    routes: analyzedRoutes,
    blogPostCount: analyzedRoutes.filter((route) => route.role === 'article' || /^\/(?:b|blog|news|posts?)\/[^/]+/i.test(route.path)).length,
    formsOnEntryPage: tags.length,
    unsupportedFeatures,
    features,
    notes: ['Route and feature counts are estimates from the entry page, navigation and sitemap. Forms on other pages may be found during import.', 'Known tracking scripts are removed from imported HTML.'],
  }
}

export async function analyzePublicSiteForImport(sourceUrl: string): Promise<SiteImportAnalysis> {
  const parsed = new URL(sourceUrl)
  if (!['http:', 'https:'].includes(parsed.protocol) || !publicHostname(parsed.hostname)) throw new Error('Enter a public website URL.')
  const sourceHost = normalizeMultipageHost(parsed.hostname)
  const seed = await fetchPublicText(parsed.toString(), sourceHost, 1_000_000)
  if (!seed || !seed.contentType?.toLowerCase().includes('text/html') || !seed.body.trim()) throw new Error('Could not read a public HTML page at this URL.')
  const tree = await discoverMultipageImportTree({ siteId: 'import-analysis', seedUrl: seed.url, limits }, {
    fetchPage: async (url) => normalizeMultipageHost(new URL(url).hostname) === sourceHost && new URL(url).pathname === new URL(seed.url).pathname
      ? { url: seed.url, html: seed.body, title: null } : null,
    fetchRobots: async (url) => fetchPublicText(url, sourceHost, 128_000),
    fetchSitemap: async (url) => fetchPublicText(url, sourceHost, 1_000_000),
  })
  if (!tree.routes.some((route) => route.normalizedPath === '/' && route.robotsGovernance !== 'disallowed')) {
    throw new Error('The home page cannot be included from this URL.')
  }
  return summarizeSiteImportAnalysis(seed.url, seed.body, tree.routes.filter((route) => route.isHtmlPageCandidate && route.robotsGovernance !== 'disallowed').map((route) => ({
    path: route.normalizedPath, title: route.title, role: route.pageRole,
  })))
}
