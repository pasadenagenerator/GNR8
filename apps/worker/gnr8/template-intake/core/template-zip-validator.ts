import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'

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
  const rootHtmlCandidates = relativePaths
    .filter((entry) => !entry.includes('/') && entry.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b))

  if (rootHtmlCandidates.length > 1) {
    return {
      entryHtmlPath: null,
      selection: 'ambiguous',
      htmlCandidates: rootHtmlCandidates,
    }
  }

  const rootIndex = rootHtmlCandidates[0]?.toLowerCase() === 'index.html' ? rootHtmlCandidates[0] : null
  if (rootIndex && rootHtmlCandidates.length === 1) {
    return {
      entryHtmlPath: rootIndex,
      selection: 'root_index',
      htmlCandidates: rootHtmlCandidates,
    }
  }

  if (rootHtmlCandidates.length === 1) {
    return {
      entryHtmlPath: rootHtmlCandidates[0] ?? null,
      selection: 'single_file_fallback',
      htmlCandidates: rootHtmlCandidates,
    }
  }

  const allHtmlCandidates = relativePaths
    .filter((entry) => entry.toLowerCase().endsWith('.html'))
    .sort((a, b) => a.localeCompare(b))

  if (allHtmlCandidates.length > 1) {
    return {
      entryHtmlPath: null,
      selection: 'ambiguous',
      htmlCandidates: allHtmlCandidates,
    }
  }

  if (allHtmlCandidates.length === 1) {
    return {
      entryHtmlPath: allHtmlCandidates[0] ?? null,
      selection: 'single_file_fallback',
      htmlCandidates: allHtmlCandidates,
    }
  }

  return { entryHtmlPath: null, selection: 'missing', htmlCandidates: [] }
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

type ParsedZipEntry = {
  fileName: string
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

function readUInt16LE(buffer: Buffer, offset: number): number {
  if (offset < 0 || offset + 2 > buffer.length) {
    throw new Error('ZIP parsing failed: out-of-bounds uint16 read.')
  }
  return buffer.readUInt16LE(offset)
}

function readUInt32LE(buffer: Buffer, offset: number): number {
  if (offset < 0 || offset + 4 > buffer.length) {
    throw new Error('ZIP parsing failed: out-of-bounds uint32 read.')
  }
  return buffer.readUInt32LE(offset)
}

function findEndOfCentralDirectoryOffset(buffer: Buffer): number {
  const eocdSignature = 0x06054b50
  const minimumEocdSize = 22
  const maxCommentLength = 0xffff
  const searchStart = Math.max(0, buffer.length - minimumEocdSize - maxCommentLength)

  for (let offset = buffer.length - minimumEocdSize; offset >= searchStart; offset -= 1) {
    if (readUInt32LE(buffer, offset) === eocdSignature) return offset
  }

  throw new Error('ZIP parsing failed: end of central directory record not found.')
}

function parseZipEntriesFromBuffer(zipBuffer: Buffer): ParsedZipEntry[] {
  const eocdOffset = findEndOfCentralDirectoryOffset(zipBuffer)
  const totalEntries = readUInt16LE(zipBuffer, eocdOffset + 10)
  const centralDirectorySize = readUInt32LE(zipBuffer, eocdOffset + 12)
  const centralDirectoryOffset = readUInt32LE(zipBuffer, eocdOffset + 16)

  if (centralDirectoryOffset + centralDirectorySize > zipBuffer.length) {
    throw new Error('ZIP parsing failed: central directory is out of bounds.')
  }

  const entries: ParsedZipEntry[] = []
  let cursor = centralDirectoryOffset
  const centralSignature = 0x02014b50

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > zipBuffer.length) {
      throw new Error('ZIP parsing failed: truncated central directory record.')
    }

    const signature = readUInt32LE(zipBuffer, cursor)
    if (signature !== centralSignature) {
      throw new Error('ZIP parsing failed: invalid central directory record signature.')
    }

    const compressionMethod = readUInt16LE(zipBuffer, cursor + 10)
    const compressedSize = readUInt32LE(zipBuffer, cursor + 20)
    const uncompressedSize = readUInt32LE(zipBuffer, cursor + 24)
    const fileNameLength = readUInt16LE(zipBuffer, cursor + 28)
    const extraFieldLength = readUInt16LE(zipBuffer, cursor + 30)
    const fileCommentLength = readUInt16LE(zipBuffer, cursor + 32)
    const localHeaderOffset = readUInt32LE(zipBuffer, cursor + 42)
    const fileNameStart = cursor + 46
    const fileNameEnd = fileNameStart + fileNameLength

    if (fileNameEnd > zipBuffer.length) {
      throw new Error('ZIP parsing failed: invalid central directory filename bounds.')
    }

    const fileName = normalizeText(zipBuffer.subarray(fileNameStart, fileNameEnd).toString('utf8'))
    if (fileName) {
      entries.push({
        fileName,
        compressionMethod,
        compressedSize,
        uncompressedSize,
        localHeaderOffset,
      })
    }

    cursor = fileNameEnd + extraFieldLength + fileCommentLength
  }

  return entries
}

