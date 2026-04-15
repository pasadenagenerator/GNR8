import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import type { TemplateIntakeDiagnostic, TemplateZipValidationResult } from '@/gnr8/template-intake/types/template-intake-types'
import { createTemplateIntakeDiagnostic } from '@/gnr8/template-intake/diagnostics/template-intake-diagnostics'

const MAX_TEMPLATE_ZIP_BYTES = 50 * 1024 * 1024

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function toPosixPath(value: string): string {
  return value.replaceAll('\\', '/')
}

function sanitizeEntryPath(value: string): string {
  return path.posix.normalize(toPosixPath(value).replace(/^\/+/, ''))
}

function isSafeZipEntry(value: string): boolean {
  const rawPosix = toPosixPath(value)
  if (rawPosix.startsWith('/')) return false
  if (/^[a-zA-Z]:\//.test(rawPosix)) return false
  const normalized = sanitizeEntryPath(value)
  if (!normalized || normalized === '.') return false
  if (normalized.startsWith('../')) return false
  if (normalized.includes('/../')) return false
  if (normalized.includes('/./')) return false
  if (normalized.startsWith('/')) return false
  return true
}

function computeAssetSummary(relativePaths: string[]): TemplateZipValidationResult['assetSummary'] {
  let imageCount = 0
  let stylesheetCount = 0
  let scriptCount = 0
  let otherCount = 0

  for (const filePath of relativePaths) {
    const ext = path.extname(filePath).toLowerCase()
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.avif'].includes(ext)) imageCount += 1
    else if (ext === '.css') stylesheetCount += 1
    else if (['.js', '.mjs', '.cjs'].includes(ext)) scriptCount += 1
    else otherCount += 1
  }

  return {
    fileCount: relativePaths.length,
    imageCount,
    stylesheetCount,
    scriptCount,
    otherCount,
  }
}

function selectManifestPath(relativePaths: string[]): string | null {
  const candidates = relativePaths
    .filter((entry) => {
      const base = path.posix.basename(entry).toLowerCase()
      return base === 'template.json' || base === 'manifest.json'
    })
    .sort((a, b) => {
      const aDepth = a.split('/').length
      const bDepth = b.split('/').length
      if (aDepth !== bDepth) return aDepth - bDepth
      const aPriority = path.posix.basename(a).toLowerCase() === 'template.json' ? 0 : 1
      const bPriority = path.posix.basename(b).toLowerCase() === 'template.json' ? 0 : 1
      if (aPriority !== bPriority) return aPriority - bPriority
      return a.localeCompare(b)
    })

  return candidates[0] ?? null
}

function selectEntryHtmlPath(relativePaths: string[]): {
  entryHtmlPath: string | null
  selection: TemplateZipValidationResult['entryHtmlSelection']
  htmlCandidates: string[]
} {
  const htmlCandidates = relativePaths
    .filter((entry) => !entry.includes('/') && entry.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b))

  if (htmlCandidates.length > 1) {
    return {
      entryHtmlPath: null,
      selection: 'ambiguous',
      htmlCandidates,
    }
  }

  const rootIndex = htmlCandidates[0]?.toLowerCase() === 'index.html' ? htmlCandidates[0] : null
  if (rootIndex && htmlCandidates.length === 1) {
    return {
      entryHtmlPath: rootIndex,
      selection: 'root_index',
      htmlCandidates,
    }
  }

  if (htmlCandidates.length === 1) {
    return {
      entryHtmlPath: htmlCandidates[0] ?? null,
      selection: 'single_file_fallback',
      htmlCandidates,
    }
  }

  if (htmlCandidates.length === 0) {
    return {
      entryHtmlPath: null,
      selection: 'missing',
      htmlCandidates,
    }
  }

  return { entryHtmlPath: null, selection: 'missing', htmlCandidates }
}

function resolveEffectiveZipRoot(relativePaths: string[]): {
  normalizedPaths: string[]
  normalizedRootFolderName: string | null
} {
  if (relativePaths.length === 0) {
    return {
      normalizedPaths: relativePaths,
      normalizedRootFolderName: null,
    }
  }

  const rootFiles = relativePaths.filter((entry) => !entry.includes('/'))
  const rootDirNames = new Set(
    relativePaths
      .filter((entry) => entry.includes('/'))
      .map((entry) => entry.split('/')[0])
      .filter(Boolean),
  )

  if (rootFiles.length !== 0 || rootDirNames.size !== 1) {
    return {
      normalizedPaths: relativePaths,
      normalizedRootFolderName: null,
    }
  }

  const normalizedRootFolderName = [...rootDirNames][0] ?? null
  if (!normalizedRootFolderName) {
    return {
      normalizedPaths: relativePaths,
      normalizedRootFolderName: null,
    }
  }

  const prefix = `${normalizedRootFolderName}/`
  return {
    normalizedPaths: relativePaths
      .filter((entry) => entry.startsWith(prefix))
      .map((entry) => entry.slice(prefix.length))
      .filter(Boolean),
    normalizedRootFolderName,
  }
}

