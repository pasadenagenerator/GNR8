import { serve } from 'inngest/next'

import { inngest } from '@/gnr8/inngest/client'
import { inngestFunctions, workerInngestFunctionRegistrations } from '@/gnr8/inngest/functions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
// Source-backed Astro builds can legitimately exceed Vercel's five-minute
// default while still remaining within the bounded Inngest job execution.
export const maxDuration = 800

console.info('[worker] WORKER_INNGEST_FUNCTIONS_EXPOSED', {
  functionIds: workerInngestFunctionRegistrations.map((entry) => entry.id),
  eventNames: workerInngestFunctionRegistrations.map((entry) => entry.eventName).filter(Boolean),
  functionCount: workerInngestFunctionRegistrations.length,
})

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
})
