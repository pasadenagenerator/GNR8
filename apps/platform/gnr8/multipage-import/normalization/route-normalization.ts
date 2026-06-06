import path from 'node:path'

const ASSET_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.pdf',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.tgz',
  '.mp4',
  '.mov',
  '.mp3',
  '.wav',
  '.css',
  '.js',
  '.mjs',
  '.json',
  '.xml',
  '.txt',
  '.csv',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
])

export type NormalizedUrl = {
  canonicalHost: string
  url: string
  path: string
}

export type NormalizationSkipReason =
  | 'invalid_url'
  | 'external_host'
  | 'unsupported_scheme'
  | 'hash_only'
  | 'asset_link'

export function normalizeMultipageHost(hostname: string): string {
  const raw = String(hostname ?? '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.startsWith('www.')) return raw.slice(4)
  return raw
}

function parseHttpUrl(value: string): URL | null {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed
  } catch {
    return null
  }
}

export type MultipageSameSiteUrlEvaluation = {
  accepted: boolean
  exactOrigin: boolean
  canonicalHostEquivalent: boolean
  reason:
    | 'same_origin'
    | 'canonical_host_equivalent'
    | 'invalid_url'
    | 'unsupported_scheme'
    | 'different_scheme'
    | 'different_port'
    | 'different_canonical_host'
    | 'missing_seed_host_evidence'
    | 'missing_redirect_evidence'
  seedHost: string | null
  normalizedHost: string | null
  finalHost: string | null
  routePath: string | null
}

export function evaluateMultipageSameSiteUrl(input: {
  candidateUrl: string
  seedUrl: string
  evidenceUrls?: Array<string | null | undefined>
}): MultipageSameSiteUrlEvaluation {
  const candidate = parseHttpUrl(input.candidateUrl)
  const seed = parseHttpUrl(input.seedUrl)
  if (!candidate || !seed) {
    return {
      accepted: false,
      exactOrigin: false,
      canonicalHostEquivalent: false,
      reason: 'invalid_url',
      seedHost: seed?.hostname.toLowerCase() ?? null,
      normalizedHost: seed ? normalizeMultipageHost(seed.hostname) : null,
      finalHost: candidate?.hostname.toLowerCase() ?? null,
      routePath: candidate ? normalizePath(candidate.pathname) : null,
    }
  }

  const seedHost = seed.hostname.toLowerCase()
  const normalizedHost = normalizeMultipageHost(seed.hostname)
  const finalHost = candidate.hostname.toLowerCase()
  const routePath = normalizePath(candidate.pathname)
  if (candidate.origin === seed.origin) {
    return {
      accepted: true,
      exactOrigin: true,
      canonicalHostEquivalent: false,
      reason: 'same_origin',
      seedHost,
      normalizedHost,
      finalHost,
      routePath,
    }
  }

  if (candidate.protocol !== seed.protocol) {
    return {
      accepted: false,
      exactOrigin: false,
      canonicalHostEquivalent: false,
      reason: 'different_scheme',
      seedHost,
      normalizedHost,
      finalHost,
      routePath,
    }
  }
  if (candidate.port !== seed.port) {
    return {
      accepted: false,
      exactOrigin: false,
      canonicalHostEquivalent: false,
      reason: 'different_port',
      seedHost,
      normalizedHost,
      finalHost,
      routePath,
    }
  }

  const candidateCanonicalHost = normalizeMultipageHost(candidate.hostname)
  if (candidateCanonicalHost !== normalizedHost) {
    return {
      accepted: false,
      exactOrigin: false,
      canonicalHostEquivalent: false,
      reason: 'different_canonical_host',
      seedHost,
      normalizedHost,
      finalHost,
      routePath,
    }
  }

  const seedFamilyHosts = new Set([seedHost, normalizedHost, normalizedHost ? `www.${normalizedHost}` : ''])
  if (!seedFamilyHosts.has(finalHost)) {
    return {
      accepted: false,
      exactOrigin: false,
      canonicalHostEquivalent: false,
      reason: 'missing_seed_host_evidence',
      seedHost,
      normalizedHost,
      finalHost,
      routePath,
    }
  }

  const evidenceHosts = new Set(
    (input.evidenceUrls ?? [])
      .map((value) => (value ? parseHttpUrl(value) : null))
      .filter((value): value is URL => Boolean(value))
      .map((value) => value.hostname.toLowerCase()),
  )
  if (evidenceHosts.size > 0 && !evidenceHosts.has(finalHost) && !evidenceHosts.has(normalizedHost)) {
    return {
      accepted: false,
      exactOrigin: false,
      canonicalHostEquivalent: false,
      reason: 'missing_redirect_evidence',
      seedHost,
      normalizedHost,
      finalHost,
      routePath,
    }
  }

  return {
    accepted: true,
    exactOrigin: false,
    canonicalHostEquivalent: true,
    reason: 'canonical_host_equivalent',
    seedHost,
    normalizedHost,
    finalHost,
    routePath,
  }
}

