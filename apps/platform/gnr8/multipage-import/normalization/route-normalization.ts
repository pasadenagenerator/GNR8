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

function normalizeHost(hostname: string): string {
  const raw = String(hostname ?? '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.startsWith('www.')) return raw.slice(4)
  return raw
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
    const canonicalHost = normalizeHost(parsed.hostname)
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

  const host = normalizeHost(resolved.hostname)
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
