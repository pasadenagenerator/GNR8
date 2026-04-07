import 'server-only'

import { createHash } from 'node:crypto'

import type { AgencyAction, AgencyRole } from '@/src/auth/rbac'
import { canPerformAction } from '@/src/auth/rbac'
import { getSuperadminPool } from '@/src/superadmin/db'
import { createDesignIntelligenceResultFromInput } from '@/gnr8/design-intelligence/design-intelligence-service'
import type { DesignIntelligenceInput, DesignPageInput, DesignSemanticSectionInput, LayoutStrategy } from '@/gnr8/design-intelligence/design-model'
import { createSiteVersionFromMigration, getSiteVersion, markSiteVersionPublished } from '@/gnr8/runtime/runtime-store'
import { RENDERER_COMPATIBILITY_VERSION, type CanonicalPageVersionInput } from '@/gnr8/runtime/types'
import type {
  SiteAction,
  SiteActionRequest,
  SiteActionResult,
  SiteActionType,
  SitePublishMetadata,
  SiteVariant,
} from '@/gnr8/site-actions/site-action-model'

type SiteScopeRow = {
  id: string
  agency_id: string
  domain: string | null
  status: string | null
}

type LatestSiteVersionRow = {
  id: string
}

type VariantRow = {
  id: string
  site_id: string
  label: string
  strategy: string
  site_version_id: string | null
  created_at: string
}

type PublishEventRow = {
  id: string
  site_id: string
  site_version_id: string
  published_at: string
  published_by: string
  result_summary: string
}

type RedesignStrategyResolution = {
  requested: string
  normalized: string
  layoutStrategy: LayoutStrategy
  label: string
  fallbackApplied: boolean
}

const REDESIGN_STRATEGY_MAP: Array<{ match: RegExp; layout: LayoutStrategy; label: string }> = [
  { match: /minimal|clean|editorial|readable/i, layout: 'editorial_readable', label: 'More minimal' },
  { match: /visual|gallery|image|bold/i, layout: 'visual_gallery', label: 'More visual' },
  { match: /conversion|cta|lead|sales/i, layout: 'cta_focused', label: 'More conversion-focused' },
  { match: /service|split/i, layout: 'service_split_layout', label: 'Service split' },
  { match: /balanced|default|neutral/i, layout: 'corporate_balanced', label: 'Balanced' },
]

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function nowIso(): string {
  return new Date().toISOString()
}

function hashFingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function resolveRedesignStrategy(raw: unknown): RedesignStrategyResolution {
  const requested = normalizeText(raw)
  const normalized = requested.toLowerCase()

  for (const entry of REDESIGN_STRATEGY_MAP) {
    if (!entry.match.test(normalized)) continue
    return {
      requested,
      normalized,
      layoutStrategy: entry.layout,
      label: entry.label,
      fallbackApplied: false,
    }
  }

  return {
    requested,
    normalized,
    layoutStrategy: 'corporate_balanced',
    label: requested ? `${requested} (fallback)` : 'Balanced (fallback)',
    fallbackApplied: true,
  }
}

function sectionInputFromRuntimePage(input: {
  siteVersionId: string
  pageId: string
  sections: Array<{ id?: unknown; type?: unknown; order?: unknown }>
}): DesignSemanticSectionInput[] {
  return input.sections.map((section, index) => {
    const sectionId = normalizeText(section.id) || `${input.pageId}:section:${index + 1}`
    const type = normalizeText(section.type).toLowerCase()
    const inferredType: DesignSemanticSectionInput['inferredType'] =
      type.includes('hero')
        ? 'hero'
        : type.includes('gallery')
          ? 'gallery'
          : type.includes('footer')
            ? 'footer'
            : type.includes('header') || type.includes('nav')
              ? 'header'
              : type.includes('cta') || type.includes('contact')
                ? 'cta'
                : type.includes('service')
                  ? 'services'
                  : 'unknown'

    return {
      sectionId,
      pageId: input.pageId,
      sourceDomPath: `runtime://${input.siteVersionId}/${input.pageId}/sections/${index}`,
      sourceTagName: 'section',
      ordinalIndex: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
      childElementCount: 2,
      textExcerpt: normalizeText(section.type) || null,
      directTextPresent: true,
      textDensity: inferredType === 'gallery' ? 0.18 : 0.45,
      mediaCount: inferredType === 'gallery' || inferredType === 'hero' ? 1 : 0,
      ctaCandidateCount: inferredType === 'cta' ? 2 : 0,
      hasHeadingSignal: inferredType === 'hero' || inferredType === 'header',
      inferredType,
      semanticConfidence: inferredType === 'unknown' ? 'low' : 'medium',
      semanticRationale: ['derived_from_runtime_structure_model'],
      heroComposition: inferredType === 'hero' ? 'split_media' : null,
      mediaDensity: inferredType === 'gallery' ? 0.8 : inferredType === 'hero' ? 0.55 : 0.2,
      galleryLikeConfidence: inferredType === 'gallery' ? 'high' : 'low',
      readabilityTendency: inferredType === 'gallery' ? 'compact' : 'balanced',
    }
  })
}

