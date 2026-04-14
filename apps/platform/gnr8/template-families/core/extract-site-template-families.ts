import crypto from 'node:crypto'

import { templateFamilyDiagnosticEntry, sortTemplateFamilyDiagnostics } from '../diagnostics/template-family-diagnostics'
import type {
  RouteTemplateProfile,
  SiteTemplateFamilyExtraction,
  SiteTemplateFamilyExtractionInput,
  TemplateFamily,
  TemplateFamilyAssignment,
  TemplateFamilyConfidence,
  TemplateFamilyExtractionSummary,
  TemplateFamilyKind,
  TemplateFamilyRelationship,
  TemplateFamilySignature,
} from '../types/contracts'

function hash(parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function stableNumber(value: number): number {
  return Number(value.toFixed(4))
}

function firstSegment(path: string): string {
  if (path === '/') return '/'
  const first = path.split('/').filter(Boolean)[0]
  return first ? `/${first}` : '/'
}

function sequenceSimilarity(a: string[], b: string[]): number {
  const maxLength = Math.max(a.length, b.length)
  if (maxLength === 0) return 1
  let matches = 0
  for (let idx = 0; idx < Math.min(a.length, b.length); idx += 1) {
    if (a[idx] === b[idx]) matches += 1
  }
  return stableNumber(matches / maxLength)
}

function setSimilarity(a: string[], b: string[]): number {
  const left = new Set(a)
  const right = new Set(b)
  const union = new Set([...left, ...right])
  if (union.size === 0) return 1
  let intersection = 0
  for (const value of left) {
    if (right.has(value)) intersection += 1
  }
  return stableNumber(intersection / union.size)
}

function isRoleCompatible(a: string, b: string): boolean {
  if (a === b) return true
  const pair = [a, b].sort().join('|')
  return pair === 'article|detail' || pair === 'blog|listing' || pair === 'contact|utility' || pair === 'standard|utility'
}

function classifyHeadingDensityBucket(pattern: string[]): 'none' | 'low' | 'medium' | 'high' {
  const weighted = pattern.reduce((acc, entry) => {
    if (entry.startsWith('h1:')) return acc + Number(entry.split(':')[1] ?? 0) * 2
    if (entry.startsWith('h2:')) return acc + Number(entry.split(':')[1] ?? 0) * 1.2
    if (entry.startsWith('h3:')) return acc + Number(entry.split(':')[1] ?? 0)
    return acc + Number(entry.split(':')[1] ?? 0) * 0.6
  }, 0)
  if (weighted <= 0) return 'none'
  if (weighted < 3) return 'low'
  if (weighted < 8) return 'medium'
  return 'high'
}

function normalizeRoutePattern(paths: string[]): string {
  const normalized = [...new Set(paths)].sort((a, b) => a.localeCompare(b))
  if (normalized.length === 0) return '/'
  if (normalized.length === 1) return normalized[0]

  const segmentSets = normalized.map((path) => path.split('/').filter(Boolean))
  let commonPrefixLength = 0
  const shortestLength = Math.min(...segmentSets.map((segments) => segments.length))

  for (let idx = 0; idx < shortestLength; idx += 1) {
    const head = segmentSets[0]?.[idx]
    if (!head) break
    if (segmentSets.every((segments) => segments[idx] === head)) {
      commonPrefixLength += 1
      continue
    }
    break
  }

  const commonPrefixSegments = segmentSets[0]?.slice(0, commonPrefixLength) ?? []
  const suffixLengths = segmentSets.map((segments) => Math.max(0, segments.length - commonPrefixLength))
  const allSingleSuffix = suffixLengths.every((size) => size === 1)

  if (commonPrefixSegments.length === 0) {
    return allSingleSuffix ? '/:slug' : '/:path'
  }

  const prefix = `/${commonPrefixSegments.join('/')}`
  if (allSingleSuffix) return `${prefix}/:slug`
  if (suffixLengths.every((size) => size === 0)) return prefix
  return `${prefix}/:path`
}

function summarizePageRoleDistribution(roles: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const role of roles) out[role] = (out[role] ?? 0) + 1
  return Object.fromEntries(Object.entries(out).sort((a, b) => a[0].localeCompare(b[0])))
}

function classifyConfidence(score: number, routeCount: number): TemplateFamilyConfidence {
  const normalized = stableNumber(score)
  if (normalized >= 0.84 && routeCount >= 2) return 'high'
  if (normalized >= 0.66) return 'medium'
  return 'low'
}

