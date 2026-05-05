import { parse, serialize } from 'parse5'
import type { DefaultTreeAdapterMap } from 'parse5'
import type { SemanticImportResult, SemanticImportSection } from '@/gnr8/import-semantic/semantic-import-engine'

export type ContentSlotType = 'text' | 'rich_text' | 'url' | 'image' | 'list'
export type ContentOverrideStatus = 'draft' | 'published'

export type ContentSlot = {
  id: string
  siteId: string
  siteVersionId: string
  slotKey: string
  slotType: ContentSlotType
  sourceSelector: string | null
  sourceText: string | null
  sourceAssetPath: string | null
  confidence: number
  diagnostics: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export type ContentOverride = {
  id: string
  siteId: string
  siteVersionId: string
  slotKey: string
  valueType: ContentSlotType
  valueJson: unknown
  status: ContentOverrideStatus
  createdAt?: string
  updatedAt?: string
}

type Node = DefaultTreeAdapterMap['node']
type Element = DefaultTreeAdapterMap['element']
type Parse5Document = DefaultTreeAdapterMap['document']

function asElement(node: Node | null | undefined): Element | null {
  if (!node || typeof (node as any).tagName !== 'string') return null
  return node as Element
}

function childrenOf(node: Node | null | undefined): Node[] {
  if (!node || !Array.isArray((node as any).childNodes)) return []
  return (node as any).childNodes as Node[]
}

function textOf(node: Node | null | undefined): string {
  if (!node) return ''
  const raw = (node as any).value
  if (typeof raw === 'string') return raw.replace(/\s+/g, ' ').trim()
  return childrenOf(node).map((child) => textOf(child)).join(' ').replace(/\s+/g, ' ').trim()
}

function attrValue(node: Element, name: string): string {
  const attrs = Array.isArray((node as any).attrs) ? ((node as any).attrs as Array<{ name: string; value: string }>) : []
  const hit = attrs.find((entry) => entry.name.toLowerCase() === name.toLowerCase())
  return String(hit?.value ?? '').trim()
}

function setAttr(node: Element, name: string, value: string): void {
  const attrs = Array.isArray((node as any).attrs) ? ((node as any).attrs as Array<{ name: string; value: string }>) : []
  const hit = attrs.find((entry) => entry.name.toLowerCase() === name.toLowerCase())
  if (hit) {
    hit.value = value
    return
  }
  attrs.push({ name, value })
  ;(node as any).attrs = attrs
}

function collect(root: Node, predicate: (el: Element) => boolean): Element[] {
  const out: Element[] = []
  const walk = (node: Node) => {
    const el = asElement(node)
    if (el && predicate(el)) out.push(el)
    for (const child of childrenOf(node)) walk(child)
  }
  walk(root)
  return out
}

function buildDomPath(node: Element): string {
  const segments: string[] = []
  let current: Node | null = node
  while (current) {
    const el = asElement(current)
    if (!el) {
      current = (current as any).parentNode ?? null
      continue
    }
    const parent = asElement((current as any).parentNode)
    const tag = (el.tagName || '').toLowerCase()
    if (!tag) break
    if (!parent) {
      segments.push(tag)
      break
    }
    const siblings = childrenOf(parent).map(asElement).filter((v): v is Element => Boolean(v) && (v!.tagName || '').toLowerCase() === tag)
    const index = siblings.indexOf(el) + 1
    segments.push(`${tag}:nth-of-type(${Math.max(1, index)})`)
    current = parent
  }
  return segments.reverse().join(' > ')
}

function resolveByPath(root: Node, selector: string): Element | null {
  const parts = String(selector).split('>').map((part) => part.trim()).filter(Boolean)
  if (parts.length === 0) return null
  const candidates: Element[] = collect(root, (el) => (el.tagName || '').toLowerCase() === parts[0].split(':')[0])
  if (candidates.length === 0) return null
  let current: Element | null = candidates[0] ?? null
  for (let i = 1; i < parts.length; i += 1) {
    if (!current) return null
    const raw = parts[i]
    const m = /^(\w+)(?::nth-of-type\((\d+)\))?$/.exec(raw)
    if (!m) return null
    const tag = m[1]!.toLowerCase()
    const nth = Math.max(1, Number(m[2] ?? '1'))
    const childElements: Element[] = childrenOf(current)
      .map(asElement)
      .filter((value): value is Element => value !== null)
    const matches: Element[] = childElements.filter((element) => {
      return (element.tagName || '').toLowerCase() === tag
    })
    current = matches[nth - 1] ?? null
  }
  return current
}

function normalizeSectionType(type: string | null | undefined): string {
  const known = new Set(['hero', 'services', 'gallery', 'contact', 'testimonials', 'faq', 'footer', 'content'])
  const normalized = String(type ?? '').trim().toLowerCase()
  if (known.has(normalized)) return normalized
  return 'unknown'
}

function exactTextCandidates(root: Node, value: string): Element[] {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
  if (!normalized) return []
  return collect(root, (el) => textOf(el).toLowerCase() === normalized)
}

function findImageBySrc(root: Node, src: string): Element | null {
  const normalized = String(src ?? '').trim()
  if (!normalized) return null
  return collect(root, (el) => (el.tagName || '').toLowerCase() === 'img' && attrValue(el, 'src') === normalized)[0] ?? null
}

function createSlot(input: {
  siteId: string
  siteVersionId: string
  slotKey: string
  slotType: ContentSlotType
  sourceSelector: string | null
  sourceText?: string | null
  sourceAssetPath?: string | null
  confidence: number
  diagnostics?: Record<string, unknown> | null
}): Omit<ContentSlot, 'id'> {
  return {
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    slotKey: input.slotKey,
    slotType: input.slotType,
    sourceSelector: input.sourceSelector,
    sourceText: input.sourceText ?? null,
    sourceAssetPath: input.sourceAssetPath ?? null,
    confidence: input.confidence,
    diagnostics: input.diagnostics ?? null,
  }
}

function asItemText(item: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function asItemImage(item: Record<string, unknown>): string | null {
  const candidates = ['image', 'imageSrc', 'src', 'icon', 'avatar', 'photo']
  for (const key of candidates) {
    const value = item[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function inferContactField(section: SemanticImportSection, key: 'email' | 'phone' | 'address'): string | null {
  const haystacks = [section.title ?? '', section.intro ?? '', ...section.items.flatMap((item) => Object.values(item).map((v) => String(v ?? '')))]
  if (key === 'email') {
    for (const value of haystacks) {
      const m = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.exec(value)
      if (m) return m[0]
    }
  }
  if (key === 'phone') {
    for (const value of haystacks) {
      const m = /(\+?[0-9][0-9\s().-]{6,}[0-9])/.exec(value)
      if (m) return m[0]
    }
  }
  if (key === 'address') {
    for (const value of haystacks) {
      if (/\d+\s+.+(street|st\.?|road|rd\.?|avenue|ave\.?|blvd|drive|dr\.?)/i.test(value)) return value.trim()
    }
  }
  return null
}

function inferSectionSlots(input: {
  siteId: string
  siteVersionId: string
  root: Parse5Document
  section: SemanticImportSection
  sectionIndex: number
  diagnostics: string[]
}): Omit<ContentSlot, 'id'>[] {
  const out: Omit<ContentSlot, 'id'>[] = []
  const sectionType = normalizeSectionType(input.section.type)
  const base = `sections.${input.sectionIndex}`
  input.diagnostics.push('SECTION_SLOT_INFERRED')

  out.push(createSlot({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    slotKey: `${base}.type`,
    slotType: 'text',
    sourceSelector: null,
    sourceText: sectionType,
    confidence: 1,
    diagnostics: { inferredFrom: 'semantic.section.type' },
  }))

  const heading = input.section.title
  if (heading) {
    const candidates = exactTextCandidates(input.root, heading)
    const target = candidates[0] ?? null
    if (candidates.length > 1) input.diagnostics.push('SECTION_SLOT_LOW_CONFIDENCE')
    if (candidates.length === 0) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
    out.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: `${base}.heading`,
      slotType: 'text',
      sourceSelector: target ? buildDomPath(target) : null,
      sourceText: heading,
      confidence: target ? (candidates.length > 1 ? 0.52 : 0.86) : 0.42,
      diagnostics: { inferredFrom: 'semantic.section.title' },
    }))
  }

  const intro = input.section.intro
  if (intro) {
    const candidates = exactTextCandidates(input.root, intro)
    const target = candidates[0] ?? null
    if (candidates.length > 1) input.diagnostics.push('SECTION_SLOT_LOW_CONFIDENCE')
    if (candidates.length === 0) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
    out.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: `${base}.intro`,
      slotType: 'text',
      sourceSelector: target ? buildDomPath(target) : null,
      sourceText: intro,
      confidence: target ? (candidates.length > 1 ? 0.5 : 0.82) : 0.4,
      diagnostics: { inferredFrom: 'semantic.section.intro' },
    }))
  }

  for (let ctaIndex = 0; ctaIndex < input.section.ctas.length; ctaIndex += 1) {
    const cta = input.section.ctas[ctaIndex]
    const labelKey = `${base}.cta.label`
    const hrefKey = `${base}.cta.href`
    const candidates = exactTextCandidates(input.root, cta.label)
    const anchor = candidates.find((el) => {
      const tag = (el.tagName || '').toLowerCase()
      return tag === 'a' || tag === 'button'
    }) ?? candidates[0] ?? null
    if (!anchor) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
    if (candidates.length > 1) input.diagnostics.push('SECTION_SLOT_LOW_CONFIDENCE')
    out.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: labelKey,
      slotType: 'text',
      sourceSelector: anchor ? buildDomPath(anchor) : null,
      sourceText: cta.label,
      confidence: anchor ? (candidates.length > 1 ? 0.52 : 0.82) : 0.4,
      diagnostics: { inferredFrom: `semantic.section.ctas.${ctaIndex}.label` },
    }))
    out.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: hrefKey,
      slotType: 'url',
      sourceSelector: anchor ? buildDomPath(anchor) : null,
      sourceText: cta.url,
      confidence: anchor ? (candidates.length > 1 ? 0.52 : 0.82) : 0.4,
      diagnostics: { inferredFrom: `semantic.section.ctas.${ctaIndex}.url` },
    }))
  }

  if (sectionType === 'services' || sectionType === 'content' || sectionType === 'unknown' || sectionType === 'testimonials' || sectionType === 'faq') {
    for (let itemIndex = 0; itemIndex < input.section.items.length; itemIndex += 1) {
      const item = input.section.items[itemIndex] ?? {}
      const title = asItemText(item, ['title', 'name', 'heading', 'label'])
      const description = asItemText(item, ['description', 'text', 'body', 'summary'])
      const image = asItemImage(item)
      if (title) {
        const candidates = exactTextCandidates(input.root, title)
        const target = candidates[0] ?? null
        if (candidates.length === 0) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
        if (candidates.length > 1) input.diagnostics.push('SECTION_SLOT_LOW_CONFIDENCE')
        out.push(createSlot({
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          slotKey: `${base}.items.${itemIndex}.title`,
          slotType: 'text',
          sourceSelector: target ? buildDomPath(target) : null,
          sourceText: title,
          confidence: target ? (candidates.length > 1 ? 0.5 : 0.8) : 0.38,
          diagnostics: { inferredFrom: `semantic.section.items.${itemIndex}.title` },
        }))
        input.diagnostics.push('SECTION_ITEM_SLOT_INFERRED')
      }
      if (description) {
        const candidates = exactTextCandidates(input.root, description)
        const target = candidates[0] ?? null
        if (candidates.length === 0) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
        if (candidates.length > 1) input.diagnostics.push('SECTION_SLOT_LOW_CONFIDENCE')
        out.push(createSlot({
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          slotKey: `${base}.items.${itemIndex}.description`,
          slotType: 'text',
          sourceSelector: target ? buildDomPath(target) : null,
          sourceText: description,
          confidence: target ? (candidates.length > 1 ? 0.5 : 0.78) : 0.38,
          diagnostics: { inferredFrom: `semantic.section.items.${itemIndex}.description` },
        }))
      }
      if (image) {
        const img = findImageBySrc(input.root, image)
        if (!img) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
        out.push(createSlot({
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          slotKey: `${base}.items.${itemIndex}.image`,
          slotType: 'image',
          sourceSelector: img ? buildDomPath(img) : null,
          sourceAssetPath: image,
          confidence: img ? 0.78 : 0.4,
          diagnostics: { inferredFrom: `semantic.section.items.${itemIndex}.image` },
        }))
        input.diagnostics.push('SECTION_IMAGE_SLOT_INFERRED')
      }
    }
  }

  if (sectionType === 'gallery') {
    for (let imageIndex = 0; imageIndex < input.section.images.length; imageIndex += 1) {
      const image = input.section.images[imageIndex]
      const img = findImageBySrc(input.root, image.src)
      if (!img) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
      out.push(createSlot({
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        slotKey: `${base}.gallery.${imageIndex}.image`,
        slotType: 'image',
        sourceSelector: img ? buildDomPath(img) : null,
        sourceAssetPath: image.src,
        confidence: img ? 0.84 : 0.42,
        diagnostics: { inferredFrom: `semantic.section.images.${imageIndex}.src` },
      }))
      if (image.alt) {
        out.push(createSlot({
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          slotKey: `${base}.gallery.${imageIndex}.alt`,
          slotType: 'text',
          sourceSelector: img ? buildDomPath(img) : null,
          sourceText: image.alt,
          confidence: img ? 0.8 : 0.42,
          diagnostics: { inferredFrom: `semantic.section.images.${imageIndex}.alt` },
        }))
      }
      input.diagnostics.push('SECTION_IMAGE_SLOT_INFERRED')
    }
  }

  if (sectionType === 'contact') {
    const email = inferContactField(input.section, 'email')
    const phone = inferContactField(input.section, 'phone')
    const address = inferContactField(input.section, 'address')
    for (const [key, value] of [['email', email], ['phone', phone], ['address', address]] as const) {
      if (!value) continue
      const candidates = exactTextCandidates(input.root, value)
      const anchor = candidates.find((el) => {
        const href = attrValue(el, 'href').toLowerCase()
        return key === 'email' ? href.startsWith('mailto:') : key === 'phone' ? href.startsWith('tel:') : true
      }) ?? candidates[0] ?? null
      out.push(createSlot({
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        slotKey: `${base}.contact.${key}`,
        slotType: key === 'address' ? 'text' : 'text',
        sourceSelector: anchor ? buildDomPath(anchor) : null,
        sourceText: value,
        confidence: anchor ? 0.76 : 0.42,
        diagnostics: { inferredFrom: `semantic.section.contact.${key}` },
      }))
      if (!anchor) input.diagnostics.push('SECTION_SLOT_SELECTOR_MISSING')
    }
  }

  return out
}

