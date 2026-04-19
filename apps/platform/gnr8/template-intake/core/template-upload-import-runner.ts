import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import type { AssetRegistry, ImportInput, ImportOutput, ImportedHtmlDocument, JsonValue } from '@/gnr8/import/import-contract'
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

function toPosixPath(p: string): string {
  return p.replaceAll(path.sep, '/')
}

function normalizeRelPosix(rel: string): string {
  return path.posix.normalize(toPosixPath(rel))
}

function resolveToRootRelativePosix(input: {
  rootDirAbs: string
  inputPath: string
}): { absPath: string; relPosixPath: string } | null {
  const absPath = path.isAbsolute(input.inputPath)
    ? path.resolve(input.inputPath)
    : path.resolve(input.rootDirAbs, input.inputPath)

  const rel = path.relative(input.rootDirAbs, absPath)
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null

  return { absPath, relPosixPath: normalizeRelPosix(rel) }
}

function readFileBytes(absPath: string): { bytes: Uint8Array; byteLength: number } {
  const buf = fs.readFileSync(absPath)
  return { bytes: new Uint8Array(buf), byteLength: buf.byteLength }
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

function stableInputSpec(source: ImportInput['source'], normalized: {
  source: ImportOutput['documentMeta']['source']
}): JsonValue {
  if (source.kind === 'single-entry-html') {
    return {
      kind: 'single-entry-html',
      entryHtmlPath: normalized.source.kind === 'single-entry-html' ? normalized.source.entryHtmlPath : '',
      assetsDirPath: normalized.source.kind === 'single-entry-html' ? normalized.source.assetsDirPath : null,
    }
  }
  return {
    kind: 'html-files',
    htmlFilePaths: normalized.source.kind === 'html-files' ? normalized.source.htmlFilePaths : [],
    entryHtmlPath: normalized.source.kind === 'html-files' ? normalized.source.entryHtmlPath : null,
    assetsDirPath: normalized.source.kind === 'html-files' ? normalized.source.assetsDirPath : null,
  }
}

export async function importTemplateUploadStaticSite(input: ImportInput): Promise<ImportOutput> {
  const issues: ReturnType<typeof createDiagnosticIssue>[] = []

  try {
    const rootDirAbs = path.resolve(input.rootDir)
    if (!path.isAbsolute(rootDirAbs)) {
      issues.push(
        createDiagnosticIssue({
          severity: 'fatal',
          code: 'INPUT_INVALID',
          message: 'rootDir must be an absolute path',
          location: { path: null, position: null, selector: null },
          details: { rootDir: input.rootDir },
        }),
      )
    }

    const uploadSource = input.source.kind === 'single-entry-html' ? input.source : null
    if (!uploadSource) {
      issues.push(
        createDiagnosticIssue({
          severity: 'fatal',
          code: 'INPUT_INVALID',
          message: 'Template upload importer only supports single-entry-html source.',
          location: { path: null, position: null, selector: null },
          details: { sourceKind: input.source.kind },
        }),
      )
    }

    const requestId = input.requestId ?? null
    let normalizedSource: ImportOutput['documentMeta']['source'] = {
      kind: 'single-entry-html',
      entryHtmlPath: uploadSource ? normalizeRelPosix(uploadSource.entryHtmlPath) : 'index.html',
      assetsDirPath: uploadSource?.assetsDirPath ? normalizeRelPosix(uploadSource.assetsDirPath) : null,
    }

    const entry = uploadSource
      ? resolveToRootRelativePosix({
          rootDirAbs,
          inputPath: uploadSource.entryHtmlPath,
        })
      : null
    if (!entry) {
      issues.push(
        createDiagnosticIssue({
          severity: 'fatal',
          code: 'PATH_OUTSIDE_ROOT',
          message: 'entryHtmlPath resolves outside rootDir',
          location: { path: null, position: null, selector: null },
          details: { entryHtmlPath: uploadSource?.entryHtmlPath ?? null },
        }),
      )
    } else {
      normalizedSource = {
        kind: 'single-entry-html',
        entryHtmlPath: entry.relPosixPath,
        assetsDirPath: uploadSource?.assetsDirPath ? normalizeRelPosix(uploadSource.assetsDirPath) : null,
      }
    }

    const importedDocuments: ImportedHtmlDocument[] = []
    const allAssetReferences: AssetRegistry['references'] = []

    if (entry) {
      let bytes: Uint8Array
      let byteLength: number
      try {
        const read = readFileBytes(entry.absPath)
        bytes = read.bytes
        byteLength = read.byteLength
      } catch (err) {
        issues.push(
          createDiagnosticIssue({
            severity: 'fatal',
            code: 'ENTRY_HTML_MISSING',
            message: 'Entry HTML file is missing or unreadable',
            location: { path: entry.relPosixPath, position: null, selector: null },
            details: { error: String((err as Error)?.message ?? err) },
          }),
        )
        bytes = new Uint8Array()
        byteLength = 0
      }

      const contentSha256 = sha256Hex(bytes)
      const hadUtf8BomBytes = hasUtf8Bom(bytes)
      const bytesForDecoding = hadUtf8BomBytes ? bytes.subarray(3) : bytes
      const decoded = decodeUtf8Deterministically(bytesForDecoding)
      if (decoded.hadDecodingErrors) {
        issues.push(
          createDiagnosticIssue({
            severity: 'error',
            code: 'HTML_DECODING_ERROR',
            message: 'HTML contained invalid UTF-8 sequences (replacement characters inserted)',
            location: { path: entry.relPosixPath, position: null, selector: null },
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
            location: { path: entry.relPosixPath, position: null, selector: null },
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
            location: { path: entry.relPosixPath, position: null, selector: null },
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
            location: { path: entry.relPosixPath, position: null, selector: null },
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
            location: { path: entry.relPosixPath, position: null, selector: null },
            details: { parseWarnings: snapshot.parseWarnings },
          }),
        )
      }

      const extracted = extractAssetReferencesFromDom({
        rootDirAbs,
        entryHtmlAbsPath: entry.absPath,
        fromDocumentPath: entry.relPosixPath,
        document,
      })
      allAssetReferences.push(...extracted.references)
      issues.push(...extracted.issues)

      importedDocuments.push({
        path: entry.relPosixPath,
        contentSha256,
        byteLength,
        decoding: { encoding: 'utf-8', hadDecodingErrors: decoded.hadDecodingErrors },
        text: normalized.normalizedText,
        dom: snapshot,
      })
    }

    const validatedAssetReferences: AssetRegistry['references'] = allAssetReferences.map((ref) => {
      if (ref.validationStatus !== 'ok' || ref.resolvedPath === null) return ref
      const abs = path.resolve(rootDirAbs, ref.resolvedPath)
      if (fs.existsSync(abs)) return { ...ref, existence: 'exists' }
      issues.push(
        createDiagnosticIssue({
          severity: 'error',
          code: 'missing_local_asset',
          message: 'Missing local asset',
          location: { path: ref.fromDocumentPath, position: null, selector: null },
          details: {
            assetId: ref.id,
            tag: ref.tag,
            attribute: ref.attribute,
            rawRef: ref.rawRef,
            resolvedPath: ref.resolvedPath,
          },
        }),
      )
      return { ...ref, existence: 'missing', validationStatus: 'missing_local_asset' }
    })

    const contentPairs = importedDocuments
      .map((d) => ({ path: d.path, contentSha256: d.contentSha256 }))
      .sort((a, b) => a.path.localeCompare(b.path))
    const inputSpec = stableInputSpec(input.source, { source: normalizedSource })
    const inputSpecSha256 = crypto.createHash('sha256').update(stableStringify(inputSpec), 'utf8').digest('hex')
    const inputContentSha256 = crypto
      .createHash('sha256')
      .update(stableStringify(contentPairs), 'utf8')
      .digest('hex')

    const importDiagnostics = buildImportDiagnostics(issues)
    return {
      contractVersion: IMPORT_CONTRACT_VERSION,
      status: hasFatalIssues(importDiagnostics.issues) ? 'failed' : 'ok',
      documentMeta: {
        execution: { requestId },
        source: normalizedSource,
        fingerprints: {
          inputSpecSha256,
          inputContentSha256,
        },
      },
      rawDomSnapshot: { documents: importedDocuments.sort((a, b) => a.path.localeCompare(b.path)) },
      assetRegistry: {
        assetsDirPath: normalizedSource.assetsDirPath,
        files: [],
        references: validatedAssetReferences.sort((a, b) => {
          if (a.fromDocumentPath !== b.fromDocumentPath) return a.fromDocumentPath.localeCompare(b.fromDocumentPath)
          if (a.tag !== b.tag) return a.tag.localeCompare(b.tag)
          if (a.attribute !== b.attribute) return a.attribute.localeCompare(b.attribute)
          if (a.occurrence !== b.occurrence) return a.occurrence - b.occurrence
          if (a.rawRef !== b.rawRef) return a.rawRef.localeCompare(b.rawRef)
          if ((a.resolvedPath ?? '') !== (b.resolvedPath ?? '')) return (a.resolvedPath ?? '').localeCompare(b.resolvedPath ?? '')
          return a.id.localeCompare(b.id)
        }),
      },
      importDiagnostics,
    }
  } catch (err) {
    const issue = createDiagnosticIssue({
      severity: 'fatal',
      code: 'INTERNAL_ERROR',
      message: 'Internal error during template upload import',
      location: { path: null, position: null, selector: null },
      details: {
        name: String((err as Error)?.name ?? 'Error'),
        message: String((err as Error)?.message ?? err),
      },
    })
    const importDiagnostics = buildImportDiagnostics([issue])
    return {
      contractVersion: IMPORT_CONTRACT_VERSION,
      status: 'failed',
      documentMeta: {
        execution: { requestId: input.requestId ?? null },
        source: {
          kind: input.source.kind === 'single-entry-html' ? 'single-entry-html' : 'html-files',
          ...(input.source.kind === 'single-entry-html'
            ? {
                entryHtmlPath: normalizeRelPosix(input.source.entryHtmlPath),
                assetsDirPath: input.source.assetsDirPath ? normalizeRelPosix(input.source.assetsDirPath) : null,
              }
            : {
                htmlFilePaths: [...input.source.htmlFilePaths].map((p) => normalizeRelPosix(p)).sort((a, b) => a.localeCompare(b)),
                entryHtmlPath: input.source.entryHtmlPath ? normalizeRelPosix(input.source.entryHtmlPath) : null,
                assetsDirPath: input.source.assetsDirPath ? normalizeRelPosix(input.source.assetsDirPath) : null,
              }),
        } as ImportOutput['documentMeta']['source'],
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
