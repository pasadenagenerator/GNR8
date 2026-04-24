import crypto from 'node:crypto'

import { parse } from 'parse5'

export type SemanticImportCaptureMode = 'raw_html_only' | 'dom_parsed' | 'rendered_browser'

export type SemanticImportSectionType =
  | 'hero'
  | 'services'
  | 'gallery'
  | 'contact'
  | 'testimonials'
  | 'faq'
  | 'navigation'
  | 'header'
  | 'footer'
  | 'content'

export type SemanticImportImageRole =
  | 'logo'
  | 'hero_image'
  | 'gallery_image'
  | 'service_image'
  | 'testimonial_avatar'
  | 'content_image'
  | 'icon'
  | 'unknown'

export type SemanticImportDiagnosticCode =
  | 'SEMANTIC_IMPORT_STARTED'
  | 'SEMANTIC_IMPORT_COMPLETED'
  | 'HERO_DETECTED'
  | 'HERO_NOT_DETECTED'
  | 'GALLERY_DETECTED'
  | 'SERVICE_GROUP_DETECTED'
  | 'CONTACT_SECTION_DETECTED'
  | 'IMAGE_ROLE_ASSIGNED'
  | 'LOW_CONFIDENCE_SECTION_CLASSIFICATION'
  | 'RAW_HTML_ONLY_MODE_USED'

export type SemanticImportDiagnostic = {
  code: SemanticImportDiagnosticCode
  message: string
  details: Record<string, unknown> | null
}

export type SemanticImportInputAsset = {
  path: string
  mediaType: string | null
  width?: number | null
  height?: number | null
}

export type SemanticImportSection = {
  id: string
  type: SemanticImportSectionType
  title: string | null
  intro: string | null
  items: Array<Record<string, unknown>>
  images: Array<{ src: string; alt: string | null; role: SemanticImportImageRole }>
  ctas: Array<{ label: string; url: string }>
  forms: Array<{ action: string | null; method: string | null; fieldCount: number }>
  confidence: number
  diagnostics: string[]
}

export type SemanticImportHero = {
  title: string | null
  subtitle: string | null
  cta: { label: string; url: string } | null
  image: { src: string; alt: string | null } | null
  confidence: number
  diagnostics: string[]
}

export type SemanticImportResult = {
  sourceMode: 'raw_html_only'
  captureMode: SemanticImportCaptureMode
  title: string | null
  language: string | null
  navigation: Array<{ label: string; href: string }>
  hero: SemanticImportHero | null
  sections: SemanticImportSection[]
  assets: {
    images: Array<{ src: string; alt: string | null; role: SemanticImportImageRole; sectionId: string | null }>
    groupedByRole: Record<SemanticImportImageRole, string[]>
    knownAssets: SemanticImportInputAsset[]
  }
  diagnostics: SemanticImportDiagnostic[]
}

export type SemanticImportEngineInput = {
  normalizedHtml: string
  entryHtmlPath: string
  captureMode?: SemanticImportCaptureMode
  sourceUrl?: string | null
  sourceFilename?: string | null
  assetManifest?: {
    references?: Array<Record<string, unknown>>
    files?: Array<Record<string, unknown>>
  } | null
}

type DomNode = {
  nodeName?: string
  tagName?: string
  value?: string
  attrs?: Array<{ name: string; value: string }>
  childNodes?: DomNode[]
  parentNode?: DomNode
}

type SectionCandidate = {
  node: DomNode
  path: string
  ordinal: number
  tag: string
  text: string
  headings: string[]
  paragraphs: string[]
  images: Array<{ src: string; alt: string | null; path: string }>
  links: Array<{ href: string; label: string; isButtonLike: boolean }>
  forms: Array<{ action: string | null; method: string | null; fieldCount: number }>
  htmlClass: string
  htmlId: string
  typeHint: SemanticImportSectionType | null
}

const SECTION_TAGS = new Set(['section', 'main', 'header', 'footer', 'nav', 'article', 'div'])

function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function stableId(prefix: string, seed: string): string {
  const hash = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 12)
  return `${prefix}_${hash}`
}

function isElement(node: DomNode | null | undefined): node is DomNode {
  return Boolean(node && typeof node.tagName === 'string')
}

function attr(node: DomNode, name: string): string {
  const found = node.attrs?.find((entry) => entry.name.toLowerCase() === name)
  return normalizeText(found?.value)
}

function attrIncludes(node: DomNode, name: string, needle: string): boolean {
  return attr(node, name).toLowerCase().includes(needle.toLowerCase())
}

