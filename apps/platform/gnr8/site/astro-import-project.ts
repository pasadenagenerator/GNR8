import { createHash } from 'node:crypto'
import path from 'node:path'

type SourceFile = { path: string; contents: string }
type CaptureFile = { path: string; bytes: Buffer; sha256: string }
export type AstroImportProjectFile = { path: string; body: Buffer }

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex')
const localAssetReference = /\/(?:assets|uploads)\/[^\s"'<>\\)]+/g

/** Make the existing Astro adapter output self-contained for a native Git workspace.
 * No source URL is fetched: every local file comes from the verified capture. */
export function createAstroImportProject(input: {
  runtimeSiteId: string
  siteVersionId: string
  sourceUrl: string
  sourceFiles: SourceFile[]
  captureFiles: CaptureFile[]
  materializedCssByPath?: Record<string, string>
}): { files: AstroImportProjectFile[]; routeCount: number; assetCount: number; externalFallbacks: string[] } {
  const prefix = `/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.runtimeSiteId)}/${encodeURIComponent(input.siteVersionId)}/`
  const source = new URL(input.sourceUrl)
  const captured = new Map(input.captureFiles.map(file => [file.path, file]))
  const output = new Map<string, Buffer>()
  const relocatedStyles = new Map<string, string>()
  const styleBodies = new Map<string, Buffer>()
  const textFiles = new Map<string, string>()
  const localize = (text: string) => text.replaceAll(prefix, '/')
  const resolveCssUrls = (css: string, publicPath: string) => css.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (full, quote: string, reference: string) => {
      const value = reference.trim()
      if (/^(?:data:|https?:|\/\/|\/|#)/i.test(value)) return full
      const normalized = new URL(value, `https://gnr8.invalid/${path.posix.dirname(publicPath)}/`)
      return `url(${quote}${normalized.pathname}${normalized.search}${normalized.hash}${quote})`
    },
  )

  for (const file of input.sourceFiles) {
    if (!(file.path === 'package.json' || file.path === 'astro.config.mjs' || file.path === 'brand/kit.json' ||
        /^(?:src|public)\//.test(file.path)) || /[\\\x00-\x1f?#]/.test(file.path) ||
        file.path.split('/').some(part => !part || part === '.' || part === '..') || textFiles.has(file.path)) {
      throw new Error(`ASTRO_IMPORT_SOURCE_PATH_INVALID:${file.path}`)
    }
    const text = localize(file.contents)
    if (file.path.startsWith('public/') && file.path.endsWith('.css')) {
      const body = Buffer.from(resolveCssUrls(text, file.path.slice('public/'.length)))
      const destination = `public/styles/captured/${sha256(body).slice(0, 16)}.css`
      relocatedStyles.set(file.path.slice('public'.length), destination.slice('public'.length))
      styleBodies.set(destination, body)
    } else {
      textFiles.set(file.path, text)
    }
  }
  for (const [filePath, body] of styleBodies) textFiles.set(filePath, body.toString('utf8'))
  for (const [filePath, text] of textFiles) {
    let rewritten = text
    for (const [before, after] of relocatedStyles) rewritten = rewritten.replaceAll(before, after)
    textFiles.set(filePath, rewritten)
  }

  const selected = new Set<string>()
  const missing = new Set<string>()
  const scan = (text: string) => {
    for (const match of text.matchAll(localAssetReference)) {
      let local: string
      try { local = decodeURIComponent(match[0].split(/[?#]/, 1)[0]!).slice(1) }
      catch { throw new Error('ASTRO_IMPORT_ASSET_PATH_INVALID') }
      if (captured.has(local)) selected.add(local)
      else missing.add(local)
    }
  }
  for (const text of textFiles.values()) scan(text)
  const brandKit = textFiles.get('brand/kit.json')
  if (brandKit) {
    const parsed = JSON.parse(brandKit) as { logos?: Array<{ localPath?: string }> }
    for (const logo of parsed.logos ?? []) {
      const local = logo.localPath?.replace(/^\/+/, '')
      if (local && captured.has(local)) selected.add(local)
    }
  }
  // Materialized CSS has already expanded nested imports and rewritten owned
  // URLs in the source-backed adapter. Scan those dependencies as well.
  const pending = [...selected]
  for (let index = 0; index < pending.length; index++) {
    const assetPath = pending[index]!
    if (!assetPath.toLowerCase().endsWith('.css')) continue
    const asset = captured.get(assetPath)!
    const css = resolveCssUrls(localize(input.materializedCssByPath?.[assetPath] ?? asset.bytes.toString('utf8')), assetPath)
    const before = selected.size
    scan(css)
    if (selected.size !== before) for (const next of selected) if (!pending.includes(next)) pending.push(next)
  }

  const duplicateAssets = new Map<string, string>()
  const canonicalByPath = new Map<string, string>()
  for (const assetPath of [...selected].sort()) {
    const asset = captured.get(assetPath)!
    if (sha256(asset.bytes) !== asset.sha256) throw new Error(`ASTRO_IMPORT_CAPTURE_INTEGRITY:${assetPath}`)
    const extension = path.posix.extname(assetPath).toLowerCase()
    const key = `${asset.sha256}:${extension}`
    const canonical = duplicateAssets.get(key) ?? assetPath
    duplicateAssets.set(key, canonical)
    canonicalByPath.set(assetPath, canonical)
    if (canonical !== assetPath) continue
    const body = assetPath.toLowerCase().endsWith('.css')
      ? Buffer.from(resolveCssUrls(localize(input.materializedCssByPath?.[assetPath] ?? asset.bytes.toString('utf8')), assetPath))
      : asset.bytes
    output.set(`public/${canonical}`, body)
  }
  for (const [filePath, text] of textFiles) output.set(filePath, Buffer.from(text))
  for (const [filePath, body] of output) {
    if (!/\.(?:astro|json|css|mjs|ts|md)$/.test(filePath)) continue
    let text = body.toString('utf8')
    for (const [original, canonical] of canonicalByPath) {
      if (original !== canonical) text = text.replaceAll(`/${original}`, `/${canonical}`)
    }
    for (const missingPath of missing) {
      // Avoid replacing a path inside an already absolute source URL.
      const escaped = missingPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      text = text.replace(new RegExp(`(?<![A-Za-z0-9])/${escaped}`, 'g'), `${source.origin}/${missingPath}`)
    }
    output.set(filePath, Buffer.from(text))
  }
  if (brandKit) {
    const parsed = JSON.parse(output.get('brand/kit.json')!.toString('utf8')) as { logos?: Array<{ localPath?: string }> }
    for (const logo of parsed.logos ?? []) {
      if (logo.localPath) logo.localPath = canonicalByPath.get(logo.localPath.replace(/^\/+/, '')) ?? logo.localPath
    }
    output.set('brand/kit.json', Buffer.from(`${JSON.stringify(parsed, null, 2)}\n`))
  }
  const routes = [...output.keys()].filter(file => /^src\/pages\/.+\.astro$/.test(file))
  if (!output.has('src/pages/index.astro') || !output.has('package.json') || !output.has('astro.config.mjs')) {
    throw new Error('ASTRO_IMPORT_PROJECT_INCOMPLETE')
  }
  output.set('README.md', Buffer.from(`# Imported Astro site\n\nSource: ${source.origin}\n\nThis editable Astro project was made from the retained GNR8 capture without a second crawl. Page markup is in \`src/pages\`; blog entries are in \`src/content/blog\`. The Brand Style candidate is in \`brand/kit.json\` and \`src/styles/gnr8-brand.css\` when available. Review source-specific interactive functions before publication.\n`))
  output.set('.gitignore', Buffer.from('node_modules/\ndist/\n.astro/\n'))
  return {
    files: [...output].map(([filePath, body]) => ({ path: filePath, body })).sort((a, b) => a.path.localeCompare(b.path)),
    routeCount: routes.length + [...output.keys()].filter(file => file.startsWith('src/content/blog/') && file.endsWith('.json')).length - (output.has('src/pages/[...slug].astro') ? 1 : 0),
    assetCount: [...output.keys()].filter(file => file.startsWith('public/')).length,
    externalFallbacks: [...missing].sort(),
  }
}
