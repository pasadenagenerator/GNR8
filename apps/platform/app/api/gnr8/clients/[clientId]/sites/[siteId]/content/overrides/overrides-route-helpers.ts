import type { ContentSlotType } from '@/gnr8/runtime/content-binding'

const normalizeText = (v: unknown) => String(v ?? '').trim()

export function normalizeSingleDraftSavePayload(input: {
  slotType: ContentSlotType
  body: any
}):
  | { ok: true; status: 'draft'; valueType: ContentSlotType; valueJson: { value: string } }
  | { ok: false; reasonCode: string } {
  const status = normalizeText(input.body?.status || 'draft')
  if (status !== 'draft') return { ok: false, reasonCode: 'CONTENT_DRAFT_SAVE_INVALID_STATUS' }
  const valueType = (normalizeText(input.body?.valueType) || input.slotType) as ContentSlotType
  if (valueType !== input.slotType) return { ok: false, reasonCode: 'CONTENT_DRAFT_SAVE_VALUE_TYPE_MISMATCH' }
  const rawValueFromJson = input.body?.valueJson?.value
  const rawValue = typeof rawValueFromJson === 'string'
    ? rawValueFromJson
    : typeof input.body?.value === 'string'
      ? input.body.value
      : null
  if (typeof rawValue !== 'string') return { ok: false, reasonCode: 'CONTENT_DRAFT_SAVE_MISSING_VALUE' }
  return { ok: true, status: 'draft', valueType, valueJson: { value: rawValue } }
}
