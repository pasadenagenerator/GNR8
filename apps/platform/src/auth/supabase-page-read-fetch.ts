const DEFAULT_PAGE_READ_TIMEOUT_MS = 12_000
const DEFAULT_PAGE_READ_ATTEMPTS = 2

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504, 522, 524])

type FetchLike = typeof fetch

export type BoundedPageReadFetchOptions = {
  fetchImpl?: FetchLike
  timeoutMs?: number
  attempts?: number
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (typeof Request !== 'undefined' && input instanceof Request) return input.method.toUpperCase()
  return 'GET'
}

function callerSignal(input: RequestInfo | URL, init?: RequestInit): AbortSignal | null {
  if (init?.signal) return init.signal
  if (typeof Request !== 'undefined' && input instanceof Request) return input.signal
  return null
}

async function discardResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // The retry does not depend on the discarded response body being readable.
  }
}

export function createBoundedPageReadFetch(options: BoundedPageReadFetchOptions = {}): FetchLike {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = Math.max(1, Math.floor(options.timeoutMs ?? DEFAULT_PAGE_READ_TIMEOUT_MS))
  const attempts = Math.max(1, Math.floor(options.attempts ?? DEFAULT_PAGE_READ_ATTEMPTS))

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const method = requestMethod(input, init)
    const isIdempotentRead = method === 'GET' || method === 'HEAD'
    const maxAttempts = isIdempotentRead ? attempts : 1
    const externalSignal = callerSignal(input, init)
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (externalSignal?.aborted) {
        throw externalSignal.reason ?? new DOMException('The request was aborted.', 'AbortError')
      }

      const controller = new AbortController()
      const abortFromCaller = () => controller.abort(externalSignal?.reason)
      externalSignal?.addEventListener('abort', abortFromCaller, { once: true })
      const timeout = setTimeout(() => {
        controller.abort(new DOMException(`Page read request exceeded ${timeoutMs}ms.`, 'TimeoutError'))
      }, timeoutMs)

      try {
        const response = await fetchImpl(input, {
          ...init,
          signal: controller.signal,
        })
        if (attempt < maxAttempts && RETRYABLE_STATUS_CODES.has(response.status)) {
          await discardResponse(response)
          continue
        }
        return response
      } catch (error) {
        lastError = error
        if (externalSignal?.aborted || attempt >= maxAttempts) throw error
      } finally {
        clearTimeout(timeout)
        externalSignal?.removeEventListener('abort', abortFromCaller)
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Page read request failed.')
  }
}

