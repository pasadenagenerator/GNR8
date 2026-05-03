import { parse, serialize } from 'parse5'
import type { DefaultTreeAdapterMap } from 'parse5'
import type { SemanticImportResult } from '@/gnr8/import-semantic/semantic-import-engine'

export type ContentSlotType = 'text' | 'rich_text' | 'url' | 'image'
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
  let candidates: Element[] = collect(root, (el) => (el.tagName || '').toLowerCase() === parts[0].split(':')[0])
  if (candidates.length === 0) return null
  let current: Element | null = candidates[0] ?? null
  for (let i = 1; i < parts.length; i += 1) {
    if (!current) return null
    const raw = parts[i]
    const m = /^(\w+)(?::nth-of-type\((\d+)\))?$/.exec(raw)
    if (!m) return null
    const tag = m[1]!.toLowerCase()
    const nth = Math.max(1, Number(m[2] ?? '1'))
    const matches = childrenOf(current).map(asElement).filter((v): v is Element => Boolean(v) && (v!.tagName || '').toLowerCase() === tag)
    current = matches[nth - 1] ?? null
  }
  return current
}

export function inferContentSlotsFromSemanticImport(input: {
  siteId: string
  siteVersionId: string
  html: string
  semanticImport: SemanticImportResult
}): { slots: Omit<ContentSlot, 'id'>[]; diagnostics: string[] } {
  const diagnostics: string[] = ['CONTENT_SLOT_INFERENCE_STARTED']
  const root = parse(input.html) as Node
  const slots: Omit<ContentSlot, 'id'>[] = []

  const h1 = collect(root, (el) => (el.tagName || '').toLowerCase() === 'h1')[0] ?? null
  if (input.semanticImport.hero?.title) {
    const low = !h1
    if (low) diagnostics.push('CONTENT_SLOT_LOW_CONFIDENCE')
    slots.push({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.title',
      slotType: 'text',
      sourceSelector: h1 ? buildDomPath(h1) : null,
      sourceText: input.semanticImport.hero.title,
      sourceAssetPath: null,
      confidence: low ? 0.45 : 0.9,
      diagnostics: { inferredFrom: 'hero.title' },
    })
    diagnostics.push('CONTENT_SLOT_INFERRED')
  }

  if (input.semanticImport.hero?.subtitle) {
    const p = h1
      ? collect(root, (el) => (el.tagName || '').toLowerCase() === 'p').find((el) => textOf(el).length > 0) ?? null
      : null
    const low = !p
    if (low) diagnostics.push('CONTENT_SLOT_LOW_CONFIDENCE')
    slots.push({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.subtitle',
      slotType: 'text',
      sourceSelector: p ? buildDomPath(p) : null,
      sourceText: input.semanticImport.hero.subtitle,
      sourceAssetPath: null,
      confidence: low ? 0.45 : 0.82,
      diagnostics: { inferredFrom: 'hero.subtitle' },
    })
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
    slots.push({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.cta.label',
      slotType: 'text',
      sourceSelector: selector,
      sourceText: cta.label,
      sourceAssetPath: null,
      confidence: low ? 0.45 : 0.85,
      diagnostics: { inferredFrom: 'hero.cta.label' },
    })
    slots.push({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.cta.href',
      slotType: 'url',
      sourceSelector: selector,
      sourceText: cta.url,
      sourceAssetPath: null,
      confidence: low ? 0.45 : 0.85,
      diagnostics: { inferredFrom: 'hero.cta.href' },
    })
    diagnostics.push('CONTENT_SLOT_INFERRED')
  }

  if (input.semanticImport.hero?.image?.src) {
    const img = collect(root, (el) => (el.tagName || '').toLowerCase() === 'img' && attrValue(el, 'src') === input.semanticImport.hero!.image!.src)[0] ?? null
    const low = !img
    if (low) diagnostics.push('CONTENT_SLOT_LOW_CONFIDENCE')
    slots.push({
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: 'hero.image',
      slotType: 'image',
      sourceSelector: img ? buildDomPath(img) : null,
      sourceText: null,
      sourceAssetPath: input.semanticImport.hero.image.src,
      confidence: low ? 0.45 : 0.8,
      diagnostics: { inferredFrom: 'hero.image' },
    })
    diagnostics.push('CONTENT_SLOT_INFERRED')
  }

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
}): { html: string; appliedCount: number; skippedCount: number; diagnostics: string[] } {
  const diagnostics = ['CONTENT_OVERRIDE_PATCH_STARTED']
  const root = parse(String(input.html ?? '')) as Node
  const slotMap = new Map(input.slots.map((slot) => [slot.slotKey, slot]))
  let appliedCount = 0
  let skippedCount = 0

  for (const ov of input.overrides) {
    const slot = slotMap.get(ov.slotKey)
    if (!slot) {
      skippedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_SKIPPED_NO_SLOT')
      continue
    }
    if (!slot.sourceSelector) {
      skippedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_SKIPPED_NO_SELECTOR')
      continue
    }
    const target = resolveByPath(root, slot.sourceSelector)
    if (!target) {
      skippedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_SKIPPED_SELECTOR_NOT_FOUND')
      continue
    }

    const text = asTextValue(ov.valueJson)
    if (slot.slotType === 'text' || slot.slotType === 'rich_text') {
      ;(target as any).childNodes = [{ nodeName: '#text', value: text, parentNode: target } as any]
      appliedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_APPLIED')
      continue
    }
    if (slot.slotType === 'url') {
      setAttr(target, 'href', text)
      appliedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_APPLIED')
      continue
    }
    if (slot.slotType === 'image') {
      setAttr(target, 'src', text)
      appliedCount += 1
      diagnostics.push('CONTENT_OVERRIDE_APPLIED')
      continue
    }
  }

  diagnostics.push('CONTENT_OVERRIDE_PATCH_COMPLETED')
  return { html: serialize(root), appliedCount, skippedCount, diagnostics }
}
