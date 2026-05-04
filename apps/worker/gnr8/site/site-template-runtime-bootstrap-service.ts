import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { getSuperadminPool } from '@/src/superadmin/db'
import { ScopedImportPipelineFailureError, type ScopedImportPipelineOutcome } from '@/gnr8/site/scoped-import-pipeline'
import { TEMPLATE_ZIP_MAX_BYTES, validateAndExtractTemplateZip } from '@/gnr8/template-intake/core/template-zip-validator'
import { persistTemplateDurableSourceSnapshot } from '@/gnr8/template-intake/storage/template-durable-source'
import { loadTemplateSourceZip } from '@/gnr8/template-intake/storage/template-source-zip-storage'
import type { TemplateRecord } from '@/gnr8/template-intake/types/template-intake-types'
import {
  URL_SINGLE_PAGE_IMPORT_VERSION,
  type RenderedDomQuality,
} from '@/gnr8/validation/runtime/url-single-page-import-contract'
import type { UrlSinglePageImportSnapshot } from '@/gnr8/validation/runtime/url-single-page-import'
import { runSemanticImportEngine, type SemanticImportResult } from '@/gnr8/import-semantic/semantic-import-engine'
import { inferContentSlotsFromSemanticImport } from '@/gnr8/runtime/content-binding'
import { getRawTemplateSiteArtifact, getRawTemplateSiteAsset, getSiteVersion, upsertContentSlots } from '@/gnr8/runtime/runtime-store'

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

type BootstrapSiteRecord = {
  siteId: string
  clientId: string
  agencyId: string
  templateId: string
  name: string
  domain: string
  status: string
  createdAt: string
  updatedAt: string
}

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
  persistRawTemplateSiteArtifact: (input: {
    siteId: string
    siteVersionId: string
    snapshotRootDirAbs: string
    entryHtmlPathAbs: string
  }) => Promise<{
    artifactId: string
    artifactType: 'raw_template_site'
    entryHtmlPath: string
    assetBasePath: string
    fileMap: Record<string, { path: string; mediaType: string; sizeBytes: number; sha256: string }>
    fileCount: number
  }>
  persistContentSlots: (input: {
    siteId: string
    siteVersionId: string
    html: string
    semanticImport: SemanticImportResult
  }) => Promise<number>
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
    persistRawTemplateSiteArtifact,
    persistContentSlots,
    now: () => new Date(),
  }
}

