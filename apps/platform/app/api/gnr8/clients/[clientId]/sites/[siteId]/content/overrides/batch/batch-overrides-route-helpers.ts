const normalizeText = (v: unknown) => String(v ?? '').trim()

export function planBatchDraftUpserts(input: {
  slots: Array<{ slotKey: string; slotType: 'text' | 'url' | 'image' }>
  overrides: Array<{ slotKey?: unknown; status?: unknown; value?: unknown }>
}): {
  valid: Array<{ slotKey: string; valueType: 'text' | 'url' | 'image'; valueJson: { value: string } }>
  skippedCount: number
  diagnostics: string[]
} {
  const diagnostics: string[] = []
  const slotByKey = new Map(input.slots.map((slot) => [slot.slotKey, slot]))
  const valid: Array<{ slotKey: string; valueType: 'text' | 'url' | 'image'; valueJson: { value: string } }> = []
  let skippedCount = 0
  for (const entry of input.overrides) {
    const slotKey = normalizeText(entry?.slotKey)
    const status = normalizeText(entry?.status)
    const value = String(entry?.value ?? '')
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
    valid.push({ slotKey, valueType: slot.slotType, valueJson: { value } })
  }
  return { valid, skippedCount, diagnostics }
}
