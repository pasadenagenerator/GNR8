import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { getSuperadminPool } from '@/src/superadmin/db'
import type { CreatedSiteRecord } from '@/gnr8/site/site-template-instantiation-service'
import type { ScopedImportPipelineOutcome } from '@/gnr8/site/scoped-import-pipeline'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'
import {
  URL_SINGLE_PAGE_IMPORT_VERSION,
  type RenderedDomQuality,
  type UrlSinglePageImportSnapshot,
} from '@/gnr8/validation/runtime/url-single-page-import'

type BootstrapTemplateRecord = Pick<
  TemplateRecord,
  'id' | 'importSnapshotId' | 'entryHtmlPath' | 'entryHtmlFileName' | 'importManifestSummary'
>

export type TemplateSiteRuntimeBootstrapResult = {
  siteVersionId: string
  siteVersionNo: number
  runtimeSiteId: string
  artifactId: string | null
  previewSeeded: boolean
  sectionCount: number
}

export type TemplateSiteRuntimeBootstrapErrorCode =
  | 'TEMPLATE_SITE_BOOTSTRAP_TEMPLATE_ARTIFACT_MISSING'
  | 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING'
  | 'TEMPLATE_SITE_BOOTSTRAP_RUNTIME_VERSION_MISSING'
  | 'TEMPLATE_SITE_BOOTSTRAP_FAILED'

export class TemplateSiteRuntimeBootstrapError extends Error {
  readonly code: TemplateSiteRuntimeBootstrapErrorCode
  readonly siteId: string
  readonly templateId: string

  constructor(input: {
    code: TemplateSiteRuntimeBootstrapErrorCode
    message: string
    siteId: string
    templateId: string
  }) {
    super(input.message)
    this.name = 'TemplateSiteRuntimeBootstrapError'
    this.code = input.code
    this.siteId = input.siteId
    this.templateId = input.templateId
  }
}

type BootstrapDeps = {
  runScopedImportPipeline: (
    input: Parameters<(typeof import('@/gnr8/site/scoped-import-pipeline'))['runScopedImportPipeline']>[0],
  ) => ReturnType<(typeof import('@/gnr8/site/scoped-import-pipeline'))['runScopedImportPipeline']>
  writeOwnershipLink: (input: { siteId: string; siteVersionId: string }) => Promise<void>
  now: () => Date
}

async function runScopedImportPipelineDefault(
  input: Parameters<(typeof import('@/gnr8/site/scoped-import-pipeline'))['runScopedImportPipeline']>[0],
): ReturnType<(typeof import('@/gnr8/site/scoped-import-pipeline'))['runScopedImportPipeline']> {
  const mod = await import('@/gnr8/site/scoped-import-pipeline')
  return mod.runScopedImportPipeline(input)
}

