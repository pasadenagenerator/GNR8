import 'server-only'

import { toSiteEntity, type RawSiteRow, type SiteEntity } from '@/gnr8/site/site-entity'
import { resolveSiteWorkspacePreview, type SitePreviewType, type SiteWorkspacePreviewReadiness } from '@/gnr8/site/site-preview-contract'
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
    diagnosticsSummary: string[]
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
    const sections = Array.isArray(structureModel?.sections) ? structureModel.sections : []

    for (let index = 0; index < sections.length; index += 1) {
      const section = sections[index]
      const sectionRecord = isRecord(section) ? section : {}
      const sectionId = normalizeText(sectionRecord.id) || `${pageId}-section-${index + 1}`
      const sectionType = normalizeText(sectionRecord.type) || 'unknown'
      const ordinalIndex = Number.isFinite(Number(sectionRecord.order)) ? Number(sectionRecord.order) : index

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
        keyDiagnostics: anomalies.slice(0, 2),
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

  const selectedVariant =
    (selectedVariantId ? normalizedVariants.find((variant) => variant.id === selectedVariantId) : null) ??
    normalizedVariants[0] ??
    null

  const runtimeResult = await supabase
    .from('gnr8_runtime_site_versions')
    .select('id,ownership_site_id,state,version_no,updated_at,created_at')
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
  const selectedRuntimeSiteVersionId = selectedVariant?.siteVersionId ?? latestRuntimeSiteVersionId
  const selectedRuntimeRow = runtimeRows.find((row) => toTextOrNull(row.id) === selectedRuntimeSiteVersionId) ?? null
  const selectedRuntimeState = toTextOrNull(selectedRuntimeRow?.state) ?? runtimeSnapshot?.latestRuntimeState ?? null
  let pageRows: RuntimePageVersionRow[] = []

  if (selectedRuntimeSiteVersionId) {
    const pageResult = await supabase
      .from('gnr8_runtime_page_versions')
      .select('id,site_version_id,page_id,path,title,structure_model,semantic_signals,migration_governance')
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
      diagnosticsSummary,
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
      sectionDecisions,
      rationale: [
        `Design strategy '${designStrategy}' is inferred from section composition (hero=${heroDetected ? 'yes' : 'no'}, cta=${ctaDetected ? 'yes' : 'no'}).`,
        `Site has ${sectionsDetected} detected section${sectionsDetected === 1 ? '' : 's'} across the latest runtime snapshot.`,
        `AI suggestion status is '${aiSuggestionStatus}'.`,
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
