import 'server-only'

import { toSiteEntity, type RawSiteRow, type SiteEntity } from '@/gnr8/site/site-entity'
import { resolveSiteWorkspacePreview, type SitePreviewType, type SiteWorkspacePreviewReadiness } from '@/gnr8/site/site-preview-contract'
import { normalizePreviewRuntimeMode, type PreviewRuntimeSummary } from '@/gnr8/preview-runtime/preview-runtime-types'
import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'
import type { StyleSignalModel } from '@/gnr8/style-signals'
import type { SemanticImportResult } from '@/gnr8/import-semantic/semantic-import-engine'
import { getSupabaseServerClientReadOnly } from '@/src/auth/supabase-server-read-only'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ClientOrganizationRow = {
  id: string | null
  name: string | null
  agency_id: string | null
  organization_type: string | null
}

type RuntimeVersionRow = {
  id: string | null
  site_id: string | null
  ownership_site_id: string | null
  state: string | null
  version_no: number | null
  import_provenance_summary: unknown
  artifact_id: string | null
  updated_at: string | null
  created_at: string | null
}

type RuntimePageVersionRow = {
  id: string | null
  site_version_id: string | null
  page_id: string | null
  path: string | null
  title: string | null
  structure_model: unknown
  content_model: unknown
  semantic_signals: unknown
  migration_governance: unknown
}

type RuntimeArtifactRow = {
  id: string | null
  site_version_id: string | null
  html_by_path: unknown
  manifest: unknown
}

type RuntimeDomainHostBindingRow = {
  id: string | null
  site_id: string | null
  site_version_id: string | null
  domain: string | null
  status: string | null
  verification_type: string | null
  verification_value: string | null
  verification_host: string | null
  last_checked_at: string | null
  updated_at: string | null
}

type SiteActionRow = {
  id: string | null
  site_id: string | null
  type: string | null
  status: string | null
  strategy: string | null
  result_summary: string | null
  diagnostics: unknown
  variant_id: string | null
  created_at: string | null
  completed_at: string | null
}

type SiteVariantRow = {
  id: string | null
  site_id: string | null
  label: string | null
  strategy: string | null
  site_version_id: string | null
  created_at: string | null
}

type SiteBootstrapJobRow = {
  site_id: string | null
  status: string | null
  runtime_site_id: string | null
  runtime_site_version_id: string | null
  artifact_id: string | null
  section_count: number | null
  updated_at: string | null
  completed_at: string | null
}

type SiteRenderJobRow = {
  runtime_site_version_id: string | null
  runtime_site_id: string | null
  site_id: string | null
  status: string | null
  rendered_dom_path: string | null
  computed_styles_path: string | null
  acquisition_evidence_path: string | null
  screenshot_count: number | null
  computed_style_sample_count: number | null
  dom_node_count: number | null
  updated_at: string | null
  completed_at: string | null
}

type RuntimeSnapshot = {
  latestRuntimeSiteVersionId: string | null
  latestRuntimeState: string | null
  latestRuntimeVersionNo: number
  latestRuntimeUpdatedAt: string | null
  latestRuntimeCreatedAt: string | null
  hasPublishedRuntimeVersion: boolean
}

type StructureSectionRow = {
  pageId: string
  pagePath: string
  sectionId: string
  sectionType: string
  ordinalIndex: number
  confidenceLabel: 'low' | 'medium' | 'high'
  confidenceScore: number
  mergedBlockCount: number | null
  dominantCandidate: string | null
  dominantRationale: string | null
  keyDiagnostics: string[]
}

type DesignDecisionRow = {
  sectionId: string
  sectionType: string
  visualTreatment: string
  rationale: string[]
}

type SiteActionType = 'rerun_transformation' | 'generate_redesign' | 'publish_site'

type SiteActionStatus = 'idle' | 'running' | 'completed' | 'failed'