function resolveAssetsDirPath(relativePaths: string[]): string | null {
  const byDirectory = new Map<string, number>()

  for (const filePath of relativePaths) {
    const dirname = path.posix.dirname(filePath)
    const segments = dirname === '.' ? [] : dirname.split('/').filter(Boolean)
    for (let index = 0; index < segments.length; index += 1) {
      const candidate = segments.slice(0, index + 1).join('/')
      byDirectory.set(candidate, (byDirectory.get(candidate) ?? 0) + 1)
    }
  }

  const sorted = [...byDirectory.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0])
  })

  const candidate = sorted[0]?.[0] ?? null
  return candidate || null
}

function listZipEntries(zipFileAbsPath: string): string[] {
  const output = execFileSync('unzip', ['-Z1', zipFileAbsPath], { encoding: 'utf8' })
  return output
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean)
}

function unzipToDir(input: { zipFileAbsPath: string; outputDirAbs: string }): void {
  fs.mkdirSync(input.outputDirAbs, { recursive: true })
  execFileSync('unzip', ['-qq', '-o', input.zipFileAbsPath, '-d', input.outputDirAbs], { stdio: 'pipe' })
}

export function validateZipEntryPaths(entryPaths: string[]): {
  safeEntries: string[]
  unsafeEntries: string[]
} {
  const safeEntries: string[] = []
  const unsafeEntries: string[] = []

  for (const entry of entryPaths) {
    if (!isSafeZipEntry(entry)) {
      unsafeEntries.push(entry)
      continue
    }
    const normalized = sanitizeEntryPath(entry)
    if (!normalized || normalized.endsWith('/')) continue
    safeEntries.push(normalized)
  }

  return {
    safeEntries: [...new Set(safeEntries)].sort((a, b) => a.localeCompare(b)),
    unsafeEntries: [...new Set(unsafeEntries)].sort((a, b) => a.localeCompare(b)),
  }
}

export function createTemplateIntakeSnapshotId(bytes: Uint8Array): string {
  const hash = crypto.createHash('sha256').update(bytes).digest('hex')
  return `template-zip-${hash.slice(0, 16)}`
}