function textFromNode(node: DomNode | null | undefined): string {
  if (!node) return ''
  if (node.nodeName === '#text') return normalizeText(node.value)
  const children = Array.isArray(node.childNodes) ? node.childNodes : []
  return normalizeText(children.map((child) => textFromNode(child)).join(' '))
}

function walk(node: DomNode, visitor: (node: DomNode, path: string) => void, path = '0'): void {
  visitor(node, path)
  const children = Array.isArray(node.childNodes) ? node.childNodes : []
  for (let index = 0; index < children.length; index += 1) {
    walk(children[index], visitor, `${path}.${index}`)
  }
}

function findFirst(node: DomNode, predicate: (node: DomNode) => boolean): DomNode | null {
  let found: DomNode | null = null
  walk(node, (current) => {
    if (found) return
    if (predicate(current)) found = current
  })
  return found
}

function collectHeadings(node: DomNode): string[] {
  const out: string[] = []
  walk(node, (current) => {
    if (!isElement(current)) return
    if (!/^h[1-6]$/.test(current.tagName ?? '')) return
    const text = textFromNode(current)
    if (text) out.push(text)
  })
  return out.slice(0, 12)
}

function collectParagraphs(node: DomNode): string[] {
  const out: string[] = []
  walk(node, (current) => {
    if (!isElement(current)) return
    if ((current.tagName ?? '') !== 'p') return
    const text = textFromNode(current)
    if (text) out.push(text)
  })
  return out.slice(0, 16)
}

function hasHeadingTag(node: DomNode, tagName: 'h1' | 'h2' | 'h3' | 'h4'): boolean {
  let found = false
  walk(node, (current) => {
    if (found) return
    if (!isElement(current)) return
    if ((current.tagName ?? '') === tagName) found = true
  })
  return found
}

function collectLinks(node: DomNode): Array<{ href: string; label: string; isButtonLike: boolean }> {
  const out: Array<{ href: string; label: string; isButtonLike: boolean }> = []
  const seen = new Set<string>()
  walk(node, (current) => {
    if (!isElement(current)) return
    const tag = current.tagName ?? ''
    if (tag !== 'a' && tag !== 'button') return
    const href = tag === 'a' ? normalizeText(attr(current, 'href')) : '#'
    const label = textFromNode(current)
    if (!label) return
    const isButtonLike = tag === 'button' || attrIncludes(current, 'class', 'button') || /book|contact|quote|get started|learn more|start/i.test(label)
    const dedupeKey = `${href}::${label}`
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)
    out.push({ href: href || '#', label, isButtonLike })
  })
  return out.slice(0, 20)
}

function collectForms(node: DomNode): Array<{ action: string | null; method: string | null; fieldCount: number }> {
  const out: Array<{ action: string | null; method: string | null; fieldCount: number }> = []
  walk(node, (current) => {
    if (!isElement(current) || current.tagName !== 'form') return
    let fieldCount = 0
    walk(current, (child) => {
      if (!isElement(child)) return
      if (child.tagName === 'input' || child.tagName === 'textarea' || child.tagName === 'select') fieldCount += 1
    })
    out.push({
      action: normalizeText(attr(current, 'action')) || null,
      method: normalizeText(attr(current, 'method')) || null,
      fieldCount,
    })
  })
  return out.slice(0, 8)
}

function collectImages(node: DomNode): Array<{ src: string; alt: string | null; path: string }> {
  const out: Array<{ src: string; alt: string | null; path: string }> = []
  const seen = new Set<string>()
  walk(node, (current, currentPath) => {
    if (!isElement(current) || current.tagName !== 'img') return
    const src = normalizeText(attr(current, 'src'))
    if (!src || seen.has(src)) return
    seen.add(src)
    const alt = normalizeText(attr(current, 'alt')) || null
    out.push({ src, alt, path: currentPath })
  })
  return out.slice(0, 100)
}

function classifySectionHint(candidate: SectionCandidate): SemanticImportSectionType | null {
  const context = `${candidate.htmlClass} ${candidate.htmlId} ${candidate.text}`.toLowerCase()
  if (candidate.tag === 'header') return 'header'
  if (candidate.tag === 'footer') return 'footer'
  if (candidate.tag === 'nav') return 'navigation'
  if (candidate.forms.length > 0 || /contact|address|phone|email|@|\+\d/.test(context)) return 'contact'
  if (candidate.images.length >= 4 || /gallery|portfolio/.test(context)) return 'gallery'
  if (/testimonial|review|client said|what our clients/i.test(context)) return 'testimonials'
  if (/faq|frequently asked|\?/.test(context) && candidate.paragraphs.length >= 2) return 'faq'
  if (/service|feature|what we do|offerings/.test(context)) return 'services'
  return null
}