function designInputFromRuntimeSnapshot(input: {
  siteId: string
  sourceVersionId: string
  sourceVersionNo: number
  pages: CanonicalPageVersionInput[]
}): DesignIntelligenceInput {
  const pages: DesignPageInput[] = input.pages.map((page, index) => {
    const sections = sectionInputFromRuntimePage({
      siteVersionId: input.sourceVersionId,
      pageId: page.pageId,
      sections: Array.isArray(page.structureModel?.sections) ? page.structureModel.sections : [],
    })

    const ctaCandidateCount = sections.reduce((sum, section) => sum + section.ctaCandidateCount, 0)
    const visualDensity =
      sections.length > 0
        ? Number((sections.reduce((sum, section) => sum + section.mediaDensity, 0) / sections.length).toFixed(3))
        : 0

    return {
      pageId: page.pageId,
      sourcePath: page.path,
      isEntry: index === 0,
      title: page.title,
      sections,
      contentDensity:
        sections.length > 0
          ? Number((sections.reduce((sum, section) => sum + section.textDensity, 0) / sections.length).toFixed(3))
          : 0,
      visualDensity,
      ctaCandidateCount,
      primaryCtaLabel: ctaCandidateCount > 0 ? 'Primary CTA' : null,
      semanticDiagnostics: [],
      brandSignals: {
        primaryColorHint: normalizeText(page.styleTokens?.['--color-primary']) || '#0f172a',
        secondaryColorHint: normalizeText(page.styleTokens?.['--color-secondary']) || '#475569',
        typographyHint: normalizeText(page.styleTokens?.['--font-family']) || 'system-ui',
        dominantColors: [normalizeText(page.styleTokens?.['--color-primary']) || '#0f172a'],
        accentColors: [normalizeText(page.styleTokens?.['--color-accent']) || '#2563eb'],
        neutralPaletteHints: ['slate'],
        fontFamilyHints: [normalizeText(page.styleTokens?.['--font-family']) || 'system-ui'],
        fontCategoryHints: ['sans'],
        visualTone: 'neutral',
        confidence: 'medium',
        rationale: ['derived_from_runtime_style_tokens'],
      },
    }
  })

  return {
    preparedSite: {
      preparedSiteKind: 'prepared_site_model_v1',
      preparedSiteModelVersion: '1.6.0',
      importContractVersion: '1.1.1',
      importManifestVersion: '1.0.0',
      fingerprints: {
        inputSpecSha256: hashFingerprint({
          siteId: input.siteId,
          sourceVersionId: input.sourceVersionId,
          sourceVersionNo: input.sourceVersionNo,
        }),
        inputContentSha256: hashFingerprint(
          pages.map((page) => ({
            pageId: page.pageId,
            sourcePath: page.sourcePath,
            sectionCount: page.sections.length,
            ctaCandidateCount: page.ctaCandidateCount,
          })),
        ),
      },
    },
    pages,
  }
}

function withStrategyTokens(input: {
  page: CanonicalPageVersionInput
  layoutStrategy: LayoutStrategy
  variantLabel: string
}): CanonicalPageVersionInput {
  const existing = input.page.styleTokens ?? {}
  return {
    ...input.page,
    styleTokens: {
      ...existing,
      '--gnr8-layout-strategy': input.layoutStrategy,
      '--gnr8-variant-label': input.variantLabel,
      '--gnr8-last-site-action': nowIso(),
    },
  }
}

function withActionSignal(input: {
  page: CanonicalPageVersionInput
  actionType: SiteActionType
  strategyLabel: string
  source: 'manual' | 'ai'
}): CanonicalPageVersionInput {
  return {
    ...input.page,
    semanticSignals: [
      ...(Array.isArray(input.page.semanticSignals) ? input.page.semanticSignals : []),
      {
        label: `site_action:${input.actionType}`,
        confidence: 1,
        source: input.source,
      },
      {
        label: `design_strategy:${input.strategyLabel}`,
        confidence: 0.95,
        source: input.source,
      },
    ],
  }
}