function inflateZipEntry(input: { zipBuffer: Buffer; entry: ParsedZipEntry }): Buffer {
  const localHeaderSignature = 0x04034b50
  const headerOffset = input.entry.localHeaderOffset
  if (headerOffset + 30 > input.zipBuffer.length) {
    throw new Error('ZIP extraction failed: local file header out of bounds.')
  }
  if (readUInt32LE(input.zipBuffer, headerOffset) !== localHeaderSignature) {
    throw new Error('ZIP extraction failed: invalid local file header signature.')
  }

  const fileNameLength = readUInt16LE(input.zipBuffer, headerOffset + 26)
  const extraFieldLength = readUInt16LE(input.zipBuffer, headerOffset + 28)
  const dataStart = headerOffset + 30 + fileNameLength + extraFieldLength
  const dataEnd = dataStart + input.entry.compressedSize

  if (dataEnd > input.zipBuffer.length) {
    throw new Error('ZIP extraction failed: entry payload exceeds ZIP size.')
  }

  const compressed = input.zipBuffer.subarray(dataStart, dataEnd)

  if (input.entry.compressionMethod === 0) {
    return Buffer.from(compressed)
  }
  if (input.entry.compressionMethod === 8) {
    return zlib.inflateRawSync(compressed)
  }

  throw new Error(`ZIP extraction failed: unsupported compression method ${input.entry.compressionMethod}.`)
}

function extractZipEntriesToDir(input: {
  zipBuffer: Buffer
  entries: ParsedZipEntry[]
  outputDirAbs: string
}): void {
  fs.mkdirSync(input.outputDirAbs, { recursive: true })

  for (const entry of input.entries) {
    const normalizedName = sanitizeEntryPath(entry.fileName)
    if (!normalizedName || normalizedName.endsWith('/')) continue

    const outputFileAbs = path.resolve(input.outputDirAbs, normalizedName)
    fs.mkdirSync(path.dirname(outputFileAbs), { recursive: true })
    const inflated = inflateZipEntry({ zipBuffer: input.zipBuffer, entry })
    if (entry.uncompressedSize > 0 && inflated.length !== entry.uncompressedSize) {
      throw new Error(`ZIP extraction failed: size mismatch for ${entry.fileName}.`)
    }
    fs.writeFileSync(outputFileAbs, inflated)
  }
}

