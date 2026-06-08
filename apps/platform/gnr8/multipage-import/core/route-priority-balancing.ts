import { diagnosticEntry, sortDiagnostics } from '../diagnostics/multipage-diagnostics'
import type {
  RoutePriorityAssignment,
  RoutePriorityBalancingEvidence,
  RoutePrioritySource,
  RoutePriorityTier,
} from '../types/contracts'

export type RoutePriorityCandidate<T> = {
  routePath: string
  depth: number
  source: RoutePrioritySource
  sourceContext?: 'nav' | 'header' | 'footer' | 'body' | 'unknown' | null
  value: T
}

const TIER_ORDER: RoutePriorityTier[] = [
  'tier_1_navigation',
  'tier_2_canonical',
  'tier_3_shallow',
  'tier_4_deep',
]

const CONTENT_TREE_PREFIXES = new Set([
  'article',
  'articles',
  'archive',
  'archives',
  'blog',
  'blogs',
  'docs',
  'documentation',
  'government',
  'guides',
  'learn',
  'news',
  'post',
  'posts',
  'press',
  'publication',
  'publications',
  'reference',
  'resources',
  'topics',
])

function normalizeRoutePath(value: string): string {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '/') return '/'
  const pathOnly = raw.split('?')[0]?.split('#')[0] ?? raw
  return `/${pathOnly.replace(/^\/+/, '').replace(/\/+$/, '')}` || '/'
}

function routeDepth(routePath: string): number {
  const normalized = normalizeRoutePath(routePath)
  if (normalized === '/') return 0
  return normalized.split('/').filter(Boolean).length
}

function isDeepContentRoute(routePath: string): boolean {
  const segments = normalizeRoutePath(routePath).split('/').filter(Boolean).map((segment) => segment.toLowerCase())
  if (segments.length >= 3) return true
  if (segments.length >= 2 && CONTENT_TREE_PREFIXES.has(segments[0] ?? '')) return true
  return false
}

function tierForCandidate(candidate: RoutePriorityCandidate<unknown>): { tier: RoutePriorityTier; reason: string } {
  const sourceContext = candidate.sourceContext ?? 'unknown'
  const depth = routeDepth(candidate.routePath)
  if (candidate.source === 'seed') return { tier: 'tier_1_navigation', reason: 'seed_route' }
  if (sourceContext === 'header' || sourceContext === 'footer' || sourceContext === 'nav') {
    return { tier: 'tier_1_navigation', reason: `${sourceContext}_navigation` }
  }
  if (sourceContext === 'body' && depth <= 1 && !isDeepContentRoute(candidate.routePath)) {
    return { tier: 'tier_1_navigation', reason: 'top_level_body_navigation' }
  }
  if (candidate.source === 'canonical' || candidate.source === 'alias_canonical') {
    return { tier: 'tier_2_canonical', reason: candidate.source }
  }
  if ((candidate.source === 'sitemap' || candidate.source === 'robots_sitemap') && depth <= 2 && !isDeepContentRoute(candidate.routePath)) {
    return { tier: 'tier_3_shallow', reason: 'shallow_sitemap_route' }
  }
  return { tier: 'tier_4_deep', reason: isDeepContentRoute(candidate.routePath) ? 'deep_content_tree' : 'deep_or_late_discovery' }
}

function compareAssigned<T>(
  left: RoutePriorityCandidate<T> & { tier: RoutePriorityTier; reason: string },
  right: RoutePriorityCandidate<T> & { tier: RoutePriorityTier; reason: string },
): number {
  const tierDelta = TIER_ORDER.indexOf(left.tier) - TIER_ORDER.indexOf(right.tier)
  if (tierDelta !== 0) return tierDelta
  const depthDelta = routeDepth(left.routePath) - routeDepth(right.routePath)
  if (depthDelta !== 0) return depthDelta
  return normalizeRoutePath(left.routePath).localeCompare(normalizeRoutePath(right.routePath))
}

export function balanceRoutePriorityCandidates<T>(input: {
  candidates: Array<RoutePriorityCandidate<T>>
  maxRoutes: number
}): {
  selected: Array<RoutePriorityCandidate<T>>
  excluded: Array<RoutePriorityCandidate<T>>
  evidence: RoutePriorityBalancingEvidence
} {
  const maxRoutes = Math.max(1, Math.floor(input.maxRoutes))
  const diagnostics: string[] = [diagnosticEntry('DISCOVERY_PRIORITY_BALANCING_STARTED', `${input.candidates.length}:${maxRoutes}`)]
  const byRoute = new Map<string, RoutePriorityCandidate<T> & { tier: RoutePriorityTier; reason: string }>()

  for (const candidate of input.candidates) {
    const routePath = normalizeRoutePath(candidate.routePath)
    const assigned = tierForCandidate({ ...candidate, routePath })
    const next = { ...candidate, routePath, depth: Math.max(0, Math.floor(candidate.depth)), ...assigned }
    diagnostics.push(diagnosticEntry('DISCOVERY_PRIORITY_TIER_ASSIGNED', `${routePath}:${assigned.tier}:${assigned.reason}`))
    const existing = byRoute.get(routePath)
    if (!existing || compareAssigned(next, existing) < 0) byRoute.set(routePath, next)
  }

  const ranked = [...byRoute.values()].sort(compareAssigned)
  const selected = ranked.slice(0, maxRoutes)
  const excluded = ranked.slice(maxRoutes)
  const selectedSet = new Set(selected.map((candidate) => candidate.routePath))

  for (const candidate of excluded) {
    diagnostics.push(diagnosticEntry('DISCOVERY_PRIORITY_ROUTE_EXCLUDED', `${candidate.routePath}:${candidate.tier}:route_limit`))
  }
  diagnostics.push(diagnosticEntry('DISCOVERY_PRIORITY_BUDGET_APPLIED', `${selected.length}:${excluded.length}:${maxRoutes}`))
  diagnostics.push(diagnosticEntry('DISCOVERY_PRIORITY_BALANCING_COMPLETED', `${selected.length}`))

  const assignments: RoutePriorityAssignment[] = ranked.map((candidate) => ({
    routePath: candidate.routePath,
    tier: candidate.tier,
    source: candidate.source,
    reason: candidate.reason,
    selected: selectedSet.has(candidate.routePath),
    excludedReason: selectedSet.has(candidate.routePath) ? null : 'route_limit',
  }))

  const tiers = TIER_ORDER.map((tier) => {
    const tierAssignments = assignments.filter((assignment) => assignment.tier === tier)
    return {
      tier,
      candidateCount: tierAssignments.length,
      selectedCount: tierAssignments.filter((assignment) => assignment.selected).length,
      excludedCount: tierAssignments.filter((assignment) => !assignment.selected).length,
    }
  })

  return {
    selected,
    excluded,
    evidence: {
      maxRoutes,
      routeLimitHit: excluded.length > 0,
      selectedRouteCount: selected.length,
      excludedRouteCount: excluded.length,
      tiers,
      assignments,
      diagnostics: sortDiagnostics(diagnostics),
    },
  }
}
