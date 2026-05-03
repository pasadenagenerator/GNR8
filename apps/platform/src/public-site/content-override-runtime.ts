import type { ContentOverride, ContentSlot } from '@/gnr8/runtime/content-binding'
import { applyContentOverridesToRawHtml as applyOverridesCore } from '@/gnr8/runtime/content-binding'

export function applyContentOverridesToRawHtml(input: {
  html: string
  slots: ContentSlot[]
  overrides: ContentOverride[]
}): {
  html: string
  appliedCount: number
  skippedCount: number
  diagnostics: string[]
} {
  return applyOverridesCore({
    html: input.html,
    slots: input.slots,
    overrides: input.overrides,
  })
}