function classifyFamilyKind(input: {
  routeIds: string[]
  routePaths: string[]
  roles: string[]
  routePattern: string
  confidence: TemplateFamilyConfidence
}): TemplateFamilyKind {
  const distribution = summarizePageRoleDistribution(input.roles)
  const total = input.roles.length
  const count = (role: string): number => distribution[role] ?? 0

  if (count('homepage') >= 1 && total === 1) return 'homepage_family'
  if (count('homepage') >= 1 && count('standard') >= 1) return 'mixed_family'
  if (count('legal') === total && total > 0) return 'legal_family'
  if (count('article') >= Math.max(1, Math.floor(total * 0.6))) return 'article_family'
  if (count('detail') >= Math.max(1, Math.floor(total * 0.6))) return 'detail_family'
  if (count('listing') + count('blog') >= Math.max(1, Math.floor(total * 0.6))) return 'listing_family'
  if (count('utility') + count('contact') >= Math.max(1, Math.floor(total * 0.6))) return 'utility_family'

  const hasIncompatibleMix =
    (count('article') > 0 && count('legal') > 0) ||
    (count('detail') > 0 && count('legal') > 0) ||
    (count('homepage') > 0 && total > 1)

  if (hasIncompatibleMix) return 'mixed_family'
  if (input.routeIds.length === 1 && input.confidence === 'low' && count('unknown') >= 1) return 'unknown_family'

  const hasServiceLikePattern = input.routePattern.includes('/:slug') && input.routePaths.every((path) => firstSegment(path) !== '/blog')
  if (hasServiceLikePattern || count('standard') >= 1) return 'standard_page_family'

  return 'unknown_family'
}

function representativeRouteId(routes: RouteTemplateProfile[]): string | null {
  if (routes.length === 0) return null
  if (routes.some((route) => route.normalizedPath === '/')) {
    return routes.find((route) => route.normalizedPath === '/')?.routeId ?? routes[0]?.routeId ?? null
  }

  const scored = routes.map((route) => {
    const peerScores = routes
      .filter((peer) => peer.routeId !== route.routeId)
      .map((peer) => {
        const section = sequenceSimilarity(route.sectionRoleSequence, peer.sectionRoleSequence)
        const layout = sequenceSimilarity(route.layoutPatternSequence, peer.layoutPatternSequence)
        const heading = sequenceSimilarity(route.headingPatternSequence, peer.headingPatternSequence)
        return stableNumber(section * 0.4 + layout * 0.35 + heading * 0.25)
      })
    const averagePeerScore = peerScores.length === 0 ? 1 : stableNumber(peerScores.reduce((a, b) => a + b, 0) / peerScores.length)
    return {
      routeId: route.routeId,
      path: route.normalizedPath,
      score: averagePeerScore,
      pathLength: route.normalizedPath.length,
    }
  })

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.pathLength !== b.pathLength) return a.pathLength - b.pathLength
    return a.path.localeCompare(b.path)
  })

  return scored[0]?.routeId ?? null
}

function buildProfiles(input: SiteTemplateFamilyExtractionInput): RouteTemplateProfile[] {
  const signalByRouteId = new Map(input.routeSignals.map((signal) => [signal.routeId, signal]))
  const sharedRegionsByRouteId = new Map<string, string[]>()

  for (const region of input.sharedRegions) {
    for (const routeId of region.pageIds) {
      const list = sharedRegionsByRouteId.get(routeId) ?? []
      list.push(region.regionId)
      sharedRegionsByRouteId.set(routeId, list)
    }
  }

  return input.routes
    .map((route) => {
      const signal = signalByRouteId.get(route.routeId)
      const headingPattern = signal?.headingPatternSequence ?? []
      return {
        routeId: route.routeId,
        normalizedPath: route.normalizedPath,
        pageRole: route.pageRole,
        sectionRoleSequence: signal?.sectionRoleSequence ?? [],
        layoutPatternSequence: signal?.layoutPatternSequence ?? [],
        headingPatternSequence: headingPattern,
        headingDensityBucket: signal?.headingDensityBucket ?? classifyHeadingDensityBucket(headingPattern),
        routePrefix: firstSegment(route.normalizedPath),
        sharedRegionIds: [...new Set(sharedRegionsByRouteId.get(route.routeId) ?? [])].sort((a, b) => a.localeCompare(b)),
      } satisfies RouteTemplateProfile
    })
    .sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath))
}

