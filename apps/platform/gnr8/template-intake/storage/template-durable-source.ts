import fs from 'node:fs'
import path from 'node:path'

const TEMPLATE_DURABLE_SOURCE_ROOT_ENV_VAR = 'GNR8_TEMPLATE_DURABLE_SOURCE_ROOT_ABS' as const

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeRelativePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\/+/, '')
}

function resolveFileUnderRoot(rootDirAbs: string, relativePath: string): string | null {
  const normalizedRel = normalizeRelativePath(relativePath)
  if (!normalizedRel || normalizedRel === '.') return null

  const absPath = path.resolve(rootDirAbs, normalizedRel)
  const relFromRoot = path.relative(rootDirAbs, absPath)
  if (relFromRoot === '' || relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot)) return null
  return absPath
}

export function resolveTemplateDurableSourceRootDirAbs(): string {
  const envValue = normalizeText(process.env[TEMPLATE_DURABLE_SOURCE_ROOT_ENV_VAR])
  if (envValue) return path.resolve(envValue)
  return path.resolve(process.cwd(), '.gnr8', 'template-intake-sources')
}

export function persistTemplateDurableSourceSnapshot(input: {
  templateId: string
  extractionRootDirAbs: string
  entryHtmlPath: string
  entryHtmlContent: string
  sourceFilePaths?: string[]
}): { durableSnapshotRootDirAbs: string; durableEntryHtmlPathAbs: string } {
  const sourceRootDirAbs = path.resolve(input.extractionRootDirAbs)
  const durableRootDirAbs = path.resolve(resolveTemplateDurableSourceRootDirAbs(), input.templateId, 'snapshot')
  const entryHtmlPath = normalizeRelativePath(input.entryHtmlPath)
  const durableEntryHtmlPathAbs = path.resolve(durableRootDirAbs, entryHtmlPath)

  fs.rmSync(durableRootDirAbs, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(durableRootDirAbs), { recursive: true })
  if (fs.existsSync(sourceRootDirAbs) && Array.isArray(input.sourceFilePaths) && input.sourceFilePaths.length > 0) {
    const seen = new Set<string>()
    for (const sourcePath of input.sourceFilePaths) {
      const normalized = normalizeRelativePath(sourcePath)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)

      const sourceFileAbs = resolveFileUnderRoot(sourceRootDirAbs, normalized)
      const durableFileAbs = resolveFileUnderRoot(durableRootDirAbs, normalized)
      if (!sourceFileAbs || !durableFileAbs) continue

      let stat: fs.Stats | null = null
      try {
        stat = fs.statSync(sourceFileAbs)
      } catch {
        stat = null
      }
      if (!stat?.isFile()) continue

      fs.mkdirSync(path.dirname(durableFileAbs), { recursive: true })
      fs.copyFileSync(sourceFileAbs, durableFileAbs)
    }
  }

  if (!fs.existsSync(durableEntryHtmlPathAbs)) {
    fs.mkdirSync(path.dirname(durableEntryHtmlPathAbs), { recursive: true })
    fs.writeFileSync(durableEntryHtmlPathAbs, input.entryHtmlContent, 'utf8')
  }

  return {
    durableSnapshotRootDirAbs: durableRootDirAbs,
    durableEntryHtmlPathAbs,
  }
}
