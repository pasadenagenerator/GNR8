import { diagnosticEntry, sortDiagnostics } from '../diagnostics/multipage-diagnostics'
import { normalizeMultipageHost, normalizeSeedUrl } from '../normalization/route-normalization'
import type {
  RobotsDiscoveryEvidence,
  RobotsDiscoveryRule,
  RobotsFetchResult,
  RobotsRouteGovernanceEntry,
  RobotsRouteGovernanceStatus,
} from '../types/contracts'

type RobotsFetch = (url: string) => Promise<RobotsFetchResult | null>

type ParsedRobotsRule = RobotsDiscoveryRule & {
  directive: 'allow' | 'disallow'
}

type RobotsGroup = {
  userAgents: string[]
  rules: ParsedRobotsRule[]
}

type ParsedRobots = {
  sitemapDeclarations: string[]
  groups: RobotsGroup[]
  allowRules: RobotsDiscoveryRule[]
  disallowRules: RobotsDiscoveryRule[]
}

function emptyGovernanceSummary(): RobotsDiscoveryEvidence['routeGovernanceSummary'] {
  return { allowed: 0, disallowed: 0, unknown: 0 }
}

function emptyRobotsEvidence(input: {
  robotsUrl: string | null
  fetchedState: RobotsDiscoveryEvidence['fetchedState']
  diagnostics: string[]
}): RobotsDiscoveryEvidence {
  return {
    robotsUrl: input.robotsUrl,
    fetchedState: input.fetchedState,
    sitemapDeclarations: [],
    allowRules: [],
    disallowRules: [],
    routeGovernance: [],
    routeGovernanceSummary: emptyGovernanceSummary(),
    diagnostics: sortDiagnostics(input.diagnostics),
  }
}

function stripComment(value: string): string {
  const index = value.indexOf('#')
  return (index >= 0 ? value.slice(0, index) : value).trim()
}