export function validateAndExtractTemplateZip(input: {
  fileName: string
  bytes: Uint8Array
  maxBytes?: number
}): {
  ok: boolean
  diagnostics: TemplateIntakeDiagnostic[]
  errorMessage: string | null
  snapshotId: string | null
  zipFileAbsPath: string | null
  validation: TemplateZipValidationResult | null
} {
  const maxBytes = input.maxBytes ?? MAX_TEMPLATE_ZIP_BYTES
  const diagnostics: TemplateIntakeDiagnostic[] = []

  diagnostics.push(
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_UPLOAD_RECEIVED',
      severity: 'info',
      message: 'Template ZIP upload received.',
      details: { fileName: input.fileName, byteLength: input.bytes.byteLength },
    }),
  )

  const lowerFileName = normalizeText(input.fileName).toLowerCase()
  if (!lowerFileName.endsWith('.zip')) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_REJECTED_INVALID_TYPE',
        severity: 'error',
        message: 'Only ZIP template uploads are supported.',
        details: { fileName: input.fileName },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'Only .zip files are allowed.',
      snapshotId: null,
      zipFileAbsPath: null,
      validation: null,
    }
  }

  if (input.bytes.byteLength <= 0) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_REJECTED_EMPTY_FILE',
        severity: 'error',
        message: 'Uploaded ZIP file is empty.',
        details: { fileName: input.fileName },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP file is empty.',
      snapshotId: null,
      zipFileAbsPath: null,
      validation: null,
    }
  }

  if (input.bytes.byteLength > maxBytes) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_REJECTED_TOO_LARGE',
        severity: 'error',
        message: 'Uploaded ZIP file exceeds maximum allowed size.',
        details: { byteLength: input.bytes.byteLength, maxBytes },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: `ZIP file must be ${Math.floor(maxBytes / (1024 * 1024))} MB or smaller.`,
      snapshotId: null,
      zipFileAbsPath: null,
      validation: null,
    }
  }

  const snapshotId = createTemplateIntakeSnapshotId(input.bytes)
  const workspaceRoot = path.resolve(os.tmpdir(), 'gnr8', 'template-intake', snapshotId)
  const zipFileAbsPath = path.resolve(workspaceRoot, 'upload.zip')
  const extractionRootDirAbs = path.resolve(workspaceRoot, 'extracted')

  fs.mkdirSync(workspaceRoot, { recursive: true })
  fs.writeFileSync(zipFileAbsPath, input.bytes)

  diagnostics.push(
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_ZIP_UNPACK_STARTED',
      severity: 'info',
      message: 'ZIP unpacking started.',
      details: { snapshotId },
    }),
  )

  let entryPaths: string[] = []
  try {
    entryPaths = listZipEntries(zipFileAbsPath)
  } catch (error) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_REJECTED_INVALID_TYPE',
        severity: 'fatal',
        message: 'ZIP file could not be read by unzip runtime.',
        details: { error: error instanceof Error ? error.message : String(error) },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP file could not be processed.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  const safeValidation = validateZipEntryPaths(entryPaths)
  if (safeValidation.unsafeEntries.length > 0) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_ZIP_PATH_TRAVERSAL_BLOCKED',
        severity: 'fatal',
        message: 'ZIP contains unsafe path traversal entries.',
        details: { blockedEntries: safeValidation.unsafeEntries },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP contains unsafe file paths.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  fs.rmSync(extractionRootDirAbs, { recursive: true, force: true })
  fs.mkdirSync(extractionRootDirAbs, { recursive: true })

  try {
    unzipToDir({ zipFileAbsPath, outputDirAbs: extractionRootDirAbs })
  } catch (error) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_REJECTED_INVALID_TYPE',
        severity: 'fatal',
        message: 'ZIP extraction failed.',
        details: { error: error instanceof Error ? error.message : String(error) },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP extraction failed.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  const rootNormalization = resolveEffectiveZipRoot(safeValidation.safeEntries)
  const normalizedPaths = rootNormalization.normalizedPaths
  let effectiveExtractionRootDirAbs = extractionRootDirAbs
  if (rootNormalization.normalizedRootFolderName) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_ZIP_SINGLE_ROOT_FOLDER_DETECTED',
        severity: 'info',
        message: 'ZIP contains a single root folder and no root-level files.',
        details: { rootFolderName: rootNormalization.normalizedRootFolderName },
      }),
    )

    effectiveExtractionRootDirAbs = path.resolve(extractionRootDirAbs, rootNormalization.normalizedRootFolderName)
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_ZIP_ROOT_NORMALIZED',
        severity: 'info',
        message: 'ZIP root normalized to single root folder.',
        details: { rootFolderName: rootNormalization.normalizedRootFolderName },
      }),
    )
  }

  diagnostics.push(
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_ZIP_UNPACK_COMPLETED',
      severity: 'info',
      message: 'ZIP unpacking completed.',
      details: { fileCount: normalizedPaths.length },
    }),
  )

  const selectedEntry = selectEntryHtmlPath(normalizedPaths)
  if (selectedEntry.selection === 'missing') {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_HTML_ENTRY_NOT_FOUND',
        severity: 'fatal',
        message: 'No root-level HTML entry file found in uploaded ZIP.',
      }),
    )

    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP must include one root-level HTML file.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  if (selectedEntry.selection === 'ambiguous') {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_HTML_ENTRY_AMBIGUOUS',
        severity: 'fatal',
        message: 'Multiple root-level HTML files found; entry file is ambiguous.',
        details: {
          fileCount: selectedEntry.htmlCandidates.length,
          fileNames: selectedEntry.htmlCandidates,
        },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP has multiple root-level HTML files; entry file is ambiguous.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  diagnostics.push(
    createTemplateIntakeDiagnostic({
      code:
        selectedEntry.selection === 'root_index'
          ? 'TEMPLATE_HTML_ENTRY_INDEX_FOUND'
          : 'TEMPLATE_HTML_ENTRY_FALLBACK_SINGLE_FILE',
      severity: selectedEntry.selection === 'root_index' ? 'info' : 'warning',
      message:
        selectedEntry.selection === 'root_index'
          ? 'Root index.html detected as template entry.'
          : 'Template entry HTML resolved using single-file fallback.',
      details: {
        entryHtmlPath: selectedEntry.entryHtmlPath,
        htmlCandidates: selectedEntry.htmlCandidates,
        ...(selectedEntry.selection === 'single_file_fallback'
          ? { fileName: selectedEntry.entryHtmlPath }
          : {}),
      },
    }),
  )

  const manifestPath = selectManifestPath(normalizedPaths)
  if (!manifestPath) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_MANIFEST_MISSING',
        severity: 'info',
        message: 'No template manifest found in ZIP archive.',
      }),
    )
  }

  const validation: TemplateZipValidationResult = {
    ok: true,
    extractionRootDirAbs: effectiveExtractionRootDirAbs,
    entryHtmlPath: selectedEntry.entryHtmlPath,
    entryHtmlSelection: selectedEntry.selection,
    htmlCandidates: selectedEntry.htmlCandidates,
    assetsDirPath: resolveAssetsDirPath(normalizedPaths),
    manifestPath,
    assetSummary: computeAssetSummary(normalizedPaths),
  }

  return {
    ok: true,
    diagnostics,
    errorMessage: null,
    snapshotId,
    zipFileAbsPath,
    validation,
  }
}

export const TEMPLATE_ZIP_MAX_BYTES = MAX_TEMPLATE_ZIP_BYTES