export function requiredAgencyActionForSiteAction(type: SiteActionType): AgencyAction {
  if (type === 'publish_site') return 'publish'
  return 'run_migration'
}

export function isRoleAuthorizedForSiteAction(role: AgencyRole | null | undefined, type: SiteActionType): boolean {
  return canPerformAction(role ?? null, requiredAgencyActionForSiteAction(type))
}

async function resolveSiteScope(siteId: string): Promise<SiteScopeRow | null> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<SiteScopeRow>(
      `
      select
        s.id::text as id,
        s.agency_id::text as agency_id,
        s.domain::text as domain,
        s.status::text as status
      from public.sites s
      where s.id = $1::uuid
      limit 1
      `,
      [siteId],
    )
    return result.rows[0] ?? null
  } finally {
    client.release()
  }
}

async function resolveLatestRuntimeSiteVersionId(siteId: string): Promise<string | null> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<LatestSiteVersionRow>(
      `
      select sv.id::text as id
      from public.gnr8_runtime_site_versions sv
      where sv.ownership_site_id = $1::uuid
      order by sv.version_no desc, sv.updated_at desc, sv.created_at desc, sv.id::text desc
      limit 1
      `,
      [siteId],
    )
    return result.rows[0]?.id ?? null
  } finally {
    client.release()
  }
}

async function resolveVariantById(variantId: string): Promise<VariantRow | null> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<VariantRow>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        label::text as label,
        strategy::text as strategy,
        site_version_id::text as site_version_id,
        created_at::text as created_at
      from public.gnr8_site_variants
      where id = $1::uuid
      limit 1
      `,
      [variantId],
    )
    return result.rows[0] ?? null
  } finally {
    client.release()
  }
}

async function createActionRow(input: { siteId: string; type: SiteActionType; strategy?: string }): Promise<SiteAction> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<{
      id: string
      site_id: string
      type: SiteActionType
      status: SiteAction['status']
      created_at: string
      strategy: string | null
    }>(
      `
      insert into public.gnr8_site_actions (site_id, type, status, strategy)
      values ($1::uuid, $2::text, 'running', nullif($3::text, ''))
      returning
        id::text as id,
        site_id::text as site_id,
        type::text as type,
        status::text as status,
        created_at::text as created_at,
        strategy::text as strategy
      `,
      [input.siteId, input.type, normalizeText(input.strategy)],
    )

    const row = result.rows[0]!
    return {
      id: row.id,
      siteId: row.site_id,
      type: row.type,
      status: row.status,
      createdAt: row.created_at,
      strategy: row.strategy,
    }
  } finally {
    client.release()
  }
}

async function finalizeActionRow(input: {
  actionId: string
  status: Extract<SiteAction['status'], 'completed' | 'failed'>
  resultSummary: string
  diagnostics: string[]
  variantId?: string
}): Promise<SiteAction> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<{
      id: string
      site_id: string
      type: SiteActionType
      status: SiteAction['status']
      created_at: string
      completed_at: string | null
      result_summary: string | null
      diagnostics: string[] | null
      strategy: string | null
      variant_id: string | null
    }>(
      `
      update public.gnr8_site_actions
      set
        status = $2::text,
        completed_at = now(),
        result_summary = $3::text,
        diagnostics = $4::jsonb,
        variant_id = case when nullif($5::text, '') is null then variant_id else $5::uuid end
      where id = $1::uuid
      returning
        id::text as id,
        site_id::text as site_id,
        type::text as type,
        status::text as status,
        created_at::text as created_at,
        completed_at::text as completed_at,
        result_summary::text as result_summary,
        diagnostics,
        strategy::text as strategy,
        variant_id::text as variant_id
      `,
      [
        input.actionId,
        input.status,
        input.resultSummary,
        JSON.stringify(input.diagnostics ?? []),
        normalizeText(input.variantId),
      ],
    )

    const row = result.rows[0]!
    return {
      id: row.id,
      siteId: row.site_id,
      type: row.type,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined,
      resultSummary: row.result_summary ?? undefined,
      diagnostics: Array.isArray(row.diagnostics) ? row.diagnostics : [],
      strategy: row.strategy,
      variantId: row.variant_id,
    }
  } finally {
    client.release()
  }
}

async function createVariantRow(input: {
  siteId: string
  strategy: string
  label: string
  siteVersionId: string
}): Promise<SiteVariant> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<VariantRow>(
      `
      insert into public.gnr8_site_variants (site_id, label, strategy, site_version_id)
      values ($1::uuid, $2::text, $3::text, $4::uuid)
      returning
        id::text as id,
        site_id::text as site_id,
        label::text as label,
        strategy::text as strategy,
        site_version_id::text as site_version_id,
        created_at::text as created_at
      `,
      [input.siteId, input.label, input.strategy, input.siteVersionId],
    )

    const row = result.rows[0]!
    return {
      id: row.id,
      siteId: row.site_id,
      label: row.label,
      strategy: row.strategy,
      siteVersionId: row.site_version_id,
      createdAt: row.created_at,
    }
  } finally {
    client.release()
  }
}

async function createPublishEvent(input: {
  siteId: string
  siteVersionId: string
  publishedBy: string
  resultSummary: string
}): Promise<SitePublishMetadata> {
  const client = await getSuperadminPool().connect()
  try {
    const result = await client.query<PublishEventRow>(
      `
      insert into public.gnr8_site_publish_events (site_id, site_version_id, published_by, result_summary)
      values ($1::uuid, $2::uuid, $3::text, $4::text)
      returning
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        published_at::text as published_at,
        published_by::text as published_by,
        result_summary::text as result_summary
      `,
      [input.siteId, input.siteVersionId, input.publishedBy, input.resultSummary],
    )

    const row = result.rows[0]!
    return {
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      publishedAt: row.published_at,
      publishedBy: row.published_by,
      resultSummary: row.result_summary,
    }
  } finally {
    client.release()
  }
}

async function setSiteStatus(input: { siteId: string; status: string }): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      update public.sites
      set status = $2::public.site_status_enum, updated_at = now()
      where id = $1::uuid
      `,
      [input.siteId, input.status],
    )
  } finally {
    client.release()
  }
}

