import 'server-only'

import { toSiteEntity, type RawSiteRow, type SiteEntity } from '@/gnr8/site/site-entity'
import { resolveSiteWorkspacePreview, type SitePreviewType, type SiteWorkspacePreviewReadiness } from '@/gnr8/site/site-preview-contract'
import type { RuntimeImportProvenanceSummary } from '@/gnr8/runtime/types'
import type { StyleSignalModel } from '@/gnr8/style-signals'
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
  ownership_site_id: string | null
  state: string | null
  version_no: number | null
  import_provenance_summary: unknown
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
    importFidelityStatus: 'high_fidelity_import' | 'degraded_import' | 'capture_failed' | 'unknown'
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
    diagnosticsSummary: string[]
    styleSignals: StyleSignalModel | null
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
    designStrategy: 'cta_focused' | 'corporate_balanced' | 'editorial_readable' | 'visual_gallery'
    statusLabel: 'imported' | 'processed' | 'preview_ready' | 'published' | 'unknown'
    sourceMode: 'rendered_dom' | 'raw_html_fallback' | 'unknown'
    importFidelityStatus: 'high_fidelity_import' | 'degraded_import' | 'capture_failed' | 'unknown'
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
    liveUrl: string | null
    selectedVariantLabel: string | null
    diagnostics: string[]
  }
  settings: {
    name: string
    domain: string | null
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

function compareRuntimeVersions(a: RuntimeVersionRow, b: RuntimeSnapshot): number {
  const aVersion = Number(a.version_no ?? 0)
  if (aVersion !== b.latestRuntimeVersionNo) return aVersion - b.latestRuntimeVersionNo

  const aUpdatedAt = toIsoOrNull(a.updated_at)
  if (aUpdatedAt !== b.latestRuntimeUpdatedAt) {
    return String(aUpdatedAt ?? '').localeCompare(String(b.latestRuntimeUpdatedAt ?? ''))
  }

  const aCreatedAt = toIsoOrNull(a.created_at)
  if (aCreatedAt !== b.latestRuntimeCreatedAt) {
    return String(aCreatedAt ?? '').localeCompare(String(b.latestRuntimeCreatedAt ?? ''))
  }

  return String(a.id ?? '').localeCompare(String(b.latestRuntimeSiteVersionId ?? ''))
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
  screenshotCount: number
  computedStyleSampleCount: number
  importDiagnosticCodes: string[]
} {
  let sourceMode: SiteWorkspaceReadModel['pipeline']['sourceMode'] = 'unknown'
  let importFidelityStatus: SiteWorkspaceReadModel['pipeline']['importFidelityStatus'] = 'unknown'
  let renderedCaptureStatus: SiteWorkspaceReadModel['pipeline']['renderedCaptureStatus'] = 'unknown'
  let renderedDomQuality: SiteWorkspaceReadModel['pipeline']['renderedDomQuality'] = 'unknown'
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
  const fidelityStatusRaw = normalizeText(value.importFidelityStatus)
  const captureStatusRaw = normalizeText(value.renderedCaptureStatus)
  const domQualityRaw = normalizeText(value.renderedDomQuality)
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
  const styleSignals = isRecord(value.styleSignals) ? (value.styleSignals as StyleSignalModel) : null

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
  }

  return {
    kind: 'runtime_import_provenance_summary_v1',
    sourceMode: sourceModeRaw,
    importFidelityStatus: fidelityStatusRaw,
    renderedCaptureStatus: renderedCaptureStatusNormalized,
    renderedDomQuality: domQualityRaw,
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
    styleSignals,
  }
}