export function inferContentSlotsFromSemanticImport(input: {
  siteId: string
  siteVersionId: string
  html: string
  semanticImport: SemanticImportResult
}): { slots: Omit<ContentSlot, 'id'>[]; diagnostics: string[] } {
  const diagnostics: string[] = ['CONTENT_SLOT_INFERENCE_STARTED', 'SECTION_SLOT_INFERENCE_STARTED']
  const root: Parse5Document = parse(input.html)
  const slots: Omit<ContentSlot, 'id'>[] = []

  const h1 = collect(root, (el) => (el.tagName || '').toLowerCase() === 'h1')[0] ?? null
  if (input.semanticImport.hero?.title) {
    const low = !h1
    if (low) diagnostics.push('CONTENT_SLOT_LOW_CONFIDENCE')
    slots.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.title',
      slotType: 'text',
      sourceSelector: h1 ? buildDomPath(h1) : null,
      sourceText: input.semanticImport.hero.title,
      confidence: low ? 0.45 : 0.9,
      diagnostics: { inferredFrom: 'hero.title' },
    }))
    diagnostics.push('CONTENT_SLOT_INFERRED')
  }

  if (input.semanticImport.hero?.subtitle) {
    const p = h1
      ? collect(root, (el) => (el.tagName || '').toLowerCase() === 'p').find((el) => textOf(el).length > 0) ?? null
      : null
    const low = !p
    if (low) diagnostics.push('CONTENT_SLOT_LOW_CONFIDENCE')
    slots.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.subtitle',
      slotType: 'text',
      sourceSelector: p ? buildDomPath(p) : null,
      sourceText: input.semanticImport.hero.subtitle,
      confidence: low ? 0.45 : 0.82,
      diagnostics: { inferredFrom: 'hero.subtitle' },
    }))
    diagnostics.push('CONTENT_SLOT_INFERRED')
  }

  const cta = input.semanticImport.hero?.cta
  if (cta) {
    const ctaNode = collect(root, (el) => {
      const tag = (el.tagName || '').toLowerCase()
      if (tag !== 'a' && tag !== 'button') return false
      return textOf(el).toLowerCase() === cta.label.toLowerCase()
    })[0] ?? null
    const low = !ctaNode
    if (low) diagnostics.push('CONTENT_SLOT_LOW_CONFIDENCE')
    const selector = ctaNode ? buildDomPath(ctaNode) : null
    slots.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.cta.label',
      slotType: 'text',
      sourceSelector: selector,
      sourceText: cta.label,
      confidence: low ? 0.45 : 0.85,
      diagnostics: { inferredFrom: 'hero.cta.label' },
    }))
    slots.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.cta.href',
      slotType: 'url',
      sourceSelector: selector,
      sourceText: cta.url,
      confidence: low ? 0.45 : 0.85,
      diagnostics: { inferredFrom: 'hero.cta.href' },
    }))
    diagnostics.push('CONTENT_SLOT_INFERRED')
  }

  if (input.semanticImport.hero?.image?.src) {
    const img = findImageBySrc(root, input.semanticImport.hero.image.src)
    const low = !img
    if (low) diagnostics.push('CONTENT_SLOT_LOW_CONFIDENCE')
    slots.push(createSlot({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.image',
      slotType: 'image',
      sourceSelector: img ? buildDomPath(img) : null,
      sourceAssetPath: input.semanticImport.hero.image.src,
      confidence: low ? 0.45 : 0.8,
      diagnostics: { inferredFrom: 'hero.image' },
    }))
    diagnostics.push('CONTENT_SLOT_INFERRED')
  }

  const sections = Array.isArray(input.semanticImport.sections) ? input.semanticImport.sections : []
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex]!
    slots.push(...inferSectionSlots({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      root,
      section,
      sectionIndex,
      diagnostics,
    }))
  }

  diagnostics.push('SECTION_SLOT_INFERENCE_COMPLETED')
  diagnostics.push('CONTENT_SLOT_INFERENCE_COMPLETED')
  return { slots, diagnostics }
}

function asTextValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && typeof (value as any).value === 'string') return (value as any).value
  return ''
}

export function applyContentOverridesToRawHtml(input: {
  html: string
  slots: Array<Pick<ContentSlot, 'slotKey' | 'slotType' | 'sourceSelector'>>
  overrides: Array<Pick<ContentOverride, 'slotKey' | 'valueType' | 'valueJson'>>
}): {
  html: string
  appliedCount: number
  skippedCount: number
  diagnostics: string[]
  skippedDiagnostics: Array<{ slotKey: string; reason: 'selector_missing' | 'target_not_found' | 'slot_missing' | 'value_empty' }>
} {
  const diagnostics = ['CONTENT_OVERRIDE_PATCH_STARTED']
  const root: Parse5Document = parse(String(input.html ?? ''))
  const slotMap = new Map(input.slots.map((slot) => [slot.slotKey, slot]))
  const skippedDiagnostics: Array<{ slotKey: string; reason: 'selector_missing' | 'target_not_found' | 'slot_missing' | 'value_empty' }> = []
  let appliedCount = 0
  let skippedCount = 0

  for (const ov of input.overrides) {
    const slot = slotMap.get(ov.slotKey)
    const sectionScoped = ov.slotKey.startsWith('sections.') || ov.slotKey.startsWith('footer.')
    if (sectionScoped) diagnostics.push('CONTENT_OVERRIDE_SECTION_PATCH_STARTED')
    if (!slot) {
      skippedCount += 1
      skippedDiagnostics.push({ slotKey: ov.slotKey, reason: 'slot_missing' })
      diagnostics.push(sectionScoped ? 'CONTENT_OVERRIDE_SECTION_PATCH_SKIPPED' : 'CONTENT_OVERRIDE_SKIPPED_NO_SLOT')
      diagnostics.push('CONTENT_OVERRIDE_PATCH_SKIPPED_TARGET_NOT_FOUND')
      continue
    }
    if (!slot.sourceSelector) {
      skippedCount += 1
      skippedDiagnostics.push({ slotKey: ov.slotKey, reason: 'selector_missing' })
      diagnostics.push(sectionScoped ? 'CONTENT_OVERRIDE_SECTION_PATCH_SKIPPED' : 'CONTENT_OVERRIDE_SKIPPED_NO_SELECTOR')
      diagnostics.push('CONTENT_OVERRIDE_PATCH_SKIPPED_SELECTOR_MISSING')
      continue
    }
    const target = resolveByPath(root, slot.sourceSelector)
    if (!target) {
      skippedCount += 1
      skippedDiagnostics.push({ slotKey: ov.slotKey, reason: 'target_not_found' })
      diagnostics.push(sectionScoped ? 'CONTENT_OVERRIDE_SECTION_PATCH_SKIPPED' : 'CONTENT_OVERRIDE_SKIPPED_SELECTOR_NOT_FOUND')
      diagnostics.push('CONTENT_OVERRIDE_PATCH_SKIPPED_TARGET_NOT_FOUND')
      continue
    }

    const text = asTextValue(ov.valueJson)
    if (!text.trim().length) {
      skippedCount += 1
      skippedDiagnostics.push({ slotKey: ov.slotKey, reason: 'value_empty' })
      diagnostics.push('CONTENT_OVERRIDE_VALUE_EMPTY')
      continue
    }
    if (slot.slotType === 'text' || slot.slotType === 'rich_text') {
      if (ov.slotKey.endsWith('.alt')) {
        setAttr(target, 'alt', text)
        appliedCount += 1
        diagnostics.push('CONTENT_OVERRIDE_IMAGE_PATCH_APPLIED')
        diagnostics.push('CONTENT_OVERRIDE_PATCH_APPLIED')
        continue
      }
      const href = attrValue(target, 'href')
      if (ov.slotKey.includes('.contact.email') && href.toLowerCase().startsWith('mailto:')) {
        setAttr(target, 'href', `mailto:${text}`)
      }
      if (ov.slotKey.includes('.contact.phone') && href.toLowerCase().startsWith('tel:')) {
        setAttr(target, 'href', `tel:${text}`)
      }
      ;(target as any).childNodes = [{ nodeName: '#text', value: text, parentNode: target } as any]
      appliedCount += 1
      diagnostics.push(sectionScoped ? 'CONTENT_OVERRIDE_SECTION_PATCH_APPLIED' : 'CONTENT_OVERRIDE_APPLIED')
      diagnostics.push('CONTENT_OVERRIDE_PATCH_APPLIED')
      continue
    }
    if (slot.slotType === 'url') {
      setAttr(target, 'href', text)
      appliedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_LINK_PATCH_APPLIED')
      diagnostics.push(sectionScoped ? 'CONTENT_OVERRIDE_SECTION_PATCH_APPLIED' : 'CONTENT_OVERRIDE_APPLIED')
      diagnostics.push('CONTENT_OVERRIDE_PATCH_APPLIED')
      continue
    }
    if (slot.slotType === 'image') {
      setAttr(target, 'src', text)
      appliedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_IMAGE_PATCH_APPLIED')
      diagnostics.push(sectionScoped ? 'CONTENT_OVERRIDE_SECTION_PATCH_APPLIED' : 'CONTENT_OVERRIDE_APPLIED')
      diagnostics.push('CONTENT_OVERRIDE_PATCH_APPLIED')
      continue
    }
  }

  diagnostics.push('CONTENT_OVERRIDE_PATCH_COMPLETED')
  return { html: serialize(root), appliedCount, skippedCount, diagnostics, skippedDiagnostics }
}
