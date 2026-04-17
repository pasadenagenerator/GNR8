import fs from 'node:fs'
import path from 'node:path'

const TEMPLATE_DURABLE_SOURCE_ROOT_ENV_VAR = 'GNR8_TEMPLATE_DURABLE_SOURCE_ROOT_ABS' as const

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function normalizeRelativePath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\/+/, '')
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
}): { durableSnapshotRootDirAbs: string; durableEntryHtmlPathAbs: string } {
  const sourceRootDirAbs = path.resolve(input.extractionRootDirAbs)
  const durableRootDirAbs = path.resolve(resolveTemplateDurableSourceRootDirAbs(), input.templateId, 'snapshot')
  const entryHtmlPath = normalizeRelativePath(input.entryHtmlPath)
  const durableEntryHtmlPathAbs = path.resolve(durableRootDirAbs, entryHtmlPath)

  fs.rmSync(durableRootDirAbs, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(durableRootDirAbs), { recursive: true })
  if (fs.existsSync(sourceRootDirAbs)) {
    fs.cpSync(sourceRootDirAbs, durableRootDirAbs, { recursive: true, force: true })
  } else {
    fs.mkdirSync(path.dirname(durableEntryHtmlPathAbs), { recursive: true })
    fs.writeFileSync(durableEntryHtmlPathAbs, input.entryHtmlContent, 'utf8')
  }

  return {
    durableSnapshotRootDirAbs: durableRootDirAbs,
    durableEntryHtmlPathAbs,
  }
}