function similarityScore(anchor: RouteTemplateProfile, candidate: RouteTemplateProfile): number {
  const roleScore = anchor.pageRole === candidate.pageRole ? 1 : isRoleCompatible(anchor.pageRole, candidate.pageRole) ? 0.72 : 0
  const sectionScore = sequenceSimilarity(anchor.sectionRoleSequence, candidate.sectionRoleSequence)
  const layoutScore = sequenceSimilarity(anchor.layoutPatternSequence, candidate.layoutPatternSequence)
  const headingScore = sequenceSimilarity(anchor.headingPatternSequence, candidate.headingPatternSequence)
  const sharedRegionScore = setSimilarity(anchor.sharedRegionIds, candidate.sharedRegionIds)
  const prefixScore = anchor.routePrefix === candidate.routePrefix ? 1 : 0.25
  const densityScore = anchor.headingDensityBucket === candidate.headingDensityBucket ? 1 : 0.5

  const score =
    roleScore * 0.25 +
    sectionScore * 0.22 +
    layoutScore * 0.2 +
    headingScore * 0.15 +
    sharedRegionScore * 0.1 +
    prefixScore * 0.05 +
    densityScore * 0.03

  return stableNumber(score)
}

function canJoinCluster(anchor: RouteTemplateProfile, candidate: RouteTemplateProfile, score: number): boolean {
  if (!isRoleCompatible(anchor.pageRole, candidate.pageRole)) return false
  if (anchor.routePrefix !== candidate.routePrefix && score < 0.86) return false
  if (score < 0.7) return false

  const sectionSimilarity = sequenceSimilarity(anchor.sectionRoleSequence, candidate.sectionRoleSequence)
  const layoutSimilarity = sequenceSimilarity(anchor.layoutPatternSequence, candidate.layoutPatternSequence)
  const routeLevelSimilarity = stableNumber(sectionSimilarity * 0.6 + layoutSimilarity * 0.4)
  return routeLevelSimilarity >= 0.55 || score >= 0.82
}

function buildFamilySignature(routes: RouteTemplateProfile[]): TemplateFamilySignature {
  const routePaths = routes.map((route) => route.normalizedPath).sort((a, b) => a.localeCompare(b))
  const sectionRoleSequence = routes[0]?.sectionRoleSequence ?? []
  const layoutPatternSequence = routes[0]?.layoutPatternSequence ?? []
  const headingPatternSequence = routes[0]?.headingPatternSequence ?? []
  const sharedRegionSignature = [...new Set(routes.flatMap((route) => route.sharedRegionIds))].sort((a, b) => a.localeCompare(b))

  return {
    sectionRoleSequence,
    layoutPatternSequence,
    headingPatternSequence,
    routePattern: normalizeRoutePattern(routePaths),
    pageRoleDistribution: summarizePageRoleDistribution(routes.map((route) => route.pageRole)),
    sharedRegionSignature,
  }
}

function familyRootPath(signature: TemplateFamilySignature, routes: RouteTemplateProfile[]): string {
  if (signature.routePattern === '/') return '/'
  if (!signature.routePattern.startsWith('/')) return firstSegment(routes[0]?.normalizedPath ?? '/')
  const normalized = signature.routePattern.replace(/\/:slug$/, '').replace(/\/:path$/, '')
  if (!normalized || normalized === '/') return firstSegment(routes[0]?.normalizedPath ?? '/')
  return firstSegment(normalized)
}

function rootPathFromRoutePattern(routePattern: string): string {
  if (routePattern === '/') return '/'
  const normalized = routePattern.replace(/\/:slug$/, '').replace(/\/:path$/, '')
  return firstSegment(normalized || '/')
}

function toLegacyFamilyKind(kind: TemplateFamilyKind): 'listing_detail' | 'article_family' | 'standard_family' | 'prefix_family' {
  if (kind === 'article_family') return 'article_family'
  if (kind === 'listing_family' || kind === 'detail_family') return 'listing_detail'
  if (kind === 'standard_page_family' || kind === 'homepage_family' || kind === 'legal_family' || kind === 'utility_family') return 'standard_family'
  return 'prefix_family'
}

function confidenceRank(confidence: TemplateFamilyConfidence): number {
  if (confidence === 'high') return 3
  if (confidence === 'medium') return 2
  return 1
}

