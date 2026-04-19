import crypto from 'node:crypto'
import path from 'node:path'

import type { AssetRegistry, ImportOutput, ImportedHtmlDocument, JsonValue } from '@/gnr8/import/import-contract'
import { IMPORT_CONTRACT_VERSION } from '@/gnr8/import/import-contract'
import {
  buildImportDiagnostics,
  createDiagnosticIssue,
  hasFatalIssues,
  sha256Hex,
  stableStringify,
} from '@/gnr8/import/runtime/diagnostics'
import { extractAssetReferencesFromDom } from '@/gnr8/import/runtime/extract-assets'
import { normalizeHtmlInput } from '@/gnr8/import/runtime/normalize-html'
import { parseHtmlToDomSnapshot } from '@/gnr8/import/runtime/parse-html'

const VIRTUAL_ROOT_DIR_ABS = path.resolve('/virtual-template-upload-root')

type TemplateUploadImportInput = {
  requestId?: string
  entryHtmlPath: string
  entryHtmlBytes: Uint8Array
  extractedFilePaths: string[]
}

function toPosixPath(p: string): string {
  return p.replaceAll(path.sep, '/')
}

function normalizeRelPosix(rel: string): string {
  return path.posix.normalize(toPosixPath(rel).replace(/^\/+/, ''))
}

function normalizeSourcePath(value: string): string | null {
  const normalized = normalizeRelPosix(value)
  if (!normalized || normalized === '.' || normalized.startsWith('../') || normalized.includes('/../')) return null
  return normalized
}

function decodeUtf8Deterministically(bytes: Uint8Array): {
  text: string
  hadDecodingErrors: boolean
} {
  const fatalDecoder = new TextDecoder('utf-8', { fatal: true })
  try {
    return { text: fatalDecoder.decode(bytes), hadDecodingErrors: false }
  } catch {
    const forgivingDecoder = new TextDecoder('utf-8', { fatal: false })
    return { text: forgivingDecoder.decode(bytes), hadDecodingErrors: true }
  }
}

function hasUtf8Bom(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
}

function stableInputSpec(normalizedEntryHtmlPath: string): JsonValue {
  return {
    kind: 'single-entry-html',
    entryHtmlPath: normalizedEntryHtmlPath,
    assetsDirPath: null,
  }
}

