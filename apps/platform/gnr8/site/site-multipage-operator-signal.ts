export type MultiPageImportOperatorSignalInput = {
  rawImportArtifactFound?: boolean
  discoveredRoutes?: number
  sitemapCount?: number
  sitemapDiscoveredUrlCount?: number
  canonicalUrlCount?: number
  hreflangGroupCount?: number
  prioritySelectedRouteCount?: number
  priorityExcludedRouteCount?: number
  fetchedPages?: number
  assembledPages?: number
  routeCount?: number
}

function positiveCount(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

export function hasMultiPageImportOperatorSignal(input: MultiPageImportOperatorSignalInput): boolean {
  return (
    Boolean(input.rawImportArtifactFound) ||
    positiveCount(input.discoveredRoutes) > 0 ||
    positiveCount(input.sitemapCount) > 0 ||
    positiveCount(input.sitemapDiscoveredUrlCount) > 0 ||
    positiveCount(input.canonicalUrlCount) > 0 ||
    positiveCount(input.hreflangGroupCount) > 0 ||
    positiveCount(input.prioritySelectedRouteCount) > 0 ||
    positiveCount(input.priorityExcludedRouteCount) > 0 ||
    positiveCount(input.fetchedPages) > 0 ||
    positiveCount(input.assembledPages) > 0 ||
    positiveCount(input.routeCount) > 0
  )
}
