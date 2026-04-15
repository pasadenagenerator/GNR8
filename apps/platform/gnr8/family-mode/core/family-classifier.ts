import { normalizeRoutePath, pathToRouteSegments } from '@/gnr8/site-tree'
import type { FamilyModePageSectionSignal, TemplateFamilyType } from '@/gnr8/family-mode/types/template-family-types'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

const MARKETING_ROUTES = new Set(['', 'about', 'company', 'team', 'contact', 'home'])
const LISTING_ROOTS = new Set(['blog', 'news', 'articles', 'products', 'services', 'portfolio', 'projects', 'work'])
const UTILITY_ROUTES = new Set(['login', 'privacy', 'terms', 'legal', 'cookies', 'account', 'checkout', 'cart'])

export function inferRouteGroup(pathnameRaw: string, familyType: TemplateFamilyType): string {
  const normalizedPath = normalizeRoutePath(pathnameRaw || '/')
  const segments = pathToRouteSegments(normalizedPath)
  const first = normalizeText(segments[0])

  if (familyType === 'marketing') return 'root'
  if (familyType === 'listing' || familyType === 'detail') return first || 'misc'
  if (familyType === 'utility') return first || 'utility'
  return 'misc'
}

export function classifyFamilyTypeFromPath(pathnameRaw: string): TemplateFamilyType {
  const normalizedPath = normalizeRoutePath(pathnameRaw || '/')
  const segments = pathToRouteSegments(normalizedPath)
  const first = normalizeText(segments[0])
  const last = normalizeText(segments[segments.length - 1])

  if (normalizedPath === '/' || MARKETING_ROUTES.has(first)) return 'marketing'
  if (UTILITY_ROUTES.has(first) || UTILITY_ROUTES.has(last)) return 'utility'
  if (LISTING_ROOTS.has(last) && segments.length <= 2) return 'listing'
  if (segments.length >= 2 && LISTING_ROOTS.has(first)) return 'detail'
  return 'unknown'
}

export function classifyFamilyTypeFromSections(sections: FamilyModePageSectionSignal[]): TemplateFamilyType {
  if (!sections.length) return 'unknown'

  const kinds = new Set(sections.map((section) => normalizeText(section.kind)))
  const hasGrid =
    kinds.has('grid') ||
    sections.some((section) => normalizeText(section.layoutKind) === 'grid' || normalizeText(section.layoutKind) === 'columns' || Boolean(section.hasCardCluster))
  const hasHero = kinds.has('hero')
  const hasCta = kinds.has('cta')
  const hasText = kinds.has('text_block')
  const hasImage = kinds.has('image') || kinds.has('gallery')

  if (hasHero && (hasText || hasCta)) return 'marketing'
  if (hasGrid) return 'listing'
  if (hasImage && hasText) return 'detail'
  return 'unknown'
}

export function classifyPageFamilyType(input: {
  normalizedPath: string
  sections: FamilyModePageSectionSignal[]
}): { familyType: TemplateFamilyType; reason: string; ambiguous: boolean } {
  const byPath = classifyFamilyTypeFromPath(input.normalizedPath)
  const bySections = classifyFamilyTypeFromSections(input.sections)

  if (byPath !== 'unknown' && (bySections === 'unknown' || bySections === byPath)) {
    return {
      familyType: byPath,
      reason: `path:${byPath}`,
      ambiguous: false,
    }
  }
  if (byPath === 'unknown' && bySections !== 'unknown') {
    return {
      familyType: bySections,
      reason: `sections:${bySections}`,
      ambiguous: false,
    }
  }
  if (byPath !== 'unknown') {
    return {
      familyType: byPath,
      reason: `path:${byPath}|sections:${bySections}`,
      ambiguous: true,
    }
  }
  return {
    familyType: 'unknown',
    reason: 'fallback:unknown',
    ambiguous: false,
  }
}