export function extractSiteTemplateFamilies(input: SiteTemplateFamilyExtractionInput): SiteTemplateFamilyExtraction {
  const diagnostics: string[] = [templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_EXTRACTION_STARTED', `${input.siteId}`)]

  const profiles = buildProfiles(input)
  if (profiles.length === 0) {
    diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_EXTRACTION_DEGRADED', 'no_routes'))
    diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_EXTRACTION_COMPLETED', '0'))
    return {
      siteId: input.siteId,
      sourceTreeId: input.sourceTreeId ?? null,
      familyCount: 0,
      families: [],
      routeAssignments: [],
      relationships: [],
      diagnostics: sortTemplateFamilyDiagnostics(diagnostics),
    }
  }

  const consumed = new Set<string>()
  const families: TemplateFamily[] = []
  const routeAssignments: TemplateFamilyAssignment[] = []

  for (const anchor of profiles) {
    if (consumed.has(anchor.routeId)) continue

    const members: Array<{ profile: RouteTemplateProfile; score: number; evidence: string[] }> = []
    consumed.add(anchor.routeId)
    members.push({ profile: anchor, score: 1, evidence: ['anchor'] })

    for (const candidate of profiles) {
      if (consumed.has(candidate.routeId)) continue
      const score = similarityScore(anchor, candidate)
      if (!canJoinCluster(anchor, candidate, score)) continue

      const evidence: string[] = []
      if (anchor.pageRole === candidate.pageRole) evidence.push(`role:${candidate.pageRole}`)
      if (anchor.routePrefix === candidate.routePrefix) evidence.push(`prefix:${candidate.routePrefix}`)
      if (setSimilarity(anchor.sharedRegionIds, candidate.sharedRegionIds) > 0) evidence.push('shared_region_overlap')
      if (sequenceSimilarity(anchor.sectionRoleSequence, candidate.sectionRoleSequence) >= 0.7) evidence.push('section_sequence_match')
      if (sequenceSimilarity(anchor.layoutPatternSequence, candidate.layoutPatternSequence) >= 0.7) evidence.push('layout_sequence_match')

      consumed.add(candidate.routeId)
      members.push({ profile: candidate, score, evidence: evidence.sort((a, b) => a.localeCompare(b)) })
    }

    const memberProfiles = members.map((entry) => entry.profile).sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath))
    const scoreAverage = stableNumber(members.reduce((acc, entry) => acc + entry.score, 0) / members.length)
    const confidence = classifyConfidence(scoreAverage, memberProfiles.length)
    const signature = buildFamilySignature(memberProfiles)
    const routeIds = memberProfiles.map((route) => route.routeId)
    const routePaths = memberProfiles.map((route) => route.normalizedPath)
    const familyKind = classifyFamilyKind({
      routeIds,
      routePaths,
      roles: memberProfiles.map((route) => route.pageRole),
      routePattern: signature.routePattern,
      confidence,
    })

    const familyId = `tfamily_${hash([
      familyKind,
      signature.routePattern,
      ...routeIds,
      signature.sectionRoleSequence.join('>'),
      signature.layoutPatternSequence.join('>'),
      signature.headingPatternSequence.join('>'),
      ...signature.sharedRegionSignature,
    ])}`

    const sharedRegionIds = signature.sharedRegionSignature
    const representative = representativeRouteId(memberProfiles)

    diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_ROUTE_PATTERN_ABSTRACTED', `${familyId}:${signature.routePattern}`))
    diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_SIGNATURE_COMPUTED', `${familyId}:${memberProfiles.length}`))
    if (sharedRegionIds.length > 0) {
      diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_SHARED_REGION_USED', `${familyId}:${sharedRegionIds.length}`))
    }
    diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_KIND_CLASSIFIED', `${familyId}:${familyKind}`))
    if (confidence === 'low') diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_CONFIDENCE_LOW', familyId))

    if (memberProfiles.length === 1) {
      diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_SINGLETON_CREATED', familyId))
    } else if (familyKind === 'mixed_family') {
      diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_MIXED_CREATED', familyId))
    } else {
      diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_CREATED', familyId))
    }

    const family: TemplateFamily = {
      familyId,
      familyKind,
      routeIds,
      pageCount: routeIds.length,
      signature,
      confidence,
      representativeRouteId: representative,
      sharedRegionIds,
    }
    families.push(family)

    for (const member of members) {
      const assignmentConfidence = classifyConfidence(member.score, memberProfiles.length)
      const assignment: TemplateFamilyAssignment = {
        assignmentId: `tassign_${hash([member.profile.routeId, familyId])}`,
        routeId: member.profile.routeId,
        familyId,
        confidence: assignmentConfidence,
        evidence: [...member.evidence],
      }
      routeAssignments.push(assignment)
      diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_ROUTE_ASSIGNED', `${member.profile.routeId}:${familyId}`))
    }
  }

  for (const route of profiles) {
    if (!routeAssignments.some((assignment) => assignment.routeId === route.routeId)) {
      diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_ROUTE_UNASSIGNED', route.routeId))
    }
  }

  const sortedFamilies = families.sort((a, b) => a.familyId.localeCompare(b.familyId))
  const familyById = new Map(sortedFamilies.map((family) => [family.familyId, family]))

  const relationships: TemplateFamilyRelationship[] = []

  for (let sourceIdx = 0; sourceIdx < sortedFamilies.length; sourceIdx += 1) {
    const source = sortedFamilies[sourceIdx]
    for (let targetIdx = 0; targetIdx < sortedFamilies.length; targetIdx += 1) {
      if (sourceIdx === targetIdx) continue
      const target = sortedFamilies[targetIdx]
      const sourcePrefix = familyRootPath(source.signature, profiles.filter((route) => source.routeIds.includes(route.routeId)))
      const targetPrefix = familyRootPath(target.signature, profiles.filter((route) => target.routeIds.includes(route.routeId)))

      const isListingSource = source.familyKind === 'listing_family' || source.familyKind === 'homepage_family' || source.familyKind === 'standard_page_family'
      const isDetailTarget = target.familyKind === 'detail_family' || target.familyKind === 'article_family'
      if (isListingSource && isDetailTarget && sourcePrefix !== '/' && targetPrefix.startsWith(sourcePrefix)) {
        const confidence: TemplateFamilyConfidence = sourcePrefix === targetPrefix ? 'high' : 'medium'
        relationships.push({
          relationshipId: `trel_${hash(['listing_to_detail', source.familyId, target.familyId])}`,
          kind: 'listing_to_detail',
          sourceFamilyId: source.familyId,
          targetFamilyId: target.familyId,
          confidence,
        })
        diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_RELATIONSHIP_INFERRED', `${source.familyId}->${target.familyId}:listing_to_detail`))
        continue
      }

      if (sourcePrefix !== '/' && targetPrefix.startsWith(sourcePrefix) && sourcePrefix !== targetPrefix) {
        relationships.push({
          relationshipId: `trel_${hash(['parent_to_child', source.familyId, target.familyId])}`,
          kind: 'parent_to_child',
          sourceFamilyId: source.familyId,
          targetFamilyId: target.familyId,
          confidence: 'medium',
        })
        diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_RELATIONSHIP_INFERRED', `${source.familyId}->${target.familyId}:parent_to_child`))
        continue
      }

      if (sourcePrefix === targetPrefix && source.familyId < target.familyId) {
        relationships.push({
          relationshipId: `trel_${hash(['sibling_family', source.familyId, target.familyId])}`,
          kind: 'sibling_family',
          sourceFamilyId: source.familyId,
          targetFamilyId: target.familyId,
          confidence: 'low',
        })
        diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_RELATIONSHIP_INFERRED', `${source.familyId}->${target.familyId}:sibling_family`))
        continue
      }

      if (
        source.signature.sectionRoleSequence.join('|') === target.signature.sectionRoleSequence.join('|') &&
        source.signature.layoutPatternSequence.join('|') === target.signature.layoutPatternSequence.join('|') &&
        source.familyId < target.familyId
      ) {
        relationships.push({
          relationshipId: `trel_${hash(['shared_template_variant', source.familyId, target.familyId])}`,
          kind: 'shared_template_variant',
          sourceFamilyId: source.familyId,
          targetFamilyId: target.familyId,
          confidence: 'medium',
        })
        diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_RELATIONSHIP_INFERRED', `${source.familyId}->${target.familyId}:shared_template_variant`))
      }
    }
  }

  const dedupRelationships = new Map<string, TemplateFamilyRelationship>()
  for (const relation of relationships) {
    const existing = dedupRelationships.get(relation.relationshipId)
    if (!existing || confidenceRank(relation.confidence) > confidenceRank(existing.confidence)) {
      dedupRelationships.set(relation.relationshipId, relation)
    }
  }

  const sortedAssignments = routeAssignments.sort((a, b) => {
    if (a.routeId !== b.routeId) return a.routeId.localeCompare(b.routeId)
    return a.familyId.localeCompare(b.familyId)
  })

  const sortedRelationships = [...dedupRelationships.values()].sort((a, b) => a.relationshipId.localeCompare(b.relationshipId))

  diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_EXTRACTION_COMPLETED', `${sortedFamilies.length}`))

  for (const family of sortedFamilies) {
    if (!familyById.has(family.familyId)) {
      diagnostics.push(templateFamilyDiagnosticEntry('TEMPLATE_FAMILY_EXTRACTION_DEGRADED', family.familyId))
    }
  }

  return {
    siteId: input.siteId,
    sourceTreeId: input.sourceTreeId ?? null,
    familyCount: sortedFamilies.length,
    families: sortedFamilies,
    routeAssignments: sortedAssignments,
    relationships: sortedRelationships,
    diagnostics: sortTemplateFamilyDiagnostics(diagnostics),
  }
}

