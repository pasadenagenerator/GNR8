import crypto from 'node:crypto'

import type { SharedRegionCandidate } from '../types/contracts'

type PageRegionSignals = {
  routeId: string
  headerLinks: string[]
  footerLinks: string[]
  navBlockSignatures: string[]
  ctaBandSignature: string | null
}

function hash(parts: string[]): string {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function confidenceFromCount(count: number): 'low' | 'medium' | 'high' {
  if (count >= 4) return 'high'
  if (count >= 2) return 'medium'
  return 'low'
}

function fromCluster(input: {
  kind: SharedRegionCandidate['kind']
  signature: string
  routeIds: string[]
}): SharedRegionCandidate {
  const sortedRouteIds = [...new Set(input.routeIds)].sort((a, b) => a.localeCompare(b))
  return {
    regionId: `region_${input.kind}_${hash([input.kind, input.signature, ...sortedRouteIds])}`,
    kind: input.kind,
    pageIds: sortedRouteIds,
    confidence: confidenceFromCount(sortedRouteIds.length),
    signature: input.signature,
  }
}

export function inferSharedRegions(signals: PageRegionSignals[]): SharedRegionCandidate[] {
  const headerClusters = new Map<string, string[]>()
  const footerClusters = new Map<string, string[]>()
  const navClusters = new Map<string, string[]>()
  const ctaClusters = new Map<string, string[]>()

  for (const signal of signals) {
    const headerSignature = signal.headerLinks.slice().sort((a, b) => a.localeCompare(b)).join(',')
    const footerSignature = signal.footerLinks.slice().sort((a, b) => a.localeCompare(b)).join(',')

    if (headerSignature) {
      const list = headerClusters.get(headerSignature) ?? []
      list.push(signal.routeId)
      headerClusters.set(headerSignature, list)
    }

    if (footerSignature) {
      const list = footerClusters.get(footerSignature) ?? []
      list.push(signal.routeId)
      footerClusters.set(footerSignature, list)
    }

    for (const navSignature of signal.navBlockSignatures) {
      const list = navClusters.get(navSignature) ?? []
      list.push(signal.routeId)
      navClusters.set(navSignature, list)
    }

    if (signal.ctaBandSignature) {
      const list = ctaClusters.get(signal.ctaBandSignature) ?? []
      list.push(signal.routeId)
      ctaClusters.set(signal.ctaBandSignature, list)
    }
  }

  const regions: SharedRegionCandidate[] = []

  for (const [signature, routeIds] of headerClusters) {
    if (routeIds.length < 2) continue
    regions.push(fromCluster({ kind: 'header', signature, routeIds }))
  }
  for (const [signature, routeIds] of footerClusters) {
    if (routeIds.length < 2) continue
    regions.push(fromCluster({ kind: 'footer', signature, routeIds }))
  }
  for (const [signature, routeIds] of navClusters) {
    if (routeIds.length < 2) continue
    regions.push(fromCluster({ kind: 'nav_block', signature, routeIds }))
  }
  for (const [signature, routeIds] of ctaClusters) {
    if (routeIds.length < 2) continue
    regions.push(fromCluster({ kind: 'cta_band', signature, routeIds }))
  }

  return regions.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind)
    if (a.signature !== b.signature) return a.signature.localeCompare(b.signature)
    return a.regionId.localeCompare(b.regionId)
  })
}

export type { PageRegionSignals }
