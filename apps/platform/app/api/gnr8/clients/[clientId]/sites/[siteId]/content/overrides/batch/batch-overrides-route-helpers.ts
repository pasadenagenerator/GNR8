import type { ContentSlot, ContentSlotType } from '@/gnr8/runtime/content-binding'

const normalizeText = (v: unknown) => String(v ?? '').trim()
const SUPPORTED_BATCH_SLOT_TYPES: ReadonlySet<ContentSlotType> = new Set(['text', 'rich_text', 'url', 'image'])

function parseBatchValue(slotType: ContentSlotType, value: unknown): { value: string } | null {
  if (!SUPPORTED_BATCH_SLOT_TYPES.has(slotType)) return null
  if (typeof value !== 'string') return null
  return { value }
}

export function planBatchDraftUpserts(input: {
  slots: Array<Pick<ContentSlot, 'slotKey' | 'slotType'>>
  overrides: Array<{ slotKey?: unknown; status?: unknown; value?: unknown }>
}): {
  valid: Array<{ slotKey: string; valueType: ContentSlotType; valueJson: { value: string } }>
  skippedCount: number
  diagnostics: string[]
} {
  const diagnostics: string[] = []
  const slotByKey = new Map(input.slots.map((slot) => [slot.slotKey, slot]))
  const valid: Array<{ slotKey: string; valueType: ContentSlotType; valueJson: { value: string } }> = []
  let skippedCount = 0
  for (const entry of input.overrides) {
    const slotKey = normalizeText(entry?.slotKey)
    const status = normalizeText(entry?.status)
    const slot = slotByKey.get(slotKey)
    if (!slot) {
      skippedCount += 1
      diagnostics.push('CONTENT_BATCH_SLOT_INVALID')
      continue
    }
    if (status !== 'draft') {
      skippedCount += 1
      diagnostics.push('CONTENT_BATCH_SLOT_SKIPPED')
      continue
    }
    const valueJson = parseBatchValue(slot.slotType, entry?.value)
    if (!valueJson) {
      skippedCount += 1
      diagnostics.push(
        slot.slotType === 'list' ? 'CONTENT_BATCH_SLOT_SKIPPED_UNSUPPORTED_TYPE' : 'CONTENT_BATCH_SLOT_SKIPPED',
      )
      continue
    }
    valid.push({ slotKey, valueType: slot.slotType, valueJson })
  }
  return { valid, skippedCount, diagnostics }
}
