import type { ContentSlot } from '@/gnr8/runtime/content-binding'

export function requireContentSiteVersionId(siteVersionId: string | null): { ok: true; siteVersionId: string } | { ok: false; code: 'CONTENT_SITE_VERSION_REQUIRED' } {
  if (!siteVersionId) return { ok: false, code: 'CONTENT_SITE_VERSION_REQUIRED' }
  return { ok: true, siteVersionId }
}

export function ensureSlotBelongsToSiteVersion(input: {
  slots: ContentSlot[]
  slotKey: string
}): { ok: true; slot: ContentSlot } | { ok: false; code: 'CONTENT_SLOT_VERSION_MISMATCH' } {
  const slot = input.slots.find((entry) => entry.slotKey === input.slotKey)
  if (!slot) return { ok: false, code: 'CONTENT_SLOT_VERSION_MISMATCH' }
  return { ok: true, slot }
}
