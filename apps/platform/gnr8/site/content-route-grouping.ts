import type { ContentSlot } from '@/gnr8/runtime/content-binding'

function toIndexFromKey(prefix: string, slotKey: string): number | null {
  const m = new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.(\\d+)`).exec(slotKey)
  if (!m) return null
  const n = Number(m[1])
  return Number.isInteger(n) ? n : null
}

export type GroupedContentSlots = {
  hero: ContentSlot[]
  sections: Array<{
    index: number
    type: string
    titleSlot: ContentSlot | null
    introSlot: ContentSlot | null
    bodySlot: ContentSlot | null
    ctas: Array<{ labelSlot: ContentSlot | null; hrefSlot: ContentSlot | null }>
    items: Array<{ index: number; titleSlot: ContentSlot | null; descriptionSlot: ContentSlot | null; imageSlot: ContentSlot | null }>
    gallery: Array<{ index: number; imageSlot: ContentSlot | null; altSlot: ContentSlot | null }>
    contact: { emailSlot: ContentSlot | null; phoneSlot: ContentSlot | null; addressSlot: ContentSlot | null; formTitleSlot: ContentSlot | null }
  }>
  footer: ContentSlot[]
}

export function groupSlots(slots: ContentSlot[]): GroupedContentSlots {
  const hero = slots.filter((slot) => slot.slotKey.startsWith('hero.'))
  const footer = slots.filter((slot) => slot.slotKey.startsWith('footer.'))
  const sectionSlots = slots.filter((slot) => slot.slotKey.startsWith('sections.'))
  const sectionMap = new Map<number, ContentSlot[]>()
  for (const slot of sectionSlots) {
    const index = toIndexFromKey('sections', slot.slotKey)
    if (index == null) continue
    const prev = sectionMap.get(index) ?? []
    prev.push(slot)
    sectionMap.set(index, prev)
  }

  const sections = [...sectionMap.entries()].sort((a, b) => a[0] - b[0]).map(([index, list]) => {
    const find = (suffix: string) => list.find((slot) => slot.slotKey === `sections.${index}.${suffix}`) ?? null
    const itemMap = new Map<number, ContentSlot[]>()
    const galleryMap = new Map<number, ContentSlot[]>()
    for (const slot of list) {
      const itemIdx = toIndexFromKey(`sections.${index}.items`, slot.slotKey)
      if (itemIdx != null) {
        itemMap.set(itemIdx, [...(itemMap.get(itemIdx) ?? []), slot])
      }
      const galleryIdx = toIndexFromKey(`sections.${index}.gallery`, slot.slotKey)
      if (galleryIdx != null) {
        galleryMap.set(galleryIdx, [...(galleryMap.get(galleryIdx) ?? []), slot])
      }
    }

    const items = [...itemMap.entries()].sort((a, b) => a[0] - b[0]).map(([itemIndex, itemSlots]) => ({
      index: itemIndex,
      titleSlot: itemSlots.find((slot) => slot.slotKey.endsWith('.title')) ?? null,
      descriptionSlot: itemSlots.find((slot) => slot.slotKey.endsWith('.description')) ?? null,
      imageSlot: itemSlots.find((slot) => slot.slotKey.endsWith('.image')) ?? null,
    }))

    const gallery = [...galleryMap.entries()].sort((a, b) => a[0] - b[0]).map(([imageIndex, imageSlots]) => ({
      index: imageIndex,
      imageSlot: imageSlots.find((slot) => slot.slotKey.endsWith('.image')) ?? null,
      altSlot: imageSlots.find((slot) => slot.slotKey.endsWith('.alt')) ?? null,
    }))

    return {
      index,
      type: find('type')?.sourceText ?? 'unknown',
      titleSlot: find('heading'),
      introSlot: find('intro'),
      bodySlot: find('body'),
      ctas: [{ labelSlot: find('cta.label'), hrefSlot: find('cta.href') }],
      items,
      gallery,
      contact: {
        emailSlot: find('contact.email'),
        phoneSlot: find('contact.phone'),
        addressSlot: find('contact.address'),
        formTitleSlot: find('contact.formTitle'),
      },
    }
  })

  return { hero, sections, footer }
}

export function groupedContentLooksEmpty(grouped: GroupedContentSlots): boolean {
  return grouped.hero.length === 0 && grouped.sections.length === 0 && grouped.footer.length === 0
}
