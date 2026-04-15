const ASSET_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
  '.tar',
  '.css',
  '.js',
  '.mjs',
  '.cjs',
  '.map',
  '.xml',
  '.txt',
  '.mp4',
  '.webm',
  '.mp3',
  '.wav',
  '.json',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
])

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizePathname(pathnameRaw: string): string {
  const withLeading = pathnameRaw.startsWith('/') ? pathnameRaw : `/${pathnameRaw}`
  let normalized = withLeading.replace(/\/{2,}/g, '/')
  normalized = normalized.replace(/\/index\.html?$/i, '/')
  if (normalized !== '/') normalized = normalized.replace(/\/+$/, '')
  if (!normalized) return '/'
  return normalized
}

function isAssetPath(pathname: string): boolean {
  const lower = pathname.toLowerCase()
  for (const extension of ASSET_EXTENSIONS) {
    if (lower.endsWith(extension)) return true
  }
  return false
}

export type NormalizedHrefResult =
  | {
      kind: 'internal'
      normalizedPath: string
      canonicalUrl: string
    }
  | {
      kind: 'external'
      canonicalUrl: string
    }
  | {
      kind: 'ignored'
      reason: string
    }

export function normalizeHrefForSiteTree(input: {
  href: string
  baseUrl: string
}): NormalizedHrefResult {
  const hrefRaw = normalizeText(input.href)
  if (!hrefRaw) return { kind: 'ignored', reason: 'empty_href' }
  if (hrefRaw.startsWith('#')) return { kind: 'ignored', reason: 'hash_only' }

  const lower = hrefRaw.toLowerCase()
  if (lower.startsWith('mailto:')) return { kind: 'ignored', reason: 'mailto' }
  if (lower.startsWith('tel:')) return { kind: 'ignored', reason: 'tel' }
  if (lower.startsWith('javascript:')) return { kind: 'ignored', reason: 'javascript' }

  let base: URL
  let resolved: URL
  try {
    base = new URL(input.baseUrl)
    resolved = new URL(hrefRaw, base)
  } catch {
    return { kind: 'ignored', reason: 'invalid_url' }
  }

  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
    return { kind: 'ignored', reason: 'unsupported_protocol' }
  }

  resolved.hash = ''
  resolved.search = ''
  resolved.pathname = normalizePathname(resolved.pathname || '/')

  if (isAssetPath(resolved.pathname)) {
    return { kind: 'ignored', reason: 'asset_link' }
  }

  const canonicalUrl = resolved.toString()
  if (resolved.origin !== base.origin) {
    return { kind: 'external', canonicalUrl }
  }

  return {
    kind: 'internal',
    normalizedPath: resolved.pathname || '/',
    canonicalUrl,
  }
}

export function pathToRouteSegments(pathname: string): string[] {
  return normalizePathname(pathname)
    .split('/')
    .map((entry) => normalizeText(entry))
    .filter(Boolean)
}

export function normalizeRoutePath(pathnameRaw: string): string {
  return normalizePathname(pathnameRaw || '/')
}

export function deriveDeterministicPageId(normalizedPath: string): string {
  if (normalizedPath === '/') return 'page_home'

  const segments = pathToRouteSegments(normalizedPath)
  const normalized = segments
    .map((segment) =>
      segment
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, ''),
    )
    .filter(Boolean)

  const joined = normalized.join('_')
  if (!joined) return 'page_home'
  if (joined.length <= 72) return `page_${joined}`

  return `page_${joined.slice(0, 56)}_${Buffer.from(joined).toString('hex').slice(0, 12)}`
}