function detectHero(candidates: SectionCandidate[]): {
  hero: SemanticImportHero | null
  heroPath: string | null
} {
  let best: { candidate: SectionCandidate; score: number } | null = null
  for (const candidate of candidates.slice(0, 5)) {
    const hasH1 = hasHeadingTag(candidate.node, 'h1')
    let score = 0
    if (hasH1) score += 5
    if (candidate.headings.some((entry) => entry.length > 0) && !hasH1) score += 1
    if (candidate.headings.length > 0 && candidate.headings[0].length <= 120) score += hasH1 ? 2 : 0
    if (candidate.links.some((link) => link.isButtonLike)) score += 2
    if (candidate.images.length > 0) score += 1
    if (candidate.tag === 'header' || candidate.tag === 'section' || candidate.tag === 'main') score += 1
    if (!hasH1) score -= 1
    if (!best || score > best.score) best = { candidate, score }
  }

  if (!best || best.score < 4 || !hasHeadingTag(best.candidate.node, 'h1')) {
    return { hero: null, heroPath: null }
  }

  const cta = best.candidate.links.find((entry) => entry.isButtonLike) ?? best.candidate.links[0] ?? null
  const hero: SemanticImportHero = {
    title: best.candidate.headings[0] ?? null,
    subtitle: best.candidate.paragraphs[0] ?? null,
    cta: cta ? { label: cta.label, url: cta.href } : null,
    image: best.candidate.images[0] ? { src: best.candidate.images[0].src, alt: best.candidate.images[0].alt } : null,
    confidence: Math.min(1, Number((best.score / 8).toFixed(3))),
    diagnostics: ['HERO_DETECTED'],
  }
  return { hero, heroPath: best.candidate.path }
}

function imageRole(input: {
  src: string
  sectionType: SemanticImportSectionType | null
  alt: string | null
  knownAsset?: SemanticImportInputAsset | null
}): SemanticImportImageRole {
  const source = `${input.src} ${input.alt ?? ''}`.toLowerCase()
  const width = input.knownAsset?.width ?? null
  const height = input.knownAsset?.height ?? null

  if (/logo|brand/.test(source)) return 'logo'
  if (/icon|favicon/.test(source)) return 'icon'
  if (width != null && height != null && width <= 96 && height <= 96) return 'icon'
  if (/hero|banner|masthead/.test(source) || input.sectionType === 'hero') return 'hero_image'
  if (/gallery|portfolio/.test(source) || input.sectionType === 'gallery') return 'gallery_image'
  if (/avatar|author|profile/.test(source) || input.sectionType === 'testimonials') return 'testimonial_avatar'
  if (/service|feature/.test(source) || input.sectionType === 'services') return 'service_image'
  if (input.sectionType === 'header' || input.sectionType === 'navigation') return 'logo'
  return 'content_image'
}

function parseKnownAssets(input: SemanticImportEngineInput['assetManifest']): SemanticImportInputAsset[] {
  if (!input) return []
  const known = new Map<string, SemanticImportInputAsset>()

  const consume = (entry: Record<string, unknown>) => {
    const path = normalizeText(entry.path ?? entry.resolvedPath)
    if (!path) return
    const mediaType = normalizeText(entry.mediaType) || null
    const width = Number(entry.width)
    const height = Number(entry.height)
    known.set(path, {
      path,
      mediaType,
      width: Number.isFinite(width) ? width : null,
      height: Number.isFinite(height) ? height : null,
    })
  }

  const files = Array.isArray(input.files) ? input.files : []
  const references = Array.isArray(input.references) ? input.references : []
  for (const file of files) if (file && typeof file === 'object') consume(file)
  for (const ref of references) if (ref && typeof ref === 'object') consume(ref)

  return [...known.values()].sort((left, right) => left.path.localeCompare(right.path))
}