function defaultDeps(): BootstrapDeps {
  return {
    runScopedImportPipeline: runScopedImportPipelineDefault,
    writeOwnershipLink: linkOwnershipSiteVersion,
    now: () => new Date(),
  }
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeDomainAsUrl(domain: string): string {
  const normalized = normalizeText(domain).replace(/^https?:\/\//i, '').replace(/\/+$/g, '')
  return `https://${normalized || 'invalid.local'}`
}

function resolveTemplateSnapshotRoot(snapshotId: string): string {
  return path.resolve(os.tmpdir(), 'gnr8', 'template-intake', snapshotId)
}

function toStableHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function estimateHtmlQuality(html: string): RenderedDomQuality {
  const bodyText = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ')
  const bodyTextLength = normalizeText(bodyText).length
  const headingCount = (html.match(/<h[1-6]\b/gi) ?? []).length
  const sectionCandidateCount = (html.match(/<(section|article|header|main|footer|nav|aside)\b/gi) ?? []).length
  const meaningfulNodeCount = (html.match(/<(p|h1|h2|h3|h4|h5|h6|li|a|button|img|section|article|header|footer|main)\b/gi) ?? []).length
  const strong = meaningfulNodeCount >= 6 && bodyTextLength >= 120
  const weak = meaningfulNodeCount >= 2 && bodyTextLength >= 40
  return {
    quality: strong ? 'strong' : weak ? 'weak' : 'unusable',
    bodyTextLength,
    meaningfulNodeCount,
    sectionCandidateCount,
    hasHeading: headingCount > 0,
    reason: strong ? 'template_html_semantic' : weak ? 'template_html_minimal' : 'template_html_sparse',
  }
}

function createTemplateSnapshot(input: {
  site: CreatedSiteRecord
  template: BootstrapTemplateRecord
  snapshotRootDirAbs: string
  entryHtmlPathAbs: string
  assetsDirAbs: string
  html: string
  now: Date
}): UrlSinglePageImportSnapshot {
  const sourceUrl = normalizeDomainAsUrl(input.site.domain)
  const requestId = `template-bootstrap-${input.site.siteId}`
  const runIdSeed = `${input.site.siteId}:${input.template.id}:${input.now.toISOString()}`
  const snapshotRunId = `template-bootstrap-${toStableHash(runIdSeed)}`
  const quality = estimateHtmlQuality(input.html)
  const importIssue = {
    id: `template-bootstrap-${toStableHash(`${input.site.siteId}:${input.template.id}`)}`,
    severity: 'warning' as const,
    code: 'RAW_HTML_FALLBACK_USED' as const,
    message: 'Template bootstrap seeded snapshot from deterministic template HTML evidence.',
    targetUrl: sourceUrl,
    details: {
      bootstrapMode: 'template_artifact_snapshot',
      templateId: input.template.id,
      siteId: input.site.siteId,
      snapshotRootDirAbs: input.snapshotRootDirAbs,
      entryHtmlPathAbs: input.entryHtmlPathAbs,
    },
  }

  return {
    kind: 'url_single_page_import_snapshot_v1',
    snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
    sourceUrl,
    normalizedUrl: sourceUrl,
    snapshotId: normalizeText(input.template.importSnapshotId),
    snapshotRunId,
    requestId,
    snapshotStableRootDirAbs: resolveTemplateSnapshotRoot(normalizeText(input.template.importSnapshotId)),
    snapshotRootDirAbs: input.snapshotRootDirAbs,
    fixtureSpec: {
      fixtureId: `template-intake-${normalizeText(input.template.importSnapshotId)}`,
      kind: 'static_marketing_site_v1',
      entryHtmlPath: 'index.html',
      assetsDirPath: 'assets',
      sourceUrl,
      normalizedUrl: sourceUrl,
      snapshotVersion: URL_SINGLE_PAGE_IMPORT_VERSION,
      urlKeyRule: 'sha256(normalized_url_without_fragment)_prefix16',
      entryRule: 'index.html',
      assetPathRule: 'assets/<kind>/<urlHash12>-<basename>; collisions append -N',
      fetchScope: {
        includes: [
          'entry_html',
          'rendered_dom_capture',
          'screenshot_capture',
          'computed_style_sampling',
          'direct_stylesheets',
          'direct_images',
          'direct_scripts',
          'image_srcset_candidates',
          'lazy_image_fallback_attrs',
          'gallery_image_anchor_hrefs',
          'stylesheet_linked_local_assets',
        ],
        excludes: ['multi_page_crawl', 'auth_fetch', 'form_submission', 'robots_bypass'],
      },
    },
    sourceMode: 'raw_html_fallback',
    sourceSelection: {
      sourceMode: 'raw_html_fallback',
      fidelityStatus: quality.quality === 'strong' ? 'degraded_import' : 'capture_failed',
      selectedSourceHtmlPathAbs: input.entryHtmlPathAbs,
      renderedDomQuality: quality,
      rawHtmlQuality: quality,
      degraded: true,
    },
    responseHtmlPathAbs: input.entryHtmlPathAbs,
    entryHtmlPathAbs: input.entryHtmlPathAbs,
    assetsDirAbs: input.assetsDirAbs,
    renderedCapture: {
      kind: 'rendered_capture_result_v1',
      version: '1.0.0',
      status: 'unavailable',
      sourceMode: 'raw_html',
      documents: [],
      screenshots: [],
      computedStyleSamples: [],
      renderedObservedAssetUrls: [],
      diagnostics: [
        {
          code: 'CAPTURE_WORKER_FALLBACK_TO_RAW_HTML',
          message: 'Template bootstrap intentionally uses deterministic raw HTML fallback capture.',
          severity: 'warning',
          details: { templateId: input.template.id, siteId: input.site.siteId },
        },
      ],
    },
    renderedCaptureReliability: {
      job: null,
      workerHealth: null,
    },
    importDiagnostics: {
      summary: {
        infoCount: 0,
        warningCount: 1,
        errorCount: 0,
        fatalCount: 0,
      },
      issues: [importIssue],
    },
    fetchManifest: [],
  }
}

function mapBootstrapError(input: {
  error: unknown
  siteId: string
  templateId: string
}): TemplateSiteRuntimeBootstrapError {
  if (input.error instanceof TemplateSiteRuntimeBootstrapError) return input.error
  const message = normalizeText((input.error as Error | null)?.message) || 'Template runtime bootstrap failed.'
  return new TemplateSiteRuntimeBootstrapError({
    code: 'TEMPLATE_SITE_BOOTSTRAP_FAILED',
    message,
    siteId: input.siteId,
    templateId: input.templateId,
  })
}

async function linkOwnershipSiteVersion(input: { siteId: string; siteVersionId: string }): Promise<void> {
  const client = await getSuperadminPool().connect()
  try {
    const link = await client.query<{ id: string }>(
      `
      update public.gnr8_runtime_site_versions
      set ownership_site_id = $2::uuid, updated_at = now()
      where id = $1::uuid
      returning id::text as id
      `,
      [input.siteVersionId, input.siteId],
    )
    if (!link.rows[0]) {
      throw new Error('Runtime site version ownership link affected 0 rows.')
    }
  } finally {
    client.release()
  }
}

function countPreparedSections(result: ScopedImportPipelineOutcome): number {
  if (result.mode !== 'pipeline') return 0
  const count = result.preparedSite.documents.reduce((sum, doc) => sum + (doc.semantic?.sections.length ?? 0), 0)
  if (count > 0) return count
  return result.preparedSite.documents.reduce((sum, doc) => sum + Math.max(0, doc.domOutline?.bodyChildElements.length ?? 0), 0)
}

export async function bootstrapRuntimeFromTemplateSite(input: {
  site: CreatedSiteRecord
  template: BootstrapTemplateRecord
  deps?: Partial<BootstrapDeps>
}): Promise<TemplateSiteRuntimeBootstrapResult> {
  const deps = { ...defaultDeps(), ...(input.deps ?? {}) }
  const siteId = input.site.siteId
  const templateId = input.template.id
  const importSnapshotId = normalizeText(input.template.importSnapshotId)
  const entryHtmlPath = normalizeText(input.template.entryHtmlPath)

  console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_STARTED', {
    siteId,
    templateId,
    importSnapshotId: importSnapshotId || null,
    entryHtmlPath: entryHtmlPath || null,
  })

  try {
    if (!importSnapshotId) {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_TEMPLATE_ARTIFACT_MISSING',
        message: 'Template import snapshot reference is missing.',
        siteId,
        templateId,
      })
    }
    if (!entryHtmlPath) {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_TEMPLATE_ARTIFACT_MISSING',
        message: 'Template entry HTML reference is missing.',
        siteId,
        templateId,
      })
    }

    console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_TEMPLATE_RESOLVED', {
      siteId,
      templateId,
      importSnapshotId,
      entryHtmlPath,
    })

    const snapshotBaseDirAbs = resolveTemplateSnapshotRoot(importSnapshotId)
    const snapshotRootDirAbs = path.resolve(snapshotBaseDirAbs, 'extracted')
    const entryHtmlPathAbs = path.resolve(snapshotRootDirAbs, entryHtmlPath.replaceAll('\\', '/'))
    const assetsDirRel = normalizeText(input.template.importManifestSummary?.assetsDirPath) || 'assets'
    const assetsDirAbs = path.resolve(snapshotRootDirAbs, assetsDirRel)

    if (!fs.existsSync(snapshotRootDirAbs)) {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING',
        message: `Template snapshot directory is missing: ${snapshotRootDirAbs}`,
        siteId,
        templateId,
      })
    }
    if (!fs.existsSync(entryHtmlPathAbs)) {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING',
        message: `Template entry HTML is missing: ${entryHtmlPathAbs}`,
        siteId,
        templateId,
      })
    }

    const html = fs.readFileSync(entryHtmlPathAbs, 'utf8')
    if (!normalizeText(html)) {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING',
        message: `Template entry HTML is empty: ${entryHtmlPathAbs}`,
        siteId,
        templateId,
      })
    }

    console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_RESOLVED', {
      siteId,
      templateId,
      sourcePathRef: entryHtmlPathAbs,
      snapshotRootDirAbs,
      assetsDirAbs,
    })

    const snapshot = createTemplateSnapshot({
      site: input.site,
      template: input.template,
      snapshotRootDirAbs,
      entryHtmlPathAbs,
      assetsDirAbs,
      html,
      now: deps.now(),
    })

    const scoped = await deps.runScopedImportPipeline({
      snapshot,
      sourceUrl: normalizeDomainAsUrl(input.site.domain),
      actor: `template-bootstrap:${siteId}`,
      fallbackToLegacyOnPipelineFailure: false,
    })

    if (scoped.mode !== 'pipeline') {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_RUNTIME_VERSION_MISSING',
        message: 'Template runtime bootstrap completed without canonical pipeline runtime version.',
        siteId,
        templateId,
      })
    }

    await deps.writeOwnershipLink({ siteId, siteVersionId: scoped.siteVersionId })

    console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_RUNTIME_VERSION_CREATED', {
      siteId,
      templateId,
      siteVersionId: scoped.siteVersionId,
      runtimeSiteId: scoped.siteId,
      versionNo: scoped.versionNo,
    })

    const sectionCount = countPreparedSections(scoped)
    const previewSeeded = normalizeText(scoped.artifactId).length > 0

    console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_PREVIEW_SEEDED', {
      siteId,
      templateId,
      siteVersionId: scoped.siteVersionId,
      previewArtifactAvailable: previewSeeded,
      artifactId: scoped.artifactId,
      sectionCount,
    })

    console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_COMPLETED', {
      siteId,
      templateId,
      siteVersionId: scoped.siteVersionId,
      previewArtifactAvailable: previewSeeded,
      sectionCount,
    })

    return {
      siteVersionId: scoped.siteVersionId,
      siteVersionNo: scoped.versionNo,
      runtimeSiteId: scoped.siteId,
      artifactId: scoped.artifactId,
      previewSeeded,
      sectionCount,
    }
  } catch (error) {
    const mapped = mapBootstrapError({ error, siteId, templateId })
    console.error('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_FAILED', {
      siteId,
      templateId,
      code: mapped.code,
      message: mapped.message,
    })
    throw mapped
  }
}