export function summarizeTemplateFamilyExtraction(extraction: SiteTemplateFamilyExtraction | null | undefined): TemplateFamilyExtractionSummary {
  if (!extraction) {
    return {
      enabled: false,
      familyCount: 0,
      assignedRouteCount: 0,
      singletonFamilyCount: 0,
      mixedFamilyCount: 0,
      listingDetailRelationshipCount: 0,
      highConfidenceFamilyCount: 0,
      diagnostics: [],
    }
  }

  return {
    enabled: true,
    familyCount: extraction.families.length,
    assignedRouteCount: extraction.routeAssignments.length,
    singletonFamilyCount: extraction.families.filter((family) => family.pageCount === 1).length,
    mixedFamilyCount: extraction.families.filter((family) => family.familyKind === 'mixed_family').length,
    listingDetailRelationshipCount: extraction.relationships.filter((relation) => relation.kind === 'listing_to_detail').length,
    highConfidenceFamilyCount: extraction.families.filter((family) => family.confidence === 'high').length,
    diagnostics: extraction.diagnostics.slice().sort((a, b) => a.localeCompare(b)),
  }
}

export function toLegacyRouteFamilies(extraction: SiteTemplateFamilyExtraction): Array<{
  familyId: string
  kind: 'listing_detail' | 'article_family' | 'standard_family' | 'prefix_family'
  rootPath: string
  memberRouteIds: string[]
  signature: string
}> {
  return extraction.families
    .map((family) => ({
      familyId: family.familyId,
      kind: toLegacyFamilyKind(family.familyKind),
      rootPath: rootPathFromRoutePattern(family.signature.routePattern),
      memberRouteIds: family.routeIds.slice(),
      signature: `${family.familyKind}:${family.signature.routePattern}:${family.routeIds.length}`,
    }))
    .sort((a, b) => a.familyId.localeCompare(b.familyId))
}