function createSectionFromCandidate(input: {
  candidate: SectionCandidate
  type: SemanticImportSectionType
  heroPath: string | null
  knownAssetsByPath: Map<string, SemanticImportInputAsset>
}): SemanticImportSection {
  const candidate = input.candidate
  const isHeroCandidate = input.heroPath != null && input.heroPath === candidate.path
  const type = isHeroCandidate ? 'hero' : input.type

  const ctas = candidate.links.filter((link) => link.isButtonLike).map((link) => ({ label: link.label, url: link.href })).slice(0, 6)
  const images = candidate.images.map((image) => ({
    src: image.src,
    alt: image.alt,
    role: imageRole({
      src: image.src,
      alt: image.alt,
      sectionType: type,
      knownAsset: input.knownAssetsByPath.get(image.src) ?? null,
    }),
  }))

  const items: Array<Record<string, unknown>> = []
  if (type === 'services') {
    const limit = Math.max(candidate.headings.length, candidate.paragraphs.length)
    for (let index = 0; index < Math.min(6, limit); index += 1) {
      const title = candidate.headings[index] ?? null
      const text = candidate.paragraphs[index] ?? null
      if (!title && !text) continue
      items.push({ title, text })
    }
  } else if (type === 'faq') {
    const paragraphs = candidate.paragraphs
    for (let index = 0; index < Math.min(candidate.headings.length, paragraphs.length); index += 1) {
      const question = candidate.headings[index]
      const answer = paragraphs[index]
      if (!question || !answer) continue
      items.push({ question, answer })
    }
  } else if (type === 'testimonials') {
    const quotes = candidate.paragraphs.filter((entry) => entry.length >= 24).slice(0, 6)
    for (const quote of quotes) items.push({ quote })
  } else if (type === 'gallery') {
    for (const image of images.slice(0, 20)) items.push({ src: image.src, alt: image.alt })
  }

  const confidenceBase =
    type === 'hero'
      ? 0.88
      : type === 'gallery' || type === 'contact' || type === 'services' || type === 'faq' || type === 'testimonials'
        ? 0.74
        : 0.56
  const confidence = Number(
    Math.min(
      1,
      confidenceBase +
        (candidate.images.length > 0 ? 0.05 : 0) +
        (candidate.links.length > 1 ? 0.04 : 0) +
        (candidate.forms.length > 0 ? 0.05 : 0),
    ).toFixed(3),
  )

  return {
    id: stableId('section', `${candidate.path}:${type}:${candidate.ordinal}`),
    type,
    title: candidate.headings[0] ?? null,
    intro: candidate.paragraphs[0] ?? null,
    items,
    images,
    ctas,
    forms: candidate.forms,
    confidence,
    diagnostics: confidence < 0.6 ? ['LOW_CONFIDENCE_SECTION_CLASSIFICATION'] : [],
  }
}

function extractSectionCandidates(body: DomNode): SectionCandidate[] {
  const candidates: SectionCandidate[] = []
  const children = Array.isArray(body.childNodes) ? body.childNodes : []

  const primaryNodes = children.filter((node) => isElement(node) && SECTION_TAGS.has(node.tagName ?? ''))
  const fallbackNodes = primaryNodes.length > 0 ? primaryNodes : children.filter((node) => isElement(node)).slice(0, 12)

  let ordinal = 0
  for (const node of fallbackNodes) {
    if (!isElement(node)) continue
    const text = textFromNode(node)
    if (!text && node.tagName !== 'nav' && node.tagName !== 'header' && node.tagName !== 'footer') continue
    const path = `${node.tagName ?? 'node'}:${ordinal}`
    const candidate: SectionCandidate = {
      node,
      path,
      ordinal,
      tag: node.tagName ?? 'div',
      text,
      headings: collectHeadings(node),
      paragraphs: collectParagraphs(node),
      images: collectImages(node),
      links: collectLinks(node),
      forms: collectForms(node),
      htmlClass: attr(node, 'class'),
      htmlId: attr(node, 'id'),
      typeHint: null,
    }
    candidate.typeHint = classifySectionHint(candidate)
    candidates.push(candidate)
    ordinal += 1
  }

  return candidates
}

function collectNavigation(root: DomNode): Array<{ label: string; href: string }> {
  const navItems: Array<{ label: string; href: string }> = []
  const seen = new Set<string>()
  walk(root, (node) => {
    if (!isElement(node) || node.tagName !== 'nav') return
    const links = collectLinks(node)
    for (const link of links) {
      if (link.href === '#') continue
      const key = `${link.label}::${link.href}`
      if (seen.has(key)) continue
      seen.add(key)
      navItems.push({ label: link.label, href: link.href })
    }
  })
  return navItems.slice(0, 30)
}

