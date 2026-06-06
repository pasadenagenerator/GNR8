export type {
  MultipageImportTree,
  MultipageImportSummary,
  MultipageImportLimits,
  RouteNode,
  NavigationTree,
  SharedRegionCandidate,
  RouteFamily,
  PageRelationship,
  MultipageDiscoveryInput,
  MultipageDiscoveryDependencies,
  PageFetchResult,
  RobotsDiscoveryEvidence,
  RobotsFetchResult,
  RobotsRouteGovernanceEntry,
  RobotsRouteGovernanceStatus,
  SitemapDiscoveryEvidence,
  SitemapFetchResult,
} from './types/contracts'

export { discoverMultipageImportTree, discoverMultipageImportTreeWithFetch, summarizeMultipageImportTree } from './core/discover-multipage-import-tree'
export { applyRobotsRouteGovernance, discoverRobotsTxt } from './core/robots-discovery'
export { discoverSitemapUrls } from './core/sitemap-discovery'
export {
  buildMultiPageImportOperatorSummary,
  exampleViroidocMultiPageImportOperatorSummary,
  type MultiPageImportOperatorDiagnosticGroup,
  type MultiPageImportOperatorRouteRow,
  type MultiPageImportOperatorRouteStatus,
  type MultiPageImportOperatorSummary,
} from './operator-summary-read-model'