export type SiteWorkspaceReadModel = {
  site: SiteEntity
  client: {
    clientId: string
    clientName: string | null
  }
  agency: {
    agencyId: string
  }
  pipeline: {
    latestRunAt: string | null
    latestRuntimeSiteVersionId: string | null
    latestRuntimeState: string | null
    lastActionType: 'rerun_transformation' | 'generate_redesign' | 'publish_site' | null
    lastActionStatus: 'idle' | 'running' | 'completed' | 'failed' | null
    lastActionAt: string | null
    semanticModelStatus: 'available' | 'unavailable'
    visualAnalysisStatus: 'available' | 'unavailable'
    designModelStatus: 'available' | 'unavailable'
    sourceMode: 'rendered_dom' | 'raw_html_fallback' | 'unknown'
    captureMode: 'raw_html_only' | 'dom_parsed' | 'rendered_browser' | 'unknown'
    importFidelityStatus: 'high_fidelity_import' | 'degraded_import' | 'capture_failed' | 'unknown'
    importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore']
    importFidelityDegraded: boolean
    renderedCaptureStatus: 'available' | 'partial' | 'failed' | 'unknown'
    renderedDomQuality: 'strong' | 'weak' | 'unusable' | 'unknown'
    screenshotCount: number
    computedStyleSampleCount: number
    renderedCapture: RuntimeImportProvenanceSummary['renderedCapture'] | null
    styleSignalCoverage: number
    styleSignalFallbackUsed: boolean
    styleSignalSourceMode: StyleSignalModel['sourceMode'] | 'unknown'
    evidencePaths: {
      renderedDomPath: string | null
      computedStylesPath: string | null
      acquisitionEvidencePath: string | null
      renderedCaptureManifestPath: string | null
      renderedViewportScreenshotPath: string | null
      renderedFullpageScreenshotPath: string | null
    }
    evidenceDiagnostics: string[]
    importDiagnosticCodes: string[]
    captureEvidenceRefs: string[]
    captureJob: RuntimeImportProvenanceSummary['captureJob'] | null
    workerHealth: RuntimeImportProvenanceSummary['workerHealth'] | null
    captureFallbackReason: string | null
    diagnosticsSummary: string[]
    multipageImportSummary: RuntimeImportProvenanceSummary['multipageImport'] extends { summary: infer T } | null | undefined ? T | null : null
    siteTreeSummary: RuntimeImportProvenanceSummary['siteTree'] extends { summary: infer T } | null | undefined ? T | null : null
    templateFamiliesSummary: RuntimeImportProvenanceSummary['templateFamilies'] extends { summary: infer T } | null | undefined ? T | null : null
    styleSignals: StyleSignalModel | null
    semanticImport: SemanticImportResult | null
    runtimeSelection: {
      selectedVersionId: string | null
      selectedSiteId: string | null
      selectedVersionNo: number | null
      selectedHasImportProvenanceSummary: boolean
      selectedHasArtifactId: boolean
    }
  }
  actions: {
    currentStatus: 'idle' | 'running' | 'completed' | 'failed'
    lastAction: {
      actionId: string | null
      type: 'rerun_transformation' | 'generate_redesign' | 'publish_site' | null
      status: 'idle' | 'running' | 'completed' | 'failed'
      resultSummary: string | null
      diagnostics: string[]
      createdAt: string | null
      completedAt: string | null
    }
  }
  variants: {
    selectedVariantId: string | null
    selectedSiteVersionId: string | null
    rows: Array<{
      id: string
      label: string
      strategy: string
      siteVersionId: string | null
      createdAt: string
    }>
  }
  overview: {
    sectionsDetected: number
    heroDetected: boolean
    ctaDetected: boolean
    captureDrivenLiftApplied: boolean
    captureSignalSummary: string[]
    designStrategy: 'cta_focused' | 'corporate_balanced' | 'editorial_readable' | 'visual_gallery'
    statusLabel: 'imported' | 'processed' | 'preview_ready' | 'published' | 'unknown'
    sourceMode: 'rendered_dom' | 'raw_html_fallback' | 'unknown'
    importFidelityStatus: 'high_fidelity_import' | 'degraded_import' | 'capture_failed' | 'unknown'
    importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore']
  }
  content: {
    hero: SemanticImportResult['hero']
    sections: SemanticImportResult['sections']
    imagesByRole: SemanticImportResult['assets']['groupedByRole']
    diagnostics: SemanticImportResult['diagnostics']
  }
  structure: {
    rows: StructureSectionRow[]
  }
  design: {
    selectedPageStrategy: string
    aiSuggestionStatus: 'accepted' | 'rejected' | 'unavailable'
    visualSignals: {
      heroProminence: 'low' | 'medium' | 'high'
      visualDensity: 'low' | 'medium' | 'high'
      ctaProminence: 'low' | 'medium' | 'high'
    }
    styleSignals: {
      sourceMode: StyleSignalModel['sourceMode'] | 'unknown'
      backgroundTone: StyleSignalModel['colors']['backgroundTone']
      primaryAccent: string | null
      headingCategory: StyleSignalModel['typography']['headingCategory']
      bodyCategory: StyleSignalModel['typography']['bodyCategory']
      spacingRhythm: StyleSignalModel['spacing']['rhythm']
      layoutDensity: StyleSignalModel['spacing']['layoutDensity']
      ctaStyle: StyleSignalModel['cta']['styleHint']
      ctaProminence: StyleSignalModel['cta']['prominence']
      diagnostics: string[]
    }
    sectionDecisions: DesignDecisionRow[]
    rationale: string[]
  }
  preview: {
    readiness: SiteWorkspacePreviewReadiness
    sourceType: SitePreviewType | null
    previewUrl: string | null
    transformedPreviewUrl: string | null
    debugPreviewUrl: string | null
    previewMode: PreviewRuntimeSummary['previewMode'] | null
    familyRenderUsed: boolean
    familyRenderMode: PreviewRuntimeSummary['familyRenderMode']
    familyRenderFamilyId: string | null
    familyRenderFallbackToPage: boolean
    familyRenderDiagnosticsCount: number
    familyRenderDiagnostics: string[]
    previewRuntimeSummary: PreviewRuntimeSummary | null
    liveUrl: string | null
    selectedVariantLabel: string | null
    diagnostics: string[]
  }
  settings: {
    name: string
    domain: string | null
    domainBinding: {
      id: string
      domain: string
      status: 'pending' | 'verifying' | 'active' | 'failed'
      verificationType: 'cname' | 'txt' | null
      verificationValue: string | null
      verificationHost: string | null
      lastCheckedAt: string | null
    } | null
  }
  siteOptions: Array<{ siteId: string; label: string }>
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function shortId(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 8)}...`
}

function normalizeUuid(value: string | null | undefined, fieldName: string): string {
  const normalized = normalizeText(value)
  if (!normalized) throw new Error(`${fieldName} is required`)
  if (!UUID_RE.test(normalized)) throw new Error(`${fieldName} must be a valid UUID`)
  return normalized
}

function toTextOrNull(value: unknown): string | null {
  const normalized = normalizeText(value)
  return normalized || null
}

function emptySemanticImageGroups(): SemanticImportResult['assets']['groupedByRole'] {
  return {
    logo: [],
    hero_image: [],
    gallery_image: [],
    service_image: [],
    testimonial_avatar: [],
    content_image: [],
    icon: [],
    unknown: [],
  }
}

function normalizeSiteActionType(value: string | null | undefined): SiteActionType | null {
  switch (value) {
    case 'rerun_transformation':
    case 'generate_redesign':
    case 'publish_site':
      return value
    default:
      return null
  }
}

function normalizeSiteActionStatus(value: string | null | undefined): SiteActionStatus | null {
  switch (value) {
    case 'idle':
    case 'running':
    case 'completed':
    case 'failed':
      return value
    default:
      return null
  }
}

function toIsoOrNull(value: unknown): string | null {
  if (value == null) return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

function toHttpsUrlOrNull(value: string | null | undefined): string | null {
  const raw = normalizeText(value)
  if (!raw) return null

  try {
    const parsed = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function toEpoch(value: unknown): number {
  const iso = toIsoOrNull(value)
  if (!iso) return 0
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : 0
}

type RuntimeRowArbitrationCandidate = {
  row: RuntimeVersionRow
  summary: RuntimeImportProvenanceSummary | null
  waveKey: string
  score: number
  usableRendered: boolean
  renderedFailed: boolean
  recencyEpoch: number
}

type RuntimeRowArbitrationResult = {
  selected: RuntimeVersionRow | null
  latest: RuntimeVersionRow | null
  diagnostics: string[]
}

const ARBITRATION_FALLBACK_WAVE_WINDOW_MS = 10 * 60 * 1000

function compareRuntimeRowsByRecency(a: RuntimeVersionRow, b: RuntimeVersionRow): number {
  const updatedDelta = toEpoch(a.updated_at) - toEpoch(b.updated_at)
  if (updatedDelta !== 0) return updatedDelta

  const createdDelta = toEpoch(a.created_at) - toEpoch(b.created_at)
  if (createdDelta !== 0) return createdDelta

  return String(a.id ?? '').localeCompare(String(b.id ?? ''))
}

function deriveRuntimeRowWaveKey(input: { row: RuntimeVersionRow; summary: RuntimeImportProvenanceSummary | null }): string {
  const requestId = normalizeText(input.summary?.executionIdentity?.requestId)
  if (requestId) return `request:${requestId}`

  const snapshotRunId = normalizeText(input.summary?.executionIdentity?.snapshotRunId)
  if (snapshotRunId) {
    const trimmedSuffix = snapshotRunId.replace(/-[0-9a-f]{8}$/i, '')
    return `run:${trimmedSuffix || snapshotRunId}`
  }

  const snapshotId = normalizeText(input.summary?.executionIdentity?.snapshotId)
  if (snapshotId) return `snapshot:${snapshotId}`

  const ownershipSiteId = normalizeText(input.row.ownership_site_id)
  return ownershipSiteId ? `ownership-site:${ownershipSiteId}` : `row:${normalizeText(input.row.id) || 'unknown'}`
}

function scoreRuntimeRowForRenderedArbitration(summary: RuntimeImportProvenanceSummary | null): {
  score: number
  usableRendered: boolean
  renderedFailed: boolean
} {
  if (!summary) {
    return { score: 50, usableRendered: false, renderedFailed: false }
  }

  const diagnosticCodes = new Set((summary.importDiagnosticCodes ?? []).map((code) => normalizeText(code).toUpperCase()))
  const executionFailureCode = normalizeText(summary.renderedCapture?.execution?.failureCode).toUpperCase()
  const hasFatalEmptyCode =
    executionFailureCode === 'DOM_EMPTY_AFTER_RENDER' ||
    executionFailureCode === 'RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION' ||
    diagnosticCodes.has('DOM_EMPTY_AFTER_RENDER') ||
    diagnosticCodes.has('RENDERED_CAPTURE_DOM_EMPTY_AFTER_NAVIGATION')

  const domCount = Math.max(
    0,
    Number(summary.renderedCapture?.nodeCount ?? 0),
    Number(summary.renderedCapture?.domLength ?? 0),
  )
  const hasDomEvidence = domCount > 0 || Boolean(summary.captureEvidence?.renderedDomPath)
  const hasUsableDom = hasDomEvidence && !hasFatalEmptyCode
  const hasScreenshots =
    Number(summary.screenshotCount ?? 0) > 0 ||
    Boolean(summary.renderedCapture?.screenshots?.viewport) ||
    Boolean(summary.renderedCapture?.screenshots?.fullPage) ||
    Number(summary.captureEvidence?.screenshotPaths?.length ?? 0) > 0 ||
    Boolean(summary.captureEvidence?.renderedViewportScreenshotPath) ||
    Boolean(summary.captureEvidence?.renderedFullpageScreenshotPath)
  const hasStyleEvidence = Number(summary.computedStyleSampleCount ?? 0) > 0 || Number(summary.renderedCapture?.styleSampleCount ?? 0) > 0
  const renderedStatus = summary.renderedCapture?.status ?? summary.renderedCaptureStatus
  const acceptedByWorker = renderedStatus === 'available' || renderedStatus === 'partial'

  if (summary.sourceMode === 'rendered_dom' && acceptedByWorker && hasUsableDom && hasScreenshots) {
    return { score: 600, usableRendered: true, renderedFailed: false }
  }
  if (summary.sourceMode === 'rendered_dom' && acceptedByWorker && hasUsableDom) {
    return { score: 500, usableRendered: true, renderedFailed: false }
  }
  if (summary.sourceMode === 'rendered_dom' && acceptedByWorker && hasScreenshots) {
    return { score: 400, usableRendered: true, renderedFailed: false }
  }
  if (summary.sourceMode === 'rendered_dom' && renderedStatus === 'partial' && (hasUsableDom || hasScreenshots || hasStyleEvidence)) {
    return { score: 350, usableRendered: true, renderedFailed: false }
  }
  if (renderedStatus === 'failed') {
    return { score: 200, usableRendered: false, renderedFailed: true }
  }
  if (summary.sourceMode === 'raw_html_fallback') {
    return { score: 100, usableRendered: false, renderedFailed: false }
  }

  return { score: 75, usableRendered: false, renderedFailed: false }
}

function compareRuntimeRowCandidates(a: RuntimeRowArbitrationCandidate, b: RuntimeRowArbitrationCandidate): number {
  const scoreDelta = a.score - b.score
  if (scoreDelta !== 0) return scoreDelta

  const fidelityDelta =
    Number(a.summary?.importFidelityScore?.overallScore ?? 0) - Number(b.summary?.importFidelityScore?.overallScore ?? 0)
  if (fidelityDelta !== 0) return fidelityDelta

  const recencyDelta = a.recencyEpoch - b.recencyEpoch
  if (recencyDelta !== 0) return recencyDelta

  return String(a.row.id ?? '').localeCompare(String(b.row.id ?? ''))
}

function selectPrimaryRuntimeVersionRow(runtimeRows: RuntimeVersionRow[]): RuntimeRowArbitrationResult {
  if (runtimeRows.length === 0) {
    return { selected: null, latest: null, diagnostics: ['RENDERED_RUN_ARBITRATION_STARTED', 'NO_USABLE_RENDERED_RUN_FOUND'] }
  }

  const candidates = runtimeRows.map((row) => {
    const summary = parseImportProvenanceSummary(row.import_provenance_summary)
    const ranking = scoreRuntimeRowForRenderedArbitration(summary)
    const recencyEpoch = Math.max(toEpoch(row.updated_at), toEpoch(row.created_at))
    return {
      row,
      summary,
      waveKey: deriveRuntimeRowWaveKey({ row, summary }),
      score: ranking.score,
      usableRendered: ranking.usableRendered,
      renderedFailed: ranking.renderedFailed,
      recencyEpoch,
    }
  })

  const latest = candidates.slice().sort((left, right) => compareRuntimeRowsByRecency(right.row, left.row))[0] ?? null
  const waveKey = latest?.waveKey ?? ''
  const inSameWave = candidates.filter((candidate) => {
    if (candidate.waveKey !== waveKey) return false
    if (!waveKey.startsWith('ownership-site:')) return true
    return Math.abs(candidate.recencyEpoch - (latest?.recencyEpoch ?? 0)) <= ARBITRATION_FALLBACK_WAVE_WINDOW_MS
  })
  const evaluationPool = inSameWave.length > 0 ? inSameWave : candidates
  const selected = evaluationPool.slice().sort((left, right) => compareRuntimeRowCandidates(right, left))[0] ?? latest

  const diagnostics: string[] = ['RENDERED_RUN_ARBITRATION_STARTED', 'RENDERED_RUN_EVALUATED', 'RENDERED_RUN_SELECTED_AS_PRIMARY']
  if (latest && selected && latest.row.id !== selected.row.id && selected.score > latest.score) {
    diagnostics.push('LATEST_RUN_SUPERSEDED_BY_BETTER_RENDERED_RUN')
    if (latest.renderedFailed && selected.usableRendered) {
      diagnostics.push('FAILED_RUN_REJECTED_IN_FAVOR_OF_USABLE_RENDER')
    }
  }
  if (!evaluationPool.some((candidate) => candidate.usableRendered)) {
    diagnostics.push('NO_USABLE_RENDERED_RUN_FOUND')
    if (selected?.summary?.sourceMode === 'raw_html_fallback') {
      diagnostics.push('RAW_FALLBACK_SELECTED_NO_USABLE_RENDER')
    }
  }
  if (selected?.summary?.sourceMode === 'rendered_dom') {
    diagnostics.push('PRIMARY_RENDERED_RUN_ALIGNED_TO_READMODEL')
  }

  return {
    selected: selected?.row ?? null,
    latest: latest?.row ?? null,
    diagnostics,
  }
}

function compareRuntimeVersionRows(a: RuntimeVersionRow, b: RuntimeVersionRow): number {
  const aSummary = parseImportProvenanceSummary(a.import_provenance_summary)
  const bSummary = parseImportProvenanceSummary(b.import_provenance_summary)
  const aRank = scoreRuntimeRowForRenderedArbitration(aSummary)
  const bRank = scoreRuntimeRowForRenderedArbitration(bSummary)

  const scoreDelta = aRank.score - bRank.score
  if (scoreDelta !== 0) return scoreDelta

  const fidelityDelta =
    Number(aSummary?.importFidelityScore?.overallScore ?? 0) - Number(bSummary?.importFidelityScore?.overallScore ?? 0)
  if (fidelityDelta !== 0) return fidelityDelta

  return compareRuntimeRowsByRecency(a, b)
}

function resolveLatestRuntimeVersionRow(runtimeRows: RuntimeVersionRow[]): RuntimeVersionRow | null {
  return selectPrimaryRuntimeVersionRow(runtimeRows).selected
}

function toNonNegativeInt(value: unknown): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Math.max(0, Math.floor(numeric))
}

function buildSyntheticSummaryFromRenderJob(input: {
  renderJob: SiteRenderJobRow
}): RuntimeImportProvenanceSummary {
  const screenshotCount = toNonNegativeInt(input.renderJob.screenshot_count)
  const computedStyleSampleCount = toNonNegativeInt(input.renderJob.computed_style_sample_count)
  const domNodeCount = toNonNegativeInt(input.renderJob.dom_node_count)
  const hasRenderedTruth = domNodeCount > 0 || screenshotCount > 0
  const sourceMode: RuntimeImportProvenanceSummary['sourceMode'] = hasRenderedTruth ? 'rendered_dom' : 'raw_html_fallback'
  const renderedCaptureStatus: RuntimeImportProvenanceSummary['renderedCaptureStatus'] =
    domNodeCount > 0
      ? (screenshotCount > 0 ? 'available' : 'partial')
      : (screenshotCount > 0 ? 'partial' : 'failed')
  const renderedDomQuality: RuntimeImportProvenanceSummary['renderedDomQuality'] =
    domNodeCount >= 12 ? 'strong' : (domNodeCount >= 3 ? 'weak' : 'unusable')
  const importFidelityStatus: RuntimeImportProvenanceSummary['importFidelityStatus'] =
    sourceMode === 'rendered_dom'
      ? (renderedCaptureStatus === 'available' && renderedDomQuality === 'strong' ? 'high_fidelity_import' : 'degraded_import')
      : 'capture_failed'
  const screenshotPaths = [
    ...(screenshotCount > 0 ? ['site-render:viewport'] : []),
    ...(screenshotCount > 1 ? ['site-render:fullpage'] : []),
  ]

  return {
    kind: 'runtime_import_provenance_summary_v1',
    sourceMode,
    importFidelityStatus,
    renderedCaptureStatus,
    renderedDomQuality,
    importFidelityScore: null,
    screenshotCount,
    computedStyleSampleCount,
    renderedCapture: {
      used: sourceMode === 'rendered_dom',
      status: renderedCaptureStatus,
      quality: renderedDomQuality,
      domLength: domNodeCount,
      nodeCount: domNodeCount,
      styleSampleCount: computedStyleSampleCount,
      styleCoverage: Number((Math.max(0, computedStyleSampleCount) / 10).toFixed(3)),
      screenshots: {
        viewport: screenshotCount > 0,
        fullPage: screenshotCount > 1,
      },
      execution: {
        runtimeKind: 'nodejs',
        environmentSupported: true,
        browserPackageAvailable: true,
        browserBinaryAvailable: true,
        environmentStatus: 'supported',
        failureCategory: renderedCaptureStatus === 'failed' ? 'page' : 'none',
        failureCode: renderedCaptureStatus === 'failed' ? 'SITE_RENDER_CAPTURE_MISSING_RENDERED_TRUTH' : null,
        browserLaunch: renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded',
        navigation: renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded',
        dom: domNodeCount > 0 ? 'captured' : 'empty_or_failed',
        screenshot: screenshotCount > 0 ? 'captured' : 'none',
        styleSampling: computedStyleSampleCount > 0 ? 'captured' : 'failed_or_empty',
      },
    },
    importDiagnosticCodes: [
      'SITE_RENDER_CAPTURE_COMPLETED',
      ...(sourceMode === 'rendered_dom' ? ['CAPTURE_WORKER_RESULT_SELECTED'] : ['NO_USABLE_RENDERED_RUN_FOUND']),
    ],
    captureEvidence: {
      selectedSourceHtmlPath: null,
      responseHtmlPath: null,
      entryHtmlPath: null,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: toTextOrNull(input.renderJob.acquisition_evidence_path),
      renderedDomPath: toTextOrNull(input.renderJob.rendered_dom_path),
      computedStylesPath: toTextOrNull(input.renderJob.computed_styles_path),
      renderedViewportScreenshotPath: screenshotCount > 0 ? 'site-render:viewport' : null,
      renderedFullpageScreenshotPath: screenshotCount > 1 ? 'site-render:fullpage' : null,
      screenshotPaths,
    },
    captureJob: null,
    workerHealth: null,
    styleSignals: null,
    multipageImport: null,
    siteTree: null,
    templateFamilies: null,
  }
}

function synthesizeRuntimeVersionRowsFromWorkerJobs(input: {
  siteId: string
  bootstrapJob: SiteBootstrapJobRow | null
  renderJobs: SiteRenderJobRow[]
  runtimeRows: RuntimeVersionRow[]
}): RuntimeVersionRow[] {
  const knownIds = new Set(
    input.runtimeRows.map((row) => toTextOrNull(row.id)).filter((value): value is string => Boolean(value)),
  )
  const syntheticRows: RuntimeVersionRow[] = []

  for (const renderJob of input.renderJobs) {
    const runtimeSiteVersionId = toTextOrNull(renderJob.runtime_site_version_id)
    if (!runtimeSiteVersionId || knownIds.has(runtimeSiteVersionId)) continue
    const status = normalizeText(renderJob.status).toLowerCase()
    if (status !== 'completed' && status !== 'running') continue
    const createdAt = toIsoOrNull(renderJob.completed_at) ?? toIsoOrNull(renderJob.updated_at)
    syntheticRows.push({
      id: runtimeSiteVersionId,
      site_id: toTextOrNull(renderJob.runtime_site_id),
      ownership_site_id: input.siteId,
      state: 'DRAFT',
      version_no: null,
      import_provenance_summary: buildSyntheticSummaryFromRenderJob({ renderJob }),
      artifact_id: toTextOrNull(input.bootstrapJob?.artifact_id),
      updated_at: createdAt,
      created_at: createdAt,
    })
    knownIds.add(runtimeSiteVersionId)
  }

  const bootstrapRuntimeSiteVersionId = toTextOrNull(input.bootstrapJob?.runtime_site_version_id)
  if (bootstrapRuntimeSiteVersionId && !knownIds.has(bootstrapRuntimeSiteVersionId)) {
    const createdAt = toIsoOrNull(input.bootstrapJob?.completed_at) ?? toIsoOrNull(input.bootstrapJob?.updated_at)
    syntheticRows.push({
      id: bootstrapRuntimeSiteVersionId,
      site_id: toTextOrNull(input.bootstrapJob?.runtime_site_id),
      ownership_site_id: input.siteId,
      state: 'DRAFT',
      version_no: null,
      import_provenance_summary: null,
      artifact_id: toTextOrNull(input.bootstrapJob?.artifact_id),
      updated_at: createdAt,
      created_at: createdAt,
    })
  }

  return syntheticRows
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toStatusLabel(input: {
  siteStatus: SiteEntity['status']
  latestRuntimeState: string | null
  hasPreview: boolean
}): SiteWorkspaceReadModel['overview']['statusLabel'] {
  const runtimeState = normalizeText(input.latestRuntimeState).toUpperCase()
  if (runtimeState === 'PUBLISHED') return 'published'
  if (input.hasPreview) return 'preview_ready'

  if (input.siteStatus === 'migrating' || input.siteStatus === 'shadow' || input.siteStatus === 'live') return 'processed'
  if (input.siteStatus === 'draft') return 'imported'
  return 'unknown'
}

export function assertSiteWorkspaceScope(input: {
  clientOrg: ClientOrganizationRow | null
  site: RawSiteRow | null
  expectedAgencyId: string
  expectedClientId: string
  expectedSiteId: string
}): void {
  const expectedAgencyId = normalizeUuid(input.expectedAgencyId, 'expectedAgencyId')
  const expectedClientId = normalizeUuid(input.expectedClientId, 'expectedClientId')
  const expectedSiteId = normalizeUuid(input.expectedSiteId, 'expectedSiteId')

  const org = input.clientOrg
  const orgId = toTextOrNull(org?.id)
  const orgAgencyId = toTextOrNull(org?.agency_id)
  const orgType = normalizeText(org?.organization_type).toLowerCase()

  if (!orgId || orgId !== expectedClientId || !orgAgencyId || orgAgencyId !== expectedAgencyId || orgType !== 'client') {
    throw new Error('Client organization scope is invalid for site workspace access.')
  }

  const site = input.site
  const siteId = toTextOrNull(site?.id)
  const siteOrgId = toTextOrNull(site?.org_id)
  const siteAgencyId = toTextOrNull(site?.agency_id)

  if (!siteId || !siteOrgId || !siteAgencyId) {
    throw new Error('Site scope is invalid: required tenancy fields are missing.')
  }

  if (siteId !== expectedSiteId || siteOrgId !== expectedClientId || siteAgencyId !== expectedAgencyId) {
    throw new Error('Site scope mismatch: access denied by fail-closed policy.')
  }
}

function parseStructureRows(pageRows: RuntimePageVersionRow[]): StructureSectionRow[] {
  const rows: StructureSectionRow[] = []

  for (const page of pageRows) {
    const pageId = toTextOrNull(page.page_id) ?? toTextOrNull(page.id) ?? 'unknown-page'
    const pagePath = toTextOrNull(page.path) ?? '/'

    const governance = isRecord(page.migration_governance) ? page.migration_governance : null
    const confidenceBase = (() => {
      const value = Number(governance?.pageStructuralConfidence)
      if (!Number.isFinite(value)) return 0.5
      return Math.max(0, Math.min(1, value))
    })()
    const weakSectionIds = new Set(
      Array.isArray(governance?.weakSectionIds)
        ? governance.weakSectionIds.map((value) => normalizeText(value)).filter(Boolean)
        : [],
    )
    const anomalies = Array.isArray(governance?.structuralAnomalies)
      ? governance.structuralAnomalies.map((value) => normalizeText(value)).filter(Boolean)
      : []

    const structureModel = isRecord(page.structure_model) ? page.structure_model : null
    const contentModel = isRecord(page.content_model) ? page.content_model : null
    const sectionPropsById = isRecord(contentModel?.sectionProps) ? (contentModel.sectionProps as Record<string, unknown>) : {}
    const sections = Array.isArray(structureModel?.sections) ? structureModel.sections : []

    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index]
      const sectionRecord = isRecord(section) ? section : {}
      const sectionId = normalizeText(sectionRecord.id) || `${pageId}-section-${index + 1}`
      const sectionType = normalizeText(sectionRecord.type) || 'unknown'
      const ordinalIndex = Number.isFinite(Number(sectionRecord.order)) ? Number(sectionRecord.order) : index
      const sectionPropsRaw = sectionPropsById[sectionId]
      const sectionProps = isRecord(sectionPropsRaw) ? sectionPropsRaw : null
      const mergedBlockCountRaw = Number(sectionProps?.mergedBlockCount)
      const mergedBlockCount = Number.isFinite(mergedBlockCountRaw) && mergedBlockCountRaw > 0 ? Math.floor(mergedBlockCountRaw) : null
      const candidateSignals = isRecord(sectionProps?.candidateSignals) ? sectionProps.candidateSignals : null
      const dominantCandidate = normalizeText(candidateSignals?.dominantCandidate) || null
      const dominantRationale = normalizeText(sectionProps?.dominantRationale) || null
      const classificationDiagnostics = Array.isArray(sectionProps?.classificationDiagnostics)
        ? sectionProps.classificationDiagnostics.map((value) => normalizeText(value)).filter(Boolean)
        : []

      const score = weakSectionIds.has(sectionId) ? Math.max(0.25, confidenceBase - 0.35) : confidenceBase
      const confidenceLabel: StructureSectionRow['confidenceLabel'] =
        score >= 0.85 ? 'high' : score >= 0.65 ? 'medium' : 'low'

      rows.push({
        pageId,
        pagePath,
        sectionId,
        sectionType,
        ordinalIndex,
        confidenceLabel,
        confidenceScore: Number(score.toFixed(3)),
        mergedBlockCount,
        dominantCandidate,
        dominantRationale,
        keyDiagnostics: [...new Set([...anomalies, ...classificationDiagnostics])].slice(0, 4),
      })
    }
  }

  rows.sort((left, right) => {
    const pathDelta = left.pagePath.localeCompare(right.pagePath)
    if (pathDelta !== 0) return pathDelta
    return left.ordinalIndex - right.ordinalIndex
  })

  return rows
}

function inferDesignStrategy(rows: StructureSectionRow[]): SiteWorkspaceReadModel['overview']['designStrategy'] {
  const heroCount = rows.filter((row) => row.sectionType.toLowerCase().includes('hero')).length
  const ctaCount = rows.filter((row) => row.sectionType.toLowerCase().includes('cta') || row.sectionType.toLowerCase().includes('contact')).length
  const galleryCount = rows.filter((row) => row.sectionType.toLowerCase().includes('gallery')).length

  if (heroCount > 0 && ctaCount > 0) return 'cta_focused'
  if (galleryCount > 0) return 'visual_gallery'
  if (rows.length >= 8) return 'corporate_balanced'
  return 'editorial_readable'
}

function inferVisualTreatment(sectionType: string): string {
  const normalized = sectionType.toLowerCase()
  if (normalized.includes('hero')) return 'hero_split'
  if (normalized.includes('cta') || normalized.includes('contact')) return 'cta_emphasized'
  if (normalized.includes('gallery')) return 'gallery_grid'
  if (normalized.includes('footer')) return 'footer_compact'
  return 'content_two_column'
}

function inferAiSuggestionStatus(pageRows: RuntimePageVersionRow[]): SiteWorkspaceReadModel['design']['aiSuggestionStatus'] {
  let hasAi = false
  let hasHighConfidenceAi = false

  for (const page of pageRows) {
    const semanticSignals = Array.isArray(page.semantic_signals) ? page.semantic_signals : []
    for (const signal of semanticSignals) {
      if (!isRecord(signal)) continue
      const source = normalizeText(signal.source).toLowerCase()
      if (source !== 'ai') continue
      hasAi = true

      const confidence = Number(signal.confidence)
      if (Number.isFinite(confidence) && confidence >= 0.7) {
        hasHighConfidenceAi = true
      }
    }
  }

  if (!hasAi) return 'unavailable'
  if (hasHighConfidenceAi) return 'accepted'
  return 'rejected'
}

function parseImportFidelitySignals(pageRows: RuntimePageVersionRow[]): {
  sourceMode: SiteWorkspaceReadModel['pipeline']['sourceMode']
  importFidelityStatus: SiteWorkspaceReadModel['pipeline']['importFidelityStatus']
  renderedCaptureStatus: SiteWorkspaceReadModel['pipeline']['renderedCaptureStatus']
  renderedDomQuality: SiteWorkspaceReadModel['pipeline']['renderedDomQuality']
  importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore']
  screenshotCount: number
  computedStyleSampleCount: number
  importDiagnosticCodes: string[]
} {
  let sourceMode: SiteWorkspaceReadModel['pipeline']['sourceMode'] = 'unknown'
  let importFidelityStatus: SiteWorkspaceReadModel['pipeline']['importFidelityStatus'] = 'unknown'
  let renderedCaptureStatus: SiteWorkspaceReadModel['pipeline']['renderedCaptureStatus'] = 'unknown'
  let renderedDomQuality: SiteWorkspaceReadModel['pipeline']['renderedDomQuality'] = 'unknown'
  let importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore'] = null
  let screenshotCount = 0
  let computedStyleSampleCount = 0
  const importDiagnosticCodes = new Set<string>()

  for (const page of pageRows) {
    const semanticSignals = Array.isArray(page.semantic_signals) ? page.semantic_signals : []
    for (const signal of semanticSignals) {
      if (!isRecord(signal)) continue
      const label = normalizeText(signal.label)
      if (!label) continue

      if (label.startsWith('import.source_mode:')) {
        const value = label.slice('import.source_mode:'.length).trim()
        if (value === 'rendered_dom' || value === 'raw_html_fallback') sourceMode = value
        continue
      }

      if (label.startsWith('import.fidelity_status:')) {
        const value = label.slice('import.fidelity_status:'.length).trim()
        if (value === 'high_fidelity_import' || value === 'degraded_import' || value === 'capture_failed') importFidelityStatus = value
        continue
      }

      if (label.startsWith('import.rendered_capture_status:')) {
        const value = label.slice('import.rendered_capture_status:'.length).trim()
        if (value === 'available' || value === 'partial' || value === 'failed') renderedCaptureStatus = value
        if (value === 'unavailable') renderedCaptureStatus = 'failed'
        continue
      }

      if (label.startsWith('import.rendered_dom_quality:')) {
        const value = label.slice('import.rendered_dom_quality:'.length).trim()
        if (value === 'strong' || value === 'weak' || value === 'unusable') renderedDomQuality = value
        continue
      }

      if (label.startsWith('import.fidelity.score.overall:')) {
        const overall = Number(label.slice('import.fidelity.score.overall:'.length).trim())
        if (Number.isFinite(overall)) {
          const bounded = Math.max(0, Math.min(1, Number(overall.toFixed(3))))
          importFidelityScore = {
            structureScore: bounded,
            styleScore: bounded,
            contentScore: bounded,
            layoutScore: bounded,
            overallScore: bounded,
            fidelityLevel: bounded >= 0.74 ? 'high' : bounded >= 0.5 ? 'medium' : 'low',
          }
        }
        continue
      }

      if (label.startsWith('import.fidelity.score.level:')) {
        const level = label.slice('import.fidelity.score.level:'.length).trim()
        if ((level === 'low' || level === 'medium' || level === 'high') && importFidelityScore) {
          importFidelityScore = {
            ...importFidelityScore,
            fidelityLevel: level,
          }
        }
        continue
      }

      if (label.startsWith('import.screenshot_count:')) {
        const value = Number(label.slice('import.screenshot_count:'.length).trim())
        if (Number.isFinite(value)) screenshotCount = Math.max(0, Math.floor(value))
        continue
      }

      if (label.startsWith('import.computed_style_sample_count:')) {
        const value = Number(label.slice('import.computed_style_sample_count:'.length).trim())
        if (Number.isFinite(value)) computedStyleSampleCount = Math.max(0, Math.floor(value))
        continue
      }

      if (label.startsWith('import.diagnostic:')) {
        const value = label.slice('import.diagnostic:'.length).trim()
        if (value) importDiagnosticCodes.add(value)
      }
    }
  }

  return {
    sourceMode,
    importFidelityStatus,
    renderedCaptureStatus,
    renderedDomQuality,
    importFidelityScore,
    screenshotCount,
    computedStyleSampleCount,
    importDiagnosticCodes: [...importDiagnosticCodes].sort((a, b) => a.localeCompare(b)),
  }
}

function parseStyleSignalsFromSemanticLabels(pageRows: RuntimePageVersionRow[]): StyleSignalModel | null {
  const labels = new Set<string>()
  for (const page of pageRows) {
    const semanticSignals = Array.isArray(page.semantic_signals) ? page.semantic_signals : []
    for (const signal of semanticSignals) {
      if (!isRecord(signal)) continue
      const label = normalizeText(signal.label)
      if (label.startsWith('style.')) labels.add(label)
    }
  }

  if (labels.size === 0) return null
  const values = [...labels]

  const pick = (prefix: string): string | null => {
    const found = values.find((entry) => entry.startsWith(prefix))
    return found ? normalizeText(found.slice(prefix.length)) || null : null
  }

  const diagnostics = values
    .filter((entry) => entry.startsWith('style.diagnostic:'))
    .map((entry) => normalizeText(entry.slice('style.diagnostic:'.length)))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .map((code) => ({
      code: code as StyleSignalModel['diagnostics'][number]['code'],
      severity: 'info' as const,
      message: `Recovered from semantic label: ${code}`,
    }))

  const sourceMode = pick('style.source_mode:')
  const backgroundTone = pick('style.background_tone:')
  const headingCategory = pick('style.typography.heading_category:')
  const bodyCategory = pick('style.typography.body_category:')
  const spacingRhythm = pick('style.spacing.rhythm:')
  const spacingDensity = pick('style.spacing.density:')
  const ctaStyle = pick('style.cta.style:')
  const ctaProminence = pick('style.cta.prominence:')
  const radiusHint = pick('style.surfaces.radius:')
  const shadowHint = pick('style.surfaces.shadow:')
  const visualTone = pick('style.visual_tone:')

  return {
    kind: 'style_signal_model_v2',
    version: '2.0.0',
    sourceMode: sourceMode === 'computed_style' || sourceMode === 'mixed' || sourceMode === 'html_css_inference' ? sourceMode : 'html_css_inference',
    provenance: {
      sourceMode: sourceMode === 'computed_style' || sourceMode === 'mixed' || sourceMode === 'html_css_inference' ? sourceMode : 'html_css_inference',
      computedStyle: {
        used: sourceMode === 'computed_style' || sourceMode === 'mixed',
        sampleCount: 0,
        coverage: 0,
      },
      fallbackUsed: sourceMode !== 'computed_style',
      diagnostics: diagnostics.map((diag) => diag.code),
    },
    colors: {
      backgroundTone:
        backgroundTone === 'light' || backgroundTone === 'dark' || backgroundTone === 'mixed' || backgroundTone === 'unknown'
          ? backgroundTone
          : 'unknown',
      primaryAccent: (() => {
        const value = pick('style.primary_accent:')
        return value && value !== 'none' ? value : null
      })(),
      secondaryAccent: (() => {
        const value = pick('style.secondary_accent:')
        return value && value !== 'none' ? value : null
      })(),
      neutralPalette: [],
      ctaColorHint: null,
    },
    typography: {
      headingFontFamily: null,
      bodyFontFamily: null,
      headingCategory:
        headingCategory === 'sans' || headingCategory === 'serif' || headingCategory === 'display' || headingCategory === 'mono' || headingCategory === 'unknown'
          ? headingCategory
          : 'unknown',
      bodyCategory:
        bodyCategory === 'sans' || bodyCategory === 'serif' || bodyCategory === 'display' || bodyCategory === 'mono' || bodyCategory === 'unknown'
          ? bodyCategory
          : 'unknown',
      scaleHint: 'unknown',
      weightContrastHint: 'unknown',
    },
    spacing: {
      rhythm: spacingRhythm === 'tight' || spacingRhythm === 'balanced' || spacingRhythm === 'airy' || spacingRhythm === 'unknown' ? spacingRhythm : 'unknown',
      sectionSpacingHint: 'unknown',
      layoutDensity:
        spacingDensity === 'dense' || spacingDensity === 'balanced' || spacingDensity === 'airy' || spacingDensity === 'unknown'
          ? spacingDensity
          : 'unknown',
    },
    surfaces: {
      radiusHint: radiusHint === 'sharp' || radiusHint === 'rounded' || radiusHint === 'mixed' || radiusHint === 'unknown' ? radiusHint : 'unknown',
      shadowHint:
        shadowHint === 'flat' || shadowHint === 'soft' || shadowHint === 'elevated' || shadowHint === 'mixed' || shadowHint === 'unknown'
          ? shadowHint
          : 'unknown',
    },
    cta: {
      prominence:
        ctaProminence === 'low' || ctaProminence === 'medium' || ctaProminence === 'high' || ctaProminence === 'unknown'
          ? ctaProminence
          : 'unknown',
      styleHint:
        ctaStyle === 'text_link' || ctaStyle === 'outline_button' || ctaStyle === 'solid_button' || ctaStyle === 'mixed' || ctaStyle === 'unknown'
          ? ctaStyle
          : 'unknown',
    },
    visualToneHint:
      visualTone === 'minimal' || visualTone === 'editorial' || visualTone === 'corporate' || visualTone === 'playful' || visualTone === 'premium' || visualTone === 'unknown'
        ? visualTone
        : 'unknown',
    diagnostics,
  }
}

function parseImportProvenanceSummary(value: unknown): RuntimeImportProvenanceSummary | null {
  if (!isRecord(value)) return null
  if (normalizeText(value.kind) !== 'runtime_import_provenance_summary_v1') return null

  const sourceModeRaw = normalizeText(value.sourceMode)
  const captureModeRaw = normalizeText(value.captureMode)
  const fidelityStatusRaw = normalizeText(value.importFidelityStatus)
  const captureStatusRaw = normalizeText(value.renderedCaptureStatus)
  const domQualityRaw = normalizeText(value.renderedDomQuality)
  const fidelityScoreRaw = isRecord(value.importFidelityScore) ? value.importFidelityScore : null
  const screenshotCountRaw = Number(value.screenshotCount)
  const computedStyleSampleCountRaw = Number(value.computedStyleSampleCount)

  if (sourceModeRaw !== 'rendered_dom' && sourceModeRaw !== 'raw_html_fallback') return null
  if (fidelityStatusRaw !== 'high_fidelity_import' && fidelityStatusRaw !== 'degraded_import' && fidelityStatusRaw !== 'capture_failed') return null
  if (captureStatusRaw !== 'available' && captureStatusRaw !== 'partial' && captureStatusRaw !== 'failed' && captureStatusRaw !== 'unavailable') return null
  if (domQualityRaw !== 'strong' && domQualityRaw !== 'weak' && domQualityRaw !== 'unusable') return null
  if (!Number.isFinite(screenshotCountRaw) || !Number.isFinite(computedStyleSampleCountRaw)) return null

  const importDiagnosticCodes = Array.isArray(value.importDiagnosticCodes)
    ? value.importDiagnosticCodes.map((entry) => normalizeText(entry)).filter(Boolean)
    : []
  const renderedCapture = isRecord(value.renderedCapture) ? value.renderedCapture : null
  const captureEvidence = isRecord(value.captureEvidence) ? value.captureEvidence : null
  const screenshotPaths = Array.isArray(captureEvidence?.screenshotPaths)
    ? captureEvidence.screenshotPaths.map((entry) => normalizeText(entry)).filter(Boolean)
    : []
  const executionIdentity = isRecord(value.executionIdentity) ? value.executionIdentity : null
  const styleSignals = isRecord(value.styleSignals) ? (value.styleSignals as StyleSignalModel) : null
  const semanticImport = isRecord(value.semanticImport) ? (value.semanticImport as SemanticImportResult) : null
  const multipageImport = isRecord(value.multipageImport) ? value.multipageImport : null
  const multipageSummaryRaw = isRecord(multipageImport?.summary) ? multipageImport.summary : null
  const siteTreeRaw = isRecord(value.siteTree) ? value.siteTree : null
  const siteTreeSummaryRaw = isRecord(siteTreeRaw?.summary) ? siteTreeRaw.summary : null
  const templateFamiliesRaw = isRecord(value.templateFamilies) ? value.templateFamilies : null
  const templateFamiliesSummaryRaw = isRecord(templateFamiliesRaw?.summary) ? templateFamiliesRaw.summary : null
  const siteTreeSummary =
    siteTreeSummaryRaw &&
    normalizeText(siteTreeSummaryRaw.rootPageId) &&
    Number.isFinite(Number(siteTreeSummaryRaw.pageCount)) &&
    Number.isFinite(Number(siteTreeSummaryRaw.candidatePageCount)) &&
    Number.isFinite(Number(siteTreeSummaryRaw.internalLinkCount)) &&
    Number.isFinite(Number(siteTreeSummaryRaw.externalLinkCount)) &&
    Number.isFinite(Number(siteTreeSummaryRaw.ignoredLinkCount))
      ? {
          rootPageId: normalizeText(siteTreeSummaryRaw.rootPageId),
          pageCount: Math.max(0, Math.floor(Number(siteTreeSummaryRaw.pageCount))),
          candidatePageCount: Math.max(0, Math.floor(Number(siteTreeSummaryRaw.candidatePageCount))),
          internalLinkCount: Math.max(0, Math.floor(Number(siteTreeSummaryRaw.internalLinkCount))),
          externalLinkCount: Math.max(0, Math.floor(Number(siteTreeSummaryRaw.externalLinkCount))),
          ignoredLinkCount: Math.max(0, Math.floor(Number(siteTreeSummaryRaw.ignoredLinkCount))),
          diagnostics: Array.isArray(siteTreeSummaryRaw.diagnostics)
            ? [...new Set(siteTreeSummaryRaw.diagnostics.map((entry) => normalizeText(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
            : [],
          payloadPath: toTextOrNull(siteTreeSummaryRaw.payloadPath),
        }
      : null
  const multipageSummary =
    multipageSummaryRaw &&
    typeof multipageSummaryRaw.enabled === 'boolean' &&
    Number.isFinite(Number(multipageSummaryRaw.routeCount)) &&
    Number.isFinite(Number(multipageSummaryRaw.pageCount))
      ? {
          enabled: Boolean(multipageSummaryRaw.enabled),
          routeCount: Math.max(0, Math.floor(Number(multipageSummaryRaw.routeCount))),
          pageCount: Math.max(0, Math.floor(Number(multipageSummaryRaw.pageCount))),
          primaryNavigationCount: Number.isFinite(Number(multipageSummaryRaw.primaryNavigationCount))
            ? Math.max(0, Math.floor(Number(multipageSummaryRaw.primaryNavigationCount)))
            : 0,
          footerNavigationCount: Number.isFinite(Number(multipageSummaryRaw.footerNavigationCount))
            ? Math.max(0, Math.floor(Number(multipageSummaryRaw.footerNavigationCount)))
            : 0,
          sharedRegionCount: Number.isFinite(Number(multipageSummaryRaw.sharedRegionCount))
            ? Math.max(0, Math.floor(Number(multipageSummaryRaw.sharedRegionCount)))
            : 0,
          templateFamilyExtraction: (() => {
            const extractionRaw =
              multipageSummaryRaw && isRecord((multipageSummaryRaw as Record<string, unknown>).templateFamilyExtraction)
                ? ((multipageSummaryRaw as Record<string, unknown>).templateFamilyExtraction as Record<string, unknown>)
                : null
            if (!extractionRaw) {
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
              enabled: Boolean(extractionRaw.enabled),
              familyCount: Number.isFinite(Number(extractionRaw.familyCount)) ? Math.max(0, Math.floor(Number(extractionRaw.familyCount))) : 0,
              assignedRouteCount: Number.isFinite(Number(extractionRaw.assignedRouteCount))
                ? Math.max(0, Math.floor(Number(extractionRaw.assignedRouteCount)))
                : 0,
              singletonFamilyCount: Number.isFinite(Number(extractionRaw.singletonFamilyCount))
                ? Math.max(0, Math.floor(Number(extractionRaw.singletonFamilyCount)))
                : 0,
              mixedFamilyCount: Number.isFinite(Number(extractionRaw.mixedFamilyCount))
                ? Math.max(0, Math.floor(Number(extractionRaw.mixedFamilyCount)))
                : 0,
              listingDetailRelationshipCount: Number.isFinite(Number(extractionRaw.listingDetailRelationshipCount))
                ? Math.max(0, Math.floor(Number(extractionRaw.listingDetailRelationshipCount)))
                : 0,
              highConfidenceFamilyCount: Number.isFinite(Number(extractionRaw.highConfidenceFamilyCount))
                ? Math.max(0, Math.floor(Number(extractionRaw.highConfidenceFamilyCount)))
                : 0,
              diagnostics: Array.isArray(extractionRaw.diagnostics)
                ? [...new Set(extractionRaw.diagnostics.map((entry) => normalizeText(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
                : [],
            }
          })(),
          depthLimitHit: Boolean(multipageSummaryRaw.depthLimitHit),
          routeLimitHit: Boolean(multipageSummaryRaw.routeLimitHit),
          diagnostics: Array.isArray(multipageSummaryRaw.diagnostics)
            ? [...new Set(multipageSummaryRaw.diagnostics.map((entry) => normalizeText(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
            : [],
        }
      : null
  const templateFamiliesSummary =
    templateFamiliesSummaryRaw &&
    Number.isFinite(Number(templateFamiliesSummaryRaw.familyCount)) &&
    Number.isFinite(Number(templateFamiliesSummaryRaw.largestFamilySize)) &&
    Number.isFinite(Number(templateFamiliesSummaryRaw.orphanPageCount))
      ? {
          familyCount: Math.max(0, Math.floor(Number(templateFamiliesSummaryRaw.familyCount))),
          largestFamilySize: Math.max(0, Math.floor(Number(templateFamiliesSummaryRaw.largestFamilySize))),
          orphanPageCount: Math.max(0, Math.floor(Number(templateFamiliesSummaryRaw.orphanPageCount))),
          diagnostics: Array.isArray(templateFamiliesSummaryRaw.diagnostics)
            ? [...new Set(templateFamiliesSummaryRaw.diagnostics.map((entry) => normalizeText(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
            : [],
          payloadPath: toTextOrNull(templateFamiliesSummaryRaw.payloadPath),
        }
      : null
  const importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore'] =
    fidelityScoreRaw &&
    Number.isFinite(Number(fidelityScoreRaw.structureScore)) &&
    Number.isFinite(Number(fidelityScoreRaw.styleScore)) &&
    Number.isFinite(Number(fidelityScoreRaw.contentScore)) &&
    Number.isFinite(Number(fidelityScoreRaw.layoutScore)) &&
    Number.isFinite(Number(fidelityScoreRaw.overallScore)) &&
    (normalizeText(fidelityScoreRaw.fidelityLevel) === 'low' ||
      normalizeText(fidelityScoreRaw.fidelityLevel) === 'medium' ||
      normalizeText(fidelityScoreRaw.fidelityLevel) === 'high')
      ? {
          structureScore: Number(fidelityScoreRaw.structureScore),
          styleScore: Number(fidelityScoreRaw.styleScore),
          contentScore: Number(fidelityScoreRaw.contentScore),
          layoutScore: Number(fidelityScoreRaw.layoutScore),
          overallScore: Number(fidelityScoreRaw.overallScore),
          fidelityLevel: normalizeText(fidelityScoreRaw.fidelityLevel) as 'low' | 'medium' | 'high',
        }
      : null

  const renderedCaptureStatusNormalized: RuntimeImportProvenanceSummary['renderedCaptureStatus'] =
    captureStatusRaw === 'unavailable' ? 'failed' : (captureStatusRaw as RuntimeImportProvenanceSummary['renderedCaptureStatus'])
  const renderedCaptureSummary: RuntimeImportProvenanceSummary['renderedCapture'] = {
    used: Boolean(renderedCapture?.used),
    status:
      normalizeText(renderedCapture?.status) === 'available' ||
      normalizeText(renderedCapture?.status) === 'partial' ||
      normalizeText(renderedCapture?.status) === 'failed'
        ? (normalizeText(renderedCapture?.status) as RuntimeImportProvenanceSummary['renderedCapture']['status'])
        : renderedCaptureStatusNormalized,
    quality:
      normalizeText(renderedCapture?.quality) === 'strong' ||
      normalizeText(renderedCapture?.quality) === 'weak' ||
      normalizeText(renderedCapture?.quality) === 'unusable'
        ? (normalizeText(renderedCapture?.quality) as RuntimeImportProvenanceSummary['renderedCapture']['quality'])
        : (domQualityRaw as RuntimeImportProvenanceSummary['renderedCapture']['quality']),
    domLength: Number.isFinite(Number(renderedCapture?.domLength)) ? Math.max(0, Math.floor(Number(renderedCapture?.domLength))) : 0,
    nodeCount: Number.isFinite(Number(renderedCapture?.nodeCount)) ? Math.max(0, Math.floor(Number(renderedCapture?.nodeCount))) : 0,
    styleSampleCount: Number.isFinite(Number(renderedCapture?.styleSampleCount))
      ? Math.max(0, Math.floor(Number(renderedCapture?.styleSampleCount)))
      : Math.max(0, Math.floor(computedStyleSampleCountRaw)),
    styleCoverage: Number.isFinite(Number(renderedCapture?.styleCoverage)) ? Math.max(0, Number(renderedCapture?.styleCoverage)) : 0,
    screenshots: {
      viewport: Boolean(renderedCapture?.screenshots && isRecord(renderedCapture.screenshots) && renderedCapture.screenshots.viewport),
      fullPage: Boolean(renderedCapture?.screenshots && isRecord(renderedCapture.screenshots) && renderedCapture.screenshots.fullPage),
    },
    execution: {
      runtimeKind:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.runtimeKind : '') === 'nodejs' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.runtimeKind : '') === 'edge' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.runtimeKind : '') === 'unknown'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.runtimeKind : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['runtimeKind'])
          : 'unknown',
      environmentSupported:
        typeof (renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentSupported : null) === 'boolean'
          ? Boolean(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentSupported : false)
          : normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentStatus : '') === 'supported',
      browserPackageAvailable:
        typeof (renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserPackageAvailable : null) === 'boolean'
          ? Boolean(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserPackageAvailable : false)
          : normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentStatus : '') === 'supported',
      browserBinaryAvailable:
        typeof (renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserBinaryAvailable : null) === 'boolean'
          ? Boolean(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserBinaryAvailable : false)
          : normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentStatus : '') === 'supported',
      environmentStatus:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentStatus : '') === 'supported' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentStatus : '') === 'unsupported' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentStatus : '') === 'unknown'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.environmentStatus : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['environmentStatus'])
          : 'unknown',
      failureCategory:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.failureCategory : '') === 'environment' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.failureCategory : '') === 'page' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.failureCategory : '') === 'none'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.failureCategory : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['failureCategory'])
          : 'none',
      failureCode: toTextOrNull(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.failureCode : null),
      browserLaunch:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserLaunch : '') === 'not_attempted' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserLaunch : '') === 'succeeded' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserLaunch : '') === 'failed'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.browserLaunch : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['browserLaunch'])
          : 'not_attempted',
      navigation:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.navigation : '') === 'not_attempted' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.navigation : '') === 'succeeded' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.navigation : '') === 'failed'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.navigation : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['navigation'])
          : 'not_attempted',
      dom:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.dom : '') === 'not_attempted' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.dom : '') === 'captured' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.dom : '') === 'empty_or_failed'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.dom : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['dom'])
          : 'not_attempted',
      screenshot:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.screenshot : '') === 'none' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.screenshot : '') === 'captured'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.screenshot : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['screenshot'])
          : Boolean(renderedCapture?.screenshots && isRecord(renderedCapture.screenshots) && (renderedCapture.screenshots.viewport || renderedCapture.screenshots.fullPage))
            ? 'captured'
            : 'none',
      styleSampling:
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.styleSampling : '') === 'not_attempted' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.styleSampling : '') === 'captured' ||
        normalizeText(renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.styleSampling : '') === 'failed_or_empty'
          ? (normalizeText(
              renderedCapture?.execution && isRecord(renderedCapture.execution) ? renderedCapture.execution.styleSampling : '',
            ) as RuntimeImportProvenanceSummary['renderedCapture']['execution']['styleSampling'])
          : Number.isFinite(Number(renderedCapture?.styleSampleCount)) && Number(renderedCapture?.styleSampleCount) > 0
            ? 'captured'
            : 'not_attempted',
    },
  }
  const captureJobRaw = isRecord(value.captureJob) ? value.captureJob : null
  const captureJobStatusRaw = normalizeText(captureJobRaw?.status)
  const captureJobFailureClassRaw = normalizeText(captureJobRaw?.failureClass)
  const captureJob: RuntimeImportProvenanceSummary['captureJob'] =
    captureJobRaw == null
      ? null
      : {
          jobId: toTextOrNull(captureJobRaw.jobId),
          status:
            captureJobStatusRaw === 'queued' ||
            captureJobStatusRaw === 'running' ||
            captureJobStatusRaw === 'completed' ||
            captureJobStatusRaw === 'completed_partial' ||
            captureJobStatusRaw === 'failed_transient' ||
            captureJobStatusRaw === 'failed_terminal' ||
            captureJobStatusRaw === 'timed_out' ||
            captureJobStatusRaw === 'cancelled'
              ? (captureJobStatusRaw as NonNullable<RuntimeImportProvenanceSummary['captureJob']>['status'])
              : null,
          attemptCount: Number.isFinite(Number(captureJobRaw.attemptCount)) ? Math.max(0, Math.floor(Number(captureJobRaw.attemptCount))) : 0,
          maxAttempts: Number.isFinite(Number(captureJobRaw.maxAttempts)) ? Math.max(0, Math.floor(Number(captureJobRaw.maxAttempts))) : 0,
          failureClass:
            captureJobFailureClassRaw === 'transient' ||
            captureJobFailureClassRaw === 'terminal' ||
            captureJobFailureClassRaw === 'unsupported_environment' ||
            captureJobFailureClassRaw === 'timeout' ||
            captureJobFailureClassRaw === 'none'
              ? (captureJobFailureClassRaw as NonNullable<RuntimeImportProvenanceSummary['captureJob']>['failureClass'])
              : null,
          failureCode: toTextOrNull(captureJobRaw.failureCode),
          timeoutBudgetMs: Number.isFinite(Number(captureJobRaw.timeoutBudgetMs)) ? Math.max(0, Math.floor(Number(captureJobRaw.timeoutBudgetMs))) : null,
          createdAt: toTextOrNull(captureJobRaw.createdAt),
          startedAt: toTextOrNull(captureJobRaw.startedAt),
          completedAt: toTextOrNull(captureJobRaw.completedAt),
        }
  const workerHealthRaw = isRecord(value.workerHealth) ? value.workerHealth : null
  const workerHealthStatusRaw = normalizeText(workerHealthRaw?.status)
  const workerHealth: RuntimeImportProvenanceSummary['workerHealth'] =
    workerHealthRaw == null
      ? null
      : {
          enabled: Boolean(workerHealthRaw.enabled),
          reachable: Boolean(workerHealthRaw.reachable),
          browserAvailable: Boolean(workerHealthRaw.browserAvailable),
          queueHealthy: Boolean(workerHealthRaw.queueHealthy),
          status:
            workerHealthStatusRaw === 'healthy' ||
            workerHealthStatusRaw === 'disabled' ||
            workerHealthStatusRaw === 'misconfigured' ||
            workerHealthStatusRaw === 'unreachable' ||
            workerHealthStatusRaw === 'unauthorized' ||
            workerHealthStatusRaw === 'execution_failed' ||
            workerHealthStatusRaw === 'timed_out' ||
            workerHealthStatusRaw === 'unknown'
              ? (workerHealthStatusRaw as NonNullable<RuntimeImportProvenanceSummary['workerHealth']>['status'])
              : 'unknown',
          reason: toTextOrNull(workerHealthRaw.reason),
          lastSuccessAt: toTextOrNull(workerHealthRaw.lastSuccessAt),
          lastFailureAt: toTextOrNull(workerHealthRaw.lastFailureAt),
          lastFailureClass: toTextOrNull(workerHealthRaw.lastFailureClass),
          lastFailureCode: toTextOrNull(workerHealthRaw.lastFailureCode),
        }

  return {
    kind: 'runtime_import_provenance_summary_v1',
    executionIdentity: executionIdentity
      ? {
          snapshotId: normalizeText(executionIdentity.snapshotId),
          snapshotRunId: normalizeText(executionIdentity.snapshotRunId),
          snapshotStableRootDirAbs: normalizeText(executionIdentity.snapshotStableRootDirAbs),
          snapshotRunRootDirAbs: normalizeText(executionIdentity.snapshotRunRootDirAbs),
          requestId: toTextOrNull(executionIdentity.requestId),
        }
      : undefined,
    captureMode:
      captureModeRaw === 'raw_html_only' || captureModeRaw === 'dom_parsed' || captureModeRaw === 'rendered_browser'
        ? captureModeRaw
        : 'raw_html_only',
    sourceMode: sourceModeRaw,
    importFidelityStatus: fidelityStatusRaw,
    renderedCaptureStatus: renderedCaptureStatusNormalized,
    renderedDomQuality: domQualityRaw,
    importFidelityScore,
    screenshotCount: Math.max(0, Math.floor(screenshotCountRaw)),
    computedStyleSampleCount: Math.max(0, Math.floor(computedStyleSampleCountRaw)),
    renderedCapture: renderedCaptureSummary,
    importDiagnosticCodes: [...new Set(importDiagnosticCodes)].sort((a, b) => a.localeCompare(b)),
    captureEvidence: {
      selectedSourceHtmlPath: toTextOrNull(captureEvidence?.selectedSourceHtmlPath),
      responseHtmlPath: toTextOrNull(captureEvidence?.responseHtmlPath),
      entryHtmlPath: toTextOrNull(captureEvidence?.entryHtmlPath),
      renderedCaptureManifestPath: toTextOrNull(captureEvidence?.renderedCaptureManifestPath),
      acquisitionEvidencePath: toTextOrNull(captureEvidence?.acquisitionEvidencePath),
      renderedDomPath: toTextOrNull(captureEvidence?.renderedDomPath),
      computedStylesPath: toTextOrNull(captureEvidence?.computedStylesPath),
      renderedViewportScreenshotPath: toTextOrNull(captureEvidence?.renderedViewportScreenshotPath),
      renderedFullpageScreenshotPath: toTextOrNull(captureEvidence?.renderedFullpageScreenshotPath),
      screenshotPaths: [...new Set(screenshotPaths)].sort((a, b) => a.localeCompare(b)),
    },
    captureJob,
    workerHealth,
    styleSignals,
    semanticImport,
    multipageImport: multipageSummary ? { summary: multipageSummary, tree: null } : null,
    siteTree: siteTreeSummary ? { summary: siteTreeSummary, tree: null } : null,
    templateFamilies: templateFamiliesSummary ? { summary: templateFamiliesSummary, families: null } : null,
  }
}

function parseImportFidelity(input: {
  pageRows: RuntimePageVersionRow[]
  runtimeVersion: RuntimeVersionRow | null
  renderJobFallback?: SiteRenderJobRow | null
}): {
  sourceMode: SiteWorkspaceReadModel['pipeline']['sourceMode']
  captureMode: SiteWorkspaceReadModel['pipeline']['captureMode']
  importFidelityStatus: SiteWorkspaceReadModel['pipeline']['importFidelityStatus']
  renderedCaptureStatus: SiteWorkspaceReadModel['pipeline']['renderedCaptureStatus']
  renderedDomQuality: SiteWorkspaceReadModel['pipeline']['renderedDomQuality']
  importFidelityScore: RuntimeImportProvenanceSummary['importFidelityScore']
  screenshotCount: number
  computedStyleSampleCount: number
  renderedCapture: RuntimeImportProvenanceSummary['renderedCapture'] | null
  styleSignalCoverage: number
  styleSignalFallbackUsed: boolean
  styleSignalSourceMode: StyleSignalModel['sourceMode'] | 'unknown'
  evidencePaths: SiteWorkspaceReadModel['pipeline']['evidencePaths']
  evidenceDiagnostics: string[]
  importDiagnosticCodes: string[]
  captureEvidenceRefs: string[]
  captureJob: RuntimeImportProvenanceSummary['captureJob'] | null
  workerHealth: RuntimeImportProvenanceSummary['workerHealth'] | null
  captureFallbackReason: string | null
  styleSignals: StyleSignalModel | null
  semanticImport: SemanticImportResult | null
  multipageImportSummary: RuntimeImportProvenanceSummary['multipageImport'] extends { summary: infer T } | null | undefined ? T | null : null
  siteTreeSummary: RuntimeImportProvenanceSummary['siteTree'] extends { summary: infer T } | null | undefined ? T | null : null
  templateFamiliesSummary: RuntimeImportProvenanceSummary['templateFamilies'] extends { summary: infer T } | null | undefined ? T | null : null
} {
  const parsedFromSignals = parseImportFidelitySignals(input.pageRows)
  const parsedSummary = parseImportProvenanceSummary(input.runtimeVersion?.import_provenance_summary ?? null)
  const fallbackUsedFromFidelity = (fidelity: SiteWorkspaceReadModel['pipeline']['importFidelityStatus']): boolean =>
    fidelity === 'degraded_import' || fidelity === 'capture_failed'

  if (!parsedSummary) {
    const fallbackRenderJob = input.renderJobFallback ?? null
    if (fallbackRenderJob && normalizeText(fallbackRenderJob.status).toLowerCase() === 'completed') {
      const domNodeCount = toNonNegativeInt(fallbackRenderJob.dom_node_count)
      const screenshotCount = toNonNegativeInt(fallbackRenderJob.screenshot_count)
      const computedStyleSampleCount = toNonNegativeInt(fallbackRenderJob.computed_style_sample_count)
      const sourceMode: SiteWorkspaceReadModel['pipeline']['sourceMode'] =
        domNodeCount > 0 || screenshotCount > 0 ? 'rendered_dom' : 'raw_html_fallback'
      const renderedCaptureStatus: SiteWorkspaceReadModel['pipeline']['renderedCaptureStatus'] =
        domNodeCount > 0 ? (screenshotCount > 0 ? 'available' : 'partial') : (screenshotCount > 0 ? 'partial' : 'failed')
      const renderedDomQuality: SiteWorkspaceReadModel['pipeline']['renderedDomQuality'] =
        domNodeCount >= 12 ? 'strong' : (domNodeCount >= 3 ? 'weak' : 'unusable')
      const importFidelityStatus: SiteWorkspaceReadModel['pipeline']['importFidelityStatus'] =
        sourceMode === 'rendered_dom'
          ? (renderedCaptureStatus === 'available' && renderedDomQuality === 'strong' ? 'high_fidelity_import' : 'degraded_import')
          : 'capture_failed'
      const inferredStyleSignals = parseStyleSignalsFromSemanticLabels(input.pageRows)
      const captureEvidenceRefs = [
        toTextOrNull(fallbackRenderJob.rendered_dom_path),
        toTextOrNull(fallbackRenderJob.computed_styles_path),
        toTextOrNull(fallbackRenderJob.acquisition_evidence_path),
      ].filter((value): value is string => Boolean(value))

      return {
        sourceMode,
        captureMode: 'raw_html_only',
        importFidelityStatus,
        renderedCaptureStatus,
        renderedDomQuality,
        importFidelityScore: parsedFromSignals.importFidelityScore,
        screenshotCount,
        computedStyleSampleCount,
        renderedCapture: {
          used: sourceMode === 'rendered_dom',
          status: renderedCaptureStatus,
          quality: renderedDomQuality,
          domLength: domNodeCount,
          nodeCount: domNodeCount,
          styleSampleCount: computedStyleSampleCount,
          styleCoverage: Number((Math.max(0, computedStyleSampleCount) / 10).toFixed(3)),
          screenshots: {
            viewport: screenshotCount > 0,
            fullPage: screenshotCount > 1,
          },
          execution: {
            runtimeKind: 'nodejs',
            environmentSupported: true,
            browserPackageAvailable: true,
            browserBinaryAvailable: true,
            environmentStatus: 'supported',
            failureCategory: renderedCaptureStatus === 'failed' ? 'page' : 'none',
            failureCode: renderedCaptureStatus === 'failed' ? 'SITE_RENDER_CAPTURE_MISSING_RENDERED_TRUTH' : null,
            browserLaunch: renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded',
            navigation: renderedCaptureStatus === 'failed' ? 'failed' : 'succeeded',
            dom: domNodeCount > 0 ? 'captured' : 'empty_or_failed',
            screenshot: screenshotCount > 0 ? 'captured' : 'none',
            styleSampling: computedStyleSampleCount > 0 ? 'captured' : 'failed_or_empty',
          },
        },
        styleSignalCoverage: inferredStyleSignals?.provenance.computedStyle.coverage ?? 0,
        styleSignalFallbackUsed: inferredStyleSignals?.provenance.fallbackUsed ?? fallbackUsedFromFidelity(importFidelityStatus),
        styleSignalSourceMode: inferredStyleSignals?.sourceMode ?? 'unknown',
        evidencePaths: {
          renderedDomPath: toTextOrNull(fallbackRenderJob.rendered_dom_path),
          computedStylesPath: toTextOrNull(fallbackRenderJob.computed_styles_path),
          acquisitionEvidencePath: toTextOrNull(fallbackRenderJob.acquisition_evidence_path),
          renderedCaptureManifestPath: null,
          renderedViewportScreenshotPath: screenshotCount > 0 ? 'site-render:viewport' : null,
          renderedFullpageScreenshotPath: screenshotCount > 1 ? 'site-render:fullpage' : null,
        },
        evidenceDiagnostics: [
          'SITE_RENDER_CAPTURE_COMPLETED',
          ...(sourceMode === 'rendered_dom' ? ['READMODEL_RENDERED_TRUTH_FROM_RENDER_JOB'] : ['NO_USABLE_RENDERED_RUN_FOUND']),
        ],
        importDiagnosticCodes: sourceMode === 'rendered_dom' ? ['CAPTURE_WORKER_RESULT_SELECTED'] : ['NO_USABLE_RENDERED_RUN_FOUND'],
        captureEvidenceRefs,
        captureJob: null,
        workerHealth: null,
        captureFallbackReason: sourceMode === 'rendered_dom' ? null : 'rendered_capture_unusable',
        styleSignals: inferredStyleSignals,
        semanticImport: null,
        multipageImportSummary: null,
        siteTreeSummary: null,
        templateFamiliesSummary: null,
      }
    }

    const inferredStyleSignals = parseStyleSignalsFromSemanticLabels(input.pageRows)
    return {
      ...parsedFromSignals,
      captureMode: 'unknown',
      renderedCapture: null,
      importFidelityScore: parsedFromSignals.importFidelityScore,
      styleSignalCoverage: inferredStyleSignals?.provenance.computedStyle.coverage ?? 0,
      styleSignalFallbackUsed: inferredStyleSignals?.provenance.fallbackUsed ?? fallbackUsedFromFidelity(parsedFromSignals.importFidelityStatus),
      styleSignalSourceMode: inferredStyleSignals?.sourceMode ?? 'unknown',
      evidencePaths: {
        renderedDomPath: null,
        computedStylesPath: null,
        acquisitionEvidencePath: null,
        renderedCaptureManifestPath: null,
        renderedViewportScreenshotPath: null,
        renderedFullpageScreenshotPath: null,
      },
      evidenceDiagnostics: [],
      captureEvidenceRefs: [],
      captureJob: null,
      workerHealth: null,
      captureFallbackReason: null,
      styleSignals: inferredStyleSignals,
      semanticImport: null,
      multipageImportSummary: null,
      siteTreeSummary: null,
      templateFamiliesSummary: null,
    }
  }

  const importDiagnosticCodes = [...new Set([...parsedFromSignals.importDiagnosticCodes, ...parsedSummary.importDiagnosticCodes])]
    .sort((a, b) => a.localeCompare(b))

  const captureEvidenceRefs = [
    parsedSummary.executionIdentity?.snapshotRunRootDirAbs ?? null,
    parsedSummary.captureEvidence.selectedSourceHtmlPath,
    parsedSummary.captureEvidence.responseHtmlPath,
    parsedSummary.captureEvidence.entryHtmlPath,
    parsedSummary.captureEvidence.renderedCaptureManifestPath,
    parsedSummary.captureEvidence.acquisitionEvidencePath,
    ...parsedSummary.captureEvidence.screenshotPaths,
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 10)
  const styleSignals = parsedSummary.styleSignals ?? parseStyleSignalsFromSemanticLabels(input.pageRows)
  const resolveCaptureFallbackReason = (): string | null => {
    if (parsedSummary.sourceMode !== 'raw_html_fallback') return null

    const job = parsedSummary.captureJob
    const workerHealth = parsedSummary.workerHealth
    const failureCode = normalizeText(job?.failureCode).toUpperCase()
    const executionTimedOut =
      failureCode === 'RENDERED_CAPTURE_TIMEOUT' ||
      (job?.status === 'timed_out' && workerHealth?.status === 'timed_out' && workerHealth.reachable)
    const transportTimedOut =
      failureCode === 'CAPTURE_JOB_TIMED_OUT' ||
      (job?.status === 'timed_out' && workerHealth?.status === 'timed_out' && !workerHealth.reachable)
    if (
      executionTimedOut ||
      (job?.failureClass === 'timeout' && workerHealth?.reachable === true) ||
      importDiagnosticCodes.includes('RENDERED_CAPTURE_TIMEOUT') ||
      (importDiagnosticCodes.includes('CAPTURE_JOB_TIMED_OUT') && workerHealth?.reachable === true)
    ) {
      return 'capture_timed_out'
    }
    if (transportTimedOut) return 'worker_timeout'
    if (job?.status === 'failed_terminal') return 'capture_failed_terminal'
    if (job?.status === 'failed_transient') return 'capture_failed_transient'
    if (workerHealth?.enabled === false) return 'worker_disabled'
    if (workerHealth?.status === 'misconfigured') return 'worker_not_configured'
    if (workerHealth?.status === 'unauthorized') return 'worker_unauthorized'
    if (workerHealth?.status === 'timed_out') return 'worker_timeout'
    if (workerHealth?.status === 'unreachable') return 'worker_unreachable'
    if (workerHealth?.status === 'execution_failed') return 'worker_execution_failed'
    return 'rendered_capture_unusable'
  }

  const evidenceDiagnostics = [...new Set([
    ...importDiagnosticCodes.filter((code) => code.startsWith('ENTRY_FETCH_')),
    ...importDiagnosticCodes.filter(
      (code) =>
        code.startsWith('CAPTURE_JOB_') ||
        code.startsWith('CAPTURE_WORKER_') ||
        code.startsWith('RENDERED_CAPTURE_') ||
        code === 'ENVIRONMENT_UNSUPPORTED' ||
        code.endsWith('_FAILED') ||
        code.endsWith('_SUCCEEDED') ||
        code.endsWith('_STARTED') ||
        code.endsWith('_COMPLETED'),
    ),
    ...(styleSignals?.diagnostics ?? []).map((diag) => diag.code).filter((code) => code.startsWith('STYLE_SIGNAL_') || code === 'STYLE_SAMPLE_LOW_COVERAGE'),
    ...(parsedSummary.sourceMode === 'rendered_dom' ? ['CAPTURE_WORKER_RESULT_SELECTED', 'READMODEL_SELECTED_RENDERED_CAPTURE'] : []),
    ...(parsedSummary.sourceMode === 'rendered_dom' && parsedSummary.renderedCapture.status === 'available'
      ? ['RENDERED_CAPTURE_SELECTED_AS_PRIMARY']
      : []),
    ...(parsedSummary.sourceMode === 'raw_html_fallback' &&
    (importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_OVERRIDDEN_BY_FALLBACK') ||
      importDiagnosticCodes.includes('CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK'))
      ? ['CAPTURE_WORKER_RESULT_SUPERSEDED_BY_FALLBACK']
      : []),
  ])].sort((a, b) => a.localeCompare(b))

  return {
    sourceMode: parsedSummary.sourceMode,
    captureMode: parsedSummary.captureMode ?? 'raw_html_only',
    importFidelityStatus: parsedSummary.importFidelityStatus,
    renderedCaptureStatus: parsedSummary.renderedCaptureStatus,
    renderedDomQuality: parsedSummary.renderedDomQuality,
    importFidelityScore: parsedSummary.importFidelityScore ?? parsedFromSignals.importFidelityScore ?? null,
    screenshotCount: parsedSummary.screenshotCount,
    computedStyleSampleCount: parsedSummary.computedStyleSampleCount,
    renderedCapture: parsedSummary.renderedCapture,
    styleSignalCoverage: styleSignals?.provenance.computedStyle.coverage ?? parsedSummary.renderedCapture.styleCoverage ?? 0,
    styleSignalFallbackUsed: styleSignals?.provenance.fallbackUsed ?? fallbackUsedFromFidelity(parsedSummary.importFidelityStatus),
    styleSignalSourceMode: styleSignals?.sourceMode ?? 'unknown',
    evidencePaths: {
      renderedDomPath: parsedSummary.captureEvidence.renderedDomPath,
      computedStylesPath: parsedSummary.captureEvidence.computedStylesPath,
      acquisitionEvidencePath: parsedSummary.captureEvidence.acquisitionEvidencePath,
      renderedCaptureManifestPath: parsedSummary.captureEvidence.renderedCaptureManifestPath,
      renderedViewportScreenshotPath: parsedSummary.captureEvidence.renderedViewportScreenshotPath,
      renderedFullpageScreenshotPath: parsedSummary.captureEvidence.renderedFullpageScreenshotPath,
    },
    evidenceDiagnostics,
    importDiagnosticCodes,
    captureEvidenceRefs,
    captureJob: parsedSummary.captureJob ?? null,
    workerHealth: parsedSummary.workerHealth ?? null,
    captureFallbackReason: resolveCaptureFallbackReason(),
    styleSignals,
    semanticImport: parsedSummary.semanticImport ?? null,
    multipageImportSummary: parsedSummary.multipageImport?.summary ?? null,
    siteTreeSummary: parsedSummary.siteTree?.summary ?? null,
    templateFamiliesSummary: parsedSummary.templateFamilies?.summary ?? null,
  }
}

function parsePreviewRuntimeSummary(value: unknown): PreviewRuntimeSummary | null {
  if (!isRecord(value)) return null
  const mode = normalizePreviewRuntimeMode(value.previewMode)
  if (!mode) return null
  const diagnostics = Array.isArray(value.previewDiagnostics) ? value.previewDiagnostics.map((entry) => normalizeText(entry)).filter(Boolean) : []
  const familyRenderModeRaw = normalizeText(value.familyRenderMode)
  const familyRenderMode =
    familyRenderModeRaw === 'family_primary' || familyRenderModeRaw === 'hybrid_family_page' || familyRenderModeRaw === 'page_fallback'
      ? familyRenderModeRaw
      : null
  const familyRenderDiagnostics = Array.isArray(value.familyRenderDiagnostics)
    ? [...new Set(value.familyRenderDiagnostics.map((entry) => normalizeText(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    : []
  const familyRenderUsed = familyRenderMode === 'family_primary' || familyRenderMode === 'hybrid_family_page'
  const familyRenderFallbackToPage = familyRenderMode === 'page_fallback' ? true : Boolean(value.familyRenderFallbackToPage)

  return {
    previewMode: mode,
    rendererContractAvailable: Boolean(value.rendererContractAvailable),
    finalSiteModelAvailable: Boolean(value.finalSiteModelAvailable),
    familyRenderUsed,
    familyRenderFamilyId: toTextOrNull(value.familyRenderFamilyId),
    familyRenderMode,
    familyRenderFallbackToPage,
    familyRenderDiagnosticsCount: familyRenderDiagnostics.length,
    familyRenderDiagnostics,
    renderedWithFallback: Boolean(value.renderedWithFallback),
    matchedPageId: toTextOrNull(value.matchedPageId),
    contentResolutionApplied: Boolean(value.contentResolutionApplied),
    resolvedContentCount: Number.isFinite(Number(value.resolvedContentCount)) ? Number(value.resolvedContentCount) : 0,
    unresolvedContentCount: Number.isFinite(Number(value.unresolvedContentCount)) ? Number(value.unresolvedContentCount) : 0,
    contentResolutionDegraded: Boolean(value.contentResolutionDegraded),
    contentResolutionDiagnostics: Array.isArray(value.contentResolutionDiagnostics)
      ? [...new Set(value.contentResolutionDiagnostics.map((entry) => normalizeText(entry)).filter(Boolean))].sort((a, b) => a.localeCompare(b))
      : [],
    previewDiagnostics: [...new Set(diagnostics)].sort((a, b) => a.localeCompare(b)),
    semanticSectionCount: Number.isFinite(Number(value.semanticSectionCount)) ? Number(value.semanticSectionCount) : undefined,
    semanticImageCount: Number.isFinite(Number(value.semanticImageCount)) ? Number(value.semanticImageCount) : undefined,
    semanticCtaCount: Number.isFinite(Number(value.semanticCtaCount)) ? Number(value.semanticCtaCount) : undefined,
  }
}

export function resolveSelectedRuntimeVersionIdForWorkspace(input: {
  latestRuntimeSiteVersionId: string | null
  availableRuntimeSiteVersionIds?: string[] | null
  normalizedVariants: Array<{
    id: string
    siteVersionId: string | null
  }>
  selectedVariantId?: string | null
}): {
  selectedRuntimeSiteVersionId: string | null
  selectedVariant: {
    id: string
    siteVersionId: string | null
  } | null
} {
  const selectedVariantId = toTextOrNull(input.selectedVariantId)
  const selectedVariant = selectedVariantId
    ? input.normalizedVariants.find((variant) => variant.id === selectedVariantId) ?? null
    : null
  const availableRuntimeSiteVersionIds = new Set(
    (input.availableRuntimeSiteVersionIds ?? [])
      .map((value) => toTextOrNull(value))
      .filter((value): value is string => Boolean(value)),
  )
  const selectedVariantSiteVersionId = selectedVariant?.siteVersionId ?? null
  const selectedVariantVersionIsAvailable =
    selectedVariantSiteVersionId != null &&
    (availableRuntimeSiteVersionIds.size === 0 || availableRuntimeSiteVersionIds.has(selectedVariantSiteVersionId))

  return {
    selectedRuntimeSiteVersionId: selectedVariantVersionIsAvailable
      ? selectedVariantSiteVersionId
      : (input.latestRuntimeSiteVersionId ?? null),
    selectedVariant,
  }
}

export async function getSiteWorkspaceReadModelForPage(input: {
  agencyId: string
  clientId: string
  siteId: string
  selectedVariantId?: string | null
}): Promise<SiteWorkspaceReadModel | null> {
  const agencyId = normalizeUuid(input.agencyId, 'agencyId')
  const clientId = normalizeUuid(input.clientId, 'clientId')
  const siteId = normalizeUuid(input.siteId, 'siteId')
  const selectedVariantId = toTextOrNull(input.selectedVariantId)

  const supabase = await getSupabaseServerClientReadOnly()

  const [clientOrgResult, siteResult, siteOptionsResult, siteActionsResult, siteVariantsResult] = await Promise.all([
    supabase.from('organizations').select('id,name,agency_id,organization_type').eq('id', clientId).limit(1).maybeSingle(),
    supabase.from('sites').select('id,org_id,agency_id,template_id,name,status,domain,created_at,updated_at').eq('id', siteId).limit(1).maybeSingle(),
    supabase
      .from('sites')
      .select('id,org_id,agency_id,template_id,name,status,domain,created_at,updated_at')
      .eq('org_id', clientId)
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(120),
    supabase
      .from('gnr8_site_actions')
      .select('id,site_id,type,status,strategy,result_summary,diagnostics,variant_id,created_at,completed_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('gnr8_site_variants')
      .select('id,site_id,label,strategy,site_version_id,created_at')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(40),
  ])

  if (clientOrgResult.error) {
    throw new Error(`Client organization lookup failed: ${clientOrgResult.error.message}`)
  }
  if (siteResult.error) {
    throw new Error(`Site lookup failed: ${siteResult.error.message}`)
  }

  const clientOrg = (clientOrgResult.data as ClientOrganizationRow | null) ?? null
  const siteRow = (siteResult.data as RawSiteRow | null) ?? null

  if (!siteRow) return null

  assertSiteWorkspaceScope({
    clientOrg,
    site: siteRow,
    expectedAgencyId: agencyId,
    expectedClientId: clientId,
    expectedSiteId: siteId,
  })

  const site = toSiteEntity(siteRow)
  if (!site) return null

  const siteOptionsRows = Array.isArray(siteOptionsResult.data) ? (siteOptionsResult.data as RawSiteRow[]) : []
  const siteOptions = siteOptionsRows
    .map((row) => toSiteEntity(row))
    .filter((entity): entity is SiteEntity => entity != null)
    .map((entity) => ({
      siteId: entity.id,
      label: entity.label,
    }))

  const rawSiteActions = !siteActionsResult.error && Array.isArray(siteActionsResult.data)
    ? (siteActionsResult.data as SiteActionRow[])
    : []
  const normalizedSiteActions = rawSiteActions
    .map((row) => ({
      actionId: toTextOrNull(row.id),
      type: normalizeSiteActionType(toTextOrNull(row.type)),
      status: normalizeSiteActionStatus(toTextOrNull(row.status)),
      strategy: toTextOrNull(row.strategy),
      resultSummary: toTextOrNull(row.result_summary),
      diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics.map((value) => normalizeText(value)).filter(Boolean) : [],
      variantId: toTextOrNull(row.variant_id),
      createdAt: toIsoOrNull(row.created_at),
      completedAt: toIsoOrNull(row.completed_at),
    }))
    .filter((row) => row.actionId && row.type && row.status)

  const rawSiteVariants = !siteVariantsResult.error && Array.isArray(siteVariantsResult.data)
    ? (siteVariantsResult.data as SiteVariantRow[])
    : []
  const normalizedVariants = rawSiteVariants
    .map((row) => ({
      id: toTextOrNull(row.id),
      label: toTextOrNull(row.label),
      strategy: toTextOrNull(row.strategy),
      siteVersionId: toTextOrNull(row.site_version_id),
      createdAt: toIsoOrNull(row.created_at),
    }))
    .filter((row) => row.id && row.label && row.strategy && row.createdAt)

  const normalizedVariantsForSelection = normalizedVariants.map((variant) => ({
    id: variant.id!,
    siteVersionId: variant.siteVersionId,
  }))

  const [runtimeResult, bootstrapJobResult, renderJobsResult] = await Promise.all([
    supabase
      .from('gnr8_runtime_site_versions')
      .select('id,site_id,ownership_site_id,state,version_no,import_provenance_summary,artifact_id,updated_at,created_at')
      .eq('ownership_site_id', siteId),
    supabase
      .from('gnr8_site_bootstrap_jobs')
      .select('site_id,status,runtime_site_id,runtime_site_version_id,artifact_id,section_count,updated_at,completed_at')
      .eq('site_id', siteId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('gnr8_site_render_jobs')
      .select('runtime_site_version_id,runtime_site_id,site_id,status,rendered_dom_path,computed_styles_path,acquisition_evidence_path,screenshot_count,computed_style_sample_count,dom_node_count,updated_at,completed_at')
      .eq('site_id', siteId)
      .order('updated_at', { ascending: false })
      .limit(20),
  ])

  const runtimeRowsDirect = !runtimeResult.error && Array.isArray(runtimeResult.data)
    ? (runtimeResult.data as RuntimeVersionRow[])
    : []
  const bootstrapJob = !bootstrapJobResult.error ? ((bootstrapJobResult.data as SiteBootstrapJobRow | null) ?? null) : null
  const renderJobs = !renderJobsResult.error && Array.isArray(renderJobsResult.data)
    ? (renderJobsResult.data as SiteRenderJobRow[])
    : []
  const syntheticRuntimeRows = synthesizeRuntimeVersionRowsFromWorkerJobs({
    siteId,
    bootstrapJob,
    renderJobs,
    runtimeRows: runtimeRowsDirect,
  })
  const runtimeRowsById = new Map<string, RuntimeVersionRow>()
  for (const row of [...runtimeRowsDirect, ...syntheticRuntimeRows]) {
    const id = toTextOrNull(row.id)
    if (!id) continue
    if (!runtimeRowsById.has(id)) runtimeRowsById.set(id, row)
  }
  const runtimeRows = [...runtimeRowsById.values()]

  console.info('[site-workspace] SITE_OVERVIEW_RUNTIME_VERSION_RESOLUTION', {
    siteId,
    runtimeRowsByOwnershipCount: runtimeRowsDirect.length,
    syntheticRuntimeRowsCount: syntheticRuntimeRows.length,
    bootstrapJobStatus: normalizeText(bootstrapJob?.status) || null,
    bootstrapRuntimeSiteVersionId: toTextOrNull(bootstrapJob?.runtime_site_version_id),
    renderJobCount: renderJobs.length,
    renderCompletedCount: renderJobs.filter((row) => normalizeText(row.status).toLowerCase() === 'completed').length,
    runtimeQueryError: runtimeResult.error?.message ?? null,
    bootstrapQueryError: bootstrapJobResult.error?.message ?? null,
    renderQueryError: renderJobsResult.error?.message ?? null,
  })

  const runtimeArbitration = selectPrimaryRuntimeVersionRow(runtimeRows)
  const latestRuntimeRow = runtimeArbitration.selected
  const runtimeArbitrationDiagnostics = [...new Set(runtimeArbitration.diagnostics)].sort((a, b) => a.localeCompare(b))
  const runtimeSnapshot: RuntimeSnapshot | null = latestRuntimeRow
    ? {
        latestRuntimeSiteVersionId: toTextOrNull(latestRuntimeRow.id),
        latestRuntimeState: toTextOrNull(latestRuntimeRow.state),
        latestRuntimeVersionNo: Number(latestRuntimeRow.version_no ?? 0),
        latestRuntimeUpdatedAt: toIsoOrNull(latestRuntimeRow.updated_at),
        latestRuntimeCreatedAt: toIsoOrNull(latestRuntimeRow.created_at),
        hasPublishedRuntimeVersion: runtimeRows.some((row) => normalizeText(row.state).toUpperCase() === 'PUBLISHED'),
      }
    : null

  const latestRuntimeSiteVersionId = runtimeSnapshot?.latestRuntimeSiteVersionId ?? null
  const availableRuntimeSiteVersionIds = runtimeRows
    .map((row) => toTextOrNull(row.id))
    .filter((value): value is string => Boolean(value))
  const selectedResolution = resolveSelectedRuntimeVersionIdForWorkspace({
    latestRuntimeSiteVersionId,
    availableRuntimeSiteVersionIds,
    normalizedVariants: normalizedVariantsForSelection,
    selectedVariantId,
  })
  const selectedRuntimeSiteVersionId = selectedResolution.selectedRuntimeSiteVersionId
  const selectedVariant =
    selectedResolution.selectedVariant == null
      ? null
      : normalizedVariants.find((variant) => variant.id === selectedResolution.selectedVariant?.id) ?? null
  const selectedRuntimeRow = runtimeRows.find((row) => toTextOrNull(row.id) === selectedRuntimeSiteVersionId) ?? null
  const selectedRuntimeSiteId = toTextOrNull(selectedRuntimeRow?.site_id) ?? toTextOrNull(latestRuntimeRow?.site_id)
  let domainBinding: SiteWorkspaceReadModel['settings']['domainBinding'] = null
  if (selectedRuntimeSiteId && site.domain) {
    const domainBindingResult = await supabase
      .from('gnr8_runtime_domain_host_bindings')
      .select('id,site_id,site_version_id,domain,status,verification_type,verification_value,verification_host,last_checked_at,updated_at')
      .eq('site_id', selectedRuntimeSiteId)
      .eq('domain', site.domain)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!domainBindingResult.error && domainBindingResult.data) {
      const row = domainBindingResult.data as RuntimeDomainHostBindingRow
      const status = toTextOrNull(row.status)
      const verificationType = toTextOrNull(row.verification_type)
      if (row.id && row.domain && (status === 'pending' || status === 'verifying' || status === 'active' || status === 'failed')) {
        domainBinding = {
          id: row.id,
          domain: row.domain,
          status,
          verificationType: verificationType === 'cname' || verificationType === 'txt' ? verificationType : null,
          verificationValue: toTextOrNull(row.verification_value),
          verificationHost: toTextOrNull(row.verification_host),
          lastCheckedAt: toIsoOrNull(row.last_checked_at),
        }
      }
    }
  }
  const selectedRenderJobFallback = selectedRuntimeSiteVersionId
    ? (
        renderJobs.find(
          (row) =>
            toTextOrNull(row.runtime_site_version_id) === selectedRuntimeSiteVersionId &&
            normalizeText(row.status).toLowerCase() === 'completed',
        ) ?? null
      )
    : (
        renderJobs.find((row) => normalizeText(row.status).toLowerCase() === 'completed') ?? null
      )
  const selectedRuntimeState = toTextOrNull(selectedRuntimeRow?.state) ?? runtimeSnapshot?.latestRuntimeState ?? null
  let pageRows: RuntimePageVersionRow[] = []

  if (selectedRuntimeSiteVersionId) {
    const pageResult = await supabase
      .from('gnr8_runtime_page_versions')
      .select('id,site_version_id,page_id,path,title,structure_model,content_model,semantic_signals,migration_governance')
      .eq('site_version_id', selectedRuntimeSiteVersionId)
      .order('path', { ascending: true })

    if (!pageResult.error && Array.isArray(pageResult.data)) {
      pageRows = pageResult.data as RuntimePageVersionRow[]
    }
  }

  const structureRows = parseStructureRows(pageRows)
  const sectionsDetected = structureRows.length
  const heroDetected = structureRows.some((row) => row.sectionType.toLowerCase().includes('hero'))
  const ctaDetected = structureRows.some(
    (row) => row.sectionType.toLowerCase().includes('cta') || row.sectionType.toLowerCase().includes('contact'),
  )
  const captureLiftDiagnostics = Array.from(
    new Set(
      structureRows
        .flatMap((row) => row.keyDiagnostics)
        .filter((code) => code.startsWith('CAPTURE_DRIVEN_')),
    ),
  ).sort((a, b) => a.localeCompare(b))
  const captureDrivenLiftApplied = captureLiftDiagnostics.length > 0
  const designStrategy = inferDesignStrategy(structureRows)

  const aiSuggestionStatus = inferAiSuggestionStatus(pageRows)
  const visualDensity: SiteWorkspaceReadModel['design']['visualSignals']['visualDensity'] =
    sectionsDetected >= 9 ? 'high' : sectionsDetected >= 5 ? 'medium' : 'low'
  const heroProminence: SiteWorkspaceReadModel['design']['visualSignals']['heroProminence'] =
    heroDetected ? (structureRows.find((row) => row.sectionType.toLowerCase().includes('hero'))?.ordinalIndex === 0 ? 'high' : 'medium') : 'low'
  const ctaProminence: SiteWorkspaceReadModel['design']['visualSignals']['ctaProminence'] = ctaDetected
    ? designStrategy === 'cta_focused'
      ? 'high'
      : 'medium'
    : 'low'

  const sectionDecisions: DesignDecisionRow[] = structureRows.map((row) => ({
    sectionId: row.sectionId,
    sectionType: row.sectionType,
    visualTreatment: inferVisualTreatment(row.sectionType),
    rationale: [
      `Section type '${row.sectionType}' maps to '${inferVisualTreatment(row.sectionType)}' treatment.`,
      `Structural confidence is '${row.confidenceLabel}' (${row.confidenceScore.toFixed(2)}).`,
    ],
  }))
  const importFidelity = parseImportFidelity({
    pageRows,
    runtimeVersion: selectedRuntimeRow,
    renderJobFallback: selectedRenderJobFallback,
  })
  const importFidelityEvidenceDiagnostics = [...new Set([...importFidelity.evidenceDiagnostics, ...runtimeArbitrationDiagnostics])].sort((a, b) =>
    a.localeCompare(b),
  )
  console.info('[site-workspace] SITE_OVERVIEW_RENDERED_RUN_RESOLUTION', {
    siteId,
    selectedRuntimeSiteVersionId,
    selectedRuntimeRowFound: Boolean(selectedRuntimeRow),
    selectedFromRenderJobFallback: selectedRuntimeRow == null && selectedRenderJobFallback != null,
    sourceMode: importFidelity.sourceMode,
    renderedCaptureStatus: importFidelity.renderedCaptureStatus,
    renderedDomQuality: importFidelity.renderedDomQuality,
    domNodeCount: importFidelity.renderedCapture?.nodeCount ?? 0,
    screenshotCount: importFidelity.screenshotCount,
    arbitrationDiagnostics: runtimeArbitrationDiagnostics,
  })
  const importFidelityDegraded = importFidelity.importFidelityStatus === 'degraded_import' || importFidelity.importFidelityStatus === 'capture_failed'

  const lastAction = normalizedSiteActions[0] ?? null
  const selectedRuntimeArtifactId = toTextOrNull(selectedRuntimeRow?.artifact_id)
  let transformedPreviewAvailable = Boolean(selectedRuntimeArtifactId)
  let previewRuntimeSummary: PreviewRuntimeSummary | null = null
  if (selectedRuntimeSiteVersionId) {
    const artifactResult = await supabase
      .from('gnr8_runtime_artifacts')
      .select('id,site_version_id,html_by_path,manifest')
      .eq('site_version_id', selectedRuntimeSiteVersionId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!artifactResult.error && Array.isArray(artifactResult.data) && artifactResult.data.length > 0) {
      const artifactRow = artifactResult.data[0] as RuntimeArtifactRow
      if (toTextOrNull(artifactRow.id)) {
        const htmlByPath = isRecord(artifactRow.html_by_path) ? artifactRow.html_by_path : null
        if (htmlByPath != null && Object.keys(htmlByPath).length > 0) transformedPreviewAvailable = true
        const manifest = isRecord(artifactRow.manifest) ? artifactRow.manifest : null
        const summaryFromManifest = parsePreviewRuntimeSummary(manifest?.previewRuntimeSummary)
        if (summaryFromManifest) previewRuntimeSummary = summaryFromManifest
      }
    }
  }

  const debugPreviewAvailable = Boolean(selectedRuntimeSiteVersionId) && pageRows.length > 0
  const resolvedPreview = resolveSiteWorkspacePreview({
    siteVersionId: selectedRuntimeSiteVersionId,
    transformedPreviewAvailable,
    debugPreviewAvailable,
    importCaptured: Boolean(selectedRuntimeSiteVersionId),
    previewRuntimeSummary,
  })
  const previewAlignmentDiagnostics = selectedRuntimeRow && importFidelity.sourceMode === 'rendered_dom' ? ['PRIMARY_RENDERED_RUN_ALIGNED_TO_PREVIEW'] : []
  const resolvedPreviewDiagnostics = [...new Set([...resolvedPreview.diagnostics, ...previewAlignmentDiagnostics])].sort((a, b) => a.localeCompare(b))
  const diagnosticsSummary = Array.from(
    new Set([
      ...structureRows.flatMap((row) => row.keyDiagnostics),
      ...(lastAction?.diagnostics ?? []),
      ...importFidelity.importDiagnosticCodes,
      ...runtimeArbitrationDiagnostics,
      ...previewAlignmentDiagnostics,
      ...(selectedVariant ? [`variant:${selectedVariant.label}`] : []),
      ...resolvedPreviewDiagnostics,
    ]),
  ).slice(0, 8)
  const previewUrl = resolvedPreview.mainPreviewUrl

  return {
    site,
    client: {
      clientId,
      clientName: toTextOrNull(clientOrg?.name),
    },
    agency: {
      agencyId,
    },
    pipeline: {
      latestRunAt: runtimeSnapshot?.latestRuntimeUpdatedAt ?? runtimeSnapshot?.latestRuntimeCreatedAt ?? site.updatedAt,
      latestRuntimeSiteVersionId: selectedRuntimeSiteVersionId,
      latestRuntimeState: selectedRuntimeState,
      lastActionType: normalizeSiteActionType(lastAction?.type),
      lastActionStatus: normalizeSiteActionStatus(lastAction?.status),
      lastActionAt: lastAction?.completedAt ?? lastAction?.createdAt ?? null,
      semanticModelStatus: pageRows.some((row) => Array.isArray(row.semantic_signals) && row.semantic_signals.length > 0)
        ? 'available'
        : 'unavailable',
      visualAnalysisStatus: diagnosticsSummary.length > 0 ? 'available' : 'unavailable',
      designModelStatus: sectionsDetected > 0 ? 'available' : 'unavailable',
      sourceMode: importFidelity.sourceMode,
      captureMode: importFidelity.captureMode,
      importFidelityStatus: importFidelity.importFidelityStatus,
      importFidelityScore: importFidelity.importFidelityScore ?? null,
      importFidelityDegraded,
      renderedCaptureStatus: importFidelity.renderedCaptureStatus,
      renderedDomQuality: importFidelity.renderedDomQuality,
      screenshotCount: importFidelity.screenshotCount,
      computedStyleSampleCount: importFidelity.computedStyleSampleCount,
      renderedCapture: importFidelity.renderedCapture,
      styleSignalCoverage: importFidelity.styleSignalCoverage,
      styleSignalFallbackUsed: importFidelity.styleSignalFallbackUsed,
      styleSignalSourceMode: importFidelity.styleSignalSourceMode,
      evidencePaths: importFidelity.evidencePaths,
      evidenceDiagnostics: importFidelityEvidenceDiagnostics,
      importDiagnosticCodes: importFidelity.importDiagnosticCodes,
      captureEvidenceRefs: importFidelity.captureEvidenceRefs,
      captureJob: importFidelity.captureJob,
      workerHealth: importFidelity.workerHealth,
      captureFallbackReason: importFidelity.captureFallbackReason,
      diagnosticsSummary,
      multipageImportSummary: importFidelity.multipageImportSummary,
      siteTreeSummary: importFidelity.siteTreeSummary,
      templateFamiliesSummary: importFidelity.templateFamiliesSummary,
      styleSignals: importFidelity.styleSignals,
      semanticImport: importFidelity.semanticImport,
      runtimeSelection: {
        selectedVersionId: selectedRuntimeSiteVersionId,
        selectedSiteId: toTextOrNull(selectedRuntimeRow?.site_id),
        selectedVersionNo: selectedRuntimeRow?.version_no ?? null,
        selectedHasImportProvenanceSummary: parseImportProvenanceSummary(selectedRuntimeRow?.import_provenance_summary ?? null) != null,
        selectedHasArtifactId: Boolean(selectedRuntimeArtifactId),
      },
    },
    actions: {
      currentStatus: normalizedSiteActions.find((action) => action.status === 'running')?.status ?? (lastAction?.status ?? 'idle'),
      lastAction: {
        actionId: lastAction?.actionId ?? null,
        type: lastAction?.type ?? null,
        status: lastAction?.status ?? 'idle',
        resultSummary: lastAction?.resultSummary ?? null,
        diagnostics: lastAction?.diagnostics ?? [],
        createdAt: lastAction?.createdAt ?? null,
        completedAt: lastAction?.completedAt ?? null,
      },
    },
    variants: {
      selectedVariantId: selectedVariant?.id ?? null,
      selectedSiteVersionId: selectedVariant?.siteVersionId ?? selectedRuntimeSiteVersionId,
      rows: normalizedVariants.map((variant) => ({
        id: variant.id!,
        label: variant.label!,
        strategy: variant.strategy!,
        siteVersionId: variant.siteVersionId,
        createdAt: variant.createdAt!,
      })),
    },
    overview: {
      sectionsDetected,
      heroDetected,
      ctaDetected,
      captureDrivenLiftApplied,
      captureSignalSummary: captureLiftDiagnostics.slice(0, 4),
      designStrategy,
      statusLabel: toStatusLabel({
        siteStatus: site.status,
        latestRuntimeState: selectedRuntimeState,
        hasPreview: Boolean(previewUrl),
      }),
      sourceMode: importFidelity.sourceMode,
      importFidelityStatus: importFidelity.importFidelityStatus,
      importFidelityScore: importFidelity.importFidelityScore ?? null,
    },
    content: {
      hero: importFidelity.semanticImport?.hero ?? null,
      sections: importFidelity.semanticImport?.sections ?? [],
      imagesByRole: importFidelity.semanticImport?.assets.groupedByRole ?? emptySemanticImageGroups(),
      diagnostics: importFidelity.semanticImport?.diagnostics ?? [],
    },
    structure: {
      rows: structureRows,
    },
    design: {
      selectedPageStrategy: designStrategy,
      aiSuggestionStatus,
      visualSignals: {
        heroProminence,
        visualDensity,
        ctaProminence,
      },
      styleSignals: {
        sourceMode: importFidelity.styleSignals?.sourceMode ?? 'unknown',
        backgroundTone: importFidelity.styleSignals?.colors.backgroundTone ?? 'unknown',
        primaryAccent: importFidelity.styleSignals?.colors.primaryAccent ?? null,
        headingCategory: importFidelity.styleSignals?.typography.headingCategory ?? 'unknown',
        bodyCategory: importFidelity.styleSignals?.typography.bodyCategory ?? 'unknown',
        spacingRhythm: importFidelity.styleSignals?.spacing.rhythm ?? 'unknown',
        layoutDensity: importFidelity.styleSignals?.spacing.layoutDensity ?? 'unknown',
        ctaStyle: importFidelity.styleSignals?.cta.styleHint ?? 'unknown',
        ctaProminence: importFidelity.styleSignals?.cta.prominence ?? 'unknown',
        diagnostics: (importFidelity.styleSignals?.diagnostics ?? []).map((diag) => diag.code),
      },
      sectionDecisions,
      rationale: [
        `Design strategy '${designStrategy}' is inferred from section composition (hero=${heroDetected ? 'yes' : 'no'}, cta=${ctaDetected ? 'yes' : 'no'}).`,
        `Site has ${sectionsDetected} detected section${sectionsDetected === 1 ? '' : 's'} across the latest runtime snapshot.`,
        `AI suggestion status is '${aiSuggestionStatus}'.`,
        `Style source=${importFidelity.styleSignals?.sourceMode ?? 'unknown'}; accent=${importFidelity.styleSignals?.colors.primaryAccent ?? 'none'}; rhythm=${importFidelity.styleSignals?.spacing.rhythm ?? 'unknown'}.`,
      ],
    },
    preview: {
      readiness: resolvedPreview.status,
      sourceType: resolvedPreview.sourceType,
      previewUrl,
      transformedPreviewUrl: resolvedPreview.transformedPreviewUrl,
      debugPreviewUrl: resolvedPreview.debugPreviewUrl,
      previewMode: resolvedPreview.previewMode,
      familyRenderUsed: resolvedPreview.familyRenderUsed,
      familyRenderMode: resolvedPreview.familyRenderMode,
      familyRenderFamilyId: resolvedPreview.familyRenderFamilyId,
      familyRenderFallbackToPage: resolvedPreview.familyRenderFallbackToPage,
      familyRenderDiagnosticsCount: resolvedPreview.familyRenderDiagnosticsCount,
      familyRenderDiagnostics: resolvedPreview.familyRenderDiagnostics,
      previewRuntimeSummary: resolvedPreview.previewRuntimeSummary,
      liveUrl: toHttpsUrlOrNull(site.domain),
      selectedVariantLabel: selectedVariant?.label ?? null,
      diagnostics: resolvedPreviewDiagnostics,
    },
    settings: {
      name: site.label || `Site ${shortId(site.id)}`,
      domain: site.domain,
      domainBinding,
    },
    siteOptions,
  }
}

export const __siteWorkspaceReadModelTestUtils = {
  parseImportFidelitySignals,
  parseImportProvenanceSummary,
  parsePreviewRuntimeSummary,
  parseImportFidelity,
  synthesizeRuntimeVersionRowsFromWorkerJobs,
  selectPrimaryRuntimeVersionRow,
  compareRuntimeVersionRows,
  resolveLatestRuntimeVersionRow,
}
