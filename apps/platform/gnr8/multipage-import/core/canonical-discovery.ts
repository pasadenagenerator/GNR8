import { parse } from 'parse5'

import { diagnosticEntry, sortDiagnostics } from '../diagnostics/multipage-diagnostics'
import { normalizeSeedUrl } from '../normalization/route-normalization'
import type {
  CanonicalDiscoveryConflict,
  CanonicalDiscoveryDuplicate,
  CanonicalDiscoveryEntry,
  CanonicalDiscoveryEvidence,
  CanonicalSameSiteStatus,
  HreflangDiscoveryEntry,
  HreflangDiscoveryGroup,
} from '../types/contracts'

type DiscoveredLinkElement = {
  rel: string
  href: string
  hreflang: string | null
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((entry) => text(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function collectAttrs(node: unknown): Record<string, string> {
  const attrs = ((node as { attrs?: Array<{ name: string; value: string }> })?.attrs ?? []) as Array<{ name: string; value: string }>
  const out: Record<string, string> = {}
  for (const attr of attrs) out[attr.name.toLowerCase()] = String(attr.value ?? '')
  return out
}

function nodeName(node: unknown): string {
  return String((node as { nodeName?: string })?.nodeName ?? '').toLowerCase()
}

function relTokens(value: string): Set<string> {
  return new Set(value.toLowerCase().split(/\s+/).map((entry) => entry.trim()).filter(Boolean))
}

function collectCanonicalLinkElements(html: string): DiscoveredLinkElement[] {
  const document = parse(html)
  const out: DiscoveredLinkElement[] = []
  const walk = (node: unknown): void => {
    const name = nodeName(node)
    const attrs = collectAttrs(node)
    if (name === 'link') {
      const rel = text(attrs.rel)
      const href = text(attrs.href)
      const tokens = relTokens(rel)
      if (href && (tokens.has('canonical') || (tokens.has('alternate') && text(attrs.hreflang)))) {
        out.push({
          rel,
          href,
          hreflang: text(attrs.hreflang) || null,
        })
      }
    }
    for (const child of ((node as { childNodes?: unknown[] }).childNodes ?? []) as unknown[]) walk(child)
  }
  walk(document)
  return out
}

function normalizeLinkedUrl(input: {
  href: string
  pageUrl: string
  seedCanonicalHost: string
}): {
  url: string | null
  normalizedRoutePath: string | null
  sameSite: boolean
  sameSiteStatus: CanonicalSameSiteStatus
} {
  let parsed: URL
  try {
    parsed = new URL(input.href, input.pageUrl)
  } catch {
    return { url: null, normalizedRoutePath: null, sameSite: false, sameSiteStatus: 'invalid_url' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { url: parsed.toString(), normalizedRoutePath: null, sameSite: false, sameSiteStatus: 'unsupported_scheme' }
  }

  const normalized = normalizeSeedUrl(parsed.toString())
  if (!normalized) return { url: parsed.toString(), normalizedRoutePath: null, sameSite: false, sameSiteStatus: 'invalid_url' }
  const sameSite = normalized.canonicalHost === input.seedCanonicalHost
  return {
    url: normalized.url,
    normalizedRoutePath: sameSite ? normalized.path : null,
    sameSite,
    sameSiteStatus: sameSite ? 'same_site' : 'external_site',
  }
}

function groupHreflangEntries(entries: HreflangDiscoveryEntry[]): HreflangDiscoveryGroup[] {
  const byPage = new Map<string, HreflangDiscoveryEntry[]>()
  for (const entry of entries) {
    const group = byPage.get(entry.pageRoutePath) ?? []
    group.push(entry)
    byPage.set(entry.pageRoutePath, group)
  }
  return [...byPage.entries()]
    .map(([pageRoutePath, groupEntries]) => ({
      pageRoutePath,
      entries: groupEntries.slice().sort((a, b) => (a.hreflang === b.hreflang ? text(a.url).localeCompare(text(b.url)) : a.hreflang.localeCompare(b.hreflang))),
    }))
    .sort((a, b) => a.pageRoutePath.localeCompare(b.pageRoutePath))
}

function detectDuplicates(entries: CanonicalDiscoveryEntry[]): CanonicalDiscoveryDuplicate[] {
  const byRoute = new Map<string, CanonicalDiscoveryEntry[]>()
  for (const entry of entries) {
    if (!entry.sameSite || !entry.normalizedCanonicalRoutePath) continue
    const group = byRoute.get(entry.normalizedCanonicalRoutePath) ?? []
    group.push(entry)
    byRoute.set(entry.normalizedCanonicalRoutePath, group)
  }

  return [...byRoute.entries()]
    .map(([normalizedCanonicalRoutePath, group]) => ({
      normalizedCanonicalRoutePath,
      pageRoutePaths: uniqueSorted(group.map((entry) => entry.pageRoutePath)),
      pageUrls: uniqueSorted(group.map((entry) => entry.pageUrl)),
      canonicalUrls: uniqueSorted(group.map((entry) => entry.canonicalUrl ?? '')),
    }))
    .filter((entry) => entry.pageRoutePaths.length > 1)
    .sort((a, b) => a.normalizedCanonicalRoutePath.localeCompare(b.normalizedCanonicalRoutePath))
}

function detectConflicts(entries: CanonicalDiscoveryEntry[]): CanonicalDiscoveryConflict[] {
  const byPage = new Map<string, CanonicalDiscoveryEntry[]>()
  for (const entry of entries) {
    const group = byPage.get(entry.pageRoutePath) ?? []
    group.push(entry)
    byPage.set(entry.pageRoutePath, group)
  }

  return [...byPage.entries()]
    .flatMap(([pageRoutePath, group]) => {
      const canonicalUrls = uniqueSorted(group.map((entry) => entry.canonicalUrl ?? ''))
      const normalizedCanonicalRoutePaths = uniqueSorted(group.map((entry) => entry.normalizedCanonicalRoutePath ?? ''))
      if (canonicalUrls.length <= 1 && normalizedCanonicalRoutePaths.length <= 1) return []
      const first = group[0]
      if (!first) return []
      return [{
        pageUrl: first.pageUrl,
        pageRoutePath,
        canonicalUrls,
        normalizedCanonicalRoutePaths,
        reason: 'multiple_canonical_targets',
      }]
    })
    .sort((a, b) => a.pageRoutePath.localeCompare(b.pageRoutePath))
}

export function emptyCanonicalDiscoveryEvidence(diagnostics: string[] = []): CanonicalDiscoveryEvidence {
  return {
    canonicalEntries: [],
    alternateLanguageEntries: [],
    duplicates: [],
    conflicts: [],
    hreflangGroups: [],
    diagnostics: sortDiagnostics(diagnostics),
  }
}

export function buildCanonicalDiscoveryEvidence(input: {
  seedCanonicalHost: string
  pages: Array<{
    pageUrl: string
    pageRoutePath: string
    html: string
  }>
}): CanonicalDiscoveryEvidence {
  const diagnostics: string[] = [diagnosticEntry('CANONICAL_DISCOVERY_STARTED', `${input.pages.length}`)]
  const canonicalEntries: CanonicalDiscoveryEntry[] = []
  const alternateLanguageEntries: HreflangDiscoveryEntry[] = []

  for (const page of input.pages.slice().sort((a, b) => a.pageRoutePath.localeCompare(b.pageRoutePath))) {
    const links = collectCanonicalLinkElements(page.html)
    for (const link of links) {
      const tokens = relTokens(link.rel)
      const normalized = normalizeLinkedUrl({
        href: link.href,
        pageUrl: page.pageUrl,
        seedCanonicalHost: input.seedCanonicalHost,
      })

      if (tokens.has('canonical')) {
        const canonicalEquivalenceStatus =
          !normalized.url || normalized.sameSiteStatus === 'invalid_url' || normalized.sameSiteStatus === 'unsupported_scheme'
            ? 'invalid_url'
            : !normalized.sameSite
              ? 'not_same_site'
              : normalized.normalizedRoutePath === page.pageRoutePath
                ? 'same_route'
                : 'different_route'
        const entry: CanonicalDiscoveryEntry = {
          pageUrl: page.pageUrl,
          pageRoutePath: page.pageRoutePath,
          canonicalUrl: normalized.url,
          normalizedCanonicalRoutePath: normalized.normalizedRoutePath,
          sameSite: normalized.sameSite,
          sameSiteStatus: normalized.sameSiteStatus,
          canonicalEquivalenceStatus,
        }
        canonicalEntries.push(entry)
        diagnostics.push(diagnosticEntry('CANONICAL_DISCOVERY_FOUND', `${page.pageRoutePath}:${normalized.normalizedRoutePath ?? normalized.url ?? 'invalid'}`))
        if (canonicalEquivalenceStatus === 'same_route') diagnostics.push(diagnosticEntry('CANONICAL_ROUTE_EQUIVALENT', page.pageRoutePath))
        if (canonicalEquivalenceStatus === 'different_route') {
          diagnostics.push(diagnosticEntry('CANONICAL_ROUTE_DIFFERENT', `${page.pageRoutePath}:${normalized.normalizedRoutePath ?? ''}`))
        }
      }

      if (tokens.has('alternate') && link.hreflang) {
        alternateLanguageEntries.push({
          pageUrl: page.pageUrl,
          pageRoutePath: page.pageRoutePath,
          hreflang: link.hreflang,
          url: normalized.url,
          normalizedRoutePath: normalized.normalizedRoutePath,
          sameSite: normalized.sameSite,
          sameSiteStatus: normalized.sameSiteStatus,
        })
        diagnostics.push(diagnosticEntry('HREFLANG_DISCOVERY_FOUND', `${page.pageRoutePath}:${link.hreflang}:${normalized.normalizedRoutePath ?? normalized.url ?? 'invalid'}`))
      }
    }
  }

  const duplicates = detectDuplicates(canonicalEntries)
  for (const duplicate of duplicates) {
    diagnostics.push(diagnosticEntry('CANONICAL_DISCOVERY_DUPLICATE', `${duplicate.normalizedCanonicalRoutePath}:${duplicate.pageRoutePaths.join('|')}`))
  }

  const conflicts = detectConflicts(canonicalEntries)
  for (const conflict of conflicts) {
    diagnostics.push(diagnosticEntry('CANONICAL_DISCOVERY_CONFLICT', `${conflict.pageRoutePath}:${conflict.normalizedCanonicalRoutePaths.join('|') || conflict.canonicalUrls.join('|')}`))
  }

  return {
    canonicalEntries: canonicalEntries.sort((a, b) => `${a.pageRoutePath}|${a.canonicalUrl ?? ''}`.localeCompare(`${b.pageRoutePath}|${b.canonicalUrl ?? ''}`)),
    alternateLanguageEntries: alternateLanguageEntries.sort((a, b) => `${a.pageRoutePath}|${a.hreflang}|${a.url ?? ''}`.localeCompare(`${b.pageRoutePath}|${b.hreflang}|${b.url ?? ''}`)),
    duplicates,
    conflicts,
    hreflangGroups: groupHreflangEntries(alternateLanguageEntries),
    diagnostics: sortDiagnostics(diagnostics),
  }
}
