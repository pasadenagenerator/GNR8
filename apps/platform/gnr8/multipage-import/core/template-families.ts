import crypto from 'node:crypto'

import type { PageRelationship, RouteFamily, RouteNode } from '../types/contracts'

function hash(parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function firstSegment(path: string): string {
  if (path === '/') return '/'
  const seg = path.split('/').filter(Boolean)[0]
  return seg ? `/${seg}` : '/'
}

export function inferRouteFamilies(routes: RouteNode[]): { routeFamilies: RouteFamily[]; pageRelationships: PageRelationship[] } {
  const byPrefix = new Map<string, RouteNode[]>()
  for (const route of routes) {
    const prefix = firstSegment(route.normalizedPath)
    const list = byPrefix.get(prefix) ?? []
    list.push(route)
    byPrefix.set(prefix, list)
  }

  const families: RouteFamily[] = []
  const relationships: PageRelationship[] = []

  for (const [prefix, members] of [...byPrefix.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (members.length < 2) continue

    const sortedMembers = members.slice().sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath))
    const hasBlog = sortedMembers.some((entry) => entry.pageRole === 'blog')
    const hasArticle = sortedMembers.some((entry) => entry.pageRole === 'article')
    const hasListing = sortedMembers.some((entry) => entry.pageRole === 'listing')
    const hasDetail = sortedMembers.some((entry) => entry.pageRole === 'detail')

    const kind: RouteFamily['kind'] = hasBlog && hasArticle ? 'article_family' : hasListing && hasDetail ? 'listing_detail' : 'prefix_family'

    const familyId = `family_${hash([kind, prefix, ...sortedMembers.map((entry) => entry.routeId)])}`
    families.push({
      familyId,
      kind,
      rootPath: prefix,
      memberRouteIds: sortedMembers.map((entry) => entry.routeId),
      signature: `${kind}:${prefix}:${sortedMembers.length}`,
    })

    const listingCandidate = sortedMembers.find((entry) => entry.pageRole === 'listing' || entry.pageRole === 'blog')
    const detailCandidates = sortedMembers.filter((entry) => entry.pageRole === 'detail' || entry.pageRole === 'article')
    if (listingCandidate && detailCandidates.length > 0) {
      for (const detail of detailCandidates) {
        relationships.push({
          relationshipId: `rel_${hash([listingCandidate.routeId, detail.routeId])}`,
          kind: 'listing_to_detail',
          sourceRouteId: listingCandidate.routeId,
          targetRouteId: detail.routeId,
          confidence: detail.pageRole === 'article' ? 'high' : 'medium',
        })
      }
      continue
    }

    for (const member of sortedMembers) {
      relationships.push({
        relationshipId: `rel_${hash([familyId, member.routeId])}`,
        kind: 'family_member',
        sourceRouteId: familyId,
        targetRouteId: member.routeId,
        confidence: sortedMembers.length >= 4 ? 'medium' : 'low',
      })
    }
  }

  return {
    routeFamilies: families.sort((a, b) => a.familyId.localeCompare(b.familyId)),
    pageRelationships: relationships.sort((a, b) => a.relationshipId.localeCompare(b.relationshipId)),
  }
}
