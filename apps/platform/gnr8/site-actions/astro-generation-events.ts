import { SITE_ASTRO_GENERATION_REQUESTED_EVENT, type SiteAstroGenerationRequestedPayload } from '@gnr8/runtime-contracts'

import { inngest } from '@/gnr8/inngest/client'

export async function emitSiteAstroGenerationRequestedEvent(input: SiteAstroGenerationRequestedPayload): Promise<void> {
  await inngest.send({ name: SITE_ASTRO_GENERATION_REQUESTED_EVENT, data: input })
}
