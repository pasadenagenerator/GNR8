import { serve } from 'inngest/next'

import { inngest } from '@/gnr8/inngest/client'
import { inngestFunctions } from '@/gnr8/inngest/functions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
})

