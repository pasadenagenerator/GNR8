import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { getSuperadminPool } from '@/src/superadmin/db'
import type { CreatedSiteRecord } from '@/gnr8/site/site-template-instantiation-service'
import type { ScopedImportPipelineOutcome } from '@/gnr8/site/scoped-import-pipeline'
import { TEMPLATE_ZIP_MAX_BYTES, validateAndExtractTemplateZip } from '@/gnr8/template-intake/core/template-zip-validator'
import { persistTemplateDurableSourceSnapshot } from '@/gnr8/template-intake/storage/template-durable-source'
import { loadTemplateSourceZip } from '@/gnr8/template-intake/storage/template-source-zip-storage'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'
import {
  URL_SINGLE_PAGE_IMPORT_VERSION,
  type RenderedDomQuality,
} from '@/gnr8/validation/runtime/url-single-page-import-contract'
import type { UrlSinglePageImportSnapshot } from '@/gnr8/validation/runtime/url-single-page-import'

type BootstrapTemplateRecord = Pick<
  TemplateRecord,
  | 'id'
  | 'sourceFilename'
  | 'sourceZipStorageBucket'
  | 'sourceZipStorageKey'
  | 'importSnapshotId'
  | 'entryHtmlPath'
  | 'entryHtmlFileName'
  | 'importManifestSummary'
  | 'durableSnapshotRootDirAbs'
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
  loadTemplateSourceZip: (input: { bucket: string; key: string }) => Promise<Uint8Array>
  validateAndExtractTemplateZip: typeof validateAndExtractTemplateZip
  persistTemplateDurableSourceSnapshot: typeof persistTemplateDurableSourceSnapshot
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
    loadTemplateSourceZip,
    validateAndExtractTemplateZip,
    persistTemplateDurableSourceSnapshot,
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

type TemplateBootstrapSourceMode = 'processed' | 'legacy' | 'zip_reconstructed'

