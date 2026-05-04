export type Slot = {
  slotKey: string
  slotType: string
  sourceText: string | null
  sourceAssetPath?: string | null
  sourceSelector?: string | null
  confidence?: number
}

export type FieldDraftState = 'using_original' | 'draft_pending' | 'published_override' | 'published'

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: 'Hero',
  services: 'Services',
  gallery: 'Gallery',
  contact: 'Contact',
  testimonials: 'Testimonials',
  faq: 'FAQ',
  footer: 'Footer',
  content: 'Content',
}

const CONTACT_LABELS: Record<string, string> = {
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
}

export function toTitleCase(value: string): string {
  if (!value) return 'Section'
  return value
    .replaceAll(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

export function sectionTitle(input: { index: number; type: string }): string {
  const mapped = SECTION_TYPE_LABELS[input.type] ?? 'Section'
  if (mapped === 'Section') return `Section ${input.index + 1}`
  return `Section ${input.index + 1} · ${mapped}`
}

export function friendlySlotLabel(slotKey: string): string {
  if (slotKey === 'hero.title') return 'Hero title'
  if (slotKey === 'hero.subtitle') return 'Hero subtitle'
  if (slotKey === 'hero.cta.label') return 'Button text'
  if (slotKey === 'hero.cta.href') return 'Button link'
  if (slotKey === 'hero.image') return 'Hero image'
  if (slotKey === 'footer.text') return 'Footer text'

  let match = slotKey.match(/^sections\.(\d+)\.heading$/)
  if (match) return 'Section heading'
  match = slotKey.match(/^sections\.(\d+)\.intro$/)
  if (match) return 'Intro text'
  match = slotKey.match(/^sections\.(\d+)\.body$/)
  if (match) return 'Body text'
  match = slotKey.match(/^sections\.(\d+)\.cta\.label$/)
  if (match) return 'Button text'
  match = slotKey.match(/^sections\.(\d+)\.cta\.href$/)
  if (match) return 'Button link'
  match = slotKey.match(/^sections\.(\d+)\.items\.(\d+)\.title$/)
  if (match) return `Item ${Number(match[2]) + 1} title`
  match = slotKey.match(/^sections\.(\d+)\.items\.(\d+)\.description$/)
  if (match) return `Item ${Number(match[2]) + 1} description`
  match = slotKey.match(/^sections\.(\d+)\.items\.(\d+)\.image$/)
  if (match) return `Item ${Number(match[2]) + 1} image`
  match = slotKey.match(/^sections\.(\d+)\.gallery\.(\d+)\.image$/)
  if (match) return `Gallery image ${Number(match[2]) + 1}`
  match = slotKey.match(/^sections\.(\d+)\.gallery\.(\d+)\.alt$/)
  if (match) return `Gallery image ${Number(match[2]) + 1} alt text`
  match = slotKey.match(/^sections\.(\d+)\.contact\.(email|phone|address)$/)
  if (match) return CONTACT_LABELS[match[2]] ?? toTitleCase(match[2])
  match = slotKey.match(/^footer\.links\.(\d+)\.label$/)
  if (match) return `Footer link ${Number(match[1]) + 1} label`
  match = slotKey.match(/^footer\.links\.(\d+)\.href$/)
  if (match) return `Footer link ${Number(match[1]) + 1} URL`
  return toTitleCase(slotKey.split('.').at(-1) ?? slotKey)
}

export function detectFieldDraftState(input: {
  slotKey: string
  draftValue: string | undefined
  publishedValue: string | undefined
}): FieldDraftState {
  const hasDraft = typeof input.draftValue === 'string' && input.draftValue.length > 0
  const hasPublished = typeof input.publishedValue === 'string' && input.publishedValue.length > 0
  if (!hasDraft && !hasPublished) return 'using_original'
  if (hasDraft && hasPublished) {
    if (input.draftValue === input.publishedValue) return 'published'
    return 'draft_pending'
  }
  if (hasDraft && !hasPublished) return 'draft_pending'
  return 'published_override'
}

export function draftStateLabel(state: FieldDraftState): string {
  if (state === 'using_original') return 'Using original'
  if (state === 'draft_pending') return 'Draft changes pending'
  if (state === 'published_override') return 'Published override'
  return 'Published'
}

export function inputKindForSlot(slot: Pick<Slot, 'slotType' | 'slotKey'>): 'text' | 'url' | 'textarea' {
  if (slot.slotType === 'url') return 'url'
  if (slot.slotType === 'image') return 'url'
  if (slot.slotType === 'rich_text') return 'textarea'
  if (slot.slotType === 'text') {
    if (slot.slotKey.includes('.body') || slot.slotKey.includes('.description') || slot.slotKey.includes('.intro')) return 'textarea'
    return 'text'
  }
  return 'text'
}

export function slotGroupKey(slotKey: string): string {
  let match = slotKey.match(/^sections\.(\d+)\.items\.(\d+)\./)
  if (match) return `sections.${match[1]}.items.${match[2]}`
  match = slotKey.match(/^sections\.(\d+)\.gallery\.(\d+)\./)
  if (match) return `sections.${match[1]}.gallery.${match[2]}`
  match = slotKey.match(/^sections\.(\d+)\.contact\./)
  if (match) return `sections.${match[1]}.contact`
  return slotKey
}

export function shouldUseFlatSlotFallback(input: {
  groupedHeroCount: number
  groupedSectionCount: number
  slotCount: number
}): boolean {
  return input.groupedHeroCount === 0 && input.groupedSectionCount === 0 && input.slotCount > 0
}
