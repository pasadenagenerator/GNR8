import { serve } from 'inngest/next'

import { inngest } from '@/gnr8/inngest/client'
import { inngestFunctions, workerInngestFunctionRegistrations } from '@/gnr8/inngest/functions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

console.info('[worker] WORKER_INNGEST_FUNCTIONS_EXPOSED', {
  functionIds: workerInngestFunctionRegistrations.map((entry) => entry.id),
  eventNames: workerInngestFunctionRegistrations.map((entry) => entry.eventName),
  functionCount: workerInngestFunctionRegistrations.length,
})

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
})