function normalizePath(rawPath: string): string {
  const clean = String(rawPath || '/').trim() || '/'
  let next = clean.replace(/\/+/g, '/').replace(/\/+/g, '/')
  next = next.replace(/\/+/g, '/')
  if (!next.startsWith('/')) next = `/${next}`

  const lower = next.toLowerCase()
  if (lower === '/index.html' || lower === '/index.htm') return '/'
  if (lower.endsWith('/index.html') || lower.endsWith('/index.htm')) {
    next = next.slice(0, next.lastIndexOf('/index.')) || '/'
  }

  next = path.posix.normalize(next)
  if (!next.startsWith('/')) next = `/${next}`
  if (next !== '/' && next.endsWith('/')) next = next.slice(0, -1)
  return next.toLowerCase()
}

function isAssetPath(p: string): boolean {
  const ext = path.posix.extname(p.toLowerCase())
  if (!ext) return false
  return ASSET_EXTENSIONS.has(ext)
}

function isUnsupportedScheme(rawHref: string): boolean {
  const normalized = rawHref.trim().toLowerCase()
  return (
    normalized.startsWith('mailto:') ||
    normalized.startsWith('tel:') ||
    normalized.startsWith('sms:') ||
    normalized.startsWith('javascript:') ||
    normalized.startsWith('data:')
  )
}

export function normalizeSeedUrl(seedUrl: string): NormalizedUrl | null {
  try {
    const parsed = new URL(seedUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    const canonicalHost = normalizeMultipageHost(parsed.hostname)
    const normalizedPath = normalizePath(parsed.pathname)
    parsed.hostname = canonicalHost
    parsed.hash = ''
    parsed.search = ''
    parsed.pathname = normalizedPath
    return {
      canonicalHost,
      path: normalizedPath,
      url: parsed.toString(),
    }
  } catch {
    return null
  }
}

export function normalizeInternalHref(input: {
  href: string
  currentPageUrl: string
  canonicalHost: string
}): { normalized: NormalizedUrl } | { skip: NormalizationSkipReason } {
  const raw = String(input.href ?? '').trim()
  if (!raw) return { skip: 'invalid_url' }
  if (raw.startsWith('#')) return { skip: 'hash_only' }
  if (isUnsupportedScheme(raw)) return { skip: 'unsupported_scheme' }

  let resolved: URL
  try {
    resolved = new URL(raw, input.currentPageUrl)
  } catch {
    return { skip: 'invalid_url' }
  }

  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
    return { skip: 'unsupported_scheme' }
  }

  const host = normalizeMultipageHost(resolved.hostname)
  if (host !== input.canonicalHost) return { skip: 'external_host' }

  const normalizedPath = normalizePath(resolved.pathname)
  if (isAssetPath(normalizedPath)) return { skip: 'asset_link' }

  resolved.hostname = host
  resolved.hash = ''
  resolved.search = ''
  resolved.pathname = normalizedPath

  return {
    normalized: {
      canonicalHost: host,
      path: normalizedPath,
      url: resolved.toString(),
    },
  }
}

export function parentPath(p: string): string | null {
  const normalized = normalizePath(p)
  if (normalized === '/') return null
  const idx = normalized.lastIndexOf('/')
  if (idx <= 0) return '/'
  return normalized.slice(0, idx)
}