async function touchSiteUpdatedAt(siteId: string): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(`update public.sites set updated_at = now() where id = $1::uuid`, [siteId])
  } finally {
    client.release()
  }
}

async function linkOwnershipSiteVersion(input: { siteId: string; siteVersionId: string }): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    await client.query(
      `
      update public.gnr8_runtime_site_versions
      set ownership_site_id = $2::uuid
      where id = $1::uuid
      `,
      [input.siteVersionId, input.siteId],
    )
  } finally {
    client.release()
  }
}

async function resolveSourceSiteVersion(input: { siteId: string; variantId?: string }): Promise<string> {
  const variantId = normalizeText(input.variantId)
  if (variantId) {
    const variant = await resolveVariantById(variantId)
    if (!variant || variant.site_id !== input.siteId || !variant.site_version_id) {
      throw new Error('Selected variant is not valid for this site.')
    }
    return variant.site_version_id
  }

  const latest = await resolveLatestRuntimeSiteVersionId(input.siteId)
  if (!latest) throw new Error('No runtime version found for site.')
  return latest
}

function toVariantLabel(strategyLabel: string): string {
  return `Redesign · ${strategyLabel}`
}

async function runTransformationInternal(input: {
  siteId: string
  actor: string
  sourceVersionId: string
  actionType: 'rerun_transformation' | 'generate_redesign'
  strategyOverride?: RedesignStrategyResolution
}): Promise<{ siteVersionId: string; strategyLabel: string }> {
  const sourceVersion = await getSiteVersion(input.sourceVersionId)
  if (!sourceVersion) throw new Error('Source runtime version was not found.')

  const designInput = designInputFromRuntimeSnapshot({
    siteId: input.siteId,
    sourceVersionId: sourceVersion.id,
    sourceVersionNo: sourceVersion.versionNo,
    pages: sourceVersion.pages,
  })

  const designResult = createDesignIntelligenceResultFromInput(designInput)

  const nextPages: CanonicalPageVersionInput[] = sourceVersion.pages.map((page) => {
    const inferred =
      designResult.designModel.pageStrategies.find((strategy) => strategy.pageId === page.pageId)?.layoutStrategy ??
      designResult.designModel.layoutStrategy

    const selectedStrategy = input.strategyOverride?.layoutStrategy ?? inferred
    const strategyLabel = input.strategyOverride?.label ?? inferred

    const withStrategy = withStrategyTokens({
      page,
      layoutStrategy: selectedStrategy,
      variantLabel: strategyLabel,
    })

    return withActionSignal({
      page: withStrategy,
      actionType: input.actionType,
      strategyLabel,
      source: input.actionType === 'generate_redesign' ? 'ai' : 'manual',
    })
  })

  const scopedSite = await resolveSiteScope(input.siteId)
  const sourceUrl = `https://${normalizeText(scopedSite?.domain) || `${input.siteId}.gnr8.local`}`

  const createResult = await createSiteVersionFromMigration({
    siteId: sourceVersion.siteId,
    sourceUrl,
    actor: input.actor,
    pages: nextPages,
    rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
  })

  await linkOwnershipSiteVersion({
    siteId: input.siteId,
    siteVersionId: createResult.siteVersionId,
  })

  return {
    siteVersionId: createResult.siteVersionId,
    strategyLabel: input.strategyOverride?.label ?? designResult.designModel.layoutStrategy,
  }
}

