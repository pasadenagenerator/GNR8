import type { TemplateSiteBootstrapStatusResult } from '@/gnr8/site/site-create-contract'

export type PollTemplateSiteStatusOptions = {
  endpoint: string
  intervalMs?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
  onPollStarted?: () => void
  onPollCompleted?: (result: TemplateSiteBootstrapStatusResult) => void
  onPollTimeout?: (lastResult: TemplateSiteBootstrapStatusResult | null) => void
  onPollFailed?: (error: unknown) => void
}

const DEFAULT_INTERVAL_MS = 1500
const DEFAULT_TIMEOUT_MS = 60_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function shouldStopBootstrapPolling(status: TemplateSiteBootstrapStatusResult['status']): boolean {
  return status === 'preview_ready' || status === 'failed'
}

export async function pollTemplateSiteStatus(options: PollTemplateSiteStatusOptions): Promise<{
  timedOut: boolean
  result: TemplateSiteBootstrapStatusResult | null
}> {
  const fetchImpl = options.fetchImpl ?? fetch
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const startedAt = Date.now()
  let lastResult: TemplateSiteBootstrapStatusResult | null = null

  options.onPollStarted?.()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetchImpl(options.endpoint, {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as TemplateSiteBootstrapStatusResult | null
      if (payload && payload.ok) {
        lastResult = payload
        options.onPollCompleted?.(payload)
        if (shouldStopBootstrapPolling(payload.status)) {
          return { timedOut: false, result: payload }
        }
      }
    } catch (error) {
      options.onPollFailed?.(error)
    }

    await sleep(intervalMs)
  }

  options.onPollTimeout?.(lastResult)
  return { timedOut: true, result: lastResult }
}
