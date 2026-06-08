import path from 'node:path'

import { diagnosticEntry, sortDiagnostics } from '../diagnostics/multipage-diagnostics'
import { normalizeMultipageHost, normalizeSeedUrl } from '../normalization/route-normalization'
import type {
  AliasDiscoveryEvidence,
  AliasDiscoveryGroup,
  AliasDiscoverySource,
  AliasRouteCollision,
  CanonicalDiscoveryEvidence,
  RedirectDiscoveryClassification,
  RedirectDiscoveryEntry,
  RedirectDiscoveryEvidence,
} from '../types/contracts'

type UrlIdentity = {
  displayUrl: string
  canonicalHost: string
  host: string
  protocol: string
  routePath: string
  aliasRoute: string
}

export type RedirectAliasObservedUrl = {
  url: string | null | undefined
  routePath?: string | null
  canonicalRoute?: string | null
  source: AliasDiscoverySource
}

export type RedirectAliasObservedRedirect = {
  originalUrl: string | null | undefined
  finalUrl: string | null | undefined
  statusCodes?: Array<number | null | undefined>
  redirectCount?: number | null
}

function text(value: unknown): string {
  return String(value ?? '').trim()
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.map((entry) => text(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function routeFromPath(value: string | null | undefined): string | null {
  const raw = text(value)
  if (!raw) return null
  const pathOnly = raw.split('?')[0]?.split('#')[0] ?? raw
  let next = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
  next = next.replace(/\/+/g, '/')
  const lower = next.toLowerCase()
  if (lower === '/index.html' || lower === '/index.htm') return '/'
  if (lower.endsWith('/index.html') || lower.endsWith('/index.htm')) {
    next = next.slice(0, next.toLowerCase().lastIndexOf('/index.')) || '/'
  }
  next = path.posix.normalize(next)
  if (!next.startsWith('/')) next = `/${next}`
  if (next !== '/' && next.endsWith('/')) next = next.slice(0, -1)
  const ext = path.posix.extname(next).toLowerCase()
  if ((ext === '.html' || ext === '.htm') && next !== '/index.html' && next !== '/index.htm') {
    next = next.slice(0, -ext.length) || '/'
  }
  return next.toLowerCase()
}

function displayUrl(value: string): string | null {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    parsed.hash = ''
    parsed.search = ''
    parsed.hostname = parsed.hostname.toLowerCase()
    return parsed.toString()
  } catch {
    return null
  }
}

function identifyUrl(value: string | null | undefined): UrlIdentity | null {
  const raw = text(value)
  if (!raw) return null
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  const normalized = normalizeSeedUrl(raw)
  const routePath = normalized?.path ?? routeFromPath(parsed.pathname)
  const display = displayUrl(raw)
  if (!display || !routePath) return null

  return {
    displayUrl: display,
    canonicalHost: normalized?.canonicalHost ?? normalizeMultipageHost(parsed.hostname),
    host: parsed.hostname.toLowerCase(),
    protocol: parsed.protocol,
    routePath,
    aliasRoute: routeFromPath(routePath) ?? routePath,
  }
}

function canonicalRouteForObservedUrl(entry: RedirectAliasObservedUrl, identity: UrlIdentity): string {
  return routeFromPath(entry.canonicalRoute) ?? routeFromPath(entry.routePath) ?? identity.aliasRoute
}

function sourceRouteForObservedUrl(entry: RedirectAliasObservedUrl, identity: UrlIdentity): string {
  return routeFromPath(entry.routePath) ?? identity.aliasRoute
}

function redirectClassification(source: UrlIdentity, final: UrlIdentity): RedirectDiscoveryClassification {
  if (source.canonicalHost !== final.canonicalHost) return 'cross_origin_redirect'
  if (source.aliasRoute !== final.aliasRoute) return 'route_changed_redirect'
  if (source.host !== final.host || source.protocol !== final.protocol) return 'canonical_host_redirect'
  return 'same_route_redirect'
}

export function emptyRedirectDiscoveryEvidence(diagnostics: string[] = []): RedirectDiscoveryEvidence {
  return {
    redirectEntries: [],
    crossOriginRedirects: [],
    counts: {
      redirectCount: 0,
      crossOriginRedirectCount: 0,
      canonicalHostRedirectCount: 0,
    },
    diagnostics: sortDiagnostics(diagnostics),
  }
}

export function emptyAliasDiscoveryEvidence(diagnostics: string[] = []): AliasDiscoveryEvidence {
  return {
    aliasGroups: [],
    routeCollisions: [],
    conflicts: [],
    counts: {
      aliasGroupCount: 0,
      routeCollisionCount: 0,
    },
    diagnostics: sortDiagnostics(diagnostics),
  }
}

export function buildRedirectAliasDiscoveryEvidence(input: {
  seedUrl: string
  observedUrls: RedirectAliasObservedUrl[]
  observedRedirects?: RedirectAliasObservedRedirect[]
  canonicalDiscovery?: CanonicalDiscoveryEvidence | null
}): { redirectDiscovery: RedirectDiscoveryEvidence; aliasDiscovery: AliasDiscoveryEvidence } {
  const redirectDiagnostics: string[] = [diagnosticEntry('REDIRECT_DISCOVERY_STARTED', `${input.observedRedirects?.length ?? 0}`)]
  const aliasDiagnostics: string[] = [diagnosticEntry('ALIAS_DISCOVERY_STARTED', `${input.observedUrls.length}`)]
  const seedIdentity = identifyUrl(input.seedUrl)
  const redirectEntries: RedirectDiscoveryEntry[] = []
  const aliasBuckets = new Map<string, {
    aliases: Set<string>
    sources: Set<AliasDiscoverySource>
    sourceRoutes: Set<string>
  }>()

  const addAlias = (entry: RedirectAliasObservedUrl): void => {
    const identity = identifyUrl(entry.url)
    if (!identity) return
    const canonicalRoute = canonicalRouteForObservedUrl(entry, identity)
    const sourceRoute = sourceRouteForObservedUrl(entry, identity)
    const bucket = aliasBuckets.get(canonicalRoute) ?? {
      aliases: new Set<string>(),
      sources: new Set<AliasDiscoverySource>(),
      sourceRoutes: new Set<string>(),
    }
    bucket.aliases.add(identity.displayUrl)
    bucket.sources.add(entry.source)
    bucket.sourceRoutes.add(sourceRoute)
    aliasBuckets.set(canonicalRoute, bucket)
    if (canonicalRoute !== sourceRoute) {
      aliasDiagnostics.push(diagnosticEntry('ALIAS_CANONICAL_ROUTE_SELECTED', `${sourceRoute}:${canonicalRoute}`))
    }
  }

  if (seedIdentity) addAlias({ url: input.seedUrl, routePath: seedIdentity.routePath, source: 'seed' })
  for (const entry of input.observedUrls) addAlias(entry)

  for (const canonical of input.canonicalDiscovery?.canonicalEntries ?? []) {
    if (canonical.pageUrl) {
      addAlias({
        url: canonical.pageUrl,
        routePath: canonical.pageRoutePath,
        canonicalRoute: canonical.normalizedCanonicalRoutePath ?? canonical.pageRoutePath,
        source: 'canonical',
      })
    }
    if (canonical.canonicalUrl) {
      addAlias({
        url: canonical.canonicalUrl,
        routePath: canonical.normalizedCanonicalRoutePath,
        canonicalRoute: canonical.normalizedCanonicalRoutePath,
        source: 'canonical',
      })
    }
  }

  for (const redirect of input.observedRedirects ?? []) {
    const source = identifyUrl(redirect.originalUrl)
    const final = identifyUrl(redirect.finalUrl)
    if (!source || !final || source.displayUrl === final.displayUrl) continue
    const classification = redirectClassification(source, final)
    const sameSite = source.canonicalHost === final.canonicalHost && (!seedIdentity || final.canonicalHost === seedIdentity.canonicalHost)
    const statusCodes = (redirect.statusCodes ?? [])
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry) && entry > 0)
      .map((entry) => Math.floor(entry))
    const entryDiagnostics = [
      diagnosticEntry('REDIRECT_DISCOVERY_FOUND', `${source.displayUrl}->${final.displayUrl}`),
      diagnosticEntry('REDIRECT_DISCOVERY_CHAIN_RECORDED', `${source.aliasRoute}->${final.aliasRoute}:${Math.max(1, Math.floor(Number(redirect.redirectCount ?? 1)))}`),
      classification === 'cross_origin_redirect' ? diagnosticEntry('REDIRECT_DISCOVERY_CROSS_ORIGIN', `${source.displayUrl}->${final.displayUrl}`) : '',
      classification === 'canonical_host_redirect' ? diagnosticEntry('REDIRECT_DISCOVERY_CANONICAL_HOST', `${source.displayUrl}->${final.displayUrl}`) : '',
    ].filter(Boolean)
    redirectDiagnostics.push(...entryDiagnostics)
    const redirectEntry: RedirectDiscoveryEntry = {
      originalUrl: source.displayUrl,
      finalUrl: final.displayUrl,
      statusCodes,
      redirectCount: Math.max(1, Math.floor(Number(redirect.redirectCount ?? 1))),
      sameSite,
      normalizedSourceRoute: source.aliasRoute,
      normalizedFinalRoute: final.aliasRoute,
      classification,
      diagnostics: sortDiagnostics(entryDiagnostics),
    }
    redirectEntries.push(redirectEntry)
    addAlias({ url: source.displayUrl, routePath: source.aliasRoute, canonicalRoute: final.aliasRoute, source: 'redirect' })
    addAlias({ url: final.displayUrl, routePath: final.aliasRoute, canonicalRoute: final.aliasRoute, source: 'redirect' })
  }

  const routeCollisions: AliasRouteCollision[] = []
  const aliasGroups: AliasDiscoveryGroup[] = [...aliasBuckets.entries()]
    .flatMap(([canonicalRoute, bucket]) => {
      const aliases = uniqueSorted([...bucket.aliases])
      const sources = uniqueSorted([...bucket.sources]) as AliasDiscoverySource[]
      const sourceRoutes = uniqueSorted([...bucket.sourceRoutes])
      const diagnostics = [
        aliases.length > 1 ? diagnosticEntry('ALIAS_GROUP_CREATED', `${canonicalRoute}:${aliases.length}`) : '',
        sourceRoutes.length > 1 || (sourceRoutes[0] && sourceRoutes[0] !== canonicalRoute)
          ? diagnosticEntry('ALIAS_ROUTE_COLLISION', `${canonicalRoute}:${sourceRoutes.join('|')}`)
          : '',
        sourceRoutes.some((route) => route !== canonicalRoute) ? diagnosticEntry('ALIAS_CANONICAL_ROUTE_SELECTED', `${sourceRoutes.join('|')}:${canonicalRoute}`) : '',
      ].filter(Boolean)
      aliasDiagnostics.push(...diagnostics)
      if (diagnostics.some((entry) => entry.startsWith('ALIAS_ROUTE_COLLISION'))) {
        routeCollisions.push({
          canonicalRoute,
          sourceRoutes,
          aliases,
          sources,
          reason: 'multiple_source_routes_for_canonical_route',
        })
      }
      if (aliases.length <= 1 && diagnostics.length === 0) return []
      return [{
        canonicalRoute,
        aliases,
        sources,
        diagnostics: sortDiagnostics(diagnostics),
      }]
    })
    .sort((a, b) => a.canonicalRoute.localeCompare(b.canonicalRoute))

  aliasDiagnostics.push(diagnosticEntry('ALIAS_DISCOVERY_COMPLETED', `${aliasGroups.length}`))

  const sortedRedirects = redirectEntries.sort((a, b) => `${a.originalUrl}|${a.finalUrl}`.localeCompare(`${b.originalUrl}|${b.finalUrl}`))
  const crossOriginRedirects = sortedRedirects.filter((entry) => entry.classification === 'cross_origin_redirect')
  const sortedRouteCollisions = routeCollisions.sort((a, b) => a.canonicalRoute.localeCompare(b.canonicalRoute))

  return {
    redirectDiscovery: {
      redirectEntries: sortedRedirects,
      crossOriginRedirects,
      counts: {
        redirectCount: sortedRedirects.length,
        crossOriginRedirectCount: crossOriginRedirects.length,
        canonicalHostRedirectCount: sortedRedirects.filter((entry) => entry.classification === 'canonical_host_redirect').length,
      },
      diagnostics: sortDiagnostics(redirectDiagnostics),
    },
    aliasDiscovery: {
      aliasGroups,
      routeCollisions: sortedRouteCollisions,
      conflicts: sortedRouteCollisions.slice(),
      counts: {
        aliasGroupCount: aliasGroups.length,
        routeCollisionCount: routeCollisions.length,
      },
      diagnostics: sortDiagnostics(aliasDiagnostics),
    },
  }
}