export async function runSiteAction(request: SiteActionRequest): Promise<SiteActionResult> {
  const siteId = normalizeText(request.siteId)
  const agencyId = normalizeText(request.agencyId)
  const actor = normalizeText(request.actor) || 'site-actions:v1'

  if (!siteId) throw new Error('siteId is required')
  if (!agencyId) throw new Error('agencyId is required')

  const site = await resolveSiteScope(siteId)
  if (!site) throw new Error('Site not found')
  if (site.agency_id !== agencyId) throw new Error('Site agency scope mismatch')

  const action = await createActionRow({
    siteId,
    type: request.type,
    strategy: request.type === 'generate_redesign' ? request.strategy : undefined,
  })

  const previousSiteStatus = normalizeText(site.status)

  try {
    if (request.type === 'rerun_transformation' || request.type === 'generate_redesign') {
      await setSiteStatus({ siteId, status: 'migrating' })
      const strategyResolution = request.type === 'generate_redesign' ? resolveRedesignStrategy(request.strategy) : undefined
      const sourceVersionId = await resolveSourceSiteVersion({ siteId })

      const execution = await runTransformationInternal({
        siteId,
        actor,
        sourceVersionId,
        actionType: request.type,
        strategyOverride: strategyResolution,
      })

      let variant: SiteVariant | undefined
      if (request.type === 'generate_redesign') {
        variant = await createVariantRow({
          siteId,
          strategy: strategyResolution?.layoutStrategy ?? 'corporate_balanced',
          label: toVariantLabel(strategyResolution?.label ?? 'Balanced'),
          siteVersionId: execution.siteVersionId,
        })
      }

      if (previousSiteStatus) {
        await setSiteStatus({ siteId, status: previousSiteStatus })
      } else {
        await touchSiteUpdatedAt(siteId)
      }

      const diagnostics: string[] = []
      if (strategyResolution?.fallbackApplied) {
        diagnostics.push(
          `Invalid strategy '${strategyResolution.requested || 'n/a'}' resolved to deterministic fallback '${strategyResolution.layoutStrategy}'.`,
        )
      }

      const completed = await finalizeActionRow({
        actionId: action.id,
        status: 'completed',
        resultSummary:
          request.type === 'rerun_transformation'
            ? `Transformation re-run completed. Runtime version ${execution.siteVersionId} is now latest.`
            : `Redesign variant '${variant?.label ?? execution.strategyLabel}' generated. Runtime version ${execution.siteVersionId}.`,
        diagnostics,
        variantId: variant?.id,
      })

      return {
        ok: true,
        action: completed,
        siteVersionId: execution.siteVersionId,
        variant,
      }
    }

    const sourceVersionId = await resolveSourceSiteVersion({ siteId, variantId: request.variantId })
    await markSiteVersionPublished({ siteVersionId: sourceVersionId })

    if (site.domain) {
      await setSiteStatus({ siteId, status: 'live' })
    } else {
      await touchSiteUpdatedAt(siteId)
    }

    const publish = await createPublishEvent({
      siteId,
      siteVersionId: sourceVersionId,
      publishedBy: actor,
      resultSummary: `Publish simulated for runtime version ${sourceVersionId}.`,
    })

    const completed = await finalizeActionRow({
      actionId: action.id,
      status: 'completed',
      resultSummary: publish.resultSummary,
      diagnostics: site.domain
        ? []
        : ['Site has no live domain configured. Publish remained a simulated state transition.'],
    })

    return {
      ok: true,
      action: completed,
      siteVersionId: sourceVersionId,
      publish,
    }
  } catch (error) {
    if (previousSiteStatus) {
      await setSiteStatus({ siteId, status: previousSiteStatus }).catch(() => undefined)
    } else {
      await touchSiteUpdatedAt(siteId).catch(() => undefined)
    }

    const message = error instanceof Error ? error.message : 'Site action failed'
    const failed = await finalizeActionRow({
      actionId: action.id,
      status: 'failed',
      resultSummary: `Action failed: ${message}`,
      diagnostics: [message],
    })

    return {
      ok: false,
      action: failed,
    }
  }
}

export const __siteActionTestUtils = {
  resolveRedesignStrategy,
  requiredAgencyActionForSiteAction,
  isRoleAuthorizedForSiteAction,
}