type TemplateBootstrapSourceCandidate = {
  sourceMode: 'durable' | 'legacy_temp'
  snapshotRootDirAbs: string
  entryHtmlPathAbs: string
  assetsDirAbs: string
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

function resolveTemplateBootstrapSourceCandidates(input: {
  template: BootstrapTemplateRecord
}): TemplateBootstrapSourceCandidate[] {
  const entryHtmlPath = normalizeText(input.template.entryHtmlPath).replaceAll('\\', '/').replace(/^\/+/, '')
  const assetsDirRel = normalizeText(input.template.importManifestSummary?.assetsDirPath) || 'assets'
  const candidates: TemplateBootstrapSourceCandidate[] = []

  const durableRoot = normalizeText(input.template.durableSnapshotRootDirAbs)
  if (durableRoot && entryHtmlPath) {
    const snapshotRootDirAbs = path.resolve(durableRoot)
    candidates.push({
      sourceMode: 'durable',
      snapshotRootDirAbs,
      entryHtmlPathAbs: path.resolve(snapshotRootDirAbs, entryHtmlPath),
      assetsDirAbs: path.resolve(snapshotRootDirAbs, assetsDirRel),
    })
  }

  const importSnapshotId = normalizeText(input.template.importSnapshotId)
  if (importSnapshotId && entryHtmlPath) {
    const snapshotRootDirAbs = path.resolve(resolveTemplateSnapshotRoot(importSnapshotId), 'extracted')
    candidates.push({
      sourceMode: 'legacy_temp',
      snapshotRootDirAbs,
      entryHtmlPathAbs: path.resolve(snapshotRootDirAbs, entryHtmlPath),
      assetsDirAbs: path.resolve(snapshotRootDirAbs, assetsDirRel),
    })
  }

  return candidates
}

function mapCandidateMode(candidate: TemplateBootstrapSourceCandidate['sourceMode']): TemplateBootstrapSourceMode {
  return candidate === 'durable' ? 'processed' : 'legacy'
}

async function resolveTemplateBootstrapSource(input: {
  template: BootstrapTemplateRecord
  deps: BootstrapDeps
}): Promise<
  | {
      sourceMode: TemplateBootstrapSourceMode
      snapshotRootDirAbs: string
      entryHtmlPathAbs: string
      assetsDirAbs: string
      html: string
    }
  | null
> {
  const templateId = input.template.id
  const entryHtmlPath = normalizeText(input.template.entryHtmlPath).replaceAll('\\', '/').replace(/^\/+/, '')
  const sourceCandidates = resolveTemplateBootstrapSourceCandidates({ template: input.template })
  const assetsDirRel = normalizeText(input.template.importManifestSummary?.assetsDirPath) || 'assets'
  const sourceZipStorageBucket = normalizeText(input.template.sourceZipStorageBucket)
  const sourceZipStorageKey = normalizeText(input.template.sourceZipStorageKey)

  console.info('[template-site-bootstrap] TEMPLATE_BOOTSTRAP_SOURCE_RESOLUTION_STARTED', {
    templateId,
    entryHtmlPath: entryHtmlPath || null,
    durableSnapshotRootDirAbs: normalizeText(input.template.durableSnapshotRootDirAbs) || null,
    importSnapshotId: normalizeText(input.template.importSnapshotId) || null,
    hasSourceZipReference: Boolean(sourceZipStorageBucket && sourceZipStorageKey),
  })

  for (const candidate of sourceCandidates) {
    if (!fs.existsSync(candidate.snapshotRootDirAbs) || !fs.existsSync(candidate.entryHtmlPathAbs)) {
      continue
    }
    try {
      const html = fs.readFileSync(candidate.entryHtmlPathAbs, 'utf8')
      if (!normalizeText(html)) continue
      const sourceMode = mapCandidateMode(candidate.sourceMode)
      const sourceEvent =
        sourceMode === 'processed' ? 'TEMPLATE_BOOTSTRAP_SOURCE_RESOLVED_PROCESSED' : 'TEMPLATE_BOOTSTRAP_SOURCE_RESOLVED_LEGACY'
      console.info(`[template-site-bootstrap] ${sourceEvent}`, {
        templateId,
        sourceMode,
        snapshotRootDirAbs: candidate.snapshotRootDirAbs,
        entryHtmlPathAbs: candidate.entryHtmlPathAbs,
      })
      return {
        sourceMode,
        snapshotRootDirAbs: candidate.snapshotRootDirAbs,
        entryHtmlPathAbs: candidate.entryHtmlPathAbs,
        assetsDirAbs: candidate.assetsDirAbs,
        html,
      }
    } catch {
      continue
    }
  }

  if (entryHtmlPath && sourceZipStorageBucket && sourceZipStorageKey) {
    try {
      const zipBytes = await input.deps.loadTemplateSourceZip({
        bucket: sourceZipStorageBucket,
        key: sourceZipStorageKey,
      })
      const zipValidation = input.deps.validateAndExtractTemplateZip({
        fileName: normalizeText(input.template.sourceFilename) || `${templateId}.zip`,
        bytes: zipBytes,
        maxBytes: TEMPLATE_ZIP_MAX_BYTES,
      })
      if (zipValidation.ok && zipValidation.validation) {
        const extractedEntryPath = path.resolve(zipValidation.validation.extractionRootDirAbs, entryHtmlPath)
        const chosenEntryAbs = fs.existsSync(extractedEntryPath)
          ? extractedEntryPath
          : path.resolve(
              zipValidation.validation.extractionRootDirAbs,
              normalizeText(zipValidation.validation.entryHtmlPath).replaceAll('\\', '/').replace(/^\/+/, ''),
            )
        if (fs.existsSync(chosenEntryAbs)) {
          const html = fs.readFileSync(chosenEntryAbs, 'utf8')
          if (normalizeText(html)) {
            const persistedSource = input.deps.persistTemplateDurableSourceSnapshot({
              templateId,
              extractionRootDirAbs: zipValidation.validation.extractionRootDirAbs,
              entryHtmlPath: entryHtmlPath || normalizeText(zipValidation.validation.entryHtmlPath) || 'index.html',
              entryHtmlContent: html,
              sourceFilePaths: zipValidation.validation.extractedFilePaths ?? [],
            })
            const durableEntryHtmlPathAbs = path.resolve(
              persistedSource.durableSnapshotRootDirAbs,
              entryHtmlPath || normalizeText(zipValidation.validation.entryHtmlPath) || 'index.html',
            )
            console.info('[template-site-bootstrap] TEMPLATE_BOOTSTRAP_SOURCE_RESOLVED_FROM_ZIP', {
              templateId,
              sourceMode: 'zip_reconstructed',
              sourceZipStorageBucket,
              sourceZipStorageKey,
              snapshotRootDirAbs: persistedSource.durableSnapshotRootDirAbs,
              entryHtmlPathAbs: durableEntryHtmlPathAbs,
            })
            return {
              sourceMode: 'zip_reconstructed',
              snapshotRootDirAbs: persistedSource.durableSnapshotRootDirAbs,
              entryHtmlPathAbs: durableEntryHtmlPathAbs,
              assetsDirAbs: path.resolve(persistedSource.durableSnapshotRootDirAbs, assetsDirRel),
              html,
            }
          }
        }
      }
    } catch {
      // Handled by deterministic unavailable diagnostic below.
    }
  }

  console.error('[template-site-bootstrap] TEMPLATE_BOOTSTRAP_SOURCE_UNAVAILABLE', {
    templateId,
    attemptedEntryHtmlPath: entryHtmlPath || null,
    attemptedCandidateEntryPaths: sourceCandidates.map((candidate) => candidate.entryHtmlPathAbs),
    sourceZipStorageBucket: sourceZipStorageBucket || null,
    sourceZipStorageKey: sourceZipStorageKey || null,
  })
  return null
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
  const entryHtmlPath = normalizeText(input.template.entryHtmlPath)
  const durableSnapshotRootDirAbs = normalizeText(input.template.durableSnapshotRootDirAbs)
  const importSnapshotId = normalizeText(input.template.importSnapshotId)

  console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_STARTED', {
    siteId,
    templateId,
    durableSnapshotRootDirAbs: durableSnapshotRootDirAbs || null,
    importSnapshotId: importSnapshotId || null,
    entryHtmlPath: entryHtmlPath || null,
  })

  try {
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
      durableSnapshotRootDirAbs: durableSnapshotRootDirAbs || null,
      importSnapshotId,
      entryHtmlPath,
    })

    const resolvedSource = await resolveTemplateBootstrapSource({
      template: input.template,
      deps,
    })

    if (!resolvedSource) {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING',
        message: 'Template source is unavailable for bootstrap.',
        siteId,
        templateId,
      })
    }

    console.info('[template-site-bootstrap] TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_RESOLVED', {
      siteId,
      templateId,
      sourcePathRef: resolvedSource.entryHtmlPathAbs,
      snapshotRootDirAbs: resolvedSource.snapshotRootDirAbs,
      assetsDirAbs: resolvedSource.assetsDirAbs,
      sourceMode: resolvedSource.sourceMode,
    })

    const snapshot = createTemplateSnapshot({
      site: input.site,
      template: input.template,
      snapshotRootDirAbs: resolvedSource.snapshotRootDirAbs,
      entryHtmlPathAbs: resolvedSource.entryHtmlPathAbs,
      assetsDirAbs: resolvedSource.assetsDirAbs,
      html: resolvedSource.html,
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
