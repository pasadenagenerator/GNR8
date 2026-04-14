import type { MultipagePageRole, NavigationVisibility } from '../types/contracts'

type RouteSignals = {
  path: string
  title: string | null
  depth: number
  headerSeen: boolean
  footerSeen: boolean
  utilitySeen: boolean
  bodySeen: boolean
  siblingCountByPrefix: number
}

const LEGAL_PATH_RE = /(privacy|terms|cookie|gdpr|legal|accessibility|imprint|disclaimer)/i
const CONTACT_PATH_RE = /(contact|support|get-in-touch|book|schedule|demo)/i
const UTILITY_PATH_RE = /(login|sign-in|signin|sign-up|signup|account|cart|checkout|search|sitemap|unsubscribe|404|thank-you)/i
const BLOG_PATH_RE = /(^\/blog$|^\/blog\/)/i
const ARTICLE_HINT_RE = /(\/\d{4}\/\d{1,2}\/|\/post\/|\/posts\/|\/article\/|\/articles\/|\/news\/)/i
const LISTING_HINT_RE = /(\/category\/|\/categories\/|\/tag\/|\/tags\/|\/archive\/|\/products?\/|\/services?\/|\/portfolio\/)/i

export function classifyPageRole(signal: RouteSignals): MultipagePageRole {
  const path = signal.path
  const title = String(signal.title ?? '').trim().toLowerCase()

  if (path === '/') return 'homepage'
  if (LEGAL_PATH_RE.test(path) || LEGAL_PATH_RE.test(title)) return 'legal'
  if (CONTACT_PATH_RE.test(path) || CONTACT_PATH_RE.test(title)) return 'contact'
  if (UTILITY_PATH_RE.test(path) || UTILITY_PATH_RE.test(title)) return 'utility'

  if (path === '/blog') return 'blog'
  if (path.startsWith('/blog/')) return 'article'
  if (BLOG_PATH_RE.test(path) && signal.depth >= 2) return 'article'
  if (ARTICLE_HINT_RE.test(path) && signal.depth >= 2) return 'article'

  if (/^\/category\/[^/]+\/.+/.test(path)) return 'detail'
  if (/^\/category\/[^/]+$/.test(path)) return 'listing'
  if (LISTING_HINT_RE.test(path)) return 'listing'
  if (signal.siblingCountByPrefix >= 3 && signal.depth >= 2) return 'detail'
  if (signal.depth <= 2) return 'standard'

  return 'unknown'
}

export function classifyNavigationVisibility(signal: RouteSignals): NavigationVisibility {
  if (signal.headerSeen) return 'header'
  if (signal.footerSeen) return 'footer'
  if (signal.utilitySeen) return 'utility'
  if (signal.bodySeen) return 'discovered_only'
  return 'unknown'
}