function resolveNormalizedEntryPath(input: {
  entryFileName: string
  normalizedRootFolderName: string | null
}): string | null {
  const safePath = sanitizeEntryPath(input.entryFileName)
  if (!safePath || safePath.endsWith('/')) return null

  if (!input.normalizedRootFolderName) return safePath

  const prefix = `${input.normalizedRootFolderName}/`
  if (!safePath.startsWith(prefix)) return null
  const normalized = safePath.slice(prefix.length)
  return normalized || null
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
  const zipBuffer = Buffer.from(input.bytes)

  fs.mkdirSync(workspaceRoot, { recursive: true })
  fs.writeFileSync(zipFileAbsPath, zipBuffer)

  diagnostics.push(
    createTemplateIntakeDiagnostic({
      code: 'TEMPLATE_ZIP_UNPACK_STARTED',
      severity: 'info',
      message: 'ZIP unpacking started.',
      details: { snapshotId },
    }),
  )

  let zipEntries: ParsedZipEntry[] = []
  try {
    zipEntries = parseZipEntriesFromBuffer(zipBuffer)
  } catch (error) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_REJECTED_INVALID_TYPE',
        severity: 'fatal',
        message: 'ZIP file could not be read by validator runtime.',
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

  const entryPaths = zipEntries.map((entry) => entry.fileName)
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
    extractZipEntriesToDir({
      zipBuffer,
      entries: zipEntries.filter((entry) => safeValidation.safeEntries.includes(sanitizeEntryPath(entry.fileName))),
      outputDirAbs: extractionRootDirAbs,
    })
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
        message: 'No HTML entry file found in uploaded ZIP.',
      }),
    )

    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP must include one HTML file.',
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
        message: 'Multiple HTML files found; entry file is ambiguous.',
        details: {
          fileCount: selectedEntry.htmlCandidates.length,
          fileNames: selectedEntry.htmlCandidates,
        },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'ZIP has multiple HTML files; entry file is ambiguous.',
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

  const parsedEntryMap = new Map<string, ParsedZipEntry>()
  for (const parsedEntry of zipEntries) {
    const normalizedEntryPath = resolveNormalizedEntryPath({
      entryFileName: parsedEntry.fileName,
      normalizedRootFolderName: rootNormalization.normalizedRootFolderName,
    })
    if (!normalizedEntryPath) continue
    parsedEntryMap.set(normalizedEntryPath, parsedEntry)
  }

  const selectedEntryHtmlPath = selectedEntry.entryHtmlPath
  if (!selectedEntryHtmlPath) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_HTML_ENTRY_NOT_FOUND',
        severity: 'fatal',
        message: 'Template entry HTML could not be resolved for intake processing.',
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'Template entry HTML could not be resolved.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  const parsedSelectedEntry = parsedEntryMap.get(selectedEntryHtmlPath) ?? null
  if (!parsedSelectedEntry) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_HTML_ENTRY_NOT_FOUND',
        severity: 'fatal',
        message: 'Template entry HTML could not be resolved for deterministic intake.',
        details: { entryHtmlPath: selectedEntryHtmlPath },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'Template entry HTML could not be resolved.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  let entryHtmlBytes: Uint8Array
  try {
    entryHtmlBytes = new Uint8Array(inflateZipEntry({ zipBuffer, entry: parsedSelectedEntry }))
  } catch (error) {
    diagnostics.push(
      createTemplateIntakeDiagnostic({
        code: 'TEMPLATE_UPLOAD_REJECTED_INVALID_TYPE',
        severity: 'fatal',
        message: 'Template entry HTML could not be decoded from ZIP payload.',
        details: {
          entryHtmlPath: selectedEntryHtmlPath,
          error: error instanceof Error ? error.message : String(error),
        },
      }),
    )
    return {
      ok: false,
      diagnostics,
      errorMessage: 'Template entry HTML could not be processed.',
      snapshotId,
      zipFileAbsPath,
      validation: null,
    }
  }

  const validation: TemplateZipValidationResult = {
    ok: true,
    extractionRootDirAbs: effectiveExtractionRootDirAbs,
    entryHtmlPath: selectedEntryHtmlPath,
    entryHtmlBytes,
    entryHtmlSelection: selectedEntry.selection,
    htmlCandidates: selectedEntry.htmlCandidates,
    extractedFilePaths: normalizedPaths,
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