async function persistContentSlots(input: {
  siteId: string
  siteVersionId: string
  html: string
  semanticImport: SemanticImportResult
}): Promise<number> {
  const inferred = inferContentSlotsFromSemanticImport({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    html: input.html,
    semanticImport: input.semanticImport,
  })
  return upsertContentSlots({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    slots: inferred.slots,
  })
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeDomainAsUrl(domain: string): string {
  const normalized = normalizeText(domain).replace(/^https?:\/\//i, '').replace(/\/+$/g, '')
  return `https://${normalized || 'invalid.local'}`
}

function normalizeDiagnosticDetails(details: unknown): Record<string, unknown> | null {
  if (details == null) return null
  if (typeof details === 'object' && !Array.isArray(details)) {
    return details as Record<string, unknown>
  }
  if (Array.isArray(details)) {
    return { values: details }
  }
  return { value: details }
}

function resolveTemplateSnapshotRoot(snapshotId: string): string {
  return path.resolve(os.tmpdir(), 'gnr8', 'template-intake', snapshotId)
}

type TemplateBootstrapSourceMode = 'durable' | 'legacy' | 'zip_reconstruction'

type TemplateBootstrapSourceCandidate = {
  sourceMode: 'durable' | 'legacy_temp'
  snapshotRootDirAbs: string
  configuredEntryHtmlPathRel: string
  configuredAssetsDirRel: string | null
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
  site: BootstrapSiteRecord
  template: BootstrapTemplateRecord
  snapshotRootDirAbs: string
  entryHtmlPathAbs: string
  assetsDirAbs: string | null
  html: string
  semanticImport: SemanticImportResult
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
    captureMode: 'raw_html_only',
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
    assetsDirAbs: input.assetsDirAbs ?? path.resolve(input.snapshotRootDirAbs, 'assets'),
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
    semanticImport: input.semanticImport,
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
  const assetsDirRel = normalizeText(input.template.importManifestSummary?.assetsDirPath) || null
  const candidates: TemplateBootstrapSourceCandidate[] = []

  const durableRoot = normalizeText(input.template.durableSnapshotRootDirAbs)
  if (durableRoot && entryHtmlPath) {
    const snapshotRootDirAbs = path.resolve(durableRoot)
    candidates.push({
      sourceMode: 'durable',
      snapshotRootDirAbs,
      configuredEntryHtmlPathRel: entryHtmlPath,
      configuredAssetsDirRel: assetsDirRel,
    })
  }

  const importSnapshotId = normalizeText(input.template.importSnapshotId)
  if (importSnapshotId && entryHtmlPath) {
    const snapshotRootDirAbs = path.resolve(resolveTemplateSnapshotRoot(importSnapshotId), 'extracted')
    candidates.push({
      sourceMode: 'legacy_temp',
      snapshotRootDirAbs,
      configuredEntryHtmlPathRel: entryHtmlPath,
      configuredAssetsDirRel: assetsDirRel,
    })
  }

  return candidates
}

function mapCandidateMode(candidate: TemplateBootstrapSourceCandidate['sourceMode']): TemplateBootstrapSourceMode {
  return candidate === 'durable' ? 'durable' : 'legacy'
}

function normalizeRelPath(value: unknown): string {
  return normalizeText(value).replaceAll('\\', '/').replace(/^\/+/, '').replace(/^\.\/+/, '')
}

function isPathWithinRoot(input: { rootDirAbs: string; targetPathAbs: string }): boolean {
  const rootDirAbs = path.resolve(input.rootDirAbs)
  const targetPathAbs = path.resolve(input.targetPathAbs)
  const rel = path.relative(rootDirAbs, targetPathAbs)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

function resolveFirstExistingPath(input: { rootDirAbs: string; relativeCandidates: string[]; expectDirectory: boolean }): string | null {
  for (const relCandidate of input.relativeCandidates) {
    const normalizedRel = normalizeRelPath(relCandidate)
    if (!normalizedRel) continue
    const abs = path.resolve(input.rootDirAbs, normalizedRel)
    if (!isPathWithinRoot({ rootDirAbs: input.rootDirAbs, targetPathAbs: abs })) continue
    try {
      const stat = fs.statSync(abs)
      if (input.expectDirectory ? stat.isDirectory() : stat.isFile()) return abs
    } catch {
      continue
    }
  }
  return null
}

function scanHtmlFilesInRoot(input: { rootDirAbs: string; maxFiles?: number }): string[] {
  const maxFiles = Math.max(1, Math.floor(input.maxFiles ?? 200))
  const out: string[] = []
  const stack: string[] = [path.resolve(input.rootDirAbs)]
  while (stack.length > 0 && out.length < maxFiles) {
    const current = stack.pop()
    if (!current) continue
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      continue
    }
    for (const entry of entries) {
      const abs = path.resolve(current, entry.name)
      if (!isPathWithinRoot({ rootDirAbs: input.rootDirAbs, targetPathAbs: abs })) continue
      if (entry.isDirectory()) {
        stack.push(abs)
        continue
      }
      if (!entry.isFile()) continue
      if (!/\.html?$/i.test(entry.name)) continue
      const rel = path.relative(input.rootDirAbs, abs).replaceAll('\\', '/')
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue
      out.push(rel)
      if (out.length >= maxFiles) break
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

function scanAllFilesInRoot(input: { rootDirAbs: string; maxFiles?: number }): string[] {
  const maxFiles = Math.max(1, Math.floor(input.maxFiles ?? 5000))
  const out: string[] = []
  const stack: string[] = [path.resolve(input.rootDirAbs)]
  while (stack.length > 0 && out.length < maxFiles) {
    const current = stack.pop()
    if (!current) continue
    let entries: fs.Dirent[] = []
    try {
      entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    } catch {
      continue
    }
    for (const entry of entries) {
      const abs = path.resolve(current, entry.name)
      if (!isPathWithinRoot({ rootDirAbs: input.rootDirAbs, targetPathAbs: abs })) continue
      if (entry.isDirectory()) {
        stack.push(abs)
        continue
      }
      if (!entry.isFile()) continue
      const rel = path.relative(input.rootDirAbs, abs).replaceAll('\\', '/')
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) continue
      out.push(rel)
      if (out.length >= maxFiles) break
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
}

function mediaTypeFromExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.html' || ext === '.htm') return 'text/html; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'text/javascript; charset=utf-8'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.avif') return 'image/avif'
  if (ext === '.ico') return 'image/x-icon'
  if (ext === '.woff') return 'font/woff'
  if (ext === '.woff2') return 'font/woff2'
  if (ext === '.ttf') return 'font/ttf'
  if (ext === '.otf') return 'font/otf'
  if (ext === '.eot') return 'application/vnd.ms-fontobject'
  if (ext === '.xml') return 'application/xml; charset=utf-8'
  if (ext === '.txt') return 'text/plain; charset=utf-8'
  return 'application/octet-stream'
}

function sanitizeRawTemplatePath(relativePath: string): string {
  const normalized = normalizeRelPath(relativePath)
  if (!normalized || normalized.includes('..')) return ''
  return normalized
}

async function persistRawTemplateSiteArtifact(input: {
  siteId: string
  siteVersionId: string
  snapshotRootDirAbs: string
  entryHtmlPathAbs: string
}): Promise<{
  artifactId: string
  artifactType: 'raw_template_site'
  entryHtmlPath: string
  assetBasePath: string
  fileMap: Record<string, { path: string; mediaType: string; sizeBytes: number; sha256: string }>
  fileCount: number
}> {
  const snapshotRootDirAbs = path.resolve(input.snapshotRootDirAbs)
  const entryHtmlPathAbs = path.resolve(input.entryHtmlPathAbs)
  const entryHtmlPath = sanitizeRawTemplatePath(path.relative(snapshotRootDirAbs, entryHtmlPathAbs).replaceAll('\\', '/'))
  if (!entryHtmlPath) {
    throw new Error('RAW_TEMPLATE_ARTIFACT_ENTRY_HTML_INVALID')
  }
  const assetBasePath = sanitizeRawTemplatePath(path.posix.dirname(entryHtmlPath)) || '.'
  const filePaths = scanAllFilesInRoot({ rootDirAbs: snapshotRootDirAbs, maxFiles: 10000 })
  const fileMap: Record<string, { path: string; mediaType: string; sizeBytes: number; sha256: string }> = {}
  const fileRows: Array<{ path: string; mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer }> = []

  for (const relPath of filePaths) {
    const safePath = sanitizeRawTemplatePath(relPath)
    if (!safePath) continue
    const absPath = path.resolve(snapshotRootDirAbs, safePath)
    if (!isPathWithinRoot({ rootDirAbs: snapshotRootDirAbs, targetPathAbs: absPath })) continue
    let bytes: Buffer
    try {
      bytes = fs.readFileSync(absPath)
    } catch {
      continue
    }
    const mediaType = mediaTypeFromExtension(safePath)
    const sizeBytes = bytes.byteLength
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
    fileRows.push({ path: safePath, mediaType, sizeBytes, sha256, bytes })
    fileMap[safePath] = { path: safePath, mediaType, sizeBytes, sha256 }
  }

  if (!fileMap[entryHtmlPath]) {
    throw new Error('RAW_TEMPLATE_ARTIFACT_ENTRY_HTML_MISSING')
  }

  const client = await getSuperadminPool().connect()
  try {
    await client.query('begin')
    await client.query(`
      create table if not exists public.gnr8_runtime_raw_template_artifacts (
        id uuid primary key default gen_random_uuid(),
        artifact_type text not null default 'raw_template_site',
        site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
        site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
        entry_html_path text not null,
        asset_base_path text not null,
        file_map jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        unique (site_version_id)
      )
    `)
    await client.query(`
      create table if not exists public.gnr8_runtime_raw_template_artifact_files (
        artifact_id uuid not null references public.gnr8_runtime_raw_template_artifacts(id) on delete cascade,
        file_path text not null,
        media_type text not null,
        file_size_bytes integer not null,
        sha256 text not null,
        content_bytes bytea not null,
        created_at timestamptz not null default now(),
        primary key (artifact_id, file_path)
      )
    `)

    const upsert = await client.query<{ id: string }>(
      `
      insert into public.gnr8_runtime_raw_template_artifacts (
        site_id,
        site_version_id,
        artifact_type,
        entry_html_path,
        asset_base_path,
        file_map
      )
      values ($1::text, $2::uuid, 'raw_template_site', $3::text, $4::text, $5::jsonb)
      on conflict (site_version_id)
      do update set
        site_id = excluded.site_id,
        artifact_type = excluded.artifact_type,
        entry_html_path = excluded.entry_html_path,
        asset_base_path = excluded.asset_base_path,
        file_map = excluded.file_map
      returning id::text as id
      `,
      [input.siteId, input.siteVersionId, entryHtmlPath, assetBasePath, JSON.stringify(fileMap)],
    )
    const artifactId = upsert.rows[0]?.id
    if (!artifactId) throw new Error('RAW_TEMPLATE_ARTIFACT_UPSERT_FAILED')

    await client.query(`delete from public.gnr8_runtime_raw_template_artifact_files where artifact_id = $1::uuid`, [artifactId])
    for (const file of fileRows) {
      await client.query(
        `
        insert into public.gnr8_runtime_raw_template_artifact_files (
          artifact_id,
          file_path,
          media_type,
          file_size_bytes,
          sha256,
          content_bytes
        )
        values ($1::uuid, $2::text, $3::text, $4::integer, $5::text, $6::bytea)
        `,
        [artifactId, file.path, file.mediaType, file.sizeBytes, file.sha256, file.bytes],
      )
    }
    await client.query('commit')
    return {
      artifactId,
      artifactType: 'raw_template_site',
      entryHtmlPath,
      assetBasePath,
      fileMap,
      fileCount: fileRows.length,
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

function resolveEntryPathFromCandidate(input: {
  snapshotRootDirAbs: string
  configuredEntryHtmlPathRel: string
}): string | null {
  const configuredRel = normalizeRelPath(input.configuredEntryHtmlPathRel)
  const discoveredHtml = scanHtmlFilesInRoot({ rootDirAbs: input.snapshotRootDirAbs, maxFiles: 64 })
  const relativeCandidates = [
    configuredRel,
    'index.html',
    ...discoveredHtml.filter((candidate) => candidate.endsWith('/index.html')),
    ...discoveredHtml,
  ]
  return resolveFirstExistingPath({
    rootDirAbs: input.snapshotRootDirAbs,
    relativeCandidates,
    expectDirectory: false,
  })
}

function summarizeDirectoryEntries(input: { dirAbs: string; maxEntries?: number }): {
  dirAbs: string
  exists: boolean
  readable: boolean
  entries: string[]
  truncated: boolean
  error: string | null
} {
  const maxEntries = Math.max(1, Math.floor(input.maxEntries ?? 30))
  const dirAbs = path.resolve(input.dirAbs)
  let exists = false
  let readable = false
  let entries: string[] = []
  let truncated = false
  let error: string | null = null
  try {
    const stat = fs.statSync(dirAbs)
    exists = stat.isDirectory()
    if (exists) {
      fs.accessSync(dirAbs, fs.constants.R_OK)
      readable = true
      const allEntries = fs.readdirSync(dirAbs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
      truncated = allEntries.length > maxEntries
      entries = allEntries.slice(0, maxEntries).map((entry) => `${entry.name}${entry.isDirectory() ? '/' : ''}`)
    }
  } catch (err) {
    error = String((err as Error)?.message ?? err)
  }
  return {
    dirAbs,
    exists,
    readable,
    entries,
    truncated,
    error,
  }
}

function validateBootstrapImportInput(input: {
  snapshotRootDirAbs: string
  entryHtmlPathAbs: string
  assetsDirAbs: string | null
}): {
  ok: boolean
  issues: Array<{ code: string; message: string; details: Record<string, unknown> }>
  exists: {
    snapshotRootExists: boolean
    entryHtmlExists: boolean
    assetsDirProvided: boolean
    assetsDirExists: boolean
  }
} {
  const snapshotRootDirAbs = path.resolve(input.snapshotRootDirAbs)
  const entryHtmlPathAbs = path.resolve(input.entryHtmlPathAbs)
  const assetsDirAbs = input.assetsDirAbs ? path.resolve(input.assetsDirAbs) : null
  const issues: Array<{ code: string; message: string; details: Record<string, unknown> }> = []
  const exists = {
    snapshotRootExists: false,
    entryHtmlExists: false,
    assetsDirProvided: assetsDirAbs !== null,
    assetsDirExists: false,
  }
  try {
    const rootStat = fs.statSync(snapshotRootDirAbs)
    exists.snapshotRootExists = rootStat.isDirectory()
    if (!exists.snapshotRootExists) {
      issues.push({
        code: 'SNAPSHOT_ROOT_NOT_DIRECTORY',
        message: 'snapshotRootDirAbs is not a directory.',
        details: { snapshotRootDirAbs },
      })
    }
  } catch (err) {
    issues.push({
      code: 'SNAPSHOT_ROOT_MISSING',
      message: 'snapshotRootDirAbs is missing or unreadable.',
      details: { snapshotRootDirAbs, error: String((err as Error)?.message ?? err) },
    })
  }
  if (!isPathWithinRoot({ rootDirAbs: snapshotRootDirAbs, targetPathAbs: entryHtmlPathAbs })) {
    issues.push({
      code: 'ENTRY_HTML_OUTSIDE_SNAPSHOT_ROOT',
      message: 'entryHtmlPathAbs resolves outside snapshotRootDirAbs.',
      details: { snapshotRootDirAbs, entryHtmlPathAbs },
    })
  }
  if (assetsDirAbs && !isPathWithinRoot({ rootDirAbs: snapshotRootDirAbs, targetPathAbs: assetsDirAbs })) {
    issues.push({
      code: 'ASSETS_DIR_OUTSIDE_SNAPSHOT_ROOT',
      message: 'assetsDirAbs resolves outside snapshotRootDirAbs.',
      details: { snapshotRootDirAbs, assetsDirAbs },
    })
  }
  try {
    const entryStat = fs.statSync(entryHtmlPathAbs)
    exists.entryHtmlExists = entryStat.isFile()
    if (!exists.entryHtmlExists) {
      issues.push({
        code: 'ENTRY_HTML_NOT_FILE',
        message: 'entryHtmlPathAbs exists but is not a file.',
        details: { entryHtmlPathAbs },
      })
    } else {
      fs.accessSync(entryHtmlPathAbs, fs.constants.R_OK)
    }
  } catch (err) {
    issues.push({
      code: 'ENTRY_HTML_MISSING',
      message: 'entryHtmlPathAbs is missing or unreadable.',
      details: { entryHtmlPathAbs, error: String((err as Error)?.message ?? err) },
    })
  }
  if (assetsDirAbs) {
    try {
      const assetsStat = fs.statSync(assetsDirAbs)
      exists.assetsDirExists = assetsStat.isDirectory()
      if (!exists.assetsDirExists) {
        issues.push({
          code: 'ASSETS_DIR_NOT_DIRECTORY',
          message: 'assetsDirAbs exists but is not a directory.',
          details: { assetsDirAbs },
        })
      }
    } catch (err) {
      issues.push({
        code: 'ASSETS_DIR_MISSING',
        message: 'assetsDirAbs is missing or unreadable.',
        details: { assetsDirAbs, error: String((err as Error)?.message ?? err) },
      })
    }
  }
  return {
    ok: issues.length === 0,
    issues,
    exists,
  }
}

async function resolveTemplateBootstrapSource(input: {
  template: BootstrapTemplateRecord
  deps: BootstrapDeps
}): Promise<
  | {
      sourceMode: TemplateBootstrapSourceMode
      snapshotRootDirAbs: string
      entryHtmlPathAbs: string
      assetsDirAbs: string | null
      html: string
    }
  | null
> {
  const templateId = input.template.id
  const entryHtmlPath = normalizeText(input.template.entryHtmlPath).replaceAll('\\', '/').replace(/^\/+/, '')
  const sourceCandidates = resolveTemplateBootstrapSourceCandidates({ template: input.template })
  const assetsDirRel = normalizeText(input.template.importManifestSummary?.assetsDirPath) || null
  const sourceZipStorageBucket = normalizeText(input.template.sourceZipStorageBucket)
  const sourceZipStorageKey = normalizeText(input.template.sourceZipStorageKey)

  for (const candidate of sourceCandidates) {
    if (!fs.existsSync(candidate.snapshotRootDirAbs)) {
      continue
    }
    const entryHtmlPathAbs = resolveEntryPathFromCandidate({
      snapshotRootDirAbs: candidate.snapshotRootDirAbs,
      configuredEntryHtmlPathRel: candidate.configuredEntryHtmlPathRel,
    })
    if (!entryHtmlPathAbs) continue
    const entryHtmlRel = path.relative(candidate.snapshotRootDirAbs, entryHtmlPathAbs).replaceAll('\\', '/')
    const configuredAssetsDirRel = normalizeRelPath(candidate.configuredAssetsDirRel)
    const configuredAssetsDirAbs = configuredAssetsDirRel
      ? path.resolve(candidate.snapshotRootDirAbs, configuredAssetsDirRel)
      : null
    const discoveredAssetsDirAbs = resolveFirstExistingPath({
      rootDirAbs: candidate.snapshotRootDirAbs,
      relativeCandidates: [
        configuredAssetsDirRel,
        `${path.posix.dirname(entryHtmlRel)}/assets`,
        'assets',
      ],
      expectDirectory: true,
    })
    const assetsDirAbs = configuredAssetsDirAbs ?? discoveredAssetsDirAbs
    try {
      const html = fs.readFileSync(entryHtmlPathAbs, 'utf8')
      if (!normalizeText(html)) continue
      const sourceMode = mapCandidateMode(candidate.sourceMode)
      return {
        sourceMode,
        snapshotRootDirAbs: candidate.snapshotRootDirAbs,
        entryHtmlPathAbs,
        assetsDirAbs,
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
        const requestedEntryRel = normalizeRelPath(entryHtmlPath)
        const extractedEntryPath = path.resolve(zipValidation.validation.extractionRootDirAbs, requestedEntryRel)
        const chosenEntryAbs = fs.existsSync(extractedEntryPath)
          ? extractedEntryPath
          : path.resolve(
              zipValidation.validation.extractionRootDirAbs,
              normalizeRelPath(zipValidation.validation.entryHtmlPath),
            )
        if (fs.existsSync(chosenEntryAbs)) {
          const html = fs.readFileSync(chosenEntryAbs, 'utf8')
          if (normalizeText(html)) {
            const resolvedEntryRel =
              path.relative(zipValidation.validation.extractionRootDirAbs, chosenEntryAbs).replaceAll('\\', '/') ||
              normalizeRelPath(zipValidation.validation.entryHtmlPath) ||
              'index.html'
            const configuredAssetsDirRel = normalizeRelPath(assetsDirRel)
            const configuredAssetsDirAbs = configuredAssetsDirRel
              ? path.resolve(zipValidation.validation.extractionRootDirAbs, configuredAssetsDirRel)
              : null
            const resolvedAssetsRelCandidates = [
              configuredAssetsDirRel,
              normalizeRelPath(zipValidation.validation.assetsDirPath),
              `${path.posix.dirname(resolvedEntryRel)}/assets`,
              'assets',
            ]
            const discoveredAssetsDirAbs = resolveFirstExistingPath({
              rootDirAbs: zipValidation.validation.extractionRootDirAbs,
              relativeCandidates: resolvedAssetsRelCandidates,
              expectDirectory: true,
            })
            const resolvedAssetsDirAbs = configuredAssetsDirAbs ?? discoveredAssetsDirAbs
            const persistedSource = input.deps.persistTemplateDurableSourceSnapshot({
              templateId,
              extractionRootDirAbs: zipValidation.validation.extractionRootDirAbs,
              entryHtmlPath: resolvedEntryRel,
              entryHtmlContent: html,
              sourceFilePaths: zipValidation.validation.extractedFilePaths ?? [],
            })
            const durableEntryHtmlPathAbs = path.resolve(
              persistedSource.durableSnapshotRootDirAbs,
              resolvedEntryRel,
            )
            return {
              sourceMode: 'zip_reconstruction',
              snapshotRootDirAbs: persistedSource.durableSnapshotRootDirAbs,
              entryHtmlPathAbs: durableEntryHtmlPathAbs,
              assetsDirAbs: resolvedAssetsDirAbs
                ? path.resolve(
                    persistedSource.durableSnapshotRootDirAbs,
                    path.relative(zipValidation.validation.extractionRootDirAbs, resolvedAssetsDirAbs),
                  )
                : null,
              html,
            }
          }
        }
      }
    } catch {
      // Deterministic unavailable diagnostic is surfaced by null result.
    }
  }
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

function summarizeBootstrapFailure(input: { error: unknown }): {
  stageId: string | null
  stageDiagnostics: unknown[] | null
  pipelineSummary: string | null
  pipelineDiagnosticCodes: string[] | null
  pipelineDiagnostics: Array<{
    severity: string
    code: string
    message: string
    source: string
    stageId: string | null
    details: Record<string, unknown> | null
  }> | null
  stageSummaries: string[] | null
  pipelineImportInput: Record<string, unknown> | null
} {
  if (input.error instanceof ScopedImportPipelineFailureError) {
    return {
      stageId: input.error.firstFailedStageId,
      stageDiagnostics: input.error.firstFailedStageDiagnostics,
      pipelineSummary: input.error.pipelineSummary,
      pipelineDiagnosticCodes: input.error.pipelineDiagnosticCodes,
      pipelineDiagnostics: input.error.pipelineDiagnostics,
      stageSummaries: input.error.stageSummaries,
      pipelineImportInput: input.error.importInput,
    }
  }
  return {
    stageId: null,
    stageDiagnostics: null,
    pipelineSummary: null,
    pipelineDiagnosticCodes: null,
    pipelineDiagnostics: null,
    stageSummaries: null,
    pipelineImportInput: null,
  }
}

export async function bootstrapRuntimeFromTemplateSite(input: {
  site: BootstrapSiteRecord
  template: BootstrapTemplateRecord
  deps?: Partial<BootstrapDeps>
}): Promise<TemplateSiteRuntimeBootstrapResult> {
  const deps = { ...defaultDeps(), ...(input.deps ?? {}) }
  const siteId = input.site.siteId
  const templateId = input.template.id
  const templateEntryHtmlPath = normalizeText(input.template.entryHtmlPath)
  let sourceResolutionMode: TemplateBootstrapSourceMode | null = null
  let runtimeSiteId: string | null = null
  let runtimeSiteVersionId: string | null = null

  try {
    if (!templateEntryHtmlPath) {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_TEMPLATE_ARTIFACT_MISSING',
        message: 'Template entry HTML reference is missing.',
        siteId,
        templateId,
      })
    }

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
    sourceResolutionMode = resolvedSource.sourceMode

    const snapshotRootDirAbs = path.resolve(resolvedSource.snapshotRootDirAbs)
    const entryHtmlPathAbs = path.resolve(resolvedSource.entryHtmlPathAbs)
    const assetsDirAbs = resolvedSource.assetsDirAbs ? path.resolve(resolvedSource.assetsDirAbs) : null
    const snapshotEntryHtmlPath = path.relative(snapshotRootDirAbs, entryHtmlPathAbs).replaceAll('\\', '/')
    const snapshotAssetsDirPath = assetsDirAbs ? path.relative(snapshotRootDirAbs, assetsDirAbs).replaceAll('\\', '/') : null
    const preflight = validateBootstrapImportInput({
      snapshotRootDirAbs,
      entryHtmlPathAbs,
      assetsDirAbs,
    })
    const snapshotRootSummary = summarizeDirectoryEntries({ dirAbs: snapshotRootDirAbs, maxEntries: 40 })
    const entryParentSummary = summarizeDirectoryEntries({ dirAbs: path.dirname(entryHtmlPathAbs), maxEntries: 40 })
    const knownGoodReference = {
      sourceKind: 'single-entry-html',
      rootDir: '<snapshot-root-abs>',
      entryHtmlPath: 'index.html',
      assetsDirPath: 'assets',
    }
    const knownGoodComparison = {
      entryIsRootIndex: snapshotEntryHtmlPath === 'index.html',
      assetsIsRootAssets: snapshotAssetsDirPath === 'assets',
      entryParentDirRel: path.relative(snapshotRootDirAbs, path.dirname(entryHtmlPathAbs)).replaceAll('\\', '/'),
    }
    if (!assetsDirAbs) {
      console.info('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_ASSETS_DIR_OPTIONAL_MISSING', {
        siteId,
        templateId,
        sourceResolutionMode,
        snapshotRootDirAbs,
        entryHtmlPath: snapshotEntryHtmlPath,
        assetsDirPresent: false,
      })
    }
    console.info('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_IMPORT_INPUT_RESOLVED', {
      siteId,
      templateId,
      sourceResolutionMode,
      snapshotRootDirAbs,
      entryHtmlPathAbs,
      entryHtmlPath: snapshotEntryHtmlPath,
      assetsDirAbs,
      assetsDirPath: snapshotAssetsDirPath,
      assetsDirPresent: Boolean(assetsDirAbs),
      snapshotRootExists: preflight.exists.snapshotRootExists,
      entryHtmlExists: preflight.exists.entryHtmlExists,
      assetsDirProvided: preflight.exists.assetsDirProvided,
      assetsDirExists: preflight.exists.assetsDirExists,
      knownGoodReference,
      knownGoodComparison,
    })
    console.info('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_IMPORT_INPUT_DIRECTORY_SUMMARY', {
      siteId,
      templateId,
      sourceResolutionMode,
      snapshotRoot: snapshotRootSummary,
      entryParentDir: entryParentSummary,
    })
    if (!preflight.ok) {
      console.error('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_IMPORT_INPUT_MISSING', {
        siteId,
        templateId,
        sourceResolutionMode,
        snapshotRootDirAbs,
        entryHtmlPathAbs,
        entryHtmlPath: snapshotEntryHtmlPath,
        assetsDirAbs,
        assetsDirPath: snapshotAssetsDirPath,
        issues: preflight.issues,
      })
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_IMPORT_SOURCE_MISSING',
        message: `Template bootstrap import input failed preflight: ${preflight.issues.map((issue) => issue.code).join(', ')}`,
        siteId,
        templateId,
      })
    }

    const snapshot = createTemplateSnapshot({
      semanticImport: runSemanticImportEngine({
        normalizedHtml: resolvedSource.html,
        entryHtmlPath: snapshotEntryHtmlPath || 'index.html',
        sourceUrl: normalizeDomainAsUrl(input.site.domain),
        sourceFilename: input.template.sourceFilename,
        captureMode: 'raw_html_only',
        assetManifest: {
          files: Array.isArray((input.template.importManifestSummary as any)?.assets?.files)
            ? ((input.template.importManifestSummary as any).assets.files as Array<Record<string, unknown>>)
            : [],
          references: Array.isArray((input.template.importManifestSummary as any)?.assets?.references)
            ? ((input.template.importManifestSummary as any).assets.references as Array<Record<string, unknown>>)
            : [],
        },
      }),
      site: input.site,
      template: input.template,
      snapshotRootDirAbs,
      entryHtmlPathAbs,
      assetsDirAbs,
      html: resolvedSource.html,
      now: deps.now(),
    })

    console.info('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_PIPELINE_STARTED', {
      siteId,
      templateId,
      runtimeSiteId,
      runtimeSiteVersionId,
      sourceResolutionMode,
      snapshotRootDirAbs: resolvedSource.snapshotRootDirAbs,
      entryHtmlPathAbs: resolvedSource.entryHtmlPathAbs,
      assetsDirAbs: resolvedSource.assetsDirAbs,
      manifestEntryHtmlPath: normalizeText(snapshot.fixtureSpec.entryHtmlPath),
      manifestAssetsDirPath: snapshotAssetsDirPath,
      snapshotEntryHtmlPath,
      snapshotAssetsDirPath,
    })

    let scoped: ScopedImportPipelineOutcome
    try {
      scoped = await deps.runScopedImportPipeline({
        snapshot,
        sourceUrl: normalizeDomainAsUrl(input.site.domain),
        actor: `template-bootstrap:${siteId}`,
        fallbackToLegacyOnPipelineFailure: false,
      })
    } catch (pipelineError) {
      const failure = summarizeBootstrapFailure({ error: pipelineError })
      console.error('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_PIPELINE_STAGE_FAILED', {
        siteId,
        templateId,
        runtimeSiteId,
        runtimeSiteVersionId,
        sourceResolutionMode,
        failingStageId: failure.stageId,
        failingStageDiagnostics: failure.stageDiagnostics,
        pipelineSummary: failure.pipelineSummary,
        pipelineDiagnosticCodes: failure.pipelineDiagnosticCodes,
        pipelineDiagnostics: failure.pipelineDiagnostics,
        stageSummaries: failure.stageSummaries,
        pipelineImportInput: failure.pipelineImportInput,
      })
      if (failure.stageId === 'import_intake') {
        console.error('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_IMPORT_INTAKE_FAILED', {
          siteId,
          templateId,
          runtimeSiteId,
          runtimeSiteVersionId,
          sourceResolutionMode,
          failingStageId: failure.stageId,
          stageDiagnosticCodes: (failure.stageDiagnostics ?? []).map((diag: any) => normalizeText(diag?.code)).filter(Boolean),
          stageDiagnosticMessages: (failure.stageDiagnostics ?? []).map((diag: any) => normalizeText(diag?.message)).filter(Boolean),
          stageDiagnostics: failure.stageDiagnostics,
          pipelineDiagnosticCodes: failure.pipelineDiagnosticCodes,
          pipelineDiagnosticMessages: (failure.pipelineDiagnostics ?? []).map((diag) => normalizeText(diag.message)).filter(Boolean),
          pipelineDiagnostics: failure.pipelineDiagnostics,
          pipelineSummary: failure.pipelineSummary,
          pipelineImportInput: failure.pipelineImportInput,
          invalidContractFields: (failure.stageDiagnostics ?? [])
            .map((diag: any) => normalizeDiagnosticDetails(diag?.details))
            .filter((details: Record<string, unknown> | null): details is Record<string, unknown> => details != null),
        })
      }
      throw pipelineError
    }

    if (scoped.mode !== 'pipeline') {
      throw new TemplateSiteRuntimeBootstrapError({
        code: 'TEMPLATE_SITE_BOOTSTRAP_RUNTIME_VERSION_MISSING',
        message: 'Template runtime bootstrap completed without canonical pipeline runtime version.',
        siteId,
        templateId,
      })
    }
    runtimeSiteId = scoped.siteId
    runtimeSiteVersionId = scoped.siteVersionId

    await deps.writeOwnershipLink({ siteId, siteVersionId: scoped.siteVersionId })
    const rawTemplateArtifact = await deps.persistRawTemplateSiteArtifact({
      siteId: scoped.siteId,
      siteVersionId: scoped.siteVersionId,
      snapshotRootDirAbs,
      entryHtmlPathAbs,
    })
    if (snapshot.semanticImport) {
      console.info('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_STARTED', {
        siteId: scoped.siteId,
        siteVersionId: scoped.siteVersionId,
        templateId,
      })
      const persistedCount = await deps.persistContentSlots({
        siteId: scoped.siteId,
        siteVersionId: scoped.siteVersionId,
        html: resolvedSource.html,
        semanticImport: snapshot.semanticImport,
      })
      console.info('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_PERSISTED_COUNT', {
        siteId: scoped.siteId,
        siteVersionId: scoped.siteVersionId,
        templateId,
        persistedCount,
      })
      if (persistedCount === 0) {
        console.error('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_PERSISTED_COUNT_ZERO', {
          siteId: scoped.siteId,
          siteVersionId: scoped.siteVersionId,
          templateId,
        })
      }
      console.info('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_COMPLETED', {
        siteId: scoped.siteId,
        siteVersionId: scoped.siteVersionId,
        templateId,
      })
    } else {
      console.warn('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_SKIPPED_NO_SEMANTIC_IMPORT', {
        siteId,
        siteVersionId: scoped.siteVersionId,
        templateId,
      })
    }
    console.info('[site-bootstrap-worker] RAW_TEMPLATE_PREVIEW_SELECTED', {
      siteId,
      templateId,
      runtimeSiteId,
      runtimeSiteVersionId,
      artifactType: rawTemplateArtifact.artifactType,
      artifactId: rawTemplateArtifact.artifactId,
      entryHtmlPath: rawTemplateArtifact.entryHtmlPath,
      assetBasePath: rawTemplateArtifact.assetBasePath,
      fileCount: rawTemplateArtifact.fileCount,
    })

    const sectionCount = countPreparedSections(scoped)
    const previewSeeded = normalizeText(scoped.artifactId).length > 0

    return {
      siteVersionId: scoped.siteVersionId,
      siteVersionNo: scoped.versionNo,
      runtimeSiteId: scoped.siteId,
      artifactId: scoped.artifactId,
      previewSeeded,
      sectionCount,
    }
  } catch (error) {
    const failure = summarizeBootstrapFailure({ error })
    console.error('[site-bootstrap-worker] TEMPLATE_SITE_BOOTSTRAP_PIPELINE_FAILED', {
      siteId,
      templateId,
      runtimeSiteId,
      runtimeSiteVersionId,
      sourceResolutionMode,
      failingStageId: failure.stageId,
      failingStageDiagnostics: failure.stageDiagnostics,
      pipelineSummary: failure.pipelineSummary,
      pipelineDiagnosticCodes: failure.pipelineDiagnosticCodes,
      pipelineDiagnostics: failure.pipelineDiagnostics,
      stageSummaries: failure.stageSummaries,
      pipelineImportInput: failure.pipelineImportInput,
      message: error instanceof Error ? error.message : String(error),
    })
    throw mapBootstrapError({ error, siteId, templateId })
  }
}

export async function regenerateContentSlotsForSiteVersion(
  input: { siteVersionId: string },
  deps?: {
    getSiteVersion?: typeof getSiteVersion
    getRawTemplateSiteArtifact?: typeof getRawTemplateSiteArtifact
    getRawTemplateSiteAsset?: typeof getRawTemplateSiteAsset
    persistContentSlots?: typeof persistContentSlots
  },
): Promise<{
  siteId: string
  siteVersionId: string
  persistedCount: number
  skippedReason: null | 'SITE_VERSION_NOT_FOUND' | 'RAW_TEMPLATE_ARTIFACT_NOT_FOUND' | 'ENTRY_HTML_MISSING' | 'SEMANTIC_IMPORT_MISSING'
}> {
  const resolvedDeps = {
    getSiteVersion,
    getRawTemplateSiteArtifact,
    getRawTemplateSiteAsset,
    persistContentSlots,
    ...(deps ?? {}),
  }

  const siteVersion = await resolvedDeps.getSiteVersion(input.siteVersionId)
  if (!siteVersion) {
    return {
      siteId: '',
      siteVersionId: input.siteVersionId,
      persistedCount: 0,
      skippedReason: 'SITE_VERSION_NOT_FOUND',
    }
  }
  const artifact = await resolvedDeps.getRawTemplateSiteArtifact(input.siteVersionId)
  if (!artifact) {
    return {
      siteId: siteVersion.siteId,
      siteVersionId: input.siteVersionId,
      persistedCount: 0,
      skippedReason: 'RAW_TEMPLATE_ARTIFACT_NOT_FOUND',
    }
  }
  const htmlAsset = await resolvedDeps.getRawTemplateSiteAsset({
    siteVersionId: input.siteVersionId,
    filePath: artifact.entryHtmlPath,
  })
  if (!htmlAsset) {
    return {
      siteId: siteVersion.siteId,
      siteVersionId: input.siteVersionId,
      persistedCount: 0,
      skippedReason: 'ENTRY_HTML_MISSING',
    }
  }
  const semanticImport = siteVersion.importProvenanceSummary?.semanticImport ?? null
  if (!semanticImport) {
    return {
      siteId: siteVersion.siteId,
      siteVersionId: input.siteVersionId,
      persistedCount: 0,
      skippedReason: 'SEMANTIC_IMPORT_MISSING',
    }
  }
  console.info('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_STARTED', {
    siteId: siteVersion.siteId,
    siteVersionId: input.siteVersionId,
    source: 'operator_backfill',
  })
  const persistedCount = await resolvedDeps.persistContentSlots({
    siteId: siteVersion.siteId,
    siteVersionId: input.siteVersionId,
    html: htmlAsset.bytes.toString('utf8'),
    semanticImport,
  })
  console.info('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_PERSISTED_COUNT', {
    siteId: siteVersion.siteId,
    siteVersionId: input.siteVersionId,
    source: 'operator_backfill',
    persistedCount,
  })
  if (persistedCount === 0) {
    console.error('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_PERSISTED_COUNT_ZERO', {
      siteId: siteVersion.siteId,
      siteVersionId: input.siteVersionId,
      source: 'operator_backfill',
    })
  }
  console.info('[site-bootstrap-worker] CONTENT_SLOT_BOOTSTRAP_COMPLETED', {
    siteId: siteVersion.siteId,
    siteVersionId: input.siteVersionId,
    source: 'operator_backfill',
  })
  return {
    siteId: siteVersion.siteId,
    siteVersionId: input.siteVersionId,
    persistedCount,
    skippedReason: null,
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