export function toLegacyPageRelationships(extraction: SiteTemplateFamilyExtraction): Array<{
  relationshipId: string
  kind: 'listing_to_detail' | 'family_member'
  sourceRouteId: string
  targetRouteId: string
  confidence: 'low' | 'medium' | 'high'
}> {
  const representativeByFamilyId = new Map(
    extraction.families.map((family) => [family.familyId, family.representativeRouteId ?? family.routeIds[0] ?? null]),
  )

  const listingToDetail = extraction.relationships
    .filter((relationship) => relationship.kind === 'listing_to_detail')
    .map((relationship) => {
      const sourceRouteId = representativeByFamilyId.get(relationship.sourceFamilyId)
      const targetRouteId = representativeByFamilyId.get(relationship.targetFamilyId)
      if (!sourceRouteId || !targetRouteId) return null
      return {
        relationshipId: `rel_${hash(['listing_to_detail', sourceRouteId, targetRouteId])}`,
        kind: 'listing_to_detail' as const,
        sourceRouteId,
        targetRouteId,
        confidence: relationship.confidence,
      }
    })
    .filter(Boolean) as Array<{
    relationshipId: string
    kind: 'listing_to_detail'
    sourceRouteId: string
    targetRouteId: string
    confidence: 'low' | 'medium' | 'high'
  }>

  const familyMembers = extraction.families.flatMap((family) =>
    family.routeIds.map((routeId) => ({
      relationshipId: `rel_${hash(['family_member', family.familyId, routeId])}`,
      kind: 'family_member' as const,
      sourceRouteId: family.familyId,
      targetRouteId: routeId,
      confidence: family.confidence,
    })),
  )

  return [...listingToDetail, ...familyMembers].sort((a, b) => a.relationshipId.localeCompare(b.relationshipId))
}