function parseImportFidelity(input: {
  pageRows: RuntimePageVersionRow[]
  runtimeVersion: RuntimeVersionRow | null
}): {
  sourceMode: SiteWorkspaceReadModel['pipeline']['sourceMode']
  importFidelityStatus: SiteWorkspaceReadModel['pipeline']['importFidelityStatus']
  renderedCaptureStatus: SiteWorkspaceReadModel['pipeline']['renderedCaptureStatus']
  renderedDomQuality: SiteWorkspaceReadModel['pipeline']['renderedDomQuality']
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
  styleSignals: StyleSignalModel | null
} {
  const parsedFromSignals = parseImportFidelitySignals(input.pageRows)
  const parsedSummary = parseImportProvenanceSummary(input.runtimeVersion?.import_provenance_summary ?? null)

  if (!parsedSummary) {
    const inferredStyleSignals = parseStyleSignalsFromSemanticLabels(input.pageRows)
    return {
      ...parsedFromSignals,
      renderedCapture: null,
      styleSignalCoverage: inferredStyleSignals?.provenance.computedStyle.coverage ?? 0,
      styleSignalFallbackUsed: inferredStyleSignals?.provenance.fallbackUsed ?? true,
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
      styleSignals: inferredStyleSignals,
    }
  }

  const importDiagnosticCodes = [...new Set([...parsedFromSignals.importDiagnosticCodes, ...parsedSummary.importDiagnosticCodes])]
    .sort((a, b) => a.localeCompare(b))

  const captureEvidenceRefs = [
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
  const evidenceDiagnostics = [...new Set([
    ...importDiagnosticCodes.filter((code) => code.startsWith('ENTRY_FETCH_')),
    ...importDiagnosticCodes.filter((code) => code.startsWith('RENDERED_CAPTURE_')),
    ...(styleSignals?.diagnostics ?? []).map((diag) => diag.code).filter((code) => code.startsWith('STYLE_SIGNAL_') || code === 'STYLE_SAMPLE_LOW_COVERAGE'),
  ])].sort((a, b) => a.localeCompare(b))

  return {
    sourceMode: parsedSummary.sourceMode,
    importFidelityStatus: parsedSummary.importFidelityStatus,
    renderedCaptureStatus: parsedSummary.renderedCaptureStatus,
    renderedDomQuality: parsedSummary.renderedDomQuality,
    screenshotCount: parsedSummary.screenshotCount,
    computedStyleSampleCount: parsedSummary.computedStyleSampleCount,
    renderedCapture: parsedSummary.renderedCapture,
    styleSignalCoverage: styleSignals?.provenance.computedStyle.coverage ?? parsedSummary.renderedCapture.styleCoverage ?? 0,
    styleSignalFallbackUsed: styleSignals?.provenance.fallbackUsed ?? true,
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
    styleSignals,
  }
}

export function resolveSelectedRuntimeVersionIdForWorkspace(input: {
  latestRuntimeSiteVersionId: string | null
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

  return {
    selectedRuntimeSiteVersionId: selectedVariant?.siteVersionId ?? input.latestRuntimeSiteVersionId ?? null,
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
    supabase.from('sites').select('id,org_id,agency_id,status,domain,created_at,updated_at').eq('id', siteId).limit(1).maybeSingle(),
    supabase
      .from('sites')
      .select('id,org_id,agency_id,status,domain,created_at,updated_at')
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

  const runtimeResult = await supabase
    .from('gnr8_runtime_site_versions')
    .select('id,ownership_site_id,state,version_no,import_provenance_summary,updated_at,created_at')
    .eq('ownership_site_id', siteId)

  const runtimeRows = !runtimeResult.error && Array.isArray(runtimeResult.data)
    ? (runtimeResult.data as RuntimeVersionRow[])
    : []

  let runtimeSnapshot: RuntimeSnapshot | null = null
  for (const row of runtimeRows) {
    if (!runtimeSnapshot) {
      runtimeSnapshot = {
        latestRuntimeSiteVersionId: toTextOrNull(row.id),
        latestRuntimeState: toTextOrNull(row.state),
        latestRuntimeVersionNo: Number(row.version_no ?? 0),
        latestRuntimeUpdatedAt: toIsoOrNull(row.updated_at),
        latestRuntimeCreatedAt: toIsoOrNull(row.created_at),
        hasPublishedRuntimeVersion: normalizeText(row.state).toUpperCase() === 'PUBLISHED',
      }
      continue
    }

    if (compareRuntimeVersions(row, runtimeSnapshot) > 0) {
      runtimeSnapshot.latestRuntimeSiteVersionId = toTextOrNull(row.id)
      runtimeSnapshot.latestRuntimeState = toTextOrNull(row.state)
      runtimeSnapshot.latestRuntimeVersionNo = Number(row.version_no ?? 0)
      runtimeSnapshot.latestRuntimeUpdatedAt = toIsoOrNull(row.updated_at)
      runtimeSnapshot.latestRuntimeCreatedAt = toIsoOrNull(row.created_at)
    }

    if (normalizeText(row.state).toUpperCase() === 'PUBLISHED') {
      runtimeSnapshot.hasPublishedRuntimeVersion = true
    }
  }

  const latestRuntimeSiteVersionId = runtimeSnapshot?.latestRuntimeSiteVersionId ?? null
  const selectedResolution = resolveSelectedRuntimeVersionIdForWorkspace({
    latestRuntimeSiteVersionId,
    normalizedVariants: normalizedVariantsForSelection,
    selectedVariantId,
  })
  const selectedRuntimeSiteVersionId = selectedResolution.selectedRuntimeSiteVersionId
  const selectedVariant =
    selectedResolution.selectedVariant == null
      ? null
      : normalizedVariants.find((variant) => variant.id === selectedResolution.selectedVariant?.id) ?? null
  const selectedRuntimeRow = runtimeRows.find((row) => toTextOrNull(row.id) === selectedRuntimeSiteVersionId) ?? null
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
  })
  const importFidelityDegraded = importFidelity.importFidelityStatus === 'degraded_import' || importFidelity.importFidelityStatus === 'capture_failed'

  const lastAction = normalizedSiteActions[0] ?? null
  let transformedPreviewAvailable = false
  if (selectedRuntimeSiteVersionId) {
    const artifactResult = await supabase
      .from('gnr8_runtime_artifacts')
      .select('id,site_version_id,html_by_path')
      .eq('site_version_id', selectedRuntimeSiteVersionId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (!artifactResult.error && Array.isArray(artifactResult.data) && artifactResult.data.length > 0) {
      const artifactRow = artifactResult.data[0] as RuntimeArtifactRow
      if (toTextOrNull(artifactRow.id)) {
        const htmlByPath = isRecord(artifactRow.html_by_path) ? artifactRow.html_by_path : null
        transformedPreviewAvailable = htmlByPath != null && Object.keys(htmlByPath).length > 0
      }
    }
  }

  const debugPreviewAvailable = Boolean(selectedRuntimeSiteVersionId) && pageRows.length > 0
  const resolvedPreview = resolveSiteWorkspacePreview({
    siteVersionId: selectedRuntimeSiteVersionId,
    transformedPreviewAvailable,
    debugPreviewAvailable,
    importCaptured: Boolean(selectedRuntimeSiteVersionId),
  })
  const diagnosticsSummary = Array.from(
    new Set([
      ...structureRows.flatMap((row) => row.keyDiagnostics),
      ...(lastAction?.diagnostics ?? []),
      ...importFidelity.importDiagnosticCodes,
      ...(selectedVariant ? [`variant:${selectedVariant.label}`] : []),
      ...resolvedPreview.diagnostics,
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
      importFidelityStatus: importFidelity.importFidelityStatus,
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
      evidenceDiagnostics: importFidelity.evidenceDiagnostics,
      importDiagnosticCodes: importFidelity.importDiagnosticCodes,
      captureEvidenceRefs: importFidelity.captureEvidenceRefs,
      diagnosticsSummary,
      styleSignals: importFidelity.styleSignals,
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
      designStrategy,
      statusLabel: toStatusLabel({
        siteStatus: site.status,
        latestRuntimeState: selectedRuntimeState,
        hasPreview: Boolean(previewUrl),
      }),
      sourceMode: importFidelity.sourceMode,
      importFidelityStatus: importFidelity.importFidelityStatus,
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
      liveUrl: toHttpsUrlOrNull(site.domain),
      selectedVariantLabel: selectedVariant?.label ?? null,
      diagnostics: resolvedPreview.diagnostics,
    },
    settings: {
      name: site.label || `Site ${shortId(site.id)}`,
      domain: site.domain,
    },
    siteOptions,
  }
}

export const __siteWorkspaceReadModelTestUtils = {
  parseImportFidelitySignals,
  parseImportProvenanceSummary,
  parseImportFidelity,
}
