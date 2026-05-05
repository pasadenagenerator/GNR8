import type { ContentOverride, ContentSlot, ContentSlotType } from '@/gnr8/runtime/content-binding'

type MaybeRecord = Record<string, unknown>

function asRecord(value: unknown): MaybeRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as MaybeRecord
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

export function getSlotOriginalDisplayValue(slot: Pick<ContentSlot, 'sourceText' | 'sourceAssetPath'>): string {
  return slot.sourceText ?? slot.sourceAssetPath ?? ''
}

export function getOverrideDisplayValue(
  override: Pick<ContentOverride, 'valueJson'> | null | undefined,
  slotType: ContentSlotType | string,
): string | null {
  if (!override) return null
  const root = override.valueJson
  if (typeof root === 'string') return root
  const rootRecord = asRecord(root)
  if (!rootRecord) return null

  const directValue = asString(rootRecord.value)
  if (directValue !== null) return directValue

  if (slotType === 'image') {
    const src = asString(rootRecord.src)
    if (src !== null) return src
  }
  if (slotType === 'url') {
    const href = asString(rootRecord.href)
    if (href !== null) return href
  }

  const nestedValue = asRecord(rootRecord.value)
  if (nestedValue) {
    const nestedSrc = asString(nestedValue.src)
    if (nestedSrc !== null) return nestedSrc
    const nestedHref = asString(nestedValue.href)
    if (nestedHref !== null) return nestedHref
  }

  return null
}