export function runSemanticImportEngine(input: SemanticImportEngineInput): SemanticImportResult {
  const captureMode = input.captureMode ?? 'raw_html_only'
  const diagnostics: SemanticImportDiagnostic[] = [
    { code: 'SEMANTIC_IMPORT_STARTED', message: 'Semantic import started.', details: { entryHtmlPath: input.entryHtmlPath } },
  ]

  if (captureMode === 'raw_html_only') {
    diagnostics.push({ code: 'RAW_HTML_ONLY_MODE_USED', message: 'Raw HTML only mode used.', details: null })
  }

  const parsed = parse(input.normalizedHtml) as DomNode
  const html = findFirst(parsed, (node) => isElement(node) && node.tagName === 'html')
  const body = findFirst(parsed, (node) => isElement(node) && node.tagName === 'body')
  const titleNode = findFirst(parsed, (node) => isElement(node) && node.tagName === 'title')

  const title = normalizeText(textFromNode(titleNode)) || null
  const language = html ? normalizeText(attr(html, 'lang')) || null : null
  const navigation = collectNavigation(parsed)

  const candidates = body ? extractSectionCandidates(body) : []
  const knownAssets = parseKnownAssets(input.assetManifest)
  const knownAssetsByPath = new Map(knownAssets.map((asset) => [asset.path, asset]))

  const heroDetection = detectHero(candidates)
  if (heroDetection.hero) {
    diagnostics.push({ code: 'HERO_DETECTED', message: 'Hero section detected.', details: { path: heroDetection.heroPath } })
  } else {
    diagnostics.push({ code: 'HERO_NOT_DETECTED', message: 'Hero section not detected.', details: null })
  }

  const sections = candidates.map((candidate) => {
    const type = candidate.path === heroDetection.heroPath ? 'hero' : candidate.typeHint ?? 'content'
    return createSectionFromCandidate({
      candidate,
      type,
      heroPath: heroDetection.heroPath,
      knownAssetsByPath,
    })
  })

  if (sections.some((section) => section.type === 'gallery')) {
    diagnostics.push({ code: 'GALLERY_DETECTED', message: 'Gallery section detected.', details: null })
  }
  if (sections.some((section) => section.type === 'services')) {
    diagnostics.push({ code: 'SERVICE_GROUP_DETECTED', message: 'Service/card group detected.', details: null })
  }
  if (sections.some((section) => section.type === 'contact' || section.forms.length > 0)) {
    diagnostics.push({ code: 'CONTACT_SECTION_DETECTED', message: 'Contact section detected.', details: null })
  }

  const imageRows = sections.flatMap((section) =>
    section.images.map((image) => ({ src: image.src, alt: image.alt, role: image.role, sectionId: section.id })),
  )

  for (const section of sections) {
    if (section.confidence < 0.6) {
      diagnostics.push({
        code: 'LOW_CONFIDENCE_SECTION_CLASSIFICATION',
        message: 'Section classified with low confidence.',
        details: { sectionId: section.id, sectionType: section.type, confidence: section.confidence },
      })
    }
  }

  if (imageRows.length > 0) {
    diagnostics.push({
      code: 'IMAGE_ROLE_ASSIGNED',
      message: 'Image roles assigned.',
      details: {
        imageCount: imageRows.length,
        roles: [...new Set(imageRows.map((row) => row.role))].sort((left, right) => left.localeCompare(right)),
      },
    })
  }

  const groupedByRole: Record<SemanticImportImageRole, string[]> = {
    logo: [],
    hero_image: [],
    gallery_image: [],
    service_image: [],
    testimonial_avatar: [],
    content_image: [],
    icon: [],
    unknown: [],
  }

  for (const row of imageRows) {
    groupedByRole[row.role].push(row.src)
  }
  for (const role of Object.keys(groupedByRole) as SemanticImportImageRole[]) {
    groupedByRole[role] = [...new Set(groupedByRole[role])].sort((left, right) => left.localeCompare(right))
  }

  diagnostics.push({
    code: 'SEMANTIC_IMPORT_COMPLETED',
    message: 'Semantic import completed.',
    details: {
      sectionCount: sections.length,
      imageCount: imageRows.length,
      sourceUrl: normalizeText(input.sourceUrl) || null,
      sourceFilename: normalizeText(input.sourceFilename) || null,
    },
  })

  return {
    sourceMode: 'raw_html_only',
    captureMode,
    title,
    language,
    navigation,
    hero: heroDetection.hero,
    sections,
    assets: {
      images: imageRows,
      groupedByRole,
      knownAssets,
    },
    diagnostics,
  }
}