export async function importTemplateUploadStaticSite(input: TemplateUploadImportInput): Promise<ImportOutput> {
  const issues: ReturnType<typeof createDiagnosticIssue>[] = []

  try {
    const normalizedEntryHtmlPath = normalizeSourcePath(input.entryHtmlPath)
    if (!normalizedEntryHtmlPath) {
      issues.push(
        createDiagnosticIssue({
          severity: 'fatal',
          code: 'PATH_OUTSIDE_ROOT',
          message: 'entryHtmlPath is invalid for template upload intake.',
          location: { path: null, position: null, selector: null },
          details: { entryHtmlPath: input.entryHtmlPath },
        }),
      )
    }

    const requestId = input.requestId ?? null
    const entryPath = normalizedEntryHtmlPath ?? 'index.html'

    const sourceBytes = input.entryHtmlBytes
    const contentSha256 = sha256Hex(sourceBytes)
    const hadUtf8BomBytes = hasUtf8Bom(sourceBytes)
    const bytesForDecoding = hadUtf8BomBytes ? sourceBytes.subarray(3) : sourceBytes
    const decoded = decodeUtf8Deterministically(bytesForDecoding)

    if (decoded.hadDecodingErrors) {
      issues.push(
        createDiagnosticIssue({
          severity: 'error',
          code: 'HTML_DECODING_ERROR',
          message: 'HTML contained invalid UTF-8 sequences (replacement characters inserted)',
          location: { path: entryPath, position: null, selector: null },
          details: null,
        }),
      )
    }

    const normalized = normalizeHtmlInput(decoded.text)
    if (hadUtf8BomBytes || normalized.hadUtf8Bom) {
      issues.push(
        createDiagnosticIssue({
          severity: 'info',
          code: 'HTML_BOM_REMOVED',
          message: 'UTF-8 BOM was removed from HTML input',
          location: { path: entryPath, position: null, selector: null },
          details: null,
        }),
      )
    }
    if (normalized.normalizedNewlines) {
      issues.push(
        createDiagnosticIssue({
          severity: 'info',
          code: 'HTML_NEWLINES_NORMALIZED',
          message: 'HTML input newlines were normalized to LF',
          location: { path: entryPath, position: null, selector: null },
          details: null,
        }),
      )
    }
    if (normalized.isEffectivelyEmpty) {
      issues.push(
        createDiagnosticIssue({
          severity: 'error',
          code: 'HTML_EMPTY',
          message: 'HTML input is empty or whitespace-only after normalization',
          location: { path: entryPath, position: null, selector: null },
          details: null,
        }),
      )
    }

    const { document, snapshot } = parseHtmlToDomSnapshot(normalized.normalizedText)
    if (snapshot.parseWarnings.length > 0) {
      issues.push(
        createDiagnosticIssue({
          severity: 'warning',
          code: 'HTML_PARSE_ERROR',
          message: `HTML parser reported ${snapshot.parseWarnings.length} warning(s)`,
          location: { path: entryPath, position: null, selector: null },
          details: { parseWarnings: snapshot.parseWarnings },
        }),
      )
    }

    const extracted = extractAssetReferencesFromDom({
      rootDirAbs: VIRTUAL_ROOT_DIR_ABS,
      entryHtmlAbsPath: path.resolve(VIRTUAL_ROOT_DIR_ABS, entryPath),
      fromDocumentPath: entryPath,
      document,
    })
    issues.push(...extracted.issues)

    const knownLocalPaths = new Set(
      input.extractedFilePaths
        .map((filePath) => normalizeSourcePath(filePath))
        .filter((filePath): filePath is string => filePath != null),
    )

    const validatedAssetReferences: AssetRegistry['references'] = extracted.references.map((reference) => {
      if (reference.validationStatus !== 'ok' || reference.resolvedPath === null) return reference

      if (!knownLocalPaths.has(reference.resolvedPath)) {
        issues.push(
          createDiagnosticIssue({
            severity: 'error',
            code: 'missing_local_asset',
            message: 'Missing local asset',
            location: { path: reference.fromDocumentPath, position: null, selector: null },
            details: {
              assetId: reference.id,
              tag: reference.tag,
              attribute: reference.attribute,
              rawRef: reference.rawRef,
              resolvedPath: reference.resolvedPath,
            },
          }),
        )
        return { ...reference, existence: 'missing', validationStatus: 'missing_local_asset' }
      }

      return { ...reference, existence: 'exists' }
    })

    const importedDocument: ImportedHtmlDocument = {
      path: entryPath,
      contentSha256,
      byteLength: sourceBytes.byteLength,
      decoding: { encoding: 'utf-8', hadDecodingErrors: decoded.hadDecodingErrors },
      text: normalized.normalizedText,
      dom: snapshot,
    }

    const inputSpecSha256 = crypto.createHash('sha256').update(stableStringify(stableInputSpec(entryPath)), 'utf8').digest('hex')
    const inputContentSha256 = crypto
      .createHash('sha256')
      .update(stableStringify([{ path: importedDocument.path, contentSha256: importedDocument.contentSha256 }]), 'utf8')
      .digest('hex')

    const importDiagnostics = buildImportDiagnostics(issues)
    return {
      contractVersion: IMPORT_CONTRACT_VERSION,
      status: hasFatalIssues(importDiagnostics.issues) ? 'failed' : 'ok',
      documentMeta: {
        execution: { requestId },
        source: {
          kind: 'single-entry-html',
          entryHtmlPath: entryPath,
          assetsDirPath: null,
        },
        fingerprints: {
          inputSpecSha256,
          inputContentSha256,
        },
      },
      rawDomSnapshot: { documents: [importedDocument] },
      assetRegistry: {
        assetsDirPath: null,
        files: [],
        references: validatedAssetReferences,
      },
      importDiagnostics,
    }
  } catch (error) {
    const issue = createDiagnosticIssue({
      severity: 'fatal',
      code: 'INTERNAL_ERROR',
      message: 'Internal error during template upload import',
      location: { path: null, position: null, selector: null },
      details: { name: String((error as Error)?.name ?? 'Error'), message: String((error as Error)?.message ?? error) },
    })
    const importDiagnostics = buildImportDiagnostics([issue])
    return {
      contractVersion: IMPORT_CONTRACT_VERSION,
      status: 'failed',
      documentMeta: {
        execution: { requestId: input.requestId ?? null },
        source: {
          kind: 'single-entry-html',
          entryHtmlPath: normalizeSourcePath(input.entryHtmlPath) ?? 'index.html',
          assetsDirPath: null,
        },
        fingerprints: {
          inputSpecSha256: sha256Hex('internal_error'),
          inputContentSha256: sha256Hex('internal_error'),
        },
      },
      rawDomSnapshot: { documents: [] },
      assetRegistry: { assetsDirPath: null, files: [], references: [] },
      importDiagnostics,
    }
  }
}