function normalizedUserAgent(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeRulePath(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function normalizeSitemapDeclaration(input: {
  value: string
  robotsUrl: string
  canonicalHost: string
}): string | null {
  try {
    const parsed = new URL(input.value.trim(), input.robotsUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    const host = normalizeMultipageHost(parsed.hostname)
    if (host !== input.canonicalHost) return null
    parsed.hostname = host
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString()
  } catch {
    return null
  }
}

function parseRobotsTxt(body: string, input: { robotsUrl: string; canonicalHost: string }): ParsedRobots | null {
  const groups: RobotsGroup[] = []
  const sitemapDeclarations = new Set<string>()
  let current: RobotsGroup | null = null
  let currentHasRules = false
  let recognizedDirectiveCount = 0

  const ensureGroup = (): RobotsGroup => {
    if (!current) {
      current = { userAgents: ['*'], rules: [] }
      currentHasRules = false
      groups.push(current)
    }
    return current
  }

  for (const rawLine of body.split(/\r?\n/)) {
    const line = stripComment(rawLine)
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (!key) continue

    if (key === 'sitemap') {
      recognizedDirectiveCount += 1
      const normalized = normalizeSitemapDeclaration({
        value,
        robotsUrl: input.robotsUrl,
        canonicalHost: input.canonicalHost,
      })
      if (normalized) sitemapDeclarations.add(normalized)
      continue
    }

    if (key === 'user-agent') {
      recognizedDirectiveCount += 1
      if (!current || currentHasRules) {
        current = { userAgents: [], rules: [] }
        currentHasRules = false
        groups.push(current)
      }
      const agent = normalizedUserAgent(value)
      if (agent && !current.userAgents.includes(agent)) current.userAgents.push(agent)
      continue
    }

    if (key !== 'allow' && key !== 'disallow') continue
    recognizedDirectiveCount += 1
    const group = ensureGroup()
    const rule: ParsedRobotsRule = {
      userAgent: group.userAgents[0] ?? '*',
      directive: key,
      path: normalizeRulePath(value),
    }
    group.rules.push(rule)
    currentHasRules = true
  }

  if (body.trim() && recognizedDirectiveCount === 0) return null

  const allowRules: RobotsDiscoveryRule[] = []
  const disallowRules: RobotsDiscoveryRule[] = []
  for (const group of groups) {
    for (const rule of group.rules) {
      for (const userAgent of group.userAgents.length > 0 ? group.userAgents : ['*']) {
        const publicRule = { userAgent, path: rule.path }
        if (rule.directive === 'allow') allowRules.push(publicRule)
        else disallowRules.push(publicRule)
      }
    }
  }

  return {
    sitemapDeclarations: [...sitemapDeclarations].sort((a, b) => a.localeCompare(b)),
    groups,
    allowRules: allowRules.sort((a, b) => `${a.userAgent}|${a.path}`.localeCompare(`${b.userAgent}|${b.path}`)),
    disallowRules: disallowRules.sort((a, b) => `${a.userAgent}|${a.path}`.localeCompare(`${b.userAgent}|${b.path}`)),
  }
}

export async function discoverRobotsTxt(input: {
  seedUrl: string
  canonicalHost: string
  fetchRobots?: RobotsFetch
}): Promise<RobotsDiscoveryEvidence> {
  const diagnostics: string[] = [diagnosticEntry('ROBOTS_DISCOVERY_STARTED', input.seedUrl)]
  const normalizedSeed = normalizeSeedUrl(input.seedUrl)
  const robotsUrl = normalizedSeed ? new URL('/robots.txt', normalizedSeed.url).toString() : null

  if (!normalizedSeed || !robotsUrl) {
    diagnostics.push(diagnosticEntry('ROBOTS_DISCOVERY_FAILED', 'invalid_seed'))
    return emptyRobotsEvidence({ robotsUrl: null, fetchedState: 'invalid_seed', diagnostics })
  }

  if (!input.fetchRobots) {
    diagnostics.push(diagnosticEntry('ROBOTS_DISCOVERY_NOT_FOUND', 'fetch_unavailable'))
    return emptyRobotsEvidence({ robotsUrl, fetchedState: 'unavailable', diagnostics })
  }

  let response: RobotsFetchResult | null = null
  try {
    response = await input.fetchRobots(robotsUrl)
  } catch {
    diagnostics.push(diagnosticEntry('ROBOTS_DISCOVERY_FAILED', robotsUrl))
    return emptyRobotsEvidence({ robotsUrl, fetchedState: 'failed', diagnostics })
  }

  if (!response || !response.body.trim()) {
    diagnostics.push(diagnosticEntry('ROBOTS_DISCOVERY_NOT_FOUND', robotsUrl))
    return emptyRobotsEvidence({ robotsUrl, fetchedState: 'not_found', diagnostics })
  }

  const parsed = parseRobotsTxt(response.body, {
    robotsUrl: response.url || robotsUrl,
    canonicalHost: input.canonicalHost,
  })
  if (!parsed) {
    diagnostics.push(diagnosticEntry('ROBOTS_DISCOVERY_FAILED', `${robotsUrl}:parse_failed`))
    return emptyRobotsEvidence({ robotsUrl, fetchedState: 'parse_failed', diagnostics })
  }

  for (const sitemapUrl of parsed.sitemapDeclarations) {
    diagnostics.push(diagnosticEntry('ROBOTS_SITEMAP_DECLARATION_FOUND', sitemapUrl))
  }
  diagnostics.push(diagnosticEntry('ROBOTS_DISCOVERY_SUCCEEDED', `${parsed.allowRules.length}:${parsed.disallowRules.length}:${parsed.sitemapDeclarations.length}`))

  return {
    robotsUrl,
    fetchedState: 'fetched',
    sitemapDeclarations: parsed.sitemapDeclarations,
    allowRules: parsed.allowRules,
    disallowRules: parsed.disallowRules,
    routeGovernance: [],
    routeGovernanceSummary: emptyGovernanceSummary(),
    diagnostics: sortDiagnostics(diagnostics),
  }
}

function pathMatchesRule(routePath: string, rulePath: string): boolean {
  if (!rulePath) return false
  return routePath === rulePath || routePath.startsWith(rulePath.endsWith('/') ? rulePath : `${rulePath}/`) || routePath.startsWith(rulePath)
}

function classifyRoute(input: {
  routePath: string
  robots: RobotsDiscoveryEvidence
}): Pick<RobotsRouteGovernanceEntry, 'status' | 'matchedRule'> {
  if (input.robots.fetchedState !== 'fetched') return { status: 'unknown', matchedRule: null }

  const rules: Array<ParsedRobotsRule> = [
    ...input.robots.allowRules.map((rule) => ({ ...rule, directive: 'allow' as const })),
    ...input.robots.disallowRules.map((rule) => ({ ...rule, directive: 'disallow' as const })),
  ].filter((rule) => normalizedUserAgent(rule.userAgent) === '*')

  if (rules.length === 0) return { status: 'allowed', matchedRule: null }

  const matchingRules = rules
    .filter((rule) => pathMatchesRule(input.routePath, rule.path))
    .sort((left, right) => {
      const lengthDelta = right.path.length - left.path.length
      if (lengthDelta !== 0) return lengthDelta
      if (left.directive === right.directive) return `${left.userAgent}|${left.path}`.localeCompare(`${right.userAgent}|${right.path}`)
      return left.directive === 'allow' ? -1 : 1
    })

  const matched = matchingRules[0] ?? null
  if (!matched) return { status: 'allowed', matchedRule: null }
  return {
    status: matched.directive === 'disallow' ? 'disallowed' : 'allowed',
    matchedRule: {
      directive: matched.directive,
      userAgent: matched.userAgent,
      path: matched.path,
    },
  }
}

export function applyRobotsRouteGovernance(
  robots: RobotsDiscoveryEvidence,
  routes: Array<{ routePath: string; normalizedUrl?: string | null }>,
): RobotsDiscoveryEvidence {
  const diagnostics = robots.diagnostics.slice()
  const routeGovernance: RobotsRouteGovernanceEntry[] = routes
    .map((route) => {
      const routePath = route.routePath || '/'
      const classification = classifyRoute({ routePath, robots })
      const diagnosticCode =
        classification.status === 'allowed'
          ? 'ROBOTS_ROUTE_ALLOWED'
          : classification.status === 'disallowed'
            ? 'ROBOTS_ROUTE_DISALLOWED'
            : 'ROBOTS_ROUTE_UNKNOWN'
      diagnostics.push(diagnosticEntry(diagnosticCode, routePath))
      return {
        routePath,
        normalizedUrl: route.normalizedUrl ?? null,
        status: classification.status,
        matchedRule: classification.matchedRule,
      }
    })
    .sort((a, b) => a.routePath.localeCompare(b.routePath))

  const routeGovernanceSummary: RobotsDiscoveryEvidence['routeGovernanceSummary'] = {
    allowed: routeGovernance.filter((entry) => entry.status === 'allowed').length,
    disallowed: routeGovernance.filter((entry) => entry.status === 'disallowed').length,
    unknown: routeGovernance.filter((entry) => entry.status === 'unknown').length,
  }
  diagnostics.push(
    diagnosticEntry(
      'ROBOTS_RULES_APPLIED',
      `allowed:${routeGovernanceSummary.allowed}:disallowed:${routeGovernanceSummary.disallowed}:unknown:${routeGovernanceSummary.unknown}`,
    ),
  )

  return {
    ...robots,
    routeGovernance,
    routeGovernanceSummary,
    diagnostics: sortDiagnostics(diagnostics),
  }
}
