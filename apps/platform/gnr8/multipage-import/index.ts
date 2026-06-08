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
  AliasDiscoveryEvidence,
  CanonicalDiscoveryEvidence,
  RedirectDiscoveryEvidence,
  RobotsDiscoveryEvidence,
  RobotsFetchResult,
  RobotsRouteGovernanceEntry,
  RobotsRouteGovernanceStatus,
  SitemapDiscoveryEvidence,
  SitemapFetchResult,
} from './types/contracts'

export { discoverMultipageImportTree, discoverMultipageImportTreeWithFetch, summarizeMultipageImportTree } from './core/discover-multipage-import-tree'
export { emptyCanonicalDiscoveryEvidence } from './core/canonical-discovery'
export { buildRedirectAliasDiscoveryEvidence, emptyAliasDiscoveryEvidence, emptyRedirectDiscoveryEvidence } from './core/redirect-alias-discovery'
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