export function parseTemplateSiteRuntimeBootstrapError(
  error: unknown,
): { status: number; code: TemplateSiteRuntimeBootstrapErrorCode; message: string; siteId: string; templateId: string } | null {
  if (error instanceof TemplateSiteRuntimeBootstrapError) {
    return {
      status: 500,
      code: error.code,
      message: error.message,
      siteId: error.siteId,
      templateId: error.templateId,
    }
  }

  const raw = error as Record<string, unknown> | null
  const code = normalizeText(raw?.code)
  const siteId = normalizeText(raw?.siteId)
  const templateId = normalizeText(raw?.templateId)
  const message = normalizeText(raw?.message)
  const knownCode =
    code === 'TEMPLATE_SITE_BOOTSTRAP_TEMPLATE_ARTIFACT_MISSING' ||
    code === 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING' ||
    code === 'TEMPLATE_SITE_BOOTSTRAP_RUNTIME_VERSION_MISSING' ||
    code === 'TEMPLATE_SITE_BOOTSTRAP_FAILED'
      ? (code as TemplateSiteRuntimeBootstrapErrorCode)
      : null
  if (!knownCode || !siteId || !templateId) return null
  return {
    status: 500,
    code: knownCode,
    message: message || 'Template runtime bootstrap failed.',
    siteId,
    templateId,
  }
}
